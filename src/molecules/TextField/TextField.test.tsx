import { createRef, useState } from 'react'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'
import {
  TextField,
  TextFieldInput,
  TextFieldLabel,
  TextFieldSupporting,
  TextFieldTextarea,
  type TextFieldProps,
} from './TextField.tsx'
import { TextFieldLeading, TextFieldTrailing } from './TextFieldSlots.tsx'
import { IconButton } from '../IconButton/IconButton.tsx'
import { CancelIcon, SearchIcon } from '../../icons/icons.tsx'
import { render, roleColor, style, withMotion } from '../../test/render.tsx'

const q = <T extends Element = HTMLElement>(c: HTMLElement, sel: string) => c.querySelector(sel) as T
const field = (c: HTMLElement) => q(c, '.mk-text-field')
const input = (c: HTMLElement) => q<HTMLInputElement>(c, '.mk-text-field-input')
const label = (c: HTMLElement) => q(c, '.mk-text-field-label')
const container = (c: HTMLElement) => q(c, '.mk-text-field-container')
const layer = (c: HTMLElement) => q(c, '.mk-state-layer')
const outline = (c: HTMLElement) => q(c, '.mk-text-field-outline')
const notch = (c: HTMLElement) => q(c, '.mk-text-field-notch')
const supporting = (c: HTMLElement) => q(c, '.mk-text-field-supporting')

/** Posición de un elemento respecto del borde superior izquierdo del campo. */
const at = (c: HTMLElement, el: Element) => {
  const f = field(c).getBoundingClientRect()
  const r = el.getBoundingClientRect()
  return { x: r.left - f.left, y: r.top - f.top, width: r.width, height: r.height }
}

