// Contraste de los componentes en los dos temas (WCAG 2.2): 4,5:1 para texto (1.4.3) y 3:1
// para iconos y para los bordes o rellenos que identifican un control (1.4.11). Los estados
// deshabilitados están exentos en WCAG y no se revisan.

import type { ReactNode } from 'react'
import { describe, expect, test } from 'vitest'
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeadline,
  IconButton,
  StarIcon,
  Switch,
  TextField,
  TextFieldInput,
  TextFieldLabel,
  TextFieldSupporting,
} from '../index.ts'
import { contrastRatio, effectiveBackground, parseColor, textContrast } from './contrast.ts'
import { render } from './render.tsx'

const TEXT = 4.5
const NON_TEXT = 3
const THEMES = ['light', 'dark'] as const
const themeName = (t: (typeof THEMES)[number]) => (t === 'light' ? 'claro' : 'oscuro')

const Themed = ({ theme, children }: { theme: string; children: ReactNode }) => (
  <main data-theme={theme} style={{ background: 'var(--md-sys-color-surface)', padding: 16 }}>
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

for (const theme of THEMES) {
  describe(`Contraste, tema ${themeName(theme)}`, () => {
    test('Button: texto de cada estilo y toggle sobre su fondo', async () => {
      const c = await render(
        <Themed theme={theme}>
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
        <Themed theme={theme}>
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

    test('Checkbox: etiqueta, borde sin marcar, relleno y marca', async () => {
      const c = await render(
        <Themed theme={theme}>
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
        <Themed theme={theme}>
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
          <Themed theme={theme}>
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
        <Themed theme={theme}>
          <Dialog open>
            <DialogHeadline>Título</DialogHeadline>
            <DialogContent>Texto del diálogo</DialogContent>
          </Dialog>
        </Themed>,
      )
      expect(textContrast(q(c, '.mk-dialog-headline'))).toBeGreaterThanOrEqual(TEXT)
      expect(textContrast(q(c, '.mk-dialog-content'))).toBeGreaterThanOrEqual(TEXT)
    })
  })
}
