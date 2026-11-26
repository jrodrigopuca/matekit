'use client'
// Organismo interactivo (ADR-0003, ADR-0025): como el Dialog, el <dialog> solo queda modal si se
// abre con showModal() (efecto), y además el sheet tiene estado (parcial o expandido), mide su alto
// para ubicar el parcial y sigue el puntero al arrastrar (eventos y medidas en el cliente).
//
// El título comparte su id con el <dialog> para aria-labelledby y el asa lee y cambia el estado:
// los dos viajan por contexto y son cliente. BottomSheetContent no necesita nada de eso y es
// universal (BottomSheetSlots.tsx).
//
// Arrastre (ADR-0025): eventos de puntero sobre el <dialog>, con la decisión al soltar portada de
// Compose (sheet-drag.ts). Dentro de BottomSheetContent, un gesto táctil hacia abajo con el
// contenido arriba de todo, o cualquier gesto vertical con el sheet parcial, mueve el sheet en lugar
// de desplazar (el desplazamiento anidado de Compose, ConsumeSwipeWithinBottomSheetBounds…): se
// decide al pasar el umbral de 8 px y, si el sheet se queda con el gesto, un `touchmove` no pasivo
// cancela el desplazamiento nativo. El resto de los gestos desplazan el contenido como siempre.

import {
  createContext,
  use,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type DialogHTMLAttributes,
  type FocusEvent,
  type HTMLAttributes,
  type MouseEvent,
  type PointerEvent,
  type Ref,
} from 'react'
import { FocusRing } from '../../atoms/FocusRing/FocusRing.tsx'
import { onScrim, useModalDialog, useRegisteredId } from '../../internal/modal-dialog.ts'
import { computeTarget, DRAG_SLOP, VelocityTracker, type Anchor } from './sheet-drag.ts'

/** Estado del sheet abierto: parcial (la mitad de la ventana) o expandido (todo su alto). */
export type BottomSheetState = 'partial' | 'expanded'

interface BottomSheetContextValue {
  titleId: string
  setTitleId: (id: string | undefined) => void
  state: BottomSheetState
  hasPartial: boolean
  setState: (state: BottomSheetState) => void
  requestClose: () => void
}

const BottomSheetContext = createContext<BottomSheetContextValue | null>(null)

function useBottomSheet(part: string): BottomSheetContextValue {
  const ctx = use(BottomSheetContext)
  if (!ctx) throw new Error(`${part} tiene que estar dentro de un <BottomSheet>.`)
  return ctx
}

const cx = (base: string, extra: string | undefined) => (extra ? `${base} ${extra}` : base)

/** Campos donde el mouse selecciona o edita: ahí no empieza un arrastre con mouse. */
const FIELD = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

/** Hay un elemento con desplazamiento vertical, ya desplazado, entre `target` y el sheet. */
function scrolledBetween(target: Element, sheet: Element): boolean {
  for (let el: Element | null = target; el && el !== sheet; el = el.parentElement) {
    if (el.scrollTop > 0 && el.scrollHeight > el.clientHeight) {
      const overflow = getComputedStyle(el).overflowY
      if (overflow === 'auto' || overflow === 'scroll') return true
    }
  }
  return false
}

/** Alto del bloque que contiene al sheet: la ventana, sin barras de desplazamiento. */
const viewportHeight = () => document.documentElement.clientHeight

interface Drag {
  id: number
  mouse: boolean
  inContent: boolean
  target: Element
  startX: number
  startY: number
  /** Desplazamiento del sheet al empezar (px hacia abajo desde expandido). */
  from: number
  offset: number
  active: boolean
  tracker: VelocityTracker
}

export interface BottomSheetProps extends Omit<DialogHTMLAttributes<HTMLDialogElement>, 'open' | 'onClose'> {
  /** Abierto (modal) o cerrado. Es controlado: solo cambia cuando cambia `open`. */
  open?: boolean | undefined
  /**
   * El usuario pidió cerrar: Escape, clic en el scrim, arrastrar hacia abajo (o soltar rápido
   * hacia abajo) desde el estado más bajo, el asa sin estado parcial, o un cierre del navegador.
   * El sheet no se cierra solo: el padre tiene que pasar `open={false}`; si no lo hace, vuelve
   * a su estado.
   */
  onClose?: (() => void) | undefined
  /** Si el clic en el scrim pide cerrar. Por defecto `true`, como en Compose. */
  closeOnScrimClick?: boolean | undefined
  /**
   * Sin estado parcial: abre expandido y, al bajar, se cierra (`skipPartiallyExpanded` de
   * Compose). Por defecto `false`: si el sheet es más alto que la mitad de la ventana, abre en
   * el parcial (la mitad de la ventana) y se expande con el asa o arrastrando hacia arriba.
   */
  skipPartiallyExpanded?: boolean | undefined
  /** Referencia al `<dialog>` nativo. */
  ref?: Ref<HTMLDialogElement> | undefined
}

