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
// graphics/graphics-shapes/src/commonMain/kotlin/androidx/graphics/shapes/Cubic.kt (ADR-0011).
//
// Diferencias con el original:
// - Kotlin usa Float (32 bits); acá los números son de 64 bits. Los resultados difieren en el
//   orden de 1e-7, muy por debajo de la precisión con que se escriben los contornos.
// - Las sobrecargas de constructor son métodos estáticos: `Cubic.fromPoints(a0, c0, c1, a1)` y
//   `Cubic.of(x0, y0, …)` (la función `Cubic(…)` de ocho Float del original).
// - Los operadores `+`, `*` y `/` son `plus`, `times` y `div`; `split` devuelve una tupla.
// - `MutablePoint` no se porta: no lo usa nada de lo portado.

import { Point } from './Point.ts'
import { DistanceEpsilon, convex, directionVector, distance, interpolate } from './Utils.ts'

/** Resultado de transformar un punto: [x, y]. */
export type TransformResult = readonly [x: number, y: number]

/** Función que transforma un punto (escala, traslación, rotación…). */
export type PointTransformer = (x: number, y: number) => TransformResult

/**
 * Curva de Bézier cúbica: dos puntos de anclaje (inicio y fin) y dos de control. Se guarda como
 * ocho números: anchor0X, anchor0Y, control0X, control0Y, control1X, control1Y, anchor1X,
 * anchor1Y.
 */
export class Cubic {
  readonly points: Float64Array

  constructor(points: Float64Array = new Float64Array(8)) {
    if (points.length !== 8) throw new Error('Points array size should be 8')
    this.points = points
  }

  static fromPoints(anchor0: Point, control0: Point, control1: Point, anchor1: Point): Cubic {
    return Cubic.of(anchor0.x, anchor0.y, control0.x, control0.y, control1.x, control1.y, anchor1.x, anchor1.y)
  }

  static of(
    anchor0X: number,
    anchor0Y: number,
    control0X: number,
    control0Y: number,
    control1X: number,
    control1Y: number,
    anchor1X: number,
    anchor1Y: number,
  ): Cubic {
    return new Cubic(Float64Array.of(anchor0X, anchor0Y, control0X, control0Y, control1X, control1Y, anchor1X, anchor1Y))
  }

  get anchor0X(): number {
    return this.points[0]!
  }
  get anchor0Y(): number {
    return this.points[1]!
  }
  get control0X(): number {
    return this.points[2]!
  }
  get control0Y(): number {
    return this.points[3]!
  }
  get control1X(): number {
    return this.points[4]!
  }
  get control1Y(): number {
    return this.points[5]!
  }
  get anchor1X(): number {
    return this.points[6]!
  }
  get anchor1Y(): number {
    return this.points[7]!
  }

  /** Punto de la curva en `t` (de 0 a 1). */
  pointOnCurve(t: number): Point {
    const u = 1 - t
    return new Point(
      this.anchor0X * (u * u * u) +
        this.control0X * (3 * t * u * u) +
        this.control1X * (3 * t * t * u) +
        this.anchor1X * (t * t * t),
      this.anchor0Y * (u * u * u) +
        this.control0Y * (3 * t * u * u) +
        this.control1Y * (3 * t * t * u) +
        this.anchor1Y * (t * t * t),
    )
  }

  zeroLength(): boolean {
    return (
      Math.abs(this.anchor0X - this.anchor1X) < DistanceEpsilon &&
      Math.abs(this.anchor0Y - this.anchor1Y) < DistanceEpsilon
    )
  }

  convexTo(next: Cubic): boolean {
    const prevVertex = new Point(this.anchor0X, this.anchor0Y)
    const currVertex = new Point(this.anchor1X, this.anchor1Y)
    const nextVertex = new Point(next.anchor1X, next.anchor1Y)
    return convex(prevVertex, currVertex, nextVertex)
  }

  private zeroIsh(value: number): boolean {
    return Math.abs(value) < DistanceEpsilon
  }

