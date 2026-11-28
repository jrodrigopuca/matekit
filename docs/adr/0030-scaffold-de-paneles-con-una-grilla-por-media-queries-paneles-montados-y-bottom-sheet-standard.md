# ADR-0030: Scaffold de paneles universal con una grilla que cambia por media queries, paneles ocultos y montados, superficie desde 600, zonas seguras en un solo lugar y bottom sheet standard

- Status: accepted (2026-11-28)
- Complementa: [ADR-0002](0002-api-por-composicion-con-capas-atomicas.md) (partes con nombres
  planos), [ADR-0003](0003-componentes-universales-e-interactivos.md) (qué es cliente),
  [ADR-0016](0016-escala-de-espaciado-y-cortes-de-ventana.md) (cortes de ventana en rem, espaciado con
  tokens), [ADR-0017](0017-stack-y-group.md) (`render` de las piezas de disposición),
  [ADR-0024](0024-top-app-bar-sticky-en-su-contenedor-animaciones-por-desplazamiento-y-parte-cliente-aislada.md)
  (barra `sticky` en su contenedor),
  [ADR-0025](0025-sheets-sobre-dialog-base-modal-comun-arrastre-con-puntero-y-desplazamiento-anidado.md)
  (sheets y arrastre; su "Revisit if" anunciaba este ítem),
  [ADR-0028](0028-diagnosticos-con-formato-unico-codigos-estables-y-catalogo.md) (diagnósticos y textos)
  y [ADR-0029](0029-navigation-suite-con-una-sola-estructura-y-media-queries-y-navigation-rail-modal.md)
  (NavigationSuite por media queries; dejaba a este ítem la ubicación de la suite).
- Drivers:
  - Ítem 24 del plan: lista y detalle y contenido con apoyo como `ListDetailPaneScaffold` y
    `SupportingPaneScaffold` de Compose; 1 panel en compact y medium, 2 en expanded, 3 desde 1200; el
    panel actual lo dice la app, sin historial ni "atrás predictivo"; zonas seguras (anotado con el autor
    el 2026-11-26); el bottom sheet standard se decide acá.
  - Compose, `docs/research/11-disposicion-adaptable-compose.md` §§ 1–2 (`PaneScaffoldDirective.kt`,
    `ThreePaneScaffold.kt`, `ThreePaneScaffoldValue.kt`, commit `03c09d6718`): particiones, preferidos
    de 360 y 412, 24 entre paneles, el sobrante al de más prioridad y achique proporcional si falta;
    prioridades Primary 10, Secondary 5, Tertiary 1, con el destino actual primero.
  - Kit, `docs/research/05-medidas.md` § Scaffold de paneles (2026-11-28): fondo Surface; panel con
    superficie en Surface Container Lowest, radio 28, 24 desde arriba hasta el borde de abajo; lista sin
    superficie; 24 al inicio y entre paneles, ≈ 16 al final; pegado al rail. Y § Sheets: el standard con
    elevación 3.
  - Sondas del 2026-11-28 en Chrome, Firefox y WebKit de Playwright (las pruebas de
    `PaneScaffold.test.tsx` y `StandardBottomSheet.test.tsx`, corridas antes de cerrar la técnica):
    ver "Ocultos y montados" y "Reparto".

## Decisión

### API

```tsx
<PaneScaffold current={selected ? 'detail' : 'list'}>          {/* variant="list-detail" por defecto */}
  <NavigationSuite aria-label="Main">…</NavigationSuite>        {/* opcional */}
  <Pane name="list" render={<nav aria-label="Messages" />}>
    <TopAppBar>…</TopAppBar>
    <List>…</List>
  </Pane>
  <Pane name="detail" render={<main />}>…</Pane>
  <Pane name="extra">…</Pane>                                   {/* opcional */}
  <BottomSheet modal={false}>…</BottomSheet>                    {/* opcional */}
</PaneScaffold>
```

