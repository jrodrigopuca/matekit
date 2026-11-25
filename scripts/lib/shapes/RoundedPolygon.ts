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

// Portado a TypeScript de androidx/androidx@b842c5b3a5,
// graphics/graphics-shapes/src/commonMain/kotlin/androidx/graphics/shapes/RoundedPolygon.kt
// (ADR-0011).
//
// Diferencias con el original:
// - Las funciones `RoundedPolygon(…)` sobrecargadas son métodos estáticos:
//   `fromNumVertices`, `fromVertices`, `fromFeatures` y `copy`. Los parámetros con nombre van en
//   un objeto de opciones.
// - En `fromVertices`, el centro sin definir es `undefined` en lugar del centinela
//   `Float.MIN_VALUE`; el resultado es el mismo (se calcula el promedio de los vértices).
// - `equals` compara las características por identidad de sus curvas, como hace Kotlin con las
//   clases que no son `data class`.

import { CornerRounding } from './CornerRounding.ts'
import { Cubic, type PointTransformer } from './Cubic.ts'
import { Corner, Edge, type Feature } from './Features.ts'
import { Point, interpolatePoint } from './Point.ts'
import {
  DistanceEpsilon,
  FloatMinValue,
  FloatPi,
  convex,
  directionVector,
  distance,
  distanceSquared,
  radialToCartesian,
  square,
} from './Utils.ts'

/**
 * Polígono con los vértices redondeados (o no), representado como una lista de curvas cúbicas
 * cerrada. Se arma con la cantidad de vértices o con la lista de vértices.
 */
export class RoundedPolygon {
  readonly features: readonly Feature[]
  readonly center: Point
  /** Las curvas de las características en una sola lista, sin las de largo cero. */
  readonly cubics: readonly Cubic[]

  constructor(features: readonly Feature[], center: Point) {
    this.features = features
    this.center = center
    this.cubics = buildCubics(features, center)

    let prevCubic = this.cubics[this.cubics.length - 1]!
    for (const cubic of this.cubics) {
      if (
        Math.abs(cubic.anchor0X - prevCubic.anchor1X) > DistanceEpsilon ||
        Math.abs(cubic.anchor0Y - prevCubic.anchor1Y) > DistanceEpsilon
      ) {
        throw new Error(
          'RoundedPolygon must be contiguous, with the anchor points of all curves ' +
            'matching the anchor points of the preceding and succeeding cubics',
        )
      }
      prevCubic = cubic
    }
  }

  get centerX(): number {
    return this.center.x
  }

  get centerY(): number {
    return this.center.y
  }

  /** Polígono con cada punto (y el centro) transformado por `f`. */
  transformed(f: PointTransformer): RoundedPolygon {
    const center = this.center.transformed(f)
    return new RoundedPolygon(
      this.features.map((feature) => feature.transformed(f)),
      center,
    )
  }

  /**
   * Mueve y escala el polígono para que entre en el cuadrado de (0, 0) a (1, 1), centrado en la
   * dirección que sobre espacio. Usa el rectángulo aproximado (con los puntos de control).
   */
  normalized(): RoundedPolygon {
    const bounds = this.calculateBounds()
    const width = bounds[2]! - bounds[0]!
    const height = bounds[3]! - bounds[1]!
    const side = Math.max(width, height)
    // Centrar la forma si el rectángulo no es un cuadrado.
    const offsetX = (side - width) / 2 - bounds[0]! /* left */
    const offsetY = (side - height) / 2 - bounds[1]! /* top */
    return this.transformed((x, y) => [(x + offsetX) / side, (y + offsetY) / side])
  }

  toString(): string {
    return (
      '[RoundedPolygon.' +
      ' Cubics = ' +
      this.cubics.join(', ') +
      ' || Features = ' +
      this.features.join(', ') +
      ` || Center = (${this.centerX}, ${this.centerY})]`
    )
  }

