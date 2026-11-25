// Átomo universal (ADR-0003): sin estado, efectos, contexto ni eventos; no lleva 'use client'.

import type { HTMLAttributes, Ref } from 'react'

const cx = (base: string, extra: string | undefined) => (extra ? `${base} ${extra}` : base)

export type DividerOrientation = 'horizontal' | 'vertical'
/** `start`: sangría al inicio (Inset del kit). `both`: a ambos lados (Middle-inset). */
export type DividerInset = 'start' | 'both'

export interface DividerProps extends HTMLAttributes<HTMLHRElement> {
  ref?: Ref<HTMLHRElement> | undefined
  /** Horizontal (por defecto) o vertical, que se estira al alto de un contenedor flex o grid. */
  orientation?: DividerOrientation | undefined
  /**
   * Sangría de 16 px (`--mk-divider-inset`): al inicio de la línea (a la izquierda, o a la
   * derecha en RTL; arriba en la vertical) o a ambos lados. Sin definir, ocupa todo el largo.
   */
  inset?: DividerInset | undefined
  /**
   * Oculta el divisor a los lectores de pantalla. Usarlo cuando la línea solo acompaña una
   * separación que ya se entiende de otra forma (un título de sección, el borde de una
   * tarjeta); sin él, se anuncia como separador (`<hr>`, `role="separator"`).
   */
  decorative?: boolean | undefined
}

/**
 * Divisor: una línea de 1 px en `outline-variant` sobre un `<hr>` (rol `separator`).
 *
 * ```tsx
 * <Divider />
 * <Divider inset="start" />
 * <div style={{ display: 'flex' }}>…<Divider orientation="vertical" />…</div>
 * ```
 */
export function Divider({ orientation = 'horizontal', inset, decorative, className, ...props }: DividerProps) {
  return (
    <hr
      {...(orientation === 'vertical' ? { 'aria-orientation': 'vertical' } : {})}
      {...(decorative ? { 'aria-hidden': true } : {})}
      {...(inset ? { 'data-inset': inset } : {})}
      {...props}
      className={cx('mk-divider', className)}
    />
  )
}

export interface DividerSubheadProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement> | undefined
}

/**
 * Divisor con subtítulo ("Divider with subhead" del kit): la línea y, debajo, el título de la
 * sección que empieza, en Title Small y `on-surface-variant`, con 16 px a ambos lados.
 *
 * El título es el hijo y su elemento lo elige quien lo usa (`<h2>`…`<h6>` según el nivel en
 * la página), para que la sección quede en la navegación por encabezados. La línea queda
 * decorativa: el encabezado ya marca dónde empieza la sección, y anunciar además un separador
 * sería repetirlo.
 *
 * ```tsx
 * <DividerSubhead><h3>Recientes</h3></DividerSubhead>
 * ```
 */
export function DividerSubhead({ className, children, ...props }: DividerSubheadProps) {
  return (
    <div {...props} className={cx('mk-divider-subhead', className)}>
      <Divider decorative />
      {children}
    </div>
  )
}
