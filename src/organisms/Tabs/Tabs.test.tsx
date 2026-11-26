import { createRef, useState, type AnchorHTMLAttributes, type ReactNode, type Ref } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { commands, page, server, userEvent } from 'vitest/browser'
import { HomeIcon, SearchIcon, StarIcon } from '../../icons/icons.tsx'
import { Badge } from '../../molecules/Badge/Badge.tsx'
import { render, roleColor, style } from '../../test/render.tsx'
import { TabLabel } from './tab-content.tsx'
import { TabLink } from './TabLink.tsx'
import { TabNav } from './TabNav.tsx'
import { Tab, TabList, TabPanel, Tabs, type TabsActivation, type TabsLayout, type TabsVariant } from './Tabs.tsx'

const q = <T extends Element = HTMLElement>(c: ParentNode, sel: string) => {
  const el = c.querySelector<T>(sel)
  if (!el) throw new Error(`no se encontró ${sel}`)
  return el
}
const rect = (el: Element) => el.getBoundingClientRect()
const tabs = (c: ParentNode) => [...c.querySelectorAll<HTMLElement>('[role="tab"]')]
const indicator = (tab: Element) => q(tab, '.mk-tab-indicator')

function computedColor(css: string): string {
  const probe = document.createElement('span')
  probe.style.color = css
  document.body.append(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value
}

/** Congela la animación del indicador en un instante (ms) y devuelve su rect. */
function frozenAt(el: HTMLElement, ms: number) {
  const [animation] = el.getAnimations()
  if (!animation) throw new Error('el indicador no está animado')
  animation.pause()
  animation.currentTime = ms
  return rect(el)
}

const ITEMS = ['inicio', 'favoritos', 'buscar', 'ajustes'] as const

interface DemoProps {
  variant?: TabsVariant
  layout?: TabsLayout
  activation?: TabsActivation
  disabled?: string
  defaultValue?: string
  dir?: 'rtl'
  width?: number
  icons?: boolean
  labels?: boolean
}

/** Cuatro pestañas con su panel, entre dos botones. */
function Demo({ variant, layout, activation, disabled, defaultValue = 'inicio', dir, width = 400, icons = false, labels = true }: DemoProps) {
  return (
    <div dir={dir} style={{ inlineSize: width }}>
      <button type="button" className="antes">Antes</button>
      <Tabs defaultValue={defaultValue} activation={activation}>
        <TabList variant={variant} layout={layout} aria-label="Secciones">
          {ITEMS.map((v) => (
            <Tab key={v} value={v} className={`t-${v}`} disabled={disabled === v} {...(labels ? {} : { 'aria-label': v })}>
              {icons ? <StarIcon /> : null}
              {labels ? v[0]?.toUpperCase() + v.slice(1) : null}
            </Tab>
          ))}
        </TabList>
        {ITEMS.map((v) => (
          <TabPanel key={v} value={v} className={`p-${v}`}>Panel {v}</TabPanel>
        ))}
      </Tabs>
      <button type="button" className="despues">Después</button>
    </div>
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Tabs: roles y relaciones (APG)', () => {
  test('tablist con nombre, tabs <button type="button"> con aria-selected y aria-controls, paneles con aria-labelledby', async () => {
    const c = await render(<Demo />)
    const list = q(c, '[role="tablist"]')
    expect(list.getAttribute('aria-label')).toBe('Secciones')
    expect(page.getByRole('tablist', { name: 'Secciones' }).element()).toBe(list)
    const all = tabs(c)
    expect(all).toHaveLength(4)
    for (const [i, tab] of all.entries()) {
      expect(tab.tagName).toBe('BUTTON')
      expect(tab.getAttribute('type')).toBe('button')
      expect(tab.getAttribute('aria-selected')).toBe(String(i === 0))
      const panel = document.getElementById(tab.getAttribute('aria-controls') ?? '')
      expect(panel?.getAttribute('role')).toBe('tabpanel')
      expect(panel?.getAttribute('aria-labelledby')).toBe(tab.id)
      expect(panel?.hidden).toBe(i !== 0)
      expect(panel?.tabIndex).toBe(0)
    }
    expect(page.getByRole('tab', { name: 'Favoritos' }).element()).toBe(all[1])
    expect(page.getByRole('tabpanel', { name: 'Inicio' }).element()).toBe(q(c, '.p-inicio'))
    // Los átomos y el indicador quedan ocultos.
    expect(indicator(all[0]!).getAttribute('aria-hidden')).toBe('true')
  })

  test('ids únicos entre dos grupos y válidos con espacios en el valor', async () => {
    const c = await render(
      <>
        <Tabs defaultValue="a b"><TabList><Tab value="a b">A</Tab></TabList><TabPanel value="a b">1</TabPanel></Tabs>
        <Tabs defaultValue="a b"><TabList><Tab value="a b">A</Tab></TabList><TabPanel value="a b">2</TabPanel></Tabs>
      </>,
    )
    const [t1, t2] = tabs(c)
    expect(t1!.id).not.toBe(t2!.id)
    for (const t of [t1!, t2!]) {
      expect(t.id).not.toMatch(/\s/)
      expect(t.getAttribute('aria-controls')).not.toMatch(/\s/)
      expect(document.getElementById(t.getAttribute('aria-controls')!)).not.toBeNull()
    }
  })

  test('solo icono: aria-label da el nombre; sin él, avisa por consola (también con fragmentos y TabLabel no)', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const c = await render(
      <Tabs defaultValue="a">
        <TabList>
          <Tab value="a" aria-label="Inicio"><HomeIcon /></Tab>
          <Tab value="b"><>{<StarIcon />}Favoritos</></Tab>
          <Tab value="c"><SearchIcon /><TabLabel><b>Buscar</b></TabLabel></Tab>
        </TabList>
      </Tabs>,
    )
    expect(page.getByRole('tab', { name: 'Inicio' }).element()).toBe(tabs(c)[0])
    expect(q(tabs(c)[1]!, '.mk-tab-label').textContent).toBe('Favoritos')
    expect(error).not.toHaveBeenCalled()
    await render(<Tabs defaultValue="a"><TabList><Tab value="a"><HomeIcon /></Tab></TabList></Tabs>)
    expect(error).toHaveBeenCalledWith(expect.stringMatching(/necesita aria-label/))
  })

  test('Tab, TabList o TabPanel fuera de Tabs fallan con un mensaje claro', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(render(<Tab value="a">A</Tab>)).rejects.toThrow(/dentro de <Tabs>/)
  })

  test('props nativas y ref llegan a cada elemento', async () => {
    const refs = { root: createRef<HTMLDivElement>(), list: createRef<HTMLDivElement>(), tab: createRef<HTMLButtonElement>(), panel: createRef<HTMLDivElement>() }
    const c = await render(
      <Tabs defaultValue="a" ref={refs.root} className="raiz" data-x="1" style={{ marginTop: 3 }}>
        <TabList ref={refs.list} className="lista" data-x="2" aria-labelledby="titulo">
          <Tab value="a" ref={refs.tab} className="pes" data-x="3" title="Pestaña A">A</Tab>
        </TabList>
        <TabPanel value="a" ref={refs.panel} className="pan" data-x="4" tabIndex={-1}>A</TabPanel>
      </Tabs>,
    )
    expect(refs.root.current).toBe(q(c, '.mk-tabs'))
    expect(refs.root.current?.className).toBe('mk-tabs raiz')
    expect(refs.root.current?.style.marginTop).toBe('3px')
    expect(refs.list.current).toBe(q(c, '[role="tablist"]'))
    expect(refs.list.current?.className).toBe('mk-tab-list lista')
    expect(refs.list.current?.getAttribute('aria-labelledby')).toBe('titulo')
    expect(refs.tab.current).toBe(q(c, '[role="tab"]'))
    expect(refs.tab.current?.className).toBe('mk-tab pes')
    expect(refs.tab.current?.title).toBe('Pestaña A')
    expect(refs.panel.current).toBe(q(c, '[role="tabpanel"]'))
    expect(refs.panel.current?.className).toBe('mk-tab-panel pan')
    expect(refs.panel.current?.tabIndex).toBe(-1)
    for (const [i, el] of [refs.root, refs.list, refs.tab, refs.panel].entries()) expect(el.current?.dataset['x']).toBe(String(i + 1))
  })
})

