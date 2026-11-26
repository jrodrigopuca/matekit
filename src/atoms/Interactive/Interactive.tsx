// Átomo universal (ADR-0003): sin estado, efectos, contexto ni eventos; no lleva 'use client'.
// Elige el elemento interactivo según ADR-0010 y ADR-0020: con `href` un `<a>`, sin `href` un
// `<button type="button">`, con `render` el elemento que se pase. Es la única fuente de esa lógica:
// la usan Button, IconButton, los FAB, los destinos de NavigationBar y NavigationRail
// (src/internal/navigation-item.tsx), CardPrimaryAction, ListItemAction y los chips de una acción
// (src/molecules/Chip/chip-element.tsx), y quien arme un control propio con StateLayer, FocusRing
// y Ripple. No trae estilos, átomos, estado activo ni reglas de deshabilitado: eso es de cada
// componente.
//
// cloneElement e isValidElement también existen en la versión de React para Server Components
// (react.react-server.js), así que esto corre en el servidor.

import {
  cloneElement,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { assertRenderElement } from '../../internal/interactive.tsx'

/** Props que el elemento de `render` recibe al clonarse (las de un `<a>`, más lo que pida el enrutador). */
export type RenderedProps = {
  className?: string | ((...args: never[]) => string | undefined) | undefined
  children?: ReactNode
  ref?: Ref<HTMLElement> | undefined
}

/** Con `href`, el elemento es un `<a>`. */
export type LinkElementProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> & {
  href: string
  render?: undefined
  /** Referencia al `<a>`. */
  ref?: Ref<HTMLAnchorElement> | undefined
}

/** Sin `href`, el elemento es un `<button type="button">`. */
export type ButtonElementProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  href?: undefined
  render?: undefined
  /** Referencia al `<button>`. */
  ref?: Ref<HTMLButtonElement> | undefined
}

/** Con `render`, el elemento que se pase (el `Link` del enrutador). */
export type RenderElementProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  /**
   * El elemento que se dibuja en lugar del `<a>`: por ejemplo `<Link href="/" />` de Next.js o
   * de React Router. Se clona agregándole las clases (las suyas se conservan), las demás props
   * y el contenido como hijos; sus propias props ganan. Tiene que pasar `className`, `aria-*`,
   * `ref` y los hijos al `<a>` que dibuja, como hacen esos dos. Sus hijos se reemplazan.
   */
  render: ReactElement<RenderedProps>
  href?: undefined
  /** Referencia al elemento que dibuje `render`, si ese elemento no trae la suya. */
  ref?: Ref<HTMLElement> | undefined
}

/**
 * Props de `Interactive`: una de tres formas, más `className` y el contenido.
 * - Con `href`: un `<a>` con sus atributos (`target`, `download`…) y `ref` al `<a>`.
 * - Sin `href` ni `render`: un `<button>` con sus atributos (`disabled`, `type`…) y `ref` al
 *   `<button>`. `type` es `"button"` salvo que se pase otro.
 * - Con `render`: el elemento que se pase, clonado (ver `render`).
 * `href` y `render` no van juntos.
 */
export type InteractiveProps = (LinkElementProps | ButtonElementProps | RenderElementProps) & {
  /** Contenido del elemento (los átomos y el texto o los iconos del control). */
  children?: ReactNode
}

/** Une dos listas de clases; sin ninguna, `undefined` (el elemento queda sin `class`). */
const joinClasses = (a: string | undefined, b: string | undefined) => (a && b ? `${a} ${b}` : a || b || undefined)

