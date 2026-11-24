import { createRef } from 'react'
import { describe, expect, test } from 'vitest'
import { commands, userEvent } from 'vitest/browser'
import { SearchIcon, StarIcon } from '../../icons/icons.tsx'
import { IconButton, type IconButtonSize, type IconButtonVariant, type IconButtonWidth } from './IconButton.tsx'
import { render, roleColor, style, withMotion } from '../../test/render.tsx'

const button = (c: HTMLElement) => c.querySelector('button') as HTMLButtonElement
const px = (v: string) => parseFloat(v)

// Medidas esperadas por tamaño. Alto y anchos: kit (05-medidas.md, Medium y la tabla de
// variantes) y Compose *IconButtonTokens.kt (icono + 2 × espacio lateral). Icono: Compose
// (Medium 24 y Small 24 también en el kit). Radios y borde: Compose.
const SIZES: Record<
  IconButtonSize,
  {
    h: number
    widths: Record<IconButtonWidth, number>
    icon: number
    square: number
    pressed: number
    outline: number
  }
> = {
  xs: { h: 32, widths: { narrow: 28, default: 32, wide: 40 }, icon: 20, square: 12, pressed: 8, outline: 1 },
  sm: { h: 40, widths: { narrow: 32, default: 40, wide: 52 }, icon: 24, square: 12, pressed: 8, outline: 1 },
  md: { h: 56, widths: { narrow: 48, default: 56, wide: 72 }, icon: 24, square: 16, pressed: 12, outline: 1 },
  lg: { h: 96, widths: { narrow: 64, default: 96, wide: 128 }, icon: 32, square: 28, pressed: 16, outline: 2 },
  xl: { h: 136, widths: { narrow: 104, default: 136, wide: 184 }, icon: 40, square: 28, pressed: 16, outline: 3 },
}
const WIDTHS: IconButtonWidth[] = ['narrow', 'default', 'wide']
const entries = Object.entries(SIZES) as [IconButtonSize, (typeof SIZES)['xs']][]

describe('IconButton: estructura y accesibilidad', () => {
  test('es un <button type="button"> con aria-label y sus átomos, sin aria-pressed si no es toggle', async () => {
    const c = await render(
      <IconButton label="Buscar">
        <SearchIcon />
      </IconButton>,
    )
    const b = button(c)
    expect(b.type).toBe('button')
    expect(b.getAttribute('aria-label')).toBe('Buscar')
    expect(b.hasAttribute('aria-pressed')).toBe(false)
    expect(b.className).toBe('mk-icon-button')
    expect(b.dataset).toMatchObject({ variant: 'standard', size: 'sm', width: 'default', shape: 'round' })
    expect(b.querySelectorAll(':scope > .mk-state-layer, :scope > .mk-ripple, :scope > .mk-focus-ring')).toHaveLength(3)
    // El icono queda oculto: el nombre accesible es solo el label.
    expect(b.querySelector('.mk-icon')?.getAttribute('aria-hidden')).toBe('true')
  })

  test('como toggle expone aria-pressed true o false', async () => {
    const c = await render(
      <div>
        <IconButton label="Sí" selected>
          <StarIcon filled />
        </IconButton>
        <IconButton label="No" selected={false}>
          <StarIcon />
        </IconButton>
      </div>,
    )
    const [on, off] = c.querySelectorAll('button')
    expect(on?.getAttribute('aria-pressed')).toBe('true')
    expect(off?.getAttribute('aria-pressed')).toBe('false')
  })

  test('respeta type, recibe clics y el label gana sobre cualquier aria-label', async () => {
    let clicks = 0
    const extra = { 'aria-label': 'otro' } as object
    const c = await render(
      <IconButton type="submit" label="Enviar" {...extra} onClick={() => clicks++}>
        <SearchIcon />
      </IconButton>,
    )
    const b = button(c)
    expect(b.type).toBe('submit')
    expect(b.getAttribute('aria-label')).toBe('Enviar')
    await userEvent.click(b)
    expect(clicks).toBe(1)
  })

  test('deshabilitado no recibe clics ni muestra onda', async () => {
    let clicks = 0
    const c = await render(
      <IconButton label="No" disabled onClick={() => clicks++}>
        <SearchIcon />
      </IconButton>,
    )
    await userEvent.click(button(c), { force: true })
    expect(clicks).toBe(0)
    await commands.pressDown('.mk-icon-button')
    expect(document.querySelector('.mk-ripple-wave')).toBeNull()
    await commands.pressUp()
  })

  test('ref, className, style y props nativas llegan al <button>', async () => {
    const ref = createRef<HTMLButtonElement>()
    const c = await render(
      <IconButton
        ref={ref}
        label="Más"
        className="mio"
        style={{ marginTop: 7 }}
        id="ib1"
        name="accion"
        value="mas"
        title="Más opciones"
        aria-describedby="ayuda"
        data-foo="bar"
      >
        <SearchIcon />
      </IconButton>,
    )
    const b = button(c)
    expect(ref.current).toBe(b)
    expect(b.className).toBe('mk-icon-button mio')
    expect(b.style.marginTop).toBe('7px')
    expect(b.id).toBe('ib1')
    expect(b.name).toBe('accion')
    expect(b.value).toBe('mas')
    expect(b.title).toBe('Más opciones')
    expect(b.getAttribute('aria-describedby')).toBe('ayuda')
    expect(b.dataset.foo).toBe('bar')
  })
})