  /**
   * Cuadrado que contiene la forma en cualquier rotación, alrededor del centro: mide la distancia
   * del centro al inicio y al punto medio de cada curva.
   */
  calculateMaxBounds(bounds: number[] = [0, 0, 0, 0]): number[] {
    if (bounds.length < 4) throw new Error('Required bounds size of 4')
    let maxDistSquared = 0
    for (const cubic of this.cubics) {
      const anchorDistance = distanceSquared(cubic.anchor0X - this.centerX, cubic.anchor0Y - this.centerY)
      const middlePoint = cubic.pointOnCurve(0.5)
      const middleDistance = distanceSquared(middlePoint.x - this.centerX, middlePoint.y - this.centerY)
      maxDistSquared = Math.max(maxDistSquared, Math.max(anchorDistance, middleDistance))
    }
    const d = Math.sqrt(maxDistSquared)
    bounds[0] = this.centerX - d
    bounds[1] = this.centerY - d
    bounds[2] = this.centerX + d
    bounds[3] = this.centerY + d
    return bounds
  }

  /**
   * Rectángulo que contiene la forma: [izquierda, arriba, derecha, abajo]. Con `approximate` (por
   * defecto), el de todos los anclajes y puntos de control.
   */
  calculateBounds(bounds: number[] = [0, 0, 0, 0], approximate = true): number[] {
    if (bounds.length < 4) throw new Error('Required bounds size of 4')
    let minX = Number.MAX_VALUE
    let minY = Number.MAX_VALUE
    // Como en el original: el máximo arranca en el menor positivo (ver FloatMinValue).
    let maxX = FloatMinValue
    let maxY = FloatMinValue
    for (const cubic of this.cubics) {
      cubic.calculateBounds(bounds, approximate)
      minX = Math.min(minX, bounds[0]!)
      minY = Math.min(minY, bounds[1]!)
      maxX = Math.max(maxX, bounds[2]!)
      maxY = Math.max(maxY, bounds[3]!)
    }
    bounds[0] = minX
    bounds[1] = minY
    bounds[2] = maxX
    bounds[3] = maxY
    return bounds
  }

  equals(other: unknown): boolean {
    if (this === other) return true
    if (!(other instanceof RoundedPolygon)) return false
    return this.features.length === other.features.length && this.features.every((f, i) => f === other.features[i])
  }

  /**
   * Polígono regular de `numVertices` vértices sobre un círculo de radio `radius` (1 por
   * defecto, así que mide 2 de ancho), con el primer vértice a la derecha del centro.
   */
  static fromNumVertices(
    numVertices: number,
    {
      radius = 1,
      centerX = 0,
      centerY = 0,
      rounding = CornerRounding.Unrounded,
      perVertexRounding,
    }: {
      radius?: number | undefined
      centerX?: number | undefined
      centerY?: number | undefined
      rounding?: CornerRounding | undefined
      perVertexRounding?: readonly CornerRounding[] | undefined
    } = {},
  ): RoundedPolygon {
    return RoundedPolygon.fromVertices(verticesFromNumVerts(numVertices, radius, centerX, centerY), {
      rounding,
      perVertexRounding,
      centerX,
      centerY,
    })
  }

  /** Copia de `source`. */
  static copy(source: RoundedPolygon): RoundedPolygon {
    return new RoundedPolygon(source.features, source.center)
  }

