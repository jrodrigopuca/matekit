import { createRef, useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { commands, page, server, userEvent } from 'vitest/browser'
import { Slider, type SliderOwnProps } from './Slider.tsx'
import { normalizeValue } from './slider-shared.tsx'
import { render, roleColor, style, withMotion } from '../../test/render.tsx'

const q = (c: ParentNode, sel: string) => c.querySelector(sel) as HTMLElement
const input = (c: ParentNode) => q(c, '.mk-slider-input') as HTMLInputElement
const handle = (c: ParentNode) => q(c, '.mk-slider-handle')
const segment = (c: ParentNode, name: string) => q(c, `.mk-slider-segment[data-segment="${name}"]`)
const indicator = (c: ParentNode) => q(c, '.mk-slider-value-indicator')
const rect = (el: Element) => el.getBoundingClientRect()
// Firefox, arrastres: pasan con este archivo solo y con --no-file-parallelism, y fallan cuando
// otros archivos de prueba corren en paralelo (comprobado el 2026-11-25, varias veces: ni el primer
// movimiento llega, también en el Slider simple, donde solo actúa el arrastre nativo del range; el
// clic sí funciona). No se encontró la causa (no es la emulación compartida, y traer la página al
// frente o esperar cuadros no cambió nada). Se saltean en Firefox; para revisarlos, quitar el skipIf
// y correr MK_BROWSERS=firefox pnpm exec vitest run src/molecules/Slider --no-file-parallelism
const skipDragInFirefox = server.browser === 'firefox'
const W = 312 // largo del control en las pruebas: el centro del handle va de 6 a 306
const at = (f: number) => 6 + f * (W - 12)

function S(props: Partial<SliderOwnProps> & { className?: string; disabled?: boolean }) {
  return (
    <div style={{ width: W, padding: '60px 0 0' }}>
      <Slider aria-label="Volumen" {...props} />
    </div>
  )
}

/** Centro del handle, en px desde el borde izquierdo del control. */
const handleCenter = (c: ParentNode) => {
  const h = rect(handle(c))
  return h.left + h.width / 2 - rect(q(c, '.mk-slider')).left
}

describe('Slider: estructura y accesibilidad', () => {
  test('un input range nativo con rol slider, nombre por label y valores', async () => {
    const c = await render(<Slider label="Volumen" defaultValue={30} />)
    const el = page.getByRole('slider', { name: 'Volumen' }).element() as HTMLInputElement
    expect(el).toBe(input(c))
    expect(el.type).toBe('range')
    expect(el.min).toBe('0')
    expect(el.max).toBe('100')
    expect(el.step).toBe('1')
    expect(el.value).toBe('30')
    expect(el.getAttribute('aria-label')).toBe('Volumen')
    // Sin formato, el lector anuncia el número, que es lo que muestra el indicador.
    expect(el.hasAttribute('aria-valuetext')).toBe(false)
    expect(el.hasAttribute('aria-orientation')).toBe(false)
    expect(indicator(c).textContent).toBe('30')
    expect(q(c, '.mk-slider-track').getAttribute('aria-hidden')).toBe('true')
    expect(handle(c).getAttribute('aria-hidden')).toBe('true')
  })

  test('nombre por aria-labelledby o aria-label', async () => {
    await render(
      <>
        <span id="t">Brillo</span>
        <Slider aria-labelledby="t" />
        <Slider aria-label="Contraste" />
      </>,
    )
    expect(page.getByRole('slider', { name: 'Brillo' }).element()).toBeTruthy()
    expect(page.getByRole('slider', { name: 'Contraste' }).element()).toBeTruthy()
  })

  test('format: el indicador y aria-valuetext dicen lo mismo (función o Intl.NumberFormat)', async () => {
    const pct = new Intl.NumberFormat('en-US', { style: 'percent' })
    const c = await render(
      <>
        <Slider className="a" label="Opacidad" min={0} max={1} step={0.01} defaultValue={0.25} format={pct} />
        <Slider className="b" label="Temperatura" defaultValue={21} format={(v) => `${v} °C`} />
        <Slider className="c" label="Propio" defaultValue={2} format={(v) => `${v} °C`} aria-valuetext="dos grados" />
      </>,
    )
    expect(input(q(c, '.a')).getAttribute('aria-valuetext')).toBe('25%')
    expect(indicator(q(c, '.a')).textContent).toBe('25%')
    expect(input(q(c, '.b')).getAttribute('aria-valuetext')).toBe('21 °C')
    expect(indicator(q(c, '.b')).textContent).toBe('21 °C')
    expect(input(q(c, '.c')).getAttribute('aria-valuetext')).toBe('dos grados')
  })

  test('className y style van al contenedor; ref y props nativas, al input', async () => {
    const ref = createRef<HTMLInputElement>()
    const onInput = vi.fn()
    const c = await render(
      <Slider
        ref={ref}
        label="Volumen"
        className="mio"
        style={{ marginTop: 7 }}
        id="vol"
        name="volumen"
        form="f"
        aria-describedby="ayuda"
        data-x="1"
        onInput={onInput}
      />,
    )
    const root = q(c, '.mk-slider')
    expect(root.className).toBe('mk-slider mio')
    expect(root.style.marginTop).toBe('7px')
    expect(ref.current).toBe(input(c))
    expect(ref.current?.id).toBe('vol')
    expect(ref.current?.name).toBe('volumen')
    expect(ref.current?.getAttribute('form')).toBe('f')
    expect(ref.current?.getAttribute('aria-describedby')).toBe('ayuda')
    expect(ref.current?.dataset['x']).toBe('1')
    ref.current?.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onInput).toHaveBeenCalled()
  })

  test('vertical: aria-orientation="vertical"', async () => {
    const c = await render(<Slider label="V" orientation="vertical" />)
    expect(input(c).getAttribute('aria-orientation')).toBe('vertical')
  })

  test('el valor se ajusta como el input nativo (paso, mínimo, máximo y punto medio)', async () => {
    const cases: Array<[number | undefined, number, number, number]> = [
      [undefined, 0, 100, 1],
      [33, 0, 100, 10],
      [35, 0, 100, 10],
      [150, 0, 100, 1],
      [-5, 0, 100, 1],
      [0.35, 0, 1, 0.1],
      [99, 0, 100, 7],
      [undefined, -50, 50, 1],
      [undefined, 0, 1, 0.3],
    ]
    for (const [value, min, max, step] of cases) {
      const native = document.createElement('input')
      Object.assign(native, { min: String(min), max: String(max), step: String(step) })
      native.type = 'range'
      if (value !== undefined) native.value = String(value)
      expect(normalizeValue(value, min, max, step), `${value} en [${min}, ${max}] paso ${step}`).toBe(native.valueAsNumber)
    }
  })
})

