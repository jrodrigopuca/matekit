import { createRef, useState, type AnchorHTMLAttributes, type ReactNode, type Ref } from 'react'
import { afterEach, describe, expect, test } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'
import { BookmarkIcon, EditIcon, HomeIcon, MenuIcon, SearchIcon, StarIcon } from '../../icons/icons.tsx'
import { Badge } from '../../molecules/Badge/Badge.tsx'
import { ExtendedFab } from '../../molecules/Fab/Fab.tsx'
import { IconButton } from '../../molecules/IconButton/IconButton.tsx'
import { render, roleColor, style, withMotion } from '../../test/render.tsx'
import {
  NavigationRail,
  NavigationRailHeader,
  NavigationRailItem,
  NavigationRailItemIcon,
  NavigationRailItemLabel,
  type NavigationRailProps,
} from './NavigationRail.tsx'

const q = (c: ParentNode, sel: string) => {
  const el = c.querySelector(sel)
  if (!el) throw new Error(`no se encontró ${sel}`)
  return el as HTMLElement
}
const rect = (el: Element) => el.getBoundingClientRect()
const indicator = (item: Element) => q(item, ':scope > .mk-navigation-rail-item-indicator')
const icon = (item: Element) => q(item, ':scope > .mk-navigation-rail-item-icon')
const label = (item: Element) => q(item, ':scope > .mk-navigation-rail-item-label')
/** Área del indicador, también en un destino inactivo (el indicador mide 0 de ancho ahí). */
const pill = (item: Element) => q(item, ':scope > .mk-state-layer')
const center = (r: DOMRect) => ({ x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 })
const px = (v: string) => Number.parseFloat(v)

interface RailProps extends Omit<NavigationRailProps, 'children'> {
  height?: number
  header?: boolean
  count?: number
}

/**
 * Rail con bloque superior (menú y FAB extendido con el mismo `expanded`) y hasta cuatro
 * destinos: el segundo activo, insignia pequeña en el primero y grande en el tercero.
 */
function Rail({ height = 800, header = true, count = 4, expanded, ...props }: RailProps) {
  const items = [
    { id: 'home', label: 'Inicio', Icon: HomeIcon, badge: <Badge label="Novedades" /> },
    { id: 'favs', label: 'Favoritos', Icon: StarIcon, active: true },
    { id: 'search', label: 'Buscar', Icon: SearchIcon, badge: <Badge label="12 resultados nuevos">12</Badge> },
    { id: 'saved', label: 'Guardados', Icon: BookmarkIcon },
  ].slice(0, count)
  return (
    <div style={{ height, display: 'flex' }}>
      <NavigationRail aria-label="Principal" expanded={expanded} {...props}>
        {header && (
          <NavigationRailHeader>
            <IconButton label="Menú" size="md" shape="square" aria-expanded={!!expanded} className="menu">
              <MenuIcon />
            </IconButton>
            <ExtendedFab expanded={!!expanded} className="fab"><EditIcon />Redactar</ExtendedFab>
          </NavigationRailHeader>
        )}
        {items.map(({ id, label: text, Icon, active, badge }) => (
          <NavigationRailItem key={id} href={`#${id}`} active={active} className={id}>
            <NavigationRailItemIcon><Icon filled={!!active} /></NavigationRailItemIcon>
            <NavigationRailItemLabel>{text}</NavigationRailItemLabel>
            {badge}
          </NavigationRailItem>
        ))}
      </NavigationRail>
    </div>
  )
}

