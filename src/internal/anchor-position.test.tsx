import { afterEach, describe, expect, test } from 'vitest'
import {
  MANUAL_POSITION_ATTRIBUTE,
  fallbackPosition,
  followAnchor,
  placeNextTo,
  type PlacementOptions,
} from './anchor-position.ts'

// La regla del menú (sin opciones) la prueban Menu.test.tsx y su posición de respaldo; acá, la del
// tooltip y la parte que toca el DOM.

const viewport = { width: 400, height: 800 }
const size = { width: 120, height: 24 }
const box = (top: number, left: number, w = 40, h = 40) => ({ top, left, right: left + w, bottom: top + h })
const TOOLTIP: PlacementOptions = { side: 'top', align: 'center', gap: 4 }

describe('fallbackPosition con la regla del tooltip (arriba, centrado, 4 px)', () => {
  test('arriba y centrado sobre el ancla, a 4 px', () => {
    expect(fallbackPosition(box(100, 140), size, viewport, TOOLTIP)).toEqual({ top: 72, left: 100, side: 'top', align: 'center' })
  })
  test('baja si arriba no entra', () => {
    expect(fallbackPosition(box(10, 140), size, viewport, TOOLTIP)).toEqual({ top: 54, left: 100, side: 'bottom', align: 'center' })
  })
  test('se corre para quedar dentro de la ventana por los costados', () => {
    expect(fallbackPosition(box(100, 0), size, viewport, TOOLTIP).left).toBe(0)
    expect(fallbackPosition(box(100, 360), size, viewport, TOOLTIP).left).toBe(280)
  })
  test('sin opciones sigue siendo la regla del menú', () => {
    expect(fallbackPosition(box(100, 40), { width: 200, height: 150 }, viewport)).toEqual({ top: 140, left: 40, side: 'bottom', align: 'left' })
  })
})

describe('placeNextTo y followAnchor en el DOM', () => {
  const made: Element[] = []
  afterEach(() => made.splice(0).forEach((el) => el.remove()))

  function setup(anchorStyle: string) {
    const anchor = document.createElement('button')
    anchor.style.cssText = `position: fixed; width: 40px; height: 40px; ${anchorStyle}`
    const popup = document.createElement('div')
    popup.popover = 'manual'
    popup.style.cssText = 'inset: auto; margin: 0; border: 0; padding: 0; width: 120px; height: 24px;'
    document.body.append(anchor, popup)
    made.push(anchor, popup)
    popup.showPopover()
    return { anchor, popup }
  }

  test('sin anchor positioning escribe top y left con el cálculo', () => {
    const { anchor, popup } = setup('top: 200px; left: 100px;')
    placeNextTo(popup, anchor, TOOLTIP, false)
    expect(popup.style.top).toBe('172px')
    expect(popup.style.left).toBe('60px')
    expect(popup.dataset['side']).toBe('top')
    expect(popup.dataset['align']).toBe('center')
  })

  test('centrado: si el navegador no lo centró, pasa a la posición calculada (el caso de Firefox en RTL)', () => {
    // Sin position-area, el popover queda en la esquina: lo que el navegador dejó no coincide.
    const { anchor, popup } = setup('top: 200px; left: 100px;')
    placeNextTo(popup, anchor, TOOLTIP, true)
    expect(popup.hasAttribute(MANUAL_POSITION_ATTRIBUTE)).toBe(true)
    expect(popup.style.left).toBe('60px')
    const a = anchor.getBoundingClientRect()
    const p = popup.getBoundingClientRect()
    expect((p.left + p.right) / 2).toBeCloseTo((a.left + a.right) / 2, 0)
  })

  test('centrado: si el navegador ya lo centró, no toca la posición', () => {
    const { anchor, popup } = setup('top: 200px; left: 100px;')
    // Ubicado donde corresponde, como lo dejaría el CSS.
    popup.style.top = '172px'
    popup.style.left = '60px'
    placeNextTo(popup, anchor, TOOLTIP, true)
    expect(popup.hasAttribute(MANUAL_POSITION_ATTRIBUTE)).toBe(false)
    expect(popup.dataset['side']).toBe('top')
  })

  test('followAnchor escucha scroll y resize solo sin anchor positioning', () => {
    let calls = 0
    const place = () => calls++
    const stopNative = followAnchor(place, true)
    window.dispatchEvent(new Event('resize'))
    expect(calls).toBe(0)
    stopNative()
    const stop = followAnchor(place, false)
    window.dispatchEvent(new Event('resize'))
    document.dispatchEvent(new Event('scroll'))
    expect(calls).toBe(2)
    stop()
    window.dispatchEvent(new Event('resize'))
    expect(calls).toBe(2)
  })
})
