import { createRef, useState, type CSSProperties, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { commands, userEvent } from 'vitest/browser'
import { Tooltip } from './Tooltip.tsx'
import {
  RichTooltip,
  RichTooltipActions,
  RichTooltipContent,
  RichTooltipSubhead,
  RichTooltipSupporting,
  RichTooltipTrigger,
  type RichTooltipContentProps,
} from './RichTooltip.tsx'
import { HIDE_DELAY_MS, LONG_PRESS_MS, SHOW_DELAY_MS, TOUCH_DURATION_MS } from './tooltip-behavior.ts'
import { Button } from '../../molecules/Button/Button.tsx'
import { IconButton } from '../../molecules/IconButton/IconButton.tsx'
import { FilterChip } from '../../molecules/Chip/FilterChip.tsx'
import { ChipGroup } from '../../molecules/Chip/ChipGroup.tsx'
import { Interactive } from '../../atoms/Interactive/Interactive.tsx'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../Menu/Menu.tsx'
import { Dialog, DialogContent, DialogHeadline } from '../Dialog/Dialog.tsx'
import { DeleteIcon, EditIcon, InfoIcon, ShareIcon } from '../../icons/icons.tsx'
import { render, roleColor, style, withMotion } from '../../test/render.tsx'
import { CANCEL_WAYS, cancelExit, entered, withTransitions } from '../../test/exit.ts'

const q = <T extends Element = HTMLElement>(c: ParentNode, sel: string) => {
  const el = c.querySelector(sel)
  if (!el) throw new Error(`no se encontró ${sel}`)
  return el as T
}
const plain = (c: ParentNode) => q(c, '.mk-plain-tooltip')
const rich = (c: ParentNode) => q(c, '.mk-rich-tooltip')
const button = (c: ParentNode, name: string) => q<HTMLButtonElement>(c, `button[aria-label="${name}"]`)
/** Visible: abierto y sin la salida en curso (sin transiciones en las pruebas, se oculta enseguida). */
const shown = (el: Element) => el.matches(':popover-open') && !el.hasAttribute('data-closing')
const rect = (el: Element) => el.getBoundingClientRect()

/** Relojes falsos solo para los temporizadores del tooltip; la comunicación con Playwright sigue real. */
const fakeTimers = () => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)))
/** Avanza el reloj falso y deja que React pinte lo que cambió. */
async function advance(ms: number) {
  vi.advanceTimersByTime(ms)
  await frame()
}
/**
 * Espera a que `check()` dé `expected`, cuadro a cuadro (hasta unos 2 s). No es expect.poll: con
 * relojes falsos, expect.poll los avanza en cada intento y cambiaría las demoras que se prueban.
 */
async function until(check: () => boolean, expected: boolean) {
  for (let i = 0; i < 120 && check() !== expected; i++) await frame()
  expect(check()).toBe(expected)
}
afterEach(() => {
  vi.useRealTimers()
})
/**
 * Entrada y salida del mouse sin Playwright, para medir las demoras con exactitud: con relojes
 * falsos, las acciones de userEvent también los avanzan (comprobado: tras un hover, la demora de
 * 500 ms se cumplía con 499 ms de avance), así que una demora medida a través de ellas sale más
 * corta. Los tooltips escuchan estos mismos eventos; los casos con el puntero real están en las
 * otras pruebas, donde ese avance de más no cambia lo que se comprueba.
 */
const mouse = (el: Element, type: 'pointerenter' | 'pointerleave') =>
  el.dispatchEvent(new PointerEvent(type, { pointerType: 'mouse' }))
/** Lleva el puntero a una esquina, lejos de todo disparador (unhover lo deja en el centro del body). */
async function pointerAway() {
  const spot = document.createElement('div')
  spot.style.cssText = 'position: fixed; right: 0; bottom: 0; width: 4px; height: 4px;'
  document.body.append(spot)
  await userEvent.hover(spot)
  spot.remove()
}

/** Tres IconButton con tooltip (sin `text`: muestran su nombre), con un botón antes y después. */
function Toolbar({ children }: { children?: ReactNode }) {
  return (
    <div style={{ padding: 80, display: 'flex', gap: 4 }}>
      <button id="before">Antes</button>
      <Tooltip><IconButton label="Editar"><EditIcon /></IconButton></Tooltip>
      <Tooltip><IconButton label="Compartir"><ShareIcon /></IconButton></Tooltip>
      <Tooltip><IconButton label="Eliminar"><DeleteIcon /></IconButton></Tooltip>
      <button id="after">Después</button>
      {children}
    </div>
  )
}
const tipOf = (c: ParentNode, name: string) => {
  const b = button(c, name)
  const tip = b.nextElementSibling
  if (!tip?.matches('.mk-tooltip')) throw new Error(`el tooltip de ${name} no está junto al botón`)
  return tip as HTMLElement
}

