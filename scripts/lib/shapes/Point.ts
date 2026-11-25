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
// graphics/graphics-shapes/src/commonMain/kotlin/androidx/graphics/shapes/Point.kt (ADR-0011).
//
// En Kotlin, Point es un par de Float con funciones de extensión; acá es una clase inmutable con
// esos mismos métodos. Los operadores (`-a`, `a - b`, `a * k`…) son métodos con el nombre del
// operador de Kotlin (`unaryMinus`, `minus`, `times`…). No importa nada: Utils.ts importa este
// archivo y un ciclo entre los dos fallaría al cargar.

import type { PointTransformer } from './Cubic.ts'

export class Point {
  readonly x: number
  readonly y: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  copy(x: number = this.x, y: number = this.y): Point {
    return new Point(x, y)
  }

  getDistance(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }

  getDistanceSquared(): number {
    return this.x * this.x + this.y * this.y
  }

  dotProduct(other: Point): number {
    return this.x * other.x + this.y * other.y
  }

  /** La sobrecarga `dotProduct(otherX, otherY)` del original. */
  dotProductXY(otherX: number, otherY: number): number {
    return this.x * otherX + this.y * otherY
  }

  /** Si `other` queda en sentido horario respecto de este vector. */
  clockwise(other: Point): boolean {
    return this.x * other.y - this.y * other.x > 0
  }

  /** Vector unitario con la misma dirección. */
  getDirection(): Point {
    const d = this.getDistance()
    if (!(d > 0)) throw new Error("Can't get the direction of a 0-length vector")
    return this.div(d)
  }

  /** De Utils.kt (`Point.rotate90()`): el vector girado 90°. */
  rotate90(): Point {
    return new Point(-this.y, this.x)
  }

  unaryMinus(): Point {
    return new Point(-this.x, -this.y)
  }

  minus(other: Point): Point {
    return new Point(this.x - other.x, this.y - other.y)
  }

  plus(other: Point): Point {
    return new Point(this.x + other.x, this.y + other.y)
  }

  times(operand: number): Point {
    return new Point(this.x * operand, this.y * operand)
  }

  div(operand: number): Point {
    return new Point(this.x / operand, this.y / operand)
  }

  rem(operand: number): Point {
    return new Point(this.x % operand, this.y % operand)
  }

  transformed(f: PointTransformer): Point {
    const [x, y] = f(this.x, this.y)
    return new Point(x, y)
  }

  toString(): string {
    return `(${this.x}, ${this.y})`
  }
}

/** La sobrecarga `interpolate(start: Point, stop: Point, fraction)` del original. */
export function interpolatePoint(start: Point, stop: Point, fraction: number): Point {
  return new Point(
    (1 - fraction) * start.x + fraction * stop.x,
    (1 - fraction) * start.y + fraction * stop.y,
  )
}
