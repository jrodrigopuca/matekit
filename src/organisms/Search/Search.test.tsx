import { createRef, useState, type FormEvent, type ReactNode } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { commands, page, server, userEvent } from 'vitest/browser'
import {
  Search,
  SearchBar,
  SearchSuggestion,
  SearchSuggestionGroup,
  SearchView,
  type SearchViewChoice,
} from './Search.tsx'
import { SearchBarLeading, SearchBarTrailing } from './SearchSlots.tsx'
import { IconButton } from '../../molecules/IconButton/IconButton.tsx'
import { ListItemHeadline } from '../List/List.tsx'
import { TopAppBar, TopAppBarActions, TopAppBarLeading } from '../TopAppBar/TopAppBar.tsx'
import { ArrowBackIcon, MenuIcon, MoreVertIcon, SearchIcon } from '../../icons/icons.tsx'
import { render, roleColor, style } from '../../test/render.tsx'
import { withTransitions } from '../../test/exit.ts'

// Las sugerencias las filtra el uso (la búsqueda no filtra): FRUITS por lo escrito.
const FRUITS = ['Mandarina', 'Manzana', 'Mango', 'Naranja', 'Pera']
const filter = (q: string) => (q ? FRUITS.filter((f) => f.toLowerCase().includes(q.toLowerCase())) : [])

const q = <T extends Element = HTMLElement>(c: ParentNode, sel: string) => c.querySelector(sel) as T
const root = (c: ParentNode) => q(c, '.mk-search')
const bar = (c: ParentNode) => q<HTMLDivElement>(c, '.mk-search > .mk-search-bar')
const input = (c: ParentNode) => q<HTMLInputElement>(c, '.mk-search > .mk-search-bar > .mk-search-input')
const listbox = (c: ParentNode) => q<HTMLUListElement>(c, '[role="listbox"]')
const options = (c: ParentNode) => [...c.querySelectorAll<HTMLElement>('[role="option"]')]
const popup = (c: ParentNode) => q<HTMLDivElement>(c, '.mk-search-results')
const dialog = (c: ParentNode) => q<HTMLDialogElement>(c, '.mk-search-view')
const viewInput = (c: ParentNode) => q<HTMLInputElement>(c, '.mk-search-view .mk-search-input')
const status = (c: ParentNode) => q(c, '[role="status"]')
const popoverOpen = (el: Element) => el.matches(':popover-open')
const ad = (el: Element) => el.getAttribute('aria-activedescendant')

/** Valor de un token en la raíz. */
const token = (name: string) => style(document.documentElement).getPropertyValue(name).trim()
/** Un token de longitud en px. */
function tokenPx(name: string): number {
  const probe = document.createElement('div')
  probe.style.height = `var(${name})`
  document.body.append(probe)
  const value = Number.parseFloat(getComputedStyle(probe).height)
  probe.remove()
  return value
}

/** Un tamaño de letra de los tokens, en px. */
function tokenFontPx(name: string): number {
  const probe = document.createElement('span')
  probe.style.fontSize = `var(${name})`
  document.body.append(probe)
  const value = Number.parseFloat(getComputedStyle(probe).fontSize)
  probe.remove()
  return value
}

/** Espera n cuadros (las animaciones por desplazamiento se aplican en el cuadro siguiente). */
const frames = (n = 2) =>
  new Promise<void>((resolve) => {
    const step = (left: number) => (left ? requestAnimationFrame(() => step(left - 1)) : resolve())
    step(n)
  })

interface HarnessProps {
  view?: SearchViewChoice
  initial?: string
  loading?: boolean
  disabledIndex?: number
  onSubmit?: (v: string) => void
  onSelect?: (v: string) => void
  onValueChange?: (v: string) => void
  leading?: boolean
}

function Harness({ view = 'docked', initial = '', loading, disabledIndex, onSubmit, onSelect, onValueChange, leading }: HarnessProps) {
  const [text, setText] = useState(initial)
  return (
    <Search
      view={view}
      value={text}
      onValueChange={(v) => {
        setText(v)
        onValueChange?.(v)
      }}
      onSubmit={onSubmit}
      onSelect={onSelect}
    >
      <SearchBar label="Buscar frutas" placeholder="Buscar">
        {leading && (
          <SearchBarLeading>
            <IconButton label="Menú"><MenuIcon /></IconButton>
          </SearchBarLeading>
        )}
      </SearchBar>
      <SearchView loading={loading}>
        {filter(text).map((f, i) => (
          <SearchSuggestion key={f} value={f.toLowerCase()} textValue={f} disabled={i === disabledIndex} />
        ))}
      </SearchView>
    </Search>
  )
}

/** Enfoca el campo con un clic y escribe. */
async function typeInto(el: HTMLInputElement, text: string) {
  await userEvent.click(el)
  await userEvent.keyboard(text)
}

describe('Search: estructura', () => {
  test('raíz <search>, campo de búsqueda con nombre y combobox APG con su listbox', async () => {
    const c = await render(<Harness />)
    // <search> es la región de búsqueda (rol search en los tres motores, sonda con Playwright del
    // 2026-11-26); los localizadores de Vitest no lo conocen, así que se mira la etiqueta.
    expect(root(c).tagName).toBe('SEARCH')
    const i = input(c)
    expect(i.type).toBe('search')
    expect(i.getAttribute('role')).toBe('combobox')
    expect(i.getAttribute('aria-label')).toBe('Buscar frutas')
    expect(i.getAttribute('aria-autocomplete')).toBe('list')
    expect(i.getAttribute('aria-expanded')).toBe('false')
    expect(i.getAttribute('aria-controls')).toBe(listbox(c).id)
    expect(i.getAttribute('autocomplete')).toBe('off')
    expect(listbox(c).getAttribute('aria-label')).toBe('Buscar frutas')
    expect(ad(i)).toBeNull()
  })

  test('sin SearchView es un campo de búsqueda común: sin combobox, Enter busca', async () => {
    const onSubmit = vi.fn()
    const c = await render(
      <Search onSubmit={onSubmit}>
        <SearchBar label="Buscar en el sitio" />
      </Search>,
    )
    const i = input(c)
    expect(i.hasAttribute('role')).toBe(false)
    expect(i.hasAttribute('aria-expanded')).toBe(false)
    await expect.element(page.getByRole('searchbox', { name: 'Buscar en el sitio' })).toBeInTheDocument()
    await typeInto(i, 'yerba{Enter}')
    expect(onSubmit).toHaveBeenCalledWith('yerba')
  })

  test('aria-labelledby nombra el campo y el listbox', async () => {
    const c = await render(
      <>
        <span id="etiqueta">Buscar en la tienda</span>
        <Search view="docked">
          <SearchBar aria-labelledby="etiqueta" />
          <SearchView />
        </Search>
      </>,
    )
    expect(input(c).getAttribute('aria-labelledby')).toBe('etiqueta')
    expect(listbox(c).getAttribute('aria-labelledby')).toBe('etiqueta')
  })
})

