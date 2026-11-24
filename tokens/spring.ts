// Resortes de Material 3 convertidos a CSS (duración + curva linear()).
// Modelo: masa 1, posición de 0 a 1, velocidad inicial 0, como los springs de Compose.

import type { Spring } from './types.ts'

/** Distancia al destino a partir de la cual se considera asentado. */
export const SETTLE_THRESHOLD = 0.001
/** Error máximo admitido entre la curva linear() y el resorte real. */
export const MAX_LINEAR_ERROR = 0.002

/** Posición del resorte en el instante t (segundos), solución analítica. */
export function springPosition(t: number, { damping, stiffness }: Spring): number {
  const w = Math.sqrt(stiffness)
  if (damping < 1) {
    const wd = w * Math.sqrt(1 - damping * damping)
    const decay = Math.exp(-damping * w * t)
    return 1 - decay * (Math.cos(wd * t) + ((damping * w) / wd) * Math.sin(wd * t))
  }
  if (damping === 1) return 1 - Math.exp(-w * t) * (1 + w * t)
  throw new Error(`Resorte sobreamortiguado (damping ${damping}) no soportado`)
}

/** Milisegundos hasta quedar a menos de SETTLE_THRESHOLD del destino, redondeado a 10 ms. */
export function settleMs(spring: Spring): number {
  let last = 0
  for (let ms = 0; ms <= 5000; ms++) {
    if (Math.abs(1 - springPosition(ms / 1000, spring)) >= SETTLE_THRESHOLD) last = ms
  }
  return Math.ceil((last + 1) / 10) * 10
}

/** Valor de una curva linear() con puntos equiespaciados en el progreso p (0..1). */
export function linearAt(points: readonly number[], p: number): number {
  const n = points.length - 1
  const i = Math.min(Math.floor(p * n), n - 1)
  const local = p * n - i
  const a = points[i] ?? 0
  const b = points[i + 1] ?? 1
  return a + (b - a) * local
}

/** Máximo error de la curva frente al resorte, muestreando cada 0,5 ms. */
export function linearError(points: readonly number[], spring: Spring, durationMs: number): number {
  let max = 0
  for (let ms = 0; ms <= durationMs; ms += 0.5) {
    const err = Math.abs(linearAt(points, ms / durationMs) - springPosition(ms / 1000, spring))
    if (err > max) max = err
  }
  return max
}

export interface CssSpring {
  durationMs: number
  points: number[]
  /** Error máximo medido frente al resorte real. */
  error: number
}

/** Menor cantidad de puntos (desde 16) cuya curva linear() respeta MAX_LINEAR_ERROR. */
export function springToCss(spring: Spring): CssSpring {
  const durationMs = settleMs(spring)
  for (let n = 16; n <= 400; n += 4) {
    const points = Array.from({ length: n + 1 }, (_, i) =>
      i === 0 ? 0 : i === n ? 1 : +springPosition(((i / n) * durationMs) / 1000, spring).toFixed(4),
    )
    const error = linearError(points, spring, durationMs)
    if (error < MAX_LINEAR_ERROR) return { durationMs, points, error }
  }
  throw new Error('No se alcanzó la precisión pedida con 400 puntos')
}

export const toLinear = (points: readonly number[]): string => `linear(${points.join(', ')})`
