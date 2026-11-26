import { useState, type AnchorHTMLAttributes, type Ref } from 'react'
import {
  FocusRing,
  Interactive,
  Ripple,
  StateLayer,
  StarIcon,
  type InteractiveProps,
} from '../../src/index.ts'

type Form = 'button' | 'link' | 'render'
const FORM_NAMES: Record<Form, string> = {
  button: 'Botón (sin href)',
  link: 'Enlace (href)',
  render: 'render (Link de un enrutador)',
}

/**
 * Un control propio, como lo armaría quien usa matekit: Interactive elige el elemento y los
 * átomos dan capa de estado, onda y anillo de foco. Su CSS (.pg-topic en playground.css) solo
 * define la forma y los colores; los estados los resuelven los átomos con pseudo-clases.
 */
function Topic({ className, children, ...props }: InteractiveProps) {
  return (
    <Interactive {...props} className={['pg-topic', className].filter(Boolean).join(' ')}>
      <StateLayer />
      <Ripple />
      <FocusRing />
      <StarIcon />
      {children}
    </Interactive>
  )
}

/** Imita el Link de un enrutador: navega "sin recargar" (acá, avisa) y reparte sus props en el <a>. */
function DemoLink({
  to,
  onNavigate,
  ref,
  ...rest
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  to: string
  onNavigate: (to: string) => void
  ref?: Ref<HTMLAnchorElement> | undefined
}) {
  return (
    <a
      {...rest}
      ref={ref}
      href={to}
      onClick={(e) => {
        e.preventDefault()
        onNavigate(to)
      }}
    />
  )
}

export function InteractivePage() {
  const [form, setForm] = useState<Form>('button')
  const [disabled, setDisabled] = useState(false)
  const [log, setLog] = useState('Todavía nada.')

  const stage =
    form === 'link' ? (
      <Topic href="#interactive">Material 3</Topic>
    ) : form === 'render' ? (
      <Topic render={<DemoLink to="/temas/material" onNavigate={(to) => setLog(`Navegó a ${to} sin recargar.`)} />}>
        Material 3
      </Topic>
    ) : (
      <Topic disabled={disabled} onClick={() => setLog('Clic en el botón.')}>
        Material 3
      </Topic>
    )
  const code =
    form === 'link'
      ? '<Topic href="/temas/material">Material 3</Topic>'
      : form === 'render'
        ? '<Topic render={<Link href="/temas/material" />}>Material 3</Topic>'
        : `<Topic${disabled ? ' disabled' : ''} onClick={…}>Material 3</Topic>`

  return (
    <>
      <section className="pg-section">
        <h2>Un control propio</h2>
        <p className="pg-hint">
          <code>Interactive</code> dibuja un <code>&lt;button type="button"&gt;</code>, un{' '}
          <code>&lt;a&gt;</code> con <code>href</code> o el elemento de <code>render</code> (ADR-0010,
          ADR-0020). No trae estilos ni átomos: este control suma <code>StateLayer</code>,{' '}
          <code>Ripple</code> y <code>FocusRing</code> como hijos y su CSS solo pone forma y color.
        </p>
        <div className="pg-controls">
          <label className="pg-field">
            Forma
            <select value={form} onChange={(e) => setForm(e.target.value as Form)}>
              {(Object.keys(FORM_NAMES) as Form[]).map((f) => (
                <option key={f} value={f}>{FORM_NAMES[f]}</option>
              ))}
            </select>
          </label>
          <label className="pg-check">
            <input
              type="checkbox"
              checked={disabled}
              disabled={form !== 'button'}
              onChange={(e) => setDisabled(e.target.checked)}
            />
            Deshabilitado (solo botón)
          </label>
        </div>
        <div className="pg-stage">{stage}</div>
        <p className="pg-hint">
          {log} Pasá el puntero, presioná o llegá con Tab: la capa, la onda y el anillo son los de
          los componentes de matekit.
        </p>
        <pre className="pg-code">{code}</pre>
      </section>

      <section className="pg-section">
        <h2>Estados en las tres formas</h2>
        <div className="pg-grid" style={{ gridTemplateColumns: 'repeat(4, max-content)' }}>
          <span />
          {['Botón', 'Enlace', 'render'].map((h) => (
            <span key={h} className="pg-col-head">{h}</span>
          ))}
          <span className="pg-row-head">Normal</span>
          <span><Topic>Botón</Topic></span>
          <span><Topic href="#interactive">Enlace</Topic></span>
          <span>
            <Topic render={<DemoLink to="/temas" onNavigate={(to) => setLog(`Navegó a ${to} sin recargar.`)} />}>
              Link
            </Topic>
          </span>
          <span className="pg-row-head">Deshabilitado</span>
          <span><Topic disabled>Botón</Topic></span>
          <span className="pg-hint">—</span>
          <span className="pg-hint">—</span>
        </div>
        <p className="pg-hint">
          Un enlace no se deshabilita (ARIA in HTML indica quitar el <code>href</code>): eso lo decide
          cada control, no <code>Interactive</code>.
        </p>
      </section>

      <section className="pg-section">
        <h2>Contrato de render</h2>
        <ul className="pg-hint">
          <li>Recibe un elemento (<code>render=&#123;&lt;Link href="/" /&gt;&#125;</code>), no un componente.</li>
          <li>Las clases se combinan (también la <code>className</code> función del <code>NavLink</code>).</li>
          <li>Las props del elemento ganan, incluida su <code>ref</code>; sus hijos se reemplazan.</li>
          <li>El elemento tiene que pasar <code>className</code>, <code>aria-*</code>, <code>ref</code> y los hijos a su <code>&lt;a&gt;</code>.</li>
        </ul>
      </section>
    </>
  )
}
