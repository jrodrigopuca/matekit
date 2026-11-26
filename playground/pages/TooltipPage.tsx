import { useState, type ReactNode } from 'react'
import {
  AssistChip,
  BookmarkIcon,
  Button,
  ChipGroup,
  DeleteIcon,
  EditIcon,
  FilterChip,
  IconButton,
  InfoIcon,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  MoreVertIcon,
  RichTooltip,
  RichTooltipActions,
  RichTooltipContent,
  RichTooltipSubhead,
  RichTooltipSupporting,
  RichTooltipTrigger,
  SettingsIcon,
  ShareIcon,
  StarIcon,
  Tooltip,
} from '../../src/index.ts'

type Case = 'plain' | 'description' | 'rich' | 'actions'

/** Tooltip abierto al cargar, desde la URL (`#tooltip?open=rich`): solo para capturas. */
function initialCase(): Case | null {
  const value = new URLSearchParams(location.hash.split('?')[1] ?? '').get('open')
  return value === 'plain' || value === 'description' || value === 'rich' || value === 'actions' ? value : null
}

const LONG = [
  'Ofertas de la semana en electrodomésticos de cocina',
  'Envío gratis a todo el país',
  'Pagos en cuotas sin interés con tarjetas seleccionadas',
]

export function TooltipPage() {
  const [log, setLog] = useState<string[]>([])
  const note = (text: string) => setLog((l) => [text, ...l].slice(0, 5))
  const initial = initialCase()
  // Abierto desde la URL hasta que se cierre una vez; después, no controlado.
  const [forced, setForced] = useState<Case | null>(initial)
  // Botones fijos en las esquinas de la ventana (tapan la navegación, por eso se activan a mano).
  const [corners, setCorners] = useState(() => location.hash.includes('corners'))
  const control = (c: Case) =>
    forced === c ? { open: true, onOpenChange: (open: boolean) => !open && setForced(null) } : {}

  return (
    <>
      <section className="pg-section">
        <h2>Plain</h2>
        <div className="pg-controls" style={{ alignItems: 'center' }}>
          <Labeled label="Barra de iconos (el siguiente aparece al instante)">
            <div style={{ display: 'flex', gap: 4 }}>
              <Tooltip {...control('plain')}>
                <IconButton label="Editar" onClick={() => note('Editar')}><EditIcon /></IconButton>
              </Tooltip>
              <Tooltip><IconButton label="Compartir" onClick={() => note('Compartir')}><ShareIcon /></IconButton></Tooltip>
              <Tooltip><IconButton label="Guardar en favoritos" onClick={() => note('Favoritos')}><BookmarkIcon /></IconButton></Tooltip>
              <Tooltip><IconButton label="Eliminar" onClick={() => note('Eliminar')}><DeleteIcon /></IconButton></Tooltip>
            </div>
          </Labeled>
          <Labeled label="Descripción (aria-describedby)">
            <Tooltip {...control('description')} text="Se guarda también una copia en la nube, en la carpeta Proyectos">
              <Button variant="tonal" onClick={() => note('Guardar')}>Guardar</Button>
            </Tooltip>
          </Labeled>
          <Labeled label="Con un menú en el mismo botón">
            <Menu>
              <MenuTrigger>
                <Tooltip><IconButton label="Más opciones"><MoreVertIcon /></IconButton></Tooltip>
              </MenuTrigger>
              <MenuContent>
                <MenuItem onSelect={() => note('Menú: Editar')}>Editar</MenuItem>
                <MenuItem onSelect={() => note('Menú: Compartir')}>Compartir</MenuItem>
              </MenuContent>
            </Menu>
          </Labeled>
        </div>
        <p className="pg-hint">
          Aparece con el puntero tras 500 ms (o enseguida si ya hay uno visible) y con el foco de teclado; se oculta 600 ms
          después de salir (se puede pasar el puntero sobre el tooltip), al presionar, al perder el foco y con Escape. En
          táctil, con una pulsación larga, y se va 1,5 s después de soltar. Sin <code>text</code> muestra el nombre del
          botón y no se anuncia dos veces. Para abrir uno al cargar: <code>#tooltip?open=plain</code> (plain,
          description, rich, actions). Últimos eventos: {log.length ? log.join(' · ') : '—'}
        </p>
      </section>

      <section className="pg-section">
        <h2>Rich</h2>
        <div className="pg-controls" style={{ alignItems: 'center' }}>
          <Labeled label="Sin acciones (tooltip)">
            <RichTooltip {...control('rich')}>
              <RichTooltipTrigger><IconButton label="Qué son las copias"><InfoIcon /></IconButton></RichTooltipTrigger>
              <RichTooltipContent>
                <RichTooltipSubhead>Copias automáticas</RichTooltipSubhead>
                <RichTooltipSupporting>
                  Cada noche se guarda una copia de tus proyectos. Se conservan las de los últimos 30 días.
                </RichTooltipSupporting>
              </RichTooltipContent>
            </RichTooltip>
          </Labeled>
          <Labeled label="Con acciones (diálogo no modal, con clic)">
            <RichTooltip {...control('actions')}>
              <RichTooltipTrigger><IconButton variant="tonal" label="Ajustes de copias"><SettingsIcon /></IconButton></RichTooltipTrigger>
              <RichTooltipContent>
                <RichTooltipSubhead>Copias automáticas</RichTooltipSubhead>
                <RichTooltipSupporting>
                  Cada noche se guarda una copia de tus proyectos. Podés cambiar la hora o desactivarlas.
                </RichTooltipSupporting>
                <RichTooltipActions>
                  <Button variant="text" onClick={() => note('Configurar')}>Configurar</Button>
                  <Button variant="text" onClick={() => note('Más información')}>Más información</Button>
                </RichTooltipActions>
              </RichTooltipContent>
            </RichTooltip>
          </Labeled>
        </div>
        <p className="pg-hint">
          Con acciones se abre y cierra con un clic, Enter o Espacio; Tab entra a las acciones, Escape lo cierra y devuelve
          el foco al botón, y un clic afuera lo cierra sin mover el foco.
        </p>
      </section>

      <section className="pg-section">
        <h2>Chips con texto largo</h2>
        <div style={{ maxInlineSize: 260 }}>
          <ChipGroup aria-label="Promociones">
            {LONG.map((label) => (
              <Tooltip key={label}>
                <FilterChip>{label}</FilterChip>
              </Tooltip>
            ))}
            <Tooltip>
              <AssistChip onClick={() => note('Destacados')}><StarIcon />Ver todos los productos destacados del mes</AssistChip>
            </Tooltip>
          </ChipGroup>
        </div>
        <p className="pg-hint">
          La etiqueta se recorta con puntos suspensivos (ADR-0019); el tooltip, sin <code>text</code>, muestra el texto
          completo y no lo repite al lector de pantalla, que ya recibe el nombre completo del chip.
        </p>
      </section>

      <section className="pg-section">
        <h2>Cerca de los bordes</h2>
        <label className="pg-check">
          <input type="checkbox" checked={corners} onChange={(e) => setCorners(e.target.checked)} />
          Botones en las esquinas de la ventana
        </label>
        <p className="pg-hint">
          Cuatro botones fijos en las esquinas (tapan la navegación mientras están): arriba el tooltip no entra, así que
          baja; y se corre para no salirse por los costados. También con <code>#tooltip?corners</code>.
        </p>
      </section>

      {/* Fijos en las esquinas: el tooltip baja si arriba no entra y se corre hacia adentro. */}
      {(
        [
          ['Esquina superior izquierda, con un texto más largo', { left: 8, top: 8 }],
          ['Esquina superior derecha, con un texto más largo', { right: 8, top: 8 }],
          ['Esquina inferior izquierda', { left: 8, bottom: 8 }],
          ['Esquina inferior derecha', { right: 8, bottom: 8 }],
        ] as const
      )
        .filter(() => corners)
        .map(([label, at]) => (
        <div key={label} style={{ position: 'fixed', zIndex: 1, ...at }}>
          <Tooltip><IconButton variant="filled" label={label}><InfoIcon /></IconButton></Tooltip>
        </div>
      ))}
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
