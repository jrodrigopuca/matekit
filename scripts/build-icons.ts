// Genera src/icons/icons.tsx a partir de icons/icons.json e icons/material-symbols.json.
// Uso: pnpm icons   (sin conexión; para cambiar la lista: editar icons.json y pnpm icons:fetch)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

interface IconList {
  groups: Record<string, string[]>
}
interface Paths {
  $source: string
  viewBox: string
  icons: Record<string, { outline: string; fill: string; outlineN25: string; fillN25: string }>
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = <T>(file: string): T => JSON.parse(readFileSync(join(root, 'icons', file), 'utf8')) as T
const list = read<IconList>('icons.json')
const paths = read<Paths>('material-symbols.json')

// snake_case -> PascalCase + "Icon": more_vert -> MoreVertIcon
const componentName = (name: string): string =>
  name
    .split('_')
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join('') + 'Icon'

const quote = (d: string) => `'${d}'`
// Trazo según `filled`; si el relleno es igual al contorno, un solo valor.
const pick = (outline: string, fill: string) => (fill === outline ? quote(outline) : `filled ? ${quote(fill)} : ${quote(outline)}`)

const blocks: string[] = []
const index: string[] = []
for (const [group, names] of Object.entries(list.groups)) {
  for (const name of names) {
    const icon = paths.icons[name]
    if (!icon) throw new Error(`Falta el trazo de "${name}": correr pnpm icons:fetch`)
    const component = componentName(name)
    const fillable = icon.fill !== icon.outline
    index.push(`  { name: '${name}', component: ${component}, group: '${group}', fillable: ${fillable} },`)
    const doc = fillable
      ? `/** Material Symbols "${name}". Con \`filled\`, la versión rellena (estado activo o seleccionado). */`
      : `/** Material Symbols "${name}". No tiene versión rellena distinta: \`filled\` no lo cambia. */`
    const args = fillable ? '{ filled = false, ...props }' : '{ filled: _filled, ...props }'
    blocks.push(`${doc}
export function ${component}(${args}: FillableIconProps) {
  return (
    <Icon {...props}>
      <svg viewBox={VIEWBOX} focusable="false">
        <path className="mk-icon-grade-0" d={${pick(icon.outline, icon.fill)}} />
        <path className="mk-icon-grade-n25" d={${pick(icon.outlineN25, icon.fillN25)}} />
      </svg>
    </Icon>
  )
}`)
  }
}

const source = `// Generado por scripts/build-icons.ts. No editar a mano.
// Fuente: ${paths.$source}
// Componentes universales (ADR-0003): sin 'use client'.
//
// Cada icono trae dos trazos: grado 0 y grado -25. icon.css muestra uno u otro con
// light-dark(), según el tema del elemento (color-scheme): la guía de Material pide grado -25
// para iconos claros sobre fondo oscuro, que si no se ven más gruesos (ADR-0006).

import type { ComponentType } from 'react'
import { Icon, type IconProps } from '../atoms/Icon/Icon.tsx'

const VIEWBOX = '${paths.viewBox}'

export interface FillableIconProps extends IconProps {
  /**
   * Versión rellena del icono, para el estado activo o seleccionado (destino actual de una
   * barra de navegación, toggle seleccionado). En los iconos sin superficie que rellenar
   * (\`fillable: false\` en \`ICONS\`), no cambia nada.
   */
  filled?: boolean | undefined
}

${blocks.join('\n\n')}

/** Lista de los iconos incluidos, para catálogos y pruebas. */
export const ICONS: ReadonlyArray<{
  name: string
  component: ComponentType<FillableIconProps>
  group: string
  fillable: boolean
}> = [
${index.join('\n')}
]
`

mkdirSync(join(root, 'src', 'icons'), { recursive: true })
writeFileSync(join(root, 'src', 'icons', 'icons.tsx'), source)
console.log(`Generados ${index.length} iconos en src/icons/icons.tsx`)
