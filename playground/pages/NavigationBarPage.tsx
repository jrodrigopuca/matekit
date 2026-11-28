import { useState, type ReactNode } from 'react'
import {
  Badge,
  BookmarkIcon,
  HomeIcon,
  NavigationBar,
  NavigationBarItem,
  NavigationBarItemIcon,
  NavigationBarItemLabel,
  SearchIcon,
  SettingsIcon,
  StarIcon,
  type NavigationBarLayout,
} from '../../src/index.ts'

/** Destinos de ejemplo. `icon` recibe si está activo, para el icono relleno donde existe. */
const DESTINATIONS: { id: string; label: string; icon: (active: boolean) => ReactNode }[] = [
  { id: 'inicio', label: 'Inicio', icon: (a) => <HomeIcon filled={a} /> },
  { id: 'favoritos', label: 'Favoritos', icon: (a) => <StarIcon filled={a} /> },
  { id: 'buscar', label: 'Buscar', icon: (a) => <SearchIcon filled={a} /> },
  { id: 'guardados', label: 'Guardados', icon: (a) => <BookmarkIcon filled={a} /> },
  { id: 'ajustes', label: 'Ajustes', icon: (a) => <SettingsIcon filled={a} /> },
]

type Badges = 'none' | 'small' | 'large' | 'both'

function Bar({
  layout,
  count,
  badges,
  active,
  onSelect,
}: {
  layout: NavigationBarLayout
  count: number
  badges: Badges
  active: string
  onSelect?: (id: string) => void
}) {
  return (
    <NavigationBar layout={layout} aria-label="Principal">
      {DESTINATIONS.slice(0, count).map((d, i) => {
        const on = d.id === active
        const small = (badges === 'small' || badges === 'both') && i === 0
        const large = (badges === 'large' || badges === 'both') && i === 1
        return (
          <NavigationBarItem key={d.id} active={on} onClick={onSelect && (() => onSelect(d.id))}>
            <NavigationBarItemIcon>{d.icon(on)}</NavigationBarItemIcon>
            <NavigationBarItemLabel>{d.label}</NavigationBarItemLabel>
            {small && <Badge label="Novedades" />}
            {large && <Badge label="3 nuevos">3</Badge>}
          </NavigationBarItem>
        )
      })}
    </NavigationBar>
  )
}

/** Marco con forma de teléfono: la barra queda abajo, como en una aplicación. */
function Phone({ children, width = 400, label }: { children: ReactNode; width?: number; label?: string | undefined }) {
  return (
    <figure className="pg-phone" style={{ width }}>
      <div className="pg-phone-screen">
        <div className="pg-phone-content">{label}</div>
        {children}
      </div>
    </figure>
  )
}

export function NavigationBarPage() {
  const [layout, setLayout] = useState<NavigationBarLayout>('vertical')
  const [count, setCount] = useState(4)
  const [badges, setBadges] = useState<Badges>('both')
  const [active, setActive] = useState('inicio')
  const visible = DESTINATIONS.slice(0, count)
  const current = visible.some((d) => d.id === active) ? active : (visible[0]?.id ?? '')

  return (
    <>
      <section className="pg-section">
        <h2>Interactivo</h2>
        <p className="pg-note">
          <strong>Límite:</strong> De 3 a 5 destinos en cualquier ventana (Material). Con más, en desarrollo aparece el aviso <code>MK_NAVIGATION_TOO_MANY_DESTINATIONS</code> y los destinos se achican hasta 24 px sin desbordar; el resto va en un <code>ModalNavigationRail</code> o un <code>Menu</code>.
        </p>
        <div className="pg-controls">
          <label className="pg-field">
            Disposición
            <select value={layout} onChange={(e) => setLayout(e.target.value as NavigationBarLayout)}>
              <option value="vertical">Vertical (icono sobre etiqueta)</option>
              <option value="horizontal">Horizontal (icono junto a etiqueta)</option>
            </select>
          </label>
          <label className="pg-field">
            Elementos
            <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="pg-field">
            Insignias
            <select value={badges} onChange={(e) => setBadges(e.target.value as Badges)}>
              <option value="none">Ninguna</option>
              <option value="small">Pequeña</option>
              <option value="large">Grande</option>
              <option value="both">Las dos</option>
            </select>
          </label>
          <label className="pg-field">
            Activo
            <select value={current} onChange={(e) => setActive(e.target.value)}>
              {visible.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </label>
        </div>
        <Phone width={layout === 'horizontal' ? 640 : 400} label={visible.find((d) => d.id === current)?.label}>
          <Bar layout={layout} count={count} badges={badges} active={current} onSelect={setActive} />
        </Phone>
        <p className="pg-hint">
          Los elementos son botones (sin <code>href</code>): al tocarlos cambia el activo. Con el
          teclado, Tab recorre y Enter o Espacio activan. En una aplicación serían enlaces
          (<code>href</code> o <code>render={'{<Link href="/" />}'}</code>).
        </p>
      </section>

      <section className="pg-section">
        <h2>Estados</h2>
        <div className="pg-grid" style={{ gridTemplateColumns: 'max-content max-content' }}>
          <span className="pg-row-head">Vertical, 3</span>
          <Phone width={360}><Bar layout="vertical" count={3} badges="none" active="favoritos" /></Phone>
          <span className="pg-row-head">Vertical, 5 con insignias</span>
          <Phone width={400}><Bar layout="vertical" count={5} badges="both" active="buscar" /></Phone>
          <span className="pg-row-head">Horizontal, 3 con insignias</span>
          <Phone width={640}><Bar layout="horizontal" count={3} badges="both" active="favoritos" /></Phone>
        </div>
        <p className="pg-hint">
          Al activarse, Favoritos y Guardados pasan a su icono relleno (<code>filled</code>); Inicio,
          Buscar y Ajustes no tienen esa versión en el set de iconos.
        </p>
      </section>
    </>
  )
}
