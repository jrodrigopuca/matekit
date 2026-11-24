// Átomo universal (ADR-0003): sin estado, efectos, contexto ni eventos; no lleva 'use client'.
// Los estados (hover, foco, presionado) los resuelve state-layer.css con pseudo-clases.

import type { HTMLAttributes } from 'react'

export interface StateLayerProps extends HTMLAttributes<HTMLSpanElement> {}

/**
 * Capa de estado de Material 3: una superposición del color del contenido que se vuelve
 * visible al pasar el puntero (8 %), con foco de teclado (10 %) y al presionar (10 %).
 *
 * Se coloca como hijo directo del elemento interactivo y reacciona a los estados de ese
 * padre. Hereda su radio de borde. No se muestra si el padre está deshabilitado o contiene,
 * como hijo directo, un control deshabilitado (por ejemplo un `<input>` oculto).
 *
 * Personalización con variables CSS:
 * - `--mk-state-layer-color`: color de la capa (por defecto, `currentColor`).
 * - `--mk-state-layer-opacity`: opacidad en reposo; sirve para mostrar un estado cuando el
 *   elemento que recibe el puntero o el foco no es el padre directo.
 */
export function StateLayer({ className, ...props }: StateLayerProps) {
  return (
    <span
      aria-hidden="true"
      {...props}
      className={className ? `mk-state-layer ${className}` : 'mk-state-layer'}
    />
  )
}
