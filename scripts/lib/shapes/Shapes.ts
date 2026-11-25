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
// graphics/graphics-shapes/src/commonMain/kotlin/androidx/graphics/shapes/Shapes.kt (ADR-0011).
//
// Las extensiones `RoundedPolygon.circle(…)`, `.rectangle(…)`, `.star(…)`, `.pill(…)` y
// `.pillStar(…)` del original son funciones sueltas; los parámetros con nombre van en un objeto
// de opciones.

import { CornerRounding } from './CornerRounding.ts'
import { Point } from './Point.ts'
import { RoundedPolygon } from './RoundedPolygon.ts'
import { FloatPi, TwoPi, interpolate, radialToCartesian } from './Utils.ts'

type Center = { centerX?: number | undefined; centerY?: number | undefined }

/**
 * Círculo aproximado con un polígono de `numVertices` vértices redondeados con el radio
 * completo. Más vértices no lo hacen más redondo: cambian cómo se empareja en un Morph.
 */
export function circle({
  numVertices = 8,
  radius = 1,
  centerX = 0,
  centerY = 0,
}: { numVertices?: number | undefined; radius?: number | undefined } & Center = {}): RoundedPolygon {
  if (numVertices < 3) throw new Error('Circle must have at least three vertices')

  // Mitad del ángulo entre dos vértices vecinos.
  const theta = FloatPi / numVertices
  // Radio del polígono para que el círculo inscrito tenga el radio pedido.
  const polygonRadius = radius / Math.cos(theta)
  return RoundedPolygon.fromNumVertices(numVertices, {
    rounding: new CornerRounding(radius),
    radius: polygonRadius,
    centerX,
    centerY,
  })
}

/** Rectángulo de `width` × `height` (2 × 2 por defecto) alrededor del centro. */
export function rectangle({
  width = 2,
  height = 2,
  rounding = CornerRounding.Unrounded,
  perVertexRounding,
  centerX = 0,
  centerY = 0,
}: {
  width?: number | undefined
  height?: number | undefined
  rounding?: CornerRounding | undefined
  perVertexRounding?: readonly CornerRounding[] | undefined
} & Center = {}): RoundedPolygon {
  const left = centerX - width / 2
  const top = centerY - height / 2
  const right = centerX + width / 2
  const bottom = centerY + height / 2

  return RoundedPolygon.fromVertices([right, bottom, left, bottom, left, top, right, top], {
    rounding,
    perVertexRounding,
    centerX,
    centerY,
  })
}

/**
 * Estrella de `numVerticesPerRadius` puntas: los vértices alternan entre `radius` e
 * `innerRadius`. `innerRounding` redondea los interiores distinto de los exteriores.
 */
export function star(
  numVerticesPerRadius: number,
  {
    radius = 1,
    innerRadius = 0.5,
    rounding = CornerRounding.Unrounded,
    innerRounding,
    perVertexRounding,
    centerX = 0,
    centerY = 0,
  }: {
    radius?: number | undefined
    innerRadius?: number | undefined
    rounding?: CornerRounding | undefined
    innerRounding?: CornerRounding | undefined
    perVertexRounding?: readonly CornerRounding[] | undefined
  } & Center = {},
): RoundedPolygon {
  if (radius <= 0 || innerRadius <= 0) throw new Error('Star radii must both be greater than 0')
  if (innerRadius >= radius) throw new Error('innerRadius must be less than radius')

  let pvRounding = perVertexRounding
  // Sin redondeo por vértice y con redondeo interior: armar la lista alternando los dos.
  if (pvRounding === undefined && innerRounding !== undefined) {
    pvRounding = Array.from({ length: numVerticesPerRadius }, () => [rounding, innerRounding]).flat()
  }

  return RoundedPolygon.fromVertices(starVerticesFromNumVerts(numVerticesPerRadius, radius, innerRadius, centerX, centerY), {
    rounding,
    perVertexRounding: pvRounding,
    centerX,
    centerY,
  })
}

