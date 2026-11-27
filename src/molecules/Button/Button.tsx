// Molécula universal (ADR-0003): sin estado, efectos ni contexto; no lleva 'use client'.
// Forma, tamaños, colores y estados (incluido el cambio de forma al presionar) son CSS.
// Contiene la onda (Ripple), que es un átomo cliente: un componente universal puede
// renderizar uno cliente, así que Button sigue sirviendo desde un Server Component.
//
// Enlaces y enrutadores (ADR-0010): con `href`, un `<a>`; con `render={<Link href="/" />}`, el
// elemento que se pase; sin ninguno de los dos, un `<button type="button">`. La elección es la de
// del átomo Interactive (la misma que los FAB y la navegación). Un botón que navega ("Ver
// detalle") es un enlace: abre en otra pestaña, se copia, lo anuncia como enlace el lector.
// En modo enlace los tipos rechazan `selected` (un enlace no es un toggle) y `disabled` /
// `aria-disabled` (ARIA in HTML indica quitar el `href` para un enlace no disponible: acá,
// pasar a la forma `<button disabled>`). Ver LinkModeExclusions.

import type { ReactNode } from 'react'
import { FocusRing } from '../../atoms/FocusRing/FocusRing.tsx'
import { Ripple } from '../../atoms/Ripple/Ripple.tsx'
import { StateLayer } from '../../atoms/StateLayer/StateLayer.tsx'
import { Interactive } from '../../atoms/Interactive/Interactive.tsx'
import { assertRenderElement, cx, type ToggleButtonOrLinkProps } from '../../internal/interactive.tsx'

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'elevated' | 'text'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type ButtonShape = 'round' | 'square'

interface ButtonOwnProps {
  /** Estilo de color. Por defecto `filled`. */
  variant?: ButtonVariant | undefined
  /** Tamaño de Material 3 Expressive: 32, 40, 56, 96 o 136 px de alto. Por defecto `sm`. */
  size?: ButtonSize | undefined
  /** Forma en reposo. Al presionar, y al seleccionar un toggle, pasa a una forma cuadrada. */
  shape?: ButtonShape | undefined
  /** Iconos y texto. */
  children?: ReactNode
}

/**
 * Props del Button: las propias más una de tres formas (ADR-0010).
 * - Sin `href` ni `render`: un `<button type="button">` con sus atributos nativos, `ref` al
 *   `<button>`, `disabled` y `selected`, que lo convierte en un toggle (`aria-pressed`; sin
 *   definir, es un botón común; el estilo `text` no tiene versión toggle en Material 3).
 * - Con `href`: un `<a>` con sus atributos (`target`, `download`…) y `ref` al `<a>`.
 * - Con `render`: el `Link` del enrutador.
 * Las dos formas de enlace no aceptan `selected`, `disabled` ni `aria-disabled`.
 */
export type ButtonProps = ToggleButtonOrLinkProps<ButtonOwnProps>

/**
 * Botón de Material 3 Expressive.
 *
 * Los iconos se pasan como hijos, sin propiedades especiales: el CSS les da el tamaño del
 * botón y la separación. Con `href` o `render` es un enlace que se ve igual.
 *
 * Personalización con variables CSS (se heredan; las define la Toolbar para sus botones):
 * `--mk-button-unselected-container`, `--mk-button-unselected-color`,
 * `--mk-button-selected-container` y `--mk-button-selected-color` cambian los colores del toggle
 * del estilo `filled` (el de por defecto) sin seleccionar y seleccionado. Deshabilitado conserva
 * los suyos.
 *
 * ```tsx
 * <Button>Guardar</Button>
 * <Button variant="tonal" size="md"><svg …/>Crear</Button>
 * <Button variant="outlined" selected={on} onClick={() => setOn(!on)}>Favorito</Button>
 * <Button variant="text" href="/pedidos/42">Ver detalle</Button>
 * <Button render={<Link href="/pedidos/42" />}>Ver detalle</Button>
 * ```
 */
export function Button(props: ButtonProps) {
  const { variant = 'filled', size = 'sm', shape = 'round', selected, className, children, ...rest } = props
  assertRenderElement('Button', rest.render)
  return (
    <Interactive
      // Antes de las props del uso: un aria-pressed propio gana, como antes.
      {...(selected === undefined ? {} : { 'aria-pressed': selected })}
      {...rest}
      data-variant={variant}
      data-size={size}
      data-shape={shape}
      className={cx('mk-button', className)}
    >
      <StateLayer />
      <Ripple />
      <FocusRing />
      {children}
    </Interactive>
  )
}