/**
 * El elemento interactivo de un control: un `<a>`, un `<button>` o el elemento de `render`. Sirve
 * de base para controles propios que se comporten como los de matekit: los átomos `StateLayer`,
 * `Ripple` y `FocusRing` van como hijos y se activan solos con las pseudo-clases del elemento
 * (`:hover`, `:focus-visible`, `:active`, `:disabled`). No agrega estilos ni átomos, ni estado
 * activo o deshabilitado: eso lo decide el control. El CSS del control pone forma y color, y
 * `outline: none` (el anillo lo dibuja `FocusRing`; si no, el navegador suma el suyo).
 *
 * **Las tres formas** (ADR-0010, ADR-0020):
 * - Con `href`, un `<a href>` real: se abre en otra pestaña, se copia, el lector lo anuncia como
 *   enlace.
 * - Sin `href` ni `render`, un `<button type="button">` (no envía formularios; `type="submit"` sí,
 *   si se pasa). `type={undefined}` también queda en `"button"`.
 * - Con `render`, el elemento que se pase, por ejemplo el `Link` de Next.js o de React Router,
 *   para navegar sin recargar. `href` y `render` no van juntos (los tipos lo rechazan).
 *
 * **Contrato de `render`** (API pública):
 * - Recibe un **elemento** (`render={<Link href="/" />}`), no un componente (`render={Link}`):
 *   con otra cosa, lanza un error que lo explica.
 * - Se clona con `cloneElement`. Recibe las demás props de `Interactive` (atributos, `aria-*`,
 *   `data-*`, eventos, `ref`) y **sus propias props ganan**, incluida su `ref`: si los dos traen
 *   una, llega la del elemento (no se combinan, para no usar hooks en un átomo universal).
 * - Las clases **se combinan**: las de `Interactive` primero, después las del elemento. Si la
 *   `className` del elemento es una función de su estado (el `NavLink` de React Router), se
 *   envuelve: la función recibe lo mismo y su resultado se suma a las clases de `Interactive`.
 * - **Sus hijos se reemplazan** por los de `Interactive`, sin aviso.
 * - El elemento tiene que pasar `className`, `aria-*`, `ref` y los hijos al `<a>` (o lo que
 *   dibuje), como hacen el `Link` de Next.js y el de React Router; si no, matekit no lo detecta.
 *
 * ```tsx
 * // Un control propio: .mi-control define forma, color y `outline: none`; los átomos, los estados.
 * function MiControl({ className, children, ...props }: InteractiveProps) {
 *   return (
 *     <Interactive {...props} className={['mi-control', className].filter(Boolean).join(' ')}>
 *       <StateLayer />
 *       <Ripple />
 *       <FocusRing />
 *       {children}
 *     </Interactive>
 *   )
 * }
 *
 * <MiControl href="/ayuda">Ayuda</MiControl>                       // <a href="/ayuda">
 * <MiControl onClick={guardar}>Guardar</MiControl>                 // <button type="button">
 * <MiControl render={<Link href="/pedidos" />}>Pedidos</MiControl> // el <a> del Link de Next.js
 * <MiControl render={<NavLink to="/pedidos" className={({ isActive }) => (isActive ? 'on' : '')} />}>
 *   Pedidos
 * </MiControl>                                                     // NavLink de React Router
 * ```
 */
export function Interactive(props: InteractiveProps): ReactElement {
  const { render, className, children, ...rest } = props
  if (render !== undefined) {
    assertRenderElement('Interactive', render)
    const own = render.props
    // El NavLink de React Router acepta className como función de su estado: se respeta.
    const ownClass = own.className
    const merged =
      typeof ownClass === 'function'
        ? (...args: never[]) => joinClasses(className, ownClass(...args))
        : joinClasses(className, ownClass)
    return cloneElement(render, { ...rest, ...own, className: merged, children } as RenderedProps)
  }

  if (rest.href !== undefined) {
    const anchor = rest as Omit<LinkElementProps, 'render' | 'className'>
    return (
      <a {...anchor} className={className}>
        {children}
      </a>
    )
  }

  const button = rest as Omit<ButtonElementProps, 'render' | 'className'>
  // `type` explícitamente undefined también queda en "button" (si no, React lo omitiría y el
  // botón enviaría el formulario).
  return (
    <button {...button} type={button.type ?? 'button'} className={className}>
      {children}
    </button>
  )
}
