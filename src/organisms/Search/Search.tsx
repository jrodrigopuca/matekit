'use client'
// Organismo interactivo (ADR-0003, ADR-0026): el combobox (sugerencia activa, apertura, teclado
// APG), el texto controlado o no, la elección de la vista por el ancho de la ventana, la vista a
// pantalla completa sobre <dialog> (showModal) y la región viva necesitan estado, efectos, contexto
// y eventos en el cliente. Lo que no los necesita (SearchBarLeading y SearchBarTrailing) es
// universal y está en SearchSlots.tsx.
//
// Partes (ADR-0002, ADR-0026):
// - Search: la raíz, un <search> (región de búsqueda) con el estado compartido por contexto.
// - SearchBar: la barra (la píldora de 56) con el <input type="search">; sus props nativas y su
//   `ref` van al input.
// - SearchView: las sugerencias. Docked: una capa (popover) anclada debajo de la barra. A pantalla
//   completa: un <dialog> modal con su propia barra (volver, el campo y borrar) y la lista.
// - SearchSuggestion y SearchSuggestionGroup: las opciones (role="option", con las partes de
//   ListItem) y sus grupos con nombre (role="group").
//
// Combobox (APG "Combobox" con listbox y autocompletado de lista): el foco se queda en el input;
// la sugerencia activa es `aria-activedescendant` (foco visual, no real). Las opciones se recorren
// en el orden del DOM del listbox; sus datos (valor, texto) se registran en un Map por id.

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type CSSProperties,
  type FocusEvent,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react'
import { FocusRing } from '../../atoms/FocusRing/FocusRing.tsx'
import { StateLayer } from '../../atoms/StateLayer/StateLayer.tsx'
import { ArrowBackIcon, CloseIcon } from '../../icons/icons.tsx'
import { IconButton } from '../../molecules/IconButton/IconButton.tsx'
import { LinearProgressIndicator } from '../../molecules/ProgressIndicator/LinearProgressIndicator.tsx'
import { ListItem, ListItemHeadline, type ListItemProps } from '../List/List.tsx'
import type { AccessibleNameProps } from '../../internal/accessible-name.ts'
import { partOutsideParent } from '../../internal/diagnostics.ts'
import { followAnchor, placeNextTo, supportsAnchorPositioning } from '../../internal/anchor-position.ts'
import { cx } from '../../internal/interactive.tsx'
import { mergeRefs } from '../../internal/merge-refs.ts'
import { useModalDialog } from '../../internal/modal-dialog.ts'
import { settleAnimations } from '../../internal/settle-animations.ts'
import { WINDOW_WIDTH } from '../../tokens/breakpoints.ts'
import { searchStrings } from './strings.ts'

/** Cómo se muestran las sugerencias: debajo de la barra (`docked`) o en una vista modal que ocupa la pantalla. */
export type SearchViewMode = 'docked' | 'full-screen'

/**
 * Qué vista usa la búsqueda. `auto` (por defecto) elige por el ancho de la ventana: a pantalla
 * completa en la clase compact (menos de 600 px, `WINDOW_WIDTH.medium`) y docked desde la medium.
 */
export type SearchViewChoice = 'auto' | SearchViewMode

/** Demora antes de anunciar la cantidad de sugerencias: no se repite en cada tecla. */
const ANNOUNCE_DELAY_MS = 500
/** Tras `formatRemoved` ("Removed …"), el anuncio de la cantidad nueva se calla este tiempo (no lo pisa). */
const REMOVAL_QUIET_MS = 1000

// Ventana medium o más ancha: `min-width` en rem (base 16), como los demás cortes (ADR-0016).
const WIDE_WINDOW_QUERY = `(min-width: ${WINDOW_WIDTH.medium / 16}rem)`

