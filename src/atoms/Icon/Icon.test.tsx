import { describe, expect, test } from 'vitest'
import { Icon } from './Icon.tsx'
import { Button } from '../../molecules/Button/Button.tsx'
import { AddIcon, ICONS, StarIcon } from '../../icons/index.ts'
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

  test('hay un componente por cada icono de la lista, con su trazo oficial', async () => {
    expect(ICONS.map((i) => i.name)).toEqual(names)
    for (const { name, component: Component } of ICONS) {
      const c = await render(<Component />)
      const d = c.querySelector('path')?.getAttribute('d')
      expect(d, name).toBe(paths.icons[name as keyof typeof paths.icons].outline)
      expect(c.querySelector('svg')?.getAttribute('viewBox')).toBe('0 -960 960 960')
    }
  })

  test('los que tienen versión rellena cambian de trazo con filled', async () => {
    const c = await render(
      <div>
        <StarIcon className="a" />
        <StarIcon className="b" filled />
      </div>,
    )
    expect(c.querySelector('.a path')?.getAttribute('d')).toBe(paths.icons.star.outline)
    expect(c.querySelector('.b path')?.getAttribute('d')).toBe(paths.icons.star.fill)
    expect(ICONS.filter((i) => i.fillable).map((i) => i.name)).toEqual(list.filled)
  })

  test('aceptan las props de Icon (label, size, className)', async () => {
    const c = await render(<AddIcon label="Agregar" size={40} className="mio" />)
    const icon = c.querySelector('.mk-icon')
    expect(icon?.getAttribute('aria-label')).toBe('Agregar')
    expect(icon?.className).toBe('mk-icon mio')
    expect(width(icon)).toBe(40)
  })
})
