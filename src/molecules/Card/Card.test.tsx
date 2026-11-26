import { createRef, type AnchorHTMLAttributes, type ReactNode, type Ref } from 'react'
import { describe, expect, test } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'
import { MoreVertIcon } from '../../icons/icons.tsx'
import { render, roleColor, style } from '../../test/render.tsx'
import { Button } from '../Button/Button.tsx'
import { IconButton } from '../IconButton/IconButton.tsx'
import {
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CardHeadline,
  CardMedia,
  CardPrimaryAction,
  CardSubhead,
  type CardOrientation,
  type CardVariant,
} from './Card.tsx'

const px = (v: string) => parseFloat(v)
const rect = (el: Element) => el.getBoundingClientRect()
const q = (c: ParentNode, sel: string) => {
  const el = c.querySelector(sel)
  if (!el) throw new Error(`no se encontró ${sel}`)
  return el as HTMLElement
}
const before = (el: Element) => getComputedStyle(el, '::before')

// Firma de cada nivel de elevación (la segunda sombra de --md-sys-elevation-levelN), como Fab.
const LEVEL = { 1: '0px 1px 3px 1px', 2: '0px 2px 6px 2px', 3: '0px 4px 8px 3px', 4: '0px 6px 10px 4px' }
const shadowLevel = (el: Element): 0 | 1 | 2 | 3 | 4 => {
  const s = style(el).boxShadow
  if (s === 'none') return 0
  for (const n of [1, 2, 3, 4] as const) if (s.includes(LEVEL[n])) return n
  throw new Error(`sombra desconocida: ${s}`)
}

/** Color calculado de una expresión CSS (para color-mix), con el mismo formato que el componente. */
function cssColor(expr: string, within: Element): string {
  const probe = document.createElement('span')
  probe.style.backgroundColor = expr
  within.append(probe)
  const value = getComputedStyle(probe).backgroundColor
  probe.remove()
  return value
}

// Enlace propio que imita al Link de Next.js o React Router (ADR-0010).
function FakeLink({ to, ref, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; ref?: Ref<HTMLAnchorElement> }) {
  return <a {...props} ref={ref} href={to} data-router="" />
}

const Picture = () => <div role="img" aria-label="Paisaje" style={{ background: 'gray' }} />

/** Ejemplo apilado del kit, con la acción principal que se pase como título. */
function Stacked({ variant, title = 'Título', orientation, adaptive, width = 360 }: {
  variant?: CardVariant
  title?: ReactNode
  orientation?: CardOrientation
  adaptive?: boolean
  width?: number
}) {
  return (
    <div style={{ width }}>
      <Card variant={variant} orientation={orientation} adaptive={adaptive}>
        <CardHeader>
          <span className="avatar" style={{ width: 40, height: 40, borderRadius: '50%', background: 'gray' }} />
          <CardHeadline>{title}</CardHeadline>
          <CardSubhead>Subtítulo</CardSubhead>
          <IconButton label="Más opciones" size="sm"><MoreVertIcon /></IconButton>
        </CardHeader>
        <CardMedia><Picture /></CardMedia>
        <CardContent>
          <CardHeadline level={4}>Título del contenido</CardHeadline>
          <CardSubhead>Subtítulo del contenido</CardSubhead>
          <p>Texto de apoyo.</p>
          <CardActions>
            <Button variant="outlined" size="sm">Secundaria</Button>
            <Button size="sm">Principal</Button>
          </CardActions>
        </CardContent>
      </Card>
    </div>
  )
}

function Horizontal({ width = 360, adaptive, title = 'Título' }: { width?: number; adaptive?: boolean; title?: ReactNode }) {
  return (
    <div style={{ width }}>
      <Card variant="outlined" orientation="horizontal" adaptive={adaptive}>
        <CardHeader>
          <span className="avatar" style={{ width: 40, height: 40, background: 'gray' }} />
          <CardHeadline>{title}</CardHeadline>
          <CardSubhead>Subtítulo</CardSubhead>
        </CardHeader>
        <CardMedia><Picture /></CardMedia>
      </Card>
    </div>
  )
}

