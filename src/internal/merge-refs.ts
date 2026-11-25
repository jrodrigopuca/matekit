// Módulo interno universal: una función pura, sin hooks (sirve en componentes universales y en
// cliente). No se exporta desde src/index.ts. La usan Dialog (su referencia al <dialog> más la
// del uso) y Menu (MenuTrigger y MenuContent: la del uso más la del contexto).
//
// No es un hook a propósito: quien la llama la memoriza (useMemo o useCallback) con las
// referencias como dependencias, para que React no desmonte y vuelva a montar la referencia en
// cada render. Así un mismo módulo sirve también donde no se pueden usar hooks.

import type { Ref, RefCallback } from 'react'

/**
 * Une varias referencias en una sola función `ref`, con la limpieza de React 19.
 *
 * - Objeto (`useRef`, `createRef`): recibe el nodo y vuelve a `null` al limpiar.
 * - Función que devuelve su limpieza: esa limpieza se llama al desmontar, y la función no
 *   vuelve a recibir `null` (lo que hace React con una sola referencia así).
 * - Función sin limpieza: recibe `null` al desmontar, como en React 18.
 * - `undefined` o `null`: se ignoran.
 *
 * Las referencias se asignan en el orden en que se pasan, y se limpian en el mismo orden.
 */
export function mergeRefs<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
  return (node) => {
    const cleanups = refs.map((ref) => {
      if (typeof ref === 'function') {
        const cleanup = ref(node)
        return () => (typeof cleanup === 'function' ? cleanup() : ref(null))
      }
      if (ref) ref.current = node
      return () => {
        if (ref) ref.current = null
      }
    })
    return () => cleanups.forEach((c) => c())
  }
}
