import { useState } from 'react'
import paletteTokens from '../tokens/palettes.json' with { type: 'json' }
import { ButtonPage } from './pages/ButtonPage.tsx'
import { CheckboxPage } from './pages/CheckboxPage.tsx'
import { DialogPage } from './pages/DialogPage.tsx'
import { DividerPage } from './pages/DividerPage.tsx'
import { ExamplesPage } from './pages/ExamplesPage.tsx'
import { FabPage } from './pages/FabPage.tsx'
import { IconButtonPage } from './pages/IconButtonPage.tsx'
import { IconsPage } from './pages/IconsPage.tsx'
import { LoadingIndicatorPage } from './pages/LoadingIndicatorPage.tsx'
import { MenuPage } from './pages/MenuPage.tsx'
import { NavigationBarPage } from './pages/NavigationBarPage.tsx'
import { NavigationRailPage } from './pages/NavigationRailPage.tsx'
import { ProgressIndicatorPage } from './pages/ProgressIndicatorPage.tsx'
import { RadioButtonPage } from './pages/RadioButtonPage.tsx'
import { ShapesPage } from './pages/ShapesPage.tsx'
import { SliderPage } from './pages/SliderPage.tsx'
import { SwitchPage } from './pages/SwitchPage.tsx'
import { TextFieldPage } from './pages/TextFieldPage.tsx'
import { TokensPage } from './pages/TokensPage.tsx'

type Theme = 'system' | 'light' | 'dark'
type Motion = 'expressive' | 'standard'
type Contrast = 'system' | 'standard' | 'medium' | 'high'

// Paletas opcionales (ADR-0008): main.tsx importa su CSS; acá solo se elige con data-palette.
const PALETTES: Record<string, string> = {
  baseline: 'Base (kit)',
  ...Object.fromEntries(Object.entries(paletteTokens.palettes).map(([id, p]) => [id, p.label])),
}

const PAGES = {
  button: { label: 'Button', Page: ButtonPage },
  'icon-button': { label: 'IconButton', Page: IconButtonPage },
  fab: { label: 'FAB', Page: FabPage },
  checkbox: { label: 'Checkbox', Page: CheckboxPage },
  'radio-button': { label: 'RadioButton', Page: RadioButtonPage },
  switch: { label: 'Switch', Page: SwitchPage },
  slider: { label: 'Slider', Page: SliderPage },
  'text-field': { label: 'TextField', Page: TextFieldPage },
  dialog: { label: 'Dialog', Page: DialogPage },
  menu: { label: 'Menu', Page: MenuPage },
  'navigation-bar': { label: 'NavigationBar', Page: NavigationBarPage },
  'navigation-rail': { label: 'NavigationRail', Page: NavigationRailPage },
  'loading-indicator': { label: 'LoadingIndicator', Page: LoadingIndicatorPage },
  'progress-indicator': { label: 'Progreso', Page: ProgressIndicatorPage },
  divider: { label: 'Divider', Page: DividerPage },
  examples: { label: 'Ejemplos', Page: ExamplesPage },
  icons: { label: 'Iconos', Page: IconsPage },
  shapes: { label: 'Formas', Page: ShapesPage },
  tokens: { label: 'Tokens', Page: TokensPage },
} as const
type PageId = keyof typeof PAGES

const readHash = (): PageId => {
  // Lo que sigue a "?" son parámetros de la página (por ejemplo #dialog?open=basic).
  const id = location.hash.slice(1).split('?')[0] ?? ''
  return id in PAGES ? (id as PageId) : 'button'
}

export function App() {
  const [page, setPage] = useState<PageId>(readHash)
  const [theme, setTheme] = useState<Theme>('system')
  const [motion, setMotion] = useState<Motion>('expressive')
  const [palette, setPalette] = useState('baseline')
  const [contrast, setContrast] = useState<Contrast>('system')
  const { Page } = PAGES[page]

  const go = (id: PageId) => {
    location.hash = id
    setPage(id)
  }

  return (
    <div
      className="pg"
      {...(theme === 'system' ? {} : { 'data-theme': theme })}
      {...(contrast === 'system' ? {} : { 'data-contrast': contrast })}
      data-palette={palette}
      data-motion={motion}
    >
      <header className="pg-header">
        <strong className="pg-brand">matekit</strong>
        <nav className="pg-nav">
          {(Object.keys(PAGES) as PageId[]).map((id) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={page === id ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault()
                go(id)
              }}
            >
              {PAGES[id].label}
            </a>
          ))}
        </nav>
        <label className="pg-field">
          Tema
          <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
            <option value="system">Sistema</option>
            <option value="light">Claro</option>
            <option value="dark">Oscuro</option>
          </select>
        </label>
        <label className="pg-field">
          Paleta
          <select value={palette} onChange={(e) => setPalette(e.target.value)}>
            {Object.entries(PALETTES).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </label>
        <label className="pg-field">
          Contraste
          <select value={contrast} onChange={(e) => setContrast(e.target.value as Contrast)}>
            <option value="system">Sistema</option>
            <option value="standard">Estándar</option>
            <option value="medium">Medio</option>
            <option value="high">Alto</option>
          </select>
        </label>
        <label className="pg-field">
          Movimiento
          <select value={motion} onChange={(e) => setMotion(e.target.value as Motion)}>
            <option value="expressive">Expressive</option>
            <option value="standard">Standard</option>
          </select>
        </label>
      </header>
      <main className="pg-main">
        <Page />
      </main>
    </div>
  )
}