describe('Slider: valor controlado y no controlado', () => {
  test('no controlado: el valor inicial, el cambio y onValueChange', async () => {
    const onValueChange = vi.fn()
    const c = await render(<S defaultValue={20} onValueChange={onValueChange} />)
    expect(q(c, '.mk-slider').style.getPropertyValue('--_v2')).toBe('0.2')
    input(c).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(input(c).value).toBe('21')
    expect(onValueChange).toHaveBeenLastCalledWith(21, expect.anything())
    expect(indicator(c).textContent).toBe('21')
    expect(q(c, '.mk-slider').style.getPropertyValue('--_v2')).toBe('0.21')
  })

  test('controlado: el valor lo decide el padre', async () => {
    function Controlled() {
      const [v, setV] = useState(10)
      return (
        <>
          <Slider label="Controlado" className="a" value={v} onValueChange={setV} />
          <Slider label="Fijo" className="b" value={50} />
          <output>{v}</output>
        </>
      )
    }
    const c = await render(<Controlled />)
    input(q(c, '.a')).focus()
    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    expect(q(c, 'output').textContent).toBe('12')
    expect(input(q(c, '.a')).value).toBe('12')
    input(q(c, '.b')).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(input(q(c, '.b')).value).toBe('50')
  })

  test('formularios: envía el valor con su name y vuelve al inicial al reiniciar', async () => {
    const c = await render(
      <form>
        <Slider label="Volumen" name="volumen" defaultValue={30} />
      </form>,
    )
    const form = q(c, 'form') as HTMLFormElement
    input(c).focus()
    await userEvent.keyboard('{End}')
    expect(new FormData(form).get('volumen')).toBe('100')
    form.reset()
    await expect.poll(() => indicator(c).textContent).toBe('30')
    expect(new FormData(form).get('volumen')).toBe('30')
    expect(q(c, '.mk-slider').style.getPropertyValue('--_v2')).toBe('0.3')
  })
})