describe('Tabs: teclado', () => {
  test('una sola parada de Tab: la pestaña elegida (aunque no sea la primera); las demás en -1', async () => {
    const c = await render(<Demo defaultValue="buscar" />)
    expect(tabs(c).map((t) => t.tabIndex)).toEqual([-1, -1, 0, -1])
  })

  // WebKit en macOS no lleva el foco a botones con Tab (ajuste del sistema, CLAUDE.md). Esta pasó
  // igual en el WebKit local el 2026-11-26 (la de ChipGroup no; el motivo no se buscó): si falla en
  // local, la referencia es el WebKit de Linux del CI. Las flechas se prueban aparte sin Tab.
  test('Tab entra en la elegida y sale al panel; Mayús+Tab vuelve a la elegida', async () => {
    const c = await render(<Demo defaultValue="favoritos" />)
    q(c, '.antes').focus()
    await userEvent.tab()
    expect(document.activeElement).toBe(q(c, '.t-favoritos'))
    await userEvent.tab()
    expect(document.activeElement).toBe(q(c, '.p-favoritos'))
    await userEvent.tab({ shift: true })
    expect(document.activeElement).toBe(q(c, '.t-favoritos'))
  })

  test('automática: las flechas mueven el foco y eligen, con vuelta; Inicio y Fin; saltean la deshabilitada', async () => {
    const onValueChange = vi.fn()
    const c = await render(
      <Tabs defaultValue="inicio" onValueChange={onValueChange}>
        <TabList>
          {ITEMS.map((v) => <Tab key={v} value={v} className={`t-${v}`} disabled={v === 'favoritos'}>{v}</Tab>)}
        </TabList>
        {ITEMS.map((v) => <TabPanel key={v} value={v} className={`p-${v}`}>{v}</TabPanel>)}
      </Tabs>,
    )
    q(c, '.t-inicio').focus({ focusVisible: true } as FocusOptions)
    for (const v of ['buscar', 'ajustes', 'inicio']) {
      await userEvent.keyboard('{ArrowRight}')
      expect(document.activeElement, v).toBe(q(c, `.t-${v}`))
      expect(q(c, `.t-${v}`).getAttribute('aria-selected'), v).toBe('true')
      expect(q(c, `.p-${v}`).hidden, v).toBe(false)
    }
    await userEvent.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(q(c, '.t-ajustes'))
    await userEvent.keyboard('{Home}')
    expect(document.activeElement).toBe(q(c, '.t-inicio'))
    await userEvent.keyboard('{End}')
    expect(document.activeElement).toBe(q(c, '.t-ajustes'))
    expect(onValueChange).toHaveBeenLastCalledWith('ajustes', expect.objectContaining({ type: 'keydown' }))
    expect(tabs(c).filter((t) => t.tabIndex === 0)).toEqual([q(c, '.t-ajustes')])
  })

  test('manual: las flechas solo mueven el foco; Enter y Espacio eligen; al salir, la parada vuelve a la elegida', async () => {
    const c = await render(<Demo activation="manual" />)
    q(c, '.t-inicio').focus({ focusVisible: true } as FocusOptions)
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(q(c, '.t-favoritos'))
    expect(q(c, '.t-inicio').getAttribute('aria-selected')).toBe('true')
    expect(q(c, '.p-inicio').hidden).toBe(false)
    await userEvent.keyboard('{Enter}')
    expect(q(c, '.t-favoritos').getAttribute('aria-selected')).toBe('true')
    expect(q(c, '.p-favoritos').hidden).toBe(false)
    await userEvent.keyboard('{ArrowRight}')
    await userEvent.keyboard(' ')
    expect(q(c, '.t-buscar').getAttribute('aria-selected')).toBe('true')
    // Se mueve el foco a la última sin elegirla y se sale de la lista: la parada es la elegida (APG).
    await userEvent.keyboard('{ArrowRight}')
    expect(q(c, '.t-ajustes').tabIndex).toBe(0)
    q(c, '.despues').focus()
    await expect.poll(() => tabs(c).map((t) => t.tabIndex)).toEqual([-1, -1, 0, -1])
  })

  test('RTL: la flecha izquierda avanza y la derecha retrocede', async () => {
    const c = await render(<Demo dir="rtl" />)
    q(c, '.t-inicio').focus({ focusVisible: true } as FocusOptions)
    await userEvent.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(q(c, '.t-favoritos'))
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(q(c, '.t-inicio'))
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(q(c, '.t-ajustes'))
  })

  test('no captura flechas con modificadores ni arriba y abajo', async () => {
    const c = await render(<Demo />)
    q(c, '.t-inicio').focus()
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(q(c, '.t-inicio'))
    expect(q(c, '.t-inicio').getAttribute('aria-selected')).toBe('true')
  })

  test('la pestaña a la que se llega con flechas muestra el anillo de foco, por dentro', async () => {
    const c = await render(<Demo />)
    q(c, '.t-inicio').focus({ focusVisible: true } as FocusOptions)
    await userEvent.keyboard('{ArrowRight}')
    const tab = q(c, '.t-favoritos')
    expect(tab.matches(':focus-visible')).toBe(true)
    const ring = q(tab, '.mk-focus-ring')
    expect(style(ring).opacity).toBe('1')
    expect(style(ring).outlineColor).toBe(roleColor('secondary'))
    expect(style(ring).outlineOffset).toBe('-3px')
    expect(style(ring).borderTopLeftRadius).toBe('8px')
    // En la elegida termina 1 arriba del indicador de 3.
    expect(rect(tab).bottom - rect(ring).bottom).toBeCloseTo(4, 2)
  })
})

