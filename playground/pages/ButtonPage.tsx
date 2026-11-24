import { useState } from 'react'
import { Button, type ButtonShape, type ButtonSize, type ButtonVariant } from '../../src/index.ts'
import { PlusIcon, StarIcon } from '../icons.tsx'

const VARIANTS: ButtonVariant[] = ['filled', 'tonal', 'outlined', 'elevated', 'text']
const SIZES: ButtonSize[] = ['xs', 'sm', 'md', 'lg', 'xl']
const SHAPES: ButtonShape[] = ['round', 'square']
type Toggle = 'none' | 'off' | 'on'

export function ButtonPage() {
  const [variant, setVariant] = useState<ButtonVariant>('filled')
  const [size, setSize] = useState<ButtonSize>('sm')
  const [shape, setShape] = useState<ButtonShape>('round')
  const [toggle, setToggle] = useState<Toggle>('none')
  const [withIcon, setWithIcon] = useState(true)
  const [disabled, setDisabled] = useState(false)
  const [label, setLabel] = useState('Etiqueta')
  const [clicks, setClicks] = useState(0)

  const selected = toggle === 'none' ? undefined : toggle === 'on'
  const code = [
    '<Button',
    variant !== 'filled' && `variant="${variant}"`,
    size !== 'sm' && `size="${size}"`,
    shape !== 'round' && `shape="${shape}"`,
    selected !== undefined && `selected={${selected}}`,
    disabled && 'disabled',
  ]
    .filter(Boolean)
    .join(' ')
    .concat(`>${withIcon ? '<PlusIcon />' : ''}${label}</Button>`)

  return (
    <>
      <section className="pg-section">
        <h2>Interactivo</h2>
        <div className="pg-controls">
          <Select label="Estilo" value={variant} options={VARIANTS} onChange={setVariant} />
          <Select label="Tamaño" value={size} options={SIZES} onChange={setSize} />
          <Select label="Forma" value={shape} options={SHAPES} onChange={setShape} />
          <Select
            label="Toggle"
            value={toggle}
            options={['none', 'off', 'on'] as Toggle[]}
            names={{ none: 'No es toggle', off: 'Sin seleccionar', on: 'Seleccionado' }}
            onChange={setToggle}
          />
          <label className="pg-field">
            Texto
            <input value={label} onChange={(e) => setLabel(e.target.value)} />
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={withIcon} onChange={(e) => setWithIcon(e.target.checked)} />
            Icono
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
            Deshabilitado
          </label>
        </div>
        <div className="pg-stage">
          <Button
            variant={variant}
            size={size}
            shape={shape}
            selected={selected}
            disabled={disabled}
            onClick={() => {
              setClicks((n) => n + 1)
              if (toggle !== 'none') setToggle(toggle === 'on' ? 'off' : 'on')
            }}
          >
            {withIcon && <PlusIcon />}
            {label}
          </Button>
        </div>
        <p className="pg-hint">
          Clics: {clicks}. Probá el teclado (Tab, Espacio) para ver el anillo de foco; mantené
          apretado para ver el cambio de forma y la onda.
        </p>
        <pre className="pg-code">{code}</pre>
      </section>

      <section className="pg-section">
        <h2>Estilos y estados</h2>
        <div className="pg-grid" style={{ gridTemplateColumns: 'repeat(6, max-content)' }}>
          <span />
          {['Común', 'Cuadrado', 'Seleccionado', 'Sin seleccionar', 'Deshabilitado'].map((h) => (
            <span key={h} className="pg-col-head">{h}</span>
          ))}
          {VARIANTS.map((v) => (
            <Row key={v} variant={v} />
          ))}
        </div>
      </section>

      <section className="pg-section">
        <h2>Tamaños</h2>
        {SHAPES.map((s) => (
          <div key={s} className="pg-row">
            {SIZES.map((z) => (
              <Button key={z} size={z} shape={s}>
                <StarIcon />
                {z}
              </Button>
            ))}
          </div>
        ))}
      </section>
    </>
  )
}

function Row({ variant }: { variant: ButtonVariant }) {
  const [on, setOn] = useState(true)
  const [off, setOff] = useState(false)
  const togglable = variant !== 'text'
  return (
    <>
      <span className="pg-row-head">{variant}</span>
      <span><Button variant={variant}><PlusIcon />Etiqueta</Button></span>
      <span><Button variant={variant} shape="square">Cuadrado</Button></span>
      <span>
        {togglable && (
          <Button variant={variant} selected={on} onClick={() => setOn(!on)}>
            <StarIcon filled={on} />
            Favorito
          </Button>
        )}
      </span>
      <span>
        {togglable && (
          <Button variant={variant} selected={off} onClick={() => setOff(!off)}>
            <StarIcon filled={off} />
            Favorito
          </Button>
        )}
      </span>
      <span><Button variant={variant} disabled>Deshabilitado</Button></span>
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
