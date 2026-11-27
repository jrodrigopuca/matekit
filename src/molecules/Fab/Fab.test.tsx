import { createRef, useState, type AnchorHTMLAttributes, type Ref } from 'react'
import { afterEach, describe, expect, test } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'
import { AddIcon, EditIcon } from '../../icons/icons.tsx'
import { render, roleColor, style, withMotion } from '../../test/render.tsx'
import { ExtendedFab, Fab, type FabSize, type FabVariant } from './Fab.tsx'

const px = (v: string) => parseFloat(v)
const rect = (el: Element) => el.getBoundingClientRect()
const q = (c: ParentNode, sel: string) => {
  const el = c.querySelector(sel)
  if (!el) throw new Error(`no se encontró ${sel}`)
  return el as HTMLElement
}

// Medidas del kit de Figma (05-medidas.md § FAB y FAB extendido). En el FAB, el relleno del kit
// es (alto − icono) / 2; en el extendido, el relleno lateral (28 en el grande, no 30).
const SIZES: Record<FabSize, { h: number; radius: number; icon: number; pad: number; gap: number; font: number }> = {
  sm: { h: 56, radius: 16, icon: 24, pad: 16, gap: 8, font: 16 },
  md: { h: 80, radius: 20, icon: 28, pad: 26, gap: 12, font: 22 },
  lg: { h: 96, radius: 28, icon: 36, pad: 28, gap: 16, font: 24 },
}

const VARIANTS: [FabVariant, string, string][] = [
  ['primary-container', 'primary-container', 'on-primary-container'],
  ['secondary-container', 'secondary-container', 'on-secondary-container'],
  ['tertiary-container', 'tertiary-container', 'on-tertiary-container'],
  ['primary', 'primary', 'on-primary'],
  ['secondary', 'secondary', 'on-secondary'],
  ['tertiary', 'tertiary', 'on-tertiary'],
]

// Firma de cada nivel de elevación (la segunda sombra de --md-sys-elevation-levelN).
const LEVEL = { 1: '0px 1px 3px 1px', 2: '0px 2px 6px 2px', 3: '0px 4px 8px 3px', 4: '0px 6px 10px 4px' }

describe('Fab: estructura y accesibilidad', () => {
  test('es un <button type="button"> con label como nombre, el icono oculto y sus átomos', async () => {
    const c = await render(<Fab label="Redactar"><EditIcon /></Fab>)
    const b = page.getByRole('button', { name: 'Redactar' }).element() as HTMLButtonElement
    expect(b.tagName).toBe('BUTTON')
    expect(b.type).toBe('button')
    expect(b.className).toBe('mk-fab')
    expect(b.dataset['variant']).toBe('primary-container')
    expect(b.dataset['size']).toBe('sm')
    expect(q(c, '.mk-icon').getAttribute('aria-hidden')).toBe('true')
    expect(b.querySelectorAll(':scope > .mk-state-layer, :scope > .mk-ripple, :scope > .mk-focus-ring')).toHaveLength(3)
  })

  test('ref, className, style, eventos y props nativas llegan al <button>', async () => {
    const ref = createRef<HTMLButtonElement>()
    let clicks = 0
    const c = await render(
      <Fab label="Nuevo" ref={ref} className="mio" style={{ marginTop: 7 }} id="f1" type="submit" data-foo="bar" onClick={() => clicks++}>
        <AddIcon />
      </Fab>,
    )
    const b = q(c, 'button') as HTMLButtonElement
    expect(ref.current).toBe(b)
    expect(b.className).toBe('mk-fab mio')
    expect(b.style.marginTop).toBe('7px')
    expect(b.id).toBe('f1')
    expect(b.type).toBe('submit')
    expect(b.dataset['foo']).toBe('bar')
    await userEvent.click(b)
    expect(clicks).toBe(1)
  })

  test('Enter y Espacio lo activan desde el teclado', async () => {
    let clicks = 0
    await render(<Fab label="Nuevo" onClick={() => clicks++}><AddIcon /></Fab>)
    await userEvent.tab()
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard(' ')
    expect(clicks).toBe(2)
  })
})

