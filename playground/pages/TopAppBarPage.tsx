import { useState, type CSSProperties, type ReactNode } from 'react'
import {
  ArrowBackIcon,
  BookmarkIcon,
  DeleteIcon,
  IconButton,
  MenuContent,
  MenuIcon,
  MenuItem,
  Menu,
  MenuTrigger,
  MoreVertIcon,
  SearchIcon,
  ShareIcon,
  Tooltip,
  TopAppBar,
  TopAppBarActions,
  TopAppBarLeading,
  TopAppBarSubtitle,
  TopAppBarTitle,
  type TopAppBarScrollBehavior,
  type TopAppBarSize,
} from '../../src/index.ts'

const TITLES = {
  short: 'Bandeja de entrada',
  long: 'Resumen de las notas del viaje por la Patagonia en el verano',
} as const
type TitleLength = keyof typeof TITLES

/** Acciones con tooltip; con `more`, las que no entran van a un menú de más opciones. */
function Actions({ count, more = true }: { count: number; more?: boolean }) {
  const all = [
    { label: 'Buscar', icon: <SearchIcon /> },
    { label: 'Guardar', icon: <BookmarkIcon /> },
    { label: 'Compartir', icon: <ShareIcon /> },
    { label: 'Eliminar', icon: <DeleteIcon /> },
  ]
  const shown = all.slice(0, count)
  const rest = all.slice(count)
  return (
    <TopAppBarActions>
      {shown.map((a) => (
        <Tooltip key={a.label}>
          <IconButton label={a.label}>{a.icon}</IconButton>
        </Tooltip>
      ))}
      {more && (
        <Menu>
          <MenuTrigger>
            <IconButton label="Más opciones"><MoreVertIcon /></IconButton>
          </MenuTrigger>
          <MenuContent>
            {rest.map((a) => <MenuItem key={a.label}>{a.label}</MenuItem>)}
            <MenuItem>Ajustes</MenuItem>
          </MenuContent>
        </Menu>
      )}
    </TopAppBarActions>
  )
}

function LongContent() {
  return (
    <div style={{ padding: 'var(--md-sys-space-200)', display: 'grid', gap: 'var(--md-sys-space-200)' }}>
      {Array.from({ length: 24 }, (_, i) => (
        <p key={i} style={{ margin: 0 }}>
          {i + 1}. Párrafo de prueba para desplazar el contenido debajo de la barra. La barra cambia de
          color cuando hay contenido debajo y, según el comportamiento, se colapsa o se esconde.
        </p>
      ))}
    </div>
  )
}

const frame: CSSProperties = {
  height: 480,
  maxWidth: 412,
  overflow: 'auto',
  border: '1px solid var(--md-sys-color-outline-variant)',
  borderRadius: 16,
  background: 'var(--md-sys-color-surface)',
  color: 'var(--md-sys-color-on-surface)',
}

function Matrix({ children }: { children: ReactNode }) {
  return <div style={{ display: 'grid', gap: 'var(--md-sys-space-200)', maxWidth: 600 }}>{children}</div>
}

