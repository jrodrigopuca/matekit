// Posición de una capa superior (popover) junto a su ancla, compartida por Menu y Tooltip
// (ADR-0007; movida desde src/organisms/Menu/position.ts el 2026-11-26, ADR-0021). Interna: no se
// exporta desde src/index.ts. Las funciones puras no usan React ni el DOM y se prueban solas;
// placeNextTo y followAnchor son la parte que toca el DOM.
//
// El posicionamiento normal es CSS anchor positioning (menu.css, tooltip.css): el ancla lleva
// anchor-name, la capa position-anchor, position-area y position-try-fallbacks, y el navegador la
// mantiene pegada al ancla al desplazarse la página. Esto es el respaldo para navegadores sin
// anchor positioning (Safari anterior a 26, Firefox anterior a 147): la misma regla escrita a mano.

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

/** Lado del ancla donde quedó la capa, y cómo se alinea con ella. */
export interface Placement {
  top: number
  left: number
  side: 'top' | 'bottom'
  /** Borde del ancla con el que se alinea (`left`, `right`) o centrada sobre ella (`center`). */
  align: 'left' | 'right' | 'center'
}

/** Cómo prefiere ubicarse la capa. Sin opciones, la regla del menú. */
export interface PlacementOptions {
  /** Lado preferido: `bottom` (menú, por defecto) o `top` (tooltip). */
  side?: 'top' | 'bottom' | undefined
  /**
   * `start` (por defecto): alineada al borde izquierdo del ancla, o al derecho si no entra.
   * `center`: centrada sobre el ancla y corrida lo justo para quedar dentro de la ventana.
   */
  align?: 'start' | 'center' | undefined
  /** Separación con el ancla en px (por defecto 0). */
  gap?: number | undefined
}

/** El navegador resuelve el posicionamiento con CSS (anchor positioning). */
export function supportsAnchorPositioning(): boolean {
  return typeof CSS !== 'undefined' && CSS.supports('anchor-name: --mk-a') && CSS.supports('position-area: bottom')
}

const clamp = (v: number, size: number, max: number) => Math.max(0, Math.min(v, max - size))

/**
 * Posición de la capa (coordenadas de la ventana, para `position: fixed`), con el mismo criterio
 * que el CSS. Sin opciones (menú): debajo del ancla y alineada a su borde izquierdo; arriba si
 * abajo no entra y arriba sí; alineada al borde derecho si no entra a la derecha. Con
 * `side: 'top'` prefiere arriba y baja si arriba no entra y abajo sí; con `align: 'center'` se
 * centra sobre el ancla. Si no entra de ningún lado, queda dentro de la ventana (pegada al borde
 * que corresponda).
 */
export function fallbackPosition(anchor: Box, popup: Size, viewport: Size, options: PlacementOptions = {}): Placement {
  const { side: preferred = 'bottom', align: alignMode = 'start', gap = 0 } = options
  const below = anchor.bottom + gap
  const above = anchor.top - gap - popup.height
  const fitsBelow = below + popup.height <= viewport.height
  const fitsAbove = above >= 0
  const side =
    preferred === 'bottom' ? (!fitsBelow && fitsAbove ? 'top' : 'bottom') : !fitsAbove && fitsBelow ? 'bottom' : 'top'
  const top = side === 'bottom' ? below : above

  let left: number
  let align: Placement['align']
  if (alignMode === 'center') {
    align = 'center'
    left = anchor.left + (anchor.right - anchor.left - popup.width) / 2
  } else {
    const fitsRight = anchor.left + popup.width <= viewport.width
    const fitsLeft = anchor.right - popup.width >= 0
    align = !fitsRight && fitsLeft ? 'right' : 'left'
    left = align === 'left' ? anchor.left : anchor.right - popup.width
  }
  return {
    top: clamp(top, popup.height, viewport.height),
    left: clamp(left, popup.width, viewport.width),
    side,
    align,
  }
}

/** Lado y alineación que resultaron, mirando dónde quedó la capa (con anchor positioning). */
export function observedPlacement(anchor: Box, popup: Box): { side: 'top' | 'bottom'; align: 'left' | 'right' } {
  const side = (popup.top + popup.bottom) / 2 < (anchor.top + anchor.bottom) / 2 ? 'top' : 'bottom'
  const align = Math.abs(popup.right - anchor.right) < Math.abs(popup.left - anchor.left) ? 'right' : 'left'
  return { side, align }
}

/** Atributo con el que una capa centrada pasa a la posición calculada (ver placeNextTo). */
export const MANUAL_POSITION_ATTRIBUTE = 'data-manual-position'

/**
 * Ubica `popup` junto a `anchor`. Con anchor positioning (`native`, lo normal) el CSS ya la ubicó:
 * solo anota de qué lado quedó en `data-side` y `data-align` (para el origen de la animación o el
 * estilo). Sin él, calcula la posición con `fallbackPosition` y la escribe en `top` y `left`.
 *
 * Con `align: 'center'` además comprueba el centrado del navegador contra el cálculo: Firefox (159,
 * comprobado el 2026-11-26) centra mal `anchor-center` cuando el ancla está en un contexto RTL (la
 * capa queda corrida casi 300 px, fuera de la ventana). Si la posición horizontal no coincide, la capa
 * recibe `data-manual-position` (el CSS quita `position-area`) y se ubica con el cálculo. Supone que
 * una escala de la capa (la de la animación de entrada) sale de su centro.
 */
export function placeNextTo(
  popup: HTMLElement,
  anchor: HTMLElement,
  options: PlacementOptions = {},
  native: boolean = supportsAnchorPositioning(),
): void {
  const anchorBox = anchor.getBoundingClientRect()
  const viewport = { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight }
  if (native) {
    const centered = options.align === 'center'
    if (centered) popup.removeAttribute(MANUAL_POSITION_ATTRIBUTE)
    const box = popup.getBoundingClientRect()
    // Medido sin la escala de la entrada (0,8 → 1 desde el centro): el centro no cambia, el ancho
    // sin transformar es offsetWidth.
    const left = (box.left + box.right) / 2 - popup.offsetWidth / 2
    const expected = centered
      ? fallbackPosition(anchorBox, { width: popup.offsetWidth, height: popup.offsetHeight }, viewport, options)
      : undefined
    if (!expected || Math.abs(left - expected.left) <= 1) {
      const { side, align } = observedPlacement(anchorBox, box)
      popup.dataset['side'] = side
      popup.dataset['align'] = centered ? 'center' : align
      return
    }
    popup.setAttribute(MANUAL_POSITION_ATTRIBUTE, '')
  }
  const p = fallbackPosition(anchorBox, { width: popup.offsetWidth, height: popup.offsetHeight }, viewport, options)
  popup.style.top = `${p.top}px`
  popup.style.left = `${p.left}px`
  popup.dataset['side'] = p.side
  popup.dataset['align'] = p.align
}

/**
 * Sin anchor positioning, vuelve a ubicar la capa cuando la página se desplaza o cambia de
 * tamaño (con él, el navegador ya la mantiene junto al ancla y no escucha nada). Devuelve la
 * limpieza.
 */
export function followAnchor(place: () => void, native: boolean = supportsAnchorPositioning()): () => void {
  if (native) return () => {}
  window.addEventListener('scroll', place, true)
  window.addEventListener('resize', place)
  return () => {
    window.removeEventListener('scroll', place, true)
    window.removeEventListener('resize', place)
  }
}
