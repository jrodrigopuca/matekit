import { useState } from 'react'
import { Divider, DividerSubhead, type DividerInset, type DividerOrientation } from '../../src/index.ts'

type InsetOption = 'none' | DividerInset
const INSET_NAMES: Record<InsetOption, string> = { none: 'Full-width', start: 'Inset (inicio)', both: 'Middle-inset' }

export function DividerPage() {
  const [orientation, setOrientation] = useState<DividerOrientation>('horizontal')
  const [inset, setInset] = useState<InsetOption>('none')
  const [rtl, setRtl] = useState(false)
  const insetProp = inset === 'none' ? undefined : inset

  return (
    <>
      <section className="pg-section">
        <h2>Interactivo</h2>
        <div className="pg-controls">
          <label className="pg-field">
            Orientación
            <select value={orientation} onChange={(e) => setOrientation(e.target.value as DividerOrientation)}>
              <option value="horizontal">horizontal</option>
              <option value="vertical">vertical</option>
            </select>
          </label>
          <label className="pg-field">
            Sangría
            <select value={inset} onChange={(e) => setInset(e.target.value as InsetOption)}>
              {(Object.keys(INSET_NAMES) as InsetOption[]).map((o) => (
                <option key={o} value={o}>{INSET_NAMES[o]}</option>
              ))}
            </select>
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={rtl} onChange={(e) => setRtl(e.target.checked)} />
            RTL
          </label>
        </div>
        <div
          className="pg-stage"
          dir={rtl ? 'rtl' : undefined}
          style={{
            display: 'flex',
            flexDirection: orientation === 'vertical' ? 'row' : 'column',
            alignItems: 'center',
            gap: 16,
            padding: '16px 0',
            minHeight: 160,
            background: 'var(--md-sys-color-surface)',
          }}
        >
          <span style={{ padding: '0 16px' }}>Antes</span>
          <Divider orientation={orientation} inset={insetProp} />
          <span style={{ padding: '0 16px' }}>Después</span>
        </div>
        <p className="pg-hint">
          El contenedor es flex con align-items: center: el divisor se estira igual al ancho
          (horizontal) o al alto (vertical). En RTL, la sangría inicial pasa a la derecha.
        </p>
      </section>

      <section className="pg-section">
        <h2>Variantes del kit</h2>
        <div className="pg-grid" style={{ gridTemplateColumns: 'max-content 320px' }}>
          {(Object.keys(INSET_NAMES) as InsetOption[]).map((o) => (
            <Variant key={o} name={INSET_NAMES[o]} inset={o === 'none' ? undefined : o} />
          ))}
          <span className="pg-row-head">Vertical</span>
          <div style={{ display: 'flex', height: 96, gap: 24, background: 'var(--md-sys-color-surface)' }}>
            <Divider orientation="vertical" />
            <Divider orientation="vertical" inset="start" />
            <Divider orientation="vertical" inset="both" />
          </div>
          <span className="pg-row-head">With subhead</span>
          <div style={{ background: 'var(--md-sys-color-surface)', paddingBlock: 8 }}>
            <DividerSubhead><h3>Recientes</h3></DividerSubhead>
          </div>
        </div>
      </section>

      <section className="pg-section">
        <h2>En una lista</h2>
        <div style={{ maxWidth: 360, background: 'var(--md-sys-color-surface)', borderRadius: 16, paddingBlock: 8 }}>
          <p style={{ margin: 0, padding: '12px 16px' }}>Bandeja de entrada</p>
          <Divider inset="start" decorative />
          <p style={{ margin: 0, padding: '12px 16px' }}>Enviados</p>
          <DividerSubhead><h3>Etiquetas</h3></DividerSubhead>
          <p style={{ margin: 0, padding: '12px 16px' }}>Trabajo</p>
          <Divider inset="both" decorative />
          <p style={{ margin: 0, padding: '12px 16px' }}>Personal</p>
        </div>
        <p className="pg-hint">
          Entre elementos de una misma lista el divisor va decorativo; el subtítulo es un
          encabezado real (h3) y su línea no se anuncia.
        </p>
      </section>
    </>
  )
}

function Variant({ name, inset }: { name: string; inset: DividerInset | undefined }) {
  return (
    <>
      <span className="pg-row-head">{name}</span>
      <div style={{ background: 'var(--md-sys-color-surface)', paddingBlock: 12 }}>
        <Divider inset={inset} />
      </div>
    </>
  )
}
