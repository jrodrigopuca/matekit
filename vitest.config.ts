import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'

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
    },
  },
})
