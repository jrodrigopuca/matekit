// Generado por scripts/build-tokens.ts desde tokens/. No editar a mano.
// Fuente: tokens/space.json (ADR-0016).

/**
 * Escala de espaciado de Material 3: paso → px. El paso es el número del token
 * (`--md-sys-space-200` = 16 px), centésimas de 8: no son px.
 */
export const SPACE = {
  0: 0,
  25: 2,
  50: 4,
  75: 6,
  100: 8,
  125: 10,
  150: 12,
  175: 14,
  200: 16,
  250: 20,
  300: 24,
  400: 32,
  450: 36,
  500: 40,
  600: 48,
  700: 56,
  800: 64,
  900: 72,
} as const

/** Un paso de la escala de espaciado (`0`, `25`, `50`… `900`). */
export type SpaceStep = keyof typeof SPACE
