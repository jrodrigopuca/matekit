// Molécula universal (ADR-0003): sin estado, efectos, contexto ni eventos; no lleva 'use client'.
// Todo el dibujo y la animación es CSS sobre un SVG y tres tramos de pista:
// - el ancho no se mide con JavaScript: el lienzo es un contenedor de consultas
//   (container-type: inline-size) y las posiciones se calculan en CSS con 100cqw, así la onda
//   conserva su longitud de onda en px con cualquier ancho;
// - cada tramo del indicador es un guion (stroke-dasharray) de un trazado largo precalculado, con
//   extremos redondos de verdad, como el getSegment de Compose;
// - la amplitud se anima con scaleY sobre el trazado y vector-effect: non-scaling-stroke, que
//   conserva el grosor (la propiedad CSS `d` no existe en WebKit);
// - los indeterminados y el desplazamiento de la onda son @keyframes sobre propiedades
//   registradas con @property.
// Detalle y fuentes en linear-progress-indicator.css y progress.ts.

import type { CSSProperties, HTMLAttributes, Ref } from 'react'
import {
  LINEAR_FLAT_PATH,
  LINEAR_WAVELENGTH,
  clampProgress,
  hasWave,
  linearWavePath,
  progressAria,
  type ProgressIndicatorThickness,
} from './progress.ts'

export interface LinearProgressIndicatorProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'aria-label' | 'role' | 'children'> {
  /**
   * Nombre accesible (se vuelve `aria-label`), por ejemplo "Subiendo foto". Obligatorio: ARIA
   * exige nombre en un `progressbar` y el indicador no tiene texto visible.
   */
  label: string
  /**
   * Progreso de 0 a 1 (fuera de eso se acota). Sin `value`, el indicador es indeterminado. Los
   * cambios se animan (500 ms lineales, la recomendación de Compose para los indicadores de
   * Expressive), salvo con movimiento reducido.
   */
  value?: number | undefined
  /**
   * Onda de Material 3 Expressive. En el determinado aparece entre el 10 % y el 95 % (fuera de eso
   * el indicador se aplana) y se desplaza una longitud de onda por segundo.
   */
  wavy?: boolean | undefined
  /** Grosor del indicador y de la pista, en px: 4 (por defecto) u 8. */
  thickness?: ProgressIndicatorThickness | undefined
  /** Referencia al `<div>` con `role="progressbar"`. */
  ref?: Ref<HTMLDivElement> | undefined
}

const WAVE_PATHS = {
  determinate: linearWavePath(LINEAR_WAVELENGTH.determinate),
  indeterminate: linearWavePath(LINEAR_WAVELENGTH.indeterminate),
}

/**
 * Indicador de progreso lineal de Material 3 (Expressive): pista `secondary-container`, indicador
 * `primary` con extremos redondos, separación de 4 entre ambos y, en el determinado, un punto al
 * final de la pista. Ocupa el ancho de su contenedor (en una fila flex, darle `flex: 1` o un
 * ancho); el alto lo da el grosor (4 u 8, y 10 o 14 con onda). Respeta la dirección del texto
 * (en RTL avanza de derecha a izquierda).
 *
 * Con movimiento reducido, la onda no se desplaza, los cambios de valor no se animan y el
 * indeterminado queda quieto con el indicador latiendo (opacidad).
 *
 * ```tsx
 * <LinearProgressIndicator label="Subiendo foto" value={0.4} />
 * <LinearProgressIndicator label="Cargando" wavy />
 * <LinearProgressIndicator label="Copiando" value={progress} wavy thickness={8} />
 * ```
 */
export function LinearProgressIndicator({
  label,
  value,
  wavy,
  thickness,
  className,
  style,
  ...props
}: LinearProgressIndicatorProps) {
  const progress = value === undefined ? undefined : clampProgress(value)
  const indeterminate = progress === undefined
  const path = wavy ? WAVE_PATHS[indeterminate ? 'indeterminate' : 'determinate'] : LINEAR_FLAT_PATH
  return (
    <div
      {...props}
      role="progressbar"
      aria-label={label}
      {...progressAria(progress)}
      className={className ? `mk-linear-progress-indicator ${className}` : 'mk-linear-progress-indicator'}
      data-wavy={wavy ? '' : undefined}
      data-thickness={thickness === 8 ? '8' : undefined}
      data-indeterminate={indeterminate ? '' : undefined}
      // Con onda, el determinado se aplana cerca de 0 % y 100 % (WavyProgressIndicatorDefaults).
      data-wave={wavy && (indeterminate || hasWave(progress)) ? '' : undefined}
      style={indeterminate ? style : ({ ...style, '--_lpi-value': progress } as CSSProperties)}
    >
      <div className="mk-linear-progress-indicator-canvas">
        <span className="mk-linear-progress-indicator-track" data-segment="end" />
        {indeterminate && (
          <>
            <span className="mk-linear-progress-indicator-track" data-segment="middle" />
            <span className="mk-linear-progress-indicator-track" data-segment="start" />
          </>
        )}
        <svg className="mk-linear-progress-indicator-svg" aria-hidden="true" focusable="false">
          <path className="mk-linear-progress-indicator-active" data-line="1" d={path} />
          {indeterminate && <path className="mk-linear-progress-indicator-active" data-line="2" d={path} />}
        </svg>
        {!indeterminate && <span className="mk-linear-progress-indicator-stop" />}
      </div>
    </div>
  )
}