describe('Tooltip: estructura y nombre accesible', () => {
  test('sin `text`: muestra el nombre del disparador, oculto para la accesibilidad y sin vínculo', async () => {
    const c = await render(<Toolbar />)
    const b = button(c, 'Editar')
    const tip = tipOf(c, 'Editar')
    expect(tip.getAttribute('role')).toBe('tooltip')
    expect(tip.getAttribute('popover')).toBe('manual')
    expect(tip.textContent).toBe('Editar')
    expect(tip.getAttribute('aria-hidden')).toBe('true')
    expect(b.hasAttribute('aria-describedby')).toBe(false)
    expect(b.hasAttribute('aria-labelledby')).toBe(false)
    // El nombre sigue siendo el del IconButton, una sola vez.
    expect(b.getAttribute('aria-label')).toBe('Editar')
    expect(shown(tip)).toBe(false)
  })

  test('con `text`: es la descripción del disparador (aria-describedby), sumada a la propia', async () => {
    const c = await render(
      <>
        <span id="extra">Atajo: Ctrl+S</span>
        <Tooltip text="Se guarda también en la nube">
          <Button aria-describedby="extra">Guardar</Button>
        </Tooltip>
      </>,
    )
    const b = q(c, '.mk-button')
    const tip = plain(c)
    expect(tip.hasAttribute('aria-hidden')).toBe(false)
    expect(tip.textContent).toBe('Se guarda también en la nube')
    expect(b.getAttribute('aria-describedby')).toBe(`extra ${tip.id}`)
    expect(b.textContent).toBe('Guardar')
  })

  test('toma el nombre de `label`, de `aria-label` o del texto del hijo', async () => {
    const c = await render(
      <>
        <Tooltip><button aria-label="Con aria-label" className="a">x</button></Tooltip>
        <Tooltip><button className="b"><EditIcon />Texto propio</button></Tooltip>
        <Tooltip><Interactive className="d" aria-label="Interactive propio">i</Interactive></Tooltip>
      </>,
    )
    expect(q(c, '.a').nextElementSibling?.textContent).toBe('Con aria-label')
    expect(q(c, '.b').nextElementSibling?.textContent).toBe('Texto propio')
    expect(q(c, '.d').nextElementSibling?.textContent).toBe('Interactive propio')
  })

  test('sin `text` y sin nombre que mostrar, lo explica con un error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      render(
        <Tooltip>
          <button><EditIcon /></button>
        </Tooltip>,
      ),
    ).rejects.toThrow(/Tooltip sin `text`/)
    spy.mockRestore()
  })

  test('no agrega elementos alrededor del disparador: el tooltip queda a continuación', async () => {
    const c = await render(<div className="box"><Tooltip><IconButton label="Editar"><EditIcon /></IconButton></Tooltip></div>)
    const box = q(c, '.box')
    expect([...box.children].map((e) => e.className.split(' ')[0])).toEqual(['mk-icon-button', 'mk-tooltip'])
  })
})

