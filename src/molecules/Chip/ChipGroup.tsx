'use client'
// Molécula interactiva (excepción al ADR-0003 registrada en el ADR-0019, como el RadioGroup del
// ADR-0012): el grupo necesita estado, efectos, contexto y eventos.
// - Teclado: una sola parada de Tab y flechas (foco itinerante, "roving tabindex"), el patrón
//   APG "Toolbar" y lo que hace el chip-set de @material/web (role="toolbar", izquierda y derecha
//   con vuelta en los extremos, Inicio y Fin, RTL, sin pasar por los deshabilitados). Los chips
//   suelen venir de a muchos (filtros, destinatarios): con Tab por chip, cruzar una fila de 12
//   filtros costaría 12 pulsaciones.
// - Selección (opcional): el valor de los FilterChip con `value`, simple o múltiple, repartido por
//   contexto como en el RadioGroup, con `onValueChange` y `useChipGroup()`.
// Sin JavaScript (antes de hidratar), cada chip es una parada de Tab: el grupo sigue usable.
//
// El foco itinerante se maneja sobre el DOM (`tabIndex` de las paradas, marcadas con
// `data-chip-stop`), no con estado de React, como @material/web: así cuenta los chips que se
// agregan, quitan o deshabilitan sin que cada chip se registre, también los de `render`.

import {
  createContext,
  use,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { Stack } from '../../atoms/Stack/Stack.tsx'
import { cx } from '../../internal/interactive.tsx'
import { mergeRefs } from '../../internal/merge-refs.ts'

export type ChipGroupSelectionMode = 'none' | 'single' | 'multiple'
export type ChipGroupLayout = 'wrap' | 'scroll'

/** Lo que `useChipGroup()` expone del grupo. */
export interface ChipGroupState {
  /** `none` si el grupo no maneja selección. */
  selectionMode: ChipGroupSelectionMode
  /** Valores elegidos (en `single`, cero o uno). */
  value: readonly string[]
}

interface ChipGroupContextValue extends ChipGroupState {
  toggle: (value: string, event: MouseEvent<HTMLButtonElement>) => void
}

const ChipGroupContext = createContext<ChipGroupContextValue | null>(null)

/** Contexto completo, para FilterChip (no se exporta desde el índice). */
export const useChipGroupContext = (): ChipGroupContextValue | null => use(ChipGroupContext)

/**
 * Estado del `ChipGroup` que contiene al componente, o `null` fuera de un grupo. Sirve para
 * componer chips propios que se marcan según la selección del grupo.
 */
export function useChipGroup(): ChipGroupState | null {
  const ctx = use(ChipGroupContext)
  const mode = ctx?.selectionMode
  const value = ctx?.value
  return useMemo(() => (mode === undefined || value === undefined ? null : { selectionMode: mode, value }), [mode, value])
}

interface ChipGroupBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'defaultValue' | 'aria-label' | 'aria-labelledby'> {
  /** Los chips. */
  children?: ReactNode
  /**
   * `wrap` (por defecto): varias filas, con 8 px entre chips y 16 entre filas. `scroll`: una sola
   * fila que se desplaza a lo ancho (la barra, fina, va en el relleno de abajo y no tapa los
   * chips; el chip enfocado se trae a la vista).
   */
  layout?: ChipGroupLayout | undefined
  /** Referencia al `<div role="toolbar">`. */
  ref?: Ref<HTMLDivElement> | undefined
}

/** Nombre accesible obligatorio, como pide @material/web para el chip-set. */
type ChipGroupNameProps =
  | { 'aria-label': string; 'aria-labelledby'?: string | undefined }
  | { 'aria-label'?: string | undefined; 'aria-labelledby': string }

interface NoSelection {
  selectionMode?: 'none' | undefined
  value?: undefined
  defaultValue?: undefined
  onValueChange?: undefined
}
interface SingleSelection {
  /** Un FilterChip elegido a la vez (o ninguno: volver a tocarlo lo desmarca). */
  selectionMode: 'single'
  /** Valor elegido (controlado); `null`, ninguno. */
  value?: string | null | undefined
  /** Valor elegido al principio (no controlado). */
  defaultValue?: string | null | undefined
  /** Se llama al elegir o desmarcar, con el valor nuevo y el evento del chip. */
  onValueChange?: ((value: string | null, event: MouseEvent<HTMLButtonElement>) => void) | undefined
}
interface MultipleSelection {
  /** Cualquier cantidad de FilterChip elegidos. */
  selectionMode: 'multiple'
  /** Valores elegidos (controlado). */
  value?: readonly string[] | undefined
  /** Valores elegidos al principio (no controlado). */
  defaultValue?: readonly string[] | undefined
  /** Se llama al marcar o desmarcar, con la lista nueva (en el orden de los clics) y el evento. */
  onValueChange?: ((value: string[], event: MouseEvent<HTMLButtonElement>) => void) | undefined
}

export type ChipGroupProps = ChipGroupBaseProps & ChipGroupNameProps & (NoSelection | SingleSelection | MultipleSelection)

const STOP = '[data-chip-stop]'

/** Paradas del grupo (acciones de los chips) habilitadas, en orden, sin las de un grupo anidado. */
export function chipStops(root: Element): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(STOP)].filter(
    (el) => !el.matches(':disabled') && el.closest('.mk-chip-group') === root,
  )
}

