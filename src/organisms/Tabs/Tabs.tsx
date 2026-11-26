'use client'
// Organismo interactivo (excepción al ADR-0003 registrada en el ADR-0023, como el RadioGroup del
// ADR-0012 y el ChipGroup del ADR-0019): las pestañas necesitan estado (la elegida), contexto (la
// reparten a Tab y TabPanel), efectos (el indicador y el desplazamiento) y teclado.
//
// Patrón APG "Tabs" (https://www.w3.org/WAI/ARIA/apg/patterns/tabs/):
// - `TabList` es el `role="tablist"`, `Tab` un `<button role="tab">` con `aria-selected` y
//   `aria-controls`, `TabPanel` el `role="tabpanel"` con `aria-labelledby`. Los `id` salen de
//   `useId` y el valor de cada pestaña.
// - Una sola parada de Tab en la lista (la pestaña elegida, también al volver con Mayús+Tab) y
//   flechas izquierda y derecha con vuelta, Inicio y Fin, RTL, sin pasar por las deshabilitadas:
//   el foco itinerante compartido con ChipGroup (src/internal/roving-focus.ts).
// - Activación automática por defecto (mover el foco con las flechas elige la pestaña; APG la
//   recomienda cuando mostrar el panel es inmediato) o manual (`activation="manual"`: las flechas
//   solo mueven el foco; Enter o Espacio, los del botón, eligen).
// - Los paneles que no están elegidos quedan montados y ocultos con `hidden` (conservan el estado
//   de un formulario, el desplazamiento y lo que cargaron); `unmount` en un TabPanel desmonta su
//   contenido mientras está oculto (para un panel pesado), pero deja el elemento del panel para que
//   `aria-controls` siga apuntando a algo.
//
// Estado como el RadioGroup (ADR-0012): `value` (controlado) o `defaultValue` (no controlado), uno
// de los dos obligatorio (sin JavaScript tiene que haber una elegida y no hay de dónde sacarla), y
// `onValueChange(value, event)`.

import {
  createContext,
  use,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { cx } from '../../internal/interactive.tsx'
import { mergeRefs } from '../../internal/merge-refs.ts'
import { useRovingFocus, type RovingFocusOptions } from '../../internal/roving-focus.ts'
import { tabContent, warnIfUnnamed } from './tab-content.tsx'
import { scrollTabIntoView, slideIndicator } from './tab-motion.ts'

export type TabsActivation = 'automatic' | 'manual'
export type TabsVariant = 'primary' | 'secondary'
export type TabsLayout = 'fixed' | 'scrollable'
export type TabsChangeEvent = MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLElement>

interface TabsContextValue {
  value: string
  activation: TabsActivation
  tabId: (value: string) => string
  panelId: (value: string) => string
  select: (value: string, event: TabsChangeEvent) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsContext(name: string): TabsContextValue {
  const ctx = use(TabsContext)
  if (!ctx) throw new Error(`${name} tiene que estar dentro de <Tabs>.`)
  return ctx
}

interface TabsBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  /** `TabList` y los `TabPanel`. */
  children?: ReactNode
  /**
   * `automatic` (por defecto): mover el foco con las flechas elige la pestaña. `manual`: las flechas
   * solo mueven el foco y Enter o Espacio eligen (para paneles que tardan en mostrarse).
   */
  activation?: TabsActivation | undefined
  /** Se llama al elegir otra pestaña, con su valor y el evento (clic o tecla). */
  onValueChange?: ((value: string, event: TabsChangeEvent) => void) | undefined
  /** Referencia al `<div>` que contiene la lista y los paneles. */
  ref?: Ref<HTMLDivElement> | undefined
}

interface ControlledTabs {
  /** Valor de la pestaña elegida (controlado). */
  value: string
  defaultValue?: undefined
}
interface UncontrolledTabs {
  value?: undefined
  /** Valor de la pestaña elegida al principio (no controlado). */
  defaultValue: string
}

export type TabsProps = TabsBaseProps & (ControlledTabs | UncontrolledTabs)

/** Un `id` válido a partir del valor (sin espacios, que romperían las listas de `aria-controls`). */
const idPart = (value: string) => encodeURIComponent(value)

/**
 * Pestañas de contenido (patrón APG "Tabs"): una lista de pestañas y un panel por pestaña, del
 * que se muestra el de la elegida.
 *
 * ```tsx
 * <Tabs defaultValue="vuelos">
 *   <TabList aria-label="Viaje">
 *     <Tab value="vuelos"><FlightIcon />Vuelos</Tab>
 *     <Tab value="hoteles"><HotelIcon />Hoteles</Tab>
 *   </TabList>
 *   <TabPanel value="vuelos">…</TabPanel>
 *   <TabPanel value="hoteles">…</TabPanel>
 * </Tabs>
 * ```
 *
 * Para navegar entre páginas (cada pestaña es una URL), `TabNav` con `TabLink`: son enlaces, no
 * pestañas.
 */
export function Tabs(props: TabsProps) {
  const { value: valueProp, defaultValue, onValueChange, activation = 'automatic', className, ...rest } = props
  const baseId = useId()
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? '')
  const controlled = valueProp !== undefined
  const value = controlled ? valueProp : uncontrolled

  const select = useCallback(
    (next: string, event: TabsChangeEvent) => {
      if (next === value) return
      if (!controlled) setUncontrolled(next)
      onValueChange?.(next, event)
    },
    [value, controlled, onValueChange],
  )
  const context = useMemo<TabsContextValue>(
    () => ({
      value,
      activation,
      tabId: (v) => `${baseId}tab-${idPart(v)}`,
      panelId: (v) => `${baseId}panel-${idPart(v)}`,
      select,
    }),
    [value, activation, baseId, select],
  )
  return (
    <TabsContext value={context}>
      <div {...rest} className={cx('mk-tabs', className)} />
    </TabsContext>
  )
}

