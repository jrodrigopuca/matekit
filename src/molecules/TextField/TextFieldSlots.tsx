// Partes universales del TextField (ADR-0003): sin estado, efectos, contexto ni eventos; no
// llevan 'use client'. Se separan de TextField.tsx, que es cliente, para que se puedan
// renderizar desde un Server Component sin arrastrarlo.

import type { HTMLAttributes } from 'react'

export interface TextFieldSlotProps extends HTMLAttributes<HTMLSpanElement> {}

/**
 * Icono inicial del campo, en un área de 48 × 48 con el icono de 24 centrado. Puede llevar un
 * icono (decorativo) o un `IconButton`.
 *
 * ```tsx
 * <TextFieldLeading><SearchIcon /></TextFieldLeading>
 * ```
 */
export function TextFieldLeading({ className, ...props }: TextFieldSlotProps) {
  return <span {...props} className={className ? `mk-text-field-leading ${className}` : 'mk-text-field-leading'} />
}

/**
 * Icono o botón final del campo, en un área de 48 × 48. En error, un icono o un `IconButton`
 * estándar toman el color de error. Si el campo está deshabilitado, pasar `disabled` también
 * al `IconButton`.
 *
 * ```tsx
 * <TextFieldTrailing><IconButton label="Borrar" onClick={clear}><CancelIcon /></IconButton></TextFieldTrailing>
 * ```
 */
export function TextFieldTrailing({ className, ...props }: TextFieldSlotProps) {
  return <span {...props} className={className ? `mk-text-field-trailing ${className}` : 'mk-text-field-trailing'} />
}
