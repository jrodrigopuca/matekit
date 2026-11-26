// Movimiento de la barra de pestañas, compartido por TabList y TabNav (ADR-0023): el indicador que
// se desliza de la pestaña anterior a la nueva y la pestaña elegida traída a la vista en la
// scrollable. Sin estado ni React: funciones sobre el DOM que llaman los efectos de los dos.
//
// Indicador (técnica elegida con una sonda en Chrome, Firefox y WebKit el 2026-11-26): cada
// pestaña tiene el suyo (tab-content.tsx) y, al cambiar, el de la nueva se anima desde el lugar y
// el ancho del anterior con la Web Animations API (FLIP, como @material/web tabs/internal/tab.ts,
// commit dba9f5fe40, pero con `translate` y `width` en lugar de `scaleX`, para no deformar las
// esquinas redondeadas del primary). Descartado CSS anchor positioning con transición: existe en los tres, pero Firefox no
// anima al cambiar de ancla (salta), y el indicador quedaría sin lugar antes de hidratar.
//
// Resorte DefaultSpatial (Compose TabRow.kt, commit c61c795a52: tabIndicatorAnimationSpec =
// MotionSchemeKeyTokens.DefaultSpatial), leído de los tokens. Con movimiento reducido su duración
// es 0 (tokens/motion.css): el indicador aparece en su lugar con un fundido corto (FastEffects),
// sin desplazarse, como @material/web con `shouldReduceMotion()`.

const INDICATOR = '.mk-tab-indicator'

/** Duración en ms de un token de movimiento (`440ms` o `0.44s`). */
function duration(style: CSSStyleDeclaration, token: string): number {
  const raw = style.getPropertyValue(token).trim()
  const value = Number.parseFloat(raw)
  if (!Number.isFinite(value)) return 0
  return raw.endsWith('ms') ? value : value * 1000
}

/** Anima el indicador de `to` desde donde está el de `from` (o lo hace aparecer, sin `from`). */
export function slideIndicator(from: HTMLElement | null, to: HTMLElement) {
  const target = to.querySelector<HTMLElement>(INDICATOR)
  if (!target) return
  const source = from?.querySelector<HTMLElement>(INDICATOR) ?? null
  // Se mide antes de cancelar: si el anterior estaba a mitad de camino, se sale desde ahí.
  const a = source?.getBoundingClientRect()
  for (const animation of [...target.getAnimations(), ...(source?.getAnimations() ?? [])]) {
    if (animation instanceof CSSTransition || animation instanceof CSSAnimation) continue
    animation.cancel()
  }
  const b = target.getBoundingClientRect()
  const style = getComputedStyle(target)
  const spatial = duration(style, '--md-sys-motion-spring-default-spatial-duration')
  if (a && a.width > 0 && b.width > 0 && spatial > 0) {
    target.animate([{ translate: `${a.left - b.left}px 0`, width: `${a.width}px`, offset: 0 }], {
      duration: spatial,
      easing: style.getPropertyValue('--md-sys-motion-spring-default-spatial-easing').trim() || 'ease',
    })
  } else {
    target.animate([{ opacity: 0, offset: 0 }], {
      duration: duration(style, '--md-sys-motion-spring-fast-effects-duration'),
      easing: style.getPropertyValue('--md-sys-motion-spring-fast-effects-easing').trim() || 'ease',
    })
  }
}

/**
 * Trae la pestaña a la vista dentro de la barra, lo más centrada que se pueda (Compose,
 * ScrollableTabData.calculateTabOffset). Desplaza solo la barra (`scrollTo` en ella, no
 * `scrollIntoView`, que también movería la página en vertical). `smooth`: con desplazamiento
 * suave, salvo movimiento reducido.
 */
export function scrollTabIntoView(list: HTMLElement, tab: HTMLElement, smooth: boolean) {
  if (list.scrollWidth <= list.clientWidth) return
  const l = list.getBoundingClientRect()
  const t = tab.getBoundingClientRect()
  const delta = t.left + t.width / 2 - (l.left + l.width / 2)
  if (Math.abs(delta) < 1) return
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  list.scrollTo({ left: list.scrollLeft + delta, behavior: smooth && !reduce ? 'smooth' : 'instant' })
}