describe('Tabs: estado controlado y no controlado', () => {
  test('no controlado: el clic elige y muestra su panel', async () => {
    const c = await render(<Demo />)
    await userEvent.click(q(c, '.t-buscar'))
    expect(q(c, '.t-buscar').getAttribute('aria-selected')).toBe('true')
    expect(q(c, '.t-inicio').getAttribute('aria-selected')).toBe('false')
    expect(q(c, '.p-buscar').hidden).toBe(false)
    expect(q(c, '.p-inicio').hidden).toBe(true)
  })

  test('controlado: onValueChange recibe el valor y el evento; sin aplicarlo no cambia', async () => {
    const onValueChange = vi.fn()
    function Uso({ apply }: { apply: boolean }) {
      const [v, setV] = useState('inicio')
      return (
        <Tabs value={v} onValueChange={(next, e) => { onValueChange(next, e.type); if (apply) setV(next) }}>
          <TabList>{ITEMS.map((x) => <Tab key={x} value={x} className={`t-${x}`}>{x}</Tab>)}</TabList>
        </Tabs>
      )
    }
    let c = await render(<Uso apply={false} />)
    await userEvent.click(q(c, '.t-buscar'))
    expect(onValueChange).toHaveBeenCalledWith('buscar', 'click')
    expect(q(c, '.t-buscar').getAttribute('aria-selected')).toBe('false')
    c = await render(<Uso apply />)
    await userEvent.click(q(c, '.t-buscar'))
    expect(q(c, '.t-buscar').getAttribute('aria-selected')).toBe('true')
    // Volver a tocar la elegida no avisa.
    onValueChange.mockClear()
    await userEvent.click(q(c, '.t-buscar'))
    expect(onValueChange).not.toHaveBeenCalled()
  })

  test('el onClick propio va antes; con preventDefault no se elige', async () => {
    const c = await render(
      <Tabs defaultValue="a">
        <TabList>
          <Tab value="a">A</Tab>
          <Tab value="b" className="b" onClick={(e) => e.preventDefault()}>B</Tab>
        </TabList>
      </Tabs>,
    )
    await userEvent.click(q(c, '.b'))
    expect(q(c, '.b').getAttribute('aria-selected')).toBe('false')
  })
})

