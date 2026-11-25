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
// Emular prefers-contrast: more (true) o quitarlo (false).
const prefersContrast: BrowserCommand<[on: boolean]> = async (ctx, on) => {
  await ctx.page.emulateMedia({ contrast: on ? 'more' : null })
}

// Motores donde corren las pruebas, elegidos con la variable MK_BROWSERS (separados por coma):
// - chrome (por defecto): el Chrome instalado en el sistema (channel: 'chrome'), sin descargar
//   navegadores. Es lo que corre en local.
// - firefox y webkit: los navegadores de Playwright (`pnpm exec playwright install firefox
//   webkit`). Los usa el CI, en un trabajo por motor; WebKit es el motor de Safari.
const ENGINES = {
  chrome: { browser: 'chromium', provider: playwright({ launchOptions: { channel: 'chrome' } }) },
  firefox: { browser: 'firefox', provider: playwright() },
  webkit: { browser: 'webkit', provider: playwright() },
} as const
type Engine = keyof typeof ENGINES

const requested = (process.env['MK_BROWSERS'] ?? 'chrome').split(',').map((s) => s.trim())
const unknown = requested.filter((name) => !(name in ENGINES))
if (unknown.length) {
  throw new Error(`MK_BROWSERS: motor desconocido (${unknown.join(', ')}); opciones: ${Object.keys(ENGINES).join(', ')}`)
}

// Pruebas de componentes en un navegador real: los estados de los átomos (hover, foco,
// presionado) son CSS y solo se pueden comprobar con un motor de navegador.
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.tsx'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: requested.map((name) => ({ ...ENGINES[name as Engine] })),
      commands: { pressDown, pressUp, reduceMotion, forcedColors, prefersContrast },
    },
  },
})
