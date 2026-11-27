import { createRef, useState, type ReactNode } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'
import {
  BottomSheet,
  BottomSheetHandle,
  BottomSheetTitle,
  type BottomSheetProps,
  type BottomSheetState,
  type BottomSheetStateChangeReason,
} from './BottomSheet.tsx'
import { BottomSheetContent } from './BottomSheetSlots.tsx'
import { computeTarget, VelocityTracker } from './sheet-drag.ts'
import { Button } from '../../molecules/Button/Button.tsx'
import { render, roleColor, style, withMotion } from '../../test/render.tsx'
import { CANCEL_WAYS, cancelExit, entered, withTransitions } from '../../test/exit.ts'

// Arrastres con el mouse real de Playwright (commands.dragThrough). A diferencia de los del Slider,
// pasan en Firefox con los demás archivos en paralelo (comprobado el 2026-11-26 con la suite
// completa, en la misma máquina donde los del Slider fallan así): no hace falta MK_SERIAL. Los
// gestos táctiles y de lápiz se despachan a mano, con el reloj de performance.now() falso.

const q = <T extends Element = HTMLElement>(c: ParentNode, sel: string) => c.querySelector(sel) as T
const sheet = (c: ParentNode) => q<HTMLDialogElement>(c, '.mk-bottom-sheet')
const handle = (c: ParentNode) => q<HTMLButtonElement>(c, '.mk-bottom-sheet-handle')
const content = (c: ParentNode) => q(c, '.mk-bottom-sheet-content')
/** Alto de la ventana (el bloque que contiene al sheet). */
const vh = () => document.documentElement.clientHeight
/** Desplazamiento del sheet hacia abajo desde expandido, medido en pantalla. */
const offset = (c: ParentNode) => {
  const s = sheet(c)
  return s.getBoundingClientRect().top - (vh() - s.offsetHeight)
}

/** Duración CSS en ms ('0.44s', '440ms'). */
const ms = (v: string) => (v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000)
/** Valor de un token en la raíz. */
const token = (name: string) => style(document.documentElement).getPropertyValue(name).trim()

function mixColor(role: string, percent: number): string {
  const probe = document.createElement('span')
  probe.style.color = `color-mix(in srgb, var(--md-sys-color-${role}) ${percent}%, transparent)`
  document.body.append(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value
}

const ITEMS = Array.from({ length: 40 }, (_, i) => <p key={i} style={{ margin: 0, height: 48 }}>Fila {i + 1}</p>)

type HarnessProps = Omit<BottomSheetProps, 'open' | 'onClose'> & {
  initialOpen?: boolean
  /** Si el padre acepta los pedidos de cierre. */
  accept?: boolean
  onRequest?: () => void
  tall?: boolean
  body?: ReactNode
}

function Harness({ initialOpen = false, accept = true, onRequest, tall = false, body, ...props }: HarnessProps) {
  const [open, setOpen] = useState(initialOpen)
  return (
    <>
      <Button className="opener" onClick={() => setOpen(true)}>Abrir</Button>
      <BottomSheet
        {...props}
        open={open}
        onClose={() => {
          onRequest?.()
          if (accept) setOpen(false)
        }}
      >
        <BottomSheetHandle />
        <BottomSheetTitle>Recorrido</BottomSheetTitle>
        <BottomSheetContent>{body ?? (tall ? ITEMS : <p style={{ margin: 0, height: 120 }}>Corto</p>)}</BottomSheetContent>
      </BottomSheet>
    </>
  )
}

/** Gesto despachado a mano (táctil por defecto), con el reloj de la velocidad en `performance.now()` falso. */
function gesture(target: Element, pointerType: 'touch' | 'mouse' | 'pen' = 'touch') {
  const r = target.getBoundingClientRect()
  let x = r.left + r.width / 2
  let y = r.top + r.height / 2
  const send = (type: string, el: Element = target) =>
    el.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: x,
        clientY: y,
        pointerId: 11,
        pointerType,
        isPrimary: true,
        button: type === 'pointermove' ? -1 : 0,
        buttons: type === 'pointerup' ? 0 : 1,
      }),
    )
  return {
    down() {
      send('pointerdown')
    },
    /** Mueve `dy` en pasos de `step` px, cada uno `ms` después del anterior. */
    move(dy: number, ms = 16, step = Math.sign(dy) * 4, dx = 0) {
      const n = Math.max(1, Math.round(Math.abs(dy / step)))
      for (let i = 0; i < n; i++) {
        vi.advanceTimersByTime(ms)
        y += dy / n
        x += dx / n
        send('pointermove')
      }
    },
    wait(ms: number) {
      vi.advanceTimersByTime(ms)
    },
    up() {
      send('pointerup')
    },
    cancel() {
      send('pointercancel')
    },
    /** Un `touchmove` como el que sigue al movimiento: ¿lo canceló el sheet? */
    touchmovePrevented() {
      const e = new Event('touchmove', { bubbles: true, cancelable: true })
      target.dispatchEvent(e)
      return e.defaultPrevented
    },
  }
}

const fakeClock = () => vi.useFakeTimers({ toFake: ['performance'] })
afterEach(() => {
  vi.useRealTimers()
})

