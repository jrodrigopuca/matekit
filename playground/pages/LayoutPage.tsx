import { useEffect, useState, type CSSProperties } from 'react'
import {
  Button,
  Group,
  SPACE,
  Stack,
  WINDOW_HEIGHT,
  WINDOW_WIDTH,
  type GroupOrientation,
  type SpaceStep,
  type StackAlign,
  type StackDirection,
  type StackJustify,
} from '../../src/index.ts'

const STEPS = Object.keys(SPACE).map(Number) as SpaceStep[]
const ALIGNS: Array<StackAlign | ''> = ['', 'start', 'center', 'end', 'stretch', 'baseline']
const JUSTIFIES: Array<StackJustify | ''> = ['', 'start', 'center', 'end', 'between', 'around', 'evenly']

const tile: CSSProperties = {
  padding: 'var(--md-sys-space-150) var(--md-sys-space-200)',
  borderRadius: 'var(--md-sys-shape-corner-small)',
  background: 'var(--md-sys-color-secondary-container)',
  color: 'var(--md-sys-color-on-secondary-container)',
}

/** Clase de ancho de ventana actual, con matchMedia sobre los cortes en rem. */
function useWindowClass(): string {
  const queries = [
    ['extra-large', WINDOW_WIDTH.extraLarge],
    ['large', WINDOW_WIDTH.large],
    ['expanded', WINDOW_WIDTH.expanded],
    ['medium', WINDOW_WIDTH.medium],
  ] as const
  const read = () => queries.find(([, px]) => matchMedia(`(min-width: ${px / 16}rem)`).matches)?.[0] ?? 'compact'
  const [cls, setCls] = useState(read)
  useEffect(() => {
    const lists = queries.map(([, px]) => matchMedia(`(min-width: ${px / 16}rem)`))
    const on = () => setCls(read())
    for (const l of lists) l.addEventListener('change', on)
    return () => {
      for (const l of lists) l.removeEventListener('change', on)
    }
  })
  return cls
}

