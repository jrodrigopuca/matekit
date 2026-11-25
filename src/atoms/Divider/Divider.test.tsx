import { createRef, type CSSProperties, type ReactNode } from 'react'
import { describe, expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { Divider, DividerSubhead } from './Divider.tsx'
import { render, roleColor, style } from '../../test/render.tsx'

const q = (c: ParentNode, sel: string) => c.querySelector(sel) as HTMLElement
const rect = (el: Element) => el.getBoundingClientRect()

/** Bordes del divisor respecto de su contenedor (izquierda, derecha, arriba y abajo). */
function edges(c: HTMLElement, sel = '.mk-divider') {
  const box = rect(q(c, '.box'))
  const d = rect(q(c, sel))
  return { left: d.left - box.left, right: box.right - d.right, top: d.top - box.top, bottom: box.bottom - d.bottom }
}

// Contenedor de 200 × 100. align-items: center a propósito: el divisor tiene que estirarse igual.
const Row = ({ children, dir }: { children: ReactNode; dir?: 'rtl' | undefined }) => (
  <div className="box" dir={dir} style={{ display: 'flex', alignItems: 'center', width: 200, height: 100 }}>
    {children}
  </div>
)
const Column = ({ children, dir, style: extra }: { children: ReactNode; dir?: 'rtl' | undefined; style?: CSSProperties | undefined }) => (
  <div className="box" dir={dir} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 200, ...extra }}>
    {children}
  </div>
)

describe('Divider: estructura y accesibilidad', () => {
  test('es un <hr> con el rol separator implícito, horizontal por defecto', async () => {
    const c = await render(<Divider />)
    const hr = page.getByRole('separator').element()
    expect(hr).toBe(q(c, 'hr.mk-divider'))
    expect(hr.hasAttribute('role')).toBe(false)
    expect(hr.hasAttribute('aria-orientation')).toBe(false)
    expect(hr.hasAttribute('aria-hidden')).toBe(false)
  })

  test('vertical: aria-orientation="vertical"', async () => {
    await render(<Row><Divider orientation="vertical" /></Row>)
    expect(page.getByRole('separator').element().getAttribute('aria-orientation')).toBe('vertical')
  })

  test('decorative: oculto para los lectores de pantalla', async () => {
    const c = await render(
      <>
        <Divider decorative />
        <Divider />
      </>,
    )
    expect(q(c, 'hr').getAttribute('aria-hidden')).toBe('true')
    expect(page.getByRole('separator').elements()).toHaveLength(1)
  })

  test('props nativas, className, style y ref llegan al <hr>', async () => {
    const ref = createRef<HTMLHRElement>()
    const c = await render(
      <Divider ref={ref} id="d" className="mine" style={{ opacity: 0.5 }} data-x="1" aria-label="Fin de la sección" />,
    )
    const hr = q(c, 'hr')
    expect(ref.current).toBe(hr)
    expect(hr.id).toBe('d')
    expect(hr.className).toBe('mk-divider mine')
    expect(hr.style.opacity).toBe('0.5')
    expect(hr.dataset.x).toBe('1')
    expect(page.getByRole('separator', { name: 'Fin de la sección' }).element()).toBe(hr)
  })
})

