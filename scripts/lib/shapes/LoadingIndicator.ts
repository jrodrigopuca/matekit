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

// En parte portado a TypeScript de androidx/androidx@b842c5b3a5,
// compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/LoadingIndicator.kt
// y tokens/LoadingIndicatorTokens.kt (ADR-0011): las constantes de la animación, las secuencias de
// formas, `buildMorphSequence`, `calculateScaleFactor` y el ajuste de cada fotograma de
// `processPath`. El resto es código propio de matekit: muestrear la animación de Compose y
// reducirla a fotogramas clave de SMIL (`<animate>` con keyTimes y keySplines).
//
// Cómo dibuja Compose el indicador indeterminado (LoadingIndicatorImpl sin progress):
// - cada 650 ms (MorphIntervalMillis) arranca un cambio de forma, el Morph de la forma k a la
//   k + 1, con un resorte de 0 a 1 (amortiguación 0,6, rigidez 200, umbral de visibilidad 0,1);
//   el resorte se pasa de 1 (llega a 1,095) y Compose lo da por terminado a los ~297 ms, cuando la
//   envolvente cae por debajo del umbral: ahí salta a 1 y la forma queda quieta hasta el siguiente;
// - gira progress · 90° más 90° por cada cambio ya hecho (empezando en 90°), y además una vuelta
//   entera lineal cada 4666 ms (GlobalRotationDurationMillis);
// - cada fotograma se escala por el lado del contenedor × el factor de escala y se centra por el
//   rectángulo de sus puntos antes de girar.
//
// No importa React, componentes ni tokens/.

import { MATERIAL_SHAPES, type MaterialShapeName } from './MaterialShapes.ts'
import { Morph } from './Morph.ts'
import type { RoundedPolygon } from './RoundedPolygon.ts'
import { Matrix, morphToPath, toPath as toPathFromPolygon, transformed, type PathCommand } from './ShapeUtil.ts'
import { estimateAnimationDurationMillis, springPosition } from './SpringEstimation.ts'

// --- Constantes de LoadingIndicator.kt y LoadingIndicatorTokens.kt ---

/** Lado del contenedor (ContainerWidth y ContainerHeight), en dp. */
export const ContainerSize = 48
/** Lado del área de la forma (ActiveSize), en dp. */
export const ActiveSize = 38
/** ActiveIndicatorScale: la parte del contenedor que ocupa el área de la forma. */
export const ActiveIndicatorScale = ActiveSize / ContainerSize
export const GlobalRotationDurationMillis = 4666
export const MorphIntervalMillis = 650
export const FullRotation = 360
export const QuarterRotation = FullRotation / 4
/** El resorte del cambio de forma: `spring(dampingRatio = 0.6f, stiffness = 200f, visibilityThreshold = 0.1f)`. */
export const MorphSpring = { dampingRatio: 0.6, stiffness: 200, visibilityThreshold: 0.1 } as const

/** LoadingIndicatorDefaults.IndeterminateIndicatorPolygons, en orden. */
export const IndeterminateShapes: readonly MaterialShapeName[] = [
  'SoftBurst',
  'Cookie9Sided',
  'Pentagon',
  'Pill',
  'Sunny',
  'Cookie4Sided',
  'Oval',
]

/** LoadingIndicatorDefaults.IndeterminateIndicatorPolygons. */
export function indeterminatePolygons(): RoundedPolygon[] {
  return IndeterminateShapes.map((name) => MATERIAL_SHAPES[name]())
}

/**
 * LoadingIndicatorDefaults.DeterminateIndicatorPolygons: el círculo girado 18° (así el paso al
 * SoftBurst, girado igual, es más suave) y el SoftBurst.
 */
export function determinatePolygons(): RoundedPolygon[] {
  return [transformed(MATERIAL_SHAPES.Circle(), new Matrix().rotateZ(360 / 20)), MATERIAL_SHAPES.SoftBurst()]
}

/**
 * Un Morph entre cada forma y la siguiente, con las formas normalizadas; con `circularSequence`,
 * también de la última a la primera.
 */
