// Paletas, niveles de contraste y tema (ADR-0008): data-palette, data-contrast y data-theme se
// pueden poner en cualquier elemento y combinarse anidados. Se compara el color que resuelve el
// navegador con los valores del CSS generado.

import { afterEach, describe, expect, test } from 'vitest'
import { commands } from 'vitest/browser'
import '../tokens/palettes/index.css'
import baseCss from '../tokens/color.css?raw'
import greenCss from '../tokens/palettes/green.css?raw'
import { render } from './render.tsx'

type Level = 'standard' | 'medium' | 'high'
type Theme = 'light' | 'dark'

/** Valor de --md-sys-color-primary por nivel y tema, leído del CSS generado. */
function primaries(css: string): Record<Level, Record<Theme, string>> {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const out = {} as Record<Level, Record<Theme, string>>
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1] ?? ''
    const v = (m[2] ?? '').match(/--md-sys-color-primary: light-dark\((#\w+), (#\w+)\);/)
    if (!v || sel.includes(':not(')) continue
    const level: Level = sel.includes('"high"') ? 'high' : sel.includes('"medium"') ? 'medium' : 'standard'
    out[level] ??= { light: v[1] ?? '', dark: v[2] ?? '' }
  }
  return out
}
const BASE = primaries(baseCss)
const GREEN = primaries(greenCss)

const rgb = (hex: string) =>
  `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`

/** Color primario que resuelve el navegador dentro de un elemento. */
function primaryIn(el: Element): string {
  const probe = document.createElement('span')
  probe.style.color = 'var(--md-sys-color-primary)'
  el.append(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value
}
const at = (c: HTMLElement, id: string) => {
  const el = c.querySelector(`#${id}`)
  if (!el) throw new Error(`falta #${id}`)
  return el
}

test('los valores esperados salen del CSS y son distintos entre sí', () => {
  const all = [BASE, GREEN].flatMap((p) => (['standard', 'medium', 'high'] as const).map((l) => p[l].light))
  expect(new Set(all).size).toBe(6)
})

describe('data-palette y data-contrast', () => {
  test('sin atributos: la base del kit en contraste estándar', async () => {
    const c = await render(<div id="a" />)
    expect(primaryIn(at(c, 'a'))).toBe(rgb(BASE.standard.light))
  })

  test('una paleta en cualquier elemento, y data-palette="baseline" vuelve a la base', async () => {
    const c = await render(
      <div id="g" data-palette="green">
        <div id="b" data-palette="baseline" />
      </div>,
    )
    expect(primaryIn(at(c, 'g'))).toBe(rgb(GREEN.standard.light))
    expect(primaryIn(at(c, 'b'))).toBe(rgb(BASE.standard.light))
  })

  test('data-contrast solo, sin paleta: la base en ese nivel', async () => {
    const c = await render(
      <>
        <div id="m" data-contrast="medium" />
        <div id="h" data-contrast="high" />
      </>,
    )
    expect(primaryIn(at(c, 'm'))).toBe(rgb(BASE.medium.light))
    expect(primaryIn(at(c, 'h'))).toBe(rgb(BASE.high.light))
  })

  test('el contraste en el mismo elemento que la paleta, en un ancestro o en un descendiente', async () => {
    const c = await render(
      <>
        <div id="same" data-palette="green" data-contrast="high" />
        <div data-contrast="high">
          <div id="below" data-palette="green" />
        </div>
        <div data-palette="green">
          <div id="inside" data-contrast="medium" />
        </div>
      </>,
    )
    expect(primaryIn(at(c, 'same'))).toBe(rgb(GREEN.high.light))
    expect(primaryIn(at(c, 'below'))).toBe(rgb(GREEN.high.light))
    expect(primaryIn(at(c, 'inside'))).toBe(rgb(GREEN.medium.light))
  })

  test('data-contrast="standard" dentro de un nivel alto vuelve al estándar', async () => {
    const c = await render(
      <div data-palette="green" data-contrast="high">
        <div id="s" data-contrast="standard" />
      </div>,
    )
    expect(primaryIn(at(c, 's'))).toBe(rgb(GREEN.standard.light))
  })
})

describe('tema claro y oscuro con light-dark()', () => {
  test('data-theme oscuro en cualquier elemento, también debajo de una paleta y un nivel', async () => {
    const c = await render(
      <>
        <div id="d" data-theme="dark" />
        <div data-palette="green" data-contrast="high">
          <div id="gd" data-theme="dark" />
        </div>
        <div data-theme="dark">
          <div id="dl" data-theme="light" />
        </div>
      </>,
    )
    expect(primaryIn(at(c, 'd'))).toBe(rgb(BASE.standard.dark))
    expect(primaryIn(at(c, 'gd'))).toBe(rgb(GREEN.high.dark))
    expect(primaryIn(at(c, 'dl'))).toBe(rgb(BASE.standard.light))
  })
})

/**
 * Emula prefers-contrast y vuelve a evaluar las hojas de estilo ya cargadas: con la emulación de
 * Playwright, Firefox actualiza matchMedia pero no siempre las reglas @media de las hojas que ya
 * estaban (comprobado: el CSS aplica en cuanto se reevalúan). Con la preferencia del sistema,
 * que se lee al cargar la página, no hace falta.
 */
async function emulateContrast(on: boolean) {
  await commands.prefersContrast(on)
  for (const sheet of [...document.styleSheets]) {
    sheet.disabled = true
    sheet.disabled = false
  }
}

describe('prefers-contrast: more', () => {
  afterEach(() => emulateContrast(false))

  test('elige el nivel alto donde nadie fijó data-contrast', async () => {
    await emulateContrast(true)
    const c = await render(
      <>
        <div id="a" />
        <div id="g" data-palette="green" />
        <div id="fixed" data-palette="green" data-contrast="standard" />
        <div data-contrast="medium">
          <div id="under" data-palette="green" />
        </div>
      </>,
    )
    expect(primaryIn(at(c, 'a'))).toBe(rgb(BASE.high.light))
    expect(primaryIn(at(c, 'g'))).toBe(rgb(GREEN.high.light))
    expect(primaryIn(at(c, 'fixed'))).toBe(rgb(GREEN.standard.light))
    expect(primaryIn(at(c, 'under'))).toBe(rgb(GREEN.medium.light))
  })
})
