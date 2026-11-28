import { createRef, useState } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'
import { HomeIcon } from '../../icons/icons.tsx'
import { Button } from '../../molecules/Button/Button.tsx'
import { render, roleColor, style, withMotion } from '../../test/render.tsx'
import {
  NavigationSuite,
  NavigationSuiteItem,
  NavigationSuiteItemIcon,
  NavigationSuiteItemLabel,
} from '../NavigationSuite/NavigationSuite.tsx'
import { Pane, PaneScaffold } from '../PaneScaffold/PaneScaffold.tsx'
import { BottomSheet, BottomSheetHandle, BottomSheetTitle, type BottomSheetState } from './BottomSheet.tsx'
import { BottomSheetContent } from './BottomSheetSlots.tsx'

// Arrastres con el mouse real de Playwright (commands.dragThrough), como los del modal.

const q = (c: ParentNode, sel: string) => {
  const el = c.querySelector(sel)
  if (!el) throw new Error(`no se encontró ${sel}`)
  return el as HTMLElement
}
const rect = (el: Element) => el.getBoundingClientRect()
const sheet = (c: ParentNode) => q(c, '.mk-bottom-sheet-standard')
const handle = (c: ParentNode) => q(c, '.mk-bottom-sheet-handle') as HTMLButtonElement
const frames = (n = 3) =>
  new Promise<void>((resolve) => {
    const step = (left: number) => (left ? requestAnimationFrame(() => step(left - 1)) : resolve())
    step(n)
  })

const BASE = { width: 414, height: 896 }
afterEach(async () => {
  if (window.innerWidth !== BASE.width || window.innerHeight !== BASE.height) {
    await page.viewport(BASE.width, BASE.height)
    await expect.poll(() => window.innerWidth).toBe(BASE.width)
  }
})
async function viewport(width: number, height: number) {
  await page.viewport(width, height)
  await expect.poll(() => [window.innerWidth, window.innerHeight]).toEqual([width, height])
}

interface HarnessProps {
  open?: boolean
  closable?: boolean
  nav?: boolean
  state?: BottomSheetState
  onStateChange?: (s: BottomSheetState, r: string) => void
  onClose?: () => void
}

function Sheet({ open, closable, state, onStateChange, onClose }: Omit<HarnessProps, 'nav'>) {
  return (
    <BottomSheet
      modal={false}
      open={open}
      state={state}
      onStateChange={onStateChange}
      onClose={closable ? (onClose ?? (() => {})) : undefined}
    >
      <BottomSheetHandle />
      <BottomSheetTitle>Lugares</BottomSheetTitle>
      <BottomSheetContent>
        {Array.from({ length: 6 }, (_, i) => (
          <p key={i} style={{ margin: 0, height: 48 }}>{`Lugar ${i + 1}`}</p>
        ))}
        <Button className="inside">Ver todo</Button>
      </BottomSheetContent>
    </BottomSheet>
  )
}

function Harness({ nav = false, ...props }: HarnessProps) {
  return (
    <PaneScaffold current="list" style={{ height: 600 }}>
      {nav && (
        <NavigationSuite aria-label="Principal">
          <NavigationSuiteItem href="#a" active>
            <NavigationSuiteItemIcon><HomeIcon filled /></NavigationSuiteItemIcon>
            <NavigationSuiteItemLabel>Inicio</NavigationSuiteItemLabel>
          </NavigationSuiteItem>
        </NavigationSuite>
      )}
      <Pane name="list">
        <Button className="behind">Detrás</Button>
        <div style={{ height: 2000 }} />
      </Pane>
      <Pane name="detail" />
      <Sheet {...props} />
    </PaneScaffold>
  )
}

/** Cuánto del sheet se ve sobre el borde de abajo del área de los paneles. */
function visibleHeight(c: ParentNode): number {
  const area = rect(q(c, '.mk-pane[data-pane="list"]'))
  return area.bottom - rect(sheet(c)).top
}