  /**
   * Rectángulo que contiene la curva: [izquierda, arriba, derecha, abajo] en `bounds`. Con
   * `approximate`, el de los cuatro puntos (anclajes y controles), más rápido y algo más grande;
   * sin él, el exacto, buscando los extremos de la curva.
   */
  calculateBounds(bounds: number[] = [0, 0, 0, 0], approximate = false): void {
    // Una curva de largo cero es un punto.
    if (this.zeroLength()) {
      bounds[0] = this.anchor0X
      bounds[1] = this.anchor0Y
      bounds[2] = this.anchor0X
      bounds[3] = this.anchor0Y
      return
    }

    let minX = Math.min(this.anchor0X, this.anchor1X)
    let minY = Math.min(this.anchor0Y, this.anchor1Y)
    let maxX = Math.max(this.anchor0X, this.anchor1X)
    let maxY = Math.max(this.anchor0Y, this.anchor1Y)

    if (approximate) {
      bounds[0] = Math.min(minX, Math.min(this.control0X, this.control1X))
      bounds[1] = Math.min(minY, Math.min(this.control0Y, this.control1Y))
      bounds[2] = Math.max(maxX, Math.max(this.control0X, this.control1X))
      bounds[3] = Math.max(maxY, Math.max(this.control0Y, this.control1Y))
      return
    }

    // Los extremos están donde la derivada (una cuadrática) vale cero.
    const inRange = (t: number) => t >= 0 && t <= 1

    const xa = -this.anchor0X + 3 * this.control0X - 3 * this.control1X + this.anchor1X
    const xb = 2 * this.anchor0X - 4 * this.control0X + 2 * this.control1X
    const xc = -this.anchor0X + this.control0X
    const takeX = (t: number) => {
      if (!inRange(t)) return
      const it = this.pointOnCurve(t).x
      if (it < minX) minX = it
      if (it > maxX) maxX = it
    }
    if (this.zeroIsh(xa)) {
      if (xb !== 0) takeX((2 * xc) / (-2 * xb))
    } else {
      const xs = xb * xb - 4 * xa * xc
      if (xs >= 0) {
        takeX((-xb + Math.sqrt(xs)) / (2 * xa))
        takeX((-xb - Math.sqrt(xs)) / (2 * xa))
      }
    }

    const ya = -this.anchor0Y + 3 * this.control0Y - 3 * this.control1Y + this.anchor1Y
    const yb = 2 * this.anchor0Y - 4 * this.control0Y + 2 * this.control1Y
    const yc = -this.anchor0Y + this.control0Y
    const takeY = (t: number) => {
      if (!inRange(t)) return
      const it = this.pointOnCurve(t).y
      if (it < minY) minY = it
      if (it > maxY) maxY = it
    }
    if (this.zeroIsh(ya)) {
      if (yb !== 0) takeY((2 * yc) / (-2 * yb))
    } else {
      const ys = yb * yb - 4 * ya * yc
      if (ys >= 0) {
        takeY((-yb + Math.sqrt(ys)) / (2 * ya))
        takeY((-yb - Math.sqrt(ys)) / (2 * ya))
      }
    }
    bounds[0] = minX
    bounds[1] = minY
    bounds[2] = maxX
    bounds[3] = maxY
  }

  /** Parte la curva en `t` (algoritmo de De Casteljau). */
  split(t: number): [Cubic, Cubic] {
    const u = 1 - t
    const pointOnCurve = this.pointOnCurve(t)
    return [
      Cubic.of(
        this.anchor0X,
        this.anchor0Y,
        this.anchor0X * u + this.control0X * t,
        this.anchor0Y * u + this.control0Y * t,
        this.anchor0X * (u * u) + this.control0X * (2 * u * t) + this.control1X * (t * t),
        this.anchor0Y * (u * u) + this.control0Y * (2 * u * t) + this.control1Y * (t * t),
        pointOnCurve.x,
        pointOnCurve.y,
      ),
      Cubic.of(
        pointOnCurve.x,
        pointOnCurve.y,
        this.control0X * (u * u) + this.control1X * (2 * u * t) + this.anchor1X * (t * t),
        this.control0Y * (u * u) + this.control1Y * (2 * u * t) + this.anchor1Y * (t * t),
        this.control1X * u + this.anchor1X * t,
        this.control1Y * u + this.anchor1Y * t,
        this.anchor1X,
        this.anchor1Y,
      ),
    ]
  }

