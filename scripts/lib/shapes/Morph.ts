/*
 * Copyright 2022 The Android Open Source Project
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
// graphics/graphics-shapes/src/commonMain/kotlin/androidx/graphics/shapes/Morph.kt (ADR-0011).
//
// Diferencias con el original:
// - `match` (en el `companion object`) es el método estático `Morph.match`; los pares
//   `Pair<Cubic, Cubic>` son tuplas.
// - `forEachCubic` recibe la función como último parámetro y el `MutableCubic` opcional antes,
//   como en Kotlin, pero sin `inline`.
// - Sin el registro de depuración (`DEBUG`, `debugLog`).

import { Cubic, MutableCubic } from './Cubic.ts'
import { featureMapper } from './FeatureMapping.ts'
import { LengthMeasurer, MeasuredPolygon, type MeasuredCubic } from './PolygonMeasure.ts'
import type { RoundedPolygon } from './RoundedPolygon.ts'
import { AngleEpsilon, interpolate, positiveModulo } from './Utils.ts'

/**
 * Anima entre dos RoundedPolygon. Empareja las curvas de las dos formas (por cercanía, por la
 * distancia a los vértices y por la concavidad) y parte las que hace falta cuando una forma tiene
 * más curvas que la otra o están ubicadas muy distinto. El resultado son pares de curvas, una de
 * cada forma, que se interpolan para dibujar la forma intermedia.
 */
export class Morph {
  private readonly start: RoundedPolygon
  private readonly end: RoundedPolygon
  /**
   * Los pares de curvas: la primera de cada par es la geometría de la forma de inicio y la
   * segunda, la de la de fin (las curvas originales pueden estar partidas para alinearlas).
   */
  readonly morphMatch: ReadonlyArray<readonly [Cubic, Cubic]>

  constructor(start: RoundedPolygon, end: RoundedPolygon) {
    this.start = start
    this.end = end
    this.morphMatch = Morph.match(start, end)
  }

  /**
   * Rectángulo que contiene las dos formas: [izquierda, arriba, derecha, abajo]. Con
   * `approximate` (por defecto), el de los anclajes y puntos de control.
   */
  calculateBounds(bounds: number[] = [0, 0, 0, 0], approximate = true): number[] {
    this.start.calculateBounds(bounds, approximate)
    const [minX, minY, maxX, maxY] = bounds as [number, number, number, number]
    this.end.calculateBounds(bounds, approximate)
    bounds[0] = Math.min(minX, bounds[0]!)
    bounds[1] = Math.min(minY, bounds[1]!)
    bounds[2] = Math.max(maxX, bounds[2]!)
    bounds[3] = Math.max(maxY, bounds[3]!)
    return bounds
  }

  /** Cuadrado que contiene las dos formas en cualquier rotación (ver `RoundedPolygon.calculateMaxBounds`). */
  calculateMaxBounds(bounds: number[] = [0, 0, 0, 0]): number[] {
    this.start.calculateMaxBounds(bounds)
    const [minX, minY, maxX, maxY] = bounds as [number, number, number, number]
    this.end.calculateMaxBounds(bounds)
    bounds[0] = Math.min(minX, bounds[0]!)
    bounds[1] = Math.min(minY, bounds[1]!)
    bounds[2] = Math.max(maxX, bounds[2]!)
    bounds[3] = Math.max(maxY, bounds[3]!)
    return bounds
  }

  /**
   * La forma en `progress` como lista de curvas: 0 es la forma de inicio, 1 la de fin, y lo del
   * medio, la interpolación lineal. Valores un poco fuera de [0, 1] exageran la forma (sirven
   * para un rebote).
   */
  asCubics(progress: number): Cubic[] {
    const out: Cubic[] = []
    // El último anclaje tiene que coincidir exactamente con el primero: una diferencia mínima, aun
    // menor que un píxel, puede dejar marcas al dibujar.
    let firstCubic: Cubic | undefined
    let lastCubic: Cubic | undefined
    for (const [first, second] of this.morphMatch) {
      const cubic = new Cubic(Float64Array.from({ length: 8 }, (_, it) => interpolate(first.points[it]!, second.points[it]!, progress)))
      firstCubic ??= cubic
      if (lastCubic) out.push(lastCubic)
      lastCubic = cubic
    }
    if (lastCubic && firstCubic) {
      out.push(
        Cubic.of(
          lastCubic.anchor0X,
          lastCubic.anchor0Y,
          lastCubic.control0X,
          lastCubic.control0Y,
          lastCubic.control1X,
          lastCubic.control1Y,
          firstCubic.anchor0X,
          firstCubic.anchor0Y,
        ),
      )
    }
    return out
  }

