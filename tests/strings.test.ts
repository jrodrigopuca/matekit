// Comprueba los textos por defecto de los componentes: que todo texto visible o anunciado viva en el
// strings.ts de la carpeta del componente (en inglés) y se sume al índice src/strings/index.ts, y que
// no queden textos escritos a mano en el código de los componentes.
// Uso: pnpm test
//
// Heurística (sobre el código sin comentarios, con cada literal de texto reemplazado por una marca;
// así un comentario en español o un ejemplo dentro de un mensaje de diagnóstico no cuentan):
// a. Ningún literal con letras propias del español (áéíóúüñ¿¡).
// b. Ningún literal con letras como valor de una prop o clave de texto: `…Label`, `…Hint`, `…Text`,
//    `label`, `title`, `alt`, `placeholder` y los atributos ARIA de texto (`aria-label`,
//    `aria-description`, `aria-roledescription`, `aria-valuetext`, `aria-placeholder`), con `=` o `:`
//    (valor por defecto al desestructurar, atributo JSX u objeto).
// c. Ningún texto JSX entre etiquetas (`<p>Texto</p>`) ni un literal solo entre llaves como hijo
//    (`{'Texto'}`).
// d. Ningún literal que empiece con mayúscula y tenga dos o más palabras (una frase).
// Quedan fuera las pruebas, src/test/, los strings.ts y src/strings/, y los archivos generados
// (src/tokens/, src/icons/, src/atoms/Shape/shapes.ts y los *-data.ts): sus textos son catálogo o
// datos, no se muestran por defecto. Los diagnósticos (ADR-0028) pasan porque su texto empieza en
// minúscula y va como `problem`/`fix`, que no son claves de texto de la regla b.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defaultStrings } from '../src/strings/index.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const EXCLUDED = /\.test\.tsx?$|\.d\.ts$|^src\/(test|tokens|icons|strings)\/|\/strings\.ts$|^src\/atoms\/Shape\/shapes\.ts$|-data\.ts$/

const MARK = (n: number) => `"\u0000${n}\u0000"`
const MARK_RE = '"\\u0000(\\d+)\\u0000"'

/**
 * Quita los comentarios y reemplaza cada literal (comillas simples, dobles o plantilla) por una
 * marca con su índice. No es un analizador completo: alcanza para el código de src/ (sin
 * expresiones regulares con comillas ni plantillas anidadas dentro de `${}`).
 */
export function maskSource(code: string): { masked: string; literals: string[] } {
  const literals: string[] = []
  let masked = ''
  let i = 0
  while (i < code.length) {
    const ch = code[i]
    const next = code[i + 1]
    if (ch === '/' && next === '/') {
      while (i < code.length && code[i] !== '\n') i++
      continue
    }
    if (ch === '/' && next === '*') {
      const end = code.indexOf('*/', i + 2)
      i = end < 0 ? code.length : end + 2
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1
      let value = ''
      while (j < code.length && code[j] !== ch) {
        if (code[j] === '\\') {
          value += code[j + 1] ?? ''
          j += 2
          continue
        }
        if (ch !== '`' && code[j] === '\n') break
        value += code[j]
        j++
      }
      literals.push(value)
      masked += MARK(literals.length - 1)
      i = j + 1
      continue
    }
    masked += ch
    i++
  }
  return { masked, literals }
}

const SPANISH_LETTERS = /[áéíóúüñ¿¡ÁÉÍÓÚÜÑ]/
const HAS_WORD = /[A-Za-z]{2,}/
const TEXT_KEY = new RegExp(
  // `enterKeyHint` es un valor fijo del navegador ('search', 'go'), no un texto.
  `(\\b(?!enterKeyHint\\b)[A-Za-z]*(?:Label|Hint|Text)|\\b(?:label|title|alt|placeholder)|\\baria-(?:label|description|roledescription|valuetext|placeholder))\\s*[=:]\\s*\\{?\\s*${MARK_RE}`,
  'g',
)
/** Clave entre comillas (`{ 'aria-label': '…' }`): la clave también es una marca. */
const QUOTED_KEY = new RegExp(`${MARK_RE}\\s*:\\s*${MARK_RE}`, 'g')
const ARIA_TEXT = /^aria-(?:label|description|roledescription|valuetext|placeholder)$/
const JSX_TEXT = /(?<![\w)\]=-])>([^<>{}\n]*[A-Za-zÀ-ÿ]{2,}[^<>{}\n]*)<\//g
const JSX_LITERAL_CHILD = new RegExp(`(?<![=\\w])\\{\\s*${MARK_RE}\\s*\\}`, 'g')
const SENTENCE = /^[A-Z][A-Za-z']*\s+[A-Za-z]{2,}/
/** El texto fijo de un literal: sin las expresiones `${…}` de una plantilla (` ${label}` no es un texto). */
const textOf = (value: string) => value.replace(/\$\{[^}]*\}/g, '')

