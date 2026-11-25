// Contraste de los componentes (WCAG 2.2): 4,5:1 para texto (1.4.3) y 3:1 para iconos y para
// los bordes o rellenos que identifican un control (1.4.11). Los estados deshabilitados están
// exentos en WCAG y no se revisan. Se revisa cada combinación de paleta (la base y las
// opcionales), nivel de contraste y tema (ADR-0008).

import type { ReactNode } from 'react'
import { describe, expect, test } from 'vitest'
import {
  Badge,
  Button,
  HomeIcon,
  NavigationBar,
  NavigationBarItem,
  NavigationBarItemIcon,
  NavigationBarItemLabel,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeadline,
  IconButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuItemLeading,
  MenuItemTrailing,
  MenuTrigger,
  EditIcon,
  ExtendedFab,
  Fab,
  CheckIcon,
  StarIcon,
  Switch,
  TextField,
  TextFieldInput,
  TextFieldLabel,
  TextFieldSupporting,
} from '../index.ts'
import '../tokens/palettes/index.css'
import { contrastRatio, effectiveBackground, parseColor, textContrast } from './contrast.ts'
import { render } from './render.tsx'

const TEXT = 4.5
const NON_TEXT = 3
const PALETTES = ['baseline', 'green', 'blue', 'orange'] as const
const LEVELS = ['standard', 'medium', 'high'] as const
const THEMES = ['light', 'dark'] as const
const SCHEMES = PALETTES.flatMap((palette) =>
  LEVELS.flatMap((contrast) => THEMES.map((theme) => ({ palette, contrast, theme }))),
)
type SchemeProps = (typeof SCHEMES)[number]
const schemeName = ({ palette, contrast, theme }: SchemeProps) =>
  `paleta ${palette}, contraste ${contrast}, tema ${theme === 'light' ? 'claro' : 'oscuro'}`

const Themed = ({ scheme, children }: { scheme: SchemeProps; children: ReactNode }) => (
  <main
    data-palette={scheme.palette}
    data-contrast={scheme.contrast}
    data-theme={scheme.theme}
    style={{ background: 'var(--md-sys-color-surface)', padding: 16 }}
  >
    {children}
  </main>
)
const q = (c: HTMLElement, sel: string) => {
  const el = c.querySelector(sel)
  if (!el) throw new Error(`no se encontró ${sel}`)
  return el as HTMLElement
}
const cs = (el: Element) => getComputedStyle(el)

test('la fórmula coincide con valores conocidos de WCAG', () => {
  expect(contrastRatio('rgb(0, 0, 0)', parseColor('rgb(255, 255, 255)'))).toBeCloseTo(21, 1)
  expect(contrastRatio('rgb(119, 119, 119)', parseColor('rgb(255, 255, 255)'))).toBeCloseTo(4.48, 2)
  expect(contrastRatio('rgba(0, 0, 0, 0.5)', parseColor('rgb(255, 255, 255)'))).toBeCloseTo(3.95, 1)
})

