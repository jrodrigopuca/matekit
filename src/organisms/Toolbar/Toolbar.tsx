'use client'
// Organismo interactivo (excepción al ADR-0003, ADR-0027, como el ChipGroup del ADR-0019): el foco
// itinerante necesita efectos (un MutationObserver que cuenta las paradas) y manejadores de teclado
// en la raíz. Aislarlo en una hija oculta, como TopAppBarScroll, obligaría a escuchar el teclado con
// addEventListener sobre la barra, que corre antes que los manejadores de React de los hijos: la
// flecha abajo de un MenuTrigger (que abre el menú y cancela el evento) llegaría tarde. Los hijos
// (IconButton, Button, Menu) siguen siendo lo que son y pueden venir de un Server Component.
//
// - Teclado: patrón APG "Toolbar". Una sola parada de Tab para los botones y enlaces de la barra y
//   flechas en su eje (izquierda y derecha, invertidas en RTL; arriba y abajo en la vertical), con
//   vuelta en los extremos, Inicio y Fin (src/internal/roving-focus.ts, ADR-0023). Un campo de
//   texto u otro control que usa las flechas no es parada: conserva su propio Tab.
// - Deshabilitados: `disabled` los saltea (no se pueden enfocar); `aria-disabled` los deja como
//   parada (APG lo recomienda en una toolbar para que se descubran) y el uso ignora sus clics.
// - Colores de los hijos: la barra define las variables públicas que leen IconButton y Button
//   (`--mk-icon-button-*`, `--mk-button-*`), con los colores Standard o Vibrant del kit.
// - Posición: `position: sticky` en el contenedor que se desplaza (como TopAppBar, ADR-0024): la
//   docked abajo a todo el ancho, la floating abajo y centrada o, vertical, a un costado. Ocultarse
//   al desplazar (`exit-always`) es la parte cliente ToolbarScroll.

import { useMemo, useRef, type FocusEvent, type HTMLAttributes, type KeyboardEvent, type ReactNode, type Ref } from 'react'
import type { AccessibleNameProps } from '../../internal/accessible-name.ts'
import { cx } from '../../internal/interactive.tsx'
import { mergeRefs } from '../../internal/merge-refs.ts'
import { useRovingFocus } from '../../internal/roving-focus.ts'
import { ToolbarScroll } from './ToolbarScroll.tsx'

/** `docked`: abajo, a todo el ancho (reemplaza al Bottom app bar). `floating`: una píldora que flota. */
export type ToolbarVariant = 'docked' | 'floating'
/** Colores del kit: `standard` (Surface Container) o `vibrant` (Primary Container). */
export type ToolbarColor = 'standard' | 'vibrant'
export type ToolbarOrientation = 'horizontal' | 'vertical'
/**
 * Qué hace la barra cuando se desplaza su contenedor:
 * - `none` (por defecto): queda siempre a la vista.
 * - `exit-always`: se va al bajar y vuelve apenas se sube, como `exitAlwaysScrollBehavior` de
 *   Compose (`FloatingToolbarDefaults` y `BottomAppBarDefaults`). Vuelve también cuando el foco
 *   entra a la barra. Necesita JavaScript (la dirección del desplazamiento).
 */
export type ToolbarScrollBehavior = 'none' | 'exit-always'

interface ToolbarBaseProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'color' | 'aria-label' | 'aria-labelledby' | 'aria-orientation'> {
  /** Colores. Por defecto `standard`. */
  color?: ToolbarColor | undefined
  /** Ocultarse al desplazar. Por defecto `none`. */
  scrollBehavior?: ToolbarScrollBehavior | undefined
  /** IconButton, Button (también toggles), un MenuTrigger de más acciones, Tooltip… */
  children?: ReactNode
  /** Referencia al `<div role="toolbar">`. */
  ref?: Ref<HTMLDivElement> | undefined
}

