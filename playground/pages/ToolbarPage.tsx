import { useState, type CSSProperties, type ReactNode } from 'react'
import {
  AddIcon,
  BookmarkIcon,
  Button,
  DeleteIcon,
  DownloadIcon,
  EditIcon,
  Fab,
  FavoriteIcon,
  HomeIcon,
  IconButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  MoreVertIcon,
  SearchIcon,
  SettingsIcon,
  ShareIcon,
  StarIcon,
  Toolbar,
  ToolbarLayout,
  Tooltip,
  type ToolbarColor,
  type ToolbarScrollBehavior,
  type ToolbarSide,
} from '../../src/index.ts'

type Kind = 'docked' | 'floating' | 'vertical'

function LongContent() {
  return (
    <div style={{ padding: 'var(--md-sys-space-200)', display: 'grid', gap: 'var(--md-sys-space-200)' }}>
      {Array.from({ length: 24 }, (_, i) => (
        <p key={i} style={{ margin: 0 }}>
          {i + 1}. Párrafo de prueba para desplazar el contenido. Con «ocultar al desplazar», la barra se
          va al bajar y vuelve apenas se sube, o cuando el foco entra con Tab.
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

/** Un icon button con su tooltip (el nombre visible para quien usa el puntero). */
function Action({ label, children, ...rest }: { label: string; children: ReactNode; selected?: boolean; onClick?: () => void; 'aria-disabled'?: boolean }) {
  return (
    <Tooltip>
      <IconButton label={label} {...rest}>{children}</IconButton>
    </Tooltip>
  )
}

/** Menú de más acciones: lo que no entra en la barra (ver la nota de ventanas chicas). */
function More() {
  return (
    <Menu>
      <MenuTrigger>
        <IconButton label="Más acciones"><MoreVertIcon /></IconButton>
      </MenuTrigger>
      <MenuContent>
        <MenuItem>Descargar</MenuItem>
        <MenuItem>Ajustes</MenuItem>
      </MenuContent>
    </Menu>
  )
}

function Actions({ favorite, onFavorite, disabled }: { favorite: boolean; onFavorite: () => void; disabled: boolean }) {
  return (
    <>
      <Action label="Editar"><EditIcon /></Action>
      <Action label="Favorito" selected={favorite} onClick={onFavorite}><StarIcon filled={favorite} /></Action>
      <Action label="Compartir"><ShareIcon /></Action>
      <Action label="Eliminar" aria-disabled={disabled}><DeleteIcon /></Action>
      <More />
    </>
  )
}

export function ToolbarPage() {
  const [kind, setKind] = useState<Kind>('floating')
  const [color, setColor] = useState<ToolbarColor>('standard')
  const [behavior, setBehavior] = useState<ToolbarScrollBehavior>('exit-always')
  const [fab, setFab] = useState(false)
  const [disabled, setDisabled] = useState(true)
  const [rtl, setRtl] = useState(false)
  const [favorite, setFavorite] = useState(true)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [side, setSide] = useState<ToolbarSide>('end')
  const [expanded, setExpanded] = useState(true)
  const [lastChange, setLastChange] = useState('')

  const shape =
    kind === 'docked'
      ? ({ variant: 'docked' } as const)
      : kind === 'vertical'
        ? ({ variant: 'floating', orientation: 'vertical', side } as const)
        : ({ variant: 'floating', orientation: 'horizontal' } as const)
  const bar = (
    <Toolbar key={`${kind}-${behavior}-${fab}-${side}`} label="Acciones de la nota" color={color} scrollBehavior={behavior} {...shape}>
      <Actions favorite={favorite} onFavorite={() => setFavorite(!favorite)} disabled={disabled} />
    </Toolbar>
  )
  const withFab = fab && kind !== 'docked'
  const toolbar = withFab ? (
    <ToolbarLayout
      key={`layout-${kind}-${behavior}-${side}`}
      expanded={expanded}
      onExpandedChange={(next, reason) => {
        setExpanded(next)
        setLastChange(`${next ? 'expandir' : 'contraer'} (${reason})`)
      }}
    >
      {bar}
      <Fab label="Nueva nota" variant={color === 'vibrant' ? 'tertiary-container' : 'secondary-container'}>
        <AddIcon />
      </Fab>
    </ToolbarLayout>
  ) : (
    bar
  )

  return (
    <>
      <section className="pg-section">
        <h2>Al desplazar</h2>
        <div className="pg-controls">
          <label className="pg-field">
            Tipo
            <select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
              <option value="floating">floating horizontal</option>
              <option value="vertical">floating vertical</option>
              <option value="docked">docked</option>
            </select>
          </label>
          <label className="pg-field">
            Color
            <select value={color} onChange={(e) => setColor(e.target.value as ToolbarColor)}>
              <option value="standard">standard</option>
              <option value="vibrant">vibrant</option>
            </select>
          </label>
          <label className="pg-field">
            Al desplazar
            <select value={behavior} onChange={(e) => setBehavior(e.target.value as ToolbarScrollBehavior)}>
              <option value="exit-always">exit-always</option>
              <option value="collapse">collapse (con FAB)</option>
              <option value="none">none</option>
            </select>
          </label>
          <label className="pg-field">
            Costado (vertical)
            <select value={side} disabled={kind !== 'vertical'} onChange={(e) => setSide(e.target.value as ToolbarSide)}>
              <option value="end">end</option>
              <option value="start">start</option>
            </select>
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={fab} disabled={kind === 'docked'} onChange={(e) => setFab(e.target.checked)} />
            FAB al lado
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={expanded} disabled={!withFab} onChange={(e) => setExpanded(e.target.checked)} />
            Expandida (con FAB)
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
            «Eliminar» deshabilitado (aria-disabled)
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={rtl} onChange={(e) => setRtl(e.target.checked)} />
            RTL
          </label>
        </div>
        <p className="pg-hint">
          La barra es el último hijo del contenedor que se desplaza (este recuadro); la vertical, el
          primero. Tab entra a la barra una sola vez; las flechas recorren los botones (también el
          deshabilitado con aria-disabled) e Inicio y Fin van a los extremos. La docked no tiene FAB
          acompañante (ni el kit ni Compose lo definen): para una barra con FAB, la floating.
          {withFab && ` Último cambio pedido: ${lastChange || 'ninguno'}.`}
        </p>
        <div style={frame} dir={rtl ? 'rtl' : undefined}>
          {kind === 'vertical' && toolbar}
          <LongContent />
          {kind !== 'vertical' && toolbar}
        </div>
      </section>

      <section className="pg-section">
        <h2>Vertical en un panel de 400 px</h2>
        <p className="pg-hint">
          La barra no pasa de lo visible del panel (menos 24 arriba y abajo) y se desplaza adentro.
        </p>
        <div style={{ ...frame, height: 400 }}>
          <Toolbar label="Herramientas del panel" orientation="vertical" side="start">
            {[HomeIcon, SearchIcon, StarIcon, EditIcon, ShareIcon, BookmarkIcon, DownloadIcon, SettingsIcon, FavoriteIcon, DeleteIcon].map((I, i) => (
              <Action key={i} label={`Herramienta ${i + 1}`}><I /></Action>
            ))}
          </Toolbar>
          <LongContent />
        </div>
      </section>

      <section className="pg-section">
        <h2>Colores y estados (sin desplazar)</h2>
        <div style={{ display: 'grid', gap: 'var(--md-sys-space-200)', justifyItems: 'start', maxWidth: 600 }}>
          {(['standard', 'vibrant'] as const).map((c) => (
            <Toolbar key={c} label={`Formato ${c}`} color={c} style={{ position: 'static' }}>
              <Action label="Inicio"><HomeIcon /></Action>
              <Action label="Favorito" selected><FavoriteIcon filled /></Action>
              <Action label="Guardar" selected={false}><BookmarkIcon /></Action>
              <Action label="Descargar" aria-disabled><DownloadIcon /></Action>
              <Button selected={view === 'grid'} onClick={() => setView('grid')}>Grilla</Button>
              <Button selected={view === 'list'} onClick={() => setView('list')}>Lista</Button>
            </Toolbar>
          ))}
          {(['standard', 'vibrant'] as const).map((c) => (
            <Toolbar key={`d-${c}`} label={`Navegación ${c}`} variant="docked" color={c} style={{ position: 'static' }}>
              <Action label="Inicio"><HomeIcon /></Action>
              <Action label="Buscar"><SearchIcon /></Action>
              <Action label="Favoritos" selected><StarIcon filled /></Action>
              <Action label="Ajustes"><SettingsIcon /></Action>
              <More />
            </Toolbar>
          ))}
        </div>
        <p className="pg-hint">
          En una ventana chica, la docked reparte sus botones; si no entran, se desplaza a lo ancho dentro
          de sí. Lo recomendado es dejar hasta cinco acciones y el resto en un menú de más acciones.
        </p>
      </section>
    </>
  )
}
