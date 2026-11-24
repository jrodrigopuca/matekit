import { useState } from 'react'
import { Switch } from '../../src/index.ts'

export function SwitchPage() {
  const [wifi, setWifi] = useState(true)
  const [plane, setPlane] = useState(false)
  const [icons, setIcons] = useState(true)
  const [disabled, setDisabled] = useState(false)

  return (
    <>
      <section className="pg-section">
        <h2>Interactivo</h2>
        <div className="pg-controls">
          <label className="pg-check">
            <input type="checkbox" checked={icons} onChange={(e) => setIcons(e.target.checked)} />
            Con iconos
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
            Deshabilitado
          </label>
        </div>
        <div className="pg-stage" style={{ placeItems: 'center start', padding: 24 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <Switch checked={wifi} onChange={(e) => setWifi(e.target.checked)} icons={icons} disabled={disabled}>
              Wi-Fi
            </Switch>
            <Switch checked={plane} onChange={(e) => setPlane(e.target.checked)} icons={icons} disabled={disabled}>
              Modo avión
            </Switch>
          </div>
        </div>
        <p className="pg-hint">
          Wi-Fi: {wifi ? 'activado' : 'desactivado'}. Modo avión: {plane ? 'activado' : 'desactivado'}.
          Con el teclado: Tab para llegar y Espacio para alternar (al mantenerlo, el handle crece).
        </p>
      </section>

      <section className="pg-section">
        <h2>Estados</h2>
        <div className="pg-grid" style={{ gridTemplateColumns: 'repeat(5, max-content)' }}>
          <span />
          {['Normal', 'Con icono', 'Deshabilitado', 'Deshabilitado con icono'].map((h) => (
            <span key={h} className="pg-col-head">{h}</span>
          ))}
          {(
            [
              ['Desactivado', false],
              ['Activado', true],
            ] as const
          ).map(([name, checked]) => (
            <Row key={name} name={name} checked={checked} />
          ))}
        </div>
      </section>
    </>
  )
}

function Row({ name, checked }: { name: string; checked: boolean }) {
  return (
    <>
      <span className="pg-row-head">{name}</span>
      <Switch defaultChecked={checked} aria-label={`${name}, normal`} />
      <Switch defaultChecked={checked} icons aria-label={`${name}, con icono`} />
      <Switch defaultChecked={checked} disabled aria-label={`${name}, deshabilitado`} />
      <Switch defaultChecked={checked} icons disabled aria-label={`${name}, deshabilitado con icono`} />
    </>
  )
}