/** Píldora: rectángulo con los extremos redondeados del todo. */
export function pill({
  width = 2,
  height = 1,
  smoothing = 0,
  centerX = 0,
  centerY = 0,
}: { width?: number | undefined; height?: number | undefined; smoothing?: number | undefined } & Center = {}): RoundedPolygon {
  if (!(width > 0 && height > 0)) throw new Error('Pill shapes must have positive width and height')

  const wHalf = width / 2
  const hHalf = height / 2
  return RoundedPolygon.fromVertices(
    [
      wHalf + centerX,
      hHalf + centerY,
      -wHalf + centerX,
      hHalf + centerY,
      -wHalf + centerX,
      -hHalf + centerY,
      wHalf + centerX,
      -hHalf + centerY,
    ],
    { rounding: new CornerRounding(Math.min(wHalf, hHalf), smoothing), centerX, centerY },
  )
}

/**
 * Estrella con el contorno de una píldora: los vértices alternan entre la píldora exterior y una
 * interior (`innerRadiusRatio`). `vertexSpacing` reparte los vértices de los extremos (0, como
 * los interiores; 1, como los exteriores) y `startLocation` (de 0 a 1) mueve el primero.
 */
export function pillStar({
  width = 2,
  height = 1,
  numVerticesPerRadius = 8,
  innerRadiusRatio = 0.5,
  rounding = CornerRounding.Unrounded,
  innerRounding,
  perVertexRounding,
  vertexSpacing = 0.5,
  startLocation = 0,
  centerX = 0,
  centerY = 0,
}: {
  width?: number | undefined
  height?: number | undefined
  numVerticesPerRadius?: number | undefined
  innerRadiusRatio?: number | undefined
  rounding?: CornerRounding | undefined
  innerRounding?: CornerRounding | undefined
  perVertexRounding?: readonly CornerRounding[] | undefined
  vertexSpacing?: number | undefined
  startLocation?: number | undefined
} & Center = {}): RoundedPolygon {
  if (!(width > 0 && height > 0)) throw new Error('Pill shapes must have positive width and height')
  if (!(innerRadiusRatio > 0 && innerRadiusRatio <= 1)) throw new Error('innerRadius must be between 0 and 1')

  let pvRounding = perVertexRounding
  if (pvRounding === undefined && innerRounding !== undefined) {
    pvRounding = Array.from({ length: numVerticesPerRadius }, () => [rounding, innerRounding]).flat()
  }
  return RoundedPolygon.fromVertices(
    pillStarVerticesFromNumVerts(
      numVerticesPerRadius,
      width,
      height,
      innerRadiusRatio,
      vertexSpacing,
      startLocation,
      centerX,
      centerY,
    ),
    { rounding, perVertexRounding: pvRounding, centerX, centerY },
  )
}

