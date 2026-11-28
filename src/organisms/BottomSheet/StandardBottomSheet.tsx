'use client'
// Bottom sheet standard (no modal), el de BottomSheetScaffold de Compose. ADR-0030.
//
// Cliente (ADR-0003): tiene estado (asomado o expandido), mide su alto y sigue al puntero al
// arrastrar. Sin <dialog>: no hay scrim, foco atrapado ni página inerte; el contenido de atrás
// sigue usable. Es un <aside> (región complementaria, como el SideSheet standard) que se ubica
// contra el borde de abajo de su bloque contenedor; como hijo de un PaneScaffold, sobre el área
// de los paneles (arriba de la barra de navegación), y los paneles reciben un relleno de abajo
// igual al asomo (pane-scaffold.css).
//
// El arrastre es el del modal (BottomSheet.tsx): eventos de puntero, el gesto pasa al sheet al
// superar 8 px si es vertical, sigue al puntero (--_drag) y al soltar decide computeTarget de
// src/internal/anchored-drag.ts con los umbrales de Compose (56 px, 125 px/s). Dentro de
// BottomSheetContent, el desplazamiento anidado se decide igual que en el modal.

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type HTMLAttributes,
  type MouseEvent,
  type PointerEvent,
  type Ref,
} from 'react'
import { mergeRefs } from '../../internal/merge-refs.ts'
import { computeTarget, DRAG_SLOP, VelocityTracker, type Anchor } from '../../internal/anchored-drag.ts'
import {
  BottomSheetContext,
  type BottomSheetContextValue,
  type BottomSheetState,
  type BottomSheetStateChangeReason,
} from './bottom-sheet-context.ts'

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

interface Drag {
  id: number
  mouse: boolean
  inContent: boolean
  target: Element
  startX: number
  startY: number
  from: number
  offset: number
  active: boolean
  tracker: VelocityTracker
}

export interface BottomSheetStandardProps extends Omit<HTMLAttributes<HTMLElement>, 'onClose'> {
  /**
   * Standard (no modal): convive con el contenido, asomado (por defecto el asa y la primera línea
   * del título, 80 px; sin título, 56 px; `--mk-bottom-sheet-peek-height` lo cambia) o expandido,
   * sin scrim ni foco atrapado. Va como hijo de un `PaneScaffold` (o de un elemento con
   * `position: relative`), contra su borde de abajo.
   */
  modal: false
  /**
   * Visible (por defecto) u oculto. Oculto se desliza hacia abajo y queda fuera del foco y de la
   * accesibilidad (`inert`).
   */
  open?: boolean | undefined
  /**
   * El usuario pidió ocultarlo arrastrando (o soltando rápido) hacia abajo desde el asomo. Sin
   * `onClose` el sheet no se oculta (Compose: `skipHiddenState = true`, el valor por defecto); con
   * él, el padre decide pasando `open={false}`; si no lo hace, vuelve al asomo.
   */
  onClose?: (() => void) | undefined
  /** Estado controlado: `partial` (asomado) o `expanded`. Ver `onStateChange`. */
  state?: BottomSheetState | undefined
  /** Estado inicial sin controlarlo. Por defecto `partial` (asomado), como Compose. */
  defaultState?: BottomSheetState | undefined
  /**
   * El estado se asentó en otro valor (o, controlado, se pidió): al soltar un arrastre (`drag`), con
   * el asa (`handle`) o al llegar el foco a algo que el asomo deja fuera de la vista (`focus`).
   */
  onStateChange?: ((state: BottomSheetState, reason: BottomSheetStateChangeReason) => void) | undefined
  closeOnScrimClick?: never
  skipPartiallyExpanded?: never
  /** Referencia al `<aside>`. */
  ref?: Ref<HTMLElement> | undefined
}

