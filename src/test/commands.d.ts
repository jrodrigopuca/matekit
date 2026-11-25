// Tipos de los comandos de navegador y de los valores provistos (provide) en vitest.config.ts.
import 'vitest'
import 'vitest/browser'

declare module 'vitest' {
  interface ProvidedContext {
    /** true con MK_SERIAL=1: los archivos de prueba corren de a uno. */
    serial: boolean
  }
}

declare module 'vitest/browser' {
  interface BrowserCommands {
    /** Mueve el mouse sobre el elemento y mantiene apretado el botón principal. */
    pressDown(selector: string): Promise<void>
    /** Suelta el botón del mouse. */
    pressUp(): Promise<void>
    /** Mueve el mouse al punto (x, y) del elemento, relativo a su esquina superior izquierda, y aprieta el botón principal. */
    pressAt(selector: string, x: number, y: number): Promise<void>
    /** Mueve el mouse al punto (x, y) del elemento (arrastra si el botón está apretado). */
    moveTo(selector: string, x: number, y: number): Promise<void>
    /** Aprieta en el primer punto del elemento y pasa por los demás sin soltar (luego, pressUp). */
    dragThrough(selector: string, points: Array<[x: number, y: number]>): Promise<void>
    /** Emula `prefers-reduced-motion: reduce` (true) o la quita (false). */
    reduceMotion(on: boolean): Promise<void>
    /** Emula el modo de alto contraste, `forced-colors: active` (true), o lo quita (false). */
    forcedColors(on: boolean): Promise<void>
    /** Emula `prefers-contrast: more` (true) o lo quita (false). */
    prefersContrast(on: boolean): Promise<void>
  }
}
