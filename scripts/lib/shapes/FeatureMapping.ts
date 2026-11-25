/*
 * Copyright 2023 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Portado a TypeScript de androidx/androidx@b842c5b3a5,
// graphics/graphics-shapes/src/commonMain/kotlin/androidx/graphics/shapes/FeatureMapping.kt
// (ADR-0011).
//
// Diferencias con el original:
// - `ProgressableFeature` (una `data class`) es una clase; los conjuntos de usadas comparan por
//   identidad, que es lo que pasa en el original porque cada característica es una instancia
//   distinta.
// - `Float.MAX_VALUE` (la distancia «infinita» entre esquinas convexas y cóncavas) es
//   `Number.MAX_VALUE`. Sin el registro de depuración (`debugLog`).

import { Corner, type Feature } from './Features.ts'
import { DoubleMapper, progressDistance, progressInRange } from './FloatMapping.ts'
import { Point } from './Point.ts'
import { DistanceEpsilon } from './Utils.ts'

/** Una característica del polígono con su progreso (de 0 a 1) sobre el contorno. */
export class ProgressableFeature {
  readonly progress: number
  readonly feature: Feature

  constructor(progress: number, feature: Feature) {
    this.progress = progress
    this.feature = feature
  }
}

/** Todas las características de un polígono, con su progreso. */
export type MeasuredFeatures = readonly ProgressableFeature[]

/** Correspondencia entre las características (las esquinas redondeadas) de dos formas. */
export function featureMapper(features1: MeasuredFeatures, features2: MeasuredFeatures): DoubleMapper {
  // Solo se usan las esquinas.
  const filteredFeatures1 = features1.filter((f) => f.feature instanceof Corner)
  const filteredFeatures2 = features2.filter((f) => f.feature instanceof Corner)
  const featureProgressMapping = doMapping(filteredFeatures1, filteredFeatures2)
  return new DoubleMapper(...featureProgressMapping)
}

interface DistanceVertex {
  readonly distance: number
  readonly f1: ProgressableFeature
  readonly f2: ProgressableFeature
}

/**
 * Empareja las características de `features1` con las de `features2`: devuelve pares (progreso
 * en la primera forma, progreso en la segunda), ordenados por el primero. Para eso:
 * 1. calcula la distancia de todos los pares posibles;
 * 2. los ordena de menor a mayor distancia;
 * 3. los suma en ese orden, siempre que ninguna de las dos características se haya usado y que
 *    el par no cruce a otro: los segundos elementos crecen, salvo a lo sumo una vez (contando
 *    también del último al primero).
 */
export function doMapping(
  features1: readonly ProgressableFeature[],
  features2: readonly ProgressableFeature[],
): Array<[number, number]> {
  const distanceVertexList: DistanceVertex[] = []
  for (const f1 of features1) {
    for (const f2 of features2) {
      const d = featureDistSquared(f1.feature, f2.feature)
      if (d !== Number.MAX_VALUE) distanceVertexList.push({ distance: d, f1, f2 })
    }
  }
  // Array.prototype.sort es estable, como `sortedBy` de Kotlin.
  distanceVertexList.sort((a, b) => a.distance - b.distance)

  // Casos especiales.
  if (distanceVertexList.length === 0) return IdentityMapping.map(([a, b]) => [a, b])
  if (distanceVertexList.length === 1) {
    const it = distanceVertexList[0]!
    const f1 = it.f1.progress
    const f2 = it.f2.progress
    return [
      [f1, f2],
      [(f1 + 0.5) % 1, (f2 + 0.5) % 1],
    ]
  }

  const helper = new MappingHelper()
  for (const it of distanceVertexList) helper.addMapping(it.f1, it.f2)
  return helper.mapping
}

const IdentityMapping: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0.5, 0.5],
]

class MappingHelper {
  /** Pares de progreso (forma de inicio → forma de fin), ordenados por el primero. */
  readonly mapping: Array<[number, number]> = []

  // Las características ya usadas de cada forma.
  private readonly usedF1 = new Set<ProgressableFeature>()
  private readonly usedF2 = new Set<ProgressableFeature>()

  addMapping(f1: ProgressableFeature, f2: ProgressableFeature): void {
    // Cada característica se usa una sola vez.
    if (this.usedF1.has(f1) || this.usedF2.has(f2)) return

    // `mapping` está ordenado: buscar dónde va el par nuevo.
    const index = binarySearchBy(this.mapping, f1.progress)
    if (index >= 0) throw new Error("There can't be two features with the same progress")

    const insertionIndex = -index - 1
    const n = this.mapping.length

    // El primero siempre se puede sumar.
    if (n >= 1) {
      const [before1, before2] = this.mapping[(insertionIndex + n - 1) % n]!
      const [after1, after2] = this.mapping[insertionIndex % n]!

      // Características demasiado cerca entre sí vuelven inestable el DoubleMapper.
      if (
        progressDistance(f1.progress, before1) < DistanceEpsilon ||
        progressDistance(f1.progress, after1) < DistanceEpsilon ||
        progressDistance(f2.progress, before2) < DistanceEpsilon ||
        progressDistance(f2.progress, after2) < DistanceEpsilon
      ) {
        return
      }

      // Con dos o más, el par nuevo no puede sumar un cruce.
      if (n > 1 && !progressInRange(f2.progress, before2, after2)) return
    }

    this.mapping.splice(insertionIndex, 0, [f1.progress, f2.progress])
    this.usedF1.add(f1)
    this.usedF2.add(f2)
  }
}

/**
 * `List.binarySearchBy` de Kotlin sobre el primer elemento: el índice si lo encuentra; si no,
 * `-(punto de inserción) - 1`.
 */
function binarySearchBy(list: ReadonlyArray<readonly [number, number]>, key: number): number {
  let low = 0
  let high = list.length - 1
  while (low <= high) {
    const mid = (low + high) >>> 1
    const midVal = list[mid]![0]
    if (midVal < key) low = mid + 1
    else if (midVal > key) high = mid - 1
    else return mid
  }
  return -(low + 1)
}

/**
 * Distancia (al cuadrado) entre dos características de formas distintas, para decidir cómo
 * emparejarlas.
 */
export function featureDistSquared(f1: Feature, f2: Feature): number {
  // El original deja pendiente emparejar esquinas convexas con cóncavas; por ahora se impide con
  // una distancia infinita.
  if (f1 instanceof Corner && f2 instanceof Corner && f1.convex !== f2.convex) return Number.MAX_VALUE
  return featureRepresentativePoint(f1).minus(featureRepresentativePoint(f2)).getDistanceSquared()
}

/** Punto que representa la característica: el medio entre su primer y su último anclaje. */
export function featureRepresentativePoint(feature: Feature): Point {
  const first = feature.cubics[0]!
  const last = feature.cubics.at(-1)!
  const x = (first.anchor0X + last.anchor1X) / 2
  const y = (first.anchor0Y + last.anchor1Y) / 2
  return new Point(x, y)
}
