// Comportamiento compartido por Tooltip y RichTooltip (ADR-0021): estado abierto (controlado o
// no), el popover con su salida animada, los disparadores del tooltip pasajero (puntero con
// demora, foco de teclado, Escape, presionar, pulsación larga en táctil) y el coordinador que deja
// un solo tooltip pasajero visible a la vez. Módulo de hooks sin componentes: solo lo importan
// Tooltip.tsx y RichTooltip.tsx, que son cliente.
//
// Tiempos (ver tooltip.css y docs/research/07-jetpack-compose.md § Tooltip):
// - SHOW_DELAY_MS y HIDE_DELAY_MS: material-components-web, packages/mdc-tooltip/constants.ts
//   (numbers.SHOW_DELAY_MS = 500 y HIDE_DELAY_MS = 600, commit 817002c296). Compose muestra y oculta
//   con el mouse sin demora (internal/BasicTooltip.kt, PointerEventType.Enter/Exit, commit
//   5a2d24b9bd); en web, sin demora cada pasada del puntero por una barra de iconos abre un
//   tooltip, y la demora de salida es la que deja cruzar la separación de 4 px hasta el tooltip
//   (WCAG 1.4.13).
// - LONG_PRESS_MS: la demora de MDC en touchstart (500); Compose usa la pulsación larga del sistema.
// - TOUCH_DURATION_MS: BasicTooltipDefaults.TooltipDuration (1500, internal/BasicTooltip.kt).
// - Foco de teclado: aparece enseguida (Compose, onFocusChanged) y queda mientras dure el foco
//   (Compose lo cierra a los 1500 ms; WCAG 1.4.13 pide que persista).

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { followAnchor, placeNextTo, type PlacementOptions } from '../../internal/anchor-position.ts'
import { settleAnimations } from '../../internal/settle-animations.ts'

export const SHOW_DELAY_MS = 500
export const HIDE_DELAY_MS = 600
export const LONG_PRESS_MS = 500
export const TOUCH_DURATION_MS = 1500

/** Separación con el ancla: GapTrigger de PlainTooltipTokens.kt (Space50 = 4). Igual en tooltip.css. */
const GAP = 4
/** Arriba y centrado, y abajo si arriba no entra (TooltipAnchorPosition.Above de Compose). */
export const TOOLTIP_PLACEMENT: PlacementOptions = { side: 'top', align: 'center', gap: GAP }

// --- Coordinador: un solo tooltip a la vez (como el GlobalMutatorMutex de Compose) ---

interface Owner {
  close: () => void
}

let transient: Owner | null = null
let persistent: Owner | null = null

/** Hay un tooltip pasajero visible (o esperando su demora de salida): el siguiente aparece ya. */
export const isWarm = () => transient !== null

/**
 * Un tooltip pasajero se muestra: cierra el pasajero anterior. No cierra un rich con acciones
 * abierto: ese lo cerró la persona con un clic y se cierra solo con Escape, otro clic o el foco.
 */
function claimTransient(owner: Owner) {
  if (transient && transient !== owner) transient.close()
  transient = owner
}

/** Un rich con acciones se abre: cierra cualquier otro tooltip, pasajero o con acciones. */
function claimPersistent(owner: Owner) {
  if (transient && transient !== owner) transient.close()
  if (persistent && persistent !== owner) persistent.close()
  transient = null
  persistent = owner
}

function release(owner: Owner) {
  if (transient === owner) transient = null
  if (persistent === owner) persistent = null
}

// --- Estado abierto ---

export interface OpenStateProps {
  /** Visible o no (modo controlado). Sin definir, el tooltip maneja su propio estado. */
  open?: boolean | undefined
  /** Estado inicial en modo no controlado. Por defecto `false`. */
  defaultOpen?: boolean | undefined
  /** Se pide mostrar u ocultar (puntero, foco, Escape, clic, otro tooltip que se abre). */
  onOpenChange?: ((open: boolean) => void) | undefined
}

/** Estado abierto controlado o no, con un `setOpen` estable que no avisa si no cambia. */
export function useOpenState({ open, defaultOpen = false, onOpenChange }: OpenStateProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const controlled = open !== undefined
  const isOpen = controlled ? open : uncontrolled
  const latest = useRef({ isOpen, controlled, onOpenChange })
  latest.current = { isOpen, controlled, onOpenChange }
  const setOpen = useCallback((next: boolean) => {
    const { isOpen: current, controlled: isControlled, onOpenChange: notify } = latest.current
    if (next === current) return
    if (!isControlled) setUncontrolled(next)
    // Se anota enseguida: dos pedidos seguidos en el mismo evento no avisan dos veces.
    latest.current = { ...latest.current, isOpen: next }
    notify?.(next)
  }, [])
  const isOpenNow = useCallback(() => latest.current.isOpen, [])
  return { isOpen, setOpen, isOpenNow }
}

