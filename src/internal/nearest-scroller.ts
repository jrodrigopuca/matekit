// Módulo interno (no se exporta desde src/index.ts): el contenedor que se desplaza más cercano a un
// elemento, como `scroll(nearest)` y `position: sticky`. Lo usan las partes cliente de TopAppBar
// (ADR-0024) y de Toolbar (ADR-0027), que escuchan el desplazamiento del mismo contenedor que usa
// su `position: sticky`.

/**
 * El primer ancestro cuyo `overflow` no es `visible` ni `clip`. `null` es el documento (la ventana).
 */
export function nearestScroller(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (node === document.body || node === document.documentElement) return null
    const { overflowY } = getComputedStyle(node)
    if (overflowY !== 'visible' && overflowY !== 'clip') return node
  }
  return null
}