- **Un solo scaffold con `variant`** (`list-detail` o `supporting`) y **una sola parte, `Pane`**, con
  `name` (`list`, `detail`, `extra`; o `main`, `supporting`, `extra`). En Compose son dos scaffolds sobre
  el mismo `ThreePaneScaffold`; acá también comparten todo el CSS, y dos componentes con dos juegos de
  partes (`ListPane`, `DetailPane`, `MainPane`…) duplicarían la API sin ganar nada. Los tipos atan
  `current` al `variant` (unión discriminada); lo que los tipos no pueden atar, un `Pane` de otro caso
  dentro del scaffold, avisa en desarrollo (`MK_PANE_NOT_IN_VARIANT`: ese panel nunca se vería).
- `Pane` y no `PaneScaffoldPane`: el prefijo es el concepto, como `Tab`/`TabPanel` dentro de `Tabs`.
- `current` es el panel que mira el usuario; por defecto `list` o `main`. Sin historial, sin atrás
  predictivo: la app cambia `current` (con su enrutador o su estado).
- `surface` en `Pane` cambia la regla de superficie (abajo); `render` (el de `layoutElement`, ADR-0017)
  da la semántica: `<main>` para el detalle, `<nav>`/`<section aria-label>` para la lista. La raíz es un
  `<div>` sin rol.

### Universal: todo por CSS

Sin `'use client'`. El componente solo escribe `data-variant`, `data-current` y `data-pane`; cuántos
paneles se ven, cuáles, sus anchos, márgenes, superficie y zonas seguras son media queries sobre los
cortes de `WINDOW_WIDTH` (37.5rem, 52.5rem, 75rem) y `:has()` para saber si hay panel extra, rail,
barra o sheet. El HTML del servidor ya es el correcto (la prueba de `renderToString` + `hydrateRoot`
no ve cambios ni avisos), como NavigationSuite.

Qué se ve, como `calculateThreePaneScaffoldValue` sin historial: el actual, y mientras haya lugar, el
de más prioridad que quede. Con dos paneles: lista y detalle (con cualquiera de los dos actual), y con
el extra actual, detalle y extra; en `supporting`, principal y apoyo, o principal y extra. Con tres,
todos; si no hay extra, los dos.

### Reparto: una grilla, no flex

Una grilla en la raíz: una columna `auto` para el rail, una para el margen de inicio, las de los
paneles visibles (variables por estado) y una para el margen del final; la barra de navegación es una
segunda fila a todo el ancho. Cada panel tiene una pista `minmax(0, preferido)` y el de más prioridad
suma `minmax(0, 1fr)`: el algoritmo de la grilla agranda primero, por igual, las pistas con tope (como
los preferidos de un scaffold son iguales, "en proporción" es "por igual") y lo que sobra va a la `fr`.
Medido en los tres motores: 840 entre márgenes da 360 + 24 + 456; 1200 entre márgenes da tres de 384
(1152 < 3 × 412); a 1600, 412 + 688 + 412.

| Opción | A favor | En contra |
|---|---|---|
| **Grilla con pistas por estado** (elegida) | Barra abajo a todo el ancho y rail al inicio como hijos directos; reparto exacto de Compose | Una plantilla de columnas por estado (seis), con los nombres de los cinco paneles en cada una |
| Flex (`flex: 0 1 22.5rem` y `1 1 …`) | Lo que sugería la investigación | La barra abajo a todo el ancho necesita otro elemento envolviendo los paneles (una parte más, o separar hijos por tipo); con `flex: 1 1 0` en el principal, el ejemplo de 1200 da 412 + 412 + 328 en lugar de tres de 384 |
| La app ubica la suite (como en ADR-0029) | Sin acoplar el scaffold a la suite | Es justo lo que ADR-0029 dejó para este ítem; cada app repetiría las media queries |

### Ocultos y montados

Los paneles que no se ven quedan **montados** (estado de React intacto) y ocultos con
`visibility: hidden`, opacidad 0 y `pointer-events: none`, superpuestos a un panel visible (cada
plantilla nombra las líneas de los cinco paneles, para que un panel oculto no cree columnas
implícitas). No con `display: none`: la sonda mostró que WebKit pierde lo desplazado de un panel oculto
cuyo contenido usa container queries (la `List`), y en un teléfono volver del detalle dejaba la lista
arriba de todo; Chrome y Firefox lo conservaban. Con `visibility` el panel sigue maquetado y conserva lo
desplazado en los tres, queda fuera del árbol de accesibilidad y del foco. La opacidad y
`pointer-events` cubren a los hijos que se vuelven visibles solos (el SMIL del `LoadingIndicator` anima
`visibility` y le gana a la cascada).

