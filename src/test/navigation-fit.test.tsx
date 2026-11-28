// Auditoría de desbordes y separaciones de la navegación (2026-11-27, actualización del ADR-0029):
// NavigationBar (vertical y horizontal), NavigationRail (contraído y expandido), NavigationSuite (las
// tres presentaciones) y ModalNavigationRail, con 1, 2, 3, 5, 6, 7 y 8 destinos, en ventanas de 320,
// 360, 600, 840 y 1300 de ancho. Mide contenedores y destinos, nunca texto (los anchos de fuente
// cambian entre motores):
// - la página no se desplaza a lo ancho;
// - ningún destino sale de su contenedor a lo ancho (el rail se desplaza en vertical a propósito);
// - las áreas de los indicadores no se superponen;
// - cada destino mide al menos 24 × 24 (área táctil mínima de WCAG 2.5.8, nivel AA);
// - separaciones del kit: en la barra, destinos del mismo ancho y pegados (los reparte el ancho,
//   como el weight(1f) de Compose); en el rail contraído, 4 entre destinos; expandido y modal, 0.

import { afterEach, describe, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import {
  HomeIcon,
  ModalNavigationRail,
  NavigationBar,
  NavigationBarItem,
  NavigationBarItemIcon,
  NavigationBarItemLabel,
  NavigationRail,
  NavigationRailItem,
  NavigationRailItemIcon,
  NavigationRailItemLabel,
  NavigationSuite,
  NavigationSuiteItem,
  NavigationSuiteItemIcon,
  NavigationSuiteItemLabel,
} from '../index.ts'
import { render } from './render.tsx'

const COUNTS = [1, 2, 3, 5, 6, 7, 8] as const
const WIDTHS = [320, 360, 600, 840, 1300] as const
const BASE = { width: 414, height: 896 }

afterEach(async () => {
  vi.restoreAllMocks()
  if (window.innerWidth !== BASE.width || window.innerHeight !== BASE.height) {
    await page.viewport(BASE.width, BASE.height)
    await expect.poll(() => window.innerWidth).toBe(BASE.width)
  }
})

async function viewport(width: number, height: number) {
  await page.viewport(width, height)
  await expect.poll(() => [window.innerWidth, window.innerHeight]).toEqual([width, height])
}

// Etiquetas largas a propósito: tienen que recortarse, no ensanchar ni desbordar.
const label = (i: number) => `Destino con etiqueta larga ${i + 1}`
const range = (n: number) => Array.from({ length: n }, (_, i) => i)

type Case = { name: string; ui: (n: number) => React.ReactNode; gap: 'bar' | 'auto' | number }

const CASES: Case[] = [
  {
    name: 'NavigationBar vertical',
    gap: 'bar',
    ui: (n) => (
      <NavigationBar aria-label="Nav">
        {range(n).map((i) => (
          <NavigationBarItem key={i} href={`#${i}`} active={i === 0}>
            <NavigationBarItemIcon><HomeIcon /></NavigationBarItemIcon>
            <NavigationBarItemLabel>{label(i)}</NavigationBarItemLabel>
          </NavigationBarItem>
        ))}
      </NavigationBar>
    ),
  },
  {
    name: 'NavigationBar horizontal',
    gap: 'bar',
    ui: (n) => (
      <NavigationBar aria-label="Nav" layout="horizontal">
        {range(n).map((i) => (
          <NavigationBarItem key={i} href={`#${i}`} active={i === 0}>
            <NavigationBarItemIcon><HomeIcon /></NavigationBarItemIcon>
            <NavigationBarItemLabel>{label(i)}</NavigationBarItemLabel>
          </NavigationBarItem>
        ))}
      </NavigationBar>
    ),
  },
  ...[false, true].map<Case>((expanded) => ({
    name: `NavigationRail ${expanded ? 'expandido' : 'contraído'}`,
    gap: expanded ? 0 : 4,
    ui: (n) => (
      <div style={{ display: 'flex', height: 500 }}>
        <NavigationRail aria-label="Nav" expanded={expanded}>
          {range(n).map((i) => (
            <NavigationRailItem key={i} href={`#${i}`} active={i === 0}>
              <NavigationRailItemIcon><HomeIcon /></NavigationRailItemIcon>
              <NavigationRailItemLabel>{label(i)}</NavigationRailItemLabel>
            </NavigationRailItem>
          ))}
        </NavigationRail>
      </div>
    ),
  })),
  ...(['auto', 'bar', 'rail'] as const).map<Case>((layout) => ({
    name: `NavigationSuite layout="${layout}"`,
    // auto: la separación depende de la presentación que eligió la ventana (se mide).
    gap: layout === 'rail' ? 4 : layout === 'auto' ? 'auto' : 'bar',
    ui: (n) => (
      <div style={{ display: 'flex', height: 500, alignItems: 'flex-end' }}>
        <NavigationSuite aria-label="Nav" layout={layout} style={{ flex: '1 1 auto' }}>
          {range(n).map((i) => (
            <NavigationSuiteItem key={i} href={`#${i}`} active={i === 0}>
              <NavigationSuiteItemIcon><HomeIcon /></NavigationSuiteItemIcon>
              <NavigationSuiteItemLabel>{label(i)}</NavigationSuiteItemLabel>
            </NavigationSuiteItem>
          ))}
        </NavigationSuite>
      </div>
    ),
  })),
  {
    name: 'ModalNavigationRail',
    gap: 0,
    ui: (n) => (
      <ModalNavigationRail open label="Nav">
        {range(n).map((i) => (
          <NavigationRailItem key={i} href={`#${i}`} active={i === 0}>
            <NavigationRailItemIcon><HomeIcon /></NavigationRailItemIcon>
            <NavigationRailItemLabel>{label(i)}</NavigationRailItemLabel>
          </NavigationRailItem>
        ))}
      </ModalNavigationRail>
    ),
  },
]

/** Contenedor que recorta o desplaza a los destinos: el `<nav>` (la suite, la barra, el rail). */
const navOf = (c: HTMLElement) => c.querySelector<HTMLElement>('nav')!

function audit(c: HTMLElement, expected: Case['gap'], where: string) {
  const doc = document.documentElement
  expect(doc.scrollWidth, `${where}: la página se desplaza a lo ancho`).toBeLessThanOrEqual(doc.clientWidth)
  const nav = navOf(c)
  const gap = expected === 'auto' ? (getComputedStyle(nav).flexDirection === 'column' ? 4 : 'bar') : expected
  const box = nav.getBoundingClientRect()
  expect(box.right, `${where}: el contenedor sale de la ventana`).toBeLessThanOrEqual(doc.clientWidth + 0.5)
  const items = [...nav.querySelectorAll<HTMLElement>(':scope > a')]
  const pills = items.map((it) => it.querySelector(':scope > .mk-state-layer')!.getBoundingClientRect())
  items.forEach((it, i) => {
    const r = it.getBoundingClientRect()
    expect(r.left, `${where}: destino ${i} sale por el inicio`).toBeGreaterThanOrEqual(box.left - 0.5)
    expect(r.right, `${where}: destino ${i} sale por el final`).toBeLessThanOrEqual(box.right + 0.5)
    expect(Math.min(r.width, r.height), `${where}: destino ${i} mide menos de 24`).toBeGreaterThanOrEqual(24)
    // El indicador (y sus átomos) no sale del destino: si saliera, taparía al vecino.
    expect(pills[i]!.left, `${where}: indicador ${i} sale del destino`).toBeGreaterThanOrEqual(r.left - 0.5)
    expect(pills[i]!.right, `${where}: indicador ${i} sale del destino`).toBeLessThanOrEqual(r.right + 0.5)
    // La etiqueta no sale del destino (se recorta con puntos suspensivos).
    const l = it.querySelector(':scope > [class*="item-label"]')!.getBoundingClientRect()
    expect(l.right, `${where}: etiqueta ${i} sale del destino`).toBeLessThanOrEqual(r.right + 0.5)
    expect(l.left, `${where}: etiqueta ${i} sale del destino`).toBeGreaterThanOrEqual(r.left - 0.5)
  })
  for (let i = 1; i < items.length; i++) {
    const a = items[i - 1]!.getBoundingClientRect()
    const b = items[i]!.getBoundingClientRect()
    if (gap === 'bar') {
      expect(b.left - a.right, `${where}: separación entre ${i - 1} y ${i}`).toBeCloseTo(0, 0)
      expect(b.width, `${where}: ancho del destino ${i}`).toBeCloseTo(a.width, 0)
    } else {
      expect(b.top - a.bottom, `${where}: separación entre ${i - 1} y ${i}`).toBeCloseTo(gap, 0)
    }
  }
}

describe('Navegación: sin desbordes y con las separaciones del kit', () => {
  for (const { name, ui, gap } of CASES) {
    for (const width of WIDTHS) {
      test(`${name}, ${width} de ancho, de 1 a 8 destinos`, async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        await viewport(width, 800)
        for (const n of COUNTS) {
          const c = await render(ui(n))
          audit(c, gap, `${n} destinos`)
        }
      })
    }
  }

  test('con 8 destinos en 320, la etiqueta se recorta con puntos suspensivos y el nombre accesible queda completo', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    await viewport(320, 800)
    const c = await render(CASES[0]!.ui(8))
    const last = page.getByRole('link', { name: label(7), exact: true }).element() as HTMLElement
    const text = last.querySelector<HTMLElement>(':scope > .mk-navigation-bar-item-label')!
    expect(getComputedStyle(text).textOverflow).toBe('ellipsis')
    expect(text.scrollWidth).toBeGreaterThan(text.clientWidth)
    expect(c.contains(last)).toBe(true)
  })

  // Alto compact (400): la suite en auto es la barra con destinos horizontales desde 600 de ancho.
  for (const width of [600, 840, 1300] as const) {
    test(`NavigationSuite layout="auto", ${width} × 400 (barra horizontal), de 1 a 8 destinos`, async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      await viewport(width, 400)
      const suiteCase = CASES.find((k) => k.name === 'NavigationSuite layout="auto"')!
      for (const n of COUNTS) {
        const c = await render(suiteCase.ui(n))
        audit(c, 'bar', `${n} destinos`)
      }
    })
  }
})
