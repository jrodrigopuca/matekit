'use client'
// Organismo interactivo (ADR-0023): solo por el movimiento. La barra de enlaces con aspecto de
// pestañas (`TabLink`) es un `<nav>` común; sin JavaScript se ve y funciona igual (el indicador es
// de cada enlace, tab-content.tsx), y el efecto suma el deslizamiento del indicador cuando cambia
// el `aria-current` (navegación del lado del cliente, con el `Link` del enrutador) y trae el enlace
// actual a la vista en la scrollable. Los enlaces (`TabLink`) son universales y pueden venir de un
// Server Component como hijos.
//
// No es el patrón APG "Tabs": cada enlace lleva a otra página, así que no hay `tablist`, `tab` ni
// paneles, y Tab recorre los enlaces uno por uno, como en cualquier lista de enlaces.

import { useLayoutEffect, useMemo, useRef, type HTMLAttributes, type Ref } from 'react'
import { cx } from '../../internal/interactive.tsx'
import { mergeRefs } from '../../internal/merge-refs.ts'
import { scrollTabIntoView, slideIndicator } from './tab-motion.ts'
import type { TabBarProps } from './Tabs.tsx'

export interface TabNavProps extends TabBarProps, HTMLAttributes<HTMLElement> {
  /** Referencia al `<nav>`. */
  ref?: Ref<HTMLElement> | undefined
}

const currentLink = (nav: HTMLElement) =>
  [...nav.querySelectorAll<HTMLElement>('.mk-tab[aria-current]:not([aria-current="false"])')].find(
    (el) => el.closest('.mk-tab-list') === nav,
  ) ?? null

/**
 * Barra de pestañas para navegar entre páginas: un `<nav>` con `TabLink`, con el mismo aspecto que
 * `TabList` (primary o secondary, fixed o scrollable). Si la página tiene más de un `<nav>`,
 * conviene darle nombre con `aria-label`.
 *
 * ```tsx
 * <TabNav aria-label="Cuenta">
 *   <TabLink href="/cuenta/perfil" active>Perfil</TabLink>
 *   <TabLink href="/cuenta/seguridad">Seguridad</TabLink>
 * </TabNav>
 * ```
 */
export function TabNav({ variant = 'primary', layout = 'fixed', className, ref, ...rest }: TabNavProps) {
  const navRef = useRef<HTMLElement>(null)
  const mergedRef = useMemo(() => mergeRefs<HTMLElement>(ref, navRef), [ref])

  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return
    let previous = currentLink(nav)
    if (previous) scrollTabIntoView(nav, previous, false)
    // El aria-current lo puede poner la app (`active`) o el enrutador (NavLink): se observa el DOM.
    const observer = new MutationObserver(() => {
      const link = currentLink(nav)
      if (!link || link === previous) return
      if (previous?.isConnected) slideIndicator(previous, link)
      scrollTabIntoView(nav, link, true)
      previous = link
    })
    observer.observe(nav, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-current'] })
    return () => observer.disconnect()
  }, [])

  return <nav {...rest} ref={mergedRef} data-variant={variant} data-layout={layout} className={cx('mk-tab-list', className)} />
}
