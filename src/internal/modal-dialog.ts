// Módulo interno (no se exporta desde src/index.ts): un hook, así que solo lo usan componentes
// cliente.
//
// Base común de las capas modales sobre <dialog> (ADR-0025): Dialog, BottomSheet y el SideSheet
// modal, y la futura variante modal del NavigationRail (plan, ítem 23). Era el cuerpo de Dialog.tsx;
// se sacó tal cual al agregar los Sheets para no copiarlo tres veces:
// - showModal() al abrir (foco atrapado, fondo inerte, ::backdrop como scrim) y el foco inicial
//   (data-autofocus, o el contenido largo sin enfocables);
// - Escape (cancel) y el clic en el scrim avisan con onClose: la capa es controlada;
// - Tab da la vuelta dentro de la capa (APG), sin salir a la barra del navegador;
// - la salida: data-closing dispara las transiciones de salida y close() espera su fin con
//   settleAnimations (una transición cancelada no deja la capa modal e invisible);
// - al cerrar, el foco vuelve a quien lo tenía antes de abrir.
// Lo propio de cada componente (forma, posición, arrastre) queda en el componente.

import {
  useLayoutEffect,
  useMemo,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type Ref,
  type RefObject,
  type SyntheticEvent,
} from 'react'
import { mergeRefs } from './merge-refs.ts'
import { settleAnimations } from './settle-animations.ts'

/** El punto del evento cae fuera de la caja de la capa: el clic fue en el fondo (::backdrop). */
export function onScrim(dialog: HTMLDialogElement, e: { target: EventTarget; clientX: number; clientY: number }) {
  if (e.target !== dialog) return false
  const r = dialog.getBoundingClientRect()
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom
}

