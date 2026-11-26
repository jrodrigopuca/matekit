// Parte universal del BottomSheet (ADR-0003): sin estado, efectos, contexto ni eventos; no lleva
// 'use client'. Se separa de BottomSheet.tsx, que es cliente, para poder renderizarla desde un
// Server Component.

import type { HTMLAttributes, Ref } from 'react'

export interface BottomSheetContentProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement> | undefined
}

/**
 * Contenido del sheet: la única parte que se desplaza (el asa y el título quedan fijos). Sin
 * relleno propio (una `List` ya trae el suyo). Con el dedo, deslizar hacia abajo estando arriba
 * de todo mueve el sheet en lugar de desplazar; con el sheet parcial, cualquier deslizamiento
 * vertical lo mueve. Con mouse, el contenido no arrastra el sheet: selecciona texto.
 *
 * ```tsx
 * <BottomSheetContent>
 *   <List>…</List>
 * </BottomSheetContent>
 * ```
 */
export function BottomSheetContent({ className, ...props }: BottomSheetContentProps) {
  return <div {...props} className={className ? `mk-bottom-sheet-content ${className}` : 'mk-bottom-sheet-content'} />
}
