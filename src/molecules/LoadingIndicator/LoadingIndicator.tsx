// Molécula universal (ADR-0003): sin estado, efectos, contexto ni eventos; no lleva 'use client'.
// La animación es SVG nativo (SMIL: <animate> y <animateTransform>), que corre sin JavaScript.
//
// Vive en molecules/ y no en atoms/: como Badge, tiene significado propio (es un progressbar con
// nombre) y no es una primitiva para armar otros componentes, aunque se pueda usar dentro de uno.
//
// Los contornos y los tiempos se calculan al compilar (pnpm shapes, ADR-0011) con la portación
// de Morph de scripts/lib/shapes/ y están en loading-indicator-data.ts. Cómo se reparte la
// animación (todo en un mismo reloj de SVG, así svg.setCurrentTime() la controla entera):
// - un grupo gira una vuelta lineal cada 4666 ms;
// - otro gira 90° en cada cambio de forma, con el resorte, sumándose (accumulate="sum");
// - un <path> por transición (las 7 tienen estructuras de comandos distintas): cada uno anima su
//   contorno y se hace visible solo durante su cambio y la espera previa.

import type { HTMLAttributes, Ref } from 'react'
import type { AccessibleNameProps } from '../../internal/accessible-name.ts'
import { clampProgress, determinatePathData, determinateRotation } from './determinate.ts'
import {
  CYCLE_MS,
  GLOBAL_ROTATION_MS,
  MORPH_MS,
  MORPH_ROTATION,
  SHAPE_KEY_SPLINES,
  SHAPE_KEY_TIMES,
  STEPS,
  TRANSITIONS,
  VIEW_BOX,
  VISIBILITY_KEY_TIMES,
} from './loading-indicator-data.ts'

/**
 * El nombre accesible es obligatorio (ARIA lo exige en un `progressbar` y el indicador no tiene
 * texto visible): `label` (se vuelve `aria-label`), `aria-labelledby` (el id de una etiqueta
 * visible) o `aria-label`. TypeScript exige al menos uno (AccessibleNameProps).
 */
export type LoadingIndicatorProps = Omit<HTMLAttributes<HTMLSpanElement>, 'aria-label' | 'aria-labelledby' | 'role' | 'children'> &
  AccessibleNameProps & {
  /** Con contenedor: un círculo `primary-container` con la forma en `on-primary-container`. */
  contained?: boolean | undefined
  /**
   * Progreso de 0 a 1 (fuera de eso se acota). Sin `value`, el indicador es indeterminado: gira
   * y cambia de forma solo. Con `value`, es determinado: pasa del círculo a la forma de
   * SoftBurst y gira media vuelta a medida que avanza.
   */
  value?: number | undefined
  /** Referencia al `<span>` con `role="progressbar"`. */
  ref?: Ref<HTMLSpanElement> | undefined
}

const repeat = { repeatCount: 'indefinite' } as const

/**
 * Indicador de carga de Material 3 Expressive: una forma que gira y pasa por siete formas
 * (indeterminado) o que avanza con `value` (determinado). Mide 48 × 48; otro tamaño se da con
 * `width` y `height` en CSS y la forma se escala.
 *
 * Con movimiento reducido (`prefers-reduced-motion: reduce`), el indeterminado se muestra quieto
 * en la primera forma, latiendo en opacidad (la misma señal de actividad que los indicadores de
 * progreso indeterminados); el determinado queda quieto.
 *
 * ```tsx
 * <LoadingIndicator label="Cargando mensajes" />
 * <LoadingIndicator contained label="Actualizando" />
 * <LoadingIndicator value={0.4} label="Subiendo foto" />
 * ```
 */
export function LoadingIndicator({
  label,
  'aria-label': ariaLabel,
  contained,
  value,
  className,
  ...props
}: LoadingIndicatorProps) {
  const progress = value === undefined ? undefined : clampProgress(value)
  return (
    <span
      {...props}
      role="progressbar"
      aria-label={label ?? ariaLabel}
      // Indeterminado: sin aria-valuenow (WAI-ARIA, rol progressbar). Determinado: de 0 a 100,
      // que los lectores de pantalla anuncian como porcentaje.
      {...(progress === undefined
        ? {}
        : { 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(progress * 100) })}
      className={className ? `mk-loading-indicator ${className}` : 'mk-loading-indicator'}
      data-contained={contained ? '' : undefined}
    >
      <svg className="mk-loading-indicator-svg" viewBox={VIEW_BOX} aria-hidden="true" focusable="false">
        {progress === undefined ? (
          <>
            <g className="mk-loading-indicator-motion">
              <animateTransform attributeName="transform" type="rotate" values="0;360" dur={`${GLOBAL_ROTATION_MS}ms`} {...repeat} />
              <g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values={MORPH_ROTATION.values}
                  keyTimes={MORPH_ROTATION.keyTimes}
                  keySplines={MORPH_ROTATION.keySplines}
                  calcMode="spline"
                  accumulate="sum"
                  dur={`${MORPH_MS}ms`}
                  {...repeat}
                />
                {TRANSITIONS.map((t) => (
                  <path key={t.begin} className="mk-loading-indicator-shape">
                    <animate
                      attributeName="d"
                      values={t.values}
                      keyTimes={SHAPE_KEY_TIMES}
                      keySplines={SHAPE_KEY_SPLINES}
                      calcMode="spline"
                      begin={t.begin}
                      dur={`${CYCLE_MS}ms`}
                      {...repeat}
                    />
                    <animate
                      attributeName="visibility"
                      values="visible;hidden;visible"
                      keyTimes={VISIBILITY_KEY_TIMES}
                      calcMode="discrete"
                      begin={t.begin}
                      dur={`${CYCLE_MS}ms`}
                      {...repeat}
                    />
                  </path>
                ))}
              </g>
            </g>
            <path className="mk-loading-indicator-still" d={STEPS[0]} />
          </>
        ) : (
          <path d={determinatePathData(progress)} transform={`rotate(${determinateRotation(progress)})`} />
        )}
      </svg>
    </span>
  )
}
