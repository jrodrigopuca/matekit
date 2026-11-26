'use client'
// Organismo interactivo (ADR-0003): el host lee la cola (useSyncExternalStore), muestra y oculta el
// popover con su salida animada, lleva el tiempo con temporizadores que se detienen con el puntero,
// el foco y la pestaña oculta, anuncia el mensaje en una región viva y maneja Escape, F6 y la
// vuelta del foco. Todo eso necesita estado, efectos y eventos. Las partes visuales (Snackbar.tsx)
// y la cola (snackbar-queue.ts) son universales. Decisiones: ADR-0022.

import {
  createContext,
  use,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { mergeRefs } from '../../internal/merge-refs.ts'
import { Snackbar, SnackbarAction, SnackbarClose, SnackbarMessage } from './Snackbar.tsx'
import { createSnackbarQueue, type SnackbarEntry, type SnackbarQueue } from './snackbar-queue.ts'

const SnackbarContext = createContext<SnackbarQueue | null>(null)

/**
 * La cola del `SnackbarHost` más cercano que envuelve al componente. Con hosts anidados (uno por
 * panel, uno dentro de un Dialog), gana el más cercano.
 *
 * ```tsx
 * const snackbar = useSnackbar()
 * const onArchive = async () => {
 *   archive()
 *   if ((await snackbar.show({ message: 'Foto archivada', action: 'Deshacer' })) === 'action') restore()
 * }
 * ```
 */
export function useSnackbar(): SnackbarQueue {
  const queue = use(SnackbarContext)
  if (!queue) {
    throw new Error(
      'useSnackbar necesita un <SnackbarHost> que envuelva al componente. Si el host está en otro lado del árbol, creá la cola con createSnackbarQueue() y pasásela al host con `queue`.',
    )
  }
  return queue
}

export type SnackbarAlign = 'center' | 'start'

export interface SnackbarHostProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /**
   * La cola que dibuja. Sin definir, el host crea la suya. Una cola, un host: dos hosts con la
   * misma cola mostrarían el mismo snackbar dos veces.
   */
  queue?: SnackbarQueue | undefined
  /** El contenido que puede usar `useSnackbar()`. Puede ser de servidor. */
  children?: ReactNode
  /** Nombre del botón de cerrar si el snackbar no trae `closeLabel`. Por defecto "Cerrar". */
  closeLabel?: string | undefined
  /**
   * Abajo y centrado (por defecto, Compose) o abajo al inicio, que Material admite en ventanas
   * anchas. Debajo de 600 px ocupa siempre el ancho de la ventana menos los márgenes.
   */
  align?: SnackbarAlign | undefined
  /** Llega al snackbar visible (el popover). `className`, `style` y las props nativas también. */
  ref?: Ref<HTMLDivElement> | undefined
}

/** El snackbar contiene al elemento (o es él). */
const holds = (el: HTMLElement | null, node: EventTarget | Node | null) =>
  !!el && node instanceof Node && el.contains(node)

/**
 * Espera a que terminen las animaciones del elemento (las transiciones de salida), sin trabarse:
 * - `allSettled` y no `all`: una transición cancelada rechaza `finished` (por ejemplo, si se activa
 *   el movimiento reducido a mitad de la salida, comprobado en los tres motores el 2026-11-26); con
 *   `all`, el rechazo se perdía y el host quedaba con `data-closing` sin mostrar el siguiente.
 * - Vuelve a consultar al terminar: una transición cancelada puede dejar otra en su lugar.
 * - Solo las que corren y tienen fin: una animación infinita o en pausa de quien usa el componente no
 *   detiene la cola.
 * Sin animaciones (por ejemplo, una salida pedida antes de que la entrada avance: invertir una
 * transición en progreso 0 no crea ninguna), termina enseguida. `getAnimations()` fuerza el cálculo
 * de estilos, así que ya incluye las transiciones que dispara `data-closing`.
 */
async function settleAnimations(el: Element, active: () => boolean) {
  for (;;) {
    const running = el
      .getAnimations()
      .filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().endTime !== Infinity)
    if (running.length === 0 || !active()) return
    await Promise.allSettled(running.map((a) => a.finished))
  }
}

