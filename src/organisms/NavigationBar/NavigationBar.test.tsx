import { createRef, type AnchorHTMLAttributes, type ReactNode, type Ref } from 'react'
import { describe, expect, test } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'
import { HomeIcon, SearchIcon, SettingsIcon, StarIcon } from '../../icons/icons.tsx'
import { Badge } from '../../molecules/Badge/Badge.tsx'
import { render, roleColor, style, withMotion } from '../../test/render.tsx'
import {
  NavigationBar,
  NavigationBarItem,
  NavigationBarItemIcon,
  NavigationBarItemLabel,
  type NavigationBarLayout,
} from './NavigationBar.tsx'

const q = (c: ParentNode, sel: string) => {
  const el = c.querySelector(sel)
  if (!el) throw new Error(`no se encontró ${sel}`)
  return el as HTMLElement
}
const rect = (el: Element) => el.getBoundingClientRect()
const indicator = (item: Element) => q(item, ':scope > .mk-navigation-bar-item-indicator')
const icon = (item: Element) => q(item, ':scope > .mk-navigation-bar-item-icon')
const label = (item: Element) => q(item, ':scope > .mk-navigation-bar-item-label')

/** Barra de tres destinos, con el segundo activo y una insignia grande en el tercero. */
function Bar({ layout, width = 400 }: { layout?: NavigationBarLayout; width?: number }) {
  return (
    <div style={{ width }}>
      <NavigationBar aria-label="Principal" layout={layout}>
        <NavigationBarItem href="#inicio" className="home">
          <NavigationBarItemIcon><HomeIcon /></NavigationBarItemIcon>
          <NavigationBarItemLabel>Inicio</NavigationBarItemLabel>
        </NavigationBarItem>
        <NavigationBarItem href="#favoritos" active className="favs">
          <NavigationBarItemIcon><StarIcon filled /></NavigationBarItemIcon>
          <NavigationBarItemLabel>Favoritos</NavigationBarItemLabel>
        </NavigationBarItem>
        <NavigationBarItem href="#buscar" className="search">
          <NavigationBarItemIcon><SearchIcon /></NavigationBarItemIcon>
          <NavigationBarItemLabel>Buscar</NavigationBarItemLabel>
          <Badge label="3 resultados nuevos">3</Badge>
        </NavigationBarItem>
      </NavigationBar>
    </div>
  )
}

describe('NavigationBar: estructura y accesibilidad', () => {
  test('es un <nav> con nombre, y cada destino es un enlace con su etiqueta como nombre', async () => {
    await render(<Bar />)
    const nav = page.getByRole('navigation', { name: 'Principal' }).element()
    expect(nav.tagName).toBe('NAV')
    expect(nav.className).toBe('mk-navigation-bar')
    expect((nav as HTMLElement).dataset['layout']).toBe('vertical')
    for (const name of ['Inicio', 'Favoritos']) {
      expect(page.getByRole('link', { name, exact: true }).element().tagName).toBe('A')
    }
  })

  test('solo el activo lleva aria-current="page"', async () => {
    const c = await render(<Bar />)
    expect(q(c, '.favs').getAttribute('aria-current')).toBe('page')
    expect(q(c, '.home').hasAttribute('aria-current')).toBe(false)
    expect(q(c, '.search').hasAttribute('aria-current')).toBe(false)
  })

  test('la insignia suma su texto al nombre, después de la etiqueta; el número visible no se lee', async () => {
    const c = await render(<Bar />)
    const search = page.getByRole('link', { name: 'Buscar 3 resultados nuevos' }).element()
    expect(search).toBe(q(c, '.search'))
    await expect.element(page.getByRole('link', { name: /Buscar/ })).toHaveAccessibleName('Buscar 3 resultados nuevos')
  })

  test('el icono, el indicador y los átomos quedan ocultos para lectores de pantalla', async () => {
    const c = await render(<Bar />)
    const item = q(c, '.home')
    expect(icon(item).getAttribute('aria-hidden')).toBe('true')
    expect(indicator(item).getAttribute('aria-hidden')).toBe('true')
    expect(item.querySelectorAll(':scope > .mk-state-layer, :scope > .mk-ripple, :scope > .mk-focus-ring')).toHaveLength(3)
  })

  test('con href es un <a>; sin href, un <button type="button">', async () => {
    const c = await render(
      <NavigationBar>
        <NavigationBarItem href="/a" className="a"><NavigationBarItemLabel>A</NavigationBarItemLabel></NavigationBarItem>
        <NavigationBarItem className="b" active><NavigationBarItemLabel>B</NavigationBarItemLabel></NavigationBarItem>
      </NavigationBar>,
    )
    const a = q(c, '.a')
    expect(a.tagName).toBe('A')
    expect(a.getAttribute('href')).toBe('/a')
    const b = q(c, '.b') as HTMLButtonElement
    expect(b.tagName).toBe('BUTTON')
    expect(b.type).toBe('button')
    expect(b.getAttribute('aria-current')).toBe('page')
    expect(page.getByRole('button', { name: 'B' }).element()).toBe(b)
  })

  test('sin etiqueta visible, aria-label le da nombre', async () => {
    await render(
      <NavigationBar>
        <NavigationBarItem href="/ajustes" aria-label="Ajustes">
          <NavigationBarItemIcon><SettingsIcon /></NavigationBarItemIcon>
        </NavigationBarItem>
      </NavigationBar>,
    )
    expect(page.getByRole('link', { name: 'Ajustes' }).element().tagName).toBe('A')
  })
})

