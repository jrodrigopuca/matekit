import { createRef } from 'react'
import { describe, expect, test } from 'vitest'
import { commands, page } from 'vitest/browser'
import { render, roleColor, style, withMotion } from '../../test/render.tsx'
import { near, pixelsOf } from '../../test/pixels.ts'
import { CircularProgressIndicator } from './CircularProgressIndicator.tsx'
import { FLAT_PATH, TRACK_LENGTH, TRACK_PATH, WAVE_PATH } from './circular-wavy-data.ts'
import { CIRCULAR_FLAT_LENGTH } from './progress.ts'

const root = (c: HTMLElement) => c.querySelector('.mk-circular-progress-indicator') as HTMLElement
const track = (c: HTMLElement) => c.querySelector('.mk-circular-progress-indicator-track') as SVGPathElement
const active = (c: HTMLElement) => c.querySelector('.mk-circular-progress-indicator-active') as SVGPathElement
const rect = (el: Element) => el.getBoundingClientRect()
const rgb = (css: string) => css.match(/[\d.]+/g)!.slice(0, 3).map(Number)
const numbers = (css: string) => css.match(/-?[\d.]+/g)!.map(Number)
const names = (el: Element) => el.getAnimations().map((a) => (a as CSSAnimation).animationName)

/** Congela todas las animaciones CSS del indicador (y de sus hijos) en `ms`. */
function freeze(el: Element, ms: number) {
  for (const a of el.getAnimations({ subtree: true })) {
    a.pause()
    a.currentTime = ms
  }
}

/** Punto a `radius` del centro de un indicador de `size`, a `deg` grados en sentido horario desde las 12. */
function at(size: number, radius: number, deg: number): [number, number] {
  const r = (deg * Math.PI) / 180
  return [size / 2 + radius * Math.sin(r), size / 2 - radius * Math.cos(r)]
}

/** cubic-bezier(x1, y1, x2, y2) en `t`. */
function bezier(x1: number, y1: number, x2: number, y2: number, t: number): number {
  const f = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3
  let lo = 0
  let hi = 1
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (f(x1, x2, mid) < t) lo = mid
    else hi = mid
  }
  return f(y1, y2, (lo + hi) / 2)
}

const Surface = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: 'var(--md-sys-color-surface)', display: 'flex', gap: 8, padding: 8 }}>{children}</div>
)