describe('Fab: tamaños y forma (kit)', () => {
  for (const [size, m] of Object.entries(SIZES) as [FabSize, (typeof SIZES)['sm']][]) {
    test(`${size}: ${m.h} × ${m.h}, radio ${m.radius}, icono ${m.icon} centrado`, async () => {
      const c = await render(<Fab label="Nuevo" size={size}><AddIcon /></Fab>)
      const b = q(c, 'button')
      const box = rect(b)
      const icon = rect(q(c, '.mk-icon'))
      expect(box.width).toBeCloseTo(m.h, 2)
      expect(box.height).toBeCloseTo(m.h, 2)
      expect(px(style(b).borderTopLeftRadius)).toBe(m.radius)
      expect(px(style(b).borderBottomRightRadius)).toBe(m.radius)
      expect(icon.width).toBeCloseTo(m.icon, 2)
      expect(icon.left - box.left).toBeCloseTo((m.h - m.icon) / 2, 2)
      expect(icon.top - box.top).toBeCloseTo((m.h - m.icon) / 2, 2)
    })
  }

  test('el radio no cambia al presionar (el FAB no cambia de forma)', async () => {
    const c = await render(<Fab label="Nuevo"><AddIcon /></Fab>)
    const b = q(c, 'button')
    await commands.pressDown('.mk-fab')
    expect(b.matches(':active')).toBe(true)
    expect(px(style(b).borderTopLeftRadius)).toBe(16)
    await commands.pressUp()
  })
})

describe('Fab: colores (on-X sobre X)', () => {
  for (const [variant, container, content] of VARIANTS) {
    test(`${variant}: fondo ${container}, icono ${content}`, async () => {
      const c = await render(<Fab label="Nuevo" variant={variant}><AddIcon /></Fab>)
      const b = q(c, 'button')
      expect(style(b).backgroundColor).toBe(roleColor(container))
      expect(style(b).color).toBe(roleColor(content))
      expect(style(q(c, '.mk-state-layer')).backgroundColor).toBe(roleColor(content))
    })
  }
})

describe('Fab: elevación y estados', () => {
  test('nivel 3 en reposo, 4 con el puntero y la capa al 8 %', async () => {
    const c = await render(<Fab label="Nuevo"><AddIcon /></Fab>)
    const b = q(c, 'button')
    expect(style(b).boxShadow).toContain(LEVEL[3])
    expect(style(q(c, '.mk-state-layer')).opacity).toBe('0')
    await userEvent.hover(b)
    expect(style(b).boxShadow).toContain(LEVEL[4])
    expect(style(q(c, '.mk-state-layer')).opacity).toBe('0.08')
  })

  test('presionado con el puntero encima: vuelve al nivel 3, capa al 8 % más la onda', async () => {
    const c = await render(<Fab label="Nuevo"><AddIcon /></Fab>)
    const b = q(c, 'button')
    await commands.pressDown('.mk-fab')
    expect(style(b).boxShadow).toContain(LEVEL[3])
    expect(style(q(c, '.mk-state-layer')).opacity).toBe('0.08')
    expect(b.querySelector('.mk-ripple-wave')).not.toBeNull()
    await commands.pressUp()
  })

  test('foco de teclado: nivel 3, capa al 10 % y anillo visible', async () => {
    const c = await render(<Fab label="Nuevo"><AddIcon /></Fab>)
    const b = q(c, 'button')
    await userEvent.tab()
    expect(b.matches(':focus-visible')).toBe(true)
    expect(style(b).boxShadow).toContain(LEVEL[3])
    expect(style(q(c, '.mk-state-layer')).opacity).toBe('0.1')
    expect(style(q(c, '.mk-focus-ring')).opacity).toBe('1')
  })

  test('lowered: nivel 1 en reposo y presionado, 2 con el puntero (Compose)', async () => {
    const c = await render(<Fab label="Nuevo" lowered><AddIcon /></Fab>)
    const b = q(c, 'button')
    expect(b.hasAttribute('data-lowered')).toBe(true)
    expect(style(b).boxShadow).toContain(LEVEL[1])
    await userEvent.hover(b)
    expect(style(b).boxShadow).toContain(LEVEL[2])
    await commands.pressDown('.mk-fab')
    expect(style(b).boxShadow).toContain(LEVEL[1])
    await commands.pressUp()
  })

  test('la sombra se anima con un resorte de efectos', async () => {
    const c = await render(<Fab label="Nuevo"><AddIcon /></Fab>)
    const [property, easing] = withMotion(() => {
      const s = style(q(c, 'button'))
      return [s.transitionProperty, s.transitionTimingFunction]
    })
    expect(property).toContain('box-shadow')
    expect(easing).toContain('linear(')
  })
})

