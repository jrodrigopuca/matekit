import { createRef, type CSSProperties, type ReactNode } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'
import { Snackbar, SnackbarAction, SnackbarClose, SnackbarMessage } from './Snackbar.tsx'
import { SnackbarHost, useSnackbar, type SnackbarHostProps } from './SnackbarHost.tsx'
import { createSnackbarQueue, SNACKBAR_DURATION_MS, type SnackbarResult } from './snackbar-queue.ts'
import { Dialog, DialogContent, DialogHeadline } from '../Dialog/Dialog.tsx'
import { render, roleColor, style, withMotion } from '../../test/render.tsx'

const q = <T extends Element = HTMLElement>(c: ParentNode, sel: string) => {
  const el = c.querySelector(sel)
  if (!el) throw new Error(`no se encontró ${sel}`)
  return el as T
}
const rect = (el: Element) => el.getBoundingClientRect()
const button = (c: ParentNode, name: string) => {
  const found = [...c.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === name)
  if (!found) throw new Error(`no se encontró el botón ${name}`)
  return found
}
/** Visible: abierto y sin la salida en curso (sin transiciones en las pruebas, se oculta enseguida). */
const shown = (el: Element) => el.matches(':popover-open') && !el.hasAttribute('data-closing')
const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)))
/**
 * Espera a que `check()` dé `expected`, cuadro a cuadro (hasta unos 2 s). No es expect.poll: con
 * relojes falsos, expect.poll los avanza en cada intento (CLAUDE.md) y cambiaría las duraciones.
 */
async function until<T>(check: () => T, expected: T) {
  for (let i = 0; i < 120 && check() !== expected; i++) await frame()
  expect(check()).toBe(expected)
}
/** Relojes falsos solo para el tiempo del snackbar (y Date, con el que guarda lo que falta). */
const fakeTimers = () => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
async function advance(ms: number) {
  vi.advanceTimersByTime(ms)
  await frame()
  await frame()
}
/** Una promesa que se puede mirar sin esperarla. */
function track(promise: Promise<SnackbarResult>) {
  const t: { result: SnackbarResult | undefined } = { result: undefined }
  void promise.then((r) => {
    t.result = r
  })
  return t
}

afterEach(async () => {
  vi.useRealTimers()
  await commands.reduceMotion(false)
})

async function setup(children?: ReactNode, props: Partial<SnackbarHostProps> = {}) {
  const queue = createSnackbarQueue()
  const c = await render(
    <SnackbarHost queue={queue} {...props}>
      {children ?? <button type="button">Antes</button>}
    </SnackbarHost>,
  )
  const el = q(c, '.mk-snackbar[popover]')
  const region = q(c, '[role="status"]')
  return { queue, c, el, region }
}

// --- La cola, sin React ---

describe('createSnackbarQueue', () => {
  test('uno a la vez, en orden de llegada; cada promesa da su motivo', async () => {
    const queue = createSnackbarQueue()
    const seen: Array<string | undefined> = []
    queue.subscribe(() => seen.push(queue.current?.message))
    const a = queue.show('A')
    const b = queue.show({ message: 'B', action: 'Deshacer' })
    const c = queue.show('C')
    expect(queue.current?.message).toBe('A')
    expect(queue.pending).toBe(2)
    queue.current?.close('timeout')
    expect(await a).toBe('timeout')
    expect(queue.current?.message).toBe('B')
    queue.current?.close('action')
    expect(await b).toBe('action')
    queue.dismiss()
    expect(await c).toBe('dismiss')
    expect(queue.current).toBeNull()
    expect(seen).toEqual(['A', 'B', 'C', undefined])
  })

  test('duración y cerrar por defecto: corta sin acción, indefinida con acción y cerrar si es indefinida', () => {
    const queue = createSnackbarQueue()
    void queue.show('Sin acción')
    expect(queue.current).toMatchObject({ duration: SNACKBAR_DURATION_MS.short, dismissible: false })
    queue.dismiss()
    void queue.show({ message: 'Con acción', action: 'Ver' })
    expect(queue.current).toMatchObject({ duration: Infinity, dismissible: true })
    queue.dismiss()
    void queue.show({ message: 'Larga', action: 'Ver', duration: 'long' })
    expect(queue.current).toMatchObject({ duration: 10000, dismissible: false })
    queue.dismiss()
    void queue.show({ message: 'En ms', duration: 2500, dismissible: true })
    expect(queue.current).toMatchObject({ duration: 2500, dismissible: true })
    queue.dismiss()
    expect(() => queue.show({ message: 'x', duration: 0 })).toThrow(/positiva/)
  })

  test('signal cancela en pantalla o en la cola; clear cancela todo; cerrar dos veces no hace nada', async () => {
    const queue = createSnackbarQueue()
    const first = new AbortController()
    const waiting = new AbortController()
    const a = queue.show({ message: 'A', signal: first.signal })
    const b = queue.show({ message: 'B', signal: waiting.signal })
    const c = queue.show('C')
    waiting.abort()
    expect(await b).toBe('cancel')
    expect(queue.pending).toBe(1)
    first.abort()
    expect(await a).toBe('cancel')
    expect(queue.current?.message).toBe('C')
    const entry = queue.current
    entry?.close('action')
    entry?.close('dismiss')
    expect(await c).toBe('action')
    const aborted = AbortSignal.abort()
    expect(await queue.show({ message: 'D', signal: aborted })).toBe('cancel')
    const d = queue.show('D')
    const e = queue.show('E')
    queue.clear()
    expect([await d, await e]).toEqual(['cancel', 'cancel'])
    expect(queue.current).toBeNull()
  })

  test('cada cola es independiente (sin estado de módulo)', () => {
    const one = createSnackbarQueue()
    const two = createSnackbarQueue()
    void one.show('Uno')
    expect(two.current).toBeNull()
    void two.show('Dos')
    expect(one.current?.message).toBe('Uno')
    expect(two.current?.message).toBe('Dos')
  })
})

