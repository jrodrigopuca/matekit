// Aviso de destinos de más (MK_NAVIGATION_TOO_MANY_DESTINATIONS) en cada componente, en el navegador.
// La deduplicación es por texto y dura todo el archivo: cada componente avisa una sola vez, así que
// cada prueba usa su propio componente o caso. El conteo y el caso de 8 después de 6 están también en
// tests/navigation-count.test.ts (Node).

import { afterEach, beforeEach, describe, expect, test, vi, type MockInstance } from 'vitest'
import {
  HomeIcon,
  ModalNavigationRail,
  NavigationBar,
  NavigationBarItem,
  NavigationBarItemIcon,
  NavigationBarItemLabel,
  NavigationRail,
  NavigationRailItem,
  NavigationRailItemLabel,
  NavigationSuite,
  NavigationSuiteItem,
  NavigationSuiteItemLabel,
  Tooltip,
} from '../index.ts'
import { render } from './render.tsx'

const CODE = 'MK_NAVIGATION_TOO_MANY_DESTINATIONS'
const range = (n: number) => Array.from({ length: n }, (_, i) => i)

let warn: MockInstance<typeof console.warn>
beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  warn.mockRestore()
})

const bar = (n: number) => (
  <NavigationBar aria-label="Barra">
    {range(n).map((i) => (
      <NavigationBarItem key={i} href={`#${i}`}>
        <NavigationBarItemIcon><HomeIcon /></NavigationBarItemIcon>
        <NavigationBarItemLabel>Destino {i}</NavigationBarItemLabel>
      </NavigationBarItem>
    ))}
  </NavigationBar>
)
const rail = (n: number, expanded = false) => (
  <div style={{ height: 400, display: 'flex' }}>
    <NavigationRail aria-label="Rail" expanded={expanded}>
      {range(n).map((i) => (
        <NavigationRailItem key={i} href={`#${i}`}><NavigationRailItemLabel>Destino {i}</NavigationRailItemLabel></NavigationRailItem>
      ))}
    </NavigationRail>
  </div>
)
const suite = (n: number, layout?: 'rail') => (
  <NavigationSuite aria-label="Suite" layout={layout}>
    {range(n).map((i) => (
      <NavigationSuiteItem key={i} href={`#${i}`}><NavigationSuiteItemLabel>Destino {i}</NavigationSuiteItemLabel></NavigationSuiteItem>
    ))}
  </NavigationSuite>
)

describe('Aviso de destinos de más (MK_NAVIGATION_TOO_MANY_DESTINATIONS)', () => {
  test('NavigationBar: con 5 no avisa; con 6 sí, con el conteo; otra con 8 no repite', async () => {
    await render(bar(5))
    expect(warn).not.toHaveBeenCalled()
    await render(bar(6))
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/NavigationBar: .*at most 5.*Fix: .*ModalNavigationRail.*\(MK_NAVIGATION_TOO_MANY_DESTINATIONS\)$/),
      expect.objectContaining({ code: CODE, component: 'NavigationBar', count: 6, max: 5 }),
    )
    await render(bar(8))
    expect(warn).toHaveBeenCalledTimes(1)
  })

  test('NavigationRail: contraído con 7 o expandido con 9 no avisa; contraído con 8 sí', async () => {
    await render(rail(7))
    await render(rail(9, true))
    expect(warn).not.toHaveBeenCalled()
    await render(rail(8))
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('NavigationRail: has more destinations than Material recommends, at most 7 while collapsed'),
      expect.objectContaining({ code: CODE, count: 8, max: 7 }),
    )
  })

  test('NavigationSuite: con 5 no avisa; con 8 sí (puede ser una barra); con layout="rail", hasta 7', async () => {
    await render(suite(5))
    await render(suite(7, 'rail'))
    expect(warn).not.toHaveBeenCalled()
    await render(suite(8))
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('NavigationSuite: has more destinations than Material recommends, at most 5'),
      expect.objectContaining({ code: CODE, component: 'NavigationSuite', count: 8, max: 5 }),
    )
  })

  test('ModalNavigationRail no avisa (sus destinos se desplazan)', async () => {
    await render(
      <ModalNavigationRail open>
        {range(12).map((i) => (
          <NavigationRailItem key={i} href={`#${i}`}><NavigationRailItemLabel>Destino {i}</NavigationRailItemLabel></NavigationRailItem>
        ))}
      </ModalNavigationRail>,
    )
    expect(warn).not.toHaveBeenCalled()
  })

  test('cuenta los destinos envueltos de a uno en un Tooltip', async () => {
    await render(
      <NavigationSuite aria-label="Suite" layout="rail">
        {range(8).map((i) => (
          <Tooltip key={i}>
            <NavigationSuiteItem href={`#${i}`} aria-label={`Destino ${i}`} />
          </Tooltip>
        ))}
      </NavigationSuite>,
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('at most 7 with layout="rail"'), expect.objectContaining({ count: 8 }))
  })
})
