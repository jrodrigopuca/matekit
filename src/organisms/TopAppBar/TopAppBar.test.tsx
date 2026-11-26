import { createRef, type ReactNode } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { commands, page } from 'vitest/browser'
import { ArrowBackIcon, BookmarkIcon, SearchIcon } from '../../icons/icons.tsx'
import { IconButton } from '../../molecules/IconButton/IconButton.tsx'
import { render, roleColor, style, withMotion } from '../../test/render.tsx'
import {
  TopAppBar,
  TopAppBarActions,
  TopAppBarLeading,
  TopAppBarSubtitle,
  TopAppBarTitle,
  type TopAppBarProps,
} from './TopAppBar.tsx'

const q = <T extends Element = HTMLElement>(c: ParentNode, sel: string) => {
  const el = c.querySelector<T>(sel)
  if (!el) throw new Error(`no se encontró ${sel}`)
  return el
}
const rect = (el: Element) => el.getBoundingClientRect()

/** Valor en px de un token (por ejemplo una altura de línea en rem). */
function tokenPx(name: string): number {
  const probe = document.createElement('div')
  probe.style.height = `var(${name})`
  document.body.append(probe)
  const value = Number.parseFloat(getComputedStyle(probe).height)
  probe.remove()
  return value
}

/** Espera n cuadros: las animaciones por desplazamiento se actualizan en el cuadro siguiente. */
const frames = (n = 2) =>
  new Promise<void>((resolve) => {
    const step = (left: number) => (left ? requestAnimationFrame(() => step(left - 1)) : resolve())
    step(n)
  })

/** Desplaza el contenedor a una posición concreta y espera a que se apliquen los estilos. */
async function scrollTo(scroller: HTMLElement, top: number) {
  scroller.scrollTop = top
  await frames(3)
}

interface BarOptions extends Omit<TopAppBarProps, 'children' | 'title'> {
  title?: ReactNode
  subtitle?: ReactNode
  leading?: boolean
  actions?: number
}

function Bar({ title = 'Bandeja', subtitle, leading = true, actions = 1, ...props }: BarOptions) {
  return (
    <TopAppBar {...props}>
      {leading && (
        <TopAppBarLeading>
          <IconButton label="Volver"><ArrowBackIcon /></IconButton>
        </TopAppBarLeading>
      )}
      <TopAppBarTitle>{title}</TopAppBarTitle>
      {subtitle !== undefined && <TopAppBarSubtitle>{subtitle}</TopAppBarSubtitle>}
      {actions > 0 && (
        <TopAppBarActions>
          {[<SearchIcon key="s" />, <BookmarkIcon key="b" />].slice(0, actions).map((icon, i) => (
            <IconButton key={i} label={i === 0 ? 'Buscar' : 'Guardar'}>{icon}</IconButton>
          ))}
        </TopAppBarActions>
      )}
    </TopAppBar>
  )
}

/** Un contenedor de 360 × 300 que se desplaza, con la barra como primer hijo. */
async function renderScrolling(bar: ReactNode, width = 360, measured = true) {
  const c = await render(
    <div className="scroller" style={{ width, height: 300, overflow: 'auto' }}>
      {bar}
      <div style={{ height: 2000 }}>contenido</div>
    </div>,
  )
  const scroller = q(c, '.scroller')
  const header = q(c, '.mk-top-app-bar')
  // TopAppBarScroll mide el alto en un ResizeObserver (asincrónico).
  if (measured) await expect.poll(() => header.style.getPropertyValue('--_height')).not.toBe('')
  return { c, scroller, header }
}

/** Posición de un elemento relativa al borde superior del contenedor que se desplaza. */
const topIn = (el: Element, scroller: Element) => rect(el).top - rect(scroller).top