/** Enlace propio que imita al Link de Next.js y React Router: reparte sus props en el <a>. */
function FakeLink({ to, prefetch, ref, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; prefetch?: boolean; ref?: Ref<HTMLAnchorElement> }) {
  return <a {...props} href={to} data-prefetch={String(prefetch)} ref={ref} />
}

describe('Fab y ExtendedFab: como enlace (ADR-0010)', () => {
  test('con href, Fab es un <a> con label como nombre y la ref llega', async () => {
    const ref = createRef<HTMLAnchorElement>()
    await render(<Fab label="Nuevo" href="#nuevo" ref={ref}><AddIcon /></Fab>)
    const a = page.getByRole('link', { name: 'Nuevo' }).element() as HTMLAnchorElement
    expect(a.tagName).toBe('A')
    expect(a.getAttribute('href')).toBe('#nuevo')
    expect(a.className).toBe('mk-fab')
    expect(a.hasAttribute('type')).toBe(false)
    expect(ref.current).toBe(a)
    expect(px(style(a).width)).toBe(56)
  })

  test('con render, el enlace del enrutador recibe clases, nombre, props y los átomos', async () => {
    const ref = createRef<HTMLElement>()
    const c = await render(
      <ExtendedFab size="md" ref={ref} render={<FakeLink to="/nuevo" prefetch={false} className="propia" />}>
        <AddIcon />Nuevo
      </ExtendedFab>,
    )
    const a = page.getByRole('link', { name: 'Nuevo' }).element() as HTMLAnchorElement
    expect(a.getAttribute('href')).toBe('/nuevo')
    expect(a.className).toBe('mk-extended-fab propia')
    expect(a.dataset['prefetch']).toBe('false')
    expect(a.dataset['size']).toBe('md')
    expect(a.dataset['expanded']).toBe('true')
    expect(ref.current).toBe(a)
    expect(a.querySelectorAll(':scope > .mk-state-layer, :scope > .mk-ripple, :scope > .mk-focus-ring')).toHaveLength(3)
    expect(px(style(a).height)).toBe(80)
    expect(q(c, '.mk-extended-fab-label').textContent).toBe('Nuevo')
  })

  test('render con algo que no es un elemento falla con un mensaje claro', async () => {
    await expect(
      // @ts-expect-error: render espera un elemento.
      render(<Fab label="x" render="no"><AddIcon /></Fab>),
    ).rejects.toMatchObject({ code: 'MK_RENDER_NOT_ELEMENT', details: { component: 'Fab' } })
  })
})

