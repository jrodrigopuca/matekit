// Revisa que el CSS de los componentes use tokens para color, movimiento, tipografía y, salvo en
// los archivos pendientes de migración, espaciado (ADR-0016).
// Uso: pnpm lint:css   (falla con código 1 si encuentra valores escritos a mano)

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { lintCss } from './lib/lint-css.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIRS = ['src/atoms', 'src/molecules', 'src/organisms']

// Archivos escritos antes de la escala de espaciado (ítem 13 del plan, 2026-11-25), con gap,
// padding o margin en px. Se revisan igual en color, movimiento y tipografía; el espaciado queda
// pendiente de migrar (docs/plan/README.md). La lista solo se achica: un archivo nuevo no entra, y
// si uno de estos ya no tiene espaciado literal, el lint pide sacarlo.
const SPACING_PENDING = new Set([
  'src/atoms/Divider/divider.css',
  'src/molecules/Badge/badge.css',
  'src/molecules/Card/card.css',
  'src/molecules/Checkbox/checkbox.css',
  'src/molecules/RadioButton/radio-button.css',
  'src/molecules/Slider/slider.css',
  'src/molecules/Switch/switch.css',
  'src/molecules/TextField/text-field.css',
  'src/organisms/Dialog/dialog.css',
  'src/organisms/Menu/menu.css',
  'src/organisms/NavigationBar/navigation-bar.css',
  'src/organisms/NavigationRail/navigation-rail.css',
])

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return cssFiles(path)
    return name.endsWith('.css') ? [path] : []
  })
}

const files = DIRS.flatMap((d) => cssFiles(join(root, d)))
let count = 0
for (const file of files) {
  const name = relative(root, file)
  const css = readFileSync(file, 'utf8')
  const pending = SPACING_PENDING.has(name)
  for (const p of lintCss(css, { spacing: !pending })) {
    count++
    console.error(`${name}:${p.line}  ${p.property}: ${p.value}\n  → ${p.message}`)
  }
  if (pending && lintCss(css, { spacing: true }).length === lintCss(css).length) {
    count++
    console.error(`${name}\n  → ya no tiene espaciado literal: sacarlo de SPACING_PENDING en scripts/lint-css.ts`)
  }
}
for (const name of SPACING_PENDING) {
  if (!files.some((f) => relative(root, f) === name)) {
    count++
    console.error(`${name}\n  → no existe: sacarlo de SPACING_PENDING en scripts/lint-css.ts`)
  }
}

if (count > 0) {
  console.error(`\n${count} problema(s) en el CSS de los componentes.`)
  process.exit(1)
}
console.log(
  `CSS de componentes sin valores literales (${files.length} archivos; ${SPACING_PENDING.size} con el espaciado pendiente de migrar).`,
)
