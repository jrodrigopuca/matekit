// Molécula universal (ADR-0003): sin estado, efectos, contexto ni eventos; no lleva 'use client'.
// Estados (hover, foco, presionado, deshabilitado) y disposición (container queries) son CSS
// (card.css). CardPrimaryAction contiene la onda (Ripple), un átomo cliente: un componente
// universal puede renderizar uno cliente, así que la tarjeta sirve desde un Server Component
// (como Button y los FAB).
//
// Patrón interactivo (ADR-0015): la tarjeta es siempre una superficie (`<div>`). Lo interactivo
// es una parte, `CardPrimaryAction` (un `<a>`, un `<button>` o el elemento de `render`, ADR-0010),
// que suele envolver el título: su nombre accesible es el título, y un pseudoelemento extiende su
// área a toda la tarjeta. Los demás controles de la tarjeta (las acciones del kit) quedan por
// encima de esa área y siguen siendo enfocables por separado, sin interactivos anidados.
//
// Partes (ADR-0002), cada una justificada por lo que el usuario tendría que escribir en CSS sin
// ella para armar los ejemplos apilado y horizontal del kit:
// - CardHeader: la fila de cabecera (inicio, título y subtítulo, final) con sus rellenos.
// - CardHeadline y CardSubhead: tipografía y color, que cambian según estén en la cabecera o en el
//   contenido (Title Medium o Body Large; On Surface u On Surface Variant), y el título es un
//   encabezado para navegar con el lector.
// - CardMedia: imagen a todo el ancho con proporción, recorte y esquinas (la tarjeta no recorta
//   con overflow para no cortar el anillo de foco), y al costado en la disposición horizontal.
// - CardContent: rellenos, separación entre bloques y el texto de apoyo (Body Medium, On Surface
//   Variant) sin parte propia: un `<p>` adentro ya se ve como el kit.
// - CardActions: acciones alineadas al final, que se envuelven y quedan abajo en una grilla.
// Lo demás (avatar, iconos, texto libre: el "Slot" del kit) es contenido del usuario.

import type { HTMLAttributes, ReactNode, Ref } from 'react'
import { FocusRing } from '../../atoms/FocusRing/FocusRing.tsx'
import { Ripple } from '../../atoms/Ripple/Ripple.tsx'
import { StateLayer } from '../../atoms/StateLayer/StateLayer.tsx'
import {
  cx,
  interactiveElement,
  type ButtonElementProps,
  type InteractiveElementProps,
  type LinkElementProps,
  type LinkModeExclusions,
  type RenderElementProps,
} from '../../internal/interactive.tsx'

/** Estilo de Material 3: con sombra, relleno o con borde. */
export type CardVariant = 'elevated' | 'filled' | 'outlined'

/**
 * Disposición del kit: `vertical` ("Stacked": imagen a todo el ancho entre las partes) u
 * `horizontal` (imagen al costado, al final o al inicio según su lugar entre los hijos).
 */
export type CardOrientation = 'vertical' | 'horizontal'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Estilo. Por defecto `elevated`. */
  variant?: CardVariant | undefined
  /** Disposición del kit. Por defecto `vertical`. */
  orientation?: CardOrientation | undefined
  /**
   * Con `true` (por defecto), la disposición se adapta al ancho de la propia tarjeta (container
   * queries), no al de la ventana:
   * - `vertical` con 600 px (37,5rem) o más: la imagen pasa al costado (40 % del ancho).
   * - `horizontal` con menos de 320 px (20rem): se apila, con la imagen arriba.
   * - Con menos de 240 px (15rem): las acciones se apilan a todo el ancho.
   *
   * Con `false`, la tarjeta queda en la disposición del kit a cualquier ancho. Los umbrales no se
   * pueden cambiar con variables CSS (una condición de `@container` no admite `var()`): para
   * otros, `adaptive={false}` y elegir `orientation` desde la aplicación.
   */
  adaptive?: boolean | undefined
  /** Referencia al contenedor de la tarjeta. */
  ref?: Ref<HTMLDivElement> | undefined
}

