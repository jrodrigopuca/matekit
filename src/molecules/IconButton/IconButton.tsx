// Molécula universal (ADR-0003): sin estado, efectos ni contexto; no lleva 'use client'.
// Forma, tamaños, anchos, colores y estados (incluido el cambio de forma al presionar) son CSS.
// Contiene la onda (Ripple), que es un átomo cliente: un componente universal puede
// renderizar uno cliente, así que IconButton sigue sirviendo desde un Server Component.
//
// Enlaces y enrutadores (ADR-0010), como Button: con `href`, un `<a>`; con
// `render={<Link href="/" />}`, el elemento que se pase; sin ninguno, un `<button type="button">`
// (src/internal/interactive.tsx). En modo enlace los tipos rechazan `selected`, `disabled` y
// `aria-disabled` (ver LinkModeExclusions y el comentario de Button.tsx).

import type { ReactNode } from 'react'
import { FocusRing } from '../../atoms/FocusRing/FocusRing.tsx'
import { Ripple } from '../../atoms/Ripple/Ripple.tsx'
import { StateLayer } from '../../atoms/StateLayer/StateLayer.tsx'
import {
  cx,
  interactiveElement,
  type InteractiveElementProps,
  type ToggleButtonOrLinkProps,
} from '../../internal/interactive.tsx'

export type IconButtonVariant = 'standard' | 'filled' | 'tonal' | 'outlined'
export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type IconButtonWidth = 'narrow' | 'default' | 'wide'
export type IconButtonShape = 'round' | 'square'

interface IconButtonOwnProps {
  /** Nombre accesible (se vuelve `aria-label`). Obligatorio: el botón no tiene texto visible. */
  label: string
  'aria-label'?: never
  /** Estilo de color. Por defecto `standard` (sin contenedor). */
  variant?: IconButtonVariant | undefined
  /** Tamaño de Material 3 Expressive: 32, 40, 56, 96 o 136 px de alto. Por defecto `sm`. */
  size?: IconButtonSize | undefined
  /** Ancho del contenedor: más angosto, igual al alto (por defecto) o más ancho. */
  width?: IconButtonWidth | undefined
  /**
   * Forma en reposo. Al presionar pasa a una forma más cuadrada; al seleccionar un toggle, la
   * redonda pasa a cuadrada y la cuadrada a redonda.
   */
  shape?: IconButtonShape | undefined
  /** El icono. */
  children?: ReactNode
}

/**
 * Props del IconButton: las propias más una de tres formas (ADR-0010), como `ButtonProps`.
 * - Sin `href` ni `render`: un `<button type="button">` con `ref` al `<button>`, `disabled` y
 *   `selected`, que lo convierte en un toggle (`aria-pressed`; sin definir, es un botón común).
 * - Con `href`: un `<a>` (`ref` al `<a>`). Con `render`: el `Link` del enrutador.
 * Las dos formas de enlace no aceptan `selected`, `disabled` ni `aria-disabled`.
 */
export type IconButtonProps = ToggleButtonOrLinkProps<IconButtonOwnProps>

/**
 * Botón de icono de Material 3 Expressive.
 *
 * El icono es el hijo; el componente le da el tamaño con `--mk-icon-size` (20 a 40 px según
 * el tamaño). `label` es el nombre que anuncian los lectores de pantalla. Con `href` o
 * `render` es un enlace que se ve igual (un icono que abre otra página).
 *
 * Personalización con variables CSS:
 * - `--mk-icon-button-color`: color del icono del estilo `standard` sin seleccionar (por
 *   defecto, `on-surface-variant`). Se hereda: definida en un contenedor, afecta a los
 *   botones de adentro. Seleccionado y deshabilitado conservan sus colores.
 *
 * ```tsx
 * <IconButton label="Buscar"><SearchIcon /></IconButton>
 * <IconButton variant="filled" width="wide" label="Favorito" selected={fav} onClick={() => setFav(!fav)}>
 *   <StarIcon filled={fav} />
 * </IconButton>
 * <IconButton label="Ajustes" render={<Link href="/ajustes" />}><SettingsIcon /></IconButton>
 * ```
 */
export function IconButton(props: IconButtonProps) {
  const {
    label,
    variant = 'standard',
    size = 'sm',
    width = 'default',
    shape = 'round',
    selected,
    className,
    children,
    ...rest
  } = props
  return interactiveElement(
    'IconButton',
    cx('mk-icon-button', className),
    {
      ...(selected === undefined ? {} : { 'aria-pressed': selected }),
      ...rest,
      'aria-label': label,
      ...{ 'data-variant': variant, 'data-size': size, 'data-width': width, 'data-shape': shape },
    } as InteractiveElementProps,
    <>
      <StateLayer />
      <Ripple />
      <FocusRing />
      {children}
    </>,
  )
}
