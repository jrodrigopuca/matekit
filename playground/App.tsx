import { useEffect, useRef, useState, type ComponentType } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogHeadline,
  IconButton,
  MenuIcon,
  WINDOW_WIDTH,
} from '../src/index.ts'
import { PageNav, type NavGroup } from './PageNav.tsx'
import paletteTokens from '../tokens/palettes.json' with { type: 'json' }
import { ButtonPage } from './pages/ButtonPage.tsx'
import { CardPage } from './pages/CardPage.tsx'
import { CheckboxPage } from './pages/CheckboxPage.tsx'
import { ChipsPage } from './pages/ChipsPage.tsx'
import { DialogPage } from './pages/DialogPage.tsx'
import { SheetsPage } from './pages/SheetsPage.tsx'
import { DividerPage } from './pages/DividerPage.tsx'
import { ExamplesPage } from './pages/ExamplesPage.tsx'
import { FabPage } from './pages/FabPage.tsx'
import { IconButtonPage } from './pages/IconButtonPage.tsx'
import { IconsPage } from './pages/IconsPage.tsx'
import { InteractivePage } from './pages/InteractivePage.tsx'
import { LayoutPage } from './pages/LayoutPage.tsx'
import { ListPage } from './pages/ListPage.tsx'
import { LoadingIndicatorPage } from './pages/LoadingIndicatorPage.tsx'
import { MenuPage } from './pages/MenuPage.tsx'
import { NavigationBarPage } from './pages/NavigationBarPage.tsx'
import { NavigationRailPage } from './pages/NavigationRailPage.tsx'
import { ProgressIndicatorPage } from './pages/ProgressIndicatorPage.tsx'
import { RadioButtonPage } from './pages/RadioButtonPage.tsx'
import { SearchPage } from './pages/SearchPage.tsx'
import { ShapesPage } from './pages/ShapesPage.tsx'
import { SliderPage } from './pages/SliderPage.tsx'
import { SwitchPage } from './pages/SwitchPage.tsx'
import { TabsPage } from './pages/TabsPage.tsx'
import { TextFieldPage } from './pages/TextFieldPage.tsx'
import { SnackbarPage } from './pages/SnackbarPage.tsx'
import { TooltipPage } from './pages/TooltipPage.tsx'
import { TopAppBarPage } from './pages/TopAppBarPage.tsx'
import { TokensPage } from './pages/TokensPage.tsx'

type Theme = 'system' | 'light' | 'dark'
type Motion = 'expressive' | 'standard'
type Contrast = 'system' | 'standard' | 'medium' | 'high'

// Paletas opcionales (ADR-0008): main.tsx importa su CSS; acá solo se elige con data-palette.
const PALETTES: Record<string, string> = {
  baseline: 'Base (kit)',
  ...Object.fromEntries(Object.entries(paletteTokens.palettes).map(([id, p]) => [id, p.label])),
}

// Grupos de la navegación, en orden. Los componentes van en la capa donde viven en src/
// (atoms, molecules, organisms; ADR-0002).
const GROUPS = {
  atoms: 'Átomos',
  molecules: 'Moléculas',
  organisms: 'Organismos',
  foundations: 'Disposición y tokens',
  examples: 'Ejemplos',
} as const
type GroupId = keyof typeof GROUPS

interface PageEntry {
  label: string
  group: GroupId
  Page: ComponentType
}

// El id es el de la URL (#button, #dialog?open=basic): no cambiarlo, lo usan capturas y notas.
// Dentro de cada grupo, la navegación sigue el orden de este objeto (alfabético).
const PAGES = {
  divider: { label: 'Divider', group: 'atoms', Page: DividerPage },
  shapes: { label: 'Formas', group: 'atoms', Page: ShapesPage },
  icons: { label: 'Iconos', group: 'atoms', Page: IconsPage },
  interactive: { label: 'Interactive', group: 'atoms', Page: InteractivePage },
  button: { label: 'Button', group: 'molecules', Page: ButtonPage },
  card: { label: 'Card', group: 'molecules', Page: CardPage },
  checkbox: { label: 'Checkbox', group: 'molecules', Page: CheckboxPage },
  chips: { label: 'Chips', group: 'molecules', Page: ChipsPage },
  fab: { label: 'FAB', group: 'molecules', Page: FabPage },
  'icon-button': { label: 'IconButton', group: 'molecules', Page: IconButtonPage },
  'loading-indicator': { label: 'LoadingIndicator', group: 'molecules', Page: LoadingIndicatorPage },
  'progress-indicator': { label: 'Progreso', group: 'molecules', Page: ProgressIndicatorPage },
  'radio-button': { label: 'RadioButton', group: 'molecules', Page: RadioButtonPage },
  slider: { label: 'Slider', group: 'molecules', Page: SliderPage },
  switch: { label: 'Switch', group: 'molecules', Page: SwitchPage },
  'text-field': { label: 'TextField', group: 'molecules', Page: TextFieldPage },
  dialog: { label: 'Dialog', group: 'organisms', Page: DialogPage },
  list: { label: 'List', group: 'organisms', Page: ListPage },
  menu: { label: 'Menu', group: 'organisms', Page: MenuPage },
  'navigation-bar': { label: 'NavigationBar', group: 'organisms', Page: NavigationBarPage },
  'navigation-rail': { label: 'NavigationRail', group: 'organisms', Page: NavigationRailPage },
  search: { label: 'Search', group: 'organisms', Page: SearchPage },
  sheets: { label: 'Sheets', group: 'organisms', Page: SheetsPage },
  snackbar: { label: 'Snackbar', group: 'organisms', Page: SnackbarPage },
  tabs: { label: 'Tabs', group: 'organisms', Page: TabsPage },
  tooltip: { label: 'Tooltip', group: 'organisms', Page: TooltipPage },
  'top-app-bar': { label: 'TopAppBar', group: 'organisms', Page: TopAppBarPage },
  layout: { label: 'Disposición', group: 'foundations', Page: LayoutPage },
  tokens: { label: 'Tokens', group: 'foundations', Page: TokensPage },
  examples: { label: 'Ejemplos', group: 'examples', Page: ExamplesPage },
} as const satisfies Record<string, PageEntry>
type PageId = keyof typeof PAGES