describe('BottomSheet: decisión al soltar (sheet-drag.ts, portado de Compose)', () => {
  const anchors = [['expanded', 0], ['partial', 300], ['hidden', 600]] as const

  test('quieto: el ancla más cercana', () => {
    expect(computeTarget(anchors, 140, 0)).toBe('expanded')
    expect(computeTarget(anchors, 160, 0)).toBe('partial')
    expect(computeTarget(anchors, 460, 0)).toBe('hidden')
  })

  test('rápido (125 px/s o más): la siguiente en el sentido del gesto', () => {
    expect(computeTarget(anchors, 310, 125)).toBe('hidden')
    expect(computeTarget(anchors, 290, -125)).toBe('expanded')
    expect(computeTarget(anchors, 290, 124)).toBe('partial')
  })

  test('despacio: pasa a la siguiente si se alejó 56 de la anterior; si no, vuelve', () => {
    expect(computeTarget(anchors, 355, 100)).toBe('partial')
    expect(computeTarget(anchors, 356, 100)).toBe('hidden')
    expect(computeTarget(anchors, 245, -100)).toBe('partial')
    expect(computeTarget(anchors, 244, -100)).toBe('expanded')
  })

  test('la velocidad sale de los últimos 100 ms y vale 0 si el puntero se detuvo más de 40 ms', () => {
    const t = new VelocityTracker()
    t.add(0, 0)
    t.add(200, 500)
    t.add(250, 510)
    t.add(300, 520)
    expect(t.velocity(300)).toBeCloseTo(200, 5)
    expect(t.velocity(340)).toBeCloseTo(200, 5)
    expect(t.velocity(341)).toBe(0)
  })
})

describe('BottomSheet: apertura, cierre y accesibilidad', () => {
  test('cerrado no se muestra; abierto es un diálogo modal con nombre desde el título', async () => {
    const c = await render(<Harness />)
    expect(sheet(c).open).toBe(false)
    expect(style(sheet(c)).display).toBe('none')
    await userEvent.click(q(c, '.opener'))
    expect(sheet(c).matches(':modal')).toBe(true)
    await expect.element(page.getByRole('dialog', { name: 'Recorrido' })).toBeVisible()
  })

  test('al abrir, el foco va al asa; Escape pide cerrar y el foco vuelve al disparador', async () => {
    const onRequest = vi.fn()
    const c = await render(<Harness onRequest={onRequest} />)
    await userEvent.click(q(c, '.opener'))
    expect(document.activeElement).toBe(handle(c))
    await userEvent.keyboard('{Escape}')
    expect(onRequest).toHaveBeenCalledTimes(1)
    await expect.poll(() => sheet(c).open).toBe(false)
    expect(document.activeElement).toBe(q(c, '.opener'))
  })

  test('clic en el scrim pide cerrar; con closeOnScrimClick={false}, no', async () => {
    for (const closeOnScrimClick of [true, false]) {
      const onRequest = vi.fn()
      const c = await render(<Harness initialOpen closeOnScrimClick={closeOnScrimClick} onRequest={onRequest} />)
      const r = sheet(c).getBoundingClientRect()
      await userEvent.click(sheet(c), { position: { x: 8, y: -r.top + 8 } })
      expect(onRequest).toHaveBeenCalledTimes(closeOnScrimClick ? 1 : 0)
    }
  })

  test('Tab da la vuelta dentro del sheet', async () => {
    const c = await render(<Harness initialOpen body={<><button className="a">A</button><button className="b">B</button></>} />)
    expect(document.activeElement).toBe(handle(c))
    await userEvent.tab()
    await userEvent.tab()
    expect(document.activeElement).toBe(q(c, '.b'))
    await userEvent.tab()
    expect(document.activeElement).toBe(handle(c))
    await userEvent.tab({ shift: true })
    expect(document.activeElement).toBe(q(c, '.b'))
  })

  test('abierto, la página no se desplaza; cerrado, no la toca', async () => {
    const c = await render(<Harness />)
    expect(style(document.documentElement).overflow).toBe('visible')
    await userEvent.click(q(c, '.opener'))
    expect(style(document.documentElement).overflow).toBe('hidden')
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => style(document.documentElement).overflow).toBe('visible')
  })

  test('las partes fuera de un BottomSheet avisan con un error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(render(<BottomSheetHandle />)).rejects.toMatchObject({ code: 'MK_PART_OUTSIDE_PARENT', details: { component: 'BottomSheetHandle', parent: 'BottomSheet' } })
  })
})

