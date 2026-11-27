'use client'
// Parte cliente de Toolbar ligada al contenedor que se desplaza (ADR-0027): un `<span hidden>`, sin
// caja ni semántica, que la barra dibuja con `scrollBehavior` o en la vertical. Hace tres cosas:
//
// 1. `exit-always` (`hide`): el mismo enfoque que `enter-always` de TopAppBarScroll (ADR-0024),
//    porque depende de la dirección del desplazamiento y CSS no la expone. El corrimiento sigue lo
//    desplazado (baja con lo que se baja y vuelve con lo que se sube, como
//    `ExitAlwaysFloatingToolbarScrollBehavior` de Compose, FloatingToolbar.kt), al terminar de
//    desplazar se acomoda al estado más cercano (`settleFloatingToolbar`) y vuelve cuando el foco
//    entra. Escribe `--_offset` (px, de 0 a `range`) y `--_progress` (de 0 a 1) en la barra o, dentro
//    de `ToolbarLayout`, en el conjunto con el FAB; el CSS los aplica:
//    - Docked y floating horizontal: al `inset-block-end` del `position: sticky`, que la baja hasta
//      sacarla por el borde. No es `translate`: un elemento corrido con `translate` hacia abajo
//      agranda lo que se puede desplazar en Chrome y Firefox (sonda del 2026-11-26), y el inset de un
//      sticky no. Al final del contenido la barra queda en su lugar en el flujo, a la vista.
//    - Floating vertical: hacia el costado se agrandaría el ancho desplazable con cualquier técnica
//      (la misma sonda), así que se corre hasta el borde (su margen) y se desvanece. Con
//      `data-hidden` no recibe el puntero.
//    Con el foco adentro no se esconde: un control enfocado no puede quedar tapado (WCAG 2.4.11).
// 2. `collapse`: dentro de un ToolbarLayout, pide contraer la barra al bajar 40 px y expandirla al
//    subir 40 px desde el último cambio, como `VerticalNestedScrollExpansionNode` de Compose
//    (`floatingToolbarVerticalNestedScroll`, `ScrollDistanceThreshold`). Con el foco adentro de la
//    barra no la contrae.
// 3. `measure` (la vertical): escribe el alto visible del contenedor en `--_scrollport`, para que la
//    barra no sea más alta que lo que se ve (el CSS usa `100dvh` hasta que esto corre).

import { useEffect, useLayoutEffect, useRef } from 'react'
import { nearestScroller } from '../../internal/nearest-scroller.ts'
import type { ToolbarLayoutContextValue } from './ToolbarLayout.tsx'

/** Sin `scrollend` (Safari, según conocimiento previo), el desplazamiento terminó tras esta pausa. */
const SCROLL_END_FALLBACK_MS = 150
/** `FloatingToolbarDefaults.ScrollDistanceThreshold` (40 dp). */
const COLLAPSE_THRESHOLD = 40

const px = (value: string) => {
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? n : 0
}

interface ToolbarScrollProps {
  /** `exit-always`. */
  hide: boolean
  /** `collapse`: el estado del ToolbarLayout (`null` si no hay o no se pidió). */
  collapse: ToolbarLayoutContextValue | null
  /** Medir el alto visible del contenedor (la vertical). */
  measure: boolean
}

