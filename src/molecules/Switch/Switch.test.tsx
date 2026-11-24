import { createRef, useState, type ReactNode } from 'react'
import { afterEach, describe, expect, test } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'
import { Switch } from './Switch.tsx'
import { render, roleColor, style, withMotion } from '../../test/render.tsx'

const input = (c: Element) => c.querySelector('input') as HTMLInputElement
const control = (c: Element) => c.querySelector('.mk-switch-control') as HTMLElement
const track = (c: Element) => c.querySelector('.mk-switch-track') as HTMLElement
const handle = (c: Element) => c.querySelector('.mk-switch-handle') as HTMLElement
const layer = (c: Element) => c.querySelector('.mk-state-layer') as HTMLElement
const shown = (el: Element | null) => style(el).opacity === '1'
const size = (el: Element) => el.getBoundingClientRect().width
/** Centro horizontal de un elemento respecto del borde izquierdo de la pista. */
const centerX = (c: Element, el: Element) => {
  const r = el.getBoundingClientRect()
  return r.left + r.width / 2 - track(c).getBoundingClientRect().left
}

/**
 * Baja el componente lejos de donde quedó el mouse en pruebas anteriores (todas cerca del
 * borde superior): con puntero encima, la capa queda en la opacidad de hover (8 %) aunque
 * haya foco, que es el comportamiento del átomo.
 */
const Lejos = ({ children }: { children: ReactNode }) => <div style={{ paddingTop: 300 }}>{children}</div>

