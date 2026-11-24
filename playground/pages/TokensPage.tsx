import colorTokens from '../../tokens/color.json' with { type: 'json' }
import typescale from '../../tokens/typescale.json' with { type: 'json' }
import shape from '../../tokens/shape.json' with { type: 'json' }

const ROLES = Object.keys(colorTokens.light)
const ELEVATIONS = [0, 1, 2, 3, 4, 5]

export function TokensPage() {
  return (
    <>
      <section className="pg-section">
        <h2>Color ({ROLES.length} roles)</h2>
        <div className="pg-swatches">
          {ROLES.map((role) => (
            <div key={role} className="pg-swatch">
              <span className="pg-swatch-color" style={{ background: `var(--md-sys-color-${role})` }} />
              <code>{role}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="pg-section">
        <h2>Tipografía</h2>
        {Object.keys(typescale.styles).map((name) => (
          <p
            key={name}
            className="pg-type"
            style={{
              fontFamily: `var(--md-sys-typescale-${name}-font)`,
              fontSize: `var(--md-sys-typescale-${name}-size)`,
              lineHeight: `var(--md-sys-typescale-${name}-line-height)`,
              fontWeight: `var(--md-sys-typescale-${name}-weight)`,
              letterSpacing: `var(--md-sys-typescale-${name}-tracking)`,
            }}
          >
            {name}
          </p>
        ))}
      </section>

      <section className="pg-section">
        <h2>Esquinas</h2>
        <div className="pg-row">
          {Object.keys(shape.corner).map((name) => (
            <div key={name} className="pg-tile" style={{ borderRadius: `var(--md-sys-shape-corner-${name})` }}>
              <code>{name}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="pg-section">
        <h2>Elevación</h2>
        <div className="pg-row">
          {ELEVATIONS.map((n) => (
            <div key={n} className="pg-tile" style={{ boxShadow: `var(--md-sys-elevation-level${n})` }}>
              <code>level{n}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="pg-section">
        <h2>Movimiento</h2>
        <p className="pg-hint">
          Pasá el puntero por cada bloque. Cambiá entre Expressive y Standard arriba para comparar.
        </p>
        <div className="pg-motion">
          {['fast-spatial', 'default-spatial', 'slow-spatial', 'fast-effects', 'default-effects', 'slow-effects'].map((name) => (
            <div key={name} className="pg-motion-track">
              <span
                className="pg-motion-dot"
                style={{
                  transitionDuration: `var(--md-sys-motion-spring-${name}-duration)`,
                  transitionTimingFunction: `var(--md-sys-motion-spring-${name}-easing)`,
                }}
              />
              <code>{name}</code>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
