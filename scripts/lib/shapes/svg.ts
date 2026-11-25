// Contornos SVG de las formas portadas de androidx.graphics.shapes (ADR-0011). Código propio
// de matekit (no es parte de la portación): ajusta un RoundedPolygon normalizado a un viewBox
// como lo hace `RoundedPolygon.toShape()` de Compose y lo escribe como atributo `d`.
//
// No importa React, componentes ni tokens/.

import type { RoundedPolygon } from './RoundedPolygon.ts'
import { toPath, type PathCommand } from './ShapeUtil.ts'

/**
 * Comandos del contorno ajustado a un cuadrado de `size` de lado, como `toShape()` de Compose:
 * escala x e y por el tamaño y traslada la forma para que el centro de su rectángulo (el de los
 * anclajes y puntos de control, como `Path.getBounds()`) quede en el centro del cuadrado. Para
 * una forma normalizada, la traslación es nula.
 */
export function fitToSquare(polygon: RoundedPolygon, size: number): PathCommand[] {
  const [left, top, right, bottom] = polygon.calculateBounds().map((v) => v * size) as [number, number, number, number]
  const dx = size / 2 - (left + right) / 2
  const dy = size / 2 - (top + bottom) / 2
  return toPath(polygon).map((c): PathCommand => {
    switch (c.type) {
      case 'M':
        return { type: 'M', x: c.x * size + dx, y: c.y * size + dy }
      case 'C':
        return {
          type: 'C',
          x1: c.x1 * size + dx,
          y1: c.y1 * size + dy,
          x2: c.x2 * size + dx,
          y2: c.y2 * size + dy,
          x: c.x * size + dx,
          y: c.y * size + dy,
        }
      case 'Z':
        return c
    }
  })
}

/**
 * Atributo `d` con `precision` decimales. Una cúbica recta (sus controles a un tercio y dos
 * tercios del segmento, como `Cubic.straightLine`) se escribe como `L`: es el mismo trazo con
 * cuatro números menos.
 */
export function toSvgPathData(commands: readonly PathCommand[], precision: number): string {
  const n = (v: number) => {
    const s = String(Number(v.toFixed(precision)))
    return s === '-0' ? '0' : s
  }
  const pairs = (...vs: number[]) => vs.map(n).join(' ')
  const tolerance = 10 ** -(precision + 2)
  let out = ''
  let x0 = 0
  let y0 = 0
  for (const c of commands) {
    if (c.type === 'M') {
      out += `M${pairs(c.x, c.y)}`
      ;[x0, y0] = [c.x, c.y]
    } else if (c.type === 'C') {
      const straight =
        Math.abs(c.x1 - (x0 + (c.x - x0) / 3)) < tolerance &&
        Math.abs(c.y1 - (y0 + (c.y - y0) / 3)) < tolerance &&
        Math.abs(c.x2 - (x0 + (2 * (c.x - x0)) / 3)) < tolerance &&
        Math.abs(c.y2 - (y0 + (2 * (c.y - y0)) / 3)) < tolerance
      out += straight ? `L${pairs(c.x, c.y)}` : `C${pairs(c.x1, c.y1, c.x2, c.y2, c.x, c.y)}`
      ;[x0, y0] = [c.x, c.y]
    } else {
      out += 'Z'
    }
  }
  return out
}
