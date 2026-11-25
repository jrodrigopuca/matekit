// Pruebas propias del indicador de carga (ADR-0011): los datos que genera pnpm shapes en
// src/molecules/LoadingIndicator/loading-indicator-data.ts, comparados con la portación de Morph y
// de LoadingIndicator.kt de scripts/lib/shapes/.
// Uso: pnpm test:tokens

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  IndeterminateShapes,
  QuarterRotation,
  ViewBoxSide,
  buildDeterminate,
  buildIndeterminateAnimation,
  buildMorphSequence,
  calculateScaleFactor,
  ActiveIndicatorScale,
  composeFrameAt,
  determinatePolygons,
  indeterminatePolygons,
  maxPointDistance,
  morphDurationMillis,
  morphFrame,
  rotateOutline,
  smilFrameAt,
  type Outline,
} from '../scripts/lib/shapes/LoadingIndicator.ts'
import { Morph } from '../scripts/lib/shapes/Morph.ts'
import { springPosition } from '../scripts/lib/shapes/SpringEstimation.ts'
import * as data from '../src/molecules/LoadingIndicator/loading-indicator-data.ts'
import { determinatePathData } from '../src/molecules/LoadingIndicator/determinate.ts'

/** Contorno absoluto de un `d` relativo (M x y c … z, con la repetición implícita de c). */
function parseRelative(d: string): Outline {
  assert.match(d, /^M-?\d+[ -]-?\d+c[-\d ]+z$/, 'solo M, c y z')
  const nums = d.slice(1, -1).replace('c', ' ').match(/-?\d+/g)!.map(Number)
  assert.equal((nums.length - 2) % 6, 0, 'seis números por curva')
  const out: Outline = [nums[0]!, nums[1]!]
  let [x0, y0] = [nums[0]!, nums[1]!]
  for (let i = 2; i < nums.length; i += 6) {
    for (let j = 0; j < 6; j++) out.push(nums[i + j]! + (j % 2 === 0 ? x0 : y0))
    x0 = out.at(-2)!
    y0 = out.at(-1)!
  }
  return out
}

/** Puntos sobre las curvas de un contorno, `n` por curva. */
function sample(outline: Outline, n = 16): Array<[number, number]> {
  const pts: Array<[number, number]> = []
  for (let i = 2; i < outline.length; i += 6) {
    const [x0, y0] = [outline[i - 2]!, outline[i - 1]!]
    const [x1, y1, x2, y2, x3, y3] = outline.slice(i, i + 6) as [number, number, number, number, number, number]
    for (let k = 0; k < n; k++) {
      const t = k / n
      const u = 1 - t
      pts.push([
        u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
        u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
      ])
    }
  }
  return pts
}

/** Puntos centrados por el rectángulo de la curva (no el de los puntos de control). */
function centered(pts: Array<[number, number]>): Array<[number, number]> {
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2
  return pts.map(([x, y]) => [x - cx, y - cy])
}

/**
 * Distancia de Hausdorff (aproximada por muestras) entre dos contornos: cuánto difieren como
 * dibujo. Se centran los dos por su curva: Compose centra cada fotograma por el rectángulo de sus
 * puntos de control, y la misma forma partida en otras curvas queda corrida hasta 0,2 dp (Compose
 * da ese mismo salto al pasar de un Morph al siguiente).
 */
function shapeDistance(a: Outline, b: Outline): number {
  const pa = centered(sample(a))
  const pb = centered(sample(b, 64))
  const pa2 = centered(sample(a, 64))
  const pb2 = centered(sample(b))
  // Distancia de cada punto a la poligonal cerrada del otro contorno (a sus segmentos, no a sus
  // puntos: los lados rectos largos de Pill quedan con pocas muestras).
  const toSegment = (x: number, y: number, [ax, ay]: [number, number], [bx, by]: [number, number]) => {
    const dx = bx - ax
    const dy = by - ay
    const t = dx || dy ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))) : 0
    return Math.hypot(x - (ax + t * dx), y - (ay + t * dy))
  }
  const far = (from: Array<[number, number]>, to: Array<[number, number]>) =>
    Math.max(...from.map(([x, y]) => Math.min(...to.map((p, i) => toSegment(x, y, p, to[(i + 1) % to.length]!)))))
  return Math.max(far(pa, pb), far(pb2, pa2))
}

