// Tipos de los comandos de navegador definidos en vitest.config.ts.
import 'vitest/browser'

declare module 'vitest/browser' {
  interface BrowserCommands {
    /** Mueve el mouse sobre el elemento y mantiene apretado el botón principal. */
    pressDown(selector: string): Promise<void>
    /** Suelta el botón del mouse. */
    pressUp(): Promise<void>
  }
}
