import { createRef, type AnchorHTMLAttributes, type ReactNode, type Ref } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { commands, page } from 'vitest/browser'
import { EditIcon, HomeIcon, MenuIcon, SearchIcon, StarIcon } from '../../icons/icons.tsx'
import { Badge } from '../../molecules/Badge/Badge.tsx'
import { Fab } from '../../molecules/Fab/Fab.tsx'
import { IconButton } from '../../molecules/IconButton/IconButton.tsx'
import { render, roleColor, style, withMotion } from '../../test/render.tsx'
import { NavigationBar, NavigationBarItem, NavigationBarItemIcon, NavigationBarItemLabel, type NavigationBarLayout } from '../NavigationBar/NavigationBar.tsx'
import {
  NavigationRail,
  NavigationRailHeader,
  NavigationRailItem,
  NavigationRailItemIcon,
  NavigationRailItemLabel,
} from '../NavigationRail/NavigationRail.tsx'
import {
  NavigationSuite,
  NavigationSuiteHeader,
  NavigationSuiteItem,
  NavigationSuiteItemIcon,
  NavigationSuiteItemLabel,
  type NavigationSuiteLayout,
} from './NavigationSuite.tsx'

const q = (c: ParentNode, sel: string) => {
  const el = c.querySelector(sel)
  if (!el) throw new Error(`no se encontró ${sel}`)
  return el as HTMLElement
}
const qa = (c: ParentNode, sel: string) => [...c.querySelectorAll<HTMLElement>(sel)]
const rect = (el: Element) => el.getBoundingClientRect()
const suite = (c: ParentNode) => q(c, '.mk-navigation-suite')

// La ventana de las pruebas (render.tsx no la cambia); cada prueba que la cambia la deja así.
const BASE = { width: 414, height: 896 }
afterEach(async () => {
  if (window.innerWidth !== BASE.width || window.innerHeight !== BASE.height) {
    await page.viewport(BASE.width, BASE.height)
    await expect.poll(() => window.innerWidth).toBe(BASE.width)
  }
})

/** Cambia la ventana y espera a que el iframe tenga el tamaño nuevo (las media queries lo leen). */
async function viewport(width: number, height: number) {
  await page.viewport(width, height)
  await expect.poll(() => [window.innerWidth, window.innerHeight]).toEqual([width, height])
}

/** Presentación que se ve: barra (fila) con destinos verticales u horizontales, o rail (columna). */
function presentation(nav: HTMLElement): 'bar-vertical' | 'bar-horizontal' | 'rail' {
  if (style(nav).flexDirection === 'column') return 'rail'
  const item = q(nav, '.mk-navigation-bar-item')
  return style(item).gridTemplateRows.split(' ').length === 3 ? 'bar-horizontal' : 'bar-vertical'
}

const DESTINATIONS = [
  { id: 'home', label: 'Inicio', Icon: HomeIcon },
  { id: 'favs', label: 'Favoritos', Icon: StarIcon, active: true },
  { id: 'search', label: 'Buscar', Icon: SearchIcon, badge: true },
] as const

function Suite({ layout, header = false }: { layout?: NavigationSuiteLayout; header?: boolean }) {
  return (
    <NavigationSuite aria-label="Principal" layout={layout}>
      {header && (
        <NavigationSuiteHeader>
          <IconButton label="Menú" size="md" shape="square" className="menu"><MenuIcon /></IconButton>
          <Fab label="Redactar" className="fab"><EditIcon /></Fab>
        </NavigationSuiteHeader>
      )}
      {DESTINATIONS.map((d) => (
        <NavigationSuiteItem key={d.id} href={`#${d.id}`} active={'active' in d} className={d.id}>
          <NavigationSuiteItemIcon><d.Icon filled={'active' in d} /></NavigationSuiteItemIcon>
          <NavigationSuiteItemLabel>{d.label}</NavigationSuiteItemLabel>
          {'badge' in d && <Badge label="3 resultados nuevos">3</Badge>}
        </NavigationSuiteItem>
      ))}
    </NavigationSuite>
  )
}