describe('estructura y semántica', () => {
  test('es un <header> con el título como <h1> y un solo encabezado para la accesibilidad', async () => {
    const c = await render(<Bar size="md" subtitle="3 sin leer" />)
    const header = q(c, '.mk-top-app-bar')
    expect(header.tagName).toBe('HEADER')
    await expect.element(page.getByRole('heading', { level: 1, name: 'Bandeja' })).toBeInTheDocument()
    expect(page.getByRole('heading').elements()).toHaveLength(1)
    expect(q(c, '.mk-top-app-bar-subtitle').tagName).toBe('P')
    // Las copias de la barra colapsada no se leen ni se enfocan.
    for (const sel of ['.mk-top-app-bar-collapsed-title', '.mk-top-app-bar-collapsed-subtitle']) {
      expect(q(c, sel).getAttribute('aria-hidden')).toBe('true')
      expect(q(c, sel).inert).toBe(true)
    }
    expect(q(c, '.mk-top-app-bar-collapsed-title').textContent).toBe('Bandeja')
  })

  test('en el <body> es la región banner; dentro de <main>, no', async () => {
    await render(<Bar />)
    await expect.element(page.getByRole('banner')).toBeInTheDocument()
    await render(<main><Bar /></main>)
    expect(page.getByRole('banner').elements()).toHaveLength(0)
  })

  test('level cambia el nivel del título; render cambia el elemento', async () => {
    const c = await render(
      <TopAppBar render={<div />}>
        <TopAppBarTitle level={2}>Notas</TopAppBarTitle>
      </TopAppBar>,
    )
    expect(q(c, '.mk-top-app-bar').tagName).toBe('DIV')
    await expect.element(page.getByRole('heading', { level: 2, name: 'Notas' })).toBeInTheDocument()
  })

  test('acciones e inicio con nombre accesible', async () => {
    await render(<Bar actions={2} />)
    for (const name of ['Volver', 'Buscar', 'Guardar']) {
      await expect.element(page.getByRole('button', { name })).toBeInTheDocument()
    }
  })

  test('un hijo que no es una parte va en el lugar del título (search bar, ítem 21)', async () => {
    const c = await render(
      <div style={{ width: 360 }}>
        <TopAppBar scrollBehavior="none">
          <TopAppBarLeading><IconButton label="Menú"><ArrowBackIcon /></IconButton></TopAppBarLeading>
          <div role="search" className="slot" style={{ height: 56 }}>buscar</div>
          <TopAppBarActions><IconButton label="Cuenta"><SearchIcon /></IconButton></TopAppBarActions>
        </TopAppBar>
      </div>,
    )
    const bar = rect(q(c, '.mk-top-app-bar'))
    const slot = rect(q(c, '.slot'))
    expect(slot.left - bar.left).toBeCloseTo(4 + 48 + 4, 2)
    expect(bar.right - slot.right).toBeCloseTo(4 + 48 + 4, 2)
    expect(slot.top - bar.top).toBeCloseTo(8, 2)
  })

  test('las props nativas, className, style y ref llegan al elemento; las partes también aceptan ref', async () => {
    const ref = createRef<HTMLElement>()
    const titleRef = createRef<HTMLHeadingElement>()
    const actionsRef = createRef<HTMLDivElement>()
    const c = await render(
      <TopAppBar ref={ref} id="barra" className="propia" style={{ marginTop: 3 }} aria-label="Principal" data-x="1">
        <TopAppBarTitle ref={titleRef} id="titulo">Título</TopAppBarTitle>
        <TopAppBarActions ref={actionsRef} className="acciones" />
      </TopAppBar>,
    )
    const header = q(c, '.mk-top-app-bar')
    expect(ref.current).toBe(header)
    expect(header.id).toBe('barra')
    expect(header.classList.contains('propia')).toBe(true)
    expect(header.style.marginTop).toBe('3px')
    expect(header.getAttribute('aria-label')).toBe('Principal')
    expect(header.dataset['x']).toBe('1')
    expect(titleRef.current?.id).toBe('titulo')
    expect(actionsRef.current?.classList.contains('mk-top-app-bar-actions')).toBe(true)
    // La copia del título no recibe el id (sería un id repetido).
    expect(c.querySelectorAll('#titulo')).toHaveLength(1)
  })
})