describe('Card: estructura y accesibilidad', () => {
  test('como superficie es un <div> sin rol ni foco, con la disposición adentro y sin átomos', async () => {
    const c = await render(
      <Card>
        <CardContent>Hola</CardContent>
      </Card>,
    )
    const card = q(c, '.mk-card')
    expect(card.tagName).toBe('DIV')
    expect(card.getAttribute('role')).toBeNull()
    expect(card.tabIndex).toBe(-1)
    expect(card.dataset['variant']).toBe('elevated')
    expect(card.dataset['orientation']).toBe('vertical')
    expect(card.dataset['adaptive']).toBeUndefined()
    expect(card.querySelector(':scope > .mk-card-layout > .mk-card-content')).not.toBeNull()
    expect(card.querySelectorAll('.mk-state-layer, .mk-ripple, .mk-focus-ring, a, button')).toHaveLength(0)
    await userEvent.tab()
    expect(document.activeElement).toBe(document.body)
  })

  test('ref, className, style y props nativas llegan al contenedor; las partes también las aceptan', async () => {
    const ref = createRef<HTMLDivElement>()
    const headline = createRef<HTMLHeadingElement>()
    const c = await render(
      <Card ref={ref} className="mia" style={{ marginTop: 7 }} id="t1" data-foo="bar" aria-label="Tarjeta" variant="outlined" adaptive={false}>
        <CardHeader className="h" data-x="1">
          <CardHeadline ref={headline} level={2} id="titulo">T</CardHeadline>
          <CardSubhead className="s">S</CardSubhead>
        </CardHeader>
        <CardMedia className="m"><Picture /></CardMedia>
        <CardContent className="ct"><CardActions className="ac" /></CardContent>
      </Card>,
    )
    const card = q(c, '.mk-card')
    expect(ref.current).toBe(card)
    expect(card.className).toBe('mk-card mia')
    expect(card.style.marginTop).toBe('7px')
    expect(card.id).toBe('t1')
    expect(card.dataset['foo']).toBe('bar')
    expect(card.getAttribute('aria-label')).toBe('Tarjeta')
    expect(card.dataset['variant']).toBe('outlined')
    expect(card.dataset['adaptive']).toBe('false')
    expect(headline.current?.tagName).toBe('H2')
    expect(headline.current?.className).toBe('mk-card-headline')
    expect(q(c, '.mk-card-header').className).toBe('mk-card-header h')
    expect(q(c, '.mk-card-header').dataset['x']).toBe('1')
    expect(q(c, '.mk-card-subhead').tagName).toBe('P')
    expect(q(c, '.mk-card-subhead').className).toBe('mk-card-subhead s')
    expect(q(c, '.mk-card-media').className).toBe('mk-card-media m')
    expect(q(c, '.mk-card-content').className).toBe('mk-card-content ct')
    expect(q(c, '.mk-card-actions').className).toBe('mk-card-actions ac')
  })

  test('el título es un <h3> por defecto: el lector puede saltar de tarjeta en tarjeta', async () => {
    await render(<Stacked />)
    expect(page.getByRole('heading', { level: 3, name: 'Título' }).element().className).toBe('mk-card-headline')
    expect(page.getByRole('heading', { level: 4, name: 'Título del contenido' }).element()).toBeTruthy()
  })

  test('como enlace: un <a> con el título como nombre y sus átomos, sin interactivos anidados', async () => {
    const c = await render(<Stacked title={<CardPrimaryAction href="/notas">Título</CardPrimaryAction>} />)
    const a = page.getByRole('link', { name: 'Título' }).element() as HTMLAnchorElement
    expect(a.tagName).toBe('A')
    expect(a.getAttribute('href')).toBe('/notas')
    expect(a.className).toBe('mk-card-primary-action')
    expect(a.closest('.mk-card-headline')).not.toBeNull()
    expect(a.querySelectorAll(':scope > .mk-state-layer, :scope > .mk-ripple, :scope > .mk-focus-ring')).toHaveLength(3)
    // Nada interactivo adentro del enlace, ni el enlace dentro de otro interactivo.
    expect(a.querySelector('a, button, input, select, textarea, [tabindex]')).toBeNull()
    expect(a.parentElement?.closest('a, button')).toBeNull()
    // Los botones de la tarjeta siguen siendo botones con su nombre, fuera del enlace.
    for (const name of ['Más opciones', 'Secundaria', 'Principal']) {
      const b = page.getByRole('button', { name }).element()
      expect(a.contains(b), name).toBe(false)
    }
    expect(c.querySelectorAll('a')).toHaveLength(1)
  })

  test('como botón: <button type="button">, recibe eventos y props nativas y su ref', async () => {
    const ref = createRef<HTMLButtonElement>()
    let clicks = 0
    await render(
      <Stacked title={<CardPrimaryAction ref={ref} id="acc" aria-describedby="x" onClick={() => clicks++}>Abrir</CardPrimaryAction>} />,
    )
    const b = page.getByRole('button', { name: 'Abrir' }).element() as HTMLButtonElement
    expect(ref.current).toBe(b)
    expect(b.type).toBe('button')
    expect(b.id).toBe('acc')
    expect(b.getAttribute('aria-describedby')).toBe('x')
    await userEvent.click(b)
    expect(clicks).toBe(1)
  })

  test('con render: el enlace del enrutador clonado con la clase, las props, la ref y los átomos', async () => {
    const ref = createRef<HTMLElement>()
    await render(
      <Stacked title={<CardPrimaryAction ref={ref} data-x="1" render={<FakeLink to="/ruta" className="propia" />}>Ir</CardPrimaryAction>} />,
    )
    const a = page.getByRole('link', { name: 'Ir' }).element() as HTMLAnchorElement
    expect(a.getAttribute('href')).toBe('/ruta')
    expect(a.dataset['router']).toBe('')
    expect(a.dataset['x']).toBe('1')
    expect(a.className).toBe('mk-card-primary-action propia')
    expect(ref.current).toBe(a)
    expect(a.querySelectorAll(':scope > .mk-state-layer, :scope > .mk-ripple, :scope > .mk-focus-ring')).toHaveLength(3)
  })

  test('los tipos rechazan el deshabilitado en un enlace', () => {
    // Solo comprobación de tipos (pnpm typecheck); no se dibuja nada.
    const ok = [
      <CardPrimaryAction key="1" disabled>No</CardPrimaryAction>,
      <CardPrimaryAction key="2" href="/x">Enlace</CardPrimaryAction>,
      <CardPrimaryAction key="3" render={<FakeLink to="/x" />}>Enlace</CardPrimaryAction>,
    ]
    const wrong = [
      // @ts-expect-error: un <a> no tiene disabled.
      <CardPrimaryAction key="4" href="/x" disabled>Enlace</CardPrimaryAction>,
      // @ts-expect-error: aria-disabled en un <a href> no lo deshabilita (ARIA in HTML).
      <CardPrimaryAction key="5" render={<FakeLink to="/x" />} aria-disabled="true">Enlace</CardPrimaryAction>,
    ]
    expect(ok.length + wrong.length).toBe(5)
  })
})

