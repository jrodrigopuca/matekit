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
  NavigationRail,
  NavigationRailHeader,
  NavigationRailItem,
  NavigationRailItemIcon,
  NavigationRailItemLabel,
  MenuIcon,
  SettingsIcon,
  Button,
  CancelIcon,
  Checkbox,
  RadioButton,
  RadioGroup,
  RadioGroupLabel,
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
  LoadingIndicator,
  LinearProgressIndicator,
  CircularProgressIndicator,
  Shape,
  Divider,
  DividerSubhead,
} from '../index.ts'
import { a11yViolations } from './a11y.ts'
import { render } from './render.tsx'
import '../shapes.css'

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
      {(['filled', 'tonal', 'outlined', 'elevated', 'text'] as const).map((v) => (
        <Button key={`${v}-link`} variant={v} href={`#${v}`}>{v} enlace</Button>
      ))}
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
      {(['standard', 'filled', 'tonal', 'outlined'] as const).map((v) => (
        <IconButton key={v} variant={v} label={`${v} enlace`} href={`#${v}`}><StarIcon /></IconButton>
      ))}
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
  RadioButton: (
    <>
      <RadioGroup defaultValue="retiro">
        <RadioGroupLabel>Envío</RadioGroupLabel>
        <RadioButton value="retiro">Retiro en el local</RadioButton>
        <RadioButton value="domicilio">A domicilio</RadioButton>
        <RadioButton value="correo" disabled>Correo</RadioButton>
      </RadioGroup>
      <RadioGroup aria-label="Talle" disabled orientation="horizontal" defaultValue="m">
        <RadioButton value="s">Chico</RadioButton>
        <RadioButton value="m">Mediano</RadioButton>
      </RadioGroup>
      <RadioButton name="suelto" value="si">Suelto</RadioButton>
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
  NavigationRail: (
    <div style={{ display: 'flex', gap: 16 }}>
      {[
        { expanded: false, variant: 'docked', align: 'top', labels: 'visible' },
        { expanded: false, variant: 'docked', align: 'middle', labels: 'hidden' },
        { expanded: true, variant: 'docked', align: 'top', labels: 'visible' },
        { expanded: true, variant: 'floating', align: 'middle', labels: 'visible' },
      ].map((o, i) => (
        <div key={i} style={{ height: 640, display: 'flex' }}>
          <NavigationRail
            id={`rail-${i}`}
            aria-label={`Riel ${i + 1}`}
            expanded={o.expanded}
            variant={o.variant as 'docked' | 'floating'}
            align={o.align as 'top' | 'middle'}
            collapsedLabels={o.labels as 'visible' | 'hidden'}
          >
            <NavigationRailHeader>
              <IconButton label={`Menú ${i + 1}`} size="md" shape="square" aria-expanded={o.expanded} aria-controls={`rail-${i}`}>
                <MenuIcon />
              </IconButton>
              <ExtendedFab expanded={o.expanded}><EditIcon />Redactar {i + 1}</ExtendedFab>
            </NavigationRailHeader>
            <NavigationRailItem href="#inicio" active>
              <NavigationRailItemIcon><HomeIcon filled /></NavigationRailItemIcon>
              <NavigationRailItemLabel>Inicio</NavigationRailItemLabel>
            </NavigationRailItem>
            <NavigationRailItem href="#favoritos">
              <NavigationRailItemIcon><StarIcon /></NavigationRailItemIcon>
              <NavigationRailItemLabel>Favoritos</NavigationRailItemLabel>
              <Badge label="3 nuevos">3</Badge>
            </NavigationRailItem>
            <NavigationRailItem href="#buscar">
              <NavigationRailItemIcon><SearchIcon /></NavigationRailItemIcon>
              <NavigationRailItemLabel>Buscar</NavigationRailItemLabel>
              <Badge label="Novedades" />
            </NavigationRailItem>
            <NavigationRailItem aria-label="Ajustes">
              <NavigationRailItemIcon><SettingsIcon /></NavigationRailItemIcon>
            </NavigationRailItem>
          </NavigationRail>
        </div>
      ))}
    </div>
  ),
  Icon: (
    <>
      <Icon label="Favorito"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /></svg></Icon>
      <span><Icon><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /></svg></Icon> Decorativo</span>
    </>
  ),
  // Shape es decoración: un avatar lleva el texto alternativo en la imagen, o role="img" con
  // nombre en la forma; un fondo de icono deja el icono decorativo.
  Shape: (
    <>
      <Shape shape="cookie-9-sided" style={{ width: 48, height: 48 }}>
        <img alt="Ana" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" />
      </Shape>
      <Shape shape="heart" role="img" aria-label="Favorito" style={{ width: 48, height: 48, background: 'var(--md-sys-color-primary)' }} />
      <Shape shape="sunny" style={{ width: 48, height: 48, background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)' }}>
        <StarIcon />
      </Shape>
    </>
  ),
  // La vertical lleva aria-orientation sobre el rol separator implícito del <hr>: axe tiene que
  // aceptarlo (aria-allowed-attr). El subtítulo deja la línea oculta y el encabezado visible.
  Divider: (
    <>
      <p>Arriba</p>
      <Divider />
      <Divider inset="start" />
      <Divider inset="both" decorative />
      <div style={{ display: 'flex', height: 40 }}>
        <span>Izquierda</span>
        <Divider orientation="vertical" />
        <Divider orientation="vertical" inset="both" />
        <span>Derecha</span>
      </div>
      <DividerSubhead><h2>Recientes</h2></DividerSubhead>
    </>
  ),
  LoadingIndicator: (
    <>
      <LoadingIndicator label="Cargando" />
      <LoadingIndicator contained label="Actualizando" />
      <LoadingIndicator value={0.4} label="Subiendo foto" />
      <LoadingIndicator contained value={1} label="Listo" />
    </>
  ),
  ProgressIndicator: (
    <>
      <LinearProgressIndicator label="Subiendo foto" value={0.4} />
      <LinearProgressIndicator label="Cargando" wavy thickness={8} />
      <LinearProgressIndicator label="Copiando" value={0.6} wavy />
      <CircularProgressIndicator label="Actualizando" />
      <CircularProgressIndicator label="Descargando" value={0.6} wavy thickness={8} />
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
