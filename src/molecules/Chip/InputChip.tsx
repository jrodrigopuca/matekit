'use client'
// Molécula interactiva (excepción al ADR-0003, ADR-0019): escucha Supr y Retroceso y, después de
// que el uso quita el chip, mueve el foco al chip vecino. Eso necesita eventos y una referencia
// al DOM, que solo existen en el cliente.
//
// Dos acciones en un mismo chip, como el input chip de @material/web (chips/internal/
// input-chip.ts y trailing-icons.ts): la principal (un `<button>`, o solo texto con `removeOnly`)
// y el botón de quitar, con nombre "Quitar <etiqueta>" armado con aria-labelledby. El contenedor
// (`<span>`) dibuja el chip y no es interactivo: no hay controles anidados.
//
// Quitar (ADR-0019): el chip avisa con `onRemove(event)` y el uso saca el elemento de su lista
// (controlado; el chip no se esconde solo). Con Supr o Retroceso sobre cualquiera de las dos
// acciones (como React Aria TagGroup, useTag.ts; @material/web no lo tiene) o con el botón. Si el
// chip desaparece y el foco se perdió con él, va al chip siguiente, o al anterior si era el
// último, o al grupo si no quedan chips. Si el uso movió el foco en `onRemove` (por ejemplo a su
// campo de texto), se respeta.

