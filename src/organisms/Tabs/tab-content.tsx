// Módulo universal (ADR-0003): sin estado, efectos, contexto ni eventos; no lleva 'use client'.
// Contenido de una pestaña, compartido por Tab (pestañas APG) y TabLink (enlaces): `TabLabel`, el
// reparto de los hijos en icono, etiqueta e insignia, el indicador y los átomos (ADR-0023).
//
// Los casos simples se escriben corto, como el Button y los chips:
// `<Tab value="vuelos"><FlightIcon />Vuelos</Tab>`. El texto suelto se envuelve en la etiqueta
// (`.mk-tab-label`), que necesita ser un elemento para recortarse con puntos suspensivos; `TabLabel` sirve cuando la etiqueta no es solo texto (un componente de traducción).
// Una `Badge` va sobre la esquina del icono (con su texto para lectores después de la etiqueta) o,
// sin icono, después de la etiqueta. Cualquier otro elemento es el icono.
//
// El indicador es de cada pestaña y se ve solo en la elegida (como @material/web, tab.ts): así está
// en su lugar sin JavaScript (antes de hidratar o en un Server Component) y sigue a la pestaña
// cuando cambia el ancho sin medir nada. El desplazamiento entre pestañas lo anima tab-motion.ts.
// En la primary va dentro del contenido (`position: relative`) y mide su ancho; en la secondary,
// el contenido no está posicionado y el indicador mide el ancho de la pestaña (tabs.css).

import { Children, cloneElement, Fragment, isValidElement, type HTMLAttributes, type ReactElement, type ReactNode, type Ref } from 'react'
import { FocusRing } from '../../atoms/FocusRing/FocusRing.tsx'
import { Ripple } from '../../atoms/Ripple/Ripple.tsx'
import { StateLayer } from '../../atoms/StateLayer/StateLayer.tsx'
import { Badge, type BadgeProps } from '../../molecules/Badge/Badge.tsx'
import { mkWarn } from '../../internal/diagnostics.ts'
import { cx } from '../../internal/interactive.tsx'

export interface TabLabelProps extends HTMLAttributes<HTMLSpanElement> {
  /** Referencia al `<span>`. */
  ref?: Ref<HTMLSpanElement> | undefined
}

/**
 * Etiqueta de la pestaña, para cuando no es solo texto (un texto con formato o un componente de
 * traducción). El texto suelto ya se envuelve solo: `<Tab value="a">Vuelos</Tab>`. Va en una
 * línea; en las fijas, si no entra, se recorta con puntos suspensivos y el nombre accesible sigue
 * siendo el texto completo.
 */
export function TabLabel({ className, ...props }: TabLabelProps) {
  return <span {...props} className={cx('mk-tab-label', className)} />
}

const isLabel = (el: ReactElement) => el.type === TabLabel

/** Hijos en una lista plana: los de un fragmento (`<>{icono}{texto}</>`) cuentan como propios. */
const flatten = (children: ReactNode, prefix = ''): ReactNode[] =>
  Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return [child]
    const key = `${prefix}${String(child.key)}`
    if (child.type === Fragment) return flatten(child.props.children, `${key}/`)
    return [prefix ? cloneElement(child, { key }) : child]
  })
const isBadge = (el: ReactElement) => el.type === Badge

interface TabContent {
  /** Átomos, contenido e indicador, para poner dentro del elemento de la pestaña. */
  children: ReactNode
  /** Atributos de configuración para el CSS (alto y disposición). */
  data: { 'data-icon'?: ''; 'data-label'?: '' }
  /** Si hay etiqueta visible (si no, la pestaña necesita `aria-label`). */
  hasLabel: boolean
}

/** Reparte los hijos de una pestaña en icono, etiqueta e insignia, con el indicador y los átomos. */
export function tabContent(children: ReactNode): TabContent {
  const icon: ReactNode[] = []
  const label: ReactNode[] = []
  const badge: ReactNode[] = []
  let text: Array<string | number> = []
  const flushText = () => {
    if (text.length === 0) return
    label.push(<span key={`label-${label.length}`} className="mk-tab-label">{text.join('')}</span>)
    text = []
  }
  for (const child of flatten(children)) {
    if (typeof child === 'string' || typeof child === 'number') {
      text.push(child)
      continue
    }
    flushText()
    if (!isValidElement(child)) continue
    if (isLabel(child)) label.push(child)
    else if (isBadge(child)) badge.push(child)
    else icon.push(child)
  }
  flushText()
  const hasIcon = icon.length > 0
  // Con icono, la insignia se dibuja sobre él, pero su texto para lectores va después de la
  // etiqueta ("Favoritos 3 nuevos" y no "3 nuevos Favoritos"): la insignia sobre el icono queda
  // decorativa (`label=""`) y su texto, oculto a la vista, después de la etiqueta.
  const badgeText: ReactNode[] = []
  if (hasIcon) {
    for (const [i, el] of badge.entries()) {
      if (!isValidElement<BadgeProps>(el)) continue
      if (el.props.label) badgeText.push(<span key={`badge-${i}`} className="mk-badge-label">{` ${el.props.label}`}</span>)
      badge[i] = cloneElement(el, { label: '' })
    }
  }
  const hasLabel = label.length > 0
  return {
    children: (
      <>
        <StateLayer />
        <Ripple />
        <FocusRing />
        <span className="mk-tab-content">
          {hasIcon ? (
            <span className="mk-tab-icon">
              {icon}
              {badge}
            </span>
          ) : null}
          {label}
          {hasIcon ? badgeText : badge}
          <span className="mk-tab-indicator" aria-hidden="true" />
        </span>
      </>
    ),
    data: { ...(hasIcon ? { 'data-icon': '' as const } : {}), ...(hasLabel ? { 'data-label': '' as const } : {}) },
    hasLabel,
  }
}

/**
 * Una pestaña sin etiqueta visible (solo icono) necesita nombre accesible. No se puede pedir en los
 * tipos (los hijos no dicen si son un icono o un texto), así que se avisa por consola, como un aviso
 * de React: es un error de accesibilidad del uso, no del componente. Solo en desarrollo y una vez
 * por componente (`MK_TAB_UNNAMED`; este módulo es universal: sin instancia, se deduplica por texto).
 */
export function warnIfUnnamed(name: string, hasLabel: boolean, props: Record<string, unknown>) {
  if (hasLabel || props['aria-label'] || props['aria-labelledby']) return
  mkWarn('MK_TAB_UNNAMED', {
    component: name,
    problem: 'a tab without a visible label (icon only) has no accessible name',
    fix: `add aria-label (<${name} aria-label="Home"><HomeIcon /></${name}>) or aria-labelledby; if the label is a component, wrap it in <TabLabel>`,
  })
}