function subscribeWideWindow(onChange: () => void) {
  const query = matchMedia(WIDE_WINDOW_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/** Si la ventana es medium o más ancha. En el servidor, sí (la vista docked no cambia el HTML de la barra). */
function useWideWindow(): boolean {
  return useSyncExternalStore(
    subscribeWideWindow,
    () => matchMedia(WIDE_WINDOW_QUERY).matches,
    () => true,
  )
}

interface OptionData {
  value: string
  textValue: string
  disabled: boolean
  onRemove: ((value: string) => void) | undefined
}

/** El quitado pedido con Supr: la opción quitada y su vecina, la próxima activa si la quitada desaparece. */
interface PendingRemoval {
  removed: string
  next: string | null
}

/** El nombre accesible del input, que la vista a pantalla completa copia en su propio campo. */
interface InputName {
  'aria-label'?: string | undefined
  'aria-labelledby'?: string | undefined
}

interface BarSettings {
  name: InputName
  placeholder: string | undefined
  clearLabel: string
}

type InputLocation = 'bar' | 'view'

interface SearchContextValue {
  mode: SearchViewMode
  open: boolean
  /** La lista se ve: docked, abierta y con algo que mostrar; a pantalla completa, la vista abierta. */
  expanded: boolean
  value: string
  activeId: string | null
  listboxId: string
  viewId: string
  anchorName: string
  hasView: boolean
  bar: BarSettings
  rootRef: RefObject<HTMLElement | null>
  barRef: RefObject<HTMLDivElement | null>
  barInputRef: RefObject<HTMLInputElement | null>
  viewInputRef: RefObject<HTMLInputElement | null>
  listboxRef: RefObject<HTMLUListElement | null>
  options: RefObject<Map<string, OptionData>>
  pendingRemoval: RefObject<PendingRemoval | null>
  /** Lo registra SearchView: anuncia `formatRemoved` ("Removed …") en su región viva. */
  announceRemoval: RefObject<((text: string) => void) | null>
  /** Id del texto oculto `removeHint` ("Press Delete to remove"; lo dibuja SearchView), descripción de las que se quitan. */
  removeHintId: string
  setHasView: (present: boolean) => void
  setExpanded: (expanded: boolean) => void
  setBar: (settings: BarSettings) => void
  setActiveId: (id: string | null) => void
  changeValue: (value: string) => void
  clear: (where: InputLocation) => void
  requestOpen: () => void
  requestClose: () => void
  select: (id: string) => void
  handleKeyDown: (e: KeyboardEvent<HTMLInputElement>, where: InputLocation) => void
}

const SearchContext = createContext<SearchContextValue | null>(null)

function useSearch(part: string): SearchContextValue {
  const ctx = use(SearchContext)
  if (!ctx) throw partOutsideParent(part, 'Search')
  return ctx
}

/**
 * Un gesto de puntero en curso: desde el `pointerdown` hasta después del `click` que sigue al
 * `pointerup` (o el `pointercancel`), estén donde estén (un arrastre puede soltarse afuera).
 */
function usePointerGesture() {
  const active = useRef(false)
  return useMemo(
    () => ({
      active: () => active.current,
      start() {
        active.current = true
        const end = () => {
          window.removeEventListener('pointerup', end, true)
          window.removeEventListener('pointercancel', end, true)
          // Después del click, que el navegador despacha enseguida del pointerup.
          setTimeout(() => {
            active.current = false
          })
        }
        window.addEventListener('pointerup', end, true)
        window.addEventListener('pointercancel', end, true)
      },
    }),
    [],
  )
}

// Anillo de foco de la barra solo con teclado. Un input de texto siempre es :focus-visible (aunque
// se lo enfoque con un clic o un toque), así que la búsqueda lleva su propia señal: un
// `pointerdown` dentro de la raíz (mouse, táctil o lápiz; también en la barra de la vista a pantalla
// completa y en las sugerencias, que son descendientes en el DOM) marca `data-pointer-focus`, y el
// CSS oculta el anillo mientras esté. La marca se va cuando el foco vuelve a entrar desde afuera
// sin un gesto de puntero en curso (volver con Tab muestra el anillo) o con una tecla de navegación (las flechas de la lista, Escape, Enter, Tab,
// Re Pág y Av Pág), como hacen los navegadores con :focus-visible en un botón enfocado con el mouse
// cuando después se usa el teclado. Escribir o mover el cursor (letras, Retroceso, Izquierda,
// Derecha, Inicio, Fin) no la quita: es editar el texto, no navegar. Se escribe en el DOM (sin
// estado de React): no vuelve a dibujar nada.
const NAVIGATION_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Escape', 'Enter', 'Tab', 'PageDown', 'PageUp'])

function markPointerFocus(root: HTMLElement, pointer: boolean) {
  root.toggleAttribute('data-pointer-focus', pointer)
}

/** Opciones que las flechas recorren, en el orden del DOM (las deshabilitadas se saltean). */
function enabledOptions(listbox: HTMLElement | null): HTMLElement[] {
  if (!listbox) return []
  return [...listbox.querySelectorAll<HTMLElement>('[role="option"]:not([aria-disabled="true"])')]
}

/**
 * El botón que el navegador usaría para el envío implícito con Enter: el primer botón de envío del
 * formulario. Si está deshabilitado, el envío implícito no ocurre (HTML, "implicit submission").
 */
function defaultSubmitter(form: HTMLFormElement): HTMLButtonElement | HTMLInputElement | null | 'blocked' {
  for (const el of form.elements) {
    const submit =
      (el instanceof HTMLButtonElement && el.type === 'submit') ||
      (el instanceof HTMLInputElement && (el.type === 'submit' || el.type === 'image'))
    if (submit) return (el as HTMLButtonElement | HTMLInputElement).disabled ? 'blocked' : (el as HTMLButtonElement)
  }
  return null
}

export interface SearchProps extends Omit<HTMLAttributes<HTMLElement>, 'onSubmit' | 'onSelect' | 'defaultValue'> {
  /** Texto buscado (controlado). Con `onValueChange`. */
  value?: string | undefined
  /** Texto inicial si no se controla. */
  defaultValue?: string | undefined
  /** Cambió el texto: al escribir, al borrar o al elegir una sugerencia (su texto). */
  onValueChange?: ((value: string) => void) | undefined
  /**
   * Enter sin sugerencia activa: buscar el texto. Si la barra está dentro de un `<form>`, después
   * se envía el formulario (como el Enter de un campo nativo).
   */
  onSubmit?: ((value: string) => void) | undefined
  /** Se eligió una sugerencia (Enter sobre la activa, o clic): recibe su `value`. */
  onSelect?: ((value: string) => void) | undefined
  /** Vista de las sugerencias. Por defecto `auto` (por el ancho de la ventana). */
  view?: SearchViewChoice | undefined
  /** Referencia al `<search>`. Para el input, usar `ref` en `SearchBar`. */
  ref?: Ref<HTMLElement> | undefined
}

/**
 * Búsqueda de Material 3 Expressive: la raíz, un `<search>` (la región de búsqueda de la página)
 * que comparte el estado entre la barra y las sugerencias. Va con un `SearchBar` y, si hay
 * sugerencias, un `SearchView`.
 *
 * Las sugerencias las provee el uso: no se filtran adentro (el filtrado local o la búsqueda remota
 * es de quien usa el componente, con el texto de `value`/`onValueChange`).
 *
 * ```tsx
 * const [q, setQ] = useState('')
 * const results = FRUTAS.filter((f) => matches(f, q))
 * <Search value={q} onValueChange={setQ} onSubmit={buscar} onSelect={abrir}>
 *   <SearchBar label="Buscar frutas" placeholder="Buscar frutas">
 *     <SearchBarLeading><SearchIcon /></SearchBarLeading>
 *   </SearchBar>
 *   <SearchView loading={cargando}>
 *     {results.map((f) => <SearchSuggestion key={f.id} value={f.nombre} />)}
 *   </SearchView>
 * </Search>
 * ```
 *
 * Teclado (APG combobox): flechas para la sugerencia activa (con vuelta), Enter elige la activa o
 * busca, Escape cierra las sugerencias y, cerradas, borra el texto; Alt+Flecha abajo las abre.
 *
 * Es un bloque que toma el ancho de su contenedor, hasta 720 px (Compose `SearchBarMaxWidth`).
 * Dentro de un `TopAppBar` (como hijo directo) ocupa el lugar del título.
 */
export function Search({
  value: valueProp,
  defaultValue,
  onValueChange,
  onSubmit,
  onSelect,
  view = 'auto',
  className,
  children,
  ref,
  onPointerDown,
  onKeyDown,
  onFocus,
  ...rest
}: SearchProps) {
  const id = useId()
  const wide = useWideWindow()
  const mode: SearchViewMode = view === 'auto' ? (wide ? 'docked' : 'full-screen') : view

  const [innerValue, setInnerValue] = useState(defaultValue ?? '')
  const value = valueProp ?? innerValue
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [hasView, setHasView] = useState(false)
  const [bar, setBar] = useState<BarSettings>({ name: {}, placeholder: undefined, clearLabel: searchStrings.clearLabel })

  const pointerGesture = usePointerGesture()
  const rootRef = useRef<HTMLElement | null>(null)
  const setRootRef = useMemo(() => mergeRefs(rootRef, ref), [ref])
  const barRef = useRef<HTMLDivElement | null>(null)
  const barInputRef = useRef<HTMLInputElement | null>(null)
  const viewInputRef = useRef<HTMLInputElement | null>(null)
  const listboxRef = useRef<HTMLUListElement | null>(null)
  const options = useRef(new Map<string, OptionData>())
  const pendingRemoval = useRef<PendingRemoval | null>(null)
  const announceRemoval = useRef<((text: string) => void) | null>(null)

  // Lo último de cada valor, para los manejadores (no cambian la identidad del contexto).
  const latest = useRef({ value, open, expanded, activeId, mode, hasView, onValueChange, onSubmit, onSelect })
  latest.current = { value, open, expanded, activeId, mode, hasView, onValueChange, onSubmit, onSelect }

  // Cambiar de vista (la ventana cruzó los 600 px) cierra las sugerencias.
  useEffect(() => {
    setOpen(false)
    setActiveId(null)
  }, [mode])

  const setValue = useCallback(
    (next: string) => {
      if (valueProp === undefined) setInnerValue(next)
      latest.current.onValueChange?.(next)
    },
    [valueProp],
  )

  const requestOpen = useCallback(() => {
    if (!latest.current.hasView || barInputRef.current?.disabled) return
    setOpen(true)
  }, [])

  const requestClose = useCallback(() => {
    setOpen(false)
    setActiveId(null)
  }, [])

  const changeValue = useCallback(
    (next: string) => {
      setValue(next)
      setActiveId(null)
      requestOpen()
    },
    [setValue, requestOpen],
  )

  const clear = useCallback(
    (where: InputLocation) => {
      setValue('')
      setActiveId(null)
      ;(where === 'view' ? viewInputRef : barInputRef).current?.focus()
    },
    [setValue],
  )

  const select = useCallback(
    (optionId: string) => {
      const data = options.current.get(optionId)
      if (!data || data.disabled) return
      setValue(data.textValue)
      latest.current.onSelect?.(data.value)
      requestClose()
    },
    [setValue, requestClose],
  )

  const submit = useCallback(() => {
    latest.current.onSubmit?.(latest.current.value)
    requestClose()
    // El envío del formulario lo hace la búsqueda (no el Enter nativo): con la vista a pantalla
    // completa hay dos campos de texto en el formulario, y con más de uno el navegador no hace el
    // envío implícito. requestSubmit valida y dispara `submit` como el envío nativo.
    const form = barInputRef.current?.form
    if (!form) return
    const submitter = defaultSubmitter(form)
    if (submitter === 'blocked') return
    form.requestSubmit(submitter)
  }, [requestClose])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, where: InputLocation) => {
      if (e.nativeEvent.isComposing || e.ctrlKey || e.metaKey) return
      const s = latest.current
      // La barra a pantalla completa no muestra la lista: abre la vista (que la tiene).
      const opensView = s.mode === 'full-screen' && where === 'bar'
      const shown = where === 'view' || (!opensView && s.expanded)
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowUp': {
          if (!s.hasView) return
          e.preventDefault()
          const down = e.key === 'ArrowDown'
          if (opensView) {
            if (down || !e.altKey) requestOpen()
            return
          }
          if (e.altKey) {
            // Alt+Flecha abajo abre sin activar; Alt+Flecha arriba cierra (APG).
            if (down) requestOpen()
            else requestClose()
            return
          }
          const list = enabledOptions(listboxRef.current)
          if (!shown) {
            // Cerrada: abre y activa la primera (abajo) o la última (arriba), como APG.
            requestOpen()
            setActiveId((down ? list[0] : list.at(-1))?.id ?? null)
            return
          }
          if (list.length === 0) return
          const i = list.findIndex((o) => o.id === s.activeId)
          const next = down ? (i < 0 || i === list.length - 1 ? 0 : i + 1) : i <= 0 ? list.length - 1 : i - 1
          setActiveId(list[next]?.id ?? null)
          return
        }
        case 'Enter': {
          if (e.altKey || e.shiftKey) return
          e.preventDefault()
          if (shown && s.activeId) select(s.activeId)
          else submit()
          return
        }
        case 'Escape': {
          // En la vista a pantalla completa, Escape cierra la vista. Se cancela el Escape nativo:
          // en un campo de búsqueda con texto, Chrome lo usa para borrarlo (y el <dialog> no
          // recibe el cancel).
          if (where === 'view') {
            e.preventDefault()
            requestClose()
            return
          }
          if (shown) {
            e.preventDefault()
            requestClose()
            return
          }
          if (s.value !== '') {
            e.preventDefault()
            setValue('')
            setActiveId(null)
          }
          return
        }
        case 'Delete': {
          // Con una sugerencia activa, Supr es sobre ella (el foco visual), no sobre el texto: la
          // quita si tiene onRemove y, si no, no hace nada (no borra a ciegas una letra del campo).
          // Sin activa, es la edición del texto de siempre. Retroceso queda siempre para el texto.
          if (!shown || !s.activeId) return
          e.preventDefault()
          const data = options.current.get(s.activeId)
          if (!data?.onRemove || data.disabled) return
          const list = enabledOptions(listboxRef.current)
          const i = list.findIndex((o) => o.id === s.activeId)
          // La próxima activa: la siguiente, o la anterior si era la última (cuando el uso la saque
          // del DOM; si no la saca, la activa queda donde estaba).
          pendingRemoval.current = { removed: s.activeId, next: (list[i + 1] ?? list[i - 1])?.id ?? null }
          announceRemoval.current?.(data.textValue)
          data.onRemove(data.value)
          return
        }
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'Home':
        case 'End':
          // Volver a editar el texto: la sugerencia activa se suelta (APG).
          setActiveId(null)
          return
      }
    },
    [requestOpen, requestClose, select, submit, setValue],
  )

  const ctx = useMemo<SearchContextValue>(() => {
    // anchor-name tiene que ser un <dashed-ident>: sin los caracteres que pone useId.
    const safe = id.replace(/[^a-zA-Z0-9_-]/g, '')
    return {
      mode,
      open,
      expanded,
      value,
      activeId,
      listboxId: `${id}listbox`,
      viewId: `${id}view`,
      anchorName: `--mk-search-${safe}`,
      hasView,
      bar,
      rootRef,
      barRef,
      barInputRef,
      viewInputRef,
      listboxRef,
      options,
      pendingRemoval,
      announceRemoval,
      removeHintId: `${id}remove-hint`,
      setHasView,
      setExpanded,
      setBar,
      setActiveId,
      changeValue,
      clear,
      requestOpen,
      requestClose,
      select,
      handleKeyDown,
    }
  }, [id, mode, open, expanded, value, activeId, hasView, bar, changeValue, clear, requestOpen, requestClose, select, handleKeyDown])

  return (
    <SearchContext value={ctx}>
      <search
        {...rest}
        ref={setRootRef}
        className={cx('mk-search', className)}
        data-view={mode}
        onPointerDown={(e) => {
          onPointerDown?.(e)
          markPointerFocus(e.currentTarget, true)
          pointerGesture.start()
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e)
          if (NAVIGATION_KEYS.has(e.key)) markPointerFocus(e.currentTarget, false)
        }}
        onFocus={(e) => {
          onFocus?.(e)
          // El foco entra desde afuera sin un gesto de puntero en curso: Tab, un atajo o un foco
          // por script. Con un gesto en curso (el botón de borrar, que en WebKit no se enfoca con el
          // clic y deja ir el foco al <body> antes de devolverlo al campo), la marca sigue.
          const from = e.relatedTarget
          if (from instanceof Node && e.currentTarget.contains(from)) return
          if (!pointerGesture.active()) markPointerFocus(e.currentTarget, false)
        }}
      >
        {children}
      </search>
    </SearchContext>
  )
}

