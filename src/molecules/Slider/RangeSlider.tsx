'use client'
// Molécula interactiva (excepción al ADR-0003, registrada en el ADR-0014): como Slider, guarda los
// dos valores para dibujar la pista activa entre los handles, y los reparte por contexto a sus dos
// partes, RangeSliderStart y RangeSliderEnd (API por composición, ADR-0002, como RadioGroup en el
// ADR-0012). Cada parte es un <input type="range"> nativo con su propio nombre accesible y su
// propio `name`: el patrón "Slider (Multi-Thumb)" de la guía APG con dos sliders nativos.
//
// Los dos inputs cubren el control entero (así comparten la escala) y cada uno recibe el puntero
// de su lado del punto medio entre los handles (clip-path en slider.css, como @material/web). El
// componente solo agrega:
// - que los handles no se crucen: si un valor pasa al otro, vuelve a quedar igual (con el teclado
//   y con el puntero);
// - con los dos valores iguales, arrastrar hacia el lado del otro mueve al otro ("flip" de
//   @material/web), porque si no el que quedó arriba no podría salir hacia ese lado;
// - reenfocar al soltar el puntero (WebKit no enfoca un range con el clic) y las flechas en
//   vertical y RTL, como Slider.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react'
import type { AccessibleNameProps } from '../../internal/accessible-name.ts'
import { mergeRefs } from '../../internal/merge-refs.ts'
import {
  formatValue,
  handleArrowKeys,
  markFractions,
  normalizeValue,
  setNativeValue,
  SliderHandle,
  SliderTrack,
  toFraction,
  type SliderFormat,
  type SliderOrientation,
  type SliderSize,
} from './slider-shared.tsx'

export type RangeSliderValue = [start: number, end: number]

interface PointerAction {
  index: 0 | 1
  start: RangeSliderValue
  canFlip: boolean
  flipped: boolean
}

interface RangeSliderContextValue {
  values: RangeSliderValue
  min: number
  max: number
  step: number
  disabled: boolean
  vertical: boolean
  valueIndicator: boolean
  format: SliderFormat | undefined
  inputs: { current: [HTMLInputElement | null, HTMLInputElement | null] }
  onThumbChange: (index: 0 | 1, event: ChangeEvent<HTMLInputElement>) => void
  onThumbPointerDown: (index: 0 | 1) => void
}

const RangeSliderContext = createContext<RangeSliderContextValue | null>(null)

export interface RangeSliderProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange' | 'children'> {
  /** Valores (controlado): inicio y fin. */
  value?: RangeSliderValue | undefined
  /** Valores iniciales (no controlado). Sin ellos, un tercio y dos tercios del recorrido. */
  defaultValue?: RangeSliderValue | undefined
  /** Se llama con los dos valores y el evento del input que cambió. */
  onValueChange?: ((value: RangeSliderValue, event: ChangeEvent<HTMLInputElement>) => void) | undefined
  /** Mínimo. Por defecto 0. */
  min?: number | undefined
  /** Máximo. Por defecto 100. */
  max?: number | undefined
  /** Paso. Por defecto 1. */
  step?: number | undefined
  /** Deshabilita los dos handles. */
  disabled?: boolean | undefined
  /** Tamaño de Material 3 Expressive: pista de 16, 24, 40, 56 o 96. Por defecto `xs`. */
  size?: SliderSize | undefined
  /** `vertical`: el mínimo abajo. Por defecto `horizontal`. */
  orientation?: SliderOrientation | undefined
  /** Un punto en cada paso. Pensado para pocos pasos. */
  ticks?: boolean | undefined
  /** Indicador de valor al presionar, al arrastrar y con foco de teclado. Por defecto `true`. */
  valueIndicator?: boolean | undefined
  /** Texto de los valores en el indicador y en `aria-valuetext`: una función o un `Intl.NumberFormat`. */
  format?: SliderFormat | undefined
  /** `RangeSliderStart` y `RangeSliderEnd`. */
  children?: ReactNode
  /** Referencia al contenedor. */
  ref?: Ref<HTMLDivElement> | undefined
}

