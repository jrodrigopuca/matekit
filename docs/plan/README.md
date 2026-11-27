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
| Card | molécula | universal (ADR-0015): superficie (`<div>`) en elevated, filled y outlined; interactiva con `CardPrimaryAction` (enlace, botón o `render`, ADR-0010) dentro del título, con el área extendida a toda la tarjeta por un `::after` y los otros controles encima, enfocables por separado (sin interactivos anidados); foco en el borde de la tarjeta; sin estado deshabilitado (el kit no lo tiene; quitado el 2026-11-25: con la acción principal como `<button disabled>`, la tarjeta solo deja de reaccionar); partes `CardHeader`, `CardHeadline` (`<h3>`, `level`), `CardSubhead`, `CardMedia`, `CardContent` y `CardActions`; fluida y adaptada a su propio ancho con container queries (vertical con la imagen al costado desde 37,5rem, horizontal apilada bajo 20rem, acciones apiladas bajo 15rem; `adaptive={false}` lo desactiva), imagen con `aspect-ratio` 360/188 y `object-fit: cover`, textos que cortan línea sin recortarse; grillas con CSS grid (`auto-fill`, mostrado en el playground); sin arrastre (la API lo deja abierto); conflictos con Compose en `07-jetpack-compose.md`; resuelto por agente el 2026-11-25 |
| List | organismo | universal (ADR-0018): `List` (`<ul role="list">`, por VoiceOver en Safari sin viñetas; `variant` standard o segmented sobre `Group`; `dividers` como borde, sin `<hr>`) y `ListItem` (`<li>`, `align` middle o top) con partes de frase (`ListItemLeading` icono, avatar, imagen o video; `ListItemOverline`, `ListItemHeadline`, `ListItemSupporting`, `ListItemTrailing`); elementos que son enlaces o botones con `ListItemAction` dentro del texto principal (área extendida al `<li>` como la Card, IconButton secundario encima; `current` pone `aria-current` y el seleccionado del kit, para lista y detalle); selección con el Checkbox, RadioButton o Switch envolviendo el texto (su `<label>` da el nombre, `subgrid` lo ubica al final y un `::after` hace que toda la fila lo active; casilla o radio marcados = seleccionado, el switch no); acordeón con `ListItemDetails`/`ListItemSummary` (`<details>`/`<summary>`, elegido con una sonda en los tres motores; indicador de 32 × 40); Tab por elemento (sin `listbox`); forma por estado de Compose (4, hover 12, foco/presionado/seleccionado 16, también en la segmentada); anillo por dentro; fluida con container queries (apoyo recortado a 2 líneas con `--mk-list-item-supporting-lines`, texto final debajo bajo 20rem, imagen o video arriba bajo 15rem); sin Draggable ni Swipe (la API los deja abiertos: `[data-dragged]` en StateLayer y colores por variables); conflictos con Compose en `07-jetpack-compose.md`; pendiente comprobar VoiceOver a mano; resuelto por agente el 2026-11-25 |
| Chips (assist, filter, input, suggestion) y ChipGroup | molécula | ADR-0019: assist y suggestion universales (botón, `href` o `render`, ADR-0010; el suggestion también toggle, como en el kit), filter, input y `ChipGroup` cliente; `ChipGroup` es un `role="toolbar"` con nombre obligatorio, una parada de Tab y flechas (vuelta, Inicio/Fin, RTL, saltea deshabilitados, también entre la acción y el quitar del input), como el chip-set de `@material/web`; selección simple o múltiple por contexto (`selectionMode`, `value`/`onValueChange`, `useChipGroup()`) con filtros `aria-pressed` en los dos modos; input con quitar "Quitar <etiqueta>" (`aria-labelledby`, `removeLabel`), Supr y Retroceso, `onRemove` controlado por el uso y el foco al chip siguiente, al anterior o al grupo; `removeOnly`; `ChipAvatar` (redondea el chip, kit y `@material/web`) y `ChipLabel`; rellenos del kit por configuración; `layout` wrap (8 y 16) o scroll (una fila, relleno 8, barra fina); texto largo recortado con puntos suspensivos y el nombre completo; icono de inicio seleccionado en `on-secondary-container` (no `primary`, por ADR-0008); sin arrastre ni la forma por estado de `ChipsTokens.kt`; conflictos en `07-jetpack-compose.md`; pendiente comprobar VoiceOver y NVDA a mano; resuelto por agente el 2026-11-26 |
| Interactive | átomo | universal (ADR-0020, complementa ADR-0010): `Interactive` e `InteractiveProps` públicos, el `<a>`, el `<button type="button">` o el elemento de `render` con el contrato de `render` como API pública (clases combinadas, también la función de `NavLink`; props y `ref` del elemento ganan; hijos reemplazados; error con un componente en vez de un elemento); sin estilos, átomos, activo ni deshabilitado; `interactiveElement` reemplazado: Button, IconButton, los FAB, los destinos de NavigationBar y NavigationRail, `CardPrimaryAction`, `ListItemAction` y los chips de una acción dibujan `<Interactive>` y conservan el nombre en el error con `assertRenderElement` (interno, como `ToggleButtonOrLinkProps` y `LinkModeExclusions`); sus 364 pruebas sin cambios; 29 pruebas nuevas, con un control propio con StateLayer, Ripple y FocusRing en las tres formas (el control quita el `outline` nativo); página del playground `#interactive`; resuelto por agente el 2026-11-26 |
| Tooltip (plain y rich) | organismo | cliente (ADR-0021; temporizadores, eventos y coordinador, como el Menu): `Tooltip` envuelve al disparador sin agregar elementos (props y `ref` combinadas, anidable en `MenuTrigger`); sin `text` muestra el nombre del disparador (`label`, `aria-label` o su texto) oculto para la accesibilidad, con `text` es su descripción (`aria-describedby`), nunca su nombre; `RichTooltip` con `RichTooltipTrigger`, `RichTooltipContent`, `RichTooltipSubhead`, `RichTooltipSupporting` y `RichTooltipActions`: sin acciones es un tooltip, con acciones un diálogo no modal que se abre con un clic (Tab entra desde el disparador, Escape devuelve el foco); puntero con 500/600 ms (material-components-web; Compose no tiene demora con el mouse) y el vecino al instante si hay uno visible, foco de teclado al instante y persistente, Escape sin mover el foco (no cierra un Dialog que lo contiene), presionar lo oculta, se puede pasar el puntero encima (WCAG 1.4.13), táctil con pulsación larga de 500 ms y 1500 ms después de soltar; uno a la vez; `popover="manual"` (`hint` existe en los tres motores, descartado por el estado doble); arriba y centrado con anchor positioning, abajo si no entra y dentro de la ventana; posicionamiento del Menu movido a `src/internal/anchor-position.ts` y compartido (las 51 pruebas del Menu sin cambios; la reexportación `Menu/position.ts` se borró el 2026-11-26 y la prueba importa del módulo interno), con una comprobación del centrado que corrige el `anchor-center` de Firefox en RTL; medidas del kit (plain 4/8, radio 4, hasta 200; rich hasta 312, radio 12, elevación 2) y lo que falta de Compose; conflictos en `07-jetpack-compose.md`; chips recortados con el texto completo en el playground (`#tooltip`); sin tooltip en disparadores deshabilitados (decidido con el autor el 2026-11-26: no tiene sentido explicar un control que no se puede usar); `Group` ignora los hijos con `popover` al contar el primero y el último (el popover del tooltip es hermano del disparador); pendiente comprobar VoiceOver y NVDA a mano, sin prioridad por ahora (el autor, 2026-11-26); resuelto por agente el 2026-11-26 |
| Snackbar | organismo | ADR-0022: cola sin estado de módulo (`createSnackbarQueue()`, universal: `show` devuelve una promesa con `'action'`, `'dismiss'`, `'timeout'` o `'cancel'`, uno a la vez y en orden, `signal`, `dismiss`, `clear`); `SnackbarHost` cliente que la dibuja y la reparte a `useSnackbar()` en sus hijos (pueden ser de servidor), anidable (gana el más cercano; uno dentro de un `Dialog` modal funciona); partes universales `Snackbar`, `SnackbarMessage`, `SnackbarAction` y `SnackbarClose`; región viva `role="status"` que existe siempre en el host y recibe el texto un cuadro después (se vacía al irse); foco que no se roba, F6 entra a la acción y vuelve, orden de Tab donde está el host, el foco vuelve al irse, Escape adentro lo descarta; duraciones de Compose (corta 4 s, larga 10 s, indefinida por defecto con acción y con cerrar) que se detienen con el puntero, el foco y la pestaña oculta; `popover="manual"` abajo a 12 de la ventana, centrado o `align="start"`, de 344 a 600 de ancho y a todo el ancho bajo 600 px, `--mk-snackbar-offset`; acción larga con `actionOnNewLine`; escala y opacidad con resortes (solo opacidad con movimiento reducido); medidas del kit y lo que falta de Compose, conflictos en `07-jetpack-compose.md` (sin tooltip en el cerrar); pendiente comprobar VoiceOver y NVDA a mano; resuelto por agente el 2026-11-26 |
| Tabs | organismo | ADR-0023: cliente (excepción al ADR-0003) `Tabs` (`value`/`defaultValue` obligatorio, `onValueChange(value, event)`), `TabList` (`role="tablist"`, `variant` primary o secondary, `layout` fixed o scrollable), `Tab` (`<button role="tab">`) y `TabPanel` (`hidden` y montado; `unmount` desmonta el contenido y deja el panel), con ids y `aria-controls`/`aria-labelledby` generados; activación automática por defecto y `activation="manual"`; contenido corto (`<Tab value="a"><FlightIcon />Vuelos</Tab>`, `TabLabel`, insignia sobre el icono con su texto después de la etiqueta), aviso por consola si una pestaña de solo icono no tiene nombre; navegación entre páginas con `TabNav` (`<nav>`, cliente solo por el movimiento) y `TabLink` universal (`href` o `render`, `aria-current="page"`, Tab por enlace); indicador por pestaña animado con FLIP (Web Animations, resorte DefaultSpatial; fundido con movimiento reducido), elegido con una sonda (Firefox no anima el cambio de ancla de anchor positioning); scrollable sin barra, 52 a los lados, mínimo 90, la elegida centrada con `scrollTo` en la barra, anillo por dentro; fixed en una línea con puntos suspensivos (scrollable para más de cuatro); foco itinerante sacado del `ChipGroup` a `src/internal/roving-focus.ts` (las 39 pruebas del ChipGroup sin cambios); medidas del kit y lo que falta de Compose, conflictos en `07-jetpack-compose.md` (alto 64 y no 72, indicador del kit); pendiente comprobar VoiceOver y NVDA a mano; resuelto por agente el 2026-11-26; la espera de la salida pasó a `src/internal/settle-animations.ts` y la comparten Tooltip, Menu y Dialog (2026-11-26: una transición cancelada, por ejemplo al activar el movimiento reducido a mitad de la salida, dejaba los cuatro abiertos con `data-closing`, el Dialog invisible y modal con la página inerte; comprobado en los tres motores, con pruebas de salida cancelada en cada uno) |
| Top app bar | organismo | ADR-0024: universal, con una parte cliente aislada (`TopAppBarScroll`); `TopAppBar` (`<header>`, `banner` solo fuera de `<main>`/secciones; `render`) con `size` `sm`, `md` y `lg` (el medium y el large son los flexible de Expressive: título de varias líneas y barra que crece, 112/136 y 120/152 con subtítulo), `centered` y `scrollBehavior` (`pinned` por defecto en el small, `exit-until-collapsed` en el medium y el large, `enter-always`, `none`); partes `TopAppBarLeading`, `TopAppBarTitle` (`<h1>`, `level`), `TopAppBarSubtitle` y `TopAppBarActions`; otro hijo ocupa el lugar del título (search bar del ítem 21, imagen de 40 del small con imagen); primer hijo del contenedor que se desplaza (ventana o panel), sin conectar nada: `position: sticky` y animaciones atadas a `scroll(nearest block)` (sonda en los tres motores: existen igual; `scroll-state()` solo en Chrome) para el color (Surface → Surface Container) y el colapso, con la fila de iconos `sticky` dentro de la barra; títulos cruzados como Compose con una copia `aria-hidden` e `inert` (un solo encabezado para el lector); la parte cliente mide el alto real, hace de respaldo sin `animation-timeline` (misma animación detenida con `animation-delay`) y `enter-always` (sigue lo desplazado, se acomoda al terminar, vuelve con el foco; el medium y el large colapsan al small); colores registrados como `<color>` para que el cambio de tema llegue a la animación; con movimiento reducido el acomodo salta; borde inferior CanvasText en alto contraste; acciones que no entran: documentado (hasta tres y un `Menu` de más opciones, en el playground `#top-app-bar`); mejora opcional anotada con el autor el 2026-11-26: menú de más opciones automático como el `AppBarRow` de Compose Expressive (indicador de desborde; pide medir en el cliente), solo si un proyecto real lo pide; sin sombra al desplazar (kit; Compose solo pinta el color); conflictos en `07-jetpack-compose.md`; pendiente comprobar VoiceOver y NVDA a mano; resuelto por agente el 2026-11-26 |
| Sheets (bottom sheet modal y side sheet) | organismo | ADR-0025: cliente (`showModal`, estado, arrastre); base modal común sacada del Dialog a `src/internal/modal-dialog.ts` (`useModalDialog`: `showModal`, foco inicial, Escape y scrim con `onClose` controlado, Tab que da la vuelta, salida con `settleAnimations`, foco devuelto), que usan `Dialog`, `BottomSheet` y el `SideSheet` modal, y que usará el NavigationRail modal (ítem 23); `BottomSheet` (`<dialog>`, 640 como máximo y centrado, radio 28 arriba, Surface Container Low, scrim al 32 %) con estados parcial (si el sheet pasa la mitad de la ventana; la mitad a la vista) y expandido en `data-state`, `skipPartiallyExpanded`, `BottomSheetHandle` (botón que expande, contrae o cierra, como el toque del asa de Compose, con el nombre según la acción), `BottomSheetTitle` y `BottomSheetContent`; arrastre con eventos de puntero (mouse, táctil y lápiz) que sigue al puntero y decide al soltar con `computeTarget` de Compose (56 px, 125 px/s), cerrar como pedido a `onClose` (si el padre no cierra, vuelve); desplazamiento anidado decidido al pasar los 8 px (parcial, o hacia abajo con el contenido arriba de todo, mueve el sheet; un `touchmove` no pasivo frena el desplazamiento nativo; comprobado con toques reales en Chrome); `SideSheet` modal (`<dialog>` contra el borde final, en RTL el izquierdo, 320 o la ventana menos 48, radio 16 del lado del contenido) o standard (`modal={false}`, `<aside>` complementario con divisor), con `SideSheetHeader`, `SideSheetBack`, `SideSheetTitle`, `SideSheetClose`, `SideSheetContent` y `SideSheetActions`; zonas seguras con `env(safe-area-inset-*)`; movimiento reducido con fundido y sin deslizarse; el bottom sheet standard (no modal) queda para el scaffold (ítem 24); estado controlado o no (agregado el 2026-11-26 con el autor, modelo de Vaul, actualización del ADR-0025): `state`/`defaultState`/`onStateChange(state, reason)` con `reason` `drag`, `handle`, `focus` o `resize`, una llamada por cambio asentado, veto si el padre no actualiza `state`, `partial` sin parcial se muestra expandido y avisa `resize`; avance del arrastre y de las animaciones en `--mk-bottom-sheet-progress` (lo visible del alto, 0 a 1, sin render por cuadro; lo heredan el contenido y el `::backdrop`), con ejemplos en `#sheets`; resuelto por agente el 2026-11-26 |
| Search (search bar y search view) | organismo | ADR-0026: cliente (estado del combobox; `SearchBarLeading`/`SearchBarTrailing` universales); `Search` (raíz `<search>`, texto `value`/`defaultValue`/`onValueChange`, `onSubmit`, `onSelect`, `view` `auto`/`docked`/`full-screen`), `SearchBar` (píldora de 56 con el `<input type="search">`, props nativas y `ref` al input, nombre obligatorio, botón de borrar propio), `SearchView` (`listbox`; `loading`, "Sin resultados", región viva cortés a los 500 ms), `SearchSuggestion` (`<li role="option">` con las partes de `ListItem`, `value`/`textValue`, `disabled`) y `SearchSuggestionGroup` (`<ul role="group">` con nombre visible); combobox APG con `aria-activedescendant` (flechas con vuelta, Enter elige o busca y envía el `<form>` con `requestSubmit`, Escape cierra y luego borra, Alt+Flecha abajo); sugerencias filtradas por el uso; docked: popover anclado en `block-end center` y estirado (del ancho de la barra; con `span-inline-end` Firefox la corría en RTL), a 2, radio 12, Level3; pantalla completa: `<dialog>` con `useModalDialog`, su propia barra (volver, campo, borrar), barra que se estira desde su lugar con FLIP y FastSpatial (sin desplazamiento con movimiento reducido), zonas seguras; `auto` elige por la clase de ventana (compact a pantalla completa, `WINDOW_WIDTH.medium`); dentro del TopAppBar a 8 de los lados, Surface Container y Surface Container Highest al desplazar (misma animación por desplazamiento y respaldo), sin tocar el TopAppBar; no envuelve el TextField (decidido con el autor); anillo de foco de la barra solo con teclado (marca `data-pointer-focus` tras un `pointerdown`, se quita al volver a entrar sin puntero o con una tecla de navegación); quitar sugerencias con `onRemove(value)` en `SearchSuggestion` (Supr sobre la activa, "Se quitó …" en la región viva, la activa pasa a la vecina cuando el uso la saca, descripción oculta "Supr para quitar"; Retroceso no quita; con el puntero, una acción de la app fuera de la lista; receta `useRecentSearches` con `localStorage` en el playground; Search no guarda nada, decidido con el autor); conflictos en `07-jetpack-compose.md` § Search; pendiente comprobar VoiceOver, NVDA y el teclado de iOS a mano; resuelto por agente el 2026-11-26 |
| Toolbars (docked y floating) | organismo | ADR-0027: cliente (excepción al ADR-0003, como el ChipGroup) `Toolbar` (`role="toolbar"`, nombre obligatorio con `AccessibleNameProps`, `variant` floating o docked, `color` standard o vibrant, `orientation` vertical solo en la floating) con `useRovingFocus` sin cambios (una parada, flechas en el eje, RTL, vuelta, Inicio y Fin; `disabled` se saltea y `aria-disabled` sigue siendo parada; un campo de texto conserva su Tab; en la vertical, arriba y abajo no abren el menú); colores de los botones del kit por variables públicas nuevas que leen IconButton (`--mk-icon-button-selected-*`) y Button (`--mk-button-{unselected,selected}-*`); `position: sticky` en su contenedor (docked y horizontal abajo, la vertical como `float` al costado), zonas seguras, y adentro se desplaza a lo ancho si no entra (recomendado: hasta cinco y un Menu de más acciones); seleccionados redondos como el kit (`--mk-icon-button-selected-round`, `--mk-button-selected-round`); la vertical a cualquier costado (`side`) con su alto limitado a lo visible del contenedor (medido); `ToolbarLayout` cliente para el FAB acompañante (su propia parada de Tab) con `expanded`/`defaultExpanded`/`onExpandedChange`: contraída, la barra se recorta hacia el FAB, queda `inert` y el FAB crece a 80 con su tamaño real (el md de `fab.css`, sin moverse ni salirse), y el foco de teclado en el FAB la expande (controlado e ignorado, aviso en desarrollo con `src/internal/dev.ts`); `scrollBehavior="collapse"` contrae al bajar 40 y expande al subir 40; la docked no tiene FAB (ni el kit ni Compose lo definen); `scrollBehavior="exit-always"` en una parte cliente aislada (`ToolbarScroll`, el algoritmo de `enter-always` del TopAppBar) que corre el `bottom` del sticky (no `translate`, que agranda la página), vuelve con el foco y no se esconde con el foco adentro; `nearestScroller` sacado a `src/internal/nearest-scroller.ts`; resuelto por agente el 2026-11-26 y completado el 2026-11-27 |
| NavigationSuite y NavigationRail modal | organismo | ADR-0029: `NavigationSuite` universal (`<nav>`, `layout` `auto`/`bar`/`rail`) con `NavigationSuiteHeader` (solo en el rail), `NavigationSuiteItem` (enlace, botón o `render`, `aria-current`), `NavigationSuiteItemIcon` y `NavigationSuiteItemLabel`; una sola estructura cuyo CSS cambia de presentación con media queries (sin JavaScript ni salto al hidratar), porque el destino del rail contraído es el vertical de la barra en una columna de 96; regla de Compose verificada en `NavigationSuiteScaffold.kt` (ancho < 600 barra vertical; si no, alto < 480 barra horizontal con cualquier ancho; si no, rail contraído, también desde 1200: no expande solo); sonda y pruebas de paridad contra NavigationBar y NavigationRail reales en los tres motores (incluida la hidratación con `renderToString`); `ModalNavigationRail` cliente sobre `useModalDialog` (rail expandido en un `<dialog>` desde el borde de inicio, `surface-container`, radio 16, sin sombra, DefaultSpatial en los dos sentidos, fundido con movimiento reducido, zonas seguras, foco inicial en el destino actual, `closeOnSelect` por defecto, `ModalNavigationRailClose` con `menu_open`; textos de Compose "Navigation rail" y "Close rail"); el menú de páginas del playground pasó del Dialog al rail modal con filtro y grupos como contenido de la app; NavigationBar, NavigationRail, Dialog y sheets sin cambios; pendiente: arrastre para cerrar el rail modal; resuelto por agente el 2026-11-27 |
| Diagnósticos (avisos y errores) | interno | ADR-0028: `src/internal/diagnostics.ts` universal con `mkError` (`throw mkError(…)`, siempre) y `mkWarn` (solo en desarrollo, una vez por objeto `once` o por texto); formato `[matekit] <Component>: <what happened>. Fix: <how to fix it>. (<CODE>)` en inglés con `{ component, code, docs, ...detalles }`; 9 códigos por causa (`MK_PART_OUTSIDE_PARENT`, `MK_RENDER_NOT_ELEMENT`, `MK_TRIGGER_NOT_ELEMENT`, `MK_TOOLTIP_NO_TEXT`, `MK_SNACKBAR_HOST_MISSING`, `MK_SNACKBAR_DURATION_INVALID`, `MK_INTERNAL_INVARIANT`, `MK_TAB_UNNAMED`, `MK_TOOLBAR_EXPAND_IGNORED`); `MatekitError` y los tipos de código públicos; catálogo en inglés `docs/diagnostics.md` sincronizado por `tests/diagnostics.test.ts`; los 18 errores y 2 avisos migrados (el de Tabs pasa a aviso solo en desarrollo; los disparadores dejan `Children.only` para que salga el error de matekit); sin `setLogger`; resuelto por agente el 2026-11-27 |
| Textos por defecto en inglés | interno | Actualización del ADR-0028: un `strings.ts` por componente con textos (Search, BottomSheet, SideSheet, Snackbar, InputChip), con su interfaz y cada clave llamada como la prop que lo cambia; los textos con datos son funciones (`formatRemoved`, `formatCount`, que cada idioma arma con sus plurales); índice `src/strings/index.ts` con `defaultStrings` y el tipo `MatekitStrings`, exportados desde `src/index.ts` como base de una traducción (sin efectos al cargar); sin props nuevas (todas existían); `tests/strings.test.ts` (Node) busca textos escritos a mano en `src/` (letras del español, claves de texto, texto JSX, frases) fuera de los `strings.ts` y comprueba que cada uno esté en el índice; el playground los pasa en español desde `playground/strings-es.ts`; fuera por ahora: fijarlos una vez para toda la app; resuelto por agente el 2026-11-27 |
| Escala de espaciado, cortes de ventana, Stack y Group | tokens y átomos | ADR-0016 y ADR-0017; `--md-sys-space-*` (el nombre de `@material/web` labs, con los 18 pasos y la numeración de Compose `MeasurementTokens.kt`: `200` = 16) generado por `pnpm tokens`, con `SPACE`/`SpaceStep` en TypeScript; cortes de `WindowSizeClass.kt` como `WINDOW_WIDTH`/`WINDOW_HEIGHT` (JSON y TypeScript, sin variables CSS); `pnpm lint:css` revisa `gap`, `padding` y `margin` en todo archivo menos los 12 de `SPACING_PENDING`; `Stack` universal (`direction`, `gap` tipado en la escala, `wrap`, `align`, `justify`, `switchAt` con el patrón "switcher" elegido por una sonda en los tres motores, `render`); `Group` universal (`orientation`, `render`; esquinas por posición en `--mk-group-corner-*` registradas sin herencia, a partir de `--mk-group-gap`, `--mk-group-outer-radius` y `--mk-group-inner-radius`, que el uso define también por estado; sin roles propios; contorno en alto contraste); ejemplos de List segmentada y botones conectados en el playground; Button y Card todavía no leen las variables (propuesta en ADR-0017); resuelto por agente el 2026-11-25 |
| Playground: navegación y disposición | playground | navegación agrupada por capa (átomos, moléculas, organismos, disposición y tokens, ejemplos) en `playground/PageNav.tsx`, hecha con `List` + `ListItemAction` (`current`), `Stack` y un `TextField` para filtrar por nombre (sin tildes; Enter abre la primera); desde 52,5rem (`WINDOW_WIDTH.expanded`) panel lateral fijo, debajo un `Dialog` que se abre con un `IconButton` (foco en la página actual al abrir, vuelve al botón al cerrar); ajustes de la cabecera en grilla de dos columnas a 320 px; matrices anchas con `overflow-x: auto` propio; sin desborde horizontal en las 22 páginas a 320, 600, 900 y 1400 px en Chrome, Firefox y WebKit, claro y oscuro; URLs iguales, ahora también con atrás y adelante (`hashchange`); enlace "Saltar al contenido"; resuelto por agente el 2026-11-25 |
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
List; hecho, ver "Hecho", ADR-0016 y ADR-0017). Muchos diseños de Material 3 agrupan el contenido en bloques, no en grillas rígidas, y
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
Pendiente (2026-11-25):
- Migrar el espaciado de los componentes existentes a `--md-sys-space-*`: los 12 archivos de
  `SPACING_PENDING` en `scripts/lint-css.ts` (Divider, Badge, Card, Checkbox, RadioButton, Slider,
  Switch, TextField, Dialog, Menu, NavigationBar, NavigationRail; 47 declaraciones). Al migrar
  cada uno, sacarlo de la lista (el lint lo pide). Las medidas del kit fuera de la escala llevan
  `lint-css-allow` con el motivo.
