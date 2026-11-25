// Contraste según WCAG 2.2, calculado sobre los colores que el navegador computó.
//
// Complementa a axe-core: axe no decide el contraste de un elemento cubierto por otro, y los
// átomos de matekit (StateLayer, Ripple, FocusRing) son capas sobre el componente, así que en
// botones e inputs su resultado queda "incompleto". Acá el fondo se obtiene componiendo los
// background-color del elemento y sus ancestros hasta llegar a uno opaco.

type RGBA = [r: number, g: number, b: number, a: number]

/** Lee "rgb(…)", "rgba(…)" o "color(srgb r g b / a)" como componentes de 0 a 1. */
export function parseColor(value: string): RGBA {
  const srgb = value.match(/color\(srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.e-]+))?\)/)
  if (srgb) return [Number(srgb[1]), Number(srgb[2]), Number(srgb[3]), srgb[4] === undefined ? 1 : Number(srgb[4])]
  const rgb = value.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/)
  if (rgb) return [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255, rgb[4] === undefined ? 1 : Number(rgb[4])]
  throw new Error(`Color no reconocido: ${value}`)
}

/** Pinta `top` (con su alfa) sobre `bottom` (opaco). */
function over([r, g, b, a]: RGBA, [R, G, B]: RGBA): RGBA {
  return [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a), 1]
}

/** Fondo opaco efectivo detrás de `el`: sus background-color y los de sus ancestros, compuestos. */
export function effectiveBackground(el: Element): RGBA {
  const layers: RGBA[] = []
  for (let node: Element | null = el; node; node = node.parentElement) {
    const bg = parseColor(getComputedStyle(node).backgroundColor)
    if (bg[3] > 0) layers.push(bg)
    if (bg[3] >= 1) break
  }
  let result: RGBA = [1, 1, 1, 1] // si nada es opaco, el lienzo blanco del navegador
  for (const layer of layers.reverse()) result = over(layer, result)
  return result
}

const channel = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const luminance = ([r, g, b]: RGBA) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)

/** Relación de contraste entre un color (con alfa, sobre `background`) y un fondo opaco. */
export function contrastRatio(foreground: string | RGBA, background: RGBA): number {
  const fg = typeof foreground === 'string' ? parseColor(foreground) : foreground
  const a = luminance(over(fg, background))
  const b = luminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

/** Contraste del texto de `el` (propiedad color) contra su fondo efectivo. */
export const textContrast = (el: Element) => contrastRatio(getComputedStyle(el).color, effectiveBackground(el))
