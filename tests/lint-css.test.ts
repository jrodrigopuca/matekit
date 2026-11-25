// Prueba el lint del CSS de componentes: que detecte valores escritos a mano y deje pasar
// tokens, colores del sistema y las construcciones que usa matekit.
// Uso: pnpm test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lintCss } from '../scripts/lib/lint-css.ts'

const props = (css: string) => lintCss(css).map((p) => p.property)

test('detecta colores literales: hex, funciones y nombres', () => {
  const css = `
    .a { color: #6750a4; }
    .b { background-color: rgb(0 0 0 / 0.5); }
    .c { border-color: hsl(0 0% 50%); }
    .d { fill: red; }
    .e { box-shadow: 0 1px 2px oklch(0.5 0.1 200); }
    .f { outline: 2px solid white; }
  `
  assert.deepEqual(props(css), ['color', 'background-color', 'border-color', 'fill', 'box-shadow', 'outline'])
})

test('detecta duraciones y curvas literales en transiciones y animaciones', () => {
  const css = `
    .a { transition: opacity 200ms; }
    .b { transition-duration: 0.3s; }
    .c { transition: opacity var(--md-sys-motion-spring-fast-effects-duration) ease-in-out; }
    .d { animation-timing-function: cubic-bezier(0.2, 0, 0, 1); }
    .e { transition-timing-function: linear(0, 1); }
  `
  const found = lintCss(css)
  assert.deepEqual(
    found.map((p) => p.property),
    ['transition', 'transition-duration', 'transition', 'animation-timing-function', 'transition-timing-function'],
  )
  assert.match(found[0]?.message ?? '', /duración/)
  assert.match(found[2]?.message ?? '', /curva/)
})

test('detecta tipografía literal', () => {
  const css = `
    .a { font-size: 14px; }
    .b { font-family: Roboto, sans-serif; }
    .c { font-weight: 500; }
    .d { line-height: 1.5; }
    .e { letter-spacing: 0.1px; }
  `
  assert.deepEqual(props(css), ['font-size', 'font-family', 'font-weight', 'line-height', 'letter-spacing'])
})

test('deja pasar tokens, colores del sistema y construcciones de matekit', () => {
  const css = `
    .a { color: var(--md-sys-color-on-surface); }
    .b { background-color: var(--mk-state-layer-color, currentColor); }
    .c { box-shadow: inset 0 0 0 2px var(--_outline), var(--md-sys-elevation-level1); }
    .d { outline: var(--md-sys-state-focus-indicator-thickness) solid var(--mk-focus-ring-color, var(--md-sys-color-secondary)); }
    .e { background-color: color-mix(in srgb, var(--md-sys-color-on-surface) calc(var(--md-sys-state-disabled-container-opacity) * 100%), transparent); }
    .f { transition: opacity var(--md-sys-motion-spring-fast-effects-duration) var(--md-sys-motion-spring-fast-effects-easing); }
    .g { font-size: var(--md-sys-typescale-body-medium-size); line-height: inherit; }
    .h { white-space: nowrap; transition: none; transition-duration: 0ms; }
    @media (forced-colors: active) {
      .i { forced-color-adjust: none; background-color: Highlight; color: HighlightText; outline: 2px solid CanvasText; }
      .j { color: GrayText; border-color: ButtonText; }
    }
  `
  assert.deepEqual(lintCss(css), [])
})

test('ignora comentarios, selectores con pseudo-clases y variables propias', () => {
  const css = `
    /* color: #fff; transition: 200ms ease; */
    .a:hover:not(:disabled) > .b { color: var(--x); }
    .c { --_container: #ff0000; }
  `
  assert.deepEqual(lintCss(css), [])
})

test('una excepción justificada con lint-css-allow se respeta', () => {
  const css = `.a { color: #000; /* lint-css-allow: logo de marca */ }`
  assert.deepEqual(lintCss(css), [])
})

test('informa la línea correcta', () => {
  const css = '.a {\n  color: var(--x);\n  fill: #123456;\n}'
  assert.equal(lintCss(css)[0]?.line, 3)
})