/** Color de un rol con una opacidad, en el formato que devuelve getComputedStyle. */
function roleAlpha(role: string, opacityToken: 'disabled-container' | 'disabled-content'): string {
  const probe = document.createElement('span')
  probe.style.color = `color-mix(in srgb, var(--md-sys-color-${role}) calc(var(--md-sys-state-${opacityToken}-opacity) * 100%), transparent)`
  document.body.append(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value
}

describe('Switch: estructura y accesibilidad', () => {
  test('input nativo con rol switch dentro de un label; el texto es su nombre accesible', async () => {
    const c = await render(<Switch name="wifi" value="si">Wi-Fi</Switch>)
    const i = input(c)
    expect(i.type).toBe('checkbox')
    expect(i.getAttribute('role')).toBe('switch')
    expect(i.name).toBe('wifi')
    expect(i.value).toBe('si')
    expect(i.labels?.[0]?.textContent).toBe('Wi-Fi')
    await expect.element(page.getByRole('switch', { name: 'Wi-Fi' })).toBeInTheDocument()
    expect(track(c).getAttribute('aria-hidden')).toBe('true')
    expect(handle(c).getAttribute('aria-hidden')).toBe('true')
  })

  test('className y style van al contenedor; ref y props nativas, al input', async () => {
    const ref = createRef<HTMLInputElement>()
    const c = await render(
      <Switch ref={ref} className="mio" style={{ marginTop: 7 }} required aria-describedby="ayuda" id="s1" />,
    )
    const label = c.querySelector('label') as HTMLLabelElement
    expect(label.className).toBe('mk-switch mio')
    expect(label.style.marginTop).toBe('7px')
    expect(ref.current).toBe(input(c))
    expect(input(c).required).toBe(true)
    expect(input(c).id).toBe('s1')
    expect(input(c).getAttribute('aria-describedby')).toBe('ayuda')
    expect(input(c).style.marginTop).toBe('')
    expect(c.querySelector('.mk-switch-label')).toBeNull()
  })

  test('pista de 52 × 32 con radio completo, área táctil de 48 y capa circular de 40', async () => {
    const c = await render(<Switch />)
    expect(track(c).getBoundingClientRect().width).toBe(52)
    expect(track(c).getBoundingClientRect().height).toBe(32)
    expect(style(track(c)).borderTopLeftRadius).toBe('9999px')
    expect(input(c).getBoundingClientRect().height).toBe(48)
    expect(input(c).getBoundingClientRect().width).toBe(52)
    expect(size(layer(c))).toBe(40)
    expect(layer(c).getBoundingClientRect().height).toBe(40)
    expect(style(layer(c)).borderTopLeftRadius).toBe('9999px')
    expect(style(handle(c)).borderTopLeftRadius).toBe('9999px')
  })
})

describe('Switch: interacción', () => {
  test('se alterna con un clic en el control y con un clic en la etiqueta', async () => {
    const c = await render(<Switch>Wi-Fi</Switch>)
    await userEvent.click(input(c))
    expect(input(c).checked).toBe(true)
    await userEvent.click(c.querySelector('.mk-switch-label') as HTMLElement)
    expect(input(c).checked).toBe(false)
  })

  test('Espacio lo alterna tras llegar con Tab', async () => {
    const c = await render(<Switch>Teclado</Switch>)
    await userEvent.tab()
    expect(document.activeElement).toBe(input(c))
    await userEvent.keyboard(' ')
    expect(input(c).checked).toBe(true)
    await userEvent.keyboard(' ')
    expect(input(c).checked).toBe(false)
  })

  test('controlado: refleja el estado del padre', async () => {
    function Controlado() {
      const [on, setOn] = useState(false)
      return (
        <>
          <Switch checked={on} onChange={(e) => setOn(e.target.checked)} icons>Modo avión</Switch>
          <output>{on ? 'sí' : 'no'}</output>
        </>
      )
    }
    const c = await render(<Controlado />)
    await userEvent.click(input(c))
    expect(c.querySelector('output')?.textContent).toBe('sí')
    expect(input(c).checked).toBe(true)
    expect(centerX(c, handle(c))).toBe(36)
  })

  test('controlado sin cambiar el estado: no se mueve', async () => {
    const c = await render(<Switch checked={false} onChange={() => {}}>Fijo</Switch>)
    await userEvent.click(input(c))
    expect(input(c).checked).toBe(false)
  })

  test('deshabilitado no cambia con clics ni con el teclado', async () => {
    const c = await render(<Switch disabled>No</Switch>)
    await userEvent.click(c.querySelector('.mk-switch-label') as HTMLElement, { force: true })
    expect(input(c).checked).toBe(false)
    await userEvent.tab()
    expect(document.activeElement).not.toBe(input(c))
  })
})

describe('Switch: handle', () => {
  test('desactivado 16 a la izquierda; activado 24 a la derecha; el centro, a 16 y 36', async () => {
    const c = await render(
      <div>
        <Switch className="a" />
        <Switch className="b" defaultChecked />
      </div>,
    )
    const a = c.querySelector('.a') as HTMLElement
    const b = c.querySelector('.b') as HTMLElement
    expect(size(handle(a))).toBe(16)
    expect(handle(a).getBoundingClientRect().height).toBe(16)
    expect(centerX(a, handle(a))).toBe(16)
    expect(centerX(a, layer(a))).toBe(16)
    expect(size(handle(b))).toBe(24)
    expect(centerX(b, handle(b))).toBe(36)
    expect(centerX(b, layer(b))).toBe(36)
    // Centrado en vertical en la pista.
    const t = track(a).getBoundingClientRect()
    const h = handle(a).getBoundingClientRect()
    expect(h.top - t.top).toBe(8)
  })

  test('con icons, el handle mide 24 también desactivado', async () => {
    const c = await render(<Switch icons />)
    expect(size(handle(c))).toBe(24)
    expect(centerX(c, handle(c))).toBe(16)
  })

  test('al presionar crece a 28, activado o no, sin moverse del centro', async () => {
    const c = await render(
      <div>
        <Switch className="a" />
        <Switch className="b" defaultChecked />
      </div>,
    )
    await commands.pressDown('.a .mk-switch-input')
    const a = c.querySelector('.a') as HTMLElement
    expect(size(handle(a))).toBe(28)
    expect(centerX(a, handle(a))).toBe(16)
    await commands.pressUp()
    await commands.pressDown('.b .mk-switch-input')
    const b = c.querySelector('.b') as HTMLElement
    expect(size(handle(b))).toBe(28)
    expect(centerX(b, handle(b))).toBe(36)
    await commands.pressUp()
  })

  test('desplazamiento y tamaño con el resorte rápido espacial; colores con el de efectos', async () => {
    const c = await render(<Switch />)
    // getComputedStyle es un objeto vivo: hay que leerlo mientras las transiciones están activas.
    const s = withMotion(() => {
      const { transitionProperty, transitionDuration, transitionTimingFunction } = style(handle(c))
      return { transitionProperty, transitionDuration, transitionTimingFunction }
    })
    // La curva del resorte, serializada como la devuelve el navegador.
    const probe = document.createElement('span')
    probe.style.transitionTimingFunction =
      'var(--md-sys-motion-spring-fast-spatial-easing), var(--md-sys-motion-spring-fast-effects-easing)'
    document.body.append(probe)
    const [spatial, effects] = withMotion(() => getComputedStyle(probe).transitionTimingFunction).split(/, (?=linear)/)
    probe.remove()
    expect(s.transitionProperty).toBe('translate, width, height, background-color, color')
    expect(s.transitionDuration).toBe('0.36s, 0.36s, 0.36s, 0.15s, 0.15s')
    expect(s.transitionTimingFunction).toBe([spatial, spatial, spatial, effects, effects].join(', '))
  })

  describe('con prefers-reduced-motion', () => {
    afterEach(async () => {
      await commands.reduceMotion(false)
    })

    test('el handle y la capa no se desplazan animados; los colores sí cambian con transición', async () => {
      await commands.reduceMotion(true)
      const c = await render(<Switch />)
      const h = withMotion(() => style(handle(c)).transitionDuration)
      const l = withMotion(() => style(layer(c)).transitionDuration)
      expect(h).toBe('0s, 0s, 0s, 0.15s, 0.15s')
      expect(l).toBe('0.15s, 0s')
    })
  })
})

describe('Switch: iconos', () => {
  test('sin icons no hay iconos', async () => {
    const c = await render(<Switch defaultChecked />)
    expect(c.querySelector('.mk-icon')).toBeNull()
  })

  test('activado: marca de 16 en on-primary-container; desactivado: cruz en surface-container-highest', async () => {
    const c = await render(
      <div>
        <Switch className="a" icons />
        <Switch className="b" icons defaultChecked />
      </div>,
    )
    const a = c.querySelector('.a') as HTMLElement
    const b = c.querySelector('.b') as HTMLElement
    expect(shown(a.querySelector('.mk-switch-icon-off'))).toBe(true)
    expect(shown(a.querySelector('.mk-switch-icon-on'))).toBe(false)
    expect(style(a.querySelector('.mk-switch-icon-off svg')).fill).toBe(roleColor('surface-container-highest'))
    expect(shown(b.querySelector('.mk-switch-icon-on'))).toBe(true)
    expect(shown(b.querySelector('.mk-switch-icon-off'))).toBe(false)
    expect(size(b.querySelector('.mk-switch-icon-on') as Element)).toBe(16)
    expect(style(b.querySelector('.mk-switch-icon-on svg')).fill).toBe(roleColor('on-primary-container'))
    // La marca es el icono check y la cruz, close.
    expect(b.querySelector('.mk-switch-icon-on path')?.getAttribute('d')).toMatch(/^M382-240/)
    expect(a.querySelector('.mk-switch-icon-off path')?.getAttribute('d')).toMatch(/^m256-200/)
  })

  test('al alternar cambia el icono visible', async () => {
    const c = await render(<Switch icons>Avión</Switch>)
    await userEvent.click(input(c))
    expect(shown(c.querySelector('.mk-switch-icon-on'))).toBe(true)
    expect(shown(c.querySelector('.mk-switch-icon-off'))).toBe(false)
  })
})

describe('Switch: colores por estado', () => {
  test('desactivado: pista surface-container-highest con borde 2 outline, handle outline', async () => {
    const c = await render(<Switch />)
    expect(style(track(c)).backgroundColor).toBe(roleColor('surface-container-highest'))
    expect(style(track(c)).boxShadow).toBe(`${roleColor('outline')} 0px 0px 0px 2px inset`)
    expect(style(handle(c)).backgroundColor).toBe(roleColor('outline'))
    expect(style(layer(c)).opacity).toBe('0')
  })

  test('activado: pista primary sin borde, handle on-primary', async () => {
    const c = await render(<Switch defaultChecked />)
    expect(style(track(c)).backgroundColor).toBe(roleColor('primary'))
    expect(style(track(c)).boxShadow).toBe('rgba(0, 0, 0, 0) 0px 0px 0px 2px inset')
    expect(style(handle(c)).backgroundColor).toBe(roleColor('on-primary'))
  })

  test('hover activado: handle primary-container y capa primary al 8 %', async () => {
    const c = await render(<Switch defaultChecked>Hover</Switch>)
    await userEvent.hover(c.querySelector('label') as HTMLElement)
    expect(style(handle(c)).backgroundColor).toBe(roleColor('primary-container'))
    expect(style(track(c)).backgroundColor).toBe(roleColor('primary'))
    expect(style(layer(c)).backgroundColor).toBe(roleColor('primary'))
    expect(Number(style(layer(c)).opacity)).toBeCloseTo(0.08)
  })

  test('hover desactivado: handle on-surface-variant y capa on-surface al 8 % (Compose)', async () => {
    const c = await render(<Switch>Hover</Switch>)
    await userEvent.hover(c.querySelector('.mk-switch-label') as HTMLElement)
    expect(style(handle(c)).backgroundColor).toBe(roleColor('on-surface-variant'))
    expect(style(track(c)).backgroundColor).toBe(roleColor('surface-container-highest'))
    expect(style(layer(c)).backgroundColor).toBe(roleColor('on-surface'))
    expect(Number(style(layer(c)).opacity)).toBeCloseTo(0.08)
  })

  test('foco de teclado activado: anillo visible, handle primary-container, capa primary al 10 %', async () => {
    const c = await render(<Lejos><Switch defaultChecked>Foco</Switch></Lejos>)
    await userEvent.tab()
    expect(shown(c.querySelector('.mk-focus-ring'))).toBe(true)
    expect(style(c.querySelector('.mk-focus-ring')).borderTopLeftRadius).toBe('9999px')
    expect(style(handle(c)).backgroundColor).toBe(roleColor('primary-container'))
    expect(style(layer(c)).backgroundColor).toBe(roleColor('primary'))
    expect(Number(style(layer(c)).opacity)).toBeCloseTo(0.1)
  })

  test('foco de teclado desactivado: handle on-surface-variant (Compose), capa al 10 %', async () => {
    const c = await render(<Lejos><Switch>Foco</Switch></Lejos>)
    expect(shown(c.querySelector('.mk-focus-ring'))).toBe(false)
    await userEvent.tab()
    expect(shown(c.querySelector('.mk-focus-ring'))).toBe(true)
    expect(style(handle(c)).backgroundColor).toBe(roleColor('on-surface-variant'))
    expect(Number(style(layer(c)).opacity)).toBeCloseTo(0.1)
  })

  test('presionado: activado handle primary-container y onda primary; desactivado on-surface-variant y onda on-surface', async () => {
    const c = await render(
      <div>
        <Switch className="a" />
        <Switch className="b" defaultChecked />
      </div>,
    )
    const a = c.querySelector('.a') as HTMLElement
    const b = c.querySelector('.b') as HTMLElement
    await commands.pressDown('.a .mk-switch-input')
    expect(style(handle(a)).backgroundColor).toBe(roleColor('on-surface-variant'))
    expect(style(a.querySelector('.mk-ripple-wave')).backgroundColor).toBe(roleColor('on-surface'))
    expect(Number(style(layer(a)).opacity)).toBeCloseTo(0.1)
    await commands.pressUp()
    await commands.pressDown('.b .mk-switch-input')
    expect(style(handle(b)).backgroundColor).toBe(roleColor('primary-container'))
    expect(style(b.querySelector('.mk-ripple-wave')).backgroundColor).toBe(roleColor('primary'))
    expect(Number(style(layer(b)).opacity)).toBeCloseTo(0.1)
    await commands.pressUp()
  })

  test('deshabilitado activado: pista on-surface 10 %, handle surface, icono on-surface 38 %', async () => {
    const c = await render(<Switch disabled defaultChecked icons>Off</Switch>)
    expect(style(track(c)).backgroundColor).toBe(roleAlpha('on-surface', 'disabled-container'))
    expect(style(handle(c)).backgroundColor).toBe(roleColor('surface'))
    expect(size(handle(c))).toBe(24)
    expect(style(c.querySelector('.mk-switch-icon-on svg')).fill).toBe(roleAlpha('on-surface', 'disabled-content'))
    expect(style(c.querySelector('.mk-switch-label')).opacity).toBe('0.38')
  })

  test('deshabilitado desactivado: pista surface-variant 10 % con borde on-surface 10 %, handle on-surface 38 %', async () => {
    const c = await render(<Switch disabled>Off</Switch>)
    expect(style(track(c)).backgroundColor).toBe(roleAlpha('surface-variant', 'disabled-container'))
    expect(style(track(c)).boxShadow).toBe(`${roleAlpha('on-surface', 'disabled-container')} 0px 0px 0px 2px inset`)
    expect(style(handle(c)).backgroundColor).toBe(roleAlpha('on-surface', 'disabled-content'))
    expect(size(handle(c))).toBe(16)
  })

  test('deshabilitado: sin capa de estado, sin onda y sin crecer al presionar', async () => {
    const c = await render(<Switch disabled defaultChecked>Off</Switch>)
    await userEvent.hover(c.querySelector('label') as HTMLElement)
    expect(style(layer(c)).opacity).toBe('0')
    expect(style(handle(c)).backgroundColor).toBe(roleColor('surface'))
    await commands.pressDown('.mk-switch-input')
    expect(c.querySelector('.mk-ripple-wave')).toBeNull()
    expect(style(layer(c)).opacity).toBe('0')
    expect(size(handle(c))).toBe(24)
    await commands.pressUp()
  })

  test('tema oscuro: los colores siguen al esquema', async () => {
    const c = await render(
      <div data-theme="dark">
        <Switch defaultChecked />
      </div>,
    )
    const dark = c.querySelector('[data-theme]') as HTMLElement
    const probe = document.createElement('span')
    probe.style.color = 'var(--md-sys-color-primary)'
    dark.append(probe)
    const darkPrimary = getComputedStyle(probe).color
    probe.remove()
    expect(darkPrimary).not.toBe(roleColor('primary'))
    expect(style(track(control(c))).backgroundColor).toBe(darkPrimary)
  })
})
