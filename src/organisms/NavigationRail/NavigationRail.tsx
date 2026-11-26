// Organismo universal (ADR-0003): sin estado, efectos, contexto ni eventos; no lleva 'use client'.
// Si está contraído o expandido lo decide la aplicación (`expanded`); el componente no lee la URL
// ni el tamaño de la ventana. La transición entre los dos estados, los estados de los destinos y
// la alineación son CSS. Contiene la onda (Ripple), un átomo cliente que un componente universal
// puede renderizar (como NavigationBar), así que sirve desde un Server Component.
//
// Partes (ADR-0002), con nombres planos:
// - NavigationRailHeader: el bloque superior. La aplicación pone ahí su IconButton de menú y su
//   Fab o ExtendedFab (o un logo); el rail solo lo ubica (arriba, con 40 de separación) y lo deja
//   fuera del centrado en la alineación `middle`.
// - NavigationRailItem, NavigationRailItemIcon y NavigationRailItemLabel: las mismas partes que
//   la NavigationBar. El destino comparte la base con NavigationBarItem
//   (src/internal/navigation-item.tsx: `<a>`, `<button>` o `render` según ADR-0010,
//   `aria-current`, indicador y átomos) y la base de CSS (navigation-bar.css, reglas con
//   :is(.mk-navigation-bar-item, .mk-navigation-rail-item)). Las partes tienen nombre y clase
//   propios para que cada componente se lea completo (`NavigationRailItemIcon` dentro de
//   `NavigationRailItem`) y que un estilo propio sobre el rail no toque la barra.
// - Sin un contenedor de destinos: los NavigationRailItem son hijos directos del rail, como en la
//   barra. La alineación `middle` se resuelve con CSS sin envolverlos.
//
// El `expanded` del rail no controla el ExtendedFab del bloque superior: la aplicación le pasa el
// mismo booleano (`<ExtendedFab expanded={expanded}>`). Así el FAB sigue siendo un componente
// independiente (con su propio resorte de Compose para expandir y contraer) y no hace falta que
// el rail conozca a sus hijos ni que fab.css dependa del rail.

import type { HTMLAttributes, Ref } from 'react'
import type {
  ButtonElementProps,
  LinkElementProps,
  RenderElementProps,
} from '../../atoms/Interactive/Interactive.tsx'
import { cx } from '../../internal/interactive.tsx'
import { navigationItem, type NavigationItemOwnProps } from '../../internal/navigation-item.tsx'

export type NavigationRailVariant = 'docked' | 'floating'
export type NavigationRailAlign = 'top' | 'middle'
export type NavigationRailCollapsedLabels = 'visible' | 'hidden'

export interface NavigationRailProps extends HTMLAttributes<HTMLElement> {
  /**
   * Expandido (220 px de ancho, destinos con el icono junto a la etiqueta) o contraído (96 px,
   * icono sobre la etiqueta). Lo controla la aplicación; el cambio se anima con el resorte
   * espacial por defecto. Por defecto `false`.
   */
  expanded?: boolean | undefined
  /**
   * `docked` (por defecto): sin fondo, pegado al borde. `floating`: expandido, fondo
   * `surface-container` con radio 16. Contraído, los dos se ven igual (el kit no tiene un rail
   * contraído flotante).
   */
  variant?: NavigationRailVariant | undefined
  /**
   * `top` (por defecto): los destinos van debajo del bloque superior. `middle`: los destinos se
   * centran en el alto total del rail y el bloque superior queda arriba; si no hay lugar, los
   * destinos bajan para no tapar el bloque.
   */
  align?: NavigationRailAlign | undefined
  /**
   * Etiquetas de los destinos con el rail contraído: `visible` (por defecto) u `hidden`
   * (indicador de 56 × 56 con solo el icono, "Show label" del kit). Ocultas, siguen siendo el
   * nombre accesible de cada destino. Expandido, siempre se ven.
   */
  collapsedLabels?: NavigationRailCollapsedLabels | undefined
  /** Referencia al `<nav>`. */
  ref?: Ref<HTMLElement> | undefined
}

/**
 * Riel de navegación (navigation rail) de Material 3 Expressive: un `<nav>` vertical para
 * pantallas medianas y grandes, contraído (96 px) o expandido (220 px).
 *
 * **Cuándo usarlo** (clases de tamaño de ventana de Material 3): en una ventana compacta
 * (menos de 600 px de ancho), una NavigationBar abajo; en una mediana (600 a 839 px), el rail
 * contraído; en una expandida (840 px o más), el rail contraído o expandido, según cuánto lugar
 * quiera darle la aplicación. El componente no decide nada de eso ni tiene media queries: la
 * aplicación elige qué dibujar y si `expanded` (por ejemplo con `matchMedia` o con el botón de
 * menú).
 *
 * **Alto y posición:** ocupa el alto de su contenedor (`height: 100%`) y se desplaza si los
 * destinos no entran. La aplicación lo ubica (en una grilla o flex junto al contenido, o fijo
 * con `position: sticky`). El ancho expandido se cambia con la variable
 * `--mk-navigation-rail-expanded-width`, entre 220 y 360 px (mínimo y máximo de Compose).
 *
 * Nombre: si la página tiene más de un `<nav>`, darle nombre con `aria-label`.
 *
 * ```tsx
 * const [expanded, setExpanded] = useState(false)
 *
 * <NavigationRail aria-label="Principal" expanded={expanded} id="rail">
 *   <NavigationRailHeader>
 *     <IconButton
 *       label="Navegación"
 *       aria-expanded={expanded}
 *       aria-controls="rail"
 *       size="md"
 *       shape="square"
 *       onClick={() => setExpanded(!expanded)}
 *     >
 *       {expanded ? <MenuOpenIcon /> : <MenuIcon />}
 *     </IconButton>
 *     <ExtendedFab expanded={expanded}><EditIcon />Redactar</ExtendedFab>
 *   </NavigationRailHeader>
 *   <NavigationRailItem href="/" active>
 *     <NavigationRailItemIcon><HomeIcon filled /></NavigationRailItemIcon>
 *     <NavigationRailItemLabel>Inicio</NavigationRailItemLabel>
 *   </NavigationRailItem>
 *   <NavigationRailItem href="/favoritos">
 *     <NavigationRailItemIcon><StarIcon /></NavigationRailItemIcon>
 *     <NavigationRailItemLabel>Favoritos</NavigationRailItemLabel>
 *     <Badge label="3 nuevos">3</Badge>
 *   </NavigationRailItem>
 * </NavigationRail>
 * ```
 */
