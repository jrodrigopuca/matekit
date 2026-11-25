// Las 35 formas decorativas generadas con pnpm shapes (ADR-0011): que los datos versionados
// estén al día con la portación, y que cada contorno esté cerrado, dentro del viewBox, centrado
// como en Compose, con las simetrías de su construcción y una cantidad de comandos razonable.
// Uso: pnpm test:tokens

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MATERIAL_SHAPES, type MaterialShapeName } from '../scripts/lib/shapes/MaterialShapes.ts'
import { fitToSquare, toSvgPathData } from '../scripts/lib/shapes/svg.ts'
import { SHAPES } from '../src/atoms/Shape/shapes.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (...p: string[]) => readFileSync(join(root, ...p), 'utf8')
interface ShapeData {
  name: string
  compose: MaterialShapeName
  label: string
  path: string
}
const data = JSON.parse(read('shapes', 'material-shapes.json')) as {
  viewBox: string
  precision: number
  shapes: ShapeData[]
}
const byName = new Map(data.shapes.map((s) => [s.name, s]))
const shape = (name: string) => {
  const s = byName.get(name)
  if (!s) throw new Error(`No existe la forma ${name}`)
  return s
}

type Pt = [number, number]
type Segment = { from: Pt; c1?: Pt; c2?: Pt; to: Pt }

/** Lee un `d` con M, L, C y Z absolutos (lo único que escribe svg.ts). */
function parse(d: string): { start: Pt; segments: Segment[]; closed: boolean; commands: number } {
  const tokens = d.match(/[MLCZ]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? []
  let i = 0
  const num = () => Number(tokens[i++])
  const pt = (): Pt => [num(), num()]
  let start: Pt = [0, 0]
  let current: Pt = [0, 0]
  const segments: Segment[] = []
  let closed = false
  let commands = 0
  while (i < tokens.length) {
    const cmd = tokens[i++]
    commands++
    if (cmd === 'M') current = start = pt()
    else if (cmd === 'L') {
      const to = pt()
      segments.push({ from: current, to })
      current = to
    } else if (cmd === 'C') {
      const c1 = pt()
      const c2 = pt()
      const to = pt()
      segments.push({ from: current, c1, c2, to })
      current = to
    } else if (cmd === 'Z') {
      closed = i === tokens.length
    } else throw new Error(`Comando inesperado ${cmd}`)
  }
  return { start, segments, closed, commands }
}

/** Puntos del contorno, cada `1 / steps` de cada segmento. */
function sample(d: string, steps = 24): Pt[] {
  const out: Pt[] = []
  for (const { from, c1, c2, to } of parse(d).segments) {
    for (let k = 0; k < steps; k++) {
      const t = k / steps
      if (!c1 || !c2) out.push([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t])
      else {
        const u = 1 - t
        const b = (a: number, b1: number, b2: number, e: number) => u * u * u * a + 3 * u * u * t * b1 + 3 * u * t * t * b2 + t * t * t * e
        out.push([b(from[0], c1[0], c2[0], to[0]), b(from[1], c1[1], c2[1], to[1])])
      }
    }
  }
  return out
}

/** Distancia de p a la poligonal cerrada que une los puntos. */
function distanceToOutline(p: Pt, outline: readonly Pt[]): number {
  let best = Infinity
  for (let k = 0; k < outline.length; k++) {
    const a = outline[k]!
    const b = outline[(k + 1) % outline.length]!
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len2 = dx * dx + dy * dy
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2))
    best = Math.min(best, Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy)))
  }
  return best
}

/** Mayor distancia entre el contorno transformado por f y el contorno original. */
function asymmetry(d: string, f: (p: Pt) => Pt): number {
  const outline = sample(d)
  return Math.max(...outline.map((p) => distanceToOutline(f(p), outline)))
}
/**
 * Centro de la forma en el viewBox: el del polígono (el de su construcción), que no siempre cae
 * en (50, 50). Compose centra el rectángulo de los puntos de control, y los controles pueden
 * sobresalir más de un lado que del otro (ver la prueba de circle).
 */
function centerOf(name: string): Pt {
  const p = MATERIAL_SHAPES[shape(name).compose]()
  return [p.centerX * 100, p.centerY * 100]
}
const rotate = (degrees: number, [cx, cy]: Pt) => ([x, y]: Pt): Pt => {
  const a = (degrees * Math.PI) / 180
  const [dx, dy] = [x - cx, y - cy]
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)]
}
const mirrorX = ([cx]: Pt) => ([x, y]: Pt): Pt => [2 * cx - x, y]
const mirrorY = ([, cy]: Pt) => ([x, y]: Pt): Pt => [x, 2 * cy - y]

/** Todas las coordenadas (anclajes y controles), como las cuenta Path.getBounds(). */
function points(d: string): Pt[] {
  const { start, segments } = parse(d)
  return [start, ...segments.flatMap((s) => [s.c1, s.c2, s.to].filter((p): p is Pt => p !== undefined))]
}