/** Imita el Link de Next.js y de React Router: reparte el resto de las props sobre un <a>. */
interface FakeLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string
  prefetch?: boolean | undefined
  ref?: Ref<HTMLAnchorElement> | undefined
  children?: ReactNode
}
const received: Partial<FakeLinkProps>[] = []
function FakeLink({ to, prefetch, ref, ...rest }: FakeLinkProps) {
  received.push({ to, prefetch, ...rest })
  return <a {...rest} ref={ref} href={to} data-prefetch={String(prefetch ?? true)} />
}

/** Imita el NavLink de React Router: pone aria-current él mismo y acepta className función. */
function FakeNavLink({
  to,
  current,
  className,
  ...rest
}: Omit<FakeLinkProps, 'className'> & { current: boolean; className?: string | ((s: { isActive: boolean }) => string) }) {
  return (
    <a
      {...rest}
      href={to}
      aria-current={current ? 'page' : undefined}
      className={typeof className === 'function' ? className({ isActive: current }) : className}
    />
  )
}

describe('NavigationBar: enrutadores (render)', () => {
  test('el componente de enlace recibe clases, aria-current, props, ref y las partes como hijos', async () => {
    received.length = 0
    const ref = createRef<HTMLElement>()
    const c = await render(
      <NavigationBar>
        <NavigationBarItem
          active
          ref={ref}
          id="n1"
          data-foo="bar"
          className="mio"
          render={<FakeLink to="/inicio" prefetch={false} className="propia" title="Ir al inicio" />}
        >
          <NavigationBarItemIcon><HomeIcon /></NavigationBarItemIcon>
          <NavigationBarItemLabel>Inicio</NavigationBarItemLabel>
        </NavigationBarItem>
      </NavigationBar>,
    )
    const a = q(c, 'a')
    expect(received.at(-1)).toMatchObject({ to: '/inicio', prefetch: false, 'aria-current': 'page', id: 'n1' })
    expect(a.getAttribute('href')).toBe('/inicio')
    expect(a.dataset['prefetch']).toBe('false')
    expect(a.className).toBe('mk-navigation-bar-item mio propia')
    expect(a.getAttribute('aria-current')).toBe('page')
    expect(a.title).toBe('Ir al inicio')
    expect(a.id).toBe('n1')
    expect(a.dataset['foo']).toBe('bar')
    expect(ref.current).toBe(a)
    expect(a.querySelector(':scope > .mk-navigation-bar-item-indicator')).not.toBeNull()
    expect(page.getByRole('link', { name: 'Inicio' }).element()).toBe(a)
  })

  test('la ref propia del elemento de render gana sobre la del item', async () => {
    const own = createRef<HTMLAnchorElement>()
    const item = createRef<HTMLElement>()
    const c = await render(
      <NavigationBar>
        <NavigationBarItem ref={item} render={<FakeLink to="/" ref={own} />}>
          <NavigationBarItemLabel>Inicio</NavigationBarItemLabel>
        </NavigationBarItem>
      </NavigationBar>,
    )
    expect(own.current).toBe(q(c, 'a'))
    expect(item.current).toBeNull()
  })

  test('un NavLink que decide aria-current y usa className función queda activo sin `active`', async () => {
    const c = await render(
      <NavigationBar>
        <NavigationBarItem render={<FakeNavLink to="/a" current className={({ isActive }) => (isActive ? 'on' : 'off')} />}>
          <NavigationBarItemLabel>A</NavigationBarItemLabel>
        </NavigationBarItem>
        <NavigationBarItem render={<FakeNavLink to="/b" current={false} />}>
          <NavigationBarItemLabel>B</NavigationBarItemLabel>
        </NavigationBarItem>
      </NavigationBar>,
    )
    const [a, b] = c.querySelectorAll('a')
    expect(a?.className).toBe('mk-navigation-bar-item on')
    expect(a?.getAttribute('aria-current')).toBe('page')
    expect(b?.className).toBe('mk-navigation-bar-item')
    expect(style(indicator(a as Element)).width).toBe('56px')
    expect(style(indicator(b as Element)).width).toBe('0px')
  })

  test('render con algo que no es un elemento falla con un mensaje claro', async () => {
    const bad = { render: 'x' } as unknown as { render: never }
    await expect(
      render(<NavigationBarItem {...bad}><NavigationBarItemLabel>X</NavigationBarItemLabel></NavigationBarItem>),
    ).rejects.toMatchObject({ code: 'MK_RENDER_NOT_ELEMENT', details: { component: 'NavigationBarItem' } })
  })
})

