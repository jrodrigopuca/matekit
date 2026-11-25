import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import { CircularProgressIndicator, LinearProgressIndicator, type ProgressIndicatorThickness } from '../../src/index.ts'

const VALUES = [0, 0.1, 0.2, 0.5, 0.8, 1] as const
const THICKNESSES: ProgressIndicatorThickness[] = [4, 8]

/**
 * Pausa (o reanuda) todas las animaciones CSS de los indicadores de la página en `time` ms: son
 * animaciones CSS, que se controlan con getAnimations() y currentTime.
 */
function useFreeze(root: RefObject<HTMLElement | null>, paused: boolean, time: number) {
  useEffect(() => {
    for (const animation of root.current?.getAnimations({ subtree: true }) ?? []) {
      if (!(animation instanceof CSSAnimation)) continue
      if (paused) {
        animation.pause()
        animation.currentTime = time
      } else animation.play()
    }
  })
}

export function ProgressIndicatorPage() {
  const [indeterminate, setIndeterminate] = useState(false)
  const [value, setValue] = useState(0.4)
  const [wavy, setWavy] = useState(true)
  const [thickness, setThickness] = useState<ProgressIndicatorThickness>(4)
  const [width, setWidth] = useState(320)
  const [rtl, setRtl] = useState(false)
  const [paused, setPaused] = useState(false)
  const [time, setTime] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const fileLabel = useId()
  const syncLabel = useId()
  useFreeze(root, paused, time)
  const v = indeterminate ? undefined : value

  return (
    <div ref={root}>
      <section className="pg-section">
        <h2>Indicadores de progreso</h2>
        <div className="pg-controls">
          <label className="pg-check">
            <input type="checkbox" checked={indeterminate} onChange={(e) => setIndeterminate(e.target.checked)} />
            Indeterminado
          </label>
          {!indeterminate && (
            <label className="pg-field">
              Valor: {value.toFixed(2)}
              <input type="range" min={0} max={1} step={0.01} value={value} onChange={(e) => setValue(Number(e.target.value))} />
            </label>
          )}
          <span className="pg-field">
            Saltos:
            <span style={{ display: 'flex', gap: 4 }}>
              {[0, 0.05, 0.3, 0.6, 0.97, 1].map((x) => (
                <button key={x} type="button" onClick={() => { setIndeterminate(false); setValue(x) }}>
                  {x}
                </button>
              ))}
            </span>
          </span>
          <label className="pg-check">
            <input type="checkbox" checked={wavy} onChange={(e) => setWavy(e.target.checked)} />
            Con onda (wavy)
          </label>
          <label className="pg-field">
            Grosor
            <select value={thickness} onChange={(e) => setThickness(Number(e.target.value) as ProgressIndicatorThickness)}>
              {THICKNESSES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="pg-field">
            Ancho del lineal: {width} px
            <input type="range" min={40} max={1200} step={10} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={rtl} onChange={(e) => setRtl(e.target.checked)} />
            RTL
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} />
            Pausar
          </label>
          {paused && (
            <label className="pg-field">
              Instante: {time} ms
              <input type="range" min={0} max={6000} step={10} value={time} onChange={(e) => setTime(Number(e.target.value))} />
            </label>
          )}
        </div>
        <div className="pg-stage" id="pg-progress-stage" dir={rtl ? 'rtl' : 'ltr'} style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div style={{ width }}>
            <LinearProgressIndicator label="Progreso lineal" value={v} wavy={wavy} thickness={thickness} />
          </div>
          <CircularProgressIndicator label="Progreso circular" value={v} wavy={wavy} thickness={thickness} />
        </div>
        <p className="pg-hint">
          Sin JavaScript: SVG y CSS (guiones con <code>stroke-dasharray</code>, <code>@property</code> y{' '}
          <code>100cqw</code> para el ancho). Los saltos muestran la transición del valor (500 ms lineales) y cómo la onda crece
          pasado el 10 % y se aplana desde el 95 %. "Pausar" congela todas las animaciones de la página en el instante elegido
          (el lineal indeterminado repite cada 1750 ms, el circular cada 6000 ms).
        </p>
      </section>

      <section className="pg-section" id="pg-progress-labelled">
        <h2>Con etiqueta visible</h2>
        <p className="pg-hint">
          Sin <code>label</code>: el nombre accesible sale de la etiqueta visible con <code>aria-labelledby</code>. TypeScript
          exige <code>label</code>, <code>aria-labelledby</code> o <code>aria-label</code>.
        </p>
        <div style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
          {/* Solo el nombre del archivo: el porcentaje ya lo anuncia aria-valuenow. */}
          <span style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span id={fileLabel}>vacaciones-2026.zip</span>
            <span aria-hidden="true">{Math.round((v ?? 0) * 100)} %</span>
          </span>
          <LinearProgressIndicator aria-labelledby={fileLabel} value={v ?? 0} wavy={wavy} thickness={thickness} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CircularProgressIndicator aria-labelledby={syncLabel} wavy={wavy} thickness={thickness} />
            <span id={syncLabel}>Sincronizando contactos</span>
          </span>
        </div>
      </section>

      <section className="pg-section" id="pg-progress-linear">
        <h2>Lineal</h2>
        <div className="pg-grid" style={{ gridTemplateColumns: 'auto 1fr 1fr', alignItems: 'center' }}>
          <span />
          <span className="pg-col-head">Grosor 4</span>
          <span className="pg-col-head">Grosor 8</span>
          {[false, true].flatMap((w) =>
            [...VALUES, undefined].map((x) => [
              <span key={`h${w}${x}`} className="pg-row-head">
                {w ? 'Wave' : 'Flat'} {x === undefined ? 'indeterminado' : `${x * 100} %`}
              </span>,
              ...THICKNESSES.map((t) => (
                <LinearProgressIndicator key={`${w}${x}${t}`} label={`Lineal ${x ?? 'indeterminado'}`} value={x} wavy={w} thickness={t} />
              )),
            ]),
          )}
        </div>
      </section>

      <section className="pg-section" id="pg-progress-circular">
        <h2>Circular</h2>
        <div className="pg-grid" style={{ gridTemplateColumns: `auto repeat(${VALUES.length + 1}, auto)`, justifyContent: 'start', alignItems: 'center' }}>
          <span />
          {VALUES.map((x) => (
            <span key={x} className="pg-col-head">{x * 100} %</span>
          ))}
          <span className="pg-col-head">Indeterminado</span>
          {[false, true].flatMap((w) =>
            THICKNESSES.map((t) => [
              <span key={`h${w}${t}`} className="pg-row-head">{w ? 'Wave' : 'Flat'} {t} dp</span>,
              ...[...VALUES, undefined].map((x) => (
                <CircularProgressIndicator key={`${w}${t}${x}`} label={`Circular ${x ?? 'indeterminado'}`} value={x} wavy={w} thickness={t} />
              )),
            ]),
          )}
        </div>
      </section>
    </div>
  )
}
