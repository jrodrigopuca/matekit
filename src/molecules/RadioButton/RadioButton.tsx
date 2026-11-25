'use client'
// Molécula interactiva (excepción al ADR-0003 registrada en el ADR-0012): lee por contexto el
// `name`, el valor elegido y `required` de su RadioGroup, como el Radio de MUI. Sin grupo
// funciona suelto, con sus props nativas.
//
// El comportamiento sigue siendo el del <input type="radio"> nativo: la selección exclusiva y
// las flechas entre radios las resuelve el navegador para los radios con el mismo `name`, sin
// foco itinerante (roving tabindex) propio. Los estados visuales salen de CSS (:checked,
// :hover, :focus-visible, :active, :disabled) y el deshabilitado del grupo, del <fieldset>.
//
// Única ayuda de teclado: WebKit (Safari) quita :focus-visible al radio que recibe el foco por
// las flechas (comprobado el 2026-11-25), y quien navega con teclado se queda sin anillo. Una
// flecha marca un instante (hasta la próxima tarea); si en ese instante un radio recibe el foco,
// fue la flecha quien lo movió: se le pone `data-focus-visible`, que el CSS trata igual que
// :focus-visible, y se quita al perder el foco o al usar el puntero. La marca es del módulo y
// no del grupo, así que sirve también para radios con el mismo `name` sin RadioGroup. Se eligió
// sobre seguir la "modalidad" (último evento de teclado o puntero en todo el documento) porque
// no necesita escuchar el documento ni limpiar escuchas: todo pasa en los eventos del input.

import type {
  ChangeEvent,
  FocusEvent,
  InputHTMLAttributes,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
  Ref,
} from 'react'
import { FocusRing } from '../../atoms/FocusRing/FocusRing.tsx'
import { Ripple } from '../../atoms/Ripple/Ripple.tsx'
import { StateLayer } from '../../atoms/StateLayer/StateLayer.tsx'
import { useRadioGroupContext } from './RadioGroup.tsx'

const ARROWS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])
let arrowMoving = false

function markArrow(event: KeyboardEvent<HTMLInputElement>) {
  if (!ARROWS.has(event.key) || arrowMoving) return
  arrowMoving = true
  // El navegador mueve el foco en la acción por defecto de esta misma tecla, antes de la próxima tarea.
  setTimeout(() => {
    arrowMoving = false
  })
}
function focusFromArrow(event: FocusEvent<HTMLInputElement>) {
  if (arrowMoving) event.currentTarget.dataset['focusVisible'] = ''
}
function clearFocusMark(event: FocusEvent<HTMLInputElement> | PointerEvent<HTMLInputElement>) {
  delete event.currentTarget.dataset['focusVisible']
}

export interface RadioButtonProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  /** Texto o contenido de la etiqueta; es el nombre accesible. Hacer clic en él también lo selecciona. */
  children?: ReactNode
  /** Referencia al `<input>` nativo. */
  ref?: Ref<HTMLInputElement> | undefined
}

/**
 * Botón de opción (radio button) de Material 3, sobre un `<input type="radio">` nativo:
 * funciona en formularios, con el teclado (flechas entre las opciones del grupo, Espacio para
 * seleccionar la enfocada) y con lectores de pantalla, que anuncian la posición en el grupo.
 *
 * Dentro de un `RadioGroup` alcanza con `value`: el radio toma del grupo el `name` y queda
 * seleccionado cuando el valor del grupo es el suyo (comparados como texto). `checked`,
 * `defaultChecked` o `name` propios ganan sobre el grupo, y el `onChange` propio se llama antes
 * del aviso del grupo. Suelto, las props del input se pasan tal cual. `className` y `style` van
 * al contenedor (`<label>`).
 *
 * ```tsx
 * <RadioGroup defaultValue="retiro" aria-label="Envío">
 *   <RadioButton value="retiro">Retiro en el local</RadioButton>
 *   <RadioButton value="domicilio">A domicilio</RadioButton>
 * </RadioGroup>
 * <RadioButton name="talle" value="m" defaultChecked>Mediano</RadioButton>
 * ```
 */
export function RadioButton({
  children,
  className,
  style,
  ref,
  name,
  value,
  checked,
  defaultChecked,
  required,
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
  onPointerDown,
  ...inputProps
}: RadioButtonProps) {
  const group = useRadioGroupContext()

  // El grupo controla la selección solo si el radio no trae la suya.
  const fromGroup = group !== null && checked === undefined && defaultChecked === undefined
  // Sin `value`, un radio nativo vale "on".
  const ownValue = value ?? 'on'
  const groupChecked = fromGroup ? group.value !== null && group.value === String(ownValue) : undefined

  const handleChange = group
    ? (event: ChangeEvent<HTMLInputElement>) => {
        onChange?.(event)
        group.onRadioChange(event)
      }
    : onChange

  return (
    <label className={className ? `mk-radio-button ${className}` : 'mk-radio-button'} style={style}>
      <span className="mk-radio-button-control">
        <input
          {...inputProps}
          ref={ref}
          type="radio"
          className="mk-radio-button-input"
          name={name ?? group?.name}
          value={value}
          checked={fromGroup ? groupChecked : checked}
          defaultChecked={defaultChecked}
          required={required ?? (group?.required || undefined)}
          onChange={handleChange}
          onKeyDown={(event) => {
            onKeyDown?.(event)
            markArrow(event)
          }}
          onFocus={(event) => {
            onFocus?.(event)
            focusFromArrow(event)
          }}
          onBlur={(event) => {
            onBlur?.(event)
            clearFocusMark(event)
          }}
          onPointerDown={(event) => {
            onPointerDown?.(event)
            clearFocusMark(event)
          }}
        />
        <StateLayer />
        <Ripple />
        <FocusRing />
        <span className="mk-radio-button-ring" aria-hidden="true">
          <span className="mk-radio-button-dot" />
        </span>
      </span>
      {children != null && children !== false && <span className="mk-radio-button-label">{children}</span>}
    </label>
  )
}