- Que Button, IconButton y Card lean las esquinas de Group (`--mk-group-corner-*` con su radio
  como respaldo; ADR-0017): se hace con el ítem 25 (Button groups) y cuando haga falta agrupar
  tarjetas.

**14. List** (organismo, universal; hecho, ver "Hecho" y ADR-0018). `List` y `ListItem` con partes (`ListItemLeading`,
`ListItemHeadline`, `ListItemSupporting`, `ListItemTrailing`), una, dos y tres líneas, y
elementos interactivos (`ListTokens.kt`). Usa Divider, Checkbox, Radio y Switch como contenido
final; la segmentada usa `Group` (13). Responsive: ancho fluido, textos que cortan línea o se
recortan según el caso, elementos finales que se reacomodan en anchos chicos, y un uso razonable
en paneles de lista y detalle. Riesgo bajo a medio: la semántica (lista de enlaces, de acciones
o de selección).

Pendiente de la List (2026-11-25):
- Comprobar a mano con VoiceOver en Safari que la lista se anuncia como lista (con `role="list"`; no
  se pudo automatizar: Playwright no expone el árbol de accesibilidad de WebKit).
- Draggable y Swipe del kit: ítem propio (gestos, reordenar con teclado). La API los deja abiertos
  (ADR-0018).
