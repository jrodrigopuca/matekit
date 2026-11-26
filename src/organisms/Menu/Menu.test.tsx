import { createRef, useState, type CSSProperties, type ReactNode } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { commands, userEvent } from 'vitest/browser'
import { Menu, MenuContent, MenuItem, MenuTrigger, type MenuContentProps, type MenuProps } from './Menu.tsx'
import { MenuDivider, MenuItemLeading, MenuItemTrailing } from './MenuSlots.tsx'
import { fallbackPosition, observedPlacement } from '../../internal/anchor-position.ts'
import { Button } from '../../molecules/Button/Button.tsx'
import { IconButton } from '../../molecules/IconButton/IconButton.tsx'
import { Dialog, DialogContent, DialogHeadline } from '../Dialog/Dialog.tsx'
import { CheckIcon, DeleteIcon, EditIcon, MoreVertIcon, ShareIcon } from '../../icons/icons.tsx'
import { render, roleColor, style, withMotion } from '../../test/render.tsx'
import { CANCEL_WAYS, cancelExit, entered, withTransitions } from '../../test/exit.ts'

const q = <T extends Element = HTMLElement>(c: ParentNode, sel: string) => c.querySelector(sel) as T
// El menú está en la capa superior, pero sigue en el contenedor de la prueba (es un popover).
const menu = (c: ParentNode) => q(c, '.mk-menu')
const trigger = (c: ParentNode) => q<HTMLButtonElement>(c, '[aria-haspopup="menu"]')
const items = (c: ParentNode) => [...menu(c).querySelectorAll<HTMLButtonElement>('.mk-menu-item')]
const item = (c: ParentNode, text: string) => {
  const found = items(c).find((i) => i.textContent?.trim().startsWith(text))
  if (!found) throw new Error(`no hay un elemento "${text}"`)
  return found
}
const isOpen = (c: ParentNode) => menu(c).matches(':popover-open')
const focused = () => document.activeElement?.textContent?.trim() ?? document.activeElement?.tagName
const layer = (el: Element) => style(q(el, ':scope > .mk-state-layer')).opacity

