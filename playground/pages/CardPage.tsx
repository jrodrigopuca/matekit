import { useState, type ReactNode } from 'react'
import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CardHeadline,
  CardMedia,
  CardPrimaryAction,
  CardSubhead,
  IconButton,
  MoreVertIcon,
  Shape,
  type CardOrientation,
  type CardVariant,
} from '../../src/index.ts'

// Imagen y avatar sin archivos: degradados con los tokens de color, que siguen al tema y a la paleta.
const mediaFill = {
  background:
    'radial-gradient(circle at 70% 30%, var(--md-sys-color-tertiary-container), transparent 50%), ' +
    'linear-gradient(160deg, var(--md-sys-color-primary-container), var(--md-sys-color-secondary))',
} as const
const avatarFill = {
  background: 'linear-gradient(135deg, var(--md-sys-color-primary), var(--md-sys-color-tertiary))',
} as const

const Avatar = () => <Shape shape="circle" aria-hidden="true" style={{ width: 40, height: 40, ...avatarFill }} />
const Picture = ({ label }: { label: string }) => <div role="img" aria-label={label} style={mediaFill} />

type Mode = 'surface' | 'link' | 'button' | 'disabled'
const VARIANTS: CardVariant[] = ['elevated', 'filled', 'outlined']

const title = (mode: Mode, text: string): ReactNode =>
  mode === 'surface' ? (
    text
  ) : mode === 'link' ? (
    <CardPrimaryAction href="#card">{text}</CardPrimaryAction>
  ) : (
    <CardPrimaryAction disabled={mode === 'disabled'} onClick={() => console.log('tarjeta', text)}>
      {text}
    </CardPrimaryAction>
  )

/** Ejemplo apilado del kit ("Media & text", 360 × 480). */
function Stacked({ variant, mode, orientation = 'vertical', adaptive = true, text = 'Título' }: {
  variant: CardVariant
  mode: Mode
  orientation?: CardOrientation
  adaptive?: boolean
  text?: string
}) {
  return (
    <Card variant={variant} orientation={orientation} adaptive={adaptive}>
      <CardHeader>
        <Avatar />
        <CardHeadline>{title(mode, text)}</CardHeadline>
        <CardSubhead>Subtítulo</CardSubhead>
        <IconButton label="Más opciones" size="sm"><MoreVertIcon /></IconButton>
      </CardHeader>
      <CardMedia><Picture label="Paisaje de ejemplo" /></CardMedia>
      <CardContent>
        <CardHeadline level={4}>Título del contenido</CardHeadline>
        <CardSubhead>Subtítulo</CardSubhead>
        <p>Texto de apoyo de la tarjeta: explica de qué se trata en pocas líneas.</p>
        <CardActions>
          <Button variant="outlined" size="sm">Secundaria</Button>
          <Button size="sm">Principal</Button>
        </CardActions>
      </CardContent>
    </Card>
  )
}

/** Ejemplo horizontal del kit (360 × 80). */
function Horizontal({ variant, mode, adaptive = true, text = 'Título' }: { variant: CardVariant; mode: Mode; adaptive?: boolean; text?: string }) {
  return (
    <Card variant={variant} orientation="horizontal" adaptive={adaptive}>
      <CardHeader>
        <Avatar />
        <CardHeadline>{title(mode, text)}</CardHeadline>
        <CardSubhead>Subtítulo</CardSubhead>
      </CardHeader>
      <CardMedia><Picture label="Miniatura de ejemplo" /></CardMedia>
    </Card>
  )
}

const GRID_ITEMS = [
  'Notas del viaje',
  'Un título bastante más largo, que corta en varias líneas sin desbordar la tarjeta',
  'Receta',
  'Presupuesto 2027',
  'Lista de lectura con muchas recomendaciones',
]

