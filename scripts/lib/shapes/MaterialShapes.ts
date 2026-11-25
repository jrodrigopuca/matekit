/*
 * Copyright 2024 The Android Open Source Project
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
// compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/MaterialShapes.kt
// (ADR-0011): las 35 formas decorativas de Material 3 Expressive.
//
// Diferencias con el original:
// - `MaterialShapes.Circle`, `.Square`… (normalizadas y guardadas en caché) son la tabla
//   `MATERIAL_SHAPES`, con el nombre de Compose como clave y una función que arma la forma
//   normalizada; las funciones sin normalizar (`circle()`, `square()`…) se exportan igual.
// - Sin `Morph.toPath`, `RoundedPolygon.toPath()` ni `toShape()` (Composables): el dibujo está
//   en ShapeUtil.ts y el ajuste al tamaño, en scripts/build-shapes.ts.

import { CornerRounding } from './CornerRounding.ts'
import { Point } from './Point.ts'
import { RoundedPolygon } from './RoundedPolygon.ts'
import { circle as circlePolygon, rectangle, star } from './Shapes.ts'
import { Matrix, transformed } from './ShapeUtil.ts'

// Redondeos que se repiten.
const cornerRound15 = new CornerRounding(0.15)
const cornerRound20 = new CornerRounding(0.2)
const cornerRound30 = new CornerRounding(0.3)
const cornerRound50 = new CornerRounding(0.5)
const cornerRound100 = new CornerRounding(1)

const rotateNeg45 = new Matrix().rotateZ(-45)
const rotateNeg90 = new Matrix().rotateZ(-90)
const rotateNeg135 = new Matrix().rotateZ(-135)

const Offset = (x: number, y: number) => new Point(x, y)

export function circle(numVertices = 10): RoundedPolygon {
  return circlePolygon({ numVertices })
}

export function square(): RoundedPolygon {
  return rectangle({ width: 1, height: 1, rounding: cornerRound30 })
}

export function slanted(): RoundedPolygon {
  return customPolygon(
    [
      PointNRound(Offset(0.926, 0.97), new CornerRounding(0.189, 0.811)),
      PointNRound(Offset(-0.021, 0.967), new CornerRounding(0.187, 0.057)),
    ],
    2,
  )
}

export function arch(): RoundedPolygon {
  return transformed(
    RoundedPolygon.fromNumVertices(4, {
      perVertexRounding: [cornerRound100, cornerRound100, cornerRound20, cornerRound20],
    }),
    rotateNeg135,
  )
}

export function fan(): RoundedPolygon {
  return customPolygon(
    [
      PointNRound(Offset(1.004, 1.0), new CornerRounding(0.148, 0.417)),
      PointNRound(Offset(0.0, 1.0), new CornerRounding(0.151)),
      PointNRound(Offset(0.0, -0.003), new CornerRounding(0.148)),
      PointNRound(Offset(0.978, 0.02), new CornerRounding(0.803)),
    ],
    1,
  )
}

export function arrow(): RoundedPolygon {
  return customPolygon(
    [
      PointNRound(Offset(0.5, 0.892), new CornerRounding(0.313)),
      PointNRound(Offset(-0.216, 1.05), new CornerRounding(0.207)),
      PointNRound(Offset(0.499, -0.16), new CornerRounding(0.215, 1.0)),
      PointNRound(Offset(1.225, 1.06), new CornerRounding(0.211)),
    ],
    1,
  )
}

export function semiCircle(): RoundedPolygon {
  return rectangle({
    width: 1.6,
    height: 1,
    perVertexRounding: [cornerRound20, cornerRound20, cornerRound100, cornerRound100],
  })
}

export function oval(): RoundedPolygon {
  const m = new Matrix().scale(1, 0.64)
  return transformed(transformed(circlePolygon(), m), rotateNeg45)
}

export function pill(): RoundedPolygon {
  return customPolygon(
    [
      PointNRound(Offset(0.961, 0.039), new CornerRounding(0.426)),
      PointNRound(Offset(1.001, 0.428)),
      PointNRound(Offset(1.0, 0.609), new CornerRounding(1.0)),
    ],
    2,
    { mirroring: true },
  )
}

export function triangle(): RoundedPolygon {
  return transformed(RoundedPolygon.fromNumVertices(3, { rounding: cornerRound20 }), rotateNeg90)
}

export function diamond(): RoundedPolygon {
  return customPolygon(
    [
      PointNRound(Offset(0.5, 1.096), new CornerRounding(0.151, 0.524)),
      PointNRound(Offset(0.04, 0.5), new CornerRounding(0.159)),
    ],
    2,
  )
}

export function clamShell(): RoundedPolygon {
  return customPolygon(
    [
      PointNRound(Offset(0.171, 0.841), new CornerRounding(0.159)),
      PointNRound(Offset(-0.02, 0.5), new CornerRounding(0.14)),
      PointNRound(Offset(0.17, 0.159), new CornerRounding(0.159)),
    ],
    2,
  )
}

export function pentagon(): RoundedPolygon {
  return customPolygon(
    [
      PointNRound(Offset(0.5, -0.009), new CornerRounding(0.172)),
      PointNRound(Offset(1.03, 0.365), new CornerRounding(0.164)),
      PointNRound(Offset(0.828, 0.97), new CornerRounding(0.169)),
    ],
    1,
    { mirroring: true },
  )
}

export function gem(): RoundedPolygon {
  return customPolygon(
    [
      PointNRound(Offset(0.499, 1.023), new CornerRounding(0.241, 0.778)),
      PointNRound(Offset(-0.005, 0.792), new CornerRounding(0.208)),
      PointNRound(Offset(0.073, 0.258), new CornerRounding(0.228)),
      PointNRound(Offset(0.433, -0.0), new CornerRounding(0.491)),
    ],
    1,
    { mirroring: true },
  )
}

export function sunny(): RoundedPolygon {
  return star(8, { innerRadius: 0.8, rounding: cornerRound15 })
}

export function verySunny(): RoundedPolygon {
  return customPolygon(
    [
      PointNRound(Offset(0.5, 1.08), new CornerRounding(0.085)),
      PointNRound(Offset(0.358, 0.843), new CornerRounding(0.085)),
    ],
    8,
  )
}

export function cookie4(): RoundedPolygon {
  return customPolygon(
    [
      PointNRound(Offset(1.237, 1.236), new CornerRounding(0.258)),
      PointNRound(Offset(0.5, 0.918), new CornerRounding(0.233)),
    ],
    4,
  )
}

export function cookie6(): RoundedPolygon {
  return customPolygon(
    [
      PointNRound(Offset(0.723, 0.884), new CornerRounding(0.394)),
      PointNRound(Offset(0.5, 1.099), new CornerRounding(0.398)),
    ],
    6,
  )
}

export function cookie7(): RoundedPolygon {
  return transformed(star(7, { innerRadius: 0.75, rounding: cornerRound50 }), rotateNeg90)
}

export function cookie9(): RoundedPolygon {
  return transformed(star(9, { innerRadius: 0.8, rounding: cornerRound50 }), rotateNeg90)
}

export function cookie12(): RoundedPolygon {
  return transformed(star(12, { innerRadius: 0.8, rounding: cornerRound50 }), rotateNeg90)
}

export function ghostish(): RoundedPolygon {
  return customPolygon(
    [
      PointNRound(Offset(0.5, 0), new CornerRounding(1.0)),
      PointNRound(Offset(1, 0), new CornerRounding(1.0)),
      PointNRound(Offset(1, 1.14), new CornerRounding(0.254, 0.106)),
      PointNRound(Offset(0.575, 0.906), new CornerRounding(0.253)),
    ],
    1,
    { mirroring: true },
  )
}

export function clover4(): RoundedPolygon {
  return customPolygon(
    [PointNRound(Offset(0.5, 0.074)), PointNRound(Offset(0.725, -0.099), new CornerRounding(0.476))],
    4,
    { mirroring: true },
  )
}

export function clover8(): RoundedPolygon {
  return customPolygon(
    [PointNRound(Offset(0.5, 0.036)), PointNRound(Offset(0.758, -0.101), new CornerRounding(0.209))],
    8,
  )
}

export function burst(): RoundedPolygon {
  return customPolygon(
    [
      PointNRound(Offset(0.5, -0.006), new CornerRounding(0.006)),
      PointNRound(Offset(0.592, 0.158), new CornerRounding(0.006)),
    ],
    12,
  )
}

export function softBurst(): RoundedPolygon {
  return customPolygon(
    [
      PointNRound(Offset(0.193, 0.277), new CornerRounding(0.053)),
      PointNRound(Offset(0.176, 0.055), new CornerRounding(0.053)),
    ],
    10,
  )
}

export function boom(): RoundedPolygon {
  return customPolygon(
    [
      PointNRound(Offset(0.457, 0.296), new CornerRounding(0.007)),
      PointNRound(Offset(0.5, -0.051), new CornerRounding(0.007)),
    ],
    15,
  )
}

export function softBoom(): RoundedPolygon {
  return customPolygon(
    [
      PointNRound(Offset(0.733, 0.454)),
      PointNRound(Offset(0.839, 0.437), new CornerRounding(0.532)),
      PointNRound(Offset(0.949, 0.449), new CornerRounding(0.439, 1.0)),
      PointNRound(Offset(0.998, 0.478), new CornerRounding(0.174)),
    ],
    16,
    { mirroring: true },
  )
}

export function flower(): RoundedPolygon {
  return customPolygon(
    [
      PointNRound(Offset(0.37, 0.187)),
      PointNRound(Offset(0.416, 0.049), new CornerRounding(0.381)),
      PointNRound(Offset(0.479, 0.001), new CornerRounding(0.095)),
    ],
    8,
    { mirroring: true },
  )
}

export function puffy(): RoundedPolygon {
  const m = new Matrix().scale(1, 0.742)
  return transformed(
    customPolygon(
      [
        PointNRound(Offset(0.5, 0.053)),
        PointNRound(Offset(0.545, -0.04), new CornerRounding(0.405)),
        PointNRound(Offset(0.67, -0.035), new CornerRounding(0.426)),
        PointNRound(Offset(0.717, 0.066), new CornerRounding(0.574)),
        PointNRound(Offset(0.722, 0.128)),
        PointNRound(Offset(0.777, 0.002), new CornerRounding(0.36)),
        PointNRound(Offset(0.914, 0.149), new CornerRounding(0.66)),
        PointNRound(Offset(0.926, 0.289), new CornerRounding(0.66)),
        PointNRound(Offset(0.881, 0.346)),
        PointNRound(Offset(0.94, 0.344), new CornerRounding(0.126)),
        PointNRound(Offset(1.003, 0.437), new CornerRounding(0.255)),
      ],
      2,
      { mirroring: true },
    ),
    m,
  )
}

export function puffyDiamond(): RoundedPolygon {
  return customPolygon(
    [
      PointNRound(Offset(0.87, 0.13), new CornerRounding(0.146)),
      PointNRound(Offset(0.818, 0.357)),
      PointNRound(Offset(1.0, 0.332), new CornerRounding(0.853)),
    ],
    4,
    { mirroring: true },
  )
}

export function pixelCircle(): RoundedPolygon {
  return customPolygon(
    [
      PointNRound(Offset(0.5, 0.0)),
      PointNRound(Offset(0.704, 0.0)),
      PointNRound(Offset(0.704, 0.065)),
      PointNRound(Offset(0.843, 0.065)),
      PointNRound(Offset(0.843, 0.148)),
      PointNRound(Offset(0.926, 0.148)),
      PointNRound(Offset(0.926, 0.296)),
      PointNRound(Offset(1.0, 0.296)),
    ],
    2,
    { mirroring: true },
  )
}

export function pixelTriangle(): RoundedPolygon {
  return customPolygon(
    [
      PointNRound(Offset(0.11, 0.5)),
      PointNRound(Offset(0.113, 0.0)),
      PointNRound(Offset(0.287, 0.0)),
      PointNRound(Offset(0.287, 0.087)),
      PointNRound(Offset(0.421, 0.087)),
      PointNRound(Offset(0.421, 0.17)),
      PointNRound(Offset(0.56, 0.17)),
      PointNRound(Offset(0.56, 0.265)),
      PointNRound(Offset(0.674, 0.265)),
      PointNRound(Offset(0.675, 0.344)),
      PointNRound(Offset(0.789, 0.344)),
      PointNRound(Offset(0.789, 0.439)),
      PointNRound(Offset(0.888, 0.439)),
    ],
    1,
    { mirroring: true },
  )
}

export function bun(): RoundedPolygon {
  return customPolygon(
    [
      PointNRound(Offset(0.796, 0.5)),
      PointNRound(Offset(0.853, 0.518), cornerRound100),
      PointNRound(Offset(0.992, 0.631), cornerRound100),
      PointNRound(Offset(0.968, 1.0), cornerRound100),
    ],
    2,
    { mirroring: true },
  )
}

export function heart(): RoundedPolygon {
  return customPolygon(
    [
      PointNRound(Offset(0.5, 0.268), new CornerRounding(0.016)),
      PointNRound(Offset(0.792, -0.066), new CornerRounding(0.958)),
      PointNRound(Offset(1.064, 0.276), new CornerRounding(1.0)),
      PointNRound(Offset(0.501, 0.946), new CornerRounding(0.129)),
    ],
    1,
    { mirroring: true },
  )
}

/**
 * Las 35 formas normalizadas (dentro del cuadrado de 0 a 1), con el nombre de Compose, en el
 * orden en que las declara `MaterialShapes`.
 */
