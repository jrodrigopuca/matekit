'use client'
// Molécula interactiva (excepción al ADR-0003, ADR-0019): lee la selección del ChipGroup por
// contexto, que solo existe en el cliente, como RadioButton con RadioGroup (ADR-0012). Suelto,
// sin grupo, es un toggle controlado como el Button (`selected` y `onClick`).
//
// Siempre es un `<button type="button">` con `aria-pressed` (patrón APG "Button", toggle), también
// dentro de un grupo de selección simple, como el filter chip de @material/web
// (chips/internal/filter-chip.ts). Un filtro no es un enlace: no acepta `href` ni `render`.

import type { ButtonHTMLAttributes, MouseEvent, ReactNode, Ref } from 'react'
import type { ChipVariant } from './chip-content.tsx'
import { chipElement } from './chip-element.tsx'
import { useChipGroupContext } from './ChipGroup.tsx'

export interface FilterChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'value'> {
  /** `outlined` (por defecto) o `elevated`. */
  variant?: ChipVariant | undefined
  /**
   * Seleccionado (controlado). Sin definir: lo decide el `ChipGroup` con selección según `value`,
   * o `false` fuera de un grupo. Seleccionado, el icono de inicio pasa a una marca.
   */
  selected?: boolean | undefined
  /** Valor del filtro en el `ChipGroup` con `selectionMode`. También va al `value` del botón. */
  value?: string | undefined
  /** Un icono opcional, el texto y, si hace falta, un icono final (un desplegable). */
  children?: ReactNode
  /** Referencia al `<button>`. */
  ref?: Ref<HTMLButtonElement> | undefined
}

/**
 * Chip de filtro: un toggle que filtra contenido ("Vegano", "Con envío"). Seleccionado, se
 * rellena en `secondary-container` y muestra una marca al inicio.
 *
 * ```tsx
 * <FilterChip selected={vegano} onClick={() => setVegano(!vegano)}>Vegano</FilterChip>
 * <ChipGroup aria-label="Dieta" selectionMode="multiple" defaultValue={['vegano']}>
 *   <FilterChip value="vegano">Vegano</FilterChip>
 *   <FilterChip value="sin-tacc">Sin TACC</FilterChip>
 * </ChipGroup>
 * ```
 *
 * El `onClick` propio se llama antes que el aviso del grupo; con `event.preventDefault()`, el
 * grupo no cambia la selección.
 */
export function FilterChip(props: FilterChipProps) {
  const { variant = 'outlined', selected: selectedProp, value, onClick, className, children, ...rest } = props
  const group = useChipGroupContext()
  const fromGroup = selectedProp === undefined && value !== undefined && group !== null && group.selectionMode !== 'none'
  const selected = selectedProp ?? (fromGroup ? group.value.includes(value) : false)

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event)
    if (fromGroup && !event.defaultPrevented) group.toggle(value, event)
  }

  return chipElement(
    { name: 'FilterChip', type: 'filter', variant, selected, checkWhenSelected: true, className, children },
    { ...rest, value, onClick: handleClick },
  )
}
