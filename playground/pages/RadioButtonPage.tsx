import { useState } from 'react'
import { RadioButton, RadioGroup, RadioGroupLabel } from '../../src/index.ts'

const SHIPPING = [
  ['retiro', 'Retiro en el local'],
  ['domicilio', 'A domicilio'],
  ['correo', 'Por correo'],
] as const

export function RadioButtonPage() {
  const [disabled, setDisabled] = useState(false)
  const [lastDisabled, setLastDisabled] = useState(false)
  const [shipping, setShipping] = useState('domicilio')
  const [size, setSize] = useState('ninguno')

  return (
    <>
      <section className="pg-section">
        <h2>Controlado</h2>
        <div className="pg-controls">
          <label className="pg-check">
            <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
            Grupo deshabilitado
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={lastDisabled} onChange={(e) => setLastDisabled(e.target.checked)} />
            Última opción deshabilitada
          </label>
        </div>
        <div className="pg-stage" style={{ placeItems: 'center start', padding: 24 }}>
          <RadioGroup disabled={disabled}>
            <RadioGroupLabel>Envío</RadioGroupLabel>
            {SHIPPING.map(([value, label], i) => (
              <RadioButton
                key={value}
                name="envio"
                value={value}
                checked={shipping === value}
                disabled={lastDisabled && i === SHIPPING.length - 1}
                onChange={(e) => setShipping(e.target.value)}
              >
                {label}
              </RadioButton>
            ))}
          </RadioGroup>
        </div>
        <p className="pg-hint">
          Elegido: {shipping}. Con Tab se entra al grupo (una sola parada) y las flechas mueven la
          selección, con vuelta; un radio deshabilitado se saltea.
        </p>
      </section>

      <section className="pg-section">
        <h2>No controlado, con onChange en el grupo y en fila</h2>
        <div className="pg-stage" style={{ placeItems: 'center start', padding: 24 }}>
          <RadioGroup aria-label="Talle" style={{ flexDirection: 'row' }} onChange={(e) => setSize(e.target.value)}>
            {['S', 'M', 'L', 'XL'].map((t) => (
              <RadioButton key={t} name="talle" value={t} defaultChecked={t === 'M'}>{t}</RadioButton>
            ))}
          </RadioGroup>
        </div>
        <p className="pg-hint">Último cambio informado por el grupo: {size}.</p>
      </section>

      <section className="pg-section">
        <h2>Estados</h2>
        <div className="pg-grid" style={{ gridTemplateColumns: 'repeat(3, max-content)' }}>
          <span />
          {['Normal', 'Deshabilitado'].map((h) => (
            <span key={h} className="pg-col-head">{h}</span>
          ))}
          {(
            [
              ['Sin seleccionar', false],
              ['Seleccionado', true],
            ] as const
          ).map(([name, checked]) => (
            <Row key={name} name={name} checked={checked} />
          ))}
        </div>
        <p className="pg-hint">
          Cada radio de la matriz va en su propio grupo (<code>name</code> distinto) para que se puedan ver
          los dos estados a la vez. Hover, foco y presionado se prueban con el puntero y el teclado.
        </p>
      </section>
    </>
  )
}

function Row({ name, checked }: { name: string; checked: boolean }) {
  return (
    <>
      <span className="pg-row-head">{name}</span>
      <RadioButton name={`estado-${name}`} defaultChecked={checked}>Etiqueta</RadioButton>
      <RadioButton name={`estado-${name}-off`} defaultChecked={checked} disabled>Etiqueta</RadioButton>
    </>
  )
}
