/*
 * Copyright 2022 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Pruebas portadas de androidx/androidx@b842c5b3a5,
// graphics/graphics-shapes/src/commonTest/kotlin/androidx/graphics/shapes/ (ADR-0011):
// TestUtils.kt, CornerRoundingTest.kt, CubicTest.kt, FeaturesTest.kt, PolygonTest.kt,
// RoundedPolygonTest.kt y ShapesTest.kt. Un `describe` por archivo, con los nombres de las
// pruebas del original. Sin portar: las de Morph, FeatureMapping, FloatMapping, PolygonMeasure
// (entrega 2), FeatureDetector, FeatureSerializer, SvgPathParser y PolygonValidation (no se
// portan esos archivos). Las pruebas comentadas en RoundedPolygonTest.kt tampoco.
// Uso: pnpm test:tokens

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { CornerRounding } from '../scripts/lib/shapes/CornerRounding.ts'
import { Cubic, type PointTransformer } from '../scripts/lib/shapes/Cubic.ts'
import { Corner, Edge, Feature } from '../scripts/lib/shapes/Features.ts'
import { Point } from '../scripts/lib/shapes/Point.ts'
import { RoundedPolygon } from '../scripts/lib/shapes/RoundedPolygon.ts'
import { circle, pill, pillStar, rectangle, star } from '../scripts/lib/shapes/Shapes.ts'

// --- TestUtils.kt ---

const Epsilon = 1e-4

function assertEqualsEps(expected: number, actual: number, epsilon: number, message?: string) {
  assert.ok(Math.abs(expected - actual) <= epsilon, `${message ?? ''} esperado ${expected}, fue ${actual}`)
}
function assertPointsEqualish(expected: Point, actual: Point) {
  const msg = `${expected} vs. ${actual}`
  assertEqualsEps(expected.x, actual.x, Epsilon, msg)
  assertEqualsEps(expected.y, actual.y, Epsilon, msg)
}
const anchor0 = (c: Cubic) => new Point(c.anchor0X, c.anchor0Y)
const control0 = (c: Cubic) => new Point(c.control0X, c.control0Y)
const control1 = (c: Cubic) => new Point(c.control1X, c.control1Y)
const anchor1 = (c: Cubic) => new Point(c.anchor1X, c.anchor1Y)
function assertCubicsEqualish(expected: Cubic, actual: Cubic) {
  assertPointsEqualish(anchor0(expected), anchor0(actual))
  assertPointsEqualish(control0(expected), control0(actual))
  assertPointsEqualish(control1(expected), control1(actual))
  assertPointsEqualish(anchor1(expected), anchor1(actual))
}
function assertCubicListsEqualish(expected: readonly Cubic[], actual: readonly Cubic[]) {
  assert.equal(actual.length, expected.length)
  expected.forEach((c, i) => assertCubicsEqualish(c, actual[i]!))
}
function assertFeaturesEqualish(expected: Feature, actual: Feature) {
  assertCubicListsEqualish(expected.cubics, actual.cubics)
  assert.equal(actual.constructor, expected.constructor)
  if (expected instanceof Corner && actual instanceof Corner) assert.equal(actual.convex, expected.convex)
}
function assertPolygonsEqualish(expected: RoundedPolygon, actual: RoundedPolygon) {
  assertCubicListsEqualish(expected.cubics, actual.cubics)
  assert.equal(actual.features.length, expected.features.length)
  expected.features.forEach((f, i) => assertFeaturesEqualish(f, actual.features[i]!))
}
function assertPointGreaterish(expected: Point, actual: Point) {
  assert.ok(actual.x >= expected.x - Epsilon)
  assert.ok(actual.y >= expected.y - Epsilon)
}
function assertPointLessish(expected: Point, actual: Point) {
  assert.ok(actual.x <= expected.x + Epsilon)
  assert.ok(actual.y <= expected.y + Epsilon)
}
const assertEqualish = (expected: number, actual: number, message?: string) =>
  assertEqualsEps(expected, actual, Epsilon, message)
function assertInBounds(shape: readonly Cubic[], minPoint: Point, maxPoint: Point) {
  for (const cubic of shape) {
    for (const p of [anchor0(cubic), control0(cubic), control1(cubic), anchor1(cubic)]) {
      assertPointGreaterish(minPoint, p)
      assertPointLessish(maxPoint, p)
    }
  }
}
const identityTransform = (): PointTransformer => (x, y) => [x, y]
const scaleTransform = (sx: number, sy: number): PointTransformer => (x, y) => [x * sx, y * sy]
const translateTransform = (dx: number, dy: number): PointTransformer => (x, y) => [x + dx, y + dy]

// --- CornerRoundingTest.kt ---

describe('CornerRoundingTest', () => {
  test('cornerRoundingTest', () => {
    const defaultCorner = new CornerRounding()
    assert.equal(defaultCorner.radius, 0)
    assert.equal(defaultCorner.smoothing, 0)

    const unrounded = CornerRounding.Unrounded
    assert.equal(unrounded.radius, 0)
    assert.equal(unrounded.smoothing, 0)

    const rounded = new CornerRounding(5)
    assert.equal(rounded.radius, 5)
    assert.equal(rounded.smoothing, 0)

    const smoothed = new CornerRounding(undefined, 0.5)
    assert.equal(smoothed.radius, 0)
    assert.equal(smoothed.smoothing, 0.5)

    const roundedAndSmoothed = new CornerRounding(5, 0.5)
    assert.equal(roundedAndSmoothed.radius, 5)
    assert.equal(roundedAndSmoothed.smoothing, 0.5)
  })
})

// --- CubicTest.kt ---

describe('CubicTest', () => {
  // Un arco más o menos circular en el cuadrante superior derecho, alrededor de (0, 0).
  const zero = new Point(0, 0)
  const p0 = new Point(1, 0)
  const p1 = new Point(1, 0.5)
  const p2 = new Point(0.5, 1)
  const p3 = new Point(0, 1)
  const cubic = Cubic.fromPoints(p0, p1, p2, p3)

  test('constructionTest', () => {
    assert.deepEqual(anchor0(cubic), p0)
    assert.deepEqual(control0(cubic), p1)
    assert.deepEqual(control1(cubic), p2)
    assert.deepEqual(anchor1(cubic), p3)
  })

  test('circularArcTest', () => {
    const arcCubic = Cubic.circularArc(zero.x, zero.y, p0.x, p0.y, p3.x, p3.y)
    assert.deepEqual(anchor0(arcCubic), p0)
    assert.deepEqual(anchor1(arcCubic), p3)
  })

  test('divTest', () => {
    assertCubicsEqualish(cubic, cubic.div(1))
    const divCubic = cubic.div(2)
    assertPointsEqualish(p0.div(2), anchor0(divCubic))
    assertPointsEqualish(p1.div(2), control0(divCubic))
    assertPointsEqualish(p2.div(2), control1(divCubic))
    assertPointsEqualish(p3.div(2), anchor1(divCubic))
  })

  test('timesTest', () => {
    const same = cubic.times(1)
    assert.deepEqual(anchor0(same), p0)
    assert.deepEqual(control0(same), p1)
    assert.deepEqual(control1(same), p2)
    assert.deepEqual(anchor1(same), p3)
    const timesCubic = cubic.times(2)
    assertPointsEqualish(p0.times(2), anchor0(timesCubic))
    assertPointsEqualish(p1.times(2), control0(timesCubic))
    assertPointsEqualish(p2.times(2), control1(timesCubic))
    assertPointsEqualish(p3.times(2), anchor1(timesCubic))
  })

  test('plusTest', () => {
    const offsetCubic = cubic.times(2)
    const plusCubic = cubic.plus(offsetCubic)
    assertPointsEqualish(p0.plus(anchor0(offsetCubic)), anchor0(plusCubic))
    assertPointsEqualish(p1.plus(control0(offsetCubic)), control0(plusCubic))
    assertPointsEqualish(p2.plus(control1(offsetCubic)), control1(plusCubic))
    assertPointsEqualish(p3.plus(anchor1(offsetCubic)), anchor1(plusCubic))
  })

  test('reverseTest', () => {
    const reverseCubic = cubic.reverse()
    assert.deepEqual(anchor0(reverseCubic), p3)
    assert.deepEqual(control0(reverseCubic), p2)
    assert.deepEqual(control1(reverseCubic), p1)
    assert.deepEqual(anchor1(reverseCubic), p0)
  })

  function assertBetween(end0: Point, end1: Point, actual: Point) {
    assert.ok(Math.min(end0.x, end1.x) <= actual.x)
    assert.ok(Math.min(end0.y, end1.y) <= actual.y)
    assert.ok(Math.max(end0.x, end1.x) >= actual.x)
    assert.ok(Math.max(end0.y, end1.y) >= actual.y)
  }

  test('straightLineTest', () => {
    const lineCubic = Cubic.straightLine(p0.x, p0.y, p3.x, p3.y)
    assert.deepEqual(anchor0(lineCubic), p0)
    assert.deepEqual(anchor1(lineCubic), p3)
    assertBetween(p0, p3, control0(lineCubic))
    assertBetween(p0, p3, control1(lineCubic))
  })

  test('splitTest', () => {
    const [split0, split1] = cubic.split(0.5)
    assert.deepEqual(anchor0(split0), anchor0(cubic))
    assert.deepEqual(anchor1(split1), anchor1(cubic))
    assertBetween(anchor0(cubic), anchor1(cubic), anchor1(split0))
    assertBetween(anchor0(cubic), anchor1(cubic), anchor0(split1))
  })

  test('pointOnCurveTest', () => {
    let halfway = cubic.pointOnCurve(0.5)
    assertBetween(anchor0(cubic), anchor1(cubic), halfway)
    const straightLineCubic = Cubic.straightLine(p0.x, p0.y, p3.x, p3.y)
    halfway = straightLineCubic.pointOnCurve(0.5)
    const computedHalfway = new Point(p0.x + 0.5 * (p3.x - p0.x), p0.y + 0.5 * (p3.y - p0.y))
    assertPointsEqualish(computedHalfway, halfway)
  })

  test('transformTest', () => {
    assertCubicsEqualish(cubic, cubic.transformed(identityTransform()))
    assertCubicsEqualish(cubic.times(3), cubic.transformed(scaleTransform(3, 3)))

    const translationVector = new Point(200, 300)
    const transformedCubic = cubic.transformed(translateTransform(200, 300))
    assertPointsEqualish(anchor0(cubic).plus(translationVector), anchor0(transformedCubic))
    assertPointsEqualish(control0(cubic).plus(translationVector), control0(transformedCubic))
    assertPointsEqualish(control1(cubic).plus(translationVector), control1(transformedCubic))
    assertPointsEqualish(anchor1(cubic).plus(translationVector), anchor1(transformedCubic))
  })

  test('emptyCubicHasZeroLength', () => {
    assert.ok(Cubic.empty(10, 10).zeroLength())
  })
})

// --- FeaturesTest.kt ---

describe('FeaturesTest', () => {
  test('cannotBuildEmptyFeatures', () => {
    assert.throws(() => Feature.buildConvexCorner([]))
    assert.throws(() => Feature.buildConcaveCorner([]))
    assert.throws(() => Feature.buildIgnorableFeature([]))
  })

  test('cannotBuildNonContinuousFeatures', () => {
    const cubic1 = Cubic.straightLine(0, 0, 1, 1)
    const cubic2 = Cubic.straightLine(10, 10, 11, 11)
    assert.throws(() => Feature.buildConvexCorner([cubic1, cubic2]))
    assert.throws(() => Feature.buildConcaveCorner([cubic1, cubic2]))
    assert.throws(() => Feature.buildIgnorableFeature([cubic1, cubic2]))
  })

  test('buildsConcaveCorner', () => {
    const cubic = Cubic.straightLine(0, 0, 1, 0)
    assertFeaturesEqualish(new Corner([cubic], false), Feature.buildConcaveCorner([cubic]))
  })

  test('buildsConvexCorner', () => {
    const cubic = Cubic.straightLine(0, 0, 1, 0)
    assertFeaturesEqualish(new Corner([cubic], true), Feature.buildConvexCorner([cubic]))
  })

  test('buildsEdge', () => {
    const cubic = Cubic.straightLine(0, 0, 1, 0)
    assertFeaturesEqualish(new Edge([cubic]), Feature.buildEdge(cubic))
  })

  test('buildsIgnorableAsEdge', () => {
    const cubic = Cubic.straightLine(0, 0, 1, 0)
    assertFeaturesEqualish(new Edge([cubic]), Feature.buildIgnorableFeature([cubic]))
  })
})

// --- PolygonTest.kt ---

describe('PolygonTest', () => {
  const square = RoundedPolygon.fromNumVertices(4)
  const roundedSquare = RoundedPolygon.fromNumVertices(4, { rounding: new CornerRounding(0.2) })
  const pentagon = RoundedPolygon.fromNumVertices(5)

  test('constructionTest', () => {
    // No se puede afirmar cómo se arma exactamente el cuadrado, pero sí que todos sus puntos
    // quedan dentro del cuadrado unitario.
    assertInBounds(square.cubics, new Point(-1, -1), new Point(1, 1))

    const doubleSquare = RoundedPolygon.fromNumVertices(4, { radius: 2 })
    assertInBounds(doubleSquare.cubics, new Point(-2, -2), new Point(2, 2))

    const offsetSquare = RoundedPolygon.fromNumVertices(4, { centerX: 1, centerY: 2 })
    assertInBounds(offsetSquare.cubics, new Point(0, 1), new Point(2, 3))

    const squareCopy = RoundedPolygon.copy(square)
    assertInBounds(squareCopy.cubics, new Point(-1, -1), new Point(1, 1))

    const p0 = new Point(1, 0)
    const p1 = new Point(0, 1)
    const p2 = new Point(-1, 0)
    const p3 = new Point(0, -1)
    const manualSquare = RoundedPolygon.fromVertices([p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y])
    assertInBounds(manualSquare.cubics, new Point(-1, -1), new Point(1, 1))

    const offset = new Point(1, 2)
    const [q0, q1, q2, q3] = [p0, p1, p2, p3].map((p) => p.plus(offset)) as [Point, Point, Point, Point]
    const manualSquareOffset = RoundedPolygon.fromVertices([q0.x, q0.y, q1.x, q1.y, q2.x, q2.y, q3.x, q3.y], {
      centerX: offset.x,
      centerY: offset.y,
    })
    assertInBounds(manualSquareOffset.cubics, new Point(0, 1), new Point(2, 3))
  })

  test('boundsTest', () => {
    let bounds = square.calculateBounds()
    assertEqualish(-1, bounds[0]!) // izquierda
    assertEqualish(-1, bounds[1]!) // arriba
    assertEqualish(1, bounds[2]!) // derecha
    assertEqualish(1, bounds[3]!) // abajo

    let betterBounds = square.calculateBounds(undefined, false)
    assertEqualish(-1, betterBounds[0]!)
    assertEqualish(-1, betterBounds[1]!)
    assertEqualish(1, betterBounds[2]!)
    assertEqualish(1, betterBounds[3]!)

    // El rectángulo aproximado del cuadrado redondeado es más grande por los puntos de control.
    bounds = roundedSquare.calculateBounds()
    betterBounds = roundedSquare.calculateBounds(undefined, false)
    assert.ok(betterBounds[2]! - betterBounds[0]! < bounds[2]! - bounds[0]!, `bounds ${bounds}, betterBounds = ${betterBounds}`)

    bounds = pentagon.calculateBounds()
    const maxBounds = pentagon.calculateMaxBounds()
    assert.ok(maxBounds[2]! - maxBounds[0]! > bounds[2]! - bounds[0]!)
  })

  test('centerTest', () => {
    assertPointsEqualish(new Point(0, 0), new Point(square.centerX, square.centerY))
  })

  test('transformTest', () => {
    // Con la identidad, la forma no cambia.
    const squareCopy = square.transformed(identityTransform())
    assert.equal(squareCopy.cubics.length, square.cubics.length)
    square.cubics.forEach((c, i) => assertCubicsEqualish(c, squareCopy.cubics[i]!))

    // Trasladada en (1, 2), cada punto se traslada igual.
    const offset = new Point(1, 2)
    const translated = square.transformed(translateTransform(offset.x, offset.y)).cubics
    square.cubics.forEach((c, i) => {
      const t = translated[i]!
      assertPointsEqualish(anchor0(c).plus(offset), anchor0(t))
      assertPointsEqualish(control0(c).plus(offset), control0(t))
      assertPointsEqualish(control1(c).plus(offset), control1(t))
      assertPointsEqualish(anchor1(c).plus(offset), anchor1(t))
    })
  })

  const nonzeroCubics = (original: readonly Cubic[]) => original.filter((c) => !c.zeroLength())

  test('featuresTest', () => {
    // Las curvas del polígono son las curvas no nulas de sus características (con tolerancia:
    // algunos puntos se ajustan al armar la lista).
    assertCubicListsEqualish(square.cubics, nonzeroCubics(square.features.flatMap((f) => f.cubics)))

    const squareCopy = RoundedPolygon.copy(square)
    assertCubicListsEqualish(squareCopy.cubics, nonzeroCubics(squareCopy.features.flatMap((f) => f.cubics)))
  })

  test('emptyPolygonTest', () => {
    const poly = RoundedPolygon.fromNumVertices(6, { radius: 0, rounding: new CornerRounding(0.1) })
    assert.equal(poly.cubics.length, 1)

    const stillEmpty = poly.transformed(scaleTransform(10, 20))
    assert.equal(stillEmpty.cubics.length, 1)
    assert.ok(stillEmpty.cubics[0]!.zeroLength())
  })

  test('emptySideTest', () => {
    // Triángulo con un punto repetido y el mismo triángulo sin repetir.
    const poly1 = RoundedPolygon.fromVertices([0, 0, 1, 0, 1, 0, 0, 1])
    const poly2 = RoundedPolygon.fromVertices([0, 0, 1, 0, 0, 1])
    assertCubicListsEqualish(poly1.cubics, poly2.cubics)
  })
})

// --- RoundedPolygonTest.kt ---

describe('RoundedPolygonTest', () => {
  const rounding = new CornerRounding(0.1)
  const perVtxRounded = [rounding, rounding, rounding, rounding]

  test('numVertsConstructorTest', () => {
    assert.throws(() => RoundedPolygon.fromNumVertices(2))

    assertInBounds(RoundedPolygon.fromNumVertices(4).cubics, new Point(-1, -1), new Point(1, 1))
    assertInBounds(RoundedPolygon.fromNumVertices(4, { radius: 2 }).cubics, new Point(-2, -2), new Point(2, 2))
    assertInBounds(RoundedPolygon.fromNumVertices(4, { rounding }).cubics, new Point(-1, -1), new Point(1, 1))
    assertInBounds(
      RoundedPolygon.fromNumVertices(4, { perVertexRounding: perVtxRounded }).cubics,
      new Point(-1, -1),
      new Point(1, 1),
    )
  })

  test('verticesConstructorTest', () => {
    const p0 = new Point(1, 0)
    const p1 = new Point(0, 1)
    const p2 = new Point(-1, 0)
    const p3 = new Point(0, -1)
    const verts = [p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y]

    assert.throws(() => RoundedPolygon.fromVertices([p0.x, p0.y, p1.x, p1.y]))

    assertInBounds(RoundedPolygon.fromVertices(verts).cubics, new Point(-1, -1), new Point(1, 1))

    const offset = new Point(1, 2)
    const offsetVerts = verts.map((v, i) => v + (i % 2 === 0 ? offset.x : offset.y))
    const manualSquareOffset = RoundedPolygon.fromVertices(offsetVerts, { centerX: offset.x, centerY: offset.y })
    assertInBounds(manualSquareOffset.cubics, new Point(0, 1), new Point(2, 3))

    assertInBounds(RoundedPolygon.fromVertices(verts, { rounding }).cubics, new Point(-1, -1), new Point(1, 1))
    assertInBounds(
      RoundedPolygon.fromVertices(verts, { perVertexRounding: perVtxRounded }).cubics,
      new Point(-1, -1),
      new Point(1, 1),
    )
  })

  test('featuresConstructorThrowsForTooFewFeatures', () => {
    assert.throws(() => RoundedPolygon.fromFeatures([]))
    const corner = new Corner([Cubic.empty(0, 0)])
    assert.throws(() => RoundedPolygon.fromFeatures([corner]))
  })

  test('featuresConstructorThrowsForNonContinuousFeatures', () => {
    const cubic1 = Cubic.straightLine(0, 0, 1, 0)
    const cubic2 = Cubic.straightLine(10, 10, 20, 20)
    assert.throws(() => RoundedPolygon.fromFeatures([Feature.buildEdge(cubic1), Feature.buildEdge(cubic2)]))
  })

  test('featuresConstructorReconstructsSquare', () => {
    const base = rectangle()
    assertPolygonsEqualish(base, RoundedPolygon.fromFeatures(base.features))
  })

  test('featuresConstructorReconstructsRoundedSquare', () => {
    const base = rectangle({ rounding: new CornerRounding(0.5, 0.2) })
    assertPolygonsEqualish(base, RoundedPolygon.fromFeatures(base.features))
  })

  test('featuresConstructorReconstructsCircles', () => {
    for (let i = 3; i <= 20; i++) {
      const base = circle({ numVertices: i })
      assertPolygonsEqualish(base, RoundedPolygon.fromFeatures(base.features))
    }
  })

  test('featuresConstructorReconstructsStars', () => {
    for (let i = 3; i <= 20; i++) {
      const base = star(i)
      assertPolygonsEqualish(base, RoundedPolygon.fromFeatures(base.features))
    }
  })

  test('featuresConstructorReconstructsRoundedStars', () => {
    for (let i = 3; i <= 20; i++) {
      const base = star(i, { rounding: new CornerRounding(0.5, 0.2) })
      assertPolygonsEqualish(base, RoundedPolygon.fromFeatures(base.features))
    }
  })

  test('featuresConstructorReconstructsPill', () => {
    const base = pill()
    assertPolygonsEqualish(base, RoundedPolygon.fromFeatures(base.features))
  })

  test('featuresConstructorReconstructsPillStar', () => {
    const base = pillStar({ rounding: new CornerRounding(0.5, 0.2) })
    assertPolygonsEqualish(base, RoundedPolygon.fromFeatures(base.features))
  })

  test('computeCenterTest', () => {
    const polygon = RoundedPolygon.fromVertices([0, 0, 1, 0, 0, 1, 1, 1])
    assertEqualsEps(0.5, polygon.centerX, 1e-4)
    assertEqualsEps(0.5, polygon.centerY, 1e-4)
  })

  test('roundingSpaceUsageTest', () => {
    const polygon = RoundedPolygon.fromVertices([0, 0, 1, 0, 0.5, 1], {
      perVertexRounding: [new CornerRounding(1, 0), new CornerRounding(1, 1), CornerRounding.Unrounded],
    })

    // El lado de p0 a p1 no alcanza ni para los redondeos, así que no se suaviza: las esquinas
    // terminan en el punto medio.
    const lowerEdgeFeature = polygon.features.find((f) => f instanceof Edge)!
    assert.equal(lowerEdgeFeature.cubics.length, 1)

    const lowerEdge = lowerEdgeFeature.cubics[0]!
    assertEqualish(0.5, lowerEdge.anchor0X)
    assertEqualish(0.0, lowerEdge.anchor0Y)
    assertEqualish(0.5, lowerEdge.anchor1X)
    assertEqualish(0.0, lowerEdge.anchor1Y)
  })
})

// --- ShapesTest.kt ---

describe('ShapesTest', () => {
  const Zero = new Point(0, 0)
  const ShapesEpsilon = 0.01

  const dist = (start: Point, end: Point) => end.minus(start).getDistance()

  function assertPointOnRadii(point: Point, radius1: number, radius2 = radius1, center = Zero) {
    const d = dist(center, point)
    if (Math.abs(radius1 - d) > ShapesEpsilon) assertEqualsEps(radius2, d, ShapesEpsilon)
  }
  function assertCubicOnRadii(cubic: Cubic, radius1: number, radius2 = radius1, center = Zero) {
    assertPointOnRadii(anchor0(cubic), radius1, radius2, center)
    assertPointOnRadii(anchor1(cubic), radius1, radius2, center)
  }
  function assertCircularCubic(cubic: Cubic, radius: number, center: Point) {
    for (let t = 0; t <= 1; t += 0.1) {
      assertEqualsEps(radius, dist(center, cubic.pointOnCurve(t)), ShapesEpsilon)
    }
  }
  function assertCircleShape(shape: readonly Cubic[], radius = 1, center = Zero) {
    for (const cubic of shape) assertCircularCubic(cubic, radius, center)
  }

  test('circleTest', () => {
    assert.throws(() => circle({ numVertices: 2 }))

    assertCircleShape(circle().cubics)
    assertCircleShape(circle({ numVertices: 3 }).cubics)
    assertCircleShape(circle({ numVertices: 20 }).cubics)
    assertCircleShape(circle({ radius: 3 }).cubics, 3)

    const center = new Point(1, 2)
    assertCircleShape(circle({ centerX: center.x, centerY: center.y }).cubics, 1, center)
  })

  test('starTest', () => {
    let s = star(4, { innerRadius: 0.5 })
    for (const cubic of s.cubics) assertCubicOnRadii(cubic, 1, 0.5)

    const center = new Point(1, 2)
    s = star(4, { innerRadius: 0.5, centerX: center.x, centerY: center.y })
    for (const cubic of s.cubics) assertCubicOnRadii(cubic, 1, 0.5, center)

    s = star(4, { radius: 4, innerRadius: 2 })
    for (const cubic of s.cubics) assertCubicOnRadii(cubic, 4, 2)
  })

  test('roundedStarTest', () => {
    const rounding = new CornerRounding(0.1)
    const innerRounding = new CornerRounding(0.2)
    const perVtxRounded = [rounding, innerRounding, rounding, innerRounding, rounding, innerRounding, rounding, innerRounding]
    const min = new Point(-1, -1)
    const max = new Point(1, 1)

    assertInBounds(star(4, { innerRadius: 0.5, rounding }).cubics, min, max)
    assertInBounds(star(4, { innerRadius: 0.5, innerRounding }).cubics, min, max)
    assertInBounds(star(4, { innerRadius: 0.5, rounding, innerRounding }).cubics, min, max)
    assertInBounds(star(4, { innerRadius: 0.5, perVertexRounding: perVtxRounded }).cubics, min, max)

    assert.throws(() => star(6, { innerRadius: 0.5, perVertexRounding: perVtxRounded }))
  })
})