/** El sheet standard; lo dibuja `BottomSheet` con `modal={false}`. */
export function StandardBottomSheet({
  modal: _modal,
  open = true,
  onClose,
  state: stateProp,
  defaultState = 'partial',
  onStateChange,
  className,
  children,
  ref,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onClickCapture,
  onFocus,
  ...props
}: BottomSheetStandardProps) {
  const controlled = stateProp !== undefined
  const [uncontrolled, setUncontrolled] = useState<BottomSheetState>(defaultState)
  const state = controlled ? stateProp : uncontrolled
  const live = useRef({ state, controlled, onStateChange, onClose })
  live.current = { state, controlled, onStateChange, onClose }
  const sheetRef = useRef<HTMLElement | null>(null)
  const drag = useRef<Drag | null>(null)
  const swallowClick = useRef(false)

  const requestState = (next: BottomSheetState, reason: BottomSheetStateChangeReason) => {
    const l = live.current
    if (next === l.state) return
    if (!l.controlled) {
      setUncontrolled(next)
      l.state = next
    }
    l.onStateChange?.(next, reason)
  }

  // Un gesto táctil del que se adueñó el sheet no desplaza el contenido ni la página: hace falta
  // un manejador nativo no pasivo (el `onTouchMove` de React es pasivo).
  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet) return
    const onTouchMove = (e: TouchEvent) => {
      if (drag.current?.active && e.cancelable) e.preventDefault()
    }
    sheet.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => sheet.removeEventListener('touchmove', onTouchMove)
  }, [])

  /** Desplazamiento actual hacia abajo desde expandido, medido en pantalla (incluye el corrimiento). */
  const currentOffset = (sheet: HTMLElement) => {
    const parent = sheet.offsetParent
    const top = parent ? parent.getBoundingClientRect().top + parent.clientTop : 0
    return sheet.getBoundingClientRect().top - top - sheet.offsetTop
  }

  /** Anclas del arrastre: expandido en 0, asomado y, si se puede ocultar, oculto. */
  const anchors = (sheet: HTMLElement): Anchor<BottomSheetState | 'hidden'>[] => {
    const height = sheet.offsetHeight
    // --_bottom-sheet-peek está registrada como <length>: su valor calculado ya viene en px.
    const peek = Number.parseFloat(getComputedStyle(sheet).getPropertyValue('--_bottom-sheet-peek')) || 0
    const list: Anchor<BottomSheetState | 'hidden'>[] = [['expanded', 0], ['partial', Math.max(0, height - peek)]]
    if (live.current.onClose) list.push(['hidden', height])
    return list
  }

  const clearDrag = (sheet: HTMLElement) => {
    sheet.removeAttribute('data-dragging')
    sheet.style.removeProperty('--_drag')
  }

  const handlePointerDown = (e: PointerEvent<HTMLElement>) => {
    onPointerDown?.(e)
    swallowClick.current = false
    if (e.defaultPrevented || !e.isPrimary || e.button !== 0 || drag.current || !open) return
    const target = e.target as Element
    const mouse = e.pointerType === 'mouse'
    const inContent = !!target.closest('.mk-bottom-sheet-content')
    if (mouse && (inContent || target.closest(FIELD))) return
    const sheet = e.currentTarget
    const tracker = new VelocityTracker()
    tracker.add(performance.now(), e.clientY)
    const from = currentOffset(sheet)
    drag.current = { id: e.pointerId, mouse, inContent, target, startX: e.clientX, startY: e.clientY, from, offset: from, active: false, tracker }
  }

  const handlePointerMove = (e: PointerEvent<HTMLElement>) => {
    onPointerMove?.(e)
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const sheet = e.currentTarget
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.active) {
      if (Math.hypot(dx, dy) < DRAG_SLOP) return
      const vertical = Math.abs(dy) > Math.abs(dx)
      // Como el modal: en el contenido, el sheet se queda con el gesto si está asomado o si se
      // desliza hacia abajo con el contenido arriba de todo; si no, el gesto desplaza.
      const ownsGesture = !d.inContent || live.current.state === 'partial' || (dy > 0 && !scrolledBetween(d.target, sheet))
      if (!vertical || !ownsGesture) {
        drag.current = null
        return
      }
      d.active = true
      d.startY = e.clientY
      d.from = currentOffset(sheet)
      try {
        sheet.setPointerCapture(e.pointerId)
      } catch {
        // NotFoundError: un evento sintético sin puntero activo detrás.
      }
      sheet.setAttribute('data-dragging', '')
    }
    e.preventDefault()
    const list = anchors(sheet)
    const max = Math.max(...list.map((a) => a[1]))
    d.offset = Math.min(Math.max(d.from + (e.clientY - d.startY), 0), max)
    d.tracker.add(performance.now(), e.clientY)
    sheet.style.setProperty('--_drag', `${d.offset}px`)
  }

  const release = (sheet: HTMLElement, velocity: number | null) => {
    const d = drag.current
    drag.current = null
    if (!d?.active) return
    swallowClick.current = d.mouse
    const target = velocity === null ? live.current.state : computeTarget(anchors(sheet), d.offset, velocity, undefined, undefined, 'BottomSheet')
    clearDrag(sheet)
    if (target === 'hidden') {
      // Ocultar se pide al padre; si no pasa `open={false}`, el sheet vuelve a su estado.
      live.current.onClose?.()
      return
    }
    requestState(target, 'drag')
  }

  const handlePointerUp = (e: PointerEvent<HTMLElement>) => {
    onPointerUp?.(e)
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    release(e.currentTarget, d.active ? d.tracker.velocity(performance.now()) : 0)
  }

  const handlePointerCancel = (e: PointerEvent<HTMLElement>) => {
    onPointerCancel?.(e)
    if (drag.current?.id !== e.pointerId) return
    release(e.currentTarget, null)
  }

  const handleClickCapture = (e: MouseEvent<HTMLElement>) => {
    onClickCapture?.(e)
    if (!swallowClick.current) return
    swallowClick.current = false
    e.preventDefault()
    e.stopPropagation()
  }

  // El foco (con Tab) en algo que el asomo deja fuera de la vista expande el sheet.
  const handleFocus = (e: FocusEvent<HTMLElement>) => {
    onFocus?.(e)
    const target = e.target
    if (live.current.state !== 'partial' || target === e.currentTarget) return
    // El borde de abajo de lo visible es el del bloque contenedor: donde termina el sheet sin
    // corrimiento (offsetTop no cuenta el translate).
    const sheet = e.currentTarget
    const parent = sheet.offsetParent
    const bottom = parent ? parent.getBoundingClientRect().top + parent.clientTop + sheet.offsetTop + sheet.offsetHeight : innerHeight
    if (target.getBoundingClientRect().bottom > bottom + 1) requestState('expanded', 'focus')
  }

  const setRef = useMemo(() => mergeRefs(sheetRef, ref), [ref])

  const generatedId = useId()
  const [titleId, setTitleId] = useState<string | undefined>(undefined)
  const ctx = useMemo<BottomSheetContextValue>(
    () => ({
      titleId: `${generatedId}title`,
      setTitleId,
      state,
      hasPartial: true,
      requestState,
      // El asa nunca cierra el standard (siempre hay asomo): ocultar es del arrastre o de la app.
      requestClose: () => live.current.onClose?.(),
    }),
    // requestState y requestClose leen de refs.
    [generatedId, state],
  )

  const labelledBy = props['aria-labelledby'] ?? titleId

  return (
    <BottomSheetContext value={ctx}>
      <aside
        {...props}
        ref={setRef}
        className={cx('mk-bottom-sheet-standard', className)}
        data-state={state}
        data-closed={open ? undefined : ''}
        inert={!open || undefined}
        aria-labelledby={labelledBy || undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClickCapture={handleClickCapture}
        onFocus={handleFocus}
      >
        {children}
      </aside>
    </BottomSheetContext>
  )
}