/** Estructura de comandos de un `d`: las letras y la cantidad de números. */
const structure = (d: string) => `${d.replace(/[-\d ]+/g, '')}:${d.match(/-?\d+/g)!.length}`

const anim = buildIndeterminateAnimation()
const morphs = buildMorphSequence(indeterminatePolygons(), true)
const scale = calculateScaleFactor(indeterminatePolygons()) * ActiveIndicatorScale
/** Tolerancia de forma: 1,5 unidades del viewBox, 0,15 dp a 48 dp (el redondeo a enteros da 0,05 por coordenada). */
const SHAPE_TOLERANCE = 1.5

describe('Indicador de carga: datos generados', () => {
  test('los datos versionados coinciden con lo que calcula la portación (pnpm shapes al día)', () => {
    assert.equal(data.TRANSITIONS.length, IndeterminateShapes.length)
    data.TRANSITIONS.forEach((t, k) => {
      assert.equal(t.begin, anim.shapes[k]!.begin)
      assert.equal(t.values, anim.shapes[k]!.values.join(';'))
    })
    assert.equal(data.SHAPE_KEY_TIMES, anim.shapeKeyTimes)
    assert.equal(data.MORPH_ROTATION.values, anim.morphRotation.values)
  })

  test('todos los fotogramas de cada transición tienen la misma estructura de comandos', () => {
    for (const [k, t] of data.TRANSITIONS.entries()) {
      const values = t.values.split(';')
      assert.equal(values.length, data.SHAPE_KEY_TIMES.split(';').length, `transición ${k}: un valor por keyTime`)
      assert.equal(new Set(values.map(structure)).size, 1, `transición ${k}`)
    }
  })

  test('keyTimes, keySplines y values cuadran entre sí', () => {
    const check = (keyTimes: string, keySplines: string, count: number, name: string) => {
      const times = keyTimes.split(';').map(Number)
      assert.equal(times.length, count, `${name}: keyTimes`)
      assert.equal(times[0], 0, `${name}: empieza en 0`)
      assert.equal(times.at(-1), 1, `${name}: termina en 1`)
      for (let i = 1; i < times.length; i++) assert.ok(times[i]! > times[i - 1]!, `${name}: keyTimes crecen`)
      const splines = keySplines.split(';')
      assert.equal(splines.length, count - 1, `${name}: una keySpline por tramo`)
      for (const s of splines) {
        const v = s.split(' ').map(Number)
        assert.equal(v.length, 4)
        for (const x of v) assert.ok(x >= 0 && x <= 1, `${name}: keySpline en [0, 1]`)
      }
    }
    check(data.SHAPE_KEY_TIMES, data.SHAPE_KEY_SPLINES, data.TRANSITIONS[0]!.values.split(';').length, 'contornos')
    check(data.MORPH_ROTATION.keyTimes, data.MORPH_ROTATION.keySplines, data.MORPH_ROTATION.values.split(';').length, 'giro')
    assert.equal(data.MORPH_ROTATION.values.split(';').at(-1), '90', 'el giro de cada cambio termina en 90° (accumulate="sum")')
    assert.equal(data.VISIBILITY_KEY_TIMES.split(';').length, 3)
  })

  test('el primer fotograma de cada tramo es la forma de origen y el final del Morph, la de destino', () => {
    const polygons = indeterminatePolygons()
    for (let k = 0; k < morphs.length; k++) {
      const first = parseRelative(data.TRANSITIONS[k]!.values.split(';')[0]!)
      // La forma de origen sola (otra estructura de comandos), escalada y centrada igual.
      const origin = rotateOutline(morphFrame(new Morph(polygons[k]!.normalized(), polygons[k]!.normalized()), 0, ViewBoxSide, scale), QuarterRotation)
      assert.ok(shapeDistance(first, origin) < SHAPE_TOLERANCE, `transición ${k}: origen (${shapeDistance(first, origin)})`)
      // El Morph en 1, girado los 90° del cambio, es el primer fotograma de la transición siguiente.
      const end = rotateOutline(morphFrame(morphs[k]!, 1, ViewBoxSide, scale), QuarterRotation * 2)
      const next = rotateOutline(parseRelative(data.TRANSITIONS[(k + 1) % morphs.length]!.values.split(';')[0]!), QuarterRotation)
      assert.ok(shapeDistance(end, next) < SHAPE_TOLERANCE, `transición ${k}: destino (${shapeDistance(end, next)})`)
    }
  })

  test('el ciclo cierra: cada transición vuelve a su primer fotograma y la última termina en la primera forma', () => {
    for (const t of data.TRANSITIONS) {
      const values = t.values.split(';')
      assert.equal(values.at(-1), values[0])
    }
    assert.equal(data.CYCLE_MS, data.MORPH_MS * data.TRANSITIONS.length)
    // Desfases: la transición k empieza 650 ms después que la anterior.
    data.TRANSITIONS.forEach((t, k) => {
      const begin = k === 0 ? 0 : -Number(t.begin.replace('ms', ''))
      assert.equal(k === 0 ? 0 : data.CYCLE_MS - begin, data.MORPH_MS * k)
    })
  })

  test('los 7 pasos son el primer fotograma de cada transición con el giro de los cambios ya hechos', () => {
    data.STEPS.forEach((step, k) => {
      const first = rotateOutline(parseRelative(data.TRANSITIONS[k]!.values.split(';')[0]!), QuarterRotation * k)
      assert.ok(shapeDistance(parseRelative(step), first) < SHAPE_TOLERANCE, `paso ${k + 1}`)
    })
  })

  // El kit dice «unos 30 a 34»: es la medida de la curva, y Cookie4Sided, una galleta muy marcada,
  // mide 28,8 (sus puntos de control abarcan 32,9). Compose la dibuja igual.
  test('cada forma ocupa entre 28 y 34 dp del área de 38', () => {
    for (const [k, step] of data.STEPS.entries()) {
      const pts = sample(parseRelative(step), 32)
      const xs = pts.map((p) => p[0])
      const ys = pts.map((p) => p[1])
      const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 10
      assert.ok(size >= 28 && size <= 34.5, `paso ${k + 1}: ${size.toFixed(1)} dp`)
    }
  })
})