- En una fila de selección con un control secundario, presionarlo también dispara la onda de la fila.

**Playground: navegación y disposición** (hecho el 2026-11-25, ver "Hecho"; pedido por el autor el
2026-11-25). Con más de 20 páginas, la barra de navegación de la cabecera (una fila de enlaces
sin envoltura) mide unos 1740 px y desborda en horizontal en todas las páginas; a 320 px también
se salen controles sueltos (por ejemplo `label.pg-field` en la página de la Card). Objetivos:
- Navegación que escale con la cantidad de páginas: agrupada (por ejemplo átomos, moléculas,
  organismos, tokens y ejemplos), con la página actual marcada, y adaptada al ancho (panel lateral
  en pantallas anchas, menú o panel desplegable en las chicas). Usar los componentes de matekit
  donde sirvan (List con elementos que son enlaces y `aria-current`, NavigationRail, Menu, Stack),
  como prueba de uso real, sin forzarlos.
- Sin desborde horizontal de la página a 320 px en ninguna página; los selectores de tema, paleta,
  contraste y movimiento se reacomodan.
- Mantener las URLs de las páginas (las capturas y los enlaces de las notas las usan).
- Opcional: buscar o filtrar páginas.
No cambia la librería; si un componente no alcanza para el playground, se anota como pendiente en
el plan en lugar de agrandarlo para este uso.

