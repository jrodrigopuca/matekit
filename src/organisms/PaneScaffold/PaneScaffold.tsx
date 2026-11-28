// Organismo universal (ADR-0003): sin estado, efectos, contexto ni eventos; no lleva 'use client'.
// Paneles de lista y detalle y de contenido con panel de apoyo, como ListDetailPaneScaffold y
// SupportingPaneScaffold de Compose (docs/research/11-disposicion-adaptable-compose.md § 2). API y
// motivos: ADR-0030.
//
// Todo lo que cambia con la ventana es CSS (pane-scaffold.css): cuántos paneles se ven, cuáles, su
// ancho, su superficie, los márgenes y las zonas seguras. El componente solo escribe el caso y el
// panel actual en atributos (`data-variant`, `data-current`) y el nombre de cada panel
// (`data-pane`); así el HTML del servidor ya es el correcto y no hay salto al hidratar.
//
// Los paneles ocultos quedan montados (`display: none`): su estado de React y lo desplazado
// sobreviven al cambiar de ventana o de panel actual (comprobado en los tres motores, ADR-0030).

import { Children, Fragment, isValidElement, type ReactNode } from 'react'
import { isDevelopment } from '../../internal/dev.ts'
import { mkWarn } from '../../internal/diagnostics.ts'
import { cx } from '../../internal/interactive.tsx'
import { layoutElement, type LayoutElementProps } from '../../internal/layout-element.tsx'

/** Paneles de lista y detalle: la lista, el detalle del elemento elegido y uno extra opcional. */
export type ListDetailPaneName = 'list' | 'detail' | 'extra'
/** Paneles de contenido con apoyo: el principal, el de apoyo y uno extra opcional. */
export type SupportingPaneName = 'main' | 'supporting' | 'extra'
/** Nombre de un panel, en cualquiera de los dos casos. */
export type PaneName = ListDetailPaneName | SupportingPaneName
/** El caso: `list-detail` (`ListDetailPaneScaffold`) o `supporting` (`SupportingPaneScaffold`). */
export type PaneScaffoldVariant = 'list-detail' | 'supporting'

const PANES: Record<PaneScaffoldVariant, readonly PaneName[]> = {
  'list-detail': ['list', 'detail', 'extra'],
  supporting: ['main', 'supporting', 'extra'],
}

interface PaneScaffoldCommonProps extends LayoutElementProps {
  children?: ReactNode
}

export interface PaneScaffoldListDetailProps extends PaneScaffoldCommonProps {
  /** Lista y detalle (por defecto). Paneles `list`, `detail` y, opcional, `extra`. */
  variant?: 'list-detail' | undefined
  /**
   * El panel que el usuario está mirando: el único visible en una ventana de un panel, y uno de
   * los visibles en las de varios. Por defecto `list` (Compose arranca en la lista).
   */
  current?: ListDetailPaneName | undefined
}

export interface PaneScaffoldSupportingProps extends PaneScaffoldCommonProps {
  /** Contenido con panel de apoyo. Paneles `main`, `supporting` y, opcional, `extra`. */
  variant: 'supporting'
  /** El panel que el usuario está mirando. Por defecto `main`. */
  current?: SupportingPaneName | undefined
}

export type PaneScaffoldProps = PaneScaffoldListDetailProps | PaneScaffoldSupportingProps

/**
 * Disposición en paneles de Material 3: lista y detalle, o contenido con panel de apoyo, que muestra
 * uno, dos o tres paneles según la ventana, como `ListDetailPaneScaffold` y `SupportingPaneScaffold`
 * de Compose.
 *
 * ```tsx
 * <PaneScaffold current={selected ? 'detail' : 'list'}>
 *   <NavigationSuite aria-label="Main">…</NavigationSuite>
 *   <Pane name="list" render={<nav aria-label="Messages" />}>
 *     <TopAppBar><TopAppBarTitle>Inbox</TopAppBarTitle></TopAppBar>
 *     <List>…</List>
 *   </Pane>
 *   <Pane name="detail" render={<main />}>
 *     <TopAppBar>…</TopAppBar>
 *     …
 *   </Pane>
 * </PaneScaffold>
 * ```
 *
 * - **Cuántos paneles:** 1 en ventanas compactas y medianas (menos de 840 px, `WINDOW_WIDTH.expanded`),
 *   2 desde 840 y 3 desde 1200 (`WINDOW_WIDTH.large`), con media queries: sin JavaScript, también
 *   desde un Server Component.
 * - **Cuáles:** con uno, el `current`. Con varios, el `current` y los de más prioridad (Compose: el
 *   detalle o el principal, después la lista o el de apoyo, después el extra), en el orden de inicio
 *   a fin: lista, detalle, extra; o principal, apoyo, extra. Los demás quedan montados y ocultos
 *   (también para la accesibilidad): su estado y lo desplazado se conservan.
 * - **Anchos:** el panel secundario mide 360 (412 desde 1200), el detalle o el principal se queda
 *   con el resto, 24 entre paneles; si no entran, todos se achican por igual (el reparto de Compose).
 * - **Apariencia (kit):** fondo `surface`. Desde 600 de ancho los paneles con superficie (todos menos
 *   la lista, o lo que diga `surface`) son `surface-container-lowest` con radio 28 arriba, 24 por
 *   debajo del borde superior y hasta el de abajo, con 24 al inicio (0 junto al rail) y 16 al final.
 *   En una ventana compacta los paneles van pegados a los bordes, sin superficie.
 * - **Desplazamiento:** cada panel se desplaza por su cuenta; un `TopAppBar` como primer hijo se pega
 *   y colapsa dentro de su panel (ADR-0024).
 * - **Navegación:** un `NavigationSuite` hijo se ubica solo: el rail al inicio (los paneles se pegan
 *   a él) y la barra abajo, a todo el ancho.
 * - **Alto:** el de la ventana (`100dvh`); dentro de otra disposición, darle el alto con `style` o una
 *   clase.
 * - **Zonas seguras** (`env(safe-area-inset-*)`, con `viewport-fit=cover`): arriba de los paneles, a
 *   los costados y abajo (dentro del panel, para que se pueda desplazar hasta el final), salvo donde
 *   ya las toma el `NavigationSuite`.
 *
 * Las props nativas, `ref` y `render` (por ejemplo `render={<div role="presentation" />}`) llegan al
 * `<div>` de la raíz.
 */
