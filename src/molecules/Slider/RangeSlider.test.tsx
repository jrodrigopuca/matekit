import { createRef, useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { commands, page, server, userEvent } from 'vitest/browser'
import { RangeSlider, RangeSliderEnd, RangeSliderStart, type RangeSliderProps, type RangeSliderValue } from './RangeSlider.tsx'
import { render, roleColor, style } from '../../test/render.tsx'

const q = (c: ParentNode, sel: string) => c.querySelector(sel) as HTMLElement
const start = (c: ParentNode) => q(c, '[data-thumb="start"]') as HTMLInputElement
const end = (c: ParentNode) => q(c, '[data-thumb="end"]') as HTMLInputElement
const handles = (c: ParentNode) => [...c.querySelectorAll('.mk-slider-handle')] as HTMLElement[]
const segment = (c: ParentNode, name: string) => q(c, `.mk-slider-segment[data-segment="${name}"]`)
const rect = (el: Element) => el.getBoundingClientRect()
// Firefox, arrastres: pasan con este archivo solo y con --no-file-parallelism, y fallan cuando
// otros archivos de prueba corren en paralelo (comprobado el 2026-11-25, varias veces: ni el primer
// movimiento llega, también en el Slider simple, donde solo actúa el arrastre nativo del range; el
// clic sí funciona). No se encontró la causa (no es la emulación compartida, y traer la página al
// frente o esperar cuadros no cambió nada). Se saltean en Firefox; para revisarlos, quitar el skipIf
// y correr MK_BROWSERS=firefox pnpm exec vitest run src/molecules/Slider --no-file-parallelism
const skipDragInFirefox = server.browser === 'firefox'
const W = 312
const at = (f: number) => 6 + f * (W - 12)

function R(props: Partial<RangeSliderProps>) {
  return (
    <div style={{ width: W, paddingTop: 60 }}>
      <RangeSlider className="r" {...props}>
        <RangeSliderStart label="Mínimo" name="desde" />
        <RangeSliderEnd label="Máximo" name="hasta" />
      </RangeSlider>
    </div>
  )
}

describe('RangeSlider: estructura y accesibilidad', () => {
  test('dos sliders nativos, cada uno con su nombre; el contenedor con nombre es un grupo', async () => {
    const c = await render(<R defaultValue={[20, 80]} aria-label="Precio" />)
    expect(page.getByRole('group', { name: 'Precio' }).element()).toBe(q(c, '.mk-slider'))
    const min = page.getByRole('slider', { name: 'Mínimo' }).element() as HTMLInputElement
    const max = page.getByRole('slider', { name: 'Máximo' }).element() as HTMLInputElement
    expect(min).toBe(start(c))
    expect(max).toBe(end(c))
    expect([min.type, min.value, min.min, min.max, min.name]).toEqual(['range', '20', '0', '100', 'desde'])
    expect([max.value, max.name]).toEqual(['80', 'hasta'])
    expect(handles(c)).toHaveLength(2)
    expect(q(c, '.mk-slider').dataset['variant']).toBe('range')
  })

  test('sin nombre propio el contenedor no es un grupo', async () => {
    const c = await render(<R />)
    expect(q(c, '.mk-slider').hasAttribute('role')).toBe(false)
    // Sin valores: un tercio y dos tercios.
    expect([start(c).value, end(c).value]).toEqual(['33', '67'])
  })

  test('format y aria-valuetext por handle', async () => {
    const c = await render(<R defaultValue={[10, 90]} format={(v) => `$${v}`} />)
    expect(start(c).getAttribute('aria-valuetext')).toBe('$10')
    expect(end(c).getAttribute('aria-valuetext')).toBe('$90')
    expect(handles(c).map((h) => h.textContent)).toEqual(['$10', '$90'])
  })

  test('props nativas y ref: el contenedor y cada input', async () => {
    const root = createRef<HTMLDivElement>()
    const a = createRef<HTMLInputElement>()
    const b = createRef<HTMLInputElement>()
    const c = await render(
      <RangeSlider ref={root} id="rango" className="mio" style={{ marginTop: 3 }} data-x="1">
        <RangeSliderStart ref={a} aria-label="Desde" id="desde" aria-describedby="ayuda" />
        <RangeSliderEnd ref={b} aria-label="Hasta" disabled />
      </RangeSlider>,
    )
    expect(root.current).toBe(q(c, '.mk-slider'))
    expect(root.current?.id).toBe('rango')
    expect(root.current?.className).toBe('mk-slider mio')
    expect(root.current?.style.marginTop).toBe('3px')
    expect(root.current?.dataset['x']).toBe('1')
    expect(a.current).toBe(start(c))
    expect(a.current?.id).toBe('desde')
    expect(a.current?.getAttribute('aria-describedby')).toBe('ayuda')
    expect(b.current).toBe(end(c))
    expect(b.current?.disabled).toBe(true)
  })

  test('las partes fuera de un RangeSlider avisan', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(render(<RangeSliderStart aria-label="Suelto" />)).rejects.toThrow('va dentro de un RangeSlider')
    error.mockRestore()
  })
})

