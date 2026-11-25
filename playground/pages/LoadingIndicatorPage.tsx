import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { LoadingIndicator } from '../../src/index.ts'
// Datos internos (no exportados por la librería): los 7 pasos quietos, para compararlos con el kit.
import { CYCLE_MS, STEPS, VIEW_BOX } from '../../src/molecules/LoadingIndicator/loading-indicator-data.ts'

const STEP_NAMES = ['Soft burst', '9-sided cookie', 'Pentagon', 'Pill', 'Sunny', '4-sided cookie', 'Oval']
const SIZES = [24, 48, 96] as const

/**
 * Pausa (o reanuda) todos los indicadores de la página en `time` ms: cada SVG tiene su propio
 * reloj de SMIL, que se controla con pauseAnimations() y setCurrentTime().
 */
function useFreeze(root: RefObject<HTMLElement | null>, paused: boolean, time: number) {
  useEffect(() => {
    for (const svg of root.current?.querySelectorAll<SVGSVGElement>('.mk-loading-indicator-svg') ?? []) {
      if (paused) {
        svg.pauseAnimations()
        svg.setCurrentTime(time / 1000)
      } else svg.unpauseAnimations()
    }
  })
}

export function LoadingIndicatorPage() {
  const [contained, setContained] = useState(false)
  const [determinate, setDeterminate] = useState(false)
  const [value, setValue] = useState(0.4)
  const [size, setSize] = useState(48)
  const [paused, setPaused] = useState(false)
  const [time, setTime] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  useFreeze(root, paused, time)

  return (
    <div ref={root}>
      <section className="pg-section">
        <h2>LoadingIndicator</h2>
        <div className="pg-controls">
          <label className="pg-check">
            <input type="checkbox" checked={contained} onChange={(e) => setContained(e.target.checked)} />
            Con contenedor
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={determinate} onChange={(e) => setDeterminate(e.target.checked)} />
            Determinado
          </label>
          {determinate && (
            <label className="pg-field">
              Valor: {value.toFixed(2)}
              <input type="range" min={0} max={1} step={0.01} value={value} onChange={(e) => setValue(Number(e.target.value))} />
            </label>
          )}
          <label className="pg-field">
            Tamaño: {size} px
            <input type="range" min={24} max={160} step={8} value={size} onChange={(e) => setSize(Number(e.target.value))} />
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} />
            Pausar
          </label>
          {paused && (
            <label className="pg-field">
              Instante: {time} ms
              <input type="range" min={0} max={CYCLE_MS} step={10} value={time} onChange={(e) => setTime(Number(e.target.value))} />
            </label>
          )}
        </div>
        <div className="pg-stage" id="pg-loading-stage">
          <LoadingIndicator
            label="Cargando"
            contained={contained}
            value={determinate ? value : undefined}
            style={{ width: size, height: size }}
          />
        </div>
        <p className="pg-hint">
          Sin JavaScript: SVG con <code>&lt;animate&gt;</code> precalculado con <code>pnpm shapes</code> (ADR-0011). Con
          movimiento reducido, el indeterminado queda quieto en la primera forma. "Pausar" congela todos los indicadores de la
          página en el instante elegido del ciclo de {CYCLE_MS} ms.
        </p>
      </section>

      <section className="pg-section" id="pg-loading-matrix">
        <h2>Variantes y tamaños</h2>
        <div className="pg-grid" style={{ gridTemplateColumns: `auto repeat(${SIZES.length * 2}, auto)`, justifyContent: 'start' }}>
          <span />
          {SIZES.flatMap((s) => [
            <span key={`h${s}`} className="pg-col-head">{s} px</span>,
            <span key={`hc${s}`} className="pg-col-head">{s} px, contenedor</span>,
          ])}
          <span className="pg-row-head">Indeterminado</span>
          {SIZES.flatMap((s) => [
            <LoadingIndicator key={`i${s}`} label={`Cargando ${s}`} style={{ width: s, height: s }} />,
            <LoadingIndicator key={`ic${s}`} contained label={`Cargando ${s} con contenedor`} style={{ width: s, height: s }} />,
          ])}
          {[0, 0.5, 1].map((v) => [
            <span key={`r${v}`} className="pg-row-head">Determinado {v}</span>,
            ...SIZES.flatMap((s) => [
              <LoadingIndicator key={`d${v}${s}`} value={v} label={`Progreso ${v}`} style={{ width: s, height: s }} />,
              <LoadingIndicator key={`dc${v}${s}`} contained value={v} label={`Progreso ${v}`} style={{ width: s, height: s }} />,
            ]),
          ])}
        </div>
      </section>

      <section className="pg-section" id="pg-loading-steps">
        <h2>Los 7 pasos</h2>
        <p className="pg-hint">
          Cada forma con el giro con que se ve en la animación mientras espera su cambio (sin la vuelta continua), en un
          contenedor de 48 escalado a 96 para comparar con "Steps 1 a 7" del kit.
        </p>
        {[false, true].map((c) => (
          <div key={String(c)} className="pg-shapes" style={{ '--pg-shape-size': '96px' } as CSSProperties}>
            {STEPS.map((d, i) => (
              <figure key={i} className="pg-shape-cell">
                <span className="mk-loading-indicator" data-contained={c ? '' : undefined} style={{ width: 96, height: 96 }}>
                  <svg className="mk-loading-indicator-svg" viewBox={VIEW_BOX} aria-hidden="true">
                    <path d={d} />
                  </svg>
                </span>
                <figcaption>
                  <code>Step {i + 1}</code>
                  <span>{STEP_NAMES[i]}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        ))}
      </section>
    </div>
  )
}
