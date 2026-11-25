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

// Contornos del indicador de progreso circular ondulado (CircularWavyProgressIndicator), portados
// a TypeScript de androidx/androidx (ADR-0011):
// - @acea2f5c1f, compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/
//   internal/CircularWavyProgressModifiers.kt: CircularShapes.update (cuántos vértices, el
//   círculo de la pista y la estrella de la onda), CircularProgressDrawingCache.processPath
//   (escalar a size - stroke y centrar por el rectángulo del trazo);
// - @e6d33dd5d0, compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/
//   internal/ShapeUtil.kt: pathFromCubics con startAngle = 270 (el trazo empieza a las 12).
//
// Diferencias con el original: no dibuja en un Path de Compose; devuelve los comandos de SVG y su
// largo. Sin repeatPath: en SVG, el patrón de guiones (stroke-dasharray con período igual al largo
// del trazo) ya da la vuelta. El centrado usa los puntos de control (como Path.getBounds() de
// Android, que no calcula los extremos exactos de las curvas).

import { CornerRounding } from './CornerRounding.ts'
import type { Cubic } from './Cubic.ts'
import { Morph } from './Morph.ts'
import { circle, star } from './Shapes.ts'
import type { PathCommand } from './ShapeUtil.ts'

/** CircularProgressIndicatorTokens.ActiveWaveWavelength (dp). */
export const Wavelength = 15
/** MinCircularVertexCount. */
const MinCircularVertexCount = 5
/** startAngle por defecto de RoundedPolygon.toPath y Morph.toPath: las 12. */
const StartAngle = 270

/**
 * Vértices de la onda para un indicador de `size` dp con trazo de `strokeWidth`: 2πr / longitud de
 * onda, con r hasta el centro del trazo (CircularShapes.update).
 */
export function vertexCount(size: number, strokeWidth: number): number {
  const r = size / 2 - strokeWidth / 2
  return Math.max(MinCircularVertexCount, Math.round((2 * Math.PI * r) / Wavelength))
}

/** Pista (círculo) y onda (estrella) normalizadas, como en CircularShapes.update. */
export function circularPolygons(numVertices: number) {
  const track = circle({ numVertices }).normalized()
  const wave = star(numVertices, {
    innerRadius: 0.75,
    rounding: new CornerRounding(0.35, 0.4),
    innerRounding: new CornerRounding(0.5),
  }).normalized()
  return { track, wave, morph: new Morph(track, wave) }
}

/**
 * Comandos de un contorno normalizado (de 0 a 1, centro en 0,5): girado para empezar a las 12
 * (pathFromCubics gira alrededor del origen; processPath vuelve a centrar), escalado a `scale`
 * (size - stroke) y centrado en el origen por el rectángulo de sus puntos.
 */
export function circularPath(cubics: readonly Cubic[], scale: number): PathCommand[] {
  const first = cubics[0]!
  // El pivote del ángulo es el centro del polígono normalizado (0,5; 0,5).
  const angleToFirst = (Math.atan2(first.anchor0Y - 0.5, first.anchor0X - 0.5) * 180) / Math.PI
  const r = ((-angleToFirst + StartAngle) * Math.PI) / 180
  const cos = Math.cos(r)
  const sin = Math.sin(r)
  // Matrix.rotateZ de Compose: con y hacia abajo, un ángulo positivo gira en sentido horario.
  const map = (x: number, y: number): [number, number] => [(cos * x - sin * y) * scale, (sin * x + cos * y) * scale]

  const raw: PathCommand[] = []
  const [mx, my] = map(first.anchor0X, first.anchor0Y)
  raw.push({ type: 'M', x: mx, y: my })
  for (const c of cubics) {
    const [x1, y1] = map(c.control0X, c.control0Y)
    const [x2, y2] = map(c.control1X, c.control1Y)
    const [x, y] = map(c.anchor1X, c.anchor1Y)
    raw.push({ type: 'C', x1, y1, x2, y2, x, y })
  }
  raw.push({ type: 'Z' })

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const grow = (x: number, y: number) => {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  for (const c of raw) {
    if (c.type === 'M') grow(c.x, c.y)
    else if (c.type === 'C') {
      grow(c.x1, c.y1)
      grow(c.x2, c.y2)
      grow(c.x, c.y)
    }
  }
  const dx = (minX + maxX) / 2
  const dy = (minY + maxY) / 2
  return raw.map((c) =>
    c.type === 'M'
      ? { type: 'M', x: c.x - dx, y: c.y - dy }
      : c.type === 'C'
        ? { type: 'C', x1: c.x1 - dx, y1: c.y1 - dy, x2: c.x2 - dx, y2: c.y2 - dy, x: c.x - dx, y: c.y - dy }
        : c,
  )
}

/** Largo de un contorno (integración numérica de cada curva). */
export function pathLength(commands: readonly PathCommand[]): number {
  let length = 0
  let x0 = 0
  let y0 = 0
  let startX = 0
  let startY = 0
  const STEPS = 200
  for (const c of commands) {
    if (c.type === 'M') {
      x0 = startX = c.x
      y0 = startY = c.y
    } else if (c.type === 'C') {
      let px = x0
      let py = y0
      for (let i = 1; i <= STEPS; i++) {
        const t = i / STEPS
        const u = 1 - t
        const x = u * u * u * x0 + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x
        const y = u * u * u * y0 + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y
        length += Math.hypot(x - px, y - py)
        px = x
        py = y
      }
      x0 = c.x
      y0 = c.y
    } else {
      length += Math.hypot(startX - x0, startY - y0)
      x0 = startX
      y0 = startY
    }
  }
  return length
}

/** Distancia al centro, mínima y máxima, sobre las curvas (para medir la amplitud de la onda). */
export function radialRange(commands: readonly PathCommand[]): [min: number, max: number] {
  let min = Infinity
  let max = -Infinity
  let x0 = 0
  let y0 = 0
  for (const c of commands) {
    if (c.type === 'M') {
      x0 = c.x
      y0 = c.y
    } else if (c.type === 'C') {
      for (let i = 0; i <= 100; i++) {
        const t = i / 100
        const u = 1 - t
        const x = u * u * u * x0 + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x
        const y = u * u * u * y0 + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y
        const d = Math.hypot(x, y)
        min = Math.min(min, d)
        max = Math.max(max, d)
      }
      x0 = c.x
      y0 = c.y
    }
  }
  return [min, max]
}
