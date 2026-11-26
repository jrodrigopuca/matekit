import { createRef } from 'react'
import { describe, expect, test } from 'vitest'
import { commands, page } from 'vitest/browser'
import { Group } from './Group.tsx'
import { render, style, withMotion } from '../../test/render.tsx'

const q = (c: ParentNode, sel: string) => c.querySelector(sel) as HTMLElement
const rect = (el: Element) => el.getBoundingClientRect()

/** Radios en pantalla: arriba a la izquierda, arriba a la derecha, abajo a la derecha, abajo a la izquierda. */
function corners(el: Element): [number, number, number, number] {
  const s = getComputedStyle(el)
  return [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius].map(
    (v) => parseFloat(v),
  ) as [number, number, number, number]
}
const all = (c: ParentNode, sel: string) => [...c.querySelectorAll(sel)].map(corners)

/** Bloque simple, sin radio propio, con fondo (como un elemento de la List segmentada). */
const Block = ({ label = 'x' }: { label?: string }) => (
  <div className="block" style={{ padding: 8, background: 'var(--md-sys-color-surface-container)' }}>{label}</div>
)

// Valores por defecto: los de la List segmentada (Compose segmentedShapes; kit): 16 y 4.
const O = 16
const I = 4

describe('Group: estructura y props', () => {
  test('un <div class="mk-group"> en fila, con separación de 2 (--md-sys-space-25) y sin rol propio', async () => {
    const c = await render(<Group><Block /><Block /></Group>)
    const el = q(c, 'div.mk-group')
    expect(el.dataset.orientation).toBe('horizontal')
    expect(el.hasAttribute('role')).toBe(false)
    const s = style(el)
    expect(s.display).toBe('flex')
    expect(s.flexDirection).toBe('row')
    expect(s.columnGap).toBe('2px')
    const [a, b] = [...el.children].map(rect)
    expect(b!.left - a!.right).toBeCloseTo(2, 2)
  })

  test('props nativas, className, style, ref y el rol y nombre que pase el uso', async () => {
    const ref = createRef<HTMLElement>()
    const c = await render(
      <Group ref={ref} id="g" className="mine" style={{ opacity: 0.5 }} data-x="1" role="group" aria-label="Vista">
        <button type="button">Día</button>
        <button type="button">Semana</button>
      </Group>,
    )
    const el = q(c, '#g')
    expect(ref.current).toBe(el)
    expect(el.className).toBe('mk-group mine')
    expect(el.style.opacity).toBe('0.5')
    expect(el.dataset.x).toBe('1')
    expect(page.getByRole('group', { name: 'Vista' }).element()).toBe(el)
  })

  test('render: una lista (<ul>) con sus <li> como bloques', async () => {
    const ref = createRef<HTMLElement>()
    const c = await render(
      <Group ref={ref} orientation="vertical" aria-label="Ajustes" render={<ul className="own" style={{ margin: 0, padding: 0 }} />}>
        <li>Wi-Fi</li>
        <li>Bluetooth</li>
      </Group>,
    )
    const ul = q(c, 'ul')
    expect(ul.className).toBe('mk-group own')
    expect(ref.current).toBe(ul)
    expect(ul.dataset.orientation).toBe('vertical')
    expect(page.getByRole('list', { name: 'Ajustes' }).element()).toBe(ul)
    expect(corners(q(c, 'li'))).toEqual([O, O, I, I])
  })
})

describe('Group: forma según la posición', () => {
  test('horizontal con 3 o más: exteriores al inicio del primero y al final del último, el resto chicas', async () => {
    const c = await render(
      <Group>
        <Block /><Block /><Block /><Block />
      </Group>,
    )
    expect(all(c, '.block')).toEqual([
      [O, I, I, O],
      [I, I, I, I],
      [I, I, I, I],
      [I, O, O, I],
    ])
  })

  test('horizontal con 2 y con 1', async () => {
    const c = await render(
      <>
        <Group className="two"><Block /><Block /></Group>
        <Group className="one"><Block /></Group>
      </>,
    )
    expect(all(c, '.two .block')).toEqual([
      [O, I, I, O],
      [I, O, O, I],
    ])
    expect(all(c, '.one .block')).toEqual([[O, O, O, O]])
  })

  test('vertical con 3, 2 y 1: exteriores arriba del primero y abajo del último', async () => {
    const c = await render(
      <>
        <Group orientation="vertical" className="three"><Block /><Block /><Block /></Group>
        <Group orientation="vertical" className="two"><Block /><Block /></Group>
        <Group orientation="vertical" className="one"><Block /></Group>
      </>,
    )
    expect(all(c, '.three .block')).toEqual([
      [O, O, I, I],
      [I, I, I, I],
      [I, I, O, O],
    ])
    expect(all(c, '.two .block')).toEqual([
      [O, O, I, I],
      [I, I, O, O],
    ])
    expect(all(c, '.one .block')).toEqual([[O, O, O, O]])
    const [a, b] = [...q(c, '.two').children].map(rect)
    expect(b!.top - a!.bottom).toBeCloseTo(2, 2)
    // En columna los bloques se estiran al ancho del grupo.
    expect(a!.width).toBeCloseTo(rect(q(c, '.two')).width, 2)
  })

  test('RTL: el primero queda a la derecha, con las esquinas exteriores a la derecha', async () => {
    const c = await render(
      <div dir="rtl">
        <Group><Block label="1" /><Block label="2" /><Block label="3" /></Group>
      </div>,
    )
    const blocks = [...c.querySelectorAll('.block')]
    expect(rect(blocks[0]!).left).toBeGreaterThan(rect(blocks[2]!).left)
    expect(blocks.map(corners)).toEqual([
      [I, O, O, I],
      [I, I, I, I],
      [O, I, I, O],
    ])
  })
})

