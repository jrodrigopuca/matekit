/*
 * Copyright 2023-2024 The Android Open Source Project
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
// MorphTest.kt (2024), FeatureMappingTest.kt (2024), FloatMappingTest.kt (2023) y
// PolygonMeasureTest.kt (2023). Un `describe` por archivo, con los nombres de las pruebas del
// original. Las que el original saltea en JS por redondeo de Float (`@IgnoreJsTarget`:
// featureMappingDoesNotCrash, sourceWrapsTest y multiplePointTest) acá corren: los números son
// de 64 bits.
// Uso: pnpm test:tokens

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { CornerRounding } from '../scripts/lib/shapes/CornerRounding.ts'
import { Cubic } from '../scripts/lib/shapes/Cubic.ts'
import { Feature } from '../scripts/lib/shapes/Features.ts'
import { doMapping, featureDistSquared } from '../scripts/lib/shapes/FeatureMapping.ts'
import { DoubleMapper } from '../scripts/lib/shapes/FloatMapping.ts'
import { Morph } from '../scripts/lib/shapes/Morph.ts'
import { LengthMeasurer, MeasuredPolygon } from '../scripts/lib/shapes/PolygonMeasure.ts'
import { RoundedPolygon } from '../scripts/lib/shapes/RoundedPolygon.ts'
import { circle, star } from '../scripts/lib/shapes/Shapes.ts'

// --- TestUtils.kt (lo que usan estas pruebas) ---

const Epsilon = 1e-4
const equalish = (f0: number, f1: number, epsilon: number) => Math.abs(f0 - f1) < epsilon
const cubicsEqualish = (c0: Cubic, c1: Cubic) => c0.points.every((v, i) => equalish(v, c1.points[i]!, Epsilon))
function assertEqualish(expected: number, actual: number, message?: string) {
  assert.ok(Math.abs(expected - actual) <= Epsilon, `${message ?? ''} esperado ${expected}, fue ${actual}`)
}

// --- MorphTest.kt ---

describe('MorphTest', () => {
  const poly1 = RoundedPolygon.fromNumVertices(3, { centerX: 0.5, centerY: 0.5 })
  const poly2 = RoundedPolygon.fromNumVertices(4, { centerX: 0.5, centerY: 0.5 })
  const morph11 = new Morph(poly1, poly1)
  // En el original se construye y no se usa en ninguna prueba; construirlo ya prueba que no falla.
  const morph12 = new Morph(poly1, poly2)

  // Un Morph con la misma forma al principio y al final tiene curvas equivalentes a las de la
  // forma. La estructura puede no coincidir exactamente (el Morph puede descartar curvas de largo
  // cero), pero cada curva del Morph tiene que estar en la forma.
  test('cubicsTest', () => {
    const p1Cubics = poly1.cubics
    const cubics11 = morph11.asCubics(0)
    assert.ok(cubics11.length > 0)
    for (const morphCubic of cubics11) {
      assert.ok(p1Cubics.some((p1Cubic) => cubicsEqualish(morphCubic, p1Cubic)))
    }
    assert.ok(morph12.morphMatch.length > 0)
  })
})

// --- FeatureMappingTest.kt ---

describe('FeatureMappingTest', () => {
  const triangleWithRoundings = RoundedPolygon.fromNumVertices(3, { rounding: new CornerRounding(0.2) })
  const triangle = RoundedPolygon.fromNumVertices(3)
  const square = RoundedPolygon.fromNumVertices(4)

  function verifyMapping(p1: RoundedPolygon, p2: RoundedPolygon, validator: (distances: number[]) => void) {
    const f1 = MeasuredPolygon.measurePolygon(new LengthMeasurer(), p1).features
    const f2 = MeasuredPolygon.measurePolygon(new LengthMeasurer(), p2).features
    // Lleva el progreso en p1 al progreso en p2.
    const map = doMapping(f1, f2)
    // Qué características se emparejaron y la distancia entre sus puntos representativos.
    const distances = map.map(([progress1, progress2]) => {
      const feature1 = f1.find((it) => it.progress === progress1)!
      const feature2 = f2.find((it) => it.progress === progress2)!
      return featureDistSquared(feature1.feature, feature2.feature)
    })
    validator(distances.toSorted((a, b) => b - a))
  }

  test('featureMappingTriangles', () =>
    verifyMapping(triangleWithRoundings, triangle, (distances) => {
      for (const it of distances) assert.ok(it < 0.1)
    }))

  test('featureMappingTriangleToSquare', () =>
    verifyMapping(triangle, square, (distances) => {
      // Una coincidencia exacta (las dos tienen un vértice en 0°) y dos cercanas.
      assert.equal(distances.length, 3)
      assertEqualish(distances[0]!, distances[1]!)
      assert.ok(distances[0]! < 0.3)
      assert.ok(distances[2]! < 1e-6)
    }))

  test('featureMappingSquareToTriangle', () =>
    verifyMapping(square, triangle, (distances) => {
      assert.equal(distances.length, 3)
      assertEqualish(distances[0]!, distances[1]!)
      assert.ok(distances[0]! < 0.3)
      assert.ok(distances[2]! < 1e-6)
    }))

  test('featureMappingDoesNotCrash', () => {
    // Formas complicadas que antes hacían fallar el emparejamiento.
    const checkmark = RoundedPolygon.fromVertices([400, -304, 240, -464, 296, -520, 400, -416, 664, -680, 720, -624, 400, -304]).normalized()
    const verySunny = star(8, { innerRadius: 0.65, rounding: new CornerRounding(0.15) }).normalized()
    verifyMapping(checkmark, verySunny, (it) => {
      // La mayoría de los vértices del checkmark se emparejan con una característica de la otra forma…
      assert.ok(it.length >= 6)
      // …y bastante cerca.
      assert.ok(it[0]! < 0.15)
    })
  })
})

// --- FloatMappingTest.kt ---

describe('FloatMappingTest', () => {
  function validateMapping(mapper: DoubleMapper, expectedFunction: (x: number) => number) {
    for (let i = 0; i <= 9999; i++) {
      const source = i / 10000
      const target = expectedFunction(source)
      assertEqualish(target, mapper.map(source))
      assertEqualish(source, mapper.mapBack(target))
    }
  }

  test('identityMappingTest', () => validateMapping(DoubleMapper.Identity, (it) => it))

  test('simpleMappingTest', () =>
    // La primera mitad del origen va al primer cuarto del destino.
    validateMapping(new DoubleMapper([0, 0], [0.5, 0.25]), (x) => (x < 0.5 ? x / 2 : (3 * x - 1) / 2)))

  test('targetWrapsTest', () =>
    // Suma 0,5.
    validateMapping(new DoubleMapper([0, 0.5], [0.1, 0.6]), (x) => (x + 0.5) % 1))

  test('sourceWrapsTest', () =>
    // El origen da la vuelta (sigue siendo «+ 0,5»).
    validateMapping(new DoubleMapper([0.5, 0], [0.1, 0.6]), (x) => (x + 0.5) % 1))

  test('bothWrapTest', () =>
    // La identidad.
    validateMapping(new DoubleMapper([0.5, 0.5], [0.75, 0.75], [0.1, 0.1], [0.49, 0.49]), (it) => it))

  test('multiplePointTest', () =>
    validateMapping(new DoubleMapper([0.4, 0.2], [0.5, 0.22], [0, 0.8]), (x) => {
      if (x < 0.4) return (0.8 + x) % 1
      if (x < 0.5) return 0.2 + (x - 0.4) / 5
      // Un cambio de 0,5 en el origen es uno de 0,58 en el destino: de ahí el 1,16.
      return 0.22 + (x - 0.5) * 1.16
    }))

  test('targetDoubleWrapThrows', () => {
    assert.throws(() => new DoubleMapper([0, 0], [0.3, 0.6], [0.6, 0.3], [0.9, 0.9]))
  })

  test('sourceDoubleWrapThrows', () => {
    assert.throws(() => new DoubleMapper([0, 0], [0.6, 0.3], [0.3, 0.6], [0.9, 0.9]))
  })
})

// --- PolygonMeasureTest.kt ---

describe('PolygonMeasureTest', () => {
  const measurer = new LengthMeasurer()

  function irregularPolygonMeasure(polygon: RoundedPolygon, extraChecks: (m: MeasuredPolygon) => void = () => {}) {
    const measuredPolygon = MeasuredPolygon.measurePolygon(measurer, polygon)

    assert.equal(measuredPolygon.get(0).startOutlineProgress, 0)
    assert.equal(measuredPolygon.get(measuredPolygon.size - 1).endOutlineProgress, 1)

    ;[...measuredPolygon].forEach((measuredCubic, index) => {
      if (index > 0) assert.equal(measuredCubic.startOutlineProgress, measuredPolygon.get(index - 1).endOutlineProgress)
      assert.ok(measuredCubic.endOutlineProgress >= measuredCubic.startOutlineProgress)
    })

    measuredPolygon.features.forEach((progressableFeature, index) => {
      assert.ok(
        progressableFeature.progress >= 0 && progressableFeature.progress < 1,
        `Feature #${index} has invalid progress: ${progressableFeature.progress}`,
      )
    })

    extraChecks(measuredPolygon)
  }

  function regularPolygonMeasure(sides: number, rounding: CornerRounding = CornerRounding.Unrounded) {
    irregularPolygonMeasure(RoundedPolygon.fromNumVertices(sides, { rounding }), (measuredPolygon) => {
      assert.equal(measuredPolygon.size, sides)
      ;[...measuredPolygon].forEach((measuredCubic, index) => {
        assertEqualish(index / sides, measuredCubic.startOutlineProgress)
      })
    })
  }

  function customPolygonMeasure(polygon: RoundedPolygon, progresses: readonly number[]) {
    irregularPolygonMeasure(polygon, (measuredPolygon) => {
      assert.equal(measuredPolygon.size, progresses.length)
      ;[...measuredPolygon].forEach((measuredCubic, index) => {
        assertEqualish(progresses[index]!, measuredCubic.endOutlineProgress - measuredCubic.startOutlineProgress)
      })
    })
  }

  test('measureSharpTriangle', () => regularPolygonMeasure(3))
  test('measureSharpPentagon', () => regularPolygonMeasure(5))
  test('measureSharpOctagon', () => regularPolygonMeasure(8))
  test('measureSharpDodecagon', () => regularPolygonMeasure(12))
  test('measureSharpIcosagon', () => regularPolygonMeasure(20))

  test('measureSlightlyRoundedHexagon', () => {
    irregularPolygonMeasure(RoundedPolygon.fromNumVertices(6, { rounding: new CornerRounding(0.15) }))
  })

  test('measureMediumRoundedHexagon', () => {
    irregularPolygonMeasure(RoundedPolygon.fromNumVertices(6, { rounding: new CornerRounding(0.5) }))
  })

  test('measureMaximumRoundedHexagon', () => {
    irregularPolygonMeasure(RoundedPolygon.fromNumVertices(6, { rounding: new CornerRounding(1) }))
  })

  test('measureCircle', () => {
    // De caja blanca: el medidor aproxima los arcos con segmentos rectos; con la cantidad
    // elegida, el largo tiene que quedar a menos de 1,5 % del real.
    const polygon = circle({ numVertices: 4 })
    const actualLength = polygon.cubics.reduce((sum, it) => sum + new LengthMeasurer().measureCubic(it), 0)
    const expectedLength = 2 * Math.PI
    assert.ok(Math.abs(expectedLength - actualLength) <= 0.015 * expectedLength)
  })

  test('irregularTriangleAngleMeasure', () =>
    irregularPolygonMeasure(
      RoundedPolygon.fromVertices([0, -1, 1, 1, 0, 0.5, -1, 1], {
        perVertexRounding: [
          new CornerRounding(0.2, 0.5),
          new CornerRounding(0.2, 0.5),
          new CornerRounding(0.4, 0),
          new CornerRounding(0.2, 0.5),
        ],
      }),
    ))

  test('quarterAngleMeasure', () =>
    irregularPolygonMeasure(
      RoundedPolygon.fromVertices([-1, -1, 1, -1, 1, 1, -1, 1], {
        perVertexRounding: [CornerRounding.Unrounded, CornerRounding.Unrounded, new CornerRounding(0.5, 0.5), CornerRounding.Unrounded],
      }),
    ))

  test('hourGlassMeasure', () => {
    // Regresión: el medidor anterior (AngleMeasurer) salteaba los lados diagonales, que forman
    // 0° con el centro.
    const unit = 1
    const coordinates = [
      // Vaso de abajo.
      0, 0, unit, unit, -unit, unit,
      // Vaso de arriba.
      0, 0, -unit, -unit, unit, -unit,
    ]
    const diagonal = Math.sqrt(unit * unit + unit * unit)
    const horizontal = 2 * unit
    const total = 4 * diagonal + 2 * horizontal
    customPolygonMeasure(RoundedPolygon.fromVertices(coordinates), [
      diagonal / total,
      horizontal / total,
      diagonal / total,
      diagonal / total,
      horizontal / total,
      diagonal / total,
    ])
  })

  test('handlesEmptyFeatureLast', () => {
    const triangle = RoundedPolygon.fromFeatures([
      Feature.buildConvexCorner([Cubic.straightLine(0, 0, 1, 1)]),
      Feature.buildConvexCorner([Cubic.straightLine(1, 1, 1, 0)]),
      Feature.buildConvexCorner([Cubic.straightLine(1, 0, 0, 0)]),
      // Característica vacía al final.
      Feature.buildConvexCorner([Cubic.straightLine(0, 0, 0, 0)]),
    ])
    irregularPolygonMeasure(triangle)
  })
})