describe('Card: área de la acción principal', () => {
  test('toda la tarjeta es la acción principal, salvo los controles, que quedan encima', async () => {
    let clicks = 0
    const c = await render(<Stacked title={<CardPrimaryAction onClick={() => clicks++}>Abrir</CardPrimaryAction>} />)
    const action = q(c, '.mk-card-primary-action')
    const hit = (el: Element, dx = 0.5, dy = 0.5) => {
      const r = rect(el)
      return document.elementFromPoint(r.left + r.width * dx, r.top + r.height * dy)
    }
    // Imagen, texto de apoyo, avatar y el espacio vacío de la cabecera: la acción principal.
    for (const sel of ['.mk-card-media', '.mk-card-content > p:not(.mk-card-subhead)', '.avatar', '.mk-card-content > .mk-card-headline']) {
      expect(hit(q(c, sel)), sel).toBe(action)
    }
    expect(hit(q(c, '.mk-card'), 0.02, 0.98)).toBe(action)
    // Los botones, encima del área.
    for (const b of c.querySelectorAll('.mk-card-actions button, .mk-icon-button')) {
      expect(b.contains(hit(b)), b.textContent ?? '').toBe(true)
    }
    // Un clic en la imagen activa la acción principal; uno en un botón, no.
    const media = rect(q(c, '.mk-card-media'))
    await commands.pressAt('.mk-card-media', media.width / 3, media.height / 3)
    await commands.pressUp()
    expect(clicks).toBe(1)
    await userEvent.click(page.getByRole('button', { name: 'Principal' }))
    expect(clicks).toBe(1)
  })

  test('teclado: Tab pasa por la acción principal y por cada control por separado; Enter la activa', async () => {
    let clicks = 0
    await render(<Stacked title={<CardPrimaryAction onClick={() => clicks++}>Abrir</CardPrimaryAction>} />)
    const order: string[] = []
    for (let i = 0; i < 4; i++) {
      await userEvent.tab()
      order.push((document.activeElement as HTMLElement).textContent?.trim() || (document.activeElement?.getAttribute('aria-label') ?? ''))
    }
    expect(order).toEqual(['Abrir', 'Más opciones', 'Secundaria', 'Principal'])
    await userEvent.tab({ shift: true })
    await userEvent.tab({ shift: true })
    await userEvent.tab({ shift: true })
    expect(document.activeElement?.textContent).toBe('Abrir')
    await userEvent.keyboard('{Enter}')
    expect(clicks).toBe(1)
  })

  test('el foco visible se dibuja en el borde de la tarjeta, no alrededor del título', async () => {
    const c = await render(<Stacked title={<CardPrimaryAction href="#x">Título</CardPrimaryAction>} />)
    await userEvent.tab()
    expect(document.activeElement).toBe(q(c, '.mk-card-primary-action'))
    const ring = q(c, '.mk-focus-ring')
    const card = rect(q(c, '.mk-card'))
    const r = rect(ring)
    expect(style(ring).opacity).toBe('1')
    for (const side of ['left', 'top', 'right', 'bottom'] as const) expect(r[side] - card[side], side).toBeCloseTo(0, 1)
    expect(style(ring).outlineOffset).toBe('2px')
    expect(style(ring).borderTopLeftRadius).toBe('12px')
    expect(style(ring).outlineColor).toBe(roleColor('secondary'))
    // Con foco en un botón de la tarjeta, el anillo de la tarjeta no se muestra.
    await userEvent.tab()
    expect(style(ring).opacity).toBe('0')
  })
})

