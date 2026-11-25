'use client'
// Organismo interactivo (ADR-0003): el <dialog> nativo solo queda modal (foco atrapado, fondo
// inerte, ::backdrop como scrim) si se abre con showModal(), que es una llamada del navegador;
// además escucha Escape (cancel) y el clic en el fondo, y espera el fin de la animación de
// salida antes de close(). Todo eso necesita efectos y eventos en el cliente.
//
// El título y el texto comparten ids con el <dialog> para aria-labelledby y aria-describedby;
// esos ids viajan por contexto, así que DialogHeadline y DialogContent también son cliente
// (mismo patrón que TextFieldLabel y TextFieldSupporting). DialogIcon y DialogActions no
// necesitan nada de eso y son universales: están en DialogSlots.tsx.

import {
  createContext,
  use,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DialogHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type Ref,
  type RefCallback,
  type SyntheticEvent,
} from 'react'

interface DialogContextValue {
  headlineId: string
  contentId: string
  setHeadlineId: (id: string | undefined) => void
  setContentId: (id: string | undefined) => void
}

const DialogContext = createContext<DialogContextValue | null>(null)

function useDialog(part: string): DialogContextValue {
  const ctx = use(DialogContext)
  if (!ctx) throw new Error(`${part} tiene que estar dentro de un <Dialog>.`)
  return ctx
}

const cx = (base: string, extra: string | undefined) => (extra ? `${base} ${extra}` : base)

/** Une la referencia interna con la del usuario (objeto o función, con limpieza de React 19). */
function useMergedRef<T>(ref: Ref<T> | undefined): [{ current: T | null }, RefCallback<T>] {
  const inner = useRef<T | null>(null)
  const merged = useCallback<RefCallback<T>>(
    (node) => {
      inner.current = node
      if (typeof ref === 'function') {
        const cleanup = ref(node)
        return () => {
          inner.current = null
          if (typeof cleanup === 'function') cleanup()
          else ref(null)
        }
      }
      if (ref) ref.current = node
      return () => {
        inner.current = null
        if (ref) ref.current = null
      }
    },
    [ref],
  )
  return [inner, merged]
}