/**
 * Bottom sheet modal de Material 3, sobre el `<dialog>` nativo con `showModal()` como el `Dialog`
 * (foco atrapado, página inerte, scrim, Escape, salida animada, foco devuelto al cerrar).
 *
 * ```tsx
 * <BottomSheet open={open} onClose={() => setOpen(false)}>
 *   <BottomSheetHandle />
 *   <BottomSheetTitle>Compartir</BottomSheetTitle>
 *   <BottomSheetContent>…</BottomSheetContent>
 * </BottomSheet>
 * ```
 *
 * - **Estados:** parcial y expandido, como `SheetState` de Compose. Abre en el parcial si el sheet
 *   es más alto que la mitad de la ventana (y no hay `skipPartiallyExpanded`); si no, expandido.
 *   El estado actual queda en `data-state` (`partial` o `expanded`). Con el foco en algo que el
 *   parcial deja fuera de la ventana, se expande.
 * - **Arrastre:** con mouse, táctil o lápiz desde cualquier parte del sheet (con mouse, no desde
 *   el contenido ni desde campos: ahí selecciona texto), siguiendo al puntero. Al soltar, decide
 *   por velocidad (125 px/s) y distancia (56 px) como Compose: siguiente estado, volver o cerrar.
 *   En el contenido desplazable, deslizar hacia abajo estando arriba de todo mueve el sheet.
 * - **Nombre:** sale de `BottomSheetTitle` (`aria-labelledby`); sin título, pasar `aria-label`.
 * - Ancho máximo 640 px, centrado (`BottomSheetDefaults.SheetMaxWidth`). Mientras está abierto,
 *   la página no se desplaza.
 *
 * Las props nativas y `ref` llegan al `<dialog>`; `className` y `style` también.
 */
