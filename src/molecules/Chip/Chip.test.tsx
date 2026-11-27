import { createRef, useState, type ReactNode } from 'react'
import { describe, expect, test } from 'vitest'
import { commands, page, server, userEvent } from 'vitest/browser'
import { CheckIcon, ArrowDropDownIcon, StarIcon } from '../../icons/icons.tsx'
import { render, roleColor, style } from '../../test/render.tsx'
import { AssistChip } from './AssistChip.tsx'
import { ChipAvatar, ChipLabel } from './chip-content.tsx'
import { ChipGroup } from './ChipGroup.tsx'
import { FilterChip } from './FilterChip.tsx'
import { InputChip } from './InputChip.tsx'
import { SuggestionChip } from './SuggestionChip.tsx'

const q = <T extends Element = HTMLElement>(c: ParentNode, sel: string) => {
  const el = c.querySelector<T>(sel)
  if (!el) throw new Error(`no se encontró ${sel}`)
  return el
}
const rect = (el: Element) => el.getBoundingClientRect()

/** Valor calculado de un color CSS cualquiera (para color-mix de los tokens). */
function computedColor(css: string): string {
  const probe = document.createElement('span')
  probe.style.color = css
  document.body.append(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value
}
const mix = (role: string, opacityToken: string) =>
  computedColor(`color-mix(in srgb, var(--md-sys-color-${role}) calc(var(--md-sys-state-${opacityToken}) * 100%), transparent)`)
function shadow(level: number): string {
  const probe = document.createElement('span')
  probe.style.boxShadow = `var(--md-sys-elevation-level${level})`
  document.body.append(probe)
  const value = getComputedStyle(probe).boxShadow
  probe.remove()
  return value
}

const TRANSPARENT = 'rgba(0, 0, 0, 0)'

describe('Chips: roles y nombres', () => {
  test('assist: <button type="button"> con sus átomos; con href, un <a>; con render, el elemento', async () => {
    function Link({ to, ...props }: { to: string; className?: string; children?: ReactNode }) {
      return <a href={to} data-router="" {...props} />
    }
    const c = await render(
      <div>
        <AssistChip className="b"><StarIcon />Agendar</AssistChip>
        <AssistChip className="a" href="#mapa">Ver mapa</AssistChip>
        <AssistChip className="r" render={<Link to="#ruta" />}>Ruta</AssistChip>
      </div>,
    )
    const b = q<HTMLButtonElement>(c, '.b')
    expect(b.tagName).toBe('BUTTON')
    expect(b.type).toBe('button')
    expect(b.hasAttribute('aria-pressed')).toBe(false)
    expect(b.querySelectorAll(':scope > .mk-state-layer, :scope > .mk-ripple, :scope > .mk-focus-ring')).toHaveLength(3)
    expect(q(c, '.a').tagName).toBe('A')
    expect(q(c, '.a').getAttribute('href')).toBe('#mapa')
    expect(q(c, '.r').hasAttribute('data-router')).toBe(true)
    expect(q(c, '.r').className).toBe('mk-chip r')
    await expect.element(page.getByRole('button', { name: 'Agendar' })).toBeInTheDocument()
    await expect.element(page.getByRole('link', { name: 'Ver mapa' })).toBeInTheDocument()
  })

  test('suggestion: botón, enlace y toggle con aria-pressed', async () => {
    const c = await render(
      <div>
        <SuggestionChip className="s">Dale</SuggestionChip>
        <SuggestionChip className="on" selected>Sí</SuggestionChip>
        <SuggestionChip className="l" href="#q">Buscar</SuggestionChip>
      </div>,
    )
    expect(q(c, '.s').hasAttribute('aria-pressed')).toBe(false)
    expect(q(c, '.on').getAttribute('aria-pressed')).toBe('true')
    expect(q(c, '.l').tagName).toBe('A')
  })

  test('filter: siempre toggle (aria-pressed false por defecto); seleccionado, la marca reemplaza al icono', async () => {
    const c = await render(
      <div>
        <FilterChip className="off"><StarIcon className="mio" />Favoritos</FilterChip>
        <FilterChip className="on" selected><StarIcon className="mio" />Favoritos</FilterChip>
      </div>,
    )
    expect(q(c, '.off').getAttribute('aria-pressed')).toBe('false')
    expect(q(c, '.on').getAttribute('aria-pressed')).toBe('true')
    expect(c.querySelector('.off .mk-chip-check')).toBeNull()
    expect(c.querySelector('.off .mio')).not.toBeNull()
    expect(c.querySelector('.on .mk-chip-check')).not.toBeNull()
    expect(c.querySelector('.on .mio')).toBeNull()
    await expect.element(page.getByRole('button', { name: 'Favoritos', pressed: true })).toBeInTheDocument()
  })

  test('input: acción principal y botón "Remove <etiqueta>"; removeLabel, aria-label y removeOnly', async () => {
    const c = await render(
      <div>
        <InputChip className="ana" onRemove={() => {}}>Ana</InputChip>
        <InputChip className="en" removeLabel="Quitar" onRemove={() => {}}>Bea</InputChip>
        <InputChip className="al" aria-label="Carla Pérez" onRemove={() => {}}>Carla</InputChip>
        <InputChip className="ro" removeOnly onRemove={() => {}}>Dani</InputChip>
        <InputChip className="sel" selected onRemove={() => {}}>Eva</InputChip>
      </div>,
    )
    expect(q(c, '.ana').tagName).toBe('SPAN')
    expect(q(c, '.ana > .mk-input-chip-primary').tagName).toBe('BUTTON')
    await expect.element(page.getByRole('button', { name: 'Ana', exact: true })).toBeInTheDocument()
    await expect.element(page.getByRole('button', { name: 'Remove Ana' })).toBeInTheDocument()
    await expect.element(page.getByRole('button', { name: 'Quitar Bea' })).toBeInTheDocument()
    await expect.element(page.getByRole('button', { name: 'Remove Carla Pérez' })).toBeInTheDocument()
    expect(q(c, '.ro > .mk-input-chip-primary').tagName).toBe('SPAN')
    await expect.element(page.getByRole('button', { name: 'Remove Dani' })).toBeInTheDocument()
    expect(c.querySelectorAll('.ro button')).toHaveLength(1)
    expect(q(c, '.sel > .mk-input-chip-primary').getAttribute('aria-pressed')).toBe('true')
    expect(q(c, '.ana > .mk-input-chip-primary').hasAttribute('aria-pressed')).toBe(false)
  })

  test('grupo: role="toolbar" horizontal con nombre', async () => {
    await render(
      <ChipGroup aria-label="Filtros">
        <FilterChip>Uno</FilterChip>
      </ChipGroup>,
    )
    const g = page.getByRole('toolbar', { name: 'Filtros' })
    await expect.element(g).toHaveAttribute('aria-orientation', 'horizontal')
  })

  test('props nativas y ref llegan al elemento principal; className y style al contenedor del input', async () => {
    const a = createRef<HTMLButtonElement>()
    const f = createRef<HTMLButtonElement>()
    const i = createRef<HTMLButtonElement>()
    const g = createRef<HTMLDivElement>()
    const c = await render(
      <ChipGroup aria-label="G" ref={g} id="grupo" data-x="g">
        <AssistChip ref={a} id="a" data-x="1" title="t">A</AssistChip>
        <FilterChip ref={f} name="f" value="v">F</FilterChip>
        <InputChip ref={i} id="i" className="ic" style={{ marginInlineStart: 4 }} onRemove={() => {}}>I</InputChip>
      </ChipGroup>,
    )
    expect(a.current).toBe(q(c, '#a'))
    expect(a.current?.dataset['x']).toBe('1')
    expect(a.current?.title).toBe('t')
    expect(f.current?.name).toBe('f')
    expect(f.current?.value).toBe('v')
    expect(i.current).toBe(q(c, '#i'))
    expect(i.current?.className).toBe('mk-input-chip-primary')
    expect(q(c, '.ic').style.marginInlineStart).toBe('4px')
    expect(g.current).toBe(q(c, '#grupo'))
    expect(g.current?.dataset['x']).toBe('g')
  })

  test('disabled: no recibe clics ni foco', async () => {
    let clicks = 0
    let removed = 0
    const c = await render(
      <div>
        <FilterChip disabled onClick={() => clicks++}>F</FilterChip>
        <InputChip disabled onRemove={() => removed++}>I</InputChip>
      </div>,
    )
    for (const b of c.querySelectorAll('button')) expect(b.disabled).toBe(true)
    await userEvent.click(q(c, '.mk-chip'), { force: true })
    await userEvent.click(q(c, '.mk-input-chip-remove'), { force: true })
    expect(clicks).toBe(0)
    expect(removed).toBe(0)
  })
})

describe('Chips: medidas y rellenos por configuración (kit)', () => {
  // Distancias desde el borde del chip: [inicio, final] del contenido.
  test('alto 32, radio 8, Label Large, iconos de 18 y rellenos 16/16, 8/16, 16/8', async () => {
    const c = await render(
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'start', gap: 8 }}>
        <AssistChip className="t">Texto</AssistChip>
        <AssistChip className="l"><StarIcon />Texto</AssistChip>
        <FilterChip className="tr">Texto<ArrowDropDownIcon /></FilterChip>
        <FilterChip className="lt" selected>Texto<ArrowDropDownIcon /></FilterChip>
      </div>,
    )
    const pad = (sel: string) => {
      const chip = rect(q(c, sel))
      const first = q(c, `${sel} > :is(.mk-chip-leading, .mk-chip-label)`)
      const last = q(c, `${sel} > :is(.mk-chip-trailing, .mk-chip-label):last-child`)
      return [rect(first).left - chip.left, chip.right - rect(last).right]
    }
    for (const sel of ['.t', '.l', '.tr', '.lt']) {
      const s = style(q(c, sel))
      expect(s.height, sel).toBe('32px')
      expect(s.borderTopLeftRadius, sel).toBe('8px')
      expect(s.fontSize, sel).toBe('14px')
      expect(s.fontWeight, sel).toBe('500')
    }
    const [t0, t1] = pad('.t')
    expect(t0).toBeCloseTo(16, 2)
    expect(t1).toBeCloseTo(16, 2)
    const [l0, l1] = pad('.l')
    expect(l0).toBeCloseTo(8, 2)
    expect(l1).toBeCloseTo(16, 2)
    expect(rect(q(c, '.l .mk-icon')).width).toBeCloseTo(18, 2)
    expect(rect(q(c, '.l .mk-chip-label')).left - rect(q(c, '.l .mk-icon')).right).toBeCloseTo(8, 2)
    const [r0, r1] = pad('.tr')
    expect(r0).toBeCloseTo(16, 2)
    expect(r1).toBeCloseTo(8, 2)
    const [b0, b1] = pad('.lt')
    expect(b0).toBeCloseTo(8, 2)
    expect(b1).toBeCloseTo(8, 2)
    expect(rect(q(c, '.lt .mk-chip-check')).width).toBeCloseTo(18, 2)
  })

  test('input: 12, 8 o 4 al inicio y el botón de quitar 8 + 18 + 8; con avatar de 24, redondo', async () => {
    const c = await render(
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'start', gap: 8 }}>
        <InputChip className="t" onRemove={() => {}}>Texto</InputChip>
        <InputChip className="i" onRemove={() => {}}><StarIcon />Texto</InputChip>
        <InputChip className="a" onRemove={() => {}}><ChipAvatar><img alt="" width="24" height="24" /></ChipAvatar>Texto</InputChip>
      </div>,
    )
    const start = (sel: string) => rect(q(c, `${sel} .mk-input-chip-primary > :is(.mk-chip-leading, .mk-chip-avatar, .mk-chip-label)`)).left - rect(q(c, sel)).left
    expect(start('.t')).toBeCloseTo(12, 2)
    expect(start('.i')).toBeCloseTo(8, 2)
    expect(start('.a')).toBeCloseTo(4, 2)
    for (const sel of ['.t', '.i', '.a']) {
      const chip = rect(q(c, sel))
      const x = rect(q(c, `${sel} .mk-input-chip-remove .mk-icon`))
      expect(style(q(c, sel)).height, sel).toBe('32px')
      expect(chip.right - x.right, sel).toBeCloseTo(8, 2)
      expect(x.width, sel).toBeCloseTo(18, 2)
      expect(x.left - rect(q(c, `${sel} .mk-chip-label`)).right, sel).toBeCloseTo(8, 2)
    }
    const avatar = rect(q(c, '.a .mk-chip-avatar'))
    expect(avatar.width).toBeCloseTo(24, 2)
    expect(avatar.top - rect(q(c, '.a')).top).toBeCloseTo(4, 2)
    expect(style(q(c, '.a')).borderTopLeftRadius).toBe('16px')
    expect(style(q(c, '.t')).borderTopLeftRadius).toBe('8px')
  })

  test('área táctil de 48 de alto en el chip y en el botón de quitar', async () => {
    const c = await render(
      <div style={{ padding: 16 }}>
        <AssistChip>A</AssistChip>
        <InputChip onRemove={() => {}}>I</InputChip>
      </div>,
    )
    for (const sel of ['.mk-chip', '.mk-input-chip-primary', '.mk-input-chip-remove']) {
      expect(getComputedStyle(q(c, sel), '::before').height, sel).toBe('48px')
    }
  })
})

