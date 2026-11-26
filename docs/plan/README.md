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
| RadioButton y RadioGroup | molécula | cliente (excepción al ADR-0003, ADR-0012): el grupo reparte por contexto `name` (generado si falta), el valor (`value`/`defaultValue`, `onValueChange(value, event)`), `disabled` y `required`; `useRadioGroup()` para componer radios propios; `orientation`; `RadioGroup` es un `<fieldset role="radiogroup">` (nombre por `RadioGroupLabel`, un `<legend>`); inputs nativos (flechas y envío del navegador), con `data-focus-visible` para el foco por flechas que WebKit no marca; anillo y punto en CSS, el punto crece con el resorte FastSpatial de Compose; capa al presionar según el kit, confirmada con los tokens de `@material/web`; comparación de librerías en `docs/research/10-radio-group-en-librerias.md`; resuelto por agente el 2026-11-25 |
| Divider y DividerSubhead | átomo | universal; `<hr>` (rol separator implícito; la vertical con `aria-orientation`, aceptada por axe), `inset` al inicio o a ambos lados con márgenes lógicos (RTL) y `--mk-divider-inset`, `decorative` lo oculta; se estira en flex y grid (`align-self`/`justify-self: stretch`); `DividerSubhead` envuelve el encabezado del usuario con la línea decorativa; `MenuDivider` lo usa (solo conserva su margen); resuelto por agente el 2026-11-25 |
| Slider y RangeSlider | molécula | cliente (excepción al ADR-0003, ADR-0014): control dibujado con el `<input type="range">` nativo e invisible encima (thumb de 12, así el navegador ubica los valores donde está el handle, de 6 a L − 6, igual en los tres motores según una sonda); standard, `centered` y `RangeSlider` con `RangeSliderStart`/`RangeSliderEnd` (dos inputs nativos recortados con `clip-path` en el punto medio, sin cruzarse, con el "flip" de `@material/web` cuando están iguales; un `name` y un nombre accesible por handle); 5 tamaños del kit, vertical con `writing-mode` (el mismo CSS lógico sirve para RTL), `ticks`, controlado y no controlado (`onValueChange`), reinicio del formulario; handle de 4 que pasa a 2 al presionar y con foco (anillo y 4 más de separación, InsetRing de Compose) con resortes sobre propiedades registradas; indicador de valor al presionar, arrastrar y con foco de teclado, con `format` (función o `Intl.NumberFormat`) y `aria-valuetext` igual; flechas izquierda y derecha propias en vertical y RTL, donde los motores no coinciden; pasos sobre la pista activa en `on-primary` (Compose y `@material/web`, no el `secondary-container` del kit); conflictos en `07-jetpack-compose.md`; resuelto por agente el 2026-11-25 |
| Card | molécula | universal (ADR-0015): superficie (`<div>`) en elevated, filled y outlined; interactiva con `CardPrimaryAction` (enlace, botón o `render`, ADR-0010) dentro del título, con el área extendida a toda la tarjeta por un `::after` y los otros controles encima, enfocables por separado (sin interactivos anidados); foco en el borde de la tarjeta; deshabilitado solo como botón (colores de Compose); partes `CardHeader`, `CardHeadline` (`<h3>`, `level`), `CardSubhead`, `CardMedia`, `CardContent` y `CardActions`; fluida y adaptada a su propio ancho con container queries (vertical con la imagen al costado desde 37,5rem, horizontal apilada bajo 20rem, acciones apiladas bajo 15rem; `adaptive={false}` lo desactiva), imagen con `aspect-ratio` 360/188 y `object-fit: cover`, textos que cortan línea sin recortarse; grillas con CSS grid (`auto-fill`, mostrado en el playground); sin arrastre (la API lo deja abierto); conflictos con Compose en `07-jetpack-compose.md`; resuelto por agente el 2026-11-25 |
| 32 iconos | icons | ADR-0006 |
| Formas decorativas (entrega 1): portación de `androidx.graphics.shapes`, 35 formas y átomo Shape | átomo | ADR-0011; universal, recorta con `mask-image` (se estira al tamaño del elemento); `pnpm shapes` genera `shapes/material-shapes.json`, el tipo `ShapeName`, `SHAPES` y las máscaras; resuelto por agente el 2026-11-25 |
| LoadingIndicator (formas decorativas, entrega 2): portación de `Morph` | molécula | ADR-0011; universal, SVG con SMIL (`<animate>` y `<animateTransform>`) sin JavaScript; indeterminado (7 formas, giro y resorte de Compose, a menos de 0,2 dp de Compose) y determinado (`value`); `contained`; con movimiento reducido, quieto en la primera forma y latiendo en opacidad con el mismo latido que los indicadores de progreso (`src/internal/activity-pulse.css`, ajuste del 2026-11-25), el determinado sin latir; `pnpm shapes` genera `loading-indicator-data.ts`; resuelto por agente y revisado el 2026-11-25 |
| LinearProgressIndicator y CircularProgressIndicator | molécula | ADR-0013; universales, SVG y CSS sin JavaScript: el lineal calcula los tramos con `100cqw` (se adapta a cualquier ancho, onda de 40 y 20 px sin estirarse, RTL girando 180° como Compose) y el circular usa guiones con `pathLength`; determinado (`value`, con transición de 500 ms) e indeterminado (tiempos de `ProgressIndicator.kt`), plano y `wavy` (onda entre 10 % y 95 %, desplazamiento de una onda por segundo, contornos del circular con `pnpm shapes`), `thickness` 4 u 8, separación de 4 y punto final que se achica; con movimiento reducido, sin desplazamientos y el indeterminado quieto latiendo en opacidad; en WebKit la onda del circular cambia sin transición (sin propiedad CSS `d`); conflictos con el kit en `07-jetpack-compose.md`; resuelto por agente el 2026-11-25 |

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