describe('Card: medidas (kit)', () => {
  test('radio 12 en los tres estilos; cabecera de 72 con avatar de 40, rellenos 12/16 y 4 al final', async () => {
    for (const variant of ['elevated', 'filled', 'outlined'] as const) {
      const c = await render(<Stacked variant={variant} />)
      expect(style(q(c, '.mk-card')).borderTopLeftRadius, variant).toBe('12px')
    }
    const c = await render(<Stacked />)
    const header = q(c, '.mk-card-header')
    expect(rect(header).height).toBeCloseTo(72, 1)
    expect(style(header).paddingTop).toBe('12px')
    expect(style(header).paddingInlineStart).toBe('16px')
    expect(style(header).paddingInlineEnd).toBe('4px')
    const avatar = rect(q(c, '.avatar'))
    const headline = rect(q(c, '.mk-card-header > .mk-card-headline'))
    const subhead = rect(q(c, '.mk-card-header > .mk-card-subhead'))
    expect(avatar.left - rect(header).left).toBeCloseTo(16, 1)
    expect(headline.left - avatar.right).toBeCloseTo(16, 1)
    expect(subhead.top - headline.bottom).toBeCloseTo(4, 1)
    expect(avatar.top + avatar.height / 2).toBeCloseTo(rect(header).top + 36, 1)
    // El botón del final, contra el borde (menos el relleno de 4).
    expect(rect(header).right - rect(q(c, '.mk-icon-button')).right).toBeCloseTo(4, 1)
  })

  test('imagen a todo el ancho con proporción 360/188 que escala con el ancho, y esquinas superiores si va primera', async () => {
    let c = await render(<Stacked width={360} />)
    const media = q(c, '.mk-card-media')
    expect(rect(media).width).toBeCloseTo(360, 1)
    expect(rect(media).height).toBeCloseTo(188, 1)
    const img = q(c, '.mk-card-media > [role="img"]')
    expect(rect(img).height).toBeCloseTo(188, 1)
    expect(style(img).objectFit).toBe('cover')
    c = await render(<Stacked width={540} />)
    expect(rect(q(c, '.mk-card-media')).height).toBeCloseTo(282, 1)
    c = await render(
      <Card>
        <CardMedia className="m"><img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" /></CardMedia>
        <CardContent>Texto</CardContent>
      </Card>,
    )
    expect(style(q(c, '.m')).borderTopLeftRadius).toBe('12px')
    expect(style(q(c, '.m')).borderTopRightRadius).toBe('12px')
    expect(style(q(c, '.m')).borderBottomLeftRadius).toBe('0px')
    expect(style(q(c, '.m img')).objectFit).toBe('cover')
    expect(rect(q(c, '.m img')).height).toBeCloseTo(rect(q(c, '.m')).height, 1)
  })

  test('contenido: relleno 16, 32 entre bloques, título y subtítulo juntos; acciones al final con 8 entre sí', async () => {
    const c = await render(<Stacked />)
    const content = q(c, '.mk-card-content')
    expect(style(content).padding).toBe('16px')
    const h = rect(q(c, '.mk-card-content > .mk-card-headline'))
    const s = rect(q(c, '.mk-card-content > .mk-card-subhead'))
    const p = rect(q(c, '.mk-card-content > p:not(.mk-card-subhead)'))
    const actions = q(c, '.mk-card-actions')
    expect(s.top - h.bottom).toBeCloseTo(0, 1)
    expect(p.top - s.bottom).toBeCloseTo(32, 1)
    const [b1, b2] = [...actions.querySelectorAll('button')].map(rect)
    expect(rect(actions).top - p.bottom).toBeCloseTo(0, 1)
    expect(b1!.top - p.bottom).toBeCloseTo(32, 1)
    expect(b2!.left - b1!.right).toBeCloseTo(8, 1)
    expect(rect(content).right - 16 - b2!.right).toBeCloseTo(0, 1)
  })

  test('horizontal: 80 de alto, relleno 16 y la imagen de 80 × 80 al final', async () => {
    const c = await render(<Horizontal />)
    const card = rect(q(c, '.mk-card'))
    const media = rect(q(c, '.mk-card-media'))
    expect(card.height).toBeCloseTo(80, 1)
    expect(media.width).toBeCloseTo(80, 1)
    expect(media.height).toBeCloseTo(80, 1)
    expect(card.right - media.right).toBeCloseTo(0, 1)
    expect(style(q(c, '.mk-card-media')).borderTopRightRadius).toBe('12px')
    expect(style(q(c, '.mk-card-media')).borderTopLeftRadius).toBe('0px')
    expect(style(q(c, '.mk-card-header')).padding).toBe('16px')
    expect(rect(q(c, '.mk-card-header')).right).toBeCloseTo(media.left, 1)
  })

  test('tipografía y color del texto: cabecera, contenido y texto de apoyo', async () => {
    const c = await render(<Stacked />)
    const hh = style(q(c, '.mk-card-header > .mk-card-headline'))
    expect(hh.fontSize).toBe('16px')
    expect(hh.lineHeight).toBe('24px')
    expect(hh.color).toBe(roleColor('on-surface'))
    expect(style(q(c, '.mk-card-header > .mk-card-subhead')).color).toBe(roleColor('on-surface'))
    expect(style(q(c, '.mk-card-header > .mk-card-subhead')).fontSize).toBe('14px')
    const ch = style(q(c, '.mk-card-content > .mk-card-headline'))
    expect(ch.fontSize).toBe('16px')
    expect(ch.fontWeight).toBe('400')
    expect(ch.color).toBe(roleColor('on-surface'))
    for (const sel of ['.mk-card-content > .mk-card-subhead', '.mk-card-content > p:not(.mk-card-subhead)']) {
      expect(style(q(c, sel)).color, sel).toBe(roleColor('on-surface-variant'))
      expect(style(q(c, sel)).fontSize, sel).toBe('14px')
    }
  })
})

