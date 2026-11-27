export * from './atoms/index.ts'
export * from './molecules/index.ts'
export * from './organisms/index.ts'
export * from './icons/index.ts'
export { SPACE, type SpaceStep } from './tokens/space.ts'
export { WINDOW_WIDTH, WINDOW_HEIGHT, type WindowWidthClass, type WindowHeightClass } from './tokens/breakpoints.ts'
// Diagnósticos (ADR-0028): la clase y los códigos son públicos para que la app distinga los errores de
// matekit (`instanceof MatekitError` o `error.code`); mkError y mkWarn siguen internos.
export { MatekitError, type MatekitErrorCode, type MatekitWarningCode } from './internal/diagnostics.ts'
// Textos por defecto (en inglés) de todos los componentes, como base de una traducción: la app arma
// su `MatekitStrings` y lo pasa por las props. Sin efectos al cargar: no pesa si no se importa.
export { defaultStrings, type MatekitStrings } from './strings/index.ts'
