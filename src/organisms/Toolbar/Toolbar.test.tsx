import { createRef, type ReactNode } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'
import { AddIcon, BookmarkIcon, DeleteIcon, EditIcon, MoreVertIcon, ShareIcon, StarIcon } from '../../icons/icons.tsx'
import { Button } from '../../molecules/Button/Button.tsx'
import { Fab } from '../../molecules/Fab/Fab.tsx'
import { IconButton } from '../../molecules/IconButton/IconButton.tsx'
import { render, roleColor, style, withMotion } from '../../test/render.tsx'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../Menu/Menu.tsx'
import { Toolbar, type ToolbarProps } from './Toolbar.tsx'
import { ToolbarLayout } from './ToolbarLayout.tsx'

const q = <T extends Element = HTMLElement>(c: ParentNode, sel: string) => {
  const el = c.querySelector<T>(sel)
  if (!el) throw new Error(`no se encontró ${sel}`)
  return el
}
const rect = (el: Element) => el.getBoundingClientRect()
const focusKeyboard = (el: HTMLElement) => el.focus({ focusVisible: true } as FocusOptions)

/** Espera n cuadros (el desplazamiento llega en el cuadro siguiente). */
const frames = (n = 3) =>
  new Promise<void>((resolve) => {
    const step = (left: number) => (left ? requestAnimationFrame(() => step(left - 1)) : resolve())
    step(n)
  })

/** Sombra de un token de elevación, como la devuelve getComputedStyle. */
function elevation(level: number): string {
  const probe = document.createElement('div')
  probe.style.boxShadow = `var(--md-sys-elevation-level${level})`
  document.body.append(probe)
  const value = getComputedStyle(probe).boxShadow
  probe.remove()
  return value
}