Pendiente del playground (2026-11-25), lo que los componentes no cubrieron y se resolvió en el
playground:
- En pantallas chicas el índice se abre en un `Dialog` centrado (alto completo con
  `--mk-dialog-width` y una clase propia). Lo que corresponde en Material 3 Expressive es el
  NavigationRail expandido modal (reemplaza al navigation drawer, sobre el contenido y con scrim),
  que `NavigationRail` no tiene (solo docked y floating, sin scrim ni foco atrapado). Además, el
  rail está pensado para pocos destinos: no agrupa por secciones ni desplaza 22 destinos. Al
  sumar la variante modal (ítem de navegación adaptativa de la tanda C), probarla con este índice.
- Menu no se usó: es para acciones (`role="menu"`), no para un índice de enlaces agrupado.
- axe (best-practice, no WCAG) marca `skip-link` en los enlaces `#pagina` del índice dentro del
  diálogo: los toma por enlaces de salto sin destino. Es el enrutado por hash del playground, no la
  List; en el panel lateral no aparece.

**15. Chips** (molécula; hecho, ver "Hecho" y ADR-0019). Assist, filter, input y suggestion (`AssistChipTokens.kt`,
`FilterChipTokens.kt`, `InputChipTokens.kt`, `SuggestionChipTokens.kt`). Filter como toggle
(`aria-pressed`) o en grupo de selección; input con botón de quitar. Riesgo medio: la
navegación con teclado de un grupo de chips.

