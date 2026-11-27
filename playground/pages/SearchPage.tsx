import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import {
  ArrowBackIcon,
  Button,
  IconButton,
  ListItemHeadline,
  ListItemLeading,
  ListItemSupporting,
  MenuIcon,
  MoreVertIcon,
  RefreshIcon,
  Search,
  SearchBar,
  SearchBarLeading,
  SearchBarTrailing,
  SearchIcon,
  SearchSuggestion,
  SearchSuggestionGroup,
  SearchView,
  StarIcon,
  TopAppBar,
  TopAppBarActions,
  TopAppBarLeading,
  type SearchViewChoice,
} from '../../src/index.ts'

// Datos de ejemplo: el filtrado es del uso (la búsqueda no filtra), sin tildes ni mayúsculas.
const FRUITS = [
  { id: 'f1', name: 'Mandarina', kind: 'Cítrico' },
  { id: 'f2', name: 'Manzana', kind: 'Pepita' },
  { id: 'f3', name: 'Mango', kind: 'Tropical' },
  { id: 'f4', name: 'Maracuyá', kind: 'Tropical' },
  { id: 'f5', name: 'Melón', kind: 'Cucurbitácea' },
  { id: 'f6', name: 'Membrillo', kind: 'Pepita' },
  { id: 'f7', name: 'Naranja', kind: 'Cítrico' },
  { id: 'f8', name: 'Pera', kind: 'Pepita' },
  { id: 'f9', name: 'Pomelo', kind: 'Cítrico' },
  { id: 'f10', name: 'Sandía', kind: 'Cucurbitácea' },
  { id: 'f11', name: 'Uva', kind: 'Baya' },
  { id: 'f12', name: 'Frutilla', kind: 'Baya' },
]
const MAX_RECENT = 5

/**
 * Receta (no es parte de la librería): búsquedas recientes guardadas por la app. Search no guarda
 * nada; avisa con onSubmit, onSelect y onRemove, y esto guarda en localStorage, sin duplicados
 * (la más nueva primero), con un máximo de 5. localStorage puede no estar (ventana privada,
 * bloqueado) o estar lleno: cada lectura y escritura va en try/catch y, si falla, la lista vive
 * solo en memoria.
 */
function useRecentSearches(key: string) {
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
      return Array.isArray(saved) ? saved.filter((x): x is string => typeof x === 'string').slice(0, MAX_RECENT) : []
    } catch {
      return []
    }
  })
  const save = (next: string[]) => {
    setRecent(next)
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      // Privado, bloqueado o lleno: queda en memoria.
    }
  }
  return {
    recent,
    add: (text: string) => {
      const t = text.trim()
      if (t) save([t, ...recent.filter((r) => r !== t)].slice(0, MAX_RECENT))
    },
    remove: (text: string) => save(recent.filter((r) => r !== text)),
    clear: () => save([]),
  }
}

const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
const filterFruits = (q: string) => FRUITS.filter((f) => fold(f.name).includes(fold(q.trim())))

/** Búsqueda remota simulada: 600 ms de espera. */
function useRemoteResults(q: string) {
  const [state, setState] = useState({ loading: false, results: FRUITS.slice(0, 0) })
  useEffect(() => {
    if (q.trim() === '') {
      setState({ loading: false, results: [] })
      return
    }
    setState((s) => ({ ...s, loading: true }))
    const timer = setTimeout(() => setState({ loading: false, results: filterFruits(q) }), 600)
    return () => clearTimeout(timer)
  }, [q])
  return state
}

const frame: CSSProperties = {
  height: 360,
  maxWidth: 600,
  overflow: 'auto',
  border: '1px solid var(--md-sys-color-outline-variant)',
  borderRadius: 16,
  background: 'var(--md-sys-color-surface)',
  color: 'var(--md-sys-color-on-surface)',
}

function Log({ lines }: { lines: string[] }) {
  return (
    <p className="pg-hint" aria-live="off">
      {lines.length === 0 ? 'Sin eventos todavía.' : lines.join(' · ')}
    </p>
  )
}