/**
 * Slider de rango de Material 3 Expressive: dos handles, cada uno un `<input type="range">`
 * nativo (`RangeSliderStart` y `RangeSliderEnd`, con su nombre accesible y su `name`). Los
 * handles no se cruzan.
 *
 * Las props del contenedor (`className`, `style`, `id`, `aria-*`…) van al `<div>`; con
 * `aria-label` o `aria-labelledby` el contenedor pasa a ser un grupo (`role="group"`).
 *
 * ```tsx
 * <RangeSlider defaultValue={[20, 80]} aria-label="Precio">
 *   <RangeSliderStart label="Precio mínimo" name="desde" />
 *   <RangeSliderEnd label="Precio máximo" name="hasta" />
 * </RangeSlider>
 * ```
 */
export function RangeSlider({
  value,
  defaultValue,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  size = 'xs',
  orientation = 'horizontal',
  ticks = false,
  valueIndicator = true,
  format,
  className,
  style,
  children,
  ...rootProps
}: RangeSliderProps) {
  const controlled = value !== undefined
  const initial = (): RangeSliderValue => {
    const span = max - min
    const [s, e] = defaultValue ?? [min + span / 3, min + (2 * span) / 3]
    const start = normalizeValue(s, min, max, step)
    return [start, Math.max(start, normalizeValue(e, min, max, step))]
  }
  const [inner, setInner] = useState(initial)
  const values: RangeSliderValue = controlled
    ? [normalizeValue(value[0], min, max, step), normalizeValue(value[1], min, max, step)]
    : inner
  const valuesRef = useRef(values)
  valuesRef.current = values
  const inputs = useRef<[HTMLInputElement | null, HTMLInputElement | null]>([null, null])
  const action = useRef<PointerAction | null>(null)
  const vertical = orientation === 'vertical'

  // No controlado: al reiniciar el formulario (que no dispara `input`), vuelven los valores iniciales.
  const initialRef = useRef(initial)
  initialRef.current = initial
  useEffect(() => {
    const form = inputs.current[0]?.form ?? inputs.current[1]?.form
    if (controlled || !form) return
    const onReset = () => setInner(initialRef.current())
    form.addEventListener('reset', onReset)
    return () => form.removeEventListener('reset', onReset)
  }, [controlled])

  const context = useMemo<RangeSliderContextValue>(() => {
    const commit = (next: RangeSliderValue, event: ChangeEvent<HTMLInputElement>) => {
      if (!controlled) setInner(next)
      onValueChange?.(next, event)
    }
    return {
      values,
      min,
      max,
      step,
      disabled,
      vertical,
      valueIndicator,
      format,
      inputs,
      onThumbChange(index, event) {
        const current = valuesRef.current
        const own = event.currentTarget
        const other = inputs.current[index === 0 ? 1 : 0]
        let v = own.valueAsNumber
        const a = action.current
        // Si al presionar estaban iguales, pasar al otro lado mueve al otro (y el presionado vuelve
        // a su valor). Firefox y WebKit mueven el valor al punto del clic aunque caiga sobre el
        // thumb, así que el primer movimiento puede ir hacia el lado contrario: el cambio se
        // decide cuando el valor cruza, no en el primer movimiento (como @material/web).
        if (a && a.index === index && a.canFlip && a.start[0] === a.start[1]) {
          const crosses = index === 0 ? v > a.start[1] : v < a.start[0]
          if (crosses) {
            a.canFlip = false
            a.flipped = true
          }
        }
        if (a?.flipped && a.index === index && other) {
          const fixed = a.start[index]
          setNativeValue(own, fixed)
          const moved = index === 0 ? Math.max(v, fixed) : Math.min(v, fixed)
          setNativeValue(other, moved)
          commit(index === 0 ? [fixed, moved] : [moved, fixed], event)
          return
        }
        // Sin cruzarse: si pasa al otro, queda igual.
        const limit = current[index === 0 ? 1 : 0]
        const clamped = index === 0 ? Math.min(v, limit) : Math.max(v, limit)
        if (clamped !== v) {
          setNativeValue(own, clamped)
          v = clamped
        }
        commit(index === 0 ? [v, current[1]] : [current[0], v], event)
      },
      onThumbPointerDown(index) {
        const [s0, e0] = valuesRef.current
        action.current = { index, start: [s0, e0], canFlip: true, flipped: false }
        addEventListener(
          'pointerup',
          () => {
            const a = action.current
            action.current = null
            const target = inputs.current[a?.flipped ? (index === 0 ? 1 : 0) : index]
            // WebKit no enfoca un range con el clic; y si hubo flip, el foco va al que se movió.
            target?.focus({ preventScroll: true })
            if (a?.flipped && target) target.dispatchEvent(new Event('change', { bubbles: true }))
          },
          { once: true },
        )
      },
    }
  }, [values[0], values[1], min, max, step, disabled, vertical, valueIndicator, format, controlled, onValueChange])

  const named = rootProps['aria-label'] !== undefined || rootProps['aria-labelledby'] !== undefined

  return (
    <div
      role={named ? 'group' : undefined}
      {...rootProps}
      className={className ? `mk-slider ${className}` : 'mk-slider'}
      style={
        {
          ...style,
          '--_v1': toFraction(values[0], min, max),
          '--_v2': toFraction(values[1], min, max),
        } as CSSProperties
      }
      data-size={size}
      data-orientation={orientation}
      data-variant="range"
    >
      <SliderTrack startSegment marks={markFractions({ min, max, step, ticks, startStop: true, skipCenter: false })} />
      <RangeSliderContext.Provider value={context}>{children}</RangeSliderContext.Provider>
    </div>
  )
}

type ThumbInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'defaultValue' | 'min' | 'max' | 'step' | 'size' | 'children' | 'aria-label' | 'aria-labelledby'
>

export type RangeSliderThumbProps = ThumbInputProps &
  AccessibleNameProps & {
    /** Referencia al `<input type="range">` nativo. */
    ref?: Ref<HTMLInputElement> | undefined
  }

function RangeSliderThumb({
  index,
  label,
  ref,
  onChange,
  onKeyDown,
  onPointerDown,
  disabled,
  ...inputProps
}: RangeSliderThumbProps & { index: 0 | 1 }) {
  const ctx = useContext(RangeSliderContext)
  if (!ctx) throw new Error(`${index === 0 ? 'RangeSliderStart' : 'RangeSliderEnd'} va dentro de un RangeSlider`)
  const { inputs } = ctx
  const setRef = useMemo(
    () =>
      mergeRefs<HTMLInputElement>((node) => {
        inputs.current[index] = node
      }, ref),
    [inputs, index, ref],
  )
  const current = ctx.values[index]
  const text = formatValue(current, ctx.format)

  return (
    <>
      <input
        {...inputProps}
        ref={setRef}
        type="range"
        className="mk-slider-input"
        data-thumb={index === 0 ? 'start' : 'end'}
        min={ctx.min}
        max={ctx.max}
        step={ctx.step}
        // Controlado siempre por el estado del grupo: así el valor recortado o desviado (flip)
        // vuelve al input en el render siguiente.
        value={String(current)}
        disabled={disabled ?? (ctx.disabled || undefined)}
        aria-label={label ?? inputProps['aria-label']}
        aria-valuetext={inputProps['aria-valuetext'] ?? (ctx.format ? text : undefined)}
        aria-orientation={ctx.vertical ? 'vertical' : undefined}
        onChange={(event) => {
          onChange?.(event)
          ctx.onThumbChange(index, event)
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          handleArrowKeys(event, ctx.vertical)
        }}
        onPointerDown={(event) => {
          onPointerDown?.(event)
          ctx.onThumbPointerDown(index)
        }}
      />
      <SliderHandle label={text} indicator={ctx.valueIndicator} />
    </>
  )
}

/** Handle del inicio del rango (el valor menor), dentro de un `RangeSlider`. Necesita nombre accesible. */
export function RangeSliderStart(props: RangeSliderThumbProps) {
  return <RangeSliderThumb {...props} index={0} />
}

/** Handle del final del rango (el valor mayor), dentro de un `RangeSlider`. Necesita nombre accesible. */
export function RangeSliderEnd(props: RangeSliderThumbProps) {
  return <RangeSliderThumb {...props} index={1} />
}