function Bar({ layout }: { layout: NavigationBarLayout }) {
  return (
    <NavigationBar aria-label="Barra" layout={layout} className="real">
      {DESTINATIONS.map((d) => (
        <NavigationBarItem key={d.id} href={`#${d.id}`} active={'active' in d} className={d.id}>
          <NavigationBarItemIcon><d.Icon filled={'active' in d} /></NavigationBarItemIcon>
          <NavigationBarItemLabel>{d.label}</NavigationBarItemLabel>
          {'badge' in d && <Badge label="3 resultados nuevos">3</Badge>}
        </NavigationBarItem>
      ))}
    </NavigationBar>
  )
}

function Rail() {
  return (
    <NavigationRail aria-label="Rail" className="real">
      <NavigationRailHeader>
        <IconButton label="Menú" size="md" shape="square" className="menu"><MenuIcon /></IconButton>
        <Fab label="Redactar" className="fab"><EditIcon /></Fab>
      </NavigationRailHeader>
      {DESTINATIONS.map((d) => (
        <NavigationRailItem key={d.id} href={`#${d.id}`} active={'active' in d} className={d.id}>
          <NavigationRailItemIcon><d.Icon filled={'active' in d} /></NavigationRailItemIcon>
          <NavigationRailItemLabel>{d.label}</NavigationRailItemLabel>
          {'badge' in d && <Badge label="3 resultados nuevos">3</Badge>}
        </NavigationRailItem>
      ))}
    </NavigationRail>
  )
}

/** Cajas de las partes de cada destino, relativas al contenedor. */
function layoutOf(nav: HTMLElement) {
  const n = rect(nav)
  const rel = (el: Element) => {
    const r = rect(el)
    return { x: r.left - n.left, y: r.top - n.top, w: r.width, h: r.height }
  }
  // La etiqueta, por su caja de contenido: la de la barra lleva 4 de relleno a los lados y la del
  // rail no (se ubica con translate); lo que tiene que coincidir es el texto.
  const text = (el: HTMLElement) => {
    const r = rel(el)
    const s = style(el)
    const start = Number.parseFloat(s.paddingLeft)
    const end = Number.parseFloat(s.paddingRight)
    return { ...r, x: r.x + start, w: r.w - start - end }
  }
  return {
    nav: { w: n.width, h: n.height },
    items: qa(nav, ':scope > a').map((item) => ({
      item: rel(item),
      pill: rel(q(item, ':scope > .mk-state-layer')),
      icon: rel(q(item, ':scope > :is(.mk-navigation-bar-item-icon, .mk-navigation-rail-item-icon)')),
      label: text(q(item, ':scope > :is(.mk-navigation-bar-item-label, .mk-navigation-rail-item-label)')),
      badge: item.querySelector(':scope > .mk-badge') ? rel(q(item, ':scope > .mk-badge')) : null,
    })),
  }
}

function expectSameLayout(actual: ReturnType<typeof layoutOf>, expected: ReturnType<typeof layoutOf>) {
  expect(actual.nav.w).toBeCloseTo(expected.nav.w, 1)
  expect(actual.nav.h).toBeCloseTo(expected.nav.h, 1)
  expect(actual.items).toHaveLength(expected.items.length)
  actual.items.forEach((a, i) => {
    const e = expected.items[i]!
    for (const part of ['item', 'pill', 'icon', 'label', 'badge'] as const) {
      const pa = a[part]
      const pe = e[part]
      if (!pa || !pe) {
        expect(pa).toEqual(pe)
        continue
      }
      // La etiqueta del rail se centra con translate(−50 %), que WebKit redondea a la grilla de
      // subpíxeles (0,08 px de diferencia, visto el 2026-11-27): medio píxel de margen.
      const digits = part === 'label' ? 0 : 1
      for (const k of ['x', 'y', 'w', 'h'] as const) expect(pa[k], `${i} ${part}.${k}`).toBeCloseTo(pe[k], digits)
    }
  })
}

