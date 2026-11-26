import { afterEach, describe, expect, test } from 'vitest'
import { settleAnimations } from './settle-animations.ts'

// Animaciones de la Web Animations API sobre un elemento suelto: el `transition: none` global de
// src/test/render.tsx no las afecta, y se cancelan, reemplazan y pausan sin depender del CSS.

let el: HTMLDivElement
afterEach(() => el?.remove())
function box() {
  el = document.createElement('div')
  document.body.append(el)
  return el
}
const fade = (target: Element, duration: number, options: KeyframeAnimationOptions = {}) =>
  target.animate([{ opacity: 1 }, { opacity: 0 }], { duration, ...options })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
/** Resuelta o no, sin esperarla. */
function track(promise: Promise<void>) {
  const t = { done: false }
  void promise.then(() => (t.done = true))
  return t
}

describe('settleAnimations', () => {
  test('sin animaciones se cumple enseguida', async () => {
    const t = track(settleAnimations(box()))
    await Promise.resolve()
    await Promise.resolve()
    expect(t.done).toBe(true)
  })

  test('espera a que terminen todas', async () => {
    const target = box()
    const short = fade(target, 40)
    const long = fade(target, 160)
    await settleAnimations(target)
    expect(short.playState).toBe('finished')
    expect(long.playState).toBe('finished')
  })

  test('una animación cancelada no la cuelga: espera a las demás y se cumple', async () => {
    const target = box()
    const canceled = fade(target, 10_000)
    const other = fade(target, 120)
    const t = track(settleAnimations(target))
    await sleep(20)
    canceled.cancel()
    await expect.poll(() => t.done, { timeout: 2000 }).toBe(true)
    expect(other.playState).toBe('finished')
  })

  test('vuelve a consultar: si una cancelada deja otra en su lugar, espera a la nueva', async () => {
    const target = box()
    const first = fade(target, 10_000)
    let replacement: Animation | undefined
    void first.finished.catch(() => {
      replacement = fade(target, 200)
    })
    const t = track(settleAnimations(target))
    await sleep(20)
    first.cancel()
    await expect.poll(() => replacement !== undefined).toBe(true)
    expect(t.done).toBe(false)
    await expect.poll(() => t.done, { timeout: 2000 }).toBe(true)
    expect(replacement?.playState).toBe('finished')
  })

  test('ignora las infinitas y las que están en pausa', async () => {
    const target = box()
    const infinite = fade(target, 100, { iterations: Infinity })
    const paused = fade(target, 100)
    paused.pause()
    const t = track(settleAnimations(target))
    await expect.poll(() => t.done).toBe(true)
    expect(infinite.playState).toBe('running')
    expect(paused.playState).toBe('paused')
  })

  test('con la bandera en false no espera, y si pasa a false durante la espera no sigue a las nuevas', async () => {
    const target = box()
    const running = fade(target, 10_000)
    await settleAnimations(target, () => false)
    expect(running.playState).toBe('running')
    running.cancel()

    // Como reabrir durante la salida: la salida se reemplaza por una entrada larga y la bandera
    // del que esperaba pasa a false; la espera termina sin seguir a la entrada.
    let active = true
    const exit = fade(target, 10_000)
    void exit.finished.catch(() => {
      active = false
      fade(target, 10_000)
    })
    const t = track(settleAnimations(target, () => active))
    await sleep(20)
    exit.cancel()
    await expect.poll(() => t.done, { timeout: 2000 }).toBe(true)
    expect(target.getAnimations().some((a) => a.playState === 'running')).toBe(true)
  })
})
