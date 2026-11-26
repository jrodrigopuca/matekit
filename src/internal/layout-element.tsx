// Módulo interno universal (ADR-0003): sin estado, efectos, contexto ni eventos. No se exporta
// desde src/index.ts. Elige el elemento de las piezas de disposición, Stack y Group (ADR-0017),
// y de TopAppBar (ADR-0024, con <header> en lugar de <div>): un <div> o el elemento de `render` (la misma forma que ADR-0010 para los destinos, pero sin
// enlaces ni botones: acá `render` sirve para dar semántica, como <ul>, <nav> o <fieldset>).

import {
  cloneElement,
  createElement,
  isValidElement,
  type CSSProperties,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { cx } from './interactive.tsx'

/** Props que el elemento de `render` recibe al clonarse. */
export interface LayoutRenderedProps {
  className?: string | undefined
  style?: CSSProperties | undefined
  children?: ReactNode
  ref?: Ref<HTMLElement> | undefined
}

/** Props comunes de Stack y Group: las de cualquier elemento HTML, `ref` y `render`. */
export interface LayoutElementProps extends HTMLAttributes<HTMLElement> {
  /** Referencia al elemento (el `<div>` o el de `render`, si ese no trae la suya). */
  ref?: Ref<HTMLElement> | undefined
  /**
   * El elemento que se dibuja en lugar del `<div>`, para no sumar un `<div>` sin semántica:
   * `render={<ul />}`, `render={<nav aria-label="…" />}`, `render={<fieldset />}`. Se clona
   * agregándole la clase del componente (la suya se conserva), sus atributos de disposición, las
   * demás props y los hijos; sus propias props ganan, y su `style` se combina con el del componente.
   */
  render?: ReactElement<LayoutRenderedProps> | undefined
}

/**
 * Dibuja el elemento de una pieza de disposición.
 *
 * @param name nombre del componente, para el mensaje de error.
 * @param className clases del componente (ya combinadas con la `className` del uso).
 * @param style estilo del componente (ya combinado con el `style` del uso), o undefined.
 * @param props el resto de las props (incluidas `render` y `ref`) y los atributos `data-*` que
 *   agregue el componente.
 * @param tag el elemento sin `render`: `div` (Stack y Group) o `header` (TopAppBar).
 */
export function layoutElement(
  name: string,
  className: string,
  style: CSSProperties | undefined,
  props: Omit<LayoutElementProps, 'className' | 'style'> & Record<`data-${string}`, string | undefined>,
  children: ReactNode,
  tag: 'div' | 'header' = 'div',
): ReactElement {
  const { render, ...rest } = props
  if (render === undefined) {
    return createElement(tag, { ...rest, className, style }, children)
  }
  if (!isValidElement(render)) {
    throw new Error(`${name} espera en \`render\` un elemento, por ejemplo render={<ul />}.`)
  }
  const own = render.props
  const mergedStyle = style || own.style ? { ...style, ...own.style } : undefined
  return cloneElement(render, {
    ...rest,
    ...own,
    className: cx(className, own.className),
    style: mergedStyle,
    children,
  } as LayoutRenderedProps)
}
