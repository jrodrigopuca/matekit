import { createRef, useState } from 'react'
import { describe, expect, test } from 'vitest'
import { commands, userEvent } from 'vitest/browser'
import { Checkbox } from './Checkbox.tsx'
import { render, roleColor, style } from '../../test/render.tsx'

const input = (c: HTMLElement) => c.querySelector('input') as HTMLInputElement
const box = (c: HTMLElement) => c.querySelector('.mk-checkbox-box') as HTMLElement
const layer = (c: HTMLElement) => c.querySelector('.mk-state-layer') as HTMLElement
const shown = (el: Element | null) => style(el).opacity === '1'
const outlineOf = (c: HTMLElement) => style(box(c)).boxShadow

describe('Checkbox: estructura y accesibilidad', () => {
  test('input nativo dentro de un label, con el texto como etiqueta accesible', async () => {
    const c = await render(<Checkbox name="acepto" value="si">Acepto</Checkbox>)
    const i = input(c)
    expect(i.type).toBe('checkbox')
    expect(i.name).toBe('acepto')
    expect(i.value).toBe('si')
    expect(i.labels?.[0]?.textContent).toBe('Acepto')
    expect(c.querySelector('.mk-checkbox-box')?.getAttribute('aria-hidden')).toBe('true')
  })

  test('className y style van al contenedor; ref apunta al input', async () => {
    const ref = createRef<HTMLInputElement>()
    const c = await render(<Checkbox ref={ref} className="mio" style={{ marginTop: 7 }} />)
    const label = c.querySelector('label') as HTMLLabelElement
    expect(label.className).toBe('mk-checkbox mio')
    expect(label.style.marginTop).toBe('7px')
    expect(ref.current).toBe(input(c))
    expect(c.querySelector('.mk-checkbox-label')).toBeNull()
  })

  test('el área táctil del input mide 48 px y la capa de estado es un círculo de 40', async () => {
    const c = await render(<Checkbox />)
    expect(input(c).getBoundingClientRect().width).toBe(48)
    expect(input(c).getBoundingClientRect().height).toBe(48)
    expect(layer(c).getBoundingClientRect().width).toBe(40)
    expect(style(layer(c)).borderTopLeftRadius).toBe('50%')
    expect(box(c).getBoundingClientRect().width).toBe(18)
  })
})

describe('Checkbox: interacción', () => {
  test('se marca con un clic en la casilla y se desmarca con un clic en la etiqueta', async () => {
    const c = await render(<Checkbox>Recordarme</Checkbox>)
    await userEvent.click(input(c))
    expect(input(c).checked).toBe(true)
    await userEvent.click(c.querySelector('.mk-checkbox-label') as HTMLElement)
    expect(input(c).checked).toBe(false)
  })

  test('se marca con la barra espaciadora tras llegar con Tab', async () => {
    const c = await render(<Checkbox>Teclado</Checkbox>)
    await userEvent.tab()
    expect(document.activeElement).toBe(input(c))
    await userEvent.keyboard(' ')
    expect(input(c).checked).toBe(true)
  })

  test('controlado: refleja el estado del padre', async () => {
    function Controlado() {
      const [on, setOn] = useState(false)
      return (
        <>
          <Checkbox checked={on} onChange={(e) => setOn(e.target.checked)}>Controlado</Checkbox>
          <output>{on ? 'sí' : 'no'}</output>
        </>
      )
    }
    const c = await render(<Controlado />)
    await userEvent.click(input(c))
    expect(c.querySelector('output')?.textContent).toBe('sí')
    expect(input(c).checked).toBe(true)
  })

  test('indeterminate se aplica como propiedad del input y se reaplica al volver a renderizar', async () => {
    function Padre() {
      const [, setN] = useState(0)
      return (
        <>
          <Checkbox indeterminate>Todo</Checkbox>
          <button type="button" onClick={() => setN((n) => n + 1)}>render</button>
        </>
      )
    }
    const c = await render(<Padre />)
    expect(input(c).indeterminate).toBe(true)
    expect(shown(c.querySelector('.mk-checkbox-dash'))).toBe(true)
    expect(shown(c.querySelector('.mk-checkbox-check'))).toBe(false)
    // El navegador quita el estado indeterminado al hacer clic…
    await userEvent.click(input(c))
    expect(input(c).indeterminate).toBe(false)
    // …y como la prop sigue en true, el siguiente render lo vuelve a aplicar.
    await userEvent.click(c.querySelector('button') as HTMLButtonElement)
    expect(input(c).indeterminate).toBe(true)
  })

  test('deshabilitado no cambia con clics', async () => {
    const c = await render(<Checkbox disabled>No</Checkbox>)
    await userEvent.click(c.querySelector('.mk-checkbox-label') as HTMLElement, { force: true })
    expect(input(c).checked).toBe(false)
  })
})

