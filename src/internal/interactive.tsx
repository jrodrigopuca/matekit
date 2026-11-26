// Módulo interno universal (ADR-0003): sin estado, efectos, contexto ni eventos. No se exporta
// desde src/index.ts. La elección del elemento (`<a>`, `<button>` o el de `render`, ADR-0010) es
// pública y vive en el átomo `Interactive` (src/atoms/Interactive/, ADR-0020). Acá queda lo que
// los componentes comparten alrededor de él y no es API pública: `cx`, el chequeo de `render` con
// el nombre del componente y los tipos de botón que también puede ser enlace (Button, IconButton).

import { isValidElement, type ReactElement } from 'react'
import type {
  ButtonElementProps,
  LinkElementProps,
  RenderedProps,
  RenderElementProps,
} from '../atoms/Interactive/Interactive.tsx'

export const cx = (base: string, extra: string | undefined) => (extra ? `${base} ${extra}` : base)

/**
 * Lanza el error de `render` inválido con el nombre del componente que lo recibió. `Interactive`
 * lo llama con su propio nombre; un componente que dibuja un `<Interactive>` lo llama antes con
 * el suyo (`assertRenderElement('Fab', rest.render)`), para que el mensaje nombre lo que escribió
 * quien lo usa. Con `render` sin definir no hace nada.
 */
export function assertRenderElement(
  name: string,
  render: unknown,
): asserts render is ReactElement<RenderedProps> | undefined {
  if (render !== undefined && !isValidElement(render)) {
    throw new Error(`${name} espera en \`render\` un elemento, por ejemplo render={<Link href="/" />}.`)
  }
}

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