function pillStarVerticesFromNumVerts(
  numVerticesPerRadius: number,
  width: number,
  height: number,
  innerRadius: number,
  vertexSpacing: number,
  startLocation: number,
  centerX: number,
  centerY: number,
): number[] {
  // Se recorre el perímetro de la píldora y cada vértice se ubica según su distancia `t` desde
  // el inicio, en la sección que le toque: los lados verticales, los cuatro cuartos de círculo
  // de las esquinas o los lados horizontales (los verticales o los horizontales miden cero, según
  // qué dimensión sea la menor).
  const endcapRadius = Math.min(width, height)
  const vSegLen = Math.max(height - width, 0)
  const hSegLen = Math.max(width - height, 0)
  const vSegHalf = vSegLen / 2
  const hSegHalf = hSegLen / 2
  // vertexSpacing elige si los vértices de los extremos se espacian como los interiores (0), como
  // los exteriores (1) o en el promedio (0,5, por defecto).
  const circlePerimeter = TwoPi * endcapRadius * interpolate(innerRadius, 1, vertexSpacing)
  // Perímetro: el del círculo más los lados del rectángulo interior (que pueden medir cero).
  const perimeter = 2 * hSegLen + 2 * vSegLen + circlePerimeter

  // Dónde empieza cada sección del contorno, en distancia desde el inicio.
  const sections = new Array<number>(11).fill(0)
  sections[0] = 0
  sections[1] = vSegLen / 2
  sections[2] = sections[1] + circlePerimeter / 4
  sections[3] = sections[2] + hSegLen
  sections[4] = sections[3] + circlePerimeter / 4
  sections[5] = sections[4] + vSegLen
  sections[6] = sections[5] + circlePerimeter / 4
  sections[7] = sections[6] + hSegLen
  sections[8] = sections[7] + circlePerimeter / 4
  sections[9] = sections[8] + vSegLen / 2
  sections[10] = perimeter

  // Distancia entre vértices sobre el contorno, alternando interior y exterior.
  const tPerVertex = perimeter / (2 * numVerticesPerRadius)
  let inner = false
  let currSecIndex = 0
  let secStart = 0
  let secEnd = sections[1]
  // t = 0 está sobre el eje x positivo; startLocation lo corre sobre el perímetro.
  let t = startLocation * perimeter
  const result: number[] = []
  const rectBR = new Point(hSegHalf, vSegHalf)
  const rectBL = new Point(-hSegHalf, vSegHalf)
  const rectTL = new Point(-hSegHalf, -vSegHalf)
  const rectTR = new Point(hSegHalf, -vSegHalf)
  for (let i = 0; i < numVerticesPerRadius * 2; i++) {
    // t puede empezar (y terminar) después de 0: boundedT resuelve el paso por el inicio.
    const boundedT = t % perimeter
    if (boundedT < secStart) currSecIndex = 0
    while (boundedT >= sections[(currSecIndex + 1) % sections.length]!) {
      currSecIndex = (currSecIndex + 1) % sections.length
      secStart = sections[currSecIndex]!
      secEnd = sections[(currSecIndex + 1) % sections.length]!
    }

    // Proporción de t dentro de su sección.
    const tInSection = boundedT - secStart
    const tProportion = tInSection / (secEnd - secStart)

    // En los extremos, la proporción da el ángulo sobre el arco; en los lados, la posición lineal.
    const currRadius = inner ? endcapRadius * innerRadius : endcapRadius
    let vertex: Point
    switch (currSecIndex) {
      case 0:
        vertex = new Point(currRadius, tProportion * vSegHalf)
        break
      case 1:
        vertex = radialToCartesian(currRadius, (tProportion * FloatPi) / 2).plus(rectBR)
        break
      case 2:
        vertex = new Point(hSegHalf - tProportion * hSegLen, currRadius)
        break
      case 3:
        vertex = radialToCartesian(currRadius, FloatPi / 2 + (tProportion * FloatPi) / 2).plus(rectBL)
        break
      case 4:
        vertex = new Point(-currRadius, vSegHalf - tProportion * vSegLen)
        break
      case 5:
        vertex = radialToCartesian(currRadius, FloatPi + (tProportion * FloatPi) / 2).plus(rectTL)
        break
      case 6:
        vertex = new Point(-hSegHalf + tProportion * hSegLen, -currRadius)
        break
      case 7:
        vertex = radialToCartesian(currRadius, FloatPi * 1.5 + (tProportion * FloatPi) / 2).plus(rectTR)
        break
      default: // 8
        vertex = new Point(currRadius, -vSegHalf + tProportion * vSegHalf)
    }
    result.push(vertex.x + centerX, vertex.y + centerY)
    t += tPerVertex
    inner = !inner
  }
  return result
}

function starVerticesFromNumVerts(
  numVerticesPerRadius: number,
  radius: number,
  innerRadius: number,
  centerX: number,
  centerY: number,
): number[] {
  const result: number[] = []
  for (let i = 0; i < numVerticesPerRadius; i++) {
    let vertex = radialToCartesian(radius, (FloatPi / numVerticesPerRadius) * 2 * i)
    result.push(vertex.x + centerX, vertex.y + centerY)
    vertex = radialToCartesian(innerRadius, (FloatPi / numVerticesPerRadius) * (2 * i + 1))
    result.push(vertex.x + centerX, vertex.y + centerY)
  }
  return result
}