describe('Checkbox: aspecto', () => {
  test('sin marcar: borde de 2 px on-surface-variant, sin relleno, sin icono', async () => {
    const c = await render(<Checkbox />)
    expect(outlineOf(c)).toBe(`${roleColor('on-surface-variant')} 0px 0px 0px 2px inset`)
    expect(style(box(c)).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(style(box(c)).borderTopLeftRadius).toBe('2px')
    expect(shown(c.querySelector('.mk-checkbox-check'))).toBe(false)
  })

  test('marcado: caja primary con la marca en on-primary', async () => {
    const c = await render(<Checkbox defaultChecked />)
    expect(style(box(c)).backgroundColor).toBe(roleColor('primary'))
    expect(style(c.querySelector('.mk-checkbox-icon')).stroke).toBe(roleColor('on-primary'))
    expect(shown(c.querySelector('.mk-checkbox-check'))).toBe(true)
    expect(shown(c.querySelector('.mk-checkbox-dash'))).toBe(false)
  })

  test('hover: borde on-surface y capa on-surface al 8 % sin marcar; primary marcado', async () => {
    const c = await render(
      <div>
        <Checkbox>Uno</Checkbox>
        <Checkbox defaultChecked>Dos</Checkbox>
      </div>,
    )
    const [off, on] = c.querySelectorAll('label') as unknown as HTMLElement[]
    await userEvent.hover(off as HTMLElement)
    expect(outlineOf(off as HTMLElement)).toContain(roleColor('on-surface'))
    expect(Number(style(layer(off as HTMLElement)).opacity)).toBeCloseTo(0.08)
    expect(style(layer(off as HTMLElement)).backgroundColor).toBe(roleColor('on-surface'))
    await userEvent.hover(on as HTMLElement)
    expect(style(layer(on as HTMLElement)).backgroundColor).toBe(roleColor('primary'))
  })

  test('foco de teclado: anillo visible y capa al 10 %', async () => {
    const c = await render(<Checkbox>Foco</Checkbox>)
    await userEvent.tab()
    expect(shown(c.querySelector('.mk-focus-ring'))).toBe(true)
    expect(Number(style(layer(c)).opacity)).toBeCloseTo(0.1)
  })

  test('foco de teclado con el puntero encima: la capa sigue al 10 %', async () => {
    const c = await render(<Checkbox>Foco y hover</Checkbox>)
    await userEvent.tab()
    await userEvent.hover(c.querySelector('.mk-checkbox-control') as HTMLElement)
    expect(Number(style(layer(c)).opacity)).toBeCloseTo(0.1)
  })

  test('al presionar: onda primary si está sin marcar y on-surface si está marcada', async () => {
    const c = await render(
      <div>
        <Checkbox className="a" />
        <Checkbox className="b" defaultChecked />
      </div>,
    )
    await commands.pressDown('.a .mk-checkbox-input')
    expect(style(c.querySelector('.a .mk-ripple-wave')).backgroundColor).toBe(roleColor('primary'))
    await commands.pressUp()
    await commands.pressDown('.b .mk-checkbox-input')
    expect(style(c.querySelector('.b .mk-ripple-wave')).backgroundColor).toBe(roleColor('on-surface'))
    await commands.pressUp()
  })

  test('error: aria-invalid, borde error y, marcado, caja error con icono on-error', async () => {
    const c = await render(
      <div>
        <Checkbox error className="a" />
        <Checkbox error defaultChecked className="b" />
      </div>,
    )
    const a = c.querySelector('.a') as HTMLElement
    const b = c.querySelector('.b') as HTMLElement
    expect(input(a).getAttribute('aria-invalid')).toBe('true')
    expect(outlineOf(a)).toContain(roleColor('error'))
    expect(style(box(b)).backgroundColor).toBe(roleColor('error'))
    expect(style(b.querySelector('.mk-checkbox-icon')).stroke).toBe(roleColor('on-error'))
  })

  test('deshabilitado: control y etiqueta al 38 %; marcado en on-surface con icono surface, aun con error', async () => {
    const c = await render(<Checkbox disabled defaultChecked error>Off</Checkbox>)
    expect(style(c.querySelector('.mk-checkbox-control')).opacity).toBe('0.38')
    expect(style(c.querySelector('.mk-checkbox-label')).opacity).toBe('0.38')
    expect(style(box(c)).backgroundColor).toBe(roleColor('on-surface'))
    expect(style(c.querySelector('.mk-checkbox-icon')).stroke).toBe(roleColor('surface'))
  })

  test('deshabilitado: sin capa de estado ni onda', async () => {
    const c = await render(<Checkbox disabled>Off</Checkbox>)
    await userEvent.hover(c.querySelector('label') as HTMLElement)
    expect(style(layer(c)).opacity).toBe('0')
    await commands.pressDown('.mk-checkbox-input')
    expect(c.querySelector('.mk-ripple-wave')).toBeNull()
    await commands.pressUp()
  })
})
