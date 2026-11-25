// Genera las 35 formas decorativas de Material 3 Expressive (ADR-0011) con la portación de
// androidx.graphics.shapes de scripts/lib/shapes/:
// - shapes/material-shapes.json: el contorno SVG de cada forma, en un viewBox de 0 a 100;
// - src/atoms/Shape/shapes.ts: el tipo con los nombres y la lista para catálogos (SHAPES);
// - src/shapes.css: la máscara de cada forma, para el átomo Shape. Es una hoja opcional (se
//   importa aparte de styles.css, como las paletas): pesa unos 30 KB y no todos usan formas;
// - src/molecules/LoadingIndicator/loading-indicator-data.ts: los contornos y tiempos SMIL del
//   indicador de carga (scripts/lib/shapes/LoadingIndicator.ts), los 7 pasos quietos y los dos
//   contornos del determinado;
// - src/molecules/ProgressIndicator/circular-wavy-data.ts: la pista y la onda del indicador de
//   progreso circular ondulado (scripts/lib/shapes/CircularWavyProgress.ts).
// Uso: pnpm shapes   (sin conexión; determinista: dos corridas dan los mismos archivos)

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MATERIAL_SHAPES, type MaterialShapeName } from './lib/shapes/MaterialShapes.ts'
import { fitToSquare, toSvgPathData } from './lib/shapes/svg.ts'
import {
  ContainerSize,
  GlobalRotationDurationMillis,
  IndeterminateShapes,
  MorphIntervalMillis,
  ViewBoxSide,
  buildDeterminate,
  buildIndeterminateAnimation,
  buildSteps,
  composeFrameAt,
  maxPointDistance,
  morphDurationMillis,
  smilFrameAt,
} from './lib/shapes/LoadingIndicator.ts'
import { circularPath, circularPolygons, pathLength, radialRange, vertexCount, Wavelength } from './lib/shapes/CircularWavyProgress.ts'
import type { PathCommand } from './lib/shapes/ShapeUtil.ts'

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

// --- src/shapes.css (hoja opcional) ---
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

// Declara el orden de capas completo, como las paletas: así se puede importar antes o después de
// styles.css sin cambiar a qué capa pertenece.
const LAYER_ORDER = '@layer matekit.tokens, matekit.palettes, matekit.atoms, matekit.components;'
const css = `/* Generado por scripts/build-shapes.ts. No editar a mano.
   Fuente: ${SOURCE}
   Hoja opcional de las formas decorativas (ADR-0011): importarla, además de styles.css, para
   usar el átomo Shape. Define la máscara de cada forma en --_shape-mask; shape.css la aplica.
   Sin esta hoja, Shape no recorta: muestra su contenido completo. */

${LAYER_ORDER}

@layer matekit.atoms {
${shapes.map((s) => `  .mk-shape[data-shape='${s.name}'] {\n    --_shape-mask: ${dataUrl(s.path)};\n  }`).join('\n')}
}
`
writeFileSync(join(root, 'src', 'shapes.css'), css)

const bytes = shapes.reduce((sum, s) => sum + s.path.length, 0)
console.log(`Generadas ${shapes.length} formas (${(bytes / 1024).toFixed(1)} KiB de contornos, ${PRECISION} decimales)`)

// --- src/molecules/LoadingIndicator/loading-indicator-data.ts ---
const LI_SOURCE =
  'androidx/androidx@b842c5b3a5, compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/LoadingIndicator.kt'
