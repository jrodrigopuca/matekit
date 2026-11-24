// Comprueba que src/tokens/*.css refleja exactamente tokens/*.json y que el CSS está bien formado.
// Uso: pnpm test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ColorTokens, ShapeTokens, TypescaleTokens } from '../tokens/types.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const json = <T>(name: string): T =>
  JSON.parse(readFileSync(join(root, 'tokens', name), 'utf8')) as T
const css = (name: string): string => readFileSync(join(root, 'src', 'tokens', name), 'utf8')
const FILES = [
  'color.css',
  'typescale.css',
  'shape.css',
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

test('color: los 49 roles en claro y en los dos bloques oscuros, con el valor del kit', () => {
  const src = json<ColorTokens>('color.json')
  const list = blocks(css('color.css'))
  const light = find(list, ':root,\n[data-theme="light"]')
  const darkAttr = find(list, '[data-theme="dark"]')
  const darkMedia = find(list, ':root:not([data-theme="light"])')
  assert.equal(Object.keys(src.light).length, 49)
  for (const [role, hex] of Object.entries(src.light)) {
    assert.equal(light[`--md-sys-color-${role}`], hex, `claro ${role}`)
  }
  for (const [role, hex] of Object.entries(src.dark)) {
    assert.equal(darkAttr[`--md-sys-color-${role}`], hex, `oscuro (atributo) ${role}`)
    assert.equal(darkMedia[`--md-sys-color-${role}`], hex, `oscuro (sistema) ${role}`)
  }
  assert.equal(light['color-scheme'], 'light')
  assert.equal(darkAttr['color-scheme'], 'dark')
  assert.equal(darkMedia['color-scheme'], 'dark')
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

test('index.css importa todos los archivos de tokens', () => {
  const index = css('index.css')
  for (const f of FILES.filter((f) => f !== 'index.css')) {
    assert.match(index, new RegExp(`@import '\\./${f}';`))
  }
})
