import { describe, expect, test } from 'vitest'
import { createRef } from 'react'
import { Shape } from './Shape.tsx'
import { SHAPES } from './shapes.ts'
import { StarIcon } from '../../icons/index.ts'
import { render, style } from '../../test/render.tsx'
import { near, pixelsOf } from '../../test/pixels.ts'

// Colores de prueba bien distintos: el contenido (rojo) sobre un fondo de página (azul). Donde
// la máscara recorta, la captura muestra el fondo.
const RED = [255, 0, 0]
const BLUE = [0, 0, 255]
const backdrop = { background: 'rgb(0, 0, 255)', display: 'inline-block', lineHeight: 0 } as const

describe('Shape', () => {
  test('recorta el contenido: la esquina de un circle queda afuera y el centro adentro', async () => {
    const c = await render(
      <div className="stage" style={backdrop}>
        <Shape shape="circle" style={{ width: 100, height: 100, background: 'rgb(255, 0, 0)' }} />
      </div>,
    )
    const px = await pixelsOf(c.querySelector('.stage') as HTMLElement)
    expect(near(px.at(50, 50), RED)).toBe(true)
    for (const [x, y] of [[3, 3], [96, 3], [3, 96], [96, 96]] as const) {
      expect(near(px.at(x, y), BLUE), `esquina ${x},${y}: ${px.at(x, y)}`).toBe(true)
    }
    // Los puntos del borde, justo adentro, siguen viéndose.
    expect(near(px.at(97, 50), RED)).toBe(true)
    expect(near(px.at(50, 4), RED)).toBe(true)
  })

  test('recorta una imagen que la llena', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 8
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgb(255, 0, 0)'
    ctx.fillRect(0, 0, 8, 8)
    const src = canvas.toDataURL()
    const c = await render(
      <div className="stage" style={backdrop}>
        <Shape shape="cookie-4-sided" style={{ width: 120, height: 120 }}>
          <img src={src} alt="" />
        </Shape>
      </div>,
    )
    await (c.querySelector('img') as HTMLImageElement).decode()
    expect((c.querySelector('img') as HTMLElement).getBoundingClientRect().width).toBe(120)
    const px = await pixelsOf(c.querySelector('.stage') as HTMLElement)
    expect(near(px.at(60, 60), RED)).toBe(true)
    // cookie-4-sided: las puntas en las diagonales, hendiduras en los lados.
    expect(near(px.at(60, 4), BLUE), `lado: ${px.at(60, 4)}`).toBe(true)
    expect(near(px.at(20, 20), RED), `punta: ${px.at(20, 20)}`).toBe(true)
  })

  test('se adapta al tamaño: en un rectángulo, la forma se estira', async () => {
    const c = await render(
      <div className="stage" style={backdrop}>
        <Shape shape="circle" style={{ width: 200, height: 100, background: 'rgb(255, 0, 0)' }} />
      </div>,
    )
    const shape = c.querySelector('.mk-shape') as HTMLElement
    expect(style(shape).maskSize).toBe('100% 100%')
    const px = await pixelsOf(c.querySelector('.stage') as HTMLElement)
    // Estirado, el óvalo llega cerca de los lados cortos; sin estirar (un círculo de 100
    // centrado), x = 6 quedaría afuera.
    expect(near(px.at(6, 50), RED), `${px.at(6, 50)}`).toBe(true)
    expect(near(px.at(194, 50), RED), `${px.at(194, 50)}`).toBe(true)
    expect(near(px.at(100, 50), RED)).toBe(true)
    expect(near(px.at(8, 8), BLUE)).toBe(true)
    expect(near(px.at(192, 92), BLUE)).toBe(true)
  })

  test('cada una de las 35 formas tiene su máscara', async () => {
    const c = await render(
      <div>
        {SHAPES.map((s) => (
          <Shape key={s.name} shape={s.name} style={{ width: 24, height: 24 }} />
        ))}
      </div>,
    )
    const masks = [...c.querySelectorAll('.mk-shape')].map((el) => style(el).maskImage)
    expect(masks).toHaveLength(35)
    for (const [i, mask] of masks.entries()) {
      expect(mask, SHAPES[i]!.name).toContain('data:image/svg+xml')
    }
    expect(new Set(masks).size).toBe(35)
  })

  test('centra el contenido, por ejemplo un icono sobre un fondo', async () => {
    const c = await render(
      <Shape shape="sunny" style={{ width: 80, height: 80 }}>
        <StarIcon />
      </Shape>,
    )
    const box = (c.querySelector('.mk-shape') as HTMLElement).getBoundingClientRect()
    const icon = (c.querySelector('.mk-icon') as HTMLElement).getBoundingClientRect()
    expect(icon.left - box.left).toBeCloseTo(28, 2)
    expect(icon.top - box.top).toBeCloseTo(28, 2)
  })

  test('props nativas y ref llegan al <div>', async () => {
    const ref = createRef<HTMLDivElement>()
    const c = await render(
      <Shape shape="heart" ref={ref} id="avatar" className="mio" title="Ana" data-x="1" role="img" aria-label="Ana">
        hola
      </Shape>,
    )
    const el = c.querySelector('#avatar') as HTMLElement
    expect(ref.current).toBe(el)
    expect(el.tagName).toBe('DIV')
    expect(el.className).toBe('mk-shape mio')
    expect(el.dataset['shape']).toBe('heart')
    expect(el.dataset['x']).toBe('1')
    expect(el.title).toBe('Ana')
    expect(el.getAttribute('role')).toBe('img')
    expect(el.getAttribute('aria-label')).toBe('Ana')
    expect(el.textContent).toBe('hola')
  })
})