export function CardPage() {
  const [variant, setVariant] = useState<CardVariant>('elevated')
  const [mode, setMode] = useState<Mode>('link')
  const [orientation, setOrientation] = useState<CardOrientation>('vertical')
  const [adaptive, setAdaptive] = useState(true)
  const [width, setWidth] = useState(360)
  const [long, setLong] = useState(false)
  const text = long ? 'Un título larguísimo con una palabra sin espacios: supercalifragilisticoespialidoso' : 'Título'

  return (
    <>
      <section className="pg-section">
        <h2>Interactivo</h2>
        <div className="pg-controls">
          <label className="pg-field">
            Estilo
            <select value={variant} onChange={(e) => setVariant(e.target.value as CardVariant)}>
              {VARIANTS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label className="pg-field">
            Acción principal
            <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
              <option value="surface">ninguna (superficie)</option>
              <option value="link">enlace</option>
              <option value="button">botón</option>
              <option value="disabled">botón deshabilitado (la tarjeta no reacciona)</option>
            </select>
          </label>
          <label className="pg-field">
            Orientación
            <select value={orientation} onChange={(e) => setOrientation(e.target.value as CardOrientation)}>
              <option value="vertical">vertical</option>
              <option value="horizontal">horizontal</option>
            </select>
          </label>
          <label className="pg-field">
            Ancho: {width} px
            <input type="range" min={180} max={1000} step={10} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={adaptive} onChange={(e) => setAdaptive(e.target.checked)} />
            adaptive
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={long} onChange={(e) => setLong(e.target.checked)} />
            Título largo
          </label>
        </div>
        <div className="pg-stage" style={{ background: 'var(--md-sys-color-surface)', padding: 24, gridTemplateColumns: 'minmax(0, 1fr)' }}>
          <div style={{ width, maxWidth: '100%' }}>
            {orientation === 'vertical' ? (
              <Stacked variant={variant} mode={mode} adaptive={adaptive} text={text} />
            ) : (
              <Horizontal variant={variant} mode={mode} adaptive={adaptive} text={text} />
            )}
          </div>
        </div>
        <p className="pg-hint">
          La tarjeta se adapta a su propio ancho (container queries), no al de la ventana: la
          vertical pone la imagen al costado desde 600 px; la horizontal se apila bajo 320 px; las
          acciones se apilan bajo 240 px. Con Tab, el foco pasa por el título (acción principal),
          el botón de más opciones y las dos acciones, cada uno por separado.
        </p>
      </section>

      <section className="pg-section">
        <h2>Ejemplos del kit</h2>
        <div className="pg-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, min(100%, 360px))', alignItems: 'start' }}>
          {VARIANTS.map((v) => <Stacked key={v} variant={v} mode="link" />)}
          {VARIANTS.map((v) => <Horizontal key={v} variant={v} mode="link" />)}
          {VARIANTS.map((v) => <Horizontal key={`b-${v}`} variant={v} mode="button" text="Acción como botón" />)}
        </div>
        <p className="pg-hint">Fila 1: apilada (acción principal como enlace); fila 2: horizontal; fila 3: horizontal con la acción principal como botón (abre la consola). La tarjeta no tiene estado deshabilitado (el kit no lo tiene): con la acción principal como botón deshabilitado (control de arriba), solo deja de reaccionar.</p>
      </section>

      <section className="pg-section">
        <h2>Adaptación al ancho de la tarjeta</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 24, background: 'var(--md-sys-color-surface)', padding: 16 }}>
          {[700, 400].map((w) => (
            <div key={w} style={{ width: w, maxWidth: '100%' }}>
              <p className="pg-hint">Vertical en {w} px</p>
              <Stacked variant="outlined" mode="link" />
            </div>
          ))}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            {[360, 280, 220].map((w) => (
              <div key={w} style={{ width: w, maxWidth: '100%' }}>
                <p className="pg-hint">Horizontal en {w} px</p>
                <Horizontal variant="filled" mode="link" />
              </div>
            ))}
          </div>
          <div style={{ width: 220, maxWidth: '100%' }}>
            <p className="pg-hint">Vertical en 220 px (acciones apiladas)</p>
            <Stacked variant="elevated" mode="link" />
          </div>
        </div>
      </section>

      <section className="pg-section">
        <h2>Superficie y contenido libre ("Slot")</h2>
        <div className="pg-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, min(100%, 280px))', alignItems: 'start' }}>
          {VARIANTS.map((v) => (
            <Card key={v} variant={v}>
              <CardContent>
                <CardHeadline>{v}</CardHeadline>
                <p>Sin acción principal: una superficie que agrupa contenido. No tiene estados.</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="pg-section">
        <h2>Grilla de tarjetas</h2>
        <pre className="pg-code" style={{ whiteSpace: 'pre-wrap' }}>{`display: grid;
gap: 16px;
grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));`}</pre>
        <div
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            background: 'var(--md-sys-color-surface)',
            padding: 16,
          }}
        >
          {GRID_ITEMS.map((t, i) => (
            <Card key={t} variant={VARIANTS[i % 3]}>
              <CardMedia><Picture label="Imagen de ejemplo" /></CardMedia>
              <CardContent>
                <CardHeadline><CardPrimaryAction href="#card">{t}</CardPrimaryAction></CardHeadline>
                <p>{i % 2 ? 'Texto corto.' : 'Un texto de apoyo un poco más largo para que las tarjetas de la fila tengan contenido de distinto alto.'}</p>
                <CardActions>
                  <Button variant="outlined" size="sm">Compartir</Button>
                  <Button size="sm">Abrir</Button>
                </CardActions>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="pg-hint">
          Las tarjetas de una fila quedan del mismo alto (la celda las estira) y las acciones,
          abajo. Con <code>min(100%, 280px)</code>, una columna más angosta que 280 no desborda.
        </p>
      </section>
    </>
  )
}