describe('Tabs: paneles', () => {
  test('ocultos con hidden y montados: lo escrito se conserva; unmount desmonta el contenido y deja el panel', async () => {
    const c = await render(
      <Tabs defaultValue="a">
        <TabList>
          <Tab value="a" className="ta">A</Tab>
          <Tab value="b" className="tb">B</Tab>
        </TabList>
        <TabPanel value="a" className="pa"><input aria-label="Nota" className="nota" /></TabPanel>
        <TabPanel value="b" className="pb" unmount><input aria-label="Otra" className="otra" /></TabPanel>
      </Tabs>,
    )
    expect(c.querySelector('.otra')).toBeNull()
    expect(q(c, '.pb').hidden).toBe(true)
    expect(document.getElementById(q(c, '.tb').getAttribute('aria-controls')!)).toBe(q(c, '.pb'))
    await userEvent.fill(q(c, '.nota'), 'hola')
    await userEvent.click(q(c, '.tb'))
    expect(q(c, '.pa').hidden).toBe(true)
    expect(style(q(c, '.pa')).display).toBe('none')
    expect(q<HTMLInputElement>(c, '.otra')).toBeTruthy()
    await userEvent.fill(q(c, '.otra'), 'chau')
    await userEvent.click(q(c, '.ta'))
    expect(q<HTMLInputElement>(c, '.nota').value).toBe('hola')
    expect(c.querySelector('.otra')).toBeNull()
  })
})

