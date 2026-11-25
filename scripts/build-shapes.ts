// Genera las 35 formas decorativas de Material 3 Expressive (ADR-0011) con la portación de
// androidx.graphics.shapes de scripts/lib/shapes/:
// - shapes/material-shapes.json: el contorno SVG de cada forma, en un viewBox de 0 a 100;
// - src/atoms/Shape/shapes.ts: el tipo con los nombres y la lista para catálogos (SHAPES);
// - src/atoms/Shape/shape-masks.css: la máscara de cada forma, para el átomo Shape.
// Uso: pnpm shapes   (sin conexión; determinista: dos corridas dan los mismos archivos)

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MATERIAL_SHAPES, type MaterialShapeName } from './lib/shapes/MaterialShapes.ts'
import { fitToSquare, toSvgPathData } from './lib/shapes/svg.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const SOURCE =
  'androidx/androidx@b842c5b3a5, compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/MaterialShapes.kt'
/** Lado del viewBox. */
const SIZE = 100
/**
 * Decimales de las coordenadas. Con 2, el error es de 0,005 unidades: 0,005 % del lado, menos de
 * 0,1 px hasta en una forma de 2000 px. Con 1 llegaría a 0,5 px en una de 1000 px (visible en
 * una imagen grande en pantallas de alta densidad); con 3, los contornos pesan un 17 % más sin
 * diferencia visible.
 */
const PRECISION = 2

/** Las 35 formas en el orden del "Shape Set" del kit (03-tokens.md), con su etiqueta. */
const KIT_ORDER: ReadonlyArray<[MaterialShapeName, string]> = [
  ['Circle', 'Circle'],
  ['Square', 'Square'],
  ['Slanted', 'Slanted'],
  ['Arch', 'Arch'],
  ['Fan', 'Fan'],
  ['Arrow', 'Arrow'],
  ['SemiCircle', 'Semicircle'],
  ['Oval', 'Oval'],
  ['Pill', 'Pill'],
  ['Triangle', 'Triangle'],
  ['Diamond', 'Diamond'],
  ['ClamShell', 'Clamshell'],
  ['Pentagon', 'Pentagon'],
  ['Gem', 'Gem'],
  ['VerySunny', 'Very sunny'],
  ['Sunny', 'Sunny'],
  ['Cookie4Sided', '4-sided cookie'],
  ['Cookie6Sided', '6-sided cookie'],
  ['Cookie7Sided', '7-sided cookie'],
  ['Cookie9Sided', '9-sided cookie'],
  ['Cookie12Sided', '12-sided cookie'],
  ['Ghostish', 'Ghost-ish'],
  ['Clover4Leaf', '4-leaf clover'],
  ['Clover8Leaf', '8-leaf clover'],
  ['Burst', 'Burst'],
  ['SoftBurst', 'Soft burst'],
  ['Boom', 'Boom'],
  ['SoftBoom', 'Soft boom'],
  ['Flower', 'Flower'],
  ['Puffy', 'Puffy'],
  ['PuffyDiamond', 'Puffy diamond'],
  ['PixelCircle', 'Pixel circle'],
  ['PixelTriangle', 'Pixel triangle'],
  ['Bun', 'Bun'],
  ['Heart', 'Heart'],
]

const missing = Object.keys(MATERIAL_SHAPES).filter((k) => !KIT_ORDER.some(([c]) => c === k))
if (missing.length || KIT_ORDER.length !== Object.keys(MATERIAL_SHAPES).length) {
  throw new Error(`El orden del kit no coincide con MaterialShapes: ${missing.join(', ')}`)
}

/** PascalCase de Compose -> kebab-case: Cookie9Sided -> cookie-9-sided, ClamShell -> clam-shell. */
const kebab = (name: string) =>
  name
    .replace(/([a-z])([A-Z0-9])/g, '$1-$2')
    .replace(/([0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()

const shapes = KIT_ORDER.map(([compose, label]) => ({
  name: kebab(compose),
  compose,
  label,
  path: toSvgPathData(fitToSquare(MATERIAL_SHAPES[compose](), SIZE), PRECISION),
}))

const viewBox = `0 0 ${SIZE} ${SIZE}`

// --- shapes/material-shapes.json ---
const json = {
  $source: SOURCE,
  $license: 'Apache-2.0 (geometría de androidx.graphics.shapes y MaterialShapes.kt, The Android Open Source Project)',
  $generator: 'scripts/build-shapes.ts',
  viewBox,
  precision: PRECISION,
  shapes,
}
mkdirSync(join(root, 'shapes'), { recursive: true })
writeFileSync(join(root, 'shapes', 'material-shapes.json'), JSON.stringify(json, null, 2) + '\n')

// --- src/atoms/Shape/shapes.ts ---
const ts = `// Generado por scripts/build-shapes.ts. No editar a mano.
// Fuente: ${SOURCE}

/** Nombre de una de las 35 formas decorativas de Material 3 Expressive. */
export type ShapeName =
${shapes.map((s) => `  | '${s.name}'`).join('\n')}

/** Las 35 formas, en el orden del kit, con su nombre en el kit y en Compose (catálogos y pruebas). */
export const SHAPES: ReadonlyArray<{ name: ShapeName; label: string; compose: string }> = [
${shapes.map((s) => `  { name: '${s.name}', label: '${s.label}', compose: '${s.compose}' },`).join('\n')}
]
`
mkdirSync(join(root, 'src', 'atoms', 'Shape'), { recursive: true })
writeFileSync(join(root, 'src', 'atoms', 'Shape', 'shapes.ts'), ts)

// --- src/atoms/Shape/shape-masks.css ---
// SVG sin colores: el trazo se rellena con el negro opaco por defecto, que en una máscara
// (mask-mode: match-source -> alpha) deja ver el contenido. preserveAspectRatio='none' estira la
// forma al tamaño del elemento, como Compose escala x e y por separado.
const dataUrl = (d: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${viewBox}' preserveAspectRatio='none'><path d='${d}'/></svg>`,
  )
    // Lo que no hace falta escapar dentro de url("…"), para que pese menos y se pueda leer.
    .replace(/%20/g, ' ')
    .replace(/%2C/g, ',')
    .replace(/%2F/g, '/')
    .replace(/%3A/g, ':')
    .replace(/%3D/g, '=')
    .replace(/%27/g, "'")}")`

const css = `/* Generado por scripts/build-shapes.ts. No editar a mano.
   Fuente: ${SOURCE}
   La máscara de cada forma, en --_shape-mask; shape.css la aplica. */

@layer matekit.atoms {
${shapes.map((s) => `  .mk-shape[data-shape='${s.name}'] {\n    --_shape-mask: ${dataUrl(s.path)};\n  }`).join('\n')}
}
`
writeFileSync(join(root, 'src', 'atoms', 'Shape', 'shape-masks.css'), css)

const bytes = shapes.reduce((sum, s) => sum + s.path.length, 0)
console.log(`Generadas ${shapes.length} formas (${(bytes / 1024).toFixed(1)} KiB de contornos, ${PRECISION} decimales)`)