describe('Datos de las formas', () => {
  test('las 35 del kit, con nombres únicos en kebab-case, y la lista de src/ coincide', () => {
    assert.equal(data.shapes.length, 35)
    assert.equal(byName.size, 35)
    for (const s of data.shapes) assert.match(s.name, /^[a-z0-9]+(-[a-z0-9]+)*$/, s.name)
    assert.deepEqual(
      SHAPES.map((s) => s.name),
      data.shapes.map((s) => s.name),
    )
    assert.equal(shape('clam-shell').label, 'Clamshell')
    assert.equal(shape('cookie-9-sided').compose, 'Cookie9Sided')
    assert.equal(data.viewBox, '0 0 100 100')
  })

  test('están al día con la portación (pnpm shapes)', () => {
    for (const s of data.shapes) {
      const path = toSvgPathData(fitToSquare(MATERIAL_SHAPES[s.compose](), 100), data.precision)
      assert.equal(s.path, path, `${s.name}: correr pnpm shapes`)
    }
  })

  test('la máscara CSS de cada forma está en la hoja opcional shapes.css, no en styles.css', () => {
    const css = read('src', 'shapes.css')
    assert.ok(css.includes('@layer matekit.tokens, matekit.palettes, matekit.atoms, matekit.components;'), 'orden de capas')
    assert.doesNotMatch(read('src', 'styles.css'), /@import[^;]*(shapes\.css|shape-masks)/)
    for (const s of data.shapes) {
      assert.ok(css.includes(`.mk-shape[data-shape='${s.name}']`), s.name)
      assert.ok(css.includes(`d='${s.path}'`), `${s.name}: contorno distinto del JSON`)
    }
    // Sin colores en el SVG: la máscara usa el relleno opaco por defecto.
    assert.doesNotMatch(css, /fill=|stroke=|#[0-9a-f]{3,8}\b/i)
  })
})

describe('Cada contorno', () => {
  for (const s of data.shapes) {
    test(s.name, () => {
      const { start, segments, closed, commands } = parse(s.path)
      // Cerrado: un solo subtrazo, termina con Z y el último punto es el primero.
      assert.ok(closed, 'termina en Z')
      assert.equal(s.path.match(/M/g)?.length, 1, 'un solo subtrazo')
      assert.deepEqual(segments.at(-1)?.to, start, 'el último punto es el primero')
      // Cantidad de comandos razonable.
      assert.ok(commands >= 5 && commands <= 200, `${commands} comandos`)

      // Dentro del viewBox (los puntos de control también, así que la curva entera) y llenando el
      // lado mayor, como normalized() + toShape() de Compose.
      const pts = points(s.path)
      const xs = pts.map((p) => p[0])
      const ys = pts.map((p) => p[1])
      const [left, right, top, bottom] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
      for (const v of [left, right, top, bottom]) assert.ok(v >= 0 && v <= 100, `fuera del viewBox: ${v}`)
      assert.ok(Math.max(right - left, bottom - top) > 99.98, 'llena el lado mayor')
      // Centrada: el centro del rectángulo de anclajes y controles, en (50, 50).
      assert.ok(Math.abs((left + right) / 2 - 50) <= 0.01, `centro x ${(left + right) / 2}`)
      assert.ok(Math.abs((top + bottom) / 2 - 50) <= 0.01, `centro y ${(top + bottom) / 2}`)
    })
  }
})

describe('Simetrías', () => {
  // Tolerancia: la precisión de los datos (0,005) más el error de muestrear las curvas.
  const TOLERANCE = 0.05

  const rotational: Array<[string, number]> = [
    ['circle', 10],
    ['square', 4],
    ['sunny', 8],
    ['very-sunny', 8],
    ['cookie-4-sided', 4],
    ['cookie-6-sided', 6],
    ['cookie-7-sided', 7],
    ['cookie-9-sided', 9],
    ['cookie-12-sided', 12],
    ['clover-4-leaf', 4],
    ['clover-8-leaf', 8],
    ['burst', 12],
    ['soft-burst', 10],
    ['boom', 15],
    ['soft-boom', 16],
    ['flower', 8],
    ['puffy-diamond', 4],
    ['pixel-circle', 2],
  ]
  for (const [name, n] of rotational) {
    test(`${name}: igual a sí misma girada ${(360 / n).toFixed(1)}°`, () => {
      const a = asymmetry(shape(name).path, rotate(360 / n, centerOf(name)))
      assert.ok(a < TOLERANCE, `asimetría ${a}`)
    })
  }

  test('cookie-4-sided no es simétrica a 45° (la prueba distingue)', () => {
    assert.ok(asymmetry(shape('cookie-4-sided').path, rotate(45, centerOf('cookie-4-sided'))) > 1)
  })

  // Las que Compose arma reflejadas (mirroring) a partir de un punto sobre el eje vertical. Gem y
  // Arrow no entran: en los datos de Compose, su eje está apenas inclinado (0,499 en lugar de
  // 0,5) o no son reflejadas.
  for (const name of ['heart', 'pentagon', 'ghostish', 'triangle', 'bun']) {
    test(`${name}: simétrica respecto del eje vertical`, () => {
      const a = asymmetry(shape(name).path, mirrorX(centerOf(name)))
      assert.ok(a < TOLERANCE, `asimetría ${a}`)
    })
  }

  test('pixel-triangle: simétrica respecto del eje horizontal (apunta a la derecha)', () => {
    const a = asymmetry(shape('pixel-triangle').path, mirrorY(centerOf('pixel-triangle')))
    assert.ok(a < TOLERANCE, `asimetría ${a}`)
  })

  test('circle es un círculo, corrido 0,4 a la derecha como en Compose', () => {
    // Compose normaliza con el rectángulo de los puntos de control. A 0° el contorno empieza en
    // un anclaje (sin controles que sobresalgan) y a 180° hay un arco entero, con los controles
    // en x = 0: el círculo real queda en (50,4; 50) con radio 49,6.
    const r = sample(shape('circle').path).map(([x, y]) => Math.hypot(x - 50.4, y - 50))
    assert.ok(Math.max(...r) - Math.min(...r) < 0.05, `${Math.min(...r)} a ${Math.max(...r)}`)
    assert.ok(Math.abs(Math.min(...r) - 49.6) < 0.05)
  })
})
