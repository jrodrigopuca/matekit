import { createRef, type ReactNode } from 'react'
import { describe, expect, test } from 'vitest'
import { commands, page } from 'vitest/browser'
import { render, roleColor, style, withMotion } from '../../test/render.tsx'
import { near, pixelsOf } from '../../test/pixels.ts'
import { LinearProgressIndicator } from './LinearProgressIndicator.tsx'

const root = (c: HTMLElement) => c.querySelector('.mk-linear-progress-indicator') as HTMLElement
const canvas = (c: HTMLElement) => c.querySelector('.mk-linear-progress-indicator-canvas') as HTMLElement
const track = (c: HTMLElement, segment = 'end') =>
  c.querySelector(`.mk-linear-progress-indicator-track[data-segment="${segment}"]`) as HTMLElement
const line = (c: HTMLElement, n = 1) => c.querySelector(`.mk-linear-progress-indicator-active[data-line="${n}"]`) as SVGPathElement
const stop = (c: HTMLElement) => c.querySelector('.mk-linear-progress-indicator-stop') as HTMLElement
const rect = (el: Element) => el.getBoundingClientRect()
/** Posición horizontal de un elemento respecto del indicador. */
const xOf = (el: Element, c: HTMLElement) => rect(el).left - rect(root(c)).left
const rgb = (css: string) => css.match(/[\d.]+/g)!.slice(0, 3).map(Number)

/** El indicador dentro de un contenedor del ancho del kit (404). */
const Box = ({ width = 404, children }: { width?: number; children: ReactNode }) => (
  <div style={{ width, background: 'var(--md-sys-color-surface)', padding: '8px 0' }}>{children}</div>
)

/** Congela las animaciones CSS del lienzo en `ms` (todas comparten el reloj del documento). */
function freeze(el: Element, ms: number) {
  for (const a of el.getAnimations()) {
    a.pause()
    a.currentTime = ms
  }
}

/** cubic-bezier(x1, y1, x2, y2) en `t` (como lo resuelve CSS). */
function bezier(x1: number, y1: number, x2: number, y2: number, t: number): number {
  const at = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3
  let lo = 0
  let hi = 1
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (at(x1, x2, mid) < t) lo = mid
    else hi = mid
  }
  return at(y1, y2, (lo + hi) / 2)
}
const emphasizedAccelerate = (t: number) => bezier(0.3, 0, 0.8, 0.15, t)

/** Fracción de un extremo del indeterminado en `ms` (keyframes de ProgressIndicator.kt). */
function keyframe(ms: number, delay: number, duration: number): number {
  if (ms <= delay) return 0
  if (ms >= delay + duration) return 1
  return emphasizedAccelerate((ms - delay) / duration)
}

/**
 * Portación de LinearProgressDrawingCache.updateDrawPaths (LinearWavyProgressModifiers.kt): los
 * tramos de pista que dibuja Compose (centros de sus extremos redondos) para unas fracciones.
 */
function composeTrack(width: number, cap: number, gap: number, fractions: number[]): Array<[number, number]> {
  const segments: Array<[number, number]> = []
  let nextEnd = width - cap
  let start = nextEnd
  let adjustedGap = gap
  let visible = false
  for (let i = 0; i < fractions.length / 2; i++) {
    const barTail = fractions[i * 2]! * width
    const barHead = fractions[i * 2 + 1]! * width
    if (i === 0) {
      adjustedGap = barHead < cap ? 0 : Math.min(barHead - cap, gap)
      visible = barHead >= cap
    }
    const head = Math.min(Math.max(barHead, cap), width - cap)
    const tail = Math.min(Math.max(barTail, cap), width - cap)
    const spacing = visible ? adjustedGap + cap * 2 : adjustedGap
    if (nextEnd > head + spacing) segments.push([Math.max(cap, head + spacing), start])
    if (barHead > barTail) {
      nextEnd = Math.max(cap, tail - spacing)
      start = nextEnd
    }
  }
  if (nextEnd > cap) segments.push([cap, start])
  return segments
}