/**
 * Tarjeta de Material 3: una superficie que agrupa contenido y acciones sobre un tema.
 *
 * Por sí sola no es interactiva. Para que toda la tarjeta lleve a un destino o haga una acción,
 * poné un `CardPrimaryAction` (enlace o botón) dentro, normalmente envolviendo el título: su área
 * cubre la tarjeta y los botones de `CardActions` siguen funcionando por separado.
 *
 * Toma el ancho de su contenedor y el alto de su contenido. Como mide su propio ancho
 * (`container-type: inline-size`), su ancho no puede salir del contenido: en una fila flex,
 * darle `flex: 1` o un ancho; en una grilla, la celda ya se lo da. Para una grilla de tarjetas,
 * CSS grid alcanza (las tarjetas de una fila quedan del mismo alto, con las acciones abajo):
 *
 * ```css
 * .tarjetas { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); }
 * ```
 *
 * ```tsx
 * <Card variant="outlined">
 *   <CardHeader>
 *     <img src="/ana.jpg" alt="" width={40} height={40} />
 *     <CardHeadline><CardPrimaryAction href="/notas/1">Notas del viaje</CardPrimaryAction></CardHeadline>
 *     <CardSubhead>Ana · hace 2 horas</CardSubhead>
 *   </CardHeader>
 *   <CardMedia><img src="/foto.jpg" alt="" /></CardMedia>
 *   <CardContent>
 *     <p>Texto de apoyo.</p>
 *     <CardActions><Button variant="outlined" size="sm">Compartir</Button></CardActions>
 *   </CardContent>
 * </Card>
 * ```
 */
export function Card({ variant = 'elevated', orientation = 'vertical', adaptive = true, className, children, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={cx('mk-card', className)}
      data-variant={variant}
      data-orientation={orientation}
      data-adaptive={adaptive ? undefined : 'false'}
    >
      {/* Una consulta de contenedor no puede cambiar al propio contenedor: la disposición vive
          en este elemento, que además es el que posiciona el área de CardPrimaryAction. */}
      <div className="mk-card-layout">{children}</div>
    </div>
  )
}

interface CardPrimaryActionOwnProps {
  /** El texto del destino o la acción (normalmente el título): es el nombre accesible. */
  children?: ReactNode
}

/**
 * Props de `CardPrimaryAction`: con `href`, un `<a>`; con `render`, el elemento que se pase
 * (`<Link href="…" />` del enrutador, ADR-0010); sin ninguno, un `<button type="button">`. Solo
 * el botón acepta `disabled` (un enlace no se deshabilita: se quita el `href`).
 */
export type CardPrimaryActionProps =
  | (CardPrimaryActionOwnProps & Omit<ButtonElementProps, keyof CardPrimaryActionOwnProps>)
  | (CardPrimaryActionOwnProps & LinkModeExclusions & Omit<LinkElementProps, keyof LinkModeExclusions>)
  | (CardPrimaryActionOwnProps & LinkModeExclusions & Omit<RenderElementProps, keyof LinkModeExclusions>)

/**
 * La acción principal de la tarjeta: un enlace o botón cuyo área cubre toda la tarjeta (con un
 * pseudoelemento), con la capa de estado, la onda y el anillo de foco dibujados en el borde de la
 * tarjeta. Los otros controles de la tarjeta quedan por encima y se enfocan por separado.
 *
 * Va una por tarjeta, normalmente envolviendo el texto del título. Con `disabled` (solo como
 * botón), la tarjeta se ve deshabilitada; los otros controles siguen como estén.
 *
 * Mientras cubre la tarjeta, el texto de la tarjeta no se puede seleccionar con el puntero
 * (sí el de los controles de encima).
 *
 * ```tsx
 * <CardHeadline><CardPrimaryAction href="/notas/1">Notas del viaje</CardPrimaryAction></CardHeadline>
 * <CardHeadline><CardPrimaryAction onClick={abrir}>Notas del viaje</CardPrimaryAction></CardHeadline>
 * ```
 */
export function CardPrimaryAction(props: CardPrimaryActionProps) {
  const { className, children, ...rest } = props
  return interactiveElement(
    'CardPrimaryAction',
    cx('mk-card-primary-action', className),
    rest as InteractiveElementProps,
    <>
      <StateLayer />
      <Ripple />
      <FocusRing />
      {children}
    </>,
  )
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Referencia a la cabecera. */
  ref?: Ref<HTMLDivElement> | undefined
}

