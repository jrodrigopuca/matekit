# Plan: resto del primer conjunto de componentes

Escrito el 2026-11-24. Cada componente lo resuelve un agente, de a uno y en este orden; se
revisa la entrega (pruebas, tipos, prueba de falsación y capturas) antes de pasar al
siguiente. Convenciones en [`CLAUDE.md`](../../CLAUDE.md).

## Hecho

| Componente | Capa | Notas |
|---|---|---|
| Tokens (color, tipografía, forma, elevación, estados, movimiento) | tokens | ADR-0004 |
| StateLayer, FocusRing, Ripple, Icon | átomos | ADR-0003, ADR-0006 |
| Button | molécula | universal; incluye toggle |
| Checkbox | molécula | interactivo (indeterminado) |
| 32 iconos | icons | ADR-0006 |

## Orden y motivo

| # | Componente | Capa | Depende de | Por qué en este lugar |
|---|---|---|---|---|
| 1 | Switch | molécula | átomos, iconos | Reutiliza casi todo el patrón del Checkbox: entrega rápida que prueba el método |
| 2 | IconButton | molécula | Button, Icon | Lo usan TextField (iconos), NavigationRail (menú) y Dialog |
| 3 | TextField | molécula | IconButton | El más usado en formularios; el más complejo de las moléculas |
| 4 | Dialog | organismo | Button | Primer organismo; `<dialog>` nativo |
| 5 | Menu | organismo | Icon | Posicionamiento y teclado: el de más riesgo técnico |
| 6 | NavigationBar | organismo | Icon | Navegación en pantallas chicas |
| 7 | NavigationRail | organismo | IconButton, Icon | Navegación en pantallas medianas y grandes |

## Criterios comunes (aplican a todos)

- [ ] Medidas y colores por estado según `docs/research/05-medidas.md`; lo que falte, de
      Jetpack Compose, citando el archivo en un comentario del CSS.
- [ ] API por composición con nombres planos; props nativas y `ref` llegan al elemento
      principal; `className` y `style` al contenedor.
- [ ] `'use client'` solo si hace falta (ADR-0003), justificado en un comentario.
- [ ] Teclado y roles según WAI-ARIA APG; foco visible con `FocusRing`.
- [ ] Tema claro y oscuro correctos; movimiento con los resortes; con
      `prefers-reduced-motion`, sin desplazamientos.
- [ ] Pruebas en navegador que cubren lo anterior; `pnpm typecheck` y `pnpm test` en verde;
      una prueba de falsación hecha.
- [ ] Página en el playground; exportado en `src/index.ts`; CSS importado en `src/styles.css`.
- [ ] Datos nuevos o conflictos anotados en `docs/research/`; decisiones que cuesten
      revertir, como ADR.
- [ ] Sin commits. Entrega: resumen, archivos cambiados, mensaje de commit propuesto,
      pendientes y dudas.

## 1. Switch

Fuente: `05-medidas.md` § Switch; Compose `SwitchTokens.kt`.

```tsx
<Switch defaultChecked>Wi-Fi</Switch>
<Switch checked={on} onChange={(e) => setOn(e.target.checked)} icons>Modo avión</Switch>
```

- [ ] `<input type="checkbox" role="switch">` nativo dentro de un `<label>`; Espacio lo
      alterna; el texto es su nombre accesible.
- [ ] Pista de 52 × 32 con radio completo; área táctil de 48; capa de estado circular de 40
      centrada en el control deslizante (handle).
- [ ] Handle: 16 desactivado, 24 activado o con icono, 28 al presionar; se desplaza y cambia
      de tamaño con el resorte rápido espacial.
- [ ] Prop `icons`: marca (`check`) activado y cruz (`close`) desactivado, de 16 px.
- [ ] Colores de los 10 estados de la tabla de `05-medidas.md`, incluido hover activado
      (handle `primary-container`) y deshabilitado.
- [ ] Determinar si puede ser universal (sin indeterminado, probablemente sí).

## 2. IconButton

Fuente: `05-medidas.md` § Icon button; Compose `IconButtonTokens.kt`,
`{XSmall,Small,Medium,Large,XLarge}IconButtonTokens.kt`, `FilledIconButtonTokens.kt`,
`FilledTonalIconButtonTokens.kt`, `OutlinedIconButtonTokens.kt`.

```tsx
<IconButton label="Buscar"><SearchIcon /></IconButton>
<IconButton variant="filled" selected={fav} label="Favorito"><StarIcon filled={fav} /></IconButton>
```

- [ ] `<button>` nativo; `label` obligatorio como nombre accesible (`aria-label`).
- [ ] Estilos `standard` (por defecto), `filled`, `tonal`, `outlined`; 5 tamaños; anchos
      `narrow`, `default`, `wide`; forma redonda o cuadrada con cambio de forma al presionar.
- [ ] Toggle con `selected` (`aria-pressed`) con los colores de Compose.
- [ ] Reutilizar del Button lo que se pueda (forma, estados, átomos) sin duplicar CSS sin
      necesidad.
- [ ] Universal, como el Button.

## 3. TextField

Fuente: `05-medidas.md` § Text field; Compose `FilledTextFieldTokens.kt` y
`OutlinedTextFieldTokens.kt`. Indicador con foco de 2 px (ADR-0004), no 3.

```tsx
<TextField variant="outlined" error={!!err}>
  <TextFieldLeading><SearchIcon /></TextFieldLeading>
  <TextFieldLabel>Buscar</TextFieldLabel>
  <TextFieldInput value={q} onChange={(e) => setQ(e.target.value)} />
  <TextFieldTrailing><IconButton label="Borrar"><CancelIcon /></IconButton></TextFieldTrailing>
  <TextFieldSupporting>{err ?? 'Mínimo 3 letras'}</TextFieldSupporting>
</TextField>
```