describe('Tooltip: puntero', () => {
  beforeEach(fakeTimers)

  test(`aparece ${SHOW_DELAY_MS} ms después de entrar, no antes`, async () => {
    const c = await render(<Toolbar />)
    mouse(button(c, 'Editar'), 'pointerenter')
    await advance(SHOW_DELAY_MS - 1)
    expect(shown(tipOf(c, 'Editar'))).toBe(false)
    await advance(1)
    await until(() => shown(tipOf(c, 'Editar')), true)
  })

  test('con el puntero real: aparece tras la demora', async () => {
    const c = await render(<Toolbar />)
    await userEvent.hover(button(c, 'Editar'))
    await advance(SHOW_DELAY_MS)
    await until(() => shown(tipOf(c, 'Editar')), true)
  })

  test('salir antes de la demora cancela la aparición', async () => {
    const c = await render(<Toolbar />)
    mouse(button(c, 'Editar'), 'pointerenter')
    await advance(SHOW_DELAY_MS - 100)
    mouse(button(c, 'Editar'), 'pointerleave')
    await advance(SHOW_DELAY_MS * 2)
    expect(shown(tipOf(c, 'Editar'))).toBe(false)
  })

  test(`al salir se oculta ${HIDE_DELAY_MS} ms después`, async () => {
    const c = await render(<Toolbar />)
    mouse(button(c, 'Editar'), 'pointerenter')
    await advance(SHOW_DELAY_MS)
    await until(() => shown(tipOf(c, 'Editar')), true)
    mouse(button(c, 'Editar'), 'pointerleave')
    await advance(HIDE_DELAY_MS - 1)
    expect(shown(tipOf(c, 'Editar'))).toBe(true)
    await advance(1)
    await until(() => shown(tipOf(c, 'Editar')), false)
  })

  test('volver al disparador durante la demora de salida lo mantiene, sin parpadeo', async () => {
    const c = await render(<Toolbar />)
    const b = button(c, 'Editar')
    mouse(b, 'pointerenter')
    await advance(SHOW_DELAY_MS)
    mouse(b, 'pointerleave')
    await advance(HIDE_DELAY_MS - 100)
    mouse(b, 'pointerenter')
    await advance(HIDE_DELAY_MS * 3)
    expect(shown(tipOf(c, 'Editar'))).toBe(true)
    expect(tipOf(c, 'Editar').hasAttribute('data-closing')).toBe(false)
  })

  test('el puntero puede pasar sobre el tooltip sin que desaparezca (WCAG 1.4.13)', async () => {
    const c = await render(<Toolbar />)
    await userEvent.hover(button(c, 'Editar'))
    await advance(SHOW_DELAY_MS)
    const tip = tipOf(c, 'Editar')
    await until(() => shown(tip), true)
    await userEvent.hover(tip)
    await advance(HIDE_DELAY_MS * 5)
    expect(shown(tip)).toBe(true)
    // Al salir también del tooltip, se va.
    await userEvent.hover(q(c, '#after'))
    await advance(HIDE_DELAY_MS)
    await until(() => shown(tip), false)
  })

  test('uno solo a la vez, y el vecino aparece al instante si ya había uno visible', async () => {
    const c = await render(<Toolbar />)
    mouse(button(c, 'Editar'), 'pointerenter')
    await advance(SHOW_DELAY_MS)
    await until(() => shown(tipOf(c, 'Editar')), true)
    mouse(button(c, 'Editar'), 'pointerleave')
    mouse(button(c, 'Compartir'), 'pointerenter')
    await advance(0)
    expect(shown(tipOf(c, 'Compartir'))).toBe(true)
    expect(shown(tipOf(c, 'Editar'))).toBe(false)
    expect(c.querySelectorAll('.mk-tooltip:popover-open:not([data-closing])')).toHaveLength(1)
    // Con el puntero real, pasando al tercero.
    await userEvent.hover(button(c, 'Eliminar'))
    await advance(0)
    await until(() => shown(tipOf(c, 'Eliminar')), true)
    expect(c.querySelectorAll('.mk-tooltip:popover-open:not([data-closing])')).toHaveLength(1)
  })

  test('sin uno visible, el vecino espera la demora', async () => {
    const c = await render(<Toolbar />)
    mouse(button(c, 'Editar'), 'pointerenter')
    await advance(SHOW_DELAY_MS)
    mouse(button(c, 'Editar'), 'pointerleave')
    await advance(HIDE_DELAY_MS)
    await until(() => shown(tipOf(c, 'Editar')), false)
    mouse(button(c, 'Compartir'), 'pointerenter')
    await advance(SHOW_DELAY_MS - 1)
    expect(shown(tipOf(c, 'Compartir'))).toBe(false)
  })

  test('presionar el disparador lo oculta, y no vuelve hasta salir y entrar', async () => {
    const c = await render(<Toolbar />)
    await userEvent.hover(button(c, 'Editar'))
    await advance(SHOW_DELAY_MS)
    await until(() => shown(tipOf(c, 'Editar')), true)
    await userEvent.click(button(c, 'Editar'))
    await until(() => shown(tipOf(c, 'Editar')), false)
    await advance(SHOW_DELAY_MS * 3)
    expect(shown(tipOf(c, 'Editar'))).toBe(false)
    await userEvent.hover(q(c, '#before'))
    await userEvent.hover(button(c, 'Editar'))
    await advance(SHOW_DELAY_MS + HIDE_DELAY_MS)
    await until(() => shown(tipOf(c, 'Editar')), true)
  })

  test('Escape lo oculta sin mover el foco ni el puntero, y no vuelve con el puntero quieto', async () => {
    const c = await render(<Toolbar />)
    q(c, '#after').focus()
    await userEvent.hover(button(c, 'Editar'))
    await advance(SHOW_DELAY_MS)
    await until(() => shown(tipOf(c, 'Editar')), true)
    await userEvent.keyboard('{Escape}')
    await until(() => shown(tipOf(c, 'Editar')), false)
    expect(document.activeElement?.id).toBe('after')
    await advance(SHOW_DELAY_MS * 3)
    expect(shown(tipOf(c, 'Editar'))).toBe(false)
  })

  test('Escape dentro de un Dialog cierra solo el tooltip', async () => {
    const onClose = vi.fn()
    const c = await render(
      <Dialog open onClose={onClose}>
        <DialogHeadline>Ajustes</DialogHeadline>
        <DialogContent>
          <Tooltip><IconButton label="Editar"><EditIcon /></IconButton></Tooltip>
        </DialogContent>
      </Dialog>,
    )
    await userEvent.hover(button(document, 'Editar'))
    await advance(SHOW_DELAY_MS)
    await until(() => shown(tipOf(c, 'Editar')), true)
    await userEvent.keyboard('{Escape}')
    await until(() => shown(tipOf(c, 'Editar')), false)
    expect(onClose).not.toHaveBeenCalled()
    expect(q<HTMLDialogElement>(c, 'dialog').open).toBe(true)
  })
})

