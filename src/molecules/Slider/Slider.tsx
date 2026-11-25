'use client'
// Molécula interactiva (excepción al ADR-0003, registrada en el ADR-0014). La pista activa depende
// del valor, y con el <input type="range"> nativo no hay forma de reflejarlo en CSS en los tres
// motores: Firefox tiene ::-moz-range-progress, Chrome y WebKit no (comprobado el 2026-11-25). El
// componente guarda el valor (o lo recibe, controlado) y lo pasa al CSS como fracción (--_v2), y
// con él escribe el indicador de valor.
//
// El control se dibuja con elementos propios y el input nativo, invisible, lo cubre entero: el
// teclado (flechas, Re Pág, Av Pág, Inicio y Fin), el arrastre, el clic en la pista, el envío en
// formularios y la accesibilidad (rol slider, valores) son del navegador. Las únicas ayudas: las
// flechas izquierda y derecha en vertical y en RTL, donde los motores no coinciden
// (slider-shared.tsx), y reenfocar el input al soltar el puntero, porque WebKit no lo enfoca con
// un clic (como hace @material/web).

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type InputHTMLAttributes, type Ref } from 'react'
import type { AccessibleNameProps } from '../../internal/accessible-name.ts'
import { mergeRefs } from '../../internal/merge-refs.ts'
import {
  formatValue,
  handleArrowKeys,
  markFractions,
  normalizeValue,
  SliderHandle,
  SliderTrack,
  toFraction,
  type SliderFormat,
  type SliderOrientation,
  type SliderSize,
} from './slider-shared.tsx'

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'defaultValue' | 'min' | 'max' | 'step' | 'size' | 'children' | 'aria-label' | 'aria-labelledby'
>

export interface SliderOwnProps {
  /** Valor (controlado). */
  value?: number | undefined
  /** Valor inicial (no controlado). Sin él, el punto medio, como el input nativo. */
  defaultValue?: number | undefined
  /** Se llama con el valor nuevo y el evento del input en cada cambio. */
  onValueChange?: ((value: number, event: ChangeEvent<HTMLInputElement>) => void) | undefined
  /** Mínimo. Por defecto 0. */
  min?: number | undefined
  /** Máximo. Por defecto 100. */
  max?: number | undefined
  /** Paso. Por defecto 1. */
  step?: number | undefined
  /** Tamaño de Material 3 Expressive: pista de 16, 24, 40, 56 o 96. Por defecto `xs`. */
  size?: SliderSize | undefined
  /** `vertical`: el mínimo abajo. Por defecto `horizontal`. */
  orientation?: SliderOrientation | undefined
  /** La pista activa va del centro al valor, con puntos de parada en los dos extremos. */
  centered?: boolean | undefined
  /** Un punto en cada paso. Pensado para pocos pasos (uno por elemento). */
  ticks?: boolean | undefined
  /** Indicador de valor al presionar, al arrastrar y con foco de teclado. Por defecto `true`. */
  valueIndicator?: boolean | undefined
  /**
   * Texto del valor en el indicador y en `aria-valuetext`: una función o un `Intl.NumberFormat`.
   * Sin él, el número tal cual (y sin `aria-valuetext`: el lector anuncia el número).
   */
  format?: SliderFormat | undefined
  /** Referencia al `<input type="range">` nativo. */
  ref?: Ref<HTMLInputElement> | undefined
}

export type SliderProps = NativeInputProps & SliderOwnProps & AccessibleNameProps

/**
 * Slider de Material 3 Expressive sobre un `<input type="range">` nativo e invisible que cubre el
 * control dibujado: teclado, arrastre, formularios y lectores de pantalla son los del navegador.
 *
 * Necesita nombre accesible: `label`, `aria-labelledby` o `aria-label`. Las props del input
 * (`name`, `disabled`, `onChange`, `onInput`, `id`, `form`…) se pasan tal cual; `className` y
 * `style` van al contenedor.
 *
 * ```tsx
 * <Slider label="Volumen" defaultValue={40} />
 * <Slider label="Brillo" value={v} onValueChange={setV} size="md" />
 * <Slider label="Balance" min={-50} max={50} defaultValue={0} centered />
 * <Slider label="Precio" step={10} ticks format={new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })} />
 * ```
 */
export function Slider({
  value,
  defaultValue,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  size = 'xs',
  orientation = 'horizontal',
  centered = false,
  ticks = false,
  valueIndicator = true,
  format,
  label,
  className,
  style,
  ref,
  onChange,
  onKeyDown,
  onPointerDown,
  disabled,
  ...inputProps
}: SliderProps) {
  const controlled = value !== undefined
  const [inner, setInner] = useState(() => normalizeValue(defaultValue, min, max, step))
  const current = controlled ? normalizeValue(value, min, max, step) : inner
  const inputRef = useRef<HTMLInputElement | null>(null)
  const setInputRef = useMemo(() => mergeRefs(inputRef, ref), [ref])
  const vertical = orientation === 'vertical'

  // No controlado: el input es el dueño del valor. Se lee al montar (por si el saneamiento del
  // navegador difiere del calculado) y después de reiniciar el formulario, que no dispara `input`.
  useEffect(() => {
    const input = inputRef.current
    if (controlled || !input) return
    setInner(input.valueAsNumber)
    const form = input.form
    if (!form) return
    const onReset = () => setTimeout(() => setInner(input.valueAsNumber))
    form.addEventListener('reset', onReset)
    return () => form.removeEventListener('reset', onReset)
  }, [controlled])

  const text = formatValue(current, format)
  const ariaValueText = inputProps['aria-valuetext'] ?? (format ? text : undefined)

  return (
    <div
      className={className ? `mk-slider ${className}` : 'mk-slider'}
      style={{ ...style, '--_v2': toFraction(current, min, max) } as CSSProperties}
      data-size={size}
      data-orientation={orientation}
      data-variant={centered ? 'centered' : 'standard'}
    >
      <SliderTrack
        startSegment={centered}
        marks={markFractions({ min, max, step, ticks, startStop: centered, skipCenter: centered })}
      />
      <input
        {...inputProps}
        ref={setInputRef}
        type="range"
        className="mk-slider-input"
        data-thumb="end"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={label ?? inputProps['aria-label']}
        aria-valuetext={ariaValueText}
        aria-orientation={vertical ? 'vertical' : undefined}
        {...(controlled ? { value: String(current) } : { defaultValue: defaultValue === undefined ? undefined : String(defaultValue) })}
        onChange={(event) => {
          onChange?.(event)
          const next = event.currentTarget.valueAsNumber
          if (!controlled) setInner(next)
          onValueChange?.(next, event)
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          handleArrowKeys(event, vertical)
        }}
        onPointerDown={(event) => {
          onPointerDown?.(event)
          const input = event.currentTarget
          // WebKit no enfoca un range con el clic: se enfoca al soltar, como @material/web.
          addEventListener('pointerup', () => input.focus({ preventScroll: true }), { once: true })
        }}
      />
      <SliderHandle label={text} indicator={valueIndicator} />
    </div>
  )
}