describe('BottomSheet: estados', () => {
  test('corto: abre expandido y el asa es "Cerrar"', async () => {
    const onRequest = vi.fn()
    const c = await render(<Harness initialOpen onRequest={onRequest} accept={false} />)
    expect(sheet(c).dataset['state']).toBe('expanded')
    expect(offset(c)).toBeCloseTo(0, 0)
    expect(sheet(c).getBoundingClientRect().bottom).toBeCloseTo(vh(), 0)
    await expect.element(page.getByRole('button', { name: 'Cerrar' })).toBeVisible()
    await userEvent.click(handle(c))
    expect(onRequest).toHaveBeenCalledTimes(1)
  })

  test('alto: abre en el parcial (media ventana a la vista); el asa expande y contrae con teclado', async () => {
    const c = await render(<Harness initialOpen tall />)
    expect(sheet(c).dataset['state']).toBe('partial')
    expect(sheet(c).getBoundingClientRect().top).toBeCloseTo(vh() / 2, 0)
    expect(handle(c).getAttribute('aria-label')).toBe('Expandir')
    // El contenido largo sin enfocables recibe el foco inicial (como en el Dialog); el asa va antes.
    expect(document.activeElement).toBe(content(c))
    await userEvent.tab({ shift: true })
    expect(document.activeElement).toBe(handle(c))
    await userEvent.keyboard('{Enter}')
    await expect.poll(() => sheet(c).dataset['state']).toBe('expanded')
    // Expandido: todo su alto, hasta arriba de la ventana (el contenido es más alto).
    expect(sheet(c).getBoundingClientRect().top).toBeCloseTo(0, 0)
    expect(handle(c).getAttribute('aria-label')).toBe('Contraer')
    await userEvent.keyboard(' ')
    await expect.poll(() => sheet(c).dataset['state']).toBe('partial')
    expect(sheet(c).getBoundingClientRect().top).toBeCloseTo(vh() / 2, 0)
  })

  test('skipPartiallyExpanded: alto, abre expandido y el asa cierra', async () => {
    const c = await render(<Harness initialOpen tall skipPartiallyExpanded />)
    expect(sheet(c).dataset['state']).toBe('expanded')
    expect(handle(c).getAttribute('aria-label')).toBe('Cerrar')
  })

  test('el foco en algo que el parcial deja fuera de la ventana expande el sheet', async () => {
    const body = <>{ITEMS}<button className="far">Lejos</button></>
    const c = await render(<Harness initialOpen body={body} />)
    expect(sheet(c).dataset['state']).toBe('partial')
    q(c, '.far').focus()
    await expect.poll(() => sheet(c).dataset['state']).toBe('expanded')
  })

  test('nombres propios del asa', async () => {
    const c = await render(
      <BottomSheet open aria-label="Hoja">
        <BottomSheetHandle expandLabel="Más" collapseLabel="Menos" closeLabel="Fuera" />
        <BottomSheetContent>{ITEMS}</BottomSheetContent>
      </BottomSheet>,
    )
    expect(handle(c).getAttribute('aria-label')).toBe('Más')
    expect(sheet(c).getAttribute('aria-label')).toBe('Hoja')
  })
})