**Interactive: primitiva pública de elemento interactivo** (átomo, universal; hecho, ver "Hecho" y
ADR-0020; antes de Tooltip; decidido con el autor el 2026-11-26). Exportar como átomo universal la lógica de `src/internal/interactive.tsx`
(ADR-0010): con `href` un `<a>`, sin `href` un `<button type="button">`, con `render` el elemento
que se pase (el `Link` del enrutador), combinando clases (también la `className` función de
`NavLink`), props y `ref`. Motivo: StateLayer, FocusRing y Ripple ya son públicos, y quien arme un
control propio necesita también la pieza que elige el elemento, sin copiar la lógica.
- API chica: `Interactive` y `InteractiveProps`, nada más (sin estilos, sin átomos incluidos,
  sin activo ni reglas de deshabilitado, que siguen en cada componente). El tipo auxiliar
  `ToggleButtonOrLinkProps` queda interno por ahora.
- Migrar a `Interactive` los componentes que hoy usan `interactiveElement` (Button, IconButton,
  FAB, la base de los destinos de NavigationBar y NavigationRail, Card, List y Chips): refactor
  sin cambio de comportamiento, cubierto por sus pruebas actuales.
- Documentarlo junto a los átomos como base para controles propios, con un ejemplo con
  StateLayer, FocusRing y Ripple, y con las reglas de `render` como contrato público.