/** Props de la barra, comunes a `TabList` y `TabNav`. */
export interface TabBarProps {
  /**
   * `primary` (por defecto): debajo de la barra superior, para las secciones principales; el
   * indicador mide el ancho del contenido. `secondary`: dentro del contenido, para subdividirlo;
   * el indicador mide el ancho de la pestaña.
   */
  variant?: TabsVariant | undefined
  /**
   * `fixed` (por defecto): pestañas de igual ancho que llenan la barra; la etiqueta que no entra se
   * recorta con puntos suspensivos. Para más de cuatro pestañas o etiquetas largas, `scrollable`: cada
   * pestaña del ancho de su contenido (mínimo 90), la barra se desplaza a lo ancho sin barra de
   * desplazamiento y la elegida se trae a la vista.
   */
  layout?: TabsLayout | undefined
}

export interface TabListProps extends TabBarProps, Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /** Las pestañas (`Tab`). */
  children?: ReactNode
  /** Referencia al `<div role="tablist">`. */
  ref?: Ref<HTMLDivElement> | undefined
}

const ROVING: RovingFocusOptions = { stop: '[role="tab"]', scope: '[role="tablist"]' }

/** Pestaña elegida de la lista (sin las de una lista anidada). */
const selectedTab = (list: HTMLElement) =>
  [...list.querySelectorAll<HTMLElement>('[role="tab"][aria-selected="true"]')].find((el) => el.closest('[role="tablist"]') === list) ??
  null

/**
 * Lista de pestañas: un `<div role="tablist">` con fondo `surface` y un divisor de 1 abajo. Una
 * sola parada de Tab (la pestaña elegida), flechas izquierda y derecha (en RTL, al revés) con
 * vuelta, Inicio y Fin. Conviene darle nombre con `aria-label` o `aria-labelledby`.
 */
