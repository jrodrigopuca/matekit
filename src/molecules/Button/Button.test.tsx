import { createRef, type AnchorHTMLAttributes, type Ref } from 'react'
import { afterEach, describe, expect, test } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'
import { Button, type ButtonSize, type ButtonVariant } from './Button.tsx'
import { render, roleColor, style, withMotion } from '../../test/render.tsx'

const button = (c: HTMLElement) => c.querySelector('button') as HTMLButtonElement
const px = (v: string) => parseFloat(v)

// Medidas esperadas por tamaño: kit de Figma (alto, relleno, separación, icono, texto) y
// Compose (radios cuadrado y presionado, borde del Outlined).
const SIZES: Record<
  ButtonSize,
  { h: number; pad: number; gap: number; icon: number; font: number; square: number; pressed: number; outline: number }
> = {
  xs: { h: 32, pad: 12, gap: 4, icon: 20, font: 14, square: 12, pressed: 8, outline: 1 },
  sm: { h: 40, pad: 16, gap: 8, icon: 20, font: 14, square: 12, pressed: 8, outline: 1 },
  md: { h: 56, pad: 24, gap: 8, icon: 24, font: 16, square: 16, pressed: 12, outline: 1 },
  lg: { h: 96, pad: 48, gap: 12, icon: 32, font: 24, square: 28, pressed: 16, outline: 2 },
  xl: { h: 136, pad: 64, gap: 16, icon: 40, font: 32, square: 28, pressed: 16, outline: 3 },
}

const icon = <svg viewBox="0 0 24 24" aria-hidden="true" />

describe('Button: estructura y accesibilidad', () => {
  test('es un <button type="button"> con sus átomos, sin aria-pressed si no es toggle', async () => {
    const c = await render(<Button>Guardar</Button>)
    const b = button(c)
    expect(b.type).toBe('button')
    expect(b.hasAttribute('aria-pressed')).toBe(false)
    expect(b.className).toBe('mk-button')
    expect(b.querySelectorAll(':scope > .mk-state-layer, :scope > .mk-ripple, :scope > .mk-focus-ring')).toHaveLength(3)
    expect(b.textContent).toBe('Guardar')
  })

  test('respeta type, className, aria y eventos propios', async () => {
    let clicks = 0
    const c = await render(
      <Button type="submit" className="mio" aria-label="Enviar" onClick={() => clicks++}>
        Enviar
      </Button>,
    )
    const b = button(c)
    expect(b.type).toBe('submit')
    expect(b.className).toBe('mk-button mio')
    expect(b.getAttribute('aria-label')).toBe('Enviar')
    await userEvent.click(b)
    expect(clicks).toBe(1)
  })

  test('como toggle expone aria-pressed true o false', async () => {
    const c = await render(
      <div>
        <Button selected>Sí</Button>
        <Button selected={false}>No</Button>
      </div>,
    )
    const [on, off] = c.querySelectorAll('button')
    expect(on?.getAttribute('aria-pressed')).toBe('true')
    expect(off?.getAttribute('aria-pressed')).toBe('false')
  })

  test('deshabilitado no recibe clics', async () => {
    let clicks = 0
    const c = await render(
      <Button disabled onClick={() => clicks++}>
        No
      </Button>,
    )
    await userEvent.click(button(c), { force: true })
    expect(clicks).toBe(0)
  })

  test('ref, className, style y props nativas llegan al <button>', async () => {
    const ref = createRef<HTMLButtonElement>()
    const c = await render(
      <Button ref={ref} className="mio" style={{ marginTop: 7 }} id="b1" name="accion" data-foo="bar">
        Guardar
      </Button>,
    )
    const b = button(c)
    expect(ref.current).toBe(b)
    expect(b.className).toBe('mk-button mio')
    expect(b.style.marginTop).toBe('7px')
    expect(b.id).toBe('b1')
    expect(b.name).toBe('accion')
    expect(b.dataset['foo']).toBe('bar')
  })
})