/**
 * Muestra los snackbars de una cola, de a uno, en la capa superior (Popover), abajo de la ventana.
 * Se monta una vez (por ejemplo en el layout, envolviendo la app) y los componentes de adentro
 * muestran mensajes con `useSnackbar().show(…)`, que devuelve una promesa con el resultado.
 *
 * ```tsx
 * <SnackbarHost>
 *   <App />
 * </SnackbarHost>
 * ```
 *
 * - **Anuncio:** una región viva (`role="status"`) que existe siempre en el host recibe el texto
 *   cuando el snackbar aparece, así se anuncia una vez en todos los lectores de pantalla.
 * - **Foco:** no se mueve al aparecer. F6 lleva el foco a la acción (o al cerrar) y F6 otra vez lo
 *   devuelve; también se llega con Tab, porque el snackbar queda en el orden del documento donde
 *   está el host. Al irse con el foco adentro, el foco vuelve a donde estaba.
 * - **Tiempo:** se detiene con el puntero encima, el foco adentro o la pestaña oculta. Escape lo
 *   descarta si el foco está adentro.
 * - **Posición:** `--mk-snackbar-offset` lo sube (por ejemplo, el alto de una NavigationBar o un
 *   FAB).
 */
export function SnackbarHost({
  queue: given,
  children,
  closeLabel = 'Cerrar',
  align = 'center',
  ref,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  onKeyDown,
  ...rest
}: SnackbarHostProps) {
  const [own] = useState(createSnackbarQueue)
  const queue = given ?? own
  const current = useSyncExternalStore(
    queue.subscribe,
    () => queue.current,
    () => null,
  )

  /** El que se dibuja: sigue siendo el anterior mientras sale, aunque la cola ya avanzó. */
  const [shown, setShown] = useState<SnackbarEntry | null>(null)
  const [announcement, setAnnouncement] = useState<SnackbarEntry | null>(null)
  const [hovered, setHovered] = useState(false)
  const [focusWithin, setFocusWithin] = useState(false)
  const [pageHidden, setPageHidden] = useState(false)
  const leaving = shown !== null && current !== shown

  const elRef = useRef<HTMLDivElement | null>(null)
  const mergedRef = useMemo(() => mergeRefs<HTMLDivElement>(ref, elRef), [ref])
  /** Dónde estaba el foco antes de entrar al snackbar, para devolverlo. */
  const returnTo = useRef<HTMLElement | null>(null)
  const timing = useRef<{ id: number; remaining: number }>({ id: 0, remaining: 0 })

  // Pasar al siguiente: si no hay ninguno dibujado, se dibuja el de la cola.
  useEffect(() => {
    if (shown === null && current !== null) setShown(current)
  }, [shown, current])

  // Mostrar el popover. Al cambiar de snackbar se reinician puntero y foco (el elemento es el mismo).
  useLayoutEffect(() => {
    const el = elRef.current
    if (!el || !shown) return
    el.removeAttribute('data-closing')
    el.inert = false
    if (!el.matches(':popover-open')) el.showPopover()
    setHovered(el.matches(':hover'))
    setFocusWithin(el.matches(':focus-within'))
  }, [shown])

  // Salida: el foco vuelve a donde estaba, la animación (data-closing) y recién ahí se oculta.
  useLayoutEffect(() => {
    const el = elRef.current
    if (!el || !leaving) return
    if (el.contains(document.activeElement)) {
      const target = returnTo.current
      if (target?.isConnected) target.focus({ preventScroll: true })
      else (document.activeElement as HTMLElement | null)?.blur()
    }
    returnTo.current = null
    el.setAttribute('data-closing', '')
    el.inert = true
    let active = true
    void settleAnimations(el, () => active).then(() => {
      if (!active) return
      el.removeAttribute('data-closing')
      if (el.matches(':popover-open')) el.hidePopover()
      setShown(null)
    })
    return () => {
      active = false
    }
  }, [leaving])

  // Región viva: el texto llega un cuadro después de mostrarse, a una región que ya existía. Se
  // vacía al irse, así el mismo mensaje dos veces seguidas también es un cambio que se anuncia.
  useEffect(() => {
    if (!shown) {
      setAnnouncement(null)
      return
    }
    const frame = requestAnimationFrame(() => setAnnouncement(shown))
    return () => cancelAnimationFrame(frame)
  }, [shown])

  // Pestaña oculta: el tiempo no corre mientras nadie puede leerlo.
  useEffect(() => {
    if (!shown) return
    const update = () => setPageHidden(document.visibilityState === 'hidden')
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [shown])

  // Tiempo: corre mientras está visible y nada lo detiene; al detenerse, guarda lo que falta.
  const paused = hovered || focusWithin || pageHidden
  useEffect(() => {
    if (!shown || leaving || shown.duration === Infinity) return
    const t = timing.current
    if (t.id !== shown.id) {
      t.id = shown.id
      t.remaining = shown.duration
    }
    if (paused) return
    const started = Date.now()
    const timer = setTimeout(() => shown.close('timeout'), t.remaining)
    return () => {
      clearTimeout(timer)
      t.remaining = Math.max(0, t.remaining - (Date.now() - started))
    }
  }, [shown, leaving, paused])

  // F6: entra a la acción (o al cerrar) desde cualquier lugar de la página, y sale devolviendo el
  // foco. Con varios hosts, el primero que lo atiende (preventDefault) gana.
  const interactive = !!shown && !leaving && (shown.action !== undefined || shown.dismissible)
  useEffect(() => {
    if (!interactive) return
    const onF6 = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'F6' || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      const el = elRef.current
      if (!el) return
      e.preventDefault()
      if (el.contains(document.activeElement)) {
        const target = returnTo.current
        if (target?.isConnected) target.focus()
        else (document.activeElement as HTMLElement | null)?.blur()
        return
      }
      const first = el.querySelector<HTMLElement>('button')
      // focusVisible: el anillo de foco también en WebKit, que no lo pone con focus() por script.
      first?.focus({ focusVisible: true } as FocusOptions)
    }
    document.addEventListener('keydown', onF6)
    return () => document.removeEventListener('keydown', onF6)
  }, [interactive])

  const handlers = {
    onPointerEnter: (e: PointerEvent<HTMLDivElement>) => {
      onPointerEnter?.(e)
      setHovered(true)
    },
    onPointerLeave: (e: PointerEvent<HTMLDivElement>) => {
      onPointerLeave?.(e)
      setHovered(false)
    },
    onFocus: (e: FocusEvent<HTMLDivElement>) => {
      onFocus?.(e)
      if (!holds(elRef.current, e.relatedTarget)) {
        returnTo.current = e.relatedTarget instanceof HTMLElement ? e.relatedTarget : null
      }
      setFocusWithin(true)
    },
    onBlur: (e: FocusEvent<HTMLDivElement>) => {
      onBlur?.(e)
      if (!holds(elRef.current, e.relatedTarget)) setFocusWithin(false)
    },
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e)
      if (e.key !== 'Escape' || e.defaultPrevented || !shown || leaving) return
      // Solo el snackbar: un Dialog que contiene al host no se cierra con este Escape.
      e.preventDefault()
      e.stopPropagation()
      shown.close('dismiss')
    },
  }

  return (
    <SnackbarContext value={queue}>
      {children}
      <div className="mk-snackbar-announcer" role="status" aria-live="polite" aria-atomic="true">
        {announcement && (
          <>
            <span>{announcement.message}</span>
            {announcement.action !== undefined && <span> {announcement.action}</span>}
          </>
        )}
      </div>
      <Snackbar
        {...rest}
        {...handlers}
        ref={mergedRef}
        popover="manual"
        data-align={align}
        actionOnNewLine={shown?.actionOnNewLine}
      >
        {shown && (
          <>
            <SnackbarMessage>{shown.message}</SnackbarMessage>
            {shown.action !== undefined && (
              <SnackbarAction onClick={() => shown.close('action')}>{shown.action}</SnackbarAction>
            )}
            {shown.dismissible && (
              <SnackbarClose label={shown.closeLabel ?? closeLabel} onClick={() => shown.close('dismiss')} />
            )}
          </>
        )}
      </Snackbar>
    </SnackbarContext>
  )
}
