// Organismo universal (ADR-0003, ADR-0024): sin estado, efectos, contexto ni eventos; no lleva
// 'use client'. La disposición, el color al desplazar y el colapso del medium y el large son CSS
// (top-app-bar.css): `position: sticky` dentro del contenedor que se desplaza y animaciones
// atadas a `scroll(nearest block)`. Lo único que necesita JavaScript vive en TopAppBarScroll, una
// parte cliente aislada que la barra dibuja como hija (como Button dibuja Ripple): mide el alto
// real (títulos de varias líneas), hace de respaldo donde no hay animaciones por desplazamiento y
// maneja `enter-always`, que depende de la dirección del desplazamiento y CSS no la conoce.
//
// Partes (ADR-0002), cada una por lo que el uso tendría que escribir sin ella:
// - TopAppBarLeading: el lugar del inicio (icono de navegación), con el color On Surface.
// - TopAppBarTitle y TopAppBarSubtitle: tipografía por tamaño, recorte o varias líneas, el
//   encabezado (`<h1>` por defecto) y la copia que se ve en la barra colapsada (oculta para la
//   accesibilidad, así el lector lee un solo título).
// - TopAppBarActions: las acciones al final, con el color On Surface Variant y el área de 48.
// Cualquier otro hijo directo va al lugar del título (una search bar o una imagen, ítem 21).

import type { HTMLAttributes, ReactElement, ReactNode, Ref } from 'react'
import { cx } from '../../internal/interactive.tsx'
import { layoutElement, type LayoutRenderedProps } from '../../internal/layout-element.tsx'
import { TopAppBarScroll } from './TopAppBarScroll.tsx'

/** Tamaño del kit: small (64), medium (112, o 136 con subtítulo) y large (120, o 152). */
export type TopAppBarSize = 'sm' | 'md' | 'lg'

/**
 * Qué hace la barra cuando se desplaza el contenido (los tres de Compose, `TopAppBarDefaults`):
 * - `pinned`: queda fija arriba y pasa a `surface-container` cuando hay contenido debajo.
 * - `enter-always`: se va al bajar y vuelve apenas se sube. El small se esconde entero; el medium
 *   y el large se colapsan al alto del small (como Compose). Necesita JavaScript (la dirección).
 * - `exit-until-collapsed`: el medium y el large se colapsan al alto del small al bajar y se
 *   expanden solo al volver al principio; el small se va con el contenido.
 * - `none`: ni fija ni cambia de color (por ejemplo, fuera de un contenedor que se desplaza).
 */
export type TopAppBarScrollBehavior = 'pinned' | 'enter-always' | 'exit-until-collapsed' | 'none'

export interface TopAppBarProps extends HTMLAttributes<HTMLElement> {
  /** Tamaño. Por defecto `sm`. */
  size?: TopAppBarSize | undefined
  /** Centra el título y el subtítulo (en el medium y el large, también los expandidos). */
  centered?: boolean | undefined
  /**
   * Comportamiento al desplazar. Por defecto `pinned` en el small y `exit-until-collapsed` en el
   * medium y el large (lo que muestra Material para cada uno).
   */
  scrollBehavior?: TopAppBarScrollBehavior | undefined
  /** Referencia al `<header>` (o al elemento de `render`). */
  ref?: Ref<HTMLElement> | undefined
  /**
   * El elemento que se dibuja en lugar del `<header>`, por ejemplo `render={<div />}`. Se clona
   * con la clase, los atributos y los hijos de la barra; sus propias props ganan.
   */
  render?: ReactElement<LayoutRenderedProps> | undefined
}

/**
 * Barra superior de Material 3 Expressive: título, subtítulo opcional, icono de navegación y
 * acciones.
 *
 * Va como **primer hijo del elemento que se desplaza**: la ventana (en el `<body>` o el `<main>`
 * que no se desplaza) o un elemento con `overflow: auto`, como un panel. No hace falta conectarla:
 * usa el contenedor más cercano que se desplaza (el mismo que `scroll(nearest)` de CSS). Entre la
 * barra y ese contenedor no puede haber otro elemento con `overflow` distinto de `visible`
 * (`position: sticky` y la línea de tiempo se quedarían con ese).
 *
 * Es un `<header>`: en el `<body>` es la región `banner` de la página; dentro de `<main>`,
 * `<article>` u otra sección, es solo el encabezado de esa parte (sin rol de región).
 *
 * ```tsx
 * <main style={{ height: '100dvh', overflow: 'auto' }}>
 *   <TopAppBar size="md">
 *     <TopAppBarLeading><IconButton label="Volver" href="/"><ArrowBackIcon /></IconButton></TopAppBarLeading>
 *     <TopAppBarTitle>Bandeja de entrada</TopAppBarTitle>
 *     <TopAppBarSubtitle>3 sin leer</TopAppBarSubtitle>
 *     <TopAppBarActions>
 *       <IconButton label="Buscar"><SearchIcon /></IconButton>
 *       <MenuTrigger>…</MenuTrigger>
 *     </TopAppBarActions>
 *   </TopAppBar>
 *   …contenido…
 * </main>
 * ```
 *
 * Personalización con variables CSS: `--mk-top-app-bar-z-index` (por defecto 1, sobre el
 * contenido que se desplaza debajo).
 */
