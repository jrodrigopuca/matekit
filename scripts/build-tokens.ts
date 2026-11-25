// Genera las variables CSS de matekit a partir de tokens/*.json.
// Uso: pnpm tokens  (o: node scripts/build-tokens.ts)
// Salida: src/tokens/*.css y src/tokens/palettes/*.css (se versionan; no editar a mano).
// Sin React: los tokens deben poder separarse en otro paquete (ADR-0001). La única dependencia
// es material-color-utilities (de desarrollo), que calcula las paletas y los niveles de
// contraste (scripts/lib/color-schemes.ts, ADR-0008).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  ColorTokens,
  ContrastLevel,
  PaletteTokens,
  ElevationTokens,
  MotionTokens,
  ShapeTokens,
  SpringName,
  StateTokens,
  TypescaleTokens,
} from '../tokens/types.ts'
import { springToCss, toLinear } from '../tokens/spring.ts'
import {
  CONTRAST_LEVELS,
  baselineSchemes,
  paletteSchemes,
  type ContrastSchemes,
  type SchemePair,
} from './lib/color-schemes.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = <T>(name: string): T =>
  JSON.parse(readFileSync(join(root, 'tokens', name), 'utf8')) as T
const outDir = join(root, 'src', 'tokens')
mkdirSync(outDir, { recursive: true })

type Decl = readonly [name: string, value: string | number]

// El texto de la fuente puede traer "*/" (por ejemplo "State Layers/*/Opacity"), que cerraría
// el comentario antes de tiempo y rompería el CSS; "/*" se neutraliza también por claridad.
const safe = (s: string): string => s.replaceAll('*/', '*∕').replaceAll('/*', '∕*')
const header = (source: string): string =>
  `/* Generado por scripts/build-tokens.ts desde tokens/. No editar a mano.\n   Fuente: ${safe(source)} */\n`

// px -> rem con base 16, sin ceros sobrantes.
const rem = (px: number): string => (px === 0 ? '0' : `${+(px / 16).toFixed(6)}rem`)
const px = (n: number): string => (n === 0 ? '0' : `${n}px`)

function block(selector: string, decls: readonly Decl[], indent = ''): string {
  const body = decls.map(([name, value]) => `${indent}  ${name}: ${value};`).join('\n')
  return `${indent}${selector} {\n${body}\n${indent}}\n`
}
const vars = (obj: Record<string, string | number>, prefix: string): Decl[] =>
  Object.entries(obj).map(([k, v]) => [`--${prefix}${k}`, v] as const)

// Color (ADR-0008). Cada rol se escribe una vez con light-dark(claro, oscuro): el navegador
// elige según el color-scheme del elemento donde se usa la variable, que se hereda. :root sigue
// al sistema (light dark) y data-theme lo fija en cualquier elemento, así que un data-theme
// anidado funciona aunque las variables vengan de más arriba.
//
// Paleta y contraste se eligen con data-palette y data-contrast, también en cualquier elemento:
// - nivel estándar: el selector de la paleta;
// - otro nivel: data-contrast en el mismo elemento que la paleta, en un ancestro o en un
//   descendiente (este último vuelve a declarar los roles con la paleta de arriba);
// - prefers-contrast: more elige el nivel alto donde nadie fijó data-contrast.
// Especificidad: el mismo elemento (0,2,0) le gana al ancestro (0,1,0, por :where); el ancestro
// le gana al nivel estándar por orden. Límite: dos data-contrast distintos encima de la misma
// paleta se resuelven por orden (alto > medio > estándar), no por cercanía.
const colorDecls = ({ light, dark }: SchemePair): Decl[] =>
  Object.keys(light).map((role) => {
    const l = light[role] ?? ''
    const d = dark[role] ?? ''
    return [`--md-sys-color-${role}`, l === d ? l : `light-dark(${l}, ${d})`] as const
  })

