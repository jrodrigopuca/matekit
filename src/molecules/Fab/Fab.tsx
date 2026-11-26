// Molécula universal (ADR-0003): sin estado, efectos, contexto ni eventos; no lleva 'use client'.
// Tamaños, colores, elevación por estado y el paso de extendido a contraído son CSS (la
// animación de ancho usa una grilla de 0fr a 1fr; ver fab.css). Contiene la onda (Ripple), que
// es un átomo cliente: un componente universal puede renderizar uno cliente, así que los FAB
// siguen sirviendo desde un Server Component (como Button).
//
// Dos componentes y no uno con `extended` (ADR-0002, nombres planos):
// - El FAB solo tiene icono y necesita `label` obligatorio como nombre accesible (como
//   IconButton). El extendido muestra su texto, que ya es el nombre, así que no lo pide.
//   Con un solo componente, que `label` sea obligatorio o no dependería de otra prop.
// - El extendido tiene `expanded`, que en el FAB no significa nada.
// Comparten CSS (fab.css), tipos de tamaño y color, y la elección del elemento.
//
// Enlaces y enrutadores (ADR-0010): con `href`, un `<a>`; sin `href`, un `<button>`; con
// `render={<Link href="/nuevo" />}`, el elemento que se pase. Un FAB suele abrir una pantalla
// ("Redactar", "Nuevo"), que en una aplicación con enrutador es un enlace. La lógica es la de
// NavigationBarItem, en el átomo Interactive.
//
// Sin `disabled`: ni el kit ni Compose definen un FAB deshabilitado (FloatingActionButton no
// tiene parámetro `enabled`). La guía de Material es ocultarlo cuando la acción no está
// disponible, no atenuarlo. Por eso la prop no está en los tipos.

import type { ReactNode } from 'react'
import { FocusRing } from '../../atoms/FocusRing/FocusRing.tsx'
import { Ripple } from '../../atoms/Ripple/Ripple.tsx'
import { StateLayer } from '../../atoms/StateLayer/StateLayer.tsx'
import {
  Interactive,
  type ButtonElementProps,
  type LinkElementProps,
  type RenderElementProps,
} from '../../atoms/Interactive/Interactive.tsx'
import { assertRenderElement, cx } from '../../internal/interactive.tsx'

/**
 * Color: contenedor `X` con icono y texto `on-X`. Los tres `*-container` son los de siempre;
 * `primary`, `secondary` y `tertiary` son los tonos más fuertes que suma Expressive.
 */
export type FabVariant =
  | 'primary-container'
  | 'secondary-container'
  | 'tertiary-container'
  | 'primary'
  | 'secondary'
  | 'tertiary'

/**
 * Tamaño de Material 3 Expressive: `sm` 56, `md` 80 y `lg` 96 px de alto. En el kit, el FAB de
 * 56 se llama "Default" y el extendido de 56, "Small"; acá los dos son `sm`, porque un extendido
 * contraído queda igual que el FAB de su tamaño. El FAB pequeño de 40 px quedó obsoleto en
 * Expressive y no se incluye.
 */
export type FabSize = 'sm' | 'md' | 'lg'

interface FabOwnProps {
  /** Color. Por defecto `primary-container`. */
  variant?: FabVariant | undefined
  /** Tamaño: 56, 80 o 96 px. Por defecto `sm` (56). */
  size?: FabSize | undefined
  /**
   * Elevación más baja (nivel 1 en reposo y 2 con el puntero, en vez de 3 y 4), para cuando el
   * FAB está sobre una superficie que ya se eleva. Viene de Compose (`loweredElevation`); el kit
   * no la trae.
   */
  lowered?: boolean | undefined
  disabled?: never
}

type WithElement<Own> =
  | (Own & Omit<LinkElementProps, keyof Own>)
  | (Own & Omit<ButtonElementProps, keyof Own | 'disabled'>)
  | (Own & Omit<RenderElementProps, keyof Own>)

interface FabContentProps extends FabOwnProps {
  /** Nombre accesible (se vuelve `aria-label`). Obligatorio: el FAB no tiene texto visible. */
  label: string
  'aria-label'?: never
  /** El icono. */
  children?: ReactNode
}

export type FabProps = WithElement<FabContentProps>

interface ExtendedFabContentProps extends FabOwnProps {
  /**
   * Con `false`, se contrae a un FAB con solo el icono; el texto se oculta animado pero sigue
   * siendo el nombre accesible. Por defecto `true`.
   */
  expanded?: boolean | undefined
  /** El icono, primero, y el texto: `<AddIcon />Crear`. */
  children?: ReactNode
}

export type ExtendedFabProps = WithElement<ExtendedFabContentProps>

/** Atributos que lee fab.css. */
const dataAttributes = (variant: FabVariant, size: FabSize, lowered?: boolean, expanded?: boolean) => ({
  'data-variant': variant,
  'data-size': size,
  'data-lowered': lowered ? '' : undefined,
  'data-expanded': expanded === undefined ? undefined : String(expanded),
})

const atoms = (
  <>
    <StateLayer />
    <Ripple />
    <FocusRing />
  </>
)

/**
 * Botón de acción flotante (FAB) de Material 3 Expressive: la acción principal de la pantalla,
 * solo con icono. Un `<button type="button">`, un `<a>` con `href`, o el elemento de `render`.
 *
 * **No se posiciona solo.** La aplicación lo ubica (por ejemplo, `position: fixed` en la
 * esquina inferior derecha, a 16 px de los bordes, sumando la zona segura del sistema); en el
 * playground se muestra flotando en la esquina de un marco. Así sirve también dentro de un
 * NavigationRail o de cualquier contenedor.
 *
 * ```tsx
 * <Fab label="Redactar"><EditIcon /></Fab>
 * <Fab label="Nuevo" size="lg" variant="tertiary" render={<Link href="/nuevo" />}><AddIcon /></Fab>
 * ```
 */
export function Fab(props: FabProps) {
  const { label, variant = 'primary-container', size = 'sm', lowered, className, children, ...rest } = props
  assertRenderElement('Fab', rest.render)
  return (
    <Interactive {...rest} aria-label={label} {...dataAttributes(variant, size, lowered)} className={cx('mk-fab', className)}>
      {atoms}
      {children}
    </Interactive>
  )
}

/**
 * FAB extendido de Material 3 Expressive: icono y texto, como un Button. El texto es el nombre
 * accesible, también contraído. El icono va primero (es el que queda visible al contraerse).
 *
 * Con `expanded={false}` se contrae a un FAB del mismo tamaño, con el resorte espacial y el
 * texto que se desvanece; con `prefers-reduced-motion`, el ancho cambia sin animarse.
 *
 * **No se posiciona solo**, como `Fab`: la aplicación lo ubica.
 *
 * ```tsx
 * <ExtendedFab><EditIcon />Redactar</ExtendedFab>
 * <ExtendedFab expanded={!scrolled} size="md" href="/nuevo"><AddIcon />Nuevo</ExtendedFab>
 * ```
 */
export function ExtendedFab(props: ExtendedFabProps) {
  const { expanded = true, variant = 'primary-container', size = 'sm', lowered, className, children, ...rest } = props
  assertRenderElement('ExtendedFab', rest.render)
  return (
    <Interactive {...rest} {...dataAttributes(variant, size, lowered, expanded)} className={cx('mk-extended-fab', className)}>
      {atoms}
      {/* La grilla anima el ancho del texto entre 0fr y 1fr; el recorte va en la etiqueta. */}
      <span className="mk-extended-fab-content">
        <span className="mk-extended-fab-label">{children}</span>
      </span>
    </Interactive>
  )
}
