import { useEffect, useState, type ReactNode } from 'react'
import {
  Badge,
  BookmarkIcon,
  FavoriteIcon,
  HomeIcon,
  SearchIcon,
  SettingsIcon,
  StarIcon,
  Tab,
  TabLink,
  TabList,
  TabNav,
  TabPanel,
  Tabs,
  TextField,
  TextFieldLabel,
  type TabsActivation,
  type TabsLayout,
  type TabsVariant,
} from '../../src/index.ts'

type Content = 'label' | 'icon' | 'both'

const ITEMS: { id: string; label: string; icon: (selected: boolean) => ReactNode }[] = [
  { id: 'inicio', label: 'Inicio', icon: (s) => <HomeIcon filled={s} /> },
  { id: 'favoritos', label: 'Favoritos', icon: (s) => <StarIcon filled={s} /> },
  { id: 'buscar', label: 'Buscar', icon: (s) => <SearchIcon filled={s} /> },
  { id: 'guardados', label: 'Guardados', icon: (s) => <BookmarkIcon filled={s} /> },
  { id: 'me-gusta', label: 'Me gusta', icon: (s) => <FavoriteIcon filled={s} /> },
  { id: 'ajustes', label: 'Ajustes', icon: (s) => <SettingsIcon filled={s} /> },
]

const MANY = [
  'Novedades', 'Política', 'Economía', 'Deportes', 'Cultura', 'Espectáculos', 'Tecnología', 'Ciencia', 'Salud',
  'Turismo', 'Opinión', 'Clima',
]

function tabChildren(item: (typeof ITEMS)[number], content: Content, selected: boolean, badge?: ReactNode) {
  return (
    <>
      {content !== 'label' && item.icon(selected)}
      {content !== 'icon' && item.label}
      {badge}
    </>
  )
}

/** Matriz: un estilo y un contenido, sin estado propio (cada una con su elegida). */
function Sample({ variant, content, layout = 'fixed', count = 3 }: { variant: TabsVariant; content: Content; layout?: TabsLayout; count?: number }) {
  const [value, setValue] = useState('inicio')
  return (
    <Tabs value={value} onValueChange={setValue}>
      <TabList variant={variant} layout={layout} aria-label={`${variant}, ${content}`}>
        {ITEMS.slice(0, count).map((item) => (
          <Tab key={item.id} value={item.id} {...(content === 'icon' ? { 'aria-label': item.label } : {})}>
            {tabChildren(item, content, item.id === value)}
          </Tab>
        ))}
      </TabList>
    </Tabs>
  )
}

const readSection = () => new URLSearchParams(location.hash.split('?')[1] ?? '').get('seccion') ?? 'perfil'