export function ToolbarScroll({ hide, collapse, measure }: ToolbarScrollProps) {
  const ref = useRef<HTMLSpanElement>(null)
  // El estado del ToolbarLayout cambia en cada render: el efecto lee el último.
  const latestCollapse = useRef(collapse)
  useLayoutEffect(() => {
    latestCollapse.current = collapse
  })
  const collapsing = collapse !== null

  useEffect(() => {
    const bar = ref.current?.parentElement
    if (!bar) return
    const layout = bar.parentElement
    const target = layout?.classList.contains('mk-toolbar-layout') ? layout : bar
    const scroller = nearestScroller(target)
    const source = scroller ?? document.scrollingElement ?? document.documentElement
    const events: HTMLElement | Window = scroller ?? window
    const vertical = bar.getAttribute('aria-orientation') === 'vertical'
    const cleanups: Array<() => void> = []

    function readTop(): number {
      const max = source.scrollHeight - source.clientHeight
      // Sin valores negativos ni pasados del final (el rebote de Safari).
      return Math.min(Math.max(source.scrollTop, 0), Math.max(max, 0))
    }
    const focusInside = () => target.contains(document.activeElement)

    // --- 3. Alto visible del contenedor ---
    if (measure) {
      const write = () =>
        target.style.setProperty('--_scrollport', `${scroller ? scroller.clientHeight : window.innerHeight}px`)
      write()
      if (scroller) {
        const observer = new ResizeObserver(write)
        observer.observe(scroller)
        cleanups.push(() => observer.disconnect())
      } else {
        window.addEventListener('resize', write)
        cleanups.push(() => window.removeEventListener('resize', write))
      }
      cleanups.push(() => target.style.removeProperty('--_scrollport'))
    }

    // --- 2. Contraer hacia el FAB ---
    if (collapsing) {
      let last = readTop()
      // El umbral se ancla donde está el contenedor al montar (un salto grande también cuenta).
      let wasExpanded = latestCollapse.current?.expanded ?? true
      let threshold = wasExpanded ? last + COLLAPSE_THRESHOLD : last - COLLAPSE_THRESHOLD
      let frame = 0
      const update = () => {
        frame = 0
        const state = latestCollapse.current
        if (!state) return
        const top = readTop()
        const delta = top - last
        last = top
        // Un cambio que no vino de acá (el foco, la app) vuelve a anclar el umbral, como Compose.
        if (wasExpanded !== state.expanded) {
          threshold = state.expanded ? top + COLLAPSE_THRESHOLD : top - COLLAPSE_THRESHOLD
          wasExpanded = state.expanded
        }
        if (delta > 0 && state.expanded && top >= threshold && !focusInside()) {
          threshold = top - COLLAPSE_THRESHOLD
          wasExpanded = false
          state.requestExpanded(false, 'scroll')
        } else if (delta < 0 && !state.expanded && top <= threshold) {
          threshold = top + COLLAPSE_THRESHOLD
          wasExpanded = true
          state.requestExpanded(true, 'scroll')
        }
      }
      const onScroll = () => {
        if (!frame) frame = requestAnimationFrame(update)
      }
      events.addEventListener('scroll', onScroll, { passive: true })
      cleanups.push(() => {
        cancelAnimationFrame(frame)
        events.removeEventListener('scroll', onScroll)
      })
    }

    // --- 1. Ocultar al desplazar ---
    if (hide) {
      let range = 0
      let offset = 0
      let last = 0
      let frame = 0
      let endTimer: ReturnType<typeof setTimeout> | undefined
      const supportsScrollEnd = 'onscrollend' in window

      // Lo que hay que correr para sacarla del todo: su tamaño más la distancia al borde (el inset
      // del sticky con la zona segura; en la vertical, el margen del costado), como el `offsetLimit`
      // de Compose. El inset se lee con el corrimiento actual y se le suma.
      const measureRange = () => {
        const box = target.getBoundingClientRect()
        const cs = getComputedStyle(target)
        range = vertical
          ? box.width + Math.max(px(cs.marginInlineStart), px(cs.marginInlineEnd))
          : box.height + px(cs.insetBlockEnd) + offset
      }

      const apply = () => {
        target.style.setProperty('--_offset', `${offset}px`)
        target.style.setProperty('--_progress', String(range > 0 ? offset / range : 0))
        if (range > 0 && offset >= range) target.dataset['hidden'] = ''
        else delete target.dataset['hidden']
      }

      const update = () => {
        const top = readTop()
        const delta = top - last
        last = top
        offset = focusInside() ? 0 : Math.min(Math.max(offset + delta, 0), range)
        apply()
      }

      // Al terminar de desplazar: a la vista o escondida, la más cercana, con la transición de
      // data-settling (instantánea con movimiento reducido).
      const settle = () => {
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

      const onScroll = () => {
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
      const onFocusIn = () => {
        if (offset <= 0) return
        target.dataset['settling'] = ''
        offset = 0
        apply()
        if (readTop() !== last) source.scrollTop = last
      }

      const resize = new ResizeObserver(() => {
        measureRange()
        offset = Math.min(offset, range)
        apply()
      })

      last = readTop()
      measureRange()
      apply()
      resize.observe(target)
      events.addEventListener('scroll', onScroll, { passive: true })
      if (supportsScrollEnd) events.addEventListener('scrollend', settle)
      target.addEventListener('focusin', onFocusIn)

      cleanups.push(() => {
        resize.disconnect()
        cancelAnimationFrame(frame)
        clearTimeout(endTimer)
        events.removeEventListener('scroll', onScroll)
        events.removeEventListener('scrollend', settle)
        target.removeEventListener('focusin', onFocusIn)
        delete target.dataset['settling']
        delete target.dataset['hidden']
        for (const name of ['--_offset', '--_progress']) target.style.removeProperty(name)
      })
    }

    return () => {
      for (const fn of cleanups) fn()
    }
  }, [hide, collapsing, measure])

  return <span ref={ref} hidden />
}