export function BottomSheet({
  open = false,
  onClose,
  closeOnScrimClick = true,
  skipPartiallyExpanded = false,
  className,
  children,
  ref,
  onCancel,
  onClick,
  onClickCapture,
  onKeyDown,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onFocus,
  ...props
}: BottomSheetProps) {
  const [state, setStateValue] = useState<BottomSheetState>('expanded')
  const [hasPartial, setHasPartial] = useState(false)
  // Copias para los manejadores nativos y las medidas, que no esperan a un nuevo render.
  const current = useRef({ state, skipPartiallyExpanded })
  current.current.skipPartiallyExpanded = skipPartiallyExpanded
  const anchors = useRef<{ partial: number | null; hidden: number }>({ partial: null, hidden: 0 })
  const drag = useRef<Drag | null>(null)
  // Después de un arrastre, el clic que sigue (el del asa, o el de un botón donde empezó) no cuenta.
  const swallowClick = useRef(false)

  const setState = (next: BottomSheetState) => {
    current.current.state = next
    setStateValue(next)
  }

  /** Mide el sheet: si cabe el parcial y dónde queda (`--_partial`). */
  const measure = (dialog: HTMLDialogElement, opening: boolean) => {
    const height = dialog.offsetHeight
    const half = viewportHeight() / 2
    const available = !current.current.skipPartiallyExpanded && height > half
    const partial = available ? Math.round(height - half) : null
    anchors.current = { partial, hidden: height }
    if (partial === null) dialog.style.removeProperty('--_partial')
    else dialog.style.setProperty('--_partial', `${partial}px`)
    setHasPartial(available)
    // Al abrir, el estado se elige en el efecto de apertura: React vuelve a dibujar antes del
    // primer cuadro, así que la entrada ya va hacia el estado elegido.
    const next = opening ? (available ? 'partial' : 'expanded') : current.current.state === 'partial' && !available ? 'expanded' : null
    if (next && next !== current.current.state) setState(next)
  }

  const clearDrag = (dialog: HTMLDialogElement) => {
    dialog.removeAttribute('data-dragging')
    dialog.style.removeProperty('--_drag')
  }

  const { dialogRef, setRef, requestClose, dialogProps } = useModalDialog({
    open,
    onClose,
    closeOnScrimClick,
    ref,
    contentSelector: '.mk-bottom-sheet-content',
    onCancel,
    onClick,
    onKeyDown,
    onPointerDown,
    onOpen: (dialog) => {
      drag.current = null
      clearDrag(dialog)
      measure(dialog, true)
    },
    onClosed: (dialog) => {
      drag.current = null
      clearDrag(dialog)
    },
  })

  // Mientras está abierto, el parcial sigue al alto del sheet y de la ventana.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!open || !dialog) return
    const remeasure = () => {
      if (dialog.open) measure(dialog, false)
    }
    const observer = new ResizeObserver(remeasure)
    observer.observe(dialog)
    window.addEventListener('resize', remeasure)
    // Un gesto táctil del que se adueñó el sheet no desplaza el contenido. Tiene que ser un
    // manejador nativo no pasivo: el `onTouchMove` de React es pasivo y no puede cancelar.
    const onTouchMove = (e: TouchEvent) => {
      if (drag.current?.active && e.cancelable) e.preventDefault()
    }
    dialog.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', remeasure)
      dialog.removeEventListener('touchmove', onTouchMove)
    }
    // measure lee todo de refs: no hace falta volver a suscribirse cuando cambia.
  }, [open, dialogRef])

  // Cambiar skipPartiallyExpanded con el sheet abierto vuelve a medir.
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog?.open) measure(dialog, false)
  }, [skipPartiallyExpanded, dialogRef])

  /** Desplazamiento actual del sheet (px hacia abajo desde expandido), medido en pantalla. */
  const currentOffset = (dialog: HTMLDialogElement) =>
    dialog.getBoundingClientRect().top - (viewportHeight() - dialog.offsetHeight)

  const handlePointerDown = (e: PointerEvent<HTMLDialogElement>) => {
    dialogProps.onPointerDown(e)
    swallowClick.current = false
    const dialog = e.currentTarget
    if (e.defaultPrevented || !e.isPrimary || e.button !== 0 || drag.current) return
    if (dialog.hasAttribute('data-closing') || onScrim(dialog, e)) return
    const target = e.target as Element
    const mouse = e.pointerType === 'mouse'
    const inContent = !!target.closest('.mk-bottom-sheet-content')
    if (mouse && (inContent || target.closest(FIELD))) return
    const tracker = new VelocityTracker()
    tracker.add(performance.now(), e.clientY)
    const from = currentOffset(dialog)
    drag.current = { id: e.pointerId, mouse, inContent, target, startX: e.clientX, startY: e.clientY, from, offset: from, active: false, tracker }
  }

  const handlePointerMove = (e: PointerEvent<HTMLDialogElement>) => {
    onPointerMove?.(e)
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dialog = e.currentTarget
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.active) {
      if (Math.hypot(dx, dy) < DRAG_SLOP) return
      // Un gesto horizontal no es del sheet (un carrusel adentro, por ejemplo).
      const vertical = Math.abs(dy) > Math.abs(dx)
      // En el contenido, el sheet se queda con el gesto si está parcial (hacia arriba se expande,
      // hacia abajo baja) o si se desliza hacia abajo con el contenido arriba de todo; si no, el
      // gesto desplaza el contenido.
      const ownsGesture = !d.inContent || current.current.state === 'partial' || (dy > 0 && !scrolledBetween(d.target, dialog))
      if (!vertical || !ownsGesture) {
        drag.current = null
        return
      }
      d.active = true
      // Sigue al puntero desde acá, sin el salto del umbral.
      d.startY = e.clientY
      d.from = currentOffset(dialog)
      // Los movimientos fuera del sheet le siguen llegando. Un evento sintético (sin puntero
      // activo detrás) no se puede capturar: el arrastre sigue igual.
      try {
        dialog.setPointerCapture(e.pointerId)
      } catch {
        // NotFoundError: sin puntero activo con ese id.
      }
      dialog.setAttribute('data-dragging', '')
    }
    e.preventDefault()
    d.offset = Math.min(Math.max(d.from + (e.clientY - d.startY), 0), anchors.current.hidden)
    d.tracker.add(performance.now(), e.clientY)
    dialog.style.setProperty('--_drag', `${d.offset}px`)
  }

  const release = (dialog: HTMLDialogElement, velocity: number | null) => {
    const d = drag.current
    drag.current = null
    if (!d?.active) return
    swallowClick.current = true
    const list: Anchor<BottomSheetState | 'hidden'>[] = [['expanded', 0]]
    if (anchors.current.partial !== null) list.push(['partial', anchors.current.partial])
    list.push(['hidden', anchors.current.hidden])
    // Cancelado (pointercancel): vuelve al estado donde estaba, sin cerrar.
    const target = velocity === null ? current.current.state : computeTarget(list, d.offset, velocity)
    if (target !== 'hidden') {
      // Sin data-dragging vuelve la transición: el sheet va del punto donde se soltó a su estado.
      clearDrag(dialog)
      if (target !== current.current.state) setState(target)
      return
    }
    // Cerrar: se pide al padre. Si cierra, la salida parte del punto donde se soltó (data-closing
    // le gana a data-dragging). Si no, el sheet vuelve a su estado en el cuadro siguiente.
    dialog.removeAttribute('data-dragging')
    requestClose()
    requestAnimationFrame(() => {
      if (!dialog.hasAttribute('data-closing')) dialog.style.removeProperty('--_drag')
    })
  }

  const handlePointerUp = (e: PointerEvent<HTMLDialogElement>) => {
    onPointerUp?.(e)
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    release(e.currentTarget, d.active ? d.tracker.velocity(performance.now()) : 0)
  }

  const handlePointerCancel = (e: PointerEvent<HTMLDialogElement>) => {
    onPointerCancel?.(e)
    if (drag.current?.id !== e.pointerId) return
    release(e.currentTarget, null)
  }

  const handleClickCapture = (e: MouseEvent<HTMLDialogElement>) => {
    onClickCapture?.(e)
    if (!swallowClick.current) return
    swallowClick.current = false
    e.preventDefault()
    e.stopPropagation()
  }

  // El foco en algo que el parcial deja fuera de la ventana (con Tab) expande el sheet. El
  // contenido desplazable en sí (que recibe el foco inicial si no tiene enfocables adentro) se ve
  // en parte: no cuenta.
  const handleFocus = (e: FocusEvent<HTMLDialogElement>) => {
    onFocus?.(e)
    const target = e.target
    if (current.current.state !== 'partial' || target === e.currentTarget) return
    if (target.matches('.mk-bottom-sheet-content')) return
    if (target.getBoundingClientRect().bottom > viewportHeight()) setState('expanded')
  }

  const generatedId = useId()
  const [titleId, setTitleId] = useState<string | undefined>(undefined)
  const ctx = useMemo<BottomSheetContextValue>(
    () => ({
      titleId: `${generatedId}title`,
      setTitleId,
      state,
      hasPartial,
      setState,
      requestClose,
    }),
    // setState solo escribe la ref y el estado; requestClose cambia con onClose.
    [generatedId, state, hasPartial, onClose],
  )

  const labelledBy = props['aria-labelledby'] ?? titleId

  return (
    <BottomSheetContext value={ctx}>
      <dialog
        {...props}
        {...dialogProps}
        ref={setRef}
        className={cx('mk-bottom-sheet', className)}
        data-state={state}
        aria-labelledby={labelledBy || undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClickCapture={handleClickCapture}
        onFocus={handleFocus}
      >
        {children}
      </dialog>
    </BottomSheetContext>
  )
}

