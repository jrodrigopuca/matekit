import { useState } from 'react'
import {
  IconButton,
  type IconButtonShape,
  type IconButtonSize,
  type IconButtonVariant,
  type IconButtonWidth,
} from '../../src/index.ts'
import { SearchIcon, StarIcon } from '../../src/index.ts'

const VARIANTS: IconButtonVariant[] = ['standard', 'filled', 'tonal', 'outlined']
const SIZES: IconButtonSize[] = ['xs', 'sm', 'md', 'lg', 'xl']
const WIDTHS: IconButtonWidth[] = ['narrow', 'default', 'wide']
const SHAPES: IconButtonShape[] = ['round', 'square']
type Toggle = 'none' | 'off' | 'on'

export function IconButtonPage() {
  const [variant, setVariant] = useState<IconButtonVariant>('filled')
  const [size, setSize] = useState<IconButtonSize>('md')
  const [width, setWidth] = useState<IconButtonWidth>('default')
  const [shape, setShape] = useState<IconButtonShape>('round')
  const [toggle, setToggle] = useState<Toggle>('off')
  const [disabled, setDisabled] = useState(false)
  const [clicks, setClicks] = useState(0)

  const selected = toggle === 'none' ? undefined : toggle === 'on'
  const code = [
    '<IconButton',
    variant !== 'standard' && `variant="${variant}"`,
    size !== 'sm' && `size="${size}"`,
    width !== 'default' && `width="${width}"`,
    shape !== 'round' && `shape="${shape}"`,
    'label="Favorito"',
    selected !== undefined && `selected={${selected}}`,
    disabled && 'disabled',
  ]
    .filter(Boolean)
    .join(' ')
    .concat(`><StarIcon${selected ? ' filled' : ''} /></IconButton>`)

  return (
    <>
      <section className="pg-section">
        <h2>Interactivo</h2>
        <div className="pg-controls">
          <Select label="Estilo" value={variant} options={VARIANTS} onChange={setVariant} />
          <Select label="Tamaño" value={size} options={SIZES} onChange={setSize} />
          <Select label="Ancho" value={width} options={WIDTHS} onChange={setWidth} />
          <Select label="Forma" value={shape} options={SHAPES} onChange={setShape} />
          <Select
            label="Toggle"
            value={toggle}
            options={['none', 'off', 'on'] as Toggle[]}
            names={{ none: 'No es toggle', off: 'Sin seleccionar', on: 'Seleccionado' }}
            onChange={setToggle}
          />
          <label className="pg-check">
            <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
            Deshabilitado
          </label>
        </div>
        <div className="pg-stage">
          <IconButton
            label="Favorito"
            variant={variant}
            size={size}
            width={width}
            shape={shape}
            selected={selected}
            disabled={disabled}
            onClick={() => {
              setClicks((n) => n + 1)
              if (toggle !== 'none') setToggle(toggle === 'on' ? 'off' : 'on')
            }}
          >
            <StarIcon filled={selected === true} />
          </IconButton>
        </div>
        <p className="pg-hint">
          Clics: {clicks}. Probá el teclado (Tab, Espacio) para ver el anillo de foco; mantené
          apretado para ver el cambio de forma y la onda. Como toggle, la forma redonda pasa a
          cuadrada al seleccionar y la cuadrada, a redonda.
        </p>
        <pre className="pg-code">{code}</pre>
      </section>

      <section className="pg-section">
        <h2>Estilos y estados</h2>
        <div className="pg-grid" style={{ gridTemplateColumns: 'repeat(8, max-content)' }}>
          <span />
          {[
            'Común',
            'Cuadrado',
            'Seleccionado',
            'Sin seleccionar',
            'Cuadrado selecc.',
            'Deshabilitado',
            'Selecc. deshab.',
          ].map((h) => (
            <span key={h} className="pg-col-head">{h}</span>
          ))}
          {VARIANTS.map((v) => (
            <Row key={v} variant={v} />
          ))}
        </div>
      </section>

      <section className="pg-section">
        <h2>Tamaños y anchos</h2>
        <div className="pg-grid" style={{ gridTemplateColumns: 'repeat(6, max-content)', alignItems: 'center' }}>
          <span />
          {SIZES.map((z) => (
            <span key={z} className="pg-col-head">{z}</span>
          ))}
          {WIDTHS.map((w) => (
            <WidthRow key={w} width={w} />
          ))}
        </div>
      </section>
    </>
  )
}

function Row({ variant }: { variant: IconButtonVariant }) {
  const [on, setOn] = useState(true)
  const [off, setOff] = useState(false)
  const [squareOn, setSquareOn] = useState(true)
  return (
    <>
      <span className="pg-row-head">{variant}</span>
      <span><IconButton label="Buscar" variant={variant}><SearchIcon /></IconButton></span>
      <span><IconButton label="Buscar" variant={variant} shape="square"><SearchIcon /></IconButton></span>
      <span>
        <IconButton label="Favorito" variant={variant} selected={on} onClick={() => setOn(!on)}>
          <StarIcon filled={on} />
        </IconButton>
      </span>
      <span>
        <IconButton label="Favorito" variant={variant} selected={off} onClick={() => setOff(!off)}>
          <StarIcon filled={off} />
        </IconButton>
      </span>
      <span>
        <IconButton
          label="Favorito"
          variant={variant}
          shape="square"
          selected={squareOn}
          onClick={() => setSquareOn(!squareOn)}
        >
          <StarIcon filled={squareOn} />
        </IconButton>
      </span>
      <span><IconButton label="Buscar" variant={variant} disabled><SearchIcon /></IconButton></span>
      <span>
        <IconButton label="Favorito" variant={variant} selected disabled>
          <StarIcon filled />
        </IconButton>
      </span>
    </>
  )
}

function WidthRow({ width }: { width: IconButtonWidth }) {
  return (
    <>
      <span className="pg-row-head">{width}</span>
      {SIZES.map((z) => (
        <span key={z}>
          <IconButton label={`${z} ${width}`} variant="tonal" size={z} width={width}>
            <StarIcon />
          </IconButton>
        </span>
      ))}
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
