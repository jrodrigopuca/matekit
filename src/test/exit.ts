// Ayudas para probar que una salida animada cancelada no deja la capa abierta (Snackbar, Tooltip,
// Menu, Dialog; src/internal/settle-animations.ts).

import { expect } from 'vitest'
import { commands } from 'vitest/browser'

export const CANCEL_WAYS = ['cancel()', 'movimiento reducido'] as const
export type CancelWay = (typeof CANCEL_WAYS)[number]

/**
 * Corre `fn` con las transiciones activas (render.tsx las quita en las pruebas) y deja todo como
 * estaba, también la emulación de movimiento reducido.
 */
export async function withTransitions(fn: () => Promise<void>) {
  const sheet = document.getElementById('mk-test-no-motion') as HTMLStyleElement
  sheet.media = 'not all'
  try {
    await fn()
  } finally {
    sheet.media = ''
    await commands.reduceMotion(false)
  }
}

/** Espera a que termine la entrada: descartar antes acorta la salida o la anula (progreso 0). */
export const entered = (el: Element) => Promise.allSettled(el.getAnimations().map((a) => a.finished))

/**
 * Con la salida en curso (`data-closing` y transiciones corriendo), la cancela: con `cancel()` sobre
 * las transiciones, o activando el movimiento reducido (cambia la escala de destino y el navegador
 * cancela esa transición).
 */
export async function cancelExit(el: Element, how: CancelWay) {
  await expect.poll(() => el.hasAttribute('data-closing')).toBe(true)
  expect(el.getAnimations().length).toBeGreaterThan(0)
  if (how === 'cancel()') for (const a of el.getAnimations()) a.cancel()
  else await commands.reduceMotion(true)
}