/** Props del input que la barra no deja cambiar (las maneja la búsqueda). */
type ManagedInputProps = 'type' | 'value' | 'defaultValue' | 'children' | 'aria-label' | 'aria-labelledby' | 'role'

export type SearchBarProps = Omit<InputHTMLAttributes<HTMLInputElement>, ManagedInputProps> &
  AccessibleNameProps & {
    /** Nombre del botón de borrar, que aparece mientras hay texto. Por defecto "Clear search". */
    clearLabel?: string | undefined
    /** Las partes: `SearchBarLeading` y `SearchBarTrailing`. */
    children?: ReactNode
    /** Referencia al `<input>`. */
    ref?: Ref<HTMLInputElement> | undefined
  }

/**
 * La barra de búsqueda: una píldora de 56 (kit) con el `<input type="search">`, el inicio y el
 * final (`SearchBarLeading`, `SearchBarTrailing`) y un botón de borrar mientras hay texto.
 *
 * El nombre accesible es obligatorio (`label`, `aria-labelledby` o `aria-label`): el texto de
 * ayuda (`placeholder`) no es un nombre. Las props nativas (`name`, `placeholder`, `disabled`,
 * `autoFocus`, `onFocus`…) y `ref` van al `<input>`; `className` y `style`, a la píldora. Con un
 * `SearchView` en la misma `Search`, el input es un `combobox` (APG); sin él, un campo de búsqueda
 * común.
 *
 * Dentro de un `<form>`, Enter envía el formulario (con `name`, el texto viaja como un campo más).
 */
