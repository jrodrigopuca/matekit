// Modo de alto contraste (forced-colors: active), emulado con Playwright: el navegador quita
// fondos y sombras y fuerza los colores del sistema. Cada componente tiene que conservar su
// forma y distinguir sus estados con esos colores.

import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { commands, server, userEvent } from 'vitest/browser'
import {
  Badge,
  Button,
  HomeIcon,
  NavigationBar,
  NavigationBarItem,
  NavigationBarItemIcon,
  NavigationBarItemLabel,
  NavigationRail,
  NavigationRailHeader,
  NavigationRailItem,
  NavigationRailItemIcon,
  NavigationRailItemLabel,
  Checkbox,
  Divider,
  DividerSubhead,
  RadioButton,
  RadioGroup,
  LoadingIndicator,
  Shape,
  Dialog,
  EditIcon,
  ExtendedFab,
  Fab,
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
import { near, pixelsOf } from './pixels.ts'
import '../shapes.css'

// WebKit activa la consulta forced-colors pero no reemplaza los colores por los del sistema
// (comprobado el 2026-11-25 con HTML puro: un texto rojo sigue rojo; Safari no tiene ese modo).
// Lo que matekit define a mano en sus bloques @media se prueba en todos los motores; lo que
// depende del reemplazo automático del navegador, solo donde existe.
const autoForced = server.browser !== 'webkit'

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

  test('como enlace se ve como botón: contenido y contorno ButtonText, no LinkText', async () => {
    // Sin la regla :any-link de button.css, el navegador pintaría el texto y el icono del <a> en
    // LinkText mientras el contorno queda en ButtonText. La regla es de matekit: vale en los tres.
    const c = await render(
      <div>
        <Button variant="text" href="#x" className="b">Ver detalle</Button>
        <IconButton label="Ajustes" href="#x" className="i"><StarIcon /></IconButton>
      </div>,
    )
    for (const sel of ['.b', '.i']) {
      expect(style(q(c, sel)).color, sel).toBe(systemColor('ButtonText'))
      expect(style(q(c, sel)).outlineColor, sel).toBe(systemColor('ButtonText'))
      expect(style(q(c, sel)).textDecorationLine, sel).toBe('none')
    }
    expect(style(q(c, '.i svg')).fill).toBe(systemColor('ButtonText'))
  })

  test('deshabilitado en GrayText', async () => {
    const c = await render(<Button disabled>No</Button>)
    expect(style(q(c, 'button')).color).toBe(systemColor('GrayText'))
    expect(style(q(c, 'button')).outlineColor).toBe(systemColor('GrayText'))
  })
})