describe('BottomSheet: arrastre', () => {
  test('con el mouse, el sheet sigue al puntero desde el asa', async () => {
    const c = await render(<Harness initialOpen tall />)
    const start = offset(c)
    // Pasa el umbral de 8 px en el primer movimiento; desde ahí, sigue al puntero.
    await commands.dragThrough('.mk-bottom-sheet-handle', [[24, 18], [24, 30], [24, 70], [24, 130]])
    expect(sheet(c).hasAttribute('data-dragging')).toBe(true)
    expect(offset(c) - start).toBeCloseTo(100, 0)
    await commands.pressUp()
    await expect.poll(() => sheet(c).hasAttribute('data-dragging')).toBe(false)
  })

  test('con el mouse, después de arrastrar el asa no hace clic', async () => {
    const c = await render(<Harness initialOpen tall />)
    handle(c).click()
    await expect.poll(() => sheet(c).dataset['state']).toBe('expanded')
    // Hacia arriba desde expandido: el sheet no se mueve (no pasa de expandido) y queda ahí. Si el
    // clic llegara al asa ("Contraer"), lo llevaría al parcial.
    await commands.dragThrough('.mk-bottom-sheet-handle', [[24, 30], [24, 18], [24, 6]])
    expect(sheet(c).hasAttribute('data-dragging')).toBe(true)
    await commands.pressUp()
    await expect.poll(() => sheet(c).hasAttribute('data-dragging')).toBe(false)
    expect(sheet(c).dataset['state']).toBe('expanded')
  })

  test('con el dedo sigue al puntero, sin el salto del umbral', async () => {
    const c = await render(<Harness initialOpen tall />)
    fakeClock()
    const start = offset(c)
    const g = gesture(handle(c))
    g.down()
    g.move(4)
    expect(offset(c)).toBeCloseTo(start, 0)
    expect(sheet(c).hasAttribute('data-dragging')).toBe(false)
    g.move(4)
    expect(sheet(c).hasAttribute('data-dragging')).toBe(true)
    expect(offset(c)).toBeCloseTo(start, 0)
    g.move(60)
    expect(offset(c) - start).toBeCloseTo(60, 0)
    g.move(-90)
    expect(offset(c) - start).toBeCloseTo(-30, 0)
    g.wait(100)
    g.up()
  })

  test('no pasa de expandido hacia arriba ni de oculto hacia abajo', async () => {
    const c = await render(<Harness initialOpen />)
    fakeClock()
    const g = gesture(handle(c))
    g.down()
    g.move(-200)
    expect(offset(c)).toBeCloseTo(0, 0)
    g.move(2000, 16, 40)
    expect(offset(c)).toBeCloseTo(sheet(c).offsetHeight, 0)
    g.cancel()
    expect(sheet(c).hasAttribute('data-dragging')).toBe(false)
    expect(offset(c)).toBeCloseTo(0, 0)
  })

  test('despacio y menos de 56: vuelve al parcial', async () => {
    const c = await render(<Harness initialOpen tall />)
    fakeClock()
    const g = gesture(handle(c))
    g.down()
    g.move(8)
    g.move(50, 100, 10) // 100 px/s
    g.up()
    expect(sheet(c).dataset['state']).toBe('partial')
    expect(sheet(c).open).toBe(true)
    expect(sheet(c).getBoundingClientRect().top).toBeCloseTo(vh() / 2, 0)
  })

  test('despacio y 56 o más hacia abajo desde el parcial: cierra', async () => {
    const onRequest = vi.fn()
    const c = await render(<Harness initialOpen tall onRequest={onRequest} />)
    fakeClock()
    const g = gesture(handle(c))
    g.down()
    g.move(8)
    g.move(60, 100, 10)
    g.up()
    expect(onRequest).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
    await expect.poll(() => sheet(c).open).toBe(false)
  })

  test('despacio y 56 o más hacia arriba desde el parcial: expande', async () => {
    const c = await render(<Harness initialOpen tall />)
    fakeClock()
    const g = gesture(handle(c))
    g.down()
    g.move(-8)
    g.move(-60, 100, -10)
    g.up()
    await expect.poll(() => sheet(c).dataset['state']).toBe('expanded')
  })

  test('rápido y corto hacia abajo desde expandido: va al parcial; quieto antes de soltar: el más cercano', async () => {
    const c = await render(<Harness initialOpen tall />)
    handle(c).click()
    await expect.poll(() => sheet(c).dataset['state']).toBe('expanded')
    fakeClock()
    let g = gesture(handle(c))
    g.down()
    g.move(8)
    g.move(30, 10, 10) // 1000 px/s, 30 px
    g.up()
    await expect.poll(() => sheet(c).dataset['state']).toBe('partial')
    // Del parcial (448 en una ventana de 896) sube 300, más cerca de expandido; se detiene 50 ms
    // (velocidad 0) y suelta.
    g = gesture(handle(c))
    g.down()
    g.move(-8)
    g.move(-300, 16, -20)
    g.wait(50)
    g.up()
    await expect.poll(() => sheet(c).dataset['state']).toBe('expanded')
  })

  test('rápido hacia abajo desde el parcial: cierra; si el padre no cierra, vuelve al parcial', async () => {
    const onRequest = vi.fn()
    const c = await render(<Harness initialOpen tall accept={false} onRequest={onRequest} />)
    fakeClock()
    const g = gesture(handle(c))
    g.down()
    g.move(8)
    g.move(20, 10, 10)
    g.up()
    expect(onRequest).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
    await expect.poll(() => sheet(c).style.getPropertyValue('--_drag')).toBe('')
    expect(sheet(c).open).toBe(true)
    expect(sheet(c).dataset['state']).toBe('partial')
    expect(sheet(c).getBoundingClientRect().top).toBeCloseTo(vh() / 2, 0)
  })

  test('un gesto horizontal no arrastra', async () => {
    const c = await render(<Harness initialOpen tall />)
    fakeClock()
    const g = gesture(handle(c))
    g.down()
    g.move(10, 16, 2, 60)
    expect(sheet(c).hasAttribute('data-dragging')).toBe(false)
    g.up()
  })

  test('con el mouse, el contenido no arrastra (selecciona texto); con el lápiz, sí', async () => {
    const c = await render(<Harness initialOpen tall />)
    fakeClock()
    let g = gesture(content(c), 'mouse')
    g.down()
    g.move(40)
    expect(sheet(c).hasAttribute('data-dragging')).toBe(false)
    g.up()
    g = gesture(content(c), 'pen')
    g.down()
    g.move(40)
    expect(sheet(c).hasAttribute('data-dragging')).toBe(true)
    g.cancel()
  })
})

describe('BottomSheet: desplazamiento anidado', () => {
  async function expanded() {
    const c = await render(<Harness initialOpen tall skipPartiallyExpanded />)
    expect(content(c).scrollHeight).toBeGreaterThan(content(c).clientHeight)
    return c
  }

  test('expandido y el contenido arriba de todo: deslizar hacia abajo mueve el sheet y no desplaza', async () => {
    const c = await expanded()
    fakeClock()
    const g = gesture(content(c))
    g.down()
    g.move(8)
    g.move(50)
    expect(offset(c)).toBeCloseTo(50, 0)
    expect(g.touchmovePrevented()).toBe(true)
    g.cancel()
  })

  test('con el contenido desplazado, deslizar hacia abajo desplaza (el sheet no se mueve)', async () => {
    const c = await expanded()
    content(c).scrollTop = 100
    fakeClock()
    const g = gesture(content(c))
    g.down()
    g.move(60)
    expect(sheet(c).hasAttribute('data-dragging')).toBe(false)
    expect(offset(c)).toBeCloseTo(0, 0)
    expect(g.touchmovePrevented()).toBe(false)
    g.up()
  })

  test('expandido, deslizar hacia arriba desplaza el contenido', async () => {
    const c = await expanded()
    fakeClock()
    const g = gesture(content(c))
    g.down()
    g.move(-60)
    expect(sheet(c).hasAttribute('data-dragging')).toBe(false)
    expect(g.touchmovePrevented()).toBe(false)
    g.up()
  })

  test('parcial: deslizar hacia arriba en el contenido expande el sheet', async () => {
    const c = await render(<Harness initialOpen tall />)
    fakeClock()
    const start = offset(c)
    const g = gesture(content(c))
    g.down()
    g.move(-8)
    g.move(-80)
    expect(offset(c) - start).toBeCloseTo(-80, 0)
    expect(g.touchmovePrevented()).toBe(true)
    g.up()
    await expect.poll(() => sheet(c).dataset['state']).toBe('expanded')
  })

  test('el desplazamiento normal del contenido sigue funcionando', async () => {
    const c = await expanded()
    content(c).scrollTop = 0
    await userEvent.hover(content(c))
    content(c).scrollBy(0, 120)
    expect(content(c).scrollTop).toBe(120)
    expect(style(content(c)).overflowY).toBe('auto')
  })
})