export interface BottomSheetHandleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  /** Nombre del asa cuando expande el sheet parcial. Por defecto "Expandir". */
  expandLabel?: string | undefined
  /** Nombre del asa cuando lleva el sheet expandido al parcial. Por defecto "Contraer". */
  collapseLabel?: string | undefined
  /** Nombre del asa cuando cierra (sin estado parcial). Por defecto "Cerrar". */
  closeLabel?: string | undefined
  'aria-label'?: never
  ref?: Ref<HTMLButtonElement> | undefined
}

/**
 * Asa de arrastre (drag handle): la barra de 32 × 4 arriba del sheet, que además es un botón para
 * el teclado y los lectores de pantalla. Como el asa de Compose (que hace lo mismo al tocarla):
 * con el sheet parcial lo expande ("Expandir"), expandido lo lleva al parcial ("Contraer") y, sin
 * estado parcial, lo cierra ("Cerrar"). El nombre cambia con la acción.
 *
 * Va como primer hijo del `BottomSheet`: recibe el foco al abrir.
 */
export function BottomSheetHandle({
  expandLabel = 'Expandir',
  collapseLabel = 'Contraer',
  closeLabel = 'Cerrar',
  className,
  onClick,
  ...props
}: BottomSheetHandleProps) {
  const ctx = useBottomSheet('BottomSheetHandle')
  const action = !ctx.hasPartial ? 'close' : ctx.state === 'partial' ? 'expand' : 'collapse'
  const label = action === 'close' ? closeLabel : action === 'expand' ? expandLabel : collapseLabel
  return (
    <button
      type="button"
      {...props}
      aria-label={label}
      className={cx('mk-bottom-sheet-handle', className)}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented) return
        if (action === 'close') ctx.requestClose()
        else ctx.setState(action === 'expand' ? 'expanded' : 'partial')
      }}
    >
      <FocusRing />
    </button>
  )
}

export interface BottomSheetTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Referencia al `<h2>`. */
  ref?: Ref<HTMLHeadingElement> | undefined
}

/** Título del sheet (Title Large, `on-surface`), en un `<h2>`. Es su nombre accesible. */
export function BottomSheetTitle({ id, className, ...props }: BottomSheetTitleProps) {
  const ctx = useBottomSheet('BottomSheetTitle')
  const ownId = useRegisteredId(id, ctx.titleId, ctx.setTitleId)
  return <h2 {...props} id={ownId} className={cx('mk-bottom-sheet-title', className)} />
}