  /**
   * Polígono con los vértices dados (pares x, y, en orden), redondeados con `rounding` o, uno
   * por uno, con `perVertexRounding`. Sin centro, se usa el promedio de los vértices.
   */
  static fromVertices(
    vertices: ArrayLike<number>,
    {
      rounding = CornerRounding.Unrounded,
      perVertexRounding,
      centerX,
      centerY,
    }: {
      rounding?: CornerRounding | undefined
      perVertexRounding?: readonly CornerRounding[] | undefined
      centerX?: number | undefined
      centerY?: number | undefined
    } = {},
  ): RoundedPolygon {
    if (vertices.length < 6) throw new Error('Polygons must have at least 3 vertices')
    if (vertices.length % 2 === 1) throw new Error('The vertices array should have even size')
    if (perVertexRounding !== undefined && perVertexRounding.length * 2 !== vertices.length) {
      throw new Error(
        'perVertexRounding list should be either null or ' +
          'the same size as the number of vertices (vertices.size / 2)',
      )
    }
    const v = (i: number) => vertices[i]!
    const corners: Cubic[][] = []
    const n = vertices.length / 2
    const roundedCorners: RoundedCorner[] = []
    for (let i = 0; i < n; i++) {
      const vtxRounding = perVertexRounding?.[i] ?? rounding
      const prevIndex = ((i + n - 1) % n) * 2
      const nextIndex = ((i + 1) % n) * 2
      roundedCorners.push(
        new RoundedCorner(
          new Point(v(prevIndex), v(prevIndex + 1)),
          new Point(v(i * 2), v(i * 2 + 1)),
          new Point(v(nextIndex), v(nextIndex + 1)),
          vtxRounding,
        ),
      )
    }

    // Para cada lado, ver si alcanza el espacio para los cortes que piden sus dos esquinas; si
    // no, repartirlo: primero para el redondeo y, si sobra, para el suavizado. Cada par dice qué
    // parte se puede usar del corte de redondeo y qué parte del corte con suavizado, en el lado
    // que va de la esquina ix a la ix + 1.
    const cutAdjusts: Array<[number, number]> = []
    for (let ix = 0; ix < n; ix++) {
      const expectedRoundCut = roundedCorners[ix]!.expectedRoundCut + roundedCorners[(ix + 1) % n]!.expectedRoundCut
      const expectedCut = roundedCorners[ix]!.expectedCut + roundedCorners[(ix + 1) % n]!.expectedCut
      const vtxX = v(ix * 2)
      const vtxY = v(ix * 2 + 1)
      const nextVtxX = v(((ix + 1) % n) * 2)
      const nextVtxY = v(((ix + 1) % n) * 2 + 1)
      const sideSize = distance(vtxX - nextVtxX, vtxY - nextVtxY)

      if (expectedRoundCut > sideSize) {
        // No alcanza ni para redondear del todo.
        cutAdjusts.push([sideSize / expectedRoundCut, 0])
      } else if (expectedCut > sideSize) {
        // Alcanza para redondear, no para suavizar del todo.
        cutAdjusts.push([1, (sideSize - expectedRoundCut) / (expectedCut - expectedRoundCut)])
      } else {
        // Alcanza para las dos cosas.
        cutAdjusts.push([1, 1])
      }
    }
    // Las curvas de cada esquina (redondeada o no).
    for (let i = 0; i < n; i++) {
      // allowedCuts[0]: lado de la esquina anterior a esta; allowedCuts[1]: de esta a la siguiente.
      const allowedCuts: number[] = []
      for (let delta = 0; delta <= 1; delta++) {
        const [roundCutRatio, cutRatio] = cutAdjusts[(i + n - 1 + delta) % n]!
        const corner = roundedCorners[i]!
        allowedCuts.push(
          corner.expectedRoundCut * roundCutRatio + (corner.expectedCut - corner.expectedRoundCut) * cutRatio,
        )
      }
      corners.push(roundedCorners[i]!.getCubics(allowedCuts[0]!, allowedCuts[1]!))
    }
    // Las características: cada esquina y el lado recto que la une con la siguiente.
    const tempFeatures: Feature[] = []
    for (let i = 0; i < n; i++) {
      const prevVtxIndex = (i + n - 1) % n
      const nextVtxIndex = (i + 1) % n
      const currVertex = new Point(v(i * 2), v(i * 2 + 1))
      const prevVertex = new Point(v(prevVtxIndex * 2), v(prevVtxIndex * 2 + 1))
      const nextVertex = new Point(v(nextVtxIndex * 2), v(nextVtxIndex * 2 + 1))
      const isConvex = convex(prevVertex, currVertex, nextVertex)
      tempFeatures.push(new Corner(corners[i]!, isConvex))
      const last = corners[i]!.at(-1)!
      const nextFirst = corners[(i + 1) % n]![0]!
      tempFeatures.push(new Edge([Cubic.straightLine(last.anchor1X, last.anchor1Y, nextFirst.anchor0X, nextFirst.anchor0Y)]))
    }

    const c = centerX === undefined || centerY === undefined ? calculateCenter(vertices) : new Point(centerX, centerY)
    return RoundedPolygon.fromFeatures(tempFeatures, { centerX: c.x, centerY: c.y })
  }