export function SearchBar({
  label,
  'aria-label': ariaLabel,
  'aria-labelledby': labelledBy,
  placeholder,
  clearLabel = searchStrings.clearLabel,
  className,
  style,
  children,
  ref,
  onChange,
  onKeyDown,
  onClick,
  onBlur,
  autoComplete,
  ...inputProps
}: SearchBarProps) {
  const ctx = useSearch('SearchBar')
  const { setBar, barRef, barInputRef } = ctx
  const setInputRef = useMemo(() => mergeRefs(barInputRef, ref), [barInputRef, ref])
  const name = useMemo<InputName>(
    () => ({ 'aria-label': label ?? ariaLabel, 'aria-labelledby': labelledBy }),
    [label, ariaLabel, labelledBy],
  )

  // La vista a pantalla completa repite el nombre, el texto de ayuda y el botón de borrar.
  useLayoutEffect(() => {
    setBar({ name, placeholder, clearLabel })
  }, [setBar, name, placeholder, clearLabel])

  const docked = ctx.mode === 'docked'
  const combobox = !ctx.hasView
    ? {}
    : docked
      ? {
          role: 'combobox',
          'aria-autocomplete': 'list' as const,
          'aria-expanded': ctx.expanded,
          'aria-controls': ctx.listboxId,
          'aria-activedescendant': ctx.expanded && ctx.activeId ? ctx.activeId : undefined,
        }
      : {
          // A pantalla completa la barra abre un diálogo con su propio combobox (APG admite un
          // combobox cuyo popup es un dialog).
          role: 'combobox',
          'aria-haspopup': 'dialog' as const,
          'aria-expanded': ctx.open,
          'aria-controls': ctx.viewId,
        }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange?.(e)
    ctx.changeValue(e.target.value)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e)
    if (!e.defaultPrevented) ctx.handleKeyDown(e, 'bar')
  }

  const handleClick = (e: MouseEvent<HTMLInputElement>) => {
    onClick?.(e)
    if (!e.defaultPrevented) ctx.requestOpen()
  }

  // Docked: el foco que sale de la búsqueda (clic afuera, Tab) cierra las sugerencias. Un clic en
  // una sugerencia no le saca el foco al input (SearchView cancela el mousedown).
  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    onBlur?.(e)
    if (!docked) return
    const next = e.relatedTarget
    if (next instanceof Node && ctx.rootRef.current?.contains(next)) return
    ctx.requestClose()
  }

  // Un clic en la píldora fuera del input (el relleno, el contenedor) lo enfoca.
  const handlePillClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    const input = barInputRef.current
    if (!input || input.disabled) return
    input.focus()
    ctx.requestOpen()
  }

  return (
    <div
      ref={barRef}
      className={cx('mk-search-bar', className)}
      style={{ ...style, anchorName: ctx.anchorName }}
      onClick={handlePillClick}
    >
      <StateLayer />
      <FocusRing />
      {children}
      <input
        enterKeyHint="search"
        spellCheck={false}
        {...inputProps}
        {...combobox}
        {...name}
        ref={setInputRef}
        type="search"
        // Sin la lista de autocompletado del navegador, que taparía las sugerencias.
        autoComplete={autoComplete ?? (ctx.hasView ? 'off' : undefined)}
        className="mk-search-input"
        value={ctx.value}
        placeholder={placeholder}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onBlur={handleBlur}
      />
      {ctx.value !== '' && !inputProps.disabled && !inputProps.readOnly && (
        <ClearButton label={clearLabel} onClear={() => ctx.clear('bar')} />
      )}
    </div>
  )
}

