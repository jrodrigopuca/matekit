# ADR-0029: NavigationSuite universal con una sola estructura que cambia de presentación con media queries (regla de Compose, sin rail expandido automático), y `ModalNavigationRail` sobre la base modal común

- Status: accepted (2026-11-27)
- Complementa: [ADR-0002](0002-api-por-composicion-con-capas-atomicas.md) (partes con nombres
  planos), [ADR-0003](0003-componentes-universales-e-interactivos.md) (qué es cliente),
  [ADR-0010](0010-enlaces-y-enrutadores-con-render.md) y
  [ADR-0020](0020-interactive-primitiva-publica.md) (destinos como enlace, botón o `render`),
  [ADR-0016](0016-escala-de-espaciado-y-cortes-de-ventana.md) (cortes de ventana escritos en rem),
  [ADR-0025](0025-sheets-sobre-dialog-base-modal-comun-arrastre-con-puntero-y-desplazamiento-anidado.md)
  (`useModalDialog`, que anunciaba esta variante) y
  [ADR-0028](0028-diagnosticos-con-formato-unico-codigos-estables-y-catalogo.md) (textos por defecto
  en inglés).
- Drivers:
  - Ítem 23 del plan: un componente que elige entre barra y rail según la ventana, sin cambiar
    `NavigationBar` ni `NavigationRail` (decidido con el autor el 2026-11-25: quien quiera elegir a
    mano los sigue usando); los destinos se escriben una vez; elección forzada opcional; sin
    JavaScript si se puede. Y la variante modal del rail, que reemplaza en el playground al Dialog
    que hacía de menú de páginas.
  - Compose, `androidx/androidx` en `androidx-main`:
    `compose/material3/material3-adaptive-navigation-suite/src/commonMain/kotlin/androidx/compose/material3/adaptive/navigationsuite/NavigationSuiteScaffold.kt`
    (commit `85f242ae80`, 2026-11-05): `NavigationSuiteScaffoldDefaults.navigationSuiteType`;
    `compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/WideNavigationRail.kt`
    (`de12189a63`, 2026-11-11): `ModalWideNavigationRail`, `WideNavigationRailDefaults`;
    `tokens/NavigationRailExpandedTokens.kt` y `NavigationRailCollapsedTokens.kt` (v41.1.19,
    `76990c62ac`); `samples/.../NavigationRailSamples.kt` (`a2bc0e4eae`); textos en
    `material3/src/androidMain/res/values/strings.xml`. Datos y diferencias en
    `docs/research/07-jetpack-compose.md` § NavigationRail.
  - El kit no trae el rail modal (solo `Navigation Rail` y `Navigation Rail: Expanded`).
  - Sonda del 2026-11-27 en Chrome, Firefox y WebKit (las pruebas de paridad de
    `NavigationSuite.test.tsx`, corridas antes de decidir): ver "Por qué una sola estructura".

## Decisión

### NavigationSuite: una sola estructura y media queries

`NavigationSuite` es universal (sin `'use client'`): un `<nav class="mk-navigation-suite">` con
`NavigationSuiteHeader`, `NavigationSuiteItem`, `NavigationSuiteItemIcon` y
`NavigationSuiteItemLabel`. El destino es el de la `NavigationBar` (la base compartida
`navigationItem` con la clase `mk-navigation-bar-item`, más `mk-navigation-suite-item`), y el CSS
cambia de presentación con media queries:

- El destino del rail contraído **es** el destino vertical de la barra en una columna de 96 (el kit
  lo dice: "igual que el elemento vertical de la barra"; con 96 de ancho, las columnas `1fr` de la
  barra miden 20, el relleno del rail). Así la suite reutiliza todo el CSS del destino de la barra
  (colores, átomos, indicador, insignia, alto contraste) y solo cambia el contenedor (fila abajo o
  columna al inicio) y, en la barra de una ventana baja, la disposición horizontal del destino.
- Cada presentación es un juego de variables `--_…` que el contenedor fija y leen él y sus destinos;
  sin variables, es el rail. CSS no puede unir una media query con un selector de atributo, así que
  los juegos de la barra se escriben dos veces (para `auto` dentro de la media query y para `bar`
  sin ella). Las pruebas comparan las dos copias con la barra real.
- El bloque superior (`NavigationSuiteHeader`, la clase de `NavigationRailHeader`) solo se ve en el
  rail, como `primaryActionContent` en Compose.

**Por qué una sola estructura** (y no las otras dos opciones):

