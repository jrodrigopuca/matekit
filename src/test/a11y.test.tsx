// Revisión automática de accesibilidad (axe-core) de todos los componentes, en sus estados
// principales y en los dos temas. El contraste se mide sobre el fondo `surface` del tema.

import type { ReactNode } from 'react'
import { describe, expect, test } from 'vitest'
import {
  AddIcon,
  Badge,
  HomeIcon,
  NavigationBar,
  NavigationBarItem,
  NavigationBarItemIcon,
  NavigationBarItemLabel,
  SettingsIcon,
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
  Menu,
  MenuContent,
  MenuDivider,
  MenuItem,
  MenuItemLeading,
  MenuItemTrailing,
  MenuTrigger,
  MoreVertIcon,
  EditIcon,
  ExtendedFab,
  Fab,
  CheckIcon,
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
  Fab: (
    <>
      {(['primary-container', 'secondary-container', 'tertiary-container', 'primary', 'secondary', 'tertiary'] as const).map((v) => (
        <span key={v}>
          <Fab variant={v} label={`Redactar ${v}`}><EditIcon /></Fab>
          <ExtendedFab variant={v}><EditIcon />Redactar {v}</ExtendedFab>
        </span>
      ))}
      {(['sm', 'md', 'lg'] as const).map((s) => (
        <span key={s}>
          <Fab size={s} label={`Nuevo ${s}`} lowered><AddIcon /></Fab>
          <ExtendedFab size={s}><AddIcon />Nuevo {s}</ExtendedFab>
          <ExtendedFab size={s} expanded={false}><AddIcon />Nuevo contraído {s}</ExtendedFab>
        </span>
      ))}
      <Fab label="Nuevo enlace" href="#nuevo"><AddIcon /></Fab>
      <ExtendedFab href="#redactar"><EditIcon />Redactar enlace</ExtendedFab>
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
  NavigationBar: (
    <>
      {(['vertical', 'horizontal'] as const).map((layout) => (
        <NavigationBar key={layout} layout={layout} aria-label={`Principal ${layout}`}>
          <NavigationBarItem href="#inicio" active>
            <NavigationBarItemIcon><HomeIcon /></NavigationBarItemIcon>
            <NavigationBarItemLabel>Inicio</NavigationBarItemLabel>
          </NavigationBarItem>
          <NavigationBarItem href="#favoritos">
            <NavigationBarItemIcon><StarIcon /></NavigationBarItemIcon>
            <NavigationBarItemLabel>Favoritos</NavigationBarItemLabel>
            <Badge label="3 nuevos">3</Badge>
          </NavigationBarItem>
          <NavigationBarItem href="#buscar">
            <NavigationBarItemIcon><SearchIcon /></NavigationBarItemIcon>
            <NavigationBarItemLabel>Buscar</NavigationBarItemLabel>
            <Badge label="Novedades" />
          </NavigationBarItem>
          <NavigationBarItem aria-label="Ajustes">
            <NavigationBarItemIcon><SettingsIcon /></NavigationBarItemIcon>
          </NavigationBarItem>
        </NavigationBar>
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

  for (const theme of THEMES) {
    for (const variant of ['standard', 'vibrant'] as const) {
      test(`Menu ${variant} abierto, tema ${theme === 'light' ? 'claro' : 'oscuro'}`, async () => {
        const c = await render(
          <Themed theme={theme}>
            <Menu defaultOpen>
              <MenuTrigger><IconButton label="Más opciones"><MoreVertIcon /></IconButton></MenuTrigger>
              <MenuContent variant={variant}>
                <MenuItem><MenuItemLeading><EditIcon /></MenuItemLeading>Editar<MenuItemTrailing>Ctrl+E</MenuItemTrailing></MenuItem>
                <MenuItem disabled><MenuItemLeading><DeleteIcon /></MenuItemLeading>Eliminar</MenuItem>
                <MenuDivider />
                <MenuItem type="radio" selected><MenuItemLeading><CheckIcon /></MenuItemLeading>Por nombre</MenuItem>
                <MenuItem type="radio" selected={false}><MenuItemLeading />Por fecha</MenuItem>
                <MenuDivider />
                <MenuItem type="checkbox" selected={false}>Mostrar ocultos</MenuItem>
              </MenuContent>
            </Menu>
          </Themed>,
        )
        expect(await a11yViolations(c)).toEqual([])
      })
    }
  }
})
