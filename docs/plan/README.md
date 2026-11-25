# Plan: resto del primer conjunto de componentes

Escrito el 2026-11-24. Cada componente lo resuelve un agente, de a uno y en este orden; se
revisa la entrega (pruebas, tipos, prueba de falsación y capturas) antes de pasar al
siguiente. Convenciones en [`CLAUDE.md`](../../CLAUDE.md).

## Hecho

| Componente | Capa | Notas |
|---|---|---|
| Tokens (color, tipografía, forma, elevación, estados, movimiento) | tokens | ADR-0004 |
| Paletas (verde, azul, naranja) y niveles de contraste (estándar, medio, alto) | tokens | ADR-0008; `light-dark()`, `data-palette`, `data-contrast`, `prefers-contrast` |
| StateLayer, FocusRing, Ripple, Icon | átomos | ADR-0003, ADR-0006 |
| Button | molécula | universal; incluye toggle |
| Checkbox | molécula | interactivo (indeterminado) |
| Switch | molécula | universal; resuelto por agente y revisado el 2026-11-24 |
| IconButton | molécula | universal; comparte la base de CSS con el Button; resuelto por agente y revisado el 2026-11-24 |
| TextField | molécula | cliente (ids por contexto); filled, outlined y multilínea; resuelto por agente y revisado el 2026-11-24 |
| Dialog | organismo | cliente (`showModal`); salida animada, foco atrapado, alerta; resuelto por agente y revisado el 2026-11-24 |
| Menu | organismo | cliente (popover, foco, teclado APG); Standard y Vibrant; anchor positioning con respaldo en JS (ADR-0007); resuelto por agente y revisado el 2026-11-24 |
| NavigationBar y Badge | organismo y molécula | universales; vertical y horizontal; enlaces, botones o `render={<Link />}` para el enrutador (ADR-0010); insignia pequeña y grande; resuelto por agente y revisado el 2026-11-25 |
| FAB y FAB extendido | molécula | universales; FAB 56/80/96 y extendido 56/80/96 (sin el FAB de 40, obsoleto), seis colores, `lowered`; el extendido se contrae con `expanded` (grilla de 0fr a 1fr); enlaces o `render` (ADR-0010, lógica compartida con NavigationBar en `src/internal/interactive.tsx`); medidas y colores del kit; resuelto por agente y revisado el 2026-11-25 |
| NavigationRail | organismo | universal; contraído (96) y expandido (220, ajustable hasta 360), docked y floating, alineación top y middle, etiquetas ocultas en el contraído; transición con resortes en CSS (grilla de pistas interpoladas); destino compartido con NavigationBar (`src/internal/navigation-item.tsx` y la base de `navigation-bar.css`); resuelto por agente y revisado el 2026-11-25 |
| 32 iconos | icons | ADR-0006 |
| Formas decorativas (entrega 1): portación de `androidx.graphics.shapes`, 35 formas y átomo Shape | átomo | ADR-0011; universal, recorta con `mask-image` (se estira al tamaño del elemento); `pnpm shapes` genera `shapes/material-shapes.json`, el tipo `ShapeName`, `SHAPES` y las máscaras; resuelto por agente el 2026-11-25 |
| LoadingIndicator (formas decorativas, entrega 2): portación de `Morph` | molécula | ADR-0011; universal, SVG con SMIL (`<animate>` y `<animateTransform>`) sin JavaScript; indeterminado (7 formas, giro y resorte de Compose, a menos de 0,2 dp de Compose) y determinado (`value`); `contained`; quieto en la primera forma con movimiento reducido; `pnpm shapes` genera `loading-indicator-data.ts`; resuelto por agente y revisado el 2026-11-25 |

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
- [ ] Modo de alto contraste (`forced-colors: active`): forma visible y estados distinguibles
      con colores del sistema; cubierto en `src/test/forced-colors.test.tsx`.
- [ ] Sin violaciones de axe-core en tema claro y oscuro (`src/test/a11y.test.tsx`) y con el
      contraste mínimo verificado (`src/test/contrast.test.tsx`).
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
`OutlinedTextFieldTokens.kt`. Indicador con foco de 2 px (ADR-0004), no 3. Comportamiento y
accesibilidad: `@material/web` `docs/components/text-field.md` (tipos de input, textarea,
prefijo y sufijo, contador de caracteres, validación).

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

Fuente: `05-medidas.md` § Dialog; Compose `DialogTokens.kt`. Comportamiento y accesibilidad:
`@material/web` `docs/components/dialog.md` (apertura y cierre, valor de retorno, alertas).

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
Compose describe el menú anterior: no usarlo para colores ni forma. Comportamiento y
accesibilidad: `@material/web` `docs/components/menu.md` (submenús y posicionamiento con
Popover, fijo o en el documento).

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

**XR (decidido el 2026-11-25).** El kit trae componentes y variantes para XR (por ejemplo
`XR Navigation Rail` y su elemento). No se implementan por ahora: se dejan para una etapa
posterior, cuando la librería tenga versiones estables y haya un proyecto para XR. Mientras
tanto, al extraer datos del kit se ignoran las variantes XR. Revisar si aparece un proyecto
que lo necesite.

Chips,
Lists, Tabs, Snackbar, Tooltip, Sheets, compilación y publicación del paquete, color
dinámico (ADR-0004). Al publicar: crear `@matekit/theme` con el generador de `scripts/lib/` y
su comando (ADR-0009).

**Formas decorativas (ADR-0011).** Las 35 formas de Expressive (`03-tokens.md` § Formas
decorativas; Compose `MaterialShapes.kt` sobre `androidx.graphics.shapes`):

- [x] Átomo `Shape` que recorta su contenido con una de las 35 formas (avatares, imágenes,
  fondos de iconos). Se hizo con `mask-image` y no con `clip-path: path()`, que no se adapta
  al tamaño del elemento (ADR-0011).
- [x] Contornos generados al compilar (`pnpm shapes`), como los iconos, a partir de una
  portación a TypeScript de `RoundedPolygon` en `scripts/lib/shapes/` (Apache 2.0, con el aviso
  de licencia); sin cálculo en el navegador ni dependencia del conector de Figma.
- [x] Indicador de carga de Expressive (entrega 2 del ADR-0011): `Morph` y lo que necesita,
  pasos de transición entre las 7 formas precalculados y animados con `<animate>`, y versión
  estática con `prefers-reduced-motion`. Molécula `LoadingIndicator`, indeterminada y
  determinada, con y sin contenedor.
- Cambio de forma por posición (esquinas interiores más chicas) en grupos de botones
  conectados, botón dividido y botones segmentados, cuando se hagan.
- No se adopta `corner-shape` (esquinas superelípticas): Material 3 usa esquinas circulares.
