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
// graphics/graphics-shapes/src/commonMain/kotlin/androidx/graphics/shapes/Features.kt (ADR-0011).
//
// Las clases anidadas `Feature.Edge` y `Feature.Corner` del original son `Edge` y `Corner`.

import type { Cubic, PointTransformer } from './Cubic.ts'
import { DistanceEpsilon } from './Utils.ts'

/**
 * Tramo del contorno de un polígono: una esquina (convexa o cóncava) o un lado. Morph (entrega 2)
 * usa estas marcas para emparejar las esquinas de una forma con las de otra.
 */
export abstract class Feature {
  readonly cubics: readonly Cubic[]

  constructor(cubics: readonly Cubic[]) {
    this.cubics = cubics
  }

  /** Tramo que Morph puede ignorar al emparejar formas (se trata como un lado). */
  static buildIgnorableFeature(cubics: readonly Cubic[]): Feature {
    return validated(new Edge(cubics))
  }

  static buildEdge(cubic: Cubic): Feature {
    return new Edge([cubic])
  }

  static buildConvexCorner(cubics: readonly Cubic[]): Feature {
    return validated(new Corner(cubics, true))
  }

  static buildConcaveCorner(cubics: readonly Cubic[]): Feature {
    return validated(new Corner(cubics, false))
  }

  abstract transformed(f: PointTransformer): Feature
  abstract reversed(): Feature
  abstract readonly isIgnorableFeature: boolean
  abstract readonly isEdge: boolean
  abstract readonly isConvexCorner: boolean
  abstract readonly isConcaveCorner: boolean
}

function validated(feature: Feature): Feature {
  if (feature.cubics.length === 0) throw new Error('Features need at least one cubic.')
  if (!isContinuous(feature)) {
    throw new Error(
      'Feature must be continuous, with the anchor points of all cubics ' +
        'matching the anchor points of the preceding and succeeding cubics',
    )
  }
  return feature
}

function isContinuous(feature: Feature): boolean {
  let prevCubic = feature.cubics[0]!
  for (let index = 1; index < feature.cubics.length; index++) {
    const cubic = feature.cubics[index]!
    if (
      Math.abs(cubic.anchor0X - prevCubic.anchor1X) > DistanceEpsilon ||
      Math.abs(cubic.anchor0Y - prevCubic.anchor1Y) > DistanceEpsilon
    ) {
      return false
    }
    prevCubic = cubic
  }
  return true
}

const reverseCubics = (cubics: readonly Cubic[]) => cubics.toReversed().map((c) => c.reverse())

/** Lado (o tramo ignorable) del contorno. */
export class Edge extends Feature {
  readonly isIgnorableFeature = true
  readonly isEdge = true
  readonly isConvexCorner = false
  readonly isConcaveCorner = false

  transformed(f: PointTransformer): Edge {
    return new Edge(this.cubics.map((c) => c.transformed(f)))
  }

  reversed(): Edge {
    return new Edge(reverseCubics(this.cubics))
  }

  toString(): string {
    return 'Edge'
  }
}

/** Esquina del contorno, convexa o cóncava. */
export class Corner extends Feature {
  readonly convex: boolean
  readonly isIgnorableFeature = false
  readonly isEdge = false

  constructor(cubics: readonly Cubic[], convex = true) {
    super(cubics)
    this.convex = convex
  }

  get isConvexCorner(): boolean {
    return this.convex
  }

  get isConcaveCorner(): boolean {
    return !this.convex
  }

  transformed(f: PointTransformer): Corner {
    return new Corner(
      this.cubics.map((c) => c.transformed(f)),
      this.convex,
    )
  }

  reversed(): Corner {
    return new Corner(reverseCubics(this.cubics), !this.convex)
  }

  toString(): string {
    return `Corner: cubics=${this.cubics.map((c) => `[${c}]`).join(', ')} convex=${this.convex}`
  }
}