describe('Tabs: medidas (kit y Compose)', () => {
  test('primary solo etiqueta: 48 de alto, relleno 16, Title Small, indicador de 3 del ancho del contenido menos 2 por lado, abajo', async () => {
    const c = await render(<Demo />)
    const tab = q(c, '.t-inicio')
    const s = style(tab)
    expect(rect(tab).height).toBeCloseTo(48, 2)
    expect(s.paddingInlineStart).toBe('16px')
    expect(s.paddingInlineEnd).toBe('16px')
    expect(s.fontSize).toBe('14px')
    expect(s.lineHeight).toBe('20px')
    expect(s.fontWeight).toBe('500')
    const content = q(tab, '.mk-tab-content')
    const ind = indicator(tab)
    expect(rect(ind).height).toBeCloseTo(3, 2)
    expect(rect(tab).bottom - rect(ind).bottom).toBeCloseTo(0, 2)
    expect(rect(ind).left - rect(content).left).toBeCloseTo(2, 2)
    expect(rect(content).right - rect(ind).right).toBeCloseTo(2, 2)
    expect(rect(content).width).toBeCloseTo(rect(q(tab, '.mk-tab-label')).width, 2)
    // Radio completo arriba (corner-full, que el navegador reduce a la mitad del alto) y 0 abajo.
    const full = getComputedStyle(document.documentElement).getPropertyValue('--md-sys-shape-corner-full').trim()
    expect(style(ind).borderTopLeftRadius).toBe(full)
    expect(style(ind).borderTopRightRadius).toBe(full)
    expect(style(ind).borderBottomLeftRadius).toBe('0px')
    expect(style(ind).borderBottomRightRadius).toBe('0px')
    expect(style(ind).backgroundColor).toBe(roleColor('primary'))
    expect(style(ind).opacity).toBe('1')
    expect(style(indicator(q(c, '.t-favoritos'))).opacity).toBe('0')
  })

  test('primary con icono y etiqueta: 64, icono de 24 a 10 de arriba, separación 2 y la etiqueta a 8 de abajo; solo icono: 48', async () => {
    const c = await render(<Demo icons />)
    const tab = q(c, '.t-inicio')
    const icon = q(tab, '.mk-tab-icon')
    const label = q(tab, '.mk-tab-label')
    expect(rect(tab).height).toBeCloseTo(64, 2)
    expect(rect(icon).width).toBeCloseTo(24, 2)
    expect(rect(icon).height).toBeCloseTo(24, 2)
    expect(rect(icon).top - rect(tab).top).toBeCloseTo(10, 2)
    expect(rect(label).top - rect(icon).bottom).toBeCloseTo(2, 2)
    expect(rect(tab).bottom - rect(label).bottom).toBeCloseTo(8, 2)
    const only = await render(<Demo icons labels={false} />)
    expect(rect(q(only, '.t-inicio')).height).toBeCloseTo(48, 2)
    // El indicador del icono solo: 24 − 2 − 2.
    expect(rect(indicator(q(only, '.t-inicio'))).width).toBeCloseTo(20, 2)
  })

  test('secondary: 48, icono y etiqueta en línea separados 8, indicador de 2 a todo el ancho de la pestaña', async () => {
    const c = await render(<Demo variant="secondary" icons />)
    const tab = q(c, '.t-inicio')
    expect(rect(tab).height).toBeCloseTo(48, 2)
    const icon = q(tab, '.mk-tab-icon')
    const label = q(tab, '.mk-tab-label')
    expect(rect(label).left - rect(icon).right).toBeCloseTo(8, 2)
    expect(rect(icon).top + 12).toBeCloseTo(rect(tab).top + 24, 2)
    const ind = indicator(tab)
    expect(rect(ind).height).toBeCloseTo(2, 2)
    expect(rect(ind).width).toBeCloseTo(rect(tab).width, 2)
    expect(rect(ind).left).toBeCloseTo(rect(tab).left, 2)
    expect(rect(tab).bottom - rect(ind).bottom).toBeCloseTo(0, 2)
  })

  test('barra: Surface con divisor de 1 en Outline Variant abajo, que el indicador tapa; fixed reparte el ancho', async () => {
    const c = await render(<Demo width={400} />)
    const list = q(c, '[role="tablist"]')
    const s = style(list)
    expect(s.backgroundColor).toBe(roleColor('surface'))
    expect(s.backgroundImage).toContain(roleColor('outline-variant'))
    expect(s.backgroundSize).toBe('100% 1px')
    expect(s.backgroundPositionY).toBe('100%')
    expect(rect(list).height).toBeCloseTo(48, 2)
    for (const t of tabs(c)) expect(rect(t).width).toBeCloseTo(100, 2)
  })

  test('scrollable: pestañas del ancho del contenido (mínimo 90), 52 a cada lado, sin barra de desplazamiento', async () => {
    const c = await render(<Demo layout="scrollable" width={300} />)
    const list = q(c, '[role="tablist"]')
    const s = style(list)
    expect(s.overflowX).toBe('auto')
    expect(s.paddingInlineStart).toBe('52px')
    expect(s.paddingInlineEnd).toBe('52px')
    expect(s.scrollbarWidth).toBe('none')
    expect(list.scrollWidth).toBeGreaterThan(list.clientWidth)
    // Sin barra: el alto de la caja es el de las pestañas.
    expect(list.clientHeight).toBe(list.offsetHeight)
    for (const t of tabs(c)) {
      expect(rect(t).width).toBeGreaterThanOrEqual(90 - 0.01)
      expect(style(t).flexShrink).toBe('0')
    }
    expect(rect(tabs(c)[0]!).left - rect(list).left).toBeCloseTo(52, 2)
  })

  test('insignias: sobre la esquina del icono (pequeña a 18, grande desde 12 y 2 arriba); sin icono, después de la etiqueta; su texto se suma al nombre', async () => {
    const c = await render(
      <Tabs defaultValue="a">
        <TabList>
          <Tab value="a" className="a"><HomeIcon />Inicio<Badge label="Novedades" /></Tab>
          <Tab value="b" className="b"><StarIcon />Favoritos<Badge label="3 nuevos">3</Badge></Tab>
          <Tab value="c" className="c">Buscar<Badge label="Novedades" /></Tab>
        </TabList>
      </Tabs>,
    )
    const icon = (s: string) => q(c, `${s} .mk-tab-icon`)
    const badge = (s: string) => q(c, `${s} .mk-badge`)
    expect(badge('.a').parentElement).toBe(icon('.a'))
    expect(rect(badge('.a')).left - rect(icon('.a')).left).toBeCloseTo(18, 2)
    expect(rect(badge('.a')).top - rect(icon('.a')).top).toBeCloseTo(0, 2)
    expect(rect(badge('.b')).left - rect(icon('.b')).left).toBeCloseTo(12, 2)
    expect(rect(badge('.b')).top - rect(icon('.b')).top).toBeCloseTo(-2, 2)
    expect(rect(badge('.c')).left - rect(q(c, '.c .mk-tab-label')).right).toBeCloseTo(4, 2)
    expect(page.getByRole('tab', { name: 'Favoritos 3 nuevos' }).element()).toBe(q(c, '.b'))
  })
})