/** El punto del evento cae fuera de la caja del diálogo: el clic fue en el fondo (::backdrop). */
function onScrim(dialog: HTMLDialogElement, e: { target: EventTarget; clientX: number; clientY: number }) {
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
function makeScrollableContentFocusable(dialog: HTMLDialogElement): HTMLElement | null {
  const content = dialog.querySelector<HTMLElement>('.mk-dialog-content')
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
 * Elementos que Tab recorre dentro del diálogo, en orden de documento. Incluye el contenido
 * con scroll sin enfocables adentro (ver makeScrollableContentFocusable).
 */
function tabbables(dialog: HTMLDialogElement): HTMLElement[] {
  const all = [...dialog.querySelectorAll<HTMLElement>(`${TABBABLE}, .mk-dialog-content`)]
  return all.filter((el) => {
    if (!el.checkVisibility()) return false
    if (el.classList.contains('mk-dialog-content') && !el.hasAttribute('tabindex')) {
      return el.scrollHeight > el.clientHeight && !el.querySelector(TABBABLE)
    }
    return el.tabIndex >= 0
  })
}

export interface DialogProps extends Omit<DialogHTMLAttributes<HTMLDialogElement>, 'open' | 'onClose'> {
  /** Abierto (modal) o cerrado. El diálogo es controlado: solo cambia cuando cambia `open`. */
  open?: boolean | undefined
  /**
   * El usuario pidió cerrar: Escape, clic en el fondo (scrim) o un cierre que hizo el
   * navegador por su cuenta (un `<form method="dialog">`, o el segundo Escape seguido que
   * Chrome no deja cancelar). El diálogo no se cierra solo: el padre tiene que pasar
   * `open={false}`.
   */
  onClose?: (() => void) | undefined
  /**
   * Si el clic en el fondo pide cerrar (llama a `onClose`). Por defecto `true`, como en
   * Compose (`DialogProperties.dismissOnClickOutside`) y en `@material/web`. Con `false`,
   * solo Escape o las acciones cierran; útil en alertas que exigen una respuesta.
   */
  closeOnScrimClick?: boolean | undefined
  /**
   * Diálogo de alerta (`role="alertdialog"`): un mensaje importante que exige respuesta, como
   * una confirmación destructiva. Equivale a `type="alert"` de `@material/web`.
   */
  alert?: boolean | undefined
  /** Referencia al `<dialog>` nativo. */
  ref?: Ref<HTMLDialogElement> | undefined
}

/**
 * Diálogo modal de Material 3, sobre el `<dialog>` nativo abierto con `showModal()`: el foco
 * queda atrapado, el resto de la página es inerte y el fondo es el `::backdrop`.
 *
 * ```tsx
 * <Dialog open={open} onClose={() => setOpen(false)}>
 *   <DialogIcon><DeleteIcon /></DialogIcon>
 *   <DialogHeadline>¿Eliminar archivo?</DialogHeadline>
 *   <DialogContent>No se puede deshacer.</DialogContent>
 *   <DialogActions>
 *     <Button variant="text" onClick={() => setOpen(false)}>Cancelar</Button>
 *     <Button variant="text" onClick={remove}>Eliminar</Button>
 *   </DialogActions>
 * </Dialog>
 * ```
 *
 * - **Nombre y descripción:** salen de `DialogHeadline` (`aria-labelledby`) y de
 *   `DialogContent` (`aria-describedby`) sin pasar ids. Sin título, pasar `aria-label`. Si el
 *   contenido es largo o complejo (una lista, un formulario), conviene no leerlo entero como
 *   descripción: `aria-describedby=""` la quita, o se puede apuntar a un párrafo propio.
 * - **Foco:** al abrir, el navegador enfoca el primer elemento enfocable (o el diálogo, si no
 *   hay ninguno); para elegir otro, marcarlo con `data-autofocus`. El `autoFocus` de React no
 *   sirve acá: React no escribe el atributo, llama a `focus()` al montar, con el diálogo
 *   todavía cerrado. Al cerrar, el foco vuelve al elemento que lo tenía antes de abrir.
 * - **Salida animada:** con `open={false}` el diálogo anima la salida y recién después llama
 *   a `close()`. Para que se vea, mantener el `Dialog` montado y cambiar `open`; si se
 *   desmonta, desaparece sin animación.
 * - Mientras está abierto, la página no se desplaza (`overflow: hidden` en `<html>`, por CSS).
 *
 * Las props nativas y `ref` llegan al `<dialog>`; `className` y `style` también (es el
 * contenedor visible). El ancho por defecto es 312 px (`--mk-dialog-width`), entre 280 y 560.
 */
export function Dialog({
  open = false,
  onClose,
  closeOnScrimClick = true,
  alert = false,
  className,
  children,
  ref,
  onCancel,
  onClick,
  onKeyDown,
  onPointerDown,
  ...props
}: DialogProps) {
  const [dialogRef, setDialogRef] = useMergedRef(ref)
  const generatedId = useId()
  const [headlineId, setHeadlineId] = useState<string | undefined>(undefined)
  const [contentId, setContentId] = useState<string | undefined>(undefined)

  // Salida en curso: el objeto identifica el cierre pendiente para poder anularlo si `open`
  // vuelve a true antes de que termine la animación.
  const closing = useRef<object | null>(null)
  // El próximo evento `close` lo provocamos nosotros (no es un pedido del usuario).
  const selfClose = useRef(false)
  // Elemento con foco antes de abrir, para devolvérselo al cerrar.
  const opener = useRef<HTMLElement | null>(null)
  const pointerDownOnScrim = useRef(false)

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
        // showModal() enfoca el primer enfocable o el que tenga el atributo autofocus, que
        // React no escribe (su autoFocus llama a focus() al montar, con el diálogo cerrado).
        // data-autofocus es la forma de elegirlo desde React.
        const scroller = makeScrollableContentFocusable(dialog)
        const chosen = dialog.querySelector<HTMLElement>('[data-autofocus]')
        // El contenido largo va antes que las acciones: como en Chrome, recibe el foco inicial
        // para que se pueda leer y desplazar desde el principio.
        ;(chosen ?? scroller)?.focus()
      }
      return
    }
    if (!dialog.open || closing.current) return
    // Salida: data-closing dispara las transiciones de salida (dialog.css); close() espera a
    // que terminen. getAnimations() fuerza el cálculo de estilos, así que ya las incluye. Sin
    // transiciones (duración 0), la lista está vacía y cierra enseguida.
    const token = {}
    closing.current = token
    dialog.setAttribute('data-closing', '')
    Promise.all(dialog.getAnimations().map((a) => a.finished)).then(
      () => {
        if (closing.current !== token) return
        closing.current = null
        dialog.removeAttribute('data-closing')
        if (!dialog.open) return
        selfClose.current = true
        dialog.close()
      },
      // Una transición reemplazada (se volvió a abrir) rechaza `finished`: no hay que cerrar.
      () => {},
    )
  }, [open, dialogRef])

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
    // Escape: el diálogo es controlado, no se cierra hasta que el padre cambie `open`.
    e.preventDefault()
    // Si el navegador no deja cancelar (Chrome, sin interacción desde el Escape anterior), el
    // diálogo se cierra igual y el pedido se avisa en handleNativeClose.
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
    if (open) onClose?.()
  }

  // El <dialog> modal hace inerte el resto de la página, pero Tab desde el último elemento
  // sale del documento (a la barra del navegador). APG pide que dé la vuelta; @material/web
  // hace lo mismo con su focus-trap.
  const handleKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented || e.key !== 'Tab' || e.altKey || e.ctrlKey || e.metaKey) return
    const dialog = e.currentTarget
    const list = tabbables(dialog)
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

  const ctx = useMemo<DialogContextValue>(
    () => ({
      headlineId: `${generatedId}headline`,
      contentId: `${generatedId}content`,
      setHeadlineId,
      setContentId,
    }),
    [generatedId],
  )

  const labelledBy = props['aria-labelledby'] ?? headlineId
  const describedBy = props['aria-describedby'] ?? contentId

  return (
    <DialogContext value={ctx}>
      <dialog
        role={alert ? 'alertdialog' : undefined}
        {...props}
        ref={setDialogRef}
        className={cx('mk-dialog', className)}
        aria-labelledby={labelledBy || undefined}
        aria-describedby={describedBy || undefined}
        onCancel={handleCancel}
        onClose={handleNativeClose}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
      >
        {children}
      </dialog>
    </DialogContext>
  )
}

