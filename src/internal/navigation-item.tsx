// Módulo interno universal (ADR-0003): sin estado, efectos, contexto ni eventos. No se exporta
// desde src/index.ts. Es la base común de los destinos de NavigationBar y NavigationRail: los dos
// son un `<a>`, un `<button>` o el elemento de `render` (ADR-0010), activos por `aria-current`,
// con un indicador y los átomos (capa de estado, onda, anillo de foco) que el CSS ubica sobre él.
// Lo que cambia entre los dos es solo la clase base (y con ella la disposición en el CSS).

import type { ReactNode } from 'react'
import { FocusRing } from '../atoms/FocusRing/FocusRing.tsx'
import { Ripple } from '../atoms/Ripple/Ripple.tsx'
import { StateLayer } from '../atoms/StateLayer/StateLayer.tsx'
import {
  Interactive,
  type ButtonElementProps,
  type LinkElementProps,
  type RenderElementProps,
} from '../atoms/Interactive/Interactive.tsx'
import { assertRenderElement, cx } from './interactive.tsx'

export interface NavigationItemOwnProps {
  /**
   * Destino actual: pone `aria-current="page"` y muestra el indicador. Lo decide la
   * aplicación (por ejemplo, comparando con la ruta actual). Si el elemento que se pasa en
   * `render` ya pone `aria-current` (el `NavLink` de React Router), no hace falta.
   */
  active?: boolean | undefined
  /** Icono, etiqueta y, si hace falta, `Badge`. */
  children?: ReactNode
}

export type NavigationItemProps = NavigationItemOwnProps &
  (LinkElementProps | ButtonElementProps | RenderElementProps)

/**
 * Dibuja un destino de navegación.
 *
 * @param name nombre del componente, para el mensaje de error de `render`.
 * @param base clase base (`mk-navigation-bar-item`, `mk-navigation-rail-item`); el indicador
 *   lleva `${base}-indicator`.
 */
export function navigationItem(name: string, base: string, props: NavigationItemProps) {
  const { active, className, children, ...rest } = props
  const current = active ? { 'aria-current': 'page' as const } : {}
  assertRenderElement(name, rest.render)
  return (
    <Interactive {...current} {...rest} className={cx(base, className)}>
      <span className={`${base}-indicator`} aria-hidden="true" />
      <StateLayer />
      <Ripple />
      <FocusRing />
      {children}
    </Interactive>
  )
}