function schemeRules(selectors: readonly string[], schemes: ContrastSchemes, indent: string): string {
  const parts = [block(selectors.join(`,\n${indent}`), colorDecls(schemes.standard), indent)]
  for (const level of CONTRAST_LEVELS) {
    // :root no tiene ancestros: se omite la regla del ancestro.
    const sel = selectors.flatMap((s) => [
      `${s}[data-contrast="${level}"]`,
      ...(s === ':root' ? [] : [`:where([data-contrast="${level}"]) ${s}`]),
      `${s} [data-contrast="${level}"]`,
    ])
    parts.push(block(sel.join(`,\n${indent}`), colorDecls(schemes[level]), indent))
  }
  const auto = `:is(${selectors.join(', ')}):not([data-contrast], [data-contrast] *)`
  parts.push(
    `${indent}@media (prefers-contrast: more) {\n` +
      block(auto, colorDecls(schemes.high), `${indent}  `) +
      `${indent}}\n`,
  )
  return parts.join('\n')
}

const LAYER_ORDER = '@layer matekit.tokens, matekit.palettes, matekit.atoms, matekit.components;'
const palettesConfig = read<PaletteTokens>('palettes.json')
const kitColor = read<ColorTokens>('color.json')

function buildColor(): string {
  const schemes = baselineSchemes(kitColor)
  return (
    header(`${kitColor.$source} Contraste medio y alto: ${kitColor.$contrastSource}`) +
    '\n' +
    block(':root', [['color-scheme', 'light dark']]) +
    block('[data-theme="light"]', [['color-scheme', 'light']]) +
    block('[data-theme="dark"]', [['color-scheme', 'dark']]) +
    '\n' +
    schemeRules([':root', '[data-palette="baseline"]'], schemes, '')
  )
}

// Paletas opcionales: un archivo por paleta, en la capa matekit.palettes, que va después de
// matekit.tokens. Así le ganan al esquema base sin importar el orden en que se importen.
function buildPalettes(): Record<string, string> {
  const roles = Object.keys(kitColor.light)
  const out: Record<string, string> = {}
  for (const [name, palette] of Object.entries(palettesConfig.palettes)) {
    const schemes = paletteSchemes(palette, palettesConfig.contrast, roles)
    out[`${name}.css`] =
      header(`${palettesConfig.$source} Paleta "${palette.label}": semilla ${palette.seed}, variante ${palette.variant}.`) +
      `/* Uso: importar este archivo y poner data-palette="${name}" en cualquier elemento. */\n\n` +
      `${LAYER_ORDER}\n\n@layer matekit.palettes {\n` +
      schemeRules([`[data-palette="${name}"]`], schemes, '  ') +
      '}\n'
  }
  return out
}

function buildTypescale(): string {
  const t = read<TypescaleTokens>('typescale.json')
  const out: Record<string, string | number> = {
    'md-ref-typeface-brand': `${t.typeface.brand}, system-ui, sans-serif`,
    'md-ref-typeface-plain': `${t.typeface.plain}, system-ui, sans-serif`,
    'md-ref-typeface-weight-regular': t.weight.regular,
    'md-ref-typeface-weight-medium': t.weight.medium,
    'md-ref-typeface-weight-semibold': t.weight.semibold,
  }
  for (const [name, s] of Object.entries(t.styles)) {
    const p = `md-sys-typescale-${name}`
    out[`${p}-font`] = `var(--md-ref-typeface-${s.typeface})`
    out[`${p}-size`] = rem(s.size)
    out[`${p}-line-height`] = rem(s.lineHeight)
    out[`${p}-tracking`] = rem(s.tracking)
    out[`${p}-weight`] = s.weight
    out[`${p}-weight-emphasized`] = s.weightEmphasized
  }
  return header(t.$source) + '\n' + block(':root', vars(out, ''))
}

function buildShape(): string {
  const s = read<ShapeTokens>('shape.json')
  const corners = Object.fromEntries(Object.entries(s.corner).map(([k, v]) => [k, px(v)]))
  return header(s.$source) + '\n' + block(':root', vars(corners, 'md-sys-shape-corner-'))
}

