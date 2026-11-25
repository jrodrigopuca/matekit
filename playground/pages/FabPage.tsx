import { useState } from 'react'
import {
  AddIcon,
  EditIcon,
  ExtendedFab,
  Fab,
  type FabSize,
  type FabVariant,
} from '../../src/index.ts'

const VARIANTS: FabVariant[] = [
  'primary-container',
  'secondary-container',
  'tertiary-container',
  'primary',
  'secondary',
  'tertiary',
]
const SIZES: FabSize[] = ['sm', 'md', 'lg']
const SIZE_NAMES: Record<FabSize, string> = { sm: 'sm (56)', md: 'md (80)', lg: 'lg (96)' }
const MAILS = Array.from({ length: 14 }, (_, i) => `Mensaje ${i + 1}`)

export function FabPage() {
  const [variant, setVariant] = useState<FabVariant>('primary-container')
  const [size, setSize] = useState<FabSize>('sm')
  const [extended, setExtended] = useState(true)
  const [expanded, setExpanded] = useState(true)
  const [lowered, setLowered] = useState(false)
  const [clicks, setClicks] = useState(0)

  const props = [
    variant !== 'primary-container' && `variant="${variant}"`,
    size !== 'sm' && `size="${size}"`,
    lowered && 'lowered',
  ]
  const code = extended
    ? ['<ExtendedFab', ...props, !expanded && 'expanded={false}']
        .filter(Boolean)
        .join(' ')
        .concat('><EditIcon />Redactar</ExtendedFab>')
    : ['<Fab', ...props, 'label="Redactar"'].filter(Boolean).join(' ').concat('><EditIcon /></Fab>')

  return (
    <>
      <section className="pg-section">
        <h2>Interactivo</h2>
        <div className="pg-controls">
          <Select label="Color" value={variant} options={VARIANTS} onChange={setVariant} />
          <Select label="Tamaño" value={size} options={SIZES} names={SIZE_NAMES} onChange={setSize} />
          <label className="pg-check">
            <input type="checkbox" checked={extended} onChange={(e) => setExtended(e.target.checked)} />
            Extendido
          </label>
          <label className="pg-check">
            <input
              type="checkbox"
              checked={expanded}
              disabled={!extended}
              onChange={(e) => setExpanded(e.target.checked)}
            />
            Expandido
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={lowered} onChange={(e) => setLowered(e.target.checked)} />
            Lowered
          </label>
        </div>
        <div className="pg-stage">
          {extended ? (
            <ExtendedFab
              variant={variant}
              size={size}
              expanded={expanded}
              lowered={lowered}
              onClick={() => setClicks((n) => n + 1)}
            >
              <EditIcon />
              Redactar
            </ExtendedFab>
          ) : (
            <Fab label="Redactar" variant={variant} size={size} lowered={lowered} onClick={() => setClicks((n) => n + 1)}>
              <EditIcon />
            </Fab>
          )}
        </div>
        <p className="pg-hint">
          Clics: {clicks}. Con el puntero sube la sombra (nivel 3 a 4); con Tab aparece el anillo
          de foco. Contraído, el texto deja de verse pero sigue siendo el nombre accesible.
        </p>
        <pre className="pg-code">{code}</pre>
      </section>

      <section className="pg-section">
        <h2>En la esquina de una pantalla</h2>
        <p className="pg-hint">
          El FAB no se posiciona solo: acá la página lo ubica con <code>position: absolute</code>{' '}
          a 16 px de la esquina. Al desplazar la lista, el extendido se contrae.
        </p>
        <CornerExample />
      </section>

      <section className="pg-section">
        <h2>Colores</h2>
        <div className="pg-grid" style={{ gridTemplateColumns: 'repeat(4, max-content)' }}>
          <span />
          {['FAB', 'Extendido', 'Contraído'].map((h) => (
            <span key={h} className="pg-col-head">{h}</span>
          ))}
          {VARIANTS.map((v) => (
            <ColorRow key={v} variant={v} />
          ))}
        </div>
      </section>

      <section className="pg-section">
        <h2>Tamaños</h2>
        <div className="pg-grid" style={{ gridTemplateColumns: 'repeat(4, max-content)' }}>
          <span />
          {['FAB', 'Extendido', 'Contraído'].map((h) => (
            <span key={h} className="pg-col-head">{h}</span>
          ))}
          {SIZES.map((z) => (
            <SizeRow key={z} size={z} />
          ))}
        </div>
      </section>

      <section className="pg-section">
        <h2>Estados</h2>
        <p className="pg-hint">
          Pasá el puntero, presioná o llegá con Tab. Lowered baja la sombra a nivel 1 (2 con el
          puntero). No hay deshabilitado: ni el kit ni Compose lo definen.
        </p>
        <div className="pg-grid" style={{ gridTemplateColumns: 'repeat(4, max-content)' }}>
          <span />
          {['FAB', 'Extendido', 'Como enlace'].map((h) => (
            <span key={h} className="pg-col-head">{h}</span>
          ))}
          <span className="pg-row-head">Normal</span>
          <span><Fab label="Nuevo"><AddIcon /></Fab></span>
          <span><ExtendedFab><AddIcon />Nuevo</ExtendedFab></span>
          <span><Fab label="Nuevo (enlace)" href="#fab"><AddIcon /></Fab></span>
          <span className="pg-row-head">Lowered</span>
          <span><Fab label="Nuevo" lowered><AddIcon /></Fab></span>
          <span><ExtendedFab lowered><AddIcon />Nuevo</ExtendedFab></span>
          <span><ExtendedFab lowered href="#fab"><AddIcon />Enlace</ExtendedFab></span>
        </div>
      </section>
    </>
  )
}

function CornerExample() {
  const [atTop, setAtTop] = useState(true)
  return (
    <figure className="pg-phone pg-fab-phone">
      <div className="pg-phone-screen pg-fab-screen">
        <ul className="pg-fab-list" onScroll={(e) => setAtTop(e.currentTarget.scrollTop < 8)}>
          {MAILS.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <ExtendedFab className="pg-fab-corner" expanded={atTop}>
          <EditIcon />
          Redactar
        </ExtendedFab>
      </div>
    </figure>
  )
}

function ColorRow({ variant }: { variant: FabVariant }) {
  return (
    <>
      <span className="pg-row-head">{variant}</span>
      <span><Fab label={`Redactar ${variant}`} variant={variant}><EditIcon /></Fab></span>
      <span><ExtendedFab variant={variant}><EditIcon />Redactar</ExtendedFab></span>
      <span><ExtendedFab variant={variant} expanded={false}><EditIcon />Redactar</ExtendedFab></span>
    </>
  )
}

function SizeRow({ size }: { size: FabSize }) {
  return (
    <>
      <span className="pg-row-head">{SIZE_NAMES[size]}</span>
      <span><Fab label={`Nuevo ${size}`} size={size}><AddIcon /></Fab></span>
      <span><ExtendedFab size={size}><AddIcon />Nuevo</ExtendedFab></span>
      <span><ExtendedFab size={size} expanded={false}><AddIcon />Nuevo</ExtendedFab></span>
    </>
  )
}

function Select<T extends string>({
  label,
  value,
  options,
  names,
  onChange,
}: {
  label: string
  value: T
  options: readonly T[]
  names?: Partial<Record<T, string>>
  onChange: (value: T) => void
}) {
  return (
    <label className="pg-field">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {names?.[o] ?? o}
          </option>
        ))}
      </select>
    </label>
  )
}
