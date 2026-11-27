import { useState } from 'react'
import {
  AddIcon,
  ArrowDropDownIcon,
  AssistChip,
  ChipAvatar,
  ChipGroup,
  FilterChip,
  InputChip,
  SettingsIcon,
  ShareIcon,
  StarIcon,
  SuggestionChip,
  type ChipVariant,
} from '../../src/index.ts'
import { es } from '../strings-es.ts'

const DIETS = [
  ['vegano', 'Vegano'],
  ['vegetariano', 'Vegetariano'],
  ['sin-tacc', 'Sin TACC'],
  ['kosher', 'Kosher'],
  ['sin-lactosa', 'Sin lactosa'],
] as const

const PEOPLE = ['Ana Gómez', 'Bea Ruiz', 'Carla Pérez', 'Dani Sosa']

const CATEGORIES = [
  'Pizzas', 'Empanadas', 'Milanesas', 'Pastas', 'Ensaladas', 'Postres', 'Helados', 'Bebidas', 'Cafetería', 'Parrilla',
]

const initials = (name: string) => name.split(' ').map((p) => p[0]).join('')

export function ChipsPage() {
  const [variant, setVariant] = useState<ChipVariant>('outlined')
  const [disabled, setDisabled] = useState(false)
  const [rtl, setRtl] = useState(false)
  const [diet, setDiet] = useState<string[]>(['vegano'])
  const [order, setOrder] = useState<string | null>('cerca')
  const [people, setPeople] = useState(PEOPLE)
  const [draft, setDraft] = useState('')
  const [last, setLast] = useState('—')
  const [fav, setFav] = useState(false)

  return (
    <>
      <section className="pg-section">
        <h2>Tipos</h2>
        <div className="pg-controls">
          <label className="pg-field">
            Estilo
            <select value={variant} onChange={(e) => setVariant(e.target.value as ChipVariant)}>
              <option value="outlined">outlined</option>
              <option value="elevated">elevated (input: solo outlined)</option>
            </select>
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
            Deshabilitados
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={rtl} onChange={(e) => setRtl(e.target.checked)} />
            RTL
          </label>
        </div>
        <div className="pg-stage" style={{ placeItems: 'center start', padding: 16 }} dir={rtl ? 'rtl' : undefined}>
          <ChipGroup aria-label="Ejemplo de cada tipo">
            <AssistChip variant={variant} disabled={disabled} onClick={() => setLast('Agendar')}><AddIcon />Agendar</AssistChip>
            <SuggestionChip variant={variant} disabled={disabled} onClick={() => setLast('Dale')}>Dale</SuggestionChip>
            <FilterChip variant={variant} disabled={disabled} selected={fav} onClick={() => setFav(!fav)}><StarIcon />Favoritos</FilterChip>
            <InputChip removeLabel={es.inputChip.removeLabel} disabled={disabled} onRemove={() => setLast('Quitar Ana (no se quita en este ejemplo)')}>
              <ChipAvatar>AG</ChipAvatar>Ana Gómez
            </InputChip>
          </ChipGroup>
        </div>
        <p className="pg-hint">
          Último: {last}. Con Tab se entra al grupo (una sola parada) y las flechas recorren los chips,
          también el botón de quitar del input; Inicio y Fin van a los extremos. En RTL las flechas se
          invierten.
        </p>
      </section>

      <section className="pg-section">
        <h2>Estados</h2>
        <div className="pg-grid" style={{ gridTemplateColumns: 'repeat(4, max-content)' }}>
          <span />
          {['Reposo', 'Seleccionado', 'Deshabilitado'].map((h) => <span key={h} className="pg-col-head">{h}</span>)}
          {(['outlined', 'elevated'] as const).map((v) => (
            <StateRow key={v} variant={v} />
          ))}
          <span className="pg-row-head">input</span>
          <span><InputChip removeLabel={es.inputChip.removeLabel} onRemove={() => {}}><SettingsIcon />Ajuste</InputChip></span>
          <span><InputChip removeLabel={es.inputChip.removeLabel} selected onRemove={() => {}}><SettingsIcon />Ajuste</InputChip></span>
          <span><InputChip removeLabel={es.inputChip.removeLabel} disabled onRemove={() => {}}><SettingsIcon />Ajuste</InputChip></span>
          <span className="pg-row-head">input avatar</span>
          <span><InputChip removeLabel={es.inputChip.removeLabel} onRemove={() => {}}><ChipAvatar>BR</ChipAvatar>Bea</InputChip></span>
          <span><InputChip removeLabel={es.inputChip.removeLabel} selected onRemove={() => {}}><ChipAvatar>BR</ChipAvatar>Bea</InputChip></span>
          <span><InputChip removeLabel={es.inputChip.removeLabel} disabled onRemove={() => {}}><ChipAvatar>BR</ChipAvatar>Bea</InputChip></span>
        </div>
      </section>

      <section className="pg-section">
        <h2>Filtros: selección múltiple y simple</h2>
        <ChipGroup aria-label="Dieta" selectionMode="multiple" value={diet} onValueChange={setDiet}>
          {DIETS.map(([value, label]) => (
            <FilterChip key={value} value={value} variant={variant}>{label}</FilterChip>
          ))}
        </ChipGroup>
        <p className="pg-hint">Dieta: {diet.join(', ') || 'ninguna'}.</p>
        <ChipGroup aria-label="Ordenar por" selectionMode="single" value={order} onValueChange={setOrder}>
          <FilterChip value="cerca">Más cerca</FilterChip>
          <FilterChip value="precio">Precio<ArrowDropDownIcon /></FilterChip>
          <FilterChip value="puntaje">Puntaje</FilterChip>
        </ChipGroup>
        <p className="pg-hint">Orden: {order ?? 'ninguno'}. Volver a tocar el elegido lo desmarca.</p>
      </section>

      <section className="pg-section">
        <h2>Input chips con quitar</h2>
        <form
          className="pg-controls"
          onSubmit={(e) => {
            e.preventDefault()
            if (draft.trim()) setPeople((l) => [...l, draft.trim()])
            setDraft('')
          }}
        >
          <label className="pg-field">
            Agregar destinatario
            <input value={draft} onChange={(e) => setDraft(e.target.value)} />
          </label>
          <button type="submit">Agregar</button>
          <button type="button" onClick={() => setPeople(PEOPLE)}>Restaurar</button>
        </form>
        <ChipGroup aria-label="Destinatarios">
          {people.map((p) => (
            <InputChip removeLabel={es.inputChip.removeLabel} key={p} onRemove={() => setPeople((l) => l.filter((x) => x !== p))}>
              <ChipAvatar>{initials(p)}</ChipAvatar>
              {p}
            </InputChip>
          ))}
        </ChipGroup>
        <p className="pg-hint">
          Supr o Retroceso sobre un chip lo quita; el foco pasa al siguiente (o al anterior si era el
          último, o al grupo si no queda ninguno).
        </p>
      </section>

      <section className="pg-section">
        <h2>Una fila con desplazamiento</h2>
        <ChipGroup aria-label="Categorías" layout="scroll" selectionMode="single" defaultValue="Pizzas">
          {CATEGORIES.map((c) => <FilterChip key={c} value={c}>{c}</FilterChip>)}
        </ChipGroup>
        <h2>Varias filas</h2>
        <ChipGroup aria-label="Sugerencias">
          {CATEGORIES.map((c) => <SuggestionChip key={c}>{c}</SuggestionChip>)}
        </ChipGroup>
      </section>

      <section className="pg-section">
        <h2>Texto largo y enlaces</h2>
        <div style={{ maxInlineSize: 260 }}>
          <ChipGroup aria-label="Texto largo">
            <FilterChip>Restaurantes con opciones veganas cerca de casa</FilterChip>
            <InputChip removeLabel={es.inputChip.removeLabel} onRemove={() => {}}><StarIcon />maria.fernanda.rodriguez@example.com</InputChip>
            <AssistChip variant="elevated" href="#chips"><ShareIcon />Compartir en redes</AssistChip>
          </ChipGroup>
        </div>
        <p className="pg-hint">
          El chip no pasa del ancho de su contenedor: la etiqueta se recorta con puntos suspensivos y
          el nombre accesible sigue siendo el texto completo. El último es un enlace (<code>href</code>).
        </p>
      </section>
    </>
  )
}

function StateRow({ variant }: { variant: ChipVariant }) {
  return (
    <>
      <span className="pg-row-head">{variant}</span>
      <span style={{ display: 'flex', gap: 8 }}>
        <AssistChip variant={variant}><AddIcon />Asistir</AssistChip>
        <FilterChip variant={variant}>Filtro</FilterChip>
        <SuggestionChip variant={variant}>Sugerir</SuggestionChip>
      </span>
      <span style={{ display: 'flex', gap: 8 }}>
        <FilterChip variant={variant} selected>Filtro</FilterChip>
        <SuggestionChip variant={variant} selected><StarIcon />Sugerir</SuggestionChip>
      </span>
      <span style={{ display: 'flex', gap: 8 }}>
        <AssistChip variant={variant} disabled><AddIcon />Asistir</AssistChip>
        <FilterChip variant={variant} selected disabled>Filtro</FilterChip>
      </span>
    </>
  )
}