describe('Tabs: colores por estilo y estado', () => {
  test('primary: elegida Primary (etiqueta, icono e indicador); sin elegir On Surface Variant', async () => {
    const c = await render(<Demo icons />)
    expect(style(q(c, '.t-inicio')).color).toBe(roleColor('primary'))
    expect(style(q(c, '.t-inicio .mk-tab-icon')).color).toBe(roleColor('primary'))
    expect(style(q(c, '.t-favoritos')).color).toBe(roleColor('on-surface-variant'))
    expect(style(q(c, '.t-favoritos .mk-tab-icon')).color).toBe(roleColor('on-surface-variant'))
    expect(style(q(c, '.t-inicio .mk-state-layer')).backgroundColor).toBe(roleColor('primary'))
    expect(style(q(c, '.t-favoritos .mk-state-layer')).backgroundColor).toBe(roleColor('on-surface'))
  })

  test('secondary: elegida On Surface, sin elegir On Surface Variant, indicador Primary', async () => {
    const c = await render(<Demo variant="secondary" icons />)
    expect(style(q(c, '.t-inicio')).color).toBe(roleColor('on-surface'))
    expect(style(q(c, '.t-inicio .mk-tab-icon')).color).toBe(roleColor('on-surface'))
    expect(style(q(c, '.t-favoritos')).color).toBe(roleColor('on-surface-variant'))
    expect(style(indicator(q(c, '.t-inicio'))).backgroundColor).toBe(roleColor('primary'))
    expect(style(q(c, '.t-inicio .mk-state-layer')).backgroundColor).toBe(roleColor('on-surface'))
  })

  test('con el puntero: capa al 8 %; la sin elegir pasa a On Surface', async () => {
    const c = await render(<Demo icons />)
    await userEvent.hover(q(c, '.t-favoritos'))
    expect(style(q(c, '.t-favoritos .mk-state-layer')).opacity).toBe('0.08')
    expect(style(q(c, '.t-favoritos')).color).toBe(roleColor('on-surface'))
    expect(style(q(c, '.t-favoritos .mk-tab-icon')).color).toBe(roleColor('on-surface'))
    await userEvent.hover(q(c, '.t-inicio'))
    expect(style(q(c, '.t-inicio .mk-state-layer')).opacity).toBe('0.08')
    expect(style(q(c, '.t-inicio')).color).toBe(roleColor('primary'))
  })

  test('foco de teclado: capa al 10 % y On Surface en la sin elegir', async () => {
    const c = await render(<Demo activation="manual" />)
    q(c, '.t-inicio').focus({ focusVisible: true } as FocusOptions)
    await userEvent.keyboard('{ArrowRight}')
    expect(style(q(c, '.t-favoritos .mk-state-layer')).opacity).toBe('0.1')
    expect(style(q(c, '.t-favoritos')).color).toBe(roleColor('on-surface'))
  })

  test('presionada: capa al 10 % y On Surface en la sin elegir', async () => {
    const c = await render(<Demo />)
    await commands.pressDown('.t-favoritos')
    try {
      expect(style(q(c, '.t-favoritos .mk-state-layer')).opacity).toBe('0.1')
      expect(style(q(c, '.t-favoritos')).color).toBe(roleColor('on-surface'))
    } finally {
      await commands.pressUp()
    }
  })

  test('deshabilitada: On Surface al 38 %, sin capa, no se elige con el clic', async () => {
    const c = await render(<Demo disabled="favoritos" />)
    const tab = q<HTMLButtonElement>(c, '.t-favoritos')
    expect(tab.disabled).toBe(true)
    expect(style(tab).color).toBe(computedColor('color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent)'))
    await userEvent.click(tab, { force: true })
    expect(tab.getAttribute('aria-selected')).toBe('false')
    expect(style(q(tab, '.mk-state-layer')).opacity).toBe('0')
  })
})

