// Organismo universal (ADR-0003): sin estado, efectos, contexto ni eventos; no lleva 'use client'.
// Estados (hover, foco, presionado, seleccionado, deshabilitado, abierto) y disposición
// (container queries) son CSS (list.css). ListItem, ListItemAction y ListItemSummary contienen la
// onda (Ripple), un átomo cliente: un componente universal puede renderizar uno cliente, así que
// la lista sirve desde un Server Component (como Card y Button).
//
// Semántica de cada caso (ADR-0018), sin interactivos anidados y sin ids:
// - Contenido: `<ul role="list">` con `<li>` y las partes como texto.
// - Elementos que son enlaces o botones: `ListItemAction` (un `<a>`, un `<button>` o el elemento
//   de `render`, ADR-0010, como Button y Card) dentro del texto principal; su área se extiende a todo el elemento con un
//   pseudoelemento (el patrón de CardPrimaryAction, ADR-0015) y otros controles del elemento
//   quedan encima, enfocables por separado. No es un componente de navegación (eso son
//   NavigationBar y NavigationRail): son filas de ajustes que llevan a una subpágina, resultados o
//   índices, y sobre todo lista y detalle, donde el elemento abierto en el detalle lleva
//   `aria-current` y se ve seleccionado.
// - Selección: el Checkbox, el RadioButton o el Switch envuelve el texto del elemento
//   (`<Checkbox><ListItemHeadline>…</ListItemHeadline></Checkbox>`): su `<label>` es la etiqueta,
//   así que el nombre accesible es ese texto, y la lista ubica el control al final y extiende la
//   etiqueta a toda la fila. El estado lo da el control (marcado), no `aria-selected`.
// - Acordeón: `ListItemDetails` y `ListItemSummary` (`<details>` y `<summary>` nativos).
//
// Partes (ADR-0002): ListItemLeading, ListItemOverline, ListItemHeadline, ListItemSupporting y
// ListItemTrailing son `<span>` (contenido de frase), así que valen dentro de un `<label>` y de un
// `<summary>`.

import type { DetailsHTMLAttributes, HTMLAttributes, LiHTMLAttributes, ReactNode, Ref } from 'react'
import { FocusRing } from '../../atoms/FocusRing/FocusRing.tsx'
import { Group } from '../../atoms/Group/Group.tsx'
import { Ripple } from '../../atoms/Ripple/Ripple.tsx'
import { StateLayer } from '../../atoms/StateLayer/StateLayer.tsx'
import { ExpandMoreIcon } from '../../icons/icons.tsx'
import {
  cx,
  interactiveElement,
  type ButtonElementProps,
  type InteractiveElementProps,
  type LinkElementProps,
  type LinkModeExclusions,
  type RenderElementProps,
} from '../../internal/interactive.tsx'

/**
 * Tipo de lista del kit: `standard` (elementos pegados) o `segmented` (bloques separados 2 px,
 * con las esquinas exteriores de 16 y las interiores de 4, sobre `Group`).
 */
export type ListVariant = 'standard' | 'segmented'

interface ListOwnProps extends HTMLAttributes<HTMLUListElement> {
  /** Referencia al `<ul>`. */
  ref?: Ref<HTMLUListElement> | undefined
}

/**
 * Props de `List`. Los divisores existen solo en la estándar: en la segmentada, la separación
 * entre bloques ya divide.
 */
export type ListProps =
  | (ListOwnProps & {
      /** Tipo de lista. Por defecto `standard`. */
      variant?: 'standard' | undefined
      /**
       * Línea de 1 px (`outline-variant`) entre elementos, con 16 de sangría a cada lado
       * (`ListTokens.Divider*Space` de Compose). Es un borde dibujado por CSS, no un `<hr>`: un
       * `<hr>` no puede ser hijo de un `<ul>`, y un separador entre elementos no es contenido.
       */
      dividers?: boolean | undefined
    })
  | (ListOwnProps & { variant: 'segmented'; dividers?: undefined })

/**
 * Lista de Material 3: un índice vertical de elementos (`ListItem`).
 *
 * Es un `<ul role="list">`: el rol explícito hace falta porque, sin viñetas (`list-style: none`),
 * Safari deja de anunciar la lista con VoiceOver. Toma el ancho de su contenedor y adapta sus
 * elementos a su propio ancho con container queries (no al de la ventana): está pensada para vivir
 * en un panel de 360 px. Como mide su propio ancho, en una fila flex necesita `flex: 1` o un ancho.
 *
 * Los elementos pueden ser enlaces (`ListItemAction` con `href` o `render`): filas de ajustes que
 * llevan a una subpágina, resultados, o la lista de una pantalla de lista y detalle, donde el
 * elemento abierto lleva `current`. No reemplaza a NavigationBar ni a NavigationRail (la navegación
 * principal). Una lista de opciones con radios va dentro de un `RadioGroup`.
 *
 * ```tsx
 * <List>
 *   <ListItem>
 *     <ListItemLeading><InboxIcon /></ListItemLeading>
 *     <ListItemHeadline><ListItemAction href="/entrada" current>Entrada</ListItemAction></ListItemHeadline>
 *     <ListItemTrailing>24</ListItemTrailing>
 *   </ListItem>
 * </List>
 * ```
 */
