// Molécula universal (ADR-0003): sin estado, efectos ni contexto; no lleva 'use client'.
// Estados y colores son CSS (chip.css). Contiene la onda (Ripple), un átomo cliente, como el
// Button: sigue sirviendo desde un Server Component.
//
// Elemento (ADR-0010): sin `href` ni `render`, un `<button type="button">`; con `href`, un `<a>`
// ("Ver en el mapa" navega); con `render={<Link href="…" />}`, el enlace del enrutador. Los tipos
// rechazan `disabled` en las formas de enlace (LinkModeExclusions). Un assist chip no es un
// toggle: no acepta `selected` (el kit no tiene assist seleccionado).

import type { ReactNode } from 'react'
import type { ToggleButtonOrLinkProps } from '../../internal/interactive.tsx'
import type { ChipVariant } from './chip-content.tsx'
import { chipElement } from './chip-element.tsx'

interface AssistChipOwnProps {
  /** `outlined` (por defecto) o `elevated`, para cuando el chip va sobre una imagen. */
  variant?: ChipVariant | undefined
  /** Un icono opcional y el texto: `<EventIcon />Agendar`. */
  children?: ReactNode
  selected?: never
}

/** Props del AssistChip: las propias más una de las tres formas de ADR-0010 (botón, `href` o `render`). */
export type AssistChipProps = ToggleButtonOrLinkProps<AssistChipOwnProps>

/**
 * Chip de asistencia: una acción inteligente o contextual ("Agregar al calendario", "Cómo
 * llegar"). El icono de inicio va en `primary`.
 *
 * ```tsx
 * <AssistChip onClick={agendar}><EventIcon />Agregar al calendario</AssistChip>
 * <AssistChip variant="elevated" href="/mapa">Ver en el mapa</AssistChip>
 * ```
 */
export function AssistChip(props: AssistChipProps) {
  const { variant = 'outlined', className, children, ...rest } = props
  return chipElement(
    { name: 'AssistChip', type: 'assist', variant, selected: undefined, checkWhenSelected: false, className, children },
    rest,
  )
}
