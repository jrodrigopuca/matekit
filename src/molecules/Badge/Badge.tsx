// Molécula universal (ADR-0003): sin estado, efectos, contexto ni eventos; no lleva 'use client'.
//
// Vive en molecules/ y no en atoms/: tiene significado propio (avisa de algo nuevo y lleva su
// propio texto para lectores de pantalla), que es lo que ADR-0002 separa de las primitivas sin
// significado. La usan NavigationBar y, más adelante, NavigationRail; también sirve sola o
// sobre un IconButton. Dónde se ubica la decide el componente que la contiene: la Badge solo se
// dibuja.

import type { HTMLAttributes, Ref } from 'react'

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'aria-label'> {
  /**
   * Texto que anuncian los lectores de pantalla, por ejemplo "3 notificaciones nuevas" o
   * "Novedades". Obligatorio, como el `label` del IconButton, para que el aviso no quede mudo
   * por olvido: el número visible solo no dice de qué es. Va como texto oculto dentro de la
   * insignia, así que se suma al nombre del elemento que la contiene (un enlace o un botón).
   * Con `""`, la insignia queda decorativa (por ejemplo, si el nombre del elemento ya lo dice).
   */
  label: string
  /** Referencia al `<span>` de la insignia. */
  ref?: Ref<HTMLSpanElement> | undefined
}

/**
 * Insignia (badge) de Material 3: sin hijos es la pequeña, un punto de 6 px; con hijos (un
 * número corto, "99+") es la grande, de 16 px de alto. Fondo `error` y texto `on-error`.
 *
 * El contenido visible queda oculto para los lectores de pantalla; lo que anuncian es `label`.
 *
 * ```tsx
 * <Badge label="Novedades" />
 * <Badge label="3 notificaciones nuevas">3</Badge>
 * ```
 */
export function Badge({ label, className, children, ...props }: BadgeProps) {
  const large = children !== undefined && children !== null && children !== false && children !== ''
  return (
    <span
      {...(label ? {} : { 'aria-hidden': true })}
      {...props}
      className={className ? `mk-badge ${className}` : 'mk-badge'}
      data-size={large ? 'large' : 'small'}
    >
      {large && <span aria-hidden="true">{children}</span>}
      {/* El espacio inicial separa el texto del que lo precede en el nombre accesible
          ("Correo 3 notificaciones nuevas" y no "Correo3 notificaciones nuevas"). Chrome ya
          separa porque la insignia es inline-flex (comprobado en su árbol de accesibilidad); el
          espacio queda por los motores que no lo hagan (Safari y Firefox, sin comprobar). */}
      {label && <span className="mk-badge-label">{` ${label}`}</span>}
    </span>
  )
}
