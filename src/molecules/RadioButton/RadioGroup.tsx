'use client'
// Molécula interactiva (excepción al ADR-0003 registrada en el ADR-0012): el grupo guarda el
// valor elegido y lo reparte por contexto a sus radios junto con `name`, `disabled` y
// `required`, así que necesita estado y contexto de React, que solo existen en el cliente.
// Así lo esperan quienes usan React (MUI, React Aria, Radix y Base UI ponen el valor en el
// grupo; ver docs/research/10-radio-group-en-librerias.md): `name` automático, controlado desde
// un solo lugar y `useRadioGroup()` para componer radios propios.
//
// El grupo es un <fieldset role="radiogroup"> y no un <div role="radiogroup"> porque el
// fieldset trae resuelto en HTML:
// - `disabled` deshabilita todos los radios de adentro (:disabled en CSS y en el árbol de
//   accesibilidad), incluidos los que no leen el contexto.
// - El nombre accesible sale del <legend> (`RadioGroupLabel`).
// El rol radiogroup (permitido en <fieldset> por ARIA in HTML) es el del patrón APG "Radio
// Group" y el que pide @material/web (docs/components/radio.md). El teclado sigue siendo el del
// navegador: los radios son <input type="radio"> nativos con el mismo `name`.
//
// El aviso de cambio es `onValueChange(value, event)` y no `onChange`: el `onChange` del
// fieldset queda como el del elemento (recibe los change que suben de cualquier control).

import {
  createContext,
  use,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type FieldsetHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react'

/** Lo que `useRadioGroup()` expone de un grupo. */
export interface RadioGroupState {
  /** `name` compartido por los radios (el de la prop o uno generado). */
  name: string
  /** Valor elegido, o `null` si no hay ninguno. */
  value: string | null
  /** Si el grupo está deshabilitado. */
  disabled: boolean
}

interface RadioGroupContextValue extends RadioGroupState {
  required: boolean
  onRadioChange: (event: ChangeEvent<HTMLInputElement>) => void
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null)

/** Contexto completo del grupo, para RadioButton (no se exporta desde el índice). */
export const useRadioGroupContext = (): RadioGroupContextValue | null => use(RadioGroupContext)

/**
 * Estado del `RadioGroup` que contiene al componente: `{ name, value, disabled }`, o `null`
 * fuera de un grupo. Sirve para componer radios propios, por ejemplo un elemento de lista que
 * se resalta cuando su opción está elegida:
 *
 * ```tsx
 * function Opcion({ value, children }: { value: string; children: ReactNode }) {
 *   const group = useRadioGroup()
 *   return <div data-selected={group?.value === value || undefined}><RadioButton value={value}>{children}</RadioButton></div>
 * }
 * ```
 */
export function useRadioGroup(): RadioGroupState | null {
  const ctx = use(RadioGroupContext)
  const name = ctx?.name
  const value = ctx?.value
  const disabled = ctx?.disabled
  return useMemo(
    () => (name === undefined ? null : { name, value: value ?? null, disabled: disabled ?? false }),
    [name, value, disabled],
  )
}

export type RadioGroupOrientation = 'vertical' | 'horizontal'

export interface RadioGroupProps
  extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, 'role' | 'name' | 'defaultValue'> {
  /** `RadioGroupLabel` (opcional, si se usa `aria-label` o `aria-labelledby`) y los `RadioButton`. */
  children?: ReactNode
  /** `name` de los radios, para el formulario. Si falta, se genera uno. */
  name?: string | undefined
  /** Valor elegido (controlado). `null`: ninguno. */
  value?: string | null | undefined
  /** Valor elegido al principio (no controlado). */
  defaultValue?: string | undefined
  /** Se llama cuando el usuario elige una opción, con su `value` y el evento del radio. */
  onValueChange?: ((value: string, event: ChangeEvent<HTMLInputElement>) => void) | undefined
  /** Deshabilita todas las opciones. */
  disabled?: boolean | undefined
  /** Obliga a elegir una opción para enviar el formulario. */
  required?: boolean | undefined
  /** Disposición de las opciones: en columna (por defecto) o en fila. Las flechas funcionan igual. */
  orientation?: RadioGroupOrientation | undefined
  /** Referencia al `<fieldset>`. */
  ref?: Ref<HTMLFieldSetElement> | undefined
}

/**
 * Grupo de botones de opción: un `<fieldset role="radiogroup">` que reparte a sus
 * `RadioButton` el `name`, el valor elegido y el estado deshabilitado. Necesita un nombre
 * accesible: `RadioGroupLabel` como primer hijo, o `aria-label` / `aria-labelledby`.
 *
 * ```tsx
 * <RadioGroup value={envio} onValueChange={setEnvio}>
 *   <RadioGroupLabel>Envío</RadioGroupLabel>
 *   <RadioButton value="retiro">Retiro en el local</RadioButton>
 *   <RadioButton value="domicilio">A domicilio</RadioButton>
 * </RadioGroup>
 * ```
 *
 * No controlado: `defaultValue="retiro"`. Un radio con `checked`, `defaultChecked` o `name`
 * propios no toma esos datos del grupo.
 */
export function RadioGroup({
  children,
  className,
  name: nameProp,
  value: valueProp,
  defaultValue,
  onValueChange,
  disabled = false,
  required = false,
  orientation = 'vertical',
  ref,
  ...props
}: RadioGroupProps) {
  const generatedName = useId()
  const name = nameProp ?? generatedName
  const [uncontrolled, setUncontrolled] = useState<string | null>(defaultValue ?? null)
  const controlled = valueProp !== undefined
  const value = controlled ? valueProp : uncontrolled

  const context = useMemo<RadioGroupContextValue>(
    () => ({
      name,
      value,
      disabled,
      required,
      onRadioChange(event) {
        if (!controlled) setUncontrolled(event.target.value)
        onValueChange?.(event.target.value, event)
      },
    }),
    [name, value, disabled, required, controlled, onValueChange],
  )

  return (
    <RadioGroupContext value={context}>
      <fieldset
        {...props}
        ref={ref}
        role="radiogroup"
        disabled={disabled}
        aria-orientation={orientation}
        data-orientation={orientation}
        className={className ? `mk-radio-group ${className}` : 'mk-radio-group'}
      >
        {children}
      </fieldset>
    </RadioGroupContext>
  )
}

export interface RadioGroupLabelProps extends HTMLAttributes<HTMLLegendElement> {
  /** Referencia al `<legend>`. */
  ref?: Ref<HTMLLegendElement> | undefined
}

/** Título visible del grupo: un `<legend>`, que da el nombre accesible al `RadioGroup`. Va primero. */
export function RadioGroupLabel({ className, ...props }: RadioGroupLabelProps) {
  return <legend {...props} className={className ? `mk-radio-group-label ${className}` : 'mk-radio-group-label'} />
}