  /**
   * Polígono a partir de sus características. Sin centro, se usa el promedio de los anclajes de
   * todas las curvas.
   */
  static fromFeatures(
    features: readonly Feature[],
    { centerX = Number.NaN, centerY = Number.NaN }: { centerX?: number | undefined; centerY?: number | undefined } = {},
  ): RoundedPolygon {
    if (features.length < 2) throw new Error('Polygons must have at least 2 features')

    const vertices: number[] = []
    for (const feature of features) {
      for (const cubic of feature.cubics) {
        vertices.push(cubic.anchor0X, cubic.anchor0Y)
      }
    }

    const cX = Number.isNaN(centerX) ? calculateCenter(vertices).x : centerX
    const cY = Number.isNaN(centerY) ? calculateCenter(vertices).y : centerY

    return new RoundedPolygon(features, new Point(cX, cY))
  }
}

/**
 * La lista de curvas del polígono. El primer y el último anclaje coinciden exactamente (una
 * diferencia mínima puede dejar marcas al dibujar) y se descartan las curvas de largo cero.
 */
function buildCubics(features: readonly Feature[], center: Point): Cubic[] {
  const out: Cubic[] = []
  let firstCubic: Cubic | undefined
  let lastCubic: Cubic | undefined
  let firstFeatureSplitStart: Cubic[] | undefined
  let firstFeatureSplitEnd: Cubic[] | undefined
  const first = features[0]
  if (first && first.cubics.length === 3) {
    // Si la primera característica es una esquina con suavizado, el contorno empieza en la
    // mitad de su arco central.
    const [start, end] = first.cubics[1]!.split(0.5)
    firstFeatureSplitStart = [first.cubics[0]!, start]
    firstFeatureSplitEnd = [end, first.cubics[2]!]
  }
  // Una vuelta de más para sumar al final la primera mitad de la primera característica.
  for (let i = 0; i <= features.length; i++) {
    let featureCubics: readonly Cubic[]
    if (i === 0 && firstFeatureSplitEnd) featureCubics = firstFeatureSplitEnd
    else if (i === features.length) {
      if (firstFeatureSplitStart) featureCubics = firstFeatureSplitStart
      else break
    } else featureCubics = features[i]!.cubics
    for (const cubic of featureCubics) {
      // Las curvas de largo cero no suman nada y pueden dejar marcas al dibujar.
      if (!cubic.zeroLength()) {
        if (lastCubic) out.push(lastCubic)
        lastCubic = cubic
        firstCubic ??= cubic
      } else if (lastCubic) {
        // Varias curvas casi nulas seguidas pueden acumular un salto: la última curva termina
        // siempre en el anclaje más reciente. Se copia antes de modificarla.
        lastCubic = new Cubic(lastCubic.points.slice())
        lastCubic.points[6] = cubic.anchor1X
        lastCubic.points[7] = cubic.anchor1Y
      }
    }
  }
  if (lastCubic && firstCubic) {
    out.push(
      Cubic.of(
        lastCubic.anchor0X,
        lastCubic.anchor0Y,
        lastCubic.control0X,
        lastCubic.control0Y,
        lastCubic.control1X,
        lastCubic.control1Y,
        firstCubic.anchor0X,
        firstCubic.anchor0Y,
      ),
    )
  } else {
    // Polígono vacío o de tamaño cero.
    out.push(Cubic.empty(center.x, center.y))
  }
  return out
}

/** Centro estimado: el promedio de los vértices (pares x, y). */
export function calculateCenter(vertices: ArrayLike<number>): Point {
  let cumulativeX = 0
  let cumulativeY = 0
  let index = 0
  while (index < vertices.length) {
    cumulativeX += vertices[index++]!
    cumulativeY += vertices[index++]!
  }
  return new Point(cumulativeX / (vertices.length / 2), cumulativeY / (vertices.length / 2))
}