/** Los textos escritos a mano de un archivo, con la regla que los encontró. */
export function handwrittenTexts(code: string, tsx: boolean): string[] {
  const { masked, literals } = maskSource(code)
  const found: string[] = []
  for (const value of literals) {
    if (SPANISH_LETTERS.test(textOf(value))) found.push(`a: ${JSON.stringify(value)}`)
    else if (SENTENCE.test(textOf(value))) found.push(`d: ${JSON.stringify(value)}`)
  }
  for (const m of masked.matchAll(TEXT_KEY)) {
    const value = literals[Number(m[2])] ?? ''
    if (HAS_WORD.test(textOf(value))) found.push(`b: ${m[1]} = ${JSON.stringify(value)}`)
  }
  for (const m of masked.matchAll(QUOTED_KEY)) {
    const key = literals[Number(m[1])] ?? ''
    const value = literals[Number(m[2])] ?? ''
    if (ARIA_TEXT.test(key) && HAS_WORD.test(textOf(value))) found.push(`b: '${key}': ${JSON.stringify(value)}`)
  }
  if (tsx) {
    for (const m of masked.matchAll(JSX_TEXT)) found.push(`c: ${JSON.stringify(m[1]?.trim())}`)
    for (const m of masked.matchAll(JSX_LITERAL_CHILD)) {
      const value = literals[Number(m[1])] ?? ''
      if (HAS_WORD.test(textOf(value))) found.push(`c: {${JSON.stringify(value)}}`)
    }
  }
  return found
}

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* sourceFiles(path)
    else if (/\.tsx?$/.test(entry.name)) yield path
  }
}

test('la heurística encuentra textos escritos a mano y no cuenta comentarios ni diagnósticos', () => {
  const hits = (code: string) => handwrittenTexts(code, true)
  assert.equal(hits(`// Cerrar la búsqueda\n/* Quitar */\nconst x = 1`).length, 0)
  assert.equal(hits(`{/* Descripción oculta */}<span hidden id={id}>{hint}</span>`).length, 0)
  assert.equal(hits(`fix: 'pass \`text\` (<Tooltip text="Edit">) or name the trigger'`).length, 0)
  assert.equal(hits(`if (e.key === 'Escape') return; const v = cond ? 'mk-a' : 'mk-b'`).length, 0)
  assert.equal(hits(`const t: Ref<HTMLButtonElement> | undefined = undefined`).length, 0)
  assert.deepEqual(hits(`function A({ label = 'Cerrar' }) {}`), ['b: label = "Cerrar"'])
  assert.deepEqual(hits(`function A({ closeLabel = 'Close' }) {}`), ['b: closeLabel = "Close"'])
  assert.deepEqual(hits(`<IconButton aria-label="Back" />`), ['b: aria-label = "Back"'])
  assert.deepEqual(hits(`const p = { 'aria-label': 'Menú' }`), ['a: "Menú"', `b: 'aria-label': "Menú"`])
  assert.deepEqual(hits(`<p className="x">Sin resultados</p>`), ['c: "Sin resultados"'])
  assert.deepEqual(hits(`<span>{'Loading'}</span>`), ['c: {"Loading"}'])
  assert.equal(hits('<span className="mk-badge-label">{` ${label}`}</span>').length, 0)
  assert.equal(hits(`<input enterKeyHint="search" />`).length, 0)
  assert.deepEqual(hits('const f = (n) => `Se quitó ${n}`'), ['a: "Se quitó ${n}"'])
  assert.deepEqual(hits('setAnnounced(`Removed item`)'), ['d: "Removed item"'])
})

test('ningún componente de src/ escribe a mano un texto visible o anunciado (van en su strings.ts)', () => {
  const problems: string[] = []
  for (const file of sourceFiles(join(root, 'src'))) {
    const rel = relative(root, file)
    if (EXCLUDED.test(rel)) continue
    for (const hit of handwrittenTexts(readFileSync(file, 'utf8'), rel.endsWith('.tsx'))) problems.push(`${rel}: ${hit}`)
  }
  assert.deepEqual(problems, [], 'textos a mano: moverlos al strings.ts del componente (en inglés) y sumarlo a src/strings/index.ts')
})

test('cada strings.ts de src/ está en el índice src/strings/index.ts', () => {
  const index = readFileSync(join(root, 'src/strings/index.ts'), 'utf8')
  const missing: string[] = []
  for (const file of sourceFiles(join(root, 'src'))) {
    const rel = relative(root, file)
    if (!rel.endsWith('/strings.ts')) continue
    if (!index.includes(`'../${relative(join(root, 'src'), file).replace(/\\/g, '/')}'`)) missing.push(rel)
  }
  assert.deepEqual(missing, [])
})

test('los textos por defecto están en inglés y los que llevan datos son funciones', () => {
  const texts: string[] = []
  for (const group of Object.values(defaultStrings)) {
    for (const value of Object.values(group as Record<string, unknown>)) {
      if (typeof value === 'string') texts.push(value)
      else if (typeof value === 'function') texts.push(String((value as (x: never) => unknown)('x' as never)))
      else assert.fail(`tipo inesperado: ${typeof value}`)
    }
  }
  for (const text of texts) assert.doesNotMatch(text, SPANISH_LETTERS, text)
  const { search } = defaultStrings
  assert.equal(search.formatCount(1), '1 suggestion')
  assert.equal(search.formatCount(0), '0 suggestions')
  assert.equal(search.formatCount(3), '3 suggestions')
  assert.equal(search.formatRemoved('yerba'), 'Removed yerba')
})
