// Partes universales del SideSheet (ADR-0003): sin estado, efectos, contexto ni eventos propios; no
// llevan 'use client'. Se separan de SideSheet.tsx, que es cliente, para poder renderizarlas desde
// un Server Component. SideSheetBack es un IconButton (universal) con el onClick de quien lo usa.

import type { HTMLAttributes, Ref } from 'react'
import { IconButton, type IconButtonProps } from '../../molecules/IconButton/IconButton.tsx'
import { ArrowBackIcon } from '../../icons/icons.tsx'

const cx = (base: string, extra: string | undefined) => (extra ? `${base} ${extra}` : base)

export interface SideSheetPartProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement> | undefined
}

/**
 * Cabecera de 76: `SideSheetBack` opcional, `SideSheetTitle` y `SideSheetClose`, en ese orden.
 *
 * ```tsx
 * <SideSheetHeader>
 *   <SideSheetBack onClick={back} />
 *   <SideSheetTitle>Detalle</SideSheetTitle>
 *   <SideSheetClose />
 * </SideSheetHeader>
 * ```
 */
export function SideSheetHeader({ className, ...props }: SideSheetPartProps) {
  return <div {...props} className={cx('mk-side-sheet-header', className)} />
}

/** Omit que se reparte sobre cada forma de la unión (botón, enlace, `render`). */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

export type SideSheetBackProps = DistributiveOmit<IconButtonProps, 'label' | 'children' | 'width'> & {
  /** Nombre accesible del botón. Por defecto "Volver". */
  label?: string | undefined
}

/**
 * Botón de volver de la cabecera (icon button standard angosto con `arrow_back`, que en RTL apunta
 * a la derecha). Lo que hace lo decide el `onClick`, o `href`/`render` si es un enlace.
 */
export function SideSheetBack({ label = 'Volver', className, ...props }: SideSheetBackProps) {
  return (
    <IconButton {...props} label={label} width="narrow" className={cx('mk-side-sheet-back', className)}>
      <ArrowBackIcon />
    </IconButton>
  )
}

/** Contenido libre, sin relleno propio; la única parte que se desplaza. */
export function SideSheetContent({ className, ...props }: SideSheetPartProps) {
  return <div {...props} className={cx('mk-side-sheet-content', className)} />
}

/**
 * Acciones al pie, con un divisor arriba: botones `Button` chicos (por ejemplo uno filled y uno
 * outlined), alineados al inicio con 8 entre sí.
 */
export function SideSheetActions({ className, ...props }: SideSheetPartProps) {
  return <div {...props} className={cx('mk-side-sheet-actions', className)} />
}
