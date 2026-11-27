import { createRef, type ReactNode } from 'react'
import { describe, expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { Stack } from './Stack.tsx'
import { SPACE, type SpaceStep } from '../../tokens/space.ts'
import { render, style } from '../../test/render.tsx'

const q = (c: ParentNode, sel: string) => c.querySelector(sel) as HTMLElement
const rect = (el: Element) => el.getBoundingClientRect()
const kids = (el: Element) => [...el.children].map((k) => rect(k))

/** Hijo de tamaño fijo, para medir posiciones. */
const Box = ({ w = 40, h = 20, children }: { w?: number; h?: number; children?: ReactNode }) => (
  <div className="kid" style={{ width: w, height: h, flexShrink: 0 }}>{children}</div>
)

describe('Stack: estructura y props', () => {
  test('un <div class="mk-stack"> en columna, sin separación, con los valores de CSS', async () => {
    const c = await render(<Stack><Box /><Box /></Stack>)
    const el = q(c, 'div.mk-stack')
    const s = style(el)
    expect(s.display).toBe('flex')
    expect(s.flexDirection).toBe('column')
    expect(s.rowGap).toBe('0px')
    expect(s.flexWrap).toBe('nowrap')
    expect(s.alignItems).toBe('normal')
    expect(s.justifyContent).toBe('normal')
    const [a, b] = kids(el)
    expect(b!.top - a!.bottom).toBeCloseTo(0, 2)
  })

  test('props nativas, className, style y ref llegan al elemento', async () => {
    const ref = createRef<HTMLElement>()
    const c = await render(
      <Stack ref={ref} id="s" className="mine" style={{ opacity: 0.5 }} data-x="1" aria-label="Acciones" role="group" gap={100}>
        <Box />
      </Stack>,
    )
    const el = q(c, '#s')
    expect(ref.current).toBe(el)
    expect(el.className).toBe('mk-stack mine')
    expect(el.style.opacity).toBe('0.5')
    expect(el.dataset.x).toBe('1')
    expect(page.getByRole('group', { name: 'Acciones' }).element()).toBe(el)
  })

  test('render: dibuja el elemento pasado (<ul>), con su clase, su style combinado y la ref', async () => {
    const ref = createRef<HTMLElement>()
    const c = await render(
      <Stack
        ref={ref}
        direction="row"
        gap={200}
        style={{ opacity: 0.5 }}
        aria-label="Frutas"
        render={<ul className="own" style={{ margin: 0, padding: 0 }} />}
      >
        <li>Manzana</li>
        <li>Pera</li>
      </Stack>,
    )
    const ul = q(c, 'ul')
    expect(ul.className).toBe('mk-stack own')
    expect(ref.current).toBe(ul)
    expect(ul.style.opacity).toBe('0.5')
    expect(ul.style.padding).toBe('0px')
    expect(style(ul).flexDirection).toBe('row')
    expect(page.getByRole('list', { name: 'Frutas' }).element()).toBe(ul)
    expect(page.getByRole('listitem').elements()).toHaveLength(2)
    expect(c.querySelector('div')).toBeNull()
  })

  test('render con algo que no es un elemento: error claro', async () => {
    // @ts-expect-error render espera un elemento
    expect(() => Stack({ render: 'ul', children: null })).toThrow(
      expect.objectContaining({ code: 'MK_RENDER_NOT_ELEMENT', message: expect.stringContaining('render={<ul />}') }),
    )
  })

  test('tipos: gap solo acepta pasos de la escala, y switchAt excluye direction y wrap', () => {
    // @ts-expect-error 16 no es un paso (sería --md-sys-space-200)
    void (<Stack gap={16} />)
    // @ts-expect-error switchAt elige la dirección solo
    void (<Stack switchAt="30rem" direction="row" />)
    // @ts-expect-error switchAt ya envuelve
    void (<Stack switchAt="30rem" wrap />)
    void (<Stack gap={25} direction="row" wrap />)
    expect(true).toBe(true)
  })
})

describe('Stack: dirección, separación, envoltura y alineación', () => {
  test('direction="row": en fila, de inicio a fin; en RTL, de derecha a izquierda', async () => {
    const c = await render(
      <>
        <Stack direction="row" className="ltr"><Box /><Box /></Stack>
        <div dir="rtl"><Stack direction="row" className="rtl"><Box /><Box /></Stack></div>
      </>,
    )
    const [a, b] = kids(q(c, '.ltr'))
    expect(a!.top).toBeCloseTo(b!.top, 2)
    expect(b!.left - a!.right).toBeCloseTo(0, 2)
    const [ra, rb] = kids(q(c, '.rtl'))
    expect(ra!.left - rb!.right).toBeCloseTo(0, 2)
  })

  test('gap: cada paso de la escala da su token en px, en columna y en fila', async () => {
    const steps = Object.keys(SPACE).map(Number) as SpaceStep[]
    const c = await render(
      <>
        {steps.map((s) => (
          <Stack key={s} gap={s} className={`g${s}`}><Box /><Box /></Stack>
        ))}
        <Stack direction="row" gap={300} className="row"><Box /><Box /></Stack>
      </>,
    )
    for (const s of steps) {
      const el = q(c, `.g${s}`)
      expect(el.dataset.gap).toBe(String(s))
      expect(style(el).rowGap, `paso ${s}`).toBe(`${SPACE[s]}px`)
      const [a, b] = kids(el)
      expect(b!.top - a!.bottom, `paso ${s}`).toBeCloseTo(SPACE[s], 2)
    }
    const [a, b] = kids(q(c, '.row'))
    expect(b!.left - a!.right).toBeCloseTo(24, 2)
  })

  test('wrap: los hijos que no entran pasan a la línea siguiente, sin desbordar; sin wrap, no', async () => {
    const c = await render(
      <div style={{ width: 200 }}>
        <Stack direction="row" wrap gap={100} className="w">
          <Box w={90} /><Box w={90} /><Box w={90} />
        </Stack>
        <Stack direction="row" gap={100} className="nw">
          <Box w={90} /><Box w={90} /><Box w={90} />
        </Stack>
      </div>,
    )
    const w = q(c, '.w')
    const [a, b, d] = kids(w)
    expect(a!.top).toBeCloseTo(b!.top, 2)
    expect(d!.top - a!.bottom).toBeCloseTo(8, 2) // la separación vale también entre líneas
    expect(d!.left).toBeCloseTo(a!.left, 2)
    expect(w.scrollWidth).toBeLessThanOrEqual(w.clientWidth)
    const nw = kids(q(c, '.nw'))
    expect(new Set(nw.map((r) => Math.round(r.top))).size).toBe(1)
  })

  test('align y justify: centrado, al final, repartido y estirado', async () => {
    const c = await render(
      <div style={{ width: 200 }}>
        <Stack className="center" align="center"><Box w={40} /></Stack>
        <Stack className="end" align="end"><Box w={40} /></Stack>
        <Stack className="stretch"><div className="kid" style={{ height: 10 }} /></Stack>
        <Stack className="between" direction="row" justify="between"><Box /><Box /></Stack>
        <Stack className="jcenter" direction="row" justify="center"><Box /></Stack>
        <Stack className="evenly" direction="row" justify="evenly"><Box /><Box /></Stack>
        <Stack className="around" direction="row" justify="around"><Box /><Box /></Stack>
        <Stack className="baseline" direction="row" align="baseline">
          <span style={{ fontSize: 12 }}>a</span>
          <span style={{ fontSize: 32 }}>b</span>
        </Stack>
      </div>,
    )
    const left = (sel: string, i = 0) => kids(q(c, sel))[i]!.left - rect(q(c, sel)).left
    expect(left('.center')).toBeCloseTo(80, 2)
    expect(left('.end')).toBeCloseTo(160, 2)
    expect(kids(q(c, '.stretch'))[0]!.width).toBeCloseTo(200, 2)
    expect(left('.between', 1)).toBeCloseTo(160, 2)
    expect(left('.jcenter')).toBeCloseTo(80, 2)
    expect(left('.evenly')).toBeCloseTo(40, 2) // (200 - 80) / 3
    expect(left('.around')).toBeCloseTo(30, 2) // (200 - 80) / 4
    expect(style(q(c, '.between')).justifyContent).toBe('space-between')
    expect(style(q(c, '.baseline')).alignItems).toBe('baseline')
  })
})

describe('Stack: dirección según el espacio disponible (switchAt)', () => {
  const Switching = ({ width }: { width: number }) => (
    <div style={{ width }}>
      <Stack switchAt="20rem" gap={100} className="sw">
        <div className="kid">Uno</div>
        <div className="kid">Dos</div>
        <div className="kid">Tres</div>
      </Stack>
    </div>
  )

  test('más ancho que el umbral (400 > 320): en fila, repartiéndose el ancho', async () => {
    const c = await render(<Switching width={400} />)
    const el = q(c, '.sw')
    expect(el.style.getPropertyValue('--mk-stack-switch-at')).toBe('20rem')
    const r = kids(el)
    expect(new Set(r.map((x) => Math.round(x.top))).size).toBe(1)
    for (const x of r) expect(x.width).toBeCloseTo((400 - 16) / 3, 1)
    expect(r[1]!.left - r[0]!.right).toBeCloseTo(8, 2)
  })

  test('más angosto que el umbral (300 < 320): en columna, cada hijo a todo el ancho', async () => {
    const c = await render(<Switching width={300} />)
    const r = kids(q(c, '.sw'))
    for (const x of r) expect(x.width).toBeCloseTo(300, 2)
    expect(r[1]!.top - r[0]!.bottom).toBeCloseTo(8, 2)
    expect(r[2]!.top - r[1]!.bottom).toBeCloseTo(8, 2)
  })

  test('mide el Stack, no la ventana: el mismo Stack cambia al cambiar su contenedor', async () => {
    const c = await render(<Switching width={400} />)
    const el = q(c, '.sw')
    expect(new Set(kids(el).map((x) => Math.round(x.top))).size).toBe(1)
    ;(el.parentElement as HTMLElement).style.width = '200px'
    expect(new Set(kids(el).map((x) => Math.round(x.top))).size).toBe(3)
  })

  test('el umbral se puede cambiar desde CSS con --mk-stack-switch-at', async () => {
    const c = await render(
      <div style={{ width: 400 }}>
        <Stack switchAt="20rem" className="sw" style={{ ['--mk-stack-switch-at' as string]: '30rem' }}>
          <div>a</div>
          <div>b</div>
        </Stack>
      </div>,
    )
    expect(new Set(kids(q(c, '.sw')).map((x) => Math.round(x.top))).size).toBe(2)
  })
})