  /**
   * Como `asCubics`, pero llama a `callback` con cada curva sin crear instancias nuevas: reusa el
   * mismo `MutableCubic`. A diferencia de `asCubics`, no ajusta el último anclaje al primero.
   */
  forEachCubic(progress: number, mutableCubic: MutableCubic, callback: (cubic: MutableCubic) => void): void
  forEachCubic(progress: number, callback: (cubic: MutableCubic) => void): void
  forEachCubic(
    progress: number,
    a: MutableCubic | ((cubic: MutableCubic) => void),
    b?: (cubic: MutableCubic) => void,
  ): void {
    const mutableCubic = a instanceof MutableCubic ? a : new MutableCubic()
    const callback = (a instanceof MutableCubic ? b : a)!
    for (const [first, second] of this.morphMatch) {
      mutableCubic.interpolate(first, second, progress)
      callback(mutableCubic)
    }
  }

  /**
   * Arma los pares de curvas al construir el Morph. Mide las dos formas (dónde cae cada punto,
   * en proporción, sobre el contorno), empareja sus características con `featureMapper` y
   * recorre las dos listas de curvas a la vez, partiendo la que termina más tarde cada vez que
   * no coinciden.
   */
  static match(p1: RoundedPolygon, p2: RoundedPolygon): Array<[Cubic, Cubic]> {
    // Medir los polígonos: la lista de curvas medidas de cada uno.
    const measuredPolygon1 = MeasuredPolygon.measurePolygon(new LengthMeasurer(), p1)
    const measuredPolygon2 = MeasuredPolygon.measurePolygon(new LengthMeasurer(), p2)

    // Las esquinas de cada polígono con el progreso en su punto medio, para compararlas.
    const features1 = measuredPolygon1.features
    const features2 = measuredPolygon2.features

    // Lleva un progreso de una forma al de la otra (en las dos direcciones), emparejando cada
    // característica con la más cercana de la otra forma.
    const doubleMapper = featureMapper(features1, features2)

    // El punto de corte del segundo polígono es el que corresponde al 0 del primero.
    const polygon2CutPoint = doubleMapper.map(0)

    // Cortar y rotar: el segundo polígono empieza en el punto de corte, así los dos se recorren a
    // la par. Las curvas medidas de bs1 y bs2 van de 0 a 1.
    const bs1 = measuredPolygon1
    const bs2 = measuredPolygon2.cutAndShift(polygon2CutPoint)

    // Emparejar: recorrer las dos listas y armar los pares de curvas de inicio y fin.
    const ret: Array<[Cubic, Cubic]> = []
    // Índices de la curva actual de cada forma.
    let i1 = 0
    let i2 = 0
    // La curva medida actual de cada polígono.
    let b1: MeasuredCubic | undefined = bs1.getOrNull(i1++)
    let b2: MeasuredCubic | undefined = bs2.getOrNull(i2++)
    // Hasta emparejar todas las curvas.
    while (b1 && b2) {
      // Progresos vistos desde la primera forma: dónde terminan las dos curvas actuales.
      const b1a = i1 === bs1.size ? 1 : b1.endOutlineProgress
      const b2a = i2 === bs2.size ? 1 : doubleMapper.mapBack(positiveModulo(b2.endOutlineProgress + polygon2CutPoint, 1))
      const minb = Math.min(b1a, b2a)
      // minb es donde termina la curva que termina primero. Si las dos terminan ahí, coinciden;
      // si una sigue de largo, se parte.
      let seg1: MeasuredCubic
      let newb1: MeasuredCubic | undefined
      if (b1a > minb + AngleEpsilon) {
        ;[seg1, newb1] = b1.cutAtProgress(minb)
      } else {
        seg1 = b1
        newb1 = bs1.getOrNull(i1++)
      }
      let seg2: MeasuredCubic
      let newb2: MeasuredCubic | undefined
      if (b2a > minb + AngleEpsilon) {
        ;[seg2, newb2] = b2.cutAtProgress(positiveModulo(doubleMapper.map(minb) - polygon2CutPoint, 1))
      } else {
        seg2 = b2
        newb2 = bs2.getOrNull(i2++)
      }
      ret.push([seg1.cubic, seg2.cubic])
      b1 = newb1
      b2 = newb2
    }
    if (b1 || b2) throw new Error("Expected both Polygon's Cubic to be fully matched")
    return ret
  }
}