describe('Button: tamaños', () => {
  for (const [size, m] of Object.entries(SIZES) as [ButtonSize, (typeof SIZES)['xs']][]) {
    test(`${size}: alto ${m.h}, relleno ${m.pad}, separación ${m.gap}, icono ${m.icon}, texto ${m.font}`, async () => {
      const c = await render(
        <Button size={size}>
          {icon}
          Texto
        </Button>,
      )
      const s = style(button(c))
      expect(px(s.height)).toBe(m.h)
      expect(px(s.paddingLeft)).toBe(m.pad)
      expect(px(s.paddingRight)).toBe(m.pad)
      expect(px(s.columnGap)).toBe(m.gap)
      expect(px(s.fontSize)).toBe(m.font)
      expect(px(style(button(c).querySelector('svg')).width)).toBe(m.icon)
    })
  }

  test('el área táctil mide al menos 48 px aunque el botón sea más bajo', async () => {
    const c = await render(<Button size="xs">Chico</Button>)
    expect(px(getComputedStyle(button(c), '::before').height)).toBe(48)
  })
})

describe('Button: forma', () => {
  for (const [size, m] of Object.entries(SIZES) as [ButtonSize, (typeof SIZES)['xs']][]) {
    test(`${size}: redondo = mitad del alto, cuadrado = ${m.square}, toggle seleccionado = cuadrado`, async () => {
      const c = await render(
        <div>
          <Button size={size}>R</Button>
          <Button size={size} shape="square">C</Button>
          <Button size={size} selected>T</Button>
        </div>,
      )
      const [round, square, toggle] = [...c.querySelectorAll('button')].map((b) => px(style(b).borderTopLeftRadius))
      expect(round).toBe(m.h / 2)
      expect(square).toBe(m.square)
      expect(toggle).toBe(m.square)
    })
  }

  test('al presionar cambia al radio de presionado y vuelve al soltar', async () => {
    const c = await render(<Button size="md">Presionar</Button>)
    const b = button(c)
    await commands.pressDown('.mk-button')
    expect(b.matches(':active')).toBe(true)
    expect(px(style(b).borderTopLeftRadius)).toBe(SIZES.md.pressed)
    await commands.pressUp()
    expect(px(style(b).borderTopLeftRadius)).toBe(SIZES.md.h / 2)
  })

  test('el radio se anima con el resorte rápido espacial', async () => {
    const c = await render(<Button>Animado</Button>)
    const [property, easing] = withMotion(() => {
      const s = style(button(c))
      return [s.transitionProperty, s.transitionTimingFunction]
    })
    expect(property).toContain('border-radius')
    expect(easing).toContain('linear(')
  })
})