export function List({ variant = 'standard', dividers = false, className, children, ...rest }: ListProps) {
  const listProps = {
    ...rest,
    role: 'list',
    className: cx('mk-list', className),
    'data-variant': variant,
    'data-dividers': dividers && variant === 'standard' ? '' : undefined,
  }
  if (variant === 'segmented') {
    // Group clona el <ul> con su clase y sus esquinas por posición (ADR-0017).
    return (
      <Group orientation="vertical" render={<ul {...listProps} />}>
        {children}
      </Group>
    )
  }
  return <ul {...listProps}>{children}</ul>
}

/** Alineación vertical del inicio y el final: centrados (`middle`) o arriba (`top`). */
export type ListItemAlign = 'middle' | 'top'

export interface ListItemProps extends LiHTMLAttributes<HTMLLIElement> {
  /**
   * Alineación del inicio y el final respecto del texto. Por defecto `middle`; `top` para textos
   * de tres líneas o más (kit: inicio y final a 10 del borde superior).
   */
  align?: ListItemAlign | undefined
  /** Referencia al `<li>`. */
  ref?: Ref<HTMLLIElement> | undefined
}

/**
 * Elemento de la lista (`<li>`). Lleva las partes como hijos, en este orden: `ListItemLeading`,
 * `ListItemOverline`, `ListItemHeadline`, `ListItemSupporting` y `ListItemTrailing` (todas
 * opcionales salvo el texto principal). El alto sale del contenido: 52 con una línea, 64 con dos y
 * 80 con tres, como mínimo (kit).
 *
 * Interactivo de tres formas, una por elemento:
 * - **Enlace o botón**: `ListItemAction` dentro del texto principal; cubre todo el elemento. Con
 *   `current`, el elemento abierto (por ejemplo en el panel de detalle) se ve seleccionado.
 * - **Selección**: un `Checkbox`, `RadioButton` o `Switch` como hijo, con el texto adentro; toda la
 *   fila lo activa y el texto es su nombre. Marcado (casilla o radio), el elemento se ve
 *   seleccionado.
 * - **Acordeón**: `ListItemDetails` con `ListItemSummary`.
 *
 * El estado seleccionado y el deshabilitado salen de esos controles (`aria-current`, `:checked`,
 * `disabled`), no de props del elemento: un elemento de contenido no se selecciona ni se
 * deshabilita.
 */
export function ListItem({ align = 'middle', className, children, ...rest }: ListItemProps) {
  return (
    <li {...rest} className={cx('mk-list-item', className)} data-align={align === 'top' ? 'top' : undefined}>
      {/* Capa, onda y anillo de la fila de selección (el control es una etiqueta extendida, sin
          átomos propios en la lista). En los demás casos, list.css los oculta. */}
      <StateLayer />
      <Ripple />
      <FocusRing />
      {children}
    </li>
  )
}

/** Tipo de contenido de inicio del kit, que define su tamaño y su forma. */
export type ListItemLeadingVariant = 'icon' | 'avatar' | 'image' | 'video'

export interface ListItemLeadingProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * - `icon` (por defecto): un icono de 20 en `on-surface-variant`, o cualquier contenido. Vacío,
   *   es la sangría de 20 del kit (alinea el texto con el de los elementos con icono).
   * - `avatar`: círculo de 40; una imagen adentro lo cubre, o iniciales sobre `primary-container`.
   * - `image`: 56 × 56, radio 4 y borde `outline-variant` (kit).
   * - `video`: 114 × 64, radio 4 (kit); en listas angostas se achica.
   */
  variant?: ListItemLeadingVariant | undefined
  /** Referencia al `<span>`. */
  ref?: Ref<HTMLSpanElement> | undefined
}

/** Contenido de inicio del elemento: icono, avatar, imagen, video o un `IconButton`. */
export function ListItemLeading({ variant = 'icon', className, ...props }: ListItemLeadingProps) {
  return <span {...props} className={cx('mk-list-item-leading', className)} data-variant={variant} />
}

export interface ListItemTextProps extends HTMLAttributes<HTMLSpanElement> {
  /** Referencia al `<span>`. */
  ref?: Ref<HTMLSpanElement> | undefined
}

/** Texto sobre el principal (Label Medium, `on-surface-variant`). */
export function ListItemOverline({ className, ...props }: ListItemTextProps) {
  return <span {...props} className={cx('mk-list-item-overline', className)} />
}

/**
 * Texto principal (Body Large, `on-surface`). Corta línea, también dentro de palabras largas, y no
 * se recorta: es el nombre del elemento (el de su `ListItemAction` o su control).
 */
export function ListItemHeadline({ className, ...props }: ListItemTextProps) {
  return <span {...props} className={cx('mk-list-item-headline', className)} />
}

/**
 * Texto de apoyo (Body Medium, `on-surface-variant`). Se recorta a 2 líneas con puntos
 * suspensivos (la lista de tres líneas de Material); `--mk-list-item-supporting-lines` cambia la
 * cantidad (`none`, sin recorte). Recortado, el lector lo lee completo.
 */