const NAV_GROUPS: NavGroup[] = (Object.keys(GROUPS) as GroupId[]).map((group) => ({
  id: group,
  label: GROUPS[group],
  entries: (Object.keys(PAGES) as PageId[])
    .filter((id) => PAGES[id].group === group)
    .map((id) => ({ id, label: PAGES[id].label })),
}))

const isPageId = (id: string): id is PageId => Object.hasOwn(PAGES, id)

const readHash = (): PageId => {
  // Lo que sigue a "?" son parámetros de la página (por ejemplo #dialog?open=basic).
  const id = location.hash.slice(1).split('?')[0] ?? ''
  return isPageId(id) ? id : 'button'
}

// Desde la clase expanded (ADR-0016), la navegación es un panel lateral fijo; debajo, un diálogo.
// El mismo corte está como literal en rem en playground.css.
const WIDE_QUERY = `(min-width: ${WINDOW_WIDTH.expanded / 16}rem)`

export function App() {
  const [page, setPage] = useState<PageId>(readHash)
  const [theme, setTheme] = useState<Theme>('system')
  const [motion, setMotion] = useState<Motion>('expressive')
  const [palette, setPalette] = useState('baseline')
  const [contrast, setContrast] = useState<Contrast>('system')
  const [filter, setFilter] = useState('')
  const [navOpen, setNavOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const { Page } = PAGES[page]

  // Atrás y adelante del navegador, o una URL escrita a mano.
  useEffect(() => {
    const onHash = () => setPage(readHash())
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  // Si la ventana se ensancha con el diálogo abierto, el panel lateral lo reemplaza.
  useEffect(() => {
    const wide = matchMedia(WIDE_QUERY)
    const onChange = () => {
      if (wide.matches) setNavOpen(false)
    }
    wide.addEventListener('change', onChange)
    return () => wide.removeEventListener('change', onChange)
  }, [])

  const go = (id: string) => {
    if (!isPageId(id)) return
    setNavOpen(false)
    if (id === page) return
    location.hash = id
    setPage(id)
    scrollTo(0, 0)
  }

  const nav = (
    <PageNav groups={NAV_GROUPS} current={page} filter={filter} onFilterChange={setFilter} onNavigate={go} />
  )

  return (
    <div
      className="pg"
      {...(theme === 'system' ? {} : { 'data-theme': theme })}
      {...(contrast === 'system' ? {} : { 'data-contrast': contrast })}
      data-palette={palette}
      data-motion={motion}
    >
      {/* El hash elige la página: el clic no navega, mueve el foco al contenido. */}
      <a
        className="pg-skip"
        href="#contenido"
        onClick={(e) => {
          e.preventDefault()
          mainRef.current?.focus()
        }}
      >
        Saltar al contenido
      </a>
      <header className="pg-header">
        <span className="pg-menu-button">
          <IconButton label="Páginas" aria-haspopup="dialog" onClick={() => setNavOpen(true)}>
            <MenuIcon />
          </IconButton>
        </span>
        <strong className="pg-brand">matekit</strong>
        <div className="pg-settings">
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
        </div>
      </header>
      {/* Pantallas anchas: panel lateral fijo (playground.css lo oculta debajo de 52.5rem). */}
      <aside className="pg-sidebar">
        <strong className="pg-brand">matekit</strong>
        {nav}
      </aside>
      {/* Pantallas chicas: el mismo índice en un diálogo modal; al cerrar, el foco vuelve al botón. */}
      <Dialog
        className="pg-nav-dialog"
        open={navOpen}
        onClose={() => setNavOpen(false)}
        aria-describedby=""
      >
        <DialogHeadline>Páginas</DialogHeadline>
        <DialogContent>{nav}</DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setNavOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
      <main ref={mainRef} id="contenido" className="pg-main" tabIndex={-1} aria-label={PAGES[page].label}>
        <Page />
      </main>
    </div>
  )
}