describe('CircularProgressIndicator', () => {
  test('indeterminado: progressbar con nombre y sin aria-valuenow', async () => {
    const c = await render(<CircularProgressIndicator label="Actualizando" />)
    await expect.element(page.getByRole('progressbar')).toHaveAccessibleName('Actualizando')
    for (const attr of ['aria-valuenow', 'aria-valuemin', 'aria-valuemax']) expect(root(c).hasAttribute(attr)).toBe(false)
    expect(c.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true')
  })

  test('nombre accesible por aria-labelledby (etiqueta visible) o por aria-label', async () => {
    const c = await render(
      <div>
        <span id="etiqueta-visible">Subiendo foto.jpg</span>
        <CircularProgressIndicator aria-labelledby="etiqueta-visible" value={0.5} />
        <CircularProgressIndicator aria-label="Directo" />
      </div>,
    )
    await expect.element(page.getByRole('progressbar', { name: 'Subiendo foto.jpg' })).toBeInTheDocument()
    await expect.element(page.getByRole('progressbar', { name: 'Directo' })).toBeInTheDocument()
    const [linked, direct] = [...c.querySelectorAll<HTMLElement>('.mk-circular-progress-indicator')]
    // Con aria-labelledby no se inventa un aria-label vacío; aria-label directo llega tal cual.
    expect(linked!.hasAttribute('aria-label')).toBe(false)
    expect(direct!.getAttribute('aria-label')).toBe('Directo')
  })

  test('TypeScript exige un nombre accesible', () => {
    // @ts-expect-error: sin label, aria-labelledby ni aria-label
    void (<CircularProgressIndicator value={0.5} />)
    // @ts-expect-error: label y aria-label irían al mismo atributo
    void (<CircularProgressIndicator label="a" aria-label="b" />)
    void (<CircularProgressIndicator label="a" aria-labelledby="b" />)
  })

  test('determinado: aria-valuenow de 0 a 100, acotado', async () => {
    const c = await render(
      <div>
        <CircularProgressIndicator label="a" value={0.25} />
        <CircularProgressIndicator label="b" value={2} />
        <CircularProgressIndicator label="c" value={Number.NaN} />
      </div>,
    )
    const bars = [...c.querySelectorAll('[role="progressbar"]')]
    expect(bars.map((b) => b.getAttribute('aria-valuenow'))).toEqual(['25', '100', '0'])
    expect(bars[0]!.getAttribute('aria-valuemin')).toBe('0')
    expect(bars[0]!.getAttribute('aria-valuemax')).toBe('100')
  })

  test('tamaños del kit: 40 y 44 planos, 48 y 52 con onda', async () => {
    const c = await render(
      <div>
        <CircularProgressIndicator label="a" value={0.5} className="a" />
        <CircularProgressIndicator label="b" value={0.5} thickness={8} className="b" />
        <CircularProgressIndicator label="c" value={0.5} wavy className="c" />
        <CircularProgressIndicator label="d" value={0.5} wavy thickness={8} className="d" />
      </div>,
    )
    const size = (sel: string) => [rect(c.querySelector(sel)!).width, rect(c.querySelector(sel)!).height]
    expect([size('.a'), size('.b'), size('.c'), size('.d')]).toEqual([
      [40, 40],
      [44, 44],
      [48, 48],
      [52, 52],
    ])
    expect(style(c.querySelector('.b .mk-circular-progress-indicator-active')).strokeWidth).toBe('8px')
  })

  test('colores: pista secondary-container, indicador primary, extremos redondos', async () => {
    const c = await render(<CircularProgressIndicator label="x" value={0.5} />)
    expect(style(track(c)).stroke).toBe(roleColor('secondary-container'))
    expect(style(active(c)).stroke).toBe(roleColor('primary'))
    expect(style(active(c)).strokeLinecap).toBe('round')
    expect(style(track(c)).strokeLinecap).toBe('round')
  })

  test('50 %: indicador de las 12 a las 6; pista desde 2 extremos + 4 después hasta 2 extremos + 4 antes', async () => {
    const c = await render(<Surface><CircularProgressIndicator label="x" value={0.5} /></Surface>)
    const L = CIRCULAR_FLAT_LENGTH
    const reach = L / 2
    const spacing = 2 * 2 + 4
    expect(numbers(style(active(c)).strokeDasharray)).toEqual([50, 50])
    const [len, gap] = numbers(style(track(c)).strokeDasharray)
    expect(len).toBeCloseTo(reach - 2 * spacing, 2)
    expect(len! + gap!).toBeCloseTo(L, 2)
    expect(numbers(style(track(c)).strokeDashoffset)[0]).toBeCloseTo(-(reach + spacing), 2)
    // Píxeles sobre el centro del trazo (radio 18).
    const p = await pixelsOf(root(c))
    const primary = rgb(roleColor('primary'))
    const container = rgb(roleColor('secondary-container'))
    const surface = rgb(roleColor('surface'))
    expect(near(p.at(...at(40, 18, 90)), primary), '3 en punto').toBe(true)
    expect(near(p.at(...at(40, 18, 270)), container), '9 en punto').toBe(true)
    // Separación: 4 px de arco después del extremo del indicador (y antes de las 12).
    const gapDeg = ((2 + 2) / 18) * (180 / Math.PI)
    expect(near(p.at(...at(40, 18, 180 + gapDeg)), surface), 'separación después').toBe(true)
    expect(near(p.at(...at(40, 18, 360 - gapDeg)), surface), 'separación antes').toBe(true)
  })

  test('0 %: sin indicador y pista entera; 100 %: sin pista', async () => {
    const c = await render(
      <div>
        <CircularProgressIndicator label="a" value={0} className="a" />
        <CircularProgressIndicator label="b" value={1} className="b" />
      </div>,
    )
    expect(style(c.querySelector('.a .mk-circular-progress-indicator-active')).strokeWidth).toBe('0px')
    const fullTrack = numbers(style(c.querySelector('.a .mk-circular-progress-indicator-track')).strokeDasharray)
    expect(fullTrack[0]).toBeCloseTo(CIRCULAR_FLAT_LENGTH, 2)
    expect(style(c.querySelector('.b .mk-circular-progress-indicator-track')).strokeWidth).toBe('0px')
    expect(numbers(style(c.querySelector('.b .mk-circular-progress-indicator-active')).strokeDasharray)).toEqual([100, 0])
  })

  test('cerca de 0 la separación se achica (CircularProgressDrawingCache.updateDrawPaths)', async () => {
    // 1 % de 113,1 = 1,13: separación 2 · 1,13 + 1,13.
    const c = await render(<CircularProgressIndicator label="x" value={0.01} />)
    const reach = CIRCULAR_FLAT_LENGTH * 0.01
    expect(numbers(style(track(c)).strokeDashoffset)[0]).toBeCloseTo(-(reach + 3 * reach), 2)
  })

  test('onda: contornos de Compose (9 ondas), plana hasta el 10 % y desde el 95 %', async () => {
    const c = await render(
      <div>
        <CircularProgressIndicator label="a" value={0.05} wavy className="a" />
        <CircularProgressIndicator label="b" value={0.5} wavy className="b" />
        <CircularProgressIndicator label="c" value={0.97} wavy className="c" />
        <CircularProgressIndicator label="d" wavy className="d" />
      </div>,
    )
    const d = (sel: string) => c.querySelector(`${sel} .mk-circular-progress-indicator-active`)!.getAttribute('d')
    expect([d('.a'), d('.b'), d('.c'), d('.d')]).toEqual([FLAT_PATH, WAVE_PATH, FLAT_PATH, WAVE_PATH])
    const t = c.querySelector('.b .mk-circular-progress-indicator-track')!
    expect(t.getAttribute('d')).toBe(TRACK_PATH)
    expect(Number(t.getAttribute('pathLength'))).toBeCloseTo(TRACK_LENGTH, 3)
    expect(c.querySelector('.b svg')!.getAttribute('viewBox')).toBe('-24 -24 48 48')
    // La onda llega más cerca del centro que la pista (radio de 18,7 a 21,8 contra 21,45).
    const box = (c.querySelector('.b .mk-circular-progress-indicator-active') as SVGPathElement).getBBox()
    expect(box.width).toBeGreaterThan(2 * 18.6)
    expect(box.width).toBeLessThan(2 * 21.9)
  })

  test('onda: el trazo gira hacia atrás y el guion avanza lo mismo (una onda por segundo)', async () => {
    const c = await render(<CircularProgressIndicator label="x" value={0.5} wavy />)
    expect(names(active(c))).toEqual(['mk-cpi-wave'])
    expect(active(c).getAnimations()[0]!.effect!.getComputedTiming().duration).toBe(9000)
    freeze(root(c), 2250)
    await expect.poll(() => style(active(c)).rotate).toBe('-90deg')
    expect(numbers(style(active(c)).strokeDashoffset)[0]).toBeCloseTo(-25, 3)
    // El arco quedó en su lugar: de las 12 a las 6 (la mitad derecha) sobre el centro del trazo.
    const p = await pixelsOf(root(c))
    const primary = rgb(roleColor('primary'))
    const hits = [45, 90, 135].filter((deg) => [18.7, 19.5, 20.3, 21.1].some((r) => near(p.at(...at(48, r, deg)), primary)))
    expect(hits).toEqual([45, 90, 135])
  })

  test('indeterminado: barrido y giros de Compose en 6 s', async () => {
    const c = await render(<Surface><CircularProgressIndicator label="x" /></Surface>)
    const rotor = c.querySelector('.mk-circular-progress-indicator-rotor')!
    const step = c.querySelector('.mk-circular-progress-indicator-step')!
    expect([names(root(c)), names(rotor), names(step)]).toEqual([['mk-cpi-sweep'], ['mk-cpi-spin'], ['mk-cpi-step']])
    for (const el of [root(c), rotor, step]) expect(el.getAnimations()[0]!.effect!.getComputedTiming().duration).toBe(6000)

    // 750 ms: barrido lineal de 0,1 a 0,87 en 3 s; 1080° en 6 s más 90°; primer paso de 90° hecho.
    freeze(root(c), 750)
    await expect.poll(() => Number(style(root(c)).getPropertyValue('--_cpi-value'))).toBeCloseTo(0.1 + 0.77 * 0.25, 3)
    expect(style(rotor).rotate).toBe('225deg')
    expect(style(step).rotate).toBe('90deg')
    // El arco empieza a 225 + 90 = 315° y barre 0,2925 de vuelta: cubre las 12, no las 6.
    const p = await pixelsOf(root(c))
    expect(near(p.at(...at(40, 18, 0)), rgb(roleColor('primary'))), 'las 12').toBe(true)
    expect(near(p.at(...at(40, 18, 180)), rgb(roleColor('secondary-container'))), 'las 6').toBe(true)

    // A mitad de un paso (1650 ms) y de vuelta con EasingStandard (4500 ms).
    freeze(root(c), 1650)
    await expect.poll(() => style(step).rotate).toBe('135deg')
    freeze(root(c), 4500)
    const expected = 0.87 + (0.1 - 0.87) * bezier(0.2, 0, 0, 1, 0.5)
    await expect.poll(() => Number(style(root(c)).getPropertyValue('--_cpi-value'))).toBeCloseTo(expected, 3)
  })

  test('la transición del valor y de la onda está declarada (DurationLong2)', async () => {
    const c = await render(<CircularProgressIndicator label="x" value={0.5} wavy />)
    const [rootProperty, activeProperty, duration] = withMotion(() => [
      style(root(c)).transitionProperty,
      style(active(c)).transitionProperty,
      style(active(c)).transitionDuration,
    ])
    expect(rootProperty).toBe('--_cpi-value')
    expect(activeProperty).toBe('d')
    expect(duration).toBe('0.5s')
  })

  test('movimiento reducido: no gira; el indeterminado queda en un cuarto de vuelta, latiendo', async () => {
    await commands.reduceMotion(true)
    try {
      const c = await render(<Surface><CircularProgressIndicator label="x" wavy /></Surface>)
      await expect.poll(() => names(root(c))).toEqual([])
      expect(names(c.querySelector('.mk-circular-progress-indicator-rotor')!)).toEqual([])
      expect(names(active(c))).toEqual(['mk-activity-pulse'])
      expect(Number(style(root(c)).getPropertyValue('--_cpi-value'))).toBeCloseTo(0.25, 5)
      // Quieto de las 12 a las 3.
      const p = await pixelsOf(root(c))
      const primary = rgb(roleColor('primary'))
      expect([18.7, 19.5, 20.3, 21.1].some((r) => near(p.at(...at(48, r, 45)), primary))).toBe(true)
      expect(near(p.at(...at(48, 21.45, 225)), rgb(roleColor('secondary-container')))).toBe(true)
      expect(withMotion(() => style(root(c)).transitionProperty)).toBe('none')
    } finally {
      await commands.reduceMotion(false)
    }
  })

  test('ref, className, style y props nativas llegan al <span>', async () => {
    const ref = createRef<HTMLSpanElement>()
    const c = await render(
      <CircularProgressIndicator ref={ref} label="x" value={0.3} className="mia" style={{ marginTop: 2 }} id="cp1" aria-describedby="otro" />,
    )
    const el = root(c)
    expect(ref.current).toBe(el)
    expect(el.tagName).toBe('SPAN')
    expect(el.className).toBe('mk-circular-progress-indicator mia')
    expect(el.style.marginTop).toBe('2px')
    expect(el.id).toBe('cp1')
    expect(el.getAttribute('aria-describedby')).toBe('otro')
    expect(el.getAttribute('role')).toBe('progressbar')
  })
})