export function buildMorphSequence(polygons: readonly RoundedPolygon[], circularSequence: boolean): Morph[] {
  const out: Morph[] = []
  for (let i = 0; i < polygons.length; i++) {
    if (i + 1 < polygons.length) out.push(new Morph(polygons[i]!.normalized(), polygons[i + 1]!.normalized()))
    else if (circularSequence) out.push(new Morph(polygons[i]!.normalized(), polygons[0]!.normalized()))
  }
  return out
}

/**
 * Factor de escala de las formas: como giran, el rectángulo que las contiene no alcanza; se
 * compara con el cuadrado que las contiene en cualquier giro (`calculateMaxBounds`). Se usa el
 * mayor de los dos cocientes para que una forma alargada (Pill) no achique todo.
 */
export function calculateScaleFactor(indicatorPolygons: readonly RoundedPolygon[]): number {
  let scaleFactor = 1
  for (const polygon of indicatorPolygons) {
    const bounds = polygon.calculateBounds()
    const maxBounds = polygon.calculateMaxBounds()
    const scaleX = (bounds[2]! - bounds[0]!) / (maxBounds[2]! - maxBounds[0]!)
    const scaleY = (bounds[3]! - bounds[1]!) / (maxBounds[3]! - maxBounds[1]!)
    scaleFactor = Math.min(scaleFactor, Math.max(scaleX, scaleY))
  }
  return scaleFactor
}

/** Milisegundos que dura cada cambio de forma (lo que estima Compose para el resorte). */
export function morphDurationMillis(): number {
  return estimateAnimationDurationMillis({
    stiffness: MorphSpring.stiffness,
    dampingRatio: MorphSpring.dampingRatio,
    initialVelocity: 0,
    initialDisplacement: (0 - 1) / MorphSpring.visibilityThreshold,
    delta: 1,
  })
}

/** Progreso del cambio de forma a los `ms` de empezado: el resorte hasta que termina, después 1. */
export function morphProgressAt(ms: number, durationMs: number = morphDurationMillis()): number {
  return ms >= durationMs ? 1 : springPosition(ms / 1000, MorphSpring)
}

// --- Fotogramas ---

/**
 * Un contorno como lista plana de números: x e y del moveTo y, por cada curva, los seis de su
 * cubicTo. Todos los fotogramas de un mismo Morph tienen el mismo largo.
 */
export type Outline = number[]

/** Pasa los comandos de un Morph a la lista plana. */
export function toOutline(commands: readonly PathCommand[]): Outline {
  const out: Outline = []
  for (const c of commands) {
    if (c.type === 'M') out.push(c.x, c.y)
    else if (c.type === 'C') out.push(c.x1, c.y1, c.x2, c.y2, c.x, c.y)
  }
  return out
}

/**
 * Ajusta un contorno normalizado como `processPath`: lo escala por `scale` y lo centra (el centro
 * del rectángulo de sus anclajes y puntos de control, como `Path.getBounds()`) en el origen.
 */
export function processOutline(outline: Outline, scale: number): Outline {
  const scaled = outline.map((v) => v * scale)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i < scaled.length; i += 2) {
    minX = Math.min(minX, scaled[i]!)
    maxX = Math.max(maxX, scaled[i]!)
    minY = Math.min(minY, scaled[i + 1]!)
    maxY = Math.max(maxY, scaled[i + 1]!)
  }
  const dx = -(minX + maxX) / 2
  const dy = -(minY + maxY) / 2
  return scaled.map((v, i) => v + (i % 2 === 0 ? dx : dy))
}

/** Gira un contorno `degrees` grados alrededor del origen (positivo: horario, con y hacia abajo). */
export function rotateOutline(outline: Outline, degrees: number): Outline {
  const r = (degrees * Math.PI) / 180
  const cos = Math.cos(r)
  const sin = Math.sin(r)
  const out: Outline = []
  for (let i = 0; i < outline.length; i += 2) {
    const x = outline[i]!
    const y = outline[i + 1]!
    out.push(x * cos - y * sin, x * sin + y * cos)
  }
  return out
}

/** El fotograma de `morph` en `progress`, escalado a `side` (lado del contenedor) y centrado. */
export function morphFrame(morph: Morph, progress: number, side: number, scaleFactor: number): Outline {
  return processOutline(toOutline(morphToPath(morph, progress)), side * scaleFactor)
}

