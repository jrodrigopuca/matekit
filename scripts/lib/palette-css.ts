// CSS de un esquema de color: los 49 roles con light-dark() y sus tres niveles de contraste,
// elegibles con data-palette y data-contrast (ADR-0008). Junto con color-schemes.ts y css.ts
// forma el generador que se publicará como @matekit/theme (ADR-0009): no depende de React,
// de los componentes ni de los archivos de tokens/.

import { block, type Decl } from './css.ts'
import { CONTRAST_LEVELS, type ContrastSchemes, type SchemePair } from './color-schemes.ts'

/** Orden de capas de matekit; cada archivo de paleta lo declara (ADR-0005, ADR-0008). */
export const LAYER_ORDER = '@layer matekit.tokens, matekit.palettes, matekit.atoms, matekit.components;'

// Cada rol se escribe una vez con light-dark(claro, oscuro): el navegador elige según el
// color-scheme del elemento donde se usa la variable, que se hereda. :root sigue al sistema
// (light dark) y data-theme lo fija en cualquier elemento, así que un data-theme anidado
// funciona aunque las variables vengan de más arriba.
const colorDecls = ({ light, dark }: SchemePair): Decl[] =>
  Object.keys(light).map((role) => {
    const l = light[role] ?? ''
    const d = dark[role] ?? ''
    return [`--md-sys-color-${role}`, l === d ? l : `light-dark(${l}, ${d})`] as const
  })

/**
 * Reglas de un esquema para los selectores dados. Paleta y contraste se eligen con
 * data-palette y data-contrast, en cualquier elemento:
 * - nivel estándar: el selector de la paleta;
 * - otro nivel: data-contrast en el mismo elemento que la paleta, en un ancestro o en un
 *   descendiente (este último vuelve a declarar los roles con la paleta de arriba);
 * - prefers-contrast: more elige el nivel alto donde nadie fijó data-contrast.
 * Especificidad: el mismo elemento (0,2,0) le gana al ancestro (0,1,0, por :where); el ancestro
 * le gana al nivel estándar por orden. Límite: dos data-contrast distintos encima de la misma
 * paleta se resuelven por orden (alto > medio > estándar), no por cercanía.
 */
export function schemeRules(selectors: readonly string[], schemes: ContrastSchemes, indent: string): string {
  const parts = [block(selectors.join(`,\n${indent}`), colorDecls(schemes.standard), indent)]
  for (const level of CONTRAST_LEVELS) {
    // :root no tiene ancestros: se omite la regla del ancestro.
    const sel = selectors.flatMap((s) => [
      `${s}[data-contrast="${level}"]`,
      ...(s === ':root' ? [] : [`:where([data-contrast="${level}"]) ${s}`]),
      `${s} [data-contrast="${level}"]`,
    ])
    parts.push(block(sel.join(`,\n${indent}`), colorDecls(schemes[level]), indent))
  }
  const auto = `:is(${selectors.join(', ')}):not([data-contrast], [data-contrast] *)`
  parts.push(
    `${indent}@media (prefers-contrast: more) {\n` +
      block(auto, colorDecls(schemes.high), `${indent}  `) +
      `${indent}}\n`,
  )
  return parts.join('\n')
}

/**
 * Cuerpo del archivo de una paleta opcional: en la capa matekit.palettes, que va después de
 * matekit.tokens, así le gana al esquema base sin importar el orden en que se importe.
 */
export function paletteCss(name: string, schemes: ContrastSchemes): string {
  return (
    `/* Uso: importar este archivo y poner data-palette="${name}" en cualquier elemento. */\n\n` +
    `${LAYER_ORDER}\n\n@layer matekit.palettes {\n` +
    schemeRules([`[data-palette="${name}"]`], schemes, '  ') +
    '}\n'
  )
}