describe('Group: variables del uso y contrato con los hijos', () => {
  test('el uso pisa separación y radios en el grupo (grupo de botones conectado: 8 adentro, redondo afuera)', async () => {
    const c = await render(
      <Group
        style={{
          ['--mk-group-gap' as string]: 'var(--md-sys-space-50)',
          ['--mk-group-outer-radius' as string]: '20px',
          ['--mk-group-inner-radius' as string]: 'var(--md-sys-shape-corner-small)',
        }}
      >
        <Block /><Block /><Block />
      </Group>,
    )
    expect(all(c, '.block')).toEqual([
      [20, 8, 8, 20],
      [8, 8, 8, 8],
      [8, 20, 20, 8],
    ])
    const [a, b] = [...q(c, '.mk-group').children].map(rect)
    expect(b!.left - a!.right).toBeCloseTo(4, 2)
  })

  test('un hijo redefine el radio interior en su :active (presionado de 8 a 4) y solo cambia el suyo', async () => {
    const c = await render(
      <>
        <style>{`.press > button:active { --mk-group-inner-radius: var(--md-sys-shape-corner-extra-small); }`}</style>
        <Group className="press" style={{ ['--mk-group-inner-radius' as string]: '8px', ['--mk-group-outer-radius' as string]: '20px' }}>
          <button type="button" className="b1">Uno</button>
          <button type="button" className="b2">Dos</button>
          <button type="button" className="b3">Tres</button>
        </Group>
      </>,
    )
    expect(corners(q(c, '.b2'))).toEqual([8, 8, 8, 8])
    await commands.pressDown('.b1')
    try {
      expect(corners(q(c, '.b1'))).toEqual([20, 4, 4, 20])
      expect(corners(q(c, '.b2'))).toEqual([8, 8, 8, 8])
    } finally {
      await commands.pressUp()
    }
  })

  test('el radio se anima: cambiar una variable dispara la transición de border-radius del hijo', async () => {
    const c = await render(
      <Group style={{ ['--mk-group-inner-radius' as string]: '8px' }}>
        <div className="block anim" style={{ transition: 'border-radius 1s linear' }}>a</div>
        <div className="block">b</div>
      </Group>,
    )
    const el = q(c, '.anim')
    const running = withMotion(() => {
      getComputedStyle(el).borderTopRightRadius
      el.style.setProperty('--mk-group-inner-radius', '2px')
      getComputedStyle(el).borderTopRightRadius
      return el.getAnimations().map((a) => (a as CSSTransition).transitionProperty)
    })
    expect(running).toContain('border-top-right-radius')
    expect(running).not.toContain('border-top-left-radius') // la exterior no cambió
  })

  test('un componente con radio propio lo conserva salvo que lea las salidas; los nietos no las heredan', async () => {
    const c = await render(
      <>
        <style>{`
          .own { border-radius: 20px; }
          .part, .part-inner {
            border-start-start-radius: var(--mk-group-corner-start-start, 20px);
            border-start-end-radius: var(--mk-group-corner-start-end, 20px);
            border-end-start-radius: var(--mk-group-corner-end-start, 20px);
            border-end-end-radius: var(--mk-group-corner-end-end, 20px);
          }
        `}</style>
        <Group>
          <div className="own">a</div>
          <div className="part">
            b<span className="part-inner" style={{ display: 'block' }}>c</span>
          </div>
          <div className="block">d</div>
        </Group>
      </>,
    )
    expect(corners(q(c, '.own'))).toEqual([20, 20, 20, 20])
    expect(corners(q(c, '.part'))).toEqual([I, I, I, I])
    expect(style(q(c, '.part')).getPropertyValue('--mk-group-corner-start-start').trim()).not.toBe('')
    // Registradas sin herencia: el nieto no las ve y usa su propio radio.
    expect(style(q(c, '.part-inner')).getPropertyValue('--mk-group-corner-start-start').trim()).toBe('')
    expect(corners(q(c, '.part-inner'))).toEqual([20, 20, 20, 20])
  })
})

describe('Group: anchos chicos', () => {
  test('horizontal a 200 px con textos largos: los bloques se achican y el grupo no desborda', async () => {
    const c = await render(
      <div className="box" style={{ width: 200 }}>
        <Group>
          <Block label="Primera opción larga" />
          <Block label="Segunda opción larga" />
          <Block label="Tercera opción larga" />
        </Group>
      </div>,
    )
    const box = rect(q(c, '.box'))
    const g = q(c, '.mk-group')
    expect(rect(g).width).toBeLessThanOrEqual(box.width + 0.01)
    for (const b of c.querySelectorAll('.block')) expect(rect(b).right).toBeLessThanOrEqual(box.right + 0.01)
    expect(g.scrollWidth).toBeLessThanOrEqual(g.clientWidth)
    expect(style(g).flexWrap).toBe('nowrap')
  })
})