export function TabsPage() {
  const [variant, setVariant] = useState<TabsVariant>('primary')
  const [layout, setLayout] = useState<TabsLayout>('fixed')
  const [content, setContent] = useState<Content>('both')
  const [activation, setActivation] = useState<TabsActivation>('automatic')
  const [count, setCount] = useState(3)
  const [badges, setBadges] = useState(true)
  const [disabled, setDisabled] = useState(false)
  const [rtl, setRtl] = useState(false)
  const [value, setValue] = useState('inicio')
  const [last, setLast] = useState('—')
  const [section, setSection] = useState(readSection)

  useEffect(() => {
    const onHash = () => setSection(readSection())
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  const items = ITEMS.slice(0, count)
  const current = items.some((i) => i.id === value) ? value : 'inicio'

  return (
    <>
      <section className="pg-section">
        <h2>Pestañas de contenido</h2>
        <div className="pg-controls">
          <label className="pg-field">
            Estilo
            <select value={variant} onChange={(e) => setVariant(e.target.value as TabsVariant)}>
              <option value="primary">primary</option>
              <option value="secondary">secondary</option>
            </select>
          </label>
          <label className="pg-field">
            Disposición
            <select value={layout} onChange={(e) => setLayout(e.target.value as TabsLayout)}>
              <option value="fixed">fixed</option>
              <option value="scrollable">scrollable</option>
            </select>
          </label>
          <label className="pg-field">
            Contenido
            <select value={content} onChange={(e) => setContent(e.target.value as Content)}>
              <option value="label">solo etiqueta</option>
              <option value="icon">solo icono</option>
              <option value="both">icono y etiqueta</option>
            </select>
          </label>
          <label className="pg-field">
            Activación
            <select value={activation} onChange={(e) => setActivation(e.target.value as TabsActivation)}>
              <option value="automatic">automática</option>
              <option value="manual">manual</option>
            </select>
          </label>
          <label className="pg-field">
            Pestañas
            <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={badges} onChange={(e) => setBadges(e.target.checked)} />
            Insignias
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
            Una deshabilitada
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={rtl} onChange={(e) => setRtl(e.target.checked)} />
            RTL
          </label>
        </div>
        <div dir={rtl ? 'rtl' : undefined}>
          <Tabs
            value={current}
            activation={activation}
            onValueChange={(v, event) => {
              setValue(v)
              setLast(`${v} (${event.type})`)
            }}
          >
            <TabList variant={variant} layout={layout} aria-label="Secciones">
              {items.map((item, i) => (
                <Tab
                  key={item.id}
                  value={item.id}
                  disabled={disabled && i === 1}
                  {...(content === 'icon' ? { 'aria-label': item.label } : {})}
                >
                  {tabChildren(
                    item,
                    content,
                    item.id === current,
                    badges && i === 0 ? <Badge label="Novedades" /> : badges && i === 2 ? <Badge label="3 nuevos">3</Badge> : undefined,
                  )}
                </Tab>
              ))}
            </TabList>
            {items.map((item) => (
              <TabPanel key={item.id} value={item.id} unmount={item.id === 'buscar'} style={{ padding: 16 }}>
                <p>Panel «{item.label}».{item.id === 'buscar' ? ' Se desmonta al salir (unmount).' : ' Queda montado y oculto: lo escrito se conserva.'}</p>
                <TextField>
                  <TextFieldLabel>Nota de {item.label}</TextFieldLabel>
                </TextField>
              </TabPanel>
            ))}
          </Tabs>
        </div>
        <p className="pg-hint">Último cambio: {last}</p>
      </section>

      <section className="pg-section">
        <h2>Pestañas de navegación (enlaces)</h2>
        <p className="pg-hint">
          Un <code>&lt;nav&gt;</code> con enlaces y <code>aria-current="page"</code>: Tab recorre cada enlace. Cambian la URL
          (<code>#tabs?seccion=…</code>).
        </p>
        <TabNav variant={variant} layout={layout} aria-label="Cuenta">
          {['perfil', 'seguridad', 'pagos', 'notificaciones'].map((s) => (
            <TabLink key={s} href={`#tabs?seccion=${s}`} active={section === s}>
              {s[0]?.toUpperCase() + s.slice(1)}
            </TabLink>
          ))}
        </TabNav>
      </section>

      <section className="pg-section">
        <h2>Estilos y contenido</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 24, maxWidth: 480 }}>
          {(['primary', 'secondary'] as const).flatMap((v) =>
            (['label', 'icon', 'both'] as const).map((c) => (
              <div key={`${v}-${c}`}>
                <div className="pg-row-head">{v} · {c === 'label' ? 'solo etiqueta' : c === 'icon' ? 'solo icono' : 'icono y etiqueta'}</div>
                <Sample variant={v} content={c} />
              </div>
            )),
          )}
        </div>
      </section>

      <section className="pg-section">
        <h2>Scrollable con muchas pestañas</h2>
        <ManyTabs variant="primary" />
        <div style={{ height: 16 }} />
        <ManyTabs variant="secondary" />
      </section>

      <section className="pg-section">
        <h2>Fixed en un ancho chico</h2>
        <p className="pg-hint">
          Seis pestañas fijas en 320 px: la etiqueta que no entra se recorta con puntos suspensivos (el nombre accesible queda completo). Para más de cuatro o etiquetas
          largas, conviene scrollable.
        </p>
        <div style={{ maxWidth: 320 }}>
          <Sample variant="primary" content="label" count={6} />
        </div>
      </section>
    </>
  )
}

function ManyTabs({ variant }: { variant: TabsVariant }) {
  const [value, setValue] = useState(MANY[0] ?? '')
  return (
    <Tabs value={value} onValueChange={setValue}>
      <TabList variant={variant} layout="scrollable" aria-label={`Secciones del diario (${variant})`}>
        {MANY.map((m) => <Tab key={m} value={m}>{m}</Tab>)}
      </TabList>
    </Tabs>
  )
}
