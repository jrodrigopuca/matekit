// Módulo interno universal (ADR-0003): sin estado, efectos, contexto ni eventos. No se exporta
// desde src/index.ts; lo usan los componentes que dibujan un `<a>`, un `<button>` o el elemento
// de `render` (ADR-0010): los destinos de NavigationBar y NavigationRail (por
// src/internal/navigation-item.tsx), los FAB, Button e IconButton.
//
// cloneElement e isValidElement también existen en la versión de React para Server Components
// (react.react-server.js), así que esto corre en el servidor.

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

export const cx = (base: string, extra: string | undefined) => (extra ? `${base} ${extra}` : base)

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
   * del componente y su contenido como hijos; sus propias props ganan. Tiene que pasar
   * `className`, `aria-*`, `ref` y los hijos al `<a>` que dibuja, como hacen esos dos. Sus
   * hijos se reemplazan por los del componente.
   */
  render: ReactElement<RenderedProps>
  href?: undefined
  /** Referencia al elemento que dibuje `render`, si ese elemento no trae la suya. */
  ref?: Ref<HTMLElement> | undefined
}

export type InteractiveElementProps = LinkElementProps | ButtonElementProps | RenderElementProps

/**
 * Lo que solo tiene sentido en la forma `<button>` y los tipos rechazan en un enlace:
 * - `selected` (toggle, `aria-pressed`): un enlace navega, no se activa y desactiva.
 * - `disabled` y `aria-disabled`: un `<a>` no tiene `disabled`, y ARIA in HTML desaconseja
 *   `aria-disabled="true"` en un `<a href>` (el enlace sigue funcionando); para anunciar un
 *   destino no disponible, indica quitar el `href`. Acá eso es la forma `<button disabled>`.
 */
export interface LinkModeExclusions {
  selected?: never
  disabled?: never
  'aria-disabled'?: never
  'aria-pressed'?: never
}

/**
 * Props de un botón que también puede ser enlace (Button, IconButton): las propias (`Own`) más
 * una de las tres formas de ADR-0010. Solo la forma `<button>` acepta `selected` y `disabled`.
 */
export type ToggleButtonOrLinkProps<Own> =
  | (Own & { selected?: boolean | undefined } & Omit<ButtonElementProps, keyof Own | 'selected'>)
  | (Own & LinkModeExclusions & Omit<LinkElementProps, keyof Own | keyof LinkModeExclusions>)
  | (Own & LinkModeExclusions & Omit<RenderElementProps, keyof Own | keyof LinkModeExclusions>)

/**
 * Dibuja el elemento interactivo de un componente según ADR-0010: el de `render` clonado, un
 * `<a>` si hay `href`, o un `<button type="button">`.
 *
 * @param name nombre del componente, para el mensaje de error.
 * @param className clases del componente (ya combinadas con la `className` de quien lo usa).
 * @param props el resto de las props del componente (incluidas `render`, `href` y `ref`), más
 *   los atributos que agregue el componente (`aria-current`, `aria-label`…), que ganan sobre
 *   las del uso salvo que el componente los ponga antes.
 * @param children contenido del elemento (átomos y partes).
 */
export function interactiveElement(
  name: string,
  className: string,
  props: InteractiveElementProps,
  children: ReactNode,
): ReactElement {
  const { render, ...rest } = props
  if (render !== undefined) {
    if (!isValidElement(render)) {
      throw new Error(`${name} espera en \`render\` un elemento, por ejemplo render={<Link href="/" />}.`)
    }
    const own = render.props
    // El NavLink de React Router acepta className como función de su estado: se respeta.
    const ownClass = own.className
    const merged =
      typeof ownClass === 'function' ? (...args: never[]) => cx(className, ownClass(...args)) : cx(className, ownClass)
    return cloneElement(render, { ...rest, ...own, className: merged, children } as RenderedProps)
  }

  if (rest.href !== undefined) {
    const anchor = rest as Omit<LinkElementProps, 'render'>
    return (
      <a {...anchor} className={className}>
        {children}
      </a>
    )
  }

  const button = rest as Omit<ButtonElementProps, 'render'>
  // `type` explícitamente undefined también queda en "button" (si no, React lo omitiría y el
  // botón enviaría el formulario).
  return (
    <button {...button} type={button.type ?? 'button'} className={className}>
      {children}
    </button>
  )
}
