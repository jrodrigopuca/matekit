'use client'
// Parte cliente de TopAppBar (ADR-0024): usa un efecto y eventos de desplazamiento. La barra es
// universal y dibuja esta parte como hija (un `<span hidden>`, sin caja ni semántica), así que el
// JavaScript queda aislado acá. Hace tres cosas, y ninguna es necesaria para que la barra se vea
// bien al cargar (arriba de todo, plana y expandida):
//
// 1. Mide el alto real de la barra (`--_height`). El CSS lo calcula con los tokens para un título
//    de una línea; con varias (medium y large "flexible"), el colapso necesita el alto de verdad.
// 2. Respaldo donde no existen las animaciones por desplazamiento (`animation-timeline: scroll()`):
//    marca la barra con `data-scroll-driver="script"` y escribe el avance en `--_progress` y
//    `--_tint`, que el CSS convierte en la misma animación detenida en ese punto.
// 3. `enter-always` en todos los motores: depende de la dirección del desplazamiento, que CSS no
//    expone. Lleva la cuenta del corrimiento (`--_offset`) como `enterAlwaysScrollBehavior` de
//    Compose (AppBar.kt): baja con lo que se desplaza hacia abajo, sube con lo que se desplaza hacia
//    arriba, y al terminar de desplazar se acomoda al estado más cercano.

import { useEffect, useRef } from 'react'
import { nearestScroller } from '../../internal/nearest-scroller.ts'
import type { TopAppBarScrollBehavior, TopAppBarSize } from './TopAppBar.tsx'

/** Sin `scrollend` (Safari, según conocimiento previo), el desplazamiento terminó tras esta pausa. */
const SCROLL_END_FALLBACK_MS = 150

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** Un número de una variable CSS en px (`--_keep: 64px`), o el respaldo. */
function cssPx(el: HTMLElement, name: string, fallback: number): number {
  const value = Number.parseFloat(getComputedStyle(el).getPropertyValue(name))
  return Number.isFinite(value) ? value : fallback
}

interface TopAppBarScrollProps {
  behavior: Exclude<TopAppBarScrollBehavior, 'none'>
  size: TopAppBarSize
}

export function TopAppBarScroll({ behavior, size }: TopAppBarScrollProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const bar = ref.current?.parentElement
    if (!bar) return
    const scroller = nearestScroller(bar)
    const doc = document.scrollingElement ?? document.documentElement
    const source = scroller ?? doc
    const target: HTMLElement | Window = scroller ?? window

    // 1. Alto real: lo que se colapsa es el alto menos lo que queda visible (--_keep).
    let height = bar.getBoundingClientRect().height
    const resize = new ResizeObserver(([entry]) => {
      const box = entry?.borderBoxSize[0]
      height = box ? box.blockSize : bar.getBoundingClientRect().height
      bar.style.setProperty('--_height', `${height}px`)
      update()
    })

    const script = behavior === 'enter-always' || !CSS.supports('animation-timeline: scroll()')
    if (script) bar.dataset['scrollDriver'] = 'script'

    const keep = cssPx(bar, '--_keep', size === 'sm' ? 0 : 64)
    const tintDistance = cssPx(bar, '--_tint-distance', 16)
    let last = 0
    let offset = 0
    let progress = 0
    let frame = 0
    let endTimer: ReturnType<typeof setTimeout> | undefined
    const supportsScrollEnd = 'onscrollend' in window

    function readTop(): number {
      const max = source.scrollHeight - source.clientHeight
      // Sin valores negativos ni pasados del final (el rebote de Safari).
      return Math.min(Math.max(source.scrollTop, 0), Math.max(max, 0))
    }

    function update() {
      if (!script) return
      const top = readTop()
      const delta = top - last
      last = top
      const range = Math.max(height - keep, 0)
      const overlap = clamp01(top / tintDistance)
      let tint = overlap
      if (behavior === 'enter-always') {
        offset = Math.min(Math.max(offset + delta, 0), range)
        progress = range > 0 ? offset / range : 0
        bar?.style.setProperty('--_offset', `${offset}px`)
        // Compose: el small cambia de color cuando hay contenido debajo; el medium y el large,
        // con lo que se colapsaron (TwoRowsTopAppBar usa collapsedFraction).
        if (size !== 'sm') tint = progress
      } else if (behavior === 'exit-until-collapsed') {
        progress = range > 0 ? clamp01(top / range) : 0
        if (size !== 'sm') tint = progress
      }
      bar?.style.setProperty('--_progress', String(progress))
      bar?.style.setProperty('--_tint', String(tint))
    }

    // Acomodar enter-always al terminar: expandida o colapsada, la más cercana (settleAppBar de
    // Compose), con la transición de data-settling (instantánea con movimiento reducido).
    function settle() {
      // scrollend puede llegar antes del cuadro que aplica el último desplazamiento: aplicarlo ya.
      if (frame) {
        cancelAnimationFrame(frame)
        frame = 0
      }
      update()
      const range = Math.max(height - keep, 0)
      if (offset <= 0 || offset >= range) return
      if (bar) bar.dataset['settling'] = ''
      offset = progress < 0.5 ? 0 : range
      last = readTop()
      // update() suma el delta (0): con offset ya acomodado, escribe las variables.
      update()
    }

    function onScroll() {
      if (bar) delete bar.dataset['settling']
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0
          update()
        })
      }
      if (behavior === 'enter-always' && !supportsScrollEnd) {
        clearTimeout(endTimer)
        endTimer = setTimeout(settle, SCROLL_END_FALLBACK_MS)
      }
    }
    // Con el foco adentro (Tab hacia una acción), la barra escondida vuelve.
    function onFocusIn() {
      if (offset <= 0) return
      if (bar) bar.dataset['settling'] = ''
      offset = 0
      last = readTop()
      update()
    }

    last = readTop()
    resize.observe(bar)
    if (script) {
      target.addEventListener('scroll', onScroll, { passive: true })
      if (behavior === 'enter-always') {
        if (supportsScrollEnd) target.addEventListener('scrollend', settle)
        bar.addEventListener('focusin', onFocusIn)
      }
      update()
    }

    return () => {
      resize.disconnect()
      cancelAnimationFrame(frame)
      clearTimeout(endTimer)
      target.removeEventListener('scroll', onScroll)
      target.removeEventListener('scrollend', settle)
      bar.removeEventListener('focusin', onFocusIn)
      delete bar.dataset['scrollDriver']
      delete bar.dataset['settling']
      for (const name of ['--_height', '--_offset', '--_progress', '--_tint']) bar.style.removeProperty(name)
    }
  }, [behavior, size])

  return <span ref={ref} hidden />
}