describe('Tabs: indicador animado', () => {
  test('al elegir otra, el indicador sale desde el lugar y el ancho del anterior y llega al suyo con el resorte', async () => {
    const c = await render(<Demo />)
    const from = rect(indicator(q(c, '.t-inicio')))
    await userEvent.click(q(c, '.t-ajustes'))
    const ind = indicator(q(c, '.t-ajustes'))
    const [animation] = ind.getAnimations()
    expect(animation).toBeDefined()
    const timing = animation!.effect!.getTiming()
    expect(timing.duration).toBe(440)
    expect(String(timing.easing)).toMatch(/^linear\(/)
    const start = frozenAt(ind, 0)
    expect(start.left).toBeCloseTo(from.left, 1)
    expect(start.width).toBeCloseTo(from.width, 1)
    animation!.finish()
    const end = rect(ind)
    expect(end.left).toBeGreaterThan(from.left + 200)
    expect(end.left - rect(q(ind.parentElement!, '.mk-tab-label')).left).toBeCloseTo(2, 2)
  })

  test('RTL: el indicador sale desde la pestaña anterior también', async () => {
    const c = await render(<Demo dir="rtl" variant="secondary" />)
    const from = rect(indicator(q(c, '.t-inicio')))
    await userEvent.click(q(c, '.t-buscar'))
    const start = frozenAt(indicator(q(c, '.t-buscar')), 0)
    expect(start.left).toBeCloseTo(from.left, 1)
    expect(start.width).toBeCloseTo(from.width, 1)
  })

  test('con movimiento reducido: aparece en su lugar con un fundido, sin desplazarse', async () => {
    await commands.reduceMotion(true)
    try {
      const c = await render(<Demo />)
      await userEvent.click(q(c, '.t-buscar'))
      const ind = indicator(q(c, '.t-buscar'))
      const [animation] = ind.getAnimations()
      expect(animation).toBeDefined()
      const keyframes = (animation!.effect as KeyframeEffect).getKeyframes()
      expect(keyframes.some((k) => 'translate' in k || 'width' in k)).toBe(false)
      const final = (() => { animation!.finish(); return rect(ind) })()
      animation!.currentTime = 0
      const start = rect(ind)
      expect(start.left).toBeCloseTo(final.left, 2)
      expect(start.width).toBeCloseTo(final.width, 2)
    } finally {
      await commands.reduceMotion(false)
    }
  })
})

describe('Tabs: scrollable y responsive', () => {
  const Many = ({ defaultValue = 't0' }: { defaultValue?: string }) => (
    <div style={{ inlineSize: 320 }}>
      <Tabs defaultValue={defaultValue}>
        <TabList layout="scrollable" aria-label="Muchas">
          {Array.from({ length: 12 }, (_, i) => <Tab key={i} value={`t${i}`} className={`t${i}`}>{`Sección ${i}`}</Tab>)}
        </TabList>
      </Tabs>
    </div>
  )
  const inside = (tab: Element, list: Element) => {
    const t = rect(tab)
    const l = rect(list)
    return t.left >= l.left - 0.5 && t.right <= l.right + 0.5
  }

  test('la elegida al montar se ve; al elegir una lejana, la barra se desplaza hasta mostrarla sin mover la página', async () => {
    const c = await render(<Many defaultValue="t8" />)
    const list = q(c, '[role="tablist"]')
    expect(inside(q(c, '.t8'), list)).toBe(true)
    const y = scrollY
    q(c, '.t8').focus({ focusVisible: true } as FocusOptions)
    await userEvent.keyboard('{End}')
    await expect.poll(() => inside(q(c, '.t11'), list)).toBe(true)
    await userEvent.keyboard('{Home}')
    await expect.poll(() => inside(q(c, '.t0'), list)).toBe(true)
    expect(scrollY).toBe(y)
  })

  test('el anillo de foco se ve entero en los extremos (va por dentro)', async () => {
    const c = await render(<Many />)
    const list = q(c, '[role="tablist"]')
    q(c, '.t0').focus({ focusVisible: true } as FocusOptions)
    await userEvent.keyboard('{End}')
    await expect.poll(() => list.scrollLeft).toBeGreaterThan(0)
    const ring = q(c, '.t11 .mk-focus-ring')
    await expect.poll(() => rect(ring).right <= rect(list).right + 0.5).toBe(true)
    expect(style(ring).outlineOffset).toBe('-3px')
  })

  test('fixed con seis pestañas en 320: sin desborde, de igual ancho, la etiqueta se recorta con puntos suspensivos y el nombre sigue completo', async () => {
    const c = await render(
      <div style={{ inlineSize: 320 }}>
        <Tabs defaultValue="a">
          <TabList aria-label="Fijas">
            {['Inicio', 'Favoritos', 'Buscar', 'Guardados', 'Me gusta', 'Ajustes'].map((l, i) => (
              <Tab key={l} value={i === 0 ? 'a' : l}>{l}</Tab>
            ))}
          </TabList>
        </Tabs>
      </div>,
    )
    const list = q(c, '[role="tablist"]')
    expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth)
    expect(rect(list).width).toBeCloseTo(320, 2)
    const widths = tabs(c).map((t) => rect(t).width)
    for (const w of widths) expect(w).toBeCloseTo(320 / 6, 1)
    const label = q(tabs(c)[1]!, '.mk-tab-label')
    const s = style(label)
    expect(s.whiteSpace).toBe('nowrap')
    expect(s.textOverflow).toBe('ellipsis')
    expect(s.overflow).toBe('hidden')
    expect(rect(label).right).toBeLessThanOrEqual(rect(tabs(c)[1]!).right)
    expect(page.getByRole('tab', { name: 'Favoritos' }).element()).toBe(tabs(c)[1])
  })
})

/** Un Link de enrutador de mentira: recibe `to` y pasa lo demás al `<a>`. */
function FakeLink({ to, ref, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; ref?: Ref<HTMLAnchorElement> }) {
  return <a {...props} ref={ref} href={to} />
}

