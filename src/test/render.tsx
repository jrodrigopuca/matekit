// Ayudas para las pruebas en navegador.

import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
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

export async function render(ui: ReactNode): Promise<HTMLElement> {
  if (root) await act(async () => root?.unmount())
  container?.remove()
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
