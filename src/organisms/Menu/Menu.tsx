'use client'
// Organismo interactivo (ADR-0003). Menu guarda el estado abierto/cerrado (controlado o no) y lo
// comparte por contexto; MenuTrigger agrega al botón del usuario los atributos ARIA y los
// eventos que lo abren; MenuContent muestra el popover, mueve el foco, escucha el teclado y el
// clic afuera, y espera el fin de la animación de salida; MenuItem avisa la elección y cierra.
// Todo eso necesita estado, efectos, contexto o eventos, así que estas cuatro partes son cliente.
// MenuDivider, MenuItemLeading y MenuItemTrailing no necesitan nada de eso y son universales:
// están en MenuSlots.tsx.
//
// Posicionamiento: CSS anchor positioning, con un respaldo en JavaScript para navegadores que
// no lo tienen (ADR-0007, position.ts).

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  use,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react'
import { FocusRing } from '../../atoms/FocusRing/FocusRing.tsx'
import { Ripple } from '../../atoms/Ripple/Ripple.tsx'
import { StateLayer } from '../../atoms/StateLayer/StateLayer.tsx'
import { mergeRefs } from '../../internal/merge-refs.ts'
import { fallbackPosition, observedPlacement, supportsAnchorPositioning } from './position.ts'

/** Elemento que recibe el foco al abrir. */
type FocusTarget = 'first' | 'last'
/** Motivo del cierre: decide si el foco vuelve al disparador. */
type CloseReason = 'escape' | 'select' | 'tab' | 'outside' | 'trigger'

interface MenuContextValue {
  open: boolean
  /** Abre (o, si ya está abierto, enfoca) y lleva el foco al primer o al último elemento. */
  requestOpen: (focus: FocusTarget) => void
  requestClose: (reason: CloseReason) => void
  /** Cambia en cada pedido de apertura, para volver a enfocar aunque `open` no cambie. */
  focusRequest: number
  focusTarget: RefObject<FocusTarget>
  /** Devolver el foco al disparador al cerrar (no tras un clic afuera). */
  returnFocus: RefObject<boolean>
  triggerRef: RefObject<HTMLElement | null>
  contentRef: RefObject<HTMLDivElement | null>
  triggerId: string | undefined
  setTriggerId: (id: string | undefined) => void
  generatedTriggerId: string
  contentId: string
  anchorName: string
}

const MenuContext = createContext<MenuContextValue | null>(null)

function useMenu(part: string): MenuContextValue {
  const ctx = use(MenuContext)
  if (!ctx) throw new Error(`${part} tiene que estar dentro de un <Menu>.`)
  return ctx
}

const cx = (base: string, extra: string | undefined) => (extra ? `${base} ${extra}` : base)

const ITEM_SELECTOR = '[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]'

/** Elementos del menú en orden, incluidos los deshabilitados (APG: se enfocan, no se activan). */
function menuItems(menu: HTMLElement): HTMLElement[] {
  return [...menu.querySelectorAll<HTMLElement>(ITEM_SELECTOR)].filter((el) => el.checkVisibility())
}

const matchesOpen = (el: HTMLElement) => el.matches(':popover-open')

export interface MenuProps {
  /** Abierto o cerrado (modo controlado). Sin definir, el menú maneja su propio estado. */
  open?: boolean | undefined
  /** Estado inicial en modo no controlado. Por defecto `false`. */
  defaultOpen?: boolean | undefined
  /**
   * Se pide abrir o cerrar: clic o teclado en el disparador, Escape, Tab, clic afuera o la
   * elección de un elemento. En modo controlado, el menú cambia recién cuando cambia `open`.
   */
  onOpenChange?: ((open: boolean) => void) | undefined
  children?: ReactNode
}