describe('Search docked: combobox APG', () => {
  test('escribir abre la lista anclada; las opciones empiezan sin seleccionar', async () => {
    const c = await render(<Harness />)
    await typeInto(input(c), 'ma')
    expect(input(c).getAttribute('aria-expanded')).toBe('true')
    expect(popoverOpen(popup(c))).toBe(true)
    expect(options(c).map((o) => o.textContent)).toEqual(['Mandarina', 'Manzana', 'Mango'])
    for (const o of options(c)) expect(o.getAttribute('aria-selected')).toBe('false')
    expect(ad(input(c))).toBeNull()
  })

  test('las flechas mueven la activa con aria-activedescendant, con vuelta, y el foco se queda en el input', async () => {
    const c = await render(<Harness />)
    await typeInto(input(c), 'ma')
    const [a, b, d] = options(c)
    await userEvent.keyboard('{ArrowDown}')
    expect(ad(input(c))).toBe(a?.id)
    expect(a?.getAttribute('aria-selected')).toBe('true')
    expect(a?.hasAttribute('data-active')).toBe(true)
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    expect(ad(input(c))).toBe(d?.id)
    expect(a?.getAttribute('aria-selected')).toBe('false')
    await userEvent.keyboard('{ArrowDown}')
    expect(ad(input(c))).toBe(a?.id)
    await userEvent.keyboard('{ArrowUp}')
    expect(ad(input(c))).toBe(d?.id)
    await userEvent.keyboard('{ArrowUp}')
    expect(ad(input(c))).toBe(b?.id)
    expect(document.activeElement).toBe(input(c))
  })

  test('Enter elige la activa: onSelect con su value, su texto en la barra y la lista se cierra', async () => {
    const onSelect = vi.fn()
    const onSubmit = vi.fn()
    const c = await render(<Harness onSelect={onSelect} onSubmit={onSubmit} />)
    await typeInto(input(c), 'man')
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(onSelect).toHaveBeenCalledWith('manzana')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(input(c).value).toBe('Manzana')
    expect(input(c).getAttribute('aria-expanded')).toBe('false')
    expect(ad(input(c))).toBeNull()
    await expect.poll(() => popoverOpen(popup(c))).toBe(false)
  })

  test('Enter sin activa busca el texto (onSubmit) y cierra', async () => {
    const onSubmit = vi.fn()
    const c = await render(<Harness onSubmit={onSubmit} />)
    await typeInto(input(c), 'ma{Enter}')
    expect(onSubmit).toHaveBeenCalledWith('ma')
    expect(input(c).getAttribute('aria-expanded')).toBe('false')
  })

  test('Escape cierra la lista y, cerrada, borra el texto', async () => {
    const onValueChange = vi.fn()
    const c = await render(<Harness onValueChange={onValueChange} />)
    await typeInto(input(c), 'ma{ArrowDown}')
    await userEvent.keyboard('{Escape}')
    expect(input(c).getAttribute('aria-expanded')).toBe('false')
    expect(ad(input(c))).toBeNull()
    expect(input(c).value).toBe('ma')
    await userEvent.keyboard('{Escape}')
    expect(input(c).value).toBe('')
    expect(onValueChange).toHaveBeenLastCalledWith('')
  })

  test('Escape con la lista abierta no llega a un diálogo que la contiene (no lo cierra)', async () => {
    const c = await render(<Harness initial="ma" />)
    await userEvent.click(input(c))
    const e = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    input(c).dispatchEvent(e)
    expect(e.defaultPrevented).toBe(true)
  })

  test('Alt+Flecha abajo abre sin activar; Alt+Flecha arriba cierra', async () => {
    const c = await render(<Harness initial="ma" />)
    input(c).focus()
    expect(input(c).getAttribute('aria-expanded')).toBe('false')
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}')
    expect(input(c).getAttribute('aria-expanded')).toBe('true')
    expect(ad(input(c))).toBeNull()
    await userEvent.keyboard('{Alt>}{ArrowUp}{/Alt}')
    expect(input(c).getAttribute('aria-expanded')).toBe('false')
  })

  test('cerrada, Flecha abajo abre en la primera y Flecha arriba en la última', async () => {
    const c = await render(<Harness initial="ma" />)
    input(c).focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(input(c).getAttribute('aria-expanded')).toBe('true')
    expect(ad(input(c))).toBe(options(c)[0]?.id)
    await userEvent.keyboard('{Escape}{ArrowUp}')
    expect(ad(input(c))).toBe(options(c)[2]?.id)
  })

  test('las deshabilitadas se saltean y no se eligen con un clic', async () => {
    const onSelect = vi.fn()
    const c = await render(<Harness initial="ma" disabledIndex={1} onSelect={onSelect} />)
    input(c).focus()
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    expect(options(c)[1]?.getAttribute('aria-disabled')).toBe('true')
    expect(ad(input(c))).toBe(options(c)[2]?.id)
    // force: Playwright espera a que un elemento con aria-disabled se habilite.
    await userEvent.click(options(c)[1] as HTMLElement, { force: true })
    expect(onSelect).not.toHaveBeenCalled()
  })

  test('las flechas de los costados (volver a editar) sueltan la activa', async () => {
    const c = await render(<Harness />)
    await typeInto(input(c), 'ma{ArrowDown}')
    expect(ad(input(c))).not.toBeNull()
    await userEvent.keyboard('{ArrowLeft}')
    expect(ad(input(c))).toBeNull()
    expect(input(c).getAttribute('aria-expanded')).toBe('true')
  })

  test('escribir suelta la activa', async () => {
    const c = await render(<Harness />)
    await typeInto(input(c), 'ma{ArrowDown}')
    await userEvent.keyboard('n')
    expect(ad(input(c))).toBeNull()
  })

  test('un clic en una sugerencia la elige sin sacarle el foco al input', async () => {
    const onSelect = vi.fn()
    const c = await render(<Harness onSelect={onSelect} />)
    await typeInto(input(c), 'ma')
    await userEvent.click(options(c)[2] as HTMLElement)
    expect(onSelect).toHaveBeenCalledWith('mango')
    expect(input(c).value).toBe('Mango')
    expect(document.activeElement).toBe(input(c))
    expect(input(c).getAttribute('aria-expanded')).toBe('false')
  })

  test('el puntero sobre una sugerencia muestra la capa de hover (8 %) sin activarla', async () => {
    const c = await render(<Harness />)
    await typeInto(input(c), 'ma')
    const o = options(c)[1] as HTMLElement
    await userEvent.hover(o)
    await expect
      .poll(() => Number(style(o.querySelector('.mk-state-layer')).opacity))
      .toBeCloseTo(Number(token('--md-sys-state-hover-state-layer-opacity')), 2)
    expect(ad(input(c))).toBeNull()
  })

  test('la activa: capa de foco (10 %), anillo visible y radio 16 (como el foco de una fila)', async () => {
    const c = await render(<Harness />)
    await typeInto(input(c), 'ma{ArrowDown}')
    const o = options(c)[0] as HTMLElement
    expect(Number(style(o.querySelector('.mk-state-layer')).opacity)).toBeCloseTo(
      Number(token('--md-sys-state-focus-state-layer-opacity')),
      2,
    )
    expect(style(o.querySelector('.mk-focus-ring')).opacity).toBe('1')
    expect(style(o).borderTopLeftRadius).toBe(`${tokenPx('--md-sys-shape-corner-large')}px`)
  })

  test('el foco que sale de la búsqueda cierra la lista', async () => {
    const c = await render(
      <>
        <button type="button">Afuera</button>
        <Harness initial="ma" />
      </>,
    )
    await userEvent.click(input(c))
    expect(input(c).getAttribute('aria-expanded')).toBe('true')
    await userEvent.click(page.getByRole('button', { name: 'Afuera' }))
    expect(input(c).getAttribute('aria-expanded')).toBe('false')
  })

  test('grupos con nombre (role="group") y las flechas los recorren en orden', async () => {
    const c = await render(
      <Search view="docked" defaultValue="m">
        <SearchBar label="Buscar" />
        <SearchView>
          <SearchSuggestionGroup label="Recientes">
            <SearchSuggestion value="mate" />
          </SearchSuggestionGroup>
          <SearchSuggestionGroup label="Sugeridas">
            <SearchSuggestion value="mango">
              <ListItemHeadline>Mango</ListItemHeadline>
            </SearchSuggestion>
          </SearchSuggestionGroup>
        </SearchView>
      </Search>,
    )
    input(c).focus()
    await userEvent.keyboard('{ArrowDown}')
    await expect.element(page.getByRole('group', { name: 'Recientes' })).toBeInTheDocument()
    const group = page.getByRole('group', { name: 'Sugeridas' })
    await expect.element(group.getByRole('option', { name: 'Mango' })).toBeInTheDocument()
    await userEvent.keyboard('{ArrowDown}')
    expect(document.getElementById(ad(input(c)) ?? '')?.textContent).toBe('Mango')
    expect(listbox(c).children[0]?.getAttribute('role')).toBe('none')
    expect(listbox(c).children[0]?.firstElementChild?.getAttribute('role')).toBe('group')
  })
})

