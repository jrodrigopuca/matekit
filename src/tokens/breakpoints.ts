// Generado por scripts/build-tokens.ts desde tokens/. No editar a mano.
// Fuente: tokens/breakpoints.json (ADR-0016).

/**
 * Cortes de ancho de las clases de tamaño de ventana de Material 3 (Compose
 * `WindowSizeClass`, BREAKPOINTS_V2): el límite inferior de cada clase, en px. Compact es lo que
 * queda debajo de `medium`. Es un "al menos": la clase expanded es `ancho >= expanded`.
 *
 * Solo para la disposición de la página (cuántos paneles, barra o rail): los componentes se
 * adaptan al espacio de su contenedor con container queries, no a la ventana.
 *
 * Las condiciones de `@media` y `@container` no aceptan `var()`, así que en CSS se escriben
 * literales, en rem (base 16, como el resto de matekit): 37.5rem, 52.5rem, 75rem y 100rem.
 *
 * ```ts
 * const twoPanes = matchMedia(`(min-width: ${WINDOW_WIDTH.expanded / 16}rem)`) // 52.5rem
 * ```
 */
export const WINDOW_WIDTH = {
  medium: 600,
  expanded: 840,
  large: 1200,
  extraLarge: 1600,
} as const

/**
 * Cortes de alto de las clases de tamaño de ventana (límite inferior, en px): compact bajo 480
 * (teléfono en horizontal: dos paneles no entran) y expanded desde 900. En CSS: 30rem y 56.25rem.
 */
export const WINDOW_HEIGHT = {
  medium: 480,
  expanded: 900,
} as const

/** Clase de ancho de ventana con límite inferior propio (compact es la de abajo). */
export type WindowWidthClass = keyof typeof WINDOW_WIDTH
/** Clase de alto de ventana con límite inferior propio. */
export type WindowHeightClass = keyof typeof WINDOW_HEIGHT