/**
 * Menú de Material 3 Expressive, con el patrón "menu button" de WAI-ARIA APG. No dibuja ningún
 * elemento: agrupa el disparador (`MenuTrigger`) y el menú (`MenuContent`).
 *
 * ```tsx
 * <Menu>
 *   <MenuTrigger><IconButton label="Más opciones"><MoreVertIcon /></IconButton></MenuTrigger>
 *   <MenuContent>
 *     <MenuItem onSelect={edit}><MenuItemLeading><EditIcon /></MenuItemLeading>Editar</MenuItem>
 *     <MenuDivider />
 *     <MenuItem onSelect={remove}><MenuItemLeading><DeleteIcon /></MenuItemLeading>Eliminar</MenuItem>
 *   </MenuContent>
 * </Menu>
 * ```
 *
 * - **Teclado:** en el disparador, Enter, Espacio y flecha abajo abren y enfocan el primer
 *   elemento; flecha arriba abre y enfoca el último. En el menú, las flechas recorren con vuelta,
 *   Inicio y Fin van a los extremos, una letra enfoca el siguiente elemento que empieza con ella,
 *   Escape cierra y devuelve el foco al disparador, y Tab cierra y sigue al próximo enfocable.
 * - **Elegir** un elemento llama a su `onSelect` y cierra el menú; `event.preventDefault()` en
 *   `onSelect` lo deja abierto (por ejemplo, en un `menuitemcheckbox`).
 * - Un clic fuera del menú y del disparador lo cierra, sin mover el foco.
 */
export function Menu({ open, defaultOpen = false, onOpenChange, children }: MenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const controlled = open !== undefined
  const isOpen = controlled ? open : uncontrolledOpen
  const [focusRequest, setFocusRequest] = useState(0)
  const [triggerId, setTriggerId] = useState<string | undefined>(undefined)
  const focusTarget = useRef<FocusTarget>('first')
  const returnFocus = useRef(true)
  const triggerRef = useRef<HTMLElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const id = useId()

  // Último valor de onOpenChange y de `open`, para no recrear el contexto en cada render.
  const latest = useRef({ isOpen, controlled, onOpenChange })
  latest.current = { isOpen, controlled, onOpenChange }

  const setOpen = useCallback((next: boolean) => {
    const { isOpen: current, controlled: isControlled, onOpenChange: notify } = latest.current
    if (next === current) return
    if (!isControlled) setUncontrolledOpen(next)
    notify?.(next)
  }, [])

  const requestOpen = useCallback(
    (focus: FocusTarget) => {
      focusTarget.current = focus
      setFocusRequest((n) => n + 1)
      setOpen(true)
    },
    [setOpen],
  )

  const requestClose = useCallback(
    (reason: CloseReason) => {
      returnFocus.current = reason !== 'outside'
      setOpen(false)
    },
    [setOpen],
  )

  const ctx = useMemo<MenuContextValue>(() => {
    // anchor-name tiene que ser un <dashed-ident>: sin los caracteres que pone useId.
    const safe = id.replace(/[^a-zA-Z0-9_-]/g, '')
    return {
      open: isOpen,
      requestOpen,
      requestClose,
      focusRequest,
      focusTarget,
      returnFocus,
      triggerRef,
      contentRef,
      triggerId,
      setTriggerId,
      generatedTriggerId: `${id}trigger`,
      contentId: `${id}menu`,
      anchorName: `--mk-menu-${safe}`,
    }
  }, [id, isOpen, requestOpen, requestClose, focusRequest, triggerId])

  return <MenuContext value={ctx}>{children}</MenuContext>
}

/** Props que MenuTrigger agrega o combina en el elemento disparador. */
interface TriggerChildProps {
  id?: string | undefined
  style?: CSSProperties | undefined
  onClick?: ((event: MouseEvent<HTMLElement>) => void) | undefined
  onKeyDown?: ((event: KeyboardEvent<HTMLElement>) => void) | undefined
  ref?: Ref<HTMLElement> | undefined
}

export interface MenuTriggerProps {
  /**
   * El disparador: un único elemento, que tiene que ser (o dibujar) un `<button>` y pasar a ese
   * botón `id`, `style`, `ref`, `onClick`, `onKeyDown` y los `aria-*`; `Button` e `IconButton`
   * lo hacen.
   */
  children: ReactElement<TriggerChildProps>
}

