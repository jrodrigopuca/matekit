// Textos por defecto de los chips (en inglés: son salida para quien usa la librería). El índice
// src/strings/index.ts los reúne con los demás.

export interface InputChipStrings {
  /**
   * `InputChip` `removeLabel`: el botón de quitar. Su nombre accesible es este texto seguido de la
   * etiqueta del chip ("Remove Ana").
   */
  removeLabel: string
}

export const inputChipStrings: InputChipStrings = {
  removeLabel: 'Remove',
}