describe('medidas y tipografía (kit y Compose)', () => {
  test('small: 64 de alto, relleno 4, inicio y acciones de 48, título Title Large desde 56', async () => {
    const c = await render(<div style={{ width: 360 }}><Bar scrollBehavior="none" /></div>)
    const bar = rect(q(c, '.mk-top-app-bar'))
    expect(bar.height).toBeCloseTo(64, 2)
    const back = rect(q(c, '.mk-top-app-bar-leading .mk-icon-button'))
    expect(back.left - bar.left).toBeCloseTo(4 + 4, 2) // relleno 4 y el botón de 40 centrado en 48
    expect(back.top - bar.top).toBeCloseTo(12, 2)
    const search = rect(q(c, '.mk-top-app-bar-actions .mk-icon-button'))
    expect(bar.right - search.right).toBeCloseTo(4 + 4, 2)
    const title = q(c, '.mk-top-app-bar-title')
    expect(rect(title).left - bar.left).toBeCloseTo(56, 2)
    expect(style(title).fontSize).toBe(`${tokenPx('--md-sys-typescale-title-large-size')}px`)
    expect(style(title).lineHeight).toBe(`${tokenPx('--md-sys-typescale-title-large-line-height')}px`)
    // Centrado en el alto: (64 - 28) / 2.
    expect(rect(title).top - bar.top).toBeCloseTo((64 - tokenPx('--md-sys-typescale-title-large-line-height')) / 2, 2)
  })

  test('small sin inicio: el título empieza a 16', async () => {
    const c = await render(<div style={{ width: 360 }}><Bar leading={false} scrollBehavior="none" /></div>)
    expect(rect(q(c, '.mk-top-app-bar-title')).left - rect(q(c, '.mk-top-app-bar')).left).toBeCloseTo(16, 2)
  })

  test('small con subtítulo: Label Medium debajo del título, el bloque de 44 centrado', async () => {
    const c = await render(<div style={{ width: 360 }}><Bar subtitle="3 sin leer" scrollBehavior="none" /></div>)
    const bar = rect(q(c, '.mk-top-app-bar'))
    const title = rect(q(c, '.mk-top-app-bar-title'))
    const sub = q(c, '.mk-top-app-bar-subtitle')
    const block = tokenPx('--md-sys-typescale-title-large-line-height') + tokenPx('--md-sys-typescale-label-medium-line-height')
    expect(bar.height).toBeCloseTo(64, 2)
    expect(title.top - bar.top).toBeCloseTo((64 - block) / 2, 2)
    expect(rect(sub).top).toBeCloseTo(title.bottom, 2)
    expect(rect(sub).left).toBeCloseTo(title.left, 2)
    expect(style(sub).fontSize).toBe(`${tokenPx('--md-sys-typescale-label-medium-size')}px`)
  })

  test('small centrado: el título se centra en toda la barra', async () => {
    const c = await render(<div style={{ width: 360 }}><Bar centered scrollBehavior="none" title="Hola" /></div>)
    const bar = rect(q(c, '.mk-top-app-bar'))
    const title = rect(q(c, '.mk-top-app-bar-title'))
    expect(title.left + title.width / 2).toBeCloseTo(bar.left + bar.width / 2, 1)
  })

  const twoRows = [
    { size: 'md', title: '--md-sys-typescale-headline-medium', sub: '--md-sys-typescale-label-large', gap: 4, heights: [112, 136] },
    { size: 'lg', title: '--md-sys-typescale-display-small', sub: '--md-sys-typescale-title-medium', gap: 8, heights: [120, 152] },
  ] as const
  for (const { size, title, sub, gap, heights } of twoRows) {
    test(`${size}: ${heights[0]} de alto (${heights[1]} con subtítulo), título a 16 del borde y 12 de la base`, async () => {
      for (const withSub of [false, true]) {
        const c = await render(
          <div style={{ width: 360 }}>
            <Bar size={size} scrollBehavior="none" {...(withSub ? { subtitle: '3 sin leer' } : {})} />
          </div>,
        )
        const bar = rect(q(c, '.mk-top-app-bar'))
        expect(bar.height, withSub ? 'con subtítulo' : 'sin subtítulo').toBeCloseTo(heights[withSub ? 1 : 0], 2)
        const t = q(c, '.mk-top-app-bar-title')
        expect(rect(t).left - bar.left).toBeCloseTo(16, 2)
        expect(rect(t).top - bar.top).toBeCloseTo(64, 2)
        expect(style(t).fontSize).toBe(`${tokenPx(`${title}-size`)}px`)
        const last = withSub ? q(c, '.mk-top-app-bar-subtitle') : t
        expect(bar.bottom - rect(last).bottom).toBeCloseTo(12, 2)
        if (withSub) {
          const s = q(c, '.mk-top-app-bar-subtitle')
          expect(rect(s).top - rect(t).bottom).toBeCloseTo(gap, 2)
          expect(style(s).fontSize).toBe(`${tokenPx(`${sub}-size`)}px`)
        }
        // La fila de iconos: el botón de 40 a 12 de arriba (relleno 8 y el área de 48).
        expect(rect(q(c, '.mk-top-app-bar-leading .mk-icon-button')).top - bar.top).toBeCloseTo(12, 2)
      }
    })
  }

  test('medium: las copias para la barra colapsada ocupan la banda de 64, con el título centrado', async () => {
    const titleLine = tokenPx('--md-sys-typescale-title-large-line-height')
    const subLine = tokenPx('--md-sys-typescale-label-medium-line-height')
    for (const withSub of [false, true]) {
      const c = await render(
        <div style={{ width: 360 }}>
          <Bar size="md" scrollBehavior="none" {...(withSub ? { subtitle: '3 sin leer' } : {})} />
        </div>,
      )
      const bar = rect(q(c, '.mk-top-app-bar'))
      const copy = q(c, '.mk-top-app-bar-collapsed-title')
      expect(rect(copy).top - bar.top).toBeCloseTo(0, 2)
      expect(rect(copy).height).toBeCloseTo(64, 2)
      expect(rect(copy).left - bar.left).toBeCloseTo(56, 2)
      const block = withSub ? titleLine + subLine : titleLine
      expect(Number.parseFloat(style(copy).paddingTop)).toBeCloseTo((64 - block) / 2, 2)
      expect(style(copy).fontSize).toBe(`${tokenPx('--md-sys-typescale-title-large-size')}px`)
      if (withSub) {
        const subCopy = q(c, '.mk-top-app-bar-collapsed-subtitle')
        expect(Number.parseFloat(style(subCopy).paddingTop)).toBeCloseTo((64 - block) / 2 + titleLine, 2)
      }
    }
  })

  test('medium y large sin colapso (none o pinned): las copias no se ven', async () => {
    for (const scrollBehavior of ['none', 'pinned'] as const) {
      const c = await render(<Bar size="md" subtitle="s" scrollBehavior={scrollBehavior} />)
      expect(style(q(c, '.mk-top-app-bar-collapsed-title')).opacity, scrollBehavior).toBe('0')
      expect(style(q(c, '.mk-top-app-bar-collapsed-subtitle')).opacity, scrollBehavior).toBe('0')
      expect(style(q(c, '.mk-top-app-bar-title')).opacity, scrollBehavior).toBe('1')
    }
  })

  test('medium centrado: el título expandido no le quita ancho a la copia (usa todo lo libre)', async () => {
    const long = 'Resumen de las notas del viaje por la Patagonia'
    const c = await render(<div style={{ width: 360 }}><Bar size="md" centered actions={2} title={long} scrollBehavior="none" /></div>)
    // 360 - 4 - 4 (relleno) - 4 - 4 (separaciones) - 48 (inicio) - 96 (acciones).
    expect(rect(q(c, '.mk-top-app-bar-collapsed-title')).width).toBeCloseTo(200, 0)
    expect(q(c, '.mk-top-app-bar-title').scrollWidth).toBeLessThanOrEqual(q(c, '.mk-top-app-bar').clientWidth)
  })

  test('small: las copias no se ven', async () => {
    const c = await render(<Bar subtitle="s" />)
    expect(style(q(c, '.mk-top-app-bar-collapsed-title')).display).toBe('none')
    expect(style(q(c, '.mk-top-app-bar-collapsed-subtitle')).display).toBe('none')
  })
})

