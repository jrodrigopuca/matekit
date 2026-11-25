// Paletas y niveles de contraste (ADR-0008): estructura del CSS generado y contraste WCAG de
// cada par de roles "on-X sobre X", en las cuatro paletas, los tres niveles y los dos temas.
// Uso: pnpm test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ColorTokens, PaletteTokens } from '../tokens/types.ts'
import { COLOR_ROLES } from '../scripts/lib/color-schemes.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (...p: string[]) => readFileSync(join(root, ...p), 'utf8')
const kit = JSON.parse(read('tokens', 'color.json')) as ColorTokens
const config = JSON.parse(read('tokens', 'palettes.json')) as PaletteTokens
const ROLES = Object.keys(kit.light)
const LEVELS = ['standard', 'medium', 'high'] as const
type Level = (typeof LEVELS)[number]
type Scheme = Record<'light' | 'dark', Record<string, string>>

const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '')

/** Bloques con roles de color: selector normalizado (sin saltos ni sangría) y valores. */
function colorBlocks(text: string): Array<{ selector: string; scheme: Scheme }> {
  const out = []
  for (const m of strip(text).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const body = m[2] ?? ''
    if (!body.includes('--md-sys-color-')) continue
    const scheme: Scheme = { light: {}, dark: {} }
    for (const d of body.matchAll(/--md-sys-color-([\w-]+):\s*([^;]+);/g)) {
      const [, role = '', value = ''] = d
      const ld = value.match(/^light-dark\((#[0-9a-f]{6}), (#[0-9a-f]{6})\)$/)
      scheme.light[role] = ld ? (ld[1] ?? '') : value
      scheme.dark[role] = ld ? (ld[2] ?? '') : value
    }
    out.push({ selector: (m[1] ?? '').replace(/\s+/g, ' ').trim(), scheme })
  }
  return out
}

/** Niveles de un archivo: el primer bloque es el estándar; luego uno por data-contrast. */
function levels(text: string, paletteSelector: string): Record<Level, Scheme> & { auto: Scheme } {
  const list = colorBlocks(text)
  const pick = (pred: (s: string) => boolean, what: string) => {
    const b = list.find((x) => pred(x.selector))
    assert.ok(b, `falta el bloque ${what}`)
    return b.scheme
  }
  return {
    standard: pick((s) => s.startsWith(paletteSelector) && !s.includes('data-contrast'), 'estándar'),
    medium: pick((s) => s.includes('[data-contrast="medium"]'), 'medio'),
    high: pick((s) => s.includes('[data-contrast="high"]') && !s.includes(':not('), 'alto'),
    auto: pick((s) => s.includes(':not([data-contrast], [data-contrast] *)'), 'prefers-contrast'),
  }
}

const FILES: Record<string, { file: string; selector: string }> = {
  baseline: { file: 'color.css', selector: ':root, [data-palette="baseline"]' },
  ...Object.fromEntries(
    Object.keys(config.palettes).map((n) => [n, { file: `palettes/${n}.css`, selector: `[data-palette="${n}"]` }]),
  ),
}
const schemes = Object.fromEntries(
  Object.entries(FILES).map(([n, f]) => [n, levels(read('src', 'tokens', f.file), f.selector)]),
)

function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function ratio(a: string, b: string): number {
  const [hi = 0, lo = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

test('cada paleta tiene los 49 roles en los tres niveles, en claro y oscuro, con hex válidos', () => {
  for (const [name, s] of Object.entries(schemes)) {
    for (const level of [...LEVELS, 'auto'] as const) {
      for (const theme of ['light', 'dark'] as const) {
        const roles = s[level][theme]
        assert.deepEqual(Object.keys(roles), ROLES, `${name} ${level} ${theme}: roles`)
        for (const [role, hex] of Object.entries(roles)) {
          assert.match(hex, /^#[0-9a-f]{6}$/, `${name} ${level} ${theme} ${role}`)
        }
      }
    }
    assert.deepEqual(s.auto, s.high, `${name}: prefers-contrast: more usa el nivel alto`)
  }
})

test('el generador conoce los mismos 49 roles que el kit, en el mismo orden', () => {
  assert.deepEqual(COLOR_ROLES, ROLES)
})

test('el esquema base usa los valores oficiales de color.json en los niveles medio y alto', () => {
  const base = schemes['baseline']
  assert.ok(base)
  for (const level of ['medium', 'high'] as const) {
    assert.deepEqual(base[level], kit.contrast[level], `base ${level}`)
    assert.deepEqual(Object.keys(kit.contrast[level].light), ROLES, `color.json ${level}: roles`)
  }
})

test('los niveles son distintos entre sí y las paletas, distintas de la base', () => {
  for (const [name, s] of Object.entries(schemes)) {
    assert.notDeepEqual(s.standard, s.medium, `${name}: estándar y medio`)
    assert.notDeepEqual(s.medium, s.high, `${name}: medio y alto`)
    if (name !== 'baseline') {
      assert.notEqual(s.standard.light['primary'], schemes['baseline']?.standard.light['primary'], name)
    }
  }
})

test('contraste WCAG de "on-X" sobre "X": 4,5:1 en estándar y medio, 7:1 en alto', () => {
  const min: Record<Level, number> = { standard: 4.5, medium: 4.5, high: 7 }
  const pairs = ROLES.filter((r) => r.startsWith('on-') && ROLES.includes(r.slice(3)))
  assert.ok(pairs.length >= 10, `pares: ${pairs.join(', ')}`)
  for (const [name, s] of Object.entries(schemes)) {
    for (const level of LEVELS) {
      for (const theme of ['light', 'dark'] as const) {
        const c = s[level][theme]
        for (const on of pairs) {
          const r = ratio(c[on] ?? '', c[on.slice(3)] ?? '')
          assert.ok(r >= min[level], `${name} ${level} ${theme}: ${on} ${r.toFixed(2)} < ${min[level]}`)
        }
      }
    }
  }
})

test('el texto sobre las superficies cumple 4,5:1 y el contorno 3:1 en todos los niveles', () => {
  const surfaces = ['surface', 'surface-container-lowest', 'surface-container-low', 'surface-container', 'surface-container-high', 'surface-container-highest']
  for (const [name, s] of Object.entries(schemes)) {
    for (const level of LEVELS) {
      for (const theme of ['light', 'dark'] as const) {
        const c = s[level][theme]
        for (const bg of surfaces) {
          for (const [fg, min] of [['on-surface', 4.5], ['on-surface-variant', 4.5], ['primary', 3], ['outline', 3]] as const) {
            const r = ratio(c[fg] ?? '', c[bg] ?? '')
            assert.ok(r >= min, `${name} ${level} ${theme}: ${fg} sobre ${bg} ${r.toFixed(2)} < ${min}`)
          }
        }
      }
    }
  }
})

test('las paletas van en la capa matekit.palettes con el mismo orden de capas que styles.css', () => {
  const order = read('src', 'styles.css').match(/@layer [^;{]+;/)?.[0]
  assert.equal(order, '@layer matekit.tokens, matekit.palettes, matekit.atoms, matekit.components;')
  for (const name of Object.keys(config.palettes)) {
    const text = strip(read('src', 'tokens', 'palettes', `${name}.css`))
    assert.ok(text.includes(order), `${name}: orden de capas`)
    assert.match(text, /@layer matekit\.palettes \{/, `${name}: capa`)
    assert.match(read('src', 'tokens', 'palettes', 'index.css'), new RegExp(`@import '\\./${name}\\.css';`))
  }
})