describe('NavigationSuite: presentación según la ventana (regla de Compose)', () => {
  const CASES = [
    { width: 400, height: 800, expected: 'bar-vertical', why: 'ancho compact' },
    { width: 500, height: 400, expected: 'bar-vertical', why: 'ancho compact (gana al alto compact)' },
    { width: 800, height: 400, expected: 'bar-horizontal', why: 'ancho medium y alto compact' },
    { width: 1300, height: 450, expected: 'bar-horizontal', why: 'ancho large y alto compact' },
    { width: 600, height: 480, expected: 'rail', why: 'justo en los cortes (600 y 480)' },
    { width: 800, height: 800, expected: 'rail', why: 'ancho medium' },
    { width: 1300, height: 800, expected: 'rail', why: 'ancho large: sigue contraído' },
  ] as const
  for (const { width, height, expected, why } of CASES) {
    test(`${width} × ${height}: ${expected} (${why})`, async () => {
      await viewport(width, height)
      const c = await render(<Suite />)
      expect(presentation(suite(c))).toBe(expected)
    })
  }

  test('al cambiar la ventana cambia la presentación, sin volver a renderizar', async () => {
    const c = await render(<Suite />)
    const nav = suite(c)
    await viewport(400, 800)
    await expect.poll(() => presentation(nav)).toBe('bar-vertical')
    await viewport(800, 400)
    await expect.poll(() => presentation(nav)).toBe('bar-horizontal')
    await viewport(900, 800)
    await expect.poll(() => presentation(nav)).toBe('rail')
    expect(suite(c)).toBe(nav)
  })
})

describe('NavigationSuite: cada presentación mide como el componente real', () => {
  test('barra con destinos verticales = NavigationBar vertical', async () => {
    await viewport(400, 800)
    const c = await render(
      <>
        <div style={{ width: 360 }}><Suite header /></div>
        <div style={{ width: 360 }}><Bar layout="vertical" /></div>
      </>,
    )
    expectSameLayout(layoutOf(suite(c)), layoutOf(q(c, '.real')))
    expect(rect(suite(c)).height).toBe(64)
    expect(style(q(c, '.mk-navigation-suite-header')).display).toBe('none')
  })

  test('barra con destinos horizontales = NavigationBar horizontal', async () => {
    await viewport(800, 400)
    const c = await render(
      <>
        <div style={{ width: 700 }}><Suite /></div>
        <div style={{ width: 700 }}><Bar layout="horizontal" /></div>
      </>,
    )
    expectSameLayout(layoutOf(suite(c)), layoutOf(q(c, '.real')))
    expect(rect(suite(c)).height).toBe(64)
  })

  // Los juegos de variables de la barra están escritos dos veces (auto y bar, navigation-suite.css):
  // esta prueba cubre la copia de bar.
  test('layout="bar" desde 600 = NavigationBar horizontal; debajo, vertical', async () => {
    await viewport(900, 800)
    let c = await render(
      <>
        <div style={{ width: 700 }}><Suite layout="bar" /></div>
        <div style={{ width: 700 }}><Bar layout="horizontal" /></div>
      </>,
    )
    expectSameLayout(layoutOf(suite(c)), layoutOf(q(c, '.real')))
    await viewport(400, 800)
    c = await render(
      <>
        <div style={{ width: 360 }}><Suite layout="bar" /></div>
        <div style={{ width: 360 }}><Bar layout="vertical" /></div>
      </>,
    )
    expectSameLayout(layoutOf(suite(c)), layoutOf(q(c, '.real')))
  })

  test('rail = NavigationRail contraído, con el bloque superior', async () => {
    await viewport(800, 800)
    const c = await render(
      <div style={{ display: 'flex', height: 600 }}>
        <Suite header />
        <Rail />
      </div>,
    )
    expectSameLayout(layoutOf(suite(c)), layoutOf(q(c, '.real')))
    expect(rect(suite(c)).width).toBe(96)
    expect(rect(suite(c)).height).toBe(600)
    const at = (nav: HTMLElement, sel: string) => {
      const r = rect(q(nav, sel))
      return [r.left - rect(nav).left, r.top - rect(nav).top]
    }
    for (const sel of ['.menu', '.fab']) expect(at(suite(c), sel)).toEqual(at(q(c, '.real'), sel))
    // 44 arriba, 20 al inicio, 40 entre el bloque y los destinos, 4 entre destinos.
    expect(at(suite(c), '.menu')).toEqual([20, 44])
    const [first, second] = qa(suite(c), ':scope > a')
    expect(rect(first!).top - rect(q(c, '.mk-navigation-suite-header')).bottom).toBeCloseTo(0, 1)
    expect(rect(second!).top - rect(first!).bottom).toBeCloseTo(4, 1)
  })
})