describe('IconButton: tamaños y anchos', () => {
  for (const [size, m] of entries) {
    for (const width of WIDTHS) {
      test(`${size} ${width}: ${m.widths[width]} × ${m.h}, icono ${m.icon}`, async () => {
        const c = await render(
          <IconButton label="X" size={size} width={width}>
            <SearchIcon />
          </IconButton>,
        )
        const b = button(c)
        const rect = b.getBoundingClientRect()
        expect(rect.height).toBe(m.h)
        expect(rect.width).toBe(m.widths[width])
        const iconRect = (b.querySelector('.mk-icon') as HTMLElement).getBoundingClientRect()
        expect(iconRect.width).toBe(m.icon)
        expect(iconRect.height).toBe(m.icon)
        // Icono centrado.
        expect(iconRect.left - rect.left).toBe((m.widths[width] - m.icon) / 2)
        expect(iconRect.top - rect.top).toBe((m.h - m.icon) / 2)
      })
    }
  }

  test('el icono toma el tamaño de --mk-icon-size aunque no sea hijo directo', async () => {
    const c = await render(
      <IconButton label="X" size="xl">
        <span>
          <SearchIcon />
        </span>
      </IconButton>,
    )
    const b = button(c)
    expect(style(b).getPropertyValue('--mk-icon-size').trim()).toBe('40px')
    expect(px(style(b.querySelector('.mk-icon')).width)).toBe(40)
  })

  test('el área táctil mide al menos 48 × 48 aunque el botón sea más chico', async () => {
    const c = await render(
      <div>
        <IconButton label="X" size="xs" width="narrow">
          <SearchIcon />
        </IconButton>
        <IconButton label="M" size="md" width="wide">
          <SearchIcon />
        </IconButton>
      </div>,
    )
    const [xs, md] = [...c.querySelectorAll('button')].map((b) => getComputedStyle(b, '::before'))
    expect(px(xs?.width ?? '')).toBe(48)
    expect(px(xs?.height ?? '')).toBe(48)
    expect(px(md?.width ?? '')).toBe(72)
    expect(px(md?.height ?? '')).toBe(56)
  })
})

