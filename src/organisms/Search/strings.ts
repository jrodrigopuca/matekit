// Textos por defecto de Search (en inglés: son salida para quien usa la librería). Cada clave se
// llama como la prop que lo cambia; el índice src/strings/index.ts los reúne con los demás.
// Universal: sin 'use client', sin estado ni llamadas al cargar el módulo.

export interface SearchStrings {
  /** `SearchBar` `clearLabel`: el botón de borrar el texto. */
  clearLabel: string
  /** `SearchView` `closeLabel`: el botón que cierra la vista a pantalla completa. */
  closeLabel: string
  /** `SearchView` `loadingLabel`: la barra de progreso y el anuncio de la carga. */
  loadingLabel: string
  /** `SearchView` `emptyLabel`: el texto sin sugerencias para un texto escrito. */
  emptyLabel: string
  /** `SearchView` `removeHint`: la descripción oculta de las sugerencias que se pueden quitar. */
  removeHint: string
  /**
   * `SearchView` `formatCount`: el anuncio de la cantidad de sugerencias. Una función por idioma,
   * para que cada uno arme sus plurales (con `Intl.PluralRules` si tiene más de dos formas).
   */
  formatCount: (count: number) => string
  /** `SearchView` `formatRemoved`: el anuncio al quitar una sugerencia, con su texto. */
  formatRemoved: (text: string) => string
}

export const searchStrings: SearchStrings = {
  clearLabel: 'Clear search',
  closeLabel: 'Close search',
  loadingLabel: 'Searching…',
  emptyLabel: 'No results',
  removeHint: 'Press Delete to remove',
  formatCount: (count) => (count === 1 ? '1 suggestion' : `${count} suggestions`),
  formatRemoved: (text) => `Removed ${text}`,
}