  /** La misma curva recorrida al revés. */
  reverse(): Cubic {
    return Cubic.of(
      this.anchor1X,
      this.anchor1Y,
      this.control1X,
      this.control1Y,
      this.control0X,
      this.control0Y,
      this.anchor0X,
      this.anchor0Y,
    )
  }

  plus(o: Cubic): Cubic {
    return new Cubic(this.points.map((v, i) => v + o.points[i]!))
  }

  times(x: number): Cubic {
    return new Cubic(this.points.map((v) => v * x))
  }

  div(x: number): Cubic {
    return this.times(1 / x)
  }

  toString(): string {
    return (
      `anchor0: (${this.anchor0X}, ${this.anchor0Y}) control0: (${this.control0X}, ${this.control0Y}), ` +
      `control1: (${this.control1X}, ${this.control1Y}), anchor1: (${this.anchor1X}, ${this.anchor1Y})`
    )
  }

  equals(other: unknown): boolean {
    if (this === other) return true
    if (!(other instanceof Cubic)) return false
    return this.points.every((v, i) => v === other.points[i])
  }

  transformed(f: PointTransformer): Cubic {
    const newCubic = new MutableCubic()
    newCubic.points.set(this.points)
    newCubic.transform(f)
    return newCubic
  }

  /** Recta de (x0, y0) a (x1, y1), con los controles a un tercio y dos tercios. */
  static straightLine(x0: number, y0: number, x1: number, y1: number): Cubic {
    return Cubic.of(
      x0,
      y0,
      interpolate(x0, x1, 1 / 3),
      interpolate(y0, y1, 1 / 3),
      interpolate(x0, x1, 2 / 3),
      interpolate(y0, y1, 2 / 3),
      x1,
      y1,
    )
  }

  /**
   * Arco circular aproximado alrededor de (centerX, centerY), de (x0, y0) a (x1, y1). Los dos
   * puntos tienen que estar a la misma distancia del centro; el arco va por el lado más corto.
   */
  static circularArc(centerX: number, centerY: number, x0: number, y0: number, x1: number, y1: number): Cubic {
    const p0d = directionVector(x0 - centerX, y0 - centerY)
    const p1d = directionVector(x1 - centerX, y1 - centerY)
    const rotatedP0 = p0d.rotate90()
    const rotatedP1 = p1d.rotate90()
    const clockwise = rotatedP0.dotProductXY(x1 - centerX, y1 - centerY) >= 0
    const cosa = p0d.dotProduct(p1d)
    if (cosa > 0.999) /* p0 ~= p1 */ return Cubic.straightLine(x0, y0, x1, y1)
    const k =
      ((((distance(x0 - centerX, y0 - centerY) * 4) / 3) * (Math.sqrt(2 * (1 - cosa)) - Math.sqrt(1 - cosa * cosa))) /
        (1 - cosa)) *
      (clockwise ? 1 : -1)
    return Cubic.of(
      x0,
      y0,
      x0 + rotatedP0.x * k,
      y0 + rotatedP0.y * k,
      x1 - rotatedP1.x * k,
      y1 - rotatedP1.y * k,
      x1,
      y1,
    )
  }

  /** Curva de largo cero en (x0, y0). */
  static empty(x0: number, y0: number): Cubic {
    return Cubic.of(x0, y0, x0, y0, x0, y0, x0, y0)
  }
}

/** Cubic que se puede modificar en el lugar. */
export class MutableCubic extends Cubic {
  private transformOnePoint(f: PointTransformer, ix: number): void {
    const [x, y] = f(this.points[ix]!, this.points[ix + 1]!)
    this.points[ix] = x
    this.points[ix + 1] = y
  }

  transform(f: PointTransformer): void {
    this.transformOnePoint(f, 0)
    this.transformOnePoint(f, 2)
    this.transformOnePoint(f, 4)
    this.transformOnePoint(f, 6)
  }

  interpolate(c1: Cubic, c2: Cubic, progress: number): void {
    for (let i = 0; i < 8; i++) this.points[i] = interpolate(c1.points[i]!, c2.points[i]!, progress)
  }
}
