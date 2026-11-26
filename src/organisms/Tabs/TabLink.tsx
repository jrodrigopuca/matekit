// Organismo universal (ADR-0003): sin estado, efectos, contexto ni eventos; no lleva 'use client'.
// Pestaña de navegación entre páginas (ADR-0023): un enlace con el aspecto de una pestaña, no una
// pestaña APG. Va dentro de `TabNav`. Activo por `aria-current="page"`, como los destinos de
// NavigationBar (src/internal/navigation-item.tsx); un `<a>` con `href` o el `Link` del enrutador
// con `render` (ADR-0010, átomo Interactive). Tab recorre los enlaces uno por uno, como en
// cualquier lista de enlaces (sin foco itinerante ni flechas).

import {
  Interactive,
  type LinkElementProps,
  type RenderElementProps,
} from '../../atoms/Interactive/Interactive.tsx'
import { assertRenderElement, cx } from '../../internal/interactive.tsx'
import { tabContent, warnIfUnnamed } from './tab-content.tsx'
import type { ReactNode } from 'react'

interface TabLinkOwnProps {
  /**
   * Página actual: pone `aria-current="page"` y muestra el indicador. Lo decide la aplicación
   * (comparando con la ruta). Si el elemento de `render` ya pone `aria-current` (el `NavLink` de
   * React Router), no hace falta.
   */
  active?: boolean | undefined
  /** Icono, etiqueta (texto o `TabLabel`) y, si hace falta, `Badge`. Solo icono: `aria-label`. */
  children?: ReactNode
}

/** Con `href`, un `<a>`. */
export type TabLinkAnchorProps = TabLinkOwnProps & LinkElementProps
/** Con `render`, el elemento que se pase (el `Link` del enrutador), clonado con las clases y el contenido. */
export type TabLinkRenderProps = TabLinkOwnProps & RenderElementProps
export type TabLinkProps = TabLinkAnchorProps | TabLinkRenderProps

/**
 * Enlace de una `TabNav`, con el aspecto de una pestaña.
 *
 * ```tsx
 * // Next.js (App Router): el enlace puede ser de servidor.
 * <TabLink active={pathname === '/cuenta/perfil'} render={<Link href="/cuenta/perfil" />}>Perfil</TabLink>
 * ```
 */
export function TabLink(props: TabLinkProps) {
  const { active, className, children, ...rest } = props
  assertRenderElement('TabLink', rest.render)
  const content = tabContent(children)
  warnIfUnnamed('TabLink', content.hasLabel, rest)
  return (
    <Interactive
      {...(active ? { 'aria-current': 'page' as const } : {})}
      {...rest}
      {...content.data}
      className={cx('mk-tab', className)}
    >
      {content.children}
    </Interactive>
  )
}