describe('RangeSlider: valores', () => {
  test('controlado: onValueChange con los dos valores', async () => {
    function Controlled() {
      const [v, setV] = useState<RangeSliderValue>([20, 60])
      return (
        <>
          <R value={v} onValueChange={setV} />
          <output>{v.join('-')}</output>
        </>
      )
    }
    const c = await render(<Controlled />)
    start(c).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(q(c, 'output').textContent).toBe('21-60')
    end(c).focus()
    await userEvent.keyboard('{PageUp}')
    expect(q(c, 'output').textContent).toBe('21-70')
    expect(q(c, '.mk-slider').style.getPropertyValue('--_v1')).toBe('0.21')
    expect(q(c, '.mk-slider').style.getPropertyValue('--_v2')).toBe('0.7')
  })

  test('formularios: un valor por name; reiniciar vuelve a los iniciales', async () => {
    const c = await render(
      <form>
        <R defaultValue={[20, 80]} />
      </form>,
    )
    const form = q(c, 'form') as HTMLFormElement
    start(c).focus()
    await userEvent.keyboard('{PageUp}')
    expect([...new FormData(form).entries()]).toEqual([
      ['desde', '30'],
      ['hasta', '80'],
    ])
    form.reset()
    await expect.poll(() => start(c).value).toBe('20')
    expect(q(c, '.mk-slider').style.getPropertyValue('--_v1')).toBe('0.2')
  })
})

describe('RangeSlider: los handles no se cruzan', () => {
  test('teclado: el inicio no pasa del fin ni el fin del inicio (también con Inicio y Fin)', async () => {
    const onValueChange = vi.fn()
    const c = await render(<R defaultValue={[40, 50]} onValueChange={onValueChange} />)
    start(c).focus()
    await userEvent.keyboard('{End}')
    expect(start(c).value).toBe('50')
    expect(onValueChange).toHaveBeenLastCalledWith([50, 50], expect.anything())
    await userEvent.keyboard('{ArrowRight}')
    expect(start(c).value).toBe('50')
    end(c).focus()
    await userEvent.keyboard('{Home}')
    expect(end(c).value).toBe('50')
    await userEvent.keyboard('{ArrowRight}')
    expect(end(c).value).toBe('51')
  })

  test('puntero: cada lado del punto medio mueve a su handle', async () => {
    const c = await render(<R defaultValue={[30, 70]} />)
    await commands.pressAt('.r [data-thumb="start"]', at(0.1), 24)
    await commands.pressUp()
    expect([start(c).value, end(c).value]).toEqual(['10', '70'])
    await commands.pressAt('.r [data-thumb="start"]', at(0.9), 24)
    await commands.pressUp()
    expect([start(c).value, end(c).value]).toEqual(['10', '90'])
    // Justo a la izquierda del punto medio (50) le toca al inicio.
    await commands.pressAt('.r [data-thumb="start"]', at(0.48), 24)
    await commands.pressUp()
    expect([start(c).value, end(c).value]).toEqual(['48', '90'])
  })

  test.skipIf(skipDragInFirefox)('arrastre: el inicio se queda en el fin aunque el puntero siga', async () => {
    const c = await render(<R defaultValue={[30, 60]} />)
    await commands.dragThrough('.r [data-thumb="start"]', [[at(0.3), 24], [at(0.5), 24], [at(0.8), 24]])
    await expect.poll(() => [start(c).value, end(c).value]).toEqual(['60', '60'])
    const [a, b] = handles(c).map((h) => rect(h).left + rect(h).width / 2)
    expect(a).toBeCloseTo(b ?? 0, 1)
    await commands.pressUp()
  })

  test.skipIf(skipDragInFirefox)('con los dos iguales, arrastrar hacia el lado del otro mueve al otro, que queda enfocado', async () => {
    const c = await render(<R defaultValue={[50, 50]} />)
    // A la izquierda del punto común: el input del inicio recibe el puntero.
    await commands.dragThrough('.r [data-thumb="start"]', [[at(0.5) - 2, 24], [at(0.6), 24], [at(0.7), 24]])
    await expect.poll(() => [start(c).value, end(c).value]).toEqual(['50', '70'])
    await commands.pressUp()
    await expect.poll(() => document.activeElement).toBe(end(c))
  })

  test('vertical: el inicio abajo; RTL: el inicio a la derecha', async () => {
    const c = await render(
      <>
        <RangeSlider className="v" orientation="vertical" style={{ height: W }} defaultValue={[30, 70]}>
          <RangeSliderStart aria-label="Desde" />
          <RangeSliderEnd aria-label="Hasta" />
        </RangeSlider>
        <div dir="rtl" style={{ width: W }}>
          <RangeSlider className="rtl" defaultValue={[30, 70]}>
            <RangeSliderStart aria-label="Desde" />
            <RangeSliderEnd aria-label="Hasta" />
          </RangeSlider>
        </div>
      </>,
    )
    const v = q(c, '.v')
    await commands.pressAt('.v [data-thumb="start"]', 24, W - at(0.1))
    await commands.pressUp()
    expect([start(v).value, end(v).value]).toEqual(['10', '70'])
    await commands.pressAt('.v [data-thumb="start"]', 24, W - at(0.9))
    await commands.pressUp()
    expect([start(v).value, end(v).value]).toEqual(['10', '90'])
    const rtl = q(c, '.rtl')
    await commands.pressAt('.rtl [data-thumb="start"]', W - at(0.1), 24)
    await commands.pressUp()
    expect([start(rtl).value, end(rtl).value]).toEqual(['10', '70'])
    await commands.pressAt('.rtl [data-thumb="start"]', W - at(0.9), 24)
    await commands.pressUp()
    expect([start(rtl).value, end(rtl).value]).toEqual(['10', '90'])
  })
})

