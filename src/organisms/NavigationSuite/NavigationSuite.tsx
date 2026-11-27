// Organismo universal (ADR-0003): sin estado, efectos, contexto ni eventos; no lleva 'use client'.
// Elige entre barra y rail con media queries (navigation-suite.css), no con JavaScript: el mismo
// HTML sirve en el servidor y en el cliente, y no hay salto al hidratar (ADR-0029).
//
// Una sola estructura: un <nav> con destinos que son los de la NavigationBar (la base compartida
// de src/internal/navigation-item.tsx con la clase `mk-navigation-bar-item`, más
// `mk-navigation-suite-item`). Se puede porque el destino del rail contraído es, en el kit y en
// Compose, el destino vertical de la barra en una columna de 96 (indicador 56 × 32, etiqueta
// debajo, 64 de alto). Lo que cambia por ventana es el contenedor (fila abajo o columna al inicio)
// y, en la barra con alto compact, la disposición horizontal de los destinos. Las pruebas comparan
// cada presentación con una NavigationBar y un NavigationRail reales.
//
// Partes (ADR-0002): NavigationSuiteHeader (el bloque superior del rail; en la barra no se
// muestra), NavigationSuiteItem, NavigationSuiteItemIcon y NavigationSuiteItemLabel, con los mismos
// contratos que las de NavigationBar (enlace, botón o `render`, ADR-0010 y ADR-0020; `active` con
// `aria-current="page"`; `Badge` como hija).

import type { HTMLAttributes, Ref } from 'react'
import type {
  ButtonElementProps,
  LinkElementProps,
  RenderElementProps,
} from '../../atoms/Interactive/Interactive.tsx'
import { cx } from '../../internal/interactive.tsx'
import { navigationItem, type NavigationItemOwnProps } from '../../internal/navigation-item.tsx'

/**
 * Qué presentación usa. `auto` (por defecto) la elige la ventana, con la regla de Compose
 * (`NavigationSuiteScaffoldDefaults.navigationSuiteType`):
 * - ancho compact (menos de 600 px, `WINDOW_WIDTH.medium`): barra con destinos verticales;
 * - si no, alto compact (menos de 480 px, `WINDOW_HEIGHT.medium`; un teléfono acostado): barra con
 *   destinos horizontales;
 * - si no: rail contraído (también desde 1200 px: matekit, como Compose, no expande el rail solo).
 *
 * `bar` fija la barra (destinos verticales en ancho compact, horizontales desde 600) y `rail`, el
 * rail contraído, en cualquier ventana.
 */
export type NavigationSuiteLayout = 'auto' | 'bar' | 'rail'

export interface NavigationSuiteProps extends HTMLAttributes<HTMLElement> {
  /** Presentación: `auto` (por defecto, por la ventana), `bar` o `rail`. Ver `NavigationSuiteLayout`. */
  layout?: NavigationSuiteLayout | undefined
  /** Referencia al `<nav>`. */
  ref?: Ref<HTMLElement> | undefined
}

/**
 * Navegación adaptable: los destinos se escriben una vez y se presentan como `NavigationBar` o como
 * `NavigationRail` contraído según la ventana, como `NavigationSuiteScaffold` de Compose. Para
 * elegir a mano, usar `NavigationBar` y `NavigationRail` directamente.
 *
 * ```tsx
 * <NavigationSuite aria-label="Principal">
 *   <NavigationSuiteHeader>
 *     <Fab label="Redactar"><EditIcon /></Fab>
 *   </NavigationSuiteHeader>
 *   <NavigationSuiteItem href="/" active>
 *     <NavigationSuiteItemIcon><HomeIcon filled /></NavigationSuiteItemIcon>
 *     <NavigationSuiteItemLabel>Inicio</NavigationSuiteItemLabel>
 *   </NavigationSuiteItem>
 *   …
 * </NavigationSuite>
 * ```
 *
 * - **Sin JavaScript:** la elección es CSS (media queries con los cortes de `WINDOW_WIDTH` y
 *   `WINDOW_HEIGHT`), así que sirve desde un Server Component y no cambia al hidratar.
 * - **Barra:** 64 de alto en `surface-container`, destinos repartidos, zona segura abajo y a los
 *   costados. **Rail:** 96 de ancho, sin fondo, alto de su contenedor (se desplaza si no entra),
 *   44 arriba y 56 abajo, 4 entre destinos, zona segura arriba, abajo y al inicio.
 * - **Ubicación:** la aplicación la pone en su disposición (abajo para la barra, al inicio para el
 *   rail) con las mismas media queries; ver la página del playground.
 * - **Rail expandido:** no hay. Para expandir, el botón de menú del bloque superior abre un
 *   `ModalNavigationRail` con los mismos destinos (como el `ModalWideNavigationRail` de Compose), o
 *   la aplicación usa `NavigationRail` con `expanded`.
 *
 * Las props nativas y `ref` llegan al `<nav>`. Si la página tiene más de un `<nav>`, darle nombre con
 * `aria-label`.
 */