/** Color de un rol mezclado con transparente, como lo devuelve getComputedStyle. */
function mixColor(role: string, percent: number): string {
  const probe = document.createElement('span')
  probe.style.color = `color-mix(in srgb, var(--md-sys-color-${role}) ${percent}%, transparent)`
  document.body.append(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value
}

const indicator = (c: HTMLElement) => {
  const s = getComputedStyle(container(c), '::after')
  return { color: s.backgroundColor, height: s.height }
}
const border = (c: HTMLElement) => {
  const s = style(outline(c))
  return { color: s.borderTopColor, width: s.borderTopWidth }
}

/**
 * Deja el puntero lejos del campo: el de la prueba anterior puede quedar sobre el mismo lugar
 * de la pantalla y activar el hover del campo nuevo.
 */
async function pointerAway() {
  const spot = document.createElement('div')
  spot.style.cssText = 'position: fixed; right: 0; bottom: 0; width: 4px; height: 4px;'
  document.body.append(spot)
  await userEvent.hover(spot)
  spot.remove()
}
beforeEach(pointerAway)

function Basic(props: TextFieldProps & { value?: string; inputId?: string }) {
  const { value, inputId, ...rest } = props
  return (
    <TextField {...rest}>
      <TextFieldLabel>Nombre</TextFieldLabel>
      <TextFieldInput {...(value === undefined ? {} : { defaultValue: value })} {...(inputId ? { id: inputId } : {})} />
      <TextFieldSupporting>Como figura en el documento</TextFieldSupporting>
    </TextField>
  )
}

describe('TextField: estructura y accesibilidad', () => {
  test('el nombre accesible sale de la etiqueta y la descripción del texto de ayuda', async () => {
    const c = await render(<Basic />)
    const el = page.getByRole('textbox', { name: 'Nombre' }).element()
    expect(el).toBe(input(c))
    expect(input(c).labels?.[0]).toBe(label(c))
    const ids = input(c).getAttribute('aria-describedby')?.split(' ') ?? []
    expect(ids).toEqual([supporting(c).id])
    expect(document.getElementById(ids[0] as string)?.textContent).toBe('Como figura en el documento')
  })

  test('respeta un id propio del input y del texto de ayuda, y suma un aria-describedby propio', async () => {
    const c = await render(
      <>
        <p id="extra">Extra</p>
        <TextField>
          <TextFieldLabel>Correo</TextFieldLabel>
          <TextFieldInput id="correo" type="email" aria-describedby="extra" />
          <TextFieldSupporting id="ayuda-correo">Lo usamos para avisarte</TextFieldSupporting>
        </TextField>
      </>,
    )
    expect(input(c).id).toBe('correo')
    expect(label(c).getAttribute('for')).toBe('correo')
    expect(input(c).getAttribute('aria-describedby')).toBe('extra ayuda-correo')
    expect(page.getByRole('textbox', { name: 'Correo' }).element()).toBe(input(c))
  })

  test('dos campos en la misma página no comparten ids', async () => {
    const c = await render(
      <>
        <Basic />
        <Basic />
      </>,
    )
    const inputs = [...c.querySelectorAll('input')]
    expect(inputs[0]?.id).not.toBe(inputs[1]?.id)
    expect(inputs.map((i) => i.labels?.[0]?.textContent)).toEqual(['Nombre', 'Nombre'])
  })

  test('sin texto de ayuda no hay aria-describedby', async () => {
    const c = await render(
      <TextField>
        <TextFieldLabel>Ciudad</TextFieldLabel>
        <TextFieldInput />
      </TextField>,
    )
    expect(input(c).hasAttribute('aria-describedby')).toBe(false)
  })

  test('error pone aria-invalid en el input', async () => {
    const c = await render(<Basic error />)
    expect(input(c).getAttribute('aria-invalid')).toBe('true')
    const ok = await render(<Basic />)
    expect(input(ok).hasAttribute('aria-invalid')).toBe(false)
  })

  test('el fondo, la capa de estado y el borde del outlined quedan ocultos para los lectores', async () => {
    const c = await render(<Basic variant="outlined" />)
    expect(container(c).getAttribute('aria-hidden')).toBe('true')
    expect(outline(c).getAttribute('aria-hidden')).toBe('true')
  })

  test('una parte fuera de TextField avisa con un error claro', async () => {
    const prev = console.error
    console.error = () => {}
    try {
      await expect(render(<TextFieldInput />)).rejects.toThrow('TextFieldInput tiene que estar dentro de un <TextField>.')
    } finally {
      console.error = prev
    }
  })
})

describe('TextField: props nativas y ref', () => {
  test('las props del input y ref llegan al <input>; className, style y ref del campo al contenedor', async () => {
    const inputRef = createRef<HTMLInputElement>()
    const fieldRef = createRef<HTMLDivElement>()
    const c = await render(
      <TextField ref={fieldRef} className="mio" style={{ marginTop: 7 }} data-testid="tf">
        <TextFieldLabel>Edad</TextFieldLabel>
        <TextFieldInput ref={inputRef} type="number" name="edad" required min={0} className="dentro" />
      </TextField>,
    )
    expect(inputRef.current).toBe(input(c))
    expect(fieldRef.current).toBe(field(c))
    expect(field(c).className).toBe('mk-text-field mio')
    expect(field(c).style.marginTop).toBe('7px')
    expect(field(c).dataset.testid).toBe('tf')
    expect(input(c).type).toBe('number')
    expect(input(c).name).toBe('edad')
    expect(input(c).required).toBe(true)
    expect(input(c).min).toBe('0')
    expect(input(c).className).toBe('mk-text-field-input dentro')
  })

  test('el valor viaja con el formulario', async () => {
    const c = await render(
      <form>
        <Basic value="Ana" />
      </form>,
    )
    const i = input(c)
    i.name = 'nombre'
    expect(new FormData(q<HTMLFormElement>(c, 'form')).get('nombre')).toBe('Ana')
  })
})

describe('TextField: teclado', () => {
  test('se llega con Tab y se escribe', async () => {
    const c = await render(<Basic />)
    await userEvent.tab()
    expect(document.activeElement).toBe(input(c))
    await userEvent.keyboard('Ana Lía')
    expect(input(c).value).toBe('Ana Lía')
  })

  test('controlado: onChange recibe cada tecla', async () => {
    function Controlled() {
      const [v, setV] = useState('')
      return (
        <TextField>
          <TextFieldLabel>Buscar</TextFieldLabel>
          <TextFieldInput value={v} onChange={(e) => setV(e.target.value.toUpperCase())} />
          <TextFieldSupporting>{v.length} letras</TextFieldSupporting>
        </TextField>
      )
    }
    const c = await render(<Controlled />)
    await userEvent.click(input(c))
    await userEvent.keyboard('mate')
    expect(input(c).value).toBe('MATE')
    expect(supporting(c).textContent).toBe('4 letras')
  })

  test('hacer clic en la etiqueta enfoca el input', async () => {
    const c = await render(<Basic />)
    await userEvent.click(label(c), { force: true })
    expect(document.activeElement).toBe(input(c))
  })
})

describe('TextField: etiqueta en reposo y flotante', () => {
  test('vacío y sin foco: Body Large (16 px) centrada en los 56', async () => {
    const c = await render(<Basic />)
    expect(style(label(c)).fontSize).toBe('16px')
    expect(style(label(c)).lineHeight).toBe('24px')
    expect(at(c, label(c)).y).toBe(16)
  })

  test('con foco flota a Body Small (12 px), arriba (y = 8) y en primary', async () => {
    const c = await render(<Basic />)
    await userEvent.click(input(c))
    expect(style(label(c)).fontSize).toBe('12px')
    expect(style(label(c)).lineHeight).toBe('16px')
    expect(at(c, label(c)).y).toBe(8)
    expect(style(label(c)).color).toBe(roleColor('primary'))
  })

  test('con texto escrito queda flotante al perder el foco, en on-surface-variant', async () => {
    const c = await render(<Basic />)
    await userEvent.click(input(c))
    await userEvent.keyboard('Ana')
    input(c).blur()
    expect(style(label(c)).fontSize).toBe('12px')
    expect(style(label(c)).color).toBe(roleColor('on-surface-variant'))
    // Al borrar todo vuelve al reposo.
    await userEvent.clear(input(c))
    input(c).blur()
    expect(style(label(c)).fontSize).toBe('16px')
  })

  test('con valor inicial flota desde el primer render (sin JavaScript de por medio)', async () => {
    const c = await render(<Basic value="Ana" />)
    expect(style(label(c)).fontSize).toBe('12px')
    expect(at(c, label(c)).y).toBe(8)
  })

  test('los inputs que siempre muestran valor (date, time) tienen la etiqueta arriba', async () => {
    for (const type of ['date', 'time']) {
      const c = await render(
        <TextField>
          <TextFieldLabel>Fecha</TextFieldLabel>
          <TextFieldInput type={type} />
        </TextField>,
      )
      expect(style(label(c)).fontSize, type).toBe('12px')
    }
  })

  test('un placeholder propio se oculta con la etiqueta en reposo y aparece con foco', async () => {
    const c = await render(
      <TextField>
        <TextFieldLabel>Correo</TextFieldLabel>
        <TextFieldInput placeholder="ana@ejemplo.com" />
      </TextField>,
    )
    const ph = () => getComputedStyle(input(c), '::placeholder').color
    expect(ph()).toBe('rgba(0, 0, 0, 0)')
    expect(style(label(c)).fontSize).toBe('16px')
    await userEvent.click(input(c))
    expect(ph()).toBe(roleColor('on-surface-variant'))
  })

  test('sin etiqueta, el placeholder se ve siempre y el texto va centrado', async () => {
    const c = await render(
      <TextField>
        <TextFieldInput aria-label="Buscar" placeholder="Buscar" />
      </TextField>,
    )
    expect(getComputedStyle(input(c), '::placeholder').color).toBe(roleColor('on-surface-variant'))
    expect(style(input(c)).paddingTop).toBe('16px')
    expect(style(input(c)).paddingBottom).toBe('16px')
  })

  describe('animación', () => {
    afterEach(async () => {
      await commands.reduceMotion(false)
    })

    test('se mueve y cambia de tamaño con el resorte rápido espacial; el color, con el de efectos', async () => {
      const c = await render(<Basic />)
      const s = withMotion(() => ({ p: style(label(c)).transitionProperty, d: style(label(c)).transitionDuration }))
      expect(s.p).toBe('transform, font-size, line-height, color')
      const [move, size, line, color] = s.d.split(', ')
      expect(parseFloat(move as string)).toBeGreaterThan(0)
      expect(size).toBe(move)
      expect(line).toBe(move)
      expect(color).toBe('0.15s')
    })

    test('con prefers-reduced-motion la etiqueta salta sin desplazarse; el color sí se anima', async () => {
      await commands.reduceMotion(true)
      const c = await render(<Basic variant="outlined" />)
      expect(withMotion(() => style(label(c)).transitionDuration)).toBe('0s, 0s, 0s, 0.15s')
      expect(withMotion(() => style(notch(c)).transitionDuration)).toBe('0s')
    })
  })
})

describe('TextField: medidas', () => {
  test('filled sin iconos: 56 de alto, 280 de ancho, rellenos de 16 y radio 4 arriba', async () => {
    const c = await render(<Basic />)
    expect(at(c, container(c)).height).toBe(56)
    expect(at(c, container(c)).width).toBe(280)
    expect(at(c, input(c)).height).toBe(56)
    const s = style(input(c))
    expect([s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft]).toEqual(['24px', '16px', '8px', '16px'])
    expect(at(c, label(c)).x).toBe(16)
    const cs = style(container(c))
    expect([cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomLeftRadius]).toEqual(['4px', '4px', '0px'])
  })

  test('texto de ayuda: Body Small, debajo, relleno 4, 16, 0, 16 (bloque de 20)', async () => {
    const c = await render(<Basic />)
    const s = at(c, supporting(c))
    expect(s.y).toBe(56)
    expect(s.height).toBe(20)
    const st = style(supporting(c))
    expect([st.paddingTop, st.paddingRight, st.paddingBottom, st.paddingLeft]).toEqual(['4px', '16px', '0px', '16px'])
    expect(st.fontSize).toBe('12px')
    expect(st.color).toBe(roleColor('on-surface-variant'))
  })

  test('con iconos: áreas de 48 centradas, icono de 24 e input a 4 de cada una', async () => {
    const c = await render(
      <TextField>
        <TextFieldLeading><SearchIcon /></TextFieldLeading>
        <TextFieldLabel>Buscar</TextFieldLabel>
        <TextFieldInput />
        <TextFieldTrailing><IconButton label="Borrar"><CancelIcon /></IconButton></TextFieldTrailing>
      </TextField>,
    )
    const lead = at(c, q(c, '.mk-text-field-leading'))
    const trail = at(c, q(c, '.mk-text-field-trailing'))
    expect(lead).toEqual({ x: 0, y: 4, width: 48, height: 48 })
    expect(trail).toEqual({ x: 232, y: 4, width: 48, height: 48 })
    expect(at(c, q(c, '.mk-text-field-leading .mk-icon'))).toEqual({ x: 12, y: 16, width: 24, height: 24 })
    // IconButton Small: 40 visibles centrados en el área de 48, icono de 24.
    expect(at(c, q(c, '.mk-icon-button'))).toEqual({ x: 236, y: 8, width: 40, height: 40 })
    expect(at(c, q(c, '.mk-icon-button .mk-icon')).width).toBe(24)
    // Texto y etiqueta a 4 del icono: empiezan en 52 (como Compose y el kit).
    expect(at(c, input(c)).x).toBe(48)
    expect(style(input(c)).paddingLeft).toBe('4px')
    expect(style(input(c)).paddingRight).toBe('4px')
    expect(at(c, label(c)).x).toBe(52)
    expect(at(c, container(c)).height).toBe(56)
  })

  test('outlined: radio 4 en las cuatro esquinas, texto centrado (16 y 16) y sin fondo', async () => {
    const c = await render(<Basic variant="outlined" />)
    const s = style(input(c))
    expect([s.paddingTop, s.paddingBottom]).toEqual(['16px', '16px'])
    expect(style(outline(c)).borderBottomLeftRadius).toBe('4px')
    expect(style(container(c)).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(at(c, container(c)).height).toBe(56)
  })
})

describe('TextField: filled, colores por estado', () => {
  test('en reposo: contenedor surface-container-highest, indicador de 1 on-surface-variant', async () => {
    const c = await render(<Basic />)
    expect(style(container(c)).backgroundColor).toBe(roleColor('surface-container-highest'))
    expect(indicator(c)).toEqual({ color: roleColor('on-surface-variant'), height: '1px' })
    expect(style(label(c)).color).toBe(roleColor('on-surface-variant'))
    expect(style(input(c)).color).toBe(roleColor('on-surface'))
    expect(style(input(c)).caretColor).toBe(roleColor('primary'))
    expect(style(layer(c)).opacity).toBe('0')
  })

  test('hover: indicador on-surface y capa on-surface al 8 %', async () => {
    const c = await render(<Basic />)
    await userEvent.hover(input(c))
    expect(indicator(c)).toEqual({ color: roleColor('on-surface'), height: '1px' })
    expect(style(layer(c)).opacity).toBe('0.08')
    expect(style(layer(c)).backgroundColor).toBe(roleColor('on-surface'))
    // Sobre el texto de ayuda no hay hover del campo.
    await userEvent.hover(supporting(c))
    expect(style(layer(c)).opacity).toBe('0')
  })

  test('foco: indicador de 2 en primary (Compose; el kit dice 3)', async () => {
    const c = await render(<Basic />)
    await userEvent.click(input(c))
    expect(indicator(c)).toEqual({ color: roleColor('primary'), height: '2px' })
  })

  test('error: indicador, etiqueta, ayuda, icono final y cursor en error; el inicial no cambia', async () => {
    const c = await render(
      <TextField error>
        <TextFieldLeading><SearchIcon /></TextFieldLeading>
        <TextFieldLabel>Usuario</TextFieldLabel>
        <TextFieldInput />
        <TextFieldTrailing><IconButton label="Borrar"><CancelIcon /></IconButton></TextFieldTrailing>
        <TextFieldSupporting>No disponible</TextFieldSupporting>
      </TextField>,
    )
    const err = roleColor('error')
    expect(indicator(c)).toEqual({ color: err, height: '1px' })
    expect(style(label(c)).color).toBe(err)
    expect(style(supporting(c)).color).toBe(err)
    expect(style(q(c, '.mk-icon-button')).color).toBe(err)
    expect(style(q(c, '.mk-text-field-leading')).color).toBe(roleColor('on-surface-variant'))
    expect(style(input(c)).caretColor).toBe(err)
    expect(style(input(c)).color).toBe(roleColor('on-surface'))
  })

  test('error con hover: on-error-container; con foco: error de 2', async () => {
    const c = await render(<Basic error />)
    await userEvent.hover(input(c))
    expect(indicator(c).color).toBe(roleColor('on-error-container'))
    expect(style(label(c)).color).toBe(roleColor('on-error-container'))
    await userEvent.click(input(c))
    expect(indicator(c)).toEqual({ color: roleColor('error'), height: '2px' })
    expect(style(label(c)).color).toBe(roleColor('error'))
  })
})

describe('TextField: outlined, colores por estado', () => {
  test('en reposo: borde de 1 en outline', async () => {
    const c = await render(<Basic variant="outlined" />)
    expect(border(c)).toEqual({ color: roleColor('outline'), width: '1px' })
    expect(style(layer(c)).display).toBe('none')
  })

  test('hover: borde y etiqueta on-surface', async () => {
    const c = await render(<Basic variant="outlined" />)
    await userEvent.hover(input(c))
    expect(border(c)).toEqual({ color: roleColor('on-surface'), width: '1px' })
    expect(style(label(c)).color).toBe(roleColor('on-surface'))
  })

  test('foco: borde de 2 en primary y etiqueta primary', async () => {
    const c = await render(<Basic variant="outlined" />)
    await userEvent.click(input(c))
    expect(border(c)).toEqual({ color: roleColor('primary'), width: '2px' })
    expect(style(label(c)).color).toBe(roleColor('primary'))
  })

  test('error: borde de 1 en error; con foco, de 2', async () => {
    const c = await render(<Basic variant="outlined" error />)
    expect(border(c)).toEqual({ color: roleColor('error'), width: '1px' })
    await userEvent.click(input(c))
    expect(border(c)).toEqual({ color: roleColor('error'), width: '2px' })
  })

  test('sin etiqueta, el borde lo dibuja el contenedor (interior, de 1 en outline)', async () => {
    const c = await render(
      <TextField variant="outlined">
        <TextFieldInput aria-label="Buscar" />
      </TextField>,
    )
    expect(outline(c)).toBeNull()
    expect(style(container(c)).boxShadow).toBe(`${roleColor('outline')} 0px 0px 0px 1px inset`)
  })
})

describe('TextField: outlined, la etiqueta corta el borde', () => {
  test('en reposo el borde es continuo (el corte mide 0)', async () => {
    const c = await render(<Basic variant="outlined" />)
    expect(at(c, notch(c)).width).toBeLessThan(1)
    expect(at(c, label(c)).y).toBe(16)
  })

  test('flotante: la etiqueta queda centrada sobre el borde y el corte mide su ancho + 4 a cada lado', async () => {
    const c = await render(<Basic variant="outlined" value="Ana" />)
    const l = at(c, label(c))
    const n = at(c, notch(c))
    expect(style(label(c)).fontSize).toBe('12px')
    expect(l.y).toBe(-8)
    expect(l.x).toBe(16)
    expect(n.x).toBe(12)
    expect(n.width).toBeCloseTo(l.width + 8, 0)
    // El borde superior pasa por y = 0 (dentro de los 56) y el corte está centrado en él.
    const o = at(c, outline(c))
    expect(o.y + 8 - 0.5).toBe(0)
    expect(n.y + n.height / 2).toBe(o.y + 8)
    expect(o.y + o.height).toBe(56)
  })

  test('con foco y borde de 2 el borde sigue en y = 0', async () => {
    const c = await render(<Basic variant="outlined" />)
    await userEvent.click(input(c))
    const o = at(c, outline(c))
    expect(o.y).toBe(-7)
    expect(o.y + o.height).toBe(56)
    expect(at(c, notch(c)).width).toBeCloseTo(at(c, label(c)).width + 8, 0)
  })

  test('con icono inicial la etiqueta flotante vuelve al relleno de 16', async () => {
    const c = await render(
      <TextField variant="outlined">
        <TextFieldLeading><SearchIcon /></TextFieldLeading>
        <TextFieldLabel>Buscar</TextFieldLabel>
        <TextFieldInput />
      </TextField>,
    )
    expect(at(c, label(c)).x).toBe(52)
    await userEvent.click(input(c))
    expect(at(c, label(c)).x).toBe(16)
    expect(at(c, notch(c)).x).toBe(12)
  })

  test('el corte no pinta fondo: funciona sobre cualquier superficie', async () => {
    const c = await render(<Basic variant="outlined" value="Ana" />)
    expect(style(label(c)).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(style(notch(c)).visibility).toBe('hidden')
  })
})

describe('TextField: deshabilitado', () => {
  test('no se enfoca ni se escribe', async () => {
    const c = await render(<Basic disabled />)
    expect(input(c).disabled).toBe(true)
    await userEvent.tab()
    expect(document.activeElement).not.toBe(input(c))
    await userEvent.click(input(c), { force: true })
    await userEvent.keyboard('x')
    expect(input(c).value).toBe('')
  })

  test('filled: contenedor on-surface 4 %, indicador y contenido on-surface 38 %, sin capa con hover', async () => {
    const c = await render(
      <TextField disabled>
        <TextFieldLeading><SearchIcon /></TextFieldLeading>
        <TextFieldLabel>Nombre</TextFieldLabel>
        <TextFieldInput defaultValue="Ana" />
        <TextFieldSupporting>Ayuda</TextFieldSupporting>
      </TextField>,
    )
    const dim = mixColor('on-surface', 38)
    expect(style(container(c)).backgroundColor).toBe(mixColor('on-surface', 4))
    expect(indicator(c)).toEqual({ color: dim, height: '1px' })
    for (const el of [label(c), input(c), supporting(c), q(c, '.mk-text-field-leading')]) {
      expect(style(el).color).toBe(dim)
    }
    await userEvent.hover(input(c), { force: true })
    expect(style(layer(c)).opacity).toBe('0')
  })

  test('el disabled del input también deshabilita el campo, aunque haya error', async () => {
    const c = await render(
      <TextField variant="outlined" error>
        <TextFieldLabel>Nombre</TextFieldLabel>
        <TextFieldInput disabled />
      </TextField>,
    )
    expect(input(c).disabled).toBe(true)
    expect(border(c)).toEqual({ color: mixColor('on-surface', 12), width: '1px' })
    expect(style(label(c)).color).toBe(mixColor('on-surface', 38))
  })
})

describe('TextFieldTextarea', () => {
  test('multilínea: textarea asociado, Enter agrega líneas y el campo crece', async () => {
    const c = await render(
      <TextField>
        <TextFieldLabel>Comentario</TextFieldLabel>
        <TextFieldTextarea rows={3} />
        <TextFieldSupporting>Opcional</TextFieldSupporting>
      </TextField>,
    )
    const t = q<HTMLTextAreaElement>(c, 'textarea')
    expect(page.getByRole('textbox', { name: 'Comentario' }).element()).toBe(t)
    expect(t.getAttribute('aria-describedby')).toBe(supporting(c).id)
    await userEvent.click(t)
    await userEvent.keyboard('uno{Enter}dos')
    expect(t.value).toBe('uno\ndos')
    // 3 líneas de 24 + 24 arriba + 8 abajo.
    expect(at(c, container(c)).height).toBe(104)
    expect(style(label(c)).fontSize).toBe('12px')
    expect(at(c, label(c)).y).toBe(8)
    expect(at(c, supporting(c)).y).toBe(104)
  })

  test('ref y props llegan al textarea', async () => {
    const ref = createRef<HTMLTextAreaElement>()
    const c = await render(
      <TextField error>
        <TextFieldLabel>Notas</TextFieldLabel>
        <TextFieldTextarea ref={ref} name="notas" maxLength={200} />
      </TextField>,
    )
    expect(ref.current).toBe(q(c, 'textarea'))
    expect(ref.current?.name).toBe('notas')
    expect(ref.current?.maxLength).toBe(200)
    expect(ref.current?.getAttribute('aria-invalid')).toBe('true')
  })
})