describe('Card: colores y elevación por estilo y estado', () => {
  const CASES: Array<{ variant: CardVariant; container: string; outline: string | null; rest: number; hover: number; focus: number; pressed: number }> = [
    { variant: 'elevated', container: 'surface-container-low', outline: null, rest: 1, hover: 2, focus: 1, pressed: 1 },
    { variant: 'filled', container: 'surface-container-highest', outline: null, rest: 0, hover: 1, focus: 0, pressed: 1 },
    { variant: 'outlined', container: 'surface', outline: 'outline-variant', rest: 0, hover: 1, focus: 0, pressed: 0 },
  ]

  for (const k of CASES) {
    test(`${k.variant}: contenedor, contorno y elevación en reposo, con el puntero y con foco`, async () => {
      const c = await render(
        <>
          <Stacked variant={k.variant} title={<CardPrimaryAction href="#x">Título</CardPrimaryAction>} />
          <div className="far" style={{ position: 'fixed', right: 0, bottom: 0, width: 4, height: 4 }} />
        </>,
      )
      const card = q(c, '.mk-card')
      expect(style(card).backgroundColor).toBe(roleColor(k.container))
      const b = before(card)
      expect(b.borderTopWidth).toBe('1px')
      expect(b.borderTopColor).toBe(k.outline ? roleColor(k.outline) : 'rgba(0, 0, 0, 0)')
      expect(shadowLevel(card)).toBe(k.rest)
      const layer = q(c, '.mk-card-primary-action > .mk-state-layer')
      expect(style(layer).backgroundColor).toBe(roleColor('on-surface'))
      expect(Number(style(layer).opacity)).toBe(0)

      await userEvent.hover(q(c, '.mk-card-primary-action'))
      expect(shadowLevel(card)).toBe(k.hover)
      expect(Number(style(layer).opacity)).toBeCloseTo(0.08)
      // La capa cubre toda la tarjeta, con su radio.
      expect(rect(layer).width).toBeCloseTo(rect(card).width, 1)
      expect(rect(layer).height).toBeCloseTo(rect(card).height, 1)
      expect(style(layer).borderTopLeftRadius).toBe('12px')
      // Con el puntero sobre un botón de la tarjeta, la tarjeta no está en hover.
      await userEvent.hover(page.getByRole('button', { name: 'Principal' }))
      expect(shadowLevel(card)).toBe(k.rest)
      expect(Number(style(layer).opacity)).toBe(0)

      await userEvent.hover(q(c, '.far'))
      await userEvent.tab()
      expect(shadowLevel(card)).toBe(k.focus)
      expect(Number(style(layer).opacity)).toBeCloseTo(0.1)
    })

    test(`${k.variant}: presionada, elevación del kit y capa de 8 % más la onda`, async () => {
      const c = await render(<Stacked variant={k.variant} title={<CardPrimaryAction href="#x">Título</CardPrimaryAction>} />)
      const card = q(c, '.mk-card')
      await commands.pressDown('.mk-card-primary-action')
      try {
        expect(shadowLevel(card)).toBe(k.pressed)
        expect(Number(style(q(c, '.mk-state-layer')).opacity)).toBeCloseTo(0.08)
        expect(c.querySelector('.mk-ripple-wave')).not.toBeNull()
      } finally {
        await commands.pressUp()
      }
    })
  }

  test('como superficie no tiene estados: el puntero no cambia la elevación', async () => {
    const c = await render(<Stacked variant="filled" />)
    await userEvent.hover(q(c, '.mk-card-media'))
    expect(shadowLevel(q(c, '.mk-card'))).toBe(0)
  })
})