export function ListItemSupporting({ className, ...props }: ListItemTextProps) {
  return <span {...props} className={cx('mk-list-item-supporting', className)} />
}

/**
 * Contenido final: texto (Label Large, `on-surface-variant`), un icono de 20, los dos (separación
 * 8) o un `IconButton`. En una lista de menos de 320 px, si es solo texto, pasa debajo del texto
 * principal. Un control de selección no va acá: envuelve el texto del elemento (ver `ListItem`).
 */
export function ListItemTrailing({ className, ...props }: ListItemTextProps) {
  return <span {...props} className={cx('mk-list-item-trailing', className)} />
}

interface ListItemActionOwnProps {
  /** El texto del destino o la acción (el texto principal): es el nombre accesible. */
  children?: ReactNode
  /**
   * Elemento actual, por ejemplo el abierto en el panel de detalle (`aria-current="page"`): el
   * elemento se ve seleccionado (Secondary Container). Si el elemento de
   * `render` ya pone `aria-current` (el `NavLink` de React Router), no hace falta. Para otro valor
   * (`"true"`, `"step"`), pasar `aria-current` directamente.
   */
  current?: boolean | undefined
}

/**
 * Props de `ListItemAction`: con `href`, un `<a>`; con `render`, el elemento que se pase
 * (`<Link href="…" />` del enrutador, ADR-0010); sin ninguno, un `<button type="button">`, el único
 * que acepta `disabled`.
 */
export type ListItemActionProps =
  | (ListItemActionOwnProps & Omit<ButtonElementProps, keyof ListItemActionOwnProps>)
  | (ListItemActionOwnProps & LinkModeExclusions & Omit<LinkElementProps, keyof ListItemActionOwnProps | keyof LinkModeExclusions>)
  | (ListItemActionOwnProps & LinkModeExclusions & Omit<RenderElementProps, keyof ListItemActionOwnProps | keyof LinkModeExclusions>)

/**
 * La acción del elemento: un enlace o botón cuyo área cubre todo el elemento (con un
 * pseudoelemento), con la capa, la onda y el anillo de foco en el borde del elemento. Va dentro de
 * `ListItemHeadline`, envolviendo su texto. Otros controles del elemento (un `IconButton` al final)
 * quedan encima y se enfocan por separado.
 *
 * Mientras cubre el elemento, su texto no se puede seleccionar con el puntero.
 *
 * ```tsx
 * <ListItemHeadline><ListItemAction href="/entrada" current>Entrada</ListItemAction></ListItemHeadline>
 * <ListItemHeadline><ListItemAction onClick={borrar}>Borrar</ListItemAction></ListItemHeadline>
 * ```
 */
export function ListItemAction(props: ListItemActionProps) {
  const { current, className, children, ...rest } = props
  const aria = current ? { 'aria-current': 'page' as const } : {}
  return interactiveElement(
    'ListItemAction',
    cx('mk-list-item-action', className),
    { ...aria, ...rest } as InteractiveElementProps,
    <>
      <StateLayer />
      <Ripple />
      <FocusRing />
      {children}
    </>,
  )
}

export interface ListItemDetailsProps extends DetailsHTMLAttributes<HTMLDetailsElement> {
  /** Referencia al `<details>`. */
  ref?: Ref<HTMLDetailsElement> | undefined
}

/**
 * Elemento que se expande (acordeón): un `<details>` nativo dentro del `ListItem`. El primer hijo es
 * `ListItemSummary` (la fila, con el botón de 32 × 40 del kit); el resto, el contenido que se
 * muestra al abrir. `open` y `onToggle` son los del elemento nativo; con el mismo `name` en
 * varios, se abre uno a la vez.
 *
 * ```tsx
 * <ListItem>
 *   <ListItemDetails name="ayuda">
 *     <ListItemSummary><ListItemHeadline>¿Cuánto tarda el envío?</ListItemHeadline></ListItemSummary>
 *     <p>Entre 2 y 5 días hábiles.</p>
 *   </ListItemDetails>
 * </ListItem>
 * ```
 */
export function ListItemDetails({ className, ...props }: ListItemDetailsProps) {
  return <details {...props} className={cx('mk-list-item-details', className)} />
}

export interface ListItemSummaryProps extends HTMLAttributes<HTMLElement> {
  /** Referencia al `<summary>`. */
  ref?: Ref<HTMLElement> | undefined
}

/**
 * La fila de un `ListItemDetails` (`<summary>`): las partes del elemento y, al final, el indicador
 * de 32 × 40 que gira al abrir. Enter y Espacio la abren y cierran; su nombre accesible es su
 * texto. No admite otros controles adentro (sería un interactivo anidado).
 */
export function ListItemSummary({ className, children, ...props }: ListItemSummaryProps) {
  return (
    <summary {...props} className={cx('mk-list-item-summary', className)}>
      <StateLayer />
      <Ripple />
      <FocusRing />
      {children}
      <span className="mk-list-item-expand" aria-hidden="true">
        <ExpandMoreIcon />
      </span>
    </summary>
  )
}
