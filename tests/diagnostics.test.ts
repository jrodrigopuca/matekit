// Comprueba los diagnósticos (ADR-0028): el formato único, el objeto estructurado, la deduplicación,
// el silencio en producción y que el catálogo docs/diagnostics.md tenga cada código usado en src/ (y
// solo esos). Corre en Node y no en el navegador porque ahí `process.env.NODE_ENV` se lee de verdad
// en cada llamada (en las pruebas de Vitest, Vite lo reemplaza por el texto del modo al compilar).
// Uso: pnpm test

import { afterEach, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  MATEKIT_ERROR_CODES,
  MATEKIT_WARNING_CODES,
  MatekitError,
  docsFor,
  mkError,
  mkWarn,
  partOutsideParent,
} from '../src/internal/diagnostics.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

let calls: unknown[][] = []
const realWarn = console.warn
const realEnv = process.env['NODE_ENV']
beforeEach(() => {
  calls = []
  console.warn = (...args: unknown[]) => void calls.push(args)
})
afterEach(() => {
  console.warn = realWarn
  if (realEnv === undefined) delete process.env['NODE_ENV']
  else process.env['NODE_ENV'] = realEnv
})

const message = { component: 'Tab', problem: 'something happened.', fix: 'do something else' }

test('mkError: formato exacto, MatekitError con code y details, y se lanza con throw', () => {
  const error = mkError('MK_TOOLTIP_NO_TEXT', message, { extra: 1 })
  assert.ok(error instanceof MatekitError)
  assert.ok(error instanceof Error)
  assert.equal(error.name, 'MatekitError')
  assert.equal(error.code, 'MK_TOOLTIP_NO_TEXT')
  // El punto final del problema no se duplica.
  assert.equal(error.message, '[matekit] Tab: something happened. Fix: do something else. (MK_TOOLTIP_NO_TEXT)')
  assert.deepEqual(error.details, {
    component: 'Tab',
    code: 'MK_TOOLTIP_NO_TEXT',
    docs: 'https://github.com/jrodrigopuca/matekit/blob/main/docs/diagnostics.md#mk_tooltip_no_text',
    extra: 1,
  })
  assert.throws(() => {
    throw partOutsideParent('DialogHeadline', 'Dialog')
  }, { code: 'MK_PART_OUTSIDE_PARENT', details: { component: 'DialogHeadline', code: 'MK_PART_OUTSIDE_PARENT', docs: docsFor('MK_PART_OUTSIDE_PARENT'), parent: 'Dialog' } })
})

test('mkError también en producción', () => {
  process.env['NODE_ENV'] = 'production'
  assert.equal(mkError('MK_INTERNAL_INVARIANT', message).code, 'MK_INTERNAL_INVARIANT')
})

test('mkWarn: console.warn con el texto y el objeto estructurado', () => {
  process.env['NODE_ENV'] = 'development'
  assert.equal(mkWarn('MK_TAB_UNNAMED', { ...message, problem: 'format' }, { value: 'a' }), true)
  assert.deepEqual(calls, [
    [
      '[matekit] Tab: format. Fix: do something else. (MK_TAB_UNNAMED)',
      { component: 'Tab', code: 'MK_TAB_UNNAMED', docs: docsFor('MK_TAB_UNNAMED'), value: 'a' },
    ],
  ])
})

test('mkWarn deduplica por texto, y por objeto si se pasa `once`', () => {
  process.env['NODE_ENV'] = 'development'
  const text = { ...message, problem: 'dedup por texto' }
  assert.equal(mkWarn('MK_TAB_UNNAMED', text), true)
  assert.equal(mkWarn('MK_TAB_UNNAMED', text, { otros: 'detalles' }), false)
  assert.equal(mkWarn('MK_TAB_UNNAMED', { ...text, component: 'TabLink' }), true)

  const a = {}
  const b = {}
  const byInstance = { ...message, problem: 'dedup por instancia' }
  assert.equal(mkWarn('MK_TOOLBAR_EXPAND_IGNORED', byInstance, undefined, { once: a }), true)
  assert.equal(mkWarn('MK_TOOLBAR_EXPAND_IGNORED', byInstance, undefined, { once: a }), false)
  assert.equal(mkWarn('MK_TOOLBAR_EXPAND_IGNORED', byInstance, undefined, { once: b }), true)
  assert.equal(calls.length, 4)
})

