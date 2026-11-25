// Molécula universal (ADR-0003): sin estado, efectos, contexto ni eventos; no lleva 'use client'.
// SVG de tamaño fijo (40, 44, 48 o 52) animado con CSS:
// - la pista y el indicador son guiones (stroke-dasharray) de un círculo, o de los contornos de
//   Compose con onda (circular-wavy-data.ts, pnpm shapes), con pathLength para medir en dp o en
//   fracciones del trazo;
// - el valor, el barrido del indeterminado y los giros son propiedades CSS animadas;
// - con onda, el cambio de amplitud (círculo ↔ estrella) interpola la propiedad CSS `d` donde
//   existe (Chrome y Firefox); WebKit no tiene esa propiedad y cambia el contorno sin transición.
// Detalle y fuentes en circular-progress-indicator.css y progress.ts.

import type { CSSProperties, HTMLAttributes, Ref } from 'react'
import type { AccessibleNameProps } from '../../internal/accessible-name.ts'
import { FLAT_PATH, TRACK_LENGTH, TRACK_PATH, WAVE_PATH } from './circular-wavy-data.ts'
import {
  CIRCULAR_FLAT_LENGTH,
  CIRCULAR_FLAT_PATH,
  circularSize,
  clampProgress,
  hasWave,
  progressAria,
  type ProgressIndicatorThickness,
} from './progress.ts'

/**
 * El nombre accesible es obligatorio (ARIA lo exige en un `progressbar` y el indicador no tiene
 * texto visible): `label` (se vuelve `aria-label`), `aria-labelledby` (el id de una etiqueta
 * visible) o `aria-label`. TypeScript exige al menos uno (AccessibleNameProps).
 */
export type CircularProgressIndicatorProps = Omit<HTMLAttributes<HTMLSpanElement>, 'aria-label' | 'aria-labelledby' | 'role' | 'children'> &
  AccessibleNameProps & {
  /**
   * Progreso de 0 a 1 (fuera de eso se acota). Sin `value`, el indicador es indeterminado. Los
   * cambios se animan (500 ms lineales), salvo con movimiento reducido.
   */
  value?: number | undefined
  /** Onda de Material 3 Expressive (en el determinado, entre el 10 % y el 95 %). */
  wavy?: boolean | undefined
  /** Grosor del indicador y de la pista, en px: 4 (por defecto) u 8. */
  thickness?: ProgressIndicatorThickness | undefined
  /** Referencia al `<span>` con `role="progressbar"`. */
  ref?: Ref<HTMLSpanElement> | undefined
}

/**
 * Indicador de progreso circular de Material 3 (Expressive): pista `secondary-container` e
 * indicador `primary` con extremos redondos, separados por 4, que avanza en sentido horario desde
 * las 12. Mide 40 × 40 (44 con grosor 8), o 48 × 48 (52) con onda.
 *
 * Con movimiento reducido, no gira, la onda no se desplaza y los cambios de valor no se animan; el
 * indeterminado queda quieto en un cuarto de vuelta con el indicador latiendo (opacidad).
 *
 * ```tsx
 * <CircularProgressIndicator label="Actualizando" />
 * <CircularProgressIndicator label="Descargando" value={0.6} wavy />
 * ```
 */
export function CircularProgressIndicator({
  label,
  'aria-label': ariaLabel,
  value,
  wavy,
  thickness,
  className,
  style,
  ...props
}: CircularProgressIndicatorProps) {
  const progress = value === undefined ? undefined : clampProgress(value)
  const indeterminate = progress === undefined
  const wave = !!wavy && (indeterminate || hasWave(progress))
  const size = circularSize(!!wavy, thickness ?? 4)
  const trackPath = wavy ? TRACK_PATH : CIRCULAR_FLAT_PATH
  const trackLength = wavy ? TRACK_LENGTH : CIRCULAR_FLAT_LENGTH
  const activePath = wavy ? (wave ? WAVE_PATH : FLAT_PATH) : CIRCULAR_FLAT_PATH
  const vars = { '--_cpi-track-length': trackLength, ...(indeterminate ? {} : { '--_cpi-value': progress }) }
  return (
    <span
      {...props}
      role="progressbar"
      aria-label={label ?? ariaLabel}
      {...progressAria(progress)}
      className={className ? `mk-circular-progress-indicator ${className}` : 'mk-circular-progress-indicator'}
      data-wavy={wavy ? '' : undefined}
      data-thickness={thickness === 8 ? '8' : undefined}
      data-indeterminate={indeterminate ? '' : undefined}
      data-wave={wave ? '' : undefined}
      style={{ ...style, ...vars } as CSSProperties}
    >
      <svg
        className="mk-circular-progress-indicator-svg"
        viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}
        aria-hidden="true"
        focusable="false"
      >
        <g className="mk-circular-progress-indicator-rotor">
          <g className="mk-circular-progress-indicator-step">
            <path className="mk-circular-progress-indicator-track" d={trackPath} pathLength={trackLength} />
            {/* Solo en alto contraste: vacía la pista para que se distinga del indicador. */}
            <path
              className="mk-circular-progress-indicator-track mk-circular-progress-indicator-track-inner"
              d={trackPath}
              pathLength={trackLength}
            />
            <path
              className="mk-circular-progress-indicator-active"
              d={activePath}
              pathLength={100}
              // La propiedad CSS `d` (Chrome y Firefox) permite la transición entre los dos contornos
              // del Morph; donde no existe, manda el atributo.
              style={wavy ? ({ d: `path("${activePath}")` } as CSSProperties) : undefined}
            />
          </g>
        </g>
      </svg>
    </span>
  )
}