describe('BottomSheet: medidas y colores', () => {
  test('contenedor: radio 28 arriba y 0 abajo, surface-container-low, sin sombra, scrim al 32 %', async () => {
    const c = await render(<Harness initialOpen />)
    const s = style(sheet(c))
    expect(s.borderTopLeftRadius).toBe('28px')
    expect(s.borderTopRightRadius).toBe('28px')
    expect(s.borderBottomLeftRadius).toBe('0px')
    expect(s.borderBottomRightRadius).toBe('0px')
    expect(s.backgroundColor).toBe(roleColor('surface-container-low'))
    expect(s.boxShadow).toBe('none')
    expect(s.color).toBe(roleColor('on-surface'))
    await expect.poll(() => getComputedStyle(sheet(c), '::backdrop').backgroundColor).toBe(mixColor('scrim', 32))
  })

  test('asa: barra de 32 × 4 en outline, centrada, con 16 arriba (cabecera de 36)', async () => {
    const c = await render(<Harness initialOpen />)
    const s = sheet(c).getBoundingClientRect()
    const h = handle(c).getBoundingClientRect()
    expect(h.height).toBe(36)
    expect(h.top - s.top).toBeCloseTo(0, 2)
    const bar = getComputedStyle(handle(c), '::after')
    expect(bar.backgroundColor).toBe(roleColor('outline'))
    expect(bar.width).toBe('32px')
    expect(bar.height).toBe('4px')
    expect(bar.top).toBe('16px')
    expect(h.left + h.width / 2 - s.left).toBeCloseTo(s.width / 2, 1)
  })

  test('ventana compacta: a todo el ancho', async () => {
    const c = await render(<Harness initialOpen />)
    const r = sheet(c).getBoundingClientRect()
    expect(r.left).toBeCloseTo(0, 2)
    expect(r.width).toBeCloseTo(document.documentElement.clientWidth, 2)
  })

  test('ventana ancha: 640 de ancho como máximo, centrado', async () => {
    await page.viewport(1200, 800)
    try {
      const c = await render(<Harness initialOpen />)
      const r = sheet(c).getBoundingClientRect()
      expect(r.width).toBe(640)
      expect(r.left).toBeCloseTo((document.documentElement.clientWidth - 640) / 2, 1)
      expect(r.bottom).toBeCloseTo(vh(), 1)
    } finally {
      await page.viewport(414, 896)
    }
  })

  test('título: Title Large en on-surface, a 16 del borde', async () => {
    const c = await render(<Harness initialOpen />)
    const t = q(c, '.mk-bottom-sheet-title')
    expect(style(t).color).toBe(roleColor('on-surface'))
    expect(style(t).paddingInlineStart).toBe('16px')
    expect(t.tagName).toBe('H2')
  })

  test('RTL: el asa queda centrada', async () => {
    const c = await render(<div dir="rtl"><Harness initialOpen /></div>)
    const s = sheet(c).getBoundingClientRect()
    const h = handle(c).getBoundingClientRect()
    expect(h.left + h.width / 2 - s.left).toBeCloseTo(s.width / 2, 1)
    expect(style(q(c, '.mk-bottom-sheet-title')).paddingRight).toBe('16px')
  })
})