describe('Slider: teclado', () => {
  // Con .focus() (también en WebKit, donde Tab depende de un ajuste de macOS).
  test('flechas, Re Pág y Av Pág (10 %), Inicio y Fin', async () => {
    const c = await render(<S defaultValue={50} />)
    const el = input(c)
    el.focus()
    const seq: string[] = []
    for (const key of ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowDown', 'PageUp', 'PageDown', 'End', 'Home']) {
      await userEvent.keyboard(`{${key}}`)
      seq.push(el.value)
    }
    expect(seq).toEqual(['51', '52', '51', '50', '49', '59', '49', '100', '0'])
  })

  test('con paso: de a un paso', async () => {
    const c = await render(<S step={10} defaultValue={50} ticks />)
    input(c).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(input(c).value).toBe('60')
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(input(c).value).toBe('40')
  })

  test('RTL: el handle va hacia la flecha (derecha baja el valor) en los tres motores', async () => {
    const c = await render(
      <div dir="rtl">
        <S defaultValue={50} />
      </div>,
    )
    input(c).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(input(c).value).toBe('49')
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(input(c).value).toBe('51')
    await userEvent.keyboard('{ArrowUp}')
    expect(input(c).value).toBe('52')
  })

  test('vertical: arriba y derecha suben, abajo e izquierda bajan, en los tres motores', async () => {
    const c = await render(<Slider label="V" orientation="vertical" defaultValue={50} />)
    const el = input(c)
    el.focus()
    const seq: string[] = []
    for (const key of ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowLeft', 'PageUp', 'Home', 'End']) {
      await userEvent.keyboard(`{${key}}`)
      seq.push(el.value)
    }
    expect(seq).toEqual(['51', '52', '51', '50', '49', '59', '0', '100'])
  })

  test('las flechas propias avisan como las nativas: onChange, onValueChange e input/change', async () => {
    const onValueChange = vi.fn()
    const onNativeChange = vi.fn()
    const c = await render(<Slider label="V" orientation="vertical" defaultValue={50} onValueChange={onValueChange} />)
    input(c).addEventListener('change', onNativeChange)
    input(c).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onValueChange).toHaveBeenLastCalledWith(51, expect.anything())
    expect(onNativeChange).toHaveBeenCalledTimes(1)
    await userEvent.keyboard('{End}{ArrowRight}')
    expect(input(c).value).toBe('100')
  })
})

