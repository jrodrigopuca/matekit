// Módulo interno (no se exporta desde src/index.ts): foco itinerante ("roving tabindex") de los
// grupos de una sola parada de Tab. Lo usan ChipGroup (ADR-0019) y Tabs (ADR-0023), y está pensado
// para las Toolbars (ítem 22 del plan): patrones APG "Toolbar" y "Tabs".
//
// - Una sola parada con tabIndex 0 en el grupo; las demás en -1. Cuál: la enfocada; si el foco está
//   afuera, la que indique `preferred` (la pestaña elegida, como pide APG) o la última que tuvo el
//   foco; si no, la primera habilitada.
// - Flechas según la orientación (izquierda y derecha en horizontal, arriba y abajo en vertical,
//   las cuatro con `both`), invertidas en RTL las horizontales, con vuelta en los extremos (`loop`),
//   Inicio y Fin, sin pasar por las deshabilitadas (`:disabled`). Con Mayús, Ctrl, Alt o Meta no se
//   capturan, ni fuera de las paradas.
// - `activate`: si se pasa, mover el foco con teclado también activa la parada (Tabs con
//   activación automática). Sin ella, el foco se mueve sin activar nada (activación manual,
//   ChipGroup, Toolbar): Enter y Espacio son los del elemento.
//
// El tabIndex se maneja sobre el DOM, no con estado de React (como @material/web): un
// MutationObserver cuenta las paradas que se agregan, quitan o deshabilitan sin que cada una se
// registre, también las de `render`. Sin JavaScript (antes de hidratar), cada parada es una parada
// de Tab: el grupo sigue usable. Contra: un tabIndex propio en una parada se pisa.
//
// Sin 'use client': es un hook que solo importan módulos cliente (ChipGroup, TabList).

import { useCallback, useLayoutEffect, useRef, type FocusEvent, type KeyboardEvent, type RefObject } from 'react'

export type RovingOrientation = 'horizontal' | 'vertical' | 'both'

export interface RovingFocusOptions {
  /** Selector de las paradas (`[data-chip-stop]`, `[role="tab"]`). */
  stop: string
  /**
   * Selector del grupo: una parada es de este grupo si su ancestro más cercano que lo cumple es la
   * raíz (así no se cuentan las de un grupo anidado).
   */
  scope: string
  /** Qué flechas mueven el foco. Por defecto `horizontal`. */
  orientation?: RovingOrientation | undefined
  /** Vuelta en los extremos. Por defecto `true`. */
  loop?: boolean | undefined
  /**
   * La parada de Tab cuando el foco está fuera del grupo (por ejemplo, la pestaña elegida). Sin
   * ella, o si devuelve `undefined`, queda la última que tuvo el foco.
   */
  preferred?: ((stops: HTMLElement[]) => HTMLElement | undefined) | undefined
  /** Si se pasa, se llama después de mover el foco con teclado: mover el foco activa. */
  activate?: ((stop: HTMLElement, event: KeyboardEvent<HTMLElement>) => void) | undefined
}

/** Marca de la última parada que tuvo el foco (sobrevive a que el foco salga del grupo). */
const CURRENT = 'rovingCurrent'

const ownStops = (root: HTMLElement, { stop, scope }: Pick<RovingFocusOptions, 'stop' | 'scope'>) =>
  [...root.querySelectorAll<HTMLElement>(stop)].filter((el) => el.closest(scope) === root)

/** Paradas habilitadas del grupo, en orden del documento. */
export function rovingStops(root: HTMLElement, options: Pick<RovingFocusOptions, 'stop' | 'scope'>): HTMLElement[] {
  return ownStops(root, options).filter((el) => !el.matches(':disabled'))
}

/**
 * Deja una sola parada con tabIndex 0. `focusInside`: si es `false`, se ignora el elemento
 * enfocado (se llama al salir el foco del grupo, cuando todavía puede figurar como activo).
 */
