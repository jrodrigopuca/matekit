import { useState } from 'react'
import {
  ArrowBackIcon,
  BookmarkIcon,
  BottomSheet,
  BottomSheetContent,
  BottomSheetHandle,
  BottomSheetTitle,
  type BottomSheetState,
  HomeIcon,
  IconButton,
  InfoIcon,
  List,
  ListItem,
  ListItemAction,
  ListItemHeadline,
  ListItemLeading,
  ListItemSupporting,
  ListItemTrailing,
  NavigationSuite,
  NavigationSuiteItem,
  NavigationSuiteItemIcon,
  NavigationSuiteItemLabel,
  Pane,
  PaneScaffold,
  type ListDetailPaneName,
  SettingsIcon,
  StarIcon,
  type SupportingPaneName,
  TopAppBar,
  TopAppBarActions,
  TopAppBarLeading,
  TopAppBarSubtitle,
  TopAppBarTitle,
  WINDOW_WIDTH,
} from '../../src/index.ts'
import { es } from '../strings-es.ts'

const px = (n: number) => `${n} px`

const MESSAGES = Array.from({ length: 24 }, (_, i) => {
  const base = [
    { from: 'Ana Rivas', initials: 'AR', subject: 'Reunión del jueves', body: '¿Nos vemos el jueves a las 10 para revisar el presupuesto? Traigo los números del trimestre.' },
    { from: 'Martín Gómez', initials: 'MG', subject: 'Fotos del viaje', body: 'Te paso el enlace a las fotos; avisame si alguna no se ve.' },
    { from: 'Lucía Pérez', initials: 'LP', subject: 'Factura de noviembre', body: 'Adjunto la factura. El vencimiento es el 10 del mes que viene.' },
  ][i % 3]!
  return { id: `m${i + 1}`, when: i === 0 ? '10:24' : `${(i % 28) + 1} nov`, ...base }
})

const PARAGRAPHS = Array.from({ length: 12 }, (_, i) => `Párrafo ${i + 1} del mensaje, para que el panel tenga lo suficiente para desplazarse y se vea cómo la barra se queda arriba y cambia de color.`)

function AppNav() {
  return (
    <NavigationSuite aria-label="Principal">
      <NavigationSuiteItem href="#pane-scaffold" active onClick={(e) => e.preventDefault()}>
        <NavigationSuiteItemIcon><HomeIcon filled /></NavigationSuiteItemIcon>
        <NavigationSuiteItemLabel>Entrada</NavigationSuiteItemLabel>
      </NavigationSuiteItem>
      <NavigationSuiteItem href="#pane-scaffold" onClick={(e) => e.preventDefault()}>
        <NavigationSuiteItemIcon><StarIcon /></NavigationSuiteItemIcon>
        <NavigationSuiteItemLabel>Destacados</NavigationSuiteItemLabel>
      </NavigationSuiteItem>
      <NavigationSuiteItem href="#pane-scaffold" onClick={(e) => e.preventDefault()}>
        <NavigationSuiteItemIcon><SettingsIcon /></NavigationSuiteItemIcon>
        <NavigationSuiteItemLabel>Ajustes</NavigationSuiteItemLabel>
      </NavigationSuiteItem>
    </NavigationSuite>
  )
}

