// Átomo universal (ADR-0003): sin estado, efectos, contexto ni eventos; no lleva 'use client'.
// API y motivos: ADR-0017.

import type { CSSProperties } from 'react'
import { cx } from '../../internal/interactive.tsx'
import { layoutElement, type LayoutElementProps } from '../../internal/layout-element.tsx'
import type { SpaceStep } from '../../tokens/space.ts'

export type StackDirection = 'row' | 'column'
/** `align-items`: en una columna, el eje horizontal; en una fila, el vertical. */
export type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline'
/** `justify-content`: `between`, `around` y `evenly` son `space-between`, `space-around` y `space-evenly`. */
export type StackJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'

interface StackOwnProps {
  /**
   * Separación entre hijos (`gap`), como paso de la escala de Material 3: `gap={200}` es
   * `--md-sys-space-200`, 16 px. El número es el del token (centésimas de 8), no px: los tipos
   * solo aceptan los 18 pasos. Sin definir, 0 (como en CSS).
   */
  gap?: SpaceStep | undefined
  /** Alineación en el eje cruzado (`align-items`). Sin definir, la de CSS: `stretch`. */
  align?: StackAlign | undefined
  /** Reparto en el eje principal (`justify-content`). Sin definir, la de CSS: al inicio. */
  justify?: StackJustify | undefined
}

/** Dirección fija. */
interface StackFixedProps {
  /** Columna (por defecto) o fila. Las dos siguen la dirección del texto (RTL). */
  direction?: StackDirection | undefined
  /** Deja que los hijos pasen a la línea siguiente cuando no entran (`flex-wrap: wrap`). */
  wrap?: boolean | undefined
  switchAt?: undefined
}

/** Dirección según el espacio disponible (patrón "switcher"). */
interface StackSwitchProps {
  /**
   * Ancho del Stack (una longitud CSS, mejor en rem: `"30rem"`) desde el que los hijos van en
   * fila, repartiéndose el ancho en partes iguales; por debajo, en columna, cada uno a todo el
   * ancho. Mide el propio Stack (el espacio que le da su contenedor), no la ventana, y no
   * necesita un contenedor extra. Queda en `--mk-stack-switch-at`.
   */
  switchAt: string
  direction?: undefined
  wrap?: undefined
}

export type StackProps = LayoutElementProps & StackOwnProps & (StackFixedProps | StackSwitchProps)

/**
 * Pila: los hijos en columna o en fila con `display: flex`, separados por un paso de la escala
 * de espaciado. Es una capa delgada sobre flex (ADR-0017): lo que no está acá se escribe en CSS
 * con `className` o `style`.
 *
 * Para que un hijo tome el espacio que sobra (el `weight` de Compose), se le pone
 * `style={{ flex: 1, minInlineSize: 0 }}` (o lo mismo en su CSS): `flex: 1` reparte el sobrante y
 * `minInlineSize: 0` le permite achicarse por debajo de su contenido.
 *
 * ```tsx
 * <Stack gap={200}>…</Stack>
 * <Stack direction="row" gap={100} align="center" wrap>…</Stack>
 * <Stack switchAt="30rem" gap={150}>…</Stack>
 * <Stack render={<ul />} gap={100}>…<li /></Stack>
 * ```
 */
export function Stack({ direction, wrap, switchAt, gap, align, justify, className, style, children, ...props }: StackProps) {
  const switching = switchAt !== undefined
  const ownStyle = switching ? ({ '--mk-stack-switch-at': switchAt } as CSSProperties) : undefined
  return layoutElement(
    'Stack',
    cx('mk-stack', className),
    ownStyle || style ? { ...ownStyle, ...style } : undefined,
    {
      ...props,
      'data-direction': switching ? undefined : direction === 'row' ? 'row' : undefined,
      'data-wrap': wrap ? '' : undefined,
      'data-switch': switching ? '' : undefined,
      'data-gap': gap === undefined ? undefined : String(gap),
      'data-align': align,
      'data-justify': justify,
    },
    children,
  )
}
