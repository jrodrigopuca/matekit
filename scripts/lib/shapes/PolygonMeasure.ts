/*
 * Copyright 2023 The Android Open Source Project
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
// graphics/graphics-shapes/src/commonMain/kotlin/androidx/graphics/shapes/PolygonMeasure.kt
// (ADR-0011).
//
// Diferencias con el original:
// - `MeasuredPolygon` hereda de `AbstractList` en Kotlin; acá expone `size`, `get(i)`,
//   `getOrNull(i)` y se puede recorrer con `for…of`.
// - `MeasuredCubic` es una clase interna (`inner class`) en Kotlin: acá recibe el `Measurer`
//   en el constructor.
// - `FloatFloatPair` es una tupla. Sin el registro de depuración.

import { Cubic } from './Cubic.ts'
import { Corner, type Feature } from './Features.ts'
import { ProgressableFeature } from './FeatureMapping.ts'
import { Point } from './Point.ts'
import type { RoundedPolygon } from './RoundedPolygon.ts'
import { DistanceEpsilon, positiveModulo } from './Utils.ts'

/**
 * Una curva del contorno con el tramo que ocupa (de 0 a 1, proporcional a lo recorrido sobre
 * el contorno). Morph empareja las curvas de dos formas que caen en tramos parecidos.
 */
export class MeasuredCubic {
  readonly cubic: Cubic
  readonly measuredSize: number
  private readonly measurer: Measurer
  private _startOutlineProgress: number
  private _endOutlineProgress: number

  constructor(measurer: Measurer, cubic: Cubic, startOutlineProgress: number, endOutlineProgress: number) {
    if (!(endOutlineProgress >= startOutlineProgress)) {
      throw new Error('endOutlineProgress is expected to be equal or greater than startOutlineProgress')
    }
    this.measurer = measurer
    this.cubic = cubic
    this._startOutlineProgress = startOutlineProgress
    this._endOutlineProgress = endOutlineProgress
    this.measuredSize = measurer.measureCubic(cubic)
  }

  get startOutlineProgress(): number {
    return this._startOutlineProgress
  }

  get endOutlineProgress(): number {
    return this._endOutlineProgress
  }

  updateProgressRange({
    startOutlineProgress = this._startOutlineProgress,
    endOutlineProgress = this._endOutlineProgress,
  }: { startOutlineProgress?: number | undefined; endOutlineProgress?: number | undefined } = {}): void {
    if (!(endOutlineProgress >= startOutlineProgress)) {
      throw new Error('endOutlineProgress is expected to be equal or greater than startOutlineProgress')
    }
    this._startOutlineProgress = startOutlineProgress
    this._endOutlineProgress = endOutlineProgress
  }

  /** Parte la curva en dos en el progreso `cutOutlineProgress` del contorno. */
  cutAtProgress(cutOutlineProgress: number): [MeasuredCubic, MeasuredCubic] {
    // Errores de redondeo anteriores pueden dejar el corte apenas fuera del tramo: se acota.
    const boundedCutOutlineProgress = Math.min(
      Math.max(cutOutlineProgress, this._startOutlineProgress),
      this._endOutlineProgress,
    )
    const outlineProgressSize = this._endOutlineProgress - this._startOutlineProgress
    const progressFromStart = boundedCutOutlineProgress - this._startOutlineProgress

    // Las curvas de tramo nulo ya se descartaron antes de llegar acá.
    const relativeProgress = progressFromStart / outlineProgressSize
    const t = this.measurer.findCubicCutPoint(this.cubic, relativeProgress * this.measuredSize)
    if (!(t >= 0 && t <= 1)) throw new Error('Cubic cut point is expected to be between 0 and 1')

    const [c1, c2] = this.cubic.split(t)
    return [
      new MeasuredCubic(this.measurer, c1, this._startOutlineProgress, boundedCutOutlineProgress),
      new MeasuredCubic(this.measurer, c2, boundedCutOutlineProgress, this._endOutlineProgress),
    ]
  }