describe('BottomSheet standard: estructura y medidas', () => {
  test('un <aside> con el nombre del título, asomado por defecto: se ven 56', async () => {
    const c = await render(<Harness />)
    const el = sheet(c)
    expect(el.tagName).toBe('ASIDE')
    expect(page.getByRole('complementary', { name: 'Lugares' }).query()).toBe(el)
    expect(el.dataset['state']).toBe('partial')
    expect(visibleHeight(c)).toBeCloseTo(56, 1)
    expect(c.querySelector('dialog')).toBeNull()
  })

  test('contenedor del kit: surface-container-low, radio 28 arriba, elevación 3, asa de 32 × 4', async () => {
    const c = await render(<Harness />)
    const s = style(sheet(c))
    expect(s.backgroundColor).toBe(roleColor('surface-container-low'))
    expect([s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomLeftRadius]).toEqual(['28px', '28px', '0px'])
    const probe = document.createElement('div')
    probe.style.boxShadow = 'var(--md-sys-elevation-level3)'
    document.body.append(probe)
    expect(s.boxShadow).toBe(getComputedStyle(probe).boxShadow)
    probe.remove()
    const bar = getComputedStyle(handle(c), '::after')
    expect([bar.width, bar.height]).toEqual(['32px', '4px'])
  })

  test('ancho máximo 640, centrado sobre el área de los paneles (fuera del rail)', async () => {
    await viewport(1100, 800)
    const c = await render(<Harness nav />)
    const r = rect(sheet(c))
    expect(r.width).toBeCloseTo(640, 1)
    const railEnd = rect(q(c, '.mk-navigation-suite')).right
    expect(r.left - railEnd).toBeCloseTo(1100 - r.right, 1)
  })

  test('el contenido de atrás sigue usable y los paneles reciben abajo un relleno igual al asomo', async () => {
    const c = await render(<Harness />)
    const list = q(c, '.mk-pane[data-pane="list"]')
    expect(style(list).paddingBottom).toBe('56px')
    const onClick = vi.fn()
    q(c, '.behind').addEventListener('click', onClick)
    await userEvent.click(q(c, '.behind'))
    expect(onClick).toHaveBeenCalledTimes(1)
    // Sin sheet, o con el sheet oculto, no hay relleno.
    await render(<Harness open={false} />)
    expect(style(q(document.body, '.mk-pane[data-pane="list"]')).paddingBottom).toBe('0px')
  })

  test('sobre la barra de navegación: el sheet queda arriba de ella y la barra lo tapa al asomar', async () => {
    await viewport(400, 800)
    const c = await render(<Harness nav />)
    const bar = rect(q(c, '.mk-navigation-suite'))
    const area = rect(q(c, '.mk-pane[data-pane="list"]'))
    expect(area.bottom).toBeCloseTo(bar.top, 1)
    expect(bar.top - rect(sheet(c)).top).toBeCloseTo(56, 1)
    expect(Number(style(q(c, '.mk-navigation-suite')).zIndex)).toBeGreaterThan(Number(style(sheet(c)).zIndex))
  })

  test('props nativas, ref, className y style llegan al <aside>', async () => {
    const ref = createRef<HTMLElement>()
    const c = await render(
      <PaneScaffold style={{ height: 400 }}>
        <Pane name="list" />
        <BottomSheet modal={false} ref={ref} className="mine" style={{ color: 'red' }} data-x="1" aria-label="Hoja">
          <BottomSheetHandle />
        </BottomSheet>
      </PaneScaffold>,
    )
    expect(ref.current).toBe(sheet(c))
    expect(sheet(c).className).toBe('mk-bottom-sheet-standard mine')
    expect(sheet(c).dataset['x']).toBe('1')
    expect(sheet(c).getAttribute('aria-label')).toBe('Hoja')
  })
})

describe('BottomSheet standard: asa y teclado', () => {
  test('el asa es un botón que alterna asomado ("Expand") y expandido ("Collapse")', async () => {
    const c = await render(<Harness />)
    expect(handle(c).getAttribute('aria-label')).toBe('Expand')
    handle(c).click()
    await expect.poll(() => sheet(c).dataset['state']).toBe('expanded')
    expect(handle(c).getAttribute('aria-label')).toBe('Collapse')
    const area = rect(q(c, '.mk-pane[data-pane="list"]'))
    expect(rect(sheet(c)).bottom).toBeCloseTo(area.bottom, 1)
    handle(c).click()
    await expect.poll(() => sheet(c).dataset['state']).toBe('partial')
    expect(visibleHeight(c)).toBeCloseTo(56, 1)
  })

  test('con el teclado: Tab llega al asa y Enter expande', async () => {
    const c = await render(<Harness />)
    // Detrás, Ver todo… : el orden del documento. Se empieza desde el botón de atrás.
    q(c, '.behind').focus()
    await userEvent.tab()
    expect(document.activeElement).toBe(handle(c))
    await userEvent.keyboard('{Enter}')
    await expect.poll(() => sheet(c).dataset['state']).toBe('expanded')
  })

  test('el foco en algo que el asomo deja fuera de la vista expande el sheet (reason focus)', async () => {
    const onStateChange = vi.fn()
    const c = await render(<Harness onStateChange={onStateChange} />)
    // El asa se ve en el asomo: enfocarla no expande.
    handle(c).focus()
    await frames()
    expect(sheet(c).dataset['state']).toBe('partial')
    q(c, '.inside').focus()
    await expect.poll(() => sheet(c).dataset['state']).toBe('expanded')
    expect(onStateChange).toHaveBeenCalledWith('expanded', 'focus')
  })

  test('controlado: el asa solo pide; si el padre no cambia state, se queda', async () => {
    const onStateChange = vi.fn()
    const c = await render(<Harness state="partial" onStateChange={onStateChange} />)
    handle(c).click()
    expect(onStateChange).toHaveBeenCalledWith('expanded', 'handle')
    await frames()
    expect(sheet(c).dataset['state']).toBe('partial')
  })
})