/**
 * Convierte el botón hijo en el disparador del menú, sin agregar elementos: le suma
 * `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`, un `id` (si no tiene uno), el
 * `anchor-name` con el que el menú se ubica a su lado y los eventos que lo abren. Sus propios
 * `onClick`, `onKeyDown`, `style` y `ref` se conservan; un `onClick` que llama a
 * `preventDefault()` evita que el menú se abra o se cierre.
 *
 * ```tsx
 * <MenuTrigger><Button variant="tonal">Ordenar</Button></MenuTrigger>
 * ```
 */
export function MenuTrigger({ children }: MenuTriggerProps) {
  const ctx = useMenu('MenuTrigger')
  const child = Children.only(children)
  if (!isValidElement<TriggerChildProps>(child)) {
    throw new Error('MenuTrigger espera un único elemento hijo, por ejemplo un <IconButton>.')
  }
  const { id: ownId, style, onClick, onKeyDown, ref } = child.props
  const id = ownId ?? ctx.generatedTriggerId
  const { setTriggerId } = ctx

  useLayoutEffect(() => {
    setTriggerId(id)
    return () => setTriggerId(undefined)
  }, [id, setTriggerId])

  const mergedRef = useMemo(() => mergeRefs<HTMLElement>(ref, ctx.triggerRef), [ref, ctx.triggerRef])

  return cloneElement(child, {
    id,
    ref: mergedRef,
    style: { ...style, anchorName: ctx.anchorName },
    'aria-haspopup': 'menu',
    'aria-expanded': ctx.open,
    'aria-controls': ctx.contentId,
    onClick: (e: MouseEvent<HTMLElement>) => {
      onClick?.(e)
      if (e.defaultPrevented) return
      // Enter y Espacio en un <button> también llegan acá, como clic.
      if (ctx.open) ctx.requestClose('trigger')
      else ctx.requestOpen('first')
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      onKeyDown?.(e)
      if (e.defaultPrevented) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        ctx.requestOpen(e.key === 'ArrowDown' ? 'first' : 'last')
      }
    },
  } as Partial<TriggerChildProps> & Record<`aria-${string}`, unknown>)
}

export type MenuVariant = 'standard' | 'vibrant'

export interface MenuContentProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Tema de color del kit: `standard` (fondo `surface-container-low`, seleccionado en
   * `tertiary-container`) o `vibrant` (fondo `tertiary-container`, seleccionado en `tertiary`).
   * Por defecto `standard`.
   */
  variant?: MenuVariant | undefined
  /** Referencia al contenedor (`role="menu"`, un popover). */
  ref?: Ref<HTMLDivElement> | undefined
}

const TYPEAHEAD_RESET_MS = 500

/**
 * El menú: un popover (`popover="manual"`, en la capa superior) con `role="menu"`, ubicado junto
 * al disparador con CSS anchor positioning: debajo y alineado al inicio; si no entra, arriba o
 * hacia el otro lado. Su nombre accesible es el del disparador (`aria-labelledby`).
 *
 * Está siempre montado y oculto mientras el menú está cerrado. Al cerrar, anima la salida y
 * recién después se oculta. Las props nativas, `className`, `style` y `ref` llegan al
 * contenedor. Ancho entre 112 y 280 px según el contenido.
 */
