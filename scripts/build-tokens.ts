// Genera las variables CSS de matekit a partir de tokens/*.json.
// Uso: pnpm tokens  (o: node scripts/build-tokens.ts)
// Salida: src/tokens/*.css (se versionan; no editar a mano).
// Sin dependencias ni React: los tokens deben poder separarse en otro paquete (ADR-0001).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  ColorTokens,
  ElevationTokens,
  ShapeTokens,
  StateTokens,
  TypescaleTokens,
} from '../tokens/types.ts'

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

// Color: claro por defecto, oscuro por preferencia del sistema o por data-theme.
// data-theme se puede poner en cualquier elemento para tematizar solo esa parte.
function buildColor(): string {
  const color = read<ColorTokens>('color.json')
  const light: Decl[] = [['color-scheme', 'light'], ...vars(color.light, 'md-sys-color-')]
  const dark: Decl[] = [['color-scheme', 'dark'], ...vars(color.dark, 'md-sys-color-')]
  return (
    header(color.$source) +
    '\n' +
    block(':root,\n[data-theme="light"]', light) +
    '\n' +
    block('[data-theme="dark"]', dark) +
    '\n@media (prefers-color-scheme: dark) {\n' +
    block(':root:not([data-theme="light"])', dark, '  ') +
    '}\n'
  )
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

const files: Record<string, string> = {
  'color.css': buildColor(),
  'typescale.css': buildTypescale(),
  'shape.css': buildShape(),
  'elevation.css': buildElevation(),
  'state.css': buildState(),
}
for (const [name, css] of Object.entries(files)) writeFileSync(join(outDir, name), css)

writeFileSync(
  join(outDir, 'index.css'),
  header('todos los archivos de tokens') +
    Object.keys(files)
      .map((f) => `@import './${f}';`)
      .join('\n') +
    '\n',
)

console.log(`Tokens generados en src/tokens/: ${[...Object.keys(files), 'index.css'].join(', ')}`)