describe('Search: datos, envío, carga y vacío', () => {
  test('controlado: el texto es el de value; onValueChange recibe lo escrito', async () => {
    const onValueChange = vi.fn()
    const c = await render(
      <Search value="fijo" onValueChange={onValueChange}>
        <SearchBar label="Buscar" />
      </Search>,
    )
    await typeInto(input(c), 'x')
    expect(onValueChange).toHaveBeenCalledWith('fijox')
    expect(input(c).value).toBe('fijo')
  })

  test('no controlado (defaultValue) y botón de borrar mientras hay texto', async () => {
    const onValueChange = vi.fn()
    const c = await render(
      <Search defaultValue="pe" onValueChange={onValueChange}>
        <SearchBar label="Buscar" />
      </Search>,
    )
    expect(input(c).value).toBe('pe')
    const clear = page.getByRole('button', { name: 'Borrar búsqueda' })
    await userEvent.click(clear)
    expect(input(c).value).toBe('')
    expect(onValueChange).toHaveBeenCalledWith('')
    expect(document.activeElement).toBe(input(c))
    expect(c.querySelector('.mk-search-bar-clear')).toBeNull()
  })

  test('dentro de un <form>, Enter envía el formulario con el texto (name) y avisa onSubmit', async () => {
    const onSubmit = vi.fn()
    const sent: string[] = []
    const c = await render(
      <form
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault()
          sent.push(String(new FormData(e.currentTarget).get('q')))
        }}
      >
        <Search onSubmit={onSubmit}>
          <SearchBar label="Buscar" name="q" />
        </Search>
      </form>,
    )
    await typeInto(input(c), 'pera{Enter}')
    expect(onSubmit).toHaveBeenCalledWith('pera')
    expect(sent).toEqual(['pera'])
  })

  test('Enter sobre una sugerencia no envía el formulario', async () => {
    const submit = vi.fn((e: FormEvent) => e.preventDefault())
    const c = await render(
      <form onSubmit={submit}>
        <Harness />
      </form>,
    )
    await typeInto(input(c), 'ma{ArrowDown}{Enter}')
    expect(submit).not.toHaveBeenCalled()
  })

  test('carga: barra de progreso con nombre, la lista abierta sin opciones y "Buscando…" anunciado', async () => {
    const c = await render(<Harness initial="zz" loading />)
    await userEvent.click(input(c))
    expect(input(c).getAttribute('aria-expanded')).toBe('true')
    await expect.element(page.getByRole('progressbar', { name: 'Buscando…' })).toBeInTheDocument()
    expect(popup(c).contains(c.querySelector('[role="progressbar"]'))).toBe(true)
    await expect.poll(() => status(c).textContent).toBe('Buscando…')
  })

  test('vacío: "Sin resultados" visible y anunciado', async () => {
    const c = await render(<Harness />)
    await typeInto(input(c), 'zz')
    expect(input(c).getAttribute('aria-expanded')).toBe('true')
    expect(q(popup(c), '.mk-search-empty').textContent).toBe('Sin resultados')
    expect(options(c)).toHaveLength(0)
    await expect.poll(() => status(c).textContent).toBe('Sin resultados')
  })

  test('sin texto ni sugerencias la lista no se abre', async () => {
    const c = await render(<Harness />)
    await userEvent.click(input(c))
    expect(input(c).getAttribute('aria-expanded')).toBe('false')
    expect(popoverOpen(popup(c))).toBe(false)
  })

  test('región viva cortés: la cantidad, medio segundo después del último cambio', async () => {
    const c = await render(<Harness />)
    const region = status(c)
    expect(region.getAttribute('role')).toBe('status')
    // Fuera de la capa: existe antes de que cambie el texto.
    expect(popup(c).contains(region)).toBe(false)
    await typeInto(input(c), 'ma')
    expect(region.textContent).toBe('')
    await expect.poll(() => region.textContent).toBe('3 sugerencias')
    // "mand": solo Mandarina.
    await userEvent.keyboard('nd')
    await frames(3)
    // Todavía no cambió: espera a que se deje de escribir.
    expect(region.textContent).toBe('3 sugerencias')
    await expect.poll(() => region.textContent).toBe('1 sugerencia')
    await userEvent.keyboard('x')
    await expect.poll(() => region.textContent).toBe('Sin resultados')
    // Al cerrar se vacía enseguida.
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => region.textContent).toBe('')
  })
})