// --- Partes visuales (universales) ---

describe('Snackbar (partes)', () => {
  const Matrix = () => (
    <div style={{ display: 'grid', gap: 16, justifyItems: 'start', padding: 16, inlineSize: 600 }}>
      <Snackbar className="text"><SnackbarMessage>Foto archivada</SnackbarMessage></Snackbar>
      <Snackbar className="close"><SnackbarMessage>Foto archivada</SnackbarMessage><SnackbarClose /></Snackbar>
      <Snackbar className="action"><SnackbarMessage>Foto archivada</SnackbarMessage><SnackbarAction>Deshacer</SnackbarAction></Snackbar>
      <Snackbar className="both">
        <SnackbarMessage>Foto archivada</SnackbarMessage>
        <SnackbarAction>Deshacer</SnackbarAction>
        <SnackbarClose />
      </Snackbar>
      <Snackbar className="two">
        <SnackbarMessage>Línea uno<br />Línea dos</SnackbarMessage>
        <SnackbarAction>Reintentar</SnackbarAction>
        <SnackbarClose />
      </Snackbar>
      <Snackbar className="long" actionOnNewLine>
        <SnackbarMessage>Línea uno<br />Línea dos</SnackbarMessage>
        <SnackbarAction>Reintentar ahora</SnackbarAction>
      </Snackbar>
      <Snackbar className="long-close" actionOnNewLine>
        <SnackbarMessage>Línea uno<br />Línea dos</SnackbarMessage>
        <SnackbarAction>Reintentar ahora</SnackbarAction>
        <SnackbarClose />
      </Snackbar>
    </div>
  )

  test('contenedor del kit: radio 4, Inverse Surface, elevación 3, Body Medium en Inverse On Surface', async () => {
    const c = await render(<Matrix />)
    const s = style(q(c, '.text'))
    expect(s.borderRadius).toBe('4px')
    expect(s.backgroundColor).toBe(roleColor('inverse-surface'))
    expect(s.color).toBe(roleColor('inverse-on-surface'))
    const probe = document.createElement('div')
    probe.style.boxShadow = 'var(--md-sys-elevation-level3)'
    probe.style.fontSize = 'var(--md-sys-typescale-body-medium-size)'
    probe.style.lineHeight = 'var(--md-sys-typescale-body-medium-line-height)'
    document.body.append(probe)
    expect(s.boxShadow).toBe(style(probe).boxShadow)
    expect(s.fontSize).toBe(style(probe).fontSize)
    expect(s.lineHeight).toBe(style(probe).lineHeight)
    probe.remove()
  })

  test('alturas del kit: una línea 48 (con y sin acción o cerrar), dos líneas 68, acción larga debajo 112', async () => {
    const c = await render(<Matrix />)
    for (const sel of ['.text', '.close', '.action', '.both']) expect(rect(q(c, sel)).height, sel).toBeCloseTo(48, 2)
    expect(rect(q(c, '.two')).height).toBeCloseTo(68, 2)
    expect(rect(q(c, '.long')).height).toBeCloseTo(112, 2)
    expect(rect(q(c, '.long-close')).height).toBeCloseTo(112, 2)
  })

  test('rellenos: texto a 16 del inicio; solo texto 16 al final; acción a 8 del final; cerrar de 48 pegado al final', async () => {
    const c = await render(<Matrix />)
    const text = q(c, '.text')
    const msg = q(text, '.mk-snackbar-message')
    expect(rect(msg).left - rect(text).left).toBeCloseTo(16, 2)
    expect(parseFloat(style(text).paddingInlineEnd) + parseFloat(style(msg).paddingInlineEnd)).toBe(16)
    // Texto de una línea a 14 del borde superior (4 del contenedor + 10).
    expect(parseFloat(style(text).paddingTop) + parseFloat(style(msg).paddingTop)).toBe(14)

    const action = q(c, '.action')
    const actionBtn = q(action, '.mk-snackbar-action')
    expect(rect(action).right - rect(actionBtn).right).toBeCloseTo(8, 2)
    expect(rect(actionBtn).height).toBeCloseTo(40, 2)
    expect(rect(actionBtn).left - rect(q(action, '.mk-snackbar-message')).right).toBeCloseTo(4, 2)
    expect(style(actionBtn).paddingLeft).toBe('12px')

    for (const sel of ['.close', '.both']) {
      const box = q(c, sel)
      const close = q(box, '.mk-snackbar-close')
      expect(rect(close).width, sel).toBeCloseTo(40, 2)
      expect(rect(close).height, sel).toBeCloseTo(40, 2)
      // Área de 48: 4 a cada lado del círculo, y el área toca el borde final.
      expect(rect(box).right - rect(close).right, sel).toBeCloseTo(4, 2)
      expect(rect(close).top - rect(box).top, sel).toBeCloseTo(4, 2)
    }
  })

  test('acción larga: debajo del texto y alineada al final (8 sin cerrar; con cerrar, el cerrar al final)', async () => {
    const c = await render(<Matrix />)
    for (const sel of ['.long', '.long-close']) {
      const box = q(c, sel)
      const msg = q(box, '.mk-snackbar-message')
      const act = q(box, '.mk-snackbar-action')
      expect(rect(act).top, sel).toBeGreaterThanOrEqual(rect(msg).bottom - 0.01)
      expect(rect(box).bottom - rect(act).bottom, sel).toBeCloseTo(4, 2)
    }
    expect(rect(q(c, '.long')).right - rect(q(c, '.long .mk-snackbar-action')).right).toBeCloseTo(8, 2)
    const closeRow = q(c, '.long-close')
    expect(rect(closeRow).right - rect(q(closeRow, '.mk-snackbar-close')).right).toBeCloseTo(4, 2)
    expect(rect(q(closeRow, '.mk-snackbar-close')).left).toBeGreaterThan(rect(q(closeRow, '.mk-snackbar-action')).right)
  })

  test('colores de la acción (Inverse Primary) y del cerrar (Inverse On Surface), con su capa', async () => {
    const c = await render(<Matrix />)
    const act = q(c, '.both .mk-snackbar-action')
    const close = q(c, '.both .mk-snackbar-close')
    expect(style(act).color).toBe(roleColor('inverse-primary'))
    expect(style(q(act, '.mk-state-layer')).backgroundColor).toBe(roleColor('inverse-primary'))
    expect(style(close).color).toBe(roleColor('inverse-on-surface'))
    expect(style(q(close, '.mk-state-layer')).backgroundColor).toBe(roleColor('inverse-on-surface'))
    expect(style(q(close, 'svg')).width).toBe('24px')
  })

  test('nombres: la acción por su texto, el cerrar "Cerrar" o su label', async () => {
    const c = await render(
      <Snackbar>
        <SnackbarMessage>Hola</SnackbarMessage>
        <SnackbarAction>Ver</SnackbarAction>
        <SnackbarClose label="Descartar aviso" />
      </Snackbar>,
    )
    expect(button(c, 'Ver').tagName).toBe('BUTTON')
    expect(button(c, 'Descartar aviso').getAttribute('aria-label')).toBe('Descartar aviso')
    const d = await render(<Snackbar><SnackbarMessage>Hola</SnackbarMessage><SnackbarClose /></Snackbar>)
    expect(button(d, 'Cerrar')).toBeTruthy()
  })

  test('props nativas y ref llegan a cada parte', async () => {
    const root = createRef<HTMLDivElement>()
    const msg = createRef<HTMLDivElement>()
    const act = createRef<HTMLButtonElement>()
    const close = createRef<HTMLButtonElement>()
    const c = await render(
      <Snackbar ref={root} id="s" className="mine" data-x="1" style={{ inlineSize: 400 }}>
        <SnackbarMessage ref={msg} id="m">Hola</SnackbarMessage>
        <SnackbarAction ref={act} data-y="2">Ver</SnackbarAction>
        <SnackbarClose ref={close} data-z="3" />
      </Snackbar>,
    )
    const el = q(c, '#s')
    expect(root.current).toBe(el)
    expect(el.className).toBe('mk-snackbar mine')
    expect(el.dataset.x).toBe('1')
    expect(rect(el).width).toBeCloseTo(400, 2)
    expect(msg.current?.id).toBe('m')
    expect(act.current?.dataset.y).toBe('2')
    expect(close.current?.dataset.z).toBe('3')
  })

  test('RTL: el texto al inicio (derecha) y la acción y el cerrar hacia la izquierda', async () => {
    const c = await render(
      <div dir="rtl" style={{ display: 'grid', justifyItems: 'start' }}>
        <Snackbar>
          <SnackbarMessage>Foto archivada</SnackbarMessage>
          <SnackbarAction>Deshacer</SnackbarAction>
          <SnackbarClose />
        </Snackbar>
      </div>,
    )
    const box = q(c, '.mk-snackbar')
    const msg = q(box, '.mk-snackbar-message')
    expect(rect(box).right - rect(msg).right).toBeCloseTo(16, 2)
    expect(rect(q(box, '.mk-snackbar-close')).left - rect(box).left).toBeCloseTo(4, 2)
    expect(rect(q(box, '.mk-snackbar-action')).right).toBeLessThan(rect(msg).left + 0.01)
  })
})

