/*
 * Copyright 2020 The Android Open Source Project (SpringEstimation.kt)
 * Copyright 2019 The Android Open Source Project (SpringSimulation.kt)
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
// compose/animation/animation-core/src/commonMain/kotlin/androidx/compose/animation/core/SpringEstimation.kt
// (ADR-0011), más la posición del resorte de SpringSimulation.kt.
//
// Es lo que Compose usa para decidir cuándo termina una animación con `spring(…)`: el
// LoadingIndicator cambia de forma con un resorte (amortiguación 0,6, rigidez 200, umbral 0,1)
// que termina, y salta al destino, en cuanto la envolvente de la oscilación queda por debajo del
// umbral. Solo se porta el caso subamortiguado (amortiguación < 1), el único que usa el
// indicador; los otros dos lanzan un error.
//
// No es parte de androidx.graphics.shapes: vive acá porque solo lo usa el generador de las formas.

/**
 * Milisegundos que dura un resorte, como `estimateAnimationDurationMillis` de Compose. El
 * desplazamiento y la velocidad iniciales van divididos por el umbral de visibilidad (así los
 * pasa `FloatSpringSpec.getDurationNanos`), y `delta` es 1.
 */
export function estimateAnimationDurationMillis({
  stiffness,
  dampingRatio,
  initialVelocity,
  initialDisplacement,
  delta,
}: {
  stiffness: number
  dampingRatio: number
  initialVelocity: number
  initialDisplacement: number
  delta: number
}): number {
  if (dampingRatio === 0) return Number.MAX_SAFE_INTEGER
  return Math.trunc(
    estimateAnimationDurationSeconds(stiffness, dampingRatio, initialVelocity, initialDisplacement, delta) * 1000,
  )
}

function estimateAnimationDurationSeconds(
  stiffness: number,
  dampingRatio: number,
  initialVelocity: number,
  initialDisplacement: number,
  delta: number,
): number {
  const dampingCoefficient = 2 * dampingRatio * Math.sqrt(stiffness)

  const partialRoot = dampingCoefficient * dampingCoefficient - 4 * stiffness
  const partialRootImaginary = partialRoot < 0 ? Math.sqrt(Math.abs(partialRoot)) : 0

  const firstRootReal = -dampingCoefficient * 0.5 + (partialRoot < 0 ? 0 : Math.sqrt(partialRoot)) * 0.5
  const firstRootImaginary = partialRootImaginary * 0.5

  if (initialDisplacement === 0 && initialVelocity === 0) return 0

  const v0 = initialDisplacement < 0 ? -initialVelocity : initialVelocity
  const p0 = Math.abs(initialDisplacement)

  if (dampingRatio < 1) return estimateUnderDamped(firstRootReal, firstRootImaginary, p0, v0, delta)
  throw new Error('Solo se portó el resorte subamortiguado (dampingRatio < 1)')
}

function estimateUnderDamped(
  firstRootReal: number,
  firstRootImaginary: number,
  p0: number,
  v0: number,
  delta: number,
): number {
  const r = firstRootReal
  const c1 = p0
  const c2 = (v0 - r * c1) / firstRootImaginary
  const c = Math.sqrt(c1 * c1 + c2 * c2)
  return Math.log(delta / c) / r
}

/**
 * Posición de un resorte subamortiguado que parte de 0, quieto, hacia 1, a los `seconds`
 * segundos (la solución analítica de `SpringSimulation.updateValues`, con masa 1).
 */
export function springPosition(seconds: number, { dampingRatio, stiffness }: { dampingRatio: number; stiffness: number }): number {
  const naturalFreq = Math.sqrt(stiffness)
  const dampedFreq = naturalFreq * Math.sqrt(1 - dampingRatio * dampingRatio)
  // Desplazamiento inicial respecto del destino: -1; velocidad inicial: 0.
  const cosCoeff = -1
  const sinCoeff = (1 / dampedFreq) * (dampingRatio * naturalFreq * cosCoeff)
  const displacement =
    Math.exp(-dampingRatio * naturalFreq * seconds) *
    (cosCoeff * Math.cos(dampedFreq * seconds) + sinCoeff * Math.sin(dampedFreq * seconds))
  return 1 + displacement
}
