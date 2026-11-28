'use client'
// Contexto de las partes del bottom sheet (BottomSheetHandle y BottomSheetTitle), compartido por el
// modal (BottomSheet.tsx) y el standard (StandardBottomSheet.tsx, ADR-0030). Interno: no se exporta.

import { createContext, use } from 'react'
import { partOutsideParent } from '../../internal/diagnostics.ts'

/** Estado del sheet abierto: parcial (el modal: la mitad de la ventana; el standard: el asomo) o expandido. */
export type BottomSheetState = 'partial' | 'expanded'

/**
 * Por qué cambió el estado (`onStateChange`):
 * - `drag`: se soltó un arrastre y el sheet se acomoda en otro estado;
 * - `handle`: el asa (clic o teclado);
 * - `focus`: el foco llegó a algo que el parcial deja fuera de la vista y el sheet se expande;
 * - `resize` (solo el modal): el parcial dejó de existir (el sheet ya no pasa la mitad de la
 *   ventana, o `skipPartiallyExpanded`) y el sheet se muestra expandido, o volvió a existir y el
 *   sheet, con `state="partial"`, vuelve al parcial.
 */
export type BottomSheetStateChangeReason = 'drag' | 'handle' | 'focus' | 'resize'

export interface BottomSheetContextValue {
  titleId: string
  setTitleId: (id: string | undefined) => void
  state: BottomSheetState
  hasPartial: boolean
  requestState: (state: BottomSheetState, reason: BottomSheetStateChangeReason) => void
  requestClose: () => void
}

export const BottomSheetContext = createContext<BottomSheetContextValue | null>(null)

export function useBottomSheet(part: string): BottomSheetContextValue {
  const ctx = use(BottomSheetContext)
  if (!ctx) throw partOutsideParent(part, 'BottomSheet')
  return ctx
}
