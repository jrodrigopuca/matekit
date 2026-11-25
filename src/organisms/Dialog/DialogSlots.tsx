// Partes universales del Dialog (ADR-0003): sin estado, efectos, contexto ni eventos; no
// llevan 'use client'. Se separan de Dialog.tsx, que es cliente, para que se puedan
// renderizar desde un Server Component sin arrastrarlo.

import type { HTMLAttributes, Ref } from 'react'

export interface DialogIconProps extends HTMLAttributes<HTMLSpanElement> {
  ref?: Ref<HTMLSpanElement> | undefined
}

/**
 * Icono opcional sobre el título: 24 px, color `secondary`. Con icono, el icono y el título
 * se centran (el texto sigue alineado al inicio, como en Compose).
 *
 * ```tsx
 * <DialogIcon><DeleteIcon /></DialogIcon>
 * ```
 */
export function DialogIcon({ className, ...props }: DialogIconProps) {
  return <span {...props} className={className ? `mk-dialog-icon ${className}` : 'mk-dialog-icon'} />
}

export interface DialogActionsProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement> | undefined
}

/**
 * Acciones del diálogo, alineadas a la derecha con 8 px entre sí; si no entran en una fila,
 * pasan a la siguiente. Se usan `Button` de estilo `text`. La acción que confirma va última.
 *
 * ```tsx
 * <DialogActions>
 *   <Button variant="text" onClick={cancel}>Cancelar</Button>
 *   <Button variant="text" onClick={confirm}>Aceptar</Button>
 * </DialogActions>
 * ```
 */
export function DialogActions({ className, ...props }: DialogActionsProps) {
  return <div {...props} className={className ? `mk-dialog-actions ${className}` : 'mk-dialog-actions'} />
}
