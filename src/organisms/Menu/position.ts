// La posición del menú pasó a src/internal/anchor-position.ts, compartida con Tooltip (ADR-0021).
// Este módulo solo la reexporta para Menu.test.tsx, que la importa desde acá y no se modificó al
// mover el código; Menu.tsx ya importa del módulo interno. Se puede borrar cuando la prueba importe
// desde src/internal/.
export {
  fallbackPosition,
  observedPlacement,
  supportsAnchorPositioning,
  type Box,
  type Placement,
  type Size,
} from '../../internal/anchor-position.ts'
