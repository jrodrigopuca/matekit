// Molécula universal (ADR-0003): sin estado, efectos, contexto ni eventos propios; no lleva
// 'use client'. Todo el comportamiento es del <input type="radio"> nativo: la selección
// exclusiva y las flechas entre radios las resuelve el navegador para los radios con el mismo
// `name`, y los estados visuales salen de CSS (:checked, :hover, :focus-visible, :active,
// :disabled). Contiene la onda (Ripple), que es un átomo cliente: un componente universal puede
// renderizar uno cliente, así que RadioButton sigue sirviendo desde un Server Component
// (como Switch).

import type { InputHTMLAttributes, ReactNode, Ref } from 'react'
import { FocusRing } from '../../atoms/FocusRing/FocusRing.tsx'
import { Ripple } from '../../atoms/Ripple/Ripple.tsx'
import { StateLayer } from '../../atoms/StateLayer/StateLayer.tsx'

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
 * Los radios de un mismo grupo comparten `name`, como en HTML: se pasa a cada uno (ver
 * `RadioGroup`). Las props del input (`name`, `value`, `checked`, `defaultChecked`,
 * `onChange`, `disabled`, `required`…) se pasan tal cual. `className` y `style` van al
 * contenedor (`<label>`).
 *
 * ```tsx
 * <RadioButton name="envio" value="retiro" defaultChecked>Retiro en el local</RadioButton>
 * <RadioButton name="envio" value="domicilio" checked={v === 'domicilio'} onChange={…}>A domicilio</RadioButton>
 * ```
 */
export function RadioButton({ children, className, style, ref, ...inputProps }: RadioButtonProps) {
  return (
    <label className={className ? `mk-radio-button ${className}` : 'mk-radio-button'} style={style}>
      <span className="mk-radio-button-control">
        <input {...inputProps} ref={ref} type="radio" className="mk-radio-button-input" />
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