describe('Search docked: medidas y colores (kit)', () => {
  test('barra de 56, píldora, Surface Container High; texto Body Large On Surface; caret Primary', async () => {
    const c = await render(<Harness />)
    const b = bar(c)
    expect(b.getBoundingClientRect().height).toBeCloseTo(56, 2)
    expect(Number.parseFloat(style(b).borderTopLeftRadius)).toBeGreaterThanOrEqual(28)
    expect(style(b).backgroundColor).toBe(roleColor('surface-container-high'))
    const i = input(c)
    expect(style(i).color).toBe(roleColor('on-surface'))
    expect(Number.parseFloat(style(i).fontSize)).toBeCloseTo(tokenFontPx('--md-sys-typescale-body-large-size'), 2)
    expect(style(i).caretColor).toBe(roleColor('primary'))
  })

  test('texto de ayuda en On Surface Variant', async () => {
    const c = await render(<Harness />)
    expect(getComputedStyle(input(c), '::placeholder').color).toBe(roleColor('on-surface-variant'))
  })

  test('el texto a 20 del borde sin inicio (4 + 16) y a 4 del área de 48 del inicio', async () => {
    const c = await render(<Harness />)
    expect(input(c).getBoundingClientRect().left - bar(c).getBoundingClientRect().left + 16).toBeCloseTo(20, 2)
    expect(style(input(c)).paddingInlineStart).toBe('16px')
    const d = await render(<Harness leading />)
    const leading = q(d, '.mk-search-bar-leading')
    expect(leading.getBoundingClientRect().width).toBeCloseTo(48, 2)
    expect(leading.getBoundingClientRect().left - bar(d).getBoundingClientRect().left).toBeCloseTo(4, 2)
    expect(style(input(d)).paddingInlineStart).toBe('4px')
  })

  test('hover sobre la barra: capa On Surface al 8 %', async () => {
    const c = await render(<Harness />)
    const layer = q(bar(c), ':scope > .mk-state-layer')
    await userEvent.hover(bar(c))
    await expect
      .poll(() => Number(style(layer).opacity))
      .toBeCloseTo(Number(token('--md-sys-state-hover-state-layer-opacity')), 2)
    expect(style(layer).backgroundColor).toBe(roleColor('on-surface'))
  })

  test('la lista: debajo de la barra a 2, del mismo ancho, radio 12, Surface Container High y sombra', async () => {
    // Más angosta que la ventana: el ancho de la lista es el de la barra, no el de la página.
    const c = await render(
      <div style={{ width: 300, marginInlineStart: 40 }}>
        <Harness />
      </div>,
    )
    await typeInto(input(c), 'ma')
    const p = popup(c)
    const a = bar(c).getBoundingClientRect()
    const r = p.getBoundingClientRect()
    expect(r.top - a.bottom).toBeCloseTo(2, 1)
    expect(r.left).toBeCloseTo(a.left, 1)
    expect(r.width).toBeCloseTo(a.width, 1)
    expect(style(p).borderTopLeftRadius).toBe('12px')
    expect(style(p).backgroundColor).toBe(roleColor('surface-container-high'))
    expect(style(p).boxShadow).not.toBe('none')
  })

  test('en RTL la lista se alinea al borde derecho de la barra', async () => {
    const c = await render(
      <div dir="rtl" style={{ width: 300, marginInlineStart: 40 }}>
        <Harness />
      </div>,
    )
    await typeInto(input(c), 'ma')
    const a = bar(c).getBoundingClientRect()
    const r = popup(c).getBoundingClientRect()
    expect(r.right).toBeCloseTo(a.right, 1)
    expect(r.width).toBeCloseTo(a.width, 1)
  })

  test('ancho fluido con un máximo de 720 (Compose SearchBarMaxWidth)', async () => {
    const c = await render(
      <div style={{ width: 300 }}>
        <Harness />
      </div>,
    )
    expect(root(c).getBoundingClientRect().width).toBeCloseTo(300, 1)
    expect(style(root(c)).maxInlineSize).toBe('720px')
  })

  test('deshabilitada: no abre y el contenido queda al 38 %', async () => {
    const c = await render(
      <Search view="docked" defaultValue="ma">
        <SearchBar label="Buscar" disabled />
        <SearchView>
          <SearchSuggestion value="mango" />
        </SearchView>
      </Search>,
    )
    input(c).dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(input(c).getAttribute('aria-expanded')).toBe('false')
    expect(Number(style(input(c)).opacity)).toBeCloseTo(Number(token('--md-sys-state-disabled-content-opacity')), 2)
    expect(c.querySelector('.mk-search-bar-clear')).toBeNull()
  })
})