describe('TabNav: enlaces para navegar entre páginas', () => {
  function Nav({ current, children }: { current: string; children?: ReactNode }) {
    return (
      <>
        <button type="button" className="antes">Antes</button>
        <TabNav aria-label="Cuenta" className="nav">
          {['perfil', 'seguridad', 'pagos'].map((s) => (
            <TabLink key={s} href={`#${s}`} active={current === s} className={`l-${s}`}>{s}</TabLink>
          ))}
          {children}
        </TabNav>
      </>
    )
  }

  test('un <nav> con nombre y enlaces; la actual con aria-current="page"; sin roles de pestañas', async () => {
    const c = await render(<Nav current="seguridad" />)
    const nav = q(c, 'nav')
    expect(page.getByRole('navigation', { name: 'Cuenta' }).element()).toBe(nav)
    expect(nav.className).toBe('mk-tab-list nav')
    expect(c.querySelector('[role="tablist"], [role="tab"], [aria-selected]')).toBeNull()
    expect(q(c, '.l-seguridad').getAttribute('aria-current')).toBe('page')
    expect(q(c, '.l-perfil').hasAttribute('aria-current')).toBe(false)
    expect(page.getByRole('link', { name: 'pagos' }).element()).toBe(q(c, '.l-pagos'))
    expect(style(indicator(q(c, '.l-seguridad'))).opacity).toBe('1')
    expect(style(indicator(q(c, '.l-perfil'))).opacity).toBe('0')
    expect(style(q(c, '.l-seguridad')).color).toBe(roleColor('primary'))
    // Ningún enlace sale del orden de Tab.
    for (const a of c.querySelectorAll('a')) expect(a.hasAttribute('tabindex')).toBe(false)
  })

  // WebKit en macOS no lleva el foco a los enlaces con Tab (ajuste del sistema): falla en local, la
  // referencia es el WebKit de Linux del CI; la prueba siguiente lo cubre sin Tab.
  test('Tab recorre cada enlace (sin foco itinerante) y las flechas no mueven el foco', async () => {
    const c = await render(<Nav current="perfil" />)
    q(c, '.antes').focus()
    await userEvent.tab()
    expect(document.activeElement).toBe(q(c, '.l-perfil'))
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(q(c, '.l-perfil'))
    await userEvent.tab()
    expect(document.activeElement).toBe(q(c, '.l-seguridad'))
  })

  // Lo mismo sin Tab, para los motores donde el Tab del sistema no llega a los enlaces.
  test('las flechas no mueven el foco entre enlaces y el enlace enfocado muestra el anillo', async () => {
    const c = await render(<Nav current="perfil" />)
    q(c, '.l-perfil').focus({ focusVisible: true } as FocusOptions)
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(q(c, '.l-perfil'))
    expect(style(q(c, '.l-perfil .mk-focus-ring')).opacity).toBe('1')
  })

  test('con render, el Link del enrutador recibe clases, aria-current, props, ref y el contenido', async () => {
    const ref = createRef<HTMLElement>()
    const c = await render(
      <TabNav>
        <TabLink active ref={ref} data-x="1" className="mio" render={<FakeLink to="/perfil" className="propia" />}>
          <HomeIcon />Perfil
        </TabLink>
      </TabNav>,
    )
    const a = q(c, 'a')
    expect(a.getAttribute('href')).toBe('/perfil')
    expect(a.className).toBe('mk-tab mio propia')
    expect(a.getAttribute('aria-current')).toBe('page')
    expect(a.dataset['x']).toBe('1')
    expect(ref.current).toBe(a)
    expect(q(a, '.mk-tab-label').textContent).toBe('Perfil')
    expect(a.hasAttribute('data-icon')).toBe(true)
  })

  test('al cambiar la actual (navegación en el cliente), el indicador se desliza desde la anterior', async () => {
    function Uso() {
      const [current, setCurrent] = useState('perfil')
      return (
        <>
          <button type="button" className="ir" onClick={() => setCurrent('pagos')}>Ir</button>
          <Nav current={current} />
        </>
      )
    }
    const c = await render(<Uso />)
    const from = rect(indicator(q(c, '.l-perfil')))
    await userEvent.click(q(c, '.ir'))
    await expect.poll(() => indicator(q(c, '.l-pagos')).getAnimations().length).toBe(1)
    const start = frozenAt(indicator(q(c, '.l-pagos')), 0)
    expect(start.left).toBeCloseTo(from.left, 1)
    expect(start.width).toBeCloseTo(from.width, 1)
  })

  test('scrollable: el enlace actual se trae a la vista al montar', async () => {
    const c = await render(
      <div style={{ inlineSize: 320 }}>
        <TabNav layout="scrollable" variant="secondary">
          {Array.from({ length: 10 }, (_, i) => (
            <TabLink key={i} href={`#s${i}`} active={i === 8} className={`l${i}`}>{`Sección ${i}`}</TabLink>
          ))}
        </TabNav>
      </div>,
    )
    const nav = q(c, 'nav')
    const t = rect(q(c, '.l8'))
    expect(t.left).toBeGreaterThanOrEqual(rect(nav).left - 0.5)
    expect(t.right).toBeLessThanOrEqual(rect(nav).right + 0.5)
    expect(style(q(c, '.l8')).color).toBe(roleColor('on-surface'))
  })
})
