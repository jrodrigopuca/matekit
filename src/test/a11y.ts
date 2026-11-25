// Revisión automática de accesibilidad con axe-core (WCAG 2.2 A y AA, más buenas prácticas).
// Detecta contraste insuficiente, ARIA inválido, nombres accesibles faltantes, ids duplicados y
// controles anidados. No reemplaza las pruebas de teclado ni la revisión con lector de pantalla.

import axe from 'axe-core'

/** Reglas que miran la página entera y no aplican a un componente renderizado aislado. */
const PAGE_LEVEL_RULES = ['region', 'page-has-heading-one', 'landmark-one-main', 'document-title', 'html-has-lang']

export interface A11yOptions {
  /** Reglas a desactivar, con motivo en la prueba que lo pida. */
  disable?: string[]
}

/** Devuelve las violaciones encontradas dentro de `root`, en un texto legible. */
export async function a11yViolations(root: Element, options: A11yOptions = {}): Promise<string[]> {
  const rules = Object.fromEntries(
    [...PAGE_LEVEL_RULES, ...(options.disable ?? [])].map((id) => [id, { enabled: false }]),
  )
  const results = await axe.run(root, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
    rules,
    resultTypes: ['violations'],
  })
  return results.violations.flatMap((v) =>
    v.nodes.map((n) => `[${v.impact ?? '?'}] ${v.id}: ${v.help}\n    en ${n.target.join(' ')}\n    ${n.failureSummary ?? ''}`),
  )
}