describe('Search a pantalla completa (modal)', () => {
  test('la barra es un combobox que abre un diálogo; el diálogo es modal con su propio combobox', async () => {
    const c = await render(<Harness view="full-screen" />)
    const i = input(c)
    expect(i.getAttribute('role')).toBe('combobox')
    expect(i.getAttribute('aria-haspopup')).toBe('dialog')
    expect(i.getAttribute('aria-controls')).toBe(dialog(c).id)
    expect(i.getAttribute('aria-expanded')).toBe('false')
    await userEvent.click(i)
    expect(dialog(c).open).toBe(true)
    expect(dialog(c).matches(':modal')).toBe(true)
    expect(i.getAttribute('aria-expanded')).toBe('true')
    await expect.element(page.getByRole('dialog', { name: 'Buscar frutas' })).toBeInTheDocument()
    const v = viewInput(c)
    expect(document.activeElement).toBe(v)
    expect(v.getAttribute('role')).toBe('combobox')
    expect(v.getAttribute('aria-controls')).toBe(listbox(c).id)
    expect(v.getAttribute('aria-expanded')).toBe('true')
    expect(v.getAttribute('aria-label')).toBe('Buscar frutas')
    expect(v.hasAttribute('name')).toBe(false)
    expect(dialog(c).contains(listbox(c))).toBe(true)
  })

  test('escribir en la barra abre la vista con el texto y el cursor al final', async () => {
    const c = await render(<Harness view="full-screen" />)
    input(c).focus()
    await userEvent.keyboard('m')
    expect(dialog(c).open).toBe(true)
    const v = viewInput(c)
    expect(document.activeElement).toBe(v)
    expect(v.value).toBe('m')
    expect(v.selectionStart).toBe(1)
  })

  test('en la vista: flechas, Enter elige, se cierra y el foco vuelve a la barra con el texto', async () => {
    const onSelect = vi.fn()
    const c = await render(<Harness view="full-screen" onSelect={onSelect} />)
    await userEvent.click(input(c))
    await userEvent.keyboard('ma{ArrowDown}{ArrowDown}')
    expect(ad(viewInput(c))).toBe(options(c)[1]?.id)
    expect(options(c)[1]?.getAttribute('aria-selected')).toBe('true')
    await userEvent.keyboard('{ArrowUp}{ArrowUp}')
    expect(ad(viewInput(c))).toBe(options(c)[2]?.id)
    await userEvent.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith('mango')
    await expect.poll(() => dialog(c).open).toBe(false)
    expect(input(c).value).toBe('Mango')
    expect(document.activeElement).toBe(input(c))
  })

  test('Escape cierra la vista (con el texto) y el foco vuelve a la barra; otro Escape borra', async () => {
    const c = await render(<Harness view="full-screen" />)
    await userEvent.click(input(c))
    await userEvent.keyboard('pe{Escape}')
    await expect.poll(() => dialog(c).open).toBe(false)
    expect(document.activeElement).toBe(input(c))
    expect(input(c).value).toBe('pe')
    expect(input(c).getAttribute('aria-expanded')).toBe('false')
    await userEvent.keyboard('{Escape}')
    expect(input(c).value).toBe('')
  })

  test('el botón de volver cierra; la salida espera la transición (data-closing) y no se traba', async () => {
    await withTransitions(async () => {
      const c = await render(<Harness view="full-screen" />)
      await userEvent.click(input(c))
      await Promise.allSettled(dialog(c).getAnimations().map((a) => a.finished))
      await userEvent.click(page.getByRole('button', { name: 'Cerrar búsqueda' }))
      await expect.poll(() => dialog(c).hasAttribute('data-closing')).toBe(true)
      expect(dialog(c).open).toBe(true)
      await expect.poll(() => dialog(c).open).toBe(false)
      expect(dialog(c).hasAttribute('data-closing')).toBe(false)
    })
  })

  test('un clic en una sugerencia de la vista la elige y cierra', async () => {
    const onSelect = vi.fn()
    const c = await render(<Harness view="full-screen" initial="pe" onSelect={onSelect} />)
    await userEvent.click(input(c))
    await userEvent.click(page.getByRole('option', { name: 'Pera' }))
    expect(onSelect).toHaveBeenCalledWith('pera')
    await expect.poll(() => dialog(c).open).toBe(false)
  })

  test('borrar dentro de la vista vacía el texto y enfoca su campo', async () => {
    const c = await render(<Harness view="full-screen" initial="pe" />)
    await userEvent.click(input(c))
    await userEvent.click(q<HTMLButtonElement>(dialog(c), '.mk-search-bar-clear button'))
    expect(viewInput(c).value).toBe('')
    expect(document.activeElement).toBe(viewInput(c))
  })

  // El recorrido con Tab entre botones: WebKit en macOS no lleva el foco a los botones con Tab
  // (ajuste del sistema; ver CLAUDE.md). En el WebKit de Linux del CI corre.
  test('Tab queda atrapado en la vista (da la vuelta)', async () => {
    const c = await render(
      <>
        <Harness view="full-screen" initial="pe" />
        <button type="button">Afuera</button>
      </>,
    )
    await userEvent.click(input(c))
    const seen = new Set<Element | null>()
    for (let n = 0; n < 5; n++) {
      await userEvent.tab()
      seen.add(document.activeElement)
      expect(dialog(c).contains(document.activeElement)).toBe(true)
    }
    // Volver, el campo y borrar.
    expect(seen.size).toBe(3)
  })

  test('Enter en la vista envía el formulario de la barra con su texto', async () => {
    const sent: string[] = []
    const c = await render(
      <form
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault()
          sent.push(String(new FormData(e.currentTarget).get('q')))
        }}
      >
        <Search view="full-screen" defaultValue="">
          <SearchBar label="Buscar" name="q" />
          <SearchView />
        </Search>
      </form>,
    )
    await userEvent.click(input(c))
    await userEvent.keyboard('uva{Enter}')
    expect(sent).toEqual(['uva'])
    await expect.poll(() => dialog(c).open).toBe(false)
  })

  test('la región viva vive dentro del diálogo (fuera quedaría inerte)', async () => {
    const c = await render(<Harness view="full-screen" initial="ma" />)
    await userEvent.click(input(c))
    expect(dialog(c).contains(status(c))).toBe(true)
    await expect.poll(() => status(c).textContent).toBe('3 sugerencias')
  })

  test('medidas: ocupa la ventana, Surface Container Low, barra a 12 de los lados y 4 arriba, lista a 2 con radio 12', async () => {
    const c = await render(<Harness view="full-screen" initial="ma" />)
    await userEvent.click(input(c))
    const d = dialog(c)
    // Sin la animación de entrada de la barra (FLIP, Web Animations: no la quita render.tsx).
    for (const a of d.getAnimations({ subtree: true })) a.finish()
    const r = d.getBoundingClientRect()
    expect(r.width).toBeCloseTo(document.documentElement.clientWidth, 0)
    expect(r.height).toBeCloseTo(window.innerHeight, 0)
    expect(style(d).backgroundColor).toBe(roleColor('surface-container-low'))
    const viewBar = q(d, '.mk-search-bar').getBoundingClientRect()
    expect(viewBar.left - r.left).toBeCloseTo(12, 1)
    expect(r.right - viewBar.right).toBeCloseTo(12, 1)
    expect(viewBar.top - r.top).toBeCloseTo(4, 1)
    expect(viewBar.height).toBeCloseTo(56, 1)
    const results = q(d, '.mk-search-view-results')
    expect(results.getBoundingClientRect().top - viewBar.bottom).toBeCloseTo(2, 1)
    expect(style(results).borderTopLeftRadius).toBe('12px')
    expect(style(q(d, '.mk-search-bar')).backgroundColor).toBe(roleColor('surface-container-high'))
  })

  test('RTL: la flecha de volver apunta al otro lado', async () => {
    const c = await render(
      <div dir="rtl">
        <Harness view="full-screen" />
      </div>,
    )
    await userEvent.click(input(c))
    expect(style(q(dialog(c), '.mk-search-view-close > .mk-icon')).scale).toBe('-1 1')
  })

  test('la barra de la vista sale del lugar de la barra (FLIP con el resorte); con movimiento reducido, sin desplazamiento', async () => {
    await withTransitions(async () => {
      const c = await render(
        <div style={{ paddingTop: 200, paddingInline: 40 }}>
          <Harness view="full-screen" />
        </div>,
      )
      const from = bar(c).getBoundingClientRect()
      await userEvent.click(input(c))
      const viewBar = q(dialog(c), '.mk-search-bar')
      const [anim] = viewBar.getAnimations()
      expect(anim).toBeDefined()
      anim?.pause()
      if (anim) anim.currentTime = 0
      const start = viewBar.getBoundingClientRect()
      expect(start.top).toBeCloseTo(from.top, 0)
      expect(start.width).toBeCloseTo(from.width, 0)
      expect((anim?.effect as KeyframeEffect).getComputedTiming().duration).toBe(
        Number.parseFloat(token('--md-sys-motion-spring-fast-spatial-duration')),
      )
      anim?.finish()
      await userEvent.keyboard('{Escape}')
      await expect.poll(() => dialog(c).open).toBe(false)

      await commands.reduceMotion(true)
      await userEvent.click(input(c))
      expect(q(dialog(c), '.mk-search-bar').getAnimations()).toHaveLength(0)
    })
  })
})