- ADR nuevo que complementa al 0010 (el contrato de `render` pasa a ser API pública).
Riesgo bajo.

**16. Tooltip** (organismo, cliente; hecho, ver "Hecho" y ADR-0021). Plain y rich (`PlainTooltipTokens.kt`,
`RichTooltipTokens.kt`), con Popover y anchor positioning como el Menu (ADR-0007), y el patrón
APG de tooltip (hover y foco, Escape, sin contenido interactivo en el plain). El posicionamiento
del Menu (`src/organisms/Menu/position.ts`, ADR-0007) se mueve a `src/internal/` y lo usan los
dos, sin copiarlo (decidido con el autor el 2026-11-26: lo van a necesitar también el FAB menu y
Search; exponerlo como API pública se revisa al preparar la publicación). Riesgo medio:
mostrar y ocultar con demora sin parpadeos y en dispositivos táctiles.

**17. Snackbar** (organismo, cliente; hecho, ver "Hecho" y ADR-0022). Mensaje con acción opcional y botón de cerrar
(`SnackbarTokens.kt`), en la capa superior (Popover), con región viva (`role="status"`) y una
cola para varios mensajes. Riesgo medio: la API de la cola sin acoplarse a un estado global.

### Tanda C: estructura de pantalla

**18. Tabs** (organismo, cliente; hecho, ver "Hecho" y ADR-0023). Primary y secondary (`PrimaryNavigationTabTokens.kt`,
`SecondaryNavigationTabTokens.kt`), con el patrón APG de pestañas (`tablist`, flechas, Inicio y
Fin, activación automática o manual) y el indicador animado. Variante de enlaces para navegar
entre páginas (no pestañas). Foco itinerante: si Tabs llega antes que Toolbars (22), saca a
`src/internal/` el foco itinerante del `ChipGroup` (una sola parada de Tab y flechas, RTL,
Inicio y Fin, ADR-0019) y lo usan los dos (decidido con el autor el 2026-11-26). Riesgo medio.