export function PaneScaffold({ variant = 'list-detail', current, className, style, children, ...props }: PaneScaffoldProps) {
  const shown = current ?? (variant === 'supporting' ? 'main' : 'list')
  if (isDevelopment()) warnPanesNotInVariant(variant, children)
  return layoutElement(
    'PaneScaffold',
    cx('mk-pane-scaffold', className),
    style,
    { ...props, 'data-variant': variant, 'data-current': shown },
    children,
  )
}

export interface PaneProps extends LayoutElementProps {
  /**
   * Qué panel es: `list`, `detail` o `extra` en lista y detalle; `main`, `supporting` o `extra` en
   * contenido con apoyo. Decide su lugar, su prioridad y su ancho.
   */
  name: PaneName
  /**
   * Si lleva superficie propia (`surface-container-lowest`, radio 28) desde 600 de ancho. Por defecto
   * todos menos `list`, que va sobre el fondo como en el kit (sus elementos traen su fondo). En una
   * ventana compacta ningún panel la lleva.
   */
  surface?: boolean | undefined
  children?: ReactNode
}

/**
 * Un panel del `PaneScaffold`: un `<div>` que se desplaza por su cuenta (o el elemento de `render`:
 * `<main />` para el detalle, `<nav aria-label="…" />` o `<section aria-label="…" />` para la lista).
 * Va como hijo directo del scaffold, en el orden de inicio a fin (lista, detalle, extra), que es
 * también el orden de lectura y de Tab.
 *
 * Su primer hijo puede ser un `TopAppBar`: se pega arriba del panel y colapsa con lo que se desplaza
 * adentro. Las props nativas, `ref` y `render` llegan al elemento.
 */
export function Pane({ name, surface = name !== 'list', className, style, children, ...props }: PaneProps) {
  return layoutElement(
    'Pane',
    cx('mk-pane', className),
    style,
    { ...props, 'data-pane': name, 'data-surface': surface ? '' : undefined },
    children,
  )
}

/** Los `Pane` entre los hijos: directos, en arrays y en fragmentos. */
function panesIn(children: ReactNode): PaneName[] {
  const names: PaneName[] = []
  for (const child of Children.toArray(children)) {
    if (!isValidElement<{ children?: ReactNode; name?: PaneName }>(child)) continue
    if (child.type === Pane && child.props.name) names.push(child.props.name)
    else if (child.type === Fragment) names.push(...panesIn(child.props.children))
  }
  return names
}

/**
 * En desarrollo, avisa una vez si un `Pane` tiene un nombre de otro caso (`main` en lista y detalle):
 * nunca se mostraría. Mira los hijos directos, en arrays y en fragmentos; no ve los paneles que
 * dibuja otro componente.
 */
function warnPanesNotInVariant(variant: PaneScaffoldVariant, children: ReactNode) {
  const valid = PANES[variant]
  for (const name of panesIn(children)) {
    if (valid.includes(name)) continue
    mkWarn(
      'MK_PANE_NOT_IN_VARIANT',
      {
        component: 'PaneScaffold',
        problem: `has a <Pane name="${name}">, which is not a pane of variant="${variant}" and is never shown`,
        fix: `use one of ${valid.map((n) => `"${n}"`).join(', ')}, or set variant="${variant === 'list-detail' ? 'supporting' : 'list-detail'}"`,
      },
      { name, variant, valid },
    )
  }
}