describe('NavigationBar: teclado', () => {
  test('Tab recorre los destinos en orden y Enter sigue el enlace', async () => {
    const c = await render(<Bar />)
    const before = document.createElement('button')
    before.textContent = 'antes'
    c.prepend(before)
    before.focus()
    await userEvent.tab()
    expect(document.activeElement).toBe(q(c, '.home'))
    await userEvent.tab()
    expect(document.activeElement).toBe(q(c, '.favs'))
    await userEvent.tab()
    expect(document.activeElement).toBe(q(c, '.search'))
    await userEvent.keyboard('{Enter}')
    expect(location.hash).toBe('#buscar')
    history.replaceState(null, '', location.pathname + location.search)
  })

  test('en un <button>, Enter y Espacio activan', async () => {
    const clicks: string[] = []
    const c = await render(
      <NavigationBar>
        <NavigationBarItem className="b" onClick={() => clicks.push('b')}>
          <NavigationBarItemLabel>B</NavigationBarItemLabel>
        </NavigationBarItem>
      </NavigationBar>,
    )
    q(c, '.b').focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard(' ')
    expect(clicks).toEqual(['b', 'b'])
  })

  test('el anillo de foco aparece con el teclado, sobre el indicador', async () => {
    const c = await render(<Bar />)
    const item = q(c, '.home')
    const before = document.createElement('button')
    c.prepend(before)
    before.focus()
    await userEvent.tab()
    const ring = q(item, ':scope > .mk-focus-ring')
    expect(style(ring).opacity).toBe('1')
    expect(rect(ring).width).toBe(56)
    expect(rect(ring).height).toBe(32)
  })
})

