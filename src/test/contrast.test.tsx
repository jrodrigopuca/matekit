// Contraste de los componentes (WCAG 2.2): 4,5:1 para texto (1.4.3) y 3:1 para iconos y para
// los bordes o rellenos que identifican un control (1.4.11). Los estados deshabilitados están
// exentos en WCAG y no se revisan. Se revisa cada combinación de paleta (la base y las
// opcionales), nivel de contraste y tema (ADR-0008).

import type { ReactNode } from 'react'
import { describe, expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import {
  AssistChip,
  ChipAvatar,
  FilterChip,
  InputChip,
  SuggestionChip,
  ArrowDropDownIcon,
  Badge,
  Button,
  HomeIcon,
  NavigationBar,
  NavigationBarItem,
  NavigationBarItemIcon,
  NavigationBarItemLabel,
  NavigationRail,
  NavigationRailItem,
  NavigationRailItemIcon,
  NavigationRailItemLabel,
  Checkbox,
  DividerSubhead,
  RadioButton,
  RadioGroup,
  RadioGroupLabel,
  Dialog,
  DialogContent,
  DialogHeadline,
  IconButton,
  LoadingIndicator,
  LinearProgressIndicator,
  CircularProgressIndicator,
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
  Slider,
  RangeSlider,
  RangeSliderStart,
  RangeSliderEnd,
  TextField,
  TextFieldInput,
  TextFieldLabel,
  TextFieldSupporting,
  Card,
  CardContent,
  CardHeader,
  CardHeadline,
  CardPrimaryAction,
  CardSubhead,
  List,
  ListItem,
  ListItemAction,
  ListItemDetails,
  ListItemHeadline,
  ListItemLeading,
  ListItemOverline,
  ListItemSummary,
  ListItemSupporting,
  ListItemTrailing,
  ChevronRightIcon,
  Tooltip,
  RichTooltip,
  RichTooltipActions,
  RichTooltipContent,
  RichTooltipSubhead,
  RichTooltipSupporting,
  RichTooltipTrigger,
  Snackbar,
  SnackbarAction,
  SnackbarClose,
  SnackbarMessage,
  Tab,
  TabList,
  Tabs,
  TopAppBar,
  TopAppBarActions,
  TopAppBarLeading,
  TopAppBarSubtitle,
  TopAppBarTitle,
  Search,
  SearchBar,
  SearchBarLeading,
  SearchBarTrailing,
  SearchSuggestion,
  SearchSuggestionGroup,
  SearchView,
  BottomSheet,
  BottomSheetContent,
  BottomSheetHandle,
  BottomSheetTitle,
  SideSheet,
  SideSheetActions,
  SideSheetClose,
  SideSheetContent,
  SideSheetHeader,
  SideSheetTitle,
} from '../index.ts'
import '../tokens/palettes/index.css'
import { contrastRatio, effectiveBackground, parseColor, textContrast, type RGBA } from './contrast.ts'
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
          {(['filled', 'tonal', 'outlined', 'elevated', 'text'] as const).map((v) => (
            <Button key={`${v}-link`} variant={v} href={`#${v}`}>{v} enlace</Button>
          ))}
        </Themed>,
      )
      expect(c.querySelectorAll('a.mk-button')).toHaveLength(5)
      for (const b of c.querySelectorAll<HTMLElement>('.mk-button')) {
        expect(textContrast(b), `${b.textContent} (${b.dataset['variant']})`).toBeGreaterThanOrEqual(TEXT)
      }
    })

    // Chips: texto a 4,5:1 e iconos (inicio, marca, final y quitar) a 3:1 sobre el contenedor de
    // cada tipo y estilo, en reposo y seleccionado; el anillo de foco a 3:1 sobre la página. El
    // borde del outlined (outline-variant) no se mide: no identifica el control, lo identifica su
    // texto, que es el nombre (WCAG 1.4.11 pide 3:1 a lo necesario para identificarlo), y Material
    // lo quiere tenue, como el del Button outlined y la Card. El seleccionado del filter se
    // distingue por la marca, que sí se mide.
    test('Chips: texto e iconos de cada tipo y estilo, en reposo y seleccionado, y anillo de foco', async () => {
      const c = await render(
        <Themed scheme={scheme}>
          {(['outlined', 'elevated'] as const).flatMap((v) => [
            <AssistChip key={`as-${v}`} className={`as-${v}`} variant={v}><StarIcon />Asistir</AssistChip>,
            <SuggestionChip key={`su-${v}`} className={`su-${v}`} variant={v}><StarIcon />Sugerir</SuggestionChip>,
            <SuggestionChip key={`sus-${v}`} className={`sus-${v}`} variant={v} selected><StarIcon />Elegida</SuggestionChip>,
            <FilterChip key={`fi-${v}`} className={`fi-${v}`} variant={v}><StarIcon />Filtro<ArrowDropDownIcon /></FilterChip>,
            <FilterChip key={`fis-${v}`} className={`fis-${v}`} variant={v} selected>Filtro<ArrowDropDownIcon /></FilterChip>,
          ])}
          <InputChip className="in" onRemove={() => {}}><StarIcon />Entrada</InputChip>
          <InputChip className="ins" selected onRemove={() => {}}><StarIcon />Elegida</InputChip>
          <InputChip className="ina" selected onRemove={() => {}}><ChipAvatar>A</ChipAvatar>Ana</InputChip>
        </Themed>,
      )
      const chips = [...c.querySelectorAll<HTMLElement>('.mk-chip, .mk-input-chip')]
      expect(chips).toHaveLength(13)
      for (const chip of chips) {
        const name = chip.className
        const bg = effectiveBackground(chip)
        expect(textContrast(q(chip, '.mk-chip-label')), `${name} texto`).toBeGreaterThanOrEqual(TEXT)
        for (const icon of chip.querySelectorAll('.mk-chip-leading, .mk-chip-trailing, .mk-input-chip-remove, .mk-chip-avatar[data-checked]')) {
          expect(contrastRatio(cs(icon).color, bg), `${name} ${icon.className}`).toBeGreaterThanOrEqual(NON_TEXT)
        }
        expect(contrastRatio(cs(q(chip, '.mk-focus-ring')).outlineColor, effectiveBackground(q(c, 'main'))), `${name} anillo`).toBeGreaterThanOrEqual(NON_TEXT)
      }
    })

    // La línea del Divider (outline-variant) no se mide: no identifica un control ni es
    // necesaria para entender el contenido (WCAG 1.4.11 exceptúa lo decorativo), y Material la
    // quiere tenue a propósito. Lo que agrupa es el espacio o el título. El subtítulo sí es
    // texto: 4,5:1 sobre la superficie.
    test('DividerSubhead: título sobre la superficie', async () => {
      const c = await render(
        <Themed scheme={scheme}>
          <DividerSubhead><h3>Recientes</h3></DividerSubhead>
        </Themed>,
      )
      expect(textContrast(q(c, 'h3'))).toBeGreaterThanOrEqual(TEXT)
    })

    test('IconButton: icono de cada estilo y toggle sobre su fondo', async () => {
      const c = await render(
        <Themed scheme={scheme}>
          {(['standard', 'filled', 'tonal', 'outlined'] as const).flatMap((v) => [
            <IconButton key={v} variant={v} label={v}><StarIcon /></IconButton>,
            <IconButton key={`${v}-on`} variant={v} label={`${v} sí`} selected><StarIcon filled /></IconButton>,
            <IconButton key={`${v}-off`} variant={v} label={`${v} no`} selected={false}><StarIcon /></IconButton>,
            <IconButton key={`${v}-link`} variant={v} label={`${v} enlace`} href={`#${v}`}><StarIcon /></IconButton>,
          ])}
        </Themed>,
      )
      expect(c.querySelectorAll('a.mk-icon-button')).toHaveLength(4)
      for (const b of c.querySelectorAll<HTMLElement>('.mk-icon-button')) {
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

    test('RadioButton: título del grupo, etiqueta, anillo sin seleccionar, anillo y punto seleccionados', async () => {
      const c = await render(
        <Themed scheme={scheme}>
          <RadioGroup defaultValue="on">
            <RadioGroupLabel>Envío</RadioGroupLabel>
            <RadioButton value="off" className="off">Sin seleccionar</RadioButton>
            <RadioButton value="on" className="on">Seleccionado</RadioButton>
          </RadioGroup>
        </Themed>,
      )
      const surface = effectiveBackground(c.querySelector('main') as Element)
      expect(textContrast(q(c, '.mk-radio-group-label')), 'título').toBeGreaterThanOrEqual(TEXT)
      expect(textContrast(q(c, '.off .mk-radio-button-label')), 'etiqueta').toBeGreaterThanOrEqual(TEXT)
      expect(contrastRatio(cs(q(c, '.off .mk-radio-button-ring')).borderTopColor, surface), 'anillo sin seleccionar').toBeGreaterThanOrEqual(NON_TEXT)
      expect(contrastRatio(cs(q(c, '.on .mk-radio-button-ring')).borderTopColor, surface), 'anillo seleccionado').toBeGreaterThanOrEqual(NON_TEXT)
      expect(contrastRatio(cs(q(c, '.on .mk-radio-button-dot')).backgroundColor, surface), 'punto').toBeGreaterThanOrEqual(NON_TEXT)
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

    // WCAG 1.4.11 pide 3:1 a lo que hace falta para identificar el control y su estado: el handle
    // (dónde está el valor) y la pista activa (cuánto se eligió), contra la superficie, y el punto
    // de parada que marca el final sobre la pista inactiva. La pista inactiva no: el valor ya lo
    // dicen el handle y la pista activa, y Material la pinta a propósito con poco contraste
    // (secondary-container). Los pasos sí (on-primary sobre la activa, on-secondary-container
    // sobre la inactiva): marcan los valores posibles. El texto del indicador, 4,5:1.
    test('Slider y RangeSlider: handle, pista activa, puntos y texto del indicador', async () => {
      const c = await render(
        <Themed scheme={scheme}>
          <Slider label="Volumen" className="s" step={25} ticks defaultValue={50} />
          <RangeSlider className="r" defaultValue={[20, 80]}>
            <RangeSliderStart aria-label="Desde" />
            <RangeSliderEnd aria-label="Hasta" />
          </RangeSlider>
        </Themed>,
      )
      const surface = effectiveBackground(c.querySelector('main') as Element)
      for (const root of ['.s', '.r']) {
        expect(contrastRatio(cs(q(c, `${root} .mk-slider-handle`)).backgroundColor, surface), `${root} handle`).toBeGreaterThanOrEqual(NON_TEXT)
        const active = q(c, `${root} .mk-slider-segment[data-segment="active"]`)
        expect(contrastRatio(cs(active).backgroundColor, surface), `${root} pista activa`).toBeGreaterThanOrEqual(NON_TEXT)
        const inactive = q(c, `${root} .mk-slider-segment[data-segment="inactive-end"]`)
        const stop = q(inactive, '.mk-slider-mark:last-child')
        expect(contrastRatio(cs(stop).backgroundColor, effectiveBackground(inactive)), `${root} punto de parada`).toBeGreaterThanOrEqual(NON_TEXT)
        expect(textContrast(q(c, `${root} .mk-slider-value-indicator`)), `${root} indicador`).toBeGreaterThanOrEqual(TEXT)
      }
      const active = q(c, '.s .mk-slider-segment[data-segment="active"]')
      expect(contrastRatio(cs(q(active, '.mk-slider-mark')).backgroundColor, effectiveBackground(active)), 'paso sobre la activa').toBeGreaterThanOrEqual(NON_TEXT)
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

    // Card: el texto (título, subtítulo y apoyo, en la cabecera y en el contenido, también el
    // título enlace) a 4,5:1 sobre el contenedor de cada estilo. El borde de la outlined
    // (outline-variant) y el borde de las otras no se miden: no identifican el control (lo
    // identifica el título, que es el nombre y el texto de la acción principal) y agrupan como el
    // Divider, que Material quiere tenue (WCAG 1.4.11 pide 3:1 a lo necesario para identificar
    // un componente). El anillo de foco, que es lo que marca la tarjeta enfocada, sí: 3:1 sobre
    // la superficie de la página, donde se dibuja (por fuera).
    test('Card: texto de cada estilo sobre su contenedor y anillo de foco sobre la página', async () => {
      const c = await render(
        <Themed scheme={scheme}>
          {(['elevated', 'filled', 'outlined'] as const).map((v) => (
            <Card key={v} variant={v} className={v} style={{ marginBottom: 16 }}>
              <CardHeader>
                <CardHeadline><CardPrimaryAction href={`#${v}`}>Título {v}</CardPrimaryAction></CardHeadline>
                <CardSubhead>Subtítulo</CardSubhead>
              </CardHeader>
              <CardContent>
                <CardHeadline level={4}>Contenido</CardHeadline>
                <CardSubhead>Subtítulo</CardSubhead>
                <p>Texto de apoyo.</p>
              </CardContent>
            </Card>
          ))}
        </Themed>,
      )
      for (const v of ['elevated', 'filled', 'outlined']) {
        for (const sel of ['.mk-card-primary-action', '.mk-card-header .mk-card-subhead', '.mk-card-content .mk-card-headline', '.mk-card-content .mk-card-subhead', '.mk-card-content p:not(.mk-card-subhead)']) {
          expect(textContrast(q(c, `.${v} ${sel}`)), `${v} ${sel}`).toBeGreaterThanOrEqual(TEXT)
        }
        const ring = cs(q(c, `.${v} .mk-focus-ring`)).outlineColor
        expect(contrastRatio(ring, effectiveBackground(q(c, 'main'))), `${v} anillo`).toBeGreaterThanOrEqual(NON_TEXT)
      }
    })

    // List: el texto (overline, principal, apoyo y final) a 4,5:1, y los iconos de inicio y final,
    // el del acordeón y la casilla marcada a 3:1, en reposo (sobre la página o, en la segmentada,
    // sobre Surface) y seleccionado (Secondary Container). El anillo de foco se dibuja por dentro,
    // sobre el fondo del elemento: 3:1 sobre el de reposo y el seleccionado. No se miden los
    // bordes entre bloques de la segmentada ni los divisores: agrupan, no identifican un control
    // (lo identifica el texto, que es el nombre), y Material los quiere tenues (como el Divider).
    test('List: texto e iconos en reposo y seleccionado, casilla marcada, acordeón y anillo de foco', async () => {
      const item = (cls: string, current: boolean) => (
        <ListItem className={cls}>
          <ListItemLeading><StarIcon /></ListItemLeading>
          <ListItemOverline>Overline</ListItemOverline>
          <ListItemHeadline><ListItemAction href="#" current={current}>Principal</ListItemAction></ListItemHeadline>
          <ListItemSupporting>Apoyo</ListItemSupporting>
          <ListItemTrailing>3<ChevronRightIcon /></ListItemTrailing>
        </ListItem>
      )
      const c = await render(
        <Themed scheme={scheme}>
          <List className="std">{item('rest', false)}{item('sel', true)}</List>
          <div style={{ background: 'var(--md-sys-color-surface-container)', padding: 8 }}>
            <List variant="segmented" className="seg">
              {item('rest', false)}
              <ListItem className="cb"><Checkbox defaultChecked><ListItemHeadline>Casilla</ListItemHeadline></Checkbox></ListItem>
              <ListItem className="rb"><RadioButton name="contraste-list" defaultChecked><ListItemHeadline>Radio</ListItemHeadline></RadioButton></ListItem>
              <ListItem className="acc">
                <ListItemDetails><ListItemSummary><ListItemHeadline>Acordeón</ListItemHeadline></ListItemSummary><p>x</p></ListItemDetails>
              </ListItem>
              <ListItem className="acc-open">
                <ListItemDetails open><ListItemSummary><ListItemHeadline>Abierto</ListItemHeadline></ListItemSummary><p>Contenido</p></ListItemDetails>
              </ListItem>
            </List>
          </div>
        </Themed>,
      )
      for (const li of ['.std .rest', '.std .sel', '.seg .rest']) {
        for (const part of ['overline', 'headline', 'supporting', 'trailing']) {
          expect(textContrast(q(c, `${li} .mk-list-item-${part}`)), `${li} ${part}`).toBeGreaterThanOrEqual(TEXT)
        }
        for (const icon of ['.mk-list-item-leading', '.mk-list-item-trailing']) {
          const el = q(c, `${li} ${icon}`)
          expect(contrastRatio(cs(el).color, effectiveBackground(el)), `${li} icono ${icon}`).toBeGreaterThanOrEqual(NON_TEXT)
        }
        const ring = q(c, `${li} a > .mk-focus-ring`)
        expect(contrastRatio(cs(ring).outlineColor, effectiveBackground(q(c, li))), `${li} anillo`).toBeGreaterThanOrEqual(NON_TEXT)
      }
      expect(textContrast(q(c, '.cb .mk-list-item-headline'))).toBeGreaterThanOrEqual(TEXT)
      const box = q(c, '.cb .mk-checkbox-box')
      expect(contrastRatio(cs(box).backgroundColor, effectiveBackground(q(c, '.cb'))), 'casilla marcada').toBeGreaterThanOrEqual(NON_TEXT)
      const dot = q(c, '.rb .mk-radio-button-dot')
      expect(contrastRatio(cs(dot).backgroundColor, effectiveBackground(q(c, '.rb'))), 'radio marcado').toBeGreaterThanOrEqual(NON_TEXT)
      for (const acc of ['.acc', '.acc-open']) {
        expect(textContrast(q(c, `${acc} .mk-list-item-headline`))).toBeGreaterThanOrEqual(TEXT)
        const exp = q(c, `${acc} .mk-list-item-expand`)
        expect(contrastRatio(cs(exp).color, effectiveBackground(exp)), `${acc} icono`).toBeGreaterThanOrEqual(NON_TEXT)
      }
      expect(textContrast(q(c, '.acc-open p'))).toBeGreaterThanOrEqual(TEXT)
    })

    // La barra del asa es lo que identifica el control (WCAG 1.4.11): 3:1 sobre el sheet.
    test('BottomSheet: título y texto sobre el contenedor, y la barra del asa', async () => {
      const c = await render(
        <Themed scheme={scheme}>
          <BottomSheet open>
            <BottomSheetHandle />
            <BottomSheetTitle>Título</BottomSheetTitle>
            <BottomSheetContent><p>Texto del sheet</p></BottomSheetContent>
          </BottomSheet>
        </Themed>,
      )
      expect(textContrast(q(c, '.mk-bottom-sheet-title'))).toBeGreaterThanOrEqual(TEXT)
      expect(textContrast(q(c, '.mk-bottom-sheet-content p'))).toBeGreaterThanOrEqual(TEXT)
      const bar = getComputedStyle(q(c, '.mk-bottom-sheet-handle'), '::after').backgroundColor
      expect(contrastRatio(bar, effectiveBackground(q(c, '.mk-bottom-sheet')))).toBeGreaterThanOrEqual(NON_TEXT)
    })

    for (const modal of [true, false]) {
      test(`SideSheet ${modal ? 'modal' : 'standard'}: título, texto y el icono de cerrar sobre el contenedor`, async () => {
        const c = await render(
          <Themed scheme={scheme}>
            <SideSheet {...(modal ? { open: true } : { modal: false })}>
              <SideSheetHeader>
                <SideSheetTitle>Título</SideSheetTitle>
                <SideSheetClose />
              </SideSheetHeader>
              <SideSheetContent><p>Texto del sheet</p></SideSheetContent>
              <SideSheetActions><Button size="sm" variant="outlined">Cancelar</Button></SideSheetActions>
            </SideSheet>
          </Themed>,
        )
        expect(textContrast(q(c, '.mk-side-sheet-title'))).toBeGreaterThanOrEqual(TEXT)
        expect(textContrast(q(c, '.mk-side-sheet-content p'))).toBeGreaterThanOrEqual(TEXT)
        const close = q(c, '.mk-side-sheet-close')
        expect(contrastRatio(cs(close).color, effectiveBackground(close))).toBeGreaterThanOrEqual(NON_TEXT)
        expect(textContrast(q(c, '.mk-side-sheet-actions .mk-button'))).toBeGreaterThanOrEqual(TEXT)
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

    // Tabs: etiquetas a 4,5:1 e iconos a 3:1 sobre la barra, elegida y sin elegir (con el puntero o
    // el foco pasan a On Surface, el contenido de más contraste sobre Surface); el indicador a 3:1 (es lo que marca la elegida en la secondary, donde
    // la etiqueta solo pasa de On Surface Variant a On Surface) y el anillo de foco a 3:1.
    for (const variant of ['primary', 'secondary'] as const) {
      test(`Tabs ${variant}: etiquetas, iconos, indicador y anillo de foco`, async () => {
        const c = await render(
          <Themed scheme={scheme}>
            <Tabs defaultValue="a">
              <TabList variant={variant} style={{ width: 400 }}>
                <Tab value="a" className="on"><HomeIcon />Inicio</Tab>
                <Tab value="b" className="off"><StarIcon />Favoritos</Tab>
              </TabList>
            </Tabs>
          </Themed>,
        )
        const bar = effectiveBackground(q(c, '[role="tablist"]'))
        for (const sel of ['.on', '.off']) {
          expect(contrastRatio(cs(q(c, `${sel} .mk-tab-label`)).color, bar), `${sel} etiqueta`).toBeGreaterThanOrEqual(TEXT)
          expect(contrastRatio(cs(q(c, `${sel} .mk-tab-icon`)).color, bar), `${sel} icono`).toBeGreaterThanOrEqual(NON_TEXT)
          expect(contrastRatio(cs(q(c, `${sel} .mk-focus-ring`)).outlineColor, bar), `${sel} anillo`).toBeGreaterThanOrEqual(NON_TEXT)
        }
        expect(contrastRatio(cs(q(c, '.on .mk-tab-indicator')).backgroundColor, bar), 'indicador').toBeGreaterThanOrEqual(NON_TEXT)
      })
    }

    // Search: texto escrito y de ayuda a 4,5:1 e iconos a 3:1 sobre la barra (suelta, Surface
    // Container High; en el TopAppBar, Surface Container y Surface Container Highest al desplazar);
    // en la lista, el texto de las sugerencias, el nombre del grupo y el vacío a 4,5:1, la activa
    // con su capa de foco (10 %) compuesta sobre el fondo, y su anillo a 3:1.
    test('Search: barra (suelta y en el TopAppBar), sugerencias, activa, grupo y vacío', async () => {
      const c = await render(
        <Themed scheme={scheme}>
          <Search className="empty">
            <SearchBar label="Buscar" placeholder="Buscar frutas">
              <SearchBarLeading><StarIcon /></SearchBarLeading>
              <SearchBarTrailing><IconButton label="Voz"><HomeIcon /></IconButton></SearchBarTrailing>
            </SearchBar>
          </Search>
          <Search className="docked" view="docked" defaultValue="ma">
            <SearchBar label="Buscar" />
            <SearchView>
              <SearchSuggestionGroup label="Recientes">
                <SearchSuggestion value="mandarina" className="first">
                  <ListItemLeading><StarIcon /></ListItemLeading>
                  <ListItemHeadline>Mandarina</ListItemHeadline>
                  <ListItemSupporting>Cítrico</ListItemSupporting>
                </SearchSuggestion>
                <SearchSuggestion value="mango" className="second" />
              </SearchSuggestionGroup>
            </SearchView>
          </Search>
          <Search className="none" view="docked" defaultValue="zz">
            <SearchBar label="Sin resultados" />
            <SearchView />
          </Search>
          <div className="scroller" style={{ height: 200, overflow: 'auto' }}>
            <TopAppBar>
              <Search className="in-bar">
                <SearchBar label="Buscar en la barra" placeholder="Buscar" />
              </Search>
            </TopAppBar>
            <div style={{ height: 1000 }} />
          </div>
        </Themed>,
      )
      const barChecks = (sel: string) => {
        const input = q(c, `${sel} .mk-search-input`)
        const bg = effectiveBackground(input)
        expect(contrastRatio(cs(input).color, bg), `${sel} texto`).toBeGreaterThanOrEqual(TEXT)
        expect(contrastRatio(getComputedStyle(input, '::placeholder').color, bg), `${sel} ayuda`).toBeGreaterThanOrEqual(TEXT)
      }
      barChecks('.empty')
      for (const part of ['.mk-search-bar-leading svg', '.mk-search-bar-trailing svg']) {
        const el = q(c, `.empty ${part}`)
        expect(contrastRatio(cs(el).fill, effectiveBackground(el)), `icono ${part}`).toBeGreaterThanOrEqual(NON_TEXT)
      }
      expect(contrastRatio(cs(q(c, '.docked .mk-search-bar-clear svg')).fill, effectiveBackground(q(c, '.docked .mk-search-bar'))), 'borrar').toBeGreaterThanOrEqual(NON_TEXT)
      barChecks('.in-bar')
      q(c, '.scroller').scrollTop = 500
      const highest = document.createElement('span')
      highest.style.color = 'var(--md-sys-color-surface-container-highest)'
      q(c, 'main').append(highest)
      await expect.poll(() => cs(q(c, '.in-bar .mk-search-bar')).backgroundColor).toBe(cs(highest).color)
      barChecks('.in-bar')

      await userEvent.click(q(c, '.docked .mk-search-input'))
      await userEvent.keyboard('{ArrowDown}')
      const first = q(c, '.docked .first')
      expect(first.hasAttribute('data-active')).toBe(true)
      const layer = q(first, '.mk-state-layer')
      const [r, g, b] = parseColor(cs(layer).backgroundColor)
      const base = effectiveBackground(first)
      const a = Number(cs(layer).opacity)
      const active: RGBA = [r * a + base[0] * (1 - a), g * a + base[1] * (1 - a), b * a + base[2] * (1 - a), 1]
      for (const part of ['headline', 'supporting']) {
        expect(contrastRatio(cs(q(first, `.mk-list-item-${part}`)).color, active), `activa ${part}`).toBeGreaterThanOrEqual(TEXT)
      }
      expect(contrastRatio(cs(q(first, '.mk-list-item-leading')).color, active), 'activa icono').toBeGreaterThanOrEqual(NON_TEXT)
      expect(contrastRatio(cs(q(first, '.mk-focus-ring')).outlineColor, active), 'activa anillo').toBeGreaterThanOrEqual(NON_TEXT)
      expect(textContrast(q(c, '.docked .second .mk-list-item-headline')), 'en reposo').toBeGreaterThanOrEqual(TEXT)
      expect(textContrast(q(c, '.docked .mk-search-suggestion-group-label')), 'grupo').toBeGreaterThanOrEqual(TEXT)
      // Cerrar la lista abierta, que tapa al campo siguiente.
      await userEvent.keyboard('{Escape}')
      await expect.poll(() => q(c, '.docked .mk-search-results').matches(':popover-open')).toBe(false)
      await userEvent.click(q(c, '.none .mk-search-input'))
      expect(textContrast(q(c, '.none .mk-search-empty')), 'vacío').toBeGreaterThanOrEqual(TEXT)
    })

    // TopAppBar: título y subtítulo a 4,5:1 e iconos de inicio y acciones a 3:1, plana (Surface) y con
    // contenido debajo (Surface Container, la barra fija desplazada). Las copias de la barra
    // colapsada usan los mismos colores sobre la misma barra.
    test('TopAppBar: título, subtítulo e iconos, plana y desplazada', async () => {
      const bar = (cls: string, behavior: 'none' | 'pinned') => (
        <TopAppBar className={cls} scrollBehavior={behavior}>
          <TopAppBarLeading><IconButton label="Volver"><HomeIcon /></IconButton></TopAppBarLeading>
          <TopAppBarTitle>Bandeja</TopAppBarTitle>
          <TopAppBarSubtitle>3 sin leer</TopAppBarSubtitle>
          <TopAppBarActions><IconButton label="Favorito"><StarIcon /></IconButton></TopAppBarActions>
        </TopAppBar>
      )
      const c = await render(
        <Themed scheme={scheme}>
          {bar('flat', 'none')}
          <div className="scroller" style={{ height: 200, overflow: 'auto' }}>
            {bar('scrolled', 'pinned')}
            <div style={{ height: 1000 }} />
          </div>
        </Themed>,
      )
      const probe = document.createElement('span')
      probe.style.color = 'var(--md-sys-color-surface-container)'
      q(c, 'main').append(probe)
      const container = cs(probe).color
      q(c, '.scroller').scrollTop = 500
      await expect.poll(() => cs(q(c, '.scrolled')).backgroundColor).toBe(container)
      for (const sel of ['.flat', '.scrolled']) {
        const bg = effectiveBackground(q(c, sel))
        expect(contrastRatio(cs(q(c, `${sel} .mk-top-app-bar-title`)).color, bg), `${sel} título`).toBeGreaterThanOrEqual(TEXT)
        expect(contrastRatio(cs(q(c, `${sel} .mk-top-app-bar-subtitle`)).color, bg), `${sel} subtítulo`).toBeGreaterThanOrEqual(TEXT)
        for (const part of ['leading', 'actions']) {
          expect(contrastRatio(cs(q(c, `${sel} .mk-top-app-bar-${part} svg`)).fill, bg), `${sel} ${part}`).toBeGreaterThanOrEqual(NON_TEXT)
        }
      }
    })

    for (const [expanded, variant] of [[false, 'docked'], [true, 'docked'], [true, 'floating']] as const) {
      test(`NavigationRail ${expanded ? 'expandido' : 'contraído'} ${variant}: iconos y etiquetas, activo e inactivo, e insignias`, async () => {
        const c = await render(
          <Themed scheme={scheme}>
            <div style={{ height: 300, display: 'flex' }}>
              <NavigationRail expanded={expanded} variant={variant}>
                <NavigationRailItem href="#" className="off">
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
          </Themed>,
        )
        // Docked sin fondo: el de debajo es surface; floating expandido, surface-container.
        const rail = effectiveBackground(q(c, 'nav'))
        for (const sel of ['.off', '.on']) {
          const item = q(c, sel)
          const indicator = q(item, ':scope > .mk-navigation-rail-item-indicator')
          const label = q(item, '.mk-navigation-rail-item-label')
          // El indicador inactivo mide 0 de ancho: ahí el fondo es el rail. La etiqueta queda
          // sobre el indicador solo en el expandido.
          const iconBg = sel === '.on' ? effectiveBackground(indicator) : rail
          expect(contrastRatio(cs(q(item, 'svg')).fill, iconBg), `${sel} icono`).toBeGreaterThanOrEqual(NON_TEXT)
          const labelBg = expanded ? iconBg : rail
          expect(contrastRatio(cs(label).color, labelBg), `${sel} etiqueta`).toBeGreaterThanOrEqual(TEXT)
        }
        expect(contrastRatio(cs(q(c, '.off .mk-badge')).backgroundColor, rail), 'insignia pequeña').toBeGreaterThanOrEqual(NON_TEXT)
        const large = q(c, '.on .mk-badge')
        expect(contrastRatio(cs(large).color, effectiveBackground(large)), 'número de la insignia').toBeGreaterThanOrEqual(TEXT)
      })
    }

    // La forma es un elemento no textual que identifica el estado (1.4.11): 3:1 contra su fondo,
    // la superficie sin contenedor y primary-container con él.
    test('LoadingIndicator: la forma sobre la superficie y sobre su contenedor', async () => {
      const c = await render(
        <Themed scheme={scheme}>
          <LoadingIndicator label="a" className="plain" />
          <LoadingIndicator label="b" contained className="box" />
          <LoadingIndicator label="c" value={0.5} className="det" />
          <LoadingIndicator label="d" value={0.5} contained className="det-box" />
        </Themed>,
      )
      for (const sel of ['.plain', '.box', '.det', '.det-box']) {
        const el = q(c, sel)
        expect(contrastRatio(cs(q(el, 'svg')).fill, effectiveBackground(el)), sel).toBeGreaterThanOrEqual(NON_TEXT)
      }
    })

    // Indicadores de progreso (1.4.11): el indicador comunica el valor y el punto final marca dónde
    // termina el rango, así que los dos van a 3:1 contra la superficie (la separación de 4 deja ver
    // la superficie entre el indicador y la pista: es lo que los rodea). La pista no: es el fondo
    // del recorrido, su borde lo marca el punto (Compose, WavyProgressIndicator.kt: "the stop
    // indicator is required if the track has a contrast below 3:1"), y en el circular el recorrido
    // es la vuelta entera.
    test('Indicadores de progreso: indicador y punto final sobre la superficie', async () => {
      const c = await render(
        <Themed scheme={scheme}>
          <div style={{ width: 200 }}>
            <LinearProgressIndicator label="a" value={0.5} className="lin" />
            <LinearProgressIndicator label="b" wavy className="lin-ind" />
          </div>
          <CircularProgressIndicator label="c" value={0.5} className="cir" />
          <CircularProgressIndicator label="d" wavy className="cir-ind" />
        </Themed>,
      )
      for (const sel of ['.lin', '.lin-ind']) {
        const el = q(c, sel)
        expect(contrastRatio(cs(q(el, '.mk-linear-progress-indicator-active')).stroke, effectiveBackground(el)), sel).toBeGreaterThanOrEqual(NON_TEXT)
      }
      const stop = q(c, '.lin .mk-linear-progress-indicator-stop')
      expect(contrastRatio(cs(stop).backgroundColor, effectiveBackground(q(c, '.lin'))), 'punto final').toBeGreaterThanOrEqual(NON_TEXT)
      for (const sel of ['.cir', '.cir-ind']) {
        const el = q(c, sel)
        expect(contrastRatio(cs(q(el, '.mk-circular-progress-indicator-active')).stroke, effectiveBackground(el)), sel).toBeGreaterThanOrEqual(NON_TEXT)
      }
    })

    test('Tooltip: texto del plain sobre Inverse Surface; subtítulo, texto y acciones del rich sobre Surface Container', async () => {
      const c = await render(
        <Themed scheme={scheme}>
          <div style={{ padding: 200, display: 'flex', gap: 200 }}>
            <Tooltip defaultOpen><Button>Editar</Button></Tooltip>
            <RichTooltip defaultOpen>
              <RichTooltipTrigger><Button>Info</Button></RichTooltipTrigger>
              <RichTooltipContent>
                <RichTooltipSubhead>Copias automáticas</RichTooltipSubhead>
                <RichTooltipSupporting>Cada noche se guarda una copia.</RichTooltipSupporting>
                <RichTooltipActions><Button variant="text" className="act">Configurar</Button></RichTooltipActions>
              </RichTooltipContent>
            </RichTooltip>
          </div>
        </Themed>,
      )
      for (const sel of ['.mk-plain-tooltip', '.mk-rich-tooltip-subhead', '.mk-rich-tooltip-supporting', '.act']) {
        expect(textContrast(q(c, sel)), sel).toBeGreaterThanOrEqual(TEXT)
      }
    })

    test('Snackbar: texto y acción sobre Inverse Surface, e icono de cerrar', async () => {
      const c = await render(
        <Themed scheme={scheme}>
          <Snackbar>
            <SnackbarMessage className="msg">Foto archivada</SnackbarMessage>
            <SnackbarAction className="act">Deshacer</SnackbarAction>
            <SnackbarClose className="close" />
          </Snackbar>
        </Themed>,
      )
      for (const sel of ['.msg', '.act']) expect(textContrast(q(c, sel)), sel).toBeGreaterThanOrEqual(TEXT)
      const close = q(c, '.close')
      expect(contrastRatio(cs(q(close, 'svg')).fill, effectiveBackground(close)), 'cerrar').toBeGreaterThanOrEqual(NON_TEXT)
    })

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
