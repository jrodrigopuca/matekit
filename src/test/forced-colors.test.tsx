// Modo de alto contraste (forced-colors: active), emulado con Playwright: el navegador quita
// fondos y sombras y fuerza los colores del sistema. Cada componente tiene que conservar su
// forma y distinguir sus estados con esos colores.

import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { commands, userEvent } from 'vitest/browser'
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeadline,
  IconButton,
  Menu,
  MenuContent,
  MenuDivider,
  MenuItem,
  MenuTrigger,
  StarIcon,
  Switch,
  TextField,
  TextFieldInput,
  TextFieldLabel,
} from '../index.ts'
import { render, style } from './render.tsx'

beforeEach(() => commands.forcedColors(true))
afterEach(() => commands.forcedColors(false))

/** Valor calculado de un color del sistema (Highlight, GrayText…) en el modo actual. */
function systemColor(name: string): string {
  const probe = document.createElement('span')
  probe.style.cssText = `forced-color-adjust: none; color: ${name};`
  document.body.append(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value
}
const q = (c: HTMLElement, sel: string) => c.querySelector(sel) as HTMLElement

test('el modo está activo durante estas pruebas', () => {
  expect(matchMedia('(forced-colors: active)').matches).toBe(true)
})

describe('Button e IconButton', () => {
  test('todos los estilos tienen contorno ButtonText, también los que no lo tienen normalmente', async () => {
    const c = await render(
      <div>
        <Button className="filled">F</Button>
        <Button variant="text" className="text">T</Button>
        <IconButton label="s" className="std"><StarIcon /></IconButton>
      </div>,
    )
    for (const sel of ['.filled', '.text', '.std']) {
      expect(style(q(c, sel)).outlineColor, sel).toBe(systemColor('ButtonText'))
      expect(style(q(c, sel)).outlineStyle, sel).toBe('solid')
      expect(style(q(c, sel)).outlineWidth, sel).toBe('1px')
    }
  })

  test('el toggle seleccionado se marca con Highlight y HighlightText', async () => {
    const c = await render(
      <div>
        <Button variant="tonal" selected className="b">Sí</Button>
        <IconButton variant="filled" selected label="f" className="i"><StarIcon filled /></IconButton>
      </div>,
    )
    for (const sel of ['.b', '.i']) {
      expect(style(q(c, sel)).backgroundColor, sel).toBe(systemColor('Highlight'))
      expect(style(q(c, sel)).color, sel).toBe(systemColor('HighlightText'))
    }
  })

  test('deshabilitado en GrayText', async () => {
    const c = await render(<Button disabled>No</Button>)
    expect(style(q(c, 'button')).color).toBe(systemColor('GrayText'))
    expect(style(q(c, 'button')).outlineColor).toBe(systemColor('GrayText'))
  })
})

describe('Checkbox', () => {
  test('la caja se ve: contorno de 2 px CanvasText sobre Canvas', async () => {
    const c = await render(<Checkbox>Uno</Checkbox>)
    const box = style(q(c, '.mk-checkbox-box'))
    expect(box.outlineWidth).toBe('2px')
    expect(box.outlineStyle).toBe('solid')
    expect(box.outlineColor).toBe(systemColor('CanvasText'))
    expect(box.backgroundColor).toBe(systemColor('Canvas'))
  })

  test('marcada e indeterminada: Highlight con la marca en HighlightText', async () => {
    const c = await render(
      <div>
        <Checkbox defaultChecked className="a" />
        <Checkbox indeterminate className="b" />
      </div>,
    )
    for (const sel of ['.a', '.b']) {
      expect(style(q(c, `${sel} .mk-checkbox-box`)).backgroundColor, sel).toBe(systemColor('Highlight'))
      expect(style(q(c, `${sel} .mk-checkbox-icon`)).stroke, sel).toBe(systemColor('HighlightText'))
    }
  })

  test('deshabilitada: GrayText sin la opacidad que la haría casi invisible', async () => {
    const c = await render(<Checkbox disabled defaultChecked>No</Checkbox>)
    expect(style(q(c, '.mk-checkbox-control')).opacity).toBe('1')
    expect(style(q(c, '.mk-checkbox-box')).backgroundColor).toBe(systemColor('GrayText'))
    expect(style(q(c, '.mk-checkbox-label')).color).toBe(systemColor('GrayText'))
    expect(style(q(c, '.mk-checkbox-label')).opacity).toBe('1')
  })
})

describe('Switch', () => {
  test('desactivado: pista con contorno de 2 px y handle CanvasText', async () => {
    const c = await render(<Switch>Wi-Fi</Switch>)
    const track = style(q(c, '.mk-switch-track'))
    expect(track.outlineWidth).toBe('2px')
    expect(track.outlineColor).toBe(systemColor('CanvasText'))
    expect(style(q(c, '.mk-switch-handle')).backgroundColor).toBe(systemColor('CanvasText'))
  })

  test('activado: pista Highlight y handle HighlightText', async () => {
    const c = await render(<Switch defaultChecked>Wi-Fi</Switch>)
    expect(style(q(c, '.mk-switch-track')).backgroundColor).toBe(systemColor('Highlight'))
    expect(style(q(c, '.mk-switch-handle')).backgroundColor).toBe(systemColor('HighlightText'))
  })

  test('deshabilitado: handle y etiqueta en GrayText', async () => {
    const c = await render(<Switch disabled>No</Switch>)
    expect(style(q(c, '.mk-switch-handle')).backgroundColor).toBe(systemColor('GrayText'))
    expect(style(q(c, '.mk-switch-label')).color).toBe(systemColor('GrayText'))
  })
})

describe('TextField', () => {
  const field = (props: { disabled?: boolean } = {}) => (
    <TextField {...props}>
      <TextFieldLabel>Nombre</TextFieldLabel>
      <TextFieldInput />
    </TextField>
  )

  test('filled: contorno CanvasText e indicador visible, Highlight con foco', async () => {
    const c = await render(field())
    expect(style(q(c, '.mk-text-field-container')).outlineColor).toBe(systemColor('CanvasText'))
    expect(style(q(c, '.mk-text-field-container')).outlineWidth).toBe('1px')
    const indicator = () => getComputedStyle(q(c, '.mk-text-field-container'), '::after').backgroundColor
    expect(indicator()).toBe(systemColor('CanvasText'))
    await userEvent.click(q(c, 'input'))
    expect(indicator()).toBe(systemColor('Highlight'))
  })

  test('deshabilitado: contorno y texto en GrayText', async () => {
    const c = await render(field({ disabled: true }))
    expect(style(q(c, '.mk-text-field-container')).outlineColor).toBe(systemColor('GrayText'))
    expect(style(q(c, '.mk-text-field-label')).color).toBe(systemColor('GrayText'))
  })
})

describe('Dialog', () => {
  test('tiene contorno CanvasText para separarse de la página', async () => {
    const c = await render(
      <Dialog open>
        <DialogHeadline>Título</DialogHeadline>
        <DialogContent>Texto</DialogContent>
      </Dialog>,
    )
    const d = style(q(c, 'dialog'))
    expect(d.outlineStyle).toBe('solid')
    expect(d.outlineColor).toBe(systemColor('CanvasText'))
  })
})

describe('Menu', () => {
  const menu = () => (
    <Menu defaultOpen>
      <MenuTrigger><Button>Abrir</Button></MenuTrigger>
      <MenuContent>
        <MenuItem className="plain">Editar</MenuItem>
        <MenuDivider />
        <MenuItem type="radio" selected className="on">Elegido</MenuItem>
        <MenuItem disabled className="off">No</MenuItem>
        <MenuItem type="radio" selected disabled className="on-off">Elegido y no</MenuItem>
      </MenuContent>
    </Menu>
  )

  test('el menú tiene contorno CanvasText y el divisor es un borde visible', async () => {
    const c = await render(menu())
    const m = style(q(c, '.mk-menu'))
    expect(m.outlineStyle).toBe('solid')
    expect(m.outlineWidth).toBe('1px')
    expect(m.outlineColor).toBe(systemColor('CanvasText'))
    const d = style(q(c, '.mk-menu-divider'))
    expect(d.borderTopStyle).toBe('solid')
    expect(d.borderTopColor).toBe(systemColor('CanvasText'))
  })

  test('seleccionado en Highlight con HighlightText', async () => {
    const c = await render(menu())
    expect(style(q(c, '.on')).backgroundColor).toBe(systemColor('Highlight'))
    expect(style(q(c, '.on')).color).toBe(systemColor('HighlightText'))
    expect(style(q(c, '.plain')).color).toBe(systemColor('CanvasText'))
  })

  test('deshabilitado en GrayText, también si está seleccionado', async () => {
    const c = await render(menu())
    for (const sel of ['.off', '.on-off']) {
      expect(style(q(c, sel)).color, sel).toBe(systemColor('GrayText'))
      expect(style(q(c, sel)).backgroundColor, sel).toBe(systemColor('Canvas'))
    }
  })
})