- [ ] `filled` (radio 4 arriba, `surface-container-highest`, indicador inferior) y
      `outlined` (radio 4, borde, etiqueta que corta el borde).
- [ ] Etiqueta en reposo (Body Large) que flota (Body Small) con foco o con texto, animada;
      `<label>` asociado al input; texto de ayuda asociado con `aria-describedby`.
- [ ] Estados: hover, foco, error (`aria-invalid`), deshabilitado, con los colores de la tabla.
- [ ] `TextFieldInput` acepta las props de `<input>`; prever `multiline` (textarea) o dejarlo
      anotado como pendiente.
- [ ] Preferir CSS para la etiqueta flotante (`:focus-within`, `:placeholder-shown`) para
      intentar que sea universal; si no alcanza, justificar `'use client'`.

## 4. Dialog

Fuente: `05-medidas.md` § Dialog; Compose `DialogTokens.kt`.

```tsx
<Dialog open={open} onClose={() => setOpen(false)}>
  <DialogIcon><DeleteIcon /></DialogIcon>
  <DialogHeadline>¿Eliminar archivo?</DialogHeadline>
  <DialogContent>No se puede deshacer.</DialogContent>
  <DialogActions>
    <Button variant="text" onClick={() => setOpen(false)}>Cancelar</Button>
    <Button variant="text" onClick={remove}>Eliminar</Button>
  </DialogActions>
</Dialog>
```

- [ ] `<dialog>` nativo abierto con `showModal()`: foco atrapado, Escape cierra, fondo
      inerte; `onClose` se llama al cerrar por Escape o por clic en el fondo (scrim).
- [ ] Nombre accesible desde `DialogHeadline` (`aria-labelledby`) y descripción desde
      `DialogContent`.
- [ ] Medidas: ancho 312 del kit; mínimo y máximo, verificarlos en Compose (`DialogTokens.kt`
      o `AlertDialog.kt`; se recuerdan 280 y 560, sin confirmar); radio 28,
      `surface-container-high`, rellenos y tipografía de la tabla; con icono, todo centrado.
- [ ] Entrada y salida animadas con resortes; el fondo, `scrim` con su opacidad de Compose.
- [ ] Interactivo (`showModal`), con las partes de contenido universales.

## 5. Menu

Fuente: `05-medidas.md` § Menu (versión Expressive, Standard y Vibrant). `MenuTokens.kt` de
Compose describe el menú anterior: no usarlo para colores ni forma.

```tsx
<Menu>
  <MenuTrigger><IconButton label="Más"><MoreVertIcon /></IconButton></MenuTrigger>
  <MenuContent>
    <MenuItem leading={<EditIcon />} onSelect={edit}>Editar</MenuItem>
    <MenuDivider />
    <MenuItem leading={<DeleteIcon />} onSelect={remove}>Eliminar</MenuItem>
  </MenuContent>
</Menu>
```

- [ ] **Primero, verificar** el soporte de la API Popover y de CSS anchor positioning en
      Chrome, Safari y Firefox actuales; si anchor positioning no alcanza, posicionar con
      JavaScript y anotar la decisión como ADR.
- [ ] Patrón APG "menu button": Enter, Espacio y flecha abajo abren y enfocan el primero;
      flechas con vuelta; Inicio y Fin; búsqueda por letra; Escape cierra y devuelve el foco.
- [ ] Contenedor radio 16, `surface-container-low`, sombra nivel 3; elementos de 48 de alto
      con capa de estado; seleccionado con `tertiary-container` y radio 12; tema `vibrant`.
- [ ] Revisar si la API `leading={…}` respeta la composición del ADR-0002 o conviene
      `MenuItemLeading`; decidir y justificar.

## 6. NavigationBar

Fuente: `05-medidas.md` § Navigation bar; Compose `NavigationBarTokens.kt`,
`NavigationBarVerticalItemTokens.kt`, `NavigationBarHorizontalItemTokens.kt`.

```tsx
<NavigationBar>
  <NavigationBarItem href="/" active icon={<HomeIcon />}>Inicio</NavigationBarItem>
  <NavigationBarItem href="/favs" icon={<StarIcon />}>Favoritos</NavigationBarItem>
</NavigationBar>
```

- [ ] 64 de alto, `surface-container`, elementos repartidos; vertical (icono sobre etiqueta)
      y horizontal.
- [ ] Indicador activo 56 × 32 radio 16 en `secondary-container`; icono relleno al activarse
      si existe esa variante; `aria-current="page"`.
- [ ] Elementos como enlaces (`<a>`) o botones según se pase `href`; integrable con el
      enrutador del proyecto (Next.js `Link`) sin depender de él.
- [ ] Insignia (badge) pequeña y grande.

## 7. NavigationRail

Fuente: `05-medidas.md` § Navigation rail; Compose `NavigationRailCollapsedTokens.kt`,
`NavigationRailExpandedTokens.kt`, `NavigationRail*ItemTokens.kt`.

- [ ] Contraída (96 de ancho) y expandida (220), docked y floating, con el bloque superior
      (botón de menú y FAB opcional).
- [ ] Elementos verticales en la contraída y horizontales en la expandida; mismas reglas de
      activo, enlaces y accesibilidad que NavigationBar, compartiendo código.
- [ ] Transición entre contraída y expandida con resortes.

## Fuera de este plan

FAB y FAB extendido (los usa el rail: si hacen falta, se agregan antes del paso 7), Chips,
Lists, Tabs, Snackbar, Tooltip, Sheets, compilación y publicación del paquete, color
dinámico (ADR-0004).