describe('BottomSheet: movimiento', () => {
  test('entra desde abajo con el resorte DefaultSpatial y sale con FastEffects', async () => {
    const c = await render(<Harness initialOpen />)
    const s = sheet(c)
    withMotion(() => {
      expect(style(s).transitionProperty).toBe('translate')
      expect(ms(style(s).transitionDuration)).toBe(ms(token('--md-sys-motion-spring-default-spatial-duration')))
      expect(style(s).transitionTimingFunction.startsWith('linear(')).toBe(true)
      s.setAttribute('data-closing', '')
      expect(ms(style(s).transitionDuration)).toBe(ms(token('--md-sys-motion-spring-fast-effects-duration')))
      s.removeAttribute('data-closing')
    })
    // Sin transiciones (render.tsx), los valores finales: oculto, todo su alto hacia abajo.
    s.setAttribute('data-closing', '')
    expect(style(s).translate).toBe('0px 100%')
    s.removeAttribute('data-closing')
    expect(style(s).translate).toBe('0px')
  })

  test('con open={false} anima la salida antes de cerrar', async () => {
    await withTransitions(async () => {
      const c = await render(<Harness initialOpen />)
      await entered(sheet(c))
      await userEvent.keyboard('{Escape}')
      await expect.poll(() => sheet(c).hasAttribute('data-closing')).toBe(true)
      expect(sheet(c).open).toBe(true)
      await expect.poll(() => sheet(c).open).toBe(false)
      expect(sheet(c).hasAttribute('data-closing')).toBe(false)
    })
  })

  for (const how of CANCEL_WAYS) {
    test(`salida cancelada (${how}): se cierra igual y la página vuelve a responder`, async () => {
      await withTransitions(async () => {
        const c = await render(<Harness initialOpen />)
        await entered(sheet(c))
        await userEvent.keyboard('{Escape}')
        await cancelExit(sheet(c), how)
        await expect.poll(() => sheet(c).open).toBe(false)
        await userEvent.click(q(c, '.opener'))
        await expect.poll(() => sheet(c).open).toBe(true)
      })
    })
  }

  test('con movimiento reducido: sin deslizarse (fundido), y el arrastre sigue al dedo', async () => {
    await commands.reduceMotion(true)
    try {
      const c = await render(<Harness initialOpen tall />)
      withMotion(() => {
        expect(ms(style(sheet(c)).transitionDuration.split(', ')[0]!)).toBe(0)
        sheet(c).setAttribute('data-closing', '')
        expect(style(sheet(c)).transitionProperty).toBe('opacity')
        sheet(c).removeAttribute('data-closing')
      })
      // La salida es un fundido en el lugar: no baja.
      sheet(c).setAttribute('data-closing', '')
      expect(style(sheet(c)).opacity).toBe('0')
      expect(sheet(c).getBoundingClientRect().top).toBeCloseTo(vh() / 2, 0)
      sheet(c).removeAttribute('data-closing')
      fakeClock()
      const start = offset(c)
      const g = gesture(handle(c))
      g.down()
      g.move(8)
      g.move(40)
      expect(offset(c) - start).toBeCloseTo(40, 0)
      g.cancel()
    } finally {
      await commands.reduceMotion(false)
    }
  })
})

describe('BottomSheet: props nativas y ref', () => {
  test('ref, className, style y atributos llegan al <dialog>; los manejadores propios se llaman', async () => {
    const ref = createRef<HTMLDialogElement>()
    const onKeyDown = vi.fn()
    const onPointerDown = vi.fn()
    const c = await render(
      <BottomSheet open ref={ref} className="mio" style={{ color: 'red' }} data-x="1" aria-label="Hoja" onKeyDown={onKeyDown} onPointerDown={onPointerDown}>
        <BottomSheetHandle className="asa" data-y="2" />
        <BottomSheetContent className="cont" id="c1">Texto</BottomSheetContent>
      </BottomSheet>,
    )
    expect(ref.current).toBe(sheet(c))
    expect(sheet(c).classList.contains('mio')).toBe(true)
    expect(sheet(c).dataset['x']).toBe('1')
    expect(sheet(c).style.color).toBe('red')
    expect(handle(c).classList.contains('asa')).toBe(true)
    expect(handle(c).dataset['y']).toBe('2')
    expect(content(c).id).toBe('c1')
    await userEvent.keyboard('{ArrowDown}')
    expect(onKeyDown).toHaveBeenCalled()
    gesture(handle(c)).down()
    expect(onPointerDown).toHaveBeenCalled()
  })

  test('el título acepta ref, id propio y props nativas', async () => {
    const ref = createRef<HTMLHeadingElement>()
    const c = await render(
      <BottomSheet open>
        <BottomSheetTitle ref={ref} id="t1" className="tt">Título</BottomSheetTitle>
      </BottomSheet>,
    )
    expect(ref.current?.id).toBe('t1')
    expect(sheet(c).getAttribute('aria-labelledby')).toBe('t1')
  })
})

// --- Estado controlado y progreso (ADR-0025, actualización del 2026-11-26) ---

/** Un cuadro de la página. */
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))
const progress = (c: ParentNode) => Number(sheet(c).style.getPropertyValue('--mk-bottom-sheet-progress'))

/** Cambiar desde la prueba lo que el padre controla (la página de atrás es inerte al puntero). */
let parent: { setState: (s: BottomSheetState) => void; setTall: (t: boolean) => void } | undefined

function Controlled({
  initial = 'partial',
  accept = true,
  initialTall = true,
  onStateChange,
  ...props
}: Omit<BottomSheetProps, 'state' | 'onStateChange'> & {
  initial?: BottomSheetState | undefined
  accept?: boolean
  initialTall?: boolean
  onStateChange?: (s: BottomSheetState, r: BottomSheetStateChangeReason) => void
}) {
  const [state, setState] = useState<BottomSheetState>(initial)
  const [tall, setTall] = useState(initialTall)
  parent = { setState, setTall }
  return (
    <BottomSheet
      open
      aria-label="Hoja"
      {...props}
      state={props.defaultState ? undefined : state}
      onStateChange={(next, reason) => {
        onStateChange?.(next, reason)
        if (accept) setState(next)
      }}
    >
      <BottomSheetHandle />
      <BottomSheetContent>{tall ? ITEMS : <p style={{ margin: 0, height: 120 }}>Corto</p>}</BottomSheetContent>
    </BottomSheet>
  )
}

