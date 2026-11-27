// Textos por defecto de SideSheet (en inglés: son salida para quien usa la librería). El índice
// src/strings/index.ts los reúne con los demás.

export interface SideSheetStrings {
  /** `SideSheetClose` `label`: el botón de cerrar. */
  closeLabel: string
  /** `SideSheetBack` `label`: el botón de volver. */
  backLabel: string
}

export const sideSheetStrings: SideSheetStrings = {
  closeLabel: 'Close',
  backLabel: 'Back',
}