describe('Tooltip: teclado', () => {
  beforeEach(fakeTimers)

  test('aparece enseguida con el foco de teclado, persiste mientras dure y se va al salir', async () => {
    const c = await render(<Toolbar />)
    q(c, '#before').focus()
    await userEvent.tab()
    expect(document.activeElement).toBe(button(c, 'Editar'))
    await advance(0)
    await until(() => shown(tipOf(c, 'Editar')), true)
    // Compose lo cierra a los 1500 ms; acá queda mientras dure el foco (WCAG 1.4.13).
    await advance(TOUCH_DURATION_MS * 4)
    expect(shown(tipOf(c, 'Editar'))).toBe(true)
    await userEvent.tab()
    await advance(0)
    await until(() => shown(tipOf(c, 'Compartir')), true)
    expect(shown(tipOf(c, 'Editar'))).toBe(false)
    q(c, '#after').focus()
    await until(() => shown(tipOf(c, 'Compartir')), false)
  })

  test('Escape lo oculta y el foco se queda en el disparador', async () => {
    const c = await render(<Toolbar />)
    q(c, '#before').focus()
    await userEvent.tab()
    await advance(0)
    await until(() => shown(tipOf(c, 'Editar')), true)
    await userEvent.keyboard('{Escape}')
    await until(() => shown(tipOf(c, 'Editar')), false)
    expect(document.activeElement).toBe(button(c, 'Editar'))
  })

  test('el clic (que en Chrome y Firefox también enfoca) no lo muestra', async () => {
    const c = await render(<Toolbar />)
    await userEvent.click(button(c, 'Editar'))
    await advance(SHOW_DELAY_MS * 2)
    expect(shown(tipOf(c, 'Editar'))).toBe(false)
  })
})

