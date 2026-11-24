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
  icons: Record<string, { outline: string; fill?: string }>
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

const blocks: string[] = []
const index: string[] = []
for (const [group, names] of Object.entries(list.groups)) {
  for (const name of names) {
    const icon = paths.icons[name]
    if (!icon) throw new Error(`Falta el trazo de "${name}": correr pnpm icons:fetch`)
    const component = componentName(name)
    index.push(`  { name: '${name}', component: ${component}, group: '${group}', fillable: ${Boolean(icon.fill)} },`)
    if (icon.fill) {
      blocks.push(`/** Material Symbols "${name}". Con \`filled\`, la versión rellena. */
export function ${component}({ filled = false, ...props }: FillableIconProps) {
  return (
    <Icon {...props}>
      <svg viewBox={VIEWBOX} focusable="false">
        <path d={filled ? '${icon.fill}' : '${icon.outline}'} />
      </svg>
    </Icon>
  )
}`)
    } else {
      blocks.push(`/** Material Symbols "${name}". */
export function ${component}(props: IconProps) {
  return (
    <Icon {...props}>
      <svg viewBox={VIEWBOX} focusable="false">
        <path d="${icon.outline}" />
      </svg>
    </Icon>
  )
}`)
    }
  }
}

const source = `// Generado por scripts/build-icons.ts. No editar a mano.
// Fuente: ${paths.$source}
// Componentes universales (ADR-0003): sin 'use client'.

import type { ComponentType } from 'react'
import { Icon, type IconProps } from '../atoms/Icon/Icon.tsx'

const VIEWBOX = '${paths.viewBox}'

export interface FillableIconProps extends IconProps {
  /** Versión rellena del icono (por ejemplo, para un toggle seleccionado). */
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