export function TabList(props: TabListProps) {
  const { variant = 'primary', layout = 'fixed', className, onKeyDown, onFocus, onBlur, ref, ...rest } = props
  const { value, activation, select } = useTabsContext('TabList')
  const listRef = useRef<HTMLDivElement>(null)
  const mergedRef = useMemo(() => mergeRefs<HTMLDivElement>(ref, listRef), [ref])

  const roving = useRovingFocus(listRef, {
    ...ROVING,
    preferred: (stops) => stops.find((el) => el.getAttribute('aria-selected') === 'true'),
    activate:
      activation === 'automatic'
        ? (tab, event) => {
            const next = tab.dataset['tabValue']
            if (next !== undefined) select(next, event)
          }
        : undefined,
  })

  // Al cambiar la elegida: el indicador se desliza desde la anterior, la nueva se trae a la vista y
  // pasa a ser la parada de Tab (si el foco no está en otra de la lista).
  const previous = useRef<HTMLElement | null>(null)
  const { update } = roving
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const tab = selectedTab(list)
    if (tab && previous.current && previous.current !== tab && previous.current.isConnected) slideIndicator(previous.current, tab)
    if (tab) scrollTabIntoView(list, tab, previous.current !== null)
    previous.current = tab
    update()
  }, [value, update])

  return (
    <div
      {...rest}
      ref={mergedRef}
      role="tablist"
      data-variant={variant}
      data-layout={layout}
      className={cx('mk-tab-list', className)}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(event)
        roving.onKeyDown(event)
      }}
      onFocus={(event: FocusEvent<HTMLDivElement>) => {
        onFocus?.(event)
        roving.onFocus(event)
      }}
      onBlur={(event: FocusEvent<HTMLDivElement>) => {
        onBlur?.(event)
        roving.onBlur(event)
      }}
    />
  )
}

/** Sin `id` ni `aria-controls`: los genera el componente para relacionar la pestaña con su panel. */
export interface TabProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'role' | 'type' | 'id' | 'aria-controls'> {
  /** Valor de la pestaña; el `TabPanel` con el mismo valor es su panel. */
  value: string
  /**
   * Icono, etiqueta (texto o `TabLabel`) y, si hace falta, `Badge`. Solo icono: hace falta
   * `aria-label`.
   */
  children?: ReactNode
  /** Referencia al `<button role="tab">`. */
  ref?: Ref<HTMLButtonElement> | undefined
}

/**
 * Pestaña: un `<button role="tab">` con `aria-selected` y `aria-controls` (su panel). El nombre
 * accesible sale de la etiqueta (y del `label` de la insignia); sin etiqueta visible, `aria-label`.
 * `disabled` la deshabilita y las flechas la saltean.
 */
export function Tab(props: TabProps) {
  const { value, children, className, onClick, ...rest } = props
  const ctx = useTabsContext('Tab')
  const selected = ctx.value === value
  const content = tabContent(children)
  warnIfUnnamed('Tab', content.hasLabel, rest)
  return (
    <button
      {...rest}
      id={ctx.tabId(value)}
      aria-controls={ctx.panelId(value)}
      type="button"
      role="tab"
      aria-selected={selected}
      data-tab-value={value}
      {...content.data}
      className={cx('mk-tab', className)}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) ctx.select(value, event)
      }}
    >
      {content.children}
    </button>
  )
}

/** Sin `id` ni `aria-labelledby`: los genera el componente a partir de su pestaña. */
export interface TabPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'id' | 'aria-labelledby'> {
  /** Valor de la pestaña de este panel. */
  value: string
  /**
   * Desmonta el contenido mientras la pestaña no está elegida (el panel vacío queda, oculto). Por
   * defecto el contenido queda montado y oculto con `hidden`: conserva lo escrito en un formulario
   * y el estado de sus componentes. Para un panel pesado que no hace falta conservar. Ojo: un campo
   * `required` en un panel oculto y montado frena el envío del formulario sin poder mostrarse;
   * validar por pestaña o desmontar lo que no es del formulario.
   */
  unmount?: boolean | undefined
  /** Referencia al `<div role="tabpanel">`. */
  ref?: Ref<HTMLDivElement> | undefined
}

/**
 * Panel de una pestaña: un `<div role="tabpanel">` nombrado por su pestaña (`aria-labelledby`),
 * oculto con `hidden` mientras no está elegida. Entra en el orden de Tab (`tabIndex={0}`, como
 * recomienda APG cuando el panel no empieza con un elemento enfocable; se puede cambiar con
 * `tabIndex`).
 */
export function TabPanel(props: TabPanelProps) {
  const { value, unmount = false, children, className, ...rest } = props
  const ctx = useTabsContext('TabPanel')
  const selected = ctx.value === value
  return (
    <div
      tabIndex={0}
      {...rest}
      id={ctx.panelId(value)}
      aria-labelledby={ctx.tabId(value)}
      role="tabpanel"
      hidden={!selected}
      className={cx('mk-tab-panel', className)}
    >
      {unmount && !selected ? null : children}
    </div>
  )
}