/**
 * Una esquina del polígono (el vértice p1, entre p0 y p2) y cómo redondearla. Trabaja en dos
 * pasos: primero calcula cuánto quiere cortar de cada lado para lograr el redondeo pedido, y
 * después, con lo que realmente puede cortar (los lados se comparten con las esquinas
 * vecinas), arma las curvas: un punto si no hay redondeo; un arco circular, o un arco con dos
 * curvas de suavizado a los costados.
 */
class RoundedCorner {
  readonly p0: Point
  readonly p1: Point
  readonly p2: Point
  readonly rounding: CornerRounding | undefined
  readonly d1: Point
  readonly d2: Point
  readonly cornerRadius: number
  readonly smoothing: number
  readonly cosAngle: number
  readonly sinAngle: number
  readonly expectedRoundCut: number
  /** Centro del círculo del redondeo; p1 si no hay redondeo. Se define en `getCubics`. */
  center: Point = new Point(0, 0)

  constructor(p0: Point, p1: Point, p2: Point, rounding?: CornerRounding) {
    this.p0 = p0
    this.p1 = p1
    this.p2 = p2
    this.rounding = rounding
    const v01 = p0.minus(p1)
    const v21 = p2.minus(p1)
    const d01 = v01.getDistance()
    const d21 = v21.getDistance()
    if (d01 > 0 && d21 > 0) {
      this.d1 = v01.div(d01)
      this.d2 = v21.div(d21)
      this.cornerRadius = rounding?.radius ?? 0
      this.smoothing = rounding?.smoothing ?? 0

      // Coseno del ángulo en p1: producto escalar de los vectores unitarios a los vecinos.
      this.cosAngle = this.d1.dotProduct(this.d2)
      this.sinAngle = Math.sqrt(1 - square(this.cosAngle))
      // Cuánto hay que cortar de cada lado para el radio pedido: tan(A/2) = sinA / (1 + cosA),
      // con tan(A/2) = radio / corte.
      this.expectedRoundCut = this.sinAngle > 1e-3 ? (this.cornerRadius * (this.cosAngle + 1)) / this.sinAngle : 0
    } else {
      // Uno de los lados (o los dos) mide cero: no hay mucho que hacer.
      this.d1 = new Point(0, 0)
      this.d2 = new Point(0, 0)
      this.cornerRadius = 0
      this.smoothing = 0
      this.cosAngle = 0
      this.sinAngle = 0
      this.expectedRoundCut = 0
    }
  }

  /** El suavizado agranda el corte: con 0 es igual a expectedRoundCut; con 1, el doble. */
  get expectedCut(): number {
    return (1 + this.smoothing) * this.expectedRoundCut
  }

  getCubics(allowedCut0: number, allowedCut1: number = allowedCut0): Cubic[] {
    // El radio sale del menor de los dos cortes; si un lado tiene más espacio, lo usa para
    // suavizar.
    const allowedCut = Math.min(allowedCut0, allowedCut1)
    // Nada que redondear: un punto.
    if (
      this.expectedRoundCut < DistanceEpsilon ||
      allowedCut < DistanceEpsilon ||
      this.cornerRadius < DistanceEpsilon
    ) {
      this.center = this.p1
      return [Cubic.straightLine(this.p1.x, this.p1.y, this.p1.x, this.p1.y)]
    }
    // Cuánto del corte es para el redondeo.
    const actualRoundCut = Math.min(allowedCut, this.expectedRoundCut)
    // Un suavizado por lado: el espacio se usa primero para redondear y lo que sobra, si se
    // pidió, para suavizar.
    const actualSmoothing0 = this.calculateActualSmoothingValue(allowedCut0)
    const actualSmoothing1 = this.calculateActualSmoothingValue(allowedCut1)
    // Radio reducido si hizo falta.
    const actualR = (this.cornerRadius * actualRoundCut) / this.expectedRoundCut
    // Distancia de la esquina (p1) al centro del arco.
    const centerDistance = Math.sqrt(square(actualR) + square(actualRoundCut))
    this.center = this.p1.plus(this.d1.plus(this.d2).div(2).getDirection().times(centerDistance))
    const circleIntersection0 = this.p1.plus(this.d1.times(actualRoundCut))
    const circleIntersection2 = this.p1.plus(this.d2.times(actualRoundCut))
    const flanking0 = this.computeFlankingCurve(
      actualRoundCut,
      actualSmoothing0,
      this.p1,
      this.p0,
      circleIntersection0,
      circleIntersection2,
      this.center,
      actualR,
    )
    const flanking2 = this.computeFlankingCurve(
      actualRoundCut,
      actualSmoothing1,
      this.p1,
      this.p2,
      circleIntersection2,
      circleIntersection0,
      this.center,
      actualR,
    ).reverse()
    return [
      flanking0,
      Cubic.circularArc(
        this.center.x,
        this.center.y,
        flanking0.anchor1X,
        flanking0.anchor1Y,
        flanking2.anchor0X,
        flanking2.anchor0Y,
      ),
      flanking2,
    ]
  }

