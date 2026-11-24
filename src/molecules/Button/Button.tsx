// Molécula universal (ADR-0003): sin estado, efectos ni contexto; no lleva 'use client'.
// Forma, tamaños, colores y estados (incluido el cambio de forma al presionar) son CSS.
// Contiene la onda (Ripple), que es un átomo cliente: un componente universal puede
// renderizar uno cliente, así que Button sigue sirviendo desde un Server Component.

import type { ButtonHTMLAttributes } from 'react'
import { FocusRing } from '../../atoms/FocusRing/FocusRing.tsx'
import { Ripple } from '../../atoms/Ripple/Ripple.tsx'
import { StateLayer } from '../../atoms/StateLayer/StateLayer.tsx'

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'elevated' | 'text'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type ButtonShape = 'round' | 'square'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Estilo de color. Por defecto `filled`. */
  variant?: ButtonVariant | undefined
  /** Tamaño de Material 3 Expressive: 32, 40, 56, 96 o 136 px de alto. Por defecto `sm`. */
  size?: ButtonSize | undefined
  /** Forma en reposo. Al presionar, y al seleccionar un toggle, pasa a una forma cuadrada. */
  shape?: ButtonShape | undefined
  /**
   * Convierte el botón en un toggle (`aria-pressed`). Sin definir, es un botón común.
   * El estilo `text` no tiene versión toggle en Material 3.
   */
  selected?: boolean | undefined
}

/**
 * Botón de Material 3 Expressive.
 *
 * Los iconos se pasan como hijos, sin propiedades especiales: el CSS les da el tamaño del
 * botón y la separación.
 *
 * ```tsx
 * <Button>Guardar</Button>
 * <Button variant="tonal" size="md"><svg …/>Crear</Button>
 * <Button variant="outlined" selected={on} onClick={() => setOn(!on)}>Favorito</Button>
 * ```
 */
export function Button({
  variant = 'filled',
  size = 'sm',
  shape = 'round',
  selected,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      {...props}
      className={className ? `mk-button ${className}` : 'mk-button'}
      data-variant={variant}
      data-size={size}
      data-shape={shape}
    >
      <StateLayer />
      <Ripple />
      <FocusRing />
      {children}
    </button>
  )
}
