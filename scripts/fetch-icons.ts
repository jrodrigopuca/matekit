// Descarga los trazos de los iconos de icons/icons.json desde el repositorio oficial de
// Material Symbols, en el commit fijado, y los guarda en icons/material-symbols.json.
// Uso: pnpm icons:fetch   (necesita conexión; el resultado se versiona)

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

interface IconList {
  commit: string
  style: string
  groups: Record<string, string[]>
}

/** Las cuatro variantes de un icono: contorno y relleno, en grado 0 y en grado -25. */
export interface IconPaths {
  outline: string
  fill: string
  outlineN25: string
  fillN25: string
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const list = JSON.parse(readFileSync(join(root, 'icons', 'icons.json'), 'utf8')) as IconList
const base = `https://raw.githubusercontent.com/google/material-design-icons/${list.commit}/symbols/web`

// Sufijos del repositorio oficial: _fill1 (relleno), _gradN25 (grado -25) y _gradN25fill1.
async function fetchPath(name: string, suffix: '' | '_fill1' | '_gradN25' | '_gradN25fill1'): Promise<string> {
  const file = `${name}${suffix}_24px.svg`
  const url = `${base}/${name}/${list.style}/${file}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} al descargar ${url}`)
  const svg = await res.text()
  if (!svg.includes('viewBox="0 -960 960 960"')) throw new Error(`viewBox inesperado en ${file}`)
  const paths = [...svg.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1])
  if (paths.length !== 1 || !paths[0]) throw new Error(`Se esperaba un único <path> en ${file}`)
  return paths[0]
}

const names = Object.values(list.groups).flat()
const icons: Record<string, IconPaths> = {}
for (const name of names) {
  const [outline, fill, outlineN25, fillN25] = await Promise.all([
    fetchPath(name, ''),
    fetchPath(name, '_fill1'),
    fetchPath(name, '_gradN25'),
    fetchPath(name, '_gradN25fill1'),
  ])
  icons[name] = { outline, fill, outlineN25, fillN25 }
}

writeFileSync(
  join(root, 'icons', 'material-symbols.json'),
  JSON.stringify(
    {
      $source: `google/material-design-icons@${list.commit}, symbols/web/<nombre>/${list.style}/<nombre>[_gradN25][_fill1]_24px.svg (grado 0 y -25, sin relleno y relleno). Licencia Apache-2.0.`,
      viewBox: '0 -960 960 960',
      icons,
    },
    null,
    2,
  ) + '\n',
)
const distinct = names.filter((n) => icons[n]?.fill !== icons[n]?.outline).length
console.log(`Descargados ${names.length} iconos en 4 variantes (${distinct} con relleno distinto del contorno).`)