**19. Top app bar** (organismo, universal con una parte cliente aislada; hecho, ver "Hecho" y ADR-0024). Small, medium y large, y las "flexible" de Expressive
(`AppBarSmallTokens.kt`, `AppBarMediumFlexibleTokens.kt`, `AppBarLargeFlexibleTokens.kt`), con
título, subtítulo y acciones; el cambio al desplazar (fondo y tamaño) con CSS
(`animation-timeline: scroll()` donde exista) o con un respaldo. Riesgo medio a alto.

**20. Sheets** (organismo, cliente; hecho, ver "Hecho" y ADR-0025). Bottom sheet modal y side sheet (`SheetBottomTokens.kt`),
sobre `<dialog>` como el Dialog; el arrastre para cerrar del bottom sheet es lo que agrega
riesgo. Riesgo alto.

**21. Search** (organismo, cliente; hecho, ver "Hecho" y ADR-0026). Search bar y search view (`SearchBarTokens.kt`,
`SearchViewTokens.kt`), con el patrón APG de combobox para las sugerencias. Riesgo alto.
En la barra superior (configuración Search del kit, ADR-0024): la search bar va como hijo directo de
`TopAppBar`, que la ubica en el lugar del título; falta su relleno de 8 a los lados
(`AppBarTokens.SearchLeadingSpace`/`SearchTrailingSpace`) y su color al desplazar
(`SearchOnScrollContainerColor`, Surface Container Highest).

**22. Toolbars** (organismo, cliente con partes universales; hecho, ver "Hecho" y ADR-0027). Docked y floating de Expressive (`DockedToolbarTokens.kt`,
`FloatingToolbarTokens.kt`, `VibrantToolbarTokens.kt`), con el patrón APG de toolbar (una sola
parada de Tab y flechas). Foco itinerante: reutilizar el que se haya sacado del `ChipGroup` a
`src/internal/` con Tabs (18); si todavía no se sacó, sacarlo acá (decidido con el autor el
2026-11-26). **Ya sacado** con Tabs (2026-11-26): `src/internal/roving-focus.ts` (`useRovingFocus`,
con `orientation` horizontal, vertical o `both`, `loop`, `preferred` y `activate`; ADR-0023); falta
ver si la Toolbar necesita paradas deshabilitadas enfocables (`aria-disabled`, que APG admite).
**Resuelto (2026-11-26):** no hizo falta cambiar el módulo: `aria-disabled` no es `:disabled` y ya
queda como parada. El 2026-11-27 se sumaron la forma redonda de los seleccionados, `expanded` hacia el
FAB, la vertical al inicio y su alto medido (ADR-0027). Riesgo medio.

**Diagnósticos: avisos y errores con un formato único** (antes de NavigationSuite; decidido con el
autor el 2026-11-27; hecho, ver "Hecho" y ADR-0028; por pedido del autor, los mensajes y el catálogo
quedaron en inglés con "Fix:" en lugar de "Solución:"). Hoy hay unos 18 `throw new Error` (partes fuera de su componente, `render`
que no es un elemento, valores inválidos) y dos avisos en consola (Tabs, que sale también en
producción, y Toolbar), cada uno escrito a su manera. Objetivo: que sirvan al dev, para depurar y a
un agente LLM.
- `src/internal/diagnostics.ts` (no público): `mkWarn(código, mensaje, detalles)` para usos que
  funcionan pero están mal (solo en desarrollo con `isDevelopment()` de `src/internal/dev.ts`, una
  vez por instancia o por clave) y `mkError(código, mensaje, detalles)` que lanza un `MatekitError`
  con `code` para usos que no pueden funcionar (siempre).
- Formato único: `[matekit] <Componente>: <qué pasó>. Solución: <cómo arreglarlo>. (<CÓDIGO>)`, y
  como segundo argumento un objeto estructurado `{ component, code, docs, ...detalles }`. Códigos
  estables y neutros (por ejemplo `MK_TOOLBAR_EXPAND_IGNORED`); mensajes en español.
- Catálogo `docs/diagnostics.md`: por código, la causa, la solución y el ADR o JSDoc.
- Migrar los mensajes existentes (cada uno con su código y su "Solución"), limitar a desarrollo el
  aviso de las Tabs, y que las pruebas comparen el código en lugar del texto.