describe('Indicador de carga: animación frente a Compose', () => {
  test('el resorte del cambio de forma termina a los 297 ms, pasado de 1', () => {
    assert.equal(morphDurationMillis(), 297)
    assert.ok(springPosition(0.297, { dampingRatio: 0.6, stiffness: 200 }) > 1.09)
  })

  test('los fotogramas de SMIL siguen la animación de Compose a menos de 0,25 dp en todo el ciclo', () => {
    let max = 0
    for (let ms = 0; ms < anim.cycleMs; ms += 2) {
      const local = ms % data.MORPH_MS
      // El salto de 1,09 a 1 al terminar el resorte: Compose lo hace en un fotograma.
      if (Math.abs(local - morphDurationMillis()) < 1) continue
      max = Math.max(max, maxPointDistance(composeFrameAt(ms), smilFrameAt(anim, ms)))
    }
    assert.ok(max / 10 < 0.25, `error máximo ${(max / 10).toFixed(3)} dp`)
  })

  test('el determinado es el Morph Circle → SoftBurst de Compose, centrado en cada fotograma', () => {
    const [morph] = buildMorphSequence(determinatePolygons(), false)
    const detScale = calculateScaleFactor(determinatePolygons()) * ActiveIndicatorScale
    for (const v of [0, 0.25, 0.5, 0.8, 1]) {
      const exact = morphFrame(morph!, v, ViewBoxSide, detScale)
      const ours = parseRelative(determinatePathData(v))
      assert.equal(ours.length, exact.length)
      assert.ok(maxPointDistance(ours, exact) < 1, `valor ${v}: ${maxPointDistance(ours, exact)}`)
    }
    assert.deepEqual(data.DETERMINATE, buildDeterminate())
  })
})

describe('Secuencia del indicador', () => {
  test('las 7 formas en el orden del kit ("Steps" 1 a 7) y de LoadingIndicatorDefaults de Compose', () => {
    // 05-medidas.md § Indicador de carga. Si cambia, los datos generados siguen de acuerdo con la
    // portación, así que solo esta prueba lo detecta.
    assert.deepEqual(IndeterminateShapes, ['SoftBurst', 'Cookie9Sided', 'Pentagon', 'Pill', 'Sunny', 'Cookie4Sided', 'Oval'])
  })
})