| Opción | A favor | En contra |
|---|---|---|
| **Una estructura, CSS por media query** (elegida) | Universal; el HTML del servidor ya es correcto (sin salto al hidratar); un solo `<nav>` para `ref`, props e `id` de los destinos; el CSS del destino es el de la barra | Duplica dos juegos de variables; acopla la suite al CSS de la barra (lo vigilan las pruebas de paridad) |
| Las dos estructuras (una `NavigationBar` y un `NavigationRail`) y ocultar una con `display: none` | Sin CSS propio; el rail podría expandirse | Destinos duplicados en el DOM (un `id` propio se repite, cada `ref` de un destino apunta a dos elementos, efectos de hijos como un `Tooltip` montados dos veces); `ref` y props del contenedor sin un elemento claro |
| Elegir en el cliente (`matchMedia`) | Un solo DOM con los componentes reales | Cliente; en el servidor no se sabe la ventana: o salto al hidratar o un primer render "neutro" que también salta; el CSS lo resuelve sin eso |

La sonda (las pruebas de paridad, en los tres motores) comprobó que la estructura única mide como
`NavigationBar` vertical, `NavigationBar` horizontal y `NavigationRail` contraído (con bloque
superior) a 0,05 px; que `page.viewport` cambia la presentación sin volver a renderizar; que el HTML
de `renderToString` ya muestra la barra antes de hidratar y `hydrateRoot` no cambia nada ni avisa;
y que al cruzar un corte no se anima la disposición (solo el color de las etiquetas). Única
diferencia entre motores: la etiqueta del rail se centra con `translate(−50 %)` y WebKit la
redondea 0,08 px.

### Regla de elección

`layout="auto"` (por defecto) sigue a Compose (`navigationSuiteType`, verificado en el código):
ancho compact (< 600) → barra con destinos verticales; si no, alto compact (< 480; Compose suma el
modo mesa, que la web no tiene) → barra con destinos horizontales, **con cualquier ancho** desde 600
(no solo el medium); si no → rail contraído. `layout="bar"` fija la barra (destinos verticales bajo
600 de ancho, horizontales desde 600) y `layout="rail"` el rail contraído.

**Desde 1200 (`WINDOW_WIDTH.large`) no se expande el rail.** Compose nunca elige solo
`WideNavigationRailExpanded` (y su default usa la clase de ventana V1, que ni siquiera distingue
large); expandir es una decisión del usuario (el botón de menú) y un rail de 220 fijo le quita al
contenido el ancho que el scaffold de paneles (ítem 24) quiere para el tercer panel desde 1200. La
suite tampoco tiene `expanded`: quien quiera el rail expandido en el lugar usa `NavigationRail`, y
para expandir sobre el contenido está el rail modal.

### ModalNavigationRail

Componente cliente aparte (no una prop de `NavigationRail`, que sigue universal) con
`open`/`onClose`/`closeOnScrimClick` como el Dialog, sobre `useModalDialog` (foco atrapado, página
inerte, Escape y scrim, Tab que da la vuelta, salida con `settleAnimations`, foco devuelto), sin
copiar el ciclo modal. Es el `ModalWideNavigationRail` de Compose con `hideOnCollapse = true`: un
`<dialog>` de alto completo contra el borde de inicio (en RTL, el derecho) que entra y sale
deslizándose con el resorte DefaultSpatial (scrim con DefaultEffects); con movimiento reducido, un
fundido. Adentro, un `<nav>` con las partes del rail expandido (`NavigationRailHeader`,
`NavigationRailItem`…), así que comparte destino (`navigation-item.tsx`), `aria-current`, enlaces y
`render`. `surface-container`, radio 16 en las cuatro esquinas (`ModalContainerShape =
CornerLarge`), sin sombra (el Surface del modal no usa `ModalContainerElevation`), ancho del rail
expandido (220, `--mk-navigation-rail-expanded-width` hasta 360) sin pasar de la ventana menos 48,
zonas seguras arriba, abajo y del lado del borde.

- **Cierre al elegir:** `closeOnSelect`, por defecto `true`. En Compose el componente no cierra solo
  (el ejemplo de `hideOnCollapse` lo pide en el `onClick` del destino), pero en la web elegir un
  destino casi siempre es navegar y el rail tiene que dejar ver la página nueva; no depende de
  `defaultPrevented` (el `Link` de un enrutador lo llama) y no cuenta los clics que abren otra
  pestaña ni los destinos con `aria-disabled`. `closeOnSelect={false}` deja el cierre a la app.
- **Foco inicial:** el destino actual (`aria-current`); `data-autofocus` le gana.
- **`ModalNavigationRailClose`:** el icon button cuadrado de 56 del bloque superior con `menu_open`
  (espejado en RTL). Textos por defecto de Compose: diálogo "Navigation rail"
  (`label`), botón "Close rail" (`closeLabel`), en `NavigationRail/strings.ts`.