import {
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { FocusRing } from '../../atoms/FocusRing/FocusRing.tsx'
import { Ripple } from '../../atoms/Ripple/Ripple.tsx'
import { StateLayer } from '../../atoms/StateLayer/StateLayer.tsx'
import { CloseIcon } from '../../icons/icons.tsx'
import { cx } from '../../internal/interactive.tsx'
import { chipContent, chipDataAttributes } from './chip-content.tsx'

export type InputChipRemoveEvent = KeyboardEvent<HTMLElement> | MouseEvent<HTMLButtonElement>

interface InputChipOwnProps {
  /** Icono o `ChipAvatar` opcional y el texto: `<ChipAvatar><img alt="" src="…" /></ChipAvatar>Ana`. */
  children?: ReactNode
  /**
   * Se llama al pedir quitar el chip (botón de quitar, Supr o Retroceso). El uso lo saca de su
   * lista; el chip no se esconde solo.
   */
  onRemove: (event: InputChipRemoveEvent) => void
  /**
   * Primera parte del nombre del botón de quitar, que sigue con la etiqueta del chip ("Quitar
   * Ana"). Por defecto, "Quitar". Si el chip tiene `aria-label`, se usa ese en lugar de la etiqueta.
   */
  removeLabel?: string | undefined
  /** Deshabilita las dos acciones. */
  disabled?: boolean | undefined
  /** Clase del contenedor del chip. */
  className?: string | undefined
  /** Estilo del contenedor del chip. */
  style?: CSSProperties | undefined
}

/** La acción principal es un `<button>` (seleccionable con `selected`). */
interface InputChipButtonProps
  extends InputChipOwnProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof InputChipOwnProps> {
  removeOnly?: false | undefined
  /** Seleccionado: `aria-pressed` en la acción principal y el relleno `secondary-container`. */
  selected?: boolean | undefined
  /** Referencia al `<button>` principal. */
  ref?: Ref<HTMLButtonElement> | undefined
}

/** Sin acción principal: el chip solo se puede quitar (la etiqueta es texto). */
interface InputChipRemoveOnlyProps
  extends InputChipOwnProps,
    Omit<HTMLAttributes<HTMLSpanElement>, keyof InputChipOwnProps> {
  removeOnly: true
  selected?: undefined
  /** Referencia al `<span>` de la etiqueta. */
  ref?: Ref<HTMLSpanElement> | undefined
}

export type InputChipProps = InputChipButtonProps | InputChipRemoveOnlyProps

const FOCUSABLE = '[data-chip-stop]:not(:disabled)'

/** El primer elemento enfocable del chip vecino (siguiente, o anterior si no hay), o el grupo. */
function focusTargetAfterRemoving(chip: HTMLElement): HTMLElement | null {
  const group = chip.closest<HTMLElement>('.mk-chip-group')
  const scope = group ?? chip.parentElement
  if (!scope) return null
  const chips = [...scope.querySelectorAll<HTMLElement>('[data-chip]')].filter(
    (el) => (el.closest('.mk-chip-group') ?? scope) === (group ?? scope),
  )
  const firstStop = (el: HTMLElement) => (el.matches(FOCUSABLE) ? el : el.querySelector<HTMLElement>(FOCUSABLE))
  const index = chips.indexOf(chip)
  for (const candidate of [...chips.slice(index + 1), ...chips.slice(0, index).reverse()]) {
    const stop = firstStop(candidate)
    if (stop) return stop
  }
  if (group) {
    if (!group.hasAttribute('tabindex')) group.tabIndex = -1
    return group
  }
  return null
}

const focusLost = () => document.activeElement === null || document.activeElement === document.body

/**
 * Chip de entrada: un dato que ingresó el usuario (un destinatario, una etiqueta), con un botón
 * para quitarlo. La lista la maneja el uso:
 *
 * ```tsx
 * <ChipGroup aria-label="Destinatarios">
 *   {personas.map((p) => (
 *     <InputChip key={p.id} onRemove={() => setPersonas((l) => l.filter((x) => x !== p))}>
 *       <ChipAvatar><img alt="" src={p.foto} /></ChipAvatar>{p.nombre}
 *     </InputChip>
 *   ))}
 * </ChipGroup>
 * ```
 *
 * Con `removeOnly`, la etiqueta no es un botón (solo se puede quitar). Las props nativas y la `ref`
 * van a la acción principal; `className` y `style`, al contenedor.
 */
export function InputChip(props: InputChipProps) {
  const {
    children,
    onRemove,
    removeLabel = 'Quitar',
    disabled = false,
    className,
    style,
    removeOnly,
    selected,
    onKeyDown,
    ...rest
  } = props
  const rootRef = useRef<HTMLSpanElement>(null)
  const labelId = useId()
  const removeId = useId()
  const content = chipContent(children, { check: selected === true, labelId })
  const ariaLabel = (rest as { 'aria-label'?: string | undefined })['aria-label']

  const remove = (event: InputChipRemoveEvent) => {
    const chip = rootRef.current
    if (disabled || !chip) return
    const target = focusTargetAfterRemoving(chip)
    onRemove(event)
    // React aplica la actualización de un evento discreto al terminar el evento; se revisa en una
    // microtarea y, por si el uso la difiere (una transición), en los dos cuadros siguientes.
    const settle = (frames: number) => {
      if (!chip.isConnected) {
        if (focusLost() && target?.isConnected) target.focus({ focusVisible: event.type === 'keydown' } as FocusOptions)
      } else if (frames > 0) {
        requestAnimationFrame(() => settle(frames - 1))
      }
    }
    queueMicrotask(() => settle(2))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    ;(onKeyDown as ((e: KeyboardEvent<HTMLElement>) => void) | undefined)?.(event)
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      remove(event)
    }
  }

  const primary = removeOnly ? (
    <span {...(rest as HTMLAttributes<HTMLSpanElement>)} className="mk-input-chip-primary" onKeyDown={handleKeyDown}>
      {content.content}
    </span>
  ) : (
    <button
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
      {...(selected === undefined ? {} : { 'aria-pressed': selected })}
      type={(rest as ButtonHTMLAttributes<HTMLButtonElement>).type ?? 'button'}
      disabled={disabled}
      className="mk-input-chip-primary"
      data-chip-stop=""
      onKeyDown={handleKeyDown}
    >
      <StateLayer />
      <Ripple />
      <FocusRing />
      {content.content}
    </button>
  )

  return (
    <span
      ref={rootRef}
      className={cx('mk-input-chip', className)}
      style={style}
      data-chip="input"
      data-selected={selected ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      data-remove-only={removeOnly ? '' : undefined}
      {...chipDataAttributes(content)}
    >
      {primary}
      <span id={removeId} hidden>
        {ariaLabel ? `${removeLabel} ${ariaLabel}` : removeLabel}
      </span>
      <button
        type="button"
        className="mk-input-chip-remove"
        data-chip-stop=""
        aria-labelledby={ariaLabel ? removeId : `${removeId} ${labelId}`}
        disabled={disabled}
        onClick={remove}
        onKeyDown={handleKeyDown}
      >
        <StateLayer />
        <Ripple />
        <FocusRing />
        <CloseIcon />
      </button>
    </span>
  )
}
