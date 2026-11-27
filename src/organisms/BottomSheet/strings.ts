// Textos por defecto de BottomSheet (en inglés: son salida para quien usa la librería). Cada clave
// se llama como la prop de `BottomSheetHandle` que lo cambia; el índice src/strings/index.ts los
// reúne con los demás.

export interface BottomSheetStrings {
  /** `BottomSheetHandle` `expandLabel`: el asa cuando expande el sheet parcial. */
  expandLabel: string
  /** `BottomSheetHandle` `collapseLabel`: el asa cuando lleva el sheet expandido al parcial. */
  collapseLabel: string
  /** `BottomSheetHandle` `closeLabel`: el asa cuando cierra (sin estado parcial). */
  closeLabel: string
}

export const bottomSheetStrings: BottomSheetStrings = {
  expandLabel: 'Expand',
  collapseLabel: 'Collapse',
  closeLabel: 'Close',
}
