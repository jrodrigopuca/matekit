// Partes universales del Menu (ADR-0003): sin estado, efectos, contexto ni eventos; no llevan
// 'use client'. Se separan de Menu.tsx, que es cliente, para que se puedan renderizar desde un
// Server Component sin arrastrarlo.
//
// Por qué partes y no `leading={…}` (ADR-0002): el icono inicial y el contenido final son
// contenido, y el ADR elige subcomponentes en vez de propiedades de contenido (el mismo motivo
// por el que no hay `startIcon`). Además cada uno tiene su propia caja en el kit: el inicial es
// un icono de 20 en `on-surface-variant` (no en el color del texto) o una sangría vacía para
// alinear con otros elementos que sí tienen icono; el final puede ser un atajo de texto, un
// icono o una insignia, pegado al borde derecho. Es la misma forma que `TextFieldLeading` y
// `TextFieldTrailing`. El texto del elemento no necesita parte: va como hijo de `MenuItem`.

import type { HTMLAttributes, Ref } from 'react'

const cx = (base: string, extra: string | undefined) => (extra ? `${base} ${extra}` : base)

export interface MenuItemLeadingProps extends HTMLAttributes<HTMLSpanElement> {
  ref?: Ref<HTMLSpanElement> | undefined
}

/**
 * Icono inicial de un `MenuItem` (20 px, `on-surface-variant`). Vacío, deja la sangría de un
 * icono para alinear el texto con los elementos que tienen uno. Va primero aunque se escriba
 * después del texto. Seleccionado, el kit usa la versión rellena del icono
 * (`<StarIcon filled />`).
 *
 * ```tsx
 * <MenuItem><MenuItemLeading><EditIcon /></MenuItemLeading>Editar</MenuItem>
 * ```
 */
export function MenuItemLeading({ className, ...props }: MenuItemLeadingProps) {
  return <span {...props} className={cx('mk-menu-item-leading', className)} />
}

export interface MenuItemTrailingProps extends HTMLAttributes<HTMLSpanElement> {
  ref?: Ref<HTMLSpanElement> | undefined
}

/**
 * Contenido final de un `MenuItem`, pegado al borde derecho: un atajo de teclado, un icono o
 * una insignia, en `on-surface-variant`. Es parte del nombre accesible del elemento; si es un
 * atajo, conviene además `aria-keyshortcuts` en el `MenuItem`.
 *
 * ```tsx
 * <MenuItem aria-keyshortcuts="Control+C">Copiar<MenuItemTrailing>Ctrl+C</MenuItemTrailing></MenuItem>
 * ```
 */
export function MenuItemTrailing({ className, ...props }: MenuItemTrailingProps) {
  return <span {...props} className={cx('mk-menu-item-trailing', className)} />
}

export interface MenuDividerProps extends HTMLAttributes<HTMLHRElement> {
  ref?: Ref<HTMLHRElement> | undefined
}

/**
 * Divisor entre grupos de elementos (`role="separator"`): una línea de 1 px en
 * `outline-variant`. No se enfoca. Para un grupo de `type="radio"`, separarlo del resto con
 * divisores, como pide APG.
 */
export function MenuDivider({ className, ...props }: MenuDividerProps) {
  return <hr role="separator" {...props} className={cx('mk-menu-divider', className)} />
}