describe('Card: deshabilitada (Compose)', () => {
  const disabledContent = (within: Element) =>
    cssColor('color-mix(in srgb, var(--md-sys-color-on-surface) calc(var(--md-sys-state-disabled-content-opacity) * 100%), transparent)', within)

  test('contenedor por estilo, contenido al 38 %, sin capa ni cambio de elevación y sin activarse', async () => {
    const expected: Record<CardVariant, { bg: string; outline: string | null; level: number }> = {
      elevated: { bg: 'var(--md-sys-color-surface)', outline: null, level: 1 },
      filled: {
        bg: 'color-mix(in srgb, var(--md-sys-color-surface-variant) 38%, var(--md-sys-color-surface-container-highest))',
        outline: null,
        level: 0,
      },
      outlined: {
        bg: 'var(--md-sys-color-surface)',
        outline: 'color-mix(in srgb, var(--md-sys-color-outline) 12%, var(--md-sys-color-surface-container-low))',
        level: 0,
      },
    }
    for (const variant of ['elevated', 'filled', 'outlined'] as const) {
      let clicks = 0
      const c = await render(
        <Stacked variant={variant} title={<CardPrimaryAction disabled onClick={() => clicks++}>Abrir</CardPrimaryAction>} />,
      )
      const card = q(c, '.mk-card')
      const e = expected[variant]
      expect(style(card).backgroundColor, variant).toBe(cssColor(e.bg, card))
      if (e.outline) expect(before(card).borderTopColor, variant).toBe(cssColor(e.outline, card))
      expect(shadowLevel(card), variant).toBe(e.level)
      for (const sel of ['.mk-card-header > .mk-card-headline', '.mk-card-header > .mk-card-subhead', '.mk-card-content > p:not(.mk-card-subhead)']) {
        expect(style(q(c, sel)).color, `${variant} ${sel}`).toBe(disabledContent(card))
      }
      const action = page.getByRole('button', { name: 'Abrir' }).element() as HTMLButtonElement
      expect(action.disabled).toBe(true)
      await userEvent.hover(action)
      expect(Number(style(q(c, '.mk-state-layer')).opacity)).toBe(0)
      expect(shadowLevel(card)).toBe(e.level)
      const media = rect(q(c, '.mk-card-media'))
      await commands.pressAt('.mk-card-media', media.width / 2, media.height / 2)
      await commands.pressUp()
      expect(clicks).toBe(0)
      expect(c.querySelector('.mk-ripple-wave')).toBeNull()
    }
  })
})

