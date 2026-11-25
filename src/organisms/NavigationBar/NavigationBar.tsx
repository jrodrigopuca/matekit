// Organismo universal (ADR-0003): sin estado, efectos, contexto ni eventos; no lleva 'use client'.
// El elemento activo lo indica la aplicación (`active`); el componente no lee la URL. Los estados
// (hover, foco, presionado, activo) y la animación del indicador son CSS. Contiene la onda
// (Ripple), que es un átomo cliente: un componente universal puede renderizar uno cliente, así
// que la barra sigue sirviendo desde un Server Component (como IconButton).
//
// Partes y no props de contenido (ADR-0002), con el mismo criterio que MenuItemLeading:
// - NavigationBarItemIcon y NavigationBarItemLabel. El icono y la etiqueta van en cajas distintas
//   (el icono dentro del indicador, la etiqueta debajo o al lado) y la disposición cambia por
//   barra; con partes, el CSS ubica cada una en su celda de la grilla del elemento sin depender
//   del orden en que se escriban ni de qué librería de iconos se use. La etiqueta, además,
//   recorta con puntos suspensivos, y eso solo funciona sobre un elemento propio.
// - El icono activo (relleno en el kit) lo elige la aplicación con el mismo booleano que pasa a
//   `active`: `<StarIcon filled={active} />`. No hay dos iconos montados ni una función hija:
//   funciona con cualquier icono (otro componente, una fuente con eje FILL) y desde un Server
//   Component sin pasar funciones.
// - La insignia (Badge) es hija directa del elemento: el CSS la ubica sobre la esquina del icono,
//   y su texto oculto queda después de la etiqueta en el nombre accesible ("Correo 3
//   notificaciones nuevas").
//
// Enlaces y enrutadores (ADR-0010): con `href`, un `<a>`; sin `href`, un `<button>`; con
// `render={<Link href="/" />}`, el elemento que se pase, clonado con las clases, `aria-current`
// y las partes como hijos. Así sirve el `Link` de Next.js o el de React Router sin depender de
// ninguno. cloneElement e isValidElement también existen en la versión de React para Server
// Components (react.react-server.js), así que esto corre en el servidor.

import {
  cloneElement,
  isValidElement,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { FocusRing } from '../../atoms/FocusRing/FocusRing.tsx'
import { Ripple } from '../../atoms/Ripple/Ripple.tsx'
import { StateLayer } from '../../atoms/StateLayer/StateLayer.tsx'

const cx = (base: string, extra: string | undefined) => (extra ? `${base} ${extra}` : base)

export type NavigationBarLayout = 'vertical' | 'horizontal'

export interface NavigationBarProps extends HTMLAttributes<HTMLElement> {
  /**
   * Disposición de los elementos: `vertical` (icono sobre la etiqueta, para teléfonos en
   * vertical) u `horizontal` (icono junto a la etiqueta, para pantallas medianas). Por defecto
   * `vertical`.
   */
  layout?: NavigationBarLayout | undefined
  /** Referencia al `<nav>`. */
  ref?: Ref<HTMLElement> | undefined
}

/**
 * Barra de navegación de Material 3 Expressive: un `<nav>` de 64 px de alto en
 * `surface-container`, con los elementos repartidos a lo ancho. Suma el margen inferior de la
 * zona segura del sistema (`env(safe-area-inset-bottom)`, con `viewport-fit=cover`).
 *
 * Si la página tiene más de un `<nav>`, conviene darle nombre con `aria-label`.
 *
 * ```tsx
 * <NavigationBar aria-label="Principal">
 *   <NavigationBarItem href="/" active>
 *     <NavigationBarItemIcon><HomeIcon /></NavigationBarItemIcon>
 *     <NavigationBarItemLabel>Inicio</NavigationBarItemLabel>
 *   </NavigationBarItem>
 *   <NavigationBarItem href="/favoritos">
 *     <NavigationBarItemIcon><StarIcon /></NavigationBarItemIcon>
 *     <NavigationBarItemLabel>Favoritos</NavigationBarItemLabel>
 *     <Badge label="3 nuevos">3</Badge>
 *   </NavigationBarItem>
 * </NavigationBar>
 * ```
 */
export function NavigationBar({ layout = 'vertical', className, ...props }: NavigationBarProps) {
  return <nav {...props} className={cx('mk-navigation-bar', className)} data-layout={layout} />
}

interface NavigationBarItemOwnProps {
  /**
   * Destino actual: pone `aria-current="page"` y muestra el indicador. Lo decide la
   * aplicación (por ejemplo, comparando con la ruta actual). Si el elemento que se pasa en
   * `render` ya pone `aria-current` (el `NavLink` de React Router), no hace falta.
   */
  active?: boolean | undefined
  /** Icono (`NavigationBarItemIcon`), etiqueta (`NavigationBarItemLabel`) y, si hace falta, `Badge`. */
  children?: ReactNode
}

/** Props que el elemento recibe al clonarse (las de un `<a>`, más lo que pida el enrutador). */
type RenderedProps = {
  className?: string | ((...args: never[]) => string | undefined) | undefined
  children?: ReactNode
  ref?: Ref<HTMLElement> | undefined
}

export interface NavigationBarItemLinkProps
  extends NavigationBarItemOwnProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> {
  /** Con `href`, el elemento es un `<a>`. */
  href: string
  render?: undefined
  /** Referencia al `<a>`. */
  ref?: Ref<HTMLAnchorElement> | undefined
}

export interface NavigationBarItemButtonProps
  extends NavigationBarItemOwnProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Sin `href`, el elemento es un `<button type="button">`. */
  href?: undefined
  render?: undefined
  /** Referencia al `<button>`. */
  ref?: Ref<HTMLButtonElement> | undefined
}