const anim = buildIndeterminateAnimation()
const steps = buildSteps()
const determinate = buildDeterminate()
// Error de los fotogramas de SMIL frente a la animación de Compose, cada 0,5 ms de un ciclo. Se
// excluye el milisegundo del salto de 1,09 a 1 (Compose lo hace en un fotograma y SMIL en el
// relevo de un contorno al siguiente).
let maxError = 0
for (let ms = 0; ms < anim.cycleMs; ms += 0.5) {
  const local = ms % MorphIntervalMillis
  if (Math.abs(local - morphDurationMillis()) < 1) continue
  maxError = Math.max(maxError, maxPointDistance(composeFrameAt(ms), smilFrameAt(anim, ms)))
}
const q = (v: string) => `'${v}'`
const liTs = `// Generado por scripts/build-shapes.ts. No editar a mano.
// Fuente: ${LI_SOURCE}
// Geometría de androidx.graphics.shapes (Morph) y MaterialShapes.kt: Apache-2.0, The Android Open
// Source Project. Cómo se calcula: scripts/lib/shapes/LoadingIndicator.ts (ADR-0011).
//
// Unidades: viewBox de ${ViewBoxSide} centrado en el origen (10 por dp del contenedor de ${ContainerSize}).
// Error máximo de los fotogramas frente a Compose: ${(maxError / 10).toFixed(2).replace('.', ',')} dp.

/** viewBox del indicador. */
export const VIEW_BOX = '${-ViewBoxSide / 2} ${-ViewBoxSide / 2} ${ViewBoxSide} ${ViewBoxSide}'

/** Una vuelta entera, lineal (GlobalRotationDurationMillis). */
export const GLOBAL_ROTATION_MS = ${GlobalRotationDurationMillis}

/** Un cambio de forma (MorphIntervalMillis) y el ciclo de las ${IndeterminateShapes.length} transiciones. */
export const MORPH_MS = ${MorphIntervalMillis}
export const CYCLE_MS = ${anim.cycleMs}

/** El giro de cada cambio de forma, de 0 a 90° con el resorte (se suma en cada repetición). */
export const MORPH_ROTATION = {
  values: ${q(anim.morphRotation.values)},
  keyTimes: ${q(anim.morphRotation.keyTimes)},
  keySplines: ${q(anim.morphRotation.keySplines)},
} as const

/** Tiempos de los contornos y de su visibilidad (los mismos para las ${anim.shapes.length} transiciones). */
export const SHAPE_KEY_TIMES = ${q(anim.shapeKeyTimes)}
export const SHAPE_KEY_SPLINES = ${q(anim.shapeKeySplines)}
export const VISIBILITY_KEY_TIMES = ${q(anim.visibilityKeyTimes)}

/**
 * Una transición por forma (${IndeterminateShapes.join(' → ')} → ${IndeterminateShapes[0]}): su
 * desfase y los cuatro contornos, todos con la misma estructura de comandos.
 */
export const TRANSITIONS: ReadonlyArray<{ begin: string; values: string }> = [
${anim.shapes.map((t) => `  {\n    begin: ${q(t.begin)},\n    values:\n      ${q(t.values.join(';'))},\n  },`).join('\n')}
]

/** Los ${steps.length} pasos quietos, en orden, con el giro con que se ven en la animación. */
export const STEPS: readonly string[] = [
${steps.map((d) => `  ${q(d)},`).join('\n')}
]

/**
 * El indicador determinado (Circle girado 18° → SoftBurst): el contorno de inicio y de fin, sin
 * centrar, como lista plana (x e y del moveTo y seis números por curva).
 */
export const DETERMINATE: { readonly start: readonly number[]; readonly end: readonly number[] } = {
  start: [${determinate.start.join(', ')}],
  end: [${determinate.end.join(', ')}],
}
`
mkdirSync(join(root, 'src', 'molecules', 'LoadingIndicator'), { recursive: true })
writeFileSync(join(root, 'src', 'molecules', 'LoadingIndicator', 'loading-indicator-data.ts'), liTs)
const transitionBytes = anim.shapes.reduce((sum, t) => sum + t.values.join(';').length, 0)
console.log(
  `Indicador de carga: ${anim.shapes.length} transiciones (${(transitionBytes / 1024).toFixed(1)} KiB de contornos), ` +
    `error máximo frente a Compose ${(maxError / 10).toFixed(3)} dp`,
)

