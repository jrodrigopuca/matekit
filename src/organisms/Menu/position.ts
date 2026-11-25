// Posición del menú respecto de su disparador (ADR-0007). Módulo sin React: lo usa
// MenuContent y se prueba solo.
//
// El posicionamiento normal es CSS anchor positioning (menu.css): el disparador lleva
// anchor-name, el menú position-anchor, position-area y position-try-fallbacks, y el
// navegador lo mantiene pegado al disparador al desplazarse la página. Esto es el respaldo para
// navegadores sin anchor positioning (Safari anterior a 26, Firefox anterior a 147): la misma
// regla escrita a mano, debajo y alineado al inicio, dándose vuelta si no entra.

export interface Box {
  top: number
  left: number
  right: number
  bottom: number
}

export interface Size {
  width: number
  height: number
}

/** Lado del disparador donde quedó el menú, y borde del disparador con el que se alinea. */
export interface Placement {
  top: number
  left: number
  side: 'top' | 'bottom'
  align: 'left' | 'right'
}

/** El navegador resuelve el posicionamiento con CSS (anchor positioning). */
export function supportsAnchorPositioning(): boolean {
  return typeof CSS !== 'undefined' && CSS.supports('anchor-name: --mk-a') && CSS.supports('position-area: bottom')
}

/**
 * Posición del menú (coordenadas de la ventana, para `position: fixed`), con el mismo criterio
 * que el CSS: debajo del disparador y alineado a su borde izquierdo; arriba si abajo no entra y
 * arriba sí; alineado al borde derecho si no entra a la derecha. Si no entra de ningún lado,
 * queda dentro de la ventana (pegado al borde que corresponda).
 */
export function fallbackPosition(anchor: Box, menu: Size, viewport: Size): Placement {
  const fitsBelow = anchor.bottom + menu.height <= viewport.height
  const fitsAbove = anchor.top - menu.height >= 0
  const side = !fitsBelow && fitsAbove ? 'top' : 'bottom'
  const fitsRight = anchor.left + menu.width <= viewport.width
  const fitsLeft = anchor.right - menu.width >= 0
  const align = !fitsRight && fitsLeft ? 'right' : 'left'

  const top = side === 'bottom' ? anchor.bottom : anchor.top - menu.height
  const left = align === 'left' ? anchor.left : anchor.right - menu.width
  const clamp = (v: number, size: number, max: number) => Math.max(0, Math.min(v, max - size))
  return {
    top: clamp(top, menu.height, viewport.height),
    left: clamp(left, menu.width, viewport.width),
    side,
    align,
  }
}

/** Lado y alineación que resultaron, mirando dónde quedó el menú (con anchor positioning). */
export function observedPlacement(anchor: Box, menu: Box): Pick<Placement, 'side' | 'align'> {
  const side = (menu.top + menu.bottom) / 2 < (anchor.top + anchor.bottom) / 2 ? 'top' : 'bottom'
  const align = Math.abs(menu.right - anchor.right) < Math.abs(menu.left - anchor.left) ? 'right' : 'left'
  return { side, align }
}