describe('BottomSheet standard: arrastre', () => {
  test('arrastrar el asa hacia arriba lo expande; hacia abajo vuelve al asomo', async () => {
    const onStateChange = vi.fn()
    const c = await render(<Harness onStateChange={onStateChange} />)
    const start = visibleHeight(c)
    await commands.dragThrough('.mk-bottom-sheet-handle', [[24, 18], [24, 6], [24, -60], [24, -200]])
    expect(sheet(c).hasAttribute('data-dragging')).toBe(true)
    expect(visibleHeight(c) - start).toBeGreaterThan(150)
    await commands.pressUp()
    await expect.poll(() => sheet(c).dataset['state']).toBe('expanded')
    expect(onStateChange).toHaveBeenCalledWith('expanded', 'drag')
    expect(sheet(c).hasAttribute('data-dragging')).toBe(false)
    await commands.dragThrough('.mk-bottom-sheet-handle', [[24, 18], [24, 30], [24, 200], [24, 400]])
    await commands.pressUp()
    await expect.poll(() => sheet(c).dataset['state']).toBe('partial')
  })

  test('sin onClose no se oculta: hacia abajo desde el asomo no pasa del asomo', async () => {
    const c = await render(<Harness />)
    await commands.dragThrough('.mk-bottom-sheet-handle', [[24, 10], [24, 22], [24, 40], [24, 50]])
    expect(visibleHeight(c)).toBeCloseTo(56, 1)
    await commands.pressUp()
    await frames()
    expect(sheet(c).dataset['state']).toBe('partial')
  })

  test('con onClose, arrastrar hacia abajo desde el asomo pide ocultar; open={false} lo oculta e inerte', async () => {
    function Closable() {
      const [open, setOpen] = useState(true)
      return (
        <PaneScaffold style={{ height: 600 }}>
          <Pane name="list" />
          <Sheet open={open} closable onClose={() => setOpen(false)} />
        </PaneScaffold>
      )
    }
    const c = await render(<Closable />)
    await commands.dragThrough('.mk-bottom-sheet-handle', [[24, 10], [24, 22], [24, 40], [24, 52]])
    await commands.pressUp()
    await expect.poll(() => sheet(c).hasAttribute('data-closed')).toBe(true)
    expect(sheet(c).inert).toBe(true)
    expect(style(sheet(c)).visibility).toBe('hidden')
    expect(page.getByRole('complementary').query()).toBeNull()
    expect(style(q(c, '.mk-pane')).paddingBottom).toBe('0px')
  })

  test('después de arrastrar con el mouse, el clic que sigue no usa el asa', async () => {
    const c = await render(<Harness />)
    handle(c).click()
    await expect.poll(() => sheet(c).dataset['state']).toBe('expanded')
    // Hacia arriba desde expandido no se mueve; si el clic llegara al asa, lo contraería.
    await commands.dragThrough('.mk-bottom-sheet-handle', [[24, 30], [24, 18], [24, 6]])
    await commands.pressUp()
    await frames()
    expect(sheet(c).dataset['state']).toBe('expanded')
  })
})

describe('BottomSheet standard: movimiento', () => {
  test('entre estados con el resorte DefaultSpatial; oculto con FastEffects', async () => {
    const c = await render(<Harness />)
    const t = withMotion(() => style(sheet(c)).transitionProperty)
    expect(t).toContain('translate')
    await render(<Harness open={false} />)
    const closed = withMotion(() => style(sheet(document.body)).transitionDuration)
    expect(closed).not.toBe('0s')
  })

  test('movimiento reducido: ocultar es un fundido en el lugar, sin deslizarse', async () => {
    await commands.reduceMotion(true)
    try {
      const c = await render(<Harness open={false} />)
      const s = style(sheet(c))
      expect(s.opacity).toBe('0')
      const area = rect(q(c, '.mk-pane[data-pane="list"]'))
      expect(area.bottom - rect(sheet(c)).top).toBeCloseTo(56, 1)
    } finally {
      await commands.reduceMotion(false)
    }
  })
})
