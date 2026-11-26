// Módulo interno universal (ADR-0003): sin React. No se exporta como API pública.
//
// Espera la salida animada de una capa (Snackbar, Tooltip, Menu, Dialog): el componente pone
// `data-closing`, que dispara las transiciones de salida, y recién al terminar oculta el popover o
// cierra el diálogo.
//
// Antes cada uno esperaba `Promise.all(el.getAnimations().map((a) => a.finished))` e ignoraba el
// rechazo. Una transición cancelada (por ejemplo, si se activa el movimiento reducido a mitad de la
// salida, o con `cancel()`) rechaza `finished`: la espera no terminaba nunca y la capa quedaba
// abierta con `data-closing` (comprobado en los tres motores el 2026-11-26: el Dialog invisible pero
// modal, con la página inerte; el Menu y el Tooltip abiertos y transparentes, el Tooltip visible en
// Firefox; el Snackbar con la cola trabada).

/**
 * Se cumple cuando terminaron las animaciones del elemento, o cuando `active()` da `false`:
 * - Usa `allSettled`: una animación cancelada termina la espera en vez de colgarla.
 * - Al terminar vuelve a consultar: una transición cancelada puede dejar otra en su lugar.
 * - Solo espera las que corren y tienen fin: una animación infinita o en pausa (de quien usa el
 *   componente) no detiene la salida.
 * - `active` es la bandera del que espera: si se volvió a abrir durante la salida (las transiciones
 *   de salida se reemplazan por las de entrada), da `false` y la espera termina sin seguir a las
 *   nuevas. Quien llama vuelve a mirar `active()` antes de ocultar.
 *
 * Sin animaciones (sin transiciones, o una salida pedida antes de que la entrada avance: invertir
 * una transición en progreso 0 no crea ninguna), se cumple enseguida. `getAnimations()` fuerza el
 * cálculo de estilos, así que ya incluye las transiciones que acaba de disparar `data-closing`.
 *
 * ```ts
 * const token = {}
 * closing.current = token
 * el.setAttribute('data-closing', '')
 * void settleAnimations(el, () => closing.current === token).then(() => {
 *   if (closing.current !== token) return
 *   el.hidePopover()
 * })
 * ```
 */
export async function settleAnimations(el: Element, active: () => boolean = () => true): Promise<void> {
  for (;;) {
    if (!active()) return
    const running = el
      .getAnimations()
      .filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().endTime !== Infinity)
    if (running.length === 0) return
    await Promise.allSettled(running.map((a) => a.finished))
  }
}
