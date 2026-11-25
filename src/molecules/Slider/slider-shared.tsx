// Piezas compartidas por Slider y RangeSlider (ADR-0014). Módulo sin hooks ni estado: funciones
// puras y la pista dibujada, que no lleva 'use client' por sí misma; la importan los dos módulos
// cliente.
//
// Geometría (docs/research/05-medidas.md § Slider): la pista ocupa todo el largo L del control y
// el centro del handle va de 6 a L − 6 (el handle de 4 queda a 4 de cada extremo, como los puntos
// de parada). El <input type="range"> invisible que cubre el control tiene un thumb de 12 de
// largo (slider.css), así el navegador ubica el valor en esos mismos puntos: con un thumb de T, los
// tres motores llevan el centro del thumb de T/2 a L − T/2 (comprobado el 2026-11-25).

import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { FocusRing } from '../../atoms/FocusRing/FocusRing.tsx'
import { StateLayer } from '../../atoms/StateLayer/StateLayer.tsx'

export type SliderSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type SliderOrientation = 'horizontal' | 'vertical'
/** Texto de un valor: una función o un `Intl.NumberFormat`. */
export type SliderFormat = ((value: number) => string) | Intl.NumberFormat

/** Decimales de un número, para no arrastrar errores de coma flotante al ajustar al paso. */
function decimals(n: number): number {
  const s = String(n)
  if (s.includes('e-')) return Number(s.split('e-')[1])
  return s.split('.')[1]?.length ?? 0
}

/**
 * El valor que tendría el input nativo (algoritmo de saneamiento de HTML para `range`): dentro de
 * [min, max], ajustado al paso contado desde `min` (los empates, hacia arriba) y, si el ajuste
 * pasa de `max`, el paso anterior. Sin valor, el punto medio.
 */
export function normalizeValue(value: number | undefined, min: number, max: number, step: number): number {
  const hi = max < min ? min : max
  const raw = value === undefined || Number.isNaN(value) ? min + (hi - min) / 2 : value
  const clamped = Math.min(Math.max(raw, min), hi)
  if (!(step > 0)) return clamped
  const places = Math.max(decimals(step), decimals(min))
  // toFixed(9) antes de redondear: 0,35 / 0,1 da 3,4999…, y el navegador (que cuenta en decimal) da 4.
  const steps = Math.floor(Number(((clamped - min) / step).toFixed(9)) + 0.5)
  let snapped = Number((min + steps * step).toFixed(places))
  if (snapped > hi) snapped = Number((snapped - step).toFixed(places))
  return snapped
}

/** Fracción de 0 a 1 de un valor en [min, max]. */
export function toFraction(value: number, min: number, max: number): number {
  return max > min ? (value - min) / (max - min) : 0
}

export function formatValue(value: number, format: SliderFormat | undefined): string {
  if (typeof format === 'function') return format(value)
  return format ? format.format(value) : String(value)
}

/**
 * Asigna el valor de un input sin pasar por el seguimiento de React (que se instala en la
 * instancia): así el `input` que se despacha después llega a `onChange` como uno del usuario.
 */
export function setNativeValue(input: HTMLInputElement, value: number): void {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, String(value))
}

function dispatchValueEvents(input: HTMLInputElement): void {
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

/**
 * Flechas izquierda y derecha donde los motores no coinciden (comprobado el 2026-11-25):
 * - horizontal de derecha a izquierda: Chrome y Firefox mueven el handle hacia la flecha
 *   (derecha baja el valor); WebKit sube el valor con la derecha, que mueve el handle a la
 *   izquierda;
 * - vertical (writing-mode): Chrome y WebKit suben el valor con la derecha (como pide la guía
 *   APG, "Right Arrow: increase"); Firefox lo baja.
 * En esos dos casos la flecha se resuelve acá, como en Chrome: en vertical, derecha sube; en
 * horizontal, el handle va hacia la flecha. Arriba, abajo, Re Pág, Av Pág, Inicio y Fin siguen
 * siendo del navegador, que los resuelve igual en los tres.
 */
export function handleArrowKeys(event: KeyboardEvent<HTMLInputElement>, vertical: boolean): void {
  const { key } = event
  if (event.defaultPrevented || (key !== 'ArrowLeft' && key !== 'ArrowRight')) return
  const input = event.currentTarget
  const rtl = !vertical && getComputedStyle(input).direction === 'rtl'
  if (!vertical && !rtl) return
  event.preventDefault()
  const before = input.value
  if ((key === 'ArrowRight') !== rtl) input.stepUp()
  else input.stepDown()
  if (input.value !== before) dispatchValueEvents(input)
}

/** Fracciones de las marcas: los pasos (con `ticks`) y los puntos de parada de los extremos. */
export function markFractions(options: {
  min: number
  max: number
  step: number
  ticks: boolean
  startStop: boolean
  skipCenter: boolean
}): number[] {
  const { min, max, step, ticks, startStop, skipCenter } = options
  const marks = new Set<number>([1])
  if (startStop) marks.add(0)
  if (ticks && max > min && step > 0) {
    const count = Math.floor((max - min) / step + 1e-9)
    for (let k = 0; k <= count; k++) marks.add(Number(((k * step) / (max - min)).toFixed(6)))
  }
  // En el centrado, el centro cae en la separación de 4 entre pistas (Compose también lo saltea).
  if (skipCenter) marks.delete(0.5)
  return [...marks].sort((a, b) => a - b)
}

type Segment = 'inactive-start' | 'active' | 'inactive-end'

/**
 * La pista: dos o tres tramos (inactivo, activo, inactivo) que calcula slider.css con las
 * fracciones del elemento principal (--_v1 y --_v2). Cada tramo recorta su propia copia de las
 * marcas: así los puntos toman el color del tramo y desaparecen en la separación del handle.
 */
export function SliderTrack({ marks, startSegment }: { marks: number[]; startSegment: boolean }) {
  const segments: Segment[] = startSegment ? ['inactive-start', 'active', 'inactive-end'] : ['active', 'inactive-end']
  return (
    <span className="mk-slider-track" aria-hidden="true">
      {segments.map((segment) => (
        <span key={segment} className="mk-slider-segment" data-segment={segment}>
          <span className="mk-slider-marks">
            {marks.map((t) => (
              <span key={t} className="mk-slider-mark" style={{ '--_t': t } as CSSProperties} />
            ))}
          </span>
        </span>
      ))}
    </span>
  )
}

/** Handle dibujado, con la capa de estado, el anillo de foco y el indicador de valor. */
export function SliderHandle({ label, indicator }: { label: ReactNode; indicator: boolean }) {
  return (
    <span className="mk-slider-handle" aria-hidden="true">
      <StateLayer />
      <FocusRing />
      {indicator && <span className="mk-slider-value-indicator">{label}</span>}
    </span>
  )
}
