// La decisión al soltar un arrastre pasó a src/internal/anchored-drag.ts (2026-11-27), para
// compartirla con el ModalNavigationRail (ADR-0029). Este módulo la reexporta sin cambios para el
// BottomSheet y sus pruebas.
export * from '../../internal/anchored-drag.ts'
