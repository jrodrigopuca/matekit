import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import type { BrowserCommand } from 'vitest/node'

// Mantener apretado el botón del mouse sobre un elemento, para probar :active y la onda.
// userEvent no lo permite; estos comandos corren del lado de Playwright.
const pressDown: BrowserCommand<[selector: string]> = async (ctx, selector) => {
  await ctx.iframe.locator(selector).hover()
  await ctx.page.mouse.down()
}
const pressUp: BrowserCommand<[]> = async (ctx) => {
  await ctx.page.mouse.up()
}
// Emular prefers-reduced-motion (true) o volver a la preferencia sin emular (false).
const reduceMotion: BrowserCommand<[on: boolean]> = async (ctx, on) => {
  await ctx.page.emulateMedia({ reducedMotion: on ? 'reduce' : null })
}
// Emular el modo de alto contraste (forced-colors: active) o quitarlo.
const forcedColors: BrowserCommand<[on: boolean]> = async (ctx, on) => {
  await ctx.page.emulateMedia({ forcedColors: on ? 'active' : null })
}

// Pruebas de componentes en un navegador real: los estados de los átomos (hover, foco,
// presionado) son CSS y solo se pueden comprobar con un motor de navegador.
// Usa el Chrome instalado en el sistema (channel: 'chrome'), sin descargar navegadores.
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.tsx'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({ launchOptions: { channel: 'chrome' } }),
      instances: [{ browser: 'chromium' }],
      commands: { pressDown, pressUp, reduceMotion, forcedColors },
    },
  },
})