## Segunda etapa (planificada el 2026-11-25)

Todos tienen página en el kit de Figma (se extrae con el conector antes de lanzar cada agente,
como se hizo con el FAB y el rail) y tokens en Compose (`compose/material3/.../tokens/`). Los
criterios comunes de arriba aplican a todos. Se ignoran las variantes XR.

Orden: primero lo que completa formularios y estados (lo que más usa una aplicación), después
contenido, después estructura de pantalla, y al final lo más complejo. Dentro de cada tanda, de
menor a mayor riesgo.

### Tanda A: formularios y estados

**8. Radio button** (molécula, universal). `<RadioGroup>` sobre `<fieldset>`/`role="radiogroup"`
con `RadioButton` sobre `<input type="radio">`: las flechas del navegador ya mueven la selección.
Tokens `RadioButtonTokens.kt`. Mismo patrón que el Checkbox (input oculto, área de 48, átomos
activados por variables). Riesgo bajo.

**9. Divider** (átomo, universal). `<hr>` completo, con sangría inicial o en ambos lados
(`DividerTokens.kt`). Lo usan Lists y Cards; `MenuDivider` pasa a usarlo. Riesgo bajo.

**10. Indicadores de progreso lineal y circular** (molécula, universal; hecho, ver "Hecho" y ADR-0013). Determinado e
indeterminado, y las versiones onduladas de Expressive (`LinearProgressIndicatorTokens.kt`,
`CircularProgressIndicatorTokens.kt`, `WavyProgressIndicator.kt`). `role="progressbar"` como
el LoadingIndicator. Riesgo medio: la onda animada (SVG o CSS) y el movimiento reducido.

**11. Slider** (molécula, cliente; hecho, ver "Hecho" y ADR-0014). Sobre `<input type="range">`
mientras alcance (teclado y accesibilidad nativos); rango de dos valores, marcas y el handle
angosto de Expressive (`SliderTokens.kt`). Riesgo medio: estilizar `range` igual en los tres
motores (`::-webkit-slider-thumb` y `::-moz-range-thumb`), o dibujar el control y dejar el input
invisible encima, como el Switch.

### Tanda B: contenido

**12. Card** (molécula, universal; hecho, ver "Hecho" y ADR-0015). Elevated, filled y outlined (`ElevatedCardTokens.kt`,
`FilledCardTokens.kt`, `OutlinedCardTokens.kt`); como superficie o interactiva (enlace o botón
con `href`/`render`, ADR-0010, sin anidar interactivos). Riesgo bajo.

**13. Disposición: escala de espaciado, Stack y Group** (agregado el 2026-11-25, antes de
List). Muchos diseños de Material 3 agrupan el contenido en bloques, no en grillas rígidas, y
Expressive repite un patrón de bloques conectados (List segmentada del kit: separación 2, radio
16 afuera y 4 adentro; grupos de botones conectados de la tanda D). Investigación previa en
[`docs/research/11-disposicion-adaptable-compose.md`](../research/11-disposicion-adaptable-compose.md)
(clases de tamaño de ventana, paneles, navegación adaptable y espaciado en Compose). Cuatro piezas:
- **Escala de espaciado** como tokens, tomada de `tokens/MeasurementTokens.kt` de Compose
  (versión 41.1.19, commit `76990c62ac` del 2026-11-20; interna en Compose, pero ya la usan List,
  Chips, Buttons, AppBar y Toolbars): 0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 36, 40, 48, 56,
  64 y 72, con la numeración de Compose (`Space25` = 2, `Space100` = 8…). JSON y CSS generado
  como los demás tokens; nombre de las variables y regla en `pnpm lint:css` (espaciado con
  variables en `gap`, `padding` y `margin`) a decidir en un ADR.