function buildElevation(): string {
  const { $source, ...levels } = read<ElevationTokens>('elevation.json')
  const values: Record<string, string> = {}
  for (const [level, shadows] of Object.entries(levels)) {
    values[level] = shadows.length
      ? shadows.map(([x, y, b, s, c]) => `${px(x)} ${px(y)} ${px(b)} ${px(s)} ${c}`).join(', ')
      : 'none'
  }
  return header($source) + '\n' + block(':root', vars(values, 'md-sys-elevation-'))
}

function buildState(): string {
  const { $source, $notes: _notes, ...state } = read<StateTokens>('state.json')
  const values: Record<string, string | number> = {}
  for (const [name, v] of Object.entries(state)) {
    values[name] = name.endsWith('thickness') ? px(v) : v
  }
  return header($source) + '\n' + block(':root', vars(values, 'md-sys-state-'))
}

// Movimiento: esquema expressive por defecto, standard con data-motion="standard" en cualquier
// elemento. Cada resorte da dos variables: -duration y -easing (curva linear()).
// Uso: transition: transform var(--md-sys-motion-spring-fast-spatial-duration)
//                            var(--md-sys-motion-spring-fast-spatial-easing);
function buildMotion(): string {
  const m = read<MotionTokens>('motion.json')
  const springDecls = (scheme: 'standard' | 'expressive'): Decl[] =>
    (Object.entries(m.springs[scheme]) as [SpringName, (typeof m.springs)['standard'][SpringName]][])
      .flatMap(([name, spring]) => {
        const css = springToCss(spring)
        return [
          [`--md-sys-motion-spring-${name}-duration`, `${css.durationMs}ms`],
          [`--md-sys-motion-spring-${name}-easing`, toLinear(css.points)],
        ] as const
      })
  const durations = Object.fromEntries(Object.entries(m.duration).map(([k, v]) => [k, `${v}ms`]))
  const easings = Object.fromEntries(
    Object.entries(m.easing).map(([k, v]) => [k, `cubic-bezier(${v.join(', ')})`]),
  )
  const reduced: Decl[] = (['fast-spatial', 'default-spatial', 'slow-spatial'] as const).map(
    (name) => [`--md-sys-motion-spring-${name}-duration`, '0ms'] as const,
  )
  return (
    header(m.$source) +
    '\n' +
    block(':root,\n[data-motion="expressive"]', springDecls('expressive')) +
    '\n' +
    block('[data-motion="standard"]', springDecls('standard')) +
    '\n' +
    block(
      ':root',
      [...vars(durations, 'md-sys-motion-duration-'), ...vars(easings, 'md-sys-motion-easing-')],
    ) +
    '\n/* Movimiento reducido: los resortes spatial (desplazamiento, forma) no animan;\n   los effects (color, opacidad) se mantienen. */\n' +
    '@media (prefers-reduced-motion: reduce) {\n' +
    block(':root,\n  [data-motion]', reduced, '  ') +
    '}\n'
  )
}

const files: Record<string, string> = {
  'color.css': buildColor(),
  'typescale.css': buildTypescale(),
  'shape.css': buildShape(),
  'elevation.css': buildElevation(),
  'state.css': buildState(),
  'motion.css': buildMotion(),
}
for (const [name, css] of Object.entries(files)) writeFileSync(join(outDir, name), css)

const palettes = buildPalettes()
const paletteDir = join(outDir, 'palettes')
mkdirSync(paletteDir, { recursive: true })
for (const [name, css] of Object.entries(palettes)) writeFileSync(join(paletteDir, name), css)
writeFileSync(
  join(paletteDir, 'index.css'),
  header('todas las paletas opcionales') +
    Object.keys(palettes)
      .map((f) => `@import './${f}';`)
      .join('\n') +
    '\n',
)

writeFileSync(
  join(outDir, 'index.css'),
  header('todos los archivos de tokens') +
    Object.keys(files)
      .map((f) => `@import './${f}';`)
      .join('\n') +
    '\n',
)

console.log(`Tokens generados en src/tokens/: ${[...Object.keys(files), 'index.css'].join(', ')}`)
console.log(`Paletas generadas en src/tokens/palettes/: ${[...Object.keys(palettes), 'index.css'].join(', ')}`)
