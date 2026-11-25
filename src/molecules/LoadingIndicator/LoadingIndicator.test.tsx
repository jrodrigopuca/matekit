import { createRef } from 'react'
import { describe, expect, test } from 'vitest'
import { commands, page } from 'vitest/browser'
import { render, roleColor, style } from '../../test/render.tsx'
import { LoadingIndicator } from './LoadingIndicator.tsx'
import { MORPH_MS, TRANSITIONS } from './loading-indicator-data.ts'

const root = (c: HTMLElement) => c.querySelector('.mk-loading-indicator') as HTMLElement
const svg = (c: HTMLElement) => c.querySelector('svg') as SVGSVGElement
const rect = (el: Element) => el.getBoundingClientRect()
const shapes = (c: HTMLElement) => [...c.querySelectorAll<SVGPathElement>('.mk-loading-indicator-shape')]

/** Ángulo (grados, de 0 a 360) del transform animado de un grupo. */
function animatedAngle(g: SVGGElement): number {
  const list = g.transform.animVal
  let angle = 0
  for (let i = 0; i < list.numberOfItems; i++) angle += list.getItem(i).angle
  return ((angle % 360) + 360) % 360
}

/** Detiene el reloj de SMIL del indicador en `ms`. */
function freeze(c: HTMLElement, ms: number) {
  svg(c).pauseAnimations()
  svg(c).setCurrentTime(ms / 1000)
}

/** Índice del único contorno visible (falla si hay más de uno o ninguno). */
function visibleShape(c: HTMLElement): number {
  const visible = shapes(c).flatMap((p, i) => (style(p).visibility === 'visible' ? [i] : []))
  if (visible.length !== 1) throw new Error(`contornos visibles: ${visible.join(', ') || 'ninguno'}`)
  return visible[0]!
}