function ClearButton({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="mk-search-bar-clear">
      <IconButton label={label} onClick={onClear}>
        <CloseIcon />
      </IconButton>
    </span>
  )
}

export interface SearchViewProps extends HTMLAttributes<HTMLUListElement> {
  /** Buscando: una barra de progreso arriba de la lista y `loadingLabel` en la región viva. */
  loading?: boolean | undefined
  /** Texto de la carga (nombre de la barra de progreso y anuncio). Por defecto "Searching…". */
  loadingLabel?: string | undefined
  /** Texto sin sugerencias para un texto escrito. Por defecto "No results". */
  emptyLabel?: string | undefined
  /** Anuncio de la cantidad de sugerencias. Por defecto "1 suggestion" / "N suggestions". */
  formatCount?: ((count: number) => string) | undefined
  /** Nombre del botón que cierra la vista a pantalla completa. Por defecto "Close search". */
  closeLabel?: string | undefined
  /** Anuncio al quitar una sugerencia con Supr. Por defecto "Removed …" con su texto. */
  formatRemoved?: ((text: string) => string) | undefined
  /** Descripción de las sugerencias que se pueden quitar (`onRemove`). Por defecto "Press Delete to remove". */
  removeHint?: string | undefined
  /** Referencia al `<ul role="listbox">`. */
  ref?: Ref<HTMLUListElement> | undefined
}