export function updateRovingStops(root: HTMLElement, options: RovingFocusOptions, focusInside = true) {
  const all = ownStops(root, options)
  const enabled = all.filter((el) => !el.matches(':disabled'))
  const active = focusInside ? enabled.find((el) => el === document.activeElement) : undefined
  const current =
    active ??
    options.preferred?.(enabled) ??
    enabled.find((el) => el.tabIndex === 0 && el.dataset[CURRENT] !== undefined) ??
    enabled[0]
  for (const el of all) {
    el.tabIndex = el === current ? 0 : -1
    if (el === current) el.dataset[CURRENT] = ''
    else delete el.dataset[CURRENT]
  }
}

const KEYS: Record<RovingOrientation, readonly string[]> = {
  horizontal: ['ArrowLeft', 'ArrowRight'],
  vertical: ['ArrowUp', 'ArrowDown'],
  both: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'],
}

export interface RovingFocus {
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  onFocus: (event: FocusEvent<HTMLElement>) => void
  onBlur: (event: FocusEvent<HTMLElement>) => void
  /** Vuelve a elegir la parada (por ejemplo, después de cambiar la pestaña elegida). */
  update: () => void
}

/**
 * Foco itinerante sobre las paradas de `root`. Devuelve los manejadores para el elemento raíz
 * (`onKeyDown`, `onFocus`, `onBlur`; el uso llama antes a los suyos) y `update`.
 */
export function useRovingFocus(root: RefObject<HTMLElement | null>, options: RovingFocusOptions): RovingFocus {
  // Las opciones pueden cambiar en cada render (funciones nuevas); los manejadores leen las últimas.
  const latest = useRef(options)
  useLayoutEffect(() => {
    latest.current = options
  })

  const update = useCallback(() => {
    if (root.current) updateRovingStops(root.current, latest.current)
  }, [root])

  // Al montar y cada vez que cambian las paradas o su `disabled`, una sola parada de Tab.
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    updateRovingStops(el, latest.current)
    const observer = new MutationObserver(() => updateRovingStops(el, latest.current))
    observer.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] })
    return () => observer.disconnect()
  }, [root])

  const onFocus = useCallback((event: FocusEvent<HTMLElement>) => {
    if (event.target.matches(latest.current.stop)) updateRovingStops(event.currentTarget, latest.current)
  }, [])

  const onBlur = useCallback((event: FocusEvent<HTMLElement>) => {
    const next = event.relatedTarget
    if (latest.current.preferred && !(next instanceof Node && event.currentTarget.contains(next))) {
      updateRovingStops(event.currentTarget, latest.current, false)
    }
  }, [])

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const opts = latest.current
    const { key } = event
    const arrows = KEYS[opts.orientation ?? 'horizontal']
    if (!arrows.includes(key) && key !== 'Home' && key !== 'End') return
    const rootEl = event.currentTarget
    const stops = rovingStops(rootEl, opts)
    const index = stops.indexOf(event.target as HTMLElement)
    if (index === -1 || stops.length < 2) return
    event.preventDefault()
    let next: HTMLElement | undefined
    if (key === 'Home') next = stops[0]
    else if (key === 'End') next = stops[stops.length - 1]
    else {
      // En RTL, la flecha derecha va hacia atrás, como en @material/web (chip-set.ts, tabs.ts).
      const rtl = getComputedStyle(rootEl).direction === 'rtl'
      const forwards = key === 'ArrowDown' ? true : key === 'ArrowUp' ? false : (key === 'ArrowRight') !== rtl
      const target = index + (forwards ? 1 : -1)
      if (opts.loop === false) next = stops[Math.min(Math.max(target, 0), stops.length - 1)]
      else next = stops[(target + stops.length) % stops.length]
    }
    if (!next || next === event.target) return
    // focusVisible: el foco llegó por teclado; WebKit no lo marca por sí solo al enfocar por script.
    next.focus({ focusVisible: true } as FocusOptions)
    opts.activate?.(next, event)
  }, [])

  return { onKeyDown, onFocus, onBlur, update }
}
