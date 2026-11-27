// Textos por defecto de Snackbar (en inglés: son salida para quien usa la librería). El índice
// src/strings/index.ts los reúne con los demás.

export interface SnackbarStrings {
  /**
   * El botón de cerrar: `SnackbarClose` `label`, y `SnackbarHost` `closeLabel` (si el snackbar no
   * trae el suyo).
   */
  closeLabel: string
}

export const snackbarStrings: SnackbarStrings = {
  closeLabel: 'Close',
}
