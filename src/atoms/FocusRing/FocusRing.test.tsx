import { describe, expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { FocusRing } from './FocusRing.tsx'
import { render, roleColor, style } from '../../test/render.tsx'

const ui = (
  <button type="button" style={{ borderRadius: '20px' }}>
    <FocusRing />
    Texto
  </button>
)

describe('FocusRing', () => {
  test('es un span decorativo, oculto para lectores de pantalla', async () => {
    const c = await render(<FocusRing className="extra" />)
    const ring = c.querySelector('span')
    expect(ring?.getAttribute('aria-hidden')).toBe('true')
    expect(ring?.className).toBe('mk-focus-ring extra')
  })

  test('3 px en secondary, separado 2 px, con el radio del padre', async () => {
    const c = await render(ui)
    const s = style(c.querySelector('.mk-focus-ring'))
    expect(s.outlineWidth).toBe('3px')
    expect(s.outlineStyle).toBe('solid')
    expect(s.outlineColor).toBe(roleColor('secondary'))
    expect(s.outlineOffset).toBe('2px')
    expect(s.borderTopLeftRadius).toBe('20px')
  })

  test('oculto en reposo y visible con foco de teclado', async () => {
    const c = await render(ui)
    const ring = c.querySelector('.mk-focus-ring')
    expect(style(ring).opacity).toBe('0')
    await userEvent.tab()
    expect(style(ring).opacity).toBe('1')
  })

  test('no aparece al enfocar con un clic', async () => {
    const c = await render(ui)
    await userEvent.click(c.querySelector('button') as HTMLButtonElement)
    expect(document.activeElement).toBe(c.querySelector('button'))
    expect(style(c.querySelector('.mk-focus-ring')).opacity).toBe('0')
  })

  test('se puede mostrar desde fuera con --mk-focus-ring-visible', async () => {
    const c = await render(
      <span style={{ ['--mk-focus-ring-visible' as string]: '1' }}>
        <FocusRing />
      </span>,
    )
    expect(style(c.querySelector('.mk-focus-ring')).opacity).toBe('1')
  })
})
