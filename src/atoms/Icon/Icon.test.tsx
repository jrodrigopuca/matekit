import { describe, expect, test } from 'vitest'
import { Icon } from './Icon.tsx'
import { Button } from '../../molecules/Button/Button.tsx'
import { AddIcon, HomeIcon, ICONS, SearchIcon, StarIcon } from '../../icons/index.ts'
import paths from '../../../icons/material-symbols.json' with { type: 'json' }
import list from '../../../icons/icons.json' with { type: 'json' }
import { render, roleColor, style } from '../../test/render.tsx'

const svg = <svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" /></svg>
const width = (el: Element | null) => (el as HTMLElement).getBoundingClientRect().width

describe('Icon', () => {
  test('decorativo por defecto: oculto para lectores de pantalla', async () => {
    const c = await render(<Icon>{svg}</Icon>)
    const icon = c.querySelector('.mk-icon')
    expect(icon?.getAttribute('aria-hidden')).toBe('true')
    expect(icon?.hasAttribute('role')).toBe(false)
  })

  test('con label se anuncia como imagen', async () => {
    const c = await render(<Icon label="Favorito">{svg}</Icon>)
    const icon = c.querySelector('.mk-icon')
    expect(icon?.getAttribute('role')).toBe('img')
    expect(icon?.getAttribute('aria-label')).toBe('Favorito')
    expect(icon?.hasAttribute('aria-hidden')).toBe(false)
  })

  test('24 px por defecto, size en px o en otra medida, y el SVG lo llena', async () => {
    const c = await render(
      <div>
        <Icon className="a">{svg}</Icon>
        <Icon className="b" size={32}>{svg}</Icon>
        <Icon className="c" size="3rem">{svg}</Icon>
      </div>,
    )
    expect(width(c.querySelector('.a'))).toBe(24)
    expect(width(c.querySelector('.b'))).toBe(32)
    expect(width(c.querySelector('.c'))).toBe(48)
    expect(width(c.querySelector('.b svg'))).toBe(32)
  })

  test('toma el color del texto', async () => {
    const c = await render(<span style={{ color: 'rgb(1, 2, 3)' }}><Icon>{svg}</Icon></span>)
    expect(style(c.querySelector('svg')).fill).toBe('rgb(1, 2, 3)')
  })

  test('dentro de un Button toma el tamaño y el color del botón', async () => {
    const c = await render(
      <div>
        <Button size="xs"><AddIcon />Chico</Button>
        <Button size="xl"><AddIcon />Grande</Button>
      </div>,
    )
    const [xs, xl] = c.querySelectorAll('.mk-icon')
    expect(width(xs ?? null)).toBe(20)
    expect(width(xl ?? null)).toBe(40)
    expect(style(xs?.querySelector('svg') ?? null).fill).toBe(roleColor('on-primary'))
  })
})

describe('Iconos incluidos', () => {
  const names = Object.values(list.groups).flat()

  type Name = keyof typeof paths.icons
  const g0 = (c: ParentNode) => c.querySelector('.mk-icon-grade-0')
  const gn25 = (c: ParentNode) => c.querySelector('.mk-icon-grade-n25')

  test('hay un componente por cada icono de la lista, con sus trazos oficiales de grado 0 y -25', async () => {
    expect(ICONS.map((i) => i.name)).toEqual(names)
    for (const { name, component: Component } of ICONS) {
      const c = await render(<Component />)
      const p = paths.icons[name as Name]
      expect(g0(c)?.getAttribute('d'), `${name} grado 0`).toBe(p.outline)
      expect(gn25(c)?.getAttribute('d'), `${name} grado -25`).toBe(p.outlineN25)
      expect(c.querySelector('svg')?.getAttribute('viewBox')).toBe('0 -960 960 960')
    }
  })

  test('filled cambia al trazo relleno en los dos grados; fillable marca los que cambian', async () => {
    const c = await render(
      <div>
        <StarIcon className="a" />
        <StarIcon className="b" filled />
        <HomeIcon className="h" filled />
        <SearchIcon className="s" filled />
      </div>,
    )
    expect(g0(c.querySelector('.a')!)?.getAttribute('d')).toBe(paths.icons.star.outline)
    expect(g0(c.querySelector('.b')!)?.getAttribute('d')).toBe(paths.icons.star.fill)
    expect(gn25(c.querySelector('.b')!)?.getAttribute('d')).toBe(paths.icons.star.fillN25)
    expect(g0(c.querySelector('.h')!)?.getAttribute('d')).toBe(paths.icons.home.fill)
    // Búsqueda no tiene superficie que rellenar: el trazo relleno es el mismo.
    expect(g0(c.querySelector('.s')!)?.getAttribute('d')).toBe(paths.icons.search.outline)
    const distinct = names.filter((n) => paths.icons[n as Name].fill !== paths.icons[n as Name].outline)
    expect(ICONS.filter((i) => i.fillable).map((i) => i.name)).toEqual(distinct)
    expect(distinct.length).toBeGreaterThan(10)
  })

  test('grado 0 en tema claro y -25 en tema oscuro, también con data-theme anidado', async () => {
    const c = await render(
      <div style={{ color: 'rgb(10, 20, 30)' }}>
        <div data-theme="light" className="light"><HomeIcon /></div>
        <div data-theme="dark" className="dark">
          <HomeIcon />
          <div data-theme="light" className="nested"><HomeIcon /></div>
        </div>
      </div>,
    )
    const painted = (el: Element | null) => style(el).fill
    const light = c.querySelector('.light')!
    const dark = c.querySelector('.dark > .mk-icon')!.parentElement!
    const nested = c.querySelector('.nested')!
    expect(painted(g0(light))).toBe('rgb(10, 20, 30)')
    expect(painted(gn25(light))).toBe('rgba(0, 0, 0, 0)')
    expect(painted(g0(dark.querySelector(':scope > .mk-icon')!))).toBe('rgba(0, 0, 0, 0)')
    expect(painted(gn25(dark.querySelector(':scope > .mk-icon')!))).toBe('rgb(10, 20, 30)')
    expect(painted(g0(nested))).toBe('rgb(10, 20, 30)')
    expect(painted(gn25(nested))).toBe('rgba(0, 0, 0, 0)')
  })

  test('aceptan las props de Icon (label, size, className)', async () => {
    const c = await render(<AddIcon label="Agregar" size={40} className="mio" />)
    const icon = c.querySelector('.mk-icon')
    expect(icon?.getAttribute('aria-label')).toBe('Agregar')
    expect(icon?.className).toBe('mk-icon mio')
    expect(width(icon)).toBe(40)
  })
})