describe('Search: vista por el ancho de la ventana', () => {
  test('auto: a pantalla completa bajo 600 px y docked desde 600', async () => {
    const width = window.innerWidth
    const height = window.innerHeight
    try {
      await page.viewport(400, 700)
      const c = await render(<Harness view="auto" initial="ma" />)
      expect(root(c).dataset['view']).toBe('full-screen')
      expect(input(c).getAttribute('aria-haspopup')).toBe('dialog')
      await page.viewport(800, 700)
      await expect.poll(() => root(c).dataset['view']).toBe('docked')
      expect(input(c).hasAttribute('aria-haspopup')).toBe(false)
      expect(input(c).getAttribute('aria-controls')).toBe(listbox(c).id)
    } finally {
      await page.viewport(width, height)
    }
  })

  test('cambiar de vista con la lista abierta la cierra', async () => {
    const width = window.innerWidth
    const height = window.innerHeight
    try {
      await page.viewport(800, 700)
      const c = await render(<Harness view="auto" initial="ma" />)
      await userEvent.click(input(c))
      expect(input(c).getAttribute('aria-expanded')).toBe('true')
      await page.viewport(400, 700)
      await expect.poll(() => root(c).dataset['view']).toBe('full-screen')
      // El cierre puede asentarse un cuadro después del cambio de vista: con la suite completa
      // cargada, leerlo en el acto fallaba de vez en cuando (visto el 2026-11-26).
      await expect.poll(() => input(c).getAttribute('aria-expanded')).toBe('false')
      await expect.poll(() => dialog(c).open).toBe(false)
    } finally {
      await page.viewport(width, height)
    }
  })
})

describe('Search dentro del TopAppBar', () => {
  function InBar({ children }: { children?: ReactNode }) {
    return (
      <div className="scroller" style={{ height: 300, overflow: 'auto' }}>
        <TopAppBar>
          <TopAppBarLeading>
            <IconButton label="Volver"><ArrowBackIcon /></IconButton>
          </TopAppBarLeading>
          <Search view="docked">
            <SearchBar label="Buscar en la bandeja" />
            {children}
          </Search>
          <TopAppBarActions>
            <IconButton label="Más"><MoreVertIcon /></IconButton>
          </TopAppBarActions>
        </TopAppBar>
        <div style={{ height: 1200 }} />
      </div>
    )
  }

  test('en el lugar del título: la barra superior sigue en 64, 4 arriba y 8 a los lados del inicio y las acciones', async () => {
    const c = await render(<InBar />)
    const header = q(c, '.mk-top-app-bar')
    const h = header.getBoundingClientRect()
    expect(h.height).toBeCloseTo(64, 1)
    const b = bar(c).getBoundingClientRect()
    expect(b.height).toBeCloseTo(56, 1)
    expect(b.top - h.top).toBeCloseTo(4, 1)
    expect(b.left - q(c, '.mk-top-app-bar-leading').getBoundingClientRect().right).toBeCloseTo(8, 1)
    expect(q(c, '.mk-top-app-bar-actions').getBoundingClientRect().left - b.right).toBeCloseTo(8, 1)
  })

  test('Surface Container en reposo y Surface Container Highest al desplazar', async () => {
    const c = await render(<InBar />)
    const scroller = q(c, '.scroller')
    expect(style(bar(c)).backgroundColor).toBe(roleColor('surface-container'))
    scroller.scrollTop = 100
    await frames(3)
    await expect.poll(() => style(bar(c)).backgroundColor).toBe(roleColor('surface-container-highest'))
    scroller.scrollTop = 0
    await frames(3)
    await expect.poll(() => style(bar(c)).backgroundColor).toBe(roleColor('surface-container'))
  })

  test('las sugerencias se anclan a la barra dentro del TopAppBar', async () => {
    const c = await render(
      <InBar>
        <SearchView>
          <SearchSuggestion value="mango" />
        </SearchView>
      </InBar>,
    )
    await userEvent.click(input(c))
    await expect.poll(() => popoverOpen(popup(c))).toBe(true)
    expect(popup(c).getBoundingClientRect().top - bar(c).getBoundingClientRect().bottom).toBeCloseTo(2, 1)
  })
})

