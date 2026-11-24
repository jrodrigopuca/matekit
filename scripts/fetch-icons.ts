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
  filled: string[]
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const list = JSON.parse(readFileSync(join(root, 'icons', 'icons.json'), 'utf8')) as IconList
const base = `https://raw.githubusercontent.com/google/material-design-icons/${list.commit}/symbols/web`

async function fetchPath(name: string, fill: boolean): Promise<string> {
  const file = `${name}${fill ? '_fill1' : ''}_24px.svg`
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
const icons: Record<string, { outline: string; fill?: string }> = {}
for (const name of names) {
  const outline = await fetchPath(name, false)
  icons[name] = list.filled.includes(name) ? { outline, fill: await fetchPath(name, true) } : { outline }
}

writeFileSync(
  join(root, 'icons', 'material-symbols.json'),
  JSON.stringify(
    {
      $source: `google/material-design-icons@${list.commit}, symbols/web/<nombre>/${list.style}/<nombre>[_fill1]_24px.svg. Licencia Apache-2.0.`,
      viewBox: '0 -960 960 960',
      icons,
    },
    null,
    2,
  ) + '\n',
)
console.log(`Descargados ${names.length} iconos (${list.filled.length} con versión rellena).`)
