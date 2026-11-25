// Ayudas para las pruebas en navegador.

import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach } from 'vitest'
import { userEvent } from 'vitest/browser'
import '../styles.css'

// act() solo se usa para montar y desmontar. React exige que el entorno se declare de pruebas
// mientras corre act() (si no, avisa "The current testing environment is not configured to
// support act(...)"), pero si queda declarado siempre, avisa por cada actualización que causa
// un evento real del navegador ("not wrapped in act"). Esos eventos vienen de Playwright y las
// pruebas esperan su resultado en el DOM, así que la marca se activa solo durante act().
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}
async function inAct(fn: () => void): Promise<void> {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  try {
    await act(async () => fn())
  } finally {
    globalThis.IS_REACT_ACT_ENVIRONMENT = false
  }
}

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
  if (root) await inAct(() => root?.unmount())
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

/**
 * Deja el foco al principio de la página de la prueba, sin ningún elemento enfocado. Firefox, si
 * una prueba anterior dejó el foco fuera del documento de la prueba (que corre en un iframe),
 * hace que el primer Tab no entre al documento (pasaba al azar según el orden). Enfocar un
 * elemento propio y quitarlo devuelve el foco al documento.
 */
function focusAway() {
  const spot = document.createElement('button')
  spot.style.cssText = 'position: fixed; left: 0; top: 0; width: 1px; height: 1px; opacity: 0;'
  document.body.prepend(spot)
  spot.focus()
  spot.remove()
}

// Cada prueba empieza aislada de la anterior: sin componentes montados (un diálogo abierto
// dejaría la página sin scroll), con el puntero lejos y sin foco.
beforeEach(async () => {
  await pointerAway()
  focusAway()
})
afterEach(cleanup)

export async function render(ui: ReactNode): Promise<HTMLElement> {
  await cleanup()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await inAct(() => root?.render(ui))
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
