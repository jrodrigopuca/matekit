'use client'
// Parte cliente de Toolbar con `scrollBehavior="exit-always"` (ADR-0027): un `<span hidden>`, sin
// caja ni semántica, que escucha el desplazamiento del contenedor más cercano. Es el mismo enfoque
// que `enter-always` de TopAppBarScroll (ADR-0024), porque depende de la dirección del desplazamiento
// y CSS no la expone: el corrimiento sigue lo desplazado (baja con lo que se baja y vuelve con lo
// que se sube, como `ExitAlwaysFloatingToolbarScrollBehavior` de Compose, FloatingToolbar.kt), al
// terminar de desplazar se acomoda al estado más cercano (`settleFloatingToolbar`) y vuelve cuando
// el foco entra.
//
// Lo que se corre es la barra o, dentro de `ToolbarLayout`, el conjunto con el FAB. Escribe en ese
// elemento `--_offset` (px, de 0 a `range`) y `--_progress` (de 0 a 1); el CSS los aplica:
// - Docked y floating horizontal: al `inset-block-end` del `position: sticky`, que la baja hasta
//   sacarla por el borde. No es `translate`: un elemento corrido con `translate` hacia abajo agranda
//   lo que se puede desplazar en Chrome y Firefox (sonda del 2026-11-26), y el inset de un sticky no.
//   Al final del contenido la barra queda en su lugar en el flujo, a la vista.
// - Floating vertical: hacia el costado se agrandaría el ancho desplazable con cualquier técnica (la
//   misma sonda, con `translate` y con márgenes negativos), así que se corre hasta el borde (su
//   margen) y se desvanece. Con `data-hidden` no recibe el puntero.
//
// Con el foco adentro no se esconde: un control enfocado no puede quedar tapado (WCAG 2.4.11).

import { useEffect, useRef } from 'react'
import { nearestScroller } from '../../internal/nearest-scroller.ts'

/** Sin `scrollend` (Safari, según conocimiento previo), el desplazamiento terminó tras esta pausa. */
const SCROLL_END_FALLBACK_MS = 150

const px = (value: string) => {
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? n : 0
}

export function ToolbarScroll() {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const bar = ref.current?.parentElement
    if (!bar) return
    const layout = bar.parentElement
    const target = layout?.classList.contains('mk-toolbar-layout') ? layout : bar
    const scroller = nearestScroller(target)
    const source = scroller ?? document.scrollingElement ?? document.documentElement
    const events: HTMLElement | Window = scroller ?? window
    const vertical = bar.getAttribute('aria-orientation') === 'vertical'

    let range = 0
    let offset = 0
    let last = 0
    let frame = 0
    let endTimer: ReturnType<typeof setTimeout> | undefined
    const supportsScrollEnd = 'onscrollend' in window

    // Lo que hay que correr para sacarla del todo: su tamaño más la distancia al borde (el inset del
    // sticky con la zona segura; en la vertical, el margen del costado), como el `offsetLimit` de
    // Compose. El inset se lee con el corrimiento actual y se le suma.
    function measure() {
      const box = target.getBoundingClientRect()
      const cs = getComputedStyle(target)
      range = vertical ? box.width + px(cs.marginInlineEnd) : box.height + px(cs.insetBlockEnd) + offset
    }

    function readTop(): number {
      const max = source.scrollHeight - source.clientHeight
      // Sin valores negativos ni pasados del final (el rebote de Safari).
      return Math.min(Math.max(source.scrollTop, 0), Math.max(max, 0))
    }

    const focusInside = () => target.contains(document.activeElement)

    function apply() {
      target.style.setProperty('--_offset', `${offset}px`)
      target.style.setProperty('--_progress', String(range > 0 ? offset / range : 0))
      if (range > 0 && offset >= range) target.dataset['hidden'] = ''
      else delete target.dataset['hidden']
    }

    function update() {
      const top = readTop()
      const delta = top - last
      last = top
      offset = focusInside() ? 0 : Math.min(Math.max(offset + delta, 0), range)
      apply()
    }

    // Al terminar de desplazar: a la vista o escondida, la más cercana, con la transición de
    // data-settling (instantánea con movimiento reducido).
    function settle() {
      if (frame) {
        cancelAnimationFrame(frame)
        frame = 0
      }
      update()
      if (offset <= 0 || offset >= range) return
      target.dataset['settling'] = ''
      offset = offset / range < 0.5 ? 0 : range
      apply()
    }

    function onScroll() {
      delete target.dataset['settling']
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0
          update()
        })
      }
      if (!supportsScrollEnd) {
        clearTimeout(endTimer)
        endTimer = setTimeout(settle, SCROLL_END_FALLBACK_MS)
      }
    }

    // Con el foco adentro, vuelve. Firefox desplaza el contenedor para mostrar el botón enfocado
    // (que estaba fuera, bajo el borde) antes de este evento (comprobado el 2026-11-26; Chrome no):
    // se deshace ese salto, porque la barra vuelve sola.
    function onFocusIn() {
      if (offset <= 0) return
      target.dataset['settling'] = ''
      offset = 0
      apply()
      if (readTop() !== last) source.scrollTop = last
    }

    const resize = new ResizeObserver(() => {
      measure()
      offset = Math.min(offset, range)
      apply()
    })

    last = readTop()
    measure()
    apply()
    resize.observe(target)
    events.addEventListener('scroll', onScroll, { passive: true })
    if (supportsScrollEnd) events.addEventListener('scrollend', settle)
    target.addEventListener('focusin', onFocusIn)

    return () => {
      resize.disconnect()
      cancelAnimationFrame(frame)
      clearTimeout(endTimer)
      events.removeEventListener('scroll', onScroll)
      events.removeEventListener('scrollend', settle)
      target.removeEventListener('focusin', onFocusIn)
      delete target.dataset['settling']
      delete target.dataset['hidden']
      for (const name of ['--_offset', '--_progress']) target.style.removeProperty(name)
    }
  }, [])

  return <span ref={ref} hidden />
}
