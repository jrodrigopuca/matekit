// Átomo universal (ADR-0003): sin estado, efectos, contexto ni eventos; no lleva 'use client'.

import type { CSSProperties, HTMLAttributes } from 'react'

export interface IconProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Texto que anuncian los lectores de pantalla. Sin él, el icono es decorativo y queda
   * oculto (lo normal cuando acompaña a un texto, como en un botón con etiqueta).
   */
  label?: string | undefined
  /** Tamaño en px o cualquier medida CSS. Sin definir, usa el del componente que lo contiene. */
  size?: number | string | undefined
}

/**
 * Contenedor de iconos: da tamaño, color (el del texto) y accesibilidad a cualquier SVG.
 * Funciona con los iconos de matekit, con SVG propios o con los de otra librería.
 *
 * El tamaño sale de `--mk-icon-size`, que definen los componentes (20 px en un botón chico,
 * 40 en uno XL); fuera de ellos, 24 px.
 *
 * ```tsx
 * <Icon><svg viewBox="0 0 24 24">…</svg></Icon>
 * <Icon label="Favorito" size={32}><MiEstrella /></Icon>
 * ```
 */
export function Icon({ label, size, className, style, children, ...props }: IconProps) {
  const sized: CSSProperties | undefined =
    size === undefined
      ? style
      : ({ ...style, '--mk-icon-size': typeof size === 'number' ? `${size}px` : size } as CSSProperties)
  return (
    <span
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      {...props}
      className={className ? `mk-icon ${className}` : 'mk-icon'}
      style={sized}
    >
      {children}
    </span>
  )
}
