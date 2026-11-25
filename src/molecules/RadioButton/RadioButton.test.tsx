import { createRef, useState, type ChangeEvent } from 'react'
import { afterEach, describe, expect, test } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'
import { RadioButton } from './RadioButton.tsx'
import { RadioGroup, RadioGroupLabel } from './RadioGroup.tsx'
import { render, roleColor, style, withMotion } from '../../test/render.tsx'

const q = (c: ParentNode, sel: string) => c.querySelector(sel) as HTMLElement
const inputs = (c: ParentNode) => [...c.querySelectorAll('input')] as HTMLInputElement[]
const ring = (c: ParentNode) => q(c, '.mk-radio-button-ring')
const dot = (c: ParentNode) => q(c, '.mk-radio-button-dot')
const layer = (c: ParentNode) => q(c, '.mk-state-layer')
const rect = (el: Element) => el.getBoundingClientRect()

function Envio(props: { disabled?: boolean; middleDisabled?: boolean }) {
  return (
    <RadioGroup disabled={props.disabled}>
      <RadioGroupLabel>Envío</RadioGroupLabel>
      <RadioButton name="envio" value="retiro" className="a">Retiro</RadioButton>
      <RadioButton name="envio" value="domicilio" className="b" disabled={props.middleDisabled}>A domicilio</RadioButton>
      <RadioButton name="envio" value="correo" className="c">Correo</RadioButton>
    </RadioGroup>
  )
}

describe('RadioButton: estructura y accesibilidad', () => {
  test('input radio nativo dentro de un label, con el texto como nombre accesible', async () => {
    const c = await render(<RadioButton name="talle" value="m">Mediano</RadioButton>)
    const i = page.getByRole('radio', { name: 'Mediano' }).element() as HTMLInputElement
    expect(i).toBe(inputs(c)[0])
    expect(i.type).toBe('radio')
    expect(i.name).toBe('talle')
    expect(i.value).toBe('m')
    expect(ring(c).getAttribute('aria-hidden')).toBe('true')
  })

  test('el grupo es un fieldset con rol radiogroup y el legend como nombre', async () => {
    const c = await render(<Envio />)
    const group = page.getByRole('radiogroup', { name: 'Envío' }).element()
    expect(group.tagName).toBe('FIELDSET')
    expect(group).toBe(q(c, '.mk-radio-group'))
    expect(q(c, 'legend').className).toBe('mk-radio-group-label')
    expect(page.getByRole('radio').elements()).toHaveLength(3)
  })

  test('el grupo acepta aria-label en lugar del legend', async () => {
    await render(
      <RadioGroup aria-label="Talle">
        <RadioButton name="t" value="s">Chico</RadioButton>
      </RadioGroup>,
    )
    expect(page.getByRole('radiogroup', { name: 'Talle' }).element().tagName).toBe('FIELDSET')
  })

  test('className y style van al label; ref y props nativas, al input', async () => {
    const ref = createRef<HTMLInputElement>()
    const c = await render(
      <RadioButton ref={ref} className="mio" style={{ marginTop: 7 }} id="r1" required aria-describedby="x" />,
    )
    const label = q(c, 'label')
    expect(label.className).toBe('mk-radio-button mio')
    expect(label.style.marginTop).toBe('7px')
    expect(ref.current).toBe(inputs(c)[0])
    expect(ref.current?.id).toBe('r1')
    expect(ref.current?.required).toBe(true)
    expect(ref.current?.getAttribute('aria-describedby')).toBe('x')
    expect(c.querySelector('.mk-radio-button-label')).toBeNull()
  })

  test('RadioGroup y RadioGroupLabel: className, ref y props nativas', async () => {
    const ref = createRef<HTMLFieldSetElement>()
    const legend = createRef<HTMLLegendElement>()
    const c = await render(
      <RadioGroup ref={ref} className="g" id="grupo" data-x="1">
        <RadioGroupLabel ref={legend} className="t" id="titulo">Título</RadioGroupLabel>
      </RadioGroup>,
    )
    expect(ref.current).toBe(q(c, 'fieldset'))
    expect(ref.current?.className).toBe('mk-radio-group g')
    expect(ref.current?.id).toBe('grupo')
    expect(ref.current?.dataset['x']).toBe('1')
    expect(legend.current?.className).toBe('mk-radio-group-label t')
    expect(legend.current?.id).toBe('titulo')
  })
})

