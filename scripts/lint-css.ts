// Revisa que el CSS de los componentes use tokens para color, movimiento y tipografía.
// Uso: pnpm lint:css   (falla con código 1 si encuentra valores escritos a mano)

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { lintCss } from './lib/lint-css.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIRS = ['src/atoms', 'src/molecules', 'src/organisms']

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
  for (const p of lintCss(readFileSync(file, 'utf8'))) {
    count++
    console.error(`${relative(root, file)}:${p.line}  ${p.property}: ${p.value}\n  → ${p.message}`)
  }
}

if (count > 0) {
  console.error(`\n${count} problema(s) en el CSS de los componentes.`)
  process.exit(1)
}
console.log(`CSS de componentes sin valores literales (${files.length} archivos).`)