// --- El host ---

describe('SnackbarHost', () => {
  test('la región viva existe antes de mostrar nada, fuera del popover, y recibe el texto un cuadro después', async () => {
    const { queue, el, region } = await setup()
    expect(region.getAttribute('aria-live')).toBe('polite')
    expect(region.getAttribute('aria-atomic')).toBe('true')
    expect(region.textContent).toBe('')
    expect(el.contains(region)).toBe(false)
    expect(style(region).display).not.toBe('none')
    expect(style(region).visibility).toBe('visible')
    expect(shown(el)).toBe(false)

    const texts: string[] = []
    const observer = new MutationObserver(() => texts.push(region.textContent ?? ''))
    observer.observe(region, { childList: true, subtree: true, characterData: true })
    void queue.show({ message: 'Foto archivada', action: 'Deshacer' })
    await until(() => shown(el), true)
    await until(() => region.textContent, 'Foto archivada Deshacer')
    // La misma región, no una nueva creada junto con el contenido.
    expect(q(el.parentElement!, '[role="status"]')).toBe(region)
    queue.dismiss()
    await until(() => region.textContent, '')
    void queue.show({ message: 'Foto archivada', action: 'Deshacer' })
    await until(() => region.textContent, 'Foto archivada Deshacer')
    observer.disconnect()
    // El mismo mensaje dos veces seguidas pasa por vacío: es un cambio que se vuelve a anunciar.
    expect(texts.filter((t) => t !== '')).toEqual(['Foto archivada Deshacer', 'Foto archivada Deshacer'])
    expect(texts).toContain('')
  })

  test('estructura: popover manual con mensaje, acción con su texto y cerrar con su nombre', async () => {
    const { queue, el } = await setup(undefined, { closeLabel: 'Close' })
    expect(el.getAttribute('popover')).toBe('manual')
    void queue.show({ message: 'Foto archivada', action: 'Deshacer' })
    await until(() => shown(el), true)
    expect(q(el, '.mk-snackbar-message').textContent).toBe('Foto archivada')
    expect(button(el, 'Deshacer').getAttribute('type')).toBe('button')
    expect(button(el, 'Close')).toBeTruthy()
    queue.dismiss()
    await until(() => shown(el), false)
    void queue.show({ message: 'Otro', duration: 'indefinite', closeLabel: 'Descartar' })
    await until(() => el.querySelector('.mk-snackbar-message')?.textContent, 'Otro')
    expect(button(el, 'Descartar')).toBeTruthy()
    expect(el.querySelector('.mk-snackbar-action')).toBeNull()
  })

  test('cola: varios en orden, uno a la vez; acción, cierre y tiempo dan su resultado', async () => {
    fakeTimers()
    const { queue, el } = await setup()
    const a = track(queue.show({ message: 'Primero', action: 'Deshacer' }))
    const b = track(queue.show({ message: 'Segundo', dismissible: true }))
    const c = track(queue.show('Tercero'))
    await until(() => shown(el), true)
    expect(el.querySelectorAll('.mk-snackbar-message')).toHaveLength(1)
    expect(q(el, '.mk-snackbar-message').textContent).toBe('Primero')

    button(el, 'Deshacer').click()
    await until(() => a.result, 'action')
    await until(() => el.querySelector('.mk-snackbar-message')?.textContent, 'Segundo')
    expect(b.result).toBeUndefined()

    button(el, 'Cerrar').click()
    await until(() => b.result, 'dismiss')
    await until(() => el.querySelector('.mk-snackbar-message')?.textContent, 'Tercero')
    await advance(SNACKBAR_DURATION_MS.short)
    await until(() => c.result, 'timeout')
    await until(() => shown(el), false)
  })

  test('duraciones: corta 4 s, larga 10 s, en milisegundos, e indefinida no se va sola', async () => {
    fakeTimers()
    const { queue, el } = await setup()
    for (const [duration, ms] of [['short', 4000], ['long', 10000], [2500, 2500]] as const) {
      const t = track(queue.show({ message: String(duration), duration }))
      await until(() => shown(el), true)
      await advance(ms - 1)
      expect(t.result, `${duration} antes`).toBeUndefined()
      expect(shown(el)).toBe(true)
      await advance(1)
      await until(() => t.result, 'timeout')
      await until(() => shown(el), false)
    }
    const forever = track(queue.show({ message: 'Para siempre', action: 'Ver' }))
    await until(() => shown(el), true)
    await advance(24 * 60 * 60 * 1000)
    expect(forever.result).toBeUndefined()
    expect(shown(el)).toBe(true)
  })

  test('el tiempo se detiene con el puntero encima y sigue con lo que faltaba al salir', async () => {
    fakeTimers()
    const { queue, el } = await setup()
    const t = track(queue.show('Hola'))
    await until(() => shown(el), true)
    await advance(3000)
    // React escucha pointerover/pointerout para onPointerEnter/onPointerLeave.
    el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))
    await frame()
    await advance(60000)
    expect(t.result).toBeUndefined()
    el.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse', relatedTarget: document.body }))
    await frame()
    await advance(999)
    expect(t.result).toBeUndefined()
    await advance(1)
    await until(() => t.result, 'timeout')
  })

  test('con una duración y acción, el foco adentro lo detiene; al salir el foco, sigue', async () => {
    fakeTimers()
    const { queue, el, c } = await setup()
    const t = track(queue.show({ message: 'Archivado', action: 'Deshacer', duration: 'short' }))
    await until(() => shown(el), true)
    await advance(2000)
    button(el, 'Deshacer').focus()
    await frame()
    await advance(60000)
    expect(t.result).toBeUndefined()
    button(c, 'Antes').focus()
    await frame()
    await advance(1999)
    expect(t.result).toBeUndefined()
    await advance(1)
    await until(() => t.result, 'timeout')
  })

  test('la pestaña oculta detiene el tiempo', async () => {
    fakeTimers()
    const { queue, el } = await setup()
    const t = track(queue.show('Hola'))
    await until(() => shown(el), true)
    const state = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    await frame()
    await advance(60000)
    expect(t.result).toBeUndefined()
    state.mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    await frame()
    await advance(4000)
    await until(() => t.result, 'timeout')
    state.mockRestore()
  })

  test('no roba el foco al aparecer', async () => {
    const { queue, el, c } = await setup(<input aria-label="Nombre" />)
    const input = q<HTMLInputElement>(c, 'input')
    input.focus()
    void queue.show({ message: 'Guardado', action: 'Ver' })
    await until(() => shown(el), true)
    await frame()
    expect(document.activeElement).toBe(input)
  })

  test('F6 lleva el foco a la acción y F6 otra vez lo devuelve; al usar la acción, el foco vuelve', async () => {
    const { queue, el, c } = await setup(<input aria-label="Nombre" />)
    const input = q<HTMLInputElement>(c, 'input')
    await userEvent.click(input)
    const t = track(queue.show({ message: 'Guardado', action: 'Ver' }))
    await until(() => shown(el), true)
    await userEvent.keyboard('{F6}')
    expect(document.activeElement).toBe(button(el, 'Ver'))
    await userEvent.keyboard('{F6}')
    expect(document.activeElement).toBe(input)
    await userEvent.keyboard('{F6}')
    expect(document.activeElement).toBe(button(el, 'Ver'))
    await userEvent.keyboard('{Enter}')
    await until(() => t.result, 'action')
    expect(document.activeElement).toBe(input)
  })

  test('F6 sin acción ni cerrar queda para el navegador; con solo cerrar, va al cerrar', async () => {
    const { queue, el, c } = await setup(<input aria-label="Nombre" />)
    const input = q<HTMLInputElement>(c, 'input')
    input.focus()
    void queue.show({ message: 'Hola', duration: 'indefinite', dismissible: false })
    await until(() => shown(el), true)
    // Evento despachado a mano: el F6 real hace lo propio del navegador (Firefox saca el foco del
    // documento), y lo que se prueba es que el snackbar no lo atrapa.
    const f6 = new KeyboardEvent('keydown', { key: 'F6', bubbles: true, cancelable: true })
    input.dispatchEvent(f6)
    expect(f6.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(input)
    queue.dismiss()
    await until(() => shown(el), false)
    void queue.show({ message: 'Hola', duration: 'indefinite' })
    await until(() => shown(el), true)
    await userEvent.keyboard('{F6}')
    expect(document.activeElement).toBe(button(el, 'Cerrar'))
  })

  test('Escape con el foco adentro lo descarta y devuelve el foco; con el foco afuera, no', async () => {
    const { queue, el, c } = await setup(<input aria-label="Nombre" />)
    const input = q<HTMLInputElement>(c, 'input')
    input.focus()
    const t = track(queue.show({ message: 'Guardado', action: 'Ver' }))
    await until(() => shown(el), true)
    await userEvent.keyboard('{Escape}')
    await frame()
    expect(shown(el)).toBe(true)
    expect(t.result).toBeUndefined()
    await userEvent.keyboard('{F6}')
    await userEvent.keyboard('{Escape}')
    await until(() => t.result, 'dismiss')
    expect(document.activeElement).toBe(input)
  })

  // WebKit en macOS no lleva el foco a los botones con Tab (ajuste del sistema, CLAUDE.md): en local
  // falla (comprobado el 2026-11-26); la referencia es el WebKit de Linux del CI. El foco de teclado
  // en la acción sin Tab lo cubren las pruebas de F6, que usan focus({ focusVisible: true }).
  test('el snackbar queda en el orden de Tab donde está el host (después del contenido)', async () => {
    const { queue, el, c } = await setup(<button type="button">Último del contenido</button>)
    void queue.show({ message: 'Guardado', action: 'Ver' })
    await until(() => shown(el), true)
    await userEvent.click(button(c, 'Último del contenido'))
    await userEvent.tab()
    expect(document.activeElement).toBe(button(el, 'Ver'))
    await userEvent.tab()
    expect(document.activeElement).toBe(button(el, 'Cerrar'))
  })

  test('el foco de teclado en la acción se ve (anillo), también llegando con F6', async () => {
    const { queue, el } = await setup()
    void queue.show({ message: 'Guardado', action: 'Ver' })
    await until(() => shown(el), true)
    await userEvent.keyboard('{F6}')
    expect(button(el, 'Ver').matches(':focus-visible')).toBe(true)
  })

  test('más de un host: useSnackbar usa el más cercano y las colas son independientes', async () => {
    function Show({ label }: { label: string }) {
      const snackbar = useSnackbar()
      return (
        <button type="button" onClick={() => void snackbar.show({ message: label, duration: 'indefinite' })}>
          {label}
        </button>
      )
    }
    const c = await render(
      <SnackbarHost className="outer">
        <Show label="Exterior" />
        <SnackbarHost className="inner">
          <Show label="Interior" />
        </SnackbarHost>
      </SnackbarHost>,
    )
    const outer = q(c, '.mk-snackbar.outer')
    const inner = q(c, '.mk-snackbar.inner')
    button(c, 'Interior').click()
    await until(() => shown(inner), true)
    expect(shown(outer)).toBe(false)
    expect(q(inner, '.mk-snackbar-message').textContent).toBe('Interior')
    button(c, 'Exterior').click()
    await until(() => shown(outer), true)
    expect(shown(inner)).toBe(true)
    expect(q(outer, '.mk-snackbar-message').textContent).toBe('Exterior')
    expect(c.querySelectorAll('[role="status"]')).toHaveLength(2)
  })

  test('useSnackbar fuera de un host avisa cómo arreglarlo', async () => {
    function Probe() {
      try {
        useSnackbar()
      } catch (e) {
        return <p>{(e as Error).message}</p>
      }
      return null
    }
    const c = await render(<Probe />)
    expect(c.textContent).toMatch(/SnackbarHost/)
  })

  test('dentro de un Dialog modal, un host propio funciona y su Escape no cierra el diálogo', async () => {
    function Inner() {
      const snackbar = useSnackbar()
      return (
        <button type="button" onClick={() => void snackbar.show({ message: 'Copiado', action: 'Ver' })}>
          Copiar
        </button>
      )
    }
    const onClose = vi.fn()
    const c = await render(
      <Dialog open onClose={onClose}>
        <DialogHeadline>Compartir</DialogHeadline>
        <DialogContent>
          <SnackbarHost>
            <Inner />
          </SnackbarHost>
        </DialogContent>
      </Dialog>,
    )
    const el = q(document, 'dialog .mk-snackbar[popover]')
    await userEvent.click(button(c.ownerDocument, 'Copiar'))
    await until(() => shown(el), true)
    // Se puede usar: no queda inerte detrás del diálogo.
    await userEvent.click(button(el, 'Ver'))
    await until(() => shown(el), false)
    await userEvent.click(button(c.ownerDocument, 'Copiar'))
    await until(() => shown(el), true)
    await userEvent.keyboard('{F6}')
    await userEvent.keyboard('{Escape}')
    await until(() => shown(el), false)
    expect(onClose).not.toHaveBeenCalled()
  })

  test('props nativas, className, style y ref llegan al snackbar visible', async () => {
    const ref = createRef<HTMLDivElement>()
    const onPointerEnter = vi.fn()
    const { el } = await setup(undefined, { ref, id: 'aviso', className: 'mine', 'data-x': '1', onPointerEnter } as Partial<SnackbarHostProps>)
    expect(ref.current).toBe(el)
    expect(el.id).toBe('aviso')
    expect(el.classList.contains('mine')).toBe(true)
    expect(el.dataset.x).toBe('1')
    el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }))
    expect(onPointerEnter).toHaveBeenCalled()
  })
})

