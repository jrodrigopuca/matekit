// Lint del CSS de los componentes: color, movimiento y tipografía tienen que salir de los
// tokens (ADR-0005), no de valores escritos a mano. Sin dependencias: recorre las declaraciones
// con expresiones regulares, que alcanza para el CSS plano de matekit.
//
// Para permitir una excepción justificada, terminar la declaración con un comentario
// `/* lint-css-allow: motivo */`.

export interface LintProblem {
  line: number
  property: string
  value: string
  message: string
}

/** Palabras clave de color permitidas además de var(): ajustes y colores del sistema. */
const ALLOWED_COLOR_KEYWORDS = new Set(
  [
    'transparent',
    'currentcolor',
    'inherit',
    'initial',
    'unset',
    'revert',
    'none',
    // Colores del sistema, para el modo de alto contraste (forced-colors).
    'canvas',
    'canvastext',
    'highlight',
    'highlighttext',
    'graytext',
    'buttontext',
    'buttonface',
    'buttonborder',
    'field',
    'fieldtext',
    'linktext',
    'visitedtext',
    'activetext',
    'mark',
    'marktext',
    'accentcolor',
    'accentcolortext',
    'selecteditem',
    'selecteditemtext',
  ].map((k) => k.toLowerCase()),
)

/** Palabras que aparecen en valores de color compuestos y no son colores. */
const NON_COLOR_WORDS = new Set([
  // estilos de borde y contorno
  'solid',
  'dashed',
  'dotted',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
  'hidden',
  'auto',
  // color-mix(in srgb, …)
  'in',
  'srgb',
  'srgb-linear',
  'oklab',
  'oklch',
  'display-p3',
])

/** Propiedades cuyo valor es (o contiene) un color. */
const COLOR_PROPERTY =
  /^(color|background|background-color|border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-color)?|outline(-color)?|fill|stroke|box-shadow|text-shadow|caret-color|accent-color|text-decoration(-color)?|column-rule(-color)?|scrollbar-color)$/

const MOTION_PROPERTY = /^(transition|animation)(-(duration|delay|timing-function))?$/
const TYPOGRAPHY_PROPERTY = /^(font|font-size|font-family|font-weight|line-height|letter-spacing)$/

const LITERAL_COLOR = /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i
const LITERAL_DURATION = /(^|[\s,(])(\d*\.?\d+)m?s\b/
const LITERAL_EASING = /\b(cubic-bezier|steps|linear)\(|\b(ease|ease-in|ease-out|ease-in-out|step-start|step-end)\b/

/** Quita los var(…) (con sus valores de respaldo) y deja lo que se escribió a mano. */
function withoutVars(value: string): string {
  let out = ''
  let depth = 0
  for (let i = 0; i < value.length; i++) {
    if (depth === 0 && value.startsWith('var(', i)) {
      depth = 1
      i += 3
      out += ' '
      continue
    }
    if (depth > 0) {
      if (value[i] === '(') depth++
      else if (value[i] === ')') depth--
      continue
    }
    out += value[i]
  }
  return out
}

/** Reemplaza los comentarios por espacios, conservando los saltos de línea (y las líneas). */
function blankComments(css: string): { text: string; allowed: Set<number> } {
  const allowed = new Set<number>()
  const text = css.replace(/\/\*[\s\S]*?\*\//g, (comment, offset: number) => {
    if (/lint-css-allow/.test(comment)) allowed.add(lineAt(css, offset))
    return comment.replace(/[^\n]/g, ' ')
  })
  return { text, allowed }
}

const lineAt = (text: string, index: number) => text.slice(0, index).split('\n').length

export function lintCss(css: string): LintProblem[] {
  const { text, allowed } = blankComments(css)
  const problems: LintProblem[] = []
  // Declaraciones: "propiedad: valor" terminadas en ; o } (los selectores terminan en {).
  for (const m of text.matchAll(/(?<![\w-])(-{0,2}[a-z][\w-]*)\s*:\s*([^;{}]+?)\s*(?=[;}])/gi)) {
    const property = (m[1] ?? '').toLowerCase()
    const raw = (m[2] ?? '').trim()
    if (property.startsWith('--')) continue // las variables se revisan donde se usan
    const line = lineAt(text, (m.index ?? 0) + (m[0].length - (m[2] ?? '').length))
    if (allowed.has(line)) continue
    const value = withoutVars(raw)
    const report = (message: string) => problems.push({ line, property, value: raw, message })

    if (COLOR_PROPERTY.test(property)) {
      if (LITERAL_COLOR.test(value)) report('color literal: usar un token --md-sys-color-*')
      else {
        // Los nombres de función (color-mix, calc…) no son colores; las funciones de color
        // literal (rgb, hsl…) ya se detectaron arriba.
        const words = value
          .replace(/[a-z-]+\(/gi, ' ')
          .split(/[\s,()/]+/)
          .filter((w) => /^[a-z-]+$/i.test(w))
          .map((w) => w.toLowerCase())
        const bad = words.find((w) => !ALLOWED_COLOR_KEYWORDS.has(w) && !NON_COLOR_WORDS.has(w))
        if (bad) report(`color con nombre "${bad}": usar un token --md-sys-color-* o un color del sistema`)
      }
    }

    if (MOTION_PROPERTY.test(property)) {
      const d = value.match(LITERAL_DURATION)
      if (d && Number(d[2]) !== 0) report('duración literal: usar un token --md-sys-motion-*')
      if (LITERAL_EASING.test(value)) report('curva literal: usar un token --md-sys-motion-*-easing')
    }

    if (TYPOGRAPHY_PROPERTY.test(property)) {
      const rest = value.replace(/\b(inherit|initial|unset|revert|normal)\b/gi, '').trim()
      if (rest) report('tipografía literal: usar un token --md-sys-typescale-*')
    }
  }
  return problems
}
