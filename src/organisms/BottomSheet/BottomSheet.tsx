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
  useLayoutEffect,
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
import { partOutsideParent } from '../../internal/diagnostics.ts'
import { computeTarget, DRAG_SLOP, VelocityTracker, type Anchor } from './sheet-drag.ts'
import { bottomSheetStrings } from './strings.ts'

/** Estado del sheet abierto: parcial (la mitad de la ventana) o expandido (todo su alto). */
export type BottomSheetState = 'partial' | 'expanded'

/**
 * Por qué cambió el estado (`onStateChange`):
 * - `drag`: se soltó un arrastre y el sheet se acomoda en otro estado;
 * - `handle`: el asa (clic o teclado);
 * - `focus`: el foco llegó a algo que el parcial deja fuera de la ventana y el sheet se expande;
 * - `resize`: el parcial dejó de existir (el sheet ya no pasa la mitad de la ventana, o
 *   `skipPartiallyExpanded`) y el sheet se muestra expandido, o volvió a existir y el sheet, con
 *   `state="partial"`, vuelve al parcial.
 */
export type BottomSheetStateChangeReason = 'drag' | 'handle' | 'focus' | 'resize'

/** Variable CSS con el avance del sheet: lo visible de su alto, de 0 (cerrado) a 1 (expandido). */
const PROGRESS = '--mk-bottom-sheet-progress'

interface BottomSheetContextValue {
  titleId: string
  setTitleId: (id: string | undefined) => void
  state: BottomSheetState
  hasPartial: boolean
  requestState: (state: BottomSheetState, reason: BottomSheetStateChangeReason) => void
  requestClose: () => void
}

const BottomSheetContext = createContext<BottomSheetContextValue | null>(null)