/** Color de un rol mezclado con transparente, como lo devuelve getComputedStyle. */
function mixColor(role: string, percent: number): string {
  const probe = document.createElement('span')
  probe.style.color = `color-mix(in srgb, var(--md-sys-color-${role}) ${percent}%, transparent)`
  document.body.append(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value
}

/** Valor calculado de una propiedad con un token (sombras, tipografía en rem…). */
function token(property: 'boxShadow' | 'fontSize' | 'lineHeight' | 'fontWeight', value: string): string {
  const probe = document.createElement('span')
  probe.style[property] = value
  document.body.append(probe)
  const computed = getComputedStyle(probe)[property]
  probe.remove()
  return computed
}

type BasicProps = Omit<MenuProps, 'children'> & {
  content?: Omit<MenuContentProps, 'children'>
  onEdit?: () => void
  children?: ReactNode
}

/** Menú con tres acciones (una deshabilitada fuera del medio) y botones antes y después. */
function Basic({ content, onEdit, children, ...props }: BasicProps) {
  return (
    <div style={{ padding: 40 }}>
      <button id="before">Antes</button>
      <Menu {...props}>
        <MenuTrigger>
          <IconButton label="Más opciones"><MoreVertIcon /></IconButton>
        </MenuTrigger>
        <MenuContent {...content}>
          {children ?? (
            <>
              <MenuItem onSelect={onEdit}><MenuItemLeading><EditIcon /></MenuItemLeading>Editar</MenuItem>
              <MenuItem><MenuItemLeading><ShareIcon /></MenuItemLeading>Compartir</MenuItem>
              <MenuDivider />
              <MenuItem><MenuItemLeading><DeleteIcon /></MenuItemLeading>Eliminar</MenuItem>
            </>
          )}
        </MenuContent>
      </Menu>
      <button id="after">Después</button>
      <p id="outside" style={{ position: 'fixed', right: 0, bottom: 0, margin: 0 }}>Afuera</p>
    </div>
  )
}

/** Abre con el teclado desde el disparador (el foco queda visible, :focus-visible). */
async function openWithKeyboard(c: ParentNode, key = '{ArrowDown}') {
  trigger(c).focus()
  await userEvent.keyboard(key)
  await expect.poll(() => isOpen(c)).toBe(true)
}

describe('Menu: estructura y accesibilidad', () => {
  test('el disparador es el botón del usuario, sin elementos de más, con aria-haspopup/expanded/controls', async () => {
    const c = await render(<Basic />)
    const t = trigger(c)
    expect(t.classList.contains('mk-icon-button')).toBe(true)
    expect(t.parentElement?.getAttribute('style')).toBe('padding: 40px;')
    expect(t.getAttribute('aria-haspopup')).toBe('menu')
    expect(t.getAttribute('aria-expanded')).toBe('false')
    expect(t.getAttribute('aria-controls')).toBe(menu(c).id)
    expect(t.id).not.toBe('')
    await userEvent.click(t)
    expect(t.getAttribute('aria-expanded')).toBe('true')
  })

  test('role="menu" con el nombre del disparador; menuitem y separator', async () => {
    const c = await render(<Basic />)
    const m = menu(c)
    expect(m.getAttribute('role')).toBe('menu')
    expect(m.getAttribute('aria-labelledby')).toBe(trigger(c).id)
    expect(m.getAttribute('popover')).toBe('manual')
    expect(items(c).map((i) => i.getAttribute('role'))).toEqual(['menuitem', 'menuitem', 'menuitem'])
    expect(items(c).every((i) => i.tabIndex === -1 && i.type === 'button')).toBe(true)
    expect(q(m, 'hr').getAttribute('role')).toBe('separator')
  })

  test('cerrado, el menú está oculto', async () => {
    const c = await render(<Basic />)
    expect(isOpen(c)).toBe(false)
    expect(style(menu(c)).display).toBe('none')
  })

  test('radio y checkbox: menuitemradio y menuitemcheckbox con aria-checked', async () => {
    const c = await render(
      <Basic>
        <MenuItem type="radio" selected>Nombre</MenuItem>
        <MenuItem type="radio" selected={false}>Fecha</MenuItem>
        <MenuDivider />
        <MenuItem type="checkbox" selected>Mostrar ocultos</MenuItem>
      </Basic>,
    )
    expect(items(c).map((i) => [i.getAttribute('role'), i.getAttribute('aria-checked')])).toEqual([
      ['menuitemradio', 'true'],
      ['menuitemradio', 'false'],
      ['menuitemcheckbox', 'true'],
    ])
  })

  test('el id propio del disparador se respeta y nombra al menú', async () => {
    const c = await render(
      <Menu>
        <MenuTrigger><Button id="mine">Ordenar</Button></MenuTrigger>
        <MenuContent><MenuItem>Uno</MenuItem></MenuContent>
      </Menu>,
    )
    expect(trigger(c).id).toBe('mine')
    expect(menu(c).getAttribute('aria-labelledby')).toBe('mine')
  })

  test('las partes fuera de un <Menu> avisan con un error claro', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(render(<MenuItem>Suelto</MenuItem>)).rejects.toThrow('MenuItem tiene que estar dentro de un <Menu>.')
    spy.mockRestore()
  })
})

describe('Menu: teclado en el disparador (APG menu button)', () => {
  for (const [key, label] of [['{Enter}', 'Enter'], [' ', 'Espacio'], ['{ArrowDown}', 'flecha abajo']] as const) {
    test(`${label} abre y enfoca el primer elemento`, async () => {
      const c = await render(<Basic />)
      await openWithKeyboard(c, key)
      expect(focused()).toBe('Editar')
    })
  }

  test('flecha arriba abre y enfoca el último elemento', async () => {
    const c = await render(<Basic />)
    await openWithKeyboard(c, '{ArrowUp}')
    expect(focused()).toBe('Eliminar')
  })

  test('un clic abre y enfoca el primero (sin foco visible); otro clic cierra', async () => {
    const c = await render(<Basic />)
    await userEvent.click(trigger(c))
    expect(isOpen(c)).toBe(true)
    expect(focused()).toBe('Editar')
    expect(item(c, 'Editar').matches(':focus-visible')).toBe(false)
    await userEvent.click(trigger(c))
    await expect.poll(() => isOpen(c)).toBe(false)
  })
})