describe('NavigationSuite: colores', () => {
  test('barra: surface-container; activo con indicador secondary-container y etiqueta secondary', async () => {
    await viewport(400, 800)
    const c = await render(<Suite />)
    expect(style(suite(c)).backgroundColor).toBe(roleColor('surface-container'))
    const active = q(c, '.favs')
    expect(style(q(active, ':scope > .mk-navigation-bar-item-indicator')).backgroundColor).toBe(roleColor('secondary-container'))
    expect(style(q(active, ':scope > .mk-navigation-bar-item-label')).color).toBe(roleColor('secondary'))
    expect(style(q(active, ':scope > .mk-navigation-bar-item-icon')).color).toBe(roleColor('on-secondary-container'))
    expect(style(q(c, '.home > .mk-navigation-bar-item-label')).color).toBe(roleColor('on-surface-variant'))
  })

  test('destinos horizontales: la etiqueta activa, dentro del indicador, en on-secondary-container', async () => {
    await viewport(800, 400)
    const c = await render(<Suite />)
    expect(style(q(c, '.favs > .mk-navigation-bar-item-label')).color).toBe(roleColor('on-secondary-container'))
  })

  test('rail: sin fondo; etiqueta activa en secondary', async () => {
    await viewport(800, 800)
    const c = await render(<Suite />)
    expect(style(suite(c)).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(style(q(c, '.favs > .mk-navigation-bar-item-label')).color).toBe(roleColor('secondary'))
  })
})

describe('NavigationSuite: elección forzada', () => {
  test('layout="bar": barra en cualquier ventana (destinos horizontales desde 600 de ancho)', async () => {
    await viewport(900, 800)
    const c = await render(<Suite layout="bar" header />)
    expect(presentation(suite(c))).toBe('bar-horizontal')
    expect(style(q(c, '.mk-navigation-suite-header')).display).toBe('none')
    await viewport(400, 800)
    await expect.poll(() => presentation(suite(c))).toBe('bar-vertical')
  })

  test('layout="rail": rail contraído aun en ancho compact', async () => {
    await viewport(400, 800)
    const c = await render(<div style={{ height: 500, display: 'flex' }}><Suite layout="rail" header /></div>)
    expect(presentation(suite(c))).toBe('rail')
    expect(style(q(c, '.mk-navigation-suite-header')).display).toBe('flex')
    await viewport(800, 400)
    expect(presentation(suite(c))).toBe('rail')
  })

  test('layout="auto" es el valor por defecto y queda en data-layout', async () => {
    const c = await render(<><Suite /><Suite layout="rail" /></>)
    expect(qa(c, '.mk-navigation-suite').map((n) => n.dataset['layout'])).toEqual(['auto', 'rail'])
  })
})

describe('NavigationSuite: destinos', () => {
  test('es un <nav> con nombre; los destinos son enlaces, el activo con aria-current="page"', async () => {
    await render(<Suite />)
    const nav = page.getByRole('navigation', { name: 'Principal' }).element()
    expect(nav.tagName).toBe('NAV')
    expect(page.getByRole('link', { name: 'Favoritos' }).element().getAttribute('aria-current')).toBe('page')
    expect(page.getByRole('link', { name: 'Inicio' }).element().hasAttribute('aria-current')).toBe(false)
    expect(page.getByRole('link', { name: 'Inicio' }).element().getAttribute('href')).toBe('#home')
    // La insignia se suma al nombre, después de la etiqueta.
    await expect.element(page.getByRole('link', { name: 'Buscar 3 resultados nuevos' })).toBeVisible()
  })

  test('sin href es un botón; con render, el elemento del enrutador con clases y aria-current', async () => {
    function RouterLink({ to, ref, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; ref?: Ref<HTMLAnchorElement> }) {
      return <a {...props} ref={ref} href={to} data-router="" />
    }
    const ref = createRef<HTMLAnchorElement>()
    const c = await render(
      <NavigationSuite aria-label="Principal">
        <NavigationSuiteItem className="b">
          <NavigationSuiteItemLabel>Botón</NavigationSuiteItemLabel>
        </NavigationSuiteItem>
        <NavigationSuiteItem active render={<RouterLink to="/r" ref={ref} />} className="r">
          <NavigationSuiteItemIcon><HomeIcon filled /></NavigationSuiteItemIcon>
          <NavigationSuiteItemLabel>Ruta</NavigationSuiteItemLabel>
        </NavigationSuiteItem>
      </NavigationSuite>,
    )
    expect(q(c, '.b').tagName).toBe('BUTTON')
    expect(q(c, '.b').getAttribute('type')).toBe('button')
    const r = q(c, '.r')
    expect(r).toBe(ref.current)
    expect(r.hasAttribute('data-router')).toBe(true)
    expect(r.getAttribute('href')).toBe('/r')
    expect(r.getAttribute('aria-current')).toBe('page')
    expect(r.classList.contains('mk-navigation-bar-item')).toBe(true)
    expect(r.classList.contains('mk-navigation-suite-item')).toBe(true)
  })

  test('render con un componente en vez de un elemento: error con código', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const Bad = (() => null) as unknown as ReactNode
    await expect(
      render(
        <NavigationSuite>
          <NavigationSuiteItem render={Bad as never}>x</NavigationSuiteItem>
        </NavigationSuite>,
      ),
    ).rejects.toMatchObject({ code: 'MK_RENDER_NOT_ELEMENT', details: { component: 'NavigationSuiteItem' } })
  })
})