function useBottomSheet(part: string): BottomSheetContextValue {
  const ctx = use(BottomSheetContext)
  if (!ctx) throw partOutsideParent(part, 'BottomSheet')
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
  /**
   * Estado controlado (`partial` o `expanded`). Sin `state`, el sheet maneja el suyo. Con
   * `state`, manda el padre: el arrastre, el asa y el foco solo piden el cambio con
   * `onStateChange`, y si el padre no actualiza `state`, el sheet vuelve al anterior (un veto,
   * como `confirmValueChange` de Compose). `partial` sin parcial disponible (sheet que no pasa la
   * mitad de la ventana, o `skipPartiallyExpanded`) se muestra expandido y se avisa con
   * `onStateChange('expanded', 'resize')`; si el parcial vuelve a existir y `state` sigue en
   * `partial`, vuelve al parcial y avisa `('partial', 'resize')`.
   */
  state?: BottomSheetState | undefined
  /**
   * Estado con el que abre, sin controlarlo. Por defecto, el parcial si existe y si no,
   * expandido. Se aplica cada vez que se abre.
   */
  defaultState?: BottomSheetState | undefined
  /**
   * El estado se asentó en otro valor (o, controlado, se pidió): una llamada por cambio, al soltar
   * el arrastre con el destino decidido o al usar el asa, no en cada cuadro. El cambio que hace
   * el padre con `state` no se avisa. El progreso del arrastre está en la variable CSS
   * `--mk-bottom-sheet-progress`.
   */
  onStateChange?: ((state: BottomSheetState, reason: BottomSheetStateChangeReason) => void) | undefined
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
 *   parcial deja fuera de la ventana, se expande. Controlado con `state` y `onStateChange`, o con
 *   `defaultState` (como `value`/`defaultValue` del `RadioGroup`):
 *
 *   ```tsx
 *   const [state, setState] = useState<BottomSheetState>('partial')
 *   <BottomSheet open={open} onClose={close} state={state} onStateChange={(next) => setState(next)}>
 *   ```
 * - **Progreso:** `--mk-bottom-sheet-progress` en el `<dialog>`, lo visible de su alto (0 cerrado,
 *   1 expandido; el parcial, la mitad de la ventana sobre el alto del sheet), mientras se arrastra
 *   y durante las animaciones, sin volver a dibujar con React. Lo heredan el contenido y el
 *   `::backdrop` (en los tres motores): sirve para atenuar el scrim o revelar algo al expandir.
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
  state: stateProp,
  defaultState,
  onStateChange,
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
  // Controlado o no, como RadioGroup (ADR-0012). `requested` es lo pedido; `state`, lo que se
  // muestra: el parcial pedido sin parcial disponible se muestra expandido.
  const controlled = stateProp !== undefined
  const [uncontrolled, setUncontrolled] = useState<BottomSheetState>(defaultState ?? 'partial')
  const requested = controlled ? stateProp : uncontrolled
  const [hasPartial, setHasPartial] = useState(false)
  const state: BottomSheetState = requested === 'partial' && !hasPartial ? 'expanded' : requested
  // Copias para los manejadores nativos y las medidas, que no esperan a un nuevo render.
  const live = useRef({ state, requested, controlled, skipPartiallyExpanded, defaultState, onStateChange })
  live.current = { state, requested, controlled, skipPartiallyExpanded, defaultState, onStateChange }
  const anchors = useRef<{ partial: number | null; hidden: number }>({ partial: null, hidden: 0 })
  const drag = useRef<Drag | null>(null)
  // Después de un arrastre, el clic que sigue (el del asa, o el de un botón donde empezó) no cuenta.
  const swallowClick = useRef(false)
  const progressFrame = useRef(0)

  /**
   * Pide otro estado: sin controlar, lo aplica; controlado, solo avisa (si el padre no cambia
   * `state`, el sheet vuelve al que tenía). Una llamada por cambio.
   */
  const requestState = (next: BottomSheetState, reason: BottomSheetStateChangeReason) => {
    const l = live.current
    if (next === l.state) return
    // Controlado, lo que se muestra no cambia hasta que el padre cambie `state`: la copia queda
    // igual, así un pedido vetado se puede repetir.
    if (!l.controlled) {
      setUncontrolled(next)
      l.state = next
    }
    l.onStateChange?.(next, reason)
  }

  /** Mide el sheet: si cabe el parcial y dónde queda (`--_partial`). */
  const measure = (dialog: HTMLDialogElement, opening: boolean) => {
    const l = live.current
    const height = dialog.offsetHeight
    const half = viewportHeight() / 2
    const available = !l.skipPartiallyExpanded && height > half
    const partial = available ? Math.round(height - half) : null
    anchors.current = { partial, hidden: height }
    if (partial === null) dialog.style.removeProperty('--_partial')
    else dialog.style.setProperty('--_partial', `${partial}px`)
    setHasPartial(available)
    // Al abrir sin controlar, vuelve al estado inicial (el parcial si existe, o defaultState). Se
    // elige en el efecto de apertura: React vuelve a dibujar antes del primer cuadro.
    let wanted = l.requested
    if (opening && !l.controlled) {
      wanted = l.defaultState ?? (available ? 'partial' : 'expanded')
      setUncontrolled(wanted)
    }
    const shown = wanted === 'partial' && !available ? 'expanded' : wanted
    const before = opening ? wanted : l.state
    // La copia se actualiza ya: otra medición (el efecto pasivo, el ResizeObserver) puede correr
    // antes del próximo render y no tiene que volver a avisar.
    l.requested = wanted
    l.state = shown
    if (shown === before) return
    // El parcial apareció o desapareció: se avisa con 'resize'. Sin controlar, el estado queda en
    // el que se muestra (como Compose, que pasa al expandido y se queda ahí).
    if (!l.controlled) setUncontrolled(shown)
    l.onStateChange?.(shown, 'resize')
  }

  /** Escribe el progreso a partir de la posición en pantalla. */
  const writeProgress = (dialog: HTMLDialogElement, offset?: number) => {
    const height = dialog.offsetHeight
    if (!dialog.open || height === 0) {
      dialog.style.setProperty(PROGRESS, '0')
      return
    }
    const y = offset ?? dialog.getBoundingClientRect().top - (viewportHeight() - height)
    const progress = Math.min(1, Math.max(0, 1 - y / height))
    dialog.style.setProperty(PROGRESS, String(Math.round(progress * 10000) / 10000))
  }

  /** Sigue el progreso cuadro a cuadro mientras haya arrastre o animaciones del sheet. */
  const trackProgress = (dialog: HTMLDialogElement) => {
    writeProgress(dialog)
    if (progressFrame.current) return
    const tick = () => {
      writeProgress(dialog)
      const moving = drag.current?.active || dialog.getAnimations().some((a) => a.playState === 'running')
      progressFrame.current = moving ? requestAnimationFrame(tick) : 0
    }
    progressFrame.current = requestAnimationFrame(tick)
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
      trackProgress(dialog)
    },
    onClosed: (dialog) => {
      drag.current = null
      clearDrag(dialog)
      writeProgress(dialog)
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

  // El progreso sigue a cada cambio de estado (la transición hacia el nuevo) y a la salida.
  // Después del efecto de useModalDialog, que acaba de poner data-closing.
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (dialog?.open) trackProgress(dialog)
  }, [state, open, dialogRef])

  useEffect(
    () => () => {
      cancelAnimationFrame(progressFrame.current)
      progressFrame.current = 0
    },
    [],
  )

  // El padre pide el parcial y no existe: se muestra expandido y se avisa (como al medir).
  // Solo cuando cambia `state` con el sheet abierto: al abrir ya avisa la medición.
  const previousStateProp = useRef(stateProp)
  useLayoutEffect(() => {
    const changed = previousStateProp.current !== stateProp
    previousStateProp.current = stateProp
    const dialog = dialogRef.current
    if (!changed || !dialog?.open || stateProp !== 'partial' || anchors.current.partial !== null) return
    live.current.onStateChange?.('expanded', 'resize')
  }, [stateProp, dialogRef])

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
      const ownsGesture = !d.inContent || live.current.state === 'partial' || (dy > 0 && !scrolledBetween(d.target, dialog))
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
    writeProgress(dialog, d.offset)
  }

  const release = (dialog: HTMLDialogElement, velocity: number | null) => {
    const d = drag.current
    drag.current = null
    if (!d?.active) return
    // Con mouse, el mismo gesto siempre termina en un clic (con la captura, al menos sobre el
    // <dialog>): ese no cuenta. Táctil y lápiz no generan clic después de moverse; si dejaran la
    // marca, se comería la próxima activación del asa con el teclado.
    swallowClick.current = d.mouse
    const list: Anchor<BottomSheetState | 'hidden'>[] = [['expanded', 0]]
    if (anchors.current.partial !== null) list.push(['partial', anchors.current.partial])
    list.push(['hidden', anchors.current.hidden])
    // Cancelado (pointercancel): vuelve al estado donde estaba, sin cerrar.
    const target = velocity === null ? live.current.state : computeTarget(list, d.offset, velocity)
    if (target !== 'hidden') {
      // Sin data-dragging vuelve la transición: el sheet va del punto donde se soltó a su estado
      // (o al anterior, si el padre controla `state` y no lo cambia).
      clearDrag(dialog)
      requestState(target, 'drag')
      trackProgress(dialog)
      return
    }
    // Cerrar: se pide al padre. Si cierra, la salida parte del punto donde se soltó (data-closing
    // le gana a data-dragging). Si no, el sheet vuelve a su estado en el cuadro siguiente.
    dialog.removeAttribute('data-dragging')
    requestClose()
    requestAnimationFrame(() => {
      if (!dialog.hasAttribute('data-closing')) dialog.style.removeProperty('--_drag')
      trackProgress(dialog)
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
    if (live.current.state !== 'partial' || target === e.currentTarget) return
    if (target.matches('.mk-bottom-sheet-content')) return
    if (target.getBoundingClientRect().bottom > viewportHeight()) requestState('expanded', 'focus')
  }

  const generatedId = useId()
  const [titleId, setTitleId] = useState<string | undefined>(undefined)
  const ctx = useMemo<BottomSheetContextValue>(
    () => ({
      titleId: `${generatedId}title`,
      setTitleId,
      state,
      hasPartial,
      requestState,
      requestClose,
    }),
    // requestState lee todo de refs; requestClose cambia con onClose.
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
  /** Nombre del asa cuando expande el sheet parcial. Por defecto "Expand". */
  expandLabel?: string | undefined
  /** Nombre del asa cuando lleva el sheet expandido al parcial. Por defecto "Collapse". */
  collapseLabel?: string | undefined
  /** Nombre del asa cuando cierra (sin estado parcial). Por defecto "Close". */
  closeLabel?: string | undefined
  'aria-label'?: never
  ref?: Ref<HTMLButtonElement> | undefined
}

/**
 * Asa de arrastre (drag handle): la barra de 32 × 4 arriba del sheet, que además es un botón para
 * el teclado y los lectores de pantalla. Como el asa de Compose (que hace lo mismo al tocarla):
 * con el sheet parcial lo expande ("Expand"), expandido lo lleva al parcial ("Collapse") y, sin
 * estado parcial, lo cierra ("Close"). El nombre cambia con la acción.
 *
 * Va como primer hijo del `BottomSheet`: recibe el foco al abrir.
 */
export function BottomSheetHandle({
  expandLabel = bottomSheetStrings.expandLabel,
  collapseLabel = bottomSheetStrings.collapseLabel,
  closeLabel = bottomSheetStrings.closeLabel,
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
        else ctx.requestState(action === 'expand' ? 'expanded' : 'partial', 'handle')
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
