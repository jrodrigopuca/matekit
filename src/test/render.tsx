// Ayudas para las pruebas en navegador.

import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach } from 'vitest'
import { userEvent } from 'vitest/browser'
import '../styles.css'

// Sin transiciones durante las pruebas: getComputedStyle devolvería valores intermedios.
const noMotion = document.createElement('style')
noMotion.id = 'mk-test-no-motion'
noMotion.textContent = '*, *::before, *::after { transition: none !important; }'
document.head.append(noMotion)

/** Ejecuta fn con las transiciones activas (para revisar su declaración). */
export function withMotion<T>(fn: () => T): T {
  noMotion.media = 'not all'
  try {
    return fn()
  } finally {
    noMotion.media = ''
  }
}

let root: Root | undefined
let container: HTMLElement | undefined

/** Desmonta lo que haya renderizado la prueba anterior. */
async function cleanup() {
  if (root) await act(async () => root?.unmount())
  root = undefined
  container?.remove()
  container = undefined
}

/**
 * Deja el puntero en una esquina lejana. Si no, queda donde lo dejó la prueba anterior y, si el
 * componente nuevo aparece debajo, empieza con hover (en CI eso cambia según el orden).
 */
async function pointerAway() {
  const spot = document.createElement('div')
  spot.style.cssText = 'position: fixed; right: 0; bottom: 0; width: 4px; height: 4px;'
  document.body.append(spot)
  await userEvent.hover(spot)
  spot.remove()
}

// Cada prueba empieza aislada de la anterior: sin componentes montados (un diálogo abierto
// dejaría la página sin scroll) y con el puntero lejos.
beforeEach(pointerAway)
afterEach(cleanup)

export async function render(ui: ReactNode): Promise<HTMLElement> {
  await cleanup()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => root?.render(ui))
  return container
}

export const style = (el: Element | null): CSSStyleDeclaration => {
  if (!el) throw new Error('elemento no encontrado')
  return getComputedStyle(el)
}

/** Color de un rol del esquema en el formato que devuelve getComputedStyle. */
export function roleColor(role: string): string {
  const probe = document.createElement('span')
  probe.style.color = `var(--md-sys-color-${role})`
  document.body.append(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value
}