  /** Suavizado posible con el corte disponible, una vez cubierto el redondeo. */
  private calculateActualSmoothingValue(allowedCut: number): number {
    if (allowedCut > this.expectedCut) return this.smoothing
    if (allowedCut > this.expectedRoundCut) {
      return (this.smoothing * (allowedCut - this.expectedRoundCut)) / (this.expectedCut - this.expectedRoundCut)
    }
    return 0
  }

  /**
   * Curva que une el lado recto (de sideStart a corner) con el arco circular (centro
   * circleCenter, radio actualR), empezando en el lado y terminando sobre el arco.
   */
  private computeFlankingCurve(
    actualRoundCut: number,
    actualSmoothingValues: number,
    corner: Point,
    sideStart: Point,
    circleSegmentIntersection: Point,
    otherCircleSegmentIntersection: Point,
    circleCenter: Point,
    actualR: number,
  ): Cubic {
    const sideDirection = sideStart.minus(corner).getDirection()
    const curveStart = corner.plus(sideDirection.times(actualRoundCut * (1 + actualSmoothingValues)))
    // Aproximación: se toma del arco una parte proporcional a 1 - suavizado (con 0, todo el
    // arco; con 1, nada). El original anota que puede fallar cerca de los 180°.
    const p = interpolatePoint(
      circleSegmentIntersection,
      circleSegmentIntersection.plus(otherCircleSegmentIntersection).div(2),
      actualSmoothingValues,
    )
    // La curva termina sobre el círculo.
    const curveEnd = circleCenter.plus(directionVector(p.x - circleCenter.x, p.y - circleCenter.y).times(actualR))
    // El control del lado del arco está donde se cruzan la tangente al círculo en curveEnd y
    // el lado recto.
    const circleTangent = curveEnd.minus(circleCenter).rotate90()
    const anchorEnd =
      this.lineIntersection(sideStart, sideDirection, curveEnd, circleTangent) ?? circleSegmentIntersection
    // El otro control, a dos tercios (según el original, un valor de las herramientas de diseño).
    const anchorStart = curveStart.plus(anchorEnd.times(2)).div(3)
    return Cubic.fromPoints(curveStart, anchorStart, anchorEnd, curveEnd)
  }

  /** Cruce de la recta p0 + d0·k con la recta p1 + d1·k, o undefined si no se cruzan. */
  private lineIntersection(p0: Point, d0: Point, p1: Point, d1: Point): Point | undefined {
    const rotatedD1 = d1.rotate90()
    const den = d0.dotProduct(rotatedD1)
    if (Math.abs(den) < DistanceEpsilon) return undefined
    const num = p1.minus(p0).dotProduct(rotatedD1)
    // También en relativo: equivale a abs(den / num) < DistanceEpsilon, sin dividir.
    if (Math.abs(den) < DistanceEpsilon * Math.abs(num)) return undefined
    const k = num / den
    return p0.plus(d0.times(k))
  }
}

function verticesFromNumVerts(numVertices: number, radius: number, centerX: number, centerY: number): number[] {
  const result: number[] = []
  for (let i = 0; i < numVertices; i++) {
    const vertex = radialToCartesian(radius, (FloatPi / numVertices) * 2 * i).plus(new Point(centerX, centerY))
    result.push(vertex.x, vertex.y)
  }
  return result
}
