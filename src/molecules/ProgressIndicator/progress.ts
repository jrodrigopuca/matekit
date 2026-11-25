// Datos y cálculos compartidos de LinearProgressIndicator y CircularProgressIndicator (sin JSX,
// sin estado: universal). Fuente de cada valor, en androidx/androidx, carpeta
// compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/:
// - tokens/LinearProgressIndicatorTokens.kt y tokens/CircularProgressIndicatorTokens.kt
//   (@76990c62ac): grosor 4, separación TrackActiveSpace = Space50 = 4, StopSize 4,
//   LargeHeight 10, ActiveWaveAmplitude 3 (lineal) y 1,6 (circular), longitudes de onda 40 y 20
//   (lineal) y 15 (circular), Size 40 y LargeSize 48 (circular);
// - WavyProgressIndicator.kt (@76990c62ac): indicatorAmplitude (onda solo entre 10 % y 95 %),
//   velocidad de la onda (una longitud de onda por segundo), ProgressAnimationSpec;
// - internal/LinearWavyProgressModifiers.kt (@acea2f5c1f): el trazado de la onda (cuadráticas
//   con el control a height - stroke del centro), los tramos y la separación, el punto final;
// - ProgressIndicator.kt (@080d2b3e53): los tiempos de los indeterminados.
// El grosor de 8 (con alto 14 en el lineal y 44/52 en el circular) sale del kit
// (docs/research/05-medidas.md) y de los ejemplos de Compose (ProgressIndicatorSamples.kt
// @acea2f5c1f: LinearThickWavyProgressIndicatorSample, CircularThickWavyProgressIndicatorSample).

/** `value` acotado a [0, 1]; NaN cuenta como 0, como en LoadingIndicator. */
export function clampProgress(value: number): number {
  return Number.isNaN(value) ? 0 : Math.min(1, Math.max(0, value))
}

/** Grosores del kit ("Thickness"): 4 (el de los tokens) y 8. */
export type ProgressIndicatorThickness = 4 | 8

/**
 * Distancia vertical del control de cada cuadrática al centro: height - stroke (10 - 4 y
 * 14 - 8). La curva llega a la mitad: 3 dp, ActiveWaveAmplitude.
 */
const WAVE_CONTROL = 6

/**
 * Ancho máximo del lineal con onda. El trazado se precalcula (sin JavaScript en el navegador no
 * se puede medir el ancho) y cubre este ancho más dos longitudes de onda de desplazamiento; más
 * allá, el indicador se corta. 4096 px cubre una pantalla 4K a lo ancho.
 */
export const LINEAR_MAX_WIDTH = 4096

/** Longitud de onda del lineal: determinado (ActiveWaveWavelength) e indeterminado. */
export const LINEAR_WAVELENGTH = { determinate: 40, indeterminate: 20 } as const

/**
 * Trazado de la onda del lineal, en px, con el centro en y = 0: cuadráticas alternadas (la `t`
 * de SVG refleja el control anterior), la primera hacia abajo, como fullProgressPath en
 * LinearProgressDrawingCache.updateFullPaths.
 */
export function linearWavePath(wavelength: number): string {
  const half = wavelength / 2
  const count = Math.ceil((LINEAR_MAX_WIDTH + 2 * wavelength) / half)
  return `M0 0q${half / 2} ${WAVE_CONTROL} ${half} 0` + ` t${half} 0`.repeat(count - 1)
}

/** El mismo largo, plano. */
export const LINEAR_FLAT_PATH = `M0 0H${LINEAR_MAX_WIDTH + 2 * LINEAR_WAVELENGTH.determinate}`

/**
 * Amplitud del determinado con onda (WavyProgressIndicatorDefaults.indicatorAmplitude): plana
 * hasta el 10 % y desde el 95 %, entera en el medio. El cambio se anima en CSS.
 */
export function hasWave(progress: number): boolean {
  return progress > 0.1 && progress < 0.95
}

/** Lado del circular (kit): plano 40 y 44, con onda 48 y 52, según el grosor. */
export function circularSize(wavy: boolean, thickness: ProgressIndicatorThickness): number {
  return (wavy ? 48 : 40) + (thickness === 8 ? 4 : 0)
}

/**
 * Radio del centro del trazo del circular plano: (40 - 4) / 2 = (44 - 8) / 2 = 18. El circular con
 * onda usa los contornos de circular-wavy-data.ts.
 */
export const CIRCULAR_FLAT_RADIUS = 18

/** Círculo de radio 18 centrado en el origen que empieza a las 12 y va en sentido horario. */
export const CIRCULAR_FLAT_PATH = `M0 ${-CIRCULAR_FLAT_RADIUS}A${CIRCULAR_FLAT_RADIUS} ${CIRCULAR_FLAT_RADIUS} 0 1 1 0 ${CIRCULAR_FLAT_RADIUS}A${CIRCULAR_FLAT_RADIUS} ${CIRCULAR_FLAT_RADIUS} 0 1 1 0 ${-CIRCULAR_FLAT_RADIUS}Z`

/** Largo del círculo de radio 18. */
export const CIRCULAR_FLAT_LENGTH = 2 * Math.PI * CIRCULAR_FLAT_RADIUS

/** Atributos ARIA del rol progressbar: sin aria-valuenow si es indeterminado (WAI-ARIA). */
export function progressAria(progress: number | undefined) {
  return progress === undefined
    ? {}
    : { 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(progress * 100) }
}
