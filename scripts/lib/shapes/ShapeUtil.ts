/*
 * Copyright 2024 The Android Open Source Project
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
// compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/internal/ShapeUtil.kt
// (ADR-0011), más lo mínimo de compose/ui/ui-graphics/.../Matrix.kt que usa MaterialShapes.kt.
//
// Diferencias con el original:
// - `Matrix` es solo la parte 2D de la matriz 4×4 de Compose, con `rotateZ`, `scale` y `map`
//   (misma convención: rotateZ con grados positivos gira de x hacia y, que en pantalla, con y
//   hacia abajo, es el sentido horario).
// - `toPath` y `morphToPath` (el `Morph.toPath` del original) no dibujan en un `Path` de Compose:
//   devuelven los comandos (moveTo, cubicTo, close) para escribirlos como SVG. Solo se porta el
//   caso que usan `RoundedPolygon.toShape()` y `LoadingIndicator`: `startAngle = 0`, sin
//   `repeatPath` y cerrado.

import type { Cubic } from './Cubic.ts'
import type { Morph } from './Morph.ts'
import type { RoundedPolygon } from './RoundedPolygon.ts'

/** Transformación afín 2D: x' = a·x + c·y + tx, y' = b·x + d·y + ty. Empieza en la identidad. */
export class Matrix {
  a = 1
  b = 0
  c = 0
  d = 1
  tx = 0
  ty = 0

  /** Gira `degrees` grados alrededor del origen (después de lo que ya hace la matriz). */
  rotateZ(degrees: number): this {
    const r = degrees * (Math.PI / 180)
    const s = Math.sin(r)
    const cos = Math.cos(r)
    // Igual que Compose: las filas 0 y 1 de la matriz se combinan con el giro.
    const [a, b, c, d] = [this.a, this.b, this.c, this.d]
    this.a = cos * a + s * c
    this.b = cos * b + s * d
    this.c = -s * a + cos * c
    this.d = -s * b + cos * d
    return this
  }

  /** Escala x por `x` e y por `y`. */
  scale(x = 1, y = 1): this {
    this.a *= x
    this.b *= x
    this.c *= y
    this.d *= y
    return this
  }

  map(x: number, y: number): [number, number] {
    return [this.a * x + this.c * y + this.tx, this.b * x + this.d * y + this.ty]
  }
}

/** Transforma un RoundedPolygon con una Matrix. */
export function transformed(polygon: RoundedPolygon, matrix: Matrix): RoundedPolygon {
  return polygon.transformed((x, y) => matrix.map(x, y))
}

export type PathCommand =
  | { type: 'M'; x: number; y: number }
  | { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { type: 'Z' }

/** Comandos de trazo de un RoundedPolygon: un moveTo, un cubicTo por curva y close. */
export function toPath(polygon: RoundedPolygon): PathCommand[] {
  return pathFromCubics(polygon.cubics)
}

/** Comandos de trazo de un Morph en `progress` (el `Morph.toPath` del original, con `startAngle = 0`). */
export function morphToPath(morph: Morph, progress: number): PathCommand[] {
  return pathFromCubics(morph.asCubics(progress))
}

function pathFromCubics(cubics: readonly Cubic[]): PathCommand[] {
  const path: PathCommand[] = []
  let first = true
  for (const it of cubics) {
    if (first) {
      path.push({ type: 'M', x: it.anchor0X, y: it.anchor0Y })
      first = false
    }
    path.push({ type: 'C', x1: it.control0X, y1: it.control0Y, x2: it.control1X, y2: it.control1Y, x: it.anchor1X, y: it.anchor1Y })
  }
  path.push({ type: 'Z' })
  return path
}