test('mkWarn no escribe nada en producción (y no gasta la deduplicación)', () => {
  const text = { ...message, problem: 'producción' }
  process.env['NODE_ENV'] = 'production'
  assert.equal(mkWarn('MK_TAB_UNNAMED', text), false)
  assert.equal(calls.length, 0)
  process.env['NODE_ENV'] = 'development'
  assert.equal(mkWarn('MK_TAB_UNNAMED', text), true)
})

// Sincronía con el catálogo.

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sources(path)
    return /\.tsx?$/.test(entry.name) ? [path] : []
  })
}

const CODE = /['"`](MK_[A-Z0-9_]+)['"`]/g
const declared = new Set<string>([...MATEKIT_ERROR_CODES, ...MATEKIT_WARNING_CODES])
const diagnosticsFile = join(root, 'src', 'internal', 'diagnostics.ts')
/** Código → archivos de src/ que lo usan (fuera de diagnostics.ts, que los declara). */
const used = new Map<string, string[]>()
for (const file of sources(join(root, 'src'))) {
  if (file === diagnosticsFile) continue
  for (const [, code] of readFileSync(file, 'utf8').matchAll(CODE)) {
    used.set(code!, [...(used.get(code!) ?? []), relative(root, file)])
  }
}
// Los helpers de diagnostics.ts (partOutsideParent, renderNotElement, …) usan su código ahí mismo.
for (const [, code] of readFileSync(diagnosticsFile, 'utf8').matchAll(/mkError\(\s*'(MK_[A-Z0-9_]+)'/g)) {
  used.set(code!, [...(used.get(code!) ?? []), 'src/internal/diagnostics.ts'])
}
const catalog = readFileSync(join(root, 'docs', 'diagnostics.md'), 'utf8')
const documented = new Set([...catalog.matchAll(/^## (MK_[A-Z0-9_]+)$/gm)].map((m) => m[1]!))

test('cada código usado en src/ está declarado y documentado en docs/diagnostics.md', () => {
  const missing = [...used.keys()].filter((code) => !declared.has(code) || !documented.has(code))
  assert.deepEqual(missing, [], `sin declarar o sin entrada en el catálogo: ${missing.map((c) => `${c} (${used.get(c)})`).join(', ')}`)
})

test('cada código del catálogo está declarado y se usa en src/', () => {
  assert.deepEqual([...documented].sort(), [...declared].sort())
  // Una prueba no cuenta como uso: el código tiene que salir de un componente o una ayuda.
  const unused = [...declared].filter((code) => !(used.get(code) ?? []).some((file) => !/\.test\.tsx?$/.test(file)))
  assert.deepEqual(unused, [], `declarados pero sin uso: ${unused.join(', ')}`)
})

test('cada entrada del catálogo dice tipo, causa, solución y algo relacionado', () => {
  const entries = catalog.split(/^## /m).slice(1)
  for (const entry of entries) {
    const code = entry.slice(0, entry.indexOf('\n'))
    for (const field of ['**Kind:**', '**Components:**', '**Cause:**', '**Fix:**', '**Related:**']) {
      assert.ok(entry.includes(field), `${code}: falta ${field}`)
    }
    const kind = MATEKIT_WARNING_CODES.includes(code as never) ? 'warning' : 'error'
    assert.ok(entry.includes(`**Kind:** ${kind}`), `${code}: el tipo tiene que ser ${kind}`)
  }
})