- **Cortes de ventana** de Compose (`window-core/WindowSizeClass.kt`) como datos documentados
  (JSON y constantes de TypeScript para `matchMedia`), no como variables CSS (las media y
  container queries no aceptan `var()`): ancho 600, 840, 1200 y 1600; alto 480 y 900. Solo para
  la disposición de la página; los componentes se adaptan con container queries.
- **`Stack`** (átomo o molécula, universal): flex con dirección, `gap` en la escala, `wrap`,
  `align` y `justify`, y cambio de dirección por el espacio disponible (por el contenedor, no
  la ventana; la investigación propone el patrón "switcher" con `flex-basis`, que acepta una
  variable y no necesita un contenedor extra). Elemento configurable (`render` o `as`) para no
  agregar `<div>` sin semántica. El equivalente al `weight` de Compose va en el hijo, no en el
  Stack.
- **`Group`** (universal): bloques conectados con separación mínima y forma según la posición
  (esquinas exteriores grandes, interiores chicas), horizontal o vertical, para que List
  segmentada, tarjetas agrupadas y los Button groups no repitan la lógica de las esquinas. Que
  la forma por posición funcione con CSS (`:first-child`, `:last-child`, `:only-child`) y que
  los hijos puedan animar su forma (Button groups la hacen crecer al presionar). Valores de
  Compose: List segmentada (`segmentedShapes`) 16 afuera, 4 adentro y separación 2; grupo de
  botones conectado 8 adentro (4 al presionar) y separación 2; grupo estándar, separación 12.
Riesgo medio: elegir una API chica que no compita con CSS plano, y que Group sirva de verdad a
List y a Button groups (revisar los dos antes de cerrarla).

**14. List** (organismo, universal). `List` y `ListItem` con partes (`ListItemLeading`,
`ListItemHeadline`, `ListItemSupporting`, `ListItemTrailing`), una, dos y tres líneas, y
elementos interactivos (`ListTokens.kt`). Usa Divider, Checkbox, Radio y Switch como contenido
final; la segmentada usa `Group` (13). Responsive: ancho fluido, textos que cortan línea o se
recortan según el caso, elementos finales que se reacomodan en anchos chicos, y un uso razonable
en paneles de lista y detalle. Riesgo bajo a medio: la semántica (lista de enlaces, de acciones
o de selección).

**15. Chips** (molécula). Assist, filter, input y suggestion (`AssistChipTokens.kt`,
`FilterChipTokens.kt`, `InputChipTokens.kt`, `SuggestionChipTokens.kt`). Filter como toggle
(`aria-pressed`) o en grupo de selección; input con botón de quitar. Riesgo medio: la
navegación con teclado de un grupo de chips.

**16. Tooltip** (organismo, cliente). Plain y rich (`PlainTooltipTokens.kt`,
`RichTooltipTokens.kt`), con Popover y anchor positioning como el Menu (ADR-0007), y el patrón
APG de tooltip (hover y foco, Escape, sin contenido interactivo en el plain). Riesgo medio:
mostrar y ocultar con demora sin parpadeos y en dispositivos táctiles.

**17. Snackbar** (organismo, cliente). Mensaje con acción opcional y botón de cerrar
(`SnackbarTokens.kt`), en la capa superior (Popover), con región viva (`role="status"`) y una
cola para varios mensajes. Riesgo medio: la API de la cola sin acoplarse a un estado global.

### Tanda C: estructura de pantalla

**18. Tabs** (organismo, cliente). Primary y secondary (`PrimaryNavigationTabTokens.kt`,
`SecondaryNavigationTabTokens.kt`), con el patrón APG de pestañas (`tablist`, flechas, Inicio y
Fin, activación automática o manual) y el indicador animado. Variante de enlaces para navegar
entre páginas (no pestañas). Riesgo medio.

**19. Top app bar** (organismo). Small, medium y large, y las "flexible" de Expressive
(`AppBarSmallTokens.kt`, `AppBarMediumFlexibleTokens.kt`, `AppBarLargeFlexibleTokens.kt`), con
título, subtítulo y acciones; el cambio al desplazar (fondo y tamaño) con CSS
(`animation-timeline: scroll()` donde exista) o con un respaldo. Riesgo medio a alto.

**20. Sheets** (organismo, cliente). Bottom sheet modal y side sheet (`SheetBottomTokens.kt`),
sobre `<dialog>` como el Dialog; el arrastre para cerrar del bottom sheet es lo que agrega
riesgo. Riesgo alto.