describe('RangeSlider: medidas y colores', () => {
  test('pista activa entre los handles, separación de 6, radio 2 adentro y puntos en los dos extremos', async () => {
    const c = await render(<R defaultValue={[25, 75]} />)
    const root = rect(q(c, '.mk-slider'))
    const [a, b] = handles(c).map(rect) as [DOMRect, DOMRect]
    expect(a.left + 2 - root.left).toBeCloseTo(at(0.25), 1)
    expect(b.left + 2 - root.left).toBeCloseTo(at(0.75), 1)
    expect(a.left - rect(segment(c, 'inactive-start')).right).toBeCloseTo(6, 1)
    expect(rect(segment(c, 'active')).left - a.right).toBeCloseTo(6, 1)
    expect(b.left - rect(segment(c, 'active')).right).toBeCloseTo(6, 1)
    expect(rect(segment(c, 'inactive-end')).left - b.right).toBeCloseTo(6, 1)
    const active = style(segment(c, 'active'))
    expect([active.borderTopLeftRadius, active.borderTopRightRadius]).toEqual(['2px', '2px'])
    expect(style(segment(c, 'inactive-start')).borderTopLeftRadius).toBe('8px')
    expect(active.backgroundColor).toBe(roleColor('primary'))
    expect(style(segment(c, 'inactive-start')).backgroundColor).toBe(roleColor('secondary-container'))
    const startStop = q(segment(c, 'inactive-start'), '.mk-slider-mark')
    expect(rect(startStop).left - root.left).toBeCloseTo(4, 1)
    expect(style(startStop).backgroundColor).toBe(roleColor('on-secondary-container'))
  })

  test('presionar un handle angosta solo ese', async () => {
    const c = await render(<R defaultValue={[25, 75]} />)
    await commands.pressAt('.r [data-thumb="end"]', at(0.75), 24)
    await expect.poll(() => rect(handles(c)[1] as HTMLElement).width).toBeCloseTo(2, 1)
    expect(rect(handles(c)[0] as HTMLElement).width).toBeCloseTo(4, 2)
    expect(style(q(handles(c)[1] as HTMLElement, '.mk-slider-value-indicator')).opacity).toBe('1')
    expect(style(q(handles(c)[0] as HTMLElement, '.mk-slider-value-indicator')).opacity).toBe('0')
    await commands.pressUp()
  })

  test('deshabilitado: los dos inputs y la pista apagada', async () => {
    const c = await render(<R defaultValue={[25, 75]} disabled />)
    expect(start(c).disabled).toBe(true)
    expect(end(c).disabled).toBe(true)
    expect(style(segment(c, 'active')).backgroundColor).not.toBe(roleColor('primary'))
    expect(style(handles(c)[0] as HTMLElement).backgroundColor).toBe(style(handles(c)[1] as HTMLElement).backgroundColor)
  })
})
