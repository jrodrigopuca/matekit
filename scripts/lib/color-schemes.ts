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
const { DynamicScheme, Hct, MaterialDynamicColors, TonalPalette, Variant, argbFromHex, hexFromArgb } = mcu

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
 * Esquema base: el estándar es el del kit, tal cual; el medio y el alto se calculan desde las
 * paletas fijas del kit, para que los tres niveles sean el mismo color.
 */
export function baselineSchemes(config: PaletteTokens, kit: ColorTokens): ContrastSchemes {
  const roles = Object.keys(kit.light)
  const b = config.baseline
  const source = Hct.fromInt(argbFromHex(b.primary))
  const palette = (hex: string) => TonalPalette.fromInt(argbFromHex(hex))
  const generate = (contrastLevel: number, isDark: boolean) =>
    readRoles(
      new DynamicScheme({
        sourceColorHct: source,
        variant: Variant.TONAL_SPOT,
        contrastLevel,
        isDark,
        specVersion: SPEC,
        primaryPalette: palette(b.primary),
        secondaryPalette: palette(b.secondary),
        tertiaryPalette: palette(b.tertiary),
        errorPalette: palette(b.error),
        neutralPalette: TonalPalette.fromHueAndChroma(source.hue, b.neutralChroma),
        neutralVariantPalette: TonalPalette.fromHueAndChroma(source.hue, b.neutralVariantChroma),
      }),
      roles,
    )
  return {
    standard: { light: kit.light, dark: kit.dark },
    medium: { light: generate(config.contrast.medium, false), dark: generate(config.contrast.medium, true) },
    high: { light: generate(config.contrast.high, false), dark: generate(config.contrast.high, true) },
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