/**
 * Las sugerencias de la búsqueda: un `listbox` con `SearchSuggestion` y `SearchSuggestionGroup`
 * como hijos. Las props nativas y `ref` van al `<ul role="listbox">`; `className` y `style`, a la
 * capa que lo contiene.
 *
 * - **Docked** (ventanas medium o más anchas, o `view="docked"`): una capa superior (popover)
 *   anclada debajo de la barra, separada 2 px, del ancho de la barra, Surface Container High y
 *   radio 12 (kit). Se abre al escribir, con un clic en la barra o con las flechas, y se cierra con
 *   Escape, al elegir, al buscar o cuando el foco sale de la búsqueda.
 * - **Pantalla completa** (ventanas compact, o `view="full-screen"`): un `<dialog>` modal con su
 *   propia barra (volver, el campo y borrar) y la lista debajo; foco atrapado, Escape y el botón de
 *   volver cierran, y el foco vuelve a la barra.
 *
 * Con texto y sin sugerencias (ni carga), muestra `emptyLabel`. La cantidad se anuncia en una
 * región viva cortés medio segundo después del último cambio.
 */
export function SearchView({
  loading = false,
  loadingLabel = searchStrings.loadingLabel,
  emptyLabel = searchStrings.emptyLabel,
  formatCount = searchStrings.formatCount,
  closeLabel = searchStrings.closeLabel,
  formatRemoved = searchStrings.formatRemoved,
  removeHint = searchStrings.removeHint,
  className,
  style,
  children,
  ref,
  ...listboxProps
}: SearchViewProps) {
  const ctx = useSearch('SearchView')
  const { setHasView, setExpanded, setActiveId, listboxRef, barRef, viewInputRef, requestClose, pendingRemoval, announceRemoval } =
    ctx
  const docked = ctx.mode === 'docked'
  const setListRef = useMemo(() => mergeRefs(listboxRef, ref), [listboxRef, ref])

  useLayoutEffect(() => {
    setHasView(true)
    return () => setHasView(false)
  }, [setHasView])

  // Cantidad de opciones, del DOM: también cambia si un hijo propio del uso se actualiza solo.
  // Si la activa desaparece, ya no hay activa.
  const [count, setCount] = useState(0)
  const activeRef = useRef(ctx.activeId)
  activeRef.current = ctx.activeId
  useLayoutEffect(() => {
    const list = listboxRef.current
    if (!list) return
    const update = () => {
      setCount(list.querySelectorAll('[role="option"]').length)
      const active = activeRef.current
      if (active && !list.contains(document.getElementById(active))) {
        // La activa desapareció. Si fue la quitada con Supr, pasa a su vecina (si sigue en la lista).
        const pending = pendingRemoval.current
        const next = pending?.removed === active ? pending.next : null
        setActiveId(next && list.contains(document.getElementById(next)) ? next : null)
        pendingRemoval.current = null
      }
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(list, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [listboxRef, setActiveId, docked])

  const empty = !loading && count === 0 && ctx.value !== ''
  const expanded = docked ? ctx.open && (count > 0 || loading || ctx.value !== '') : ctx.open
  useLayoutEffect(() => {
    setExpanded(expanded)
  }, [expanded, setExpanded])

  // La sugerencia activa a la vista dentro de la lista.
  useEffect(() => {
    if (!ctx.activeId) return
    document.getElementById(ctx.activeId)?.scrollIntoView({ block: 'nearest' })
  }, [ctx.activeId])

  // Región viva: la cantidad, la carga o el vacío, medio segundo después del último cambio (no en
  // cada tecla); al cerrar, se vacía enseguida.
  const message = !expanded ? '' : loading ? loadingLabel : count > 0 ? formatCount(count) : empty ? emptyLabel : ''
  const [announced, setAnnounced] = useState('')
  // Después de quitar una sugerencia se anuncia `formatRemoved` enseguida, y el cambio de cantidad que
  // provoca (o que se cierre la lista) no lo pisa durante un segundo.
  const quietUntil = useRef(0)
  useLayoutEffect(() => {
    announceRemoval.current = (text) => {
      quietUntil.current = performance.now() + REMOVAL_QUIET_MS
      setAnnounced(formatRemoved(text))
    }
    return () => {
      announceRemoval.current = null
    }
  }, [announceRemoval, formatRemoved])
  useEffect(() => {
    const quiet = Math.max(0, quietUntil.current - performance.now())
    if (message === '') {
      if (quiet === 0) {
        setAnnounced('')
        return
      }
      const timer = setTimeout(() => setAnnounced(''), quiet)
      return () => clearTimeout(timer)
    }
    const timer = setTimeout(() => {
      if (performance.now() < quietUntil.current) return
      setAnnounced(message)
    }, ANNOUNCE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [message])

  // --- Docked: la capa anclada debajo de la barra ---
  const popupRef = useRef<HTMLDivElement | null>(null)
  const closing = useRef<object | null>(null)
  const place = useCallback(() => {
    const popup = popupRef.current
    const anchor = barRef.current
    if (!popup || !anchor) return
    // Del ancho de la barra (Compose: el desplegable mide lo que la barra colapsada). Con anchor
    // positioning lo da el CSS (la columna del ancla, estirada); sin él, se escribe acá.
    if (!supportsAnchorPositioning()) popup.style.inlineSize = `${anchor.getBoundingClientRect().width}px`
    placeNextTo(popup, anchor, { gap: 2 })
  }, [barRef])

  useLayoutEffect(() => {
    const popup = popupRef.current
    if (!popup || !docked) return
    if (expanded) {
      closing.current = null
      popup.removeAttribute('data-closing')
      if (!popup.matches(':popover-open')) popup.showPopover()
      place()
      return
    }
    if (!popup.matches(':popover-open') || closing.current) return
    // Salida: data-closing dispara las transiciones (search.css); se oculta al terminar (mismo
    // patrón que Menu, src/internal/settle-animations.ts).
    const token = {}
    closing.current = token
    popup.setAttribute('data-closing', '')
    void settleAnimations(popup, () => closing.current === token).then(() => {
      if (closing.current !== token) return
      closing.current = null
      popup.removeAttribute('data-closing')
      if (popup.matches(':popover-open')) popup.hidePopover()
    })
  }, [expanded, docked, place])

  useLayoutEffect(
    () => () => {
      closing.current = null
    },
    [],
  )

  // Abierta: seguir el ancho de la barra; sin anchor positioning, también su posición.
  useEffect(() => {
    if (!docked || !expanded) return
    const anchor = barRef.current
    const observer = new ResizeObserver(() => place())
    if (anchor) observer.observe(anchor)
    const unfollow = followAnchor(place)
    return () => {
      observer.disconnect()
      unfollow()
    }
  }, [docked, expanded, place, barRef])

  // --- Pantalla completa: <dialog> modal (src/internal/modal-dialog.ts, ADR-0025) ---
  const viewBarRef = useRef<HTMLDivElement | null>(null)
  const { setRef: setDialogRef, dialogProps } = useModalDialog({
    open: !docked && ctx.open,
    onClose: requestClose,
    closeOnScrimClick: false,
    contentSelector: '.mk-search-view-results',
    onOpen: () => expandFromBar(barRef.current, viewBarRef.current),
  })

  // El cursor al final del texto en el campo de la vista (useModalDialog ya lo enfocó).
  useLayoutEffect(() => {
    if (docked || !ctx.open) return
    const input = viewInputRef.current
    if (input && document.activeElement === input) input.setSelectionRange(input.value.length, input.value.length)
  }, [docked, ctx.open, viewInputRef])

  // Un clic en la lista no le saca el foco al input (el combobox lo conserva, APG).
  const keepFocus = (e: MouseEvent) => {
    if (e.button === 0) e.preventDefault()
  }

  const listName = ctx.bar.name
  const results = (
    <>
      {loading && <LinearProgressIndicator label={loadingLabel} className="mk-search-progress" />}
      {empty && <p className="mk-search-empty">{emptyLabel}</p>}
      {/* Descripción de las sugerencias que se pueden quitar (aria-describedby; oculta). */}
      <span hidden id={ctx.removeHintId}>
        {removeHint}
      </span>
      <ul
        {...listName}
        {...listboxProps}
        ref={setListRef}
        id={ctx.listboxId}
        role="listbox"
        className="mk-list mk-search-listbox"
      >
        {children}
      </ul>
    </>
  )
  const status = (
    <span role="status" className="mk-search-status">
      {announced}
    </span>
  )

  if (docked) {
    return (
      <>
        <div
          ref={popupRef}
          popover="manual"
          className={cx('mk-search-results', className)}
          style={{ ...style, '--_anchor': ctx.anchorName } as CSSProperties}
          onMouseDown={keepFocus}
        >
          {results}
        </div>
        {status}
      </>
    )
  }

  return (
    <dialog
      {...dialogProps}
      ref={setDialogRef}
      id={ctx.viewId}
      {...listName}
      className={cx('mk-search-view', className)}
      style={style}
    >
      <div className="mk-search-view-header">
        <div ref={viewBarRef} className="mk-search-bar" data-in-view="">
          <StateLayer />
          <FocusRing />
          <span className="mk-search-bar-leading">
            <IconButton label={closeLabel} className="mk-search-view-close" onClick={requestClose}>
              <ArrowBackIcon />
            </IconButton>
          </span>
          <ViewInput />
          {ctx.value !== '' && <ClearButton label={ctx.bar.clearLabel} onClear={() => ctx.clear('view')} />}
        </div>
      </div>
      <div className="mk-search-view-results" onMouseDown={keepFocus}>
        {results}
      </div>
      {status}
    </dialog>
  )
}

/** El campo de la vista a pantalla completa: el combobox con la lista, sin `name` (el valor viaja en el de la barra). */
function ViewInput() {
  const ctx = useSearch('SearchView')
  return (
    <input
      ref={ctx.viewInputRef}
      {...ctx.bar.name}
      type="search"
      enterKeyHint="search"
      spellCheck={false}
      autoComplete="off"
      className="mk-search-input"
      data-autofocus=""
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={ctx.open}
      aria-controls={ctx.listboxId}
      aria-activedescendant={ctx.open && ctx.activeId ? ctx.activeId : undefined}
      value={ctx.value}
      placeholder={ctx.bar.placeholder}
      onChange={(e) => ctx.changeValue(e.target.value)}
      onKeyDown={(e) => ctx.handleKeyDown(e, 'view')}
    />
  )
}

/**
 * La barra de la vista sale del lugar de la barra colapsada y se estira hasta el suyo (FLIP con la
 * Web Animations API, el resorte FastSpatial de Compose `rememberContainedSearchBarState`). Con
 * movimiento reducido, el resorte spatial vale 0: sin desplazamiento.
 */
function expandFromBar(from: HTMLElement | null, to: HTMLElement | null) {
  if (!from || !to) return
  const css = getComputedStyle(to)
  const duration = Number.parseFloat(css.getPropertyValue('--md-sys-motion-spring-fast-spatial-duration'))
  if (!(duration > 0)) return
  const a = from.getBoundingClientRect()
  const b = to.getBoundingClientRect()
  if (a.width === 0 || b.width === 0) return
  // El inicio del renglón: el ancho cambia desde ese borde (el derecho en RTL).
  const rtl = css.direction === 'rtl'
  const dx = rtl ? a.right - b.right : a.left - b.left
  const dy = a.top - b.top
  to.animate(
    [
      { translate: `${dx}px ${dy}px`, inlineSize: `${a.width}px` },
      { translate: '0 0', inlineSize: `${b.width}px` },
    ],
    { duration, easing: css.getPropertyValue('--md-sys-motion-spring-fast-spatial-easing').trim() || 'ease' },
  )
}

export interface SearchSuggestionProps extends Omit<ListItemProps, 'value' | 'role'> {
  /** Lo que recibe `onSelect` al elegirla. */
  value: string
  /** El texto que pasa a la barra al elegirla. Por defecto, `value`. */
  textValue?: string | undefined
  /** No se puede elegir; las flechas la saltean (`aria-disabled`). */
  disabled?: boolean | undefined
  /**
   * Se pidió quitarla (Supr con la sugerencia activa): recibe su `value`. La búsqueda no guarda
   * nada: el uso la saca de su lista (y de donde la guarde). Sin `onRemove`, no se puede quitar.
   */
  onRemove?: ((value: string) => void) | undefined
}

/**
 * Una sugerencia: una opción del `listbox` (`<li role="option">`) con el aspecto de un elemento de
 * lista (`ListItem`, ADR-0018): sus partes `ListItemLeading`, `ListItemHeadline`,
 * `ListItemSupporting` y `ListItemTrailing` van como hijos. Sin hijos (o con solo texto), muestra el
 * texto como `ListItemHeadline`.
 *
 * No se enfoca: la activa la marcan las flechas con `aria-activedescendant` y `aria-selected`, y se
 * elige con Enter o con un clic. Sin controles adentro (una opción no puede tener interactivos).
 *
 * Quitar (por ejemplo, búsquedas recientes): con `onRemove`, Supr sobre la activa la pide, se anuncia
 * `formatRemoved` ("Removed …") y la activa pasa a la siguiente cuando el uso la saca. La búsqueda avisa; la app
 * guarda y borra (como `onRemove` del InputChip). Con el puntero no hay un botón en la opción: la app
 * ofrece aparte una acción como "Borrar historial".
 *
 * ```tsx
 * const { recent, add, remove } = useRecentSearches('busquedas') // del uso (localStorage, por ejemplo)
 * <Search onSubmit={add} onSelect={add} …>
 *   <SearchBar label="Buscar" />
 *   <SearchView>
 *     {recent.map((r) => <SearchSuggestion key={r} value={r} onRemove={remove} />)}
 *   </SearchView>
 * </Search>
 * ```
 *
 * ```tsx
 * <SearchSuggestion value="mate cocido" />
 * <SearchSuggestion value="p-17" textValue="Yerba">
 *   <ListItemLeading><HistoryIcon /></ListItemLeading>
 *   <ListItemHeadline>Yerba</ListItemHeadline>
 *   <ListItemSupporting>Almacén</ListItemSupporting>
 * </SearchSuggestion>
 * ```
 */
export function SearchSuggestion({
  value,
  textValue,
  disabled = false,
  onRemove,
  id,
  className,
  children,
  onClick,
  'aria-describedby': describedBy,
  ...rest
}: SearchSuggestionProps) {
  const ctx = useSearch('SearchSuggestion')
  const { options, select } = ctx
  const generatedId = useId()
  const ownId = id ?? `${generatedId}option`
  const text = textValue ?? value

  useLayoutEffect(() => {
    const registry = options.current
    registry.set(ownId, { value, textValue: text, disabled, onRemove })
    return () => {
      registry.delete(ownId)
    }
  }, [options, ownId, value, text, disabled, onRemove])

  const active = ctx.activeId === ownId
  return (
    <ListItem
      {...rest}
      id={ownId}
      role="option"
      aria-selected={active}
      aria-disabled={disabled || undefined}
      aria-describedby={[describedBy, onRemove && !disabled ? ctx.removeHintId : undefined].filter(Boolean).join(' ') || undefined}
      data-active={active ? '' : undefined}
      className={cx('mk-search-suggestion', className)}
      onClick={(e) => {
        onClick?.(e)
        if (!e.defaultPrevented) select(ownId)
      }}
    >
      {children === undefined || typeof children === 'string' ? (
        <ListItemHeadline>{children ?? text}</ListItemHeadline>
      ) : (
        children
      )}
    </ListItem>
  )
}

export interface SearchSuggestionGroupProps extends HTMLAttributes<HTMLUListElement> {
  /** El nombre del grupo, visible arriba de sus sugerencias (por ejemplo "Recientes"). */
  label: string
  /** Referencia al `<ul role="group">`. */
  ref?: Ref<HTMLUListElement> | undefined
}

/**
 * Un grupo de sugerencias con nombre: por ejemplo las búsquedas recientes y las sugeridas. Sus
 * hijos son `SearchSuggestion`. Es un `<ul role="group">` nombrado por su encabezado visible (el
 * patrón del listbox agrupado de APG), dentro de un `<li role="none">` (un `<li>` no admite el rol
 * `group`). Las props nativas y `ref` van al `<ul>`.
 */
export function SearchSuggestionGroup({ label, className, children, ...rest }: SearchSuggestionGroupProps) {
  const labelId = `${useId()}label`
  return (
    <li role="none" className={cx('mk-search-suggestion-group', className)}>
      <ul {...rest} role="group" aria-labelledby={labelId} className="mk-list mk-search-suggestion-group-list">
        <li role="presentation" id={labelId} className="mk-search-suggestion-group-label">
          {label}
        </li>
        {children}
      </ul>
    </li>
  )
}
