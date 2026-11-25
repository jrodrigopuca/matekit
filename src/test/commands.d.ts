// Tipos de los comandos de navegador definidos en vitest.config.ts.
import 'vitest/browser'

declare module 'vitest/browser' {
  interface BrowserCommands {
    /** Mueve el mouse sobre el elemento y mantiene apretado el botón principal. */
    pressDown(selector: string): Promise<void>
    /** Suelta el botón del mouse. */
    pressUp(): Promise<void>
    /** Emula `prefers-reduced-motion: reduce` (true) o la quita (false). */
    reduceMotion(on: boolean): Promise<void>
    /** Emula el modo de alto contraste, `forced-colors: active` (true), o lo quita (false). */
    forcedColors(on: boolean): Promise<void>
    /** Emula `prefers-contrast: more` (true) o lo quita (false). */
    prefersContrast(on: boolean): Promise<void>
  }
}
