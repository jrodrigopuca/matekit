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
// graphics/graphics-shapes/src/commonMain/kotlin/androidx/graphics/shapes/FloatMapping.kt
// (ADR-0011).
//
// Diferencias con el original:
// - Los pares `Float to Float` son tuplas `[number, number]`; `FloatList`, arreglos.
// - Los números son de 64 bits: las pruebas que el original saltea en JS por redondeo
//   (`@IgnoreJsTarget`) acá pasan.

import { DistanceEpsilon, positiveModulo } from './Utils.ts'

/**
 * Si `progress` está en el rango de `progressFrom` a `progressTo`. El progreso va de 0 a 1 y da
 * la vuelta: si `progressTo < progressFrom` (por ejemplo, de 0,7 a 0,2), 0,8 y 0,1 están dentro
 * y 0,5 no.
 */
export function progressInRange(progress: number, progressFrom: number, progressTo: number): boolean {
  return progressTo >= progressFrom
    ? progress >= progressFrom && progress <= progressTo
    : progress >= progressFrom || progress <= progressTo
}

/** Lleva `x` de los valores `xValues` a los `yValues`, interpolando y dando la vuelta en 1. */
export function linearMap(xValues: readonly number[], yValues: readonly number[], x: number): number {
  if (!(x >= 0 && x <= 1)) throw new Error(`Invalid progress: ${x}`)
  const segmentStartIndex = xValues.findIndex((v, i) => progressInRange(x, v, xValues[(i + 1) % xValues.length]!))
  if (segmentStartIndex < 0) throw new Error('Collection contains no element matching the predicate.')
  const segmentEndIndex = (segmentStartIndex + 1) % xValues.length
  const segmentSizeX = positiveModulo(xValues[segmentEndIndex]! - xValues[segmentStartIndex]!, 1)
  const segmentSizeY = positiveModulo(yValues[segmentEndIndex]! - yValues[segmentStartIndex]!, 1)
  const positionInSegment =
    segmentSizeX < 0.001 ? 0.5 : positiveModulo(x - xValues[segmentStartIndex]!, 1) / segmentSizeX
  return positiveModulo(yValues[segmentStartIndex]! + segmentSizeY * positionInSegment, 1)
}

/**
 * Correspondencia entre valores de 0 a 1 de un espacio de origen y uno de destino, en las dos
 * direcciones. Se arma con unos pares representativos y se extiende al intervalo completo
 * interpolando y dando la vuelta. Con los pares 0 → 0 y 0,5 → 0,25, por ejemplo, de 0 a 0,5 da
 * x / 2 y de 0,5 a 1, 1,5·x − 0,5; `mapBack` hace la cuenta inversa. Morph la usa para pasar el
 * progreso sobre el contorno de una forma al de la otra.
 */
export class DoubleMapper {
  private readonly sourceValues: number[]
  private readonly targetValues: number[]

  constructor(...mappings: ReadonlyArray<readonly [number, number]>) {
    this.sourceValues = mappings.map((m) => m[0])
    this.targetValues = mappings.map((m) => m[1])
    // Los dos crecen, salvo a lo sumo una vez (el progreso da la vuelta).
    validateProgress(this.sourceValues)
    validateProgress(this.targetValues)
  }

  map(x: number): number {
    return linearMap(this.sourceValues, this.targetValues, x)
  }

  mapBack(x: number): number {
    return linearMap(this.targetValues, this.sourceValues, x)
  }

  /** La identidad: dos puntos de la diagonal, lo más separados posible para reducir el error. */
  static readonly Identity = new DoubleMapper([0, 0], [0.5, 0.5])
}

/**
 * Comprueba que los valores estén en [0, 1), no se repitan y crezcan, salvo a lo sumo una vez
 * contando también el par del último al primero. (0, 0,3, 0,6), (0,3, 0,6, 0) y (0,6, 0,3, 0)
 * valen; (0,5, 0, 0,7) no (baja dos veces).
 */
export function validateProgress(p: readonly number[]): void {
  let prev = p.at(-1)!
  let wraps = 0
  for (const curr of p) {
    if (!(curr >= 0 && curr < 1)) throw new Error('FloatMapping - Progress outside of range: ' + p.join(', '))
    if (!(progressDistance(curr, prev) > DistanceEpsilon)) {
      throw new Error('FloatMapping - Progress repeats a value: ' + p.join(', '))
    }
    if (curr < prev) {
      wraps++
      if (wraps > 1) throw new Error('FloatMapping - Progress wraps more than once: ' + p.join(', '))
    }
    prev = curr
  }
}

/** Distancia entre dos progresos, que dan la vuelta: 0,99 de diferencia es 0,01. */
export function progressDistance(p1: number, p2: number): number {
  const it = Math.abs(p1 - p2)
  return Math.min(it, 1 - it)
}
