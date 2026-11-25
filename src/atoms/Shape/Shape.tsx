// Átomo universal (ADR-0003): sin estado, efectos, contexto ni eventos; no lleva 'use client'.
// La forma es CSS: la hoja opcional src/shapes.css (generada con pnpm shapes, ADR-0011) define
// la máscara de cada forma y shape.css la aplica. Hay que importarla además de styles.css:
// `import '@matekit/react/styles.css'` y `import '@matekit/react/shapes.css'`.

import type { HTMLAttributes, Ref } from 'react'
import type { ShapeName } from './shapes.ts'

export interface ShapeProps extends HTMLAttributes<HTMLDivElement> {
  /** Una de las 35 formas decorativas de Material 3 Expressive (`SHAPES` las lista). */
  shape: ShapeName
  /** Referencia al `<div>`. */
  ref?: Ref<HTMLDivElement> | undefined
}

/**
 * Recorta su contenido (una imagen, un fondo de color, un icono) con una de las formas
 * decorativas de Material 3 Expressive. La forma se estira al tamaño del elemento, como en
 * Compose: en un elemento cuadrado se ve como en el kit.
 *
 * El recorte es visual: el área que recibe el puntero sigue siendo el rectángulo del elemento.
 * Es decoración: para una imagen con significado, el `alt` va en la imagen.
 *
 * ```tsx
 * <Shape shape="cookie-9-sided" style={{ width: 96, height: 96 }}><img src="…" alt="Ana" /></Shape>
 * <Shape shape="sunny" className="icon-bg"><StarIcon /></Shape>
 * ```
 */
export function Shape({ shape, className, children, ...props }: ShapeProps) {
  return (
    <div {...props} className={className ? `mk-shape ${className}` : 'mk-shape'} data-shape={shape}>
      {children}
    </div>
  )
}