  toString(): string {
    return (
      `MeasuredCubic(outlineProgress=[${this._startOutlineProgress} .. ${this._endOutlineProgress}], ` +
      `size=${this.measuredSize}, cubic=${this.cubic})`
    )
  }
}

/** Las curvas de un polígono, medidas, con el progreso de cada característica. */
export class MeasuredPolygon implements Iterable<MeasuredCubic> {
  private readonly measurer: Measurer
  private readonly cubics: readonly MeasuredCubic[]
  readonly features: readonly ProgressableFeature[]

  private constructor(
    measurer: Measurer,
    features: readonly ProgressableFeature[],
    cubics: readonly Cubic[],
    outlineProgress: readonly number[],
  ) {
    if (outlineProgress.length !== cubics.length + 1) {
      throw new Error('Outline progress size is expected to be the cubics size + 1')
    }
    if (outlineProgress[0] !== 0) throw new Error('First outline progress value is expected to be zero')
    if (outlineProgress.at(-1) !== 1) throw new Error('Last outline progress value is expected to be one')
    this.measurer = measurer
    this.features = features

    const measuredCubics: MeasuredCubic[] = []
    let startOutlineProgress = 0
    for (let index = 0; index < cubics.length; index++) {
      // Se descartan las curvas «vacías».
      if (outlineProgress[index + 1]! - outlineProgress[index]! > DistanceEpsilon) {
        measuredCubics.push(new MeasuredCubic(measurer, cubics[index]!, startOutlineProgress, outlineProgress[index + 1]!))
        // La siguiente empieza exactamente donde termina esta.
        startOutlineProgress = outlineProgress[index + 1]!
      }
    }
    // Si se descartaron curvas vacías al final, la última tiene que terminar en 1.
    measuredCubics.at(-1)!.updateProgressRange({ endOutlineProgress: 1 })
    this.cubics = measuredCubics
  }

  get size(): number {
    return this.cubics.length
  }

  get(index: number): MeasuredCubic {
    const it = this.cubics[index]
    if (!it) throw new RangeError(`Index ${index} out of bounds for length ${this.cubics.length}`)
    return it
  }

  getOrNull(index: number): MeasuredCubic | undefined {
    return this.cubics[index]
  }

  [Symbol.iterator](): Iterator<MeasuredCubic> {
    return this.cubics[Symbol.iterator]()
  }

  /**
   * Un polígono equivalente que empieza en el progreso `cuttingPoint`: parte la curva que lo
   * cruza (salvo que el corte caiga en un extremo) y rota la lista. Con el corte en 0,4 y las
   * curvas c1 [0 → 0,2], c2 [0,2 → 0,5] y c3 [0,5 → 1], c2 se parte en c2a [0,2 → 0,4] y
   * c2b [0,4 → 0,5], y el resultado es c2b [0 → 0,1], c3 [0,1 → 0,6], c1 [0,6 → 0,8] y
   * c2a [0,8 → 1].
   */
  cutAndShift(cuttingPoint: number): MeasuredPolygon {
    if (!(cuttingPoint >= 0 && cuttingPoint <= 1)) throw new Error('Cutting point is expected to be between 0 and 1')
    if (cuttingPoint < DistanceEpsilon) return this

    // La curva que hay que partir.
    const targetIndex = this.cubics.findIndex(
      (it) => cuttingPoint >= it.startOutlineProgress && cuttingPoint <= it.endOutlineProgress,
    )
    const target = this.cubics[targetIndex]!
    const [b1, b2] = target.cutAtProgress(cuttingPoint)

    // La segunda mitad de la curva partida, las siguientes hasta el final, las del principio
    // hasta la partida, y la primera mitad.
    const retCubics: Cubic[] = [b2.cubic]
    for (let i = 1; i < this.cubics.length; i++) {
      retCubics.push(this.cubics[(i + targetIndex) % this.cubics.length]!.cubic)
    }
    retCubics.push(b1.cubic)

    // Los progresos, corridos para que el corte quede en 0. Con [0 → 0,3], [0,3 → 0,8] y
    // [0,8 → 1] y el corte en 0,6: 0, 0,2, 0,4, 0,7 y 1.
    const retOutlineProgress: number[] = []
    for (let index = 0; index < this.cubics.length + 2; index++) {
      if (index === 0) retOutlineProgress.push(0)
      else if (index === this.cubics.length + 1) retOutlineProgress.push(1)
      else {
        const cubicIndex = (targetIndex + index - 1) % this.cubics.length
        retOutlineProgress.push(positiveModulo(this.cubics[cubicIndex]!.endOutlineProgress - cuttingPoint, 1))
      }
    }

    // También se corre el progreso de las características.
    const newFeatures = this.features.map(
      (f) => new ProgressableFeature(positiveModulo(f.progress - cuttingPoint, 1), f.feature),
    )

    // El constructor descarta las curvas vacías.
    return new MeasuredPolygon(this.measurer, newFeatures, retCubics, retOutlineProgress)
  }