describe('RadioButton: medidas (kit y RadioButton.kt)', () => {
  test('área táctil de 48, capa circular de 40, anillo de 20 con trazo de 2 y punto de 10 centrado', async () => {
    const c = await render(<RadioButton defaultChecked>Sí</RadioButton>)
    const i = inputs(c)[0] as HTMLInputElement
    expect(rect(i).width).toBe(48)
    expect(rect(i).height).toBe(48)
    expect(rect(layer(c)).width).toBe(40)
    expect(rect(layer(c)).height).toBe(40)
    expect(style(layer(c)).borderTopLeftRadius).toBe('50%')
    expect(rect(ring(c)).width).toBe(20)
    expect(rect(ring(c)).height).toBe(20)
    expect(style(ring(c)).borderTopWidth).toBe('2px')
    expect(rect(dot(c)).width).toBe(10)
    // Todo concéntrico: área, capa, anillo y punto.
    const center = (el: Element) => [rect(el).left + rect(el).width / 2, rect(el).top + rect(el).height / 2]
    const [x, y] = center(i) as [number, number]
    for (const el of [layer(c), ring(c), dot(c)]) {
      const [ex, ey] = center(el) as [number, number]
      expect(ex - x).toBeCloseTo(0, 2)
      expect(ey - y).toBeCloseTo(0, 2)
    }
  })
})

describe('RadioButton: interacción', () => {
  test('un clic selecciona y deselecciona al resto del grupo; también con clic en la etiqueta', async () => {
    const c = await render(<Envio />)
    const [a, b, d] = inputs(c) as [HTMLInputElement, HTMLInputElement, HTMLInputElement]
    await userEvent.click(a)
    expect(a.checked).toBe(true)
    await userEvent.click(q(c, '.c .mk-radio-button-label'))
    expect(d.checked).toBe(true)
    expect(a.checked).toBe(false)
    expect(b.checked).toBe(false)
  })

  test('teclado: una sola parada de Tab y las flechas mueven la selección, con vuelta', async () => {
    const c = await render(
      <>
        <Envio />
        <button type="button">después</button>
      </>,
    )
    const [a, b, d] = inputs(c) as [HTMLInputElement, HTMLInputElement, HTMLInputElement]
    await userEvent.tab()
    expect(document.activeElement).toBe(a)
    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(b)
    expect(b.checked).toBe(true)
    await userEvent.keyboard('{ArrowRight}')
    expect(d.checked).toBe(true)
    expect(b.checked).toBe(false)
    await userEvent.keyboard('{ArrowDown}')
    expect(a.checked).toBe(true)
    await userEvent.keyboard('{ArrowUp}')
    expect(d.checked).toBe(true)
    // Tab sale del grupo, no recorre los otros radios.
    await userEvent.tab()
    expect(document.activeElement).toBe(q(c, 'button'))
    // Volver con Shift+Tab enfoca el seleccionado.
    await userEvent.tab({ shift: true })
    expect(document.activeElement).toBe(d)
  })

  test('Espacio selecciona el radio enfocado', async () => {
    const c = await render(<Envio />)
    await userEvent.tab()
    expect((inputs(c)[0] as HTMLInputElement).checked).toBe(false)
    await userEvent.keyboard(' ')
    expect((inputs(c)[0] as HTMLInputElement).checked).toBe(true)
  })

  test('las flechas saltean un radio deshabilitado', async () => {
    const c = await render(<Envio middleDisabled />)
    const [a, , d] = inputs(c) as [HTMLInputElement, HTMLInputElement, HTMLInputElement]
    await userEvent.tab()
    expect(document.activeElement).toBe(a)
    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(d)
    expect(d.checked).toBe(true)
  })

  test('controlado: checked y onChange en cada radio', async () => {
    function Controlado() {
      const [v, setV] = useState('retiro')
      const pick = (e: ChangeEvent<HTMLInputElement>) => setV(e.target.value)
      return (
        <>
          <RadioGroup aria-label="Envío">
            <RadioButton name="e" value="retiro" checked={v === 'retiro'} onChange={pick}>Retiro</RadioButton>
            <RadioButton name="e" value="correo" checked={v === 'correo'} onChange={pick}>Correo</RadioButton>
          </RadioGroup>
          <output>{v}</output>
        </>
      )
    }
    const c = await render(<Controlado />)
    expect((inputs(c)[0] as HTMLInputElement).checked).toBe(true)
    await userEvent.click(inputs(c)[1] as HTMLInputElement)
    expect(q(c, 'output').textContent).toBe('correo')
    expect((inputs(c)[1] as HTMLInputElement).checked).toBe(true)
    expect((inputs(c)[0] as HTMLInputElement).checked).toBe(false)
  })

  test('no controlado con onChange en el grupo: el cambio sube hasta el fieldset', async () => {
    const seen: string[] = []
    const c = await render(
      <RadioGroup aria-label="Envío" onChange={(e) => seen.push(e.target.value)}>
        <RadioButton name="e" value="retiro" defaultChecked>Retiro</RadioButton>
        <RadioButton name="e" value="correo">Correo</RadioButton>
      </RadioGroup>,
    )
    await userEvent.click(inputs(c)[1] as HTMLInputElement)
    expect(seen).toEqual(['correo'])
  })

  test('onChange del grupo ignora los cambios de otros controles anidados', async () => {
    const seen: string[] = []
    const c = await render(
      <RadioGroup aria-label="Envío" onChange={(e) => seen.push(e.target.value)}>
        <RadioButton name="e" value="otro">Otro</RadioButton>
        <input aria-label="Cuál" />
      </RadioGroup>,
    )
    await userEvent.type(q(c, 'input:not([type])'), 'x')
    await userEvent.click(inputs(c)[0] as HTMLInputElement)
    expect(seen).toEqual(['otro'])
  })

  test('disabled en el grupo deshabilita todos los radios', async () => {
    const c = await render(<Envio disabled />)
    for (const i of inputs(c)) expect(i.matches(':disabled')).toBe(true)
    await userEvent.click(q(c, '.a .mk-radio-button-label'), { force: true })
    expect((inputs(c)[0] as HTMLInputElement).checked).toBe(false)
  })

  test('en un formulario envía el value del seleccionado', async () => {
    const c = await render(
      <form>
        <RadioButton name="envio" value="retiro">Retiro</RadioButton>
        <RadioButton name="envio" value="correo" defaultChecked>Correo</RadioButton>
      </form>,
    )
    expect(new FormData(q(c, 'form') as HTMLFormElement).get('envio')).toBe('correo')
  })
})