export function TopAppBar({ size = 'sm', centered = false, scrollBehavior, className, style, children, ...rest }: TopAppBarProps) {
  const behavior = scrollBehavior ?? (size === 'sm' ? 'pinned' : 'exit-until-collapsed')
  return layoutElement(
    'TopAppBar',
    cx('mk-top-app-bar', className),
    style,
    {
      ...rest,
      'data-size': size,
      'data-centered': centered ? '' : undefined,
      'data-scroll-behavior': behavior,
    },
    <>
      {children}
      {behavior !== 'none' && <TopAppBarScroll behavior={behavior} size={size} />}
    </>,
    'header',
  )
}

export interface TopAppBarPartProps extends HTMLAttributes<HTMLDivElement> {
  /** Referencia al elemento de la parte. */
  ref?: Ref<HTMLDivElement> | undefined
}

/**
 * El inicio de la barra: normalmente un `IconButton` de navegación (volver, menú) con `label`.
 * También puede ser un avatar o un logo.
 */
export function TopAppBarLeading({ className, ...props }: TopAppBarPartProps) {
  return <div {...props} className={cx('mk-top-app-bar-leading', className)} />
}

/**
 * Las acciones del final: `IconButton` con `label` (y `Tooltip` si hace falta mostrar el nombre).
 * En pantallas chicas, hasta tres visibles y el resto en un `Menu` de más opciones
 * (`<MenuTrigger><IconButton label="Más opciones"><MoreVertIcon /></IconButton></MenuTrigger>`).
 */
export function TopAppBarActions({ className, ...props }: TopAppBarPartProps) {
  return <div {...props} className={cx('mk-top-app-bar-actions', className)} />
}

export interface TopAppBarTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Nivel del encabezado. Por defecto 1: la barra suele llevar el título de la página. */
  level?: 1 | 2 | 3 | 4 | 5 | 6 | undefined
  /** El título: texto, o una imagen con `alt` (el logo del small con imagen). */
  children?: ReactNode
  /** Referencia al encabezado. */
  ref?: Ref<HTMLHeadingElement> | undefined
}

/**
 * El título. En el small va en una línea con puntos suspensivos (el encabezado conserva el texto
 * completo para los lectores); en el medium y el large ocupa las líneas que necesite y la barra
 * crece (las "flexible" de Expressive).
 *
 * En el medium y el large el texto se repite en una copia que se ve en la barra colapsada (como
 * Compose, que cruza dos títulos); la copia está oculta para la accesibilidad (`aria-hidden` e
 * `inert`), así que el título se lee una vez. Por eso los hijos no deberían llevar `id`.
 */
export function TopAppBarTitle({ level = 1, className, children, ...props }: TopAppBarTitleProps) {
  const Tag = `h${level}` as const
  return (
    <>
      <Tag {...props} className={cx('mk-top-app-bar-title', className)}>{children}</Tag>
      <span className="mk-top-app-bar-collapsed-title" aria-hidden="true" inert>{children}</span>
    </>
  )
}

export interface TopAppBarSubtitleProps extends HTMLAttributes<HTMLParagraphElement> {
  /** Referencia al párrafo. */
  ref?: Ref<HTMLParagraphElement> | undefined
}

/**
 * El subtítulo, debajo del título (un `<p>`). Como el título, tiene una copia oculta para la
 * accesibilidad en la barra colapsada.
 */
export function TopAppBarSubtitle({ className, children, ...props }: TopAppBarSubtitleProps) {
  return (
    <>
      <p {...props} className={cx('mk-top-app-bar-subtitle', className)}>{children}</p>
      <span className="mk-top-app-bar-collapsed-subtitle" aria-hidden="true" inert>{children}</span>
    </>
  )
}