describe('Slider: puntero', () => {
  test('un clic en la pista lleva el handle al punto (centro de 6 a L − 6)', async () => {
    const c = await render(<S className="p" defaultValue={50} />)
    for (const [x, v] of [
      [at(0.25), '25'],
      [at(0.8), '80'],
      [2, '0'],
      [W - 1, '100'],
    ] as const) {
      await commands.pressAt('.p .mk-slider-input', x, 24)
      await commands.pressUp()
      expect(input(c).value).toBe(v)
    }
    expect(handleCenter(c)).toBeCloseTo(at(1), 1)
  })

  test.skipIf(skipDragInFirefox)('arrastre: el valor sigue al puntero y no pasa de los extremos', async () => {
    const onValueChange = vi.fn()
    const c = await render(<S className="p" defaultValue={50} onValueChange={onValueChange} />)
    await commands.dragThrough('.p .mk-slider-input', [[at(0.5), 24], [at(0.6), 24], [at(0.7), 30]])
        await expect.poll(() => input(c).value).toBe('70')
    expect(handleCenter(c)).toBeCloseTo(at(0.7), 1)
    await commands.pressUp()
    await commands.dragThrough('.p .mk-slider-input', [[at(0.7), 24], [at(0.9), 24], [W - 2, 24]])
    await expect.poll(() => input(c).value).toBe('100')
    await commands.pressUp()
    expect(onValueChange).toHaveBeenLastCalledWith(100, expect.anything())
  })

  test('al soltar, el input queda enfocado (WebKit no lo enfoca solo) sin anillo de foco', async () => {
    const c = await render(<S className="p" defaultValue={50} />)
    await commands.pressAt('.p .mk-slider-input', at(0.3), 24)
    await commands.pressUp()
    await expect.poll(() => document.activeElement).toBe(input(c))
    expect(style(q(c, '.mk-focus-ring')).opacity).toBe('0')
    await userEvent.keyboard('{ArrowRight}')
    expect(input(c).value).toBe('31')
  })

  test('vertical: el mínimo abajo', async () => {
    const c = await render(<Slider className="p" label="V" orientation="vertical" style={{ height: W }} defaultValue={50} />)
    await commands.pressAt('.p .mk-slider-input', 24, W - at(0.25))
    await commands.pressUp()
    expect(input(c).value).toBe('25')
    const root = rect(q(c, '.mk-slider'))
    expect(root.height).toBeCloseTo(W, 2)
    expect(root.width).toBeCloseTo(48, 2)
    const h = rect(handle(c))
    expect(h.height).toBeCloseTo(4, 2)
    expect(h.width).toBeCloseTo(44, 2)
    expect(root.bottom - (h.top + h.height / 2)).toBeCloseTo(at(0.25), 1)
  })

  test('RTL: el mínimo a la derecha', async () => {
    const c = await render(
      <div dir="rtl">
        <S className="p" defaultValue={50} />
      </div>,
    )
    await commands.pressAt('.p .mk-slider-input', at(0.25), 24)
    await commands.pressUp()
    expect(input(c).value).toBe('75')
    const root = rect(q(c, '.mk-slider'))
    expect(root.right - (rect(handle(c)).left + 2)).toBeCloseTo(at(0.75), 1)
    // La pista activa sale de la derecha.
    expect(rect(segment(c, 'active')).right).toBeCloseTo(root.right, 1)
  })
})

