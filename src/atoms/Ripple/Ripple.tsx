'use client'
// Átomo interactivo (ADR-0003): necesita la posición del puntero, así que corre en el cliente.

import { useEffect, useRef, type HTMLAttributes } from 'react'

export interface RippleProps extends HTMLAttributes<HTMLSpanElement> {}

const readToken = (el: Element, name: string, fallback: string): string =>
  getComputedStyle(el).getPropertyValue(name).trim() || fallback
const toMs = (value: string): number =>
  value.endsWith('ms') ? parseFloat(value) : value.endsWith('s') ? parseFloat(value) * 1000 : 0

/**
 * Onda de Material 3: al presionar con el puntero, un círculo crece desde el punto de
 * contacto (500 ms) y se desvanece al soltar (200 ms). Con el teclado no aparece; ahí basta la
 * capa de estado.
 *
 * Se coloca como hijo directo del elemento interactivo y escucha los eventos de ese padre.
 * No se activa si el padre está deshabilitado. Con movimiento reducido, la onda no crece:
 * aparece completa y se desvanece.
 *
 * Personalización: `--mk-ripple-color` (por defecto, `currentColor`).
 */
export function Ripple({ className, ...props }: RippleProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const host = ref.current
    const target = host?.parentElement
    if (!host || !target) return

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      if (target.matches(':disabled, [aria-disabled="true"]')) return

      const rect = host.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      // Radio hasta la esquina más lejana, para cubrir todo el elemento.
      const radius = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y))

      const wave = document.createElement('span')
      wave.className = 'mk-ripple-wave'
      wave.style.left = `${x - radius}px`
      wave.style.top = `${y - radius}px`
      wave.style.width = wave.style.height = `${radius * 2}px`
      host.append(wave)

      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
      wave.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], {
        duration: reduced ? 0 : toMs(readToken(host, '--md-sys-motion-duration-long2', '500ms')),
        easing: readToken(host, '--md-sys-motion-easing-emphasized-decelerate', 'ease-out'),
        fill: 'forwards',
      })

      const release = () => {
        window.removeEventListener('pointerup', release)
        window.removeEventListener('pointercancel', release)
        const fade = wave.animate([{ opacity: getComputedStyle(wave).opacity }, { opacity: 0 }], {
          duration: toMs(readToken(host, '--md-sys-motion-duration-short4', '200ms')),
          easing: readToken(host, '--md-sys-motion-easing-standard', 'ease'),
          fill: 'forwards',
        })
        fade.onfinish = () => wave.remove()
      }
      window.addEventListener('pointerup', release)
      window.addEventListener('pointercancel', release)
    }

    target.addEventListener('pointerdown', onPointerDown)
    return () => target.removeEventListener('pointerdown', onPointerDown)
  }, [])

  return (
    <span
      ref={ref}
      aria-hidden="true"
      {...props}
      className={className ? `mk-ripple ${className}` : 'mk-ripple'}
    />
  )
}
