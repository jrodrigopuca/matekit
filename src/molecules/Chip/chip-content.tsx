// Módulo universal (ADR-0003): sin estado, efectos, contexto ni eventos; no lleva 'use client'.
// Partes de los chips (ChipLabel, ChipAvatar) y el reparto del contenido en inicio, etiqueta y
// final, compartidos por los cuatro tipos (ADR-0019).
//
// Los casos simples se escriben como el Button: `<AssistChip><EventIcon />Agendar</AssistChip>`.
// El texto suelto se envuelve en la etiqueta (`.mk-chip-label`), que necesita ser un elemento para
// recortarse con puntos suspensivos (un texto suelto en un flex no admite overflow ni
// text-overflow). Los elementos antes de la etiqueta son el inicio (icono o `ChipAvatar`) y los de
// después, el final (un icono de desplegable en el filter). La configuración resultante va en
// atributos `data-*` del chip, que el CSS usa para los rellenos del kit; así no depende de
// selectores frágiles sobre hermanos.

import {
  Children,
  cloneElement,
  isValidElement,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { CheckIcon } from '../../icons/icons.tsx'
import { cx } from '../../internal/interactive.tsx'

export type ChipVariant = 'outlined' | 'elevated'

export interface ChipLabelProps extends HTMLAttributes<HTMLSpanElement> {
  /** Referencia al `<span>`. */
  ref?: Ref<HTMLSpanElement> | undefined
}

/**
 * Etiqueta del chip, para cuando no es solo texto (un texto con formato o un componente de
 * traducción). El texto suelto ya se envuelve solo: `<FilterChip>Vegano</FilterChip>`. Si no
 * entra, se recorta con puntos suspensivos; el nombre accesible sigue siendo el texto completo.
 */
export function ChipLabel({ className, ...props }: ChipLabelProps) {
  return <span {...props} className={cx('mk-chip-label', className)} />
}

export interface ChipAvatarProps extends HTMLAttributes<HTMLSpanElement> {
  /** Referencia al `<span>`. */
  ref?: Ref<HTMLSpanElement> | undefined
}

/**
 * Avatar del input chip: un círculo de 24 px con una imagen (`<img alt="">`, decorativa si el
 * nombre ya está en la etiqueta) o iniciales. Va antes de la etiqueta y hace redondo el chip,
 * como en el kit. Seleccionado, muestra una marca en su lugar.
 */
export function ChipAvatar({ className, ...props }: ChipAvatarProps) {
  return <span {...props} className={cx('mk-chip-avatar', className)} />
}

export interface ChipContent {
  content: ReactNode
  leading: boolean
  trailing: boolean
  avatar: boolean
}

interface ChipContentOptions {
  /** Muestra la marca en lugar del icono de inicio (filter seleccionado) o dentro del avatar. */
  check?: boolean | undefined
  /** `id` de la etiqueta, para nombrar el botón de quitar del input chip. */
  labelId?: string | undefined
}

const isLabel = (el: ReactElement) => el.type === ChipLabel
const isAvatar = (el: ReactElement) => el.type === ChipAvatar

/** Reparte los hijos de un chip en inicio, etiqueta y final, con los atributos para el CSS. */
export function chipContent(children: ReactNode, { check = false, labelId }: ChipContentOptions = {}): ChipContent {
  const leading: ReactNode[] = []
  const label: ReactNode[] = []
  const trailing: ReactNode[] = []
  let text: Array<string | number> = []
  let labelSeen = false

  const flushText = () => {
    if (text.length === 0) return
    const first = !labelSeen
    label.push(
      <span key={`label-${label.length}`} className="mk-chip-label" id={first ? labelId : undefined}>
        {text.join('')}
      </span>,
    )
    labelSeen = true
    text = []
  }

  for (const child of Children.toArray(children)) {
    if (typeof child === 'string' || typeof child === 'number') {
      text.push(child)
      continue
    }
    flushText()
    if (!isValidElement(child)) continue
    if (isLabel(child)) {
      label.push(labelSeen || labelId === undefined ? child : cloneElement(child as ReactElement<ChipLabelProps>, { id: labelId }))
      labelSeen = true
    } else if (labelSeen) {
      trailing.push(child)
    } else {
      leading.push(child)
    }
  }
  flushText()

  const avatarEl = leading.find((el) => isValidElement(el) && isAvatar(el)) as ReactElement<ChipAvatarProps> | undefined
  const checkIcon = <CheckIcon key="check" className="mk-chip-check" />
  let start: ReactNode = null
  if (avatarEl) {
    // El avatar seleccionado conserva su círculo (el chip no cambia de ancho ni de forma) y muestra
    // la marca en lugar de la imagen.
    start = check ? cloneElement(avatarEl, { 'data-checked': '' } as Partial<ChipAvatarProps>, checkIcon) : avatarEl
  } else if (check) {
    start = <span key="leading" className="mk-chip-leading">{checkIcon}</span>
  } else if (leading.length > 0) {
    start = <span key="leading" className="mk-chip-leading">{leading}</span>
  }

  return {
    content: (
      <>
        {start}
        {label}
        {trailing.length > 0 ? <span key="trailing" className="mk-chip-trailing">{trailing}</span> : null}
      </>
    ),
    leading: start !== null,
    trailing: trailing.length > 0,
    avatar: avatarEl !== undefined,
  }
}

/** Atributos de configuración del chip, para los rellenos y la forma (chip.css). */
export const chipDataAttributes = (c: ChipContent) => ({
  'data-leading': c.leading ? '' : undefined,
  'data-trailing': c.trailing ? '' : undefined,
  'data-avatar': c.avatar ? '' : undefined,
})