describe('Slider: medidas del kit', () => {
  const SIZES = [
    ['xs', 16, 8, 44],
    ['sm', 24, 8, 44],
    ['md', 40, 12, 52],
    ['lg', 56, 16, 68],
    ['xl', 96, 28, 108],
  ] as const
  for (const [size, track, radius, height] of SIZES) {
    test(`${size}: pista de ${track} con radio ${radius} y 2 junto al handle, handle de 4 × ${height}, separación de 6`, async () => {
      const c = await render(<S size={size} defaultValue={50} />)
      const root = rect(q(c, '.mk-slider'))
      expect(root.width).toBeCloseTo(W, 2)
      expect(root.height).toBeCloseTo(Math.max(48, height), 2)
      const h = rect(handle(c))
      expect(h.width).toBeCloseTo(4, 2)
      expect(h.height).toBeCloseTo(height, 2)
      expect(h.top - root.top).toBeCloseTo((root.height - height) / 2, 2)
      expect(style(handle(c)).borderTopLeftRadius).toBe('2px')
      const active = segment(c, 'active')
      const inactive = segment(c, 'inactive-end')
      for (const seg of [active, inactive]) {
        expect(rect(seg).height).toBeCloseTo(track, 2)
        expect(rect(seg).top - root.top).toBeCloseTo((root.height - track) / 2, 2)
      }
      expect(rect(active).left).toBeCloseTo(root.left, 2)
      expect(h.left - rect(active).right).toBeCloseTo(6, 2)
      expect(rect(inactive).left - h.right).toBeCloseTo(6, 2)
      expect(rect(inactive).right).toBeCloseTo(root.right, 2)
      expect(style(active).borderTopLeftRadius).toBe(`${radius}px`)
      expect(style(active).borderTopRightRadius).toBe('2px')
      expect(style(inactive).borderTopLeftRadius).toBe('2px')
      expect(style(inactive).borderBottomRightRadius).toBe(`${radius}px`)
      // Punto de parada: 4 × 4, centrado en el alto, a 4 del final.
      const stop = q(inactive, '.mk-slider-mark:last-child')
      expect(rect(stop).width).toBeCloseTo(4, 2)
      expect(root.right - rect(stop).right).toBeCloseTo(4, 2)
      expect(rect(stop).top + 2).toBeCloseTo(rect(inactive).top + track / 2, 2)
    })
  }

  test('valor 0: sin pista activa y el handle a 4 del inicio; valor 100: sin pista inactiva, a 4 del final', async () => {
    const c = await render(
      <>
        <S className="a" defaultValue={0} />
        <S className="b" defaultValue={100} />
      </>,
    )
    const a = q(c, '.a')
    expect(rect(handle(a)).left - rect(a).left).toBeCloseTo(4, 2)
    expect(rect(segment(a, 'active')).width).toBe(0)
    const b = q(c, '.b')
    expect(rect(b).right - rect(handle(b)).right).toBeCloseTo(4, 2)
    expect(rect(segment(b, 'inactive-end')).width).toBe(0)
  })

  test('presionado: el handle pasa a 2 y las pistas crecen 1 de cada lado (separación de 6); aparece el indicador', async () => {
    const c = await render(<S className="p" defaultValue={50} />)
    expect(style(indicator(c)).opacity).toBe('0')
    await commands.pressAt('.p .mk-slider-input', at(0.5), 24)
    await expect.poll(() => rect(handle(c)).width).toBeCloseTo(2, 1)
    const h = rect(handle(c))
    expect(h.left - rect(segment(c, 'active')).right).toBeCloseTo(6, 1)
    expect(rect(segment(c, 'inactive-end')).left - h.right).toBeCloseTo(6, 1)
    expect(style(indicator(c)).opacity).toBe('1')
    await commands.pressUp()
    await expect.poll(() => rect(handle(c)).width).toBeCloseTo(4, 1)
  })

  test('indicador de valor: píldora de 44 de alto (mínimo 48 de ancho), Label Large, a 4 sobre el handle', async () => {
    const c = await render(<S className="p" defaultValue={50} />)
    await commands.pressAt('.p .mk-slider-input', at(0.5), 24)
    await expect.poll(() => style(indicator(c)).opacity).toBe('1')
    const i = rect(indicator(c))
    const h = rect(handle(c))
    expect(i.height).toBeCloseTo(44, 2)
    expect(i.width).toBeGreaterThanOrEqual(48)
    expect(h.top - i.bottom).toBeCloseTo(4, 2)
    expect(i.left + i.width / 2).toBeCloseTo(h.left + h.width / 2, 1)
    const s = style(indicator(c))
    expect(s.paddingTop).toBe('12px')
    expect(s.paddingLeft).toBe('16px')
    expect(s.fontSize).toBe('14px')
    expect(s.lineHeight).toBe('20px')
    expect(s.backgroundColor).toBe(roleColor('inverse-surface'))
    expect(s.color).toBe(roleColor('inverse-on-surface'))
    await commands.pressUp()
  })

  test('foco de teclado: handle de 2, anillo, indicador y 4 más de separación (InsetRing de Compose)', async () => {
    const c = await render(<S defaultValue={50} />)
    await userEvent.tab()
    expect(document.activeElement).toBe(input(c))
    await expect.poll(() => rect(handle(c)).width).toBeCloseTo(2, 1)
    const h = rect(handle(c))
    expect(h.left - rect(segment(c, 'active')).right).toBeCloseTo(10, 1)
    expect(rect(segment(c, 'inactive-end')).left - h.right).toBeCloseTo(10, 1)
    const ring = style(q(c, '.mk-focus-ring'))
    expect(ring.opacity).toBe('1')
    expect(ring.outlineColor).toBe(roleColor('secondary'))
    expect(style(indicator(c)).opacity).toBe('1')
    expect(h.top - rect(indicator(c)).bottom).toBeCloseTo(8, 1)
  })

  test('pasos: un punto por paso, en el mismo lugar que el handle, y ninguno en la separación del handle', async () => {
    const c = await render(<S step={25} ticks defaultValue={50} />)
    const marks = [...c.querySelectorAll('[data-segment="active"] .mk-slider-mark')]
    expect(marks).toHaveLength(5)
    const left = rect(q(c, '.mk-slider')).left
    marks.forEach((m, k) => expect(rect(m).left + 2 - left).toBeCloseTo(at(k / 4), 1))
    // El del valor 50 queda bajo el handle: ningún tramo lo muestra.
    const visible = (m: Element) => {
      const seg = rect(m.closest('.mk-slider-segment') as Element)
      const r = rect(m)
      return r.left >= seg.left && r.right <= seg.right && seg.width > 0
    }
    const all = [...c.querySelectorAll('.mk-slider-mark')]
    expect(all.filter(visible).map((m) => Math.round(rect(m).left + 2 - left))).toEqual([6, 81, 231, 306])
  })

  test('centered: activa del centro al valor, con 4 de separación en el centro y puntos en los dos extremos', async () => {
    const c = await render(
      <>
        <S className="pos" centered min={-50} max={50} defaultValue={25} />
        <S className="neg" centered min={-50} max={50} defaultValue={-25} />
      </>,
    )
    const pos = q(c, '.pos')
    const root = rect(pos)
    const center = root.left + W / 2
    expect(rect(segment(pos, 'active')).left).toBeCloseTo(center, 1)
    expect(rect(segment(pos, 'inactive-start')).right).toBeCloseTo(center - 4, 1)
    expect(rect(handle(pos)).left - rect(segment(pos, 'active')).right).toBeCloseTo(6, 1)
    expect(style(segment(pos, 'active')).borderTopLeftRadius).toBe('2px')
    expect(style(segment(pos, 'inactive-start')).borderTopLeftRadius).toBe('8px')
    const startStop = q(segment(pos, 'inactive-start'), '.mk-slider-mark')
    expect(rect(startStop).left - root.left).toBeCloseTo(4, 1)
    const neg = q(c, '.neg')
    expect(rect(segment(neg, 'active')).right).toBeCloseTo(center, 1)
    expect(rect(segment(neg, 'active')).left - rect(handle(neg)).right).toBeCloseTo(6, 1)
    expect(rect(segment(neg, 'inactive-end')).left).toBeCloseTo(center + 4, 1)
  })
})

