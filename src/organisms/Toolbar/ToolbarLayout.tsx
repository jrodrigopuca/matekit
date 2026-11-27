// Parte universal de Toolbar (ADR-0003, ADR-0027): sin estado, efectos ni eventos; no lleva
// 'use client'. Ubica una Toolbar floating con su FAB acompañante, como las variantes con
// `floatingActionButton` de `HorizontalFloatingToolbar` y `VerticalFloatingToolbar` de Compose
// (FloatingToolbar.kt): las dos piezas en fila (o en columna, con la vertical) a 8 de distancia
// (`FloatingToolbarFabTokens.BetweenSpace`), centradas en el otro eje, con la posición, el margen y
// las zonas seguras que la barra tendría sola. El FAB va donde se lo escriba: después de la barra,
// al final (lo que Compose hace por defecto), o antes, al principio.
//
// El FAB no es parte de la barra: es su propia parada de Tab, después (o antes) de la de la barra,
// como en Compose, que lo deja fuera de la fila de la barra. Con `scrollBehavior="exit-always"` en
// la Toolbar, se esconde el conjunto (lo que Compose recomienda para la barra centrada con FAB).

import type { HTMLAttributes, ReactNode, Ref } from 'react'
import { cx } from '../../internal/interactive.tsx'

export interface ToolbarLayoutProps extends HTMLAttributes<HTMLDivElement> {
  /** Una `Toolbar` floating y un `Fab` (el tamaño `sm`, de 56, como Compose con la barra expandida). */
  children?: ReactNode
  ref?: Ref<HTMLDivElement> | undefined
}

/**
 * Una Toolbar floating con un FAB al lado. Va donde iría la barra sola: último hijo del contenedor
 * que se desplaza (horizontal) o primero (vertical).
 *
 * ```tsx
 * <ToolbarLayout>
 *   <Toolbar label="Edición" scrollBehavior="exit-always">…</Toolbar>
 *   <Fab label="Nuevo" variant="secondary-container"><AddIcon /></Fab>
 * </ToolbarLayout>
 * ```
 */
export function ToolbarLayout({ className, children, ...rest }: ToolbarLayoutProps) {
  return (
    <div {...rest} className={cx('mk-toolbar-layout', className)}>
      {children}
    </div>
  )
}