/** Color al 38 % de un rol, como lo dibuja el deshabilitado de button.css. */
function disabledContent(): string {
  const probe = document.createElement('span')
  probe.style.color =
    'color-mix(in srgb, var(--md-sys-color-on-surface) calc(var(--md-sys-state-disabled-content-opacity) * 100%), transparent)'
  document.body.append(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value
}

type BarProps = Partial<ToolbarProps> & { children?: ReactNode }

/** Cuatro icon buttons (uno toggle seleccionado, uno sin seleccionar) y un Button toggle. */
function Bar({ children, ...props }: BarProps) {
  return (
    <Toolbar label="Edición" {...(props as object)}>
      {children ?? (
        <>
          <IconButton className="b0" label="Editar"><EditIcon /></IconButton>
          <IconButton className="b1" label="Favorito" selected><StarIcon filled /></IconButton>
          <IconButton className="b2" label="Guardar" selected={false}><BookmarkIcon /></IconButton>
          <IconButton className="b3" label="Compartir"><ShareIcon /></IconButton>
        </>
      )}
    </Toolbar>
  )
}

/** Un contenedor que se desplaza de `width` × 300 con contenido de 2000 de alto. */
async function renderScrolling(toolbar: ReactNode, { width = 360, first = false } = {}) {
  const c = await render(
    <div className="scroller" style={{ width, height: 300, overflow: 'auto' }}>
      {first && toolbar}
      <div className="content" style={{ height: 2000 }}>contenido</div>
      {!first && toolbar}
    </div>,
  )
  return { c, scroller: q(c, '.scroller') }
}

describe('estructura y accesibilidad', () => {
  test('es un role="toolbar" con nombre y aria-orientation', async () => {
    await render(<Bar />)
    const bar = page.getByRole('toolbar', { name: 'Edición' })
    await expect.element(bar).toHaveAttribute('aria-orientation', 'horizontal')
    await render(<Bar orientation="vertical" />)
    await expect.element(page.getByRole('toolbar', { name: 'Edición' })).toHaveAttribute('aria-orientation', 'vertical')
  })

  test('el nombre también puede venir de aria-labelledby o aria-label', async () => {
    await render(
      <>
        <h2 id="t">Formato</h2>
        <Toolbar aria-labelledby="t"><IconButton label="Negrita"><EditIcon /></IconButton></Toolbar>
        <Toolbar aria-label="Otra"><IconButton label="Cursiva"><EditIcon /></IconButton></Toolbar>
      </>,
    )
    await expect.element(page.getByRole('toolbar', { name: 'Formato' })).toBeInTheDocument()
    await expect.element(page.getByRole('toolbar', { name: 'Otra' })).toBeInTheDocument()
  })

  test('props nativas, className, style y ref llegan al <div role="toolbar">', async () => {
    const ref = createRef<HTMLDivElement>()
    const onClick = vi.fn()
    const c = await render(<Bar ref={ref} id="tb" className="mia" style={{ marginTop: 3 }} data-x="1" onClick={onClick} />)
    const bar = q(c, '.mk-toolbar')
    expect(ref.current).toBe(bar)
    expect(bar.id).toBe('tb')
    expect(bar.classList.contains('mia')).toBe(true)
    expect(bar.dataset['x']).toBe('1')
    expect(style(bar).marginTop).toBe('3px')
    await userEvent.click(q(c, '.b0'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  test('los toggles son botones con aria-pressed', async () => {
    await render(<Bar />)
    await expect.element(page.getByRole('button', { name: 'Favorito' })).toHaveAttribute('aria-pressed', 'true')
    await expect.element(page.getByRole('button', { name: 'Guardar' })).toHaveAttribute('aria-pressed', 'false')
    await expect.element(page.getByRole('button', { name: 'Editar' })).not.toHaveAttribute('aria-pressed')
  })
})

describe('teclado (APG "Toolbar")', () => {
  const stops = (c: HTMLElement) => ['.b0', '.b1', '.b2', '.b3'].map((s) => q(c, s))

  // WebKit en macOS no lleva el foco a botones con Tab (ajuste del sistema): falla en local, la
  // referencia es el WebKit de Linux del CI (CLAUDE.md). Las flechas se prueban aparte sin Tab.
  test('una sola parada de Tab: entra en la primera, sale al siguiente y vuelve a la última enfocada', async () => {
    const c = await render(
      <>
        <button className="antes">antes</button>
        <Bar />
        <button className="despues">después</button>
      </>,
    )
    expect(stops(c).map((el) => el.tabIndex)).toEqual([0, -1, -1, -1])
    q(c, '.antes').focus()
    await userEvent.tab()
    expect(document.activeElement).toBe(q(c, '.b0'))
    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    await userEvent.tab()
    expect(document.activeElement).toBe(q(c, '.despues'))
    await userEvent.tab({ shift: true })
    expect(document.activeElement).toBe(q(c, '.b2'))
  })

  test('horizontal: derecha e izquierda con vuelta, Inicio y Fin; arriba y abajo no hacen nada', async () => {
    const c = await render(<Bar />)
    const [b0, b1, , b3] = stops(c)
    focusKeyboard(b0!)
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(b1)
    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(b1)
    await userEvent.keyboard('{End}')
    expect(document.activeElement).toBe(b3)
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(b0)
    await userEvent.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(b3)
    await userEvent.keyboard('{Home}')
    expect(document.activeElement).toBe(b0)
  })

  test('vertical: arriba y abajo; izquierda y derecha no hacen nada', async () => {
    const c = await render(<Bar orientation="vertical" />)
    const [b0, b1, , b3] = stops(c)
    focusKeyboard(b0!)
    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(b1)
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(b1)
    await userEvent.keyboard('{ArrowUp}{ArrowUp}')
    expect(document.activeElement).toBe(b3)
  })

  test('RTL: la flecha izquierda avanza', async () => {
    const c = await render(<div dir="rtl"><Bar /></div>)
    const [b0, b1, , b3] = stops(c)
    focusKeyboard(b0!)
    await userEvent.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(b1)
    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    expect(document.activeElement).toBe(b3)
  })

  test('disabled se saltea; aria-disabled sigue siendo parada (APG) y no se activa', async () => {
    const onClick = vi.fn()
    const c = await render(
      <Bar>
        <IconButton className="b0" label="Editar"><EditIcon /></IconButton>
        <IconButton className="b1" label="Borrar" disabled><DeleteIcon /></IconButton>
        <IconButton
          className="b2"
          label="Compartir"
          aria-disabled
          onClick={(e) => {
            if (e.currentTarget.getAttribute('aria-disabled') === 'true') return
            onClick()
          }}
        >
          <ShareIcon />
        </IconButton>
      </Bar>,
    )
    focusKeyboard(q(c, '.b0'))
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(q(c, '.b2'))
    await userEvent.keyboard('{Enter}')
    expect(onClick).not.toHaveBeenCalled()
    expect(q(c, '.b1').tabIndex).toBe(-1)
  })

  test('un campo de texto no es parada: conserva su Tab y sus flechas', async () => {
    const c = await render(
      <Bar>
        <IconButton className="b0" label="Editar"><EditIcon /></IconButton>
        <input className="campo" aria-label="Buscar" defaultValue="hola" />
        <IconButton className="b1" label="Compartir"><ShareIcon /></IconButton>
      </Bar>,
    )
    const field = q<HTMLInputElement>(c, '.campo')
    expect(field.tabIndex).toBe(0)
    field.focus()
    field.setSelectionRange(4, 4)
    await userEvent.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(field)
    expect(field.selectionStart).toBe(3)
    // Las flechas de los botones lo saltean.
    focusKeyboard(q(c, '.b0'))
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(q(c, '.b1'))
  })

  test('menú de más acciones: es una parada; sus ítems no lo son', async () => {
    const c = await render(
      <Bar>
        <IconButton className="b0" label="Editar"><EditIcon /></IconButton>
        <Menu>
          <MenuTrigger><IconButton className="mas" label="Más acciones"><MoreVertIcon /></IconButton></MenuTrigger>
          <MenuContent>
            <MenuItem className="item">Archivar</MenuItem>
          </MenuContent>
        </Menu>
      </Bar>,
    )
    expect(q(c, '.mas').tabIndex).toBe(-1)
    focusKeyboard(q(c, '.b0'))
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(q(c, '.mas'))
    await userEvent.keyboard('{Enter}')
    await expect.element(page.getByRole('menuitem', { name: 'Archivar' })).toHaveFocus()
    // Las flechas del menú son del menú, no de la barra.
    await userEvent.keyboard('{ArrowRight}')
    await expect.element(page.getByRole('menuitem', { name: 'Archivar' })).toHaveFocus()
  })

  test('vertical: arriba y abajo sobre el disparador del menú mueven el foco (Enter lo abre)', async () => {
    const c = await render(
      <Bar orientation="vertical">
        <IconButton className="b0" label="Editar"><EditIcon /></IconButton>
        <Menu>
          <MenuTrigger><IconButton className="mas" label="Más acciones"><MoreVertIcon /></IconButton></MenuTrigger>
          <MenuContent><MenuItem>Archivar</MenuItem></MenuContent>
        </Menu>
      </Bar>,
    )
    focusKeyboard(q(c, '.mas'))
    await userEvent.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(q(c, '.b0'))
    expect(q(c, '.mas').getAttribute('aria-expanded')).toBe('false')
  })
})

describe('colores Standard y Vibrant (kit y StandardToolbarTokens / VibrantToolbarTokens)', () => {
  const cases = [
    { color: 'standard', container: 'surface-container', content: 'on-surface-variant', selected: 'secondary-container', onSelected: 'on-secondary-container' },
    { color: 'vibrant', container: 'primary-container', content: 'on-primary-container', selected: 'surface-container', onSelected: 'on-surface' },
  ] as const

  for (const k of cases) {
    test(`${k.color}: barra, icon buttons, toggles, Button toggle y deshabilitado`, async () => {
      const c = await render(
        <Bar color={k.color}>
          <IconButton className="plain" label="Editar"><EditIcon /></IconButton>
          <IconButton className="on" label="Favorito" selected><StarIcon filled /></IconButton>
          <IconButton className="off" label="Guardar" selected={false}><BookmarkIcon /></IconButton>
          <IconButton className="dis" label="Borrar" disabled><DeleteIcon /></IconButton>
          <Button className="t-on" selected>Vista</Button>
          <Button className="t-off" selected={false}>Lista</Button>
        </Bar>,
      )
      const bar = q(c, '.mk-toolbar')
      expect(style(bar).backgroundColor).toBe(roleColor(k.container))
      for (const sel of ['.plain', '.off']) {
        expect(style(q(c, sel)).color).toBe(roleColor(k.content))
        expect(style(q(c, sel)).backgroundColor).toBe('rgba(0, 0, 0, 0)')
      }
      expect(style(q(c, '.on')).backgroundColor).toBe(roleColor(k.selected))
      expect(style(q(c, '.on')).color).toBe(roleColor(k.onSelected))
      expect(style(q(c, '.t-on')).backgroundColor).toBe(roleColor(k.selected))
      expect(style(q(c, '.t-on')).color).toBe(roleColor(k.onSelected))
      expect(style(q(c, '.t-off')).backgroundColor).toBe(roleColor(k.container))
      expect(style(q(c, '.t-off')).color).toBe(roleColor(k.content))
      expect(style(q(c, '.dis')).color).toBe(disabledContent())
    })
  }

  test('fuera de una barra, IconButton y Button conservan sus colores', async () => {
    const c = await render(
      <>
        <IconButton className="on" label="Favorito" selected><StarIcon filled /></IconButton>
        <Button className="t-on" selected>Vista</Button>
        <Button className="t-off" selected={false}>Lista</Button>
      </>,
    )
    expect(style(q(c, '.on')).color).toBe(roleColor('primary'))
    expect(style(q(c, '.on')).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(style(q(c, '.t-on')).backgroundColor).toBe(roleColor('primary'))
    expect(style(q(c, '.t-off')).backgroundColor).toBe(roleColor('surface-container'))
  })

  test('hover y presionado tiñen con el color del contenido (capa de estado)', async () => {
    const c = await render(<Bar color="vibrant" />)
    await userEvent.hover(q(c, '.b0'))
    const layer = q(c, '.b0 > .mk-state-layer')
    await expect.poll(() => Number(style(layer).opacity)).toBeGreaterThan(0)
    expect(style(layer).backgroundColor).toBe(roleColor('on-primary-container'))
  })
})

describe('medidas (kit y Compose)', () => {
  test('floating horizontal: 64 de alto, radio 32, elevación 3, 12 del borde a cada icono y 12 entre ellos', async () => {
    const c = await render(<div style={{ paddingBlock: 20 }}><Bar /></div>)
    const bar = q(c, '.mk-toolbar')
    const b = rect(bar)
    expect(b.height).toBeCloseTo(64, 2)
    expect(style(bar).borderTopLeftRadius).toBe('32px')
    expect(style(bar).boxShadow).toBe(elevation(3))
    const [b0, b1, , b3] = ['.b0', '.b1', '.b2', '.b3'].map((s) => rect(q(c, s)))
    expect(b0!.left - b.left).toBeCloseTo(12, 2)
    expect(b.right - b3!.right).toBeCloseTo(12, 2)
    expect(b1!.left - b0!.right).toBeCloseTo(12, 2)
    expect(b0!.top - b.top).toBeCloseTo(12, 2)
    // 12 + 4 × 40 + 3 × 12 + 12 = 220: 8 + 4 × 48 + 3 × 4 + 8 en Compose.
    expect(b.width).toBeCloseTo(220, 2)
  })

  test('Button en la barra: 40 de alto, a 8 del borde (sin el área de 48 a los lados)', async () => {
    const c = await render(<div style={{ paddingBlock: 20 }}><Bar><Button className="t" selected>Vista</Button></Bar></div>)
    const bar = rect(q(c, '.mk-toolbar'))
    const btn = rect(q(c, '.t'))
    expect(btn.height).toBeCloseTo(40, 2)
    expect(btn.left - bar.left).toBeCloseTo(8, 2)
  })

  test('floating vertical: 64 de ancho, 12 a los lados, 12 arriba y entre iconos', async () => {
    const { c } = await renderScrolling(<Bar orientation="vertical" />, { first: true })
    const bar = rect(q(c, '.mk-toolbar'))
    const [b0, b1] = ['.b0', '.b1'].map((s) => rect(q(c, s)))
    expect(bar.width).toBeCloseTo(64, 2)
    expect(b0!.left - bar.left).toBeCloseTo(12, 2)
    expect(b0!.top - bar.top).toBeCloseTo(12, 2)
    expect(b1!.top - b0!.bottom).toBeCloseTo(12, 2)
  })

  test('docked: 64 de alto a todo el ancho, sin radio ni elevación, iconos repartidos a 20 de los lados', async () => {
    const { c, scroller } = await renderScrolling(<Bar variant="docked" />)
    const bar = q(c, '.mk-toolbar')
    const b = rect(bar)
    expect(b.height).toBeCloseTo(64, 2)
    expect(b.width).toBeCloseTo(scroller.clientWidth, 2)
    expect(style(bar).borderTopLeftRadius).toBe('0px')
    expect(style(bar).boxShadow).toBe('none')
    const [b0, b1, b2, b3] = ['.b0', '.b1', '.b2', '.b3'].map((s) => rect(q(c, s)))
    expect(b0!.left - b.left).toBeCloseTo(20, 2)
    expect(b.right - b3!.right).toBeCloseTo(20, 2)
    expect(b0!.top - b.top).toBeCloseTo(12, 2)
    // Repartidos: la misma separación entre todos.
    expect(b2!.left - b1!.right).toBeCloseTo(b1!.left - b0!.right, 1)
  })
})

describe('posición en el contenedor que se desplaza', () => {
  test('docked: queda abajo del contenedor mientras se desplaza', async () => {
    const { c, scroller } = await renderScrolling(<Bar variant="docked" />)
    const bar = q(c, '.mk-toolbar')
    expect(rect(scroller).bottom - rect(bar).bottom).toBeCloseTo(0, 1)
    scroller.scrollTop = 600
    await frames()
    expect(rect(scroller).bottom - rect(bar).bottom).toBeCloseTo(0, 1)
  })

  test('floating horizontal: centrada y a 16 del borde de abajo', async () => {
    const { c, scroller } = await renderScrolling(<Bar />)
    const bar = rect(q(c, '.mk-toolbar'))
    const s = rect(scroller)
    expect(s.bottom - bar.bottom).toBeCloseTo(16, 1)
    expect(bar.left - s.left).toBeCloseTo(s.right - bar.right, 1)
  })

  test('floating vertical: centrada en lo visible y a 24 del final de la línea (izquierda en RTL); el texto no la rodea', async () => {
    for (const dir of ['ltr', 'rtl'] as const) {
      const c = await render(
        <div dir={dir} className="scroller" style={{ width: 360, height: 300, overflow: 'auto' }}>
          <Bar orientation="vertical" />
          <p className="texto" style={{ margin: 0 }}>Un párrafo largo que no debería rodear a la barra flotante.</p>
          <div style={{ height: 2000 }} />
        </div>,
      )
      const scroller = q(c, '.scroller')
      const bar = q(c, '.mk-toolbar')
      const s = rect(scroller)
      const b = rect(bar)
      const gap = dir === 'ltr' ? s.left + scroller.clientWidth - b.right : b.left - s.left
      expect(gap).toBeCloseTo(24, 1)
      expect(b.top - s.top).toBeCloseTo((300 - b.height) / 2, 1)
      expect(rect(q(c, '.texto')).width).toBeCloseTo(scroller.clientWidth, 1)
      scroller.scrollTop = 700
      await frames()
      expect(rect(bar).top - s.top).toBeCloseTo((300 - b.height) / 2, 1)
    }
  })

  test('ventana compacta (320): la floating no se pasa del contenedor y la docked con muchos botones se desplaza adentro', async () => {
    const many = Array.from({ length: 9 }, (_, i) => <IconButton key={i} label={`Acción ${i}`}><EditIcon /></IconButton>)
    const { c, scroller } = await renderScrolling(
      <>
        <Toolbar label="Flotante" className="f">{many}</Toolbar>
        <Toolbar label="Docked" variant="docked" className="d">{many}</Toolbar>
      </>,
      { width: 320 },
    )
    const f = q(c, '.f')
    const d = q(c, '.d')
    expect(rect(f).width).toBeCloseTo(320 - 32, 1)
    expect(f.scrollWidth).toBeGreaterThan(f.clientWidth)
    expect(rect(d).width).toBeCloseTo(320, 1)
    expect(d.scrollWidth).toBeGreaterThan(d.clientWidth)
    expect(scroller.scrollWidth).toBe(scroller.clientWidth)
    // El botón enfocado se trae a la vista dentro de la barra.
    const last = f.querySelectorAll('button')[8]!
    focusKeyboard(f.querySelector('button')!)
    await userEvent.keyboard('{End}')
    expect(document.activeElement).toBe(last)
    await expect.poll(() => rect(last).right).toBeLessThanOrEqual(rect(f).right + 0.5)
  })

  test('ventana ancha (1200): la floating mide lo que sus botones', async () => {
    const { c } = await renderScrolling(<Bar />, { width: 1200 })
    expect(rect(q(c, '.mk-toolbar')).width).toBeCloseTo(220, 2)
  })
})

describe('FAB acompañante (ToolbarLayout)', () => {
  test('horizontal: FAB a 8 al final, centrado en el alto; el conjunto centrado y a 16 de abajo', async () => {
    const { c, scroller } = await renderScrolling(
      <ToolbarLayout className="lay">
        <Bar />
        <Fab className="fab" label="Nuevo" variant="secondary-container"><AddIcon /></Fab>
      </ToolbarLayout>,
      { width: 400 },
    )
    const bar = rect(q(c, '.mk-toolbar'))
    const fab = rect(q(c, '.fab'))
    const lay = rect(q(c, '.lay'))
    const s = rect(scroller)
    expect(fab.left - bar.right).toBeCloseTo(8, 1)
    expect(fab.top + fab.height / 2).toBeCloseTo(bar.top + bar.height / 2, 1)
    expect(s.bottom - lay.bottom).toBeCloseTo(16, 1)
    expect(lay.left - s.left).toBeCloseTo(s.left + scroller.clientWidth - lay.right, 1)
  })

  test('el FAB es su propia parada de Tab, después de la de la barra', async () => {
    const c = await render(
      <ToolbarLayout>
        <Bar />
        <Fab className="fab" label="Nuevo"><AddIcon /></Fab>
      </ToolbarLayout>,
    )
    expect(q(c, '.fab').tabIndex).toBe(0)
    expect(q(c, '.fab').closest('[role="toolbar"]')).toBeNull()
    focusKeyboard(q(c, '.b0'))
    await userEvent.keyboard('{End}{ArrowRight}')
    expect(document.activeElement).toBe(q(c, '.b0'))
  })

  test('vertical: el FAB debajo, a 8, centrado en el ancho', async () => {
    const { c } = await renderScrolling(
      <ToolbarLayout>
        <Bar orientation="vertical" />
        <Fab className="fab" label="Nuevo"><AddIcon /></Fab>
      </ToolbarLayout>,
      { first: true },
    )
    const bar = rect(q(c, '.mk-toolbar'))
    const fab = rect(q(c, '.fab'))
    expect(fab.top - bar.bottom).toBeCloseTo(8, 1)
    expect(fab.left + fab.width / 2).toBeCloseTo(bar.left + bar.width / 2, 1)
  })
})

describe('ocultar al desplazar (exit-always)', () => {
  afterEach(() => commands.reduceMotion(false))

  async function scrollBy(scroller: HTMLElement, delta: number) {
    scroller.scrollTop += delta
    await frames()
  }

  test('floating: se va al bajar, vuelve al subir y no agranda lo que se desplaza', async () => {
    const { c, scroller } = await renderScrolling(<Bar scrollBehavior="exit-always" />)
    const bar = q(c, '.mk-toolbar')
    const height = scroller.scrollHeight
    await scrollBy(scroller, 40)
    await scrollBy(scroller, 200)
    await expect.poll(() => rect(bar).top).toBeGreaterThanOrEqual(rect(scroller).bottom)
    expect(bar.dataset['hidden']).toBe('')
    expect(scroller.scrollHeight).toBe(height)
    await scrollBy(scroller, -200)
    await expect.poll(() => rect(scroller).bottom - rect(bar).bottom).toBeCloseTo(16, 0)
    expect(bar.dataset['hidden']).toBeUndefined()
  })

  test('docked: se va al bajar y vuelve al subir', async () => {
    const { c, scroller } = await renderScrolling(<Bar variant="docked" scrollBehavior="exit-always" />)
    const bar = q(c, '.mk-toolbar')
    await scrollBy(scroller, 30)
    await scrollBy(scroller, 100)
    await expect.poll(() => rect(bar).top).toBeGreaterThanOrEqual(rect(scroller).bottom - 0.5)
    await scrollBy(scroller, -100)
    await expect.poll(() => rect(scroller).bottom - rect(bar).bottom).toBeCloseTo(0, 0)
  })

  test('con FAB: se esconde el conjunto', async () => {
    const { c, scroller } = await renderScrolling(
      <ToolbarLayout className="lay">
        <Bar scrollBehavior="exit-always" />
        <Fab className="fab" label="Nuevo"><AddIcon /></Fab>
      </ToolbarLayout>,
    )
    await scrollBy(scroller, 40)
    await scrollBy(scroller, 200)
    await expect.poll(() => rect(q(c, '.fab')).top).toBeGreaterThanOrEqual(rect(scroller).bottom)
    expect(q(c, '.lay').dataset['hidden']).toBe('')
  })

  test('vertical: se corre hasta el borde y se desvanece, sin agrandar el ancho desplazable', async () => {
    const { c, scroller } = await renderScrolling(<Bar orientation="vertical" scrollBehavior="exit-always" />, { first: true })
    const bar = q(c, '.mk-toolbar')
    const left = rect(bar).left
    await scrollBy(scroller, 40)
    await scrollBy(scroller, 200)
    await expect.poll(() => Number(style(bar).opacity)).toBe(0)
    expect(rect(bar).left - left).toBeCloseTo(24, 1)
    expect(style(bar).pointerEvents).toBe('none')
    expect(scroller.scrollWidth).toBe(scroller.clientWidth)
  })

  test('el foco que entra la vuelve a mostrar, y con el foco adentro no se esconde', async () => {
    const { c, scroller } = await renderScrolling(<Bar scrollBehavior="exit-always" />)
    const bar = q(c, '.mk-toolbar')
    await scrollBy(scroller, 40)
    await scrollBy(scroller, 200)
    await expect.poll(() => bar.dataset['hidden']).toBe('')
    const top = scroller.scrollTop
    focusKeyboard(q(c, '.b0'))
    // Vuelve sin que el navegador desplace el contenido para mostrar el botón.
    expect(scroller.scrollTop).toBe(top)
    await expect.poll(() => rect(scroller).bottom - rect(bar).bottom).toBeCloseTo(16, 0)
    await scrollBy(scroller, 200)
    expect(rect(scroller).bottom - rect(bar).bottom).toBeCloseTo(16, 0)
  })

  test('al soltar a mitad de camino se acomoda; con movimiento, con FastSpatial; con movimiento reducido, sin transición', async () => {
    const { c, scroller } = await renderScrolling(<Bar scrollBehavior="exit-always" />)
    const bar = q(c, '.mk-toolbar')
    await scrollBy(scroller, 10)
    await scrollBy(scroller, 20)
    scroller.dispatchEvent(new Event('scrollend'))
    await expect.poll(() => bar.style.getPropertyValue('--_offset')).toBe('0px')
    expect(bar.dataset['settling']).toBe('')
    withMotion(() => {
      expect(style(bar).transitionProperty).toContain('inset-block-end')
      expect(style(bar).transitionDuration).not.toBe('0s')
    })
    await commands.reduceMotion(true)
    withMotion(() => expect(style(bar).transitionDuration).toBe('0s'))
  })
})
