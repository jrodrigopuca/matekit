import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import {
  Button,
  Snackbar,
  SnackbarAction,
  SnackbarClose,
  SnackbarHost,
  SnackbarMessage,
  useSnackbar,
  type SnackbarAlign,
  type SnackbarDuration,
} from '../../src/index.ts'

/** Snackbar visible al cargar, desde la URL (`#snackbar?open=action`): solo para capturas. */
function initialCase(): 'text' | 'action' | 'long' | null {
  const value = new URLSearchParams(location.hash.split('?')[1] ?? '').get('open')
  return value === 'text' || value === 'action' || value === 'long' ? value : null
}

const TWO_LINES = 'No se pudo subir la foto porque se perdió la conexión. Se reintentará al volver a estar en línea.'

export function SnackbarPage() {
  const [align, setAlign] = useState<SnackbarAlign>('center')
  const [offset, setOffset] = useState(0)
  return (
    <SnackbarHost align={align} style={{ '--mk-snackbar-offset': `${offset}px` } as CSSProperties}>
      <Demo align={align} setAlign={setAlign} offset={offset} setOffset={setOffset} />
    </SnackbarHost>
  )
}

function Demo(props: {
  align: SnackbarAlign
  setAlign: (a: SnackbarAlign) => void
  offset: number
  setOffset: (n: number) => void
}) {
  const snackbar = useSnackbar()
  const [log, setLog] = useState<string[]>([])
  const note = (text: string) => setLog((l) => [text, ...l].slice(0, 6))
  const [message, setMessage] = useState('Foto archivada')
  const [action, setAction] = useState('Deshacer')
  const [duration, setDuration] = useState<'auto' | SnackbarDuration>('auto')
  const [dismissible, setDismissible] = useState<'auto' | 'yes' | 'no'>('auto')
  const [newLine, setNewLine] = useState(false)

  const show = async (msg = message) => {
    const result = await snackbar.show({
      message: msg,
      action: action.trim() || undefined,
      duration: duration === 'auto' ? undefined : duration,
      dismissible: dismissible === 'auto' ? undefined : dismissible === 'yes',
      actionOnNewLine: newLine,
    })
    note(`«${msg}» → ${result}`)
  }

  useEffect(() => {
    const initial = initialCase()
    if (initial === 'text') void snackbar.show({ message: 'Foto archivada', duration: 'indefinite', dismissible: false })
    if (initial === 'action') void snackbar.show({ message: 'Foto archivada', action: 'Deshacer' })
    if (initial === 'long') void snackbar.show({ message: TWO_LINES, action: 'Reintentar ahora', actionOnNewLine: true })
    return () => snackbar.clear()
  }, [snackbar])

  return (
    <>
      <section className="pg-section">
        <h2>Cola</h2>
        <div className="pg-controls">
          <label className="pg-field">
            Mensaje
            <input value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>
          <label className="pg-field">
            Acción (vacía: sin acción)
            <input value={action} onChange={(e) => setAction(e.target.value)} />
          </label>
          <label className="pg-field">
            Duración
            <select value={String(duration)} onChange={(e) => setDuration(e.target.value as typeof duration)}>
              <option value="auto">Por defecto (corta sin acción, indefinida con acción)</option>
              <option value="short">Corta (4 s)</option>
              <option value="long">Larga (10 s)</option>
              <option value="indefinite">Indefinida</option>
            </select>
          </label>
          <label className="pg-field">
            Cerrar
            <select value={dismissible} onChange={(e) => setDismissible(e.target.value as typeof dismissible)}>
              <option value="auto">Por defecto (sí si es indefinida)</option>
              <option value="yes">Sí</option>
              <option value="no">No</option>
            </select>
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={newLine} onChange={(e) => setNewLine(e.target.checked)} />
            Acción debajo del texto
          </label>
        </div>
        <div className="pg-controls">
          <Button onClick={() => void show()}>Mostrar</Button>
          <Button
            variant="tonal"
            onClick={() => {
              for (const n of [1, 2, 3]) void show(`${message} (${n} de 3)`)
            }}
          >
            Encolar tres
          </Button>
          <Button variant="outlined" onClick={() => snackbar.dismiss()}>Descartar el visible</Button>
          <Button variant="text" onClick={() => snackbar.clear()}>Vaciar la cola</Button>
        </div>
        <p className="pg-hint">
          Con el foco en cualquier lugar, <kbd>F6</kbd> lleva el foco a la acción o al cerrar y <kbd>F6</kbd> otra vez lo
          devuelve; <kbd>Escape</kbd> con el foco adentro lo descarta. El tiempo se detiene con el puntero encima o el foco
          adentro. También: <code>#snackbar?open=text</code>, <code>action</code> o <code>long</code>.
        </p>
        <ol className="pg-hint" aria-label="Resultados">
          {log.map((l, i) => (
            <li key={`${i}-${l}`}>{l}</li>
          ))}
        </ol>
      </section>

      <section className="pg-section">
        <h2>Posición</h2>
        <div className="pg-controls">
          <label className="pg-field">
            Alineación (desde 600 px)
            <select value={props.align} onChange={(e) => props.setAlign(e.target.value as SnackbarAlign)}>
              <option value="center">Centrado</option>
              <option value="start">Al inicio</option>
            </select>
          </label>
          <label className="pg-field">
            --mk-snackbar-offset (px; 80 = NavigationBar)
            <input type="number" min={0} step={8} value={props.offset} onChange={(e) => props.setOffset(Number(e.target.value))} />
          </label>
        </div>
      </section>

      <section className="pg-section">
        <h2>Configuraciones del kit (fijas, sin host)</h2>
        <div style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
          <Labeled label="Solo texto">
            <Snackbar><SnackbarMessage>Foto archivada</SnackbarMessage></Snackbar>
          </Labeled>
          <Labeled label="Texto y cerrar">
            <Snackbar><SnackbarMessage>Foto archivada</SnackbarMessage><SnackbarClose /></Snackbar>
          </Labeled>
          <Labeled label="Texto y acción">
            <Snackbar><SnackbarMessage>Foto archivada</SnackbarMessage><SnackbarAction>Deshacer</SnackbarAction></Snackbar>
          </Labeled>
          <Labeled label="Texto, acción y cerrar">
            <Snackbar>
              <SnackbarMessage>Foto archivada</SnackbarMessage>
              <SnackbarAction>Deshacer</SnackbarAction>
              <SnackbarClose />
            </Snackbar>
          </Labeled>
          <Labeled label="Dos líneas, acción y cerrar">
            <Snackbar style={{ maxInlineSize: 400 }}>
              <SnackbarMessage>{TWO_LINES}</SnackbarMessage>
              <SnackbarAction>Reintentar</SnackbarAction>
              <SnackbarClose />
            </Snackbar>
          </Labeled>
          <Labeled label="Acción larga debajo (actionOnNewLine)">
            <Snackbar actionOnNewLine style={{ maxInlineSize: 400 }}>
              <SnackbarMessage>{TWO_LINES}</SnackbarMessage>
              <SnackbarAction>Reintentar ahora</SnackbarAction>
            </Snackbar>
          </Labeled>
          <Labeled label="Acción larga debajo, con cerrar">
            <Snackbar actionOnNewLine style={{ maxInlineSize: 400 }}>
              <SnackbarMessage>{TWO_LINES}</SnackbarMessage>
              <SnackbarAction>Reintentar ahora</SnackbarAction>
              <SnackbarClose />
            </Snackbar>
          </Labeled>
        </div>
      </section>
    </>
  )
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start', maxWidth: '100%' }}>
      <span className="pg-hint" style={{ margin: 0 }}>{label}</span>
      {children}
    </div>
  )
}
