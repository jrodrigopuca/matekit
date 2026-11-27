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
// Puntero en un punto del elemento (x, y relativos a su esquina superior izquierda), para el
// Slider: moveTo mueve el mouse; pressAt lo mueve y aprieta; dragThrough aprieta en el primer
// punto y pasa por los demás sin soltar (un arrastre; después, pressUp).
const moveTo: BrowserCommand<[selector: string, x: number, y: number]> = async (ctx, selector, x, y) => {
  await ctx.iframe.locator(selector).hover({ position: { x, y }, force: true })
}
const pressAt: BrowserCommand<[selector: string, x: number, y: number]> = async (ctx, selector, x, y) => {
  await ctx.iframe.locator(selector).hover({ position: { x, y }, force: true })
  await ctx.page.mouse.down()
}
const dragThrough: BrowserCommand<[selector: string, points: Array<[x: number, y: number]>]> = async (
  ctx,
  selector,
  points,
) => {
  const box = await ctx.iframe.locator(selector).boundingBox()
  if (!box) throw new Error(`dragThrough: ${selector} no está visible`)
  const [first, ...rest] = points
  if (!first) return
  // boundingBox() del elemento ya es relativo a la página principal.
  await ctx.page.mouse.move(box.x + first[0], box.y + first[1])
  await ctx.page.mouse.down()
  for (const [x, y] of rest) await ctx.page.mouse.move(box.x + x, box.y + y)
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

// MK_SERIAL=1 corre los archivos de prueba de a uno (sin paralelismo entre archivos) y lo avisa a
// las pruebas con inject('serial'). Lo usa el CI para los arrastres del Slider en Firefox, que
// fallan cuando otros archivos corren en paralelo (ver src/molecules/Slider/Slider.test.tsx).
const serial = process.env['MK_SERIAL'] === '1'

// Pruebas de componentes en un navegador real: los estados de los átomos (hover, foco,
// presionado) son CSS y solo se pueden comprobar con un motor de navegador.
export default defineConfig({
  plugins: [react()],
  // react-dom/server solo lo importa la prueba de hidratación de NavigationSuite. Sin declararlo,
  // Vite lo descubre a mitad de la corrida (sin caché, como en el CI), recarga y deja dos copias de
  // React ("Invalid hook call"; visto el 2026-11-27).
  optimizeDeps: { include: ['react-dom/server'] },
  test: {
    include: ['src/**/*.test.tsx'],
    fileParallelism: !serial,
    provide: { serial },
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: requested.map((name) => ({ ...ENGINES[name as Engine] })),
      commands: { pressDown, pressUp, pressAt, moveTo, dragThrough, reduceMotion, forcedColors, prefersContrast },
    },
  },
})