/** Atributo `d` de un contorno: solo M y C (la misma estructura en todos los fotogramas), redondeado. */
export function outlineToPathData(outline: Outline, precision: number): string {
  const n = (v: number) => {
    const s = String(Number(v.toFixed(precision)))
    return s === '-0' ? '0' : s
  }
  let out = `M${n(outline[0]!)} ${n(outline[1]!)}`
  for (let i = 2; i < outline.length; i += 6) {
    out += `C${outline
      .slice(i, i + 6)
      .map(n)
      .join(' ')}`
  }
  return out + 'Z'
}

// --- Curvas de tiempo de SMIL ---

/** Una curva de Bézier de keySplines: (x1, y1, x2, y2), todos de 0 a 1. */
export type KeySpline = readonly [number, number, number, number]

export const LinearSpline: KeySpline = [0, 0, 1, 1]

/** El valor de la curva (de 0 a 1) en la fracción de tiempo `x`, como la calcula SMIL. */
export function splineAt([x1, y1, x2, y2]: KeySpline, x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const bez = (s: number, a: number, b: number) => 3 * s * (1 - s) * (1 - s) * a + 3 * s * s * (1 - s) * b + s * s * s
  // x(s) crece con x1 y x2 en [0, 1]: bisección.
  let lo = 0
  let hi = 1
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (bez(mid, x1, x2) < x) lo = mid
    else hi = mid
  }
  return bez((lo + hi) / 2, y1, y2)
}

/**
 * La keySpline que mejor sigue `f` (una función que crece de 0 a 1 en [0, 1]): minimiza el
 * error máximo, primero en una grilla y después afinando coordenada por coordenada. Determinista.
 */
export function fitSpline(f: (x: number) => number, samples = 64): { spline: KeySpline; error: number } {
  const xs = Array.from({ length: samples + 1 }, (_, i) => i / samples)
  const ys = xs.map(f)
  const errorOf = (s: KeySpline) => {
    let max = 0
    for (let i = 0; i < xs.length; i++) max = Math.max(max, Math.abs(splineAt(s, xs[i]!) - ys[i]!))
    return max
  }
  let best: KeySpline = LinearSpline
  let bestError = errorOf(best)
  const grid = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]
  for (const x1 of grid)
    for (const y1 of grid)
      for (const x2 of grid)
        for (const y2 of grid) {
          const s: KeySpline = [x1, y1, x2, y2]
          const e = errorOf(s)
          if (e < bestError) [best, bestError] = [s, e]
        }
  for (const step of [0.05, 0.02, 0.01, 0.005, 0.002, 0.001]) {
    let improved = true
    while (improved) {
      improved = false
      for (let k = 0; k < 4; k++) {
        for (const sign of [-1, 1]) {
          const s = [...best] as [number, number, number, number]
          s[k] = Math.round(Math.min(1, Math.max(0, s[k]! + sign * step)) * 1000) / 1000
          const e = errorOf(s)
          if (e < bestError - 1e-12) {
            ;[best, bestError] = [s, e]
            improved = true
          }
        }
      }
    }
  }
  return { spline: best, error: bestError }
}

/** Un fotograma clave de un cambio de forma: el instante (ms desde que empieza) y el progreso. */
export interface MorphKeyframe {
  readonly ms: number
  readonly progress: number
}

/** El plan de fotogramas de un cambio de forma (igual para los siete). */
export interface MorphTimeline {
  /** Fotogramas clave, del 0 a MorphIntervalMillis. */
  readonly keyframes: readonly MorphKeyframe[]
  /** La curva de cada tramo entre un fotograma y el siguiente. */
  readonly splines: readonly KeySpline[]
}

/**
 * Reduce el resorte del cambio de forma a fotogramas clave: `rising` tramos iguales en tiempo
 * hasta el pico (el resorte sube sin parar), uno del pico hasta que Compose lo da por terminado
 * (baja un poco), el salto a 1 (en `jumpMs`) y la espera quieta hasta el siguiente cambio. Cada
 * tramo con su keySpline ajustada.
 */