export function NavigationRail({
  expanded = false,
  variant = 'docked',
  align = 'top',
  collapsedLabels = 'visible',
  className,
  ...props
}: NavigationRailProps) {
  return (
    <nav
      {...props}
      className={cx('mk-navigation-rail', className)}
      data-expanded={String(expanded)}
      data-variant={variant}
      data-align={align}
      data-collapsed-labels={collapsedLabels}
    />
  )
}

export interface NavigationRailHeaderProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement> | undefined
}

/**
 * Bloque superior del rail: el botón de menú (un `IconButton` de 56, `size="md"
 * shape="square"`) y el `Fab` o `ExtendedFab`, uno debajo del otro con 4 de separación. Lo
 * llena la aplicación: si el botón alterna el rail, que lleve `aria-expanded` (y
 * `aria-controls` con el `id` del rail) y una etiqueta fija ("Navegación"): el estado lo anuncia
 * `aria-expanded`, y cambiar también la etiqueta lo repetiría (WAI-ARIA APG, patrón Disclosure). El `ExtendedFab` recibe el mismo `expanded` que el rail.
 */
export function NavigationRailHeader({ className, ...props }: NavigationRailHeaderProps) {
  return <div {...props} className={cx('mk-navigation-rail-header', className)} />
}

/** Con `href`, el elemento es un `<a>`. */
export type NavigationRailItemLinkProps = NavigationItemOwnProps & LinkElementProps

/** Sin `href`, el elemento es un `<button type="button">`. */
export type NavigationRailItemButtonProps = NavigationItemOwnProps & ButtonElementProps

/**
 * Con `render`, el elemento que se pase (el `Link` del enrutador), clonado con las clases,
 * `aria-current` y las partes como hijos.
 */
export type NavigationRailItemRenderProps = NavigationItemOwnProps & RenderElementProps

export type NavigationRailItemProps =
  | NavigationRailItemLinkProps
  | NavigationRailItemButtonProps
  | NavigationRailItemRenderProps

/**
 * Destino del rail. Un `<a>` si recibe `href`, un `<button type="button">` si no, o el elemento
 * de `render` (el `Link` del enrutador). El activo lleva `aria-current="page"`. Igual que
 * `NavigationBarItem` (comparten el código).
 *
 * Con el rail contraído, el icono va sobre la etiqueta (indicador de 56 × 32); expandido, al lado
 * (indicador de 56 de alto que abraza icono y etiqueta). Una `Badge` pequeña va en la esquina del
 * icono; la grande, sobre el icono en el contraído y después de la etiqueta en el expandido.
 *
 * El nombre accesible sale del contenido: la etiqueta y el `label` de la insignia, en ese
 * orden. Sin etiqueta, hace falta `aria-label`.
 *
 * Teclado: el del elemento nativo (Tab recorre; Enter sigue un enlace; Enter y Espacio activan
 * un botón).
 */
export function NavigationRailItem(props: NavigationRailItemProps) {
  return navigationItem('NavigationRailItem', 'mk-navigation-rail-item', props)
}

export interface NavigationRailItemIconProps extends HTMLAttributes<HTMLSpanElement> {
  ref?: Ref<HTMLSpanElement> | undefined
}

/**
 * Icono del destino (24 px), dentro del indicador. `on-surface-variant` sin activar y
 * `on-secondary-container` activo. Para el icono relleno del activo, pasarle el mismo booleano
 * que a `active`: `<StarIcon filled={active} />`. Es decorativo (oculto para lectores de
 * pantalla). Expandido, puede omitirse (destino solo con etiqueta, "Show icon" del kit).
 */
export function NavigationRailItemIcon({ className, ...props }: NavigationRailItemIconProps) {
  return <span aria-hidden="true" {...props} className={cx('mk-navigation-rail-item-icon', className)} />
}

export interface NavigationRailItemLabelProps extends HTMLAttributes<HTMLSpanElement> {
  ref?: Ref<HTMLSpanElement> | undefined
}

/**
 * Etiqueta del destino, en una sola línea, recortada con puntos suspensivos si no entra.
 * Contraído: Label Medium debajo del indicador, `secondary` activa. Expandido: Label Large al
 * lado del icono, `on-secondary-container` activa. `on-surface-variant` sin activar.
 */
export function NavigationRailItemLabel({ className, ...props }: NavigationRailItemLabelProps) {
  return <span {...props} className={cx('mk-navigation-rail-item-label', className)} />
}