export function SearchPage() {
  const [view, setView] = useState<SearchViewChoice>('auto')
  const [rtl, setRtl] = useState(false)
  const [groups, setGroups] = useState(true)
  const [remote, setRemote] = useState(false)
  const [q, setQ] = useState('')
  const [log, setLog] = useState<string[]>([])
  const push = (line: string) => setLog((l) => [line, ...l].slice(0, 4))

  const local = filterFruits(q)
  const remoteState = useRemoteResults(remote ? q : '')
  const results = remote ? remoteState.results : q.trim() === '' ? [] : local
  const history = useRecentSearches('matekit-playground-busquedas')
  const recents = history.recent.filter((r) => fold(r).includes(fold(q.trim())))
  const nameOf = (id: string) => FRUITS.find((f) => f.id === id)?.name ?? id

  const [q2, setQ2] = useState('')
  const [q3, setQ3] = useState('')
  const [submitted, setSubmitted] = useState('')

  return (
    <>
      <section className="pg-section">
        <h2>Con sugerencias</h2>
        <div className="pg-controls">
          <label className="pg-field">
            Vista
            <select value={view} onChange={(e) => setView(e.target.value as SearchViewChoice)}>
              <option value="auto">auto (por el ancho de la ventana)</option>
              <option value="docked">docked</option>
              <option value="full-screen">full-screen</option>
            </select>
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={groups} onChange={(e) => setGroups(e.target.checked)} />
            Recientes agrupadas
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} />
            Búsqueda remota (600 ms)
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={rtl} onChange={(e) => setRtl(e.target.checked)} />
            RTL
          </label>
        </div>
        <p className="pg-hint">
          Escribí "ma": las flechas recorren las sugerencias (con vuelta), Enter elige la activa o busca,
          Escape cierra y, cerrada, borra; Alt+Flecha abajo abre. Bajo 600 px, la vista es a pantalla
          completa.
        </p>
        <div dir={rtl ? 'rtl' : undefined}>
          <Search
            view={view}
            value={q}
            onValueChange={setQ}
            onSubmit={(v) => {
              push(`buscar "${v}"`)
              history.add(v)
            }}
            onSelect={(v) => {
              push(`elegir "${v}"`)
              history.add(nameOf(v))
            }}
          >
            <SearchBar label="Buscar frutas" placeholder="Buscar frutas">
              <SearchBarLeading>
                <IconButton label="Menú"><MenuIcon /></IconButton>
              </SearchBarLeading>
              <SearchBarTrailing>
                <img
                  alt="Perfil"
                  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3E%3Crect width='30' height='30' fill='%236b8f71'/%3E%3Ctext x='15' y='20' font-size='14' text-anchor='middle' fill='white'%3EJ%3C/text%3E%3C/svg%3E"
                />
              </SearchBarTrailing>
            </SearchBar>
            <SearchView loading={remote && remoteState.loading}>
              {groups && recents.length > 0 && (
                <SearchSuggestionGroup label="Recientes">
                  {recents.map((r) => (
                    <SearchSuggestion
                      key={r}
                      value={r}
                      onRemove={(v) => {
                        history.remove(v)
                        push(`quitar "${v}"`)
                      }}
                    >
                      <ListItemLeading><RefreshIcon /></ListItemLeading>
                      <ListItemHeadline>{r}</ListItemHeadline>
                    </SearchSuggestion>
                  ))}
                </SearchSuggestionGroup>
              )}
              {results.length > 0 && groups ? (
                <SearchSuggestionGroup label="Frutas">
                  {results.map((f) => (
                    <SearchSuggestion key={f.id} value={f.id} textValue={f.name}>
                      <ListItemLeading><SearchIcon /></ListItemLeading>
                      <ListItemHeadline>{f.name}</ListItemHeadline>
                      <ListItemSupporting>{f.kind}</ListItemSupporting>
                    </SearchSuggestion>
                  ))}
                </SearchSuggestionGroup>
              ) : (
                results.map((f) => <SearchSuggestion key={f.id} value={f.id} textValue={f.name} disabled={f.id === 'f6'} />)
              )}
            </SearchView>
          </Search>
        </div>
        <div className="pg-controls">
          <Button variant="text" size="sm" disabled={history.recent.length === 0} onClick={history.clear}>
            Borrar historial
          </Button>
        </div>
        <p className="pg-hint">
          Las recientes las guarda la página (receta useRecentSearches, localStorage): se agregan al buscar
          o elegir; Supr sobre una reciente activa la quita; "Borrar historial" las quita todas.
        </p>
        <Log lines={log} />
      </section>

      <section className="pg-section">
        <h2>Dentro del TopAppBar</h2>
        <p className="pg-hint">
          La barra va como hijo directo y ocupa el lugar del título: Surface Container, y Surface
          Container Highest al desplazar el recuadro.
        </p>
        <div style={frame} dir={rtl ? 'rtl' : undefined}>
          <TopAppBar>
            <TopAppBarLeading>
              <IconButton label="Volver"><ArrowBackIcon /></IconButton>
            </TopAppBarLeading>
            <Search view={view} value={q2} onValueChange={setQ2} onSelect={(v) => push(`barra: elegir "${v}"`)}>
              <SearchBar label="Buscar en la bandeja" placeholder="Buscar en la bandeja" />
              <SearchView>
                {filterFruits(q2).slice(0, q2 ? 6 : 0).map((f) => (
                  <SearchSuggestion key={f.id} value={f.name} />
                ))}
              </SearchView>
            </Search>
            <TopAppBarActions>
              <IconButton label="Más opciones"><MoreVertIcon /></IconButton>
            </TopAppBarActions>
          </TopAppBar>
          <div style={{ padding: 'var(--md-sys-space-200)', display: 'grid', gap: 'var(--md-sys-space-200)' }}>
            {Array.from({ length: 16 }, (_, i) => (
              <p key={i} style={{ margin: 0 }}>
                {i + 1}. Contenido para desplazar debajo de la barra.
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="pg-section">
        <h2>Suelta, en un formulario</h2>
        <p className="pg-hint">Sin sugerencias: un campo de búsqueda común. Enter envía el formulario.</p>
        <form
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault()
            setSubmitted(String(new FormData(e.currentTarget).get('q')))
          }}
        >
          <Search value={q3} onValueChange={setQ3}>
            <SearchBar label="Buscar en el sitio" name="q" placeholder="Buscar en el sitio">
              <SearchBarLeading><SearchIcon /></SearchBarLeading>
              <SearchBarTrailing>
                <IconButton label="Favoritos"><StarIcon /></IconButton>
              </SearchBarTrailing>
            </SearchBar>
          </Search>
        </form>
        <p className="pg-hint">{submitted ? `Enviado: q=${submitted}` : 'Todavía no se envió.'}</p>
        <h3>Deshabilitada</h3>
        <Search defaultValue="mate">
          <SearchBar label="Buscar (deshabilitada)" disabled>
            <SearchBarLeading><SearchIcon /></SearchBarLeading>
          </SearchBar>
        </Search>
      </section>
    </>
  )
}
