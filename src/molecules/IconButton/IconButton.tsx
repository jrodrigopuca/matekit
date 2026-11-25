// Molécula universal (ADR-0003): sin estado, efectos ni contexto; no lleva 'use client'.
// Forma, tamaños, anchos, colores y estados (incluido el cambio de forma al presionar) son CSS.
// Contiene la onda (Ripple), que es un átomo cliente: un componente universal puede
// renderizar uno cliente, así que IconButton sigue sirviendo desde un Server Component.

import type { ButtonHTMLAttributes, Ref } from 'react'
import { FocusRing } from '../../atoms/FocusRing/FocusRing.tsx'
import { Ripple } from '../../atoms/Ripple/Ripple.tsx'
import { StateLayer } from '../../atoms/StateLayer/StateLayer.tsx'

export type IconButtonVariant = 'standard' | 'filled' | 'tonal' | 'outlined'
export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type IconButtonWidth = 'narrow' | 'default' | 'wide'
export type IconButtonShape = 'round' | 'square'

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Nombre accesible (se vuelve `aria-label`). Obligatorio: el botón no tiene texto visible. */
  label: string
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
  /** Convierte el botón en un toggle (`aria-pressed`). Sin definir, es un botón común. */
  selected?: boolean | undefined
  /** Referencia al `<button>` nativo. */
  ref?: Ref<HTMLButtonElement> | undefined
}

/**
 * Botón de icono de Material 3 Expressive.
 *
 * El icono es el hijo; el componente le da el tamaño con `--mk-icon-size` (20 a 40 px según
 * el tamaño). `label` es el nombre que anuncian los lectores de pantalla.
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
 * ```
 */
export function IconButton({
  label,
  variant = 'standard',
  size = 'sm',
  width = 'default',
  shape = 'round',
  selected,
  type = 'button',
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      {...props}
      aria-label={label}
      className={className ? `mk-icon-button ${className}` : 'mk-icon-button'}
      data-variant={variant}
      data-size={size}
      data-width={width}
      data-shape={shape}
    >
      <StateLayer />
      <Ripple />
      <FocusRing />
      {children}
    </button>
  )
}