describe('Slider: colores', () => {
  test('pista activa primary, inactiva secondary-container, handle primary, pasos on-primary y on-secondary-container', async () => {
    const c = await render(<S step={25} ticks defaultValue={50} />)
    expect(style(segment(c, 'active')).backgroundColor).toBe(roleColor('primary'))
    expect(style(segment(c, 'inactive-end')).backgroundColor).toBe(roleColor('secondary-container'))
    expect(style(handle(c)).backgroundColor).toBe(roleColor('primary'))
    expect(style(q(segment(c, 'active'), '.mk-slider-mark')).backgroundColor).toBe(roleColor('on-primary'))
    expect(style(q(segment(c, 'inactive-end'), '.mk-slider-mark')).backgroundColor).toBe(roleColor('on-secondary-container'))
  })

  test('hover: capa on-primary al 8 % sobre el handle; presionado, al 10 %', async () => {
    const c = await render(<S className="p" defaultValue={50} />)
    const layer = q(handle(c), '.mk-state-layer')
    expect(style(layer).backgroundColor).toBe(roleColor('on-primary'))
    expect(Number(style(layer).opacity)).toBe(0)
    await commands.moveTo('.p .mk-slider-input', at(0.2), 24)
    expect(Number(style(layer).opacity)).toBeCloseTo(0.08)
    await commands.pressAt('.p .mk-slider-input', at(0.2), 24)
    expect(Number(style(layer).opacity)).toBeCloseTo(0.1)
    await commands.pressUp()
  })

  test('deshabilitado: on-surface al 38 % (activa, handle y punto) y al 10 % (inactiva), sin capa ni indicador', async () => {
    const c = await render(<S className="p" step={25} ticks defaultValue={50} disabled />)
    expect(input(c).disabled).toBe(true)
    const mix = (p: number) => {
      const probe = document.createElement('span')
      probe.style.color = `color-mix(in srgb, var(--md-sys-color-on-surface) ${p}%, transparent)`
      document.body.append(probe)
      const value = getComputedStyle(probe).color
      probe.remove()
      return value
    }
    expect(style(segment(c, 'active')).backgroundColor).toBe(mix(38))
    expect(style(handle(c)).backgroundColor).toBe(mix(38))
    expect(style(segment(c, 'inactive-end')).backgroundColor).toBe(mix(10))
    expect(style(q(segment(c, 'inactive-end'), '.mk-slider-mark')).backgroundColor).toBe(mix(38))
    expect(style(q(segment(c, 'active'), '.mk-slider-mark')).backgroundColor).toBe(roleColor('inverse-on-surface'))
    await commands.pressAt('.p .mk-slider-input', at(0.2), 24)
    expect(input(c).value).toBe('50')
    expect(Number(style(q(handle(c), '.mk-state-layer')).opacity)).toBe(0)
    expect(style(indicator(c)).opacity).toBe('0')
    expect(rect(handle(c)).width).toBeCloseTo(4, 2)
    await commands.pressUp()
  })
})