describe('NavigationSuite: universal, sin salto al hidratar', () => {
  test('el HTML del servidor ya muestra la presentación de la ventana, y la hidratación no lo cambia', async () => {
    await viewport(400, 800)
    const errors = vi.spyOn(console, 'error')
    const host = document.createElement('div')
    host.innerHTML = renderToString(<Suite header />)
    document.body.append(host)
    try {
      const nav = suite(host)
      // Antes de hidratar: ya es la barra (CSS, sin JavaScript).
      expect(presentation(nav)).toBe('bar-vertical')
      const before = layoutOf(nav)
      const root = hydrateRoot(host, <Suite header />)
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      expect(suite(host)).toBe(nav)
      expectSameLayout(layoutOf(nav), before)
      expect(errors).not.toHaveBeenCalled()
      root.unmount()
    } finally {
      host.remove()
    }
  })

  test('al cruzar un corte no se anima el cambio de disposición (solo los colores)', async () => {
    const sheet = document.getElementById('mk-test-no-motion') as HTMLStyleElement
    await viewport(400, 800)
    const c = await render(<Suite />)
    sheet.media = 'not all'
    try {
      await viewport(800, 400)
      await expect.poll(() => presentation(suite(c))).toBe('bar-horizontal')
      const moving = suite(c)
        .getAnimations({ subtree: true })
        .map((a) => (a as CSSTransition).transitionProperty)
        .filter((p) => p !== 'color')
      expect(moving).toEqual([])
    } finally {
      sheet.media = ''
    }
  })

  test('movimiento reducido: el indicador aparece sin crecer', async () => {
    await commands.reduceMotion(true)
    try {
      const c = await render(<Suite />)
      withMotion(() => {
        const s = style(q(c, '.favs > .mk-navigation-bar-item-indicator'))
        expect(s.transitionProperty).toBe('width')
        expect(Number.parseFloat(s.transitionDuration)).toBe(0)
      })
    } finally {
      await commands.reduceMotion(false)
    }
  })
})

describe('NavigationSuite: props nativas y ref', () => {
  test('ref, className, style y atributos llegan al <nav>; las partes aceptan los suyos', async () => {
    const ref = createRef<HTMLElement>()
    const header = createRef<HTMLDivElement>()
    const c = await render(
      <NavigationSuite ref={ref} className="mio" style={{ color: 'red' }} data-x="1" aria-label="Nav">
        <NavigationSuiteHeader ref={header} className="hh" data-y="2" />
        <NavigationSuiteItem href="#a" id="a1" data-z="3">
          <NavigationSuiteItemIcon className="ic"><HomeIcon /></NavigationSuiteItemIcon>
          <NavigationSuiteItemLabel className="lb">A</NavigationSuiteItemLabel>
        </NavigationSuiteItem>
      </NavigationSuite>,
    )
    expect(ref.current).toBe(suite(c))
    expect(suite(c).classList.contains('mio')).toBe(true)
    expect(suite(c).style.color).toBe('red')
    expect(suite(c).dataset['x']).toBe('1')
    expect(header.current).toBe(q(c, '.hh'))
    expect(q(c, '.hh').classList.contains('mk-navigation-rail-header')).toBe(true)
    expect(q(c, '.hh').dataset['y']).toBe('2')
    expect(q(c, '#a1').dataset['z']).toBe('3')
    expect(q(c, '.ic').getAttribute('aria-hidden')).toBe('true')
    expect(q(c, '.ic').classList.contains('mk-navigation-bar-item-icon')).toBe(true)
    expect(q(c, '.lb').classList.contains('mk-navigation-bar-item-label')).toBe(true)
  })
})