export const MATERIAL_SHAPES = {
  Circle: () => circle().normalized(),
  Square: () => square().normalized(),
  Slanted: () => slanted().normalized(),
  Arch: () => arch().normalized(),
  Fan: () => fan().normalized(),
  Arrow: () => arrow().normalized(),
  SemiCircle: () => semiCircle().normalized(),
  Oval: () => oval().normalized(),
  Pill: () => pill().normalized(),
  Triangle: () => triangle().normalized(),
  Diamond: () => diamond().normalized(),
  ClamShell: () => clamShell().normalized(),
  Pentagon: () => pentagon().normalized(),
  Gem: () => gem().normalized(),
  Sunny: () => sunny().normalized(),
  VerySunny: () => verySunny().normalized(),
  Cookie4Sided: () => cookie4().normalized(),
  Cookie6Sided: () => cookie6().normalized(),
  Cookie7Sided: () => cookie7().normalized(),
  Cookie9Sided: () => cookie9().normalized(),
  Cookie12Sided: () => cookie12().normalized(),
  Ghostish: () => ghostish().normalized(),
  Clover4Leaf: () => clover4().normalized(),
  Clover8Leaf: () => clover8().normalized(),
  Burst: () => burst().normalized(),
  SoftBurst: () => softBurst().normalized(),
  Boom: () => boom().normalized(),
  SoftBoom: () => softBoom().normalized(),
  Flower: () => flower().normalized(),
  Puffy: () => puffy().normalized(),
  PuffyDiamond: () => puffyDiamond().normalized(),
  PixelCircle: () => pixelCircle().normalized(),
  PixelTriangle: () => pixelTriangle().normalized(),
  Bun: () => bun().normalized(),
  Heart: () => heart().normalized(),
} as const satisfies Record<string, () => RoundedPolygon>