/**
 * Registra el tooltip en el coordinador mientras está abierto: al abrirse cierra el anterior
 * (pasajero, o cualquiera si `persistent`), y al cerrarse libera el lugar.
 */
export function useCoordinator(open: boolean, persistentMode: boolean, setOpen: (open: boolean) => void) {
  const owner = useRef<Owner>({ close: () => setOpen(false) })
  owner.current.close = () => setOpen(false)
  useLayoutEffect(() => {
    if (!open) return
    const o = owner.current
    if (persistentMode) claimPersistent(o)
    else claimTransient(o)
    return () => release(o)
  }, [open, persistentMode])
}

// --- Popover: mostrar, ubicar y ocultar después de la salida ---

/**
 * Muestra el popover (capa superior) al abrir y lo ubica junto al disparador; al cerrar pone
 * `data-closing` (la salida en tooltip.css) y lo oculta cuando terminan las transiciones. Mismo
 * patrón que Menu y Dialog. Sin anchor positioning, lo sigue al desplazarse la página.
 */
export function usePopover(
  open: boolean,
  contentRef: RefObject<HTMLElement | null>,
  triggerRef: RefObject<HTMLElement | null>,
) {
  const closing = useRef<object | null>(null)

  const place = useCallback(() => {
    const content = contentRef.current
    const trigger = triggerRef.current
    if (content && trigger) placeNextTo(content, trigger, TOOLTIP_PLACEMENT)
  }, [contentRef, triggerRef])

  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el) return
    if (open) {
      closing.current = null
      el.removeAttribute('data-closing')
      el.inert = false
      if (!el.matches(':popover-open')) {
        el.showPopover()
        place()
      }
      return
    }
    if (!el.matches(':popover-open') || closing.current) return
    const token = {}
    closing.current = token
    el.setAttribute('data-closing', '')
    // Espera la salida (src/internal/settle-animations.ts). Si se volvió a abrir, `closing` ya no es
    // esta ficha: la espera termina y no se oculta.
    void settleAnimations(el, () => closing.current === token).then(() => {
      if (closing.current !== token) return
      closing.current = null
      el.removeAttribute('data-closing')
      if (el.matches(':popover-open')) el.hidePopover()
    })
  }, [open, contentRef, place])

  useLayoutEffect(
    () => () => {
      closing.current = null
    },
    [],
  )

  // Siempre, no solo sin anchor positioning: si el centrado del navegador falló (placeNextTo) la
  // posición es calculada y hay que seguir al disparador. Un tooltip abierto dura poco.
  useEffect(() => {
    if (!open) return
    return followAnchor(place, false)
  }, [open, place])
}

// --- Disparadores del tooltip pasajero (plain, y rich sin acciones) ---

const isTouch = (e: PointerEvent) => e.pointerType === 'touch'

/**
 * Escucha el disparador y el tooltip, con eventos nativos (así funciona con cualquier elemento que
 * pase la `ref`, sin pedirle que reparta manejadores):
 * - Puntero (mouse o lápiz) sobre el disparador: aparece tras SHOW_DELAY_MS, o enseguida si ya hay
 *   otro tooltip visible. Al salir del disparador o del tooltip, se oculta tras HIDE_DELAY_MS si el
 *   puntero no volvió a ninguno de los dos (se puede pasar el puntero sobre el tooltip).
 * - Foco de teclado (`:focus-visible`): aparece enseguida y queda mientras dure el foco.
 * - Presionar el disparador lo oculta y no vuelve hasta que el puntero salga y entre de nuevo.
 * - Escape lo oculta sin mover el foco ni el puntero; no vuelve hasta salir y entrar o reenfocar.
 * - Táctil: pulsación larga de LONG_PRESS_MS (sin el menú contextual ni el clic al soltar);
 *   se oculta TOUCH_DURATION_MS después de levantar el dedo. Un toque común no lo muestra.
 */
