import { useState, type ReactNode } from 'react'
import {
  Badge,
  BookmarkIcon,
  EditIcon,
  Fab,
  FavoriteIcon,
  HomeIcon,
  IconButton,
  MenuIcon,
  ModalNavigationRail,
  ModalNavigationRailClose,
  NavigationRailHeader,
  NavigationRailItem,
  NavigationRailItemIcon,
  NavigationRailItemLabel,
  NavigationSuite,
  NavigationSuiteHeader,
  NavigationSuiteItem,
  NavigationSuiteItemIcon,
  NavigationSuiteItemLabel,
  SearchIcon,
  SettingsIcon,
  StarIcon,
  WINDOW_HEIGHT,
  WINDOW_WIDTH,
  type NavigationSuiteLayout,
} from '../../src/index.ts'
import { es } from '../strings-es.ts'

/** Los destinos, como datos: se escriben una vez y se dibujan en la suite y en el rail modal. */
const DESTINATIONS: { id: string; label: string; icon: (active: boolean) => ReactNode; badge?: ReactNode }[] = [
  { id: 'inicio', label: 'Inicio', icon: (a) => <HomeIcon filled={a} /> },
  { id: 'favoritos', label: 'Favoritos', icon: (a) => <StarIcon filled={a} />, badge: <Badge label="Novedades" /> },
  { id: 'buscar', label: 'Buscar', icon: (a) => <SearchIcon filled={a} /> },
  { id: 'guardados', label: 'Guardados', icon: (a) => <BookmarkIcon filled={a} />, badge: <Badge label="3 nuevos">3</Badge> },
  { id: 'me-gusta', label: 'Me gusta', icon: (a) => <FavoriteIcon filled={a} /> },
  { id: 'ajustes', label: 'Ajustes', icon: (a) => <SettingsIcon filled={a} /> },
]

const px = (n: number) => `${n}px`

export function NavigationSuitePage() {
  const [layout, setLayout] = useState<NavigationSuiteLayout>('auto')
  const [count, setCount] = useState(4)
  const [header, setHeader] = useState(true)
  const [active, setActive] = useState('inicio')
  const [open, setOpen] = useState(false)
  const shown = DESTINATIONS.slice(0, count)
  const current = shown.some((d) => d.id === active) ? active : (shown[0]?.id ?? '')

  return (
    <>
      <section className="pg-section">
        <h2>Interactivo</h2>
        <p className="pg-note">
          <strong>Límite:</strong> De 3 a 5 destinos en cualquier ventana, porque en una compacta es una barra (Material); con <code>layout=&quot;rail&quot;</code>, de 3 a 7. Más allá, en desarrollo aparece el aviso <code>MK_NAVIGATION_TOO_MANY_DESTINATIONS</code>; como barra se achican hasta 24 px sin desbordar y como rail se desplaza.
        </p>
        <div className="pg-controls">
          <label className="pg-field">
            Presentación
            <select value={layout} onChange={(e) => setLayout(e.target.value as NavigationSuiteLayout)}>
              <option value="auto">Según la ventana (auto)</option>
              <option value="bar">Barra (bar)</option>
              <option value="rail">Rail (rail)</option>
            </select>
          </label>
          <label className="pg-field">
            Destinos
            <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={header} onChange={(e) => setHeader(e.target.checked)} />
            Bloque superior (menú y FAB, solo en el rail)
          </label>
        </div>
        {/* La app ubica la suite con las mismas media queries: abajo la barra, al inicio el rail. */}
        <div className="pg-suite-frame" data-layout={layout}>
          <NavigationSuite aria-label="Principal" layout={layout} className="pg-suite-nav">
            {header && (
              <NavigationSuiteHeader>
                <IconButton label="Abrir navegación" aria-haspopup="dialog" size="md" shape="square" onClick={() => setOpen(true)}>
                  <MenuIcon />
                </IconButton>
                <Fab label="Redactar" variant="tertiary-container"><EditIcon /></Fab>
              </NavigationSuiteHeader>
            )}
            {shown.map((d) => (
              <NavigationSuiteItem key={d.id} active={d.id === current} onClick={() => setActive(d.id)}>
                <NavigationSuiteItemIcon>{d.icon(d.id === current)}</NavigationSuiteItemIcon>
                <NavigationSuiteItemLabel>{d.label}</NavigationSuiteItemLabel>
                {d.badge}
              </NavigationSuiteItem>
            ))}
          </NavigationSuite>
          <div className="pg-suite-content">{shown.find((d) => d.id === current)?.label}</div>
        </div>
        {/* El menú del rail abre el rail expandido modal con los mismos destinos (los datos de arriba). */}
        <ModalNavigationRail
          open={open}
          onClose={() => setOpen(false)}
          label={es.modalNavigationRail.label}
        >
          <NavigationRailHeader>
            <ModalNavigationRailClose label={es.modalNavigationRail.closeLabel} />
          </NavigationRailHeader>
          {shown.map((d) => (
            <NavigationRailItem key={d.id} active={d.id === current} onClick={() => setActive(d.id)}>
              <NavigationRailItemIcon>{d.icon(d.id === current)}</NavigationRailItemIcon>
              <NavigationRailItemLabel>{d.label}</NavigationRailItemLabel>
              {d.badge}
            </NavigationRailItem>
          ))}
        </ModalNavigationRail>
        <p className="pg-hint">
          Con <code>auto</code>, la ventana elige (regla de Compose): menos de {px(WINDOW_WIDTH.medium)} de
          ancho, barra con destinos verticales; si no, con menos de {px(WINDOW_HEIGHT.medium)} de alto
          (un teléfono acostado), barra con destinos horizontales; si no, rail contraído, también desde{' '}
          {px(WINDOW_WIDTH.large)}. Es CSS: cambiá el tamaño de la ventana. El bloque superior solo se ve
          en el rail; su botón de menú abre el <code>ModalNavigationRail</code> con los mismos destinos,
          que se cierra al elegir uno.
        </p>
      </section>

      <section className="pg-section">
        <h2>Elección forzada</h2>
        <div className="pg-suite-fixed">
          <figure>
            <figcaption><code>layout="bar"</code></figcaption>
            <NavigationSuite aria-label="Barra fija" layout="bar">
              {DESTINATIONS.slice(0, 3).map((d, i) => (
                <NavigationSuiteItem key={d.id} active={i === 0}>
                  <NavigationSuiteItemIcon>{d.icon(i === 0)}</NavigationSuiteItemIcon>
                  <NavigationSuiteItemLabel>{d.label}</NavigationSuiteItemLabel>
                </NavigationSuiteItem>
              ))}
            </NavigationSuite>
          </figure>
          <figure>
            <figcaption><code>layout="rail"</code></figcaption>
            <div className="pg-suite-rail-box">
              <NavigationSuite aria-label="Rail fijo" layout="rail">
                {DESTINATIONS.slice(0, 3).map((d, i) => (
                  <NavigationSuiteItem key={d.id} active={i === 0}>
                    <NavigationSuiteItemIcon>{d.icon(i === 0)}</NavigationSuiteItemIcon>
                    <NavigationSuiteItemLabel>{d.label}</NavigationSuiteItemLabel>
                    {d.badge}
                  </NavigationSuiteItem>
                ))}
              </NavigationSuite>
            </div>
          </figure>
        </div>
      </section>
    </>
  )
}