export function morphTimeline(rising: number, jumpMs = 0.1): MorphTimeline {
  const duration = morphDurationMillis()
  const { dampingRatio, stiffness } = MorphSpring
  // El pico del resorte subamortiguado: medio período de la oscilación amortiguada.
  const peakMs = (Math.PI / (Math.sqrt(stiffness) * Math.sqrt(1 - dampingRatio * dampingRatio))) * 1000
  const p = (ms: number) => morphProgressAt(ms, duration)
  const times = [...Array.from({ length: rising }, (_, i) => (peakMs * i) / rising), peakMs, duration]
  const keyframes: MorphKeyframe[] = times.map((ms) => ({ ms, progress: p(ms) }))
  // El último valor del resorte antes de terminar (no el 1 al que salta).
  keyframes[keyframes.length - 1] = { ms: duration, progress: springPosition(duration / 1000, MorphSpring) }
  const splines: KeySpline[] = []
  for (let i = 0; i + 1 < keyframes.length; i++) {
    const a = keyframes[i]!
    const b = keyframes[i + 1]!
    const f = (x: number) => (springPosition((a.ms + x * (b.ms - a.ms)) / 1000, MorphSpring) - a.progress) / (b.progress - a.progress)
    splines.push(fitSpline(f).spline)
  }
  keyframes.push({ ms: duration + jumpMs, progress: 1 }, { ms: MorphIntervalMillis, progress: 1 })
  splines.push(LinearSpline, LinearSpline)
  return { keyframes, splines }
}

/** El progreso que da la línea de tiempo de SMIL a los `ms` de empezado el cambio de forma. */
export function timelineProgressAt({ keyframes, splines }: MorphTimeline, ms: number): number {
  for (let i = 0; i + 1 < keyframes.length; i++) {
    const a = keyframes[i]!
    const b = keyframes[i + 1]!
    if (ms <= b.ms) {
      const x = b.ms === a.ms ? 1 : (ms - a.ms) / (b.ms - a.ms)
      return a.progress + splineAt(splines[i]!, x) * (b.progress - a.progress)
    }
  }
  return keyframes.at(-1)!.progress
}

/** Fracción de tiempo de SMIL (de 0 a 1) en un ciclo de `durationMs`, a partir de un instante. */
export const keyTime = (ms: number, durationMs: number) => ms / durationMs

// --- Datos del indicador para SMIL ---

/** Lado del viewBox: 10 unidades por dp, así las coordenadas enteras tienen 0,05 dp de error. */
export const ViewBoxSide = ContainerSize * 10
/** Tramos de igual duración del resorte antes del pico (ver `morphTimeline`). */
export const RisingSegments = 2
/**
 * keySpline del último tramo de cada contorno, del pico de vuelta a P(0): casi quieta al
 * principio (el pico se sostiene ~19 ms hasta que Compose termina el resorte) y casi quieta al
 * final (P(0) se sostiene mientras se espera el cambio siguiente). En el medio el contorno está
 * oculto, así que lo que haga no se ve.
 */
export const HoldSpline: KeySpline = [1, 0, 0, 1]

/** Escribe `values` de SMIL con 4 decimales (keyTimes, ángulos). */
const fmt = (v: number, decimals = 4) => {
  const s = String(Number(v.toFixed(decimals)))
  return s === '-0' ? '0' : s
}
const splinesAttr = (splines: readonly KeySpline[]) => splines.map((s) => s.map((v) => fmt(v, 3)).join(' ')).join(';')

/** Redondea un contorno a enteros (las unidades del viewBox). */
export const roundOutline = (outline: Outline): Outline => outline.map((v) => Math.round(v) || 0)

/**
 * `d` relativo (m, c y z en minúscula, con la repetición implícita de c) de un contorno ya
 * redondeado: cada diferencia sale de coordenadas absolutas redondeadas, así el error no se
 * acumula. SMIL interpola los números uno por uno, y como las coordenadas relativas son
 * combinaciones lineales de las absolutas, interpolar unas o las otras da la misma forma.
 */
export function outlineToRelativePathData(outline: Outline): string {
  const parts: string[] = []
  const num = (v: number) => (v < 0 ? String(v) : ` ${v}`)
  let x0 = outline[0]!
  let y0 = outline[1]!
  parts.push(`M${x0}${num(y0)}c`)
  let first = true
  for (let i = 2; i < outline.length; i += 6) {
    const vals = [
      outline[i]! - x0,
      outline[i + 1]! - y0,
      outline[i + 2]! - x0,
      outline[i + 3]! - y0,
      outline[i + 4]! - x0,
      outline[i + 5]! - y0,
    ]
    parts.push(vals.map((v, j) => (first && j === 0 ? String(v) : num(v))).join(''))
    first = false
    x0 = outline[i + 4]!
    y0 = outline[i + 5]!
  }
  return parts.join('') + 'z'
}

