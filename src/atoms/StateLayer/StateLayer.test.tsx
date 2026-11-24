import { describe, expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { StateLayer } from './StateLayer.tsx'
import { render, style } from '../../test/render.tsx'

const opacity = (el: Element | null) => Number(style(el).opacity)

describe('StateLayer', () => {
  test('es un span decorativo, oculto para lectores de pantalla, que suma clases y props', async () => {
    const c = await render(<StateLayer className="extra" data-testid="capa" />)
    const layer = c.querySelector('span')
    expect(layer?.getAttribute('aria-hidden')).toBe('true')
    expect(layer?.className).toBe('mk-state-layer extra')
    expect(layer?.dataset['testid']).toBe('capa')
  })

  test('posiciona y aísla al padre, y se dibuja detrás de su contenido', async () => {
    const c = await render(
      <button type="button">
        <StateLayer />
        Texto
      </button>,
    )
    expect(style(c.querySelector('button')).position).toBe('relative')
    expect(style(c.querySelector('button')).isolation).toBe('isolate')
    const layer = c.querySelector('.mk-state-layer')
    expect(style(layer).position).toBe('absolute')
    expect(style(layer).zIndex).toBe('-1')
    expect(style(layer).pointerEvents).toBe('none')
  })

  test('opacidad 0 en reposo, 8 % con el puntero encima y vuelve a 0 al salir', async () => {
    const c = await render(
      <button type="button">
        <StateLayer />
        Texto
      </button>,
    )
    const button = c.querySelector('button') as HTMLButtonElement
    const layer = c.querySelector('.mk-state-layer')
    expect(opacity(layer)).toBe(0)
    await userEvent.hover(button)
    expect(opacity(layer)).toBeCloseTo(0.08)
    await userEvent.unhover(button)
    expect(opacity(layer)).toBe(0)
  })

  test('10 % con foco de teclado', async () => {
    const c = await render(
      <button type="button">
        <StateLayer />
        Texto
      </button>,
    )
    await userEvent.tab()
    expect(document.activeElement).toBe(c.querySelector('button'))
    expect(opacity(c.querySelector('.mk-state-layer'))).toBeCloseTo(0.1)
  })

  test('sin capa cuando el padre está deshabilitado, aunque haya puntero', async () => {
    const c = await render(
      <div>
        <button type="button" disabled>
          <StateLayer />
          Nativo
        </button>
        <div role="button" aria-disabled="true" tabIndex={0}>
          <StateLayer />
          ARIA
        </div>
      </div>,
    )
    const [native, aria] = c.querySelectorAll('.mk-state-layer')
    await userEvent.hover(c.querySelector('[aria-disabled]') as HTMLElement)
    expect(opacity(aria ?? null)).toBe(0)
    expect(opacity(native ?? null)).toBe(0)
  })

  test('usa el color del contenido y admite color y opacidad propios', async () => {
    const c = await render(
      <div>
        <button type="button" style={{ color: 'rgb(10, 20, 30)' }}>
          <StateLayer />
        </button>
        <span style={{ ['--mk-state-layer-color' as string]: 'rgb(200, 0, 0)', ['--mk-state-layer-opacity' as string]: '0.5' }}>
          <StateLayer />
        </span>
      </div>,
    )
    const [inButton, custom] = c.querySelectorAll('.mk-state-layer')
    expect(style(inButton ?? null).backgroundColor).toBe('rgb(10, 20, 30)')
    expect(style(custom ?? null).backgroundColor).toBe('rgb(200, 0, 0)')
    expect(opacity(custom ?? null)).toBeCloseTo(0.5)
  })
})