export function MenuContent({
  variant = 'standard',
  className,
  style,
  children,
  ref,
  onKeyDown,
  ...props
}: MenuContentProps) {
  const ctx = useMenu('MenuContent')
  const { open, focusRequest, focusTarget, returnFocus, triggerRef, contentRef, requestClose } = ctx
  const mergedRef = useMemo(() => mergeRefs<HTMLDivElement>(ref, contentRef), [ref, contentRef])
  // Salida en curso: identifica el cierre pendiente para anularlo si se vuelve a abrir.
  const closing = useRef<object | null>(null)
  const typeahead = useRef({ text: '', time: 0 })

  // Ubicar el menú: con anchor positioning solo se anota de qué lado quedó (para el origen de
  // la animación); sin él, se calcula la posición (respaldo, ADR-0007).
  const place = useCallback(() => {
    const menu = contentRef.current
    const trigger = triggerRef.current
    if (!menu || !trigger) return
    const anchor = trigger.getBoundingClientRect()
    if (supportsAnchorPositioning()) {
      const { side, align } = observedPlacement(anchor, menu.getBoundingClientRect())
      menu.dataset['side'] = side
      menu.dataset['align'] = align
      return
    }
    const p = fallbackPosition(
      anchor,
      { width: menu.offsetWidth, height: menu.offsetHeight },
      { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
    )
    menu.style.top = `${p.top}px`
    menu.style.left = `${p.left}px`
    menu.dataset['side'] = p.side
    menu.dataset['align'] = p.align
  }, [contentRef, triggerRef])

  useLayoutEffect(() => {
    const menu = contentRef.current
    if (!menu) return
    if (open) {
      closing.current = null
      menu.removeAttribute('data-closing')
      if (!matchesOpen(menu)) {
        menu.showPopover()
        place()
      }
      const items = menuItems(menu)
      const target = focusTarget.current === 'last' ? items.at(-1) : items[0]
      ;(target ?? menu).focus()
      focusTarget.current = 'first'
      return
    }
    if (!matchesOpen(menu) || closing.current) return
    // Devolver el foco al disparador si estaba en el menú (o se perdió), salvo tras un clic
    // afuera: ahí el usuario eligió otro lugar.
    const active = document.activeElement
    if (returnFocus.current && (!active || active === document.body || menu.contains(active))) {
      triggerRef.current?.focus()
    }
    returnFocus.current = true
    // Salida: data-closing dispara las transiciones (menu.css); se oculta al terminar.
    // getAnimations() fuerza el cálculo de estilos, así que ya las incluye; sin transiciones,
    // la lista está vacía y se oculta enseguida. Mismo patrón que Dialog.
    const token = {}
    closing.current = token
    menu.setAttribute('data-closing', '')
    Promise.all(menu.getAnimations().map((a) => a.finished)).then(
      () => {
        if (closing.current !== token) return
        closing.current = null
        menu.removeAttribute('data-closing')
        if (matchesOpen(menu)) menu.hidePopover()
      },
      // Una transición reemplazada (se volvió a abrir) rechaza `finished`: no hay que ocultar.
      () => {},
    )
  }, [open, focusRequest, contentRef, triggerRef, focusTarget, returnFocus, place])

  useLayoutEffect(
    () => () => {
      closing.current = null
    },
    [],
  )

  // Mientras está abierto: clic afuera cierra; sin anchor positioning, seguir al disparador
  // cuando la página se desplaza o cambia de tamaño.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (contentRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      requestClose('outside')
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    const follow = !supportsAnchorPositioning()
    if (follow) {
      window.addEventListener('scroll', place, true)
      window.addEventListener('resize', place)
    }
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      if (follow) {
        window.removeEventListener('scroll', place, true)
        window.removeEventListener('resize', place)
      }
    }
  }, [open, contentRef, triggerRef, requestClose, place])

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
    const items = menuItems(e.currentTarget)
    const index = items.indexOf(document.activeElement as HTMLElement)
    const focusAt = (i: number) => {
      e.preventDefault()
      items[(i + items.length) % items.length]?.focus()
    }
    switch (e.key) {
      case 'ArrowDown':
        return focusAt(index + 1)
      case 'ArrowUp':
        return focusAt(index < 0 ? -1 : index - 1)
      case 'Home':
        return focusAt(0)
      case 'End':
        return focusAt(-1)
      case 'Escape':
        // stopPropagation: si el menú está dentro de un Dialog, Escape cierra solo el menú.
        e.preventDefault()
        e.stopPropagation()
        requestClose('escape')
        return
      case 'Tab':
        // APG: Tab cierra el menú y sigue al próximo enfocable. El foco pasa primero al
        // disparador y el Tab del navegador (sin preventDefault) avanza desde ahí.
        triggerRef.current?.focus()
        requestClose('tab')
        return
    }
    // Búsqueda por letra: caracteres imprimibles escritos seguidos (menos de 500 ms entre uno y
    // otro) forman el texto buscado; una misma letra repetida recorre los que empiezan con ella.
    if (e.key.length !== 1 || e.key === ' ') return
    const now = Date.now()
    const t = typeahead.current
    t.text = now - t.time > TYPEAHEAD_RESET_MS ? e.key : t.text + e.key
    t.time = now
    const query = t.text.toLocaleLowerCase()
    const repeated = [...query].every((ch) => ch === query[0])
    const search = repeated ? query.slice(0, 1) : query
    const start = repeated ? index + 1 : Math.max(index, 0)
    for (let step = 0; step < items.length; step++) {
      const i = (start + step) % items.length
      if (items[i]?.textContent?.trim().toLocaleLowerCase().startsWith(search)) {
        focusAt(i)
        return
      }
    }
  }

  return (
    <div
      role="menu"
      aria-labelledby={ctx.triggerId}
      {...props}
      ref={mergedRef}
      id={ctx.contentId}
      popover="manual"
      className={cx('mk-menu', className)}
      data-variant={variant}
      style={{ ...style, '--_anchor': ctx.anchorName } as CSSProperties}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  )
}

