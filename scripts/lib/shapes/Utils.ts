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
// graphics/graphics-shapes/src/commonMain/kotlin/androidx/graphics/shapes/Utils.kt (ADR-0011).
//
// Sin portar: findMinimum (solo la usa Morph, entrega 2) y debugLog (registro de depuración).
// `Point.rotate90()` está en Point.ts como método.

import { Point } from './Point.ts'

export function distance(x: number, y: number): number {
  return Math.sqrt(x * x + y * y)
}

export function distanceSquared(x: number, y: number): number {
  return x * x + y * y
}

/** Vector unitario en la dirección (x, y). */
export function directionVector(x: number, y: number): Point {
  const d = distance(x, y)
  if (!(d > 0)) throw new Error('Required distance greater than zero')
  return new Point(x / d, y / d)
}

/** La sobrecarga `directionVector(angleRadians)` del original. */
export function directionVectorFromAngle(angleRadians: number): Point {
  return new Point(Math.cos(angleRadians), Math.sin(angleRadians))
}

export function radialToCartesian(radius: number, angleRadians: number, center: Point = Zero): Point {
  return directionVectorFromAngle(angleRadians).times(radius).plus(center)
}

/** Distancia por debajo de la cual dos puntos se consideran iguales. */
export const DistanceEpsilon = 1e-4
export const AngleEpsilon = 1e-6
/** Tolerancia más amplia, para comparar puntos que vienen de cálculos con más error. */
export const RelaxedDistanceEpsilon = 5e-3

export const Zero = new Point(0, 0)

export const FloatPi = Math.PI

export const TwoPi = 2 * Math.PI

/**
 * `Float.MIN_VALUE` de Kotlin: el menor Float **positivo** (no el más negativo). El original lo
 * usa como valor inicial del máximo en `RoundedPolygon.calculateBounds`; se conserva igual.
 */
export const FloatMinValue = 1.401298464324817e-45

export function square(x: number): number {
  return x * x
}

export function interpolate(start: number, stop: number, fraction: number): number {
  return (1 - fraction) * start + fraction * stop
}

export function positiveModulo(num: number, mod: number): number {
  return ((num % mod) + mod) % mod
}

/** Si los tres puntos están casi alineados. */
export function collinearIsh(
  aX: number,
  aY: number,
  bX: number,
  bY: number,
  cX: number,
  cY: number,
  tolerance: number = DistanceEpsilon,
): boolean {
  // El producto escalar de dos vectores perpendiculares es 0: girando uno de los dos, se evita
  // pasar el producto a grados.
  const ab = new Point(bX - aX, bY - aY).rotate90()
  const ac = new Point(cX - aX, cY - aY)
  const dotProduct = Math.abs(ab.dotProduct(ac))
  const relativeTolerance = tolerance * ab.getDistance() * ac.getDistance()

  return dotProduct < tolerance || dotProduct < relativeTolerance
}

/** Si el vértice `current` es convexo, recorriendo previous → current → next. */
export function convex(previous: Point, current: Point, next: Point): boolean {
  // El original advierte que es un cálculo rápido pero no del todo confiable (b/369320447).
  return current.minus(previous).clockwise(next.minus(current))
}
