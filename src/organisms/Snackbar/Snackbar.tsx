// Partes visuales del snackbar: universales (ADR-0003), sin estado ni eventos propios. Las usa el
// SnackbarHost (cliente), que les pasa los manejadores; también sirven para dibujar un snackbar
// fijo, por ejemplo en una página de documentación renderizada en el servidor. Decisiones:
// ADR-0022.

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode, Ref } from 'react'
import { cx } from '../../internal/interactive.tsx'
import { Button } from '../../molecules/Button/Button.tsx'
import { IconButton } from '../../molecules/IconButton/IconButton.tsx'
import { CloseIcon } from '../../icons/icons.tsx'

export interface SnackbarProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * La acción debajo del texto, alineada al final (la "longer action" del kit, `actionOnNewLine`
   * de Compose). Es una decisión de quien escribe el texto, no una medida: Compose tampoco lo
   * decide solo.
   */
  actionOnNewLine?: boolean | undefined
  ref?: Ref<HTMLDivElement> | undefined
}

/**
 * Snackbar de Material 3: el contenedor (radio 4, Inverse Surface, elevación 3). Hijos:
 * `SnackbarMessage`, y opcionalmente `SnackbarAction` y `SnackbarClose`, en ese orden.
 *
 * Para mostrar mensajes pasajeros, usar `SnackbarHost` y su cola (`useSnackbar().show(…)`), que
 * agrega la capa superior, la región viva, la duración y el foco. Este componente solo dibuja.
 *
 * ```tsx
 * <Snackbar>
 *   <SnackbarMessage>Foto archivada</SnackbarMessage>
 *   <SnackbarAction>Deshacer</SnackbarAction>
 *   <SnackbarClose />
 * </Snackbar>
 * ```
 */
export function Snackbar({ actionOnNewLine, className, ...rest }: SnackbarProps) {
  return (
    <div
      {...rest}
      className={cx('mk-snackbar', className)}
      data-action-on-new-line={actionOnNewLine ? '' : undefined}
    />
  )
}

export interface SnackbarMessageProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
  ref?: Ref<HTMLDivElement> | undefined
}

/** El texto del snackbar (Body Medium, Inverse On Surface). Material recomienda hasta dos líneas. */
export function SnackbarMessage({ className, ...rest }: SnackbarMessageProps) {
  return <div {...rest} className={cx('mk-snackbar-message', className)} />
}

export interface SnackbarActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement> | undefined
}

/** La acción: un botón de texto en Inverse Primary. Una sola por snackbar. */
export function SnackbarAction({ className, ...rest }: SnackbarActionProps) {
  return <Button {...rest} variant="text" className={cx('mk-snackbar-action', className)} />
}

export interface SnackbarCloseProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  /** Nombre accesible del botón (su `aria-label`). Por defecto "Cerrar". */
  label?: string | undefined
  'aria-label'?: never
  ref?: Ref<HTMLButtonElement> | undefined
}

/** El botón de cerrar: icono `close` de 24 en un círculo de 40, en un área de 48 al final. */
export function SnackbarClose({ label = 'Cerrar', className, ...rest }: SnackbarCloseProps) {
  return (
    <IconButton {...rest} label={label} className={cx('mk-snackbar-close', className)}>
      <CloseIcon />
    </IconButton>
  )
}