describe('Search: props nativas y ref', () => {
  test('SearchBar: props nativas y ref al input; className y style a la píldora; partes de inicio y final', async () => {
    const inputRef = createRef<HTMLInputElement>()
    const rootRef = createRef<HTMLElement>()
    const listRef = createRef<HTMLUListElement>()
    const onFocus = vi.fn()
    const c = await render(
      <Search ref={rootRef} className="raiz" data-x="r" view="docked">
        <SearchBar
          label="Buscar"
          ref={inputRef}
          name="q"
          maxLength={20}
          data-testid="campo"
          onFocus={onFocus}
          className="pildora"
          style={{ marginTop: 3 }}
        >
          <SearchBarLeading data-parte="inicio"><SearchIcon /></SearchBarLeading>
          <SearchBarTrailing data-parte="final">
            <IconButton label="Voz"><MenuIcon /></IconButton>
          </SearchBarTrailing>
        </SearchBar>
        <SearchView ref={listRef} data-lista="si" className="capa" />
      </Search>,
    )
    expect(inputRef.current).toBe(input(c))
    expect(input(c).name).toBe('q')
    expect(input(c).maxLength).toBe(20)
    expect(input(c).dataset['testid']).toBe('campo')
    input(c).focus()
    expect(onFocus).toHaveBeenCalled()
    expect(bar(c).classList.contains('pildora')).toBe(true)
    expect(bar(c).style.marginTop).toBe('3px')
    expect(rootRef.current).toBe(root(c))
    expect(root(c).classList.contains('raiz')).toBe(true)
    expect(root(c).dataset['x']).toBe('r')
    expect(listRef.current).toBe(listbox(c))
    expect(listbox(c).dataset['lista']).toBe('si')
    expect(popup(c).classList.contains('capa')).toBe(true)
    expect(q(c, '[data-parte="inicio"]').classList.contains('mk-search-bar-leading')).toBe(true)
    expect(q(c, '[data-parte="final"]').classList.contains('mk-search-bar-trailing')).toBe(true)
  })

  test('las partes fuera de <Search> avisan con un error claro', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(render(<SearchBar label="Buscar" />)).rejects.toThrow('SearchBar tiene que estar dentro de un <Search>.')
    spy.mockRestore()
  })

  test('SearchSuggestion: ref y props nativas al <li role="option">', async () => {
    const ref = createRef<HTMLLIElement>()
    const c = await render(
      <Search view="docked">
        <SearchBar label="Buscar" />
        <SearchView>
          <SearchSuggestion ref={ref} value="a" data-y="1" title="Sugerencia" />
        </SearchView>
      </Search>,
    )
    expect(ref.current).toBe(options(c)[0])
    expect(ref.current?.dataset['y']).toBe('1')
    expect(ref.current?.title).toBe('Sugerencia')
    expect(ref.current?.classList.contains('mk-list-item')).toBe(true)
  })
})

describe('Search: anillo de foco solo con teclado', () => {
  /** Opacidad del anillo de la píldora (la de afuera, o la de la vista). */
  const ring = (pill: Element) => style(pill.querySelector(':scope > .mk-focus-ring')).opacity
  const viewBar = (c: ParentNode) => q(dialog(c), '.mk-search-bar')
  /** Un toque: pointerdown táctil y el clic que le sigue (como lo despacha el navegador). */
  function tap(el: HTMLElement) {
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', isPrimary: true }))
    el.focus()
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }

  test('un clic en el campo no muestra el anillo', async () => {
    const c = await render(<Harness />)
    await userEvent.click(input(c))
    expect(document.activeElement).toBe(input(c))
    expect(ring(bar(c))).toBe('0')
    expect(root(c).hasAttribute('data-pointer-focus')).toBe(true)
  })

  // WebKit en macOS: Tab sí llega a un campo de texto (ver CLAUDE.md, solo los botones y las casillas
  // quedan afuera).
  test('el foco por teclado (Tab) muestra el anillo', async () => {
    const c = await render(<Harness />)
    await userEvent.tab()
    expect(document.activeElement).toBe(input(c))
    expect(ring(bar(c))).toBe('1')
  })

  test('un toque no muestra el anillo', async () => {
    const c = await render(<Harness />)
    tap(input(c))
    expect(document.activeElement).toBe(input(c))
    expect(ring(bar(c))).toBe('0')
  })

  test('después de un clic, escribir no lo muestra y una tecla de navegación sí', async () => {
    const c = await render(<Harness />)
    await userEvent.click(input(c))
    await userEvent.keyboard('ma{ArrowLeft}{Backspace}')
    expect(ring(bar(c))).toBe('0')
    await userEvent.keyboard('{ArrowDown}')
    expect(ring(bar(c))).toBe('1')
  })

  test('salir de la búsqueda con un clic y volver con Tab muestra el anillo', async () => {
    const c = await render(
      <>
        {/* Antes de la búsqueda: Tab sigue desde el punto del clic (Chrome). */}
        <p className="afuera">Afuera</p>
        <Harness />
      </>,
    )
    await userEvent.click(input(c))
    await userEvent.click(q(c, '.afuera'))
    expect(document.activeElement).not.toBe(input(c))
    await userEvent.tab()
    expect(document.activeElement).toBe(input(c))
    expect(ring(bar(c))).toBe('1')
  })

  test('el botón de borrar con un clic devuelve el foco al campo sin anillo', async () => {
    const c = await render(<Harness initial="ma" />)
    await userEvent.click(input(c))
    await userEvent.click(page.getByRole('button', { name: 'Borrar búsqueda' }))
    expect(document.activeElement).toBe(input(c))
    expect(ring(bar(c))).toBe('0')
  })

  test('la vista a pantalla completa abierta con un toque: su barra sin anillo; una flecha lo muestra', async () => {
    const c = await render(<Harness view="full-screen" initial="ma" />)
    tap(input(c))
    await expect.poll(() => dialog(c).open).toBe(true)
    expect(document.activeElement).toBe(viewInput(c))
    expect(ring(viewBar(c))).toBe('0')
    await userEvent.keyboard('{ArrowDown}')
    expect(ring(viewBar(c))).toBe('1')
  })

  test('la vista abierta con el teclado muestra el anillo; cerrada con Escape, la barra también', async () => {
    const c = await render(<Harness view="full-screen" initial="ma" />)
    await userEvent.tab()
    await userEvent.keyboard('{ArrowDown}')
    expect(dialog(c).open).toBe(true)
    expect(ring(viewBar(c))).toBe('1')
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => dialog(c).open).toBe(false)
    expect(document.activeElement).toBe(input(c))
    expect(ring(bar(c))).toBe('1')
  })

  test('cerrada con el botón de volver (clic), la barra recibe el foco sin anillo', async () => {
    const c = await render(<Harness view="full-screen" />)
    await userEvent.click(input(c))
    await userEvent.click(q(dialog(c), '.mk-search-view-close'))
    await expect.poll(() => dialog(c).open).toBe(false)
    expect(document.activeElement).toBe(input(c))
    expect(ring(bar(c))).toBe('0')
  })

  test('dentro del TopAppBar: clic sin anillo, teclado con anillo', async () => {
    const c = await render(
      <TopAppBar scrollBehavior="none">
        <Search>
          <SearchBar label="Buscar en la barra" />
        </Search>
      </TopAppBar>,
    )
    await userEvent.click(input(c))
    expect(ring(bar(c))).toBe('0')
    await userEvent.keyboard('{Escape}')
    expect(ring(bar(c))).toBe('1')
  })

  test('el foco por script sin puntero (autoFocus, .focus()) muestra el anillo', async () => {
    const c = await render(<Harness />)
    // focusVisible: WebKit no aplica :focus-visible con un .focus() común; acá no hace falta (la
    // regla mira :focus), se pasa igual para que el caso sea el de un foco de teclado en los tres.
    input(c).focus(server.browser === 'webkit' ? ({ focusVisible: true } as FocusOptions) : undefined)
    expect(ring(bar(c))).toBe('1')
  })
})