describe('colores', () => {
  test('plana en Surface; título On Surface, subtítulo On Surface Variant, inicio On Surface y acciones On Surface Variant', async () => {
    const c = await render(<Bar subtitle="s" scrollBehavior="none" />)
    expect(style(q(c, '.mk-top-app-bar')).backgroundColor).toBe(roleColor('surface'))
    expect(style(q(c, '.mk-top-app-bar-title')).color).toBe(roleColor('on-surface'))
    expect(style(q(c, '.mk-top-app-bar-subtitle')).color).toBe(roleColor('on-surface-variant'))
    expect(style(q(c, '.mk-top-app-bar-leading .mk-icon-button')).color).toBe(roleColor('on-surface'))
    expect(style(q(c, '.mk-top-app-bar-actions .mk-icon-button')).color).toBe(roleColor('on-surface-variant'))
  })

  test('pinned: fija arriba, plana al principio y Surface Container con contenido debajo', async () => {
    const { scroller, header } = await renderScrolling(<Bar />)
    expect(header.dataset['scrollBehavior']).toBe('pinned')
    expect(style(header).backgroundColor).toBe(roleColor('surface'))
    await scrollTo(scroller, 500)
    expect(topIn(header, scroller)).toBeCloseTo(0, 2)
    await expect.poll(() => style(header).backgroundColor).toBe(roleColor('surface-container'))
    await scrollTo(scroller, 0)
    await expect.poll(() => style(header).backgroundColor).toBe(roleColor('surface'))
  })

  test('en tema oscuro, los mismos roles', async () => {
    const { c, scroller, header } = await renderScrolling(<Bar />)
    c.dataset['theme'] = 'dark'
    const dark = (role: string) => {
      const probe = document.createElement('span')
      probe.style.color = `var(--md-sys-color-${role})`
      c.append(probe)
      const value = getComputedStyle(probe).color
      probe.remove()
      return value
    }
    expect(dark('surface')).not.toBe(roleColor('surface'))
    expect(style(header).backgroundColor).toBe(dark('surface'))
    await scrollTo(scroller, 500)
    await expect.poll(() => style(header).backgroundColor).toBe(dark('surface-container'))
    expect(style(q(c, '.mk-top-app-bar-title')).color).toBe(dark('on-surface'))
  })
})

