import { useState, type ReactNode } from 'react'
import {
  Button,
  CheckIcon,
  DeleteIcon,
  DownloadIcon,
  EditIcon,
  IconButton,
  Menu,
  MenuContent,
  MenuDivider,
  MenuItem,
  MenuItemLeading,
  MenuItemTrailing,
  MenuTrigger,
  MoreVertIcon,
  RefreshIcon,
  SettingsIcon,
  ShareIcon,
  StarIcon,
} from '../../src/index.ts'

type Case = 'basic' | 'selected' | 'disabled' | 'vibrant' | 'edge'

const CASES: Record<Case, string> = {
  basic: 'Básico',
  selected: 'Con iconos y seleccionado',
  disabled: 'Con deshabilitados',
  vibrant: 'Vibrant',
  edge: 'Cerca del borde',
}

/** Caso abierto al cargar, desde la URL (`#menu?open=selected`): solo para capturas. */
function initialCase(): Case | null {
  const value = new URLSearchParams(location.hash.split('?')[1] ?? '').get('open')
  return value && value in CASES ? (value as Case) : null
}

type Sort = 'name' | 'date' | 'size'
const SORTS: Record<Sort, string> = { name: 'Nombre', date: 'Fecha', size: 'Tamaño' }

export function MenuPage() {
  // Todos los menús son controlados para poder abrir uno desde la URL; el de "Vibrant" deja
  // ver además el modo no controlado si se quita `open`.
  const [openCase, setOpenCase] = useState<Case | null>(initialCase)
  const [log, setLog] = useState<string[]>([])
  const [sort, setSort] = useState<Sort>('name')
  const [hidden, setHidden] = useState(false)
  const [starred, setStarred] = useState(true)

  const note = (text: string) => setLog((l) => [text, ...l].slice(0, 5))
  const control = (c: Case) => ({
    open: openCase === c,
    onOpenChange: (open: boolean) => setOpenCase(open ? c : null),
  })

  return (
    <>
      <section className="pg-section">
        <h2>Casos</h2>
        <div className="pg-controls" style={{ alignItems: 'center' }}>
          <Labeled label={CASES.basic}>
            <Menu {...control('basic')}>
              <MenuTrigger>
                <IconButton label="Más opciones"><MoreVertIcon /></IconButton>
              </MenuTrigger>
              <MenuContent>
                <MenuItem onSelect={() => note('Editar')}>Editar</MenuItem>
                <MenuItem onSelect={() => note('Compartir')}>Compartir</MenuItem>
                <MenuItem onSelect={() => note('Descargar')}>Descargar</MenuItem>
                <MenuDivider />
                <MenuItem onSelect={() => note('Eliminar')}>Eliminar</MenuItem>
              </MenuContent>
            </Menu>
          </Labeled>

          <Labeled label={CASES.selected}>
            <Menu {...control('selected')}>
              <MenuTrigger><Button variant="tonal">Ordenar: {SORTS[sort]}</Button></MenuTrigger>
              <MenuContent>
                {(Object.keys(SORTS) as Sort[]).map((s) => (
                  <MenuItem key={s} type="radio" selected={sort === s} onSelect={() => { setSort(s); note(`Orden: ${SORTS[s]}`) }}>
                    <MenuItemLeading>{sort === s ? <CheckIcon /> : null}</MenuItemLeading>
                    {SORTS[s]}
                  </MenuItem>
                ))}
                <MenuDivider />
                <MenuItem
                  type="checkbox"
                  selected={hidden}
                  onSelect={(e) => {
                    // Un checkbox no cierra el menú: se puede cambiar varias veces.
                    e.preventDefault()
                    setHidden(!hidden)
                    note(`Ocultos: ${!hidden ? 'sí' : 'no'}`)
                  }}
                >
                  <MenuItemLeading>{hidden ? <CheckIcon /> : null}</MenuItemLeading>
                  Mostrar ocultos
                </MenuItem>
                <MenuItem type="checkbox" selected={starred} onSelect={() => setStarred(!starred)}>
                  <MenuItemLeading><StarIcon filled={starred} /></MenuItemLeading>
                  Solo destacados
                </MenuItem>
              </MenuContent>
            </Menu>
          </Labeled>

          <Labeled label={CASES.disabled}>
            <Menu {...control('disabled')}>
              <MenuTrigger><Button variant="outlined">Archivo</Button></MenuTrigger>
              <MenuContent>
                <MenuItem aria-keyshortcuts="Control+E" onSelect={() => note('Editar')}>
                  <MenuItemLeading><EditIcon /></MenuItemLeading>Editar<MenuItemTrailing>Ctrl+E</MenuItemTrailing>
                </MenuItem>
                <MenuItem disabled>
                  <MenuItemLeading><ShareIcon /></MenuItemLeading>Compartir<MenuItemTrailing>Ctrl+S</MenuItemTrailing>
                </MenuItem>
                <MenuItem onSelect={() => note('Descargar')}>
                  <MenuItemLeading><DownloadIcon /></MenuItemLeading>Descargar
                </MenuItem>
                <MenuDivider />
                <MenuItem disabled>
                  <MenuItemLeading><DeleteIcon /></MenuItemLeading>Eliminar
                </MenuItem>
              </MenuContent>
            </Menu>
          </Labeled>

          <Labeled label={CASES.vibrant}>
            <Menu {...control('vibrant')}>
              <MenuTrigger><IconButton variant="tonal" label="Ajustes"><SettingsIcon /></IconButton></MenuTrigger>
              <MenuContent variant="vibrant">
                <MenuItem onSelect={() => note('Actualizar')}>
                  <MenuItemLeading><RefreshIcon /></MenuItemLeading>Actualizar
                </MenuItem>
                <MenuItem type="radio" selected={sort === 'name'} onSelect={() => setSort('name')}>
                  <MenuItemLeading><StarIcon filled={sort === 'name'} /></MenuItemLeading>Por nombre
                </MenuItem>
                <MenuItem type="radio" selected={sort === 'date'} onSelect={() => setSort('date')}>
                  <MenuItemLeading><StarIcon filled={sort === 'date'} /></MenuItemLeading>Por fecha
                </MenuItem>
                <MenuDivider />
                <MenuItem disabled><MenuItemLeading><DeleteIcon /></MenuItemLeading>Eliminar</MenuItem>
              </MenuContent>
            </Menu>
          </Labeled>
        </div>
        <p className="pg-hint">
          Enter, Espacio o flecha abajo abren y enfocan el primero; flecha arriba, el último. Flechas con vuelta,
          Inicio/Fin, una letra para buscar, Escape o Tab cierran. Los deshabilitados se enfocan pero no se eligen. Para
          abrir uno al cargar: <code>#menu?open=selected</code> ({Object.keys(CASES).join(', ')}). Últimos eventos:{' '}
          {log.length ? log.join(' · ') : '—'}
        </p>
      </section>

      {/* Fijo en la esquina inferior derecha: el menú se da vuelta hacia arriba y hacia la izquierda. */}
      <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 1 }}>
        <Menu {...control('edge')}>
          <MenuTrigger><IconButton variant="filled" label="Cerca del borde"><MoreVertIcon /></IconButton></MenuTrigger>
          <MenuContent>
            <MenuItem onSelect={() => note('Borde: Editar')}><MenuItemLeading><EditIcon /></MenuItemLeading>Editar</MenuItem>
            <MenuItem onSelect={() => note('Borde: Compartir')}><MenuItemLeading><ShareIcon /></MenuItemLeading>Compartir</MenuItem>
            <MenuItem onSelect={() => note('Borde: Eliminar')}><MenuItemLeading><DeleteIcon /></MenuItemLeading>Eliminar</MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </>
  )
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
      <span className="pg-hint" style={{ margin: 0 }}>{label}</span>
      {children}
    </div>
  )
}
