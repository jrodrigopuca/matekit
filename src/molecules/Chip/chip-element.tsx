// Módulo universal (ADR-0003): sin estado, efectos, contexto ni eventos; no lleva 'use client'.
// Dibuja el elemento de un chip de una sola acción (assist, suggestion y filter): un `<button>`,
// un `<a>` o el elemento de `render` (ADR-0010, el átomo Interactive), con los átomos y el
// contenido repartido (chip-content.tsx). El input chip tiene dos acciones y su propio armado.

import type { ReactNode } from 'react'
import { FocusRing } from '../../atoms/FocusRing/FocusRing.tsx'
import { Ripple } from '../../atoms/Ripple/Ripple.tsx'
import { StateLayer } from '../../atoms/StateLayer/StateLayer.tsx'
import { Interactive, type InteractiveProps } from '../../atoms/Interactive/Interactive.tsx'
import { assertRenderElement, cx } from '../../internal/interactive.tsx'
import { chipContent, chipDataAttributes, type ChipVariant } from './chip-content.tsx'

export type ChipType = 'assist' | 'filter' | 'suggestion'

interface ChipElementOptions {
  name: string
  type: ChipType
  variant: ChipVariant
  selected: boolean | undefined
  /** Marca en lugar del icono de inicio cuando está seleccionado (filter). */
  checkWhenSelected: boolean
  className: string | undefined
  children: ReactNode
}

export function chipElement(
  { name, type, variant, selected, checkWhenSelected, className, children }: ChipElementOptions,
  rest: Record<string, unknown>,
) {
  const content = chipContent(children, { check: checkWhenSelected && selected === true })
  assertRenderElement(name, rest.render)
  return (
    <Interactive
      // Antes de las props del uso: un aria-pressed propio gana, como en el Button.
      {...(selected === undefined ? {} : { 'aria-pressed': selected })}
      // Las props de cada chip ya las tiparon AssistChip, FilterChip y SuggestionChip; acá llegan
      // como un registro sin forma, así que se afirma que son una de las tres de Interactive.
      {...(rest as InteractiveProps)}
      data-chip={type}
      data-chip-stop=""
      data-variant={variant}
      {...chipDataAttributes(content)}
      className={cx('mk-chip', className)}
    >
      <StateLayer />
      <Ripple />
      <FocusRing />
      {content.content}
    </Interactive>
  )
}