- **El rail modal no viene de fábrica en NavigationSuite:** la suite es universal y el modal
  necesita estado; la app pone su botón de menú en `NavigationSuiteHeader` y su `ModalNavigationRail`
  con los mismos destinos (datos que se dibujan dos veces, receta en `#navigation-suite`).
- Sin arrastre para cerrar (Compose lo tiene con `hideOnCollapse`): queda como mejora, con
  `computeTarget` y `VelocityTracker` de `BottomSheet/sheet-drag.ts` en el eje horizontal.

### Playground

El menú de páginas en pantallas chicas pasa del Dialog centrado al `ModalNavigationRail`. Los grupos
y el filtro se conservan como contenido de la app dentro del rail (el filtro en el bloque superior;
por grupo, un `role="group"` con su encabezado y `NavigationRailItem` sin icono), sin agrandar el
componente. URLs (`#id`) y foco (a la página actual al abrir, al botón al cerrar) iguales.

## Consecuencias

- La suite depende del CSS del destino de la barra y del bloque superior del rail: un cambio ahí
  cambia la suite. Las pruebas de paridad (barra vertical, horizontal en `auto` y en `bar`, rail)
  fallan si se separan.
- La app ubica la suite (abajo o al inicio) con las mismas media queries, escritas en rem; lo va a
  resolver el scaffold de paneles (ítem 24).
- Sin `align="middle"`, `collapsedLabels` ni rail expandido en la suite: si hacen falta, se suman
  como variables del juego del rail.
- Revisar si: Firefox y los demás motores sostienen container style queries (`@container style()`),
  que quitarían la duplicación de los juegos de la barra; o si una app necesita la suite expandida
  desde 1200 (entonces, un `layout="rail-expanded"` con el CSS del destino del rail).

## Actualización (2026-11-27)

- **Radio solo del lado del contenido** (aprobado por el autor): las esquinas pegadas al borde de
  inicio van en 0 y las del contenido en 16, con esquinas lógicas (en RTL se invierten). Se aparta de
  Compose (`CornerLarge` en las cuatro) porque el rail toca el borde arriba, abajo y al inicio, y con
  radio ahí asomaba el scrim; así queda igual que el SideSheet modal. Anotado en
  `07-jetpack-compose.md`.
- **Arrastrar para cerrar** (aprobado por el autor), como `ModalWideNavigationRail` con
  `hideOnCollapse`: el gesto pasa al rail solo si, pasados 8 px, es horizontal y hacia el borde de
  inicio (uno vertical desplaza los destinos; con mouse, uno hacia el contenido sigue seleccionando
  texto, y en un campo de texto nunca arrastra). Sigue al puntero y al soltar decide con
  `computeTarget` y los umbrales de Compose para el rail: la mitad del ancho
  (`positionalThreshold = distance * 0.5`) o 125 px/s (`AnchoredDraggableMinFlingVelocity`). Cerrar
  se pide a `onClose`; si el padre no cierra, vuelve. La lógica del BottomSheet pasó a
  `src/internal/anchored-drag.ts` (`sheet-drag.ts` la reexporta; el BottomSheet no cambió). Táctil:
  `touch-action: pan-y pinch-zoom` en el diálogo deja el gesto horizontal a los eventos de puntero
  y el vertical al navegador, sin `touchmove` no pasivo (comprobado con toques reales por CDP en
  Chrome contra el playground). Con movimiento reducido, el rail sigue al dedo; al soltar vuelve
  en el acto o se funde donde quedó (`data-released`). Después de un arrastre con mouse, el clic
  que sigue no elige el destino, y se cancela el arrastre nativo del enlace (`dragstart`).
- **Aviso de destinos de más** (aprobado por el autor; diagnóstico del ADR-0028,
  `MK_NAVIGATION_TOO_MANY_DESTINATIONS`): en desarrollo y una vez por componente, `NavigationBar` con
  más de 5, `NavigationSuite` con más de 5 (puede ser una barra; con `layout="rail"`, más de 7) y
  `NavigationRail` contraído con más de 7 (guías de Material: 3 a 5 y 3 a 7); el rail expandido y el
  modal no avisan (se desplazan). El mensaje propone menos destinos, un `ModalNavigationRail` o un
  `Menu`, y los detalles traen `count` y `max`. Solo por arriba: con menos de 3 Material sugiere
  pestañas, pero uno o dos destinos funcionan y no hay arreglo dentro del componente. Se cuenta en el
  render sobre los hijos de React (`src/internal/navigation-count.ts`: directos, arrays, fragmentos y
  envueltos de a uno, como en un `Tooltip`) para no pasar los componentes a cliente; no ve los
  destinos que dibuja otro componente, límite anotado en el JSDoc y en `docs/diagnostics.md`.
