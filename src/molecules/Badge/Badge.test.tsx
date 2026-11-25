import { createRef } from 'react'
import { describe, expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { render, roleColor, style } from '../../test/render.tsx'
import { Badge } from './Badge.tsx'

const badge = (c: HTMLElement) => c.querySelector('.mk-badge') as HTMLElement
const rect = (el: Element) => el.getBoundingClientRect()

describe('Badge', () => {
  test('sin hijos es la pequeña: punto de 6 en error', async () => {
    const c = await render(<Badge label="Novedades" />)
    const b = badge(c)
    expect(b.dataset['size']).toBe('small')
    expect([rect(b).width, rect(b).height]).toEqual([6, 6])
    expect(style(b).backgroundColor).toBe(roleColor('error'))
    expect(style(b).borderRadius).toBe('9999px')
  })

  test('con hijos es la grande: 16 de alto, ancho mínimo 16, relleno 4, Label Small on-error', async () => {
    const c = await render(
      <div>
        <Badge label="3 nuevos" className="one">3</Badge>
        <Badge label="Más de 99" className="many">99+</Badge>
      </div>,
    )
    const one = c.querySelector('.one') as HTMLElement
    const many = c.querySelector('.many') as HTMLElement
    expect(one.dataset['size']).toBe('large')
    expect(rect(one).height).toBe(16)
    expect(rect(one).width).toBe(16)
    expect(style(many).paddingLeft).toBe('4px')
    expect(rect(many).width).toBeGreaterThan(16)
    expect(style(one).color).toBe(roleColor('on-error'))
    expect(style(one).fontSize).toBe('11px')
    expect(style(one).lineHeight).toBe('16px')
  })

  test('lo que se anuncia es label; el número visible queda oculto', async () => {
    const c = await render(
      <button type="button">
        Correo
        <Badge label="3 mensajes nuevos">3</Badge>
      </button>,
    )
    await expect.element(page.getByRole('button')).toHaveAccessibleName('Correo 3 mensajes nuevos')
    const visible = badge(c).firstElementChild as HTMLElement
    expect(visible.getAttribute('aria-hidden')).toBe('true')
    expect(visible.textContent).toBe('3')
    // El texto oculto no ocupa lugar ni se ve.
    const hidden = c.querySelector('.mk-badge-label') as HTMLElement
    expect(rect(hidden).width).toBeLessThanOrEqual(1)
  })

  test('con label vacío queda decorativa', async () => {
    const c = await render(
      <button type="button">
        Correo
        <Badge label="">3</Badge>
      </button>,
    )
    expect(badge(c).getAttribute('aria-hidden')).toBe('true')
    expect(c.querySelector('.mk-badge-label')).toBeNull()
    await expect.element(page.getByRole('button')).toHaveAccessibleName('Correo')
  })

  test('ref, className, style y props nativas llegan al <span>', async () => {
    const ref = createRef<HTMLSpanElement>()
    const c = await render(<Badge ref={ref} label="x" className="mia" style={{ marginTop: 2 }} id="b1" />)
    const b = badge(c)
    expect(ref.current).toBe(b)
    expect(b.className).toBe('mk-badge mia')
    expect(b.style.marginTop).toBe('2px')
    expect(b.id).toBe('b1')
  })
})