// --- Posición, ancho y movimiento ---

describe('posición', () => {
  afterEach(async () => {
    await page.viewport(414, 896)
  })

  async function open(width: number, props: Partial<SnackbarHostProps> = {}, message = 'Foto archivada') {
    await page.viewport(width, 700)
    await expect.poll(() => window.innerWidth).toBe(width)
    const { queue, el } = await setup(undefined, props)
    void queue.show({ message, duration: 'indefinite' })
    await expect.poll(() => shown(el)).toBe(true)
    return el
  }

  test('1200 px: abajo a 12 de la ventana y centrado, con el ancho del texto entre 344 y 600', async () => {
    const el = await open(1200)
    const r = rect(el)
    expect(window.innerHeight - r.bottom).toBeCloseTo(12, 2)
    expect(r.width).toBeCloseTo(344, 2)
    expect(r.left + r.width / 2).toBeCloseTo(600, 1)
    const long = await open(1200, {}, 'Un mensaje bastante largo que no entra en 344 px y tiene que crecer hasta el máximo de 600')
    expect(rect(long).width).toBeCloseTo(600, 2)
  })

  test('320 px: todo el ancho menos 12 a cada lado', async () => {
    const el = await open(320)
    const r = rect(el)
    expect(r.left).toBeCloseTo(12, 2)
    expect(r.width).toBeCloseTo(296, 2)
    expect(window.innerHeight - r.bottom).toBeCloseTo(12, 2)
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320)
  })

  test('--mk-snackbar-offset lo sube por encima de una barra inferior o un FAB', async () => {
    const el = await open(1200, { style: { '--mk-snackbar-offset': '80px' } as CSSProperties })
    expect(window.innerHeight - rect(el).bottom).toBeCloseTo(92, 2)
  })

  test('align="start": al inicio en ventanas anchas (a la derecha en RTL); en compact, igual a todo el ancho', async () => {
    const el = await open(1200, { align: 'start' })
    expect(rect(el).left).toBeCloseTo(12, 2)
    const rtl = await open(1200, { align: 'start', dir: 'rtl' })
    expect(window.innerWidth - rect(rtl).right).toBeCloseTo(12, 2)
    const compact = await open(320, { align: 'start' })
    expect(rect(compact).width).toBeCloseTo(296, 2)
  })
})