export type MaterialShapeName = keyof typeof MATERIAL_SHAPES

/** Un vértice y su redondeo. */
interface PointNRound {
  o: Point
  r: CornerRounding
}
const PointNRound = (o: Point, r: CornerRounding = CornerRounding.Unrounded): PointNRound => ({ o, r })

/**
 * Repite `points` `reps` veces alrededor de `center`. Con `mirroring`, cada repetición impar va
 * reflejada (y sin repetir el primer punto), para armar formas simétricas a partir de media
 * sección.
 */
function doRepeat(points: readonly PointNRound[], reps: number, center: Point, mirroring: boolean): PointNRound[] {
  if (mirroring) {
    const result: PointNRound[] = []
    const angles = points.map((it) => angleDegrees(it.o.minus(center)))
    const distances = points.map((it) => it.o.minus(center).getDistance())
    const actualReps = reps * 2
    const sectionAngle = 360 / actualReps
    for (let it = 0; it < actualReps; it++) {
      for (let index = 0; index < points.length; index++) {
        const i = it % 2 === 0 ? index : points.length - 1 - index
        if (i > 0 || it % 2 === 0) {
          const a = toRadians(
            sectionAngle * it + (it % 2 === 0 ? angles[i]! : sectionAngle - angles[i]! + 2 * angles[0]!),
          )
          const finalPoint = new Point(Math.cos(a), Math.sin(a)).times(distances[i]!).plus(center)
          result.push(PointNRound(finalPoint, points[i]!.r))
        }
      }
    }
    return result
  }
  const np = points.length
  return Array.from({ length: np * reps }, (_, it) => {
    const point = rotateDegrees(points[it % np]!.o, (Math.floor(it / np) * 360) / reps, center)
    return PointNRound(point, points[it % np]!.r)
  })
}

function rotateDegrees(p: Point, angle: number, center: Point = Offset(0, 0)): Point {
  const a = toRadians(angle)
  const off = p.minus(center)
  return new Point(off.x * Math.cos(a) - off.y * Math.sin(a), off.x * Math.sin(a) + off.y * Math.cos(a)).plus(center)
}

function toRadians(degrees: number): number {
  return (degrees / 360) * 2 * Math.PI
}

function angleDegrees(p: Point): number {
  return (Math.atan2(p.y, p.x) * 180) / Math.PI
}

function customPolygon(
  pnr: readonly PointNRound[],
  reps: number,
  { center = Offset(0.5, 0.5), mirroring = false }: { center?: Point | undefined; mirroring?: boolean | undefined } = {},
): RoundedPolygon {
  const actualPoints = doRepeat(pnr, reps, center, mirroring)
  return RoundedPolygon.fromVertices(
    actualPoints.flatMap((p) => [p.o.x, p.o.y]),
    { perVertexRounding: actualPoints.map((p) => p.r), centerX: center.x, centerY: center.y },
  )
}