export function LayoutPage() {
  const [direction, setDirection] = useState<StackDirection>('row')
  const [gap, setGap] = useState<SpaceStep>(150)
  const [wrap, setWrap] = useState(true)
  const [align, setAlign] = useState<StackAlign | ''>('')
  const [justify, setJustify] = useState<StackJustify | ''>('')
  const [switching, setSwitching] = useState(false)
  const [width, setWidth] = useState(480)
  const [rtl, setRtl] = useState(false)
  const [orientation, setOrientation] = useState<GroupOrientation>('vertical')
  const [count, setCount] = useState(3)
  const [view, setView] = useState('Semana')
  const [format, setFormat] = useState('B')
  const windowClass = useWindowClass()

  const stackProps = switching
    ? ({ switchAt: '30rem' } as const)
    : ({ direction, wrap } as const)

  return (
    <>
      <section className="pg-section">
        <h2>Escala de espaciado</h2>
        <p className="pg-hint">
          <code>--md-sys-space-&lt;paso&gt;</code>: los 18 pasos de Compose <code>MeasurementTokens.kt</code> con el
          nombre de <code>@material/web</code> (ADR-0016). El paso es centésimas de 8: <code>200</code> = 16 px.
        </p>
        <div className="pg-space-scale">
          {STEPS.map((s) => (
            <div key={s} className="pg-space-row">
              <code>{s}</code>
              <span className="pg-space-bar" style={{ width: `var(--md-sys-space-${s})` }} />
              <span>{SPACE[s]} px</span>
            </div>
          ))}
        </div>
      </section>

      <section className="pg-section">
        <h2>Cortes de ventana</h2>
        <p>
          Ventana actual: <strong>{windowClass}</strong>. Ancho: medium desde {WINDOW_WIDTH.medium} ({WINDOW_WIDTH.medium / 16}rem),
          expanded {WINDOW_WIDTH.expanded} ({WINDOW_WIDTH.expanded / 16}rem), large {WINDOW_WIDTH.large} ({WINDOW_WIDTH.large / 16}rem),
          extra-large {WINDOW_WIDTH.extraLarge} ({WINDOW_WIDTH.extraLarge / 16}rem). Alto: medium desde {WINDOW_HEIGHT.medium}, expanded{' '}
          {WINDOW_HEIGHT.expanded}.
        </p>
        <p className="pg-hint">
          Solo para la página (paneles, barra o rail), con <code>@media</code> escrito en rem o <code>matchMedia</code> y
          las constantes <code>WINDOW_WIDTH</code> y <code>WINDOW_HEIGHT</code>. Los componentes miran su contenedor.
        </p>
      </section>

      <section className="pg-section">
        <h2>Stack</h2>
        <div className="pg-controls">
          <label className="pg-check">
            <input type="checkbox" checked={switching} onChange={(e) => setSwitching(e.target.checked)} />
            switchAt="30rem"
          </label>
          <label className="pg-field">
            Dirección
            <select value={direction} disabled={switching} onChange={(e) => setDirection(e.target.value as StackDirection)}>
              <option value="column">column</option>
              <option value="row">row</option>
            </select>
          </label>
          <label className="pg-field">
            gap
            <select value={gap} onChange={(e) => setGap(Number(e.target.value) as SpaceStep)}>
              {STEPS.map((s) => (
                <option key={s} value={s}>{s} ({SPACE[s]} px)</option>
              ))}
            </select>
          </label>
          <label className="pg-field">
            align
            <select value={align} onChange={(e) => setAlign(e.target.value as StackAlign | '')}>
              {ALIGNS.map((a) => <option key={a} value={a}>{a || '(CSS)'}</option>)}
            </select>
          </label>
          <label className="pg-field">
            justify
            <select value={justify} onChange={(e) => setJustify(e.target.value as StackJustify | '')}>
              {JUSTIFIES.map((j) => <option key={j} value={j}>{j || '(CSS)'}</option>)}
            </select>
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={wrap} disabled={switching} onChange={(e) => setWrap(e.target.checked)} />
            wrap
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={rtl} onChange={(e) => setRtl(e.target.checked)} />
            RTL
          </label>
          <label className="pg-field">
            Ancho del contenedor: {width} px
            <input type="range" min={160} max={1000} step={10} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
          </label>
        </div>
        <div dir={rtl ? 'rtl' : undefined} className="pg-layout-frame" style={{ width, maxWidth: '100%' }}>
          <Stack
            {...stackProps}
            gap={gap}
            align={align || undefined}
            justify={justify || undefined}
            render={<ul className="pg-plain-list" />}
          >
            <li style={tile}>Uno</li>
            <li style={{ ...tile, paddingBlock: 'var(--md-sys-space-300)' }}>Dos, más alto</li>
            <li style={tile}>Tres</li>
            <li style={{ ...tile, flex: 1, minInlineSize: 0 }}>Cuatro (flex: 1, como weight)</li>
          </Stack>
        </div>
        <p className="pg-hint">
          Con <code>switchAt</code>, en fila desde 30rem (480 px) de ancho del Stack y en columna por debajo: mover el
          ancho del contenedor. Mide el Stack, no la ventana. El cuarto hijo toma el espacio que sobra en fila.
        </p>
      </section>

      <section className="pg-section">
        <h2>Group: List segmentada</h2>
        <p className="pg-hint">
          16 afuera, 4 adentro, separación 2 (valores por defecto; Compose <code>segmentedShapes</code> y el kit). Con el
          puntero, el elemento pasa a 12 en las cuatro esquinas, como Compose: lo redefine el hijo en su propio
          <code>:hover</code>.
        </p>
        <div className="pg-controls">
          <label className="pg-field">
            Orientación
            <select value={orientation} onChange={(e) => setOrientation(e.target.value as GroupOrientation)}>
              <option value="vertical">vertical</option>
              <option value="horizontal">horizontal</option>
            </select>
          </label>
          <label className="pg-field">
            Elementos: {count}
            <input type="range" min={1} max={6} value={count} onChange={(e) => setCount(Number(e.target.value))} />
          </label>
        </div>
        <div dir={rtl ? 'rtl' : undefined} className="pg-layout-frame" style={{ width: Math.min(width, 420), maxWidth: '100%' }}>
          <Group orientation={orientation} render={<ul className="pg-plain-list pg-segmented" aria-label="Ajustes" />}>
            {['Wi-Fi', 'Bluetooth', 'Pantalla', 'Sonido', 'Batería', 'Almacenamiento'].slice(0, count).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </Group>
        </div>
      </section>

      <section className="pg-section">
        <h2>Group: botones conectados</h2>
        <p className="pg-hint">
          Compose <code>ConnectedButtonGroupSmallTokens</code>: redondo afuera, 8 adentro, 4 al presionar, redondo al
          seleccionar y separación 2. Con elementos simples (<code>&lt;button&gt;</code> con CSS propio, sin radio
          propio):
        </p>
        <Group role="group" aria-label="Vista del calendario" className="pg-connected">
          {['Día', 'Semana', 'Mes', 'Año'].map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>{v}</button>
          ))}
        </Group>
        <p className="pg-hint">
          Con el <code>Button</code> de matekit, que hoy no lee las variables de Group: el playground le agrega en su CSS
          lo que propone ADR-0017 (leer <code>--mk-group-corner-*</code> con su radio como respaldo). Sin ese CSS,
          cada botón conserva su forma redonda.
        </p>
        <Group role="group" aria-label="Formato del texto" className="pg-button-group">
          {['N', 'B', 'I', 'U'].map((v) => (
            <Button key={v} variant="tonal" selected={format === v} onClick={() => setFormat(v)}>{v}</Button>
          ))}
        </Group>
        <h3 className="pg-subhead">A 200 px</h3>
        <div className="pg-layout-frame" style={{ width: 200 }}>
          <Group role="group" aria-label="Vista angosta" className="pg-connected">
            {['Día', 'Semana', 'Mes', 'Año'].map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>{v}</button>
            ))}
          </Group>
        </div>
        <p className="pg-hint">
          Sin envoltura (rompería las esquinas): los bloques se achican y el grupo no desborda. Si el contenido no
          entra, el uso elige <code>orientation="vertical"</code>.
        </p>
      </section>
    </>
  )
}
