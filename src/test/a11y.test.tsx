// Revisión automática de accesibilidad (axe-core) de todos los componentes, en sus estados
// principales y en los dos temas. El contraste se mide sobre el fondo `surface` del tema.

import type { ReactNode } from 'react'
import { describe, expect, test } from 'vitest'
import {
  AddIcon,
  Button,
  CancelIcon,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogHeadline,
  DialogIcon,
  DeleteIcon,
  IconButton,
  SearchIcon,
  StarIcon,
  Switch,
  TextField,
  TextFieldInput,
  TextFieldLabel,
  TextFieldLeading,
  TextFieldSupporting,
  TextFieldTrailing,
  Icon,
} from '../index.ts'
import { a11yViolations } from './a11y.ts'
import { render } from './render.tsx'

const THEMES = ['light', 'dark'] as const

function Themed({ theme, children }: { theme: (typeof THEMES)[number]; children: ReactNode }) {
  return (
    <main
      data-theme={theme}
      style={{ background: 'var(--md-sys-color-surface)', color: 'var(--md-sys-color-on-surface)', padding: 16 }}
    >
      {children}
    </main>
  )
}

const GALLERIES: Record<string, ReactNode> = {
  Button: (
    <>
      {(['filled', 'tonal', 'outlined', 'elevated', 'text'] as const).map((v) => (
        <Button key={v} variant={v}><AddIcon />{v}</Button>
      ))}
      {(['filled', 'tonal', 'outlined', 'elevated'] as const).map((v) => (
        <span key={v}>
          <Button variant={v} selected>{v} sí</Button>
          <Button variant={v} selected={false}>{v} no</Button>
        </span>
      ))}
      <Button disabled>Deshabilitado</Button>
      {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((s) => <Button key={s} size={s}>{s}</Button>)}
    </>
  ),
  IconButton: (
    <>
      {(['standard', 'filled', 'tonal', 'outlined'] as const).map((v) => (
        <span key={v}>
          <IconButton variant={v} label={`${v} común`}><StarIcon /></IconButton>
          <IconButton variant={v} label={`${v} seleccionado`} selected><StarIcon filled /></IconButton>
          <IconButton variant={v} label={`${v} sin seleccionar`} selected={false}><StarIcon /></IconButton>
        </span>
      ))}
      <IconButton label="Deshabilitado" disabled><StarIcon /></IconButton>
    </>
  ),
  Checkbox: (
    <>
      <Checkbox>Sin marcar</Checkbox>
      <Checkbox defaultChecked>Marcado</Checkbox>
      <Checkbox indeterminate>Indeterminado</Checkbox>
      <Checkbox error>Con error</Checkbox>
      <Checkbox disabled defaultChecked>Deshabilitado</Checkbox>
    </>
  ),
  Switch: (
    <>
      <Switch>Desactivado</Switch>
      <Switch defaultChecked>Activado</Switch>
      <Switch icons>Con iconos</Switch>
      <Switch icons defaultChecked>Con iconos activado</Switch>
      <Switch disabled>Deshabilitado</Switch>
    </>
  ),
  TextField: (
    <>
      {(['filled', 'outlined'] as const).map((v) => (
        <div key={v}>
          <TextField variant={v}>
            <TextFieldLeading><SearchIcon /></TextFieldLeading>
            <TextFieldLabel>Buscar {v}</TextFieldLabel>
            <TextFieldInput defaultValue="yerba" />
            <TextFieldTrailing><IconButton label="Borrar"><CancelIcon /></IconButton></TextFieldTrailing>
            <TextFieldSupporting>Mínimo 3 letras</TextFieldSupporting>
          </TextField>
          <TextField variant={v} error>
            <TextFieldLabel>Usuario {v}</TextFieldLabel>
            <TextFieldInput defaultValue="x" />
            <TextFieldSupporting>No disponible</TextFieldSupporting>
          </TextField>
          <TextField variant={v} disabled>
            <TextFieldLabel>Deshabilitado {v}</TextFieldLabel>
            <TextFieldInput />
          </TextField>
        </div>
      ))}
    </>
  ),
  Icon: (
    <>
      <Icon label="Favorito"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /></svg></Icon>
      <span><Icon><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /></svg></Icon> Decorativo</span>
    </>
  ),
}

describe('Accesibilidad automática (axe-core)', () => {
  for (const [name, gallery] of Object.entries(GALLERIES)) {
    for (const theme of THEMES) {
      test(`${name}, tema ${theme === 'light' ? 'claro' : 'oscuro'}`, async () => {
        const c = await render(<Themed theme={theme}>{gallery}</Themed>)
        expect(await a11yViolations(c)).toEqual([])
      })
    }
  }

  for (const theme of THEMES) {
    for (const alert of [false, true]) {
      test(`Dialog${alert ? ' de alerta' : ''}, tema ${theme === 'light' ? 'claro' : 'oscuro'}`, async () => {
        const c = await render(
          <Themed theme={theme}>
            <Dialog open alert={alert}>
              <DialogIcon><DeleteIcon /></DialogIcon>
              <DialogHeadline>¿Eliminar archivo?</DialogHeadline>
              <DialogContent>No se puede deshacer.</DialogContent>
              <DialogActions>
                <Button variant="text">Cancelar</Button>
                <Button variant="text">Eliminar</Button>
              </DialogActions>
            </Dialog>
          </Themed>,
        )
        expect(await a11yViolations(c)).toEqual([])
      })
    }
  }
})