describe('IconButton: forma', () => {
  for (const [size, m] of entries) {
    test(`${size}: redondo = mitad del lado menor, cuadrado = ${m.square}; al seleccionar se intercambian`, async () => {
      const c = await render(
        <div>
          <IconButton label="R" size={size}><SearchIcon /></IconButton>
          <IconButton label="N" size={size} width="narrow"><SearchIcon /></IconButton>
          <IconButton label="C" size={size} shape="square"><SearchIcon /></IconButton>
          <IconButton label="RS" size={size} selected><SearchIcon /></IconButton>
          <IconButton label="CS" size={size} shape="square" selected><SearchIcon /></IconButton>
        </div>,
      )
      const [round, narrow, square, roundSel, squareSel] = [...c.querySelectorAll('button')].map((b) =>
        px(style(b).borderTopLeftRadius),
      )
      expect(round).toBe(m.h / 2)
      expect(narrow).toBe(Math.min(m.h, m.widths.narrow) / 2)
      expect(square).toBe(m.square)
      expect(roundSel).toBe(m.square)
      expect(squareSel).toBe(m.h / 2)
    })
  }

  for (const [size, m] of entries) {
    test(`${size}: al presionar cambia al radio ${m.pressed} y vuelve al soltar`, async () => {
      const c = await render(
        <IconButton label="P" size={size} shape="square" selected>
          <SearchIcon />
        </IconButton>,
      )
      const b = button(c)
      await commands.pressDown('.mk-icon-button')
      expect(b.matches(':active')).toBe(true)
      expect(px(style(b).borderTopLeftRadius)).toBe(m.pressed)
      await commands.pressUp()
      expect(px(style(b).borderTopLeftRadius)).toBe(m.h / 2)
    })
  }

  test('el radio se anima con el resorte rápido espacial', async () => {
    const c = await render(<IconButton label="A"><SearchIcon /></IconButton>)
    const [property, easing] = withMotion(() => {
      const s = style(button(c))
      return [s.transitionProperty, s.transitionTimingFunction]
    })
    expect(property).toContain('border-radius')
    expect(easing).toContain('linear(')
  })
})

describe('IconButton: colores', () => {
  const transparent = 'rgba(0, 0, 0, 0)'
  const cases: [IconButtonVariant, boolean | undefined, string | null, string][] = [
    ['standard', undefined, null, 'on-surface-variant'],
    ['standard', true, null, 'primary'],
    ['standard', false, null, 'on-surface-variant'],
    ['filled', undefined, 'primary', 'on-primary'],
    ['filled', true, 'primary', 'on-primary'],
    ['filled', false, 'surface-container', 'on-surface-variant'],
    ['tonal', undefined, 'secondary-container', 'on-secondary-container'],
    ['tonal', true, 'secondary', 'on-secondary'],
    ['tonal', false, 'secondary-container', 'on-secondary-container'],
    ['outlined', undefined, null, 'on-surface-variant'],
    ['outlined', true, 'inverse-surface', 'inverse-on-surface'],
    ['outlined', false, null, 'on-surface-variant'],
  ]
  for (const [variant, selected, container, content] of cases) {
    const label = selected === undefined ? 'común' : selected ? 'seleccionado' : 'sin seleccionar'
    test(`${variant} ${label}: fondo ${container ?? 'ninguno'}, icono ${content}`, async () => {
      const c = await render(
        <IconButton label="X" variant={variant} selected={selected}>
          <SearchIcon />
        </IconButton>,
      )
      const s = style(button(c))
      expect(s.backgroundColor).toBe(container ? roleColor(container) : transparent)
      expect(s.color).toBe(roleColor(content))
    })
  }

  test('outlined: borde interior outline-variant que crece con el tamaño; seleccionado, sin borde', async () => {
    const c = await render(
      <div>
        {entries.map(([size]) => (
          <IconButton key={size} label={size} variant="outlined" size={size}><SearchIcon /></IconButton>
        ))}
        <IconButton label="sel" variant="outlined" selected><SearchIcon /></IconButton>
      </div>,
    )
    const buttons = [...c.querySelectorAll('button')]
    entries.forEach(([, m], i) => {
      const s = style(buttons[i] ?? null)
      expect(s.outlineColor).toBe(roleColor('outline-variant'))
      expect(s.outlineWidth).toBe(`${m.outline}px`)
      expect(s.outlineOffset).toBe(`-${m.outline}px`)
      expect(px(s.height)).toBe(m.h)
    })
    expect(style(buttons.at(-1) ?? null).outlineColor).toBe(transparent)
  })

  test('los estilos sin borde no dibujan contorno ni se elevan con el puntero', async () => {
    const c = await render(<IconButton label="F" variant="filled"><SearchIcon /></IconButton>)
    const b = button(c)
    expect(style(b).outlineColor).toBe(transparent)
    await userEvent.hover(b)
    expect(style(b).boxShadow).toBe('none')
  })

  describe('deshabilitado', () => {
    const onSurface = () => rgbFraction(roleColor('on-surface').match(/\d+/g)?.slice(0, 3).join(', '))
    const dimmed = (alpha: number) => `color(srgb ${onSurface()} / ${alpha})`

    const filledCases: [IconButtonVariant, boolean | undefined][] = [
      ['filled', undefined],
      ['filled', true],
      ['filled', false],
      ['tonal', undefined],
      ['tonal', true],
      ['outlined', true],
    ]
    for (const [variant, selected] of filledCases) {
      test(`${variant} ${selected === undefined ? 'común' : selected ? 'seleccionado' : 'sin seleccionar'}: fondo al 10 % e icono al 38 %`, async () => {
        const c = await render(
          <IconButton label="D" variant={variant} selected={selected} disabled>
            <SearchIcon />
          </IconButton>,
        )
        const s = style(button(c))
        expect(s.backgroundColor).toBe(dimmed(0.1))
        expect(s.color).toBe(dimmed(0.38))
      })
    }

    const bareCases: [IconButtonVariant, boolean | undefined][] = [
      ['standard', undefined],
      ['standard', true],
      ['outlined', undefined],
      ['outlined', false],
    ]
    for (const [variant, selected] of bareCases) {
      test(`${variant} ${selected === undefined ? 'común' : selected ? 'seleccionado' : 'sin seleccionar'}: sin fondo e icono al 38 %`, async () => {
        const c = await render(
          <IconButton label="D" variant={variant} selected={selected} disabled>
            <SearchIcon />
          </IconButton>,
        )
        const s = style(button(c))
        expect(s.backgroundColor).toBe(transparent)
        expect(s.color).toBe(dimmed(0.38))
      })
    }

    test('outlined: borde outline-variant sin seleccionar y sin borde seleccionado', async () => {
      const c = await render(
        <div>
          <IconButton label="A" variant="outlined" disabled><SearchIcon /></IconButton>
          <IconButton label="B" variant="outlined" selected disabled><SearchIcon /></IconButton>
        </div>,
      )
      const [plain, sel] = [...c.querySelectorAll('button')].map((b) => style(b))
      expect(plain?.outlineColor).toBe(roleColor('outline-variant'))
      expect(sel?.outlineColor).toBe(transparent)
    })

    test('aria-disabled="true" se ve igual que disabled', async () => {
      const c = await render(
        <IconButton label="D" variant="tonal" selected aria-disabled="true">
          <SearchIcon />
        </IconButton>,
      )
      const s = style(button(c))
      expect(s.backgroundColor).toBe(dimmed(0.1))
      expect(s.color).toBe(dimmed(0.38))
    })
  })
})