/** La vertical existe solo en la floating (el kit y Compose no tienen docked vertical). */
type ToolbarShapeProps =
  | {
      variant: 'docked'
      orientation?: 'horizontal' | undefined
    }
  | {
      /** Por defecto `floating`. */
      variant?: 'floating' | undefined
      /** `horizontal` (por defecto): abajo y centrada. `vertical`: a un costado (al final de la línea). */
      orientation?: ToolbarOrientation | undefined
    }

export type ToolbarProps = ToolbarBaseProps & ToolbarShapeProps & AccessibleNameProps

// Paradas: botones y enlaces de la barra. No lo son los de un menú, un tooltip o un diálogo que
// vivan dentro del árbol de la barra (su ancestro más cercano del `scope` no es la raíz), ni los
// campos de texto, que usan las flechas y conservan su parada de Tab (APG, "Toolbar").
const STOP = ':is(button, a[href])'
const SCOPE = '.mk-toolbar, [role="toolbar"], [role="menu"], [popover], dialog'

/**
 * Barra de herramientas de Material 3 Expressive: un `<div role="toolbar">` con nombre accesible
 * obligatorio (`label`, `aria-label` o `aria-labelledby`), una sola parada de Tab y flechas.
 *
 * Va como último hijo del contenedor que se desplaza (la ventana o un panel), salvo la vertical,
 * que va como primer hijo: `position: sticky` la deja abajo (o al costado) mientras se desplaza.
 *
 * ```tsx
 * <Toolbar label="Formato" color="vibrant">
 *   <IconButton label="Negrita" selected={bold} onClick={() => setBold(!bold)}><BoldIcon filled={bold} /></IconButton>
 *   <IconButton label="Cursiva"><ItalicIcon /></IconButton>
 *   <Menu>
 *     <MenuTrigger><IconButton label="Más opciones"><MoreVertIcon /></IconButton></MenuTrigger>
 *     <MenuContent>…</MenuContent>
 *   </Menu>
 * </Toolbar>
 * ```
 *
 * Con un FAB al lado, las dos piezas van dentro de `ToolbarLayout`.
 */
export function Toolbar(props: ToolbarProps) {
  const {
    variant = 'floating',
    color = 'standard',
    orientation = 'horizontal',
    scrollBehavior = 'none',
    label,
    'aria-label': ariaLabel,
    className,
    children,
    onKeyDown,
    onKeyDownCapture,
    onFocus,
    ref,
    ...rest
  } = props
  const rootRef = useRef<HTMLDivElement>(null)
  const mergedRef = useMemo(() => mergeRefs<HTMLDivElement>(ref, rootRef), [ref])
  const vertical = variant === 'floating' && orientation === 'vertical'
  const roving = useRovingFocus(rootRef, { stop: STOP, scope: SCOPE, orientation: vertical ? 'vertical' : 'horizontal' })

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    onFocus?.(event)
    roving.onFocus(event)
  }
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    roving.onKeyDown(event)
  }
  // En la vertical, arriba y abajo sobre el disparador de un menú mueven el foco en vez de abrirlo
  // (APG, "Menu Button": abrir con las flechas es opcional; Enter y Espacio lo siguen abriendo). Se
  // resuelve en la captura, antes que el MenuTrigger, que cancela esas flechas para abrir.
  const handleKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDownCapture?.(event)
    const target = event.target as HTMLElement
    if (vertical && (event.key === 'ArrowUp' || event.key === 'ArrowDown') && target.hasAttribute('aria-haspopup')) {
      roving.onKeyDown(event)
    }
  }

  return (
    <div
      {...rest}
      ref={mergedRef}
      role="toolbar"
      aria-label={label ?? ariaLabel}
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      data-variant={variant}
      data-color={color}
      className={cx('mk-toolbar', className)}
      onKeyDown={handleKeyDown}
      onKeyDownCapture={handleKeyDownCapture}
      onFocus={handleFocus}
    >
      {children}
      {scrollBehavior === 'exit-always' && <ToolbarScroll />}
    </div>
  )
}
