// Lectura de píxeles de lo que el navegador dibujó, para probar recortes (máscaras) que
// getComputedStyle no muestra. Toma una captura del elemento con Playwright (funciona igual en
// Chrome, Firefox y WebKit) y la decodifica en un canvas.

import { page } from 'vitest/browser'

export interface Pixels {
  /** Color en (x, y), en px CSS desde la esquina superior izquierda del elemento. */
  at(x: number, y: number): [r: number, g: number, b: number, a: number]
}

export async function pixelsOf(element: HTMLElement): Promise<Pixels> {
  const base64 = await page.screenshot({ element, save: false })
  const image = new Image()
  image.src = `data:image/png;base64,${base64}`
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Sin contexto 2D')
  ctx.drawImage(image, 0, 0)
  // La captura puede estar en píxeles de dispositivo (pantallas de alta densidad).
  const scale = image.naturalWidth / element.getBoundingClientRect().width
  return {
    at(x, y) {
      const d = ctx.getImageData(Math.floor(x * scale), Math.floor(y * scale), 1, 1).data
      return [d[0]!, d[1]!, d[2]!, d[3]!]
    },
  }
}

/** Si el color es casi el pedido (tolera el suavizado de bordes y la compresión de color). */
export function near([r, g, b]: readonly number[], [er, eg, eb]: readonly number[], tolerance = 24): boolean {
  return Math.abs(r! - er!) <= tolerance && Math.abs(g! - eg!) <= tolerance && Math.abs(b! - eb!) <= tolerance
}