/** Deja una sola parada con tabIndex 0: la enfocada, la que ya lo tenía o la primera. */
function updateTabStops(root: HTMLElement) {
  const all = [...root.querySelectorAll<HTMLElement>(STOP)].filter((el) => el.closest('.mk-chip-group') === root)
  const enabled = all.filter((el) => !el.matches(':disabled'))
  const active = enabled.find((el) => el === document.activeElement)
  const current = active ?? enabled.find((el) => el.tabIndex === 0 && el.dataset['chipCurrent'] !== undefined) ?? enabled[0]
  for (const el of all) {
    el.tabIndex = el === current ? 0 : -1
    if (el === current) el.dataset['chipCurrent'] = ''
    else delete el.dataset['chipCurrent']
  }
}

const toArray = (v: string | null | readonly string[] | undefined): readonly string[] =>
  v == null ? [] : typeof v === 'string' ? [v] : v

/**
 * Grupo de chips: un `<div role="toolbar">` con nombre (`aria-label` o `aria-labelledby`), una
 * sola parada de Tab y flechas izquierda y derecha entre chips (también entre la acción y el
 * botón de quitar de un input chip), Inicio y Fin. Dispone los chips con `Stack`.
 *
 * Con `selectionMode`, maneja la selección de los `FilterChip` que tienen `value`:
 *
 * ```tsx
 * <ChipGroup aria-label="Dieta" selectionMode="multiple" value={dieta} onValueChange={setDieta}>
 *   <FilterChip value="vegano">Vegano</FilterChip>
 *   <FilterChip value="sin-tacc">Sin TACC</FilterChip>
 * </ChipGroup>
 * ```
 *
 * Los filtros siguen siendo botones toggle (`aria-pressed`) en los dos modos, como en
 * @material/web: en `single`, elegir uno desmarca el anterior. Para una elección obligatoria de
 * formulario, `RadioGroup`.
 */
export function ChipGroup(props: ChipGroupProps) {
  const {
    children,
    className,
    layout = 'wrap',
    selectionMode = 'none',
    value: valueProp,
    defaultValue,
    onValueChange,
    onKeyDown,
    onFocus,
    ref,
    ...rest
  } = props
  const rootRef = useRef<HTMLDivElement>(null)
  const mergedRef = useMemo(() => mergeRefs<HTMLDivElement>(ref, rootRef), [ref])

  const [uncontrolled, setUncontrolled] = useState<readonly string[]>(() => toArray(defaultValue))
  const controlled = valueProp !== undefined
  const value = controlled ? toArray(valueProp) : uncontrolled

  const toggle = useCallback(
    (chip: string, event: MouseEvent<HTMLButtonElement>) => {
      if (selectionMode === 'none') return
      const on = value.includes(chip)
      if (selectionMode === 'single') {
        const next = on ? null : chip
        if (!controlled) setUncontrolled(toArray(next))
        ;(onValueChange as SingleSelection['onValueChange'])?.(next, event)
      } else {
        const next = on ? value.filter((v) => v !== chip) : [...value, chip]
        if (!controlled) setUncontrolled(next)
        ;(onValueChange as MultipleSelection['onValueChange'])?.(next, event)
      }
    },
    [selectionMode, value, controlled, onValueChange],
  )
  const context = useMemo<ChipGroupContextValue>(() => ({ selectionMode, value, toggle }), [selectionMode, value, toggle])

  // Al montar y cada vez que cambian los chips o su `disabled`, una sola parada de Tab.
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    updateTabStops(root)
    const observer = new MutationObserver(() => updateTabStops(root))
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] })
    return () => observer.disconnect()
  }, [])

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    onFocus?.(event)
    if (event.target.matches(STOP)) updateTabStops(event.currentTarget)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const { key } = event
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') return
    const root = event.currentTarget
    const target = event.target as HTMLElement
    const stops = chipStops(root)
    const index = stops.indexOf(target)
    if (index === -1 || stops.length < 2) return
    event.preventDefault()
    let next: HTMLElement | undefined
    if (key === 'Home') next = stops[0]
    else if (key === 'End') next = stops[stops.length - 1]
    else {
      // En RTL, la flecha derecha va hacia atrás, como en @material/web (chip-set.ts).
      const forwards = (key === 'ArrowRight') === (getComputedStyle(root).direction !== 'rtl')
      next = stops[(index + (forwards ? 1 : -1) + stops.length) % stops.length]
    }
    // focusVisible: el foco llegó por teclado; WebKit no lo marca por sí solo al enfocar por script.
    next?.focus({ focusVisible: true } as FocusOptions)
  }

  return (
    <ChipGroupContext value={context}>
      <Stack
        {...rest}
        ref={mergedRef as Ref<HTMLElement>}
        direction="row"
        wrap={layout === 'wrap'}
        gap={100}
        align="center"
        role="toolbar"
        aria-orientation="horizontal"
        data-layout={layout}
        className={cx('mk-chip-group', className)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
      >
        {children}
      </Stack>
    </ChipGroupContext>
  )
}