describe('BottomSheet: estado controlado (state, defaultState, onStateChange)', () => {
  test('el padre lo pasa a expandido y vuelve al parcial; esos cambios no se avisan', async () => {
    const onStateChange = vi.fn()
    const c = await render(<Controlled onStateChange={onStateChange} />)
    expect(sheet(c).dataset['state']).toBe('partial')
    parent!.setState('expanded')
    await expect.poll(() => sheet(c).dataset['state']).toBe('expanded')
    expect(sheet(c).getBoundingClientRect().top).toBeCloseTo(0, 0)
    parent!.setState('partial')
    await expect.poll(() => sheet(c).dataset['state']).toBe('partial')
    expect(sheet(c).getBoundingClientRect().top).toBeCloseTo(vh() / 2, 0)
    expect(onStateChange).not.toHaveBeenCalled()
  })

  test('arrastre: una sola llamada con el destino y el motivo "drag"', async () => {
    const onStateChange = vi.fn()
    const c = await render(<Controlled onStateChange={onStateChange} />)
    fakeClock()
    const g = gesture(handle(c))
    g.down()
    g.move(-8)
    g.move(-60, 100, -10)
    g.up()
    await expect.poll(() => sheet(c).dataset['state']).toBe('expanded')
    expect(onStateChange).toHaveBeenCalledTimes(1)
    expect(onStateChange).toHaveBeenCalledWith('expanded', 'drag')
  })

  test('un arrastre que vuelve al mismo estado no avisa', async () => {
    const onStateChange = vi.fn()
    const c = await render(<Controlled onStateChange={onStateChange} />)
    fakeClock()
    const g = gesture(handle(c))
    g.down()
    g.move(8)
    g.move(30, 100, 10)
    g.up()
    expect(onStateChange).not.toHaveBeenCalled()
    expect(sheet(c).dataset['state']).toBe('partial')
  })

  test('asa: "handle", una llamada por cambio, también sin controlar', async () => {
    const onStateChange = vi.fn()
    const c = await render(<Controlled onStateChange={onStateChange} />)
    handle(c).click()
    await expect.poll(() => sheet(c).dataset['state']).toBe('expanded')
    handle(c).click()
    await expect.poll(() => sheet(c).dataset['state']).toBe('partial')
    expect(onStateChange.mock.calls).toEqual([['expanded', 'handle'], ['partial', 'handle']])

    const free = vi.fn()
    const u = await render(<Harness initialOpen tall onStateChange={free} />)
    handle(u).click()
    await expect.poll(() => sheet(u).dataset['state']).toBe('expanded')
    expect(free.mock.calls).toEqual([['expanded', 'handle']])
  })

  test('foco: "focus" al expandir por el foco', async () => {
    const onStateChange = vi.fn()
    const body = <>{ITEMS}<button className="far">Lejos</button></>
    const c = await render(<Harness initialOpen body={body} onStateChange={onStateChange} />)
    q(c, '.far').focus()
    await expect.poll(() => sheet(c).dataset['state']).toBe('expanded')
    expect(onStateChange.mock.calls).toEqual([['expanded', 'focus']])
  })

  test('veto: si el padre no cambia state, el sheet vuelve al anterior (arrastre y asa)', async () => {
    const onStateChange = vi.fn()
    const c = await render(<Controlled accept={false} onStateChange={onStateChange} />)
    fakeClock()
    const g = gesture(handle(c))
    g.down()
    g.move(-8)
    g.move(-200, 16, -20)
    g.up()
    expect(onStateChange).toHaveBeenCalledWith('expanded', 'drag')
    vi.useRealTimers()
    await frame()
    expect(sheet(c).dataset['state']).toBe('partial')
    expect(sheet(c).hasAttribute('data-dragging')).toBe(false)
    expect(sheet(c).getBoundingClientRect().top).toBeCloseTo(vh() / 2, 0)
    handle(c).click()
    expect(onStateChange).toHaveBeenLastCalledWith('expanded', 'handle')
    await frame()
    expect(sheet(c).dataset['state']).toBe('partial')
    expect(handle(c).getAttribute('aria-label')).toBe('Expandir')
  })

  test('state="partial" sin parcial (sheet corto): se muestra expandido y avisa "resize" una vez', async () => {
    const onStateChange = vi.fn()
    const c = await render(<Controlled initialTall={false} accept={false} onStateChange={onStateChange} />)
    expect(sheet(c).dataset['state']).toBe('expanded')
    expect(handle(c).getAttribute('aria-label')).toBe('Cerrar')
    expect(onStateChange.mock.calls).toEqual([['expanded', 'resize']])
  })

  test('state="partial" con skipPartiallyExpanded: expandido y "resize"', async () => {
    const onStateChange = vi.fn()
    const c = await render(<Controlled skipPartiallyExpanded accept={false} onStateChange={onStateChange} />)
    expect(sheet(c).dataset['state']).toBe('expanded')
    expect(onStateChange.mock.calls).toEqual([['expanded', 'resize']])
  })

  test('el padre pide el parcial cuando no existe: sigue expandido y avisa "resize"', async () => {
    const onStateChange = vi.fn()
    const c = await render(<Controlled initial="expanded" initialTall={false} accept={false} onStateChange={onStateChange} />)
    expect(onStateChange).not.toHaveBeenCalled()
    parent!.setState('partial')
    await expect.poll(() => onStateChange.mock.calls).toEqual([['expanded', 'resize']])
    expect(sheet(c).dataset['state']).toBe('expanded')
  })

  test('resize: el parcial desaparece y vuelve con el alto del contenido; con state="partial", vuelve', async () => {
    const onStateChange = vi.fn()
    const c = await render(<Controlled accept={false} onStateChange={onStateChange} />)
    expect(sheet(c).dataset['state']).toBe('partial')
    parent!.setTall(false)
    await expect.poll(() => sheet(c).dataset['state']).toBe('expanded')
    expect(onStateChange.mock.calls).toEqual([['expanded', 'resize']])
    parent!.setTall(true)
    await expect.poll(() => sheet(c).dataset['state']).toBe('partial')
    expect(onStateChange.mock.calls).toEqual([['expanded', 'resize'], ['partial', 'resize']])
  })

  test('resize sin controlar: queda expandido aunque el parcial vuelva (como Compose)', async () => {
    const onStateChange = vi.fn()
    const c = await render(<Controlled defaultState="partial" onStateChange={onStateChange} />)
    expect(sheet(c).dataset['state']).toBe('partial')
    parent!.setTall(false)
    await expect.poll(() => sheet(c).dataset['state']).toBe('expanded')
    parent!.setTall(true)
    await expect.poll(() => handle(c).getAttribute('aria-label')).toBe('Contraer')
    expect(sheet(c).dataset['state']).toBe('expanded')
    expect(onStateChange.mock.calls).toEqual([['expanded', 'resize']])
  })

  test('defaultState="expanded": abre expandido cada vez, sin avisar', async () => {
    const onStateChange = vi.fn()
    const c = await render(<Harness initialOpen tall defaultState="expanded" onStateChange={onStateChange} />)
    expect(sheet(c).dataset['state']).toBe('expanded')
    expect(onStateChange).not.toHaveBeenCalled()
  })
})