describe('Divider: medidas y color', () => {
  test('línea de 1 px en outline-variant, sin el borde ni el margen del <hr> del navegador', async () => {
    const c = await render(<Column><Divider /></Column>)
    const s = style(q(c, 'hr'))
    expect(s.height).toBe('1px')
    expect(s.backgroundColor).toBe(roleColor('outline-variant'))
    expect(s.borderTopStyle).toBe('none')
    expect(s.borderLeftStyle).toBe('none')
    expect(s.marginTop).toBe('0px')
    expect(s.marginBottom).toBe('0px')
  })

  test('horizontal: llena el ancho del contenedor (también en flex con align-items: center)', async () => {
    const c = await render(<Column><Divider /></Column>)
    expect(rect(q(c, 'hr')).height).toBe(1)
    const e = edges(c)
    expect(e.left).toBeCloseTo(0, 2)
    expect(e.right).toBeCloseTo(0, 2)
  })

  test('horizontal en un bloque común: llena el ancho', async () => {
    const c = await render(<div className="box" style={{ width: 200 }}><Divider /></div>)
    expect(rect(q(c, 'hr')).width).toBe(200)
  })

  test('horizontal en un grid con place-items: center: llena el ancho', async () => {
    const c = await render(
      <div className="box" style={{ display: 'grid', placeItems: 'center', width: 200, height: 100 }}>
        <Divider inset="both" />
      </div>,
    )
    expect(rect(q(c, 'hr')).width).toBe(168)
  })

  test('vertical: 1 px de ancho y el alto del contenedor flex, aunque centre sus hijos', async () => {
    const c = await render(<Row><span>a</span><Divider orientation="vertical" /><span>b</span></Row>)
    const r = rect(q(c, 'hr'))
    expect(r.width).toBe(1)
    expect(r.height).toBe(100)
    expect(style(q(c, 'hr')).backgroundColor).toBe(roleColor('outline-variant'))
  })

  test('vertical en un grid: el alto de la fila', async () => {
    const c = await render(
      <div className="box" style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', height: 80 }}>
        <span>a</span><Divider orientation="vertical" /><span>b</span>
      </div>,
    )
    expect(rect(q(c, 'hr')).height).toBe(80)
  })

  for (const dir of [undefined, 'rtl'] as const) {
    const where = dir ? ' (RTL: la sangría inicial queda a la derecha)' : ''
    test(`horizontal con inset="start": 16 al inicio${where}`, async () => {
      const c = await render(<Column dir={dir}><Divider inset="start" /></Column>)
      const e = edges(c)
      expect(dir ? e.right : e.left).toBeCloseTo(16, 2)
      expect(dir ? e.left : e.right).toBeCloseTo(0, 2)
    })

    test(`horizontal con inset="both": 16 a cada lado${where}`, async () => {
      const c = await render(<Column dir={dir}><Divider inset="both" /></Column>)
      const e = edges(c)
      expect(e.left).toBeCloseTo(16, 2)
      expect(e.right).toBeCloseTo(16, 2)
    })
  }

  test('vertical con inset="start": 16 arriba; con "both", 16 arriba y abajo (sin sangría a los lados)', async () => {
    const c = await render(
      <Row>
        <Divider orientation="vertical" inset="start" className="s" />
        <Divider orientation="vertical" inset="both" className="b" />
      </Row>,
    )
    const s = edges(c, '.s')
    expect(s.top).toBeCloseTo(16, 2)
    expect(s.bottom).toBeCloseTo(0, 2)
    const b = edges(c, '.b')
    expect(b.top).toBeCloseTo(16, 2)
    expect(b.bottom).toBeCloseTo(16, 2)
    expect(style(q(c, '.b')).marginLeft).toBe('0px')
    expect(style(q(c, '.b')).marginRight).toBe('0px')
  })

  test('--mk-divider-inset cambia la sangría', async () => {
    const c = await render(
      <Column style={{ '--mk-divider-inset': '56px' } as CSSProperties}><Divider inset="start" /></Column>,
    )
    expect(edges(c).left).toBeCloseTo(56, 2)
  })

  test('no se encoge en un contenedor flex lleno', async () => {
    const c = await render(
      <Column style={{ height: 40, overflow: 'hidden' }}>
        <div style={{ height: 40, flexShrink: 1, width: '100%' }} />
        <Divider />
        <div style={{ height: 40, flexShrink: 1, width: '100%' }} />
      </Column>,
    )
    expect(rect(q(c, 'hr')).height).toBe(1)
  })
})

describe('DividerSubhead', () => {
  const Subhead = () => (
    <div className="box" style={{ width: 300 }}>
      <DividerSubhead id="s" className="mine"><h3>Recientes</h3></DividerSubhead>
    </div>
  )

  test('la línea es decorativa y el título es el encabezado del usuario', async () => {
    const c = await render(<Subhead />)
    expect(q(c, '.mk-divider-subhead hr').getAttribute('aria-hidden')).toBe('true')
    expect(page.getByRole('separator').elements()).toHaveLength(0)
    expect(page.getByRole('heading', { level: 3, name: 'Recientes' }).element()).toBe(q(c, 'h3'))
    expect(q(c, '.mk-divider-subhead').id).toBe('s')
    expect(q(c, '.mk-divider-subhead').className).toBe('mk-divider-subhead mine')
  })

  test('medidas del kit: 16 a cada lado, línea, separación 4 y título de 20: 25 de alto', async () => {
    const c = await render(<Subhead />)
    expect(rect(q(c, '.mk-divider-subhead')).height).toBe(25)
    const e = edges(c)
    expect(e.left).toBeCloseTo(16, 2)
    expect(e.right).toBeCloseTo(16, 2)
    expect(rect(q(c, 'h3')).top - rect(q(c, 'hr')).bottom).toBeCloseTo(4, 2)
    expect(rect(q(c, 'h3')).left - rect(q(c, '.box')).left).toBeCloseTo(16, 2)
  })

  test('título en Title Small y on-surface-variant, sin el margen del <h3>', async () => {
    const c = await render(<Subhead />)
    const s = style(q(c, 'h3'))
    expect(s.fontSize).toBe('14px')
    expect(s.lineHeight).toBe('20px')
    expect(s.fontWeight).toBe('500')
    expect(s.marginTop).toBe('0px')
    expect(s.color).toBe(roleColor('on-surface-variant'))
  })
})