describe('NavigationRail: estructura y accesibilidad', () => {
  test('es un <nav> con nombre y atributos de estado; cada destino es un enlace con su etiqueta como nombre', async () => {
    const c = await render(<Rail />)
    const nav = page.getByRole('navigation', { name: 'Principal' }).element() as HTMLElement
    expect(nav.tagName).toBe('NAV')
    expect(nav.className).toBe('mk-navigation-rail')
    expect(nav.dataset).toMatchObject({ expanded: 'false', variant: 'docked', align: 'top', collapsedLabels: 'visible' })
    for (const name of ['Inicio Novedades', 'Favoritos', 'Guardados']) {
      expect(page.getByRole('link', { name, exact: true }).element().tagName).toBe('A')
    }
    expect(q(c, '.mk-navigation-rail-header').tagName).toBe('DIV')
  })

  test('solo el activo lleva aria-current="page"', async () => {
    const c = await render(<Rail />)
    expect(q(c, '.favs').getAttribute('aria-current')).toBe('page')
    for (const id of ['.home', '.search', '.saved']) expect(q(c, id).hasAttribute('aria-current')).toBe(false)
  })

  for (const expanded of [false, true]) {
    test(`la insignia suma su texto al nombre, después de la etiqueta (${expanded ? 'expandido' : 'contraído'})`, async () => {
      const c = await render(<Rail expanded={expanded} />)
      expect(page.getByRole('link', { name: 'Buscar 12 resultados nuevos' }).element()).toBe(q(c, '.search'))
      expect(page.getByRole('link', { name: 'Inicio Novedades' }).element()).toBe(q(c, '.home'))
    })
  }

  test('el icono, el indicador y los átomos quedan ocultos para lectores de pantalla', async () => {
    const c = await render(<Rail />)
    const item = q(c, '.home')
    expect(icon(item).getAttribute('aria-hidden')).toBe('true')
    expect(indicator(item).getAttribute('aria-hidden')).toBe('true')
    expect(item.querySelectorAll(':scope > .mk-state-layer, :scope > .mk-ripple, :scope > .mk-focus-ring')).toHaveLength(3)
  })

  test('el botón de menú lo pone la aplicación, con aria-expanded', async () => {
    await render(<Rail />)
    expect(page.getByRole('button', { name: 'Menú' }).element().getAttribute('aria-expanded')).toBe('false')
    await render(<Rail expanded />)
    expect(page.getByRole('button', { name: 'Menú' }).element().getAttribute('aria-expanded')).toBe('true')
  })

  test('el FAB extendido contraído sigue teniendo su texto como nombre', async () => {
    await render(<Rail />)
    expect(page.getByRole('button', { name: 'Redactar' }).element().dataset['expanded']).toBe('false')
  })
})

/** Imita el Link de Next.js y de React Router: reparte el resto de las props sobre un <a>. */
interface FakeLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string
  prefetch?: boolean | undefined
  ref?: Ref<HTMLAnchorElement> | undefined
  children?: ReactNode
}
function FakeLink({ to, prefetch, ref, ...rest }: FakeLinkProps) {
  return <a {...rest} ref={ref} href={to} data-prefetch={String(prefetch ?? true)} />
}

describe('NavigationRail: href, <button> y render', () => {
  test('con href es un <a>; sin href, un <button type="button">', async () => {
    let clicks = 0
    const c = await render(
      <NavigationRail>
        <NavigationRailItem href="/a" className="a"><NavigationRailItemLabel>A</NavigationRailItemLabel></NavigationRailItem>
        <NavigationRailItem className="b" active onClick={() => clicks++}>
          <NavigationRailItemLabel>B</NavigationRailItemLabel>
        </NavigationRailItem>
      </NavigationRail>,
    )
    const a = q(c, '.a')
    expect(a.tagName).toBe('A')
    expect(a.getAttribute('href')).toBe('/a')
    const b = q(c, '.b') as HTMLButtonElement
    expect(b.tagName).toBe('BUTTON')
    expect(b.type).toBe('button')
    expect(b.getAttribute('aria-current')).toBe('page')
    await userEvent.click(b)
    expect(clicks).toBe(1)
  })

  test('render: el enlace recibe clases, aria-current, props, ref y las partes como hijos', async () => {
    const ref = createRef<HTMLElement>()
    const c = await render(
      <NavigationRail>
        <NavigationRailItem
          active
          ref={ref}
          id="r1"
          className="mio"
          render={<FakeLink to="/inicio" prefetch={false} className="propia" />}
        >
          <NavigationRailItemIcon><HomeIcon filled /></NavigationRailItemIcon>
          <NavigationRailItemLabel>Inicio</NavigationRailItemLabel>
        </NavigationRailItem>
      </NavigationRail>,
    )
    const a = q(c, 'a')
    expect(a.getAttribute('href')).toBe('/inicio')
    expect(a.dataset['prefetch']).toBe('false')
    expect(a.className).toBe('mk-navigation-rail-item mio propia')
    expect(a.getAttribute('aria-current')).toBe('page')
    expect(a.id).toBe('r1')
    expect(ref.current).toBe(a)
    expect(a.querySelector(':scope > .mk-navigation-rail-item-indicator')).not.toBeNull()
    expect(style(indicator(a)).width).toBe('56px')
    expect(page.getByRole('link', { name: 'Inicio' }).element()).toBe(a)
  })

  test('render con algo que no es un elemento falla con un mensaje claro', async () => {
    const bad = { render: 'x' } as unknown as { render: never }
    await expect(
      render(<NavigationRailItem {...bad}><NavigationRailItemLabel>X</NavigationRailItemLabel></NavigationRailItem>),
    ).rejects.toThrow(/NavigationRailItem espera en `render` un elemento/)
  })
})

