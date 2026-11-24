// Átomo universal (ADR-0003): sin estado, efectos, contexto ni eventos; no lleva 'use client'.
// Se muestra con :focus-visible del padre, resuelto en focus-ring.css.

import type { HTMLAttributes } from 'react'

export interface FocusRingProps extends HTMLAttributes<HTMLSpanElement> {}

/**
 * Anillo de foco de Material 3: un contorno de 3 px en `secondary`, separado 2 px del
 * elemento, que aparece solo con foco de teclado (`:focus-visible`), no al hacer clic.
 *
 * Se coloca como hijo directo del elemento que recibe el foco y hereda su radio de borde.
 *
 * Personalización con variables CSS:
 * - `--mk-focus-ring-color`: color (por defecto, `--md-sys-color-secondary`).
 * - `--mk-focus-ring-offset`: separación (por defecto, 2 px; negativa para dibujarlo hacia
 *   adentro).
 * - `--mk-focus-ring-visible`: 1 para mostrarlo cuando el foco está en otro elemento, por
 *   ejemplo un `<input>` oculto hermano del anillo.
 */
export function FocusRing({ className, ...props }: FocusRingProps) {
  return (
    <span
      aria-hidden="true"
      {...props}
      className={className ? `mk-focus-ring ${className}` : 'mk-focus-ring'}
    />
  )
}
