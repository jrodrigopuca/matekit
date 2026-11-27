// Partes universales de la search bar (ADR-0003): sin estado, efectos, contexto ni eventos, no
// llevan 'use client'. La barra (SearchBar, cliente) las ubica por clase en su grilla, así que el
// orden de los hijos no importa (como TextFieldLeading y TextFieldTrailing).

import type { HTMLAttributes, Ref } from 'react'
import { cx } from '../../internal/interactive.tsx'

export interface SearchBarPartProps extends HTMLAttributes<HTMLSpanElement> {
  /** Referencia al `<span>` de la parte. */
  ref?: Ref<HTMLSpanElement> | undefined
}

/**
 * El inicio de la barra: un `IconButton` (menú, volver) o un icono de 24 (la lupa). En un área de
 * 48, color On Surface (kit; Compose `SearchBarTokens.LeadingIconColor`).
 */
export function SearchBarLeading({ className, ...props }: SearchBarPartProps) {
  return <span {...props} className={cx('mk-search-bar-leading', className)} />
}

/**
 * El final de la barra: uno o dos `IconButton` (voz, más opciones) o un avatar (una `<img>` de
 * 30, redonda, en un área de 50, kit). Color On Surface Variant. El botón de borrar lo agrega la
 * barra sola, antes de esta parte, mientras hay texto.
 */
export function SearchBarTrailing({ className, ...props }: SearchBarPartProps) {
  return <span {...props} className={cx('mk-search-bar-trailing', className)} />
}