// --- src/molecules/ProgressIndicator/circular-wavy-data.ts ---
// Contornos del indicador de progreso circular ondulado (scripts/lib/shapes/CircularWavyProgress.ts).
// En los dos grosores, el contorno se escala a size - stroke = 44 (48 - 4 y 52 - 8) y tiene los
// mismos vértices, así que alcanza con un juego de contornos.
const CW_SOURCE =
  'androidx/androidx@acea2f5c1f, compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/internal/CircularWavyProgressModifiers.kt'
const CW_SCALE = 44
const cwVertices = vertexCount(48, 4)
if (cwVertices !== vertexCount(52, 8)) throw new Error('los dos grosores del circular ondulado deberían tener los mismos vértices')
const cw = circularPolygons(cwVertices)
const cwTrack = circularPath(cw.track.cubics, CW_SCALE)
const cwFlat = circularPath(cw.morph.asCubics(0), CW_SCALE)
const cwWave = circularPath(cw.morph.asCubics(1), CW_SCALE)
// Siempre `C` (sin la `L` de toSvgPathData): la onda y su versión plana tienen que tener los mismos
// comandos para que la propiedad CSS `d` las interpole.
const cubicPathData = (commands: readonly PathCommand[]) => {
  const n = (v: number) => {
    const s = String(Number(v.toFixed(PRECISION)))
    return s === '-0' ? '0' : s
  }
  return commands
    .map((c) =>
      c.type === 'M'
        ? `M${n(c.x)} ${n(c.y)}`
        : c.type === 'C'
          ? `C${[c.x1, c.y1, c.x2, c.y2, c.x, c.y].map(n).join(' ')}`
          : 'Z',
    )
    .join('')
}
const [waveMin, waveMax] = radialRange(cwWave)
const [trackMin, trackMax] = radialRange(cwTrack)
const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',')
const cwTs = `// Generado por scripts/build-shapes.ts. No editar a mano.
// Fuente: ${CW_SOURCE}
// Geometría de androidx.graphics.shapes (RoundedPolygon.circle, RoundedPolygon.star y Morph):
// Apache-2.0, The Android Open Source Project. Cómo se calcula:
// scripts/lib/shapes/CircularWavyProgress.ts (ADR-0011).
//
// Unidades: dp, centrado en el origen, escalado a ${CW_SCALE} (size - stroke en 48 × 48 con trazo 4 y en
// 52 × 52 con trazo 8). Los contornos empiezan a las 12 y van en sentido horario.
// Pista: radio ${fmt(trackMin)} a ${fmt(trackMax)}. Onda: radio ${fmt(waveMin)} a ${fmt(waveMax)} (amplitud ${fmt((waveMax - waveMin) / 2)} dp).

/** Vértices (ondas) del contorno: 2π · 22 / ${Wavelength} redondeado (CircularShapes.update). */
export const WAVE_VERTICES = ${cwVertices}

/** Pista: el círculo de ${cwVertices} vértices (trackPolygon). */
export const TRACK_PATH = '${cubicPathData(cwTrack)}'

/** Largo de la pista, en dp: convierte la separación (en dp) a la fracción del trazo. */
export const TRACK_LENGTH = ${pathLength(cwTrack).toFixed(3)}

/** Indicador sin onda: el Morph círculo → estrella en 0 (misma estructura que WAVE_PATH). */
export const FLAT_PATH = '${cubicPathData(cwFlat)}'

/** Indicador con onda: el Morph en 1, la estrella de ${cwVertices} puntas. */
export const WAVE_PATH = '${cubicPathData(cwWave)}'
`
mkdirSync(join(root, 'src', 'molecules', 'ProgressIndicator'), { recursive: true })
writeFileSync(join(root, 'src', 'molecules', 'ProgressIndicator', 'circular-wavy-data.ts'), cwTs)
console.log(
  `Progreso circular ondulado: ${cwVertices} ondas, amplitud ${((waveMax - waveMin) / 2).toFixed(2)} dp, ` +
    `pista de ${pathLength(cwTrack).toFixed(1)} dp`,
)