describe('Fab y ExtendedFab', () => {
  test('el contorno ButtonText de 1 px dibuja la forma, sin fondo ni sombra', async () => {
    const c = await render(
      <div>
        <Fab label="Redactar" className="fab"><EditIcon /></Fab>
        <ExtendedFab className="ext"><EditIcon />Redactar</ExtendedFab>
        <ExtendedFab className="collapsed" expanded={false}><EditIcon />Redactar</ExtendedFab>
        <Fab label="Nuevo" href="#nuevo" className="link"><EditIcon /></Fab>
      </div>,
    )
    for (const sel of ['.fab', '.ext', '.collapsed', '.link']) {
      const s = style(q(c, sel))
      expect(s.outlineStyle, sel).toBe('solid')
      expect(s.outlineWidth, sel).toBe('1px')
      expect(s.outlineOffset, sel).toBe('-1px')
      expect(s.outlineColor, sel).toBe(systemColor('ButtonText'))
      if (autoForced) {
        // El navegador quita la sombra y fuerza el color del contenido.
        expect(s.boxShadow, sel).toBe('none')
        expect(s.color, sel).toBe(systemColor('ButtonText'))
      }
    }
  })

  test('extendido: texto e icono en ButtonText; contraído, el texto transparente y el icono visible', async () => {
    const c = await render(
      <div>
        <ExtendedFab className="ext"><EditIcon />Redactar</ExtendedFab>
        <ExtendedFab className="collapsed" expanded={false}><EditIcon />Redactar</ExtendedFab>
      </div>,
    )
    expect(style(q(c, '.ext .mk-extended-fab-label')).color).toBe(systemColor('ButtonText'))
    expect(style(q(c, '.ext .mk-icon')).color).toBe(systemColor('ButtonText'))
    expect(style(q(c, '.collapsed .mk-extended-fab-label')).color).toBe('rgba(0, 0, 0, 0)')
    expect(style(q(c, '.collapsed .mk-icon')).color).toBe(systemColor('ButtonText'))
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

describe('RadioButton', () => {
  test('sin seleccionar: anillo de 2 px CanvasText, sin punto', async () => {
    const c = await render(<RadioButton>Uno</RadioButton>)
    const ring = style(q(c, '.mk-radio-button-ring'))
    expect(ring.borderTopWidth).toBe('2px')
    expect(ring.borderTopStyle).toBe('solid')
    expect(ring.borderTopColor).toBe(systemColor('CanvasText'))
    expect(style(q(c, '.mk-radio-button-dot')).scale).toBe('0')
  })

  test('seleccionado: anillo y punto Highlight, también con el puntero encima', async () => {
    const c = await render(<RadioButton defaultChecked>Uno</RadioButton>)
    await userEvent.hover(q(c, 'label'))
    expect(style(q(c, '.mk-radio-button-ring')).borderTopColor).toBe(systemColor('Highlight'))
    expect(style(q(c, '.mk-radio-button-dot')).backgroundColor).toBe(systemColor('Highlight'))
    expect(style(q(c, '.mk-radio-button-dot')).scale).toBe('1')
  })

  test('sin seleccionar con el puntero encima: el anillo sigue en CanvasText', async () => {
    const c = await render(<RadioButton>Uno</RadioButton>)
    await userEvent.hover(q(c, 'label'))
    expect(style(q(c, '.mk-radio-button-ring')).borderTopColor).toBe(systemColor('CanvasText'))
  })

  test('deshabilitado (en el grupo): GrayText sin la opacidad que lo haría casi invisible', async () => {
    const c = await render(
      <RadioGroup aria-label="g" disabled defaultValue="no">
        <RadioButton value="no">No</RadioButton>
      </RadioGroup>,
    )
    expect(style(q(c, '.mk-radio-button-control')).opacity).toBe('1')
    expect(style(q(c, '.mk-radio-button-ring')).borderTopColor).toBe(systemColor('GrayText'))
    expect(style(q(c, '.mk-radio-button-dot')).backgroundColor).toBe(systemColor('GrayText'))
    expect(style(q(c, '.mk-radio-button-label')).color).toBe(systemColor('GrayText'))
    expect(style(q(c, '.mk-radio-button-label')).opacity).toBe('1')
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
    if (autoForced) expect(style(q(c, '.plain')).color).toBe(systemColor('CanvasText'))
  })

  test('deshabilitado en GrayText, también si está seleccionado', async () => {
    const c = await render(menu())
    for (const sel of ['.off', '.on-off']) {
      expect(style(q(c, sel)).color, sel).toBe(systemColor('GrayText'))
      expect(style(q(c, sel)).backgroundColor, sel).toBe(systemColor('Canvas'))
    }
  })
})

describe('NavigationBar', () => {
  const bar = (layout: 'vertical' | 'horizontal') => (
    <div style={{ width: 400 }}>
      <NavigationBar layout={layout}>
        <NavigationBarItem href="#" className="plain">
          <NavigationBarItemIcon><HomeIcon /></NavigationBarItemIcon>
          <NavigationBarItemLabel>Inicio</NavigationBarItemLabel>
          <Badge label="Novedades" />
        </NavigationBarItem>
        <NavigationBarItem href="#" active className="on">
          <NavigationBarItemIcon><StarIcon filled /></NavigationBarItemIcon>
          <NavigationBarItemLabel>Favoritos</NavigationBarItemLabel>
          <Badge label="3 nuevos">3</Badge>
        </NavigationBarItem>
      </NavigationBar>
    </div>
  )

  test('la barra se separa del contenido con un borde CanvasText', async () => {
    const c = await render(bar('vertical'))
    const nav = style(q(c, 'nav'))
    expect(nav.borderTopStyle).toBe('solid')
    expect(nav.borderTopColor).toBe(systemColor('CanvasText'))
  })

  for (const layout of ['vertical', 'horizontal'] as const) {
    test(`activo (${layout}): indicador en Highlight, icono en HighlightText`, async () => {
      const c = await render(bar(layout))
      const ind = q(c, '.on > .mk-navigation-bar-item-indicator')
      expect(style(ind).backgroundColor).toBe(systemColor('Highlight'))
      expect(ind.getBoundingClientRect().width).toBeGreaterThan(0)
      expect(style(q(c, '.on .mk-navigation-bar-item-icon')).color).toBe(systemColor('HighlightText'))
      expect(style(q(c, '.on .mk-navigation-bar-item-label')).color).toBe(
        systemColor(layout === 'vertical' ? 'Highlight' : 'HighlightText'),
      )
      // El que no está activo no tiene indicador visible.
      expect(q(c, '.plain > .mk-navigation-bar-item-indicator').getBoundingClientRect().width).toBe(0)
    })
  }

  test('las insignias se ven: CanvasText con el número en Canvas', async () => {
    const c = await render(bar('vertical'))
    for (const sel of ['.plain .mk-badge', '.on .mk-badge']) {
      expect(style(q(c, sel)).backgroundColor, sel).toBe(systemColor('CanvasText'))
    }
    expect(style(q(c, '.on .mk-badge')).color).toBe(systemColor('Canvas'))
  })
})

describe('NavigationRail', () => {
  const rail = (expanded: boolean, variant: 'docked' | 'floating' = 'docked') => (
    <div style={{ height: 400, display: 'flex' }}>
      <NavigationRail expanded={expanded} variant={variant}>
        <NavigationRailItem href="#" className="plain">
          <NavigationRailItemIcon><HomeIcon /></NavigationRailItemIcon>
          <NavigationRailItemLabel>Inicio</NavigationRailItemLabel>
          <Badge label="Novedades" />
        </NavigationRailItem>
        <NavigationRailItem href="#" active className="on">
          <NavigationRailItemIcon><StarIcon filled /></NavigationRailItemIcon>
          <NavigationRailItemLabel>Favoritos</NavigationRailItemLabel>
          <Badge label="3 nuevos">3</Badge>
        </NavigationRailItem>
      </NavigationRail>
    </div>
  )

  for (const variant of ['docked', 'floating'] as const) {
    test(`el rail ${variant} se separa del contenido con un contorno CanvasText`, async () => {
      const c = await render(rail(true, variant))
      const nav = style(q(c, 'nav'))
      expect(nav.outlineStyle).toBe('solid')
      expect(nav.outlineColor).toBe(systemColor('CanvasText'))
      expect(q(c, 'nav').getBoundingClientRect().width).toBe(220)
    })
  }

  for (const expanded of [false, true]) {
    test(`activo (${expanded ? 'expandido' : 'contraído'}): indicador en Highlight, icono en HighlightText`, async () => {
      const c = await render(rail(expanded))
      const ind = q(c, '.on > .mk-navigation-rail-item-indicator')
      expect(style(ind).backgroundColor).toBe(systemColor('Highlight'))
      expect(ind.getBoundingClientRect().width).toBeGreaterThan(0)
      expect(style(q(c, '.on .mk-navigation-rail-item-icon')).color).toBe(systemColor('HighlightText'))
      expect(style(q(c, '.on .mk-navigation-rail-item-label')).color).toBe(
        systemColor(expanded ? 'HighlightText' : 'Highlight'),
      )
      expect(q(c, '.plain > .mk-navigation-rail-item-indicator').getBoundingClientRect().width).toBe(0)
    })
  }

  test.skipIf(!autoForced)('el inactivo conserva el color de enlace que fuerza el navegador', async () => {
    const c = await render(rail(true))
    expect(style(q(c, '.plain .mk-navigation-rail-item-label')).color).toBe(systemColor('LinkText'))
  })

  test('las insignias se ven, también la grande en línea del expandido', async () => {
    const c = await render(rail(true))
    for (const sel of ['.plain .mk-badge', '.on .mk-badge']) {
      expect(style(q(c, sel)).backgroundColor, sel).toBe(systemColor('CanvasText'))
    }
    expect(style(q(c, '.on .mk-badge')).color).toBe(systemColor('Canvas'))
  })
})

describe('Shape', () => {
  // La máscara no es un color: el modo no la toca y la forma sigue recortando. El contenido es un
  // canvas rojo (el modo no cambia lo que dibuja un canvas ni una imagen). Un fondo de color, en
  // cambio, lo reemplaza el navegador por Canvas: la forma deja de verse contra la página y el
  // icono que tenga encima sigue visible (decisión documentada en shape.css).
  test('la máscara sigue recortando: la esquina de un circle no muestra el contenido', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 8
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgb(255, 0, 0)'
    ctx.fillRect(0, 0, 8, 8)
    const c = await render(
      <div className="stage" style={{ display: 'inline-block', lineHeight: 0 }}>
        <Shape shape="circle" style={{ width: 100, height: 100 }}>
          <img src={canvas.toDataURL()} alt="" />
        </Shape>
      </div>,
    )
    await (c.querySelector('img') as HTMLImageElement).decode()
    expect(style(q(c, '.mk-shape')).maskImage).toContain('data:image/svg+xml')
    const px = await pixelsOf(q(c, '.stage'))
    expect(near(px.at(50, 50), [255, 0, 0])).toBe(true)
    expect(near(px.at(3, 3), [255, 0, 0]), `esquina: ${px.at(3, 3)}`).toBe(false)
    expect(near(px.at(96, 96), [255, 0, 0])).toBe(false)
  })

  test.skipIf(!autoForced)('un fondo de color pasa a Canvas y el icono encima queda en CanvasText', async () => {
    const c = await render(
      <Shape shape="sunny" style={{ width: 80, height: 80, background: 'var(--md-sys-color-primary-container)' }}>
        <StarIcon />
      </Shape>,
    )
    expect(style(q(c, '.mk-shape')).backgroundColor).toBe(systemColor('Canvas'))
    expect(style(q(c, '.mk-icon svg')).fill).toBe(systemColor('CanvasText'))
  })
})

describe('LoadingIndicator', () => {
  const rgb = (css: string) => css.match(/\d+/g)!.slice(0, 3).map(Number)

  test('la forma en CanvasText, sin y con contenedor', async () => {
    const c = await render(
      <div>
        <LoadingIndicator label="a" className="plain" />
        <LoadingIndicator label="b" contained className="box" />
        <LoadingIndicator label="c" value={0.5} className="det" />
      </div>,
    )
    for (const sel of ['.plain', '.box', '.det']) {
      expect(style(q(c, `${sel} svg`)).fill, sel).toBe(systemColor('CanvasText'))
    }
  })

  test('el contenedor es un círculo con borde CanvasText de 1 px sobre Canvas', async () => {
    const c = await render(<LoadingIndicator label="x" contained />)
    const s = style(q(c, '.mk-loading-indicator'))
    expect(s.backgroundColor).toBe(systemColor('Canvas'))
    expect(s.outlineStyle).toBe('solid')
    expect(s.outlineWidth).toBe('1px')
    expect(s.outlineColor).toBe(systemColor('CanvasText'))
    expect(s.borderRadius).toBe('9999px')
  })

  test('se ve: la forma en CanvasText y, alrededor, Canvas', async () => {
    const c = await render(
      <div className="stage" style={{ display: 'inline-block', lineHeight: 0, padding: 4, background: 'Canvas' }}>
        <LoadingIndicator label="x" contained />
      </div>,
    )
    const svg = q(c, 'svg') as unknown as SVGSVGElement
    svg.pauseAnimations()
    svg.setCurrentTime(0)
    const px = await pixelsOf(q(c, '.mk-loading-indicator'))
    expect(near(px.at(24, 24), rgb(systemColor('CanvasText'))), `centro: ${px.at(24, 24)}`).toBe(true)
    expect(near(px.at(4, 24), rgb(systemColor('Canvas'))), `contenedor: ${px.at(4, 24)}`).toBe(true)
  })
})

describe('Divider', () => {
  const rgb = (css: string) => css.match(/\d+/g)!.slice(0, 3).map(Number)
  // El navegador reemplaza el fondo (la línea) por Canvas: el átomo la dibuja con un borde
  // CanvasText del mismo grosor. Se define a mano, así que vale también en WebKit.
  test('horizontal y vertical: borde CanvasText de 1 px, sin cambiar el tamaño', async () => {
    const c = await render(
      <div style={{ display: 'flex', height: 40 }}>
        <Divider orientation="vertical" className="v" />
        <div style={{ display: 'flex', flexDirection: 'column', width: 100 }}>
          <Divider className="h" />
          <DividerSubhead><h3>Sección</h3></DividerSubhead>
        </div>
      </div>,
    )
    const h = style(q(c, '.h'))
    expect(h.borderTopStyle).toBe('solid')
    expect(h.borderTopWidth).toBe('1px')
    expect(h.borderTopColor).toBe(systemColor('CanvasText'))
    expect(q(c, '.h').getBoundingClientRect().height).toBe(1)
    const v = style(q(c, '.v'))
    expect(v.borderLeftStyle).toBe('solid')
    expect(v.borderLeftColor).toBe(systemColor('CanvasText'))
    expect(v.borderTopStyle).toBe('none')
    expect(q(c, '.v').getBoundingClientRect().width).toBe(1)
    expect(q(c, '.v').getBoundingClientRect().height).toBe(40)
    expect(style(q(c, '.mk-divider-subhead hr')).borderTopColor).toBe(systemColor('CanvasText'))
  })

  test('la línea se ve: el píxel del divisor es CanvasText sobre Canvas', async () => {
    const c = await render(
      <div className="stage" style={{ width: 100, padding: 8, background: 'Canvas' }}>
        <Divider />
      </div>,
    )
    const px = await pixelsOf(q(c, '.stage'))
    expect(near(px.at(50, 8), rgb(systemColor('CanvasText'))), `línea: ${px.at(50, 8)}`).toBe(true)
    expect(near(px.at(50, 3), rgb(systemColor('Canvas'))), `fondo: ${px.at(50, 3)}`).toBe(true)
  })
})