describe('comportamientos al desplazar', () => {
  test('exit-until-collapsed (por defecto en el medium): se corre 48, la fila de iconos queda y los títulos se cruzan', async () => {
    const { c, scroller, header } = await renderScrolling(<Bar size="md" />)
    expect(header.dataset['scrollBehavior']).toBe('exit-until-collapsed')
    const leading = q(c, '.mk-top-app-bar-leading .mk-icon-button')
    const title = q(c, '.mk-top-app-bar-title')
    const copy = q(c, '.mk-top-app-bar-collapsed-title')
    expect(style(title).opacity).toBe('1')
    expect(style(copy).opacity).toBe('0')

    // A mitad del colapso (24 de 48): la barra subió 24, el inicio sigue arriba y el título
    // grande está a mitad de opacidad (lineal, como Compose).
    await scrollTo(scroller, 24)
    expect(topIn(header, scroller)).toBeCloseTo(-24, 0)
    expect(topIn(leading, scroller)).toBeCloseTo(12, 0)
    expect(Number(style(title).opacity)).toBeCloseTo(0.5, 1)
    // El chico aparece con TopTitleAlphaEasing (cubic-bezier(.8, 0, .8, .15)): casi nada a la mitad.
    expect(Number(style(copy).opacity)).toBeLessThan(0.2)
    // La parte del título grande que pasó bajo la fila de iconos queda tapada por la banda (el
    // ::before de la barra): en ese punto, lo de arriba es la barra y no el título.
    const t = rect(title)
    expect(t.top).toBeLessThan(rect(scroller).top + 60)
    const hit = document.elementFromPoint(t.left + 4, rect(scroller).top + 60)
    expect(hit).toBe(header)
    expect(document.elementFromPoint(t.left + 4, t.bottom - 4)).toBe(title)

    // Colapsada: quedan 64 visibles, Surface Container, solo el título chico.
    await scrollTo(scroller, 400)
    expect(topIn(header, scroller)).toBeCloseTo(-48, 0)
    expect(rect(header).bottom - rect(scroller).top).toBeCloseTo(64, 0)
    expect(topIn(leading, scroller)).toBeCloseTo(12, 0)
    expect(topIn(copy, scroller)).toBeCloseTo(0, 0)
    expect(style(title).opacity).toBe('0')
    expect(style(copy).opacity).toBe('1')
    expect(style(header).backgroundColor).toBe(roleColor('surface-container'))
    // El fondo de la banda (::before) tapa al título grande que pasó por debajo.
    expect(getComputedStyle(header, '::before').backgroundColor).toBe(roleColor('surface-container'))

    // Se expande solo al volver al principio (no al subir un poco).
    await scrollTo(scroller, 300)
    expect(topIn(header, scroller)).toBeCloseTo(-48, 0)
    await scrollTo(scroller, 0)
    expect(topIn(header, scroller)).toBeCloseTo(0, 0)
    expect(style(title).opacity).toBe('1')
    expect(style(header).backgroundColor).toBe(roleColor('surface'))
  })

  test('large flexible con un título de varias líneas: crece, mide su alto y colapsa a 64', async () => {
    const long = 'Resumen de las notas del viaje por la Patagonia en el verano'
    const { scroller, header } = await renderScrolling(<Bar size="lg" title={long} />, 240)
    const height = rect(header).height
    expect(height).toBeGreaterThan(120)
    await expect.poll(() => Number.parseFloat(header.style.getPropertyValue('--_height'))).toBeCloseTo(height, 0)
    await scrollTo(scroller, 1000)
    expect(rect(header).bottom - rect(scroller).top).toBeCloseTo(64, 0)
    expect(style(q(header, '.mk-top-app-bar-collapsed-title')).opacity).toBe('1')
  })

  test('enter-always (small): se esconde al bajar, vuelve al subir y se acomoda al terminar', async () => {
    const { scroller, header } = await renderScrolling(<Bar scrollBehavior="enter-always" />)
    expect(header.dataset['scrollDriver']).toBe('script')
    await scrollTo(scroller, 300)
    await expect.poll(() => rect(header).bottom - rect(scroller).top).toBeCloseTo(0, 0)
    expect(header.style.getPropertyValue('--_offset')).toBe('64px')
    // Al subir 20 asoma 20; al terminar de desplazar, la más cercana es escondida.
    await scrollTo(scroller, 280)
    await expect.poll(() => header.style.getPropertyValue('--_offset')).toBe('64px')
    // Al subir 50 asoma 50 (más de la mitad): se acomoda visible.
    await scrollTo(scroller, 230)
    await expect.poll(() => header.style.getPropertyValue('--_offset')).toBe('0px')
    expect(header.dataset['settling']).toBe('')
    await expect.poll(() => topIn(header, scroller)).toBeCloseTo(0, 0)
    expect(style(header).backgroundColor).toBe(roleColor('surface-container'))
  })

  test('enter-always: el foco en una acción trae la barra escondida', async () => {
    const { c, scroller, header } = await renderScrolling(<Bar scrollBehavior="enter-always" />)
    await scrollTo(scroller, 300)
    await expect.poll(() => header.style.getPropertyValue('--_offset')).toBe('64px')
    q<HTMLButtonElement>(c, '.mk-top-app-bar-actions button').focus()
    await expect.poll(() => header.style.getPropertyValue('--_offset')).toBe('0px')
  })

  test('enter-always (medium): se colapsa al alto del small sin esconderse, y se expande al subir', async () => {
    const { c, scroller, header } = await renderScrolling(<Bar size="md" scrollBehavior="enter-always" />)
    await scrollTo(scroller, 400)
    await expect.poll(() => header.style.getPropertyValue('--_offset')).toBe('48px')
    await expect.poll(() => rect(header).bottom - rect(scroller).top).toBeCloseTo(64, 0)
    expect(topIn(q(c, '.mk-top-app-bar-leading .mk-icon-button'), scroller)).toBeCloseTo(12, 0)
    expect(style(q(c, '.mk-top-app-bar-collapsed-title')).opacity).toBe('1')
    expect(style(q(c, '.mk-top-app-bar-title')).opacity).toBe('0')
    // Subir lo suficiente en cualquier lugar (no solo arriba) la expande.
    await scrollTo(scroller, 340)
    await expect.poll(() => header.style.getPropertyValue('--_offset')).toBe('0px')
    expect(style(q(c, '.mk-top-app-bar-title')).opacity).toBe('1')
  })

  test('none: no se fija ni cambia de color, y no dibuja la parte cliente', async () => {
    // Sin la parte cliente nadie mide el alto.
    const { scroller, header } = await renderScrolling(<Bar scrollBehavior="none" />, 360, false)
    expect(header.querySelector('span[hidden]')).toBeNull()
    await scrollTo(scroller, 200)
    expect(topIn(header, scroller)).toBeCloseTo(-200, 0)
    expect(style(header).backgroundColor).toBe(roleColor('surface'))
  })

  describe('respaldo sin animation-timeline', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    test('exit-until-collapsed: TopAppBarScroll escribe el avance y la animación detenida lo muestra', async () => {
      const supports = CSS.supports.bind(CSS)
      vi.spyOn(CSS, 'supports').mockImplementation((...args: [string, string?]) =>
        args.some((a) => a?.includes('animation-timeline')) ? false : supports(...(args as [string])),
      )
      const { c, scroller, header } = await renderScrolling(<Bar size="md" />)
      expect(header.dataset['scrollDriver']).toBe('script')
      const title = q(c, '.mk-top-app-bar-title')
      await scrollTo(scroller, 24)
      await expect.poll(() => header.style.getPropertyValue('--_progress')).toBe('0.5')
      expect(Number(style(title).opacity)).toBeCloseTo(0.5, 2)
      expect(topIn(header, scroller)).toBeCloseTo(-24, 0)
      await scrollTo(scroller, 400)
      await expect.poll(() => style(q(c, '.mk-top-app-bar-collapsed-title')).opacity).toBe('1')
      expect(style(title).opacity).toBe('0')
      expect(style(header).backgroundColor).toBe(roleColor('surface-container'))
    })

    test('pinned: el color cambia con el desplazamiento', async () => {
      const supports = CSS.supports.bind(CSS)
      vi.spyOn(CSS, 'supports').mockImplementation((...args: [string, string?]) =>
        args.some((a) => a?.includes('animation-timeline')) ? false : supports(...(args as [string])),
      )
      const { scroller, header } = await renderScrolling(<Bar />)
      expect(header.dataset['scrollDriver']).toBe('script')
      expect(style(header).backgroundColor).toBe(roleColor('surface'))
      await scrollTo(scroller, 100)
      await expect.poll(() => style(header).backgroundColor).toBe(roleColor('surface-container'))
    })
  })

  test('la ventana como contenedor: en el documento también se fija y cambia de color', async () => {
    const c = await render(
      <div>
        <Bar />
        <div style={{ height: 3000 }} />
      </div>,
    )
    const header = q(c, '.mk-top-app-bar')
    const doc = document.scrollingElement ?? document.documentElement
    const start = rect(header).top + doc.scrollTop
    try {
      doc.scrollTop = start + 500
      await frames(3)
      expect(rect(header).top).toBeCloseTo(0, 0)
      await expect.poll(() => style(header).backgroundColor).toBe(roleColor('surface-container'))
    } finally {
      doc.scrollTop = 0
    }
  })
})