for (const scheme of SCHEMES) {
  describe(`Contraste, ${schemeName(scheme)}`, () => {
    test('Button: texto de cada estilo y toggle sobre su fondo', async () => {
      const c = await render(
        <Themed scheme={scheme}>
          {(['filled', 'tonal', 'outlined', 'elevated', 'text'] as const).map((v) => (
            <Button key={v} variant={v}>{v}</Button>
          ))}
          {(['filled', 'tonal', 'outlined', 'elevated'] as const).flatMap((v) => [
            <Button key={`${v}-on`} variant={v} selected>{v} sí</Button>,
            <Button key={`${v}-off`} variant={v} selected={false}>{v} no</Button>,
          ])}
        </Themed>,
      )
      for (const b of c.querySelectorAll('button')) {
        expect(textContrast(b), `${b.textContent} (${b.dataset['variant']})`).toBeGreaterThanOrEqual(TEXT)
      }
    })

    test('IconButton: icono de cada estilo y toggle sobre su fondo', async () => {
      const c = await render(
        <Themed scheme={scheme}>
          {(['standard', 'filled', 'tonal', 'outlined'] as const).flatMap((v) => [
            <IconButton key={v} variant={v} label={v}><StarIcon /></IconButton>,
            <IconButton key={`${v}-on`} variant={v} label={`${v} sí`} selected><StarIcon filled /></IconButton>,
            <IconButton key={`${v}-off`} variant={v} label={`${v} no`} selected={false}><StarIcon /></IconButton>,
          ])}
        </Themed>,
      )
      for (const b of c.querySelectorAll('button')) {
        const icon = q(b, 'svg')
        expect(contrastRatio(cs(icon).fill, effectiveBackground(b)), b.getAttribute('aria-label') ?? '').toBeGreaterThanOrEqual(NON_TEXT)
      }
    })

    test('Fab y ExtendedFab: icono (3:1) y texto (4,5:1) de cada color sobre su contenedor', async () => {
      const variants = ['primary-container', 'secondary-container', 'tertiary-container', 'primary', 'secondary', 'tertiary'] as const
      const c = await render(
        <Themed scheme={scheme}>
          {variants.map((v) => (
            <span key={v}>
              <Fab variant={v} label={v}><EditIcon /></Fab>
              <ExtendedFab variant={v}><EditIcon />{v}</ExtendedFab>
            </span>
          ))}
        </Themed>,
      )
      for (const b of c.querySelectorAll<HTMLElement>('.mk-fab, .mk-extended-fab')) {
        const name = `${b.className} ${b.dataset['variant']}`
        expect(contrastRatio(cs(q(b, 'svg')).fill, effectiveBackground(b)), `icono ${name}`).toBeGreaterThanOrEqual(NON_TEXT)
      }
      for (const label of c.querySelectorAll('.mk-extended-fab-label')) {
        expect(textContrast(label), `texto ${label.textContent}`).toBeGreaterThanOrEqual(TEXT)
      }
    })

    test('Checkbox: etiqueta, borde sin marcar, relleno y marca', async () => {
      const c = await render(
        <Themed scheme={scheme}>
          <Checkbox className="off">Sin marcar</Checkbox>
          <Checkbox className="on" defaultChecked>Marcado</Checkbox>
          <Checkbox className="err" error>Error</Checkbox>
        </Themed>,
      )
      const surface = effectiveBackground(c.querySelector('main') as Element)
      expect(textContrast(q(c, '.off .mk-checkbox-label'))).toBeGreaterThanOrEqual(TEXT)
      const outline = (sel: string) => cs(q(c, `${sel} .mk-checkbox-box`)).boxShadow.match(/^(rgba?\([^)]+\)|color\([^)]+\))/)?.[1] ?? ''
      expect(contrastRatio(outline('.off'), surface), 'borde sin marcar').toBeGreaterThanOrEqual(NON_TEXT)
      expect(contrastRatio(outline('.err'), surface), 'borde en error').toBeGreaterThanOrEqual(NON_TEXT)
      const box = q(c, '.on .mk-checkbox-box')
      expect(contrastRatio(cs(box).backgroundColor, surface), 'relleno marcado').toBeGreaterThanOrEqual(NON_TEXT)
      expect(contrastRatio(cs(q(c, '.on .mk-checkbox-icon')).stroke, effectiveBackground(box)), 'marca').toBeGreaterThanOrEqual(NON_TEXT)
    })

    test('Switch: etiqueta, borde de la pista, pista activada y handle', async () => {
      const c = await render(
        <Themed scheme={scheme}>
          <Switch className="off">Desactivado</Switch>
          <Switch className="on" defaultChecked>Activado</Switch>
        </Themed>,
      )
      const surface = effectiveBackground(c.querySelector('main') as Element)
      expect(textContrast(q(c, '.off .mk-switch-label'))).toBeGreaterThanOrEqual(TEXT)
      const offTrack = cs(q(c, '.off .mk-switch-track')).boxShadow.match(/^(rgba?\([^)]+\)|color\([^)]+\))/)?.[1] ?? ''
      expect(contrastRatio(offTrack, surface), 'borde de la pista').toBeGreaterThanOrEqual(NON_TEXT)
      expect(contrastRatio(cs(q(c, '.off .mk-switch-handle')).backgroundColor, effectiveBackground(q(c, '.off .mk-switch-track'))), 'handle desactivado').toBeGreaterThanOrEqual(NON_TEXT)
      const onTrack = q(c, '.on .mk-switch-track')
      expect(contrastRatio(cs(onTrack).backgroundColor, surface), 'pista activada').toBeGreaterThanOrEqual(NON_TEXT)
      expect(contrastRatio(cs(q(c, '.on .mk-switch-handle')).backgroundColor, effectiveBackground(onTrack)), 'handle activado').toBeGreaterThanOrEqual(NON_TEXT)
    })

    for (const variant of ['filled', 'outlined'] as const) {
      test(`TextField ${variant}: texto, etiqueta, ayuda, error e indicador o borde`, async () => {
        const c = await render(
          <Themed scheme={scheme}>
            <TextField variant={variant} className="ok">
              <TextFieldLabel>Nombre</TextFieldLabel>
              <TextFieldInput defaultValue="Ana" />
              <TextFieldSupporting>Ayuda</TextFieldSupporting>
            </TextField>
            <TextField variant={variant} className="err" error>
              <TextFieldLabel>Usuario</TextFieldLabel>
              <TextFieldInput defaultValue="x" />
              <TextFieldSupporting>No disponible</TextFieldSupporting>
            </TextField>
          </Themed>,
        )
        const surface = effectiveBackground(c.querySelector('main') as Element)
        const container = q(c, '.ok .mk-text-field-container')
        const fieldBg = effectiveBackground(container)
        expect(contrastRatio(cs(q(c, '.ok input')).color, fieldBg), 'texto escrito').toBeGreaterThanOrEqual(TEXT)
        expect(contrastRatio(cs(q(c, '.ok .mk-text-field-label')).color, fieldBg), 'etiqueta').toBeGreaterThanOrEqual(TEXT)
        expect(textContrast(q(c, '.ok .mk-text-field-supporting')), 'ayuda').toBeGreaterThanOrEqual(TEXT)
        expect(textContrast(q(c, '.err .mk-text-field-supporting')), 'ayuda en error').toBeGreaterThanOrEqual(TEXT)
        expect(contrastRatio(cs(q(c, '.err .mk-text-field-label')).color, effectiveBackground(q(c, '.err .mk-text-field-container'))), 'etiqueta en error').toBeGreaterThanOrEqual(TEXT)
        const boundary =
          variant === 'filled'
            ? contrastRatio(getComputedStyle(container, '::after').backgroundColor, fieldBg)
            : contrastRatio(cs(q(c, '.ok .mk-text-field-outline')).borderTopColor, surface)
        expect(boundary, variant === 'filled' ? 'indicador' : 'borde').toBeGreaterThanOrEqual(NON_TEXT)
      })
    }

    test('Dialog: título y texto sobre el contenedor', async () => {
      const c = await render(
        <Themed scheme={scheme}>
          <Dialog open>
            <DialogHeadline>Título</DialogHeadline>
            <DialogContent>Texto del diálogo</DialogContent>
          </Dialog>
        </Themed>,
      )
      expect(textContrast(q(c, '.mk-dialog-headline'))).toBeGreaterThanOrEqual(TEXT)
      expect(textContrast(q(c, '.mk-dialog-content'))).toBeGreaterThanOrEqual(TEXT)
    })

    for (const layout of ['vertical', 'horizontal'] as const) {
      test(`NavigationBar ${layout}: iconos y etiquetas, activo e inactivo, e insignias`, async () => {
        const c = await render(
          <Themed scheme={scheme}>
            <NavigationBar layout={layout} style={{ width: 400 }}>
              <NavigationBarItem href="#" className="off">
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
          </Themed>,
        )
        const bar = effectiveBackground(q(c, 'nav'))
        for (const sel of ['.off', '.on']) {
          const item = q(c, sel)
          const indicator = q(item, ':scope > .mk-navigation-bar-item-indicator')
          const label = q(item, '.mk-navigation-bar-item-label')
          // El indicador inactivo mide 0 de ancho (conserva el color para encogerse al
          // desactivarse): ahí el fondo del icono es la barra. La etiqueta queda sobre el
          // indicador solo en la horizontal.
          const iconBg = sel === '.on' ? effectiveBackground(indicator) : bar
          expect(contrastRatio(cs(q(item, 'svg')).fill, iconBg), `${sel} icono`).toBeGreaterThanOrEqual(NON_TEXT)
          const labelBg = layout === 'horizontal' ? iconBg : bar
          expect(contrastRatio(cs(label).color, labelBg), `${sel} etiqueta`).toBeGreaterThanOrEqual(TEXT)
        }
        // El indicador activo identifica el estado (1.4.11), pero el activo también se marca con
        // el color del icono y la etiqueta; no se le exige 3:1 contra la barra, igual que a los
        // contenedores tonales de los botones.
        expect(contrastRatio(cs(q(c, '.off .mk-badge')).backgroundColor, bar), 'insignia pequeña').toBeGreaterThanOrEqual(NON_TEXT)
        const large = q(c, '.on .mk-badge')
        expect(contrastRatio(cs(large).color, effectiveBackground(large)), 'número de la insignia').toBeGreaterThanOrEqual(TEXT)
      })
    }

    for (const variant of ['standard', 'vibrant'] as const) {
      test(`Menu ${variant}: texto, iconos y atajo sobre el menú, y seleccionado sobre su fondo`, async () => {
        const c = await render(
          <Themed scheme={scheme}>
            <Menu defaultOpen>
              <MenuTrigger><Button>Abrir</Button></MenuTrigger>
              <MenuContent variant={variant}>
                <MenuItem className="plain"><MenuItemLeading><EditIcon /></MenuItemLeading>Editar<MenuItemTrailing>Ctrl+E</MenuItemTrailing></MenuItem>
                <MenuItem className="on" type="radio" selected><MenuItemLeading><CheckIcon /></MenuItemLeading>Elegido<MenuItemTrailing>Ctrl+N</MenuItemTrailing></MenuItem>
              </MenuContent>
            </Menu>
          </Themed>,
        )
        for (const sel of ['.plain', '.on']) {
          const it = q(c, sel)
          const bg = effectiveBackground(it)
          expect(textContrast(it), `${sel} texto`).toBeGreaterThanOrEqual(TEXT)
          expect(contrastRatio(cs(q(it, '.mk-menu-item-trailing')).color, bg), `${sel} atajo`).toBeGreaterThanOrEqual(TEXT)
          expect(contrastRatio(cs(q(it, '.mk-menu-item-leading svg')).fill, bg), `${sel} icono`).toBeGreaterThanOrEqual(NON_TEXT)
        }
      })
    }
  })
}