describe('Menu: teclado en el menú', () => {
  test('las flechas recorren con vuelta en los dos sentidos', async () => {
    const c = await render(<Basic />)
    await openWithKeyboard(c)
    await userEvent.keyboard('{ArrowDown}')
    expect(focused()).toBe('Compartir')
    await userEvent.keyboard('{ArrowDown}')
    expect(focused()).toBe('Eliminar')
    await userEvent.keyboard('{ArrowDown}')
    expect(focused()).toBe('Editar')
    await userEvent.keyboard('{ArrowUp}')
    expect(focused()).toBe('Eliminar')
  })

  test('Inicio y Fin van a los extremos', async () => {
    const c = await render(<Basic />)
    await openWithKeyboard(c)
    await userEvent.keyboard('{End}')
    expect(focused()).toBe('Eliminar')
    await userEvent.keyboard('{Home}')
    expect(focused()).toBe('Editar')
  })

  test('búsqueda por letra: la siguiente que empieza así, una letra repetida recorre, varias letras buscan el texto', async () => {
    const c = await render(
      <Basic>
        <MenuItem>Copiar</MenuItem>
        <MenuItem>Cortar</MenuItem>
        <MenuItem>Pegar</MenuItem>
        <MenuItem>Compartir</MenuItem>
      </Basic>,
    )
    await openWithKeyboard(c)
    expect(focused()).toBe('Copiar')
    await userEvent.keyboard('p')
    expect(focused()).toBe('Pegar')
    // Una letra repetida recorre los que empiezan con ella, con vuelta.
    await new Promise((r) => setTimeout(r, 600))
    await userEvent.keyboard('c')
    expect(focused()).toBe('Compartir')
    await userEvent.keyboard('c')
    expect(focused()).toBe('Copiar')
    await userEvent.keyboard('c')
    expect(focused()).toBe('Cortar')
    // Escribir seguido busca el texto completo.
    await new Promise((r) => setTimeout(r, 600))
    await userEvent.keyboard('com')
    expect(focused()).toBe('Compartir')
    // Sin coincidencia, el foco no se mueve.
    await new Promise((r) => setTimeout(r, 600))
    await userEvent.keyboard('z')
    expect(focused()).toBe('Compartir')
  })

  test('Escape cierra y devuelve el foco al disparador', async () => {
    const c = await render(<Basic />)
    await openWithKeyboard(c)
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => isOpen(c)).toBe(false)
    expect(document.activeElement).toBe(trigger(c))
    expect(trigger(c).getAttribute('aria-expanded')).toBe('false')
  })

  test('Tab cierra y lleva el foco al próximo enfocable después del disparador; Mayús+Tab, al anterior', async () => {
    const c = await render(<Basic />)
    await openWithKeyboard(c)
    await userEvent.keyboard('{Tab}')
    await expect.poll(() => isOpen(c)).toBe(false)
    expect(document.activeElement?.id).toBe('after')

    await openWithKeyboard(c)
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
    await expect.poll(() => isOpen(c)).toBe(false)
    expect(document.activeElement?.id).toBe('before')
  })

  test('dentro de un Dialog, Escape cierra el menú y no el diálogo', async () => {
    const onClose = vi.fn()
    const c = await render(
      <Dialog open onClose={onClose}>
        <DialogHeadline>Título</DialogHeadline>
        <DialogContent>
          <Menu>
            <MenuTrigger><Button>Opciones</Button></MenuTrigger>
            <MenuContent><MenuItem>Uno</MenuItem></MenuContent>
          </Menu>
        </DialogContent>
      </Dialog>,
    )
    await openWithKeyboard(c)
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => isOpen(c)).toBe(false)
    expect(onClose).not.toHaveBeenCalled()
    expect(q<HTMLDialogElement>(c, 'dialog').open).toBe(true)
  })
})

