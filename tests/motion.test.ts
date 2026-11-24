// Comprueba los resortes de movimiento: la física, la conversión a linear() y el CSS generado.
// Uso: pnpm test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { MotionTokens, Spring } from '../tokens/types.ts'
import {
  MAX_LINEAR_ERROR,
  SETTLE_THRESHOLD,
  linearError,
  springPosition,
  springToCss,
  toLinear,
} from '../tokens/spring.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const motion = JSON.parse(readFileSync(join(root, 'tokens', 'motion.json'), 'utf8')) as MotionTokens
const css = readFileSync(join(root, 'src', 'tokens', 'motion.css'), 'utf8')
const allSprings = (Object.keys(motion.springs) as Array<keyof MotionTokens['springs']>).flatMap(
  (scheme) => Object.entries(motion.springs[scheme]).map(([name, s]) => ({ scheme, name, spring: s })),
)

// Integración numérica independiente de la fórmula analítica (Euler semiimplícito, paso 1 µs).
function simulate(spring: Spring, untilSec: number): (t: number) => number {
  const dt = 1e-6
  const c = 2 * spring.damping * Math.sqrt(spring.stiffness)
  const samples: number[] = []
  let x = 0
  let v = 0
  const perMs = Math.round(1e-3 / dt)
  for (let i = 0; i <= untilSec / dt; i++) {
    if (i % perMs === 0) samples.push(x)
    v += (spring.stiffness * (1 - x) - c * v) * dt
    x += v * dt
  }
  return (t) => samples[Math.round(t * 1000)] ?? NaN
}

test('la fórmula analítica coincide con una simulación numérica independiente', () => {
  for (const { scheme, name, spring } of allSprings) {
    const sim = simulate(spring, 0.6)
    for (let ms = 0; ms <= 600; ms += 5) {
      const diff = Math.abs(springPosition(ms / 1000, spring) - sim(ms / 1000))
      assert.ok(diff < 1e-3, `${scheme} ${name} a ${ms} ms: diferencia ${diff}`)
    }
  }
})

test('cada curva linear() respeta el error máximo y termina asentada', () => {
  for (const { scheme, name, spring } of allSprings) {
    const c = springToCss(spring)
    assert.ok(linearError(c.points, spring, c.durationMs) < MAX_LINEAR_ERROR, `${scheme} ${name}`)
    assert.equal(c.points[0], 0)
    assert.equal(c.points.at(-1), 1)
    const end = springPosition(c.durationMs / 1000, spring)
    assert.ok(Math.abs(1 - end) < SETTLE_THRESHOLD, `${scheme} ${name} no asentado al final`)
  }
})

test('los resortes spatial expresivos rebotan; los effects nunca pasan del destino', () => {
  const peak = (s: Spring) => {
    let p = 0
    for (let ms = 0; ms <= 1000; ms++) p = Math.max(p, springPosition(ms / 1000, s))
    return p
  }
  assert.ok(peak(motion.springs.expressive['fast-spatial']) > 1.05, 'fast-spatial expresivo debe rebotar')
  for (const { scheme, name, spring } of allSprings.filter((s) => s.name.endsWith('effects'))) {
    assert.ok(peak(spring) <= 1, `${scheme} ${name} pasa del destino`)
  }
})

test('motion.css: expressive por defecto, standard por atributo y movimiento reducido', () => {
  const section = (selector: string): string => {
    const start = css.indexOf(`${selector} {`)
    assert.ok(start >= 0, `falta ${selector}`)
    return css.slice(start, css.indexOf('}', start))
  }
  const expressive = section(':root,\n[data-motion="expressive"]')
  const standard = section('[data-motion="standard"]')
  for (const [scheme, text] of [['expressive', expressive], ['standard', standard]] as const) {
    for (const [name, spring] of Object.entries(motion.springs[scheme])) {
      const c = springToCss(spring)
      assert.ok(text.includes(`--md-sys-motion-spring-${name}-duration: ${c.durationMs}ms;`), `${scheme} ${name} duración`)
      assert.ok(text.includes(`--md-sys-motion-spring-${name}-easing: ${toLinear(c.points)};`), `${scheme} ${name} curva`)
    }
  }
  const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
  for (const name of ['fast-spatial', 'default-spatial', 'slow-spatial']) {
    assert.ok(reduced.includes(`--md-sys-motion-spring-${name}-duration: 0ms;`), `reducido ${name}`)
  }
  assert.ok(!reduced.includes('effects'), 'los effects no se anulan con movimiento reducido')
  assert.ok(css.includes('--md-sys-motion-duration-short1: 50ms;'))
  assert.ok(css.includes('--md-sys-motion-easing-emphasized: cubic-bezier(0.2, 0, 0, 1);'))
})
