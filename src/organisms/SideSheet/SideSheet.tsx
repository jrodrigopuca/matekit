'use client'
// Organismo interactivo (ADR-0003, ADR-0025): el side sheet modal es un <dialog> abierto con
// showModal() (efecto) con la misma base que el Dialog y el BottomSheet
// (src/internal/modal-dialog.ts). El standard no lo necesita, pero comparte las partes: el título
// registra su id para aria-labelledby y el botón de cerrar llama a onClose, los dos por contexto,
// así que SideSheetTitle y SideSheetClose son cliente. El resto de las partes son universales
// (SideSheetSlots.tsx).

import {
  createContext,
  use,
  useId,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type DialogHTMLAttributes,
  type HTMLAttributes,
  type Ref,
} from 'react'
import { IconButton } from '../../molecules/IconButton/IconButton.tsx'
import { CloseIcon } from '../../icons/icons.tsx'
import { useModalDialog, useRegisteredId } from '../../internal/modal-dialog.ts'
import { partOutsideParent } from '../../internal/diagnostics.ts'
import { sideSheetStrings } from './strings.ts'

interface SideSheetContextValue {
  titleId: string
  setTitleId: (id: string | undefined) => void
  requestClose: () => void
}

const SideSheetContext = createContext<SideSheetContextValue | null>(null)

function useSideSheet(part: string): SideSheetContextValue {
  const ctx = use(SideSheetContext)
  if (!ctx) throw partOutsideParent(part, 'SideSheet')
  return ctx
}

const cx = (base: string, extra: string | undefined) => (extra ? `${base} ${extra}` : base)

interface SideSheetCommonProps {
  /**
   * El usuario pidió cerrar: `SideSheetClose` y, en el modal, Escape, el clic en el scrim o un
   * cierre del navegador. El sheet es controlado: el padre tiene que pasar `open={false}`.
   */
  onClose?: (() => void) | undefined
}

export interface SideSheetModalProps
  extends SideSheetCommonProps, Omit<DialogHTMLAttributes<HTMLDialogElement>, 'open' | 'onClose'> {
  /** Modal (por defecto): sobre el contenido, desde el borde final, con scrim y foco atrapado. */
  modal?: true | undefined
  /** Abierto (modal) o cerrado. Por defecto cerrado. */
  open?: boolean | undefined
  /** Si el clic en el scrim pide cerrar. Por defecto `true`. */
  closeOnScrimClick?: boolean | undefined
  /** Referencia al `<dialog>` nativo. */
  ref?: Ref<HTMLDialogElement> | undefined
}

export interface SideSheetStandardProps extends SideSheetCommonProps, HTMLAttributes<HTMLElement> {
  /** Standard: en el flujo de la página, al lado del contenido, sin scrim ni foco atrapado. */
  modal: false
  /** Visible u oculto (`hidden`). Por defecto visible. */
  open?: boolean | undefined
  closeOnScrimClick?: never
  /** Referencia al `<aside>`. */
  ref?: Ref<HTMLElement> | undefined
}

export type SideSheetProps = SideSheetModalProps | SideSheetStandardProps

/**
 * Side sheet de Material 3: contenido o controles secundarios junto al borde final de la ventana.
 *
 * ```tsx
 * <SideSheet open={open} onClose={() => setOpen(false)}>
 *   <SideSheetHeader>
 *     <SideSheetTitle>Filtros</SideSheetTitle>
 *     <SideSheetClose />
 *   </SideSheetHeader>
 *   <SideSheetContent>…</SideSheetContent>
 *   <SideSheetActions>
 *     <Button onClick={apply}>Aplicar</Button>
 *     <Button variant="outlined" onClick={() => setOpen(false)}>Cancelar</Button>
 *   </SideSheetActions>
 * </SideSheet>
 * ```
 *
 * - **Modal** (por defecto): un `<dialog>` con `showModal()`, como el `Dialog` (foco atrapado,
 *   página inerte, scrim, Escape y clic en el scrim llaman a `onClose`, salida animada, foco
 *   devuelto). Entra desde el borde final (en RTL, el izquierdo), de alto completo, con radio 16
 *   del lado del contenido. 320 px de ancho (`--mk-side-sheet-width`), y en una ventana angosta
 *   deja al menos 48 px de scrim para tocar y cerrar.
 * - **Standard** (`modal={false}`): un `<aside>` (región complementaria) en el flujo de la
 *   página, sin radio y con un divisor del lado del contenido (el inicio: va al final de la fila).
 *   Con `open={false}` queda oculto.
 * - **Nombre:** sale de `SideSheetTitle` (`aria-labelledby`); sin título, pasar `aria-label`.
 *
 * Las props nativas y `ref` llegan al `<dialog>` o al `<aside>`; `className` y `style` también.
 */