describe('Chips: colores y elevación por estilo y estado', () => {
  test('outlined: borde Outline Variant, sin fondo; texto según el tipo; icono de inicio Primary', async () => {
    const c = await render(
      <div>
        <AssistChip className="as"><StarIcon />A</AssistChip>
        <FilterChip className="fi">F<ArrowDropDownIcon /></FilterChip>
        <SuggestionChip className="su"><StarIcon />S</SuggestionChip>
        <InputChip className="in" onRemove={() => {}}><StarIcon />I</InputChip>
      </div>,
    )
    for (const sel of ['.as', '.fi', '.su', '.in']) {
      const s = style(q(c, sel))
      expect(s.outlineColor, sel).toBe(roleColor('outline-variant'))
      expect(s.outlineWidth, sel).toBe('1px')
      expect(s.backgroundColor, sel).toBe(TRANSPARENT)
      expect(s.boxShadow, sel).toBe('none')
    }
    expect(style(q(c, '.as')).color).toBe(roleColor('on-surface'))
    for (const sel of ['.fi', '.su', '.in']) expect(style(q(c, sel)).color, sel).toBe(roleColor('on-surface-variant'))
    for (const sel of ['.as', '.su', '.in']) expect(style(q(c, `${sel} .mk-chip-leading`)).color, sel).toBe(roleColor('primary'))
    expect(style(q(c, '.fi .mk-chip-trailing')).color).toBe(roleColor('on-surface-variant'))
    expect(style(q(c, '.in .mk-input-chip-remove')).color).toBe(roleColor('on-surface-variant'))
    expect(style(q(c, '.as .mk-state-layer')).backgroundColor).toBe(roleColor('on-surface-variant'))
  })

  test('outlined con el puntero: fondo Surface y capa al 8 %; el filter seleccionado sube a nivel 1', async () => {
    const c = await render(
      <div>
        <AssistChip className="as">A</AssistChip>
        <FilterChip className="on" selected>F</FilterChip>
      </div>,
    )
    await userEvent.hover(q(c, '.as'))
    expect(style(q(c, '.as')).backgroundColor).toBe(roleColor('surface'))
    expect(style(q(c, '.as .mk-state-layer')).opacity).toBe('0.08')
    await userEvent.hover(q(c, '.on'))
    expect(style(q(c, '.on')).boxShadow).toBe(shadow(1))
    expect(style(q(c, '.on')).backgroundColor).toBe(roleColor('secondary-container'))
  })

  test('elevated: Surface Container Low, sin borde, nivel 1; con el puntero, nivel 2 (Compose)', async () => {
    const c = await render(
      <div>
        <AssistChip className="as" variant="elevated">A</AssistChip>
        <FilterChip className="fi" variant="elevated">F</FilterChip>
        <SuggestionChip className="su" variant="elevated">S</SuggestionChip>
      </div>,
    )
    for (const sel of ['.as', '.fi', '.su']) {
      const s = style(q(c, sel))
      expect(s.backgroundColor, sel).toBe(roleColor('surface-container-low'))
      expect(s.outlineColor, sel).toBe(TRANSPARENT)
      expect(s.boxShadow, sel).toBe(shadow(1))
    }
    await userEvent.hover(q(c, '.fi'))
    expect(style(q(c, '.fi')).boxShadow).toBe(shadow(2))
  })

  test('elevated presionado: nivel 1 y capa al 8 % (la onda suma su 10 %)', async () => {
    const c = await render(<AssistChip variant="elevated" className="as">A</AssistChip>)
    await commands.pressDown('.as')
    try {
      expect(style(q(c, '.as .mk-state-layer')).opacity).toBe('0.08')
    } finally {
      await commands.pressUp()
    }
  })

  test('foco de teclado: anillo visible, capa al 10 % y fondo Surface en el outlined', async () => {
    const c = await render(<AssistChip className="as">A</AssistChip>)
    q(c, '.as').focus({ focusVisible: true } as FocusOptions)
    expect(q(c, '.as').matches(':focus-visible')).toBe(true)
    expect(style(q(c, '.as .mk-focus-ring')).opacity).toBe('1')
    expect(style(q(c, '.as .mk-state-layer')).opacity).toBe('0.1')
    expect(style(q(c, '.as')).backgroundColor).toBe(roleColor('surface'))
  })

  test('seleccionado: Secondary Container sin borde, contenido On Secondary Container, también el icono de inicio (ADR-0008)', async () => {
    const c = await render(
      <div>
        <FilterChip className="fi" selected>F<ArrowDropDownIcon /></FilterChip>
        <FilterChip className="fe" variant="elevated" selected>F</FilterChip>
        <SuggestionChip className="su" selected><StarIcon />S</SuggestionChip>
        <InputChip className="in" selected onRemove={() => {}}><StarIcon />I</InputChip>
        <InputChip className="av" selected onRemove={() => {}}><ChipAvatar>A</ChipAvatar>Ana</InputChip>
      </div>,
    )
    for (const sel of ['.fi', '.fe', '.su', '.in', '.av']) {
      const s = style(q(c, sel))
      expect(s.backgroundColor, sel).toBe(roleColor('secondary-container'))
      expect(s.color, sel).toBe(roleColor('on-secondary-container'))
    }
    for (const sel of ['.fi', '.su', '.in', '.av']) expect(style(q(c, sel)).outlineColor, sel).toBe(TRANSPARENT)
    expect(style(q(c, '.fi .mk-chip-check')).color).toBe(roleColor('on-secondary-container'))
    expect(style(q(c, '.fi .mk-chip-trailing')).color).toBe(roleColor('on-secondary-container'))
    expect(style(q(c, '.fi .mk-state-layer')).backgroundColor).toBe(roleColor('on-secondary-container'))
    expect(style(q(c, '.su .mk-chip-leading')).color).toBe(roleColor('on-secondary-container'))
    expect(style(q(c, '.in .mk-chip-leading')).color).toBe(roleColor('on-secondary-container'))
    expect(style(q(c, '.in .mk-input-chip-remove')).color).toBe(roleColor('on-secondary-container'))
    // El avatar seleccionado muestra la marca en su círculo, en On Secondary Container (kit).
    expect(q(c, '.av .mk-chip-avatar').textContent).toBe('')
    expect(c.querySelector('.av .mk-chip-avatar .mk-chip-check')).not.toBeNull()
    expect(style(q(c, '.av .mk-chip-avatar')).color).toBe(roleColor('on-secondary-container'))
    expect(style(q(c, '.fe')).boxShadow).toBe(shadow(1))
  })

  test('deshabilitado: borde On Surface 10 %, fondo On Surface Variant 10 % (elevated y seleccionado), contenido On Surface 38 %, sin elevación', async () => {
    const c = await render(
      <div>
        <AssistChip className="as" disabled><StarIcon />A</AssistChip>
        <AssistChip className="el" variant="elevated" disabled>E</AssistChip>
        <FilterChip className="on" selected disabled>F</FilterChip>
        <InputChip className="in" disabled onRemove={() => {}}>I</InputChip>
      </div>,
    )
    const content = mix('on-surface', 'disabled-content-opacity')
    const outline = mix('on-surface', 'disabled-container-opacity')
    const container = mix('on-surface-variant', 'disabled-container-opacity')
    expect(style(q(c, '.as')).outlineColor).toBe(outline)
    expect(style(q(c, '.in')).outlineColor).toBe(outline)
    expect(style(q(c, '.as')).backgroundColor).toBe(TRANSPARENT)
    for (const sel of ['.el', '.on']) {
      expect(style(q(c, sel)).backgroundColor, sel).toBe(container)
      expect(style(q(c, sel)).outlineColor, sel).toBe(TRANSPARENT)
      expect(style(q(c, sel)).boxShadow, sel).toBe('none')
    }
    for (const sel of ['.as', '.el', '.on', '.in']) expect(style(q(c, sel)).color, sel).toBe(content)
    expect(style(q(c, '.as .mk-chip-leading')).color).toBe(content)
    expect(style(q(c, '.on .mk-chip-check')).color).toBe(content)
    expect(style(q(c, '.in .mk-input-chip-remove')).color).toBe(content)
    await userEvent.hover(q(c, '.as'), { force: true })
    expect(style(q(c, '.as .mk-state-layer')).opacity).toBe('0')
  })
})