### Superficie, márgenes y barra del panel

- **Compacta (< 600):** sin superficie ni márgenes: los paneles van pegados a los bordes, sobre Surface
  (los ejemplos de teléfono del kit).
- **Desde 600:** márgenes del kit (24 arriba y al inicio, 24 entre paneles, 16 al final; al inicio 0
  junto a un rail) y **todos los paneles con superficie salvo la lista**: Surface Container Lowest, radio
  28 solo arriba (las esquinas de abajo quedan fuera de lo visible en el kit). La lista va sobre el fondo
  (Messaging-Web) también cuando está sola en una ventana mediana, para que no cambie de aspecto al
  pasar de uno a dos paneles. `surface` en el `Pane` cambia el valor por defecto. Se eligió el corte de
  600 (y no "junto a un rail") porque es el mismo en que la ventana deja de ser de teléfono y no depende
  de si la app usa navegación.
- Un `TopAppBar` dentro de un panel con superficie toma el color del panel en reposo (el scaffold fija
  la variable interna `--_top-app-bar-flat` de la barra); desplazado, Surface Container.
- **Alto contraste:** los paneles con superficie llevan un contorno CanvasText.

### Desplazamiento por panel

Cada `Pane` es un contenedor con `overflow: auto`: un `TopAppBar` como primer hijo se pega y colapsa
dentro de su panel (ADR-0024); la prueba lo mide (la barra de la lista se queda arriba y se tiñe; la
del detalle sigue plana; la página no se desplaza).

### NavigationSuite como hija

El scaffold ubica una `NavigationSuite` hija con las mismas media queries que la suite: el rail en la
columna de inicio, a todo el alto (los paneles se pegan a él); la barra en la fila de abajo a todo el
ancho (encima del sheet standard). `layout="bar"`/`"rail"` se respetan. Con la barra en una ventana
ancha y baja (teléfono acostado, 900 × 400) se ven dos paneles, como en Compose, que reparte por ancho.

### Zonas seguras

Regla: **las toma quien toca el borde, una sola vez.** Las cuatro `env(safe-area-inset-*)` se leen en
variables de la raíz del scaffold y se aplican:

- arriba: fuera de los paneles (se suman a los 24 desde 600). Así el `TopAppBar` de un panel queda
  debajo de la muesca sin cambiar el `TopAppBar` (que no aplica zonas seguras): la franja de la muesca es
  el fondo Surface, igual que la barra en reposo; desplazada, la barra cambia de color y la franja no (en
  Compose la barra se extiende bajo la barra de estado). Se aceptó para no tocar las alturas y rangos de
  colapso de la barra.
- a los costados: en los márgenes de inicio y fin (según la dirección), salvo el de inicio junto a un
  rail, que ya toma el suyo (`NavigationSuite`, ADR-0029).
- abajo: como relleno **dentro** del panel (llega al borde y lo último se puede desplazar por encima de
  la zona), salvo sobre la barra de navegación, que ya la toma.
- El sheet standard usa la del scaffold (0 sobre la barra) o la del sistema fuera de él.

Las pruebas simulan una muesca reemplazando esas variables y miden cada caso (también con rail, barra y
RTL); que leen `env()` se comprueba en la hoja.

### Bottom sheet standard

`BottomSheet modal={false}` (como `SideSheet modal={false}`): el de `BottomSheetScaffold` de Compose,
cliente, un `<aside>` (región complementaria) sin `<dialog>`, scrim ni foco atrapado. Se hizo completo en
este ítem.

- Asomo de 56 (`--mk-bottom-sheet-peek-height`, más la zona segura de abajo), ancho máximo 640 centrado,
  radio 28 arriba, Surface Container Low, asa de 32 × 4, **elevación 3 del kit** (Compose: Level 1;
  conflicto ya anotado, gana el kit por ADR-0004).
- Estados `partial` (asomado, el inicial) y `expanded` (alto de su contenido, sin pasar el área), con
  `state`/`defaultState`/`onStateChange` como el modal. Oculto solo si la app pasa `onClose` (Compose:
  `skipHiddenState = true` por defecto): arrastrar hacia abajo desde el asomo lo pide y la app pasa
  `open={false}`; oculto queda `inert` e invisible al terminar de salir.