describe('RadioButton: aspecto', () => {
  test('sin seleccionar: anillo on-surface-variant y sin punto', async () => {
    const c = await render(<RadioButton>No</RadioButton>)
    expect(style(ring(c)).borderTopColor).toBe(roleColor('on-surface-variant'))
    expect(style(dot(c)).scale).toBe('0')
  })

  test('seleccionado: anillo y punto primary', async () => {
    const c = await render(<RadioButton defaultChecked>Sí</RadioButton>)
    expect(style(ring(c)).borderTopColor).toBe(roleColor('primary'))
    expect(style(dot(c)).backgroundColor).toBe(roleColor('primary'))
    expect(style(dot(c)).scale).toBe('1')
  })

  test('hover: sin seleccionar, anillo on-surface y capa on-surface al 8 %; seleccionado, capa primary', async () => {
    const c = await render(<Envio />)
    await userEvent.click(inputs(c)[2] as HTMLInputElement)
    await userEvent.hover(q(c, '.a'))
    expect(style(ring(q(c, '.a'))).borderTopColor).toBe(roleColor('on-surface'))
    expect(style(layer(q(c, '.a'))).backgroundColor).toBe(roleColor('on-surface'))
    expect(Number(style(layer(q(c, '.a'))).opacity)).toBeCloseTo(0.08)
    await userEvent.hover(q(c, '.c'))
    expect(style(ring(q(c, '.c'))).borderTopColor).toBe(roleColor('primary'))
    expect(style(layer(q(c, '.c'))).backgroundColor).toBe(roleColor('primary'))
    expect(Number(style(layer(q(c, '.c'))).opacity)).toBeCloseTo(0.08)
  })

  test('foco de teclado: anillo de foco visible y capa al 10 %; sin seleccionar, anillo on-surface', async () => {
    const c = await render(<Envio />)
    await userEvent.tab()
    const a = q(c, '.a')
    expect(style(q(a, '.mk-focus-ring')).opacity).toBe('1')
    expect(Number(style(layer(a)).opacity)).toBeCloseTo(0.1)
    expect(style(ring(a)).borderTopColor).toBe(roleColor('on-surface'))
    // Las flechas seleccionan: el enfocado pasa a primary con capa primary.
    await userEvent.keyboard('{ArrowDown}')
    const b = q(c, '.b')
    expect(style(ring(b)).borderTopColor).toBe(roleColor('primary'))
    expect(style(layer(b)).backgroundColor).toBe(roleColor('primary'))
    expect(Number(style(layer(b)).opacity)).toBeCloseTo(0.1)
  })

  // Al presionar, la capa toma el color del destino (al revés que en hover y foco), igual que la
  // onda. Una prueba por estado: en Firefox, un segundo pressDown en la misma prueba no activa
  // :active (comprobado el 2026-11-25: el primero sí, en cualquier orden).
  test('presionado sin seleccionar: capa primary al 10 %, anillo on-surface y onda primary', async () => {
    const c = await render(<RadioButton name="x" />)
    await commands.pressDown('.mk-radio-button-input')
    try {
      expect(style(layer(c)).backgroundColor).toBe(roleColor('primary'))
      expect(Number(style(layer(c)).opacity)).toBeCloseTo(0.1)
      expect(style(ring(c)).borderTopColor).toBe(roleColor('on-surface'))
      expect(style(q(c, '.mk-ripple-wave')).backgroundColor).toBe(roleColor('primary'))
    } finally {
      // Si una expectativa falla, soltar igual: con el botón apretado, la prueba siguiente
      // no podría presionar.
      await commands.pressUp()
    }
  })

  test('presionado seleccionado: capa on-surface al 10 %, anillo primary y onda on-surface', async () => {
    const c = await render(<RadioButton name="y" defaultChecked />)
    await commands.pressDown('.mk-radio-button-input')
    try {
      expect(style(layer(c)).backgroundColor).toBe(roleColor('on-surface'))
      expect(Number(style(layer(c)).opacity)).toBeCloseTo(0.1)
      expect(style(ring(c)).borderTopColor).toBe(roleColor('primary'))
      expect(style(q(c, '.mk-ripple-wave')).backgroundColor).toBe(roleColor('on-surface'))
    } finally {
      // Si una expectativa falla, soltar igual: con el botón apretado, la prueba siguiente
      // no podría presionar.
      await commands.pressUp()
    }
  })

  test('deshabilitado: on-surface al 38 %, también seleccionado, y la etiqueta al 38 %', async () => {
    const c = await render(
      <RadioGroup aria-label="g" disabled>
        <RadioButton name="d" className="off">No</RadioButton>
        <RadioButton name="d" className="on" defaultChecked>Sí</RadioButton>
      </RadioGroup>,
    )
    for (const sel of ['.off', '.on']) {
      const r = q(c, sel)
      expect(style(q(r, '.mk-radio-button-control')).opacity, sel).toBe('0.38')
      expect(style(ring(r)).borderTopColor, sel).toBe(roleColor('on-surface'))
      expect(style(q(r, '.mk-radio-button-label')).opacity, sel).toBe('0.38')
    }
    expect(style(dot(q(c, '.on'))).backgroundColor).toBe(roleColor('on-surface'))
  })

  test('deshabilitado: sin capa de estado ni onda', async () => {
    const c = await render(<RadioButton disabled>No</RadioButton>)
    await userEvent.hover(q(c, 'label'))
    expect(style(layer(c)).opacity).toBe('0')
    await commands.pressDown('.mk-radio-button-input')
    expect(c.querySelector('.mk-ripple-wave')).toBeNull()
    await commands.pressUp()
  })
})