  static measurePolygon(measurer: Measurer, polygon: RoundedPolygon): MeasuredPolygon {
    const cubics: Cubic[] = []
    const featureToCubic: Array<[Feature, number]> = []

    // Las curvas del polígono y, para cada esquina, la curva que la representa (la del medio).
    for (const feature of polygon.features) {
      feature.cubics.forEach((cubic, cubicIndex) => {
        if (feature instanceof Corner && cubicIndex === Math.floor(feature.cubics.length / 2)) {
          featureToCubic.push([feature, cubics.length])
        }
        cubics.push(cubic)
      })
    }
    const measures = [0]
    for (const cubic of cubics) {
      const it = measurer.measureCubic(cubic)
      if (!(it >= 0)) throw new Error('Measured cubic is expected to be greater or equal to zero')
      measures.push(measures.at(-1)! + it)
    }
    const totalMeasure = measures.at(-1)!
    const outlineProgress = measures.map((m) => m / totalMeasure)

    const features = featureToCubic.map(
      ([feature, ix]) =>
        new ProgressableFeature(positiveModulo((outlineProgress[ix]! + outlineProgress[ix + 1]!) / 2, 1), feature),
    )

    return new MeasuredPolygon(measurer, features, cubics, outlineProgress)
  }
}

/** Mide una curva: con cualquier criterio (ángulo, largo…), siempre mayor o igual que cero. */
export interface Measurer {
  /** Tamaño de la curva según el criterio. */
  measureCubic(c: Cubic): number
  /**
   * El parámetro t de la curva en el que se alcanza la medida `m` (de 0 a `measureCubic(c)`;
   * fuera de eso, se acota).
   */
  findCubicCutPoint(c: Cubic, m: number): number
}

/**
 * Aproxima el largo de una curva partiéndola en segmentos rectos. Con 3 segmentos, el original
 * mide un 98,5 % del largo real en un arco circular, el peor caso de las formas estándar (ver
 * la prueba measureCircle).
 */
export class LengthMeasurer implements Measurer {
  private readonly segments = 3

  measureCubic(c: Cubic): number {
    return this.closestProgressTo(c, Number.POSITIVE_INFINITY)[1]
  }

  findCubicCutPoint(c: Cubic, m: number): number {
    return this.closestProgressTo(c, m)[0]
  }

  private closestProgressTo(cubic: Cubic, threshold: number): [number, number] {
    let total = 0
    let remainder = threshold
    let prev = new Point(cubic.anchor0X, cubic.anchor0Y)

    for (let i = 1; i <= this.segments; i++) {
      const progress = i / this.segments
      const point = cubic.pointOnCurve(progress)
      const segment = point.minus(prev).getDistance()

      if (segment >= remainder) {
        return [progress - (1 - remainder / segment) / this.segments, threshold]
      }

      remainder -= segment
      total += segment
      prev = point
    }

    return [1, total]
  }
}