describe('BottomSheet: progreso (--mk-bottom-sheet-progress)', () => {
  test('lo visible del alto: parcial, valores intermedios al arrastrar, final al soltar y al expandir', async () => {
    const c = await render(<Harness initialOpen tall />)
    const h = sheet(c).offsetHeight
    const partial = vh() / 2 / h
    await expect.poll(() => progress(c)).toBeCloseTo(partial, 3)
    fakeClock()
    const g = gesture(handle(c))
    g.down()
    g.move(8)
    g.move(100)
    expect(progress(c)).toBeCloseTo(1 - (h - vh() / 2 + 100) / h, 3)
    g.move(-400, 16, -20)
    expect(progress(c)).toBeCloseTo(1 - (h - vh() / 2 - 300) / h, 3)
    g.wait(100)
    g.up()
    vi.useRealTimers()
    // Quieto más cerca de expandido: se acomoda en 1.
    await expect.poll(() => progress(c)).toBeCloseTo(1, 3)
    handle(c).click()
    await expect.poll(() => sheet(c).dataset['state']).toBe('partial')
    await expect.poll(() => progress(c)).toBeCloseTo(partial, 3)
  })

  test('cerrado vale 0', async () => {
    const c = await render(<Harness initialOpen />)
    await expect.poll(() => progress(c)).toBeCloseTo(1, 3)
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => sheet(c).open).toBe(false)
    expect(progress(c)).toBe(0)
  })

  test('sigue la animación al soltar: pasa por valores intermedios hasta el final', async () => {
    await withTransitions(async () => {
      const c = await render(<Harness initialOpen tall />)
      await entered(sheet(c))
      await expect.poll(() => progress(c)).toBeCloseTo(vh() / 2 / sheet(c).offsetHeight, 3)
      const start = progress(c)
      handle(c).click()
      const seen: number[] = []
      for (let i = 0; i < 6; i++) {
        await frame()
        seen.push(progress(c))
      }
      expect(seen.some((p) => p > start + 0.01 && p < 0.99)).toBe(true)
      await expect.poll(() => progress(c), { timeout: 3000 }).toBeCloseTo(1, 2)
    })
  })

  test('el ::backdrop hereda la variable (para atenuar el scrim con el progreso)', async () => {
    const st = document.createElement('style')
    st.textContent = '.prog::backdrop { opacity: var(--mk-bottom-sheet-progress); }'
    document.head.append(st)
    try {
      const c = await render(<Harness initialOpen tall className="prog" />)
      await expect.poll(() => Number(getComputedStyle(sheet(c), '::backdrop').opacity)).toBeCloseTo(progress(c), 3)
      expect(progress(c)).toBeGreaterThan(0)
    } finally {
      st.remove()
    }
  })
})

describe('BottomSheet: el asa después de un arrastre táctil', () => {
  // Un arrastre táctil no genera clic: antes dejaba puesta la marca que descarta el clic siguiente
  // y se comía la próxima activación del asa (teclado o clic).
  test('la próxima activación del asa funciona', async () => {
    const c = await render(<Harness initialOpen tall />)
    fakeClock()
    const g = gesture(handle(c))
    g.down()
    g.move(8)
    g.move(20, 100, 10)
    g.up()
    vi.useRealTimers()
    handle(c).click()
    await expect.poll(() => sheet(c).dataset['state']).toBe('expanded')
  })
})
