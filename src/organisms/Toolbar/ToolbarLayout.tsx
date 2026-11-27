'use client'
// Parte de Toolbar (ADR-0027) que ubica una Toolbar floating con su FAB acompañante, como las
// variantes con `floatingActionButton` de `HorizontalFloatingToolbar` y `VerticalFloatingToolbar` de
// Compose (FloatingToolbar.kt): las dos piezas en fila (o en columna, con la vertical) a 8 de
// distancia (`FloatingToolbarFabTokens.BetweenSpace`), centradas en el otro eje, con la posición, el
// margen y las zonas seguras que la barra tendría sola. El FAB va donde se lo escriba: después de la
// barra, al final (lo que Compose hace por defecto), o antes, al principio.
//
// Es cliente (excepción al ADR-0003) por el estado `expanded` (controlado o no, como el resto de la
// librería): contraída, la barra se encoge hacia el FAB y el FAB crece de 56 a 80 (`FabSizeRange`),
// con FastSpatial (`FloatingToolbarDefaults.animationSpec`). La barra lee el estado por contexto y
// queda inerte mientras está contraída (sin paradas de Tab ni lectura); el FAB sigue accesible.
//
// El FAB no es parte de la barra: es su propia parada de Tab, como en Compose, que lo deja fuera de
// la fila. Con `scrollBehavior="exit-always"` en la Toolbar se esconde el conjunto (lo que Compose
// recomienda para la barra centrada); con `"collapse"`, se contrae al bajar y se expande al subir (lo
// que recomienda para la barra a un costado).
//
// Docked con FAB: no existe. Ni el kit (configuraciones Docked y Floating, sin FAB en la docked) ni
// `FlexibleBottomAppBar` de Compose (AppBar.kt, sin parámetro de FAB; el `BottomAppBar` con
// `floatingActionButton` es el Bottom app bar que la docked reemplaza) lo definen. Para una barra con
// FAB, usar la floating dentro de ToolbarLayout; si hace falta la docked, el FAB va suelto, encima de
// ella, como sobre una NavigationBar.

import { createContext, useCallback, useMemo, useState, type FocusEvent, type HTMLAttributes, type ReactNode, type Ref } from 'react'
import { cx } from '../../internal/interactive.tsx'

/** Por qué se pide expandir o contraer: el desplazamiento (`scrollBehavior="collapse"`) o el foco de teclado. */
export type ToolbarLayoutExpandReason = 'scroll' | 'focus'

export interface ToolbarLayoutContextValue {
  expanded: boolean
  requestExpanded: (expanded: boolean, reason: ToolbarLayoutExpandReason) => void
}

/** Estado del ToolbarLayout para la Toolbar de adentro (no se exporta desde el índice). */
export const ToolbarLayoutContext = createContext<ToolbarLayoutContextValue | null>(null)

export interface ToolbarLayoutProps extends HTMLAttributes<HTMLDivElement> {
  /** Una `Toolbar` floating y un `Fab` (el tamaño `sm`, de 56, como Compose con la barra expandida). */
  children?: ReactNode
  /** Barra expandida (controlado). Contraída, solo se ve el FAB. */
  expanded?: boolean | undefined
  /** Barra expandida al principio (no controlado). Por defecto `true`. */
  defaultExpanded?: boolean | undefined
  /**
   * Se llama cuando el desplazamiento (`scrollBehavior="collapse"` en la Toolbar) o el foco de
   * teclado que llega al FAB con la barra contraída piden otro estado.
   */
  onExpandedChange?: ((expanded: boolean, reason: ToolbarLayoutExpandReason) => void) | undefined
  ref?: Ref<HTMLDivElement> | undefined
}

/**
 * Una Toolbar floating con un FAB al lado. Va donde iría la barra sola: último hijo del contenedor
 * que se desplaza (horizontal) o primero (vertical).
 *
 * ```tsx
 * <ToolbarLayout>
 *   <Toolbar label="Edición" scrollBehavior="collapse">…</Toolbar>
 *   <Fab label="Nuevo" variant="secondary-container"><AddIcon /></Fab>
 * </ToolbarLayout>
 * ```
 *
 * Con la barra contraída, el foco de teclado que llega al FAB la vuelve a expandir (así los botones
 * de la barra quedan a un Mayús+Tab).
 */
export function ToolbarLayout(props: ToolbarLayoutProps) {
  const { className, children, expanded: expandedProp, defaultExpanded = true, onExpandedChange, onFocus, ...rest } = props
  const [uncontrolled, setUncontrolled] = useState(defaultExpanded)
  const controlled = expandedProp !== undefined
  const expanded = controlled ? expandedProp : uncontrolled

  const requestExpanded = useCallback(
    (next: boolean, reason: ToolbarLayoutExpandReason) => {
      if (next === expanded) return
      if (!controlled) setUncontrolled(next)
      onExpandedChange?.(next, reason)
    },
    [expanded, controlled, onExpandedChange],
  )
  const context = useMemo(() => ({ expanded, requestExpanded }), [expanded, requestExpanded])

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    onFocus?.(event)
    if (!expanded && event.target.matches(':focus-visible')) requestExpanded(true, 'focus')
  }

  return (
    <ToolbarLayoutContext value={context}>
      <div
        {...rest}
        data-collapsed={expanded ? undefined : ''}
        className={cx('mk-toolbar-layout', className)}
        onFocus={handleFocus}
      >
        {children}
      </div>
    </ToolbarLayoutContext>
  )
}