const TABBABLE = [
  'a[href]',
  'area[href]',
  'button:not(:disabled)',
  'input:not(:disabled):not([type="hidden"])',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  'iframe',
  'audio[controls]',
  'video[controls]',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(', ')

/**
 * El contenido con scroll y sin enfocables adentro se tiene que poder enfocar con el teclado
 * para desplazarlo (WCAG 2.1.1). Chrome lo hace solo, pero Firefox y Safari no siempre: se le
 * pone tabindex="0" al abrir, y se le quita si en otra apertura ya no hace falta. Un
 * tabindex que haya puesto la aplicación no se toca. Devuelve el contenido si quedó enfocable.
 */
function makeScrollableContentFocusable(dialog: HTMLDialogElement, selector: string): HTMLElement | null {
  const content = dialog.querySelector<HTMLElement>(selector)
  if (!content) return null
  const ours = content.hasAttribute('data-mk-scroll-focus')
  if (content.hasAttribute('tabindex') && !ours) return null
  const needed = content.scrollHeight > content.clientHeight && !content.querySelector(TABBABLE)
  if (needed) {
    content.tabIndex = 0
    content.setAttribute('data-mk-scroll-focus', '')
    return content
  }
  if (ours) {
    content.removeAttribute('tabindex')
    content.removeAttribute('data-mk-scroll-focus')
  }
  return null
}

/**
 * Elementos que Tab recorre dentro de la capa, en orden de documento. Incluye el contenido
 * con scroll sin enfocables adentro (ver makeScrollableContentFocusable).
 */
function tabbables(dialog: HTMLDialogElement, contentSelector: string): HTMLElement[] {
  const all = [...dialog.querySelectorAll<HTMLElement>(`${TABBABLE}, ${contentSelector}`)]
  return all.filter((el) => {
    if (!el.checkVisibility()) return false
    if (el.matches(contentSelector) && !el.hasAttribute('tabindex')) {
      return el.scrollHeight > el.clientHeight && !el.querySelector(TABBABLE)
    }
    return el.tabIndex >= 0
  })
}

/** Manejadores del `<dialog>` que la capa combina con los propios. */
export interface ModalDialogHandlers {
  onCancel?: ((e: SyntheticEvent<HTMLDialogElement>) => void) | undefined
  onClick?: ((e: MouseEvent<HTMLDialogElement>) => void) | undefined
  onKeyDown?: ((e: KeyboardEvent<HTMLDialogElement>) => void) | undefined
  onPointerDown?: ((e: PointerEvent<HTMLDialogElement>) => void) | undefined
}

export interface ModalDialogOptions extends ModalDialogHandlers {
  open: boolean
  onClose?: (() => void) | undefined
  closeOnScrimClick: boolean
  /** La `ref` de quien usa el componente. */
  ref?: Ref<HTMLDialogElement> | undefined
  /** Selector de la parte que se desplaza (enfocable si no tiene enfocables adentro). */
  contentSelector: string
  /** Después de `showModal()`, antes de elegir el foco inicial (para medir, por ejemplo). */
  onOpen?: ((dialog: HTMLDialogElement) => void) | undefined
  /** Al terminar la salida, después de `close()`. */
  onClosed?: ((dialog: HTMLDialogElement) => void) | undefined
}

export interface ModalDialog {
  /** La referencia propia al `<dialog>`. */
  dialogRef: RefObject<HTMLDialogElement | null>
  /** Para el `ref` del `<dialog>`: la propia combinada con la del usuario. */
  setRef: (el: HTMLDialogElement | null) => void | (() => void)
  /** Pide cerrar (llama a `onClose`), salvo que la salida ya esté en curso. */
  requestClose: () => void
  /** Props del `<dialog>`: los manejadores, ya combinados con los propios. */
  dialogProps: {
    onCancel: (e: SyntheticEvent<HTMLDialogElement>) => void
    onClose: () => void
    onKeyDown: (e: KeyboardEvent<HTMLDialogElement>) => void
    onPointerDown: (e: PointerEvent<HTMLDialogElement>) => void
    onClick: (e: MouseEvent<HTMLDialogElement>) => void
  }
}

/** El ciclo de vida de una capa modal sobre `<dialog>` (ver el comentario del módulo). */
export function useModalDialog({
  open,
  onClose,
  closeOnScrimClick,
  ref,
  contentSelector,
  onOpen,
  onClosed,
  onCancel,
  onClick,
  onKeyDown,
  onPointerDown,
}: ModalDialogOptions): ModalDialog {
  // La referencia propia al <dialog> se asigna primero y se limpia primero.
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const setRef = useMemo(() => mergeRefs(dialogRef, ref), [ref])

  // Salida en curso: el objeto identifica el cierre pendiente para poder anularlo si `open`
  // vuelve a true antes de que termine la animación.
  const closing = useRef<object | null>(null)
  // El próximo evento `close` lo provocamos nosotros (no es un pedido del usuario).
  const selfClose = useRef(false)
  // Elemento con foco antes de abrir, para devolvérselo al cerrar.
  const opener = useRef<HTMLElement | null>(null)
  const pointerDownOnScrim = useRef(false)
  // Las funciones de apertura y cierre del componente, sin volver a correr el efecto si cambian.
  const hooks = useRef({ onOpen, onClosed })
  hooks.current = { onOpen, onClosed }

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      closing.current = null
      dialog.removeAttribute('data-closing')
      if (!dialog.open) {
        const active = document.activeElement
        opener.current = active instanceof HTMLElement && active !== document.body ? active : null
        dialog.showModal()
        hooks.current.onOpen?.(dialog)
        // showModal() enfoca el primer enfocable o el que tenga el atributo autofocus, que
        // React no escribe (su autoFocus llama a focus() al montar, con el diálogo cerrado).
        // data-autofocus es la forma de elegirlo desde React.
        const scroller = makeScrollableContentFocusable(dialog, contentSelector)
        const chosen = dialog.querySelector<HTMLElement>('[data-autofocus]')
        // El contenido largo va antes que las acciones: como en Chrome, recibe el foco inicial
        // para que se pueda leer y desplazar desde el principio.
        ;(chosen ?? scroller)?.focus()
      }
      return
    }
    if (!dialog.open || closing.current) return
    // Salida: data-closing dispara las transiciones de salida (en el CSS de cada componente);
    // close() espera a que terminen. getAnimations() fuerza el cálculo de estilos, así que ya
    // las incluye. Sin transiciones (duración 0), la lista está vacía y cierra enseguida.
    const token = {}
    closing.current = token
    dialog.setAttribute('data-closing', '')
    // src/internal/settle-animations.ts: una transición cancelada no deja la capa abierta (y la
    // página inerte). Si se volvió a abrir, `closing` ya no es esta ficha: no se cierra.
    void settleAnimations(dialog, () => closing.current === token).then(() => {
      if (closing.current !== token) return
      closing.current = null
      dialog.removeAttribute('data-closing')
      if (!dialog.open) return
      selfClose.current = true
      dialog.close()
      hooks.current.onClosed?.(dialog)
    })
  }, [open, contentSelector])

  // Al desmontar no queda ningún cierre pendiente.
  useLayoutEffect(
    () => () => {
      closing.current = null
    },
    [],
  )

  const requestClose = () => {
    if (closing.current) return
    onClose?.()
  }

  const handleCancel = (e: SyntheticEvent<HTMLDialogElement>) => {
    onCancel?.(e)
    if (e.target !== e.currentTarget) return
    // Escape: la capa es controlada, no se cierra hasta que el padre cambie `open`.
    e.preventDefault()
    // Si el navegador no deja cancelar (Chrome, sin interacción desde el Escape anterior), la
    // capa se cierra igual y el pedido se avisa en handleNativeClose.
    if (e.nativeEvent.defaultPrevented) requestClose()
  }

  const handleNativeClose = () => {
    const dialog = dialogRef.current
    // Devolver el foco a quien lo tenía antes de abrir, si el navegador no lo hizo.
    const target = opener.current
    opener.current = null
    const active = document.activeElement
    if (target?.isConnected && (!active || active === document.body || dialog?.contains(active))) {
      target.focus()
    }
    if (selfClose.current) {
      selfClose.current = false
      return
    }
    // Cerrado por el navegador, no por `open`: es un pedido de cierre del usuario.
    if (dialog) hooks.current.onClosed?.(dialog)
    if (open) onClose?.()
  }

  // El <dialog> modal hace inerte el resto de la página, pero Tab desde el último elemento
  // sale del documento (a la barra del navegador). APG pide que dé la vuelta; @material/web
  // hace lo mismo con su focus-trap.
  const handleKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented || e.key !== 'Tab' || e.altKey || e.ctrlKey || e.metaKey) return
    const dialog = e.currentTarget
    const list = tabbables(dialog, contentSelector)
    const first = list[0]
    const last = list.at(-1)
    if (!first || !last) {
      e.preventDefault()
      return
    }
    const active = document.activeElement
    if (e.shiftKey && (active === first || active === dialog)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const handlePointerDown = (e: PointerEvent<HTMLDialogElement>) => {
    onPointerDown?.(e)
    pointerDownOnScrim.current = onScrim(e.currentTarget, e)
  }

  const handleClick = (e: MouseEvent<HTMLDialogElement>) => {
    onClick?.(e)
    // El clic cuenta como en el fondo si empezó y terminó ahí: arrastrar desde el contenido
    // (por ejemplo, seleccionando texto) y soltar afuera no cierra.
    const started = pointerDownOnScrim.current
    pointerDownOnScrim.current = false
    if (closeOnScrimClick && started && onScrim(e.currentTarget, e)) requestClose()
  }

  return {
    dialogRef,
    setRef,
    requestClose,
    dialogProps: {
      onCancel: handleCancel,
      onClose: handleNativeClose,
      onKeyDown: handleKeyDown,
      onPointerDown: handlePointerDown,
      onClick: handleClick,
    },
  }
}

/** Registra en la capa el id de una parte (el título, el texto) mientras está montada. */
export function useRegisteredId(own: string | undefined, fallback: string, register: (id: string | undefined) => void) {
  const id = own ?? fallback
  useLayoutEffect(() => {
    register(id)
    return () => register(undefined)
  }, [id, register])
  return id
}