describe('LinearProgressIndicator', () => {
  test('indeterminado: progressbar con nombre y sin aria-valuenow', async () => {
    const c = await render(<LinearProgressIndicator label="Cargando mensajes" />)
    await expect.element(page.getByRole('progressbar')).toHaveAccessibleName('Cargando mensajes')
    const el = root(c)
    // WAI-ARIA, rol progressbar: si el valor es indeterminado, se omite aria-valuenow.
    for (const attr of ['aria-valuenow', 'aria-valuemin', 'aria-valuemax']) expect(el.hasAttribute(attr)).toBe(false)
    expect(c.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true')
  })

  test('determinado: aria-valuenow de 0 a 100, acotado', async () => {
    const c = await render(
      <div>
        <LinearProgressIndicator label="a" value={0.4} />
        <LinearProgressIndicator label="b" value={1.7} />
        <LinearProgressIndicator label="c" value={-1} />
        <LinearProgressIndicator label="d" value={Number.NaN} />
      </div>,
    )
    const bars = [...c.querySelectorAll('[role="progressbar"]')]
    expect(bars.map((b) => b.getAttribute('aria-valuenow'))).toEqual(['40', '100', '0', '0'])
    expect(bars[0]!.getAttribute('aria-valuemin')).toBe('0')
    expect(bars[0]!.getAttribute('aria-valuemax')).toBe('100')
    await expect.element(page.getByRole('progressbar', { name: 'a' })).toHaveAttribute('aria-valuenow', '40')
  })

  test('alto: el grosor (4 u 8), y con onda 10 y 14 (Compose); el ancho, el del contenedor', async () => {
    const c = await render(
      <Box>
        <LinearProgressIndicator label="a" value={0.5} className="a" />
        <LinearProgressIndicator label="b" value={0.5} thickness={8} className="b" />
        <LinearProgressIndicator label="c" value={0.5} wavy className="c" />
        <LinearProgressIndicator label="d" value={0.5} wavy thickness={8} className="d" />
      </Box>,
    )
    const size = (sel: string) => [rect(c.querySelector(sel)!).width, rect(c.querySelector(sel)!).height]
    expect([size('.a'), size('.b'), size('.c'), size('.d')]).toEqual([
      [404, 4],
      [404, 8],
      [404, 10],
      [404, 14],
    ])
  })

  test('colores: pista secondary-container, indicador y punto primary, extremos redondos', async () => {
    const c = await render(<Box><LinearProgressIndicator label="x" value={0.5} /></Box>)
    expect(style(track(c)).backgroundColor).toBe(roleColor('secondary-container'))
    expect(style(track(c)).borderRadius).toBe('9999px')
    expect(style(line(c)).stroke).toBe(roleColor('primary'))
    expect(style(line(c)).strokeLinecap).toBe('round')
    expect(style(stop(c)).backgroundColor).toBe(roleColor('primary'))
    expect(style(stop(c)).borderRadius).toBe('9999px')
  })

  for (const thickness of [4, 8] as const) {
    test(`grosor ${thickness}, 50 % en 404: indicador hasta 202 + extremo, 4 de separación, pista hasta el final`, async () => {
      const c = await render(<Box><LinearProgressIndicator label="x" value={0.5} thickness={thickness} /></Box>)
      const cap = thickness / 2
      // Pista: empieza en la cabeza + extremo del indicador + 4 y llega al borde final.
      expect(xOf(track(c), c)).toBeCloseTo(202 + cap + 4, 2)
      expect(xOf(track(c), c) + rect(track(c)).width).toBeCloseTo(404, 2)
      expect(rect(track(c)).height).toBe(thickness)
      // El indicador (píxeles): primary hasta 202 + extremo, fondo en la separación, pista después.
      const p = await pixelsOf(root(c))
      const y = thickness / 2
      const primary = rgb(roleColor('primary'))
      const surface = rgb(roleColor('surface'))
      expect(near(p.at(1, y), primary), 'inicio').toBe(true)
      // (el último píxel del extremo queda suavizado: se mira medio píxel antes)
      expect(near(p.at(202 + cap - 1.5, y), primary), 'cabeza').toBe(true)
      expect(near(p.at(202 + cap + 2, y), surface), 'separación').toBe(true)
      expect(near(p.at(202 + cap + 5, y), rgb(roleColor('secondary-container'))), 'pista').toBe(true)
    })
  }

  test('punto final: 4 × 4, pegado al final con grosor 4 y a 2 con grosor 8, centrado', async () => {
    const c = await render(
      <Box>
        <LinearProgressIndicator label="a" value={0.3} className="a" />
        <LinearProgressIndicator label="b" value={0.3} thickness={8} className="b" />
      </Box>,
    )
    for (const [sel, offset] of [['.a', 0], ['.b', 2]] as const) {
      const bar = c.querySelector(sel) as HTMLElement
      const dot = bar.querySelector('.mk-linear-progress-indicator-stop')!
      expect([rect(dot).width, rect(dot).height], sel).toEqual([4, 4])
      expect(rect(bar).right - rect(dot).right, sel).toBeCloseTo(offset, 2)
      expect(rect(dot).top + 2 - (rect(bar).top + rect(bar).height / 2), sel).toBeCloseTo(0, 2)
    }
  })

  test('punto final: se achica cuando lo alcanza la cabeza y desaparece al 100 %', async () => {
    const c = await render(
      <Box>
        <LinearProgressIndicator label="a" value={0.8} className="a" />
        <LinearProgressIndicator label="b" value={0.99} className="b" />
        <LinearProgressIndicator label="c" value={1} className="c" />
      </Box>,
    )
    const dot = (sel: string) => c.querySelector(`${sel} .mk-linear-progress-indicator-stop`)!
    expect(rect(dot('.a')).width).toBe(4)
    // 0,99 · 404 + 2 = 401,96 pasa el inicio del punto (400) por 1,96: queda de 2,04 desde ahí.
    // (Chrome redondea la caja a 1/64 de px: se compara con un decimal)
    expect(rect(dot('.b')).width).toBeCloseTo(4 - 1.96, 1)
    expect(rect(dot('.b')).left - rect(c.querySelector('.b')!).left).toBeCloseTo(401.96, 1)
    expect(rect(dot('.c')).width).toBe(0)
  })

  test('0 %: sin indicador, pista entera y punto; 100 %: sin pista', async () => {
    const c = await render(
      <Box>
        <LinearProgressIndicator label="a" value={0} className="a" />
        <LinearProgressIndicator label="b" value={1} className="b" />
      </Box>,
    )
    const a = c.querySelector('.a') as HTMLElement
    const b = c.querySelector('.b') as HTMLElement
    expect(style(a.querySelector('.mk-linear-progress-indicator-active')).strokeWidth).toBe('0px')
    const ta = a.querySelector('.mk-linear-progress-indicator-track')!
    expect([rect(ta).left - rect(a).left, rect(ta).width]).toEqual([0, 404])
    expect(rect(b.querySelector('.mk-linear-progress-indicator-track')!).width).toBe(0)
    expect(style(b.querySelector('.mk-linear-progress-indicator-active')).strokeWidth).toBe('4px')
  })

  test('cerca de 0 la separación se achica como en Compose (la cabeza aún no pasó el extremo)', async () => {
    // 1 % de 404 = 4,04: separación min(4,04 - 2, 4) = 2,04 más los dos extremos.
    const c = await render(<Box><LinearProgressIndicator label="x" value={0.01} /></Box>)
    const start = composeTrack(404, 2, 4, [0, 0.01])[0]![0]
    expect(xOf(track(c), c)).toBeCloseTo(start - 2, 2)
  })

  test('se adapta al ancho del contenedor sin JavaScript (100cqw)', async () => {
    const c = await render(<Box width={300}><LinearProgressIndicator label="x" value={0.5} /></Box>)
    expect(xOf(track(c), c)).toBeCloseTo(150 + 2 + 4, 2)
    ;(c.firstElementChild as HTMLElement).style.width = '700px'
    await expect.poll(() => xOf(track(c), c)).toBeCloseTo(350 + 2 + 4, 2)
    expect(xOf(stop(c), c)).toBeCloseTo(700 - 4, 2)
  })

  test('onda: longitud fija en px (40 y 20), sin estirarse con el ancho', async () => {
    const c = await render(
      <div>
        <Box width={200}><LinearProgressIndicator label="a" value={0.5} wavy className="a" /></Box>
        <Box width={900}><LinearProgressIndicator label="b" value={0.5} wavy className="b" /></Box>
        <Box width={900}><LinearProgressIndicator label="c" wavy className="c" /></Box>
      </div>,
    )
    const path = (sel: string) => c.querySelector(`${sel} .mk-linear-progress-indicator-active`) as SVGPathElement
    // El mismo trazado en px con cualquier ancho (el SVG no tiene viewBox: no escala).
    expect(path('.a').getAttribute('d')).toBe(path('.b').getAttribute('d'))
    expect(path('.a').getAttribute('d')!.startsWith('M0 0q10 6 20 0 t20 0 t20 0')).toBe(true)
    expect(path('.c').getAttribute('d')!.startsWith('M0 0q5 6 10 0 t10 0 t10 0')).toBe(true)
    expect(c.querySelector('.a svg')!.hasAttribute('viewBox')).toBe(false)
    // Píxeles con la onda quieta: valles (y = 5 + 3) en x = 10 + 40k, crestas (y = 5 - 3) en 30 + 40k.
    for (const sel of ['.a', '.b']) {
      const bar = c.querySelector(sel) as HTMLElement
      freeze(bar.querySelector('.mk-linear-progress-indicator-canvas')!, 0)
      const p = await pixelsOf(bar)
      const primary = rgb(roleColor('primary'))
      for (const x of [50, 90]) {
        expect(near(p.at(x, 8), primary), `${sel} valle en ${x}`).toBe(true)
        expect(near(p.at(x, 1.5), primary), `${sel} sin cresta en ${x}`).toBe(false)
      }
      for (const x of [70, 30]) expect(near(p.at(x, 2), primary), `${sel} cresta en ${x}`).toBe(true)
    }
  })

  test('onda: se desplaza una longitud de onda por segundo hacia el inicio; el tramo queda en su lugar', async () => {
    const c = await render(<Box><LinearProgressIndicator label="x" value={0.5} wavy /></Box>)
    const anim = canvas(c).getAnimations().find((a) => (a as CSSAnimation).animationName === 'mk-lpi-wave')!
    expect(anim.effect!.getComputedTiming().duration).toBe(1000)
    freeze(canvas(c), 250)
    await expect.poll(() => style(canvas(c)).getPropertyValue('--_lpi-shift')).toBe('10px')
    // A los 250 ms la onda avanzó 10 px hacia el inicio: el valle de x = 50 está en x = 40.
    const p = await pixelsOf(root(c))
    const primary = rgb(roleColor('primary'))
    expect(near(p.at(40, 8), primary)).toBe(true)
    expect(near(p.at(80, 8), primary)).toBe(true)
    // La cabeza no se movió: primary justo antes de 204 y fondo en la separación.
    expect(near(p.at(203, 5), primary) || near(p.at(203, 3), primary) || near(p.at(203, 7), primary)).toBe(true)
    expect(near(p.at(206, 5), rgb(roleColor('surface')))).toBe(true)
  })

  test('onda: plana hasta el 10 % y desde el 95 % (indicatorAmplitude); entera en el medio', async () => {
    const c = await render(
      <Box>
        <LinearProgressIndicator label="a" value={0.1} wavy className="a" />
        <LinearProgressIndicator label="b" value={0.5} wavy className="b" />
        <LinearProgressIndicator label="c" value={0.95} wavy className="c" />
        <LinearProgressIndicator label="d" wavy className="d" />
      </Box>,
    )
    const amp = (sel: string) => style(c.querySelector(sel)).getPropertyValue('--_lpi-amp')
    expect([amp('.a'), amp('.b'), amp('.c'), amp('.d')]).toEqual(['0', '1', '0', '1'])
    // Plana: el trazo queda en el centro (5 ± 2); con onda llega a los bordes del alto de 10.
    const flat = await pixelsOf(c.querySelector('.a') as HTMLElement)
    const primary = rgb(roleColor('primary'))
    expect(near(flat.at(20, 5), primary)).toBe(true)
    expect(near(flat.at(20, 8.5), primary)).toBe(false)
  })

  test('plano: el trazado no se escala (con scaleY casi 0, Chrome compone mal la opacidad que late)', async () => {
    const c = await render(<Box><LinearProgressIndicator label="x" /></Box>)
    expect(style(line(c)).transform).toBe('matrix(1, 0, 0, 1, 0, 2)')
    expect(style(line(c, 2)).transform).toBe('matrix(1, 0, 0, 1, 0, 2)')
  })

  test('la transición del valor y de la amplitud está declarada (DurationLong2)', async () => {
    const c = await render(<LinearProgressIndicator label="x" value={0.5} wavy />)
    const [property, duration] = withMotion(() => [style(root(c)).transitionProperty, style(root(c)).transitionDuration])
    expect(property).toBe('--_lpi-value, --_lpi-amp')
    expect(duration).toBe('0.5s, 0.5s')
  })

  test('indeterminado: dos líneas con los tiempos de Compose y la pista partida igual que Compose', async () => {
    const c = await render(<Box><LinearProgressIndicator label="x" /></Box>)
    const names = canvas(c).getAnimations().map((a) => (a as CSSAnimation).animationName)
    expect(names).toEqual(['mk-lpi-head1', 'mk-lpi-tail1', 'mk-lpi-head2', 'mk-lpi-tail2'])
    for (const a of canvas(c).getAnimations()) expect(a.effect!.getComputedTiming().duration).toBe(1750)

    for (const ms of [500, 800, 1100, 1400]) {
      freeze(canvas(c), ms)
      const expected = [
        keyframe(ms, 250, 1000),
        keyframe(ms, 0, 1000),
        keyframe(ms, 900, 850),
        keyframe(ms, 650, 850),
      ]
      await expect.poll(() => Number(style(canvas(c)).getPropertyValue('--_lpi-h1'))).toBeCloseTo(expected[1]!, 2)
      expect(Number(style(canvas(c)).getPropertyValue('--_lpi-t2')), `${ms} ms`).toBeCloseTo(expected[2]!, 2)
      // Los tramos de pista visibles coinciden con los de Compose (con sus extremos redondos).
      const ours = (['end', 'middle', 'start'] as const)
        .map((s) => track(c, s))
        .filter((t) => rect(t).width > 0)
        .map((t) => [xOf(t, c), xOf(t, c) + rect(t).width])
        .sort((a, b) => a[0]! - b[0]!)
      const theirs = composeTrack(404, 2, 4, expected)
        .map(([a, b]) => [a - 2, b + 2])
        .sort((a, b) => a[0]! - b[0]!)
      // Compose puede repetir un tramo (el del inicio y el del medio coinciden); se comparan sin repetir.
      const unique = (list: number[][]) => list.filter((s, i) => i === 0 || Math.abs(s[0]! - list[i - 1]![0]!) > 0.01)
      expect(unique(ours).length, `${ms} ms`).toBe(unique(theirs).length)
      unique(ours).forEach((s, i) => {
        expect(s[0], `${ms} ms, tramo ${i}`).toBeCloseTo(unique(theirs)[i]![0]!, 1)
        expect(s[1], `${ms} ms, tramo ${i}`).toBeCloseTo(unique(theirs)[i]![1]!, 1)
      })
    }
  })

  test('indeterminado: sin punto final; con onda, longitud 20 y amplitud entera', async () => {
    const c = await render(<Box><LinearProgressIndicator label="x" wavy /></Box>)
    expect(c.querySelector('.mk-linear-progress-indicator-stop')).toBeNull()
    expect(line(c, 2)).not.toBeNull()
    // La onda de 20 avanza 20 px por segundo: 5 px a los 250 ms.
    const names = canvas(c).getAnimations().map((a) => (a as CSSAnimation).animationName)
    expect(names).toContain('mk-lpi-wave-indeterminate')
    freeze(canvas(c), 250)
    await expect.poll(() => style(canvas(c)).getPropertyValue('--_lpi-shift')).toBe('5px')
    expect(style(root(c)).getPropertyValue('--_lpi-amp')).toBe('1')
  })

  test('RTL: avanza de derecha a izquierda, con el punto a la izquierda', async () => {
    const c = await render(
      <div dir="rtl">
        <Box><LinearProgressIndicator label="x" value={0.25} /></Box>
      </div>,
    )
    // El tramo de pista va del inicio (izquierda) hasta 404 - 101 - 2 - 4.
    expect(xOf(track(c), c)).toBeCloseTo(0, 2)
    expect(rect(track(c)).width).toBeCloseTo(404 - 101 - 2 - 4, 2)
    expect(xOf(stop(c), c)).toBeCloseTo(0, 2)
    const p = await pixelsOf(root(c))
    expect(near(p.at(402, 2), rgb(roleColor('primary')))).toBe(true)
    expect(near(p.at(404 - 101 - 4, 2), rgb(roleColor('surface')))).toBe(true)
  })

  test('movimiento reducido: sin desplazamientos; el indeterminado quieto, latiendo', async () => {
    await commands.reduceMotion(true)
    try {
      const c = await render(
        <Box>
          <LinearProgressIndicator label="a" wavy className="a" />
          <LinearProgressIndicator label="b" value={0.5} wavy className="b" />
        </Box>,
      )
      const a = c.querySelector('.a') as HTMLElement
      const b = c.querySelector('.b') as HTMLElement
      await expect.poll(() => a.querySelector('.mk-linear-progress-indicator-canvas')!.getAnimations().length).toBe(0)
      expect(b.querySelector('.mk-linear-progress-indicator-canvas')!.getAnimations().length).toBe(0)
      const ca = a.querySelector('.mk-linear-progress-indicator-canvas')!
      expect(Number(style(ca).getPropertyValue('--_lpi-t1'))).toBeCloseTo(0.1, 5)
      expect(Number(style(ca).getPropertyValue('--_lpi-h1'))).toBeCloseTo(0.4, 5)
      expect(style(ca).getPropertyValue('--_lpi-shift')).toBe('0px')
      // Señal de actividad: el indicador late en opacidad (no se desplaza).
      const pulse = a.querySelector('.mk-linear-progress-indicator-active')!.getAnimations()
      expect(pulse.map((x) => (x as CSSAnimation).animationName)).toEqual(['mk-lpi-pulse'])
      // El valor cambia sin transición.
      expect(withMotion(() => style(b).transitionProperty)).toBe('none')
    } finally {
      await commands.reduceMotion(false)
    }
  })

  test('ref, className, style y props nativas llegan al <div>', async () => {
    const ref = createRef<HTMLDivElement>()
    const c = await render(
      <LinearProgressIndicator ref={ref} label="x" value={0.3} className="mia" style={{ marginTop: 2 }} id="lp1" aria-describedby="otro" />,
    )
    const el = root(c)
    expect(ref.current).toBe(el)
    expect(el.tagName).toBe('DIV')
    expect(el.className).toBe('mk-linear-progress-indicator mia')
    expect(el.style.marginTop).toBe('2px')
    expect(el.style.getPropertyValue('--_lpi-value')).toBe('0.3')
    expect(el.id).toBe('lp1')
    expect(el.getAttribute('aria-describedby')).toBe('otro')
    expect(el.getAttribute('role')).toBe('progressbar')
  })
})
