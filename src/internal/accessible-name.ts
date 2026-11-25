// Nombre accesible obligatorio de los indicadores sin texto visible (LoadingIndicator,
// LinearProgressIndicator y CircularProgressIndicator): ARIA exige nombre en un `progressbar`.
// Puede venir de tres lados, y el tipo exige al menos uno:
// - `label`: un texto propio, que el componente pone en `aria-label`;
// - `aria-labelledby`: el id de una etiqueta visible (manda sobre `aria-label` en el cálculo del
//   nombre, así que se acepta junto con `label`);
// - `aria-label`: el atributo directo.
// `label` y `aria-label` juntos no: los dos irían al mismo atributo.

/** Props de nombre accesible: `label`, `aria-labelledby` o `aria-label` (al menos uno). */
export type AccessibleNameProps =
  | {
      /** Nombre accesible (se vuelve `aria-label`), por ejemplo "Subiendo foto". */
      label: string
      'aria-labelledby'?: string | undefined
      'aria-label'?: undefined
    }
  | {
      label?: undefined
      /** Id de la etiqueta visible que nombra al indicador. */
      'aria-labelledby': string
      'aria-label'?: string | undefined
    }
  | {
      label?: undefined
      'aria-labelledby'?: string | undefined
      'aria-label': string
    }
