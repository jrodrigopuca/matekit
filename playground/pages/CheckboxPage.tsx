import { useState } from 'react'
import { Checkbox } from '../../src/index.ts'

const FRUITS = ['Manzana', 'Banana', 'Naranja']

export function CheckboxPage() {
  const [error, setError] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const [picked, setPicked] = useState<string[]>(['Banana'])

  const all = picked.length === FRUITS.length
  const some = picked.length > 0 && !all

  return (
    <>
      <section className="pg-section">
        <h2>Interactivo: seleccionar todo</h2>
        <div className="pg-controls">
          <label className="pg-check">
            <input type="checkbox" checked={error} onChange={(e) => setError(e.target.checked)} />
            Error
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
            Deshabilitado
          </label>
        </div>
        <div className="pg-stage" style={{ placeItems: 'center start', padding: 24 }}>
          <div style={{ display: 'grid' }}>
            <Checkbox
              checked={all}
              indeterminate={some}
              error={error}
              disabled={disabled}
              onChange={() => setPicked(all ? [] : FRUITS)}
            >
              Todas las frutas
            </Checkbox>
            <div style={{ display: 'grid', paddingInlineStart: 32 }}>
              {FRUITS.map((f) => (
                <Checkbox
                  key={f}
                  checked={picked.includes(f)}
                  error={error}
                  disabled={disabled}
                  onChange={(e) =>
                    setPicked(e.target.checked ? [...picked, f] : picked.filter((p) => p !== f))
                  }
                >
                  {f}
                </Checkbox>
              ))}
            </div>
          </div>
        </div>
        <p className="pg-hint">
          Seleccionadas: {picked.join(', ') || 'ninguna'}. La casilla de arriba queda indeterminada
          cuando solo algunas están marcadas.
        </p>
      </section>

      <section className="pg-section">
        <h2>Estados</h2>
        <div className="pg-grid" style={{ gridTemplateColumns: 'repeat(4, max-content)' }}>
          <span />
          {['Normal', 'Error', 'Deshabilitado'].map((h) => (
            <span key={h} className="pg-col-head">{h}</span>
          ))}
          {(
            [
              ['Sin marcar', {}],
              ['Marcado', { defaultChecked: true }],
              ['Indeterminado', { indeterminate: true }],
            ] as const
          ).map(([name, props]) => (
            <Row key={name} name={name} props={props} />
          ))}
        </div>
      </section>
    </>
  )
}

function Row({ name, props }: { name: string; props: { defaultChecked?: boolean; indeterminate?: boolean } }) {
  return (
    <>
      <span className="pg-row-head">{name}</span>
      <Checkbox {...props}>Etiqueta</Checkbox>
      <Checkbox {...props} error>Etiqueta</Checkbox>
      <Checkbox {...props} disabled>Etiqueta</Checkbox>
    </>
  )
}
