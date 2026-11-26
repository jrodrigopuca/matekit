// Átomo universal (ADR-0003): sin estado, efectos, contexto ni eventos; no lleva 'use client'.
// API y contrato con los hijos: ADR-0017.

import { cx } from '../../internal/interactive.tsx'
import { layoutElement, type LayoutElementProps } from '../../internal/layout-element.tsx'

export type GroupOrientation = 'horizontal' | 'vertical'

export interface GroupProps extends LayoutElementProps {
  /**
   * Bloques en fila (por defecto) o en columna. Decide qué esquinas son exteriores: en fila, las
   * del inicio del primero y las del final del último (en RTL, al revés en pantalla); en columna,
   * las de arriba del primero y las de abajo del último.
   */
  orientation?: GroupOrientation | undefined
}

/**
 * Grupo de bloques conectados: separación mínima entre hijos y forma según la posición, con las
 * esquinas exteriores grandes y las interiores chicas (List segmentada y Button groups conectados
 * de Material 3 Expressive). Lo resuelve CSS por posición (`:first-child`, `:last-child`), así que
 * funciona con cualquier cantidad de hijos y en el servidor.
 *
 * Cada uso define tres variables (en el grupo o en un hijo, también por estado):
 * - `--mk-group-gap`: separación (por defecto `--md-sys-space-25`, 2 px).
 * - `--mk-group-outer-radius`: radio de las esquinas exteriores (por defecto 16, `corner-large`).
 * - `--mk-group-inner-radius`: radio de las interiores (por defecto 4, `corner-extra-small`).
 *
 * El grupo deja en cada hijo directo el radio de cada esquina (`--mk-group-corner-start-start`,
 * `-start-end`, `-end-start` y `-end-end`, que no se heredan a los nietos). Un hijo sin radio
 * propio (un `<div>`, un `<li>`) lo recibe solo; un componente con radio propio participa si lee
 * esas variables (ADR-0017). Las variables se calculan en cada hijo, así que un hijo puede
 * cambiar su radio interior al presionarse redefiniendo `--mk-group-inner-radius` en su `:active`,
 * y el radio se anima si el hijo tiene una transición de `border-radius`.
 *
 * No agrega roles: los bloques pueden ser una lista (`render={<ul />}`), botones (un grupo de
 * botones lleva `role="group"` y un nombre, que se pasan como props) o tarjetas.
 *
 * ```tsx
 * <Group orientation="vertical" render={<ul />}>
 *   <li>…</li><li>…</li><li>…</li>
 * </Group>
 * ```
 */
export function Group({ orientation, className, style, children, ...props }: GroupProps) {
  return layoutElement(
    'Group',
    cx('mk-group', className),
    style,
    { ...props, 'data-orientation': orientation === 'vertical' ? 'vertical' : 'horizontal' },
    children,
  )
}
