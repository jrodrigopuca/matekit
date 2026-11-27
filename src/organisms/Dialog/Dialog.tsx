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
  useId,
  useMemo,
  useState,
  type DialogHTMLAttributes,
  type HTMLAttributes,
  type Ref,
} from 'react'
import { useModalDialog, useRegisteredId } from '../../internal/modal-dialog.ts'
import { partOutsideParent } from '../../internal/diagnostics.ts'

interface DialogContextValue {
  headlineId: string
  contentId: string
  setHeadlineId: (id: string | undefined) => void
  setContentId: (id: string | undefined) => void
}

const DialogContext = createContext<DialogContextValue | null>(null)

function useDialog(part: string): DialogContextValue {
  const ctx = use(DialogContext)
  if (!ctx) throw partOutsideParent(part, 'Dialog')
  return ctx
}

const cx = (base: string, extra: string | undefined) => (extra ? `${base} ${extra}` : base)

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
  // El ciclo de vida modal (showModal, Escape, scrim, Tab, salida animada, devolución del foco)
  // es la base común de src/internal/modal-dialog.ts (ADR-0025).
  const { setRef, dialogProps } = useModalDialog({
    open,
    onClose,
    closeOnScrimClick,
    ref,
    contentSelector: '.mk-dialog-content',
    onCancel,
    onClick,
    onKeyDown,
    onPointerDown,
  })
  const generatedId = useId()
  const [headlineId, setHeadlineId] = useState<string | undefined>(undefined)
  const [contentId, setContentId] = useState<string | undefined>(undefined)

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
        {...dialogProps}
        ref={setRef}
        className={cx('mk-dialog', className)}
        aria-labelledby={labelledBy || undefined}
        aria-describedby={describedBy || undefined}
      >
        {children}
      </dialog>
    </DialogContext>
  )
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