interface MenuItemBaseProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'onSelect' | 'disabled' | 'role'> {
  /**
   * Deshabilitado: se anuncia (`aria-disabled`) y se puede enfocar con las flechas, como pide
   * APG para los menús, pero no se activa.
   */
  disabled?: boolean | undefined
  /**
   * Se eligió el elemento (clic, Enter o Espacio). Después el menú se cierra y el foco vuelve al
   * disparador; `event.preventDefault()` lo deja abierto.
   */
  onSelect?: ((event: MouseEvent<HTMLButtonElement>) => void) | undefined
  /** Referencia al `<button>`. */
  ref?: Ref<HTMLButtonElement> | undefined
}

/** Elemento común (`role="menuitem"`): una acción. */
interface MenuItemActionProps extends MenuItemBaseProps {
  type?: 'item' | undefined
  selected?: undefined
}

/**
 * Elemento seleccionable: el "selected" de Material 3. `radio` es una opción entre varias
 * (`menuitemradio`, como `SelectableDropdownMenuItem` de Compose, rol RadioButton);
 * `checkbox` se activa y desactiva solo (`menuitemcheckbox`, como `CheckableDropdownMenuItem`,
 * rol Checkbox). `selected` se anuncia como `aria-checked`.
 */
interface MenuItemSelectableProps extends MenuItemBaseProps {
  type: 'radio' | 'checkbox'
  selected: boolean
}

export type MenuItemProps = MenuItemActionProps | MenuItemSelectableProps

const ROLES = { item: 'menuitem', radio: 'menuitemradio', checkbox: 'menuitemcheckbox' } as const

/**
 * Elemento del menú, sobre un `<button>` fuera del orden de Tab (`tabindex="-1"`): el foco se
 * mueve con las flechas. 44 px de alto con 2 px arriba y abajo (filas de 48), capa de estado,
 * onda y anillo de foco.
 *
 * El texto va como hijo; el icono inicial, en `MenuItemLeading`, y el contenido final (atajo,
 * icono), en `MenuItemTrailing`. Si el texto mezcla elementos (`Abrir <b>todo</b>`), conviene
 * envolverlo en un `<span>`.
 *
 * ```tsx
 * <MenuItem type="radio" selected={sort === 'name'} onSelect={() => setSort('name')}>
 *   <MenuItemLeading>{sort === 'name' ? <CheckIcon /> : null}</MenuItemLeading>
 *   Nombre
 * </MenuItem>
 * ```
 */
export function MenuItem({
  type = 'item',
  selected,
  disabled = false,
  onSelect,
  onClick,
  className,
  children,
  ...props
}: MenuItemProps) {
  const { requestClose } = useMenu('MenuItem')

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      e.preventDefault()
      return
    }
    onClick?.(e)
    onSelect?.(e)
    if (!e.defaultPrevented) requestClose('select')
  }

  return (
    <button
      {...props}
      type="button"
      role={ROLES[type]}
      aria-checked={type === 'item' ? undefined : selected}
      aria-disabled={disabled || undefined}
      tabIndex={-1}
      className={cx('mk-menu-item', className)}
      onClick={handleClick}
    >
      <StateLayer />
      <Ripple />
      <FocusRing />
      {children}
    </button>
  )
}