describe('movimiento reducido', () => {
  afterEach(() => commands.reduceMotion(false))

  test('enter-always se acomoda con el resorte; con movimiento reducido, salta', async () => {
    const c = await render(<Bar scrollBehavior="enter-always" />)
    const header = q(c, '.mk-top-app-bar')
    header.dataset['settling'] = ''
    expect(withMotion(() => style(header).transitionProperty)).toBe('translate')
    expect(withMotion(() => style(header).transitionDuration)).not.toBe('0s')
    await commands.reduceMotion(true)
    await expect.poll(() => withMotion(() => style(header).transitionDuration)).toBe('0s')
  })
})

describe('responsive', () => {
  test('a 320 px no desborda: el título se recorta con puntos suspensivos y conserva el nombre completo', async () => {
    const long = 'Resumen de las notas del viaje por la Patagonia'
    const c = await render(<div style={{ width: 320 }}><Bar title={long} subtitle="Actualizado hace 5 minutos" actions={2} scrollBehavior="none" /></div>)
    const header = q(c, '.mk-top-app-bar')
    expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth)
    expect(rect(header).width).toBeCloseTo(320, 2)
    const title = q(c, '.mk-top-app-bar-title')
    expect(style(title).textOverflow).toBe('ellipsis')
    expect(title.scrollWidth).toBeGreaterThan(title.clientWidth)
    await expect.element(page.getByRole('heading', { name: long })).toBeInTheDocument()
    expect(rect(q(c, '.mk-top-app-bar-actions')).right).toBeLessThanOrEqual(rect(header).right)
    expect(rect(header).height).toBeCloseTo(64, 2)
  })

  test('medium a 320 px: el título ocupa varias líneas y la barra crece', async () => {
    const long = 'Resumen de las notas del viaje por la Patagonia'
    const c = await render(<div style={{ width: 320 }}><Bar size="md" title={long} scrollBehavior="none" /></div>)
    const header = q(c, '.mk-top-app-bar')
    const title = q(c, '.mk-top-app-bar-title')
    expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth)
    expect(rect(title).height).toBeGreaterThan(tokenPx('--md-sys-typescale-headline-medium-line-height'))
    expect(rect(header).height).toBeCloseTo(64 + rect(title).height + 12, 2)
  })

  test('a 1200 px: título al inicio y acciones al final, ancho fluido', async () => {
    const c = await render(
      <div style={{ width: 400, overflow: 'auto' }}>
        <div style={{ width: 1200 }}><Bar actions={2} scrollBehavior="none" /></div>
      </div>,
    )
    const header = q(c, '.mk-top-app-bar')
    const bar = rect(header)
    expect(bar.width).toBeCloseTo(1200, 2)
    expect(rect(q(c, '.mk-top-app-bar-title')).left - bar.left).toBeCloseTo(56, 2)
    const last = [...c.querySelectorAll('.mk-top-app-bar-actions .mk-icon-button')].at(-1)
    if (!last) throw new Error('sin acciones')
    expect(bar.right - rect(last).right).toBeCloseTo(8, 2)
  })
})

test('RTL: el inicio a la derecha y las acciones a la izquierda', async () => {
  const c = await render(<div dir="rtl" style={{ width: 360 }}><Bar size="md" scrollBehavior="none" /></div>)
  const bar = rect(q(c, '.mk-top-app-bar'))
  expect(bar.right - rect(q(c, '.mk-top-app-bar-leading .mk-icon-button')).right).toBeCloseTo(8, 2)
  expect(rect(q(c, '.mk-top-app-bar-actions .mk-icon-button')).left - bar.left).toBeCloseTo(8, 2)
  expect(bar.right - rect(q(c, '.mk-top-app-bar-title')).right).toBeCloseTo(16, 2)
  expect(bar.right - rect(q(c, '.mk-top-app-bar-collapsed-title')).right).toBeCloseTo(56, 2)
})