describe('NavigationBar: medidas (kit y Compose)', () => {
  test('barra de 64 en surface-container, elementos repartidos a lo ancho', async () => {
    const c = await render(<Bar width={402} />)
    const nav = q(c, 'nav')
    expect(rect(nav).height).toBe(64)
    expect(style(nav).backgroundColor).toBe(roleColor('surface-container'))
    expect(style(nav).boxShadow).toBe('none')
    const items = [...c.querySelectorAll('.mk-navigation-bar-item')]
    for (const it of items) {
      expect(rect(it).width).toBeCloseTo(134, 0)
      expect(rect(it).height).toBe(64)
    }
  })

  test('el relleno inferior sale de la zona segura del sistema', async () => {
    // Sin zona segura, env() vale 0; se revisa la declaración.
    const sheet = [...document.styleSheets].flatMap((s) => {
      try {
        return [...s.cssRules]
      } catch {
        return []
      }
    })
    const text = sheet.map((r) => r.cssText).join('\n')
    expect(text).toMatch(/\.mk-navigation-bar \{[^}]*env\(safe-area-inset-bottom/)
  })

  test('vertical: indicador 56 × 32 radio 16, icono 24 centrado en él, separación 4 y Label Medium', async () => {
    const c = await render(<Bar />)
    const item = q(c, '.favs')
    const ind = rect(indicator(item))
    expect(ind.width).toBe(56)
    expect(ind.height).toBe(32)
    expect(style(indicator(item)).borderRadius).toBe('16px')
    expect(ind.top - rect(item).top).toBe(6)
    const ic = rect(icon(item))
    expect(ic.width).toBe(24)
    expect(ic.height).toBe(24)
    expect(ic.left - ind.left).toBe(16)
    expect(ic.top - ind.top).toBe(4)
    const lb = label(item)
    expect(rect(lb).top - ind.bottom).toBe(4)
    expect(rect(lb).height).toBe(16)
    expect(style(lb).fontSize).toBe('12px')
    expect(style(lb).fontWeight).toBe('500')
    expect(rect(item).bottom - rect(lb).bottom).toBe(6)
    // La etiqueta queda centrada debajo del indicador.
    expect((rect(lb).left + rect(lb).right) / 2).toBeCloseTo((ind.left + ind.right) / 2, 0)
  })

  test('horizontal: indicador de 40 radio 20 con 16 a los lados, icono y etiqueta adentro separados 4', async () => {
    const c = await render(<Bar layout="horizontal" width={600} />)
    expect(q(c, 'nav').dataset['layout']).toBe('horizontal')
    const item = q(c, '.favs')
    const ind = rect(indicator(item))
    const ic = rect(icon(item))
    const lb = rect(label(item))
    expect(ind.height).toBe(40)
    expect(style(indicator(item)).borderRadius).toBe('20px')
    // Diferencias de posiciones con tolerancia de centésimas: Firefox ubica en subpíxeles
    // (16.000015 en vez de 16) según el ancho de la etiqueta.
    expect(ic.left - ind.left).toBeCloseTo(16, 2)
    expect(ic.top - ind.top).toBeCloseTo(8, 2)
    expect(lb.left - ic.right).toBeCloseTo(4, 2)
    expect(ind.right - lb.right).toBeCloseTo(16, 2)
    expect(ind.width).toBeCloseTo(16 + 24 + 4 + lb.width + 16, 0)
    expect((ind.top + ind.bottom) / 2).toBeCloseTo((rect(item).top + rect(item).bottom) / 2, 0)
    expect((lb.top + lb.bottom) / 2).toBeCloseTo((ic.top + ic.bottom) / 2, 0)
  })

  // Actualizada el 2026-11-27 (ADR-0029): antes pedía 48 de ancho aunque la barra desbordara; ahora
  // los destinos se reparten el ancho, como Compose, con 24 como mínimo (WCAG 2.5.8) y 48 de alto.
  test('el área táctil es todo el elemento: con muchos, se reparten el ancho sin desbordar (24 como mínimo, 48 de alto)', async () => {
    const c = await render(
      <div style={{ width: 200 }}>
        <NavigationBar>
          {['a', 'b', 'c', 'd', 'e'].map((n) => (
            <NavigationBarItem key={n} href={`#${n}`}>
              <NavigationBarItemIcon><HomeIcon /></NavigationBarItemIcon>
              <NavigationBarItemLabel>{n}</NavigationBarItemLabel>
            </NavigationBarItem>
          ))}
        </NavigationBar>
      </div>,
    )
    const nav = q(c, 'nav')
    for (const it of c.querySelectorAll('.mk-navigation-bar-item')) {
      expect(rect(it).width).toBeCloseTo(40, 0)
      expect(rect(it).width).toBeGreaterThanOrEqual(24)
      expect(rect(it).height).toBeGreaterThanOrEqual(48)
      expect(rect(it).right).toBeLessThanOrEqual(rect(nav).right + 0.5)
    }
  })

  test('una etiqueta larga se recorta con puntos suspensivos', async () => {
    const c = await render(
      <div style={{ width: 240 }}>
        <NavigationBar>
          {['Inicio', 'Una etiqueta demasiado larga', 'Buscar'].map((n) => (
            <NavigationBarItem key={n} href="#">
              <NavigationBarItemIcon><HomeIcon /></NavigationBarItemIcon>
              <NavigationBarItemLabel>{n}</NavigationBarItemLabel>
            </NavigationBarItem>
          ))}
        </NavigationBar>
      </div>,
    )
    const long = c.querySelectorAll('.mk-navigation-bar-item-label')[1] as HTMLElement
    expect(style(long).textOverflow).toBe('ellipsis')
    expect(long.scrollWidth).toBeGreaterThan(long.clientWidth)
    expect(rect(long).width).toBeLessThanOrEqual(80)
  })

  test('insignias: pequeña de 6 en la esquina del icono, grande de 16 desde 12 y 2 por encima', async () => {
    const c = await render(
      <NavigationBar>
        <NavigationBarItem href="#" className="s">
          <NavigationBarItemIcon><HomeIcon /></NavigationBarItemIcon>
          <NavigationBarItemLabel>S</NavigationBarItemLabel>
          <Badge label="Novedades" />
        </NavigationBarItem>
        <NavigationBarItem href="#" className="l">
          <NavigationBarItemIcon><HomeIcon /></NavigationBarItemIcon>
          <NavigationBarItemLabel>L</NavigationBarItemLabel>
          <Badge label="12 nuevos">12</Badge>
        </NavigationBarItem>
      </NavigationBar>,
    )
    const small = rect(q(c, '.s .mk-badge'))
    const si = rect(icon(q(c, '.s')))
    expect([small.width, small.height]).toEqual([6, 6])
    expect(small.right).toBe(si.right)
    expect(small.top).toBe(si.top)
    const large = rect(q(c, '.l .mk-badge'))
    const li = rect(icon(q(c, '.l')))
    expect(large.height).toBe(16)
    expect(large.left - li.left).toBe(12)
    expect(li.top - large.top).toBe(2)
  })
})

describe('NavigationBar: colores por estado', () => {
  test('sin activar: icono y etiqueta on-surface-variant, sin indicador visible', async () => {
    const c = await render(<Bar />)
    const item = q(c, '.home')
    expect(style(icon(item)).color).toBe(roleColor('on-surface-variant'))
    expect(style(label(item)).color).toBe(roleColor('on-surface-variant'))
    expect(rect(indicator(item)).width).toBe(0)
  })

  test('activo (vertical): indicador secondary-container, icono on-secondary-container, etiqueta secondary', async () => {
    const c = await render(<Bar />)
    const item = q(c, '.favs')
    expect(style(indicator(item)).backgroundColor).toBe(roleColor('secondary-container'))
    expect(style(icon(item)).color).toBe(roleColor('on-secondary-container'))
    expect(style(q(item, 'svg')).fill).toBe(roleColor('on-secondary-container'))
    expect(style(label(item)).color).toBe(roleColor('secondary'))
  })

  test('activo (horizontal): la etiqueta, dentro del indicador, en on-secondary-container', async () => {
    const c = await render(<Bar layout="horizontal" width={600} />)
    const item = q(c, '.favs')
    expect(style(label(item)).color).toBe(roleColor('on-secondary-container'))
    expect(style(icon(item)).color).toBe(roleColor('on-secondary-container'))
  })

  test('hover: capa on-surface al 8 % sobre el indicador', async () => {
    const c = await render(<Bar />)
    const item = q(c, '.home')
    await userEvent.hover(item)
    const layer = q(item, ':scope > .mk-state-layer')
    expect(style(layer).backgroundColor).toBe(roleColor('on-surface'))
    expect(style(layer).opacity).toBe('0.08')
    expect(rect(layer).width).toBe(56)
    expect(rect(layer).height).toBe(32)
  })

  test('presionado: capa al 10 % y onda dentro del indicador', async () => {
    const c = await render(<Bar />)
    const item = q(c, '.home')
    await commands.pressDown('.home')
    expect(style(q(item, ':scope > .mk-state-layer')).opacity).toBe('0.1')
    const ripple = q(item, ':scope > .mk-ripple')
    expect(ripple.querySelector('.mk-ripple-wave')).not.toBeNull()
    expect(rect(ripple).width).toBe(56)
    await commands.pressUp()
  })

  test('insignia en error con texto on-error', async () => {
    const c = await render(<Bar />)
    const badge = q(c, '.search .mk-badge')
    expect(style(badge).backgroundColor).toBe(roleColor('error'))
    expect(style(badge).color).toBe(roleColor('on-error'))
  })
})

describe('NavigationBar: movimiento', () => {
  test('el indicador crece a lo ancho con el resorte espacial por defecto', async () => {
    const c = await render(<Bar />)
    const t = withMotion(() => {
      const s = style(indicator(q(c, '.favs')))
      return { property: s.transitionProperty, easing: s.transitionTimingFunction, duration: s.transitionDuration }
    })
    expect(t.property).toBe('width')
    expect(t.easing).toMatch(/^linear\(/)
    expect(t.duration).toBe('0.44s')
  })

  test('con prefers-reduced-motion, el indicador aparece sin animar', async () => {
    await commands.reduceMotion(true)
    try {
      const c = await render(<Bar />)
      expect(withMotion(() => style(indicator(q(c, '.favs'))).transitionDuration)).toBe('0s')
    } finally {
      await commands.reduceMotion(false)
    }
  })
})

describe('NavigationBar: props nativas y ref', () => {
  test('ref, className, style y props nativas llegan al <nav>', async () => {
    const ref = createRef<HTMLElement>()
    const c = await render(
      <NavigationBar ref={ref} className="mia" style={{ marginTop: 3 }} id="nb" data-x="1">
        <NavigationBarItem href="#"><NavigationBarItemLabel>A</NavigationBarItemLabel></NavigationBarItem>
      </NavigationBar>,
    )
    const nav = q(c, 'nav')
    expect(ref.current).toBe(nav)
    expect(nav.className).toBe('mk-navigation-bar mia')
    expect(nav.style.marginTop).toBe('3px')
    expect(nav.id).toBe('nb')
    expect(nav.dataset['x']).toBe('1')
  })

  test('ref y props nativas llegan al <a> y al <button>', async () => {
    const aRef = createRef<HTMLAnchorElement>()
    const bRef = createRef<HTMLButtonElement>()
    let clicked = 0
    const c = await render(
      <NavigationBar>
        <NavigationBarItem ref={aRef} href="/x" target="_blank" rel="noopener" className="a" style={{ color: 'red' }} data-k="a">
          <NavigationBarItemLabel>A</NavigationBarItemLabel>
        </NavigationBarItem>
        <NavigationBarItem ref={bRef} className="b" name="dest" value="b" title="Bé" onClick={() => clicked++}>
          <NavigationBarItemLabel>B</NavigationBarItemLabel>
        </NavigationBarItem>
      </NavigationBar>,
    )
    const a = q(c, '.a') as HTMLAnchorElement
    expect(aRef.current).toBe(a)
    expect(a.target).toBe('_blank')
    expect(a.rel).toBe('noopener')
    expect(a.className).toBe('mk-navigation-bar-item a')
    expect(a.style.color).toBe('red')
    expect(a.dataset['k']).toBe('a')
    const b = q(c, '.b') as HTMLButtonElement
    expect(bRef.current).toBe(b)
    expect(b.name).toBe('dest')
    expect(b.value).toBe('b')
    expect(b.title).toBe('Bé')
    await userEvent.click(b)
    expect(clicked).toBe(1)
  })

  test('las partes reciben className y props', async () => {
    const c = await render(
      <NavigationBar>
        <NavigationBarItem href="#">
          <NavigationBarItemIcon className="i" data-p="i"><HomeIcon /></NavigationBarItemIcon>
          <NavigationBarItemLabel className="l" id="lbl">A</NavigationBarItemLabel>
        </NavigationBarItem>
      </NavigationBar>,
    )
    expect(q(c, '.i').className).toBe('mk-navigation-bar-item-icon i')
    expect(q(c, '.i').dataset['p']).toBe('i')
    expect(q(c, '.l').className).toBe('mk-navigation-bar-item-label l')
    expect(q(c, '.l').id).toBe('lbl')
  })
})