describe('ExtendedFab: estructura y medidas', () => {
  test('es un <button> cuyo nombre es el texto; el icono queda oculto', async () => {
    const c = await render(<ExtendedFab><EditIcon />Redactar</ExtendedFab>)
    const b = page.getByRole('button', { name: 'Redactar' }).element() as HTMLButtonElement
    expect(b.className).toBe('mk-extended-fab')
    expect(b.type).toBe('button')
    expect(b.dataset['expanded']).toBe('true')
    expect(b.hasAttribute('aria-label')).toBe(false)
    expect(q(c, '.mk-icon').getAttribute('aria-hidden')).toBe('true')
  })

  for (const [size, m] of Object.entries(SIZES) as [FabSize, (typeof SIZES)['sm']][]) {
    test(`${size}: alto ${m.h}, radio ${m.radius}, relleno ${m.pad}, icono ${m.icon}, separación ${m.gap}, texto ${m.font}`, async () => {
      const c = await render(<ExtendedFab size={size}><AddIcon />Label</ExtendedFab>)
      const b = q(c, 'button')
      const box = rect(b)
      const icon = rect(q(c, '.mk-icon'))
      const label = q(c, '.mk-extended-fab-label')
      const text = document.createRange()
      text.selectNodeContents(label.lastChild as Node)
      const textBox = text.getBoundingClientRect()
      expect(box.height).toBeCloseTo(m.h, 2)
      expect(px(style(b).borderTopLeftRadius)).toBe(m.radius)
      expect(px(style(b).fontSize)).toBe(m.font)
      expect(icon.width).toBeCloseTo(m.icon, 2)
      // Relleno, icono, separación, texto y relleno. Lo que se mide contra el rango del texto va
      // con un decimal: WebKit ubica el texto con un error de centésimas (0,007 px en md).
      expect(icon.left - box.left).toBeCloseTo(m.pad, 2)
      expect(icon.top - box.top).toBeCloseTo((m.h - m.icon) / 2, 2)
      expect(textBox.left - icon.right).toBeCloseTo(m.gap, 1)
      expect(box.right - textBox.right).toBeCloseTo(m.pad, 1)
      expect(box.width).toBeCloseTo(2 * m.pad + m.icon + m.gap + textBox.width, 1)
    })
  }

  test('solo con texto, sin lugar reservado para el icono', async () => {
    const c = await render(<ExtendedFab>Redactar</ExtendedFab>)
    const box = rect(q(c, 'button'))
    const label = rect(q(c, '.mk-extended-fab-label'))
    expect(label.left - box.left).toBeCloseTo(16, 2)
    expect(box.right - label.right).toBeCloseTo(16, 1)
  })

  for (const [variant, container, content] of VARIANTS) {
    test(`${variant}: fondo ${container}, icono y texto ${content}`, async () => {
      const c = await render(<ExtendedFab variant={variant}><AddIcon />Nuevo</ExtendedFab>)
      const b = q(c, 'button')
      expect(style(b).backgroundColor).toBe(roleColor(container))
      expect(style(q(c, '.mk-extended-fab-label')).color).toBe(roleColor(content))
      expect(style(q(c, '.mk-icon')).color).toBe(roleColor(content))
    })
  }

  test('nivel 3 en reposo y 4 con el puntero, como el FAB', async () => {
    const c = await render(<ExtendedFab><AddIcon />Nuevo</ExtendedFab>)
    const b = q(c, 'button')
    expect(style(b).boxShadow).toContain(LEVEL[3])
    await userEvent.hover(b)
    expect(style(b).boxShadow).toContain(LEVEL[4])
  })
})