describe('FilterChip y selección en el grupo', () => {
  test('suelto, controlado: el clic llama a onClick y el uso cambia selected', async () => {
    function Uso() {
      const [on, setOn] = useState(false)
      return <FilterChip selected={on} onClick={() => setOn(!on)}>Vegano</FilterChip>
    }
    const c = await render(<Uso />)
    const b = q(c, 'button')
    expect(b.getAttribute('aria-pressed')).toBe('false')
    await userEvent.click(b)
    expect(b.getAttribute('aria-pressed')).toBe('true')
    await userEvent.click(b)
    expect(b.getAttribute('aria-pressed')).toBe('false')
  })

  test('simple, no controlado: elegir uno desmarca el anterior y volver a tocarlo lo desmarca', async () => {
    const calls: Array<string | null> = []
    const c = await render(
      <ChipGroup aria-label="Orden" selectionMode="single" defaultValue="a" onValueChange={(v) => calls.push(v)}>
        <FilterChip value="a">A</FilterChip>
        <FilterChip value="b">B</FilterChip>
      </ChipGroup>,
    )
    const [a, b] = [...c.querySelectorAll('button')] as HTMLButtonElement[]
    expect(a?.getAttribute('aria-pressed')).toBe('true')
    await userEvent.click(b!)
    expect(a?.getAttribute('aria-pressed')).toBe('false')
    expect(b?.getAttribute('aria-pressed')).toBe('true')
    await userEvent.click(b!)
    expect(b?.getAttribute('aria-pressed')).toBe('false')
    expect(calls).toEqual(['b', null])
  })

  test('múltiple, controlado: la lista nueva va a onValueChange con el evento; sin aplicarla, no cambia', async () => {
    const calls: string[][] = []
    function Uso({ apply }: { apply: boolean }) {
      const [v, setV] = useState<string[]>(['x'])
      return (
        <ChipGroup
          aria-label="Dieta"
          selectionMode="multiple"
          value={v}
          onValueChange={(next, event) => {
            calls.push(next)
            expect(event.currentTarget.tagName).toBe('BUTTON')
            if (apply) setV(next)
          }}
        >
          <FilterChip value="x">X</FilterChip>
          <FilterChip value="y">Y</FilterChip>
          <FilterChip value="z">Z</FilterChip>
        </ChipGroup>
      )
    }
    let c = await render(<Uso apply />)
    const btn = (i: number) => c.querySelectorAll('button')[i] as HTMLButtonElement
    await userEvent.click(btn(2))
    await userEvent.click(btn(0))
    expect([0, 1, 2].map((i) => btn(i).getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true'])
    expect(calls).toEqual([['x', 'z'], ['z']])
    c = await render(<Uso apply={false} />)
    await userEvent.click(btn(1))
    expect(btn(1).getAttribute('aria-pressed')).toBe('false')
  })

  test('onClick propio va antes y con preventDefault el grupo no cambia; selected propio manda', async () => {
    const c = await render(
      <ChipGroup aria-label="G" selectionMode="multiple">
        <FilterChip value="a" onClick={(e) => e.preventDefault()}>A</FilterChip>
        <FilterChip value="b" selected>B</FilterChip>
      </ChipGroup>,
    )
    const [a, b] = [...c.querySelectorAll('button')] as HTMLButtonElement[]
    await userEvent.click(a!)
    expect(a?.getAttribute('aria-pressed')).toBe('false')
    await userEvent.click(b!)
    expect(b?.getAttribute('aria-pressed')).toBe('true')
  })
})

describe('ChipGroup: teclado (una parada de Tab y flechas)', () => {
  const Grupo = ({ dir }: { dir?: 'rtl' }) => (
    <div dir={dir}>
      <button type="button" className="antes">Antes</button>
      <ChipGroup aria-label="Filtros">
        <FilterChip className="c0">Uno</FilterChip>
        <FilterChip className="c1" disabled>Dos</FilterChip>
        <InputChip className="c2" onRemove={() => {}}>Tres</InputChip>
        <AssistChip className="c3">Cuatro</AssistChip>
      </ChipGroup>
      <button type="button" className="despues">Después</button>
    </div>
  )
  // Paradas en orden: c0, (c1 deshabilitado), c2 principal, c2 quitar, c3.
  const order = (c: HTMLElement) => [
    q(c, '.c0'),
    q(c, '.c2 .mk-input-chip-primary'),
    q(c, '.c2 .mk-input-chip-remove'),
    q(c, '.c3'),
  ]

  test('una sola parada con tabIndex 0 (la primera); las demás en -1', async () => {
    const c = await render(<Grupo />)
    const [first, ...others] = order(c)
    expect(first?.tabIndex).toBe(0)
    for (const el of others) expect(el.tabIndex).toBe(-1)
  })

  // WebKit en macOS no lleva el foco a botones con Tab (ajuste del sistema): falla en local, la
  // referencia es el WebKit de Linux del CI (CLAUDE.md). Las flechas se prueban aparte sin Tab.
  test('Tab entra al grupo en una parada y sale al siguiente; Mayús+Tab vuelve a la última enfocada', async () => {
    const c = await render(<Grupo />)
    q(c, '.antes').focus()
    await userEvent.tab()
    expect(document.activeElement).toBe(q(c, '.c0'))
    await userEvent.keyboard('{ArrowRight}')
    await userEvent.tab()
    expect(document.activeElement).toBe(q(c, '.despues'))
    await userEvent.tab({ shift: true })
    expect(document.activeElement).toBe(q(c, '.c2 .mk-input-chip-primary'))
  })

  test('derecha e izquierda recorren las paradas (incluido el botón de quitar), saltean deshabilitados y dan la vuelta; Inicio y Fin', async () => {
    const c = await render(<Grupo />)
    const stops = order(c)
    stops[0]?.focus({ focusVisible: true } as FocusOptions)
    for (const i of [1, 2, 3, 0]) {
      await userEvent.keyboard('{ArrowRight}')
      expect(document.activeElement, `derecha a ${i}`).toBe(stops[i])
      expect(stops[i]?.tabIndex).toBe(0)
    }
    await userEvent.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(stops[3])
    await userEvent.keyboard('{Home}')
    expect(document.activeElement).toBe(stops[0])
    await userEvent.keyboard('{End}')
    expect(document.activeElement).toBe(stops[3])
    expect(stops.filter((el) => el.tabIndex === 0)).toHaveLength(1)
  })

  test('el chip al que se llega con flechas muestra el anillo de foco', async () => {
    const c = await render(<Grupo />)
    q(c, '.c0').focus({ focusVisible: true } as FocusOptions)
    await userEvent.keyboard('{ArrowRight}')
    const primary = q(c, '.c2 .mk-input-chip-primary')
    expect(primary.matches(':focus-visible')).toBe(true)
    expect(style(q(primary, '.mk-focus-ring')).opacity).toBe('1')
    await userEvent.keyboard('{ArrowRight}')
    expect(style(q(c, '.c2 .mk-input-chip-remove .mk-focus-ring')).opacity).toBe('1')
  })

  test('RTL: la flecha izquierda avanza y la derecha retrocede', async () => {
    const c = await render(<Grupo dir="rtl" />)
    const stops = order(c)
    stops[0]?.focus({ focusVisible: true } as FocusOptions)
    await userEvent.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(stops[1])
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(stops[0])
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(stops[3])
  })

  test('un chip que se deshabilita deja de ser la parada; uno nuevo entra con -1', async () => {
    function Uso() {
      const [off, setOff] = useState(false)
      const [extra, setExtra] = useState(false)
      return (
        <>
          <button type="button" className="off" onClick={() => setOff(true)}>off</button>
          <button type="button" className="add" onClick={() => setExtra(true)}>add</button>
          <ChipGroup aria-label="G">
            <AssistChip className="a" disabled={off}>A</AssistChip>
            <AssistChip className="b">B</AssistChip>
            {extra ? <AssistChip className="x">X</AssistChip> : null}
          </ChipGroup>
        </>
      )
    }
    const c = await render(<Uso />)
    await userEvent.click(q(c, '.add'))
    await expect.poll(() => c.querySelector<HTMLElement>('.x')?.tabIndex).toBe(-1)
    await userEvent.click(q(c, '.off'))
    await expect.poll(() => q(c, '.b').tabIndex).toBe(0)
  })

  test('no captura flechas con modificadores ni fuera de las paradas', async () => {
    const c = await render(
      <ChipGroup aria-label="G">
        <AssistChip className="a">A</AssistChip>
        <AssistChip className="b">B</AssistChip>
      </ChipGroup>,
    )
    q(c, '.a').focus()
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
    expect(document.activeElement).toBe(q(c, '.a'))
  })
})

describe('InputChip: quitar', () => {
  function Lista({ initial, onRemoved, focusElsewhere }: { initial: string[]; onRemoved?: (n: string) => void; focusElsewhere?: boolean }) {
    const [items, setItems] = useState(initial)
    return (
      <>
        <input aria-label="Agregar" className="campo" />
        <ChipGroup aria-label="Destinatarios" className="grupo">
          {items.map((n) => (
            <InputChip
              key={n}
              className={`chip-${n}`}
              onRemove={() => {
                setItems((l) => l.filter((x) => x !== n))
                onRemoved?.(n)
                if (focusElsewhere) document.querySelector<HTMLElement>('.campo')?.focus()
              }}
            >
              {n}
            </InputChip>
          ))}
        </ChipGroup>
      </>
    )
  }

  test('con el botón de quitar: avisa y el foco va al chip siguiente', async () => {
    const removed: string[] = []
    const c = await render(<Lista initial={['Ana', 'Bea', 'Caro']} onRemoved={(n) => removed.push(n)} />)
    await userEvent.click(q(c, '.chip-Ana .mk-input-chip-remove'))
    expect(removed).toEqual(['Ana'])
    expect(c.querySelector('.chip-Ana')).toBeNull()
    await expect.poll(() => document.activeElement).toBe(q(c, '.chip-Bea .mk-input-chip-primary'))
  })

  test('Supr sobre la acción principal quita y enfoca el siguiente; Retroceso sobre el último, el anterior', async () => {
    const c = await render(<Lista initial={['Ana', 'Bea', 'Caro']} />)
    q(c, '.chip-Bea .mk-input-chip-primary').focus({ focusVisible: true } as FocusOptions)
    await userEvent.keyboard('{Delete}')
    expect(c.querySelector('.chip-Bea')).toBeNull()
    await expect.poll(() => document.activeElement).toBe(q(c, '.chip-Caro .mk-input-chip-primary'))
    await userEvent.keyboard('{Backspace}')
    expect(c.querySelector('.chip-Caro')).toBeNull()
    await expect.poll(() => document.activeElement).toBe(q(c, '.chip-Ana .mk-input-chip-primary'))
    // El foco que llegó por teclado se ve.
    expect(q(c, '.chip-Ana .mk-input-chip-primary').matches(':focus-visible')).toBe(true)
  })

  test('Supr sobre el botón de quitar también quita', async () => {
    const c = await render(<Lista initial={['Ana', 'Bea']} />)
    q(c, '.chip-Ana .mk-input-chip-remove').focus()
    await userEvent.keyboard('{Delete}')
    expect(c.querySelector('.chip-Ana')).toBeNull()
    await expect.poll(() => document.activeElement).toBe(q(c, '.chip-Bea .mk-input-chip-primary'))
  })

  test('al quitar el último que queda, el foco va al grupo (no se pierde)', async () => {
    const c = await render(<Lista initial={['Ana']} />)
    q(c, '.chip-Ana .mk-input-chip-primary').focus()
    await userEvent.keyboard('{Delete}')
    await expect.poll(() => document.activeElement).toBe(q(c, '.grupo'))
    expect(q(c, '.grupo').tabIndex).toBe(-1)
  })

  test('si el uso mueve el foco en onRemove, se respeta', async () => {
    const c = await render(<Lista initial={['Ana', 'Bea']} focusElsewhere />)
    q(c, '.chip-Ana .mk-input-chip-primary').focus()
    await userEvent.keyboard('{Delete}')
    expect(c.querySelector('.chip-Ana')).toBeNull()
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    expect(document.activeElement).toBe(q(c, '.campo'))
  })

  test('si el uso no lo quita, el chip queda y el foco también', async () => {
    let calls = 0
    const c = await render(
      <ChipGroup aria-label="G">
        <InputChip className="a" onRemove={() => calls++}>A</InputChip>
        <InputChip className="b" onRemove={() => {}}>B</InputChip>
      </ChipGroup>,
    )
    const p = q(c, '.a .mk-input-chip-primary')
    p.focus()
    await userEvent.keyboard('{Backspace}')
    expect(calls).toBe(1)
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    expect(document.activeElement).toBe(p)
  })

  test('removeOnly: el botón de quitar es la única parada del chip y Supr lo quita', async () => {
    const removed: string[] = []
    const c = await render(
      <ChipGroup aria-label="G">
        <InputChip className="a" removeOnly onRemove={() => removed.push('a')}>A</InputChip>
      </ChipGroup>,
    )
    const x = q(c, '.a .mk-input-chip-remove')
    expect(x.tabIndex).toBe(0)
    x.focus()
    await userEvent.keyboard('{Delete}')
    expect(removed).toEqual(['a'])
  })
})

describe('ChipGroup: disposición', () => {
  const chips = (n: number) =>
    Array.from({ length: n }, (_, i) => <AssistChip key={i} className={`c${i}`}>Chip {i + 1}</AssistChip>)

  test('wrap: varias filas con 8 entre chips y 16 entre filas, sin desbordar', async () => {
    const c = await render(
      <div style={{ inlineSize: 240 }}>
        <ChipGroup aria-label="G" className="g">{chips(6)}</ChipGroup>
      </div>,
    )
    const g = q(c, '.g')
    expect(style(g).columnGap).toBe('8px')
    expect(style(g).rowGap).toBe('16px')
    expect(g.scrollWidth).toBeLessThanOrEqual(g.clientWidth)
    expect(rect(q(c, '.c1')).left - rect(q(c, '.c0')).right).toBeCloseTo(8, 2)
    const tops = [...new Set([...g.children].map((el) => Math.round(rect(el).top)))]
    expect(tops.length).toBeGreaterThan(1)
    expect(tops[1]! - tops[0]!).toBe(32 + 16)
  })

  test('scroll: una fila que se desplaza, relleno 8, barra fina, y el chip enfocado se trae a la vista', async () => {
    const c = await render(
      <div style={{ inlineSize: 240 }}>
        <ChipGroup aria-label="G" className="g" layout="scroll">{chips(8)}</ChipGroup>
      </div>,
    )
    const g = q(c, '.g')
    const s = style(g)
    expect(s.flexWrap).toBe('nowrap')
    expect(s.overflowX).toBe('auto')
    expect(s.paddingTop).toBe('8px')
    expect(s.paddingInlineStart).toBe('8px')
    // El Firefox de Playwright oculta las barras: devuelve scrollbar-width 'none' incluso para un
    // 'auto' (sonda del 2026-11-26). En los otros dos se ve la declaración.
    if (server.browser !== 'firefox') expect(s.scrollbarWidth).toBe('thin')
    expect(g.scrollWidth).toBeGreaterThan(g.clientWidth)
    const tops = new Set([...g.children].map((el) => Math.round(rect(el).top)))
    expect(tops.size).toBe(1)
    q(c, '.c0').focus({ focusVisible: true } as FocusOptions)
    await userEvent.keyboard('{End}')
    expect(document.activeElement).toBe(q(c, '.c7'))
    await expect.poll(() => rect(q(c, '.c7')).right).toBeLessThanOrEqual(rect(g).right + 0.5)
    // El chip no se achica en la fila.
    expect(rect(q(c, '.c0')).width).toBeGreaterThan(60)
  })

  test('texto largo: el chip no pasa del contenedor, la etiqueta se recorta con puntos suspensivos y el nombre sigue completo', async () => {
    const largo = 'Restaurantes con opciones veganas cerca de casa'
    const c = await render(
      <div style={{ inlineSize: 160 }}>
        <ChipGroup aria-label="G" className="g">
          <FilterChip className="f">{largo}</FilterChip>
          <InputChip className="i" onRemove={() => {}}><StarIcon />{largo}</InputChip>
        </ChipGroup>
        <ChipGroup aria-label="S" className="s" layout="scroll">
          <SuggestionChip className="su">{largo}</SuggestionChip>
        </ChipGroup>
      </div>,
    )
    for (const sel of ['.f', '.i', '.su']) {
      const chip = q(c, sel)
      const label = q(chip, '.mk-chip-label')
      expect(rect(chip).width, sel).toBeLessThanOrEqual(160 + 0.5)
      expect(style(chip).height, sel).toBe('32px')
      expect(style(label).textOverflow, sel).toBe('ellipsis')
      expect(label.scrollWidth, sel).toBeGreaterThan(label.clientWidth)
    }
    // El botón de quitar sigue entero.
    expect(rect(q(c, '.i .mk-input-chip-remove .mk-icon')).width).toBeCloseTo(18, 2)
    await expect.element(page.getByRole('button', { name: largo, exact: true }).first()).toBeInTheDocument()
    await expect.element(page.getByRole('button', { name: `Remove ${largo}` })).toBeInTheDocument()
  })

  test('ChipLabel y la marca con CheckIcon propio funcionan como etiqueta', async () => {
    const c = await render(
      <AssistChip className="a"><CheckIcon /><ChipLabel className="mia"><b>Hecho</b></ChipLabel></AssistChip>,
    )
    expect(q(c, '.a').hasAttribute('data-leading')).toBe(true)
    expect(q(c, '.a .mk-chip-label').className).toBe('mk-chip-label mia')
  })
})