describe('IconButton: estados', () => {
  test('foco de teclado: anillo visible y capa al 10 %, sin onda', async () => {
    const c = await render(<IconButton label="Teclado"><SearchIcon /></IconButton>)
    await userEvent.tab()
    const b = button(c)
    expect(document.activeElement).toBe(b)
    expect(style(b.querySelector('.mk-focus-ring')).opacity).toBe('1')
    expect(Number(style(b.querySelector('.mk-state-layer')).opacity)).toBeCloseTo(0.1)
    expect(b.querySelector('.mk-ripple-wave')).toBeNull()
  })

  test('Espacio activa el botón con el teclado', async () => {
    let clicks = 0
    await render(<IconButton label="K" onClick={() => clicks++}><SearchIcon /></IconButton>)
    await userEvent.tab()
    await userEvent.keyboard(' ')
    await userEvent.keyboard('{Enter}')
    expect(clicks).toBe(2)
  })

  test('presionado con la onda: capa al 8 % del color del icono y onda al 10 %', async () => {
    const c = await render(
      <IconButton label="Onda" size="md" selected>
        <SearchIcon />
      </IconButton>,
    )
    const b = button(c)
    await commands.pressDown('.mk-icon-button')
    const layer = style(b.querySelector('.mk-state-layer'))
    expect(Number(layer.opacity)).toBeCloseTo(0.08)
    expect(layer.backgroundColor).toBe(roleColor('primary'))
    const wave = b.querySelector('.mk-ripple-wave')
    expect(wave).not.toBeNull()
    expect(Number(style(wave).opacity)).toBeCloseTo(0.1)
    await commands.pressUp()
    await expect.poll(() => b.querySelector('.mk-ripple-wave'), { timeout: 2000 }).toBeNull()
  })
})

// "29, 27, 32" -> "0.113725 0.105882 0.12549", como serializa Chrome los colores de color-mix.
function rgbFraction(rgb: string | undefined): string {
  return (rgb ?? '')
    .split(', ')
    .map((n) => +(Number(n) / 255).toFixed(6))
    .join(' ')
}