/** Lista y detalle: la List en el panel de 360, una barra por panel y el detalle con volver. */
function ListDetailDemo() {
  const [current, setCurrent] = useState<ListDetailPaneName>('list')
  const [open, setOpen] = useState('m1')
  const [nav, setNav] = useState(true)
  const [extra, setExtra] = useState(false)
  const message = MESSAGES.find((m) => m.id === open) ?? MESSAGES[0]!
  return (
    <>
      <div className="pg-controls">
        <label className="pg-check">
          <input type="checkbox" checked={nav} onChange={(e) => setNav(e.target.checked)} />
          Con NavigationSuite (rail o barra según la ventana)
        </label>
        <label className="pg-check">
          <input type="checkbox" checked={extra} onChange={(e) => setExtra(e.target.checked)} />
          Panel extra (información del mensaje)
        </label>
        <span className="pg-hint">
          Panel actual: <code>{current}</code>
        </span>
      </div>
      <PaneScaffold current={current} className="pg-panes-frame">
        {nav && <AppNav />}
        <Pane name="list" render={<section aria-label="Mensajes" />}>
          <TopAppBar>
            <TopAppBarTitle level={2}>Entrada</TopAppBarTitle>
          </TopAppBar>
          <List aria-label="Mensajes">
            {MESSAGES.map((m) => (
              <ListItem key={m.id}>
                <ListItemLeading variant="avatar"><span aria-hidden="true">{m.initials}</span></ListItemLeading>
                <ListItemHeadline>
                  <ListItemAction
                    href={`#pane-scaffold-${m.id}`}
                    current={m.id === open}
                    onClick={(e) => {
                      e.preventDefault()
                      setOpen(m.id)
                      setCurrent('detail')
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
        </Pane>
        <Pane name="detail" render={<section aria-label="Mensaje" />}>
          <TopAppBar size="md">
            {/* Volver solo hace falta con un panel: con dos, la lista ya se ve (CSS de la app). */}
            <TopAppBarLeading className="pg-panes-back">
              <IconButton label="Volver a la lista" onClick={() => setCurrent('list')}><ArrowBackIcon /></IconButton>
            </TopAppBarLeading>
            <TopAppBarTitle level={2}>{message.subject}</TopAppBarTitle>
            <TopAppBarSubtitle>{message.from}</TopAppBarSubtitle>
            <TopAppBarActions>
              <IconButton label="Guardar"><BookmarkIcon /></IconButton>
              {extra && (
                <IconButton label="Información" onClick={() => setCurrent('extra')}><InfoIcon /></IconButton>
              )}
            </TopAppBarActions>
          </TopAppBar>
          <div className="pg-panes-body">
            <p>{message.body}</p>
            {PARAGRAPHS.map((p) => <p key={p}>{p}</p>)}
          </div>
        </Pane>
        {extra && (
          <Pane name="extra" render={<aside aria-label="Información" />}>
            <TopAppBar>
              <TopAppBarLeading className="pg-panes-back-extra">
                <IconButton label="Volver al mensaje" onClick={() => setCurrent('detail')}><ArrowBackIcon /></IconButton>
              </TopAppBarLeading>
              <TopAppBarTitle level={2}>Información</TopAppBarTitle>
            </TopAppBar>
            <div className="pg-panes-body">
              <p>De: {message.from}</p>
              <p>Recibido: {message.when}</p>
            </div>
          </Pane>
        )}
      </PaneScaffold>
    </>
  )
}

/** Contenido con panel de apoyo. */
function SupportingDemo() {
  const [current, setCurrent] = useState<SupportingPaneName>('main')
  return (
    <PaneScaffold variant="supporting" current={current} className="pg-panes-frame pg-panes-short">
      <Pane name="main" render={<section aria-label="Artículo" />}>
        <TopAppBar>
          <TopAppBarTitle level={2}>Cómo cebar un buen mate</TopAppBarTitle>
          <TopAppBarActions>
            <IconButton label="Relacionados" className="pg-panes-to-supporting" onClick={() => setCurrent('supporting')}><InfoIcon /></IconButton>
          </TopAppBarActions>
        </TopAppBar>
        <div className="pg-panes-body">
          {PARAGRAPHS.slice(0, 6).map((p) => <p key={p}>{p}</p>)}
        </div>
      </Pane>
      <Pane name="supporting" render={<aside aria-label="Relacionados" />}>
        <TopAppBar>
          <TopAppBarLeading className="pg-panes-back">
            <IconButton label="Volver al artículo" onClick={() => setCurrent('main')}><ArrowBackIcon /></IconButton>
          </TopAppBarLeading>
          <TopAppBarTitle level={2}>Relacionados</TopAppBarTitle>
        </TopAppBar>
        <List>
          {['La yerba y el agua', 'Bombillas', 'Mates de calabaza', 'Termos'].map((t) => (
            <ListItem key={t}><ListItemHeadline>{t}</ListItemHeadline></ListItem>
          ))}
        </List>
      </Pane>
    </PaneScaffold>
  )
}

const PLACES = Array.from({ length: 12 }, (_, i) => ({ name: `Parada ${i + 1}`, where: `${(i + 1) * 120} m` }))

/** Bottom sheet standard: asomado sobre el contenido, que sigue usable. */
function StandardSheetDemo() {
  const [open, setOpen] = useState(true)
  const [closable, setClosable] = useState(false)
  const [state, setState] = useState<BottomSheetState>('partial')
  return (
    <>
      <div className="pg-controls">
        <label className="pg-check">
          <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} />
          Visible (<code>open</code>)
        </label>
        <label className="pg-check">
          <input type="checkbox" checked={closable} onChange={(e) => setClosable(e.target.checked)} />
          Se puede ocultar arrastrando (<code>onClose</code>)
        </label>
        <span className="pg-hint">Estado: <code>{state}</code></span>
      </div>
      <PaneScaffold variant="supporting" className="pg-panes-frame pg-panes-short">
        <Pane name="main" render={<section aria-label="Mapa" />}>
          <TopAppBar>
            <TopAppBarTitle level={2}>Paradas cercanas</TopAppBarTitle>
          </TopAppBar>
          <div className="pg-panes-body">
            {PARAGRAPHS.slice(0, 8).map((p) => <p key={p}>{p}</p>)}
          </div>
        </Pane>
        <Pane name="supporting" render={<aside aria-label="Filtros" />}>
          <TopAppBar>
            <TopAppBarTitle level={2}>Filtros</TopAppBarTitle>
          </TopAppBar>
        </Pane>
        <BottomSheet
          modal={false}
          open={open}
          state={state}
          onStateChange={(next) => setState(next)}
          onClose={closable ? () => setOpen(false) : undefined}
        >
          <BottomSheetHandle
            expandLabel={es.bottomSheet.expandLabel}
            collapseLabel={es.bottomSheet.collapseLabel}
            closeLabel={es.bottomSheet.closeLabel}
          />
          <BottomSheetTitle>Paradas</BottomSheetTitle>
          <BottomSheetContent>
            <List>
              {PLACES.map((p) => (
                <ListItem key={p.name}>
                  <ListItemHeadline>{p.name}</ListItemHeadline>
                  <ListItemTrailing>{p.where}</ListItemTrailing>
                </ListItem>
              ))}
            </List>
          </BottomSheetContent>
        </BottomSheet>
      </PaneScaffold>
    </>
  )
}

export function PaneScaffoldPage() {
  return (
    <>
      <p className="pg-note">
        Cuántos paneles se ven depende del <strong>ancho del scaffold</strong> (este recuadro), con los
        cortes de las clases de ventana: 1 debajo de {px(WINDOW_WIDTH.expanded)}, 2 desde ahí y 3 desde{' '}
        {px(WINDOW_WIDTH.large)}. La barra lateral del playground le quita lugar: con una ventana de 840 el
        recuadro mide unos 500 y muestra un panel. Rail o barra lo sigue decidiendo la ventana. En una app
        real, el scaffold ocupa toda la pantalla (<code>100dvh</code>).
      </p>

      <section className="pg-section">
        <h2>Lista y detalle</h2>
        <ListDetailDemo />
        <p className="pg-hint">
          Con un panel, elegir un mensaje pasa al detalle y volver regresa a la lista donde estaba (los
          paneles ocultos quedan montados). Con dos, la lista de 360 y el detalle con el resto; el botón
          de volver se oculta con CSS de la app. Cada panel se desplaza solo y su barra se queda arriba.
        </p>
      </section>

      <section className="pg-section">
        <h2>Contenido con panel de apoyo</h2>
        <SupportingDemo />
        <p className="pg-hint">
          El principal primero, el de apoyo de 360 al final (412 desde {px(WINDOW_WIDTH.large)}). Un{' '}
          <code>SideSheet modal={'{false}'}</code> no reemplaza a este panel: es para contenido que la
          persona abre y cierra, no para lo que decide la ventana (ADR-0030).
        </p>
      </section>

      <section className="pg-section">
        <h2>Bottom sheet standard</h2>
        <StandardSheetDemo />
        <p className="pg-hint">
          <code>BottomSheet modal={'{false}'}</code>: asoma 56 sobre el área de los paneles, sin scrim; lo de
          atrás sigue usable y los paneles reciben ese relleno abajo. El asa alterna asomado y expandido (con
          el teclado, Tab y Enter); arrastrarlo también.
        </p>
      </section>
    </>
  )
}