export function TopAppBarPage() {
  const [size, setSize] = useState<TopAppBarSize>('md')
  const [behavior, setBehavior] = useState<TopAppBarScrollBehavior | 'default'>('default')
  const [centered, setCentered] = useState(false)
  const [subtitle, setSubtitle] = useState(true)
  const [leading, setLeading] = useState(true)
  const [title, setTitle] = useState<TitleLength>('short')
  const [count, setCount] = useState(2)
  const [rtl, setRtl] = useState(false)

  return (
    <>
      <section className="pg-section">
        <h2>Al desplazar</h2>
        <div className="pg-controls">
          <label className="pg-field">
            Tamaño
            <select value={size} onChange={(e) => setSize(e.target.value as TopAppBarSize)}>
              <option value="sm">small</option>
              <option value="md">medium</option>
              <option value="lg">large</option>
            </select>
          </label>
          <label className="pg-field">
            Comportamiento
            <select value={behavior} onChange={(e) => setBehavior(e.target.value as TopAppBarScrollBehavior | 'default')}>
              <option value="default">por defecto</option>
              <option value="pinned">pinned</option>
              <option value="enter-always">enter-always</option>
              <option value="exit-until-collapsed">exit-until-collapsed</option>
              <option value="none">none</option>
            </select>
          </label>
          <label className="pg-field">
            Título
            <select value={title} onChange={(e) => setTitle(e.target.value as TitleLength)}>
              <option value="short">corto</option>
              <option value="long">largo</option>
            </select>
          </label>
          <label className="pg-field">
            Acciones visibles
            <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={centered} onChange={(e) => setCentered(e.target.checked)} />
            Centrado
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={subtitle} onChange={(e) => setSubtitle(e.target.checked)} />
            Subtítulo
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={leading} onChange={(e) => setLeading(e.target.checked)} />
            Icono de inicio
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={rtl} onChange={(e) => setRtl(e.target.checked)} />
            RTL
          </label>
        </div>
        <p className="pg-hint">
          La barra es el primer hijo del contenedor que se desplaza (este recuadro). En el small y el
          medium, el título largo muestra el recorte con puntos suspensivos y las varias líneas.
        </p>
        <div style={frame} dir={rtl ? 'rtl' : undefined} className="pg-top-app-bar-frame">
          <TopAppBar
            key={`${size}-${behavior}`}
            size={size}
            centered={centered}
            {...(behavior === 'default' ? {} : { scrollBehavior: behavior })}
           
          >
            {leading && (
              <TopAppBarLeading>
                <IconButton label="Volver"><ArrowBackIcon /></IconButton>
              </TopAppBarLeading>
            )}
            <TopAppBarTitle level={3}>{TITLES[title]}</TopAppBarTitle>
            {subtitle && <TopAppBarSubtitle>3 sin leer · actualizado hace 5 minutos</TopAppBarSubtitle>}
            <Actions count={count} />
          </TopAppBar>
          <LongContent />
        </div>
      </section>

      <section className="pg-section">
        <h2>Tamaños (sin desplazar)</h2>
        <Matrix>
          {(['sm', 'md', 'lg'] as const).flatMap((s) => [
            <TopAppBar key={s} size={s} scrollBehavior="none">
              <TopAppBarLeading><IconButton label="Menú"><MenuIcon /></IconButton></TopAppBarLeading>
              <TopAppBarTitle level={3}>{s === 'sm' ? 'Small' : s === 'md' ? 'Medium' : 'Large'}</TopAppBarTitle>
              <Actions count={1} />
            </TopAppBar>,
            <TopAppBar key={`${s}-sub`} size={s} scrollBehavior="none" centered>
              <TopAppBarLeading><IconButton label="Volver"><ArrowBackIcon /></IconButton></TopAppBarLeading>
              <TopAppBarTitle level={3}>Centrado</TopAppBarTitle>
              <TopAppBarSubtitle>Con subtítulo</TopAppBarSubtitle>
              <Actions count={1} more={false} />
            </TopAppBar>,
          ])}
          <TopAppBar scrollBehavior="none">
            <TopAppBarLeading><IconButton label="Menú"><MenuIcon /></IconButton></TopAppBarLeading>
            <TopAppBarTitle level={3}>
              <svg viewBox="0 0 120 40" role="img" aria-label="Logo de ejemplo">
                <rect width="120" height="40" rx="20" fill="var(--md-sys-color-primary)" />
                <text x="60" y="26" textAnchor="middle" fontSize="16" fill="var(--md-sys-color-on-primary)">matekit</text>
              </svg>
            </TopAppBarTitle>
            <Actions count={1} more={false} />
          </TopAppBar>
        </Matrix>
        <p className="pg-hint">
          El último es el small con imagen: el logo de 40 de alto dentro del título. El lugar del título
          también aloja otros hijos (la search bar del ítem 21).
        </p>
      </section>
    </>
  )
}
