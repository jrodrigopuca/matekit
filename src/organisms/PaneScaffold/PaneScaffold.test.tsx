import { createRef, useState, type ReactNode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import { HomeIcon, StarIcon } from '../../icons/icons.tsx'
import { render, roleColor, style } from '../../test/render.tsx'
import { List, ListItem, ListItemHeadline } from '../List/List.tsx'
import {
  NavigationSuite,
  NavigationSuiteItem,
  NavigationSuiteItemIcon,
  NavigationSuiteItemLabel,
  type NavigationSuiteLayout,
} from '../NavigationSuite/NavigationSuite.tsx'
import { TopAppBar, TopAppBarTitle } from '../TopAppBar/TopAppBar.tsx'
import { Pane, PaneScaffold, type ListDetailPaneName, type SupportingPaneName } from './PaneScaffold.tsx'

const q = (c: ParentNode, sel: string) => {
  const el = c.querySelector(sel)
  if (!el) throw new Error(`no se encontró ${sel}`)
  return el as HTMLElement
}
const rect = (el: Element) => el.getBoundingClientRect()
const pane = (c: ParentNode, name: string) => q(c, `.mk-pane[data-pane='${name}']`)
const visible = (el: HTMLElement) => el.checkVisibility({ visibilityProperty: true })
const frames = (n = 3) =>
  new Promise<void>((resolve) => {
    const step = (left: number) => (left ? requestAnimationFrame(() => step(left - 1)) : resolve())
    step(n)
  })

// La ventana de las pruebas (render.tsx no la cambia); cada prueba que la cambia la deja así.
const BASE = { width: 414, height: 896 }
afterEach(async () => {
  if (window.innerWidth !== BASE.width || window.innerHeight !== BASE.height) {
    await page.viewport(BASE.width, BASE.height)
    await expect.poll(() => window.innerWidth).toBe(BASE.width)
  }
})

async function viewport(width: number, height: number) {
  await page.viewport(width, height)
  await expect.poll(() => [window.innerWidth, window.innerHeight]).toEqual([width, height])
}

/** Contenido alto, para que el panel se desplace. */
function Long({ label }: { label: string }) {
  return (
    <List aria-label={label}>
      {Array.from({ length: 40 }, (_, i) => (
        <ListItem key={i}>
          <ListItemHeadline>{`${label} ${i + 1}`}</ListItemHeadline>
        </ListItem>
      ))}
    </List>
  )
}

function Bar({ title }: { title: string }) {
  return (
    <TopAppBar>
      <TopAppBarTitle level={2}>{title}</TopAppBarTitle>
    </TopAppBar>
  )
}

function Nav({ layout }: { layout?: NavigationSuiteLayout }) {
  return (
    <NavigationSuite aria-label="Principal" layout={layout}>
      <NavigationSuiteItem href="#inbox" active>
        <NavigationSuiteItemIcon><HomeIcon filled /></NavigationSuiteItemIcon>
        <NavigationSuiteItemLabel>Inicio</NavigationSuiteItemLabel>
      </NavigationSuiteItem>
      <NavigationSuiteItem href="#favs">
        <NavigationSuiteItemIcon><StarIcon /></NavigationSuiteItemIcon>
        <NavigationSuiteItemLabel>Favoritos</NavigationSuiteItemLabel>
      </NavigationSuiteItem>
    </NavigationSuite>
  )
}

interface ListDetailOptions {
  current?: ListDetailPaneName
  extra?: boolean
  nav?: NavigationSuiteLayout | false
  height?: number
  children?: ReactNode
}

function ListDetail({ current, extra = false, nav = false, height = 600 }: ListDetailOptions) {
  return (
    <PaneScaffold current={current} style={{ height }}>
      {nav !== false && <Nav layout={nav} />}
      <Pane name="list" render={<section aria-label="Mensajes" />}>
        <Bar title="Mensajes" />
        <Long label="Mensaje" />
      </Pane>
      <Pane name="detail" render={<main />}>
        <Bar title="Detalle" />
        <Long label="Párrafo" />
      </Pane>
      {extra && (
        <Pane name="extra" render={<aside aria-label="Extra" />}>
          <Bar title="Extra" />
        </Pane>
      )}
    </PaneScaffold>
  )
}

function Supporting({ current, extra = false }: { current?: SupportingPaneName; extra?: boolean }) {
  return (
    <PaneScaffold variant="supporting" current={current} style={{ height: 600 }}>
      <Pane name="main"><Bar title="Principal" /></Pane>
      <Pane name="supporting"><Bar title="Apoyo" /></Pane>
      {extra && <Pane name="extra"><Bar title="Extra" /></Pane>}
    </PaneScaffold>
  )
}

/** Los paneles que se ven, de izquierda a derecha. */
function shown(c: ParentNode): string[] {
  return [...c.querySelectorAll<HTMLElement>('.mk-pane')]
    .filter(visible)
    .sort((a, b) => rect(a).left - rect(b).left)
    .map((p) => p.dataset['pane'] ?? '')
}

describe('PaneScaffold: estructura', () => {
  test('raíz <div> con el caso y el panel actual; los paneles con su nombre y el elemento de render', async () => {
    const c = await render(<ListDetail current="detail" />)
    const root = q(c, '.mk-pane-scaffold')
    expect(root.tagName).toBe('DIV')
    expect(root.dataset['variant']).toBe('list-detail')
    expect(root.dataset['current']).toBe('detail')
    expect(pane(c, 'list').tagName).toBe('SECTION')
    expect(pane(c, 'detail').tagName).toBe('MAIN')
    // La lista no lleva superficie por defecto; el detalle sí.
    expect(pane(c, 'list').hasAttribute('data-surface')).toBe(false)
    expect(pane(c, 'detail').hasAttribute('data-surface')).toBe(true)
  })

  test('por defecto: list-detail con la lista actual; supporting con el principal', async () => {
    const c = await render(<ListDetail />)
    expect(q(c, '.mk-pane-scaffold').dataset['current']).toBe('list')
    const s = await render(<Supporting />)
    expect(q(s, '.mk-pane-scaffold').dataset['variant']).toBe('supporting')
    expect(q(s, '.mk-pane-scaffold').dataset['current']).toBe('main')
  })

  test('props nativas, ref, className y style llegan a la raíz y a los paneles; surface cambia el de por defecto', async () => {
    const rootRef = createRef<HTMLElement>()
    const paneRef = createRef<HTMLElement>()
    const c = await render(
      <PaneScaffold ref={rootRef} id="app" className="mine" style={{ height: 300 }} data-x="1">
        <Pane name="list" ref={paneRef} className="p" surface aria-label="Lista" role="region" />
        <Pane name="detail" surface={false} />
      </PaneScaffold>,
    )
    const root = q(c, '#app')
    expect(rootRef.current).toBe(root)
    expect(root.className).toBe('mk-pane-scaffold mine')
    expect(root.dataset['x']).toBe('1')
    expect(rect(root).height).toBe(300)
    expect(paneRef.current).toBe(pane(c, 'list'))
    expect(pane(c, 'list').className).toBe('mk-pane p')
    expect(pane(c, 'list').getAttribute('aria-label')).toBe('Lista')
    expect(pane(c, 'list').hasAttribute('data-surface')).toBe(true)
    expect(pane(c, 'detail').hasAttribute('data-surface')).toBe(false)
  })

  test('sin alto propio ocupa el alto de la ventana (100dvh)', async () => {
    const c = await render(
      <PaneScaffold>
        <Pane name="list" />
      </PaneScaffold>,
    )
    expect(rect(q(c, '.mk-pane-scaffold')).height).toBeCloseTo(window.innerHeight, 0)
  })

  test('aviso en desarrollo, una vez, por un panel de otro caso', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await render(
      <PaneScaffold current="list">
        <Pane name="list" />
        <>
          <Pane name="supporting" />
        </>
      </PaneScaffold>,
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Fix:'), expect.objectContaining({ code: 'MK_PANE_NOT_IN_VARIANT', name: 'supporting', variant: 'list-detail' }))
    warn.mockClear()
    await render(<ListDetail extra />)
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('PaneScaffold: cuántos paneles y cuáles, según la ventana y el actual', () => {
  test('compacta (400): solo el actual; los demás montados y ocultos, también para la accesibilidad', async () => {
    await viewport(400, 800)
    const c = await render(<ListDetail current="list" extra />)
    expect(shown(c)).toEqual(['list'])
    expect(pane(c, 'detail').isConnected).toBe(true)
    expect(visible(pane(c, 'detail'))).toBe(false)
    // Ni foco ni clics.
    expect(style(pane(c, 'detail')).pointerEvents).toBe('none')
    expect(style(pane(c, 'detail')).opacity).toBe('0')
    expect(page.getByRole('main').query()).toBeNull()
    expect(page.getByRole('region', { name: 'Mensajes' }).query()).not.toBeNull()
    expect(rect(pane(c, 'list')).width).toBeCloseTo(400, 1)
    await render(<ListDetail current="detail" extra />)
    expect(shown(document.body)).toEqual(['detail'])
    await render(<ListDetail current="extra" extra />)
    expect(shown(document.body)).toEqual(['extra'])
  })

  test('mediana (700): un panel, el actual', async () => {
    await viewport(700, 800)
    const c = await render(<ListDetail current="detail" />)
    expect(shown(c)).toEqual(['detail'])
    const s = await render(<Supporting current="supporting" />)
    expect(shown(s)).toEqual(['supporting'])
  })

  test('expandida (900): lista y detalle con cualquiera de los dos actual; con el extra actual, detalle y extra', async () => {
    await viewport(900, 800)
    const c = await render(<ListDetail current="list" extra />)
    expect(shown(c)).toEqual(['list', 'detail'])
    await render(<ListDetail current="detail" extra />)
    expect(shown(document.body)).toEqual(['list', 'detail'])
    await render(<ListDetail current="extra" extra />)
    expect(shown(document.body)).toEqual(['detail', 'extra'])
    // current="extra" sin panel extra: lista y detalle, como si no estuviera.
    await render(<ListDetail current="extra" />)
    expect(shown(document.body)).toEqual(['list', 'detail'])
  })

  test('expandida (900), supporting: principal y apoyo; con el extra actual, principal y extra', async () => {
    await viewport(900, 800)
    const c = await render(<Supporting current="supporting" extra />)
    expect(shown(c)).toEqual(['main', 'supporting'])
    await render(<Supporting current="extra" extra />)
    expect(shown(document.body)).toEqual(['main', 'extra'])
  })

  test('grande (1300): los tres; sin extra, dos', async () => {
    await viewport(1300, 800)
    const c = await render(<ListDetail current="list" extra />)
    expect(shown(c)).toEqual(['list', 'detail', 'extra'])
    await render(<ListDetail current="detail" />)
    expect(shown(document.body)).toEqual(['list', 'detail'])
    await render(<Supporting extra />)
    expect(shown(document.body)).toEqual(['main', 'supporting', 'extra'])
  })

  test('al cambiar la ventana cambia sin volver a renderizar, y los ocultos conservan lo desplazado', async () => {
    await viewport(400, 800)
    const c = await render(<ListDetail current="list" />)
    const list = pane(c, 'list')
    list.scrollTop = 300
    await frames()
    await viewport(900, 800)
    expect(shown(c)).toEqual(['list', 'detail'])
    await viewport(400, 800)
    expect(shown(c)).toEqual(['list'])
    expect(pane(c, 'list')).toBe(list)
    expect(list.scrollTop).toBeCloseTo(300, 0)
  })

  // Con display: none, WebKit perdía lo desplazado de la lista (la List usa container queries).
  test('compacta: ir al detalle y volver deja la lista donde estaba', async () => {
    await viewport(400, 800)
    // El mismo árbol con otro current (render() desmontaría).
    const host = await render(<Toggle />)
    const l = pane(host, 'list')
    l.scrollTop = 400
    await frames()
    q(host, 'button.to-detail').click()
    await frames()
    expect(shown(host)).toEqual(['detail'])
    q(host, 'button.to-list').click()
    await frames()
    expect(shown(host)).toEqual(['list'])
    expect(pane(host, 'list')).toBe(l)
    expect(l.scrollTop).toBeCloseTo(400, 0)
  })
})

function Toggle() {
  const [current, setCurrent] = useState<ListDetailPaneName>('list')
  return (
    <PaneScaffold current={current} style={{ height: 600 }}>
      <Pane name="list">
        <button type="button" className="to-detail" onClick={() => setCurrent('detail')}>detalle</button>
        <Long label="Mensaje" />
      </Pane>
      <Pane name="detail">
        <button type="button" className="to-list" onClick={() => setCurrent('list')}>volver</button>
      </Pane>
    </PaneScaffold>
  )
}

describe('PaneScaffold: anchos (reparto de Compose) y márgenes del kit', () => {
  test('840: lista 360, 24 y el detalle con el resto (840 − 24 al inicio − 16 al final − 24 − 360 = 416)', async () => {
    await viewport(840, 800)
    const c = await render(<ListDetail current="detail" />)
    const list = rect(pane(c, 'list'))
    const detail = rect(pane(c, 'detail'))
    expect(list.left).toBeCloseTo(24, 1)
    expect(list.width).toBeCloseTo(360, 1)
    expect(detail.left - list.right).toBeCloseTo(24, 1)
    expect(detail.width).toBeCloseTo(416, 1)
    expect(840 - detail.right).toBeCloseTo(16, 1)
  })

  test('el ejemplo de Compose: 840 entre márgenes (ventana de 880) da 360 + 24 + 456', async () => {
    await viewport(880, 800)
    const c = await render(<ListDetail current="list" />)
    expect(rect(pane(c, 'list')).width).toBeCloseTo(360, 1)
    expect(rect(pane(c, 'detail')).width).toBeCloseTo(456, 1)
  })

  test('el ejemplo de Compose a 1200 entre márgenes (ventana de 1240): 1152 < 3 × 412, los tres en 384', async () => {
    await viewport(1240, 800)
    const c = await render(<ListDetail current="list" extra />)
    for (const name of ['list', 'detail', 'extra']) expect(rect(pane(c, name)).width).toBeCloseTo(384, 1)
    expect(rect(pane(c, 'detail')).left - rect(pane(c, 'list')).right).toBeCloseTo(24, 1)
    expect(rect(pane(c, 'extra')).left - rect(pane(c, 'detail')).right).toBeCloseTo(24, 1)
  })

  test('1600: secundarios de 412 y el detalle con el sobrante', async () => {
    await viewport(1600, 800)
    const c = await render(<ListDetail current="list" extra />)
    expect(rect(pane(c, 'list')).width).toBeCloseTo(412, 1)
    expect(rect(pane(c, 'extra')).width).toBeCloseTo(412, 1)
    // 1600 − 24 − 16 − 2 × 24 − 2 × 412 = 688
    expect(rect(pane(c, 'detail')).width).toBeCloseTo(688, 1)
  })

  test('falta lugar con dos paneles: los dos se achican por igual (rail a 840)', async () => {
    await viewport(840, 800)
    const c = await render(<ListDetail current="list" nav="auto" />)
    // 840 − 96 (rail) − 0 (pegado al rail) − 16 − 24 = 704 → 352 y 352.
    expect(rect(pane(c, 'list')).width).toBeCloseTo(352, 1)
    expect(rect(pane(c, 'detail')).width).toBeCloseTo(352, 1)
  })

  test('supporting: el principal primero con el resto, el apoyo de 360 al final', async () => {
    await viewport(1000, 800)
    const c = await render(<Supporting />)
    const main = rect(pane(c, 'main'))
    const sup = rect(pane(c, 'supporting'))
    expect(main.left).toBeCloseTo(24, 1)
    expect(sup.width).toBeCloseTo(360, 1)
    expect(sup.left - main.right).toBeCloseTo(24, 1)
    expect(main.width).toBeCloseTo(1000 - 24 - 16 - 24 - 360, 1)
  })

  test('desde 600: 24 arriba y hasta abajo; compacta: pegado a los bordes', async () => {
    await viewport(700, 800)
    const c = await render(<ListDetail current="detail" />)
    const root = rect(q(c, '.mk-pane-scaffold'))
    const detail = rect(pane(c, 'detail'))
    expect(detail.top - root.top).toBeCloseTo(24, 1)
    expect(root.bottom - detail.bottom).toBeCloseTo(0, 1)
    await viewport(400, 800)
    const d = rect(pane(c, 'detail'))
    expect(d.top - root.top).toBeCloseTo(0, 1)
    expect([d.left, d.width]).toEqual([0, 400])
  })

  test('RTL: la lista a la derecha, 24 del borde derecho y 16 del izquierdo', async () => {
    await viewport(900, 800)
    const c = await render(<div dir="rtl"><ListDetail current="list" /></div>)
    const list = rect(pane(c, 'list'))
    const detail = rect(pane(c, 'detail'))
    expect(900 - list.right).toBeCloseTo(24, 1)
    expect(list.left - detail.right).toBeCloseTo(24, 1)
    expect(detail.left).toBeCloseTo(16, 1)
  })
})

describe('PaneScaffold: apariencia', () => {
  test('fondo surface; desde 600 el detalle en surface-container-lowest con radio 28 solo arriba; la lista sin superficie', async () => {
    await viewport(900, 800)
    const c = await render(<ListDetail current="list" />)
    expect(style(q(c, '.mk-pane-scaffold')).backgroundColor).toBe(roleColor('surface'))
    const detail = style(pane(c, 'detail'))
    expect(detail.backgroundColor).toBe(roleColor('surface-container-lowest'))
    expect([detail.borderTopLeftRadius, detail.borderTopRightRadius, detail.borderBottomLeftRadius, detail.borderBottomRightRadius]).toEqual(['28px', '28px', '0px', '0px'])
    expect(style(pane(c, 'list')).backgroundColor).toBe('rgba(0, 0, 0, 0)')
  })

  test('la barra plana de un panel con superficie es del color del panel; en compacta, surface', async () => {
    await viewport(900, 800)
    const c = await render(<ListDetail current="detail" />)
    expect(style(q(pane(c, 'detail'), '.mk-top-app-bar')).backgroundColor).toBe(roleColor('surface-container-lowest'))
    expect(style(q(pane(c, 'list'), '.mk-top-app-bar')).backgroundColor).toBe(roleColor('surface'))
    await viewport(400, 800)
    expect(style(pane(c, 'detail')).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(style(pane(c, 'detail')).borderTopLeftRadius).toBe('0px')
    expect(style(q(pane(c, 'detail'), '.mk-top-app-bar')).backgroundColor).toBe(roleColor('surface'))
  })
})

describe('PaneScaffold: cada panel se desplaza por su cuenta', () => {
  test('el TopAppBar primer hijo se queda arriba de su panel y cambia de color al desplazar; el otro panel no se mueve', async () => {
    await viewport(900, 800)
    const c = await render(<ListDetail current="list" />)
    const list = pane(c, 'list')
    const detail = pane(c, 'detail')
    const bar = q(list, '.mk-top-app-bar')
    const otherBar = q(detail, '.mk-top-app-bar')
    const top = rect(list).top
    expect(list.scrollHeight).toBeGreaterThan(list.clientHeight)
    list.scrollTop = 500
    await frames()
    expect(rect(bar).top).toBeCloseTo(top, 1)
    expect(style(bar).backgroundColor).toBe(roleColor('surface-container'))
    // La barra del detalle sigue plana y quieta: la línea de tiempo es la de su panel.
    expect(rect(otherBar).top).toBeCloseTo(rect(detail).top, 1)
    expect(style(otherBar).backgroundColor).toBe(roleColor('surface-container-lowest'))
    expect(document.scrollingElement?.scrollTop ?? 0).toBe(0)
  })
})

describe('PaneScaffold: con NavigationSuite', () => {
  test('expandida (1000 × 800): rail al inicio a todo el alto; la lista pegada al rail, 24 arriba', async () => {
    await viewport(1000, 800)
    const c = await render(<ListDetail current="list" nav="auto" />)
    const nav = rect(q(c, '.mk-navigation-suite'))
    const root = rect(q(c, '.mk-pane-scaffold'))
    expect(style(q(c, '.mk-navigation-suite')).flexDirection).toBe('column')
    expect([nav.left, nav.width]).toEqual([0, 96])
    expect(nav.height).toBeCloseTo(root.height, 1)
    const list = rect(pane(c, 'list'))
    expect(list.left).toBeCloseTo(96, 1)
    expect(list.top - root.top).toBeCloseTo(24, 1)
    expect(shown(c)).toEqual(['list', 'detail'])
  })

  test('compacta (400 × 800): barra abajo a todo el ancho; un panel arriba, pegado a la barra', async () => {
    await viewport(400, 800)
    const c = await render(<ListDetail current="detail" nav="auto" />)
    const navEl = q(c, '.mk-navigation-suite')
    const nav = rect(navEl)
    const root = rect(q(c, '.mk-pane-scaffold'))
    expect(style(navEl).flexDirection).toBe('row')
    expect([nav.left, nav.width]).toEqual([0, 400])
    expect(nav.bottom).toBeCloseTo(root.bottom, 1)
    const detail = rect(pane(c, 'detail'))
    expect(shown(c)).toEqual(['detail'])
    expect([detail.left, detail.width]).toEqual([0, 400])
    expect(detail.bottom).toBeCloseTo(nav.top, 1)
  })

  test('teléfono acostado (900 × 400): barra abajo y dos paneles con los márgenes del kit', async () => {
    await viewport(900, 400)
    const c = await render(<ListDetail current="list" nav="auto" height={400} />)
    expect(style(q(c, '.mk-navigation-suite')).flexDirection).toBe('row')
    expect(shown(c)).toEqual(['list', 'detail'])
    expect(rect(pane(c, 'list')).left).toBeCloseTo(24, 1)
  })

  test('layout fijo: rail en compacta, barra en expandida', async () => {
    await viewport(400, 800)
    const c = await render(<ListDetail current="list" nav="rail" />)
    expect(rect(pane(c, 'list')).left).toBeCloseTo(96, 1)
    await viewport(1000, 800)
    const b = await render(<ListDetail current="list" nav="bar" />)
    expect(rect(q(b, '.mk-navigation-suite')).width).toBe(1000)
    expect(rect(pane(b, 'list')).left).toBeCloseTo(24, 1)
  })
})

describe('PaneScaffold: zonas seguras', () => {
  /** Simula una muesca: el CSS lee env() en estas variables de la raíz. */
  const insets = { '--_inset-top': '30px', '--_inset-right': '20px', '--_inset-bottom': '34px', '--_inset-left': '44px' } as Record<string, string>

  function WithInsets({ nav, current = 'list' }: { nav?: NavigationSuiteLayout; current?: ListDetailPaneName }) {
    return (
      <PaneScaffold current={current} style={{ height: 600, ...insets }}>
        {nav && <Nav layout={nav} />}
        <Pane name="list"><Long label="Mensaje" /></Pane>
        <Pane name="detail" />
      </PaneScaffold>
    )
  }

  test('la declaración lee las cuatro zonas seguras del sistema', () => {
    const rules = [...document.styleSheets].flatMap((sheet) => {
      const walk = (list: CSSRuleList): CSSStyleRule[] =>
        [...list].flatMap((r) => (r instanceof CSSStyleRule ? [r, ...walk(r.cssRules)] : 'cssRules' in r ? walk((r as CSSGroupingRule).cssRules) : []))
      try {
        return walk(sheet.cssRules)
      } catch {
        return []
      }
    })
    const root = rules.find((r) => r.selectorText === '.mk-pane-scaffold')
    for (const side of ['top', 'right', 'bottom', 'left']) {
      expect(root?.style.getPropertyValue(`--_inset-${side}`)).toMatch(new RegExp(`env\\(safe-area-inset-${side}`))
    }
  })

  test('compacta sin navegación: arriba y a los costados fuera del panel, abajo dentro (se desplaza hasta el final)', async () => {
    await viewport(400, 800)
    const c = await render(<WithInsets />)
    const root = rect(q(c, '.mk-pane-scaffold'))
    const list = pane(c, 'list')
    const r = rect(list)
    expect(r.top - root.top).toBeCloseTo(30, 1)
    expect(r.left).toBeCloseTo(44, 1)
    expect(400 - r.right).toBeCloseTo(20, 1)
    expect(root.bottom - r.bottom).toBeCloseTo(0, 1)
    expect(style(list).paddingBottom).toBe('34px')
  })

  test('desde 600: se suman a los márgenes del kit (24 arriba y al inicio, 16 al final)', async () => {
    await viewport(900, 800)
    const c = await render(<WithInsets />)
    const root = rect(q(c, '.mk-pane-scaffold'))
    expect(rect(pane(c, 'list')).top - root.top).toBeCloseTo(54, 1)
    expect(rect(pane(c, 'list')).left).toBeCloseTo(68, 1)
    expect(900 - rect(pane(c, 'detail')).right).toBeCloseTo(36, 1)
  })

  test('con rail: el costado de inicio es del rail (no se suma dos veces); con barra, la de abajo es de la barra', async () => {
    await viewport(900, 800)
    const c = await render(<WithInsets nav="auto" />)
    const navRight = rect(q(c, '.mk-navigation-suite')).right
    expect(rect(pane(c, 'list')).left).toBeCloseTo(navRight, 1)
    expect(style(pane(c, 'list')).paddingBottom).toBe('34px')
    await viewport(400, 800)
    expect(style(pane(c, 'list')).paddingBottom).toBe('0px')
  })

  test('RTL: el inicio es la derecha', async () => {
    await viewport(400, 800)
    const c = await render(<div dir="rtl"><WithInsets /></div>)
    const r = rect(pane(c, 'list'))
    expect(400 - r.right).toBeCloseTo(20, 1)
    expect(r.left).toBeCloseTo(44, 1)
  })
})

describe('PaneScaffold: universal, sin salto al hidratar', () => {
  test('el HTML del servidor ya muestra los paneles de la ventana, y la hidratación no lo cambia', async () => {
    await viewport(900, 800)
    const errors = vi.spyOn(console, 'error')
    const host = document.createElement('div')
    const ui = <ListDetail current="detail" nav="auto" />
    host.innerHTML = renderToString(ui)
    document.body.append(host)
    try {
      expect(shown(host)).toEqual(['list', 'detail'])
      const before = [...host.querySelectorAll('.mk-pane, .mk-navigation-suite')].map((el) => rect(el).toJSON())
      const list = pane(host, 'list')
      const root = hydrateRoot(host, ui)
      await frames(2)
      expect(pane(host, 'list')).toBe(list)
      const after = [...host.querySelectorAll('.mk-pane, .mk-navigation-suite')].map((el) => rect(el).toJSON())
      expect(after).toEqual(before)
      expect(errors).not.toHaveBeenCalled()
      root.unmount()
    } finally {
      host.remove()
      errors.mockRestore()
    }
  })
})