**21. Search** (organismo, cliente). Search bar y search view (`SearchBarTokens.kt`,
`SearchViewTokens.kt`), con el patrón APG de combobox para las sugerencias. Riesgo alto.

**22. Toolbars** (organismo). Docked y floating de Expressive (`DockedToolbarTokens.kt`,
`FloatingToolbarTokens.kt`, `VibrantToolbarTokens.kt`), con el patrón APG de toolbar (una sola
parada de Tab y flechas). Riesgo medio.

**23. NavigationSuite: navegación adaptable** (organismo, universal; agregado el 2026-11-25).
Componente nuevo que elige solo entre barra y rail según la ventana, como
`NavigationSuiteScaffold` de Compose (`docs/research/11-disposicion-adaptable-compose.md` § 3).
NavigationBar y NavigationRail no cambian: quien quiera elegir a mano los sigue usando
directamente, y `NavigationSuite` es una opción más, no un reemplazo (decidido con el autor el
2026-11-25).
- Regla por defecto, la de Compose: ancho compact, barra con elementos verticales; alto compact
  (o ancho medium con alto compact), barra con elementos horizontales; el resto, rail contraído.
  Compose nunca elige solo el rail expandido ni el drawer: decidir si matekit lo hace desde 1200.
- Los destinos se escriben una sola vez (por ejemplo `NavigationSuiteItem`, sobre la base
  compartida de `src/internal/navigation-item.tsx`) y el componente los presenta como barra o
  rail.
- Elección forzada opcional (por ejemplo `layout="bar" | "rail" | "auto"`) para quien quiera la
  regla automática en general pero fijar la presentación en una pantalla.
- Con media queries (los cortes de ventana del ítem 13), sin JavaScript si se puede: barra y
  rail tienen distinto DOM, así que evaluar si alcanza con renderizar una estructura cuyo CSS
  cambia de presentación, o si hace falta elegir en el cliente (y cómo evitar el salto al
  hidratar).
Riesgo medio.

**24. Scaffold de paneles** (organismo, universal; agregado el 2026-11-25). Paneles de lista y
detalle y de contenido con panel de apoyo, como `ListDetailPaneScaffold` y
`SupportingPaneScaffold` de Compose (§ 2 de la misma investigación): 1 panel en compact y
medium, 2 en expanded y 3 desde 1200; el secundario de 360 (412 desde 1200), el principal con
el resto y 24 entre paneles; la app indica el panel actual (sin historial ni "atrás predictivo").
Lo que no entra: ocultar (Hide, por defecto en lista y detalle), debajo (Reflow, columna CSS) o
flotando (Levitate, reutilizando Sheets o Dialog). Con media queries para la cantidad de paneles
y la List (14) diseñada para vivir en un panel de 360. El divisor arrastrable es opcional y de
prioridad baja. Riesgo medio.

### Tanda D: botones de Expressive

**25. Button groups** (organismo). Standard y connected (`StandardButtonGroupSmallTokens.kt`,
`ConnectedButtonGroupSmallTokens.kt`), con el cambio de forma por posición (esquinas interiores
más chicas que crecen al presionar), sobre `Group` (13); de ahí sale también el reemplazo de
los segmented buttons.
**26. Split button** (`SplitButton*Tokens.kt`) y **27. FAB menu** (`FabMenu*Tokens.kt`), que
reutiliza el Menu. Riesgo medio: la forma por posición y el foco.

### Tanda E: lo más complejo

**28. Date y time pickers** (`DatePickerModalTokens.kt`, `TimePickerTokens.kt`): calendario
con el patrón APG de grilla, entrada de texto y localización (`Intl`). **29. Carousel**. Riesgo
alto; se planifican en detalle cuando lleguemos.

### Fuera de esta etapa

Color dinámico en tiempo de ejecución (ADR-0009), paleta de referencia (`md.ref.palette`), XR
y la publicación (que va en paralelo: no depende de estos componentes).

## Fuera de este plan

**XR (decidido el 2026-11-25).** El kit trae componentes y variantes para XR (por ejemplo
`XR Navigation Rail` y su elemento). No se implementan por ahora: se dejan para una etapa
posterior, cuando la librería tenga versiones estables y haya un proyecto para XR. Mientras
tanto, al extraer datos del kit se ignoran las variantes XR. Revisar si aparece un proyecto
que lo necesite.

Los componentes que faltaban pasaron a la "Segunda etapa" de arriba. Quedan fuera:
compilación y publicación del paquete, y color dinámico (ADR-0004). Al publicar: crear `@matekit/theme` con el generador de `scripts/lib/` y
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
