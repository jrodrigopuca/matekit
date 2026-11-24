import { useState } from 'react'
import { ICONS, Icon } from '../../src/index.ts'

export function IconsPage() {
  const [size, setSize] = useState(24)
  const [filled, setFilled] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const groups = [...new Set(ICONS.map((i) => i.group))]

  const copy = async (component: string) => {
    await navigator.clipboard?.writeText(`<${component} />`)
    setCopied(component)
  }

  return (
    <>
      <section className="pg-section">
        <h2>Iconos incluidos ({ICONS.length})</h2>
        <div className="pg-controls">
          <label className="pg-field">
            Tamaño: {size} px
            <input type="range" min={16} max={48} step={4} value={size} onChange={(e) => setSize(Number(e.target.value))} />
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={filled} onChange={(e) => setFilled(e.target.checked)} />
            Rellenos (los que lo admiten)
          </label>
        </div>
        <p className="pg-hint">
          Material Symbols, estilo Outlined, 24 px. Clic en un icono para copiar su JSX.
          {copied && ` Copiado: <${copied} />`}
        </p>
        {groups.map((group) => (
          <div key={group}>
            <h3 className="pg-subhead">{group}</h3>
            <div className="pg-icons">
              {ICONS.filter((i) => i.group === group).map(({ name, component: Component, fillable }) => {
                const componentName = Component.name
                return (
                  <button key={name} type="button" className="pg-icon-cell" onClick={() => copy(componentName)}>
                    <Component size={size} filled={fillable && filled} />
                    <code>{name}</code>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="pg-section">
        <h2>Cualquier SVG con Icon</h2>
        <div className="pg-row">
          <Icon size={32}>
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /></svg>
          </Icon>
          <code>{'<Icon size={32}><svg …/></Icon>'}</code>
        </div>
      </section>
    </>
  )
}