describe('RadioButton: animación', () => {
  afterEach(async () => {
    await commands.reduceMotion(false)
  })

  test('el punto crece con el resorte rápido espacial y el color se funde con el de efectos por defecto', async () => {
    const c = await render(<RadioButton>Uno</RadioButton>)
    const s = withMotion(() => ({
      p: style(dot(c)).transitionProperty,
      d: style(dot(c)).transitionDuration,
      e: style(dot(c)).transitionTimingFunction,
      ring: style(ring(c)).transitionProperty,
    }))
    expect(s.p).toBe('scale, background-color')
    expect(s.ring).toBe('border-color')
    const [grow, color] = s.d.split(', ')
    expect(parseFloat(grow as string)).toBeGreaterThan(0)
    expect(parseFloat(color as string)).toBeGreaterThan(0)
    expect(s.e).toContain('linear(')
  })

  test('con prefers-reduced-motion el punto aparece sin crecer; el color sigue animado', async () => {
    await commands.reduceMotion(true)
    const c = await render(<RadioButton>Uno</RadioButton>)
    const [grow, color] = withMotion(() => style(dot(c)).transitionDuration).split(', ')
    expect(grow).toBe('0s')
    expect(parseFloat(color as string)).toBeGreaterThan(0)
  })

  test('deshabilitado: el color no se anima (como Compose)', async () => {
    const c = await render(<RadioButton disabled>Uno</RadioButton>)
    expect(withMotion(() => style(ring(c)).transitionProperty)).toBe('scale')
    expect(withMotion(() => style(dot(c)).transitionProperty)).toBe('scale')
  })
})