- Regla nueva en `CLAUDE.md`: todo aviso o error nuevo pasa por `mkWarn`/`mkError` y se suma al
  catálogo.
- Fuera por ahora: redirigir o silenciar los mensajes (`setLogger`), salvo que un proyecto lo pida.
Riesgo bajo.

**Textos por defecto en inglés** (antes de NavigationSuite; decidido con el autor el 2026-11-27;
hecho, ver "Hecho" y la actualización del ADR-0028).
Las salidas de la librería van en inglés (ADR-0028); los textos visibles por defecto de los
componentes también. Hoy quedan en español, entre otros: Search ("Borrar búsqueda", "Se quitó …",
"1 sugerencia"/"N sugerencias", "Buscando…", "Sin resultados", "Cerrar búsqueda", "Supr para
quitar"), BottomSheet (asa: "Expandir", "Contraer", "Cerrar"), SideSheet ("Cerrar", "Volver"),
Snackbar ("Cerrar") e InputChip ("Quitar <etiqueta>").
- Un `strings.ts` en la carpeta de cada componente con sus textos por defecto tipados, y un índice
  central `src/strings/index.ts` que los reúne en un solo objeto tipado (para ver todos los textos,
  para una prueba que verifique que no quedan textos visibles escritos a mano en los componentes, y
  como base de un mecanismo para fijarlos para toda la app o de un paquete de idioma, más adelante).
- Los textos con datos, como funciones (`removed: (text) => …`), para que cada idioma ordene las
  palabras; los plurales con `Intl.PluralRules` o una función por idioma.
- Las props que ya permiten cambiarlos se mantienen; el playground los muestra en español pasando
  las props, como haría una app.
- Fuera por ahora: fijar los textos una sola vez para toda la app (contexto o configuración), que se
  decide al preparar la publicación.
Riesgo bajo.

**23. NavigationSuite: navegación adaptable** (organismo, universal, con la variante modal del rail cliente; agregado el 2026-11-25; hecho, ver "Hecho" y ADR-0029).
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
- **Variante modal del NavigationRail** (agregado el 2026-11-25, encontrado al rehacer el
  playground): el rail expandido sobre el contenido, desde el borde de inicio, de alto completo,
  con scrim y foco atrapado, que en Expressive reemplaza al navigation drawer (Compose
  `ModalWideNavigationRail` o el nombre vigente; verificar). Es lo que corresponde en pantallas
  chicas cuando hay más destinos de los que entran en una barra. Relacionado con el side sheet de
  Sheets (20): evaluar si comparten base (`<dialog>` como el Dialog). **Decidido con Sheets
  (2026-11-26, ADR-0025):** comparten el ciclo de vida modal, ya sacado a
  `src/internal/modal-dialog.ts` (`useModalDialog` y `useRegisteredId`, que usan Dialog, BottomSheet
  y el SideSheet modal); no un componente de panel lateral, porque el contenido no se parece
  (cabecera y acciones frente a destinos). El rail modal dibuja su `<dialog>` sobre el hook, contra el
  borde de inicio, con la entrada por `translate` del side sheet modal (`side-sheet.css`, con
  `--_hidden` invertido para el inicio) y su scrim al 32 %. Si necesita cerrar arrastrando hacia el
  borde (Compose lo tiene), reutilizar `computeTarget` y `VelocityTracker` de
  `src/organisms/BottomSheet/sheet-drag.ts` en el eje horizontal.
- **Al terminar, reemplazar en el playground** el Dialog centrado que hoy hace de menú de
  páginas en pantallas chicas (`playground/PageNav.tsx`) por esta variante modal (decidido con el
  autor el 2026-11-25: el Dialog queda hasta entonces).
Riesgo medio.

**24. Scaffold de paneles** (organismo, universal; agregado el 2026-11-25). Paneles de lista y
detalle y de contenido con panel de apoyo, como `ListDetailPaneScaffold` y
`SupportingPaneScaffold` de Compose (§ 2 de la misma investigación): 1 panel en compact y
medium, 2 en expanded y 3 desde 1200; el secundario de 360 (412 desde 1200), el principal con
el resto y 24 entre paneles; la app indica el panel actual (sin historial ni "atrás predictivo").
Lo que no entra: ocultar (Hide, por defecto en lista y detalle), debajo (Reflow, columna CSS) o
flotando (Levitate, reutilizando Sheets o Dialog). El bottom sheet standard (no modal, el de
`BottomSheetScaffold` de Compose, con asomo de 56) quedó fuera de Sheets (ADR-0025) y se decide acá,
reutilizando el arrastre de `BottomSheet` sin el `<dialog>`; el side sheet standard ya existe
(`SideSheet modal={false}`) y puede ser el panel de apoyo. Con media queries para la cantidad de paneles
y la List (14) diseñada para vivir en un panel de 360. El divisor arrastrable es opcional y de
prioridad baja. Riesgo medio. Cada panel que se desplaza lleva su `TopAppBar` como primer hijo
(ADR-0024): la barra usa el contenedor más cercano, sin conexión; una barra fuera del contenedor que
se desplaza queda plana y sin colapso. Zonas seguras (anotado con el autor el 2026-11-26): decidir
acá qué toca el borde de la pantalla y aplicar `env(safe-area-inset-*)` (muesca, PWA a pantalla
completa con `viewport-fit=cover`) a lo que corresponda, empezando por el TopAppBar arriba de todo
y los paneles en los costados; si no se resuelve en este ítem, al preparar la publicación.

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