describe('Menu: elegir, cerrar y deshabilitados', () => {
  test('elegir con un clic llama a onSelect, cierra y devuelve el foco', async () => {
    const onEdit = vi.fn()
    const c = await render(<Basic onEdit={onEdit} />)
    await userEvent.click(trigger(c))
    await userEvent.click(item(c, 'Editar'))
    expect(onEdit).toHaveBeenCalledTimes(1)
    await expect.poll(() => isOpen(c)).toBe(false)
    expect(document.activeElement).toBe(trigger(c))
  })

  test('elegir con Enter y con Espacio también', async () => {
    const onEdit = vi.fn()
    const c = await render(<Basic onEdit={onEdit} />)
    await openWithKeyboard(c)
    await userEvent.keyboard('{Enter}')
    await expect.poll(() => isOpen(c)).toBe(false)
    await openWithKeyboard(c)
    await userEvent.keyboard(' ')
    await expect.poll(() => isOpen(c)).toBe(false)
    expect(onEdit).toHaveBeenCalledTimes(2)
    expect(document.activeElement).toBe(trigger(c))
  })

  test('preventDefault en onSelect deja el menú abierto', async () => {
    function Checkable() {
      const [on, setOn] = useState(false)
      return (
        <Basic>
          <MenuItem type="checkbox" selected={on} onSelect={(e) => { e.preventDefault(); setOn(!on) }}>Ocultos</MenuItem>
        </Basic>
      )
    }
    const c = await render(<Checkable />)
    await userEvent.click(trigger(c))
    await userEvent.click(item(c, 'Ocultos'))
    expect(isOpen(c)).toBe(true)
    expect(item(c, 'Ocultos').getAttribute('aria-checked')).toBe('true')
  })

  test('un clic afuera cierra sin llevar el foco al disparador', async () => {
    const c = await render(<Basic />)
    await userEvent.click(trigger(c))
    await userEvent.click(q(c, '#outside'))
    await expect.poll(() => isOpen(c)).toBe(false)
    expect(document.activeElement).not.toBe(trigger(c))
  })

  test('un clic adentro que no es en un elemento no cierra', async () => {
    const c = await render(<Basic />)
    await userEvent.click(trigger(c))
    await userEvent.click(q(c, '.mk-menu-divider'), { force: true })
    expect(isOpen(c)).toBe(true)
  })

  test('deshabilitado: aria-disabled, se enfoca con las flechas (APG) y no se activa', async () => {
    const onSelect = vi.fn()
    const c = await render(
      <Basic>
        <MenuItem>Uno</MenuItem>
        <MenuItem disabled onSelect={onSelect}>Dos</MenuItem>
        <MenuItem>Tres</MenuItem>
      </Basic>,
    )
    const dos = item(c, 'Dos')
    expect(dos.getAttribute('aria-disabled')).toBe('true')
    expect(dos.disabled).toBe(false)
    await openWithKeyboard(c)
    await userEvent.keyboard('{ArrowDown}')
    expect(focused()).toBe('Dos')
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard(' ')
    // Playwright no hace clic en un elemento con aria-disabled sin force.
    await userEvent.click(dos, { force: true })
    expect(onSelect).not.toHaveBeenCalled()
    expect(isOpen(c)).toBe(true)
  })
})