/**
 * Cabecera de la tarjeta: una fila con lo que vaya antes del título (un avatar de 40), el título
 * y el subtítulo (`CardHeadline` y `CardSubhead`, uno debajo del otro) y lo que vaya después
 * (por ejemplo un `IconButton`). Lo que no sea título ni subtítulo va antes si está antes del
 * título en el código, y después si está después.
 */
export function CardHeader({ className, ...props }: CardHeaderProps) {
  return <div {...props} className={cx('mk-card-header', className)} />
}

export interface CardHeadlineProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Nivel del encabezado (`<h1>` a `<h6>`), según la página. Por defecto 3. */
  level?: 1 | 2 | 3 | 4 | 5 | 6 | undefined
  /** Referencia al encabezado. */
  ref?: Ref<HTMLHeadingElement> | undefined
}

/**
 * Título de la tarjeta, como encabezado (`<h3>` por defecto) para que el lector permita saltar de
 * tarjeta en tarjeta. En la cabecera, Title Medium; en el contenido, Body Large (kit). Corta
 * línea en vez de desbordar, también con palabras largas; no se recorta (el título es el nombre
 * de la acción principal y recortarlo escondería información).
 */
export function CardHeadline({ level = 3, className, ...props }: CardHeadlineProps) {
  const Tag = `h${level}` as const
  return <Tag {...props} className={cx('mk-card-headline', className)} />
}

export interface CardSubheadProps extends HTMLAttributes<HTMLParagraphElement> {
  /** Referencia al párrafo. */
  ref?: Ref<HTMLParagraphElement> | undefined
}

/** Subtítulo, debajo de `CardHeadline` (Body Medium; en el contenido, On Surface Variant). */
export function CardSubhead({ className, ...props }: CardSubheadProps) {
  return <p {...props} className={cx('mk-card-subhead', className)} />
}

export interface CardMediaProps extends HTMLAttributes<HTMLDivElement> {
  /** Referencia al contenedor de la imagen. */
  ref?: Ref<HTMLDivElement> | undefined
}

/**
 * Imagen o video de la tarjeta: el hijo (`<img>`, `<video>`, `<picture>` o el `Image` de Next.js)
 * cubre el contenedor con `object-fit: cover`.
 *
 * - Apilada: a todo el ancho, con la proporción `--mk-card-media-aspect-ratio` (por defecto
 *   360 / 188, la del kit), así escala con el ancho; con las esquinas de la tarjeta si es la
 *   primera o la última parte.
 * - Al costado (horizontal, o vertical ancha): del alto de la tarjeta y del ancho
 *   `--mk-card-media-size` (80 px en la horizontal, 40 % en la vertical ancha); al final, o al
 *   inicio si es la primera parte.
 *
 * Una imagen decorativa lleva `alt=""`; si la imagen informa algo, su texto alternativo.
 */
export function CardMedia({ className, ...props }: CardMediaProps) {
  return <div {...props} className={cx('mk-card-media', className)} />
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Referencia al contenido. */
  ref?: Ref<HTMLDivElement> | undefined
}

/**
 * Contenido de la tarjeta, con relleno de 16. El texto libre (`<p>`) es el texto de apoyo del
 * kit (Body Medium, On Surface Variant). Entre bloques hay 32 (`--mk-card-content-gap`), salvo
 * entre el título y su subtítulo. Crece para llenar la tarjeta, así `CardActions` queda abajo
 * cuando la tarjeta es más alta que su contenido (en una fila de una grilla).
 */
export function CardContent({ className, ...props }: CardContentProps) {
  return <div {...props} className={cx('mk-card-content', className)} />
}

export interface CardActionsProps extends HTMLAttributes<HTMLDivElement> {
  /** Referencia al contenedor de las acciones. */
  ref?: Ref<HTMLDivElement> | undefined
}

/**
 * Acciones de la tarjeta (botones), alineadas al final con 8 de separación. Se envuelven cuando no
 * entran en una línea, y en una tarjeta de menos de 240 px se apilan a todo el ancho. Van al final
 * de `CardContent` (como en el kit) o directamente en la tarjeta. Quedan por encima del área de
 * `CardPrimaryAction`.
 */
export function CardActions({ className, ...props }: CardActionsProps) {
  return <div {...props} className={cx('mk-card-actions', className)} />
}