/** Registra en el diálogo el id de una parte mientras está montada. */
function useRegisteredId(own: string | undefined, fallback: string, register: (id: string | undefined) => void) {
  const id = own ?? fallback
  useLayoutEffect(() => {
    register(id)
    return () => register(undefined)
  }, [id, register])
  return id
}

export interface DialogHeadlineProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Referencia al `<h2>`. */
  ref?: Ref<HTMLHeadingElement> | undefined
}

/**
 * Título del diálogo (Headline Small, `on-surface`), en un `<h2>`. Es el nombre accesible
 * del diálogo. Con `DialogIcon`, se centra.
 */
export function DialogHeadline({ id, className, ...props }: DialogHeadlineProps) {
  const ctx = useDialog('DialogHeadline')
  const ownId = useRegisteredId(id, ctx.headlineId, ctx.setHeadlineId)
  return <h2 {...props} id={ownId} className={cx('mk-dialog-headline', className)} />
}

export interface DialogContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Referencia al contenedor del texto. */
  ref?: Ref<HTMLDivElement> | undefined
}

/**
 * Texto o contenido del diálogo (Body Medium, `on-surface-variant`). Es la descripción
 * accesible del diálogo. Si no entra en la pantalla, se desplaza solo esta parte: el título
 * y las acciones quedan fijos.
 */
export function DialogContent({ id, className, ...props }: DialogContentProps) {
  const ctx = useDialog('DialogContent')
  const ownId = useRegisteredId(id, ctx.contentId, ctx.setContentId)
  return <div {...props} id={ownId} className={cx('mk-dialog-content', className)} />
}
