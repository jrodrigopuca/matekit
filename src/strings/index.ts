// Índice de los textos por defecto de los componentes: todo texto visible o anunciado que un
// componente pone por su cuenta vive en el strings.ts de su carpeta, en inglés, y se suma acá.
// Sirve para ver todos los textos juntos, como base de una traducción (una app copia el objeto y
// lo pasa por las props de cada componente) y para tests/strings.test.ts, que comprueba que no
// queden textos escritos a mano en los componentes. Universal y sin efectos al cargar: quien no lo
// importa no lo lleva en su paquete.

import { inputChipStrings, type InputChipStrings } from '../molecules/Chip/strings.ts'
import { bottomSheetStrings, type BottomSheetStrings } from '../organisms/BottomSheet/strings.ts'
import { searchStrings, type SearchStrings } from '../organisms/Search/strings.ts'
import { sideSheetStrings, type SideSheetStrings } from '../organisms/SideSheet/strings.ts'
import { snackbarStrings, type SnackbarStrings } from '../organisms/Snackbar/strings.ts'

/** Los textos de todos los componentes, por componente; cada clave se llama como la prop que lo cambia. */
export interface MatekitStrings {
  bottomSheet: BottomSheetStrings
  inputChip: InputChipStrings
  search: SearchStrings
  sideSheet: SideSheetStrings
  snackbar: SnackbarStrings
}

/**
 * Los textos por defecto (en inglés) de todos los componentes. Para traducir, una app arma su
 * propio `MatekitStrings` (el tipo avisa si falta un texto nuevo) y lo pasa por las props:
 *
 * ```tsx
 * const es: MatekitStrings = { ...defaultStrings, snackbar: { closeLabel: 'Cerrar' }, … }
 * <SnackbarHost closeLabel={es.snackbar.closeLabel}>
 * ```
 */
export const defaultStrings: MatekitStrings = {
  bottomSheet: bottomSheetStrings,
  inputChip: inputChipStrings,
  search: searchStrings,
  sideSheet: sideSheetStrings,
  snackbar: snackbarStrings,
}