export function SideSheet(props: SideSheetProps) {
  return props.modal === false ? <StandardSideSheet {...props} /> : <ModalSideSheet {...props} />
}

function useTitle() {
  const generatedId = useId()
  const [titleId, setTitleId] = useState<string | undefined>(undefined)
  return { fallback: `${generatedId}title`, titleId, setTitleId }
}

function ModalSideSheet({
  modal: _modal,
  open = false,
  onClose,
  closeOnScrimClick = true,
  className,
  children,
  ref,
  onCancel,
  onClick,
  onKeyDown,
  onPointerDown,
  ...props
}: SideSheetModalProps) {
  const { setRef, requestClose, dialogProps } = useModalDialog({
    open,
    onClose,
    closeOnScrimClick,
    ref,
    contentSelector: '.mk-side-sheet-content',
    onCancel,
    onClick,
    onKeyDown,
    onPointerDown,
  })
  const title = useTitle()
  const ctx = useMemo<SideSheetContextValue>(
    () => ({ titleId: title.fallback, setTitleId: title.setTitleId, requestClose }),
    // requestClose cambia con onClose.
    [title.fallback, title.setTitleId, onClose],
  )
  const labelledBy = props['aria-labelledby'] ?? title.titleId
  return (
    <SideSheetContext value={ctx}>
      <dialog
        {...props}
        {...dialogProps}
        ref={setRef}
        className={cx('mk-side-sheet mk-side-sheet-modal', className)}
        aria-labelledby={labelledBy || undefined}
      >
        {children}
      </dialog>
    </SideSheetContext>
  )
}

function StandardSideSheet({ modal: _modal, open = true, onClose, className, children, ...props }: SideSheetStandardProps) {
  const title = useTitle()
  const ctx = useMemo<SideSheetContextValue>(
    () => ({ titleId: title.fallback, setTitleId: title.setTitleId, requestClose: () => onClose?.() }),
    [title.fallback, title.setTitleId, onClose],
  )
  const labelledBy = props['aria-labelledby'] ?? title.titleId
  return (
    <SideSheetContext value={ctx}>
      <aside
        {...props}
        hidden={!open || props.hidden}
        className={cx('mk-side-sheet mk-side-sheet-standard', className)}
        aria-labelledby={labelledBy || undefined}
      >
        {children}
      </aside>
    </SideSheetContext>
  )
}

export interface SideSheetTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Referencia al `<h2>`. */
  ref?: Ref<HTMLHeadingElement> | undefined
}

/** Título del sheet (Title Large, `on-surface-variant`), en un `<h2>`. Es su nombre accesible. */
export function SideSheetTitle({ id, className, ...props }: SideSheetTitleProps) {
  const ctx = useSideSheet('SideSheetTitle')
  const ownId = useRegisteredId(id, ctx.titleId, ctx.setTitleId)
  return <h2 {...props} id={ownId} className={cx('mk-side-sheet-title', className)} />
}

export interface SideSheetCloseProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  /** Nombre accesible del botón (su `aria-label`). Por defecto "Close". */
  label?: string | undefined
  'aria-label'?: never
  ref?: Ref<HTMLButtonElement> | undefined
}

/**
 * Botón de cerrar de la cabecera (icon button standard con `close`): llama a `onClose` del
 * `SideSheet`, salvo que el `onClick` propio llame a `preventDefault()`.
 */
export function SideSheetClose({ label = sideSheetStrings.closeLabel, className, onClick, ...props }: SideSheetCloseProps) {
  const ctx = useSideSheet('SideSheetClose')
  return (
    <IconButton
      {...props}
      label={label}
      className={cx('mk-side-sheet-close', className)}
      onClick={(e) => {
        onClick?.(e)
        if (!e.defaultPrevented) ctx.requestClose()
      }}
    >
      <CloseIcon />
    </IconButton>
  )
}
