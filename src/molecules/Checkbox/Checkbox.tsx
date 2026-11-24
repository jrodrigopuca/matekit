'use client'
// Molécula interactiva (ADR-0003): el estado indeterminado de un <input type="checkbox"> solo
// existe como propiedad del DOM (input.indeterminate), no como atributo, así que hace falta
// JavaScript en el cliente para aplicarlo.

import { useCallback, useLayoutEffect, useRef, type InputHTMLAttributes, type ReactNode, type Ref } from 'react'
import { FocusRing } from '../../atoms/FocusRing/FocusRing.tsx'
import { Ripple } from '../../atoms/Ripple/Ripple.tsx'
import { StateLayer } from '../../atoms/StateLayer/StateLayer.tsx'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  /** Texto o contenido de la etiqueta. Hacer clic en él también marca la casilla. */
  children?: ReactNode
  /** Estado "en parte marcado" (por ejemplo, cuando solo algunos elementos de un grupo lo están). */
  indeterminate?: boolean | undefined
  /** Estado de error: colores de error y `aria-invalid` en el input. */
  error?: boolean | undefined
  /** Referencia al `<input>` nativo. */
  ref?: Ref<HTMLInputElement> | undefined
}

/**
 * Casilla de verificación de Material 3, sobre un `<input type="checkbox">` nativo: funciona
 * en formularios, con el teclado (Espacio) y con lectores de pantalla sin código extra.
 *
 * Las props del input (`checked`, `defaultChecked`, `onChange`, `name`, `value`, `disabled`,
 * `required`…) se pasan tal cual. `className` y `style` van al contenedor (`<label>`).
 *
 * ```tsx
 * <Checkbox defaultChecked>Recordarme</Checkbox>
 * <Checkbox checked={all} indeterminate={some} onChange={(e) => setAll(e.target.checked)}>
 *   Seleccionar todo
 * </Checkbox>
 * ```
 */
export function Checkbox({
  children,
  indeterminate = false,
  error = false,
  className,
  style,
  ref,
  ...inputProps
}: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Se aplica en cada render: el navegador quita el estado indeterminado al hacer clic, y
  // así la casilla vuelve a reflejar la prop si el componente padre no la cambió.
  useLayoutEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate
  })

  const setRefs = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node
      if (typeof ref === 'function') return ref(node)
      if (ref) ref.current = node
    },
    [ref],
  )

  return (
    <label
      className={className ? `mk-checkbox ${className}` : 'mk-checkbox'}
      style={style}
      data-error={error || undefined}
    >
      <span className="mk-checkbox-control">
        <input
          {...inputProps}
          ref={setRefs}
          type="checkbox"
          className="mk-checkbox-input"
          aria-invalid={error || inputProps['aria-invalid'] || undefined}
        />
        <StateLayer />
        <Ripple />
        <FocusRing />
        <span className="mk-checkbox-box" aria-hidden="true">
          <svg className="mk-checkbox-icon" viewBox="0 0 18 18" focusable="false">
            <path className="mk-checkbox-check" d="M3.5 9.2 7.2 12.9 14.5 5.4" />
            <path className="mk-checkbox-dash" d="M3 9h12" />
          </svg>
        </span>
      </span>
      {children != null && children !== false && <span className="mk-checkbox-label">{children}</span>}
    </label>
  )
}