/** Todo lo que necesita el componente para dibujar el indicador indeterminado con SMIL. */
export interface IndeterminateAnimation {
  /** Duración de un ciclo de las 7 transiciones (ms). */
  readonly cycleMs: number
  /** El giro de cada cambio de forma: 0 a 90° cada 650 ms, sumándose (`accumulate="sum"`). */
  readonly morphRotation: { readonly values: string; readonly keyTimes: string; readonly keySplines: string }
  /** keyTimes y keySplines de los contornos, y keyTimes de su visibilidad (los mismos para los 7). */
  readonly shapeKeyTimes: string
  readonly shapeKeySplines: string
  readonly visibilityKeyTimes: string
  /** Por transición: el `begin` (negativo, para desfasarlas) y los cuatro contornos. */
  readonly shapes: ReadonlyArray<{ readonly begin: string; readonly values: readonly string[] }>
  /** Los fotogramas clave de cada transición, redondeados, para las pruebas. */
  readonly frames: ReadonlyArray<readonly Outline[]>
  /** Progreso del Morph en cada fotograma clave de los contornos. */
  readonly frameProgress: readonly number[]
  /** La línea de tiempo del giro (fotogramas clave y curvas), para las pruebas. */
  readonly timeline: MorphTimeline
}

/**
 * Los datos del indicador indeterminado: `RisingSegments` tramos hasta el pico del resorte para
 * los contornos y el giro, y los fotogramas de cada transición, escalados como Compose, centrados
 * en el origen y girados los 90° iniciales.
 */
export function buildIndeterminateAnimation(): IndeterminateAnimation {
  const polygons = indeterminatePolygons()
  const morphs = buildMorphSequence(polygons, true)
  const scaleFactor = calculateScaleFactor(polygons) * ActiveIndicatorScale
  const timeline = morphTimeline(RisingSegments)
  const cycleMs = MorphIntervalMillis * morphs.length
  const kf = timeline.keyframes
  // Fotogramas clave de los contornos: los de subida y el pico (kf[0..RisingSegments]).
  const rising = kf.slice(0, RisingSegments + 1)
  const frameProgress = rising.map((f) => f.progress)
  const endMs = kf[RisingSegments + 1]!.ms

  const frames = morphs.map((morph) =>
    frameProgress.map((p) => roundOutline(rotateOutline(morphFrame(morph, p, ViewBoxSide, scaleFactor), QuarterRotation))),
  )
  const shapes = frames.map((f, k) => ({
    begin: k === 0 ? '0s' : `-${cycleMs - MorphIntervalMillis * k}ms`,
    // El último vuelve a P(0): el ciclo cierra sin salto.
    values: [...f, f[0]!].map(outlineToRelativePathData),
  }))

  return {
    cycleMs,
    morphRotation: {
      values: kf.map((f) => fmt(f.progress * QuarterRotation, 3)).join(';'),
      keyTimes: kf.map((f) => fmt(keyTime(f.ms, MorphIntervalMillis), 6)).join(';'),
      keySplines: splinesAttr(timeline.splines),
    },
    shapeKeyTimes: [...rising.map((f) => fmt(keyTime(f.ms, cycleMs), 6)), '1'].join(';'),
    shapeKeySplines: splinesAttr([...timeline.splines.slice(0, RisingSegments), HoldSpline]),
    visibilityKeyTimes: ['0', fmt(keyTime(endMs, cycleMs), 6), fmt(keyTime(cycleMs - MorphIntervalMillis + endMs, cycleMs), 6)].join(';'),
    shapes,
    frames,
    frameProgress,
    timeline,
  }
}

/**
 * Los 7 pasos quietos, como se ven en la animación (sin el giro continuo): la forma k con el giro
 * que tiene mientras espera su cambio, 90° · (k + 1). Mismo escalado y centrado que los fotogramas.
 */
