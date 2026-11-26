import { useState } from 'react'
import {
  RangeSlider,
  RangeSliderEnd,
  RangeSliderStart,
  Slider,
  type RangeSliderValue,
  type SliderOrientation,
  type SliderSize,
} from '../../src/index.ts'

const SIZES: SliderSize[] = ['xs', 'sm', 'md', 'lg', 'xl']
const percent = new Intl.NumberFormat('es-AR', { style: 'percent' })

export function SliderPage() {
  const [size, setSize] = useState<SliderSize>('xs')
  const [orientation, setOrientation] = useState<SliderOrientation>('horizontal')
  const [ticks, setTicks] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const [rtl, setRtl] = useState(false)
  const [volume, setVolume] = useState(40)
  const [balance, setBalance] = useState(10)
  const [price, setPrice] = useState<RangeSliderValue>([20, 70])
  const vertical = orientation === 'vertical'
  const common = { size, orientation, disabled, ticks }
  const lengthStyle = vertical ? { height: 240 } : { width: '100%' }

  return (
    <>
      <section className="pg-section">
        <h2>Interactivo</h2>
        <div className="pg-controls">
          <label className="pg-check">
            Tamaño{' '}
            <select value={size} onChange={(e) => setSize(e.target.value as SliderSize)}>
              {SIZES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={vertical} onChange={(e) => setOrientation(e.target.checked ? 'vertical' : 'horizontal')} />
            Vertical
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={ticks} onChange={(e) => setTicks(e.target.checked)} />
            Pasos (de 10)
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={rtl} onChange={(e) => setRtl(e.target.checked)} />
            RTL
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
            Deshabilitado
          </label>
        </div>
        <div
          className="pg-stage"
          dir={rtl ? 'rtl' : undefined}
          style={{
            display: 'flex',
            flexDirection: vertical ? 'row' : 'column',
            gap: vertical ? 64 : 40,
            padding: '72px 48px 32px',
            alignItems: vertical ? 'center' : 'stretch',
          }}
        >
          <Slider
            {...common}
            label="Volumen"
            step={ticks ? 10 : 1}
            value={volume}
            onValueChange={setVolume}
            style={lengthStyle}
          />
          <Slider
            {...common}
            label="Balance"
            centered
            min={-50}
            max={50}
            step={ticks ? 10 : 1}
            value={balance}
            onValueChange={setBalance}
            style={lengthStyle}
          />
          <RangeSlider {...common} step={ticks ? 10 : 1} value={price} onValueChange={setPrice} aria-label="Precio" style={lengthStyle}>
            <RangeSliderStart label="Precio mínimo" />
            <RangeSliderEnd label="Precio máximo" />
          </RangeSlider>
          <Slider {...common} label="Opacidad" min={0} max={1} step={ticks ? 0.1 : 0.01} defaultValue={0.5} format={percent} style={lengthStyle} />
        </div>
        <p className="pg-hint">
          Volumen: {volume}. Balance: {balance}. Precio: {price[0]} a {price[1]}. Con el teclado: flechas, Re Pág y Av Pág
          (10 %), Inicio y Fin. El indicador de valor aparece al presionar, al arrastrar y con foco de teclado.
        </p>
      </section>

      <section className="pg-section">
        <h2>Tamaños y estados</h2>
        <div className="pg-grid" style={{ gridTemplateColumns: 'max-content repeat(3, minmax(160px, 1fr))', columnGap: 32, rowGap: 24, alignItems: 'center' }}>
          <span />
          {['Valor 0', 'Valor 50, pasos', 'Deshabilitado'].map((h) => (
            <span key={h} className="pg-col-head">{h}</span>
          ))}
          {SIZES.map((s) => (
            <Row key={s} size={s} />
          ))}
          <span className="pg-row-head">centered</span>
          <Slider centered min={-50} max={50} defaultValue={-20} aria-label="Centrado, −20" />
          <Slider centered min={-50} max={50} step={10} ticks defaultValue={30} aria-label="Centrado con pasos, 30" />
          <Slider centered min={-50} max={50} defaultValue={20} disabled aria-label="Centrado deshabilitado" />
          <span className="pg-row-head">range</span>
          <RangeSlider defaultValue={[50, 50]}>
            <RangeSliderStart aria-label="Rango igual, inicio" />
            <RangeSliderEnd aria-label="Rango igual, fin" />
          </RangeSlider>
          <RangeSlider defaultValue={[20, 60]} step={10} ticks>
            <RangeSliderStart aria-label="Rango con pasos, inicio" />
            <RangeSliderEnd aria-label="Rango con pasos, fin" />
          </RangeSlider>
          <RangeSlider defaultValue={[30, 70]} disabled>
            <RangeSliderStart aria-label="Rango deshabilitado, inicio" />
            <RangeSliderEnd aria-label="Rango deshabilitado, fin" />
          </RangeSlider>
        </div>
      </section>

      <section className="pg-section">
        <h2>Vertical</h2>
        <div className="pg-stage" style={{ display: 'flex', flexWrap: 'wrap', gap: 48, padding: 32, alignItems: 'center' }}>
          {SIZES.map((s) => (
            <Slider key={s} size={s} orientation="vertical" defaultValue={60} aria-label={`Vertical ${s}`} />
          ))}
          <Slider orientation="vertical" centered min={-50} max={50} step={10} ticks defaultValue={20} aria-label="Vertical centrado" />
          <RangeSlider orientation="vertical" defaultValue={[30, 70]}>
            <RangeSliderStart aria-label="Vertical rango, inicio" />
            <RangeSliderEnd aria-label="Vertical rango, fin" />
          </RangeSlider>
        </div>
      </section>
    </>
  )
}

function Row({ size }: { size: SliderSize }) {
  return (
    <>
      <span className="pg-row-head">{size}</span>
      <Slider size={size} defaultValue={0} aria-label={`${size}, valor 0`} />
      <Slider size={size} step={10} ticks defaultValue={50} aria-label={`${size}, valor 50 con pasos`} />
      <Slider size={size} defaultValue={50} disabled aria-label={`${size}, deshabilitado`} />
    </>
  )
}
