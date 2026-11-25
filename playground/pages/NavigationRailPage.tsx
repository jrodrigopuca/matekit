import { useState, type ReactNode } from 'react'
import {
  Badge,
  BookmarkIcon,
  EditIcon,
  ExtendedFab,
  FavoriteIcon,
  HomeIcon,
  IconButton,
  MenuIcon,
  NavigationRail,
  NavigationRailHeader,
  NavigationRailItem,
  NavigationRailItemIcon,
  NavigationRailItemLabel,
  SearchIcon,
  SettingsIcon,
  StarIcon,
  type NavigationRailAlign,
  type NavigationRailVariant,
} from '../../src/index.ts'

/** Destinos de ejemplo. `icon` recibe si está activo, para el icono relleno. */
const DESTINATIONS: { id: string; label: string; icon: (active: boolean) => ReactNode }[] = [
  { id: 'inicio', label: 'Inicio', icon: (a) => <HomeIcon filled={a} /> },
  { id: 'favoritos', label: 'Favoritos', icon: (a) => <StarIcon filled={a} /> },
  { id: 'buscar', label: 'Buscar', icon: (a) => <SearchIcon filled={a} /> },
  { id: 'guardados', label: 'Guardados', icon: (a) => <BookmarkIcon filled={a} /> },
  { id: 'me-gusta', label: 'Me gusta', icon: (a) => <FavoriteIcon filled={a} /> },
  { id: 'ajustes', label: 'Ajustes', icon: (a) => <SettingsIcon filled={a} /> },
]

type Badges = 'none' | 'small' | 'large' | 'both'

interface RailOptions {
  expanded: boolean
  variant: NavigationRailVariant
  align: NavigationRailAlign
  count: number
  badges: Badges
  labels: boolean
  menu: boolean
  fab: boolean
}

function Rail({
  id,
  options: o,
  active,
  onSelect,
  onToggle,
}: {
  id: string
  options: RailOptions
  active: string
  onSelect?: ((id: string) => void) | undefined
  onToggle?: (() => void) | undefined
}) {
  return (
    <NavigationRail
      id={id}
      aria-label="Principal"
      expanded={o.expanded}
      variant={o.variant}
      align={o.align}
      collapsedLabels={o.labels ? 'visible' : 'hidden'}
    >
      {(o.menu || o.fab) && (
        <NavigationRailHeader>
          {o.menu && (
            // El botón de menú lo pone la aplicación: alterna el rail y lo anuncia con aria-expanded
            // (etiqueta fija; el estado lo dice aria-expanded).
            <IconButton
              label="Navegación"
              aria-expanded={o.expanded}
              aria-controls={id}
              size="md"
              shape="square"
              onClick={onToggle}
            >
              <MenuIcon />
            </IconButton>
          )}
          {/* El mismo booleano que el rail: contraído, queda un FAB de 56. */}
          {o.fab && <ExtendedFab expanded={o.expanded} variant="tertiary-container"><EditIcon />Redactar</ExtendedFab>}
        </NavigationRailHeader>
      )}
      {DESTINATIONS.slice(0, o.count).map((d, i) => {
        const on = d.id === active
        const small = (o.badges === 'small' || o.badges === 'both') && i === 0
        const large = (o.badges === 'large' || o.badges === 'both') && i === 2
        return (
          <NavigationRailItem key={d.id} active={on} onClick={onSelect && (() => onSelect(d.id))}>
            <NavigationRailItemIcon>{d.icon(on)}</NavigationRailItemIcon>
            <NavigationRailItemLabel>{d.label}</NavigationRailItemLabel>
            {small && <Badge label="Novedades" />}
            {large && <Badge label="12 resultados nuevos">12</Badge>}
          </NavigationRailItem>
        )
      })}
    </NavigationRail>
  )
}

/** Marco con forma de tableta en horizontal: el rail queda a la izquierda, junto al contenido. */
function Tablet({ children, label, height = 560 }: { children: ReactNode; label?: string | undefined; height?: number }) {
  return (
    <figure className="pg-tablet">
      <div className="pg-tablet-screen" style={{ height }}>
        {children}
        <div className="pg-tablet-content">{label}</div>
      </div>
    </figure>
  )
}