export function buildSteps(): string[] {
  const polygons = indeterminatePolygons()
  const scaleFactor = calculateScaleFactor(polygons) * ActiveIndicatorScale
  return polygons.map((polygon, k) =>
    outlineToRelativePathData(
      roundOutline(
        rotateOutline(
          processOutline(toOutline(toPathFromPolygon(polygon.normalized())), ViewBoxSide * scaleFactor),
          QuarterRotation * (k + 1),
        ),
      ),
    ),
  )
}

/** Datos del indicador determinado: el contorno de inicio y de fin, escalados y sin centrar. */
export function buildDeterminate(): { start: number[]; end: number[] } {
  const polygons = determinatePolygons()
  const [morph] = buildMorphSequence(polygons, false)
  const scale = ViewBoxSide * calculateScaleFactor(polygons) * ActiveIndicatorScale
  const at = (p: number) => toOutline(morphToPath(morph!, p)).map((v) => Math.round(v * scale * 10) / 10 || 0)
  return { start: at(0), end: at(1) }
}

// --- Comparación con Compose ---

/**
 * El contorno que dibuja Compose a los `ms` de empezada la animación (unidades del viewBox, sin el
 * giro continuo, que en los dos es el mismo giro lineal).
 */
export function composeFrameAt(ms: number): Outline {
  const polygons = indeterminatePolygons()
  const morphs = cachedMorphs ?? (cachedMorphs = buildMorphSequence(polygons, true))
  const scaleFactor = calculateScaleFactor(polygons) * ActiveIndicatorScale
  const done = Math.floor(ms / MorphIntervalMillis)
  const local = ms - done * MorphIntervalMillis
  const k = done % morphs.length
  if (local >= morphDurationMillis()) {
    // Terminado el resorte, Compose dibuja el Morph k en 1: la misma forma que el k + 1 en 0,
    // que es lo que muestra SMIL (con su propia estructura de comandos).
    const next = (k + 1) % morphs.length
    return rotateOutline(morphFrame(morphs[next]!, 0, ViewBoxSide, scaleFactor), QuarterRotation * (done + 2))
  }
  const p = morphProgressAt(local)
  const rotation = QuarterRotation * p + QuarterRotation * (done + 1)
  return rotateOutline(morphFrame(morphs[k]!, p, ViewBoxSide, scaleFactor), rotation)
}
let cachedMorphs: Morph[] | undefined

/**
 * El contorno visible a los `ms` del ciclo según los datos de SMIL (sin el giro continuo): qué
 * contorno está visible, su interpolación con keySplines y el giro de cada cambio. Reproduce lo
 * que hace el navegador, para medir el error frente a Compose.
 */
export function smilFrameAt(anim: IndeterminateAnimation, ms: number): Outline {
  const n = anim.frames.length
  const local = (k: number) => (((ms - MorphIntervalMillis * k) % anim.cycleMs) + anim.cycleMs) % anim.cycleMs
  const vis = anim.visibilityKeyTimes.split(';').map(Number)
  const visible = (k: number) => {
    const x = local(k) / anim.cycleMs
    return x < vis[1]! || x >= vis[2]!
  }
  const k = [...Array(n).keys()].find(visible)!
  const x = local(k) / anim.cycleMs
  const times = anim.shapeKeyTimes.split(';').map(Number)
  const splines = anim.shapeKeySplines.split(';').map((s) => s.split(' ').map(Number) as unknown as KeySpline)
  const values = [...anim.frames[k]!, anim.frames[k]![0]!]
  let i = 0
  while (i + 2 < times.length && x > times[i + 1]!) i++
  const f = splineAt(splines[i]!, (x - times[i]!) / (times[i + 1]! - times[i]!))
  const shape = values[i]!.map((v, j) => v + f * (values[i + 1]![j]! - v))
  // Giro: 90° por cambio ya hecho más la línea de tiempo del cambio actual.
  const done = Math.floor(ms / MorphIntervalMillis)
  const rot = QuarterRotation * done + QuarterRotation * timelineProgressAt(anim.timeline, ms - done * MorphIntervalMillis)
  return rotateOutline(shape, rot)
}

/** Distancia máxima entre los puntos de dos contornos de la misma estructura. */
export function maxPointDistance(a: Outline, b: Outline): number {
  let max = 0
  for (let j = 0; j < a.length; j += 2) max = Math.max(max, Math.hypot(a[j]! - b[j]!, a[j + 1]! - b[j + 1]!))
  return max
}