export function NavigationSuite({ layout = 'auto', className, ...props }: NavigationSuiteProps) {
  return <nav {...props} className={cx('mk-navigation-suite', className)} data-layout={layout} />
}

export interface NavigationSuiteHeaderProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement> | undefined
}

/**
 * Bloque superior del rail (el `primaryActionContent` de Compose): el botón de menú y el `Fab`, uno
 * debajo del otro con 4 de separación y 40 hasta los destinos, como `NavigationRailHeader`. En la
 * barra no se muestra (Compose tampoco lo pone en la barra): si la acción tiene que estar siempre,
 * la aplicación la ubica también fuera de la barra.
 */
export function NavigationSuiteHeader({ className, ...props }: NavigationSuiteHeaderProps) {
  return <div {...props} className={cx('mk-navigation-rail-header mk-navigation-suite-header', className)} />
}

/** Con `href`, el elemento es un `<a>`. */
export type NavigationSuiteItemLinkProps = NavigationItemOwnProps & LinkElementProps

/** Sin `href`, el elemento es un `<button type="button">`. */
export type NavigationSuiteItemButtonProps = NavigationItemOwnProps & ButtonElementProps

/**
 * Con `render`, el elemento que se pase (el `Link` del enrutador), clonado con las clases,
 * `aria-current` y las partes como hijos.
 */
export type NavigationSuiteItemRenderProps = NavigationItemOwnProps & RenderElementProps

export type NavigationSuiteItemProps =
  | NavigationSuiteItemLinkProps
  | NavigationSuiteItemButtonProps
  | NavigationSuiteItemRenderProps

/**
 * Destino. Un `<a>` si recibe `href`, un `<button type="button">` si no, o el elemento de `render`
 * (el `Link` del enrutador). El activo lleva `aria-current="page"`. Es el destino de la
 * `NavigationBar` (comparten el código y el CSS): icono sobre la etiqueta en la barra de un teléfono
 * y en el rail, al lado en la barra de una ventana baja.
 *
 * El nombre accesible sale del contenido (la etiqueta y el `label` de la insignia); sin etiqueta,
 * hace falta `aria-label`.
 */
export function NavigationSuiteItem(props: NavigationSuiteItemProps) {
  return navigationItem('NavigationSuiteItem', 'mk-navigation-bar-item', {
    ...props,
    className: cx('mk-navigation-suite-item', props.className),
  })
}

export interface NavigationSuiteItemIconProps extends HTMLAttributes<HTMLSpanElement> {
  ref?: Ref<HTMLSpanElement> | undefined
}

/**
 * Icono del destino (24 px), dentro del indicador; decorativo. Para el icono relleno del activo,
 * pasarle el mismo booleano que a `active`: `<StarIcon filled={active} />`.
 */
export function NavigationSuiteItemIcon({ className, ...props }: NavigationSuiteItemIconProps) {
  return (
    <span
      aria-hidden="true"
      {...props}
      className={cx('mk-navigation-bar-item-icon mk-navigation-suite-item-icon', className)}
    />
  )
}

export interface NavigationSuiteItemLabelProps extends HTMLAttributes<HTMLSpanElement> {
  ref?: Ref<HTMLSpanElement> | undefined
}

/** Etiqueta del destino (Label Medium), en una línea, recortada con puntos suspensivos si no entra. */
export function NavigationSuiteItemLabel({ className, ...props }: NavigationSuiteItemLabelProps) {
  return <span {...props} className={cx('mk-navigation-bar-item-label mk-navigation-suite-item-label', className)} />
}