describe('LoadingIndicator', () => {
  test('indeterminado: progressbar con nombre y sin aria-valuenow', async () => {
    const c = await render(<LoadingIndicator label="Cargando mensajes" />)
    const bar = page.getByRole('progressbar')
    await expect.element(bar).toHaveAccessibleName('Cargando mensajes')
    const el = root(c)
    // WAI-ARIA, rol progressbar: si el valor es indeterminado, se omite aria-valuenow.
    expect(el.hasAttribute('aria-valuenow')).toBe(false)
    expect(el.hasAttribute('aria-valuemin')).toBe(false)
    expect(el.hasAttribute('aria-valuemax')).toBe(false)
    // El SVG es decoración.
    expect(svg(c).getAttribute('aria-hidden')).toBe('true')
  })

  test('determinado: aria-valuenow de 0 a 100, acotado', async () => {
    const c = await render(
      <div>
        <LoadingIndicator label="a" value={0.4} />
        <LoadingIndicator label="b" value={1.7} />
        <LoadingIndicator label="c" value={-1} />
        <LoadingIndicator label="d" value={Number.NaN} />
      </div>,
    )
    const bars = [...c.querySelectorAll('[role="progressbar"]')]
    expect(bars.map((b) => b.getAttribute('aria-valuenow'))).toEqual(['40', '100', '0', '0'])
    expect(bars[0]!.getAttribute('aria-valuemin')).toBe('0')
    expect(bars[0]!.getAttribute('aria-valuemax')).toBe('100')
    await expect.element(page.getByRole('progressbar', { name: 'a' })).toHaveAttribute('aria-valuenow', '40')
  })

  test('48 × 48; sin contenedor, la forma en primary sin fondo', async () => {
    const c = await render(<LoadingIndicator label="x" />)
    expect([rect(root(c)).width, rect(root(c)).height]).toEqual([48, 48])
    expect([rect(svg(c)).width, rect(svg(c)).height]).toEqual([48, 48])
    expect(style(root(c)).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(style(shapes(c)[0]!).fill).toBe(roleColor('primary'))
  })

  test('con contenedor: círculo primary-container y la forma en on-primary-container', async () => {
    const c = await render(<LoadingIndicator label="x" contained />)
    const el = root(c)
    expect([rect(el).width, rect(el).height]).toEqual([48, 48])
    expect(style(el).backgroundColor).toBe(roleColor('primary-container'))
    expect(style(el).borderRadius).toBe('9999px')
    expect(style(shapes(c)[0]!).fill).toBe(roleColor('on-primary-container'))
  })

  test('la forma ocupa el área de 38 del kit (entre 28 y 34 de ancho)', async () => {
    const c = await render(<LoadingIndicator label="x" />)
    freeze(c, 0)
    await expect.poll(() => visibleShape(c)).toBe(0)
    const box = rect(shapes(c)[0]!)
    expect(box.width).toBeGreaterThanOrEqual(28)
    expect(box.width).toBeLessThanOrEqual(34)
    // Centrada en el contenedor.
    const r = rect(root(c))
    expect(box.left + box.width / 2 - (r.left + r.width / 2)).toBeCloseTo(0, 0)
  })

  test('otro tamaño con width y height: la forma se escala', async () => {
    const c = await render(<LoadingIndicator label="x" style={{ width: 96, height: 96 }} />)
    freeze(c, 0)
    await expect.poll(() => visibleShape(c)).toBe(0)
    expect(rect(svg(c)).width).toBe(96)
    expect(rect(shapes(c)[0]!).width).toBeGreaterThan(56)
  })

  test('la animación está declarada: dos giros y, por transición, contorno y visibilidad', async () => {
    const c = await render(<LoadingIndicator label="x" />)
    const turns = [...c.querySelectorAll('animateTransform')]
    expect(turns.map((t) => t.getAttribute('repeatCount'))).toEqual(['indefinite', 'indefinite'])
    expect(turns[1]!.getAttribute('accumulate')).toBe('sum')
    expect(shapes(c)).toHaveLength(TRANSITIONS.length)
    for (const p of shapes(c)) {
      const [d, visibility] = [...p.querySelectorAll('animate')]
      expect(d!.getAttribute('attributeName')).toBe('d')
      expect(d!.getAttribute('calcMode')).toBe('spline')
      expect(visibility!.getAttribute('attributeName')).toBe('visibility')
    }
  })

  test('la animación avanza: cambia el contorno, se turnan las transiciones y gira', async () => {
    const c = await render(<LoadingIndicator label="x" />)
    const [outer, inner] = [...c.querySelectorAll<SVGGElement>('.mk-loading-indicator-motion, .mk-loading-indicator-motion > g')]

    // Al empezar: la primera transición, sin giro.
    freeze(c, 0)
    await expect.poll(() => svg(c).getCurrentTime()).toBe(0)
    await expect.poll(() => visibleShape(c)).toBe(0)
    const start = shapes(c)[0]!.getBBox()

    // A los 150 ms la forma ya cambió y giró, sin pasar a la transición siguiente.
    freeze(c, 150)
    await expect.poll(() => shapes(c)[0]!.getBBox().width).not.toBeCloseTo(start.width, 1)
    expect(visibleShape(c)).toBe(0)
    expect(animatedAngle(inner!)).toBeGreaterThan(10)

    // Terminado el resorte, se ve la transición siguiente, quieta, y el cambio giró 90°.
    freeze(c, 500)
    await expect.poll(() => visibleShape(c)).toBe(1)
    expect(animatedAngle(inner!)).toBeCloseTo(90, 0)

    // El giro de los cambios se suma (accumulate) y la vuelta continua avanza aparte.
    freeze(c, MORPH_MS * 3 + 500)
    await expect.poll(() => visibleShape(c)).toBe(4)
    expect(animatedAngle(inner!)).toBeCloseTo(0, 0) // 4 × 90° = 360°
    expect(animatedAngle(outer!)).toBeCloseTo((360 * (MORPH_MS * 3 + 500)) / 4666, 0)

    // Pasado el ciclo, vuelve a la primera.
    freeze(c, MORPH_MS * 7 + 500)
    await expect.poll(() => visibleShape(c)).toBe(1)
  })

  test('movimiento reducido: el indeterminado queda quieto en la primera forma', async () => {
    await commands.reduceMotion(true)
    try {
      const c = await render(<LoadingIndicator label="x" />)
      const motion = c.querySelector('.mk-loading-indicator-motion') as SVGGElement
      const still = c.querySelector('.mk-loading-indicator-still') as SVGPathElement
      await expect.poll(() => style(motion).display).toBe('none')
      expect(style(still).display).not.toBe('none')
      expect(still.getBBox().width).toBeGreaterThan(200)
      expect(style(still).fill).toBe(roleColor('primary'))
    } finally {
      await commands.reduceMotion(false)
    }
  })

  test('sin movimiento reducido, la forma quieta no se ve', async () => {
    const c = await render(<LoadingIndicator label="x" />)
    expect(style(c.querySelector('.mk-loading-indicator-still')!).display).toBe('none')
  })

  test('determinado: sin animación; la forma y el giro siguen a value', async () => {
    const c = await render(
      <div>
        <LoadingIndicator label="a" value={0} className="a" />
        <LoadingIndicator label="b" value={1} className="b" />
      </div>,
    )
    expect(c.querySelector('animate, animateTransform')).toBeNull()
    const a = c.querySelector('.a path') as SVGPathElement
    const b = c.querySelector('.b path') as SVGPathElement
    expect(a.getAttribute('transform')).toBe('rotate(0)')
    expect(b.getAttribute('transform')).toBe('rotate(-180)')
    // El círculo y el SoftBurst: contornos distintos, con la misma estructura (mismo Morph).
    expect(a.getAttribute('d')).not.toBe(b.getAttribute('d'))
    expect(a.getAttribute('d')!.match(/-?\d+/g)!.length).toBe(b.getAttribute('d')!.match(/-?\d+/g)!.length)
  })

  test('ref, className, style y props nativas llegan al <span>', async () => {
    const ref = createRef<HTMLSpanElement>()
    const c = await render(
      <LoadingIndicator ref={ref} label="x" className="mia" style={{ marginTop: 2 }} id="li1" aria-describedby="otro" />,
    )
    const el = root(c)
    expect(ref.current).toBe(el)
    expect(el.tagName).toBe('SPAN')
    expect(el.className).toBe('mk-loading-indicator mia')
    expect(el.style.marginTop).toBe('2px')
    expect(el.id).toBe('li1')
    expect(el.getAttribute('aria-describedby')).toBe('otro')
    expect(el.getAttribute('role')).toBe('progressbar')
  })
})
