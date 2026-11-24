// Molécula universal (ADR-0003): sin estado, efectos, contexto ni eventos propios; no lleva
// 'use client'. A diferencia del Checkbox, el Switch no tiene estado indeterminado (que solo
// existe como propiedad del DOM y exige JavaScript), así que todo lo demás se resuelve con el
// <input> nativo y CSS: activado con :checked, hover, foco y presionado con pseudo-clases.
// Contiene la onda (Ripple), que es un átomo cliente: un componente universal puede
// renderizar uno cliente, así que Switch sigue sirviendo desde un Server Component (como Button).

import type { InputHTMLAttributes, ReactNode, Ref } from 'react'
import { FocusRing } from '../../atoms/FocusRing/FocusRing.tsx'
import { Ripple } from '../../atoms/Ripple/Ripple.tsx'
import { StateLayer } from '../../atoms/StateLayer/StateLayer.tsx'
import { CheckIcon, CloseIcon } from '../../icons/icons.tsx'

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'role' | 'children'> {
  /** Texto o contenido de la etiqueta; es el nombre accesible. Hacer clic en él también lo alterna. */
  children?: ReactNode
  /** Muestra una marca en el control deslizante al activarlo y una cruz al desactivarlo. */
  icons?: boolean | undefined
  /** Referencia al `<input>` nativo. */
  ref?: Ref<HTMLInputElement> | undefined
}

/**
 * Interruptor (switch) de Material 3, sobre un `<input type="checkbox" role="switch">`
 * nativo: funciona en formularios, con el teclado (Espacio) y con lectores de pantalla, que lo
 * anuncian como interruptor activado o desactivado.
 *
 * Las props del input (`checked`, `defaultChecked`, `onChange`, `name`, `value`, `disabled`,
 * `required`…) se pasan tal cual. `className` y `style` van al contenedor (`<label>`).
 *
 * ```tsx
 * <Switch defaultChecked>Wi-Fi</Switch>
 * <Switch checked={on} onChange={(e) => setOn(e.target.checked)} icons>Modo avión</Switch>
 * ```
 */
export function Switch({ children, icons = false, className, style, ref, ...inputProps }: SwitchProps) {
  return (
    <label
      className={className ? `mk-switch ${className}` : 'mk-switch'}
      style={style}
      data-icons={icons || undefined}
    >
      <span className="mk-switch-control">
        <input {...inputProps} ref={ref} type="checkbox" role="switch" className="mk-switch-input" />
        <span className="mk-switch-track" aria-hidden="true">
          <FocusRing />
        </span>
        <StateLayer />
        <Ripple />
        <span className="mk-switch-handle" aria-hidden="true">
          {icons && (
            <>
              <CheckIcon className="mk-switch-icon-on" />
              <CloseIcon className="mk-switch-icon-off" />
            </>
          )}
        </span>
      </span>
      {children != null && children !== false && <span className="mk-switch-label">{children}</span>}
    </label>
  )
}
