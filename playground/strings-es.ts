// Los textos de los componentes en español, como los armaría una app: un `MatekitStrings` (el tipo
// avisa si falta uno nuevo) que las páginas pasan por las props. Los textos por defecto de matekit
// están en inglés (src/strings/index.ts).

import type { MatekitStrings } from '../src/index.ts'

const plural = new Intl.PluralRules('es')

export const es: MatekitStrings = {
  bottomSheet: { expandLabel: 'Expandir', collapseLabel: 'Contraer', closeLabel: 'Cerrar' },
  inputChip: { removeLabel: 'Quitar' },
  search: {
    clearLabel: 'Borrar búsqueda',
    closeLabel: 'Cerrar búsqueda',
    loadingLabel: 'Buscando…',
    emptyLabel: 'Sin resultados',
    removeHint: 'Supr para quitar',
    formatCount: (count) => (plural.select(count) === 'one' ? `${count} sugerencia` : `${count} sugerencias`),
    formatRemoved: (text) => `Se quitó ${text}`,
  },
  sideSheet: { closeLabel: 'Cerrar', backLabel: 'Volver' },
  snackbar: { closeLabel: 'Cerrar' },
}
