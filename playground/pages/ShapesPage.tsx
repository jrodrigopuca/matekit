import { useState, type CSSProperties } from 'react'
import { SHAPES, Shape, type ShapeName, FavoriteIcon, StarIcon, SettingsIcon, HomeIcon } from '../../src/index.ts'

// Avatar sin imágenes: un degradado con los tokens de color, que sigue al tema y a la paleta.
const avatarFill = {
  background:
    'radial-gradient(circle at 30% 25%, var(--md-sys-color-tertiary-container), transparent 55%), ' +
    'linear-gradient(135deg, var(--md-sys-color-primary), var(--md-sys-color-tertiary))',
} as const

export function ShapesPage() {
  const [size, setSize] = useState(96)
  const [color, setColor] = useState<'primary' | 'secondary' | 'tertiary'>('primary')
  const [avatarShape, setAvatarShape] = useState<ShapeName>('cookie-9-sided')

  return (
    <>
      <section className="pg-section">
        <h2>Formas decorativas ({SHAPES.length})</h2>
        <div className="pg-controls">
          <label className="pg-field">
            Tamaño: {size} px
            <input type="range" min={32} max={160} step={8} value={size} onChange={(e) => setSize(Number(e.target.value))} />
          </label>
          <label className="pg-field">
            Color
            <select value={color} onChange={(e) => setColor(e.target.value as typeof color)}>
              <option value="primary">primary</option>
              <option value="secondary">secondary</option>
              <option value="tertiary">tertiary</option>
            </select>
          </label>
        </div>
        <p className="pg-hint">
          En el orden del "Shape Set" del kit. Generadas con <code>pnpm shapes</code> a partir de{' '}
          <code>MaterialShapes.kt</code> de Compose (ADR-0011); el nombre es el de la prop <code>shape</code>.
        </p>
        <div className="pg-shapes" style={{ '--pg-shape-size': `${size}px` } as CSSProperties}>
          {SHAPES.map((s) => (
            <figure key={s.name} className="pg-shape-cell">
              <Shape shape={s.name} className="pg-shape-sample" style={{ background: `var(--md-sys-color-${color})` }} />
              <figcaption>
                <code>{s.name}</code>
                <span>{s.label}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="pg-section">
        <h2>Avatar</h2>
        <div className="pg-controls">
          <label className="pg-field">
            Forma
            <select value={avatarShape} onChange={(e) => setAvatarShape(e.target.value as ShapeName)}>
              {SHAPES.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="pg-row pg-avatars">
          {[40, 56, 96, 160].map((px) => (
            <Shape key={px} shape={avatarShape} role="img" aria-label="Avatar de ejemplo" style={{ width: px, height: px, ...avatarFill }} />
          ))}
          <Shape shape="arch" role="img" aria-label="Imagen apaisada" style={{ width: 240, height: 160, ...avatarFill }} />
        </div>
        <p className="pg-hint">
          Con una imagen: <code>{'<Shape shape="cookie-9-sided" style={{ width: 96, height: 96 }}><img src="…" alt="Ana" /></Shape>'}</code>.
          La imagen llena la forma (<code>object-fit: cover</code>); en un elemento no cuadrado, la forma se estira.
        </p>
      </section>

      <section className="pg-section">
        <h2>Fondo de icono</h2>
        <div className="pg-row pg-icon-backgrounds">
          {(
            [
              ['sunny', StarIcon, 'primary-container'],
              ['cookie-4-sided', FavoriteIcon, 'secondary-container'],
              ['clover-4-leaf', HomeIcon, 'tertiary-container'],
              ['soft-burst', SettingsIcon, 'primary'],
            ] as const
          ).map(([shape, Icon, role]) => (
            <Shape
              key={shape}
              shape={shape}
              style={{
                width: 72,
                height: 72,
                background: `var(--md-sys-color-${role})`,
                color: `var(--md-sys-color-on-${role})`,
              }}
            >
              <Icon size={32} />
            </Shape>
          ))}
        </div>
        <p className="pg-hint">
          El contenido se centra. Color con el par <code>on-X</code> sobre <code>X</code>. En alto contraste el fondo
          desaparece (el navegador lo cambia por Canvas) y el icono se sigue viendo.
        </p>
      </section>
    </>
  )
}
