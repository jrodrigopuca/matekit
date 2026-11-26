// Comprueba que src/tokens/*.css refleja exactamente tokens/*.json y que el CSS está bien formado.
// Uso: pnpm test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { BreakpointTokens, ColorTokens, ShapeTokens, SpaceTokens, TypescaleTokens } from '../tokens/types.ts'
import { SPACE } from '../src/tokens/space.ts'
import { WINDOW_HEIGHT, WINDOW_WIDTH } from '../src/tokens/breakpoints.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const json = <T>(name: string): T =>
  JSON.parse(readFileSync(join(root, 'tokens', name), 'utf8')) as T
const css = (name: string): string => readFileSync(join(root, 'src', 'tokens', name), 'utf8')
const FILES = [
  'color.css',
  'typescale.css',
  'shape.css',
  'space.css',
  'elevation.css',
  'state.css',
  'motion.css',
  'index.css',
]

type Decls = Record<string, string>
interface Block {
  selector: string
  decls: Decls
  dupes: string[]
}

const stripComments = (text: string): string => text.replace(/\/\*[\s\S]*?\*\//g, '')

// Bloques "selector { ... }" sin llaves anidadas, sin comentarios.
function blocks(text: string): Block[] {
  const out: Block[] = []
  for (const m of stripComments(text).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const decls: Decls = {}
    const dupes: string[] = []
    for (const d of (m[2] ?? '').matchAll(/([\w-]+)\s*:\s*([^;]+);/g)) {
      const [, name = '', value = ''] = d
      if (name in decls) dupes.push(name)
      decls[name] = value.trim()
    }
    out.push({ selector: (m[1] ?? '').replace(/@media[^{]*$/, '').trim(), decls, dupes })
  }
  return out
}

function find(list: Block[], selector: string): Decls {
  const b = list.find((x) => x.selector === selector)
  assert.ok(b, `falta el bloque ${selector}`)
  return b.decls
}

test('el CSS está bien formado: comentarios y llaves balanceados, sin variables repetidas', () => {
  for (const f of FILES) {
    const text = css(f)
    assert.equal(text.split('/*').length, text.split('*/').length, `${f}: comentarios desbalanceados`)
    const clean = stripComments(text)
    assert.equal(clean.split('{').length, clean.split('}').length, `${f}: llaves desbalanceadas`)
    for (const b of blocks(text)) assert.deepEqual(b.dupes, [], `${f} ${b.selector}: repetidas`)
  }
})

test('color: los 49 roles del kit en el nivel estándar, con light-dark(claro, oscuro)', () => {
  const src = json<ColorTokens>('color.json')
  const list = blocks(css('color.css'))
  const base = find(list, ':root,\n[data-palette="baseline"]')
  assert.equal(Object.keys(src.light).length, 49)
  for (const [role, light] of Object.entries(src.light)) {
    const dark = src.dark[role]
    const expected = light === dark ? light : `light-dark(${light}, ${dark})`
    assert.equal(base[`--md-sys-color-${role}`], expected, role)
  }
  assert.equal(find(list, ':root')['color-scheme'], 'light dark')
  assert.equal(find(list, '[data-theme="light"]')['color-scheme'], 'light')
  assert.equal(find(list, '[data-theme="dark"]')['color-scheme'], 'dark')
})

test('tipografía: tamaño, interlineado y espaciado en rem equivalen a los px del kit', () => {
  const src = json<TypescaleTokens>('typescale.json')
  const d = find(blocks(css('typescale.css')), ':root')
  const toPx = (v: string | undefined): number => (v === '0' ? 0 : parseFloat(v ?? 'NaN') * 16)
  for (const [name, s] of Object.entries(src.styles)) {
    const p = `--md-sys-typescale-${name}`
    assert.ok(Math.abs(toPx(d[`${p}-size`]) - s.size) < 0.001, `${name} tamaño`)
    assert.ok(Math.abs(toPx(d[`${p}-line-height`]) - s.lineHeight) < 0.001, `${name} interlineado`)
    assert.ok(Math.abs(toPx(d[`${p}-tracking`]) - s.tracking) < 0.001, `${name} espaciado`)
    assert.equal(d[`${p}-weight`], String(s.weight), `${name} peso`)
    assert.equal(d[`${p}-weight-emphasized`], String(s.weightEmphasized), `${name} peso enfatizado`)
    assert.equal(d[`${p}-font`], `var(--md-ref-typeface-${s.typeface})`, `${name} fuente`)
  }
  assert.equal(Object.keys(src.styles).length, 15)
})

test('esquinas, elevación y estados coinciden con la fuente', () => {
  const shape = find(blocks(css('shape.css')), ':root')
  for (const [k, v] of Object.entries(json<ShapeTokens>('shape.json').corner)) {
    assert.equal(shape[`--md-sys-shape-corner-${k}`], v === 0 ? '0' : `${v}px`, `esquina ${k}`)
  }
  const elev = find(blocks(css('elevation.css')), ':root')
  assert.equal(elev['--md-sys-elevation-level0'], 'none')
  assert.equal(elev['--md-sys-elevation-level3'], '0 1px 3px 0 #0000004d, 0 4px 8px 3px #00000026')
  const state = find(blocks(css('state.css')), ':root')
  assert.equal(state['--md-sys-state-hover-state-layer-opacity'], '0.08')
  assert.equal(state['--md-sys-state-disabled-content-opacity'], '0.38')
  assert.equal(state['--md-sys-state-focus-indicator-thickness'], '3px')
})

// Los 18 valores de MeasurementTokens.kt (Compose, tokens v41.1.19, commit 76990c62ac), escritos
// acá a mano a propósito: si alguien cambia tokens/space.json, esta prueba lo nota.
const COMPOSE_SPACE: Record<string, number> = {
  0: 0, 25: 2, 50: 4, 75: 6, 100: 8, 125: 10, 150: 12, 175: 14, 200: 16,
  250: 20, 300: 24, 400: 32, 450: 36, 500: 40, 600: 48, 700: 56, 800: 64, 900: 72,
}

test('espaciado: los 18 pasos de Compose como --md-sys-space-<paso> en px, y SPACE igual', () => {
  const src = json<SpaceTokens>('space.json').space
  assert.deepEqual(src, COMPOSE_SPACE)
  const d = find(blocks(css('space.css')), ':root')
  assert.equal(Object.keys(d).length, 18)
  for (const [step, v] of Object.entries(COMPOSE_SPACE)) {
    assert.equal(d[`--md-sys-space-${step}`], v === 0 ? '0' : `${v}px`, `paso ${step}`)
    // El paso es centésimas de 8.
    assert.equal(v, (Number(step) / 100) * 8, `paso ${step} = ${step}/100 × 8`)
  }
  assert.deepEqual({ ...SPACE }, Object.fromEntries(Object.entries(COMPOSE_SPACE).map(([k, v]) => [k, v])))
})

test('cortes de ventana: los de WindowSizeClass.kt en el JSON y en las constantes de TypeScript', () => {
  const b = json<BreakpointTokens>('breakpoints.json')
  const width = { medium: 600, expanded: 840, large: 1200, extraLarge: 1600 }
  const height = { medium: 480, expanded: 900 }
  assert.deepEqual(b.width, width)
  assert.deepEqual(b.height, height)
  assert.deepEqual({ ...WINDOW_WIDTH }, width)
  assert.deepEqual({ ...WINDOW_HEIGHT }, height)
  // Ningún corte es una variable CSS (no servirían en @media ni en @container).
  for (const f of FILES) assert.doesNotMatch(css(f), /--md-sys-(breakpoint|window)/, f)
})

test('index.css importa todos los archivos de tokens', () => {
  const index = css('index.css')
  for (const f of FILES.filter((f) => f !== 'index.css')) {
    assert.match(index, new RegExp(`@import '\\./${f}';`))
  }
})
