// Aviso de destinos de más (src/internal/navigation-count.ts, MK_NAVIGATION_TOO_MANY_DESTINATIONS):
// cómo cuenta los destinos entre los hijos de React y cuándo avisa. Corre en Node, como
// tests/diagnostics.test.ts, porque ahí `process.env.NODE_ENV` se lee de verdad. Las pruebas de cada
// componente en el navegador cubren el uso real (NavigationBar, NavigationRail, NavigationSuite).
// Uso: pnpm test

import { afterEach, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement, Fragment, type ReactNode } from 'react'
import { countDestinations, warnTooManyDestinations } from '../src/internal/navigation-count.ts'

const Item = (props: { children?: ReactNode }) => props.children ?? null
const Tooltip = (props: { children?: ReactNode }) => props.children ?? null
const Mine = () => null
const items = (n: number) => Array.from({ length: n }, (_, i) => createElement(Item, { key: i }))

const realWarn = console.warn
const realEnv = process.env['NODE_ENV']
let calls: unknown[][] = []
beforeEach(() => {
  calls = []
  console.warn = (...args: unknown[]) => void calls.push(args)
  process.env['NODE_ENV'] = 'development'
})
afterEach(() => {
  console.warn = realWarn
  if (realEnv === undefined) delete process.env['NODE_ENV']
  else process.env['NODE_ENV'] = realEnv
})

test('cuenta los destinos directos, en arrays, en fragmentos y envueltos de a uno', () => {
  assert.equal(countDestinations(items(3), Item), 3)
  assert.equal(countDestinations([createElement(Item), items(2), 'texto', null, false], Item), 3)
  assert.equal(countDestinations(createElement(Fragment, null, ...items(2), createElement(Fragment, null, ...items(2))), Item), 4)
  assert.equal(countDestinations(createElement(Tooltip, null, createElement(Item)), Item), 1)
  // Otro elemento cualquiera (un encabezado del rail, un div) no es un destino.
  assert.equal(countDestinations([createElement('div'), createElement(Tooltip, null, 'texto')], Item), 0)
})

test('límite documentado: no ve los destinos que dibuja otro componente', () => {
  assert.equal(countDestinations(createElement(Mine), Item), 0)
})

test('avisa por arriba del máximo, con el caso y el conteo en los detalles, una vez por caso', () => {
  assert.equal(warnTooManyDestinations('NavigationBar', items(5), Item), false)
  assert.equal(warnTooManyDestinations('NavigationBar', items(6), Item), true)
  const [text, details] = calls[0] as [string, Record<string, unknown>]
  assert.match(text, /^\[matekit\] NavigationBar: .*at most 5.*Fix: .*ModalNavigationRail.*Menu.*\(MK_NAVIGATION_TOO_MANY_DESTINATIONS\)$/)
  assert.deepEqual(
    { component: details['component'], code: details['code'], count: details['count'], max: details['max'] },
    { component: 'NavigationBar', code: 'MK_NAVIGATION_TOO_MANY_DESTINATIONS', count: 6, max: 5 },
  )
  // Una vez: otra barra con 8 no repite el aviso.
  assert.equal(warnTooManyDestinations('NavigationBar', items(8), Item), false)
  assert.equal(calls.length, 1)
})

test('rail contraído: hasta 7; la suite con layout="rail" usa el límite del rail', () => {
  assert.equal(warnTooManyDestinations('NavigationRail', items(7), Item), false)
  assert.equal(warnTooManyDestinations('NavigationRail', items(8), Item), true)
  assert.equal(warnTooManyDestinations('NavigationSuiteRail', items(7), Item), false)
  assert.equal(warnTooManyDestinations('NavigationSuiteRail', items(8), Item), true)
  const [text, details] = calls[1] as [string, Record<string, unknown>]
  assert.match(text, /^\[matekit\] NavigationSuite: .*at most 7 with layout="rail"/)
  assert.equal(details['count'], 8)
})

test('en producción no cuenta ni avisa', () => {
  process.env['NODE_ENV'] = 'production'
  assert.equal(warnTooManyDestinations('NavigationSuite', items(9), Item), false)
  assert.equal(calls.length, 0)
})
