import { useState, type ReactNode } from 'react'
import {
  BookmarkIcon,
  Checkbox,
  ChevronRightIcon,
  DeleteIcon,
  EditIcon,
  FavoriteIcon,
  HomeIcon,
  IconButton,
  InfoIcon,
  List,
  ListItem,
  ListItemAction,
  ListItemDetails,
  ListItemHeadline,
  ListItemLeading,
  ListItemOverline,
  ListItemSummary,
  ListItemSupporting,
  ListItemTrailing,
  MoreVertIcon,
  RadioButton,
  RadioGroup,
  RadioGroupLabel,
  SettingsIcon,
  ShareIcon,
  StarIcon,
  Switch,
  type ListItemAlign,
  type ListVariant,
} from '../../src/index.ts'

// Imágenes sin archivos: degradados con los tokens de color, que siguen al tema y a la paleta.
const fill = {
  background:
    'radial-gradient(circle at 70% 30%, var(--md-sys-color-tertiary-container), transparent 50%), ' +
    'linear-gradient(160deg, var(--md-sys-color-primary-container), var(--md-sys-color-secondary))',
} as const
const Picture = () => <div style={{ width: '100%', height: '100%', ...fill }} />

const LONG = 'Un texto principal bastante más largo, con unapalabrasinespaciosmuylargaquetienequecortar'
const SUPPORTING = 'Texto de apoyo que puede ocupar varias líneas; se recorta a dos con puntos suspensivos para que la lista no crezca sin límite.'

/** Un recuadro con fondo de panel y ancho fijo, para ver la lista como vive en una aplicación. */
function Panel({ width, title, children, dir }: { width: number | string; title?: string; children: ReactNode; dir?: 'rtl' | 'ltr' }) {
  return (
    <div style={{ width, maxWidth: '100%' }} dir={dir}>
      {title && <p className="pg-hint" style={{ margin: '0 0 8px' }}>{title}</p>}
      <div style={{ background: 'var(--md-sys-color-surface-container)', borderRadius: 16, padding: 8 }}>{children}</div>
    </div>
  )
}

const MESSAGES = [
  { id: 'm1', from: 'Ana Rivas', initials: 'AR', when: '10:24', subject: 'Reunión del jueves', body: '¿Nos vemos el jueves a las 10 para revisar el presupuesto?' },
  { id: 'm2', from: 'Martín Gómez', initials: 'MG', when: 'Ayer', subject: 'Fotos del viaje', body: 'Te paso el enlace a las fotos; avisame si alguna no se ve.' },
  { id: 'm3', from: 'Lucía Pérez', initials: 'LP', when: 'Lun', subject: 'Factura de noviembre', body: 'Adjunto la factura. El vencimiento es el 10 del mes que viene.' },
]

/** Lista y detalle: la lista en un panel de 360 y el elemento abierto marcado con aria-current. */
function ListDetail() {
  const [open, setOpen] = useState('m1')
  const message = MESSAGES.find((m) => m.id === open) ?? MESSAGES[0]
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'start', background: 'var(--md-sys-color-surface-container)', borderRadius: 16, padding: 8 }}>
      <div style={{ flex: '0 1 360px', minWidth: 0 }}>
        <List variant="segmented" aria-label="Mensajes">
          {MESSAGES.map((m) => (
            <ListItem key={m.id}>
              <ListItemLeading variant="avatar"><span aria-hidden="true">{m.initials}</span></ListItemLeading>
              <ListItemHeadline>
                <ListItemAction
                  href={`#list-${m.id}`}
                  current={m.id === open}
                  onClick={(e) => {
                    e.preventDefault()
                    setOpen(m.id)
                  }}
                >
                  {m.from}
                </ListItemAction>
              </ListItemHeadline>
              <ListItemSupporting>{m.subject}</ListItemSupporting>
              <ListItemTrailing>{m.when}</ListItemTrailing>
            </ListItem>
          ))}
        </List>
      </div>
      <article style={{ flex: '1 1 280px', minWidth: 0, padding: 16, borderRadius: 16, background: 'var(--md-sys-color-surface)' }}>
        <h3 style={{ margin: '0 0 8px' }}>{message?.subject}</h3>
        <p className="pg-hint" style={{ margin: '0 0 16px' }}>{message?.from} · {message?.when}</p>
        <p style={{ margin: 0 }}>{message?.body}</p>
      </article>
    </div>
  )
}

