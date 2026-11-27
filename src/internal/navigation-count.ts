// Módulo interno universal (ADR-0003, ADR-0028): sin estado ni efectos, para que NavigationBar,
// NavigationRail y NavigationSuite sigan universales. No se exporta.
//
// Aviso en desarrollo cuando hay más destinos de los que recomienda Material (guía de navigation bar:
// de 3 a 5; navigation rail: de 3 a 7). Se cuenta en el render, sobre los hijos de React, no en el
// DOM: contar en el DOM pediría una parte cliente (un efecto) y cambiaría lo universal. El límite: no
// ve los destinos que dibuja otro componente (`<MyItems />`); sí los que vienen en arrays (`map`),
// en fragmentos y los envueltos uno por uno en un componente con un solo hijo (`<Tooltip>`).
//
// Solo por arriba: con menos de 3, Material sugiere pestañas, pero dos destinos (o uno, mientras una
// app crece) funcionan bien y no tienen arreglo dentro del componente; un aviso ahí sería ruido.

import { Children, Fragment, isValidElement, type ReactNode } from 'react'
import { isDevelopment } from './dev.ts'
import { mkWarn } from './diagnostics.ts'

/**
 * Cantidad de destinos de tipo `type` entre los hijos: directos, dentro de arrays y fragmentos, y los
 * envueltos de a uno en otro elemento (un `Tooltip` alrededor del destino).
 */
export function countDestinations(children: ReactNode, type: unknown): number {
  let count = 0
  for (const child of Children.toArray(children)) {
    if (!isValidElement<{ children?: ReactNode }>(child)) continue
    if (child.type === type) count++
    else if (child.type === Fragment) count += countDestinations(child.props.children, type)
    else if (isValidElement(child.props.children) && child.props.children.type === type) count++
  }
  return count
}

/** Lo que dice el aviso de cada componente. `max` es el máximo de Material. */
const LIMITS = {
  NavigationBar: { component: 'NavigationBar', max: 5, where: '' },
  NavigationSuite: { component: 'NavigationSuite', max: 5, where: ' (it is shown as a navigation bar in compact windows)' },
  // Con layout="rail" la suite nunca es una barra: vale el límite del rail.
  NavigationSuiteRail: { component: 'NavigationSuite', max: 7, where: ' with layout="rail"' },
  NavigationRail: { component: 'NavigationRail', max: 7, where: ' while collapsed' },
} as const

/** El caso: el componente y, en la suite, si la presentación es fija en rail. */
export type DestinationLimitComponent = keyof typeof LIMITS

/**
 * En desarrollo, avisa una vez por componente si `children` trae más destinos de los recomendados.
 * Devuelve si avisó. En producción no cuenta.
 */
export function warnTooManyDestinations(component: DestinationLimitComponent, children: ReactNode, type: unknown): boolean {
  if (!isDevelopment()) return false
  const { component: name, max, where } = LIMITS[component]
  const count = countDestinations(children, type)
  if (count <= max) return false
  return mkWarn(
    'MK_NAVIGATION_TOO_MANY_DESTINATIONS',
    {
      component: name,
      problem: `has more destinations than Material recommends, at most ${max}${where}`,
      fix: `keep at most ${max}; move the rest to a ModalNavigationRail opened from a menu button, or to a Menu of more options`,
    },
    { count, max },
  )
}
