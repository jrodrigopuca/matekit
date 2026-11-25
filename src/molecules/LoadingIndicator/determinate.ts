// Contorno del indicador determinado (sin JSX, para probarlo en Node contra el Morph de
// scripts/lib/shapes/). Como en Compose (LoadingIndicatorImpl con progress), la forma es el Morph
// Circle → SoftBurst en `value` y cada fotograma se centra por el rectángulo de sus puntos. El
// Morph es una interpolación lineal de dos contornos con la misma estructura, así que alcanza con
// guardar el de inicio y el de fin (loading-indicator-data.ts) e interpolar acá.

import { DETERMINATE } from './loading-indicator-data.ts'

/** `value` acotado a [0, 1]; NaN cuenta como 0, como en Compose. */
export function clampProgress(value: number): number {
  return Number.isNaN(value) ? 0 : Math.min(1, Math.max(0, value))
}

/**
 * Atributo `d` (relativo, en las unidades del viewBox) del indicador determinado en `value`, ya
 * acotado. Coordenadas enteras: 0,05 dp de error a 48 dp.
 */
export function determinatePathData(value: number): string {
  const { start, end } = DETERMINATE
  const points = start.map((s, i) => s + (end[i]! - s) * value)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i < points.length; i += 2) {
    minX = Math.min(minX, points[i]!)
    maxX = Math.max(maxX, points[i]!)
    minY = Math.min(minY, points[i + 1]!)
    maxY = Math.max(maxY, points[i + 1]!)
  }
  const dx = (minX + maxX) / 2
  const dy = (minY + maxY) / 2
  const r = points.map((v, i) => Math.round(v - (i % 2 === 0 ? dx : dy)) || 0)
  // Diferencias entre coordenadas absolutas ya redondeadas: el error no se acumula.
  const num = (v: number) => (v < 0 ? String(v) : ` ${v}`)
  let x0 = r[0]!
  let y0 = r[1]!
  let d = `M${x0}${num(y0)}c`
  for (let i = 2; i < r.length; i += 6) {
    for (let j = 0; j < 6; j++) {
      const v = r[i + j]! - (j % 2 === 0 ? x0 : y0)
      d += i === 2 && j === 0 ? String(v) : num(v)
    }
    x0 = r[i + 4]!
    y0 = r[i + 5]!
  }
  return d + 'z'
}

/** Giro del indicador determinado en `value`: media vuelta en sentido antihorario hasta 1. */
export function determinateRotation(value: number): number {
  return -value * 180
}