describe('ExtendedFab: contraído', () => {
  for (const [size, m] of Object.entries(SIZES) as [FabSize, (typeof SIZES)['sm']][]) {
    test(`${size}: contraído mide ${m.h} × ${m.h}, con el icono centrado y el texto invisible`, async () => {
      const c = await render(<ExtendedFab size={size} expanded={false}><AddIcon />Redactar</ExtendedFab>)
      const b = q(c, 'button')
      const box = rect(b)
      const icon = rect(q(c, '.mk-icon'))
      expect(b.dataset['expanded']).toBe('false')
      expect(box.width).toBeCloseTo(m.h, 2)
      expect(box.height).toBeCloseTo(m.h, 2)
      expect(icon.left - box.left).toBeCloseTo((m.h - m.icon) / 2, 2)
      expect(icon.width).toBeCloseTo(m.icon, 2)
      expect(rect(q(c, '.mk-extended-fab-label')).width).toBeCloseTo(0, 2)
      expect(style(q(c, '.mk-extended-fab-label')).color).toBe('rgba(0, 0, 0, 0)')
      // El icono sigue visible: color on-X y nada encima de él con opacidad (el texto se oculta
      // con el color justamente para no ocultar al icono, que es hijo de la etiqueta).
      expect(style(q(c, '.mk-icon')).color).toBe(roleColor('on-primary-container'))
      for (let el: Element | null = q(c, '.mk-icon'); el && el !== b; el = el.parentElement) {
        expect(style(el).opacity, el.className).toBe('1')
        expect(style(el).visibility, el.className).toBe('visible')
      }
    })
  }

  test('contraído, el texto sigue siendo el nombre accesible', async () => {
    await render(<ExtendedFab expanded={false}><EditIcon />Redactar</ExtendedFab>)
    await expect.element(page.getByRole('button', { name: 'Redactar' })).toBeInTheDocument()
  })

  describe('con movimiento', () => {
    const noMotion = () => document.getElementById('mk-test-no-motion') as HTMLStyleElement
    afterEach(async () => {
      noMotion().media = ''
      await commands.reduceMotion(false)
    })

    /** FAB extendido con un botón que lo contrae y lo expande. */
    function Toggle() {
      const [expanded, setExpanded] = useState(true)
      return (
        <div>
          <button type="button" className="toggle" onClick={() => setExpanded(!expanded)}>cambiar</button>
          <ExtendedFab expanded={expanded} className="fab"><AddIcon />Redactar</ExtendedFab>
        </div>
      )
    }

    test('se contrae y se expande animando el ancho hasta el valor final', async () => {
      const c = await render(<Toggle />)
      const b = q(c, '.fab')
      const expandedWidth = rect(b).width
      expect(expandedWidth).toBeGreaterThan(100)
      noMotion().media = 'not all'

      await userEvent.click(q(c, '.toggle'))
      // Recién empezada la animación todavía no llegó al final.
      expect(rect(b).width).toBeGreaterThan(56.5)
      await expect.poll(() => rect(b).width, { timeout: 3000 }).toBeCloseTo(56, 1)
      await expect.poll(() => style(q(c, '.mk-extended-fab-label')).color, { timeout: 3000 }).toBe('rgba(0, 0, 0, 0)')

      await userEvent.click(q(c, '.toggle'))
      await expect.poll(() => rect(b).width, { timeout: 3000 }).toBeCloseTo(expandedWidth, 1)
      await expect.poll(() => style(q(c, '.mk-extended-fab-label')).color, { timeout: 3000 }).toBe(roleColor('on-primary-container'))
    })

    test('anima con resortes: rápido espacial al expandir, por defecto espacial al contraer', async () => {
      const c = await render(<Toggle />)
      const b = q(c, '.fab')
      const content = q(c, '.mk-extended-fab-content')
      noMotion().media = 'not all'
      const token = (name: string) => px(style(b).getPropertyValue(`--md-sys-motion-spring-${name}-duration`))
      // getComputedStyle da la duración en segundos ("0.36s"); los tokens, en ms.
      const duration = () => px(style(content).transitionDuration) * 1000
      const [fast, slow] = [token('fast-spatial'), token('default-spatial')]
      expect(fast).not.toBe(slow)
      expect(style(content).transitionProperty).toContain('grid-template-columns')
      expect(style(content).transitionTimingFunction).toContain('linear(')
      expect(duration()).toBeCloseTo(fast, 0)
      await userEvent.click(q(c, '.toggle'))
      expect(duration()).toBeCloseTo(slow, 0)
    })

    test('con prefers-reduced-motion, el ancho cambia sin animarse', async () => {
      await commands.reduceMotion(true)
      const c = await render(<Toggle />)
      const b = q(c, '.fab')
      noMotion().media = 'not all'
      expect(style(q(c, '.mk-extended-fab-content')).transitionDuration).toMatch(/^0s/)
      await userEvent.click(q(c, '.toggle'))
      await expect.poll(() => rect(b).width, { timeout: 500 }).toBeCloseTo(56, 1)
    })
  })
})
