// Genera las variables CSS de matekit a partir de tokens/*.json.
// Uso: pnpm tokens  (o: node scripts/build-tokens.ts)
// Salida: src/tokens/*.css, src/tokens/palettes/*.css y, para TypeScript, src/tokens/space.ts y
// src/tokens/breakpoints.ts (se versionan; no editar a mano).
// Sin React: los tokens deben poder separarse en otro paquete (ADR-0001). La única dependencia
// es material-color-utilities (de desarrollo), que calcula las paletas y los niveles de
// contraste (scripts/lib/color-schemes.ts, ADR-0008).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  BreakpointTokens,
  ColorTokens,
  PaletteTokens,
  ElevationTokens,
  MotionTokens,
  ShapeTokens,
  SpaceTokens,
  SpringName,
  StateTokens,
  TypescaleTokens,
} from '../tokens/types.ts'
import { springToCss, toLinear } from '../tokens/spring.ts'
import { paletteSchemes, type ContrastSchemes } from './lib/color-schemes.ts'
import { block, type Decl } from './lib/css.ts'
import { paletteCss, schemeRules } from './lib/palette-css.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = <T>(name: string): T =>
  JSON.parse(readFileSync(join(root, 'tokens', name), 'utf8')) as T
const outDir = join(root, 'src', 'tokens')
mkdirSync(outDir, { recursive: true })

// El texto de la fuente puede traer "*/" (por ejemplo "State Layers/*/Opacity"), que cerraría
// el comentario antes de tiempo y rompería el CSS; "/*" se neutraliza también por claridad.
const safe = (s: string): string => s.replaceAll('*/', '*∕').replaceAll('/*', '∕*')
const header = (source: string): string =>
  `/* Generado por scripts/build-tokens.ts desde tokens/. No editar a mano.\n   Fuente: ${safe(source)} */\n`

// px -> rem con base 16, sin ceros sobrantes.
const rem = (px: number): string => (px === 0 ? '0' : `${+(px / 16).toFixed(6)}rem`)
const px = (n: number): string => (n === 0 ? '0' : `${n}px`)

const vars = (obj: Record<string, string | number>, prefix: string): Decl[] =>
  Object.entries(obj).map(([k, v]) => [`--${prefix}${k}`, v] as const)

// Color (ADR-0008): el CSS de cada esquema lo escribe scripts/lib/palette-css.ts.
const palettesConfig = read<PaletteTokens>('palettes.json')
const kitColor = read<ColorTokens>('color.json')

// Esquema base: no se genera. El estándar es el del kit y el medio y el alto, los valores
// oficiales de m3.material.io, todos en tokens/color.json (ADR-0008).
const baselineSchemes = (kit: ColorTokens): ContrastSchemes => ({
  standard: { light: kit.light, dark: kit.dark },
  medium: kit.contrast.medium,
  high: kit.contrast.high,
})

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
  const out: Record<string, string> = {}
  for (const [name, palette] of Object.entries(palettesConfig.palettes)) {
    const schemes = paletteSchemes(palette, palettesConfig.contrast)
    out[`${name}.css`] =
      header(`${palettesConfig.$source} Paleta "${palette.label}": semilla ${palette.seed}, variante ${palette.variant ?? 'tonal-spot'}.`) +
      paletteCss(name, schemes)
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

// Espaciado (ADR-0016): --md-sys-space-<paso>, en px como las esquinas (1 dp = 1 px CSS).
const spaceTokens = read<SpaceTokens>('space.json')
function buildSpace(): string {
  const values = Object.fromEntries(Object.entries(spaceTokens.space).map(([k, v]) => [k, px(v)]))
  return header(spaceTokens.$source) + '\n' + block(':root', vars(values, 'md-sys-space-'))
}

// Los mismos datos para TypeScript: los pasos tipan la prop gap de Stack, y los cortes de ventana
// sirven para matchMedia (no hay variables CSS de cortes: @media y @container no aceptan var()).
const tsHeader = (source: string): string =>
  `// Generado por scripts/build-tokens.ts desde tokens/. No editar a mano.\n// Fuente: ${source}\n\n`

function buildSpaceTs(): string {
  const entries = Object.entries(spaceTokens.space)
    .map(([k, v]) => `  ${k}: ${v},`)
    .join('\n')
  return (
    tsHeader('tokens/space.json (ADR-0016).') +
    '/**\n' +
    ' * Escala de espaciado de Material 3: paso → px. El paso es el número del token\n' +
    ' * (`--md-sys-space-200` = 16 px), centésimas de 8: no son px.\n' +
    ' */\n' +
    `export const SPACE = {\n${entries}\n} as const\n\n` +
    '/** Un paso de la escala de espaciado (`0`, `25`, `50`… `900`). */\n' +
    'export type SpaceStep = keyof typeof SPACE\n'
  )
}

function buildBreakpointsTs(): string {
  const b = read<BreakpointTokens>('breakpoints.json')
  const obj = (o: Record<string, number>) =>
    Object.entries(o)
      .map(([k, v]) => `  ${k}: ${v},`)
      .join('\n')
  return (
    tsHeader('tokens/breakpoints.json (ADR-0016).') +
    `/**
 * Cortes de ancho de las clases de tamaño de ventana de Material 3 (Compose
 * \`WindowSizeClass\`, BREAKPOINTS_V2): el límite inferior de cada clase, en px. Compact es lo que
 * queda debajo de \`medium\`. Es un "al menos": la clase expanded es \`ancho >= expanded\`.
 *
 * Solo para la disposición de la página (cuántos paneles, barra o rail): los componentes se
 * adaptan al espacio de su contenedor con container queries, no a la ventana.
 *
 * Las condiciones de \`@media\` y \`@container\` no aceptan \`var()\`, así que en CSS se escriben
 * literales, en rem (base 16, como el resto de matekit): 37.5rem, 52.5rem, 75rem y 100rem.
 *
 * \`\`\`ts
 * const twoPanes = matchMedia(\`(min-width: \${WINDOW_WIDTH.expanded / 16}rem)\`) // 52.5rem
 * \`\`\`
 */
export const WINDOW_WIDTH = {
${obj(b.width)}
} as const

/**
 * Cortes de alto de las clases de tamaño de ventana (límite inferior, en px): compact bajo 480
 * (teléfono en horizontal: dos paneles no entran) y expanded desde 900. En CSS: 30rem y 56.25rem.
 */
export const WINDOW_HEIGHT = {
${obj(b.height)}
} as const

/** Clase de ancho de ventana con límite inferior propio (compact es la de abajo). */
export type WindowWidthClass = keyof typeof WINDOW_WIDTH
/** Clase de alto de ventana con límite inferior propio. */
export type WindowHeightClass = keyof typeof WINDOW_HEIGHT
`
  )
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
  'space.css': buildSpace(),
  'elevation.css': buildElevation(),
  'state.css': buildState(),
  'motion.css': buildMotion(),
}
for (const [name, css] of Object.entries(files)) writeFileSync(join(outDir, name), css)

const tsFiles: Record<string, string> = {
  'space.ts': buildSpaceTs(),
  'breakpoints.ts': buildBreakpointsTs(),
}
for (const [name, ts] of Object.entries(tsFiles)) writeFileSync(join(outDir, name), ts)

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

console.log(`Tokens generados en src/tokens/: ${[...Object.keys(files), 'index.css', ...Object.keys(tsFiles)].join(', ')}`)
console.log(`Paletas generadas en src/tokens/palettes/: ${[...Object.keys(palettes), 'index.css'].join(', ')}`)
