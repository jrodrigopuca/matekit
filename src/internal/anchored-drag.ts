// Módulo interno universal (ADR-0003), sin React: la decisión al soltar un arrastre entre anclas
// sobre un eje (las posiciones son números; el eje lo elige quien llama). No se exporta como API
// pública. Lo usan el BottomSheet (eje vertical, hacia abajo) y el ModalNavigationRail (eje
// horizontal, hacia el borde de inicio; ADR-0025 y ADR-0029). Estaba en
// src/organisms/BottomSheet/sheet-drag.ts, que lo reexporta sin cambios.
//
// Portado de Jetpack Compose (Apache 2.0), androidx/androidx:
// - compose/foundation/foundation/src/commonMain/kotlin/androidx/compose/foundation/gestures/
//   AnchoredDraggable.kt (commit 8f52852d7a, 2026-11-20): computeTarget y closestAnchor;
//   AnchoredDraggableMinFlingVelocity = 125.dp (por segundo).
// - compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/SheetDefaults.kt
//   (commit 5fd64f71fb, 2026-10-27): BottomSheetDefaults.PositionalThreshold = 56.dp y
//   VelocityThreshold = 125.dp (por segundo).
// - compose/ui/ui/src/commonMain/kotlin/androidx/compose/ui/input/pointer/util/VelocityTracker.kt:
//   (commit 641155416f, 2026-11-20): la velocidad sale de los movimientos de los últimos 100 ms
//   (HorizonMilliseconds) y vale 0 si el puntero estuvo quieto más de 40 ms antes de soltar
//   (AssumePointerMoveStoppedMilliseconds).
//   Acá es una pendiente entre la primera y la última muestra de esa ventana, no el ajuste por
//   impulso de Compose: alcanza para decidir contra un umbral de 125 px/s.
//
// Las posiciones son desplazamientos en px sobre el eje, crecientes en el sentido de esconderse
// (el BottomSheet: hacia abajo desde expandido; el rail: hacia el borde desde abierto). Un dp de
// Compose es un px de CSS. En los comentarios, "abajo" es el sentido creciente.

import { mkError } from './diagnostics.ts'

/** Distancia desde el ancla de partida a partir de la cual, soltando despacio, se pasa a la siguiente. */
export const POSITIONAL_THRESHOLD = 56
/** Velocidad (px/s) a partir de la cual se pasa a la siguiente ancla en el sentido del gesto. */
export const VELOCITY_THRESHOLD = 125
/** Movimiento mínimo para que un gesto se vuelva arrastre (touch slop de Compose, 8 dp). */
export const DRAG_SLOP = 8

export type Anchor<T extends string> = readonly [name: T, position: number]

function closest<T extends string>(anchors: readonly Anchor<T>[], position: number): T {
  let best = anchors[0]!
  for (const a of anchors) if (Math.abs(position - a[1]) <= Math.abs(position - best[1])) best = a
  return best[0]
}

/** El ancla más cercana hacia abajo (`down`) o hacia arriba; si no hay, la del extremo. */
function closestToward<T extends string>(anchors: readonly Anchor<T>[], position: number, down: boolean): Anchor<T> {
  let best: Anchor<T> | undefined
  let bestDistance = Infinity
  for (const a of anchors) {
    const delta = down ? a[1] - position : position - a[1]
    if (delta >= 0 && delta <= bestDistance) {
      best = a
      bestDistance = delta
    }
  }
  if (best) return best
  const sorted = [...anchors].sort((x, y) => x[1] - y[1])
  return (down ? sorted.at(-1) : sorted[0])!
}

/**
 * El ancla donde se acomoda el sheet al soltar en `offset` con `velocity` (px/s, positiva hacia
 * abajo), como `computeTarget` de Compose:
 * - quieto: la más cercana;
 * - rápido (al menos `VELOCITY_THRESHOLD`): la siguiente en el sentido del gesto;
 * - despacio: la siguiente en el sentido del gesto si se alejó al menos `POSITIONAL_THRESHOLD` de
 *   la anterior; si no, vuelve.
 */
export function computeTarget<T extends string>(
  anchors: readonly Anchor<T>[],
  offset: number,
  velocity: number,
  positionalThreshold = POSITIONAL_THRESHOLD,
  velocityThreshold = VELOCITY_THRESHOLD,
  /** Quien llama, para el diagnóstico de la invariante. */
  component = 'BottomSheet',
): T {
  if (anchors.length === 0) {
    // Invariante: quien llama siempre arma al menos el ancla oculta. Llegar acá es una falla de
    // matekit, no del uso.
    throw mkError('MK_INTERNAL_INVARIANT', {
      component,
      problem: 'the drag target computation (computeTarget) received an empty anchor list',
      fix: 'this is a matekit bug, not a problem in your code: please report it with steps to reproduce',
    }, { where: 'computeTarget' })
  }
  if (velocity === 0) return closest(anchors, offset)
  const down = velocity > 0
  if (Math.abs(velocity) >= velocityThreshold) return closestToward(anchors, offset, down)[0]
  const above = closestToward(anchors, offset, false)
  const below = closestToward(anchors, offset, true)
  const from = down ? above : below
  const moved = Math.abs(from[1] - offset)
  if (moved >= positionalThreshold) return (down ? below : above)[0]
  return from[0]
}

interface Sample {
  t: number
  /** Posición del puntero sobre el eje. */
  y: number
}

const HORIZON_MS = 100
const STOPPED_MS = 40

/** Velocidad del puntero sobre un eje a partir de sus posiciones con el tiempo (`performance.now()`). */
export class VelocityTracker {
  #samples: Sample[] = []

  add(t: number, y: number) {
    this.#samples.push({ t, y })
    while (this.#samples.length > 2 && t - this.#samples[0]!.t > HORIZON_MS) this.#samples.shift()
  }

  /** px/s, positiva en el sentido creciente del eje; 0 si el puntero se detuvo antes de `now`. */
  velocity(now: number): number {
    const last = this.#samples.at(-1)
    if (!last || now - last.t > STOPPED_MS) return 0
    const first = this.#samples.find((s) => last.t - s.t <= HORIZON_MS) ?? last
    const dt = last.t - first.t
    return dt > 0 ? ((last.y - first.y) / dt) * 1000 : 0
  }
}