describe('Card: adaptación al ancho de la propia tarjeta (container queries)', () => {
  const layoutOf = (c: HTMLElement) => {
    const card = rect(q(c, '.mk-card'))
    const media = rect(q(c, '.mk-card-media'))
    const header = rect(q(c, '.mk-card-header'))
    return { card, media, header }
  }

  test('vertical: apilada a 400 px; desde 600 px la imagen pasa al costado (40 %, al final, del alto de la tarjeta)', async () => {
    let c = await render(<Stacked width={400} />)
    let { card, media, header } = layoutOf(c)
    expect(media.width).toBeCloseTo(card.width, 1)
    expect(media.top).toBeCloseTo(header.bottom, 1)
    expect(media.height).toBeCloseTo(400 * (188 / 360), 1)

    c = await render(<Stacked width={700} />)
    ;({ card, media, header } = layoutOf(c))
    expect(media.width).toBeCloseTo(280, 1)
    expect(card.right - media.right).toBeCloseTo(0, 1)
    expect(media.top).toBeCloseTo(card.top, 1)
    expect(media.height).toBeCloseTo(card.height, 1)
    expect(header.right).toBeCloseTo(media.left, 1)
    expect(rect(q(c, '.mk-card-content')).right).toBeCloseTo(media.left, 1)
    expect(style(q(c, '.mk-card-media')).borderTopLeftRadius).toBe('0px')
    expect(style(q(c, '.mk-card-media')).borderBottomRightRadius).toBe('12px')
  })

  test('horizontal: imagen al costado a 360 px; bajo 320 px se apila con la imagen arriba', async () => {
    let c = await render(<Horizontal width={360} />)
    let { card, media } = layoutOf(c)
    expect(media.width).toBeCloseTo(80, 1)
    expect(card.right - media.right).toBeCloseTo(0, 1)

    c = await render(<Horizontal width={280} />)
    ;({ card, media } = layoutOf(c))
    const header = rect(q(c, '.mk-card-header'))
    expect(media.width).toBeCloseTo(280, 1)
    expect(media.top).toBeCloseTo(card.top, 1)
    expect(media.height).toBeCloseTo(280 * (188 / 360), 1)
    expect(header.top).toBeCloseTo(media.bottom, 1)
    expect(style(q(c, '.mk-card-media')).borderTopLeftRadius).toBe('12px')
    expect(style(q(c, '.mk-card-media')).borderTopRightRadius).toBe('12px')
  })

  test('adaptive={false}: la disposición del kit a cualquier ancho', async () => {
    let c = await render(<Stacked width={700} adaptive={false} />)
    let { card, media } = layoutOf(c)
    expect(media.width).toBeCloseTo(card.width, 1)
    c = await render(<Horizontal width={280} adaptive={false} />)
    ;({ card, media } = layoutOf(c))
    expect(media.width).toBeCloseTo(80, 1)
    expect(card.right - media.right).toBeCloseTo(0, 1)
  })

  test('sin desborde horizontal a 200 px con un título largo y una palabra larguísima', async () => {
    const long = 'Un título larguísimo con supercalifragilisticoespialidosoysiguesinespacios'
    for (const el of [
      <Stacked key="v" width={200} title={<CardPrimaryAction href="#x">{long}</CardPrimaryAction>} />,
      <Horizontal key="h" width={200} title={long} />,
    ]) {
      const c = await render(el)
      const card = q(c, '.mk-card')
      expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth)
      const right = rect(card).right
      for (const child of card.querySelectorAll('.mk-card-layout *:not(.mk-focus-ring)')) {
        expect(rect(child).right, child.className || child.tagName).toBeLessThanOrEqual(right + 0.5)
      }
      // El título corta línea (no se recorta).
      expect(rect(q(c, '.mk-card-header > .mk-card-headline')).height).toBeGreaterThan(48)
    }
  })

  test('acciones: se envuelven cuando no entran y bajo 240 px se apilan a todo el ancho', async () => {
    const card = (width: number) => (
      <div style={{ width }}>
        <Card>
          <CardContent>
            <p>Texto</p>
            <CardActions>
              <Button variant="outlined" size="sm">Compartir</Button>
              <Button variant="tonal" size="sm">Guardar</Button>
              <Button size="sm">Abrir ahora</Button>
            </CardActions>
          </CardContent>
        </Card>
      </div>
    )
    let c = await render(card(300))
    let buttons = [...c.querySelectorAll('.mk-card-actions button')].map(rect)
    expect(buttons[2]!.top).toBeGreaterThan(buttons[0]!.bottom)
    expect(buttons[0]!.width).toBeLessThan(150)
    const actions = rect(q(c, '.mk-card-actions'))
    for (const b of buttons) expect(b.right).toBeLessThanOrEqual(actions.right + 0.5)

    c = await render(card(220))
    buttons = [...c.querySelectorAll('.mk-card-actions button')].map(rect)
    const narrow = rect(q(c, '.mk-card-actions'))
    for (const b of buttons) {
      expect(b.width).toBeCloseTo(narrow.width, 1)
      expect(b.left).toBeCloseTo(narrow.left, 1)
    }
    expect(buttons[1]!.top - buttons[0]!.bottom).toBeCloseTo(8, 1)
  })

  test('en una grilla, las tarjetas de una fila tienen el mismo alto y las acciones abajo', async () => {
    const c = await render(
      <div style={{ width: 600, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))' }}>
        {['Corto', 'Un título bastante más largo que corta en varias líneas dentro de la tarjeta'].map((t) => (
          <Card key={t}>
            <CardContent>
              <CardHeadline>{t}</CardHeadline>
              <p>Texto</p>
              <CardActions><Button size="sm">Abrir</Button></CardActions>
            </CardContent>
          </Card>
        ))}
      </div>,
    )
    const [a, b] = [...c.querySelectorAll('.mk-card')].map(rect)
    expect(a!.width).toBeCloseTo(292, 1)
    expect(a!.height).toBeCloseTo(b!.height, 1)
    const [ba, bb] = [...c.querySelectorAll('.mk-card-actions button')].map(rect)
    expect(ba!.bottom).toBeCloseTo(bb!.bottom, 1)
    expect(a!.bottom - ba!.bottom).toBeCloseTo(16, 1)
  })
})