describe('Tooltip: táctil', () => {
  beforeEach(fakeTimers)

  const touch = (el: Element, type: string) =>
    el.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', bubbles: true, cancelable: true }))

  test(`pulsación larga de ${LONG_PRESS_MS} ms: aparece, soltar no activa el botón y se va a los ${TOUCH_DURATION_MS} ms`, async () => {
    const onClick = vi.fn()
    const c = await render(<div style={{ padding: 80 }}><Tooltip><IconButton label="Editar" onClick={onClick}><EditIcon /></IconButton></Tooltip></div>)
    const b = button(c, 'Editar')
    touch(b, 'pointerenter')
    touch(b, 'pointerdown')
    await advance(LONG_PRESS_MS - 1)
    expect(shown(plain(c))).toBe(false)
    await advance(1)
    await until(() => shown(plain(c)), true)
    const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    b.dispatchEvent(menu)
    expect(menu.defaultPrevented).toBe(true)
    touch(b, 'pointerup')
    b.click()
    expect(onClick).not.toHaveBeenCalled()
    await advance(TOUCH_DURATION_MS - 1)
    expect(shown(plain(c))).toBe(true)
    await advance(1)
    await until(() => shown(plain(c)), false)
    // El clic siguiente sí llega.
    b.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test('un toque común no lo muestra y activa el botón', async () => {
    const onClick = vi.fn()
    const c = await render(<Tooltip><IconButton label="Editar" onClick={onClick}><EditIcon /></IconButton></Tooltip>)
    const b = button(c, 'Editar')
    touch(b, 'pointerenter')
    touch(b, 'pointerdown')
    await advance(150)
    touch(b, 'pointerup')
    b.click()
    await advance(SHOW_DELAY_MS * 2)
    expect(shown(plain(c))).toBe(false)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('Tooltip: posición junto al disparador', () => {
  const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(1)

  function Placed({ at, text }: { at: CSSProperties; text?: string }) {
    return (
      <div style={{ position: 'fixed', ...at }}>
        <Tooltip defaultOpen text={text}><IconButton label="Editar"><EditIcon /></IconButton></Tooltip>
      </div>
    )
  }

  test('arriba, centrado y a 4 px del disparador (GapTrigger de Compose)', async () => {
    const c = await render(<Placed at={{ top: 200, left: 150 }} />)
    const t = rect(button(c, 'Editar'))
    const p = rect(plain(c))
    expect(t.top - p.bottom).toBeCloseTo(4, 0)
    near((p.left + p.right) / 2, (t.left + t.right) / 2)
    expect(plain(c).dataset['side']).toBe('top')
  })

  test('cerca del borde superior baja: queda debajo, a 4 px', async () => {
    const c = await render(<Placed at={{ top: 4, left: 150 }} />)
    const t = rect(button(c, 'Editar'))
    const p = rect(plain(c))
    expect(p.top - t.bottom).toBeCloseTo(4, 0)
    expect(plain(c).dataset['side']).toBe('bottom')
  })

  test('en los bordes izquierdo y derecho se corre para quedar dentro de la ventana', async () => {
    const long = 'Un texto bastante más largo que el botón, en dos líneas'
    let c = await render(<Placed at={{ top: 200, left: 0 }} text={long} />)
    expect(rect(plain(c)).left).toBeGreaterThanOrEqual(-0.5)
    expect(rect(plain(c)).width).toBeGreaterThan(rect(button(c, 'Editar')).width * 2)
    c = await render(<Placed at={{ top: 200, right: 0 }} text={long} />)
    expect(rect(plain(c)).right).toBeLessThanOrEqual(document.documentElement.clientWidth + 0.5)
  })

  test('durante la escala de entrada, en los bordes, conserva el anchor positioning del navegador', async () => {
    // La comprobación del centrado (anchor-position.ts) mide sin la escala 0,8: con la caja escalada,
    // en un borde el navegador y el cálculo difieren y pasaría a la posición calculada sin motivo.
    const restore = document.getElementById('mk-test-no-motion') as HTMLStyleElement
    restore.media = 'not all'
    try {
      const c = await render(<Placed at={{ top: 200, left: 0 }} text="Un texto bastante más largo que el botón" />)
      expect(plain(c).hasAttribute('data-manual-position')).toBe(false)
    } finally {
      restore.media = ''
    }
  })

  test('en RTL también queda arriba y centrado, con el texto alineado al inicio', async () => {
    const c = await render(
      <div dir="rtl">
        <Placed at={{ top: 200, right: 150 }} text="Un texto largo que corta en varias líneas en RTL" />
      </div>,
    )
    const t = rect(button(c, 'Editar'))
    const p = rect(plain(c))
    near((p.left + p.right) / 2, (t.left + t.right) / 2)
    expect(t.top - p.bottom).toBeCloseTo(4, 0)
    expect(style(plain(c)).direction).toBe('rtl')
    expect(style(plain(c)).textAlign).toBe('start')
  })
})

describe('Tooltip: medidas y colores del kit', () => {
  test('plain: relleno 4/8, radio 4, Inverse Surface, Body Small, 24 de alto y hasta 200 de ancho', async () => {
    const c = await render(
      <div style={{ padding: 80 }}>
        <Tooltip defaultOpen><IconButton label="Editar"><EditIcon /></IconButton></Tooltip>
      </div>,
    )
    const s = style(plain(c))
    expect([s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft]).toEqual(['4px', '8px', '4px', '8px'])
    expect(s.borderTopLeftRadius).toBe('4px')
    expect(s.backgroundColor).toBe(roleColor('inverse-surface'))
    expect(s.color).toBe(roleColor('inverse-on-surface'))
    expect(s.fontSize).toBe('12px')
    expect(s.lineHeight).toBe('16px')
    expect(s.boxShadow).toBe('none')
    expect(rect(plain(c)).height).toBeCloseTo(24, 2)
    expect(s.minWidth).toBe('40px')
    expect(s.maxWidth).toBe('200px')
  })

  test('plain multilínea: corta línea a los 200 px', async () => {
    const c = await render(
      <div style={{ padding: 120 }}>
        <Tooltip defaultOpen text="Un texto bastante largo que no entra en una línea de doscientos píxeles">
          <IconButton label="Editar"><EditIcon /></IconButton>
        </Tooltip>
      </div>,
    )
    expect(rect(plain(c)).width).toBeCloseTo(200, 2)
    expect(rect(plain(c)).height).toBeGreaterThan(24)
  })
})

describe('Tooltip: movimiento', () => {
  afterEach(() => commands.reduceMotion(false))

  const easing = (name: string) => {
    const probe = document.createElement('span')
    probe.style.transitionTimingFunction = `var(--md-sys-motion-spring-${name}-easing)`
    document.body.append(probe)
    const value = withMotion(() => getComputedStyle(probe).transitionTimingFunction)
    probe.remove()
    return value
  }

  test('entrada y salida con los resortes rápidos (Compose: FastEffects y FastSpatial), escala desde 0,8 y el centro', async () => {
    const c = await render(<div style={{ padding: 80 }}><Tooltip defaultOpen><IconButton label="Editar"><EditIcon /></IconButton></Tooltip></div>)
    const t = plain(c)
    const s = withMotion(() => {
      const st = style(t)
      return [st.transitionProperty, st.transitionDuration, st.transitionTimingFunction.split(/, (?=linear)/)]
    })
    expect(s).toEqual(['opacity, scale', '0.15s, 0.36s', [easing('fast-effects'), easing('fast-spatial')]])
    t.setAttribute('data-closing', '')
    expect(style(t).scale).toBe('0.8')
    expect(style(t).opacity).toBe('0')
    expect(style(t).pointerEvents).toBe('none')
    t.removeAttribute('data-closing')
  })

  test('la salida espera a la transición antes de ocultar el popover', async () => {
    const c = await render(<Toolbar />)
    q(c, '#before').focus()
    await userEvent.tab()
    const tip = tipOf(c, 'Editar')
    await until(() => shown(tip), true)
    const restore = document.getElementById('mk-test-no-motion') as HTMLStyleElement
    restore.media = 'not all'
    try {
      await userEvent.keyboard('{Escape}')
      expect(tip.hasAttribute('data-closing')).toBe(true)
      expect(tip.matches(':popover-open')).toBe(true)
      await until(() => tip.matches(':popover-open'), false)
      expect(tip.hasAttribute('data-closing')).toBe(false)
    } finally {
      restore.media = ''
    }
  })

  test('con movimiento reducido no hay cambio de escala, solo fundido', async () => {
    await commands.reduceMotion(true)
    const c = await render(<div style={{ padding: 80 }}><Tooltip defaultOpen><IconButton label="Editar"><EditIcon /></IconButton></Tooltip></div>)
    const t = plain(c)
    t.setAttribute('data-closing', '')
    expect(style(t).scale).toBe('1')
    expect(withMotion(() => style(t).transitionDuration)).toBe('0.15s, 0s')
    t.removeAttribute('data-closing')
  })
})

describe('Tooltip: props, ref y otros disparadores', () => {
  test('las props nativas, el estilo y la ref llegan al disparador, combinadas con las del hijo', async () => {
    const ref = createRef<HTMLElement>()
    const own = createRef<HTMLButtonElement>()
    const onClick = vi.fn()
    const onOwnClick = vi.fn()
    const c = await render(
      <Tooltip ref={ref} data-x="y" onClick={onClick} style={{ marginInlineStart: 12 }}>
        <IconButton ref={own} label="Editar" onClick={onOwnClick} style={{ marginBlockStart: 4 }}><EditIcon /></IconButton>
      </Tooltip>,
    )
    const b = button(c, 'Editar')
    expect(ref.current).toBe(b)
    expect(own.current).toBe(b)
    expect(b.dataset['x']).toBe('y')
    expect(b.style.marginInlineStart).toBe('12px')
    expect(b.style.marginBlockStart).toBe('4px')
    expect(b.style.getPropertyValue('anchor-name')).toMatch(/^--mk-tooltip-/)
    await userEvent.click(b)
    expect(onOwnClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test('dentro de un MenuTrigger: el menú abre con su clic, conserva el onClick del botón y los dos se ubican en el mismo ancla', async () => {
    const onClick = vi.fn()
    const c = await render(
      <div style={{ padding: 80 }}>
        <Menu>
          <MenuTrigger>
            <Tooltip><IconButton label="Más opciones" onClick={onClick}><EditIcon /></IconButton></Tooltip>
          </MenuTrigger>
          <MenuContent><MenuItem>Uno</MenuItem></MenuContent>
        </Menu>
      </div>,
    )
    const b = button(c, 'Más opciones')
    expect(b.getAttribute('aria-haspopup')).toBe('menu')
    expect(b.style.getPropertyValue('anchor-name').split(',').map((s) => s.trim())).toHaveLength(2)
    await userEvent.click(b)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(q(c, '.mk-menu').matches(':popover-open')).toBe(true)
    expect(shown(plain(c))).toBe(false)
    // El menú sigue ubicado junto al botón aunque el botón tenga dos anclas.
    expect(Math.abs(rect(q(c, '.mk-menu')).top - rect(b).bottom)).toBeLessThanOrEqual(1)
  })

  test('chip con texto recortado: muestra el texto completo y el chip conserva su nombre', async () => {
    const label = 'Ofertas de la semana en electrodomésticos de cocina'
    const c = await render(
      <div style={{ maxInlineSize: 160, padding: 80 }}>
        <ChipGroup aria-label="Promociones">
          <Tooltip defaultOpen><FilterChip>{label}</FilterChip></Tooltip>
        </ChipGroup>
      </div>,
    )
    const chip = q(c, '.mk-chip')
    const chipLabel = q(chip, '.mk-chip-label')
    expect(chipLabel.scrollWidth).toBeGreaterThan(chipLabel.clientWidth)
    expect(plain(c).textContent).toBe(label)
    expect(chip.textContent).toBe(label)
    expect(chip.hasAttribute('aria-describedby')).toBe(false)
  })

  test('controlado: `open` lo muestra y oculta; onOpenChange avisa el pedido', async () => {
    fakeTimers()
    const onOpenChange = vi.fn()
    const c = await render(<div style={{ padding: 80 }}><Tooltip open={false} onOpenChange={onOpenChange}><IconButton label="Editar"><EditIcon /></IconButton></Tooltip></div>)
    await userEvent.hover(button(c, 'Editar'))
    await advance(SHOW_DELAY_MS)
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(shown(plain(c))).toBe(false)
    await render(<div style={{ padding: 80 }}><Tooltip open><IconButton label="Editar"><EditIcon /></IconButton></Tooltip></div>)
    expect(shown(plain(document))).toBe(true)
  })
})

describe('RichTooltip sin acciones (tooltip)', () => {
  beforeEach(fakeTimers)

  function Info() {
    return (
      <div style={{ padding: 200 }}>
        <RichTooltip>
          <RichTooltipTrigger><IconButton label="Qué son las copias"><InfoIcon /></IconButton></RichTooltipTrigger>
          <RichTooltipContent>
            <RichTooltipSubhead>Copias automáticas</RichTooltipSubhead>
            <RichTooltipSupporting>Cada noche se guarda una copia de tus proyectos.</RichTooltipSupporting>
          </RichTooltipContent>
        </RichTooltip>
      </div>
    )
  }

  test('role tooltip, describe al disparador y aparece con el puntero tras la demora', async () => {
    const c = await render(<Info />)
    const b = button(c, 'Qué son las copias')
    const tip = rich(c)
    expect(tip.getAttribute('role')).toBe('tooltip')
    expect(b.getAttribute('aria-describedby')).toBe(tip.id)
    expect(b.hasAttribute('aria-haspopup')).toBe(false)
    mouse(b, 'pointerenter')
    await advance(SHOW_DELAY_MS - 1)
    expect(shown(tip)).toBe(false)
    await advance(1)
    await until(() => shown(tip), true)
    await userEvent.hover(b)
    await userEvent.hover(tip)
    await advance(HIDE_DELAY_MS * 3)
    expect(shown(tip)).toBe(true)
  })

  test('medidas y colores: radio 12, Surface Container, elevación 2, Title Small y Body Medium en On Surface Variant, relleno 12/16/16', async () => {
    vi.useRealTimers()
    const c = await render(
      <div style={{ padding: 200 }}>
        <RichTooltip defaultOpen>
          <RichTooltipTrigger><IconButton label="Info"><InfoIcon /></IconButton></RichTooltipTrigger>
          <RichTooltipContent>
            <RichTooltipSubhead>Copias automáticas</RichTooltipSubhead>
            <RichTooltipSupporting>Cada noche se guarda una copia de tus proyectos, que se conservan treinta días.</RichTooltipSupporting>
          </RichTooltipContent>
        </RichTooltip>
      </div>,
    )
    const s = style(rich(c))
    expect(s.borderTopLeftRadius).toBe('12px')
    expect(s.backgroundColor).toBe(roleColor('surface-container'))
    const probe = document.createElement('span')
    probe.style.boxShadow = 'var(--md-sys-elevation-level2)'
    document.body.append(probe)
    expect(s.boxShadow).toBe(getComputedStyle(probe).boxShadow)
    probe.remove()
    expect([s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft]).toEqual(['12px', '16px', '16px', '16px'])
    expect(rect(rich(c)).width).toBeCloseTo(312, 2)
    const sub = style(q(c, '.mk-rich-tooltip-subhead'))
    const sup = style(q(c, '.mk-rich-tooltip-supporting'))
    expect([sub.fontSize, sub.lineHeight, sub.fontWeight, sub.color]).toEqual(['14px', '20px', '500', roleColor('on-surface-variant')])
    expect([sup.fontSize, sup.lineHeight, sup.fontWeight, sup.color]).toEqual(['14px', '20px', '400', roleColor('on-surface-variant')])
    expect(rect(q(c, '.mk-rich-tooltip-supporting')).top - rect(q(c, '.mk-rich-tooltip-subhead')).bottom).toBeCloseTo(4, 2)
  })
})

describe('RichTooltip con acciones (diálogo no modal)', () => {
  function WithActions({ content }: { content?: Omit<RichTooltipContentProps, 'children'> }) {
    return (
      <div style={{ padding: 200 }}>
        <button id="before">Antes</button>
        <RichTooltip>
          <RichTooltipTrigger><IconButton label="Ajustes de copias"><InfoIcon /></IconButton></RichTooltipTrigger>
          <RichTooltipContent {...content}>
            <RichTooltipSubhead>Copias automáticas</RichTooltipSubhead>
            <RichTooltipSupporting>Podés cambiar la hora o desactivarlas.</RichTooltipSupporting>
            <RichTooltipActions>
              <Button variant="text">Configurar</Button>
              <Button variant="text">Más información</Button>
            </RichTooltipActions>
          </RichTooltipContent>
        </RichTooltip>
        <button id="after">Después</button>
      </div>
    )
  }
  const trigger = (c: ParentNode) => button(c, 'Ajustes de copias')
  const action = (c: ParentNode, text: string) =>
    [...rich(c).querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === text) as HTMLButtonElement

  test('role dialog con el subtítulo como nombre y el texto como descripción; el disparador lo anuncia', async () => {
    const c = await render(<WithActions />)
    const d = rich(c)
    expect(d.getAttribute('role')).toBe('dialog')
    expect(d.hasAttribute('aria-modal')).toBe(false)
    expect(d.getAttribute('aria-labelledby')).toBe(q(c, '.mk-rich-tooltip-subhead').id)
    expect(d.getAttribute('aria-describedby')).toBe(q(c, '.mk-rich-tooltip-supporting').id)
    const t = trigger(c)
    expect(t.getAttribute('aria-haspopup')).toBe('dialog')
    expect(t.getAttribute('aria-expanded')).toBe('false')
    expect(t.getAttribute('aria-controls')).toBe(d.id)
    expect(t.hasAttribute('aria-describedby')).toBe(false)
  })

  test('el puntero no lo abre; el clic lo abre y lo cierra', async () => {
    fakeTimers()
    const c = await render(<WithActions />)
    await userEvent.hover(trigger(c))
    await advance(SHOW_DELAY_MS * 3)
    expect(shown(rich(c))).toBe(false)
    vi.useRealTimers()
    await userEvent.click(trigger(c))
    expect(shown(rich(c))).toBe(true)
    expect(trigger(c).getAttribute('aria-expanded')).toBe('true')
    await userEvent.click(trigger(c))
    await until(() => shown(rich(c)), false)
  })

  test('Tab desde el disparador recorre las acciones y sigue después; Mayús+Tab vuelve al disparador', async () => {
    const c = await render(<WithActions />)
    q(c, '#before').focus()
    await userEvent.tab()
    expect(document.activeElement).toBe(trigger(c))
    await userEvent.keyboard('{Enter}')
    await until(() => shown(rich(c)), true)
    expect(document.activeElement).toBe(trigger(c))
    await userEvent.tab()
    expect(document.activeElement).toBe(action(c, 'Configurar'))
    await userEvent.tab({ shift: true })
    expect(document.activeElement).toBe(trigger(c))
    await userEvent.tab()
    await userEvent.tab()
    expect(document.activeElement).toBe(action(c, 'Más información'))
    await userEvent.tab()
    expect(document.activeElement?.id).toBe('after')
    await until(() => shown(rich(c)), false)
  })

  test('Escape lo cierra y devuelve el foco al disparador', async () => {
    const c = await render(<WithActions />)
    q(c, '#before').focus()
    await userEvent.tab()
    await userEvent.keyboard('{Enter}')
    await userEvent.tab()
    expect(document.activeElement).toBe(action(c, 'Configurar'))
    await userEvent.keyboard('{Escape}')
    await until(() => shown(rich(c)), false)
    expect(document.activeElement).toBe(trigger(c))
  })

  test('un clic afuera lo cierra sin mover el foco; un clic adentro no', async () => {
    const c = await render(<WithActions />)
    await userEvent.click(trigger(c))
    await userEvent.click(q(c, '.mk-rich-tooltip-supporting'))
    expect(shown(rich(c))).toBe(true)
    q(c, '#after').focus()
    await until(() => shown(rich(c)), false)
    await userEvent.click(trigger(c))
    const outside = document.createElement('button')
    outside.textContent = 'Afuera'
    outside.style.cssText = 'position: fixed; left: 0; bottom: 0;'
    c.append(outside)
    await userEvent.click(outside)
    await until(() => shown(rich(c)), false)
    // El foco queda donde lo dejó el clic (en WebKit de macOS, el clic no enfoca botones), no vuelve al disparador.
    expect(document.activeElement).not.toBe(trigger(c))
  })

  test('acciones: fila con separación 8, a 4 del borde y 8 abajo; botones de texto de 40 en Primary', async () => {
    const c = await render(<WithActions />)
    await userEvent.click(trigger(c))
    const d = rect(rich(c))
    const first = rect(action(c, 'Configurar'))
    const second = rect(action(c, 'Más información'))
    expect(first.left - d.left).toBeCloseTo(4, 2)
    expect(second.left - first.right).toBeCloseTo(8, 2)
    expect(d.bottom - first.bottom).toBeCloseTo(8, 2)
    expect(first.height).toBeCloseTo(40, 2)
    expect(first.top - rect(q(c, '.mk-rich-tooltip-supporting')).bottom).toBeCloseTo(12, 2)
    expect(style(action(c, 'Configurar')).color).toBe(roleColor('primary'))
  })

  test('abrirlo cierra el tooltip pasajero visible; un tooltip pasajero no lo cierra', async () => {
    const c = await render(
      <>
        <WithActions />
        <div style={{ padding: 80 }}><Tooltip><IconButton label="Editar"><EditIcon /></IconButton></Tooltip></div>
      </>,
    )
    q(c, '#after').focus()
    await userEvent.tab()
    await until(() => shown(plain(c)), true)
    await userEvent.click(trigger(c))
    expect(shown(rich(c))).toBe(true)
    await until(() => shown(plain(c)), false)
    fakeTimers()
    await userEvent.hover(button(c, 'Editar'))
    await advance(SHOW_DELAY_MS)
    await until(() => shown(plain(c)), true)
    expect(shown(rich(c))).toBe(true)
  })

  test('RichTooltipContent: ref, className, style y atributos llegan al contenedor', async () => {
    const ref = createRef<HTMLDivElement>()
    const c = await render(<WithActions content={{ ref, className: 'extra', style: { minWidth: 200 }, 'data-x': 'y' } as RichTooltipContentProps} />)
    const d = rich(c)
    expect(ref.current).toBe(d)
    expect(d.className).toBe('mk-tooltip mk-rich-tooltip extra')
    expect(d.dataset['x']).toBe('y')
    expect(d.style.minWidth).toBe('200px')
  })
})

// Salida cancelada (2026-11-26): antes se esperaba Promise.all de las transiciones e ignoraba el
// rechazo; con una transición cancelada, el tooltip quedaba abierto con data-closing. Ahora espera
// src/internal/settle-animations.ts.
describe('salida cancelada', () => {
  let setOpen: (open: boolean) => void = () => {}
  function Controlled() {
    const [open, set] = useState(true)
    setOpen = set
    return <Tooltip open={open} onOpenChange={set} text="Se guarda en la nube"><Button>Guardar</Button></Tooltip>
  }
  for (const how of CANCEL_WAYS) {
    test(`(${how}) se oculta igual`, async () => {
      const c = await render(<Controlled />)
      const el = plain(c)
      await withTransitions(async () => {
        await expect.poll(() => el.matches(':popover-open')).toBe(true)
        await entered(el)
        setOpen(false)
        await cancelExit(el, how)
        await expect.poll(() => el.matches(':popover-open'), { timeout: 3000 }).toBe(false)
        expect(el.hasAttribute('data-closing')).toBe(false)
      })
    })
  }
})