export function useTransientTriggers(
  enabled: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  setOpen: (open: boolean) => void,
  isOpenNow: () => boolean,
) {
  useEffect(() => {
    const trigger = triggerRef.current
    const content = contentRef.current
    if (!enabled || !trigger || !content) return

    let showTimer: ReturnType<typeof setTimeout> | undefined
    let hideTimer: ReturnType<typeof setTimeout> | undefined
    let pressTimer: ReturnType<typeof setTimeout> | undefined
    let hovered = false
    let focused = false
    /** Tras presionar o Escape: no vuelve a aparecer por el puntero hasta que salga y entre. */
    let suppressed = false
    let longPressed = false
    let eatClick: ((e: MouseEvent) => void) | undefined

    const clearTimers = () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
    const show = () => {
      clearTimers()
      setOpen(true)
    }
    const hide = () => {
      clearTimers()
      setOpen(false)
    }
    const scheduleHide = () => {
      clearTimers()
      if (!isOpenNow()) return
      hideTimer = setTimeout(() => {
        if (!hovered && !focused) setOpen(false)
      }, HIDE_DELAY_MS)
    }
    const stopEatingClick = () => {
      if (eatClick) trigger.removeEventListener('click', eatClick, true)
      eatClick = undefined
    }

    const onTriggerEnter = (e: PointerEvent) => {
      if (isTouch(e)) return
      hovered = true
      if (suppressed) return
      clearTimeout(hideTimer)
      if (isOpenNow()) return
      clearTimeout(showTimer)
      if (isWarm()) show()
      else showTimer = setTimeout(show, SHOW_DELAY_MS)
    }
    const onLeave = (e: PointerEvent) => {
      if (isTouch(e)) return
      hovered = false
      if (e.currentTarget === trigger) suppressed = false
      if (!focused) scheduleHide()
      else clearTimeout(showTimer)
    }
    const onContentEnter = (e: PointerEvent) => {
      if (isTouch(e)) return
      hovered = true
      clearTimeout(hideTimer)
    }
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as Element
      if (!target.matches(':focus-visible')) return
      focused = true
      suppressed = false
      show()
    }
    const onFocusOut = (e: FocusEvent) => {
      if (content.contains(e.relatedTarget as Node | null)) return
      focused = false
      suppressed = false
      if (!hovered) hide()
    }
    const onPointerDown = (e: PointerEvent) => {
      stopEatingClick()
      hide()
      suppressed = true
      if (!isTouch(e)) return
      longPressed = false
      clearTimeout(pressTimer)
      pressTimer = setTimeout(() => {
        longPressed = true
        setOpen(true)
      }, LONG_PRESS_MS)
    }
    const onPointerEnd = (e: PointerEvent) => {
      if (!isTouch(e)) return
      clearTimeout(pressTimer)
      if (!longPressed) return
      longPressed = false
      suppressed = false
      hideTimer = setTimeout(() => setOpen(false), TOUCH_DURATION_MS)
      // Como Compose (consume el "up" de la pulsación larga): soltar no activa el disparador.
      if (e.type === 'pointerup') {
        eatClick = (click: MouseEvent) => {
          click.preventDefault()
          click.stopPropagation()
          stopEatingClick()
        }
        trigger.addEventListener('click', eatClick, true)
      }
    }
    const onContextMenu = (e: MouseEvent) => {
      // La pulsación larga abre el menú contextual del navegador: con el tooltip, no.
      if (longPressed || isOpenNow()) e.preventDefault()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !isOpenNow()) return
      // Solo el tooltip: un Dialog o un Menu que lo contengan no se cierran con este Escape.
      e.preventDefault()
      e.stopPropagation()
      suppressed = true
      hide()
    }

    trigger.addEventListener('pointerenter', onTriggerEnter)
    trigger.addEventListener('pointerleave', onLeave)
    trigger.addEventListener('focusin', onFocusIn)
    trigger.addEventListener('focusout', onFocusOut)
    trigger.addEventListener('pointerdown', onPointerDown)
    trigger.addEventListener('pointerup', onPointerEnd)
    trigger.addEventListener('pointercancel', onPointerEnd)
    trigger.addEventListener('contextmenu', onContextMenu)
    content.addEventListener('pointerenter', onContentEnter)
    content.addEventListener('pointerleave', onLeave)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      clearTimers()
      clearTimeout(pressTimer)
      stopEatingClick()
      trigger.removeEventListener('pointerenter', onTriggerEnter)
      trigger.removeEventListener('pointerleave', onLeave)
      trigger.removeEventListener('focusin', onFocusIn)
      trigger.removeEventListener('focusout', onFocusOut)
      trigger.removeEventListener('pointerdown', onPointerDown)
      trigger.removeEventListener('pointerup', onPointerEnd)
      trigger.removeEventListener('pointercancel', onPointerEnd)
      trigger.removeEventListener('contextmenu', onContextMenu)
      content.removeEventListener('pointerenter', onContentEnter)
      content.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [enabled, triggerRef, contentRef, setOpen, isOpenNow])
}

// --- Utilidades de las partes ---

/** Une listas separadas por espacios o comas (ids de `aria-describedby`, nombres de ancla). */
export function joinList(sep: ', ' | ' ', ...items: Array<string | undefined | null | false>): string | undefined {
  const parts = items.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
  return parts.length ? parts.join(sep) : undefined
}

/** `anchor-name` tiene que ser un <dashed-ident>: sin los caracteres que pone useId. */
export const anchorNameFor = (id: string) => `--mk-tooltip-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`