- Como hijo de `PaneScaffold` se ubica contra el borde de abajo del área de los paneles (fuera del rail,
  arriba de la barra) y los paneles reciben abajo un relleno igual al asomo; fuera de un scaffold, contra
  el borde de abajo de su ancestro posicionado.
- Arrastre reutilizado: la misma lógica de puntero que el modal (umbral de 8 px, gesto vertical,
  desplazamiento anidado decidido al empezar, `touchmove` no pasivo) y `computeTarget`/`VelocityTracker`
  de `src/internal/anchored-drag.ts`, con las anclas expandido, asomado y (con `onClose`) oculto. El alto
  del asomo se lee de una propiedad registrada (`@property --_bottom-sheet-peek`, `<length>`), que ya
  calcula la zona segura en px.
- Teclado: el asa es el `BottomSheetHandle` de siempre (un `<button>` cuyo nombre dice la acción,
  "Expand"/"Collapse", textos de `bottomSheetStrings`), que alterna asomado y expandido; el foco con Tab
  en algo que el asomo deja fuera de la vista lo expande (`reason: 'focus'`). Sin Escape: no es modal y
  no hay nada que cerrar con el teclado; ocultarlo, si la app lo permite, necesita su propio botón.
- Movimiento: entre estados con DefaultSpatial (0 con movimiento reducido: salta), ocultar con
  FastEffects; con movimiento reducido, ocultar y mostrar son un fundido en el lugar.
- `BottomSheetProps` pasa a ser la unión de `BottomSheetModalProps` y `BottomSheetStandardProps` (como
  `SideSheetProps`); el contexto de las partes se movió a `bottom-sheet-context.ts` para compartirlo.

### SideSheet standard como panel de apoyo

Se evaluó y **no se usa como panel**: `SideSheet modal={false}` es contenido que la persona abre y
cierra (tiene `open`, cerrar y un divisor del lado del contenido), con ancho fijo de 320 y sin
adaptación a la ventana; el panel de apoyo lo decide la ventana y tiene la superficie y los márgenes de
los paneles. Meter un side sheet dentro de un `Pane` duplicaría superficies. Siguen siendo patrones
distintos: el side sheet standard va dentro de un panel (o fuera del scaffold) cuando hace falta algo
que se abre a pedido. No se cambió.

### Fuera de este ítem

Historial y atrás predictivo, `Reflow` (debajo), `Levitate` (flotando), ocultar con animación al cambiar
de panel, el divisor arrastrable (`PaneExpansionState`), los dos paneles apilados en alto expanded y la
variante densa de dos paneles en medium.

## Consecuencias

- El scaffold depende de la clase y los atributos de `NavigationSuite` (`data-layout`), de la variable
  interna `--_top-app-bar-flat` del `TopAppBar` y de la clase del sheet standard; las pruebas de
  `PaneScaffold.test.tsx` fallan si se separan.
- Las media queries de la suite están escritas dos veces (en la suite y en el scaffold), como sus juegos
  de variables (ADR-0029).
- `BottomSheetProps` es una unión: quien hacía `Omit<BottomSheetProps, …>` debe usar
  `BottomSheetModalProps` (le pasó a la prueba del modal).
- Los paneles ocultos siguen maquetados: con mucho contenido, cuestan como visibles. Si un caso real lo
  sufre, `content-visibility` en el contenido (no en el panel: en Chrome perdía lo desplazado).
- El cambio de panel no se anima.

## Revisar si

- WebKit conserva lo desplazado de un `display: none` con container queries adentro (entonces, volver a
  `display: none` y quitar las líneas duplicadas de las plantillas);
- una app necesita historial, atrás predictivo, `Reflow`/`Levitate` o el divisor arrastrable;
- el `TopAppBar` aprende a extender su color bajo la zona segura de arriba (entonces, la zona de arriba
  pasa a la barra del panel);
- container style queries llegan a Firefox (quitarían la duplicación de media queries con la suite);
- o un uso real pide la superficie de la lista, o paneles sin superficie, con otra regla que el corte de
  600.