const DEFAULTS: RailOptions = {
  expanded: false,
  variant: 'docked',
  align: 'top',
  count: 4,
  badges: 'both',
  labels: true,
  menu: true,
  fab: true,
}

export function NavigationRailPage() {
  const [o, setO] = useState<RailOptions>(DEFAULTS)
  const [active, setActive] = useState('inicio')
  const set = <K extends keyof RailOptions>(k: K, v: RailOptions[K]) => setO((prev) => ({ ...prev, [k]: v }))
  const visible = DESTINATIONS.slice(0, o.count)
  const current = visible.some((d) => d.id === active) ? active : (visible[0]?.id ?? '')

  return (
    <>
      <section className="pg-section">
        <h2>Interactivo</h2>
        <div className="pg-controls">
          <label className="pg-check">
            <input type="checkbox" checked={o.expanded} onChange={(e) => set('expanded', e.target.checked)} />
            Expandido
          </label>
          <label className="pg-field">
            Tipo
            <select value={o.variant} onChange={(e) => set('variant', e.target.value as NavigationRailVariant)}>
              <option value="docked">Docked</option>
              <option value="floating">Floating</option>
            </select>
          </label>
          <label className="pg-field">
            Alineación
            <select value={o.align} onChange={(e) => set('align', e.target.value as NavigationRailAlign)}>
              <option value="top">Arriba (top)</option>
              <option value="middle">Al medio (middle)</option>
            </select>
          </label>
          <label className="pg-field">
            Destinos
            <select value={o.count} onChange={(e) => set('count', Number(e.target.value))}>
              {[3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="pg-field">
            Insignias
            <select value={o.badges} onChange={(e) => set('badges', e.target.value as Badges)}>
              <option value="none">Ninguna</option>
              <option value="small">Pequeña</option>
              <option value="large">Grande</option>
              <option value="both">Las dos</option>
            </select>
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={o.labels} onChange={(e) => set('labels', e.target.checked)} />
            Etiquetas en el contraído
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={o.menu} onChange={(e) => set('menu', e.target.checked)} />
            Menú
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={o.fab} onChange={(e) => set('fab', e.target.checked)} />
            FAB
          </label>
        </div>
        <Tablet label={visible.find((d) => d.id === current)?.label}>
          <Rail id="pg-rail" options={o} active={current} onSelect={setActive} onToggle={() => set('expanded', !o.expanded)} />
        </Tablet>
        <p className="pg-hint">
          El botón de menú alterna el rail (<code>aria-expanded</code>); el FAB extendido recibe el
          mismo <code>expanded</code>. Los destinos son botones: al tocarlos cambia el activo. En
          una aplicación serían enlaces (<code>href</code> o <code>render={'{<Link href="/" />}'}</code>).
          Qué dibujar según el ancho de la ventana (barra por debajo de 600, rail contraído de 600 a
          839, contraído o expandido desde 840) lo decide la aplicación.
        </p>
      </section>

      <section className="pg-section">
        <h2>Estados</h2>
        <div className="pg-rail-grid">
          {(
            [
              ['Contraído, docked', { ...DEFAULTS }],
              ['Contraído, sin etiquetas', { ...DEFAULTS, labels: false }],
              ['Contraído, middle', { ...DEFAULTS, align: 'middle', badges: 'none' }],
              ['Expandido, docked', { ...DEFAULTS, expanded: true }],
              ['Expandido, floating', { ...DEFAULTS, expanded: true, variant: 'floating' }],
              ['Expandido, middle, sin menú', { ...DEFAULTS, expanded: true, align: 'middle', menu: false, badges: 'none' }],
            ] as const
          ).map(([title, opts], i) => (
            <div key={title}>
              <span className="pg-row-head">{title}</span>
              <Tablet height={opts.align === 'middle' ? 640 : 480}>
                <Rail id={`pg-rail-${i}`} options={opts} active="favoritos" />
              </Tablet>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