describe('Slider: movimiento', () => {
  test('el handle se angosta y el indicador aparece con los resortes; la posición no se anima', async () => {
    const c = await render(<S defaultValue={50} />)
    withMotion(() => {
      const root = style(q(c, '.mk-slider'))
      expect(root.transitionProperty).toContain('--_sl-w2')
      const token = parseFloat(style(document.documentElement).getPropertyValue('--md-sys-motion-spring-fast-spatial-duration'))
      expect(parseFloat(root.transitionDuration.split(', ')[0] ?? '') * 1000).toBeCloseTo(token)
      expect(style(handle(c)).transitionProperty).toBe('background-color')
      expect(style(indicator(c)).transitionProperty).toBe('opacity, scale')
    })
  })

  test('con movimiento reducido, sin desplazamientos: el ancho y la escala del indicador cambian sin transición', async () => {
    await commands.reduceMotion(true)
    try {
      const c = await render(<S defaultValue={50} />)
      withMotion(() => {
        expect(style(q(c, '.mk-slider')).transitionDuration.split(', ').every((d) => d === '0s')).toBe(true)
        const [opacity, scale] = style(indicator(c)).transitionDuration.split(', ')
        expect(scale).toBe('0s')
        expect(opacity).not.toBe('0s')
      })
    } finally {
      await commands.reduceMotion(false)
    }
  })
})