export function ListPage() {
  const [variant, setVariant] = useState<ListVariant>('standard')
  const [dividers, setDividers] = useState(false)
  const [align, setAlign] = useState<ListItemAlign>('middle')
  const [width, setWidth] = useState(360)
  const [rtl, setRtl] = useState(false)
  const [long, setLong] = useState(false)
  const [current, setCurrent] = useState('entrada')

  const listProps = variant === 'segmented' ? ({ variant: 'segmented' } as const) : ({ variant: 'standard', dividers } as const)

  return (
    <>
      <section className="pg-section">
        <h2>Interactivo</h2>
        <div className="pg-controls">
          <label className="pg-field">
            Tipo
            <select value={variant} onChange={(e) => setVariant(e.target.value as ListVariant)}>
              <option value="standard">standard</option>
              <option value="segmented">segmented</option>
            </select>
          </label>
          <label className="pg-field">
            Alineación
            <select value={align} onChange={(e) => setAlign(e.target.value as ListItemAlign)}>
              <option value="middle">middle</option>
              <option value="top">top</option>
            </select>
          </label>
          <label className="pg-field">
            Ancho: {width} px
            <input type="range" min={180} max={900} step={10} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={dividers} disabled={variant === 'segmented'} onChange={(e) => setDividers(e.target.checked)} />
            dividers
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={rtl} onChange={(e) => setRtl(e.target.checked)} />
            RTL
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={long} onChange={(e) => setLong(e.target.checked)} />
            Texto largo
          </label>
        </div>
        <Panel width={width} dir={rtl ? 'rtl' : 'ltr'}>
          <List {...listProps} aria-label="Carpetas">
              {[
                ['entrada', 'Entrada', '24', <HomeIcon key="i" />],
                ['destacados', 'Destacados', '3', <StarIcon key="i" filled={current === 'destacados'} />],
                ['guardados', long ? LONG : 'Guardados', '', <BookmarkIcon key="i" filled={current === 'guardados'} />],
              ].map(([id, text, count, icon]) => (
                <ListItem key={id as string} align={align}>
                  <ListItemLeading>{icon}</ListItemLeading>
                  <ListItemHeadline>
                    <ListItemAction
                      href={`#list-${id as string}`}
                      current={current === id}
                      onClick={(e) => {
                        e.preventDefault()
                        setCurrent(id as string)
                      }}
                    >
                      {text}
                    </ListItemAction>
                  </ListItemHeadline>
                  {long && <ListItemSupporting>{SUPPORTING}</ListItemSupporting>}
                  {count && <ListItemTrailing>{count}</ListItemTrailing>}
                </ListItem>
              ))}
              <ListItem align={align}>
                <ListItemLeading><SettingsIcon /></ListItemLeading>
                <Switch defaultChecked>
                  <ListItemHeadline>Sincronizar</ListItemHeadline>
                  <ListItemSupporting>{long ? SUPPORTING : 'Cada 15 minutos'}</ListItemSupporting>
                </Switch>
              </ListItem>
              <ListItem align={align}>
                <ListItemLeading variant="avatar"><span aria-hidden="true">AR</span></ListItemLeading>
                <ListItemOverline>Ayer</ListItemOverline>
                <ListItemHeadline><ListItemAction onClick={() => console.log('abrir mensaje')}>Ana Rivas</ListItemAction></ListItemHeadline>
                <ListItemSupporting>{long ? SUPPORTING : '¿Nos vemos el jueves?'}</ListItemSupporting>
                <ListItemTrailing><IconButton label="Más opciones de Ana Rivas" size="sm"><MoreVertIcon /></IconButton></ListItemTrailing>
              </ListItem>
              <ListItem align={align}>
                <ListItemDetails>
                  <ListItemSummary>
                    <ListItemLeading><InfoIcon /></ListItemLeading>
                    <ListItemHeadline>¿Cómo funciona?</ListItemHeadline>
                  </ListItemSummary>
                  <p>Cada elemento es un enlace, un botón, un control o un acordeón; nunca uno dentro de otro.</p>
                </ListItemDetails>
              </ListItem>
          </List>
        </Panel>
        <p className="pg-hint">
          La lista se adapta a su propio ancho (container queries): bajo 320 px, el texto final que
          no acompaña a un icono o un control pasa debajo del texto principal; el video de inicio se
          achica. Tab recorre los enlaces, el switch, el botón de Ana, el de más opciones y el
          acordeón por separado; Enter o Espacio abren el acordeón.
        </p>
      </section>

      <section className="pg-section">
        <h2>Lista y detalle</h2>
        <ListDetail />
        <p className="pg-hint">
          La lista vive en un panel de 360 (como el futuro scaffold de paneles); cada elemento es un
          enlace y el abierto en el detalle lleva <code>aria-current="page"</code> y el seleccionado
          del kit (Secondary Container). No es la navegación principal de la aplicación (eso son
          NavigationBar y NavigationRail).
        </p>
      </section>

      <section className="pg-section">
        <h2>Semántica por caso</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'start' }}>
          <Panel width={360} title="Contenido (no interactiva)">
            <List aria-label="Contactos">
              <ListItem>
                <ListItemLeading variant="avatar"><span aria-hidden="true">LP</span></ListItemLeading>
                <ListItemHeadline>Lucía Pérez</ListItemHeadline>
                <ListItemSupporting>lucia@example.com</ListItemSupporting>
              </ListItem>
              <ListItem>
                <ListItemLeading variant="avatar"><span aria-hidden="true">MG</span></ListItemLeading>
                <ListItemHeadline>Martín Gómez</ListItemHeadline>
                <ListItemSupporting>martin@example.com</ListItemSupporting>
                <ListItemTrailing>Admin</ListItemTrailing>
              </ListItem>
            </List>
          </Panel>

          <Panel width={360} title="Elementos que son enlaces (filas de ajustes)">
            <List variant="segmented" aria-label="Ajustes">
              <ListItem>
                <ListItemLeading><HomeIcon /></ListItemLeading>
                <ListItemHeadline><ListItemAction href="#list">General</ListItemAction></ListItemHeadline>
                <ListItemTrailing><ChevronRightIcon /></ListItemTrailing>
              </ListItem>
              <ListItem>
                <ListItemLeading><FavoriteIcon /></ListItemLeading>
                <ListItemHeadline><ListItemAction href="#list">Favoritos</ListItemAction></ListItemHeadline>
                <ListItemTrailing><ChevronRightIcon /></ListItemTrailing>
              </ListItem>
              <ListItem>
                <ListItemLeading><SettingsIcon /></ListItemLeading>
                <ListItemHeadline><ListItemAction href="#list">Avanzado</ListItemAction></ListItemHeadline>
                <ListItemTrailing><ChevronRightIcon /></ListItemTrailing>
              </ListItem>
            </List>
          </Panel>

          <Panel width={360} title="Acciones (botones; uno deshabilitado; IconButton secundario)">
            <List aria-label="Acciones del archivo">
              <ListItem>
                <ListItemLeading><EditIcon /></ListItemLeading>
                <ListItemHeadline><ListItemAction onClick={() => console.log('editar')}>Editar</ListItemAction></ListItemHeadline>
              </ListItem>
              <ListItem>
                <ListItemLeading><ShareIcon /></ListItemLeading>
                <ListItemHeadline><ListItemAction onClick={() => console.log('compartir')}>Compartir</ListItemAction></ListItemHeadline>
                <ListItemTrailing><IconButton label="Copiar enlace" size="sm"><BookmarkIcon /></IconButton></ListItemTrailing>
              </ListItem>
              <ListItem>
                <ListItemLeading><DeleteIcon /></ListItemLeading>
                <ListItemHeadline><ListItemAction disabled>Borrar</ListItemAction></ListItemHeadline>
                <ListItemSupporting>Sin permiso</ListItemSupporting>
              </ListItem>
            </List>
          </Panel>

          <Panel width={360} title="Selección con casillas (toda la fila marca)">
            <List variant="segmented" aria-label="Lista de compras">
              {['Leche', 'Pan', 'Yerba'].map((t, i) => (
                <ListItem key={t}>
                  <Checkbox name="compras" value={t} defaultChecked={i === 2} disabled={i === 1}>
                    <ListItemHeadline>{t}</ListItemHeadline>
                    <ListItemSupporting>{i === 1 ? 'Sin stock' : '1 unidad'}</ListItemSupporting>
                  </Checkbox>
                </ListItem>
              ))}
            </List>
          </Panel>

          <Panel width={360} title="Selección con radios (RadioGroup)">
            <RadioGroup name="envio" defaultValue="correo">
              <RadioGroupLabel>Envío</RadioGroupLabel>
              <List>
                <ListItem>
                  <RadioButton value="correo"><ListItemHeadline>Correo</ListItemHeadline><ListItemSupporting>3 a 5 días</ListItemSupporting></RadioButton>
                </ListItem>
                <ListItem>
                  <RadioButton value="retiro"><ListItemHeadline>Retiro en sucursal</ListItemHeadline><ListItemSupporting>Mañana</ListItemSupporting></RadioButton>
                </ListItem>
              </List>
            </RadioGroup>
          </Panel>

          <Panel width={360} title="Acordeón (details/summary, uno a la vez)">
            <List variant="segmented" aria-label="Preguntas frecuentes">
              {['¿Cuánto tarda el envío?', '¿Puedo devolverlo?', '¿Qué medios de pago aceptan?'].map((q, i) => (
                <ListItem key={q}>
                  <ListItemDetails name="faq" open={i === 0 ? true : undefined}>
                    <ListItemSummary><ListItemHeadline>{q}</ListItemHeadline></ListItemSummary>
                    <p>Respuesta de ejemplo: el contenido aparece debajo de la fila y la fila queda con el fondo Surface.</p>
                  </ListItemDetails>
                </ListItem>
              ))}
            </List>
          </Panel>
        </div>
      </section>

      <section className="pg-section">
        <h2>Partes de inicio y final, líneas y alineación</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'start' }}>
          <Panel width={360} title="Inicio">
            <List aria-label="Inicio" dividers>
              <ListItem><ListItemLeading><StarIcon /></ListItemLeading><ListItemHeadline>Icono de 20</ListItemHeadline></ListItem>
              <ListItem><ListItemLeading /><ListItemHeadline>Sangría (inicio vacío)</ListItemHeadline></ListItem>
              <ListItem><ListItemLeading variant="avatar"><span aria-hidden="true">JR</span></ListItemLeading><ListItemHeadline>Avatar con iniciales</ListItemHeadline></ListItem>
              <ListItem><ListItemLeading variant="avatar"><Picture /></ListItemLeading><ListItemHeadline>Avatar con imagen</ListItemHeadline></ListItem>
              <ListItem><ListItemLeading variant="image"><Picture /></ListItemLeading><ListItemHeadline>Imagen de 56</ListItemHeadline><ListItemSupporting>Radio 4 y borde</ListItemSupporting></ListItem>
              <ListItem><ListItemLeading variant="video"><Picture /></ListItemLeading><ListItemHeadline>Video de 114 × 64</ListItemHeadline></ListItem>
            </List>
          </Panel>
          <Panel width={360} title="Final">
            <List aria-label="Final" dividers>
              <ListItem><ListItemHeadline>Texto</ListItemHeadline><ListItemTrailing>100+</ListItemTrailing></ListItem>
              <ListItem><ListItemHeadline>Icono</ListItemHeadline><ListItemTrailing><ChevronRightIcon /></ListItemTrailing></ListItem>
              <ListItem><ListItemHeadline>Texto e icono</ListItemHeadline><ListItemTrailing>Nuevo<InfoIcon /></ListItemTrailing></ListItem>
              <ListItem><ListItemHeadline>IconButton</ListItemHeadline><ListItemTrailing><IconButton label="Más opciones" size="sm"><MoreVertIcon /></IconButton></ListItemTrailing></ListItem>
              <ListItem><Checkbox><ListItemHeadline>Casilla</ListItemHeadline></Checkbox></ListItem>
              <ListItem><RadioButton name="suelto" value="a"><ListItemHeadline>Radio</ListItemHeadline></RadioButton></ListItem>
              <ListItem><Switch><ListItemHeadline>Switch</ListItemHeadline></Switch></ListItem>
            </List>
          </Panel>
          <Panel width={360} title="Una, dos y tres líneas; middle y top">
            <List aria-label="Líneas" dividers>
              <ListItem><ListItemLeading><StarIcon /></ListItemLeading><ListItemHeadline>Una línea</ListItemHeadline><ListItemTrailing>52</ListItemTrailing></ListItem>
              <ListItem><ListItemLeading><StarIcon /></ListItemLeading><ListItemHeadline>Dos líneas</ListItemHeadline><ListItemSupporting>Texto de apoyo</ListItemSupporting><ListItemTrailing>64</ListItemTrailing></ListItem>
              <ListItem><ListItemLeading><StarIcon /></ListItemLeading><ListItemOverline>Overline</ListItemOverline><ListItemHeadline>Tres líneas</ListItemHeadline><ListItemSupporting>Texto de apoyo</ListItemSupporting><ListItemTrailing>80</ListItemTrailing></ListItem>
              <ListItem align="top"><ListItemLeading variant="image"><Picture /></ListItemLeading><ListItemHeadline>Arriba (top)</ListItemHeadline><ListItemSupporting>{SUPPORTING}</ListItemSupporting><ListItemTrailing>top</ListItemTrailing></ListItem>
            </List>
          </Panel>
        </div>
      </section>

      <section className="pg-section">
        <h2>Anchos: 200, 360 y 800</h2>
        <div style={{ display: 'grid', gap: 24 }}>
          {[200, 360, 800].map((w) => (
            <Panel key={w} width={w} title={`${w} px`}>
              <List variant="segmented" aria-label={`Lista de ${w}`}>
                <ListItem>
                  <ListItemLeading variant="video"><Picture /></ListItemLeading>
                  <ListItemHeadline><ListItemAction href="#list">{LONG}</ListItemAction></ListItemHeadline>
                  <ListItemSupporting>{SUPPORTING}</ListItemSupporting>
                  <ListItemTrailing>12:45</ListItemTrailing>
                </ListItem>
                <ListItem>
                  <ListItemLeading><StarIcon /></ListItemLeading>
                  <Checkbox defaultChecked>
                    <ListItemHeadline>Recordatorio con un nombre largo</ListItemHeadline>
                    <ListItemSupporting>{SUPPORTING}</ListItemSupporting>
                  </Checkbox>
                </ListItem>
                <ListItem>
                  <ListItemLeading><InfoIcon /></ListItemLeading>
                  <ListItemHeadline>Con texto final</ListItemHeadline>
                  <ListItemTrailing>Hace 3 horas</ListItemTrailing>
                </ListItem>
              </List>
            </Panel>
          ))}
        </div>
      </section>
    </>
  )
}