describe('movimiento', () => {
  test('entrada y salida con resortes: opacidad (FastEffects) y escala desde 0,8 (FastSpatial)', async () => {
    const { queue, el } = await setup()
    void queue.show({ message: 'Hola', duration: 'indefinite' })
    await until(() => shown(el), true)
    const t = withMotion(() => ({ transitionProperty: style(el).transitionProperty, transitionDuration: style(el).transitionDuration }))
    expect(t.transitionProperty).toBe('opacity, scale')
    const probe = document.createElement('div')
    probe.style.transitionDuration = 'var(--md-sys-motion-spring-fast-effects-duration), var(--md-sys-motion-spring-fast-spatial-duration)'
    document.body.append(probe)
    expect(t.transitionDuration).toBe(withMotion(() => style(probe).transitionDuration))
    probe.remove()
    el.setAttribute('data-closing', '')
    expect(style(el).scale).toBe('0.8')
    expect(style(el).opacity).toBe('0')
    el.removeAttribute('data-closing')
  })

  test('con movimiento reducido, solo opacidad: la salida no cambia la escala', async () => {
    await commands.reduceMotion(true)
    try {
      const { queue, el } = await setup()
      void queue.show({ message: 'Hola', duration: 'indefinite' })
      await until(() => shown(el), true)
      el.setAttribute('data-closing', '')
      expect(style(el).opacity).toBe('0')
      expect(['1', 'none']).toContain(style(el).scale)
      el.removeAttribute('data-closing')
    } finally {
      // Sin esto, la emulación sigue en la prueba siguiente: los resortes duran 0 y "la salida
      // espera la animación" fallaba al correr el archivo completo (comprobado el 2026-11-26).
      await commands.reduceMotion(false)
    }
  })

  // Sin transiciones en las pruebas, la salida termina enseguida; estas pruebas las activan.
  async function withTransitions(fn: () => Promise<void>) {
    const sheet = document.getElementById('mk-test-no-motion') as HTMLStyleElement
    sheet.media = 'not all'
    try {
      await fn()
    } finally {
      sheet.media = ''
      await commands.reduceMotion(false)
    }
  }
  /** Espera a que termine la entrada: descartar antes acorta la salida (o la anula, en progreso 0). */
  const entered = (el: Element) => Promise.allSettled(el.getAnimations().map((a) => a.finished))

  test('la salida espera la animación antes de ocultar el popover', async () => {
    const { queue, el } = await setup()
    await withTransitions(async () => {
      void queue.show({ message: 'Hola', duration: 'indefinite' })
      await expect.poll(() => shown(el)).toBe(true)
      await entered(el)
      queue.dismiss()
      await expect.poll(() => el.hasAttribute('data-closing')).toBe(true)
      expect(el.getAnimations().length).toBeGreaterThan(0)
      expect(el.matches(':popover-open')).toBe(true)
      await expect.poll(() => el.matches(':popover-open'), { timeout: 3000 }).toBe(false)
    })
  })

  // El error que esto cubre (2026-11-26): la salida esperaba Promise.all de las transiciones; una
  // transición cancelada rechazaba la espera, el rechazo se ignoraba y el host quedaba con
  // data-closing e inert, sin mostrar nunca el siguiente.
  for (const how of ['movimiento reducido', 'cancel()'] as const) {
    test(`una salida cancelada (${how}) no traba la cola: se oculta y aparece el siguiente`, async () => {
      const { queue, el } = await setup()
      await withTransitions(async () => {
        const first = track(queue.show({ message: 'Primero', duration: 'indefinite' }))
        await expect.poll(() => shown(el)).toBe(true)
        await entered(el)
        queue.dismiss()
        void queue.show({ message: 'Segundo', duration: 'indefinite' })
        await expect.poll(() => el.hasAttribute('data-closing')).toBe(true)
        expect(el.getAnimations().length).toBeGreaterThan(0)
        if (how === 'cancel()') for (const a of el.getAnimations()) a.cancel()
        else await commands.reduceMotion(true)
        await expect.poll(() => el.querySelector('.mk-snackbar-message')?.textContent, { timeout: 3000 }).toBe('Segundo')
        expect(shown(el)).toBe(true)
        expect(el.inert).toBe(false)
        expect(first.result).toBe('dismiss')
      })
    })
  }

  test('descartar durante la entrada y encolar otro: el siguiente aparece', async () => {
    const { queue, el } = await setup()
    await withTransitions(async () => {
      // En el mismo cuadro en que se abre (progreso 0) y a mitad de la entrada.
      for (const wait of [false, true]) {
        const first = track(queue.show({ message: 'Primero', duration: 'indefinite' }))
        await expect.poll(() => el.querySelector('.mk-snackbar-message')?.textContent).toBe('Primero')
        if (wait) await new Promise((r) => setTimeout(r, 60))
        queue.dismiss()
        void queue.show({ message: 'Segundo', duration: 'indefinite' })
        await expect.poll(() => el.querySelector('.mk-snackbar-message')?.textContent, { timeout: 3000 }).toBe('Segundo')
        expect(shown(el)).toBe(true)
        expect(first.result).toBe('dismiss')
        queue.dismiss()
        await expect.poll(() => el.matches(':popover-open'), { timeout: 3000 }).toBe(false)
      }
    })
  })
})
