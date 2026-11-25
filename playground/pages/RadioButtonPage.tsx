import { useState, type ReactNode } from 'react'
import { RadioButton, RadioGroup, RadioGroupLabel, useRadioGroup } from '../../src/index.ts'

const SHIPPING = [
  ['retiro', 'Retiro en el local'],
  ['domicilio', 'A domicilio'],
  ['correo', 'Por correo'],
] as const

export function RadioButtonPage() {
  const [disabled, setDisabled] = useState(false)
  const [lastDisabled, setLastDisabled] = useState(false)
  const [horizontal, setHorizontal] = useState(false)
  const [shipping, setShipping] = useState<string | null>('domicilio')
  const [size, setSize] = useState('ninguno')

  return (
    <>
      <section className="pg-section">
        <h2>Controlado desde el grupo</h2>
        <div className="pg-controls">
          <label className="pg-check">
            <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
            Grupo deshabilitado
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={lastDisabled} onChange={(e) => setLastDisabled(e.target.checked)} />
            Última opción deshabilitada
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={horizontal} onChange={(e) => setHorizontal(e.target.checked)} />
            En fila
          </label>
          <button type="button" onClick={() => setShipping(null)}>Ninguna</button>
        </div>
        <div className="pg-stage" style={{ placeItems: 'center start', padding: 24 }}>
          <RadioGroup
            value={shipping}
            onValueChange={setShipping}
            disabled={disabled}
            orientation={horizontal ? 'horizontal' : 'vertical'}
          >
            <RadioGroupLabel>Envío</RadioGroupLabel>
            {SHIPPING.map(([value, label], i) => (
              <RadioButton key={value} value={value} disabled={lastDisabled && i === SHIPPING.length - 1}>
                {label}
              </RadioButton>
            ))}
          </RadioGroup>
        </div>
        <p className="pg-hint">
          Elegido: {shipping ?? 'ninguno'}. Los radios no llevan <code>name</code>: lo genera el
          grupo. Con Tab se entra al grupo (una sola parada) y las flechas mueven la selección (con
          vuelta en los extremos, salvo en Safari); un radio deshabilitado se saltea.
        </p>
      </section>

      <section className="pg-section">
        <h2>No controlado, en fila</h2>
        <div className="pg-stage" style={{ placeItems: 'center start', padding: 24 }}>
          <RadioGroup aria-label="Talle" orientation="horizontal" defaultValue="M" onValueChange={setSize}>
            {['S', 'M', 'L', 'XL'].map((t) => (
              <RadioButton key={t} value={t}>{t}</RadioButton>
            ))}
          </RadioGroup>
        </div>
        <p className="pg-hint">Último cambio informado por el grupo: {size}.</p>
      </section>

      <section className="pg-section">
        <h2>Radio propio con useRadioGroup</h2>
        <div className="pg-stage" style={{ placeItems: 'center start', padding: 24 }}>
          <RadioGroup aria-label="Plan" defaultValue="mensual" style={{ gap: 8 }}>
            <PlanOption value="mensual">Mensual</PlanOption>
            <PlanOption value="anual">Anual</PlanOption>
          </RadioGroup>
        </div>
        <p className="pg-hint">
          Cada opción lee el valor del grupo con <code>useRadioGroup()</code> y se resalta cuando
          está elegida.
        </p>
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
          Radios sueltos, sin grupo, cada uno con su <code>name</code>. Hover, foco y presionado se
          prueban con el puntero y el teclado.
        </p>
      </section>
    </>
  )
}

function PlanOption({ value, children }: { value: string; children: ReactNode }) {
  const group = useRadioGroup()
  const selected = group?.value === value
  return (
    <div
      style={{
        borderRadius: 12,
        paddingInlineEnd: 16,
        // Una superficie, no un contenedor de color: la etiqueta del radio es on-surface (ADR-0008).
        background: selected ? 'var(--md-sys-color-surface-container-highest)' : 'transparent',
      }}
    >
      <RadioButton value={value}>{children}</RadioButton>
    </div>
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