describe('NavigationRail: teclado', () => {
  test('Tab recorre menú, FAB y destinos en orden; Enter sigue el enlace', async () => {
    const c = await render(<Rail />)
    await userEvent.tab()
    expect(document.activeElement).toBe(q(c, '.menu'))
    await userEvent.tab()
    expect(document.activeElement).toBe(q(c, '.fab'))
    await userEvent.tab()
    expect(document.activeElement).toBe(q(c, '.home'))
    await userEvent.tab()
    expect(document.activeElement).toBe(q(c, '.favs'))
    await userEvent.keyboard('{Enter}')
    expect(location.hash).toBe('#favs')
    history.replaceState(null, '', location.pathname + location.search)
  })

  test('el anillo de foco aparece con el teclado, sobre el indicador', async () => {
    const c = await render(<Rail header={false} expanded />)
    await userEvent.tab()
    const item = q(c, '.home')
    expect(document.activeElement).toBe(item)
    const ring = q(item, ':scope > .mk-focus-ring')
    expect(style(ring).opacity).toBe('1')
    expect(rect(ring).height).toBe(56)
    expect(rect(ring).left - rect(item).left).toBe(20)
    expect(rect(ring).right - rect(label(item)).right).toBeCloseTo(16, 2)
  })
})

describe('NavigationRail: medidas contraído (kit)', () => {
  test('96 de ancho, sin fondo, relleno 44 arriba; bloque de 56 + 4 + 56 a 20 del borde y 40 hasta los destinos', async () => {
    const c = await render(<Rail />)
    const nav = q(c, 'nav')
    const r = rect(nav)
    expect(r.width).toBe(96)
    expect(r.height).toBe(800)
    expect(style(nav).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    const menu = rect(q(c, '.menu'))
    const fab = rect(q(c, '.fab'))
    expect(menu.top - r.top).toBe(44)
    expect([menu.width, menu.height]).toEqual([56, 56])
    expect(menu.left - r.left).toBe(20)
    expect(style(q(c, '.menu')).borderRadius).toBe('16px')
    expect(fab.top - menu.bottom).toBe(4)
    expect([fab.width, fab.height]).toEqual([56, 56])
    expect(fab.left - r.left).toBe(20)
    expect(style(q(c, '.fab')).borderRadius).toBe('16px')
    expect(rect(q(c, '.home')).top - fab.bottom).toBe(40)
  })

  test('destinos de 96 × 64 separados 4; indicador 56 × 32 de radio 16 a 6 del borde superior', async () => {
    const c = await render(<Rail />)
    const nav = rect(q(c, 'nav'))
    const items = [...c.querySelectorAll('.mk-navigation-rail-item')]
    items.forEach((it, i) => {
      expect(rect(it).width).toBe(96)
      expect(rect(it).height).toBe(64)
      expect(rect(it).left).toBe(nav.left)
      if (i > 0) expect(rect(it).top - rect(items[i - 1] as Element).bottom).toBe(4)
    })
    const item = q(c, '.favs')
    const ind = rect(indicator(item))
    expect([ind.width, ind.height]).toEqual([56, 32])
    expect(ind.left - rect(item).left).toBe(20)
    expect(ind.top - rect(item).top).toBe(6)
    expect(style(indicator(item)).borderRadius).toBe('16px')
  })

  test('icono 24 a 16 y 4 del indicador; etiqueta Label Medium 4 debajo, centrada', async () => {
    const c = await render(<Rail />)
    const item = q(c, '.favs')
    const ind = rect(indicator(item))
    const ic = rect(icon(item))
    expect([ic.width, ic.height]).toEqual([24, 24])
    expect(ic.left - ind.left).toBe(16)
    expect(ic.top - ind.top).toBe(4)
    const lb = label(item)
    expect(rect(lb).top - ind.bottom).toBeCloseTo(4, 2)
    expect(rect(lb).height).toBe(16)
    expect(style(lb).fontSize).toBe('12px')
    expect(style(lb).fontWeight).toBe('500')
    expect(rect(item).bottom - rect(lb).bottom).toBeCloseTo(6, 2)
    // Medio píxel de tolerancia: WebKit resuelve el translate de −50 % en unidades de 1/64 px y
    // el centro queda corrido hasta 1/8 px según el ancho del texto (comprobado el 2026-11-25).
    expect(center(rect(lb)).x).toBeCloseTo(center(ind).x, 0)
    expect(style(lb).opacity).toBe('1')
  })

  test('una etiqueta larga se recorta en 88 con puntos suspensivos y queda dentro del rail', async () => {
    const c = await render(
      <NavigationRail style={{ height: 300 }}>
        <NavigationRailItem href="#">
          <NavigationRailItemIcon><HomeIcon /></NavigationRailItemIcon>
          <NavigationRailItemLabel>Una etiqueta demasiado larga</NavigationRailItemLabel>
        </NavigationRailItem>
      </NavigationRail>,
    )
    const lb = q(c, '.mk-navigation-rail-item-label')
    expect(rect(lb).width).toBe(88)
    expect(style(lb).textOverflow).toBe('ellipsis')
    expect(lb.scrollWidth).toBeGreaterThan(lb.clientWidth)
    expect(rect(lb).left - rect(q(c, 'nav')).left).toBeCloseTo(4, 1)
  })

  test('insignias sobre el icono: pequeña de 6 en su esquina, grande de 16 desde 12 y 2 por encima', async () => {
    const c = await render(<Rail />)
    const small = rect(q(c, '.home .mk-badge'))
    const si = rect(icon(q(c, '.home')))
    expect([small.width, small.height]).toEqual([6, 6])
    expect(small.right).toBe(si.right)
    expect(small.top).toBe(si.top)
    const large = rect(q(c, '.search .mk-badge'))
    const area = rect(pill(q(c, '.search')))
    expect(large.height).toBe(16)
    // Kit: x = 28, y = 2 dentro del indicador de 56 × 32.
    expect(large.left - area.left).toBe(28)
    expect(large.top - area.top).toBe(2)
  })
})

describe('NavigationRail: medidas expandido (kit y Compose)', () => {
  test('220 de ancho; docked sin fondo; relleno 44 arriba; FAB extendido a 20 del borde', async () => {
    const c = await render(<Rail expanded />)
    const nav = q(c, 'nav')
    expect(nav.dataset['expanded']).toBe('true')
    expect(rect(nav).width).toBe(220)
    expect(style(nav).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    const fab = rect(q(c, '.fab'))
    expect(fab.left - rect(nav).left).toBe(20)
    expect(fab.height).toBe(56)
    expect(fab.width).toBeGreaterThan(100)
    expect(rect(q(c, '.menu')).top - rect(nav).top).toBe(44)
    expect(rect(q(c, '.home')).top - fab.bottom).toBe(40)
  })

  test('floating expandido: surface-container y radio 16; contraído, sin fondo como el docked', async () => {
    const c = await render(<Rail expanded variant="floating" />)
    const nav = q(c, 'nav')
    expect(style(nav).backgroundColor).toBe(roleColor('surface-container'))
    expect(style(nav).borderRadius).toBe('16px')
    expect(style(nav).boxShadow).toBe('none')
    const d = await render(<Rail variant="floating" />)
    expect(style(q(d, 'nav')).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(rect(q(d, 'nav')).width).toBe(96)
  })

  test('destino horizontal: 56 de alto, radio 28, a 20 del borde, 16 + icono 24 + 8 + etiqueta + 16, sin separación', async () => {
    const c = await render(<Rail expanded />)
    const nav = rect(q(c, 'nav'))
    const items = [...c.querySelectorAll('.mk-navigation-rail-item')]
    items.forEach((it, i) => {
      expect(rect(it).height).toBe(56)
      if (i > 0) expect(rect(it).top).toBeCloseTo(rect(items[i - 1] as Element).bottom, 2)
    })
    const item = q(c, '.favs')
    const ind = rect(indicator(item))
    const ic = rect(icon(item))
    const lb = rect(label(item))
    expect(ind.height).toBe(56)
    expect(style(indicator(item)).borderRadius).toBe('28px')
    expect(ind.left - nav.left).toBe(20)
    expect(ic.left - ind.left).toBeCloseTo(16, 2)
    expect(ic.top - ind.top).toBeCloseTo(16, 2)
    expect(lb.left - ic.right).toBeCloseTo(8, 2)
    expect(ind.right - lb.right).toBeCloseTo(16, 2)
    expect(center(lb).y).toBeCloseTo(center(ic).y, 1)
    expect(style(label(item)).fontSize).toBe('14px')
    expect(style(label(item)).lineHeight).toBe('20px')
    expect(style(label(item)).fontWeight).toBe('500')
  })

  test('insignia grande en línea, 8 después de la etiqueta y dentro del indicador; la pequeña sigue en el icono', async () => {
    const c = await render(<Rail expanded />)
    const item = q(c, '.search')
    const badge = rect(q(item, '.mk-badge'))
    const lb = rect(label(item))
    const ind = rect(pill(item))
    expect(badge.left - lb.right).toBeCloseTo(8, 2)
    expect(ind.right - badge.right).toBeCloseTo(16, 2)
    expect(center(badge).y).toBeCloseTo(center(lb).y, 1)
    const small = rect(q(c, '.home .mk-badge'))
    const si = rect(icon(q(c, '.home')))
    expect(small.right).toBeCloseTo(si.right, 2)
    expect(small.top).toBeCloseTo(si.top, 2)
  })

  test('sin icono, la etiqueta empieza a 16 del borde del indicador', async () => {
    const c = await render(
      <NavigationRail expanded style={{ height: 300 }}>
        <NavigationRailItem href="#" active>
          <NavigationRailItemLabel>Solo texto</NavigationRailItemLabel>
        </NavigationRailItem>
      </NavigationRail>,
    )
    const item = q(c, '.mk-navigation-rail-item')
    expect(rect(label(item)).left - rect(indicator(item)).left).toBeCloseTo(16, 2)
    expect(rect(indicator(item)).right - rect(label(item)).right).toBeCloseTo(16, 2)
  })

  test('el ancho expandido se ajusta con --mk-navigation-rail-expanded-width, entre 220 y 360 (Compose)', async () => {
    for (const [value, expected] of [['300px', 300], ['500px', 360], ['100px', 220]] as const) {
      const c = await render(<Rail expanded header={false} style={{ ['--mk-navigation-rail-expanded-width' as string]: value }} />)
      expect(rect(q(c, 'nav')).width).toBe(expected)
    }
  })

  test('una etiqueta larga se recorta dentro del indicador, que no pasa de 20 del borde derecho', async () => {
    const c = await render(
      <NavigationRail expanded style={{ height: 300 }}>
        <NavigationRailItem href="#" active>
          <NavigationRailItemIcon><HomeIcon /></NavigationRailItemIcon>
          <NavigationRailItemLabel>Una etiqueta bastante más larga que el rail</NavigationRailItemLabel>
        </NavigationRailItem>
      </NavigationRail>,
    )
    const item = q(c, '.mk-navigation-rail-item')
    const nav = rect(q(c, 'nav'))
    expect(nav.right - rect(indicator(item)).right).toBeCloseTo(20, 1)
    const lb = label(item)
    expect(lb.scrollWidth).toBeGreaterThan(lb.clientWidth)
    expect(rect(indicator(item)).right - rect(lb).right).toBeCloseTo(16, 1)
  })
})

describe('NavigationRail: alineación', () => {
  test('top: los destinos empiezan en 44 sin bloque superior', async () => {
    const c = await render(<Rail header={false} />)
    expect(rect(q(c, '.home')).top - rect(q(c, 'nav')).top).toBe(44)
  })

  test('middle expandido: el bloque arriba y los destinos centrados en el alto total (kit: 288 en 800)', async () => {
    const c = await render(<Rail expanded align="middle" />)
    const nav = rect(q(c, 'nav'))
    expect(rect(q(c, '.menu')).top - nav.top).toBe(44)
    expect(rect(q(c, '.home')).top - nav.top).toBeCloseTo(288, 1)
    expect(nav.bottom - rect(q(c, '.saved')).bottom).toBeCloseTo(288, 1)
  })

  test('middle contraído: los destinos centrados en el alto total, el bloque arriba', async () => {
    const c = await render(<Rail align="middle" />)
    const nav = rect(q(c, 'nav'))
    // 4 × 64 + 3 × 4 = 268.
    expect(rect(q(c, '.menu')).top - nav.top).toBe(44)
    expect(rect(q(c, '.home')).top - nav.top).toBeCloseTo((800 - 268) / 2, 1)
  })

  test('middle sin bloque superior: también centrados en el alto total', async () => {
    const c = await render(<Rail align="middle" header={false} expanded />)
    const nav = rect(q(c, 'nav'))
    expect(rect(q(c, '.home')).top - nav.top).toBeCloseTo(288, 1)
  })

  test('middle sin lugar: los destinos bajan y no tapan el bloque', async () => {
    const c = await render(<Rail align="middle" height={480} />)
    const nav = rect(q(c, 'nav'))
    expect(rect(q(c, '.home')).top - rect(q(c, '.fab')).bottom).toBeGreaterThanOrEqual(40)
    expect(rect(q(c, '.home')).top - nav.top).toBeCloseTo(44 + 116 + 40, 1)
  })
})

describe('NavigationRail: etiquetas ocultas en el contraído', () => {
  test('indicador 56 × 56 de radio 28 con el icono centrado y 4 de relleno; la etiqueta no se ve pero es el nombre', async () => {
    const c = await render(<Rail collapsedLabels="hidden" />)
    expect(q(c, 'nav').dataset['collapsedLabels']).toBe('hidden')
    const item = q(c, '.favs')
    const ind = rect(indicator(item))
    expect([ind.width, ind.height]).toEqual([56, 56])
    expect(style(indicator(item)).borderRadius).toBe('28px')
    expect(ind.top - rect(item).top).toBe(4)
    expect(rect(item).height).toBe(64)
    expect(center(rect(icon(item))).x).toBeCloseTo(center(ind).x, 2)
    expect(center(rect(icon(item))).y).toBeCloseTo(center(ind).y, 2)
    expect(style(label(item)).opacity).toBe('0')
    await expect.element(page.getByRole('link', { name: 'Favoritos', exact: true })).toBeInTheDocument()
    expect(page.getByRole('link', { name: 'Buscar 12 resultados nuevos' }).element()).toBe(q(c, '.search'))
  })

  test('expandido, las etiquetas se ven igual', async () => {
    const c = await render(<Rail collapsedLabels="hidden" expanded />)
    const item = q(c, '.favs')
    expect(style(label(item)).opacity).toBe('1')
    expect(rect(item).height).toBe(56)
    expect(rect(label(item)).left - rect(icon(item)).right).toBeCloseTo(8, 2)
  })
})

describe('NavigationRail: colores por estado', () => {
  test('sin activar: icono y etiqueta on-surface-variant, sin indicador visible', async () => {
    const c = await render(<Rail />)
    const item = q(c, '.home')
    expect(style(icon(item)).color).toBe(roleColor('on-surface-variant'))
    expect(style(label(item)).color).toBe(roleColor('on-surface-variant'))
    expect(rect(indicator(item)).width).toBe(0)
  })

  test('activo contraído: indicador secondary-container, icono on-secondary-container, etiqueta secondary', async () => {
    const c = await render(<Rail />)
    const item = q(c, '.favs')
    expect(style(indicator(item)).backgroundColor).toBe(roleColor('secondary-container'))
    expect(style(icon(item)).color).toBe(roleColor('on-secondary-container'))
    expect(style(label(item)).color).toBe(roleColor('secondary'))
  })

  test('activo expandido: etiqueta e icono on-secondary-container dentro del indicador', async () => {
    const c = await render(<Rail expanded />)
    const item = q(c, '.favs')
    expect(style(indicator(item)).backgroundColor).toBe(roleColor('secondary-container'))
    expect(style(label(item)).color).toBe(roleColor('on-secondary-container'))
    expect(style(icon(item)).color).toBe(roleColor('on-secondary-container'))
    expect(style(label(q(c, '.home'))).color).toBe(roleColor('on-surface-variant'))
  })

  test('el activo usa el icono relleno; el trazo de cada grado conserva el color de icon.css', async () => {
    const filled = await render(<StarIcon filled />)
    const filledPath = q(filled, '.mk-icon-grade-0').getAttribute('d')
    const d = await render(<Rail />)
    const active = q(d, '.favs .mk-icon-grade-0')
    expect(active.getAttribute('d')).toBe(filledPath)
    // Tema claro: el trazo de grado 0 se pinta con el color del icono y el de -25 queda transparente.
    expect(style(active).fill).toBe(roleColor('on-secondary-container'))
    expect(style(q(d, '.favs .mk-icon-grade-n25')).fill).toBe('rgba(0, 0, 0, 0)')
  })

  for (const expanded of [false, true]) {
    test(`hover: capa on-surface al 8 % sobre el indicador (${expanded ? 'expandido' : 'contraído'})`, async () => {
      const c = await render(<Rail expanded={expanded} />)
      const item = q(c, '.home')
      await userEvent.hover(item)
      const layer = q(item, ':scope > .mk-state-layer')
      expect(style(layer).backgroundColor).toBe(roleColor('on-surface'))
      expect(style(layer).opacity).toBe('0.08')
      expect(rect(layer).height).toBe(expanded ? 56 : 32)
      expect(rect(layer).left - rect(item).left).toBe(20)
      if (expanded) expect(rect(layer).right - rect(label(item)).right).toBeCloseTo(16, 2)
      else expect(rect(layer).width).toBe(56)
    })
  }

  test('presionado: capa al 10 % y onda dentro del indicador', async () => {
    const c = await render(<Rail />)
    const item = q(c, '.home')
    await commands.pressDown('.home')
    expect(style(q(item, ':scope > .mk-state-layer')).opacity).toBe('0.1')
    const ripple = q(item, ':scope > .mk-ripple')
    expect(ripple.querySelector('.mk-ripple-wave')).not.toBeNull()
    expect(rect(ripple).width).toBe(56)
    await commands.pressUp()
  })

  test('insignia en error con texto on-error', async () => {
    const c = await render(<Rail expanded />)
    const badge = q(c, '.search .mk-badge')
    expect(style(badge).backgroundColor).toBe(roleColor('error'))
    expect(style(badge).color).toBe(roleColor('on-error'))
  })
})

describe('NavigationRail: transición entre contraído y expandido', () => {
  const noMotion = () => document.getElementById('mk-test-no-motion') as HTMLStyleElement
  afterEach(async () => {
    noMotion().media = ''
    await commands.reduceMotion(false)
  })

  /** Rail con el botón de menú que lo alterna, como en una aplicación. */
  function Toggle(props: { collapsedLabels?: 'visible' | 'hidden' }) {
    const [expanded, setExpanded] = useState(false)
    return (
      <div style={{ height: 600, display: 'flex' }}>
        <NavigationRail expanded={expanded} aria-label="Principal" {...props}>
          <NavigationRailHeader>
            <IconButton label="Menú" size="md" shape="square" aria-expanded={expanded} className="menu" onClick={() => setExpanded(!expanded)}>
              <MenuIcon />
            </IconButton>
          </NavigationRailHeader>
          <NavigationRailItem href="#" active className="favs">
            <NavigationRailItemIcon><StarIcon filled /></NavigationRailItemIcon>
            <NavigationRailItemLabel>Favoritos</NavigationRailItemLabel>
          </NavigationRailItem>
        </NavigationRail>
      </div>
    )
  }

  test('anima el ancho del rail y el destino pasa de vertical a horizontal, hasta los valores finales', async () => {
    const c = await render(<Toggle />)
    const nav = q(c, 'nav')
    const item = q(c, '.favs')
    noMotion().media = 'not all'

    await userEvent.click(q(c, '.menu'))
    expect(q(c, '.menu').getAttribute('aria-expanded')).toBe('true')
    // Recién empezada, la animación todavía no llegó al final.
    expect(rect(nav).width).toBeLessThan(219)
    await expect.poll(() => rect(nav).width, { timeout: 3000 }).toBeCloseTo(220, 1)
    await expect.poll(() => rect(indicator(item)).height, { timeout: 3000 }).toBeCloseTo(56, 1)
    await expect.poll(() => rect(label(item)).left - rect(icon(item)).right, { timeout: 3000 }).toBeCloseTo(8, 1)
    await expect.poll(() => style(label(item)).color, { timeout: 3000 }).toBe(roleColor('on-secondary-container'))

    await userEvent.click(q(c, '.menu'))
    expect(rect(nav).width).toBeGreaterThan(97)
    await expect.poll(() => rect(nav).width, { timeout: 3000 }).toBeCloseTo(96, 1)
    await expect.poll(() => rect(indicator(item)).height, { timeout: 3000 }).toBeCloseTo(32, 1)
    await expect.poll(() => rect(label(item)).top - rect(indicator(item)).bottom, { timeout: 3000 }).toBeCloseTo(4, 1)
    await expect.poll(() => style(label(item)).color, { timeout: 3000 }).toBe(roleColor('secondary'))
  })

  test('la transición pasa por valores intermedios (ancho y altura del indicador)', async () => {
    const c = await render(<Toggle />)
    const nav = q(c, 'nav')
    const item = q(c, '.favs')
    noMotion().media = 'not all'
    await userEvent.click(q(c, '.menu'))
    await expect.poll(() => rect(nav).width, { timeout: 3000 }).toSatisfy((w: number) => w > 100 && w < 216)
    await expect.poll(() => rect(indicator(item)).height, { timeout: 3000 }).toSatisfy((h: number) => h > 33 && h < 55)
  })

  test('con etiquetas ocultas, al expandir la etiqueta aparece (opacidad)', async () => {
    const c = await render(<Toggle collapsedLabels="hidden" />)
    const item = q(c, '.favs')
    noMotion().media = 'not all'
    expect(style(label(item)).opacity).toBe('0')
    await userEvent.click(q(c, '.menu'))
    await expect.poll(() => style(label(item)).opacity, { timeout: 3000 }).toBe('1')
  })

  test('anima con el resorte espacial por defecto (ancho, grilla y etiqueta) y los colores con el de efectos', async () => {
    const c = await render(<Toggle />)
    const nav = q(c, 'nav')
    const item = q(c, '.favs')
    const t = withMotion(() => ({
      nav: [style(nav).transitionProperty, style(nav).transitionDuration, style(nav).transitionTimingFunction],
      item: [style(item).transitionProperty, style(item).transitionDuration],
      label: [style(label(item)).transitionProperty, style(label(item)).transitionDuration],
    }))
    const token = (name: string) => px(style(nav).getPropertyValue(`--md-sys-motion-spring-${name}-duration`)) / 1000
    const spatial = token('default-spatial')
    const effects = token('default-effects')
    expect(t.nav[0]).toContain('width')
    expect(t.nav[2]).toContain('linear(')
    const durationOf = (props: string, durations: string, name: string) => {
      const list = props.split(', ')
      const ds = durations.split(', ')
      return px(ds[list.indexOf(name) % ds.length] ?? '')
    }
    expect(durationOf(t.nav[0] ?? '', t.nav[1] ?? '', 'width')).toBeCloseTo(spatial, 3)
    expect(durationOf(t.item[0] ?? '', t.item[1] ?? '', 'grid-template-columns')).toBeCloseTo(spatial, 3)
    expect(durationOf(t.item[0] ?? '', t.item[1] ?? '', 'grid-template-rows')).toBeCloseTo(spatial, 3)
    expect(durationOf(t.item[0] ?? '', t.item[1] ?? '', 'color')).toBeCloseTo(effects, 3)
    expect(durationOf(t.label[0] ?? '', t.label[1] ?? '', 'translate')).toBeCloseTo(spatial, 3)
  })

  test('con prefers-reduced-motion, el cambio es inmediato', async () => {
    await commands.reduceMotion(true)
    const c = await render(<Toggle />)
    const nav = q(c, 'nav')
    const item = q(c, '.favs')
    noMotion().media = 'not all'
    expect(style(nav).transitionDuration).toMatch(/^0s/)
    await userEvent.click(q(c, '.menu'))
    await expect.poll(() => rect(nav).width, { timeout: 500 }).toBe(220)
    await expect.poll(() => rect(indicator(item)).height, { timeout: 500 }).toBe(56)
  })
})

describe('NavigationRail: derecha a izquierda', () => {
  test('la etiqueta contraída queda centrada debajo del indicador también en RTL', async () => {
    const c = await render(
      <div dir="rtl" style={{ height: 300, display: 'flex' }}>
        <NavigationRail>
          <NavigationRailItem href="#" active>
            <NavigationRailItemIcon><HomeIcon /></NavigationRailItemIcon>
            <NavigationRailItemLabel>Inicio</NavigationRailItemLabel>
          </NavigationRailItem>
        </NavigationRail>
      </div>,
    )
    const item = q(c, '.mk-navigation-rail-item')
    // Medio píxel de tolerancia por el redondeo de WebKit (ver la prueba del contraído).
    expect(center(rect(label(item))).x).toBeCloseTo(center(rect(indicator(item))).x, 0)
    expect(rect(q(c, 'nav')).right - rect(indicator(item)).right).toBe(20)
  })
})

describe('NavigationRail: props nativas y ref', () => {
  test('ref, className, style y props nativas llegan al <nav>', async () => {
    const ref = createRef<HTMLElement>()
    const c = await render(
      <NavigationRail ref={ref} className="mia" style={{ marginTop: 3 }} id="nr" data-x="1">
        <NavigationRailItem href="#"><NavigationRailItemLabel>A</NavigationRailItemLabel></NavigationRailItem>
      </NavigationRail>,
    )
    const nav = q(c, 'nav')
    expect(ref.current).toBe(nav)
    expect(nav.className).toBe('mk-navigation-rail mia')
    expect(nav.style.marginTop).toBe('3px')
    expect(nav.id).toBe('nr')
    expect(nav.dataset['x']).toBe('1')
  })

  test('ref y props nativas llegan al <a>, al <button> y al bloque superior', async () => {
    const aRef = createRef<HTMLAnchorElement>()
    const bRef = createRef<HTMLButtonElement>()
    const hRef = createRef<HTMLDivElement>()
    const c = await render(
      <NavigationRail>
        <NavigationRailHeader ref={hRef} className="h" data-h="1" />
        <NavigationRailItem ref={aRef} href="/x" target="_blank" className="a" data-k="a">
          <NavigationRailItemLabel>A</NavigationRailItemLabel>
        </NavigationRailItem>
        <NavigationRailItem ref={bRef} className="b" name="dest" value="b" title="Bé">
          <NavigationRailItemLabel>B</NavigationRailItemLabel>
        </NavigationRailItem>
      </NavigationRail>,
    )
    expect(hRef.current).toBe(q(c, '.h'))
    expect(q(c, '.h').className).toBe('mk-navigation-rail-header h')
    expect(q(c, '.h').dataset['h']).toBe('1')
    const a = q(c, '.a') as HTMLAnchorElement
    expect(aRef.current).toBe(a)
    expect(a.target).toBe('_blank')
    expect(a.className).toBe('mk-navigation-rail-item a')
    expect(a.dataset['k']).toBe('a')
    const b = q(c, '.b') as HTMLButtonElement
    expect(bRef.current).toBe(b)
    expect([b.name, b.value, b.title]).toEqual(['dest', 'b', 'Bé'])
  })

  test('las partes reciben className y props', async () => {
    const c = await render(
      <NavigationRail>
        <NavigationRailItem href="#">
          <NavigationRailItemIcon className="i" data-p="i"><HomeIcon /></NavigationRailItemIcon>
          <NavigationRailItemLabel className="l" id="lbl">A</NavigationRailItemLabel>
        </NavigationRailItem>
      </NavigationRail>,
    )
    expect(q(c, '.i').className).toBe('mk-navigation-rail-item-icon i')
    expect(q(c, '.i').dataset['p']).toBe('i')
    expect(q(c, '.l').className).toBe('mk-navigation-rail-item-label l')
    expect(q(c, '.l').id).toBe('lbl')
  })
})
