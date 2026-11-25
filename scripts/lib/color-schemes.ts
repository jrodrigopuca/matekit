// Esquemas de color por paleta y nivel de contraste, calculados con material-color-utilities
// (la librería oficial de Google para el color de Material 3). Lo usa scripts/build-tokens.ts;
// el resultado se versiona como CSS en src/tokens/, así que la librería es solo de desarrollo.
// Decisión y uso: docs/adr/0008-paletas-y-niveles-de-contraste.md.

import { registerHooks } from 'node:module'
import type * as Mcu from '@material/material-color-utilities'
import type { ColorTokens, ContrastLevel, PaletteTokens, PaletteVariant } from '../../tokens/types.ts'

// El paquete publicado (0.4.0) tiene imports internos sin extensión ('./dynamic_color' en vez
// de './dynamic_color.js') que Node no resuelve; los empaquetadores sí. Este hook agrega la
// extensión solo a esos imports relativos dentro del paquete (07-jetpack-compose.md).
registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context)
    } catch (error) {
      const inPackage = context.parentURL?.includes('/@material/material-color-utilities/') ?? false
      if (inPackage && specifier.startsWith('.') && !specifier.endsWith('.js')) {
        return next(`${specifier}.js`, context)
      }
      throw error
    }
  },
})
const mcu: typeof Mcu = await import('@material/material-color-utilities')
const { Hct, MaterialDynamicColors, argbFromHex, hexFromArgb } = mcu

/** Valores de los 49 roles (`primary`, `on-primary`, …) en claro y oscuro. */
export interface SchemePair {
  light: Record<string, string>
  dark: Record<string, string>
}
export type ContrastSchemes = Record<ContrastLevel, SchemePair>

export const CONTRAST_LEVELS: readonly ContrastLevel[] = ['standard', 'medium', 'high']

// Especificación 2021, la de por defecto en matekit (ADR-0004).
const SPEC = '2021' as const

// Las declaraciones de tipos del paquete tienen el mismo problema ('../dynamiccolor/dynamic_scheme'
// sin extensión): TypeScript no ve que cada Scheme* extiende DynamicScheme. Este tipo lo dice.
type SchemeClass = new (
  sourceColorHct: Mcu.Hct,
  isDark: boolean,
  contrastLevel: number,
  specVersion?: typeof SPEC,
) => Mcu.DynamicScheme

const VARIANTS = {
  'tonal-spot': mcu.SchemeTonalSpot,
  neutral: mcu.SchemeNeutral,
  vibrant: mcu.SchemeVibrant,
  expressive: mcu.SchemeExpressive,
  fidelity: mcu.SchemeFidelity,
  content: mcu.SchemeContent,
  monochrome: mcu.SchemeMonochrome,
  rainbow: mcu.SchemeRainbow,
  'fruit-salad': mcu.SchemeFruitSalad,
} as unknown as Record<PaletteVariant, SchemeClass>

const dynamicColors = new MaterialDynamicColors()
const camel = (role: string) => role.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())

/** Lee los roles de un esquema; `roles` fija el orden y el conjunto (los del kit). */
function readRoles(scheme: Mcu.DynamicScheme, roles: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const role of roles) {
    const color = (dynamicColors as unknown as Record<string, (() => Mcu.DynamicColor) | undefined>)[camel(role)]
    if (typeof color !== 'function') throw new Error(`material-color-utilities no tiene el rol ${role}`)
    out[role] = hexFromArgb(color.call(dynamicColors).getArgb(scheme))
  }
  return out
}

/**
 * Esquema base: no se genera. El estándar es el del kit y el medio y el alto son los valores
 * oficiales de m3.material.io, todos en tokens/color.json (ADR-0008).
 */
export function baselineSchemes(kit: ColorTokens): ContrastSchemes {
  return {
    standard: { light: kit.light, dark: kit.dark },
    medium: kit.contrast.medium,
    high: kit.contrast.high,
  }
}

/** Paleta generada desde un color semilla, en los tres niveles de contraste. */
export function paletteSchemes(
  palette: PaletteTokens['palettes'][string],
  contrast: PaletteTokens['contrast'],
  roles: readonly string[],
): ContrastSchemes {
  const Scheme = VARIANTS[palette.variant]
  const source = Hct.fromInt(argbFromHex(palette.seed))
  const pair = (level: number): SchemePair => ({
    light: readRoles(new Scheme(source, false, level, SPEC), roles),
    dark: readRoles(new Scheme(source, true, level, SPEC), roles),
  })
  return { standard: pair(contrast.standard), medium: pair(contrast.medium), high: pair(contrast.high) }
}
