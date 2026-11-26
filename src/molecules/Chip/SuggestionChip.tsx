// Molécula universal (ADR-0003): sin estado, efectos ni contexto; no lleva 'use client'.
// Como AssistChip (ver su comentario): botón, `href` o `render` (ADR-0010). El kit también tiene
// el suggestion seleccionado (Compose no): con `selected`, y solo como `<button>`, es un toggle
// con `aria-pressed`, como el Button.

import type { ReactNode } from 'react'
import type { ToggleButtonOrLinkProps } from '../../internal/interactive.tsx'
import type { ChipVariant } from './chip-content.tsx'
import { chipElement } from './chip-element.tsx'

interface SuggestionChipOwnProps {
  /** `outlined` (por defecto) o `elevated`. */
  variant?: ChipVariant | undefined
  /** Un icono opcional y el texto. */
  children?: ReactNode
}

/**
 * Props del SuggestionChip: las propias más una de las tres formas de ADR-0010. Solo el
 * `<button>` acepta `selected` (toggle) y `disabled`.
 */
export type SuggestionChipProps = ToggleButtonOrLinkProps<SuggestionChipOwnProps>

/**
 * Chip de sugerencia: una respuesta o búsqueda sugerida que el usuario elige ("Me parece bien").
 *
 * ```tsx
 * <SuggestionChip onClick={() => responder('Dale')}>Dale</SuggestionChip>
 * <SuggestionChip href="/buscar?q=empanadas">Empanadas</SuggestionChip>
 * ```
 */
export function SuggestionChip(props: SuggestionChipProps) {
  const { variant = 'outlined', selected, className, children, ...rest } = props
  return chipElement(
    { name: 'SuggestionChip', type: 'suggestion', variant, selected, checkWhenSelected: false, className, children },
    rest,
  )
}