describe('Menu: estado controlado y no controlado', () => {
  test('controlado: onOpenChange avisa y el menú sigue a `open`', async () => {
    const onOpenChange = vi.fn()
    function Controlled({ accept }: { accept: boolean }) {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button id="external" onClick={() => setOpen(true)}>Abrir desde afuera</button>
          <Basic open={open} onOpenChange={(next) => { onOpenChange(next); if (accept || next) setOpen(next) }} />
        </>
      )
    }
    const c = await render(<Controlled accept={false} />)
    await userEvent.click(trigger(c))
    expect(onOpenChange).toHaveBeenLastCalledWith(true)
    expect(isOpen(c)).toBe(true)
    // El padre no acepta cerrar: Escape avisa pero el menú sigue abierto.
    await userEvent.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
    expect(isOpen(c)).toBe(true)

    const c2 = await render(<Controlled accept />)
    await userEvent.click(q(c2, '#external'))
    await expect.poll(() => isOpen(c2)).toBe(true)
    expect(focused()).toBe('Editar')
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => isOpen(c2)).toBe(false)
  })

  test('no controlado con defaultOpen', async () => {
    const onOpenChange = vi.fn()
    const c = await render(<Basic defaultOpen onOpenChange={onOpenChange} />)
    await expect.poll(() => isOpen(c)).toBe(true)
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => isOpen(c)).toBe(false)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe('Menu: medidas (kit, 05-medidas.md § Menu)', () => {
  test('contenedor: radio 16, surface-container-low, elevación 3 y relleno 2 arriba y abajo', async () => {
    const c = await render(<Basic />)
    await userEvent.click(trigger(c))
    const s = style(menu(c))
    expect(s.borderRadius).toBe('16px')
    expect(s.backgroundColor).toBe(roleColor('surface-container-low'))
    expect(s.boxShadow).toBe(token('boxShadow', 'var(--md-sys-elevation-level3)'))
    expect([s.paddingTop, s.paddingBottom]).toEqual(['2px', '2px'])
    expect(s.minWidth).toBe('112px')
    expect(s.maxWidth).toBe('280px')
  })

  test('elementos: filas de 48 (2 + 44 + 2), relleno 4 al costado y 12 adentro, radio 4, separación 8, iconos de 20', async () => {
    const c = await render(<Basic />)
    await userEvent.click(trigger(c))
    const [a, b] = items(c)
    if (!a || !b) throw new Error('faltan elementos')
    expect(a.getBoundingClientRect().height).toBe(44)
    expect(b.getBoundingClientRect().top - a.getBoundingClientRect().top).toBe(48)
    expect(a.getBoundingClientRect().top - menu(c).getBoundingClientRect().top).toBe(4)
    expect(a.getBoundingClientRect().left - menu(c).getBoundingClientRect().left).toBe(4)
    const s = style(a)
    expect([s.paddingLeft, s.paddingRight, s.columnGap, s.borderRadius]).toEqual(['12px', '12px', '8px', '4px'])
    const icon = q(a, '.mk-menu-item-leading svg').getBoundingClientRect()
    expect([icon.width, icon.height]).toEqual([20, 20])
  })

  test('texto en Label Large', async () => {
    const c = await render(<Basic />)
    const s = style(items(c)[0] ?? null)
    expect(s.fontSize).toBe(token('fontSize', 'var(--md-sys-typescale-label-large-size)'))
    expect(s.lineHeight).toBe(token('lineHeight', 'var(--md-sys-typescale-label-large-line-height)'))
    expect(s.fontWeight).toBe(token('fontWeight', 'var(--md-sys-typescale-label-large-weight)'))
  })

  test('el contenido final va pegado a la derecha y el inicial primero aunque se escriba después', async () => {
    const c = await render(
      <Basic>
        <MenuItem>Copiar<MenuItemTrailing>Ctrl+C</MenuItemTrailing><MenuItemLeading><EditIcon /></MenuItemLeading></MenuItem>
      </Basic>,
    )
    await userEvent.click(trigger(c))
    const it = items(c)[0] as HTMLElement
    const r = it.getBoundingClientRect()
    expect(q(it, '.mk-menu-item-trailing').getBoundingClientRect().right).toBe(r.right - 12)
    expect(q(it, '.mk-menu-item-leading').getBoundingClientRect().left).toBe(r.left + 12)
  })

  test('divisor de 1 px en outline-variant', async () => {
    const c = await render(<Basic />)
    await userEvent.click(trigger(c))
    const s = style(q(c, '.mk-menu-divider'))
    expect(s.height).toBe('1px')
    expect(s.backgroundColor).toBe(roleColor('outline-variant'))
  })
})

describe('Menu: colores por estado (Standard)', () => {
  test('en reposo: texto on-surface, iconos on-surface-variant, sin fondo', async () => {
    const c = await render(<Basic />)
    await userEvent.click(trigger(c))
    const it = item(c, 'Compartir')
    expect(style(it).color).toBe(roleColor('on-surface'))
    expect(style(q(it, '.mk-menu-item-leading')).color).toBe(roleColor('on-surface-variant'))
    expect(style(it).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(layer(it)).toBe('0')
  })

  test('hover 8 %, foco de teclado 10 %, presionado 8 % con onda', async () => {
    const c = await render(<Basic />)
    // Al disparador se llega con Tab, como una persona: Firefox no muestra el foco visible en
    // un elemento enfocado por script si el foco anterior no era de teclado (por ejemplo, tras
    // un clic de una prueba anterior), y el elemento del menú hereda ese criterio.
    await userEvent.tab() // botón "Antes"
    await userEvent.tab()
    expect(document.activeElement).toBe(trigger(c))
    await userEvent.keyboard('{ArrowDown}')
    await expect.poll(() => isOpen(c)).toBe(true)
    expect(layer(item(c, 'Editar'))).toBe('0.1')
    await userEvent.hover(item(c, 'Compartir'))
    expect(layer(item(c, 'Compartir'))).toBe('0.08')
    await commands.pressDown('.mk-menu-item:nth-of-type(2)')
    try {
      expect(layer(item(c, 'Compartir'))).toBe('0.08')
      expect(q(item(c, 'Compartir'), '.mk-ripple-wave')).not.toBeNull()
    } finally {
      await commands.pressUp()
    }
  })

  test('seleccionado: tertiary-container, radio 12 y contenido on-tertiary-container', async () => {
    const c = await render(
      <Basic>
        <MenuItem type="radio" selected><MenuItemLeading><CheckIcon /></MenuItemLeading>Nombre</MenuItem>
        <MenuItem type="radio" selected={false}>Fecha</MenuItem>
      </Basic>,
    )
    await userEvent.click(trigger(c))
    const on = item(c, 'Nombre')
    expect(style(on).backgroundColor).toBe(roleColor('tertiary-container'))
    expect(style(on).borderRadius).toBe('12px')
    expect(style(on).color).toBe(roleColor('on-tertiary-container'))
    expect(style(q(on, '.mk-menu-item-leading')).color).toBe(roleColor('on-tertiary-container'))
    expect(style(item(c, 'Fecha')).borderRadius).toBe('4px')
  })

  test('deshabilitado: texto e iconos on-surface al 38 %, sin capa con hover', async () => {
    const c = await render(
      <Basic>
        <MenuItem disabled><MenuItemLeading><EditIcon /></MenuItemLeading>No</MenuItem>
        <MenuItem type="radio" selected disabled>Elegido</MenuItem>
      </Basic>,
    )
    await userEvent.click(trigger(c))
    const no = item(c, 'No')
    expect(style(no).color).toBe(mixColor('on-surface', 38))
    expect(style(q(no, '.mk-menu-item-leading')).color).toBe(mixColor('on-surface', 38))
    await userEvent.hover(no)
    expect(layer(no)).toBe('0')
    const elegido = item(c, 'Elegido')
    expect(style(elegido).backgroundColor).toBe(mixColor('tertiary-container', 38))
    expect(style(elegido).color).toBe(mixColor('on-tertiary-container', 38))
  })
})

describe('Menu: tema Vibrant', () => {
  test('fondo tertiary-container, contenido on-tertiary-container, seleccionado tertiary/on-tertiary', async () => {
    const c = await render(
      <Basic content={{ variant: 'vibrant' }}>
        <MenuItem><MenuItemLeading><EditIcon /></MenuItemLeading>Editar</MenuItem>
        <MenuItem type="radio" selected>Elegido</MenuItem>
        <MenuItem disabled>No</MenuItem>
      </Basic>,
    )
    await userEvent.click(trigger(c))
    expect(menu(c).dataset['variant']).toBe('vibrant')
    expect(style(menu(c)).backgroundColor).toBe(roleColor('tertiary-container'))
    const edit = item(c, 'Editar')
    expect(style(edit).color).toBe(roleColor('on-tertiary-container'))
    expect(style(q(edit, '.mk-menu-item-leading')).color).toBe(roleColor('on-tertiary-container'))
    expect(style(item(c, 'Elegido')).backgroundColor).toBe(roleColor('tertiary'))
    expect(style(item(c, 'Elegido')).color).toBe(roleColor('on-tertiary'))
    expect(style(item(c, 'No')).color).toBe(mixColor('on-tertiary-container', 38))
    // Con hover, Compose pasa el icono a tertiary (VibrantMenuTokens.ItemHoveredLeadingIconColor);
    // matekit lo deja en on-tertiary-container, que tiene contraste garantizado en todos los
    // niveles (menu.css, ADR-0008).
    await userEvent.hover(edit)
    expect(style(q(edit, '.mk-menu-item-leading')).color).toBe(roleColor('on-tertiary-container'))
  })
})

describe('Menu: posición junto al disparador', () => {
  const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(1)

  function Placed({ at }: { at: CSSProperties }) {
    return (
      <div style={{ position: 'fixed', ...at }}>
        <Menu>
          <MenuTrigger><Button>Abrir</Button></MenuTrigger>
          <MenuContent>
            <MenuItem>Primero con texto largo</MenuItem>
            <MenuItem>Segundo</MenuItem>
            <MenuItem>Tercero</MenuItem>
          </MenuContent>
        </Menu>
      </div>
    )
  }

  test('debajo del disparador, alineado a su borde izquierdo', async () => {
    const c = await render(<Placed at={{ top: 40, left: 40 }} />)
    await userEvent.click(trigger(c))
    const t = trigger(c).getBoundingClientRect()
    const m = menu(c).getBoundingClientRect()
    near(m.top, t.bottom)
    near(m.left, t.left)
    expect(menu(c).dataset['side']).toBe('bottom')
  })

  test('cerca del borde inferior se da vuelta: queda arriba del disparador', async () => {
    const c = await render(<Placed at={{ bottom: 8, left: 40 }} />)
    await userEvent.click(trigger(c))
    const t = trigger(c).getBoundingClientRect()
    const m = menu(c).getBoundingClientRect()
    near(m.bottom, t.top)
    expect(m.top).toBeGreaterThanOrEqual(0)
    expect(menu(c).dataset['side']).toBe('top')
  })

  test('cerca del borde derecho se alinea al borde derecho del disparador', async () => {
    const c = await render(<Placed at={{ top: 40, right: 8 }} />)
    await userEvent.click(trigger(c))
    const t = trigger(c).getBoundingClientRect()
    const m = menu(c).getBoundingClientRect()
    near(m.right, t.right)
    near(m.top, t.bottom)
    expect(m.right).toBeLessThanOrEqual(document.documentElement.clientWidth)
    expect(menu(c).dataset['align']).toBe('right')
  })

  test('en la esquina inferior derecha se da vuelta en los dos ejes', async () => {
    const c = await render(<Placed at={{ bottom: 8, right: 8 }} />)
    await userEvent.click(trigger(c))
    const t = trigger(c).getBoundingClientRect()
    const m = menu(c).getBoundingClientRect()
    near(m.bottom, t.top)
    near(m.right, t.right)
  })

  test('sigue al disparador cuando la página se desplaza', async () => {
    const c = await render(
      <div style={{ height: 3000, paddingTop: 100, paddingLeft: 40 }}>
        <Menu>
          <MenuTrigger><Button>Abrir</Button></MenuTrigger>
          <MenuContent><MenuItem>Uno</MenuItem></MenuContent>
        </Menu>
      </div>,
    )
    await userEvent.click(trigger(c))
    window.scrollTo(0, 50)
    await expect.poll(() => Math.round(menu(c).getBoundingClientRect().top)).toBe(Math.round(trigger(c).getBoundingClientRect().bottom))
    window.scrollTo(0, 0)
  })
})

describe('Menu: posición de respaldo sin anchor positioning (src/internal/anchor-position.ts)', () => {
  const viewport = { width: 400, height: 800 }
  const menuSize = { width: 200, height: 150 }
  const box = (top: number, left: number, w = 40, h = 40) => ({ top, left, right: left + w, bottom: top + h })

  test('debajo y a la izquierda cuando entra', () => {
    expect(fallbackPosition(box(100, 40), menuSize, viewport)).toEqual({ top: 140, left: 40, side: 'bottom', align: 'left' })
  })
  test('arriba cerca del borde inferior; a la derecha cerca del borde derecho', () => {
    expect(fallbackPosition(box(740, 350), menuSize, viewport)).toEqual({ top: 590, left: 190, side: 'top', align: 'right' })
  })
  test('si no entra de ningún lado, queda dentro de la ventana', () => {
    const p = fallbackPosition(box(10, 10), { width: 500, height: 900 }, viewport)
    expect([p.top, p.left]).toEqual([0, 0])
  })
  test('observedPlacement reconoce de qué lado quedó', () => {
    expect(observedPlacement(box(100, 100), box(0, 60, 80, 100))).toEqual({ side: 'top', align: 'right' })
    expect(observedPlacement(box(100, 100), box(140, 100, 80, 100))).toEqual({ side: 'bottom', align: 'left' })
  })
})

describe('Menu: movimiento', () => {
  afterEach(() => commands.reduceMotion(false))

  const easing = (name: string) => {
    const probe = document.createElement('span')
    probe.style.transitionTimingFunction = `var(--md-sys-motion-spring-${name}-easing)`
    document.body.append(probe)
    const value = withMotion(() => getComputedStyle(probe).transitionTimingFunction)
    probe.remove()
    return value
  }

  test('entrada y salida con los resortes rápidos (Compose: FastEffects y FastSpatial), escala desde 0,8', async () => {
    const c = await render(<Basic />)
    const m = menu(c)
    const s = withMotion(() => {
      const st = style(m)
      return [st.transitionProperty, st.transitionDuration, st.transitionTimingFunction.split(/, (?=linear)/)]
    })
    expect(s).toEqual(['opacity, scale', '0.15s, 0.36s', [easing('fast-effects'), easing('fast-spatial')]])
    await userEvent.click(trigger(c))
    m.setAttribute('data-closing', '')
    expect(style(m).scale).toBe('0.8')
    expect(style(m).opacity).toBe('0')
    m.removeAttribute('data-closing')
    expect(style(m).transformOrigin.startsWith('0px 0px')).toBe(true)
  })

  test('la salida espera a la transición antes de ocultar el popover', async () => {
    const c = await render(<Basic />)
    await userEvent.click(trigger(c))
    const m = menu(c)
    // Activa las transiciones solo para esta salida.
    const restore = document.getElementById('mk-test-no-motion') as HTMLStyleElement
    restore.media = 'not all'
    try {
      await userEvent.keyboard('{Escape}')
      expect(m.hasAttribute('data-closing')).toBe(true)
      expect(isOpen(c)).toBe(true)
      await expect.poll(() => isOpen(c), { timeout: 2000 }).toBe(false)
      expect(m.hasAttribute('data-closing')).toBe(false)
    } finally {
      restore.media = ''
    }
  })

  test('con movimiento reducido no hay cambio de escala, solo fundido', async () => {
    await commands.reduceMotion(true)
    const c = await render(<Basic />)
    await userEvent.click(trigger(c))
    const m = menu(c)
    m.setAttribute('data-closing', '')
    expect(style(m).scale).toBe('1')
    expect(withMotion(() => style(m).transitionDuration)).toBe('0.15s, 0s')
    m.removeAttribute('data-closing')
  })
})

describe('Menu: props nativas y ref', () => {
  test('MenuContent: ref, className, style y atributos llegan al contenedor', async () => {
    const ref = createRef<HTMLDivElement>()
    const c = await render(
      <Basic content={{ ref, className: 'extra', style: { minWidth: 200 }, 'data-x': 'y', 'aria-label': 'Acciones' } as MenuContentProps} />,
    )
    const m = menu(c)
    expect(ref.current).toBe(m)
    expect(m.classList.contains('mk-menu')).toBe(true)
    expect(m.classList.contains('extra')).toBe(true)
    expect(m.dataset['x']).toBe('y')
    expect(m.getAttribute('aria-label')).toBe('Acciones')
    expect(m.style.minWidth).toBe('200px')
  })

  test('MenuItem: ref, className y atributos llegan al <button>; onClick también se llama', async () => {
    const ref = createRef<HTMLButtonElement>()
    const onClick = vi.fn()
    const c = await render(
      <Basic>
        <MenuItem ref={ref} className="mine" data-id="1" aria-keyshortcuts="Control+C" onClick={onClick}>Copiar</MenuItem>
      </Basic>,
    )
    const it = items(c)[0]
    expect(ref.current).toBe(it)
    expect(it?.className).toBe('mk-menu-item mine')
    expect(it?.dataset['id']).toBe('1')
    expect(it?.getAttribute('aria-keyshortcuts')).toBe('Control+C')
    await userEvent.click(trigger(c))
    await userEvent.click(it as HTMLElement)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test('el disparador conserva su ref, su onClick y su estilo', async () => {
    const ref = createRef<HTMLButtonElement>()
    const onClick = vi.fn()
    const c = await render(
      <Menu>
        <MenuTrigger><button ref={ref} onClick={onClick} style={{ marginLeft: 12 }}>Abrir</button></MenuTrigger>
        <MenuContent><MenuItem>Uno</MenuItem></MenuContent>
      </Menu>,
    )
    expect(ref.current).toBe(trigger(c))
    expect(trigger(c).style.marginLeft).toBe('12px')
    await userEvent.click(trigger(c))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(isOpen(c)).toBe(true)
  })

  test('un onClick del disparador con preventDefault no abre el menú', async () => {
    const c = await render(
      <Menu>
        <MenuTrigger><Button onClick={(e) => e.preventDefault()}>Abrir</Button></MenuTrigger>
        <MenuContent><MenuItem>Uno</MenuItem></MenuContent>
      </Menu>,
    )
    await userEvent.click(trigger(c))
    expect(isOpen(c)).toBe(false)
  })
})

// Salida cancelada (2026-11-26): antes se esperaba Promise.all de las transiciones e ignoraba el
// rechazo; con una transición cancelada, el menú quedaba abierto con data-closing. Ahora espera
// src/internal/settle-animations.ts.
describe('salida cancelada', () => {
  let setOpen: (open: boolean) => void = () => {}
  function Controlled() {
    const [open, set] = useState(true)
    setOpen = set
    return (
      <Menu open={open} onOpenChange={set}>
        <MenuTrigger><Button>Opciones</Button></MenuTrigger>
        <MenuContent><MenuItem>Editar</MenuItem></MenuContent>
      </Menu>
    )
  }
  for (const how of CANCEL_WAYS) {
    test(`(${how}) se oculta igual`, async () => {
      const c = await render(<Controlled />)
      const el = c.querySelector('.mk-menu') as HTMLElement
      await withTransitions(async () => {
        await expect.poll(() => el.matches(':popover-open')).toBe(true)
        await entered(el)
        setOpen(false)
        await cancelExit(el, how)
        await expect.poll(() => el.matches(':popover-open'), { timeout: 3000 }).toBe(false)
        expect(el.hasAttribute('data-closing')).toBe(false)
      })
    })
  }
})