describe('Button: colores', () => {
  const cases: [ButtonVariant, boolean | undefined, string, string][] = [
    ['filled', undefined, 'primary', 'on-primary'],
    ['filled', true, 'primary', 'on-primary'],
    ['filled', false, 'surface-container', 'on-surface-variant'],
    ['tonal', undefined, 'secondary-container', 'on-secondary-container'],
    ['tonal', true, 'secondary', 'on-secondary'],
    ['outlined', true, 'inverse-surface', 'inverse-on-surface'],
    ['elevated', undefined, 'surface-container-low', 'primary'],
    ['elevated', true, 'primary', 'on-primary'],
  ]
  for (const [variant, selected, container, content] of cases) {
    const label = selected === undefined ? 'común' : selected ? 'seleccionado' : 'sin seleccionar'
    test(`${variant} ${label}: fondo ${container}, contenido ${content}`, async () => {
      const c = await render(
        <Button variant={variant} selected={selected}>
          X
        </Button>,
      )
      const s = style(button(c))
      expect(s.backgroundColor).toBe(roleColor(container))
      expect(s.color).toBe(roleColor(content))
    })
  }

  test('outlined y text no tienen fondo; outlined lleva borde interior outline-variant', async () => {
    const c = await render(
      <div>
        <Button variant="outlined">O</Button>
        <Button variant="text">T</Button>
      </div>,
    )
    const [outlined, text] = [...c.querySelectorAll('button')].map((b) => style(b))
    expect(outlined?.backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(outlined?.color).toBe(roleColor('on-surface-variant'))
    expect(outlined?.outlineColor).toBe(roleColor('outline-variant'))
    expect(outlined?.outlineWidth).toBe('1px')
    expect(outlined?.outlineOffset).toBe('-1px')
    expect(text?.backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(text?.color).toBe(roleColor('primary'))
  })

  test('el borde del outlined crece con el tamaño y no cambia el alto', async () => {
    const c = await render(
      <div>
        <Button variant="outlined" size="lg">L</Button>
        <Button variant="outlined" size="xl">XL</Button>
      </div>,
    )
    const [lg, xl] = [...c.querySelectorAll('button')].map((b) => style(b))
    expect(lg?.outlineWidth).toBe('2px')
    expect(xl?.outlineWidth).toBe('3px')
    expect(px(lg?.height ?? '')).toBe(96)
  })

  test('los estilos sin borde no dibujan contorno', async () => {
    const c = await render(<Button>F</Button>)
    expect(style(button(c)).outlineColor).toBe('rgba(0, 0, 0, 0)')
  })

  test('elevated: sombra nivel 1 en reposo y nivel 2 con el puntero', async () => {
    const c = await render(<Button variant="elevated">E</Button>)
    const b = button(c)
    expect(style(b).boxShadow).toContain('0px 1px 3px 1px')
    await userEvent.hover(b)
    expect(style(b).boxShadow).toContain('0px 2px 6px 2px')
  })

  test('un toggle deshabilitado también se atenúa, seleccionado o no', async () => {
    const c = await render(
      <div>
        <Button variant="tonal" selected disabled>T</Button>
        <Button variant="filled" selected={false} disabled>F</Button>
        <Button variant="elevated" selected aria-disabled="true">E</Button>
      </div>,
    )
    const onSurface = roleColor('on-surface').match(/\d+/g)?.slice(0, 3).join(', ')
    for (const b of c.querySelectorAll('button')) {
      expect(style(b).backgroundColor).toBe(`color(srgb ${rgbFraction(onSurface)} / 0.1)`)
      expect(style(b).color).toBe(`color(srgb ${rgbFraction(onSurface)} / 0.38)`)
    }
  })

  test('outlined: deshabilitado sin seleccionar sin fondo; seleccionado con fondo al 10 % y sin borde', async () => {
    const c = await render(
      <div>
        <Button variant="outlined" disabled>A</Button>
        <Button variant="outlined" selected disabled>B</Button>
      </div>,
    )
    const [plain, selected] = [...c.querySelectorAll('button')].map((b) => style(b))
    const onSurface = roleColor('on-surface').match(/\d+/g)?.slice(0, 3).join(', ')
    expect(plain?.backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(plain?.outlineColor).toBe(roleColor('outline-variant'))
    expect(selected?.backgroundColor).toBe(`color(srgb ${rgbFraction(onSurface)} / 0.1)`)
    expect(selected?.outlineColor).toBe('rgba(0, 0, 0, 0)')
  })

  test('deshabilitado: fondo on-surface al 10 % y contenido al 38 %, sin sombra', async () => {
    const c = await render(
      <Button variant="elevated" disabled>
        D
      </Button>,
    )
    const s = style(button(c))
    const onSurface = roleColor('on-surface').match(/\d+/g)?.slice(0, 3).join(', ')
    expect(s.backgroundColor).toBe(`color(srgb ${rgbFraction(onSurface)} / 0.1)`)
    expect(s.color).toBe(`color(srgb ${rgbFraction(onSurface)} / 0.38)`)
    expect(s.boxShadow).not.toContain('0px 1px 3px 1px')
  })
})

describe('Button: estados', () => {
  test('presionado con la onda: capa al 8 % y una onda al 10 % que se va al soltar', async () => {
    const c = await render(<Button size="md">Onda</Button>)
    const b = button(c)
    await commands.pressDown('.mk-button')
    expect(Number(style(b.querySelector('.mk-state-layer')).opacity)).toBeCloseTo(0.08)
    const wave = b.querySelector('.mk-ripple-wave')
    expect(wave).not.toBeNull()
    expect(Number(style(wave).opacity)).toBeCloseTo(0.1)
    await commands.pressUp()
    // La onda se desvanece en 200 ms; con varias pruebas en paralelo puede tardar más.
    await expect.poll(() => b.querySelector('.mk-ripple-wave'), { timeout: 2000 }).toBeNull()
  })

  test('deshabilitado no muestra onda', async () => {
    await render(<Button disabled>Nada</Button>)
    await commands.pressDown('.mk-button')
    expect(document.querySelector('.mk-ripple-wave')).toBeNull()
    await commands.pressUp()
  })

  test('foco de teclado: anillo visible y capa al 10 %, sin onda', async () => {
    const c = await render(<Button>Teclado</Button>)
    await userEvent.tab()
    const b = button(c)
    expect(document.activeElement).toBe(b)
    expect(style(b.querySelector('.mk-focus-ring')).opacity).toBe('1')
    expect(Number(style(b.querySelector('.mk-state-layer')).opacity)).toBeCloseTo(0.1)
    expect(b.querySelector('.mk-ripple-wave')).toBeNull()
  })
})

/** Enlace propio que imita al Link de Next.js y React Router: reparte sus props en el <a>. */
function FakeLink({ to, prefetch, ref, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; prefetch?: boolean; ref?: Ref<HTMLAnchorElement> }) {
  return <a {...props} href={to} data-prefetch={String(prefetch)} ref={ref} />
}

// Propiedades que dibujan el botón: con href o render tienen que dar lo mismo que el <button>.
const DRAWN = [
  'display', 'height', 'min-width', 'padding-left', 'padding-right', 'column-gap', 'box-sizing',
  'border-top-left-radius', 'background-color', 'color', 'box-shadow', 'outline-color',
  'outline-width', 'outline-offset', 'font-family', 'font-size', 'font-weight', 'line-height',
  'letter-spacing', 'text-decoration-line', 'cursor', 'white-space', 'align-items', 'justify-content',
] as const

describe('Button: como enlace (ADR-0010)', () => {
  afterEach(() => history.replaceState(null, '', location.pathname + location.search))

  test('con href es un <a> con su nombre, las clases, los átomos y la ref; sin type ni aria-pressed', async () => {
    const ref = createRef<HTMLAnchorElement>()
    await render(<Button variant="tonal" size="md" href="#detalle" className="mio" ref={ref} target="_self">Ver detalle</Button>)
    const a = page.getByRole('link', { name: 'Ver detalle' }).element() as HTMLAnchorElement
    expect(a.tagName).toBe('A')
    expect(a.getAttribute('href')).toBe('#detalle')
    expect(a.target).toBe('_self')
    expect(a.className).toBe('mk-button mio')
    expect(a.dataset).toMatchObject({ variant: 'tonal', size: 'md', shape: 'round' })
    expect(a.hasAttribute('type')).toBe(false)
    expect(a.hasAttribute('aria-pressed')).toBe(false)
    expect(a.querySelectorAll(':scope > .mk-state-layer, :scope > .mk-ripple, :scope > .mk-focus-ring')).toHaveLength(3)
    expect(ref.current).toBe(a)
  })

  test('con render, el enlace del enrutador recibe las clases (también las suyas), las props y la ref', async () => {
    const ref = createRef<HTMLElement>()
    await render(
      <Button variant="outlined" ref={ref} id="b1" data-foo="bar" render={<FakeLink to="/pedidos/42" prefetch={false} className="propia" />}>
        Ver detalle
      </Button>,
    )
    const a = page.getByRole('link', { name: 'Ver detalle' }).element() as HTMLAnchorElement
    expect(a.getAttribute('href')).toBe('/pedidos/42')
    expect(a.className).toBe('mk-button propia')
    expect(a.dataset).toMatchObject({ prefetch: 'false', foo: 'bar', variant: 'outlined', size: 'sm' })
    expect(a.id).toBe('b1')
    expect(ref.current).toBe(a)
    expect(a.querySelectorAll(':scope > .mk-state-layer, :scope > .mk-ripple, :scope > .mk-focus-ring')).toHaveLength(3)
  })

  for (const variant of ['filled', 'tonal', 'outlined', 'elevated', 'text'] as const) {
    for (const size of ['xs', 'md', 'xl'] as const) {
      test(`${variant} ${size}: el <a> mide y se pinta igual que el <button>`, async () => {
        const c = await render(
          <div>
            <Button variant={variant} size={size} shape="square">{icon}Texto</Button>
            <Button variant={variant} size={size} shape="square" href="#x">{icon}Texto</Button>
          </div>,
        )
        const b = button(c)
        const a = c.querySelector('a') as HTMLAnchorElement
        for (const prop of DRAWN) {
          expect(style(a).getPropertyValue(prop), prop).toBe(style(b).getPropertyValue(prop))
        }
        expect(a.getBoundingClientRect().width).toBeCloseTo(b.getBoundingClientRect().width, 2)
        expect(a.getBoundingClientRect().height).toBeCloseTo(SIZES[size].h, 2)
        expect(px(style(a.querySelector('svg')).width)).toBe(SIZES[size].icon)
        // Área táctil: el ::before es el mismo.
        expect(getComputedStyle(a, '::before').height).toBe(getComputedStyle(b, '::before').height)
      })
    }
  }

  test('sin subrayado y con el color del estilo, también en un enlace ya visitado', async () => {
    // La página actual está en el historial, así que este enlace es :visited. getComputedStyle
    // no revela el estilo de :visited (privacidad): devuelve el de :link. Lo que sí se prueba es
    // que el color y la decoración vienen de la clase, que gana a la hoja del navegador para
    // los dos estados; :visited solo puede cambiar colores, y ninguna regla de matekit lo usa.
    const c = await render(<Button variant="text" href={location.href}>Visitado</Button>)
    const a = c.querySelector('a') as HTMLAnchorElement
    expect(style(a).textDecorationLine).toBe('none')
    expect(style(a).color).toBe(roleColor('primary'))
    expect(style(a).cursor).toBe('pointer')
  })

  test('el teclado: Tab lo enfoca con el anillo visible y Enter sigue el enlace', async () => {
    const c = await render(<Button href="#destino">Ir</Button>)
    const a = c.querySelector('a') as HTMLAnchorElement
    await userEvent.tab()
    expect(document.activeElement).toBe(a)
    expect(style(a.querySelector('.mk-focus-ring')).opacity).toBe('1')
    expect(Number(style(a.querySelector('.mk-state-layer')).opacity)).toBeCloseTo(0.1)
    await userEvent.keyboard('{Enter}')
    await expect.poll(() => location.hash).toBe('#destino')
  })

  test('presionado: cambia al radio de presionado y muestra la onda, como el <button>', async () => {
    const c = await render(<Button size="md" href="#x">Onda</Button>)
    const a = c.querySelector('a') as HTMLAnchorElement
    // Sin que el navegador arrastre el enlace mientras está apretado.
    a.addEventListener('dragstart', (e) => e.preventDefault())
    await commands.pressDown('.mk-button')
    expect(px(style(a).borderTopLeftRadius)).toBe(SIZES.md.pressed)
    expect(Number(style(a.querySelector('.mk-state-layer')).opacity)).toBeCloseTo(0.08)
    expect(a.querySelector('.mk-ripple-wave')).not.toBeNull()
    await commands.pressUp()
    expect(px(style(a).borderTopLeftRadius)).toBe(SIZES.md.h / 2)
  })

  test('elevated: la sombra sube con el puntero también como enlace', async () => {
    const c = await render(<Button variant="elevated" href="#x">E</Button>)
    const a = c.querySelector('a') as HTMLAnchorElement
    expect(style(a).boxShadow).toContain('0px 1px 3px 1px')
    await userEvent.hover(a)
    expect(style(a).boxShadow).toContain('0px 2px 6px 2px')
  })

  test('los tipos rechazan el toggle y el deshabilitado en un enlace', () => {
    // Solo comprobación de tipos (pnpm typecheck); no se dibuja nada.
    const ok = [
      <Button key="1" selected>Toggle</Button>,
      <Button key="2" disabled>No</Button>,
      <Button key="3" href="/x">Enlace</Button>,
      <Button key="4" render={<FakeLink to="/x" />}>Enlace</Button>,
    ]
    const wrong = [
      // @ts-expect-error: un enlace no es un toggle.
      <Button key="5" href="/x" selected>Enlace</Button>,
      // @ts-expect-error: un enlace no es un toggle (tampoco con render).
      <Button key="6" render={<FakeLink to="/x" />} selected={false}>Enlace</Button>,
      // @ts-expect-error: un <a> no tiene disabled.
      <Button key="7" href="/x" disabled>Enlace</Button>,
      // @ts-expect-error: aria-disabled en un <a href> no lo deshabilita (ARIA in HTML).
      <Button key="8" href="/x" aria-disabled="true">Enlace</Button>,
    ]
    expect(ok.length + wrong.length).toBe(8)
  })
})

// "29, 27, 32" -> "0.113725 0.105882 0.12549", como serializa Chrome los colores de color-mix.
function rgbFraction(rgb: string | undefined): string {
  return (rgb ?? '')
    .split(', ')
    .map((n) => +(Number(n) / 255).toFixed(6))
    .join(' ')
}