describe('Search: quitar sugerencias (onRemove)', () => {
  /** Recientes que el uso guarda y quita (controlado); `keep` simula un uso que no la saca. */
  function Recents({ initial = ['mate', 'yerba', 'bombilla'], keep = false, onRemove }: { initial?: string[]; keep?: boolean; onRemove?: (v: string) => void }) {
    const [items, setItems] = useState(initial)
    return (
      <Search view="docked">
        <SearchBar label="Buscar" />
        <SearchView>
          {items.map((r) => (
            <SearchSuggestion
              key={r}
              value={r}
              onRemove={(v) => {
                onRemove?.(v)
                if (!keep) setItems((list) => list.filter((x) => x !== v))
              }}
            />
          ))}
          <SearchSuggestion value="sin quitar" />
        </SearchView>
      </Search>
    )
  }
  const activeText = (c: ParentNode) => document.getElementById(ad(input(c)) ?? '')?.textContent ?? null

  test('Supr sobre la activa llama a su onRemove y anuncia "Se quitó …"; la activa pasa a la siguiente', async () => {
    const onRemove = vi.fn()
    const c = await render(<Recents onRemove={onRemove} />)
    await userEvent.click(input(c))
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    expect(activeText(c)).toBe('yerba')
    await userEvent.keyboard('{Delete}')
    expect(onRemove).toHaveBeenCalledTimes(1)
    expect(onRemove).toHaveBeenCalledWith('yerba')
    expect(status(c).textContent).toBe('Se quitó yerba')
    await expect.poll(() => activeText(c)).toBe('bombilla')
    expect(options(c).map((o) => o.textContent)).toEqual(['mate', 'bombilla', 'sin quitar'])
    // El cambio de cantidad que provoca no pisa el anuncio enseguida.
    await frames(3)
    expect(status(c).textContent).toBe('Se quitó yerba')
  })

  test('si era la última, la activa pasa a la anterior; si no queda ninguna, a ninguna', async () => {
    const c = await render(
      <Search view="docked">
        <SearchBar label="Buscar" />
        <SearchView>
          <RemovableList initial={['a', 'b']} />
        </SearchView>
      </Search>,
    )
    await userEvent.click(input(c))
    await userEvent.keyboard('{ArrowUp}')
    expect(activeText(c)).toBe('b')
    await userEvent.keyboard('{Delete}')
    await expect.poll(() => activeText(c)).toBe('a')
    await userEvent.keyboard('{Delete}')
    await expect.poll(() => options(c)).toHaveLength(0)
    expect(ad(input(c))).toBeNull()
  })

  test('sin onRemove, Supr con la activa no hace nada: ni quita ni borra texto del campo', async () => {
    const c = await render(<Harness initial="ma" />)
    await userEvent.click(input(c))
    input(c).setSelectionRange(0, 0)
    await userEvent.keyboard('{ArrowDown}')
    const before = ad(input(c))
    const e = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true })
    input(c).dispatchEvent(e)
    expect(e.defaultPrevented).toBe(true)
    await userEvent.keyboard('{Delete}')
    expect(input(c).value).toBe('ma')
    expect(ad(input(c))).toBe(before)
    expect(options(c)).toHaveLength(3)
  })

  test('sin sugerencia activa, Supr edita el texto como siempre; Retroceso nunca quita', async () => {
    const onRemove = vi.fn()
    const c = await render(<Recents onRemove={onRemove} />)
    await userEvent.click(input(c))
    await userEvent.keyboard('xy{ArrowLeft}{Delete}')
    expect(input(c).value).toBe('x')
    expect(onRemove).not.toHaveBeenCalled()
    await userEvent.keyboard('{Backspace}{ArrowDown}{Backspace}')
    expect(onRemove).not.toHaveBeenCalled()
  })

  test('si el uso no la saca, la activa queda donde estaba', async () => {
    const onRemove = vi.fn()
    const c = await render(<Recents keep onRemove={onRemove} />)
    await userEvent.click(input(c))
    await userEvent.keyboard('{ArrowDown}{Delete}')
    expect(onRemove).toHaveBeenCalledWith('mate')
    await frames(3)
    expect(activeText(c)).toBe('mate')
    expect(options(c)).toHaveLength(4)
  })

  test('las que se pueden quitar tienen la descripción "Supr para quitar" (oculta); las otras no', async () => {
    const c = await render(<Recents />)
    await userEvent.click(input(c))
    const [mate] = options(c)
    const plain = options(c).at(-1) as HTMLElement
    const hint = document.getElementById(mate?.getAttribute('aria-describedby') ?? '')
    expect(hint?.textContent).toBe('Supr para quitar')
    expect(hint?.hidden).toBe(true)
    expect(plain.hasAttribute('aria-describedby')).toBe(false)
    await expect.element(page.getByRole('option', { name: 'mate' })).toHaveAccessibleDescription('Supr para quitar')
  })

  test('mensajes localizables: formatRemoved y removeHint', async () => {
    const c = await render(
      <Search view="docked">
        <SearchBar label="Search" />
        <SearchView formatRemoved={(t) => `Removed ${t}`} removeHint="Delete to remove">
          <RemovableList initial={['tea']} />
        </SearchView>
      </Search>,
    )
    await userEvent.click(input(c))
    await userEvent.keyboard('{ArrowDown}')
    expect(document.getElementById(options(c)[0]?.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Delete to remove')
    await userEvent.keyboard('{Delete}')
    expect(status(c).textContent).toBe('Removed tea')
  })

  test('a pantalla completa, Supr quita dentro de la vista', async () => {
    const onRemove = vi.fn()
    const c = await render(
      <Search view="full-screen">
        <SearchBar label="Buscar" />
        <SearchView>
          <RemovableList initial={['a', 'b']} onRemove={onRemove} />
        </SearchView>
      </Search>,
    )
    await userEvent.click(input(c))
    await userEvent.keyboard('{ArrowDown}{Delete}')
    expect(onRemove).toHaveBeenCalledWith('a')
    await expect.poll(() => document.getElementById(ad(viewInput(c)) ?? '')?.textContent).toBe('b')
    expect(dialog(c).contains(status(c))).toBe(true)
    expect(status(c).textContent).toBe('Se quitó a')
  })
})

/** Sugerencias que se quitan (el uso las saca de su lista). */
function RemovableList({ initial, onRemove }: { initial: string[]; onRemove?: (v: string) => void }) {
  const [items, setItems] = useState(initial)
  return (
    <>
      {items.map((r) => (
        <SearchSuggestion
          key={r}
          value={r}
          onRemove={(v) => {
            onRemove?.(v)
            setItems((list) => list.filter((x) => x !== v))
          }}
        />
      ))}
    </>
  )
}