export interface NavigationBarItemRenderProps
  extends NavigationBarItemOwnProps,
    Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /**
   * El elemento que se dibuja en lugar del `<a>`: por ejemplo `<Link href="/" />` de Next.js o
   * de React Router. Se clona agregándole las clases (las suyas se conservan), `aria-current`,
   * las demás props del elemento y las partes como hijos; sus propias props ganan. Tiene que
   * pasar `className`, `aria-current`, `ref` y los hijos al `<a>` que dibuja, como hacen esos
   * dos. Sus hijos se reemplazan por los del `NavigationBarItem`.
   */
  render: ReactElement<RenderedProps>
  href?: undefined
  /** Referencia al elemento que dibuje `render`, si ese elemento no trae la suya. */
  ref?: Ref<HTMLElement> | undefined
}

export type NavigationBarItemProps =
  | NavigationBarItemLinkProps
  | NavigationBarItemButtonProps
  | NavigationBarItemRenderProps

/**
 * Destino de la barra. Un `<a>` si recibe `href`, un `<button type="button">` si no, o el
 * elemento de `render` (el `Link` del enrutador). El activo lleva `aria-current="page"`.
 *
 * El nombre accesible sale del contenido: la etiqueta y el `label` de la insignia, en ese
 * orden. El icono es decorativo. Sin etiqueta visible, hace falta `aria-label`.
 *
 * Teclado: el del elemento nativo (Tab recorre; Enter sigue un enlace; Enter y Espacio activan
 * un botón).
 *
 * ```tsx
 * // Next.js (App Router): la barra puede seguir siendo de servidor.
 * <NavigationBarItem active={pathname === '/'} render={<Link href="/" />}>
 *   <NavigationBarItemIcon><HomeIcon /></NavigationBarItemIcon>
 *   <NavigationBarItemLabel>Inicio</NavigationBarItemLabel>
 * </NavigationBarItem>
 * ```
 */
export function NavigationBarItem(props: NavigationBarItemProps) {
  const { active, render, className, children, ...rest } = props
  const base = cx('mk-navigation-bar-item', className)
  const current = active ? { 'aria-current': 'page' as const } : {}
  const content = (
    <>
      <span className="mk-navigation-bar-item-indicator" aria-hidden="true" />
      <StateLayer />
      <Ripple />
      <FocusRing />
      {children}
    </>
  )

  if (render !== undefined) {
    if (!isValidElement(render)) {
      throw new Error('NavigationBarItem espera en `render` un elemento, por ejemplo render={<Link href="/" />}.')
    }
    const own = render.props
    // El NavLink de React Router acepta className como función de su estado: se respeta.
    const ownClass = own.className
    const className =
      typeof ownClass === 'function'
        ? (...args: never[]) => cx(base, ownClass(...args))
        : cx(base, ownClass)
    return cloneElement(render, { ...current, ...rest, ...own, className, children: content } as RenderedProps)
  }

  if (rest.href !== undefined) {
    const anchor = rest as Omit<NavigationBarItemLinkProps, keyof NavigationBarItemOwnProps>
    return (
      <a {...current} {...anchor} className={base}>
        {content}
      </a>
    )
  }

  const button = rest as Omit<NavigationBarItemButtonProps, keyof NavigationBarItemOwnProps>
  return (
    <button type="button" {...current} {...button} className={base}>
      {content}
    </button>
  )
}

export interface NavigationBarItemIconProps extends HTMLAttributes<HTMLSpanElement> {
  ref?: Ref<HTMLSpanElement> | undefined
}

/**
 * Icono del elemento (24 px), dentro del indicador. `on-surface-variant` sin activar y
 * `on-secondary-container` activo. Para el icono relleno del activo, pasarle el mismo booleano
 * que a `active`: `<StarIcon filled={active} />`. Es decorativo (oculto para lectores de
 * pantalla).
 */
export function NavigationBarItemIcon({ className, ...props }: NavigationBarItemIconProps) {
  return <span aria-hidden="true" {...props} className={cx('mk-navigation-bar-item-icon', className)} />
}

export interface NavigationBarItemLabelProps extends HTMLAttributes<HTMLSpanElement> {
  ref?: Ref<HTMLSpanElement> | undefined
}

/**
 * Etiqueta del elemento (Label Medium), en una sola línea; si no entra, se recorta con puntos
 * suspensivos. `on-surface-variant` sin activar; activa, `secondary` debajo del indicador
 * (vertical) u `on-secondary-container` dentro de él (horizontal).
 */
export function NavigationBarItemLabel({ className, ...props }: NavigationBarItemLabelProps) {
  return <span {...props} className={cx('mk-navigation-bar-item-label', className)} />
}
