# Disposición adaptable en Jetpack Compose

Revisión del 2026-11-25 para diseñar el ítem 13 del plan (escala de espaciado, `Stack` y
`Group`) y preparar el uso de List (ítem 14) en paneles de lista y detalle. Se leyó el código
de `androidx/androidx`, rama `androidx-main`, commit `03c09d6718` (2026-11-26 00:05 UTC), con
`gh api`. Versiones en ese commit (`libraryversions.toml`): Compose 1.14.0-alpha02, Material 3
1.6.0-alpha02, Material 3 Adaptive 1.4.0-alpha03, WindowManager 1.6.0-alpha05.

Archivos leídos (último commit que los tocó):

| Archivo | Commit |
|---|---|
| `window/window-core/src/commonMain/kotlin/androidx/window/core/layout/WindowSizeClass.kt` | `5c7b947a5b`, 2025-07-08 |
| `…/window/core/layout/WindowSizeClassSelectors.kt` y `WindowWidthSizeClass.kt` (obsoleta) | |
| `compose/material3/adaptive/adaptive/src/commonMain/…/adaptive/WindowAdaptiveInfo.kt` y `WindowSizeClassHelper.kt` | `080d2b3e53`, 2026-07-24 |
| `compose/material3/adaptive/adaptive-layout/src/commonMain/…/layout/PaneScaffoldDirective.kt` | `61b015c30d`, 2026-07-29 |
| `…/layout/ThreePaneScaffold.kt` | `7ac433e44e`, 2026-09-02 |
| `…/layout/ThreePaneScaffoldValue.kt` | `0e6d66048a`, 2026-08-27 |
| `…/layout/ListDetailPaneScaffold.kt`, `SupportingPaneScaffold.kt`, `AdaptStrategy.kt`, `PaneMargins.kt`, `PaneExpansionState.kt` | `080d2b3e53`, 2026-07-24 |
| `compose/material3/adaptive/adaptive-navigation/src/commonMain/…/ThreePaneScaffoldNavigator.kt` | |
| `compose/material3/material3-adaptive-navigation-suite/src/commonMain/…/NavigationSuiteScaffold.kt` | `85f242ae80`, 2026-11-05 |
| `compose/material3/material3/src/commonMain/…/material3/tokens/MeasurementTokens.kt`, `ListTokens.kt`, `DragHandleTokens.kt` | `76990c62ac`, 2026-11-24 ("Update Material 3 tokens to v41.1.19") |
| `…/material3/ListItemDefaults.kt` | `d70f2bdb44`, 2026-11-19 |
| `compose/foundation/foundation-layout/src/commonMain/…/layout/Arrangement.kt`, `Row.kt`, `FlowLayout.kt` | `080d2b3e53` y `9be47ff959` (2026-10-15) |
| `…/layout/FlexBox.kt` y `Grid.kt` | `586ad22444` (2026-09-30) y `e9a0161e58` (2026-10-08) |

Carpetas que existen y no hacían falta: `adaptive-navigation3` (escenas de Navigation 3 sobre
los mismos scaffolds) y `material3-window-size-class` (la API vieja de clases de tamaño, con
`WindowWidthSizeClass` marcada `@Deprecated`).

La guía de Material 3 (m3.material.io/foundations/layout) **no se pudo leer**: las páginas de
window size classes dan 404 a un lector automático y la de spacing solo devuelve el título,
como ya dice el [README](README.md#fuentes). Lo que se cita de la guía viene de la página de
Android Developers "Use window size classes"
(developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes), que sí se
leyó, o va marcado como "de memoria".

Una nota de unidades: Compose mide en dp; en web se toma 1 dp = 1 px CSS, y matekit escribe
los umbrales en rem (como `card.css`: 37,5rem = 600 px).

## 1. Clases de tamaño de ventana

Cortes (constantes de `WindowSizeClass.kt`):

| Clase | Ancho | Alto |
|---|---|---|
| Compact | < 600 | < 480 |
| Medium | 600 a 839 (`WIDTH_DP_MEDIUM_LOWER_BOUND = 600`) | 480 a 899 (`HEIGHT_DP_MEDIUM_LOWER_BOUND = 480`) |
| Expanded | 840 a 1199 (`WIDTH_DP_EXPANDED_LOWER_BOUND = 840`) | ≥ 900 (`HEIGHT_DP_EXPANDED_LOWER_BOUND = 900`) |
| Large | 1200 a 1599 (`WIDTH_DP_LARGE_LOWER_BOUND = 1200`) | no existe |
| Extra-large | ≥ 1600 (`WIDTH_DP_EXTRA_LARGE_LOWER_BOUND = 1600`) | no existe |

En rem (16 px): 37,5 / 52,5 / 75 / 100 para el ancho y 30 / 56,25 para el alto.

Cómo se calculan:

- Una `WindowSizeClass` no es un enum: es un par `(minWidthDp, minHeightDp)`, el límite inferior
  del cubo. Se pregunta con `isWidthAtLeastBreakpoint(600)` y similares, "de mayor a menor"
  (el comentario del código lo exige). Es un "al menos", como `@media (width >= 600px)`.
- Hay dos conjuntos: `BREAKPOINTS_V1` (solo compact, medium y expanded) y `BREAKPOINTS_V2`
  (suma large y extra-large en ancho; el alto no cambia). `computeWindowSizeClass(width, height)`
  elige primero el mayor ancho que entra y después el mayor alto; existe la variante
  `computeWindowSizeClassPreferHeight`.
- En Compose, `currentWindowAdaptiveInfoV2()` (`WindowAdaptiveInfo.kt`) toma
  `LocalWindowInfo.current.containerSize`, es decir **el tamaño de la ventana**, no el del
  componente, y devuelve la clase (V2) junto con la postura del dispositivo (`Posture`:
  bisagras, modo mesa). `currentWindowAdaptiveInfo()` sin V2 está obsoleta (no devuelve large
  ni extra-large).
- Android Developers agrega la referencia de dispositivos: compact es el 99,96 % de los
  teléfonos en vertical; medium, tabletas en vertical y plegables abiertos; expanded, tabletas
  en horizontal; large, tabletas grandes; extra-large, escritorio. Insiste en que la clase es de
  la ventana disponible (pantalla dividida, ventanas de escritorio), no del dispositivo, y que
  "la mayoría de las apps solo necesita la clase de ancho"; el alto importa en teléfonos en
  horizontal (ancho medium, alto compact: dos paneles no sirven).

Qué cambia en cada una, según el código de los scaffolds:

| Ancho | Paneles lado a lado | Separación entre paneles | Ancho preferido de un panel | Navegación sugerida |
|---|---|---|---|---|
| Compact | 1 | 0 | 360 | barra inferior (`ShortNavigationBar`, destinos verticales) |
| Medium | 1 (2 en la variante densa) | 0 (24 en la densa) | 360 | rail contraído (`WideNavigationRail`); barra con destinos horizontales si el alto es compact |
| Expanded | 2 | 24 | 360 | rail contraído |
| Large y extra-large | 3 | 24 | 412 | rail contraído |

Y en alto: con un solo panel horizontal y alto expanded (≥ 900), o en modo mesa, el scaffold
permite **dos paneles apilados** (24 de separación). Las cifras salen de las secciones 2 y 3.

## 2. Paneles y scaffolds

### Directiva: `calculatePaneScaffoldDirective`

`PaneScaffoldDirective` es el "qué permite la ventana". Lo calcula
`calculatePaneScaffoldDirective(windowAdaptiveInfo)` (`PaneScaffoldDirective.kt`) a partir de
la clase de ancho:

```kotlin
Compact  -> maxHorizontalPartitions = 1, horizontalPartitionSpacerSize = 0.dp,  preferido 360.dp
Medium   -> maxHorizontalPartitions = 1, horizontalPartitionSpacerSize = 0.dp,  preferido 360.dp
Expanded -> maxHorizontalPartitions = 2, horizontalPartitionSpacerSize = 24.dp, preferido 360.dp
else     -> maxHorizontalPartitions = 3, horizontalPartitionSpacerSize = 24.dp, preferido 412.dp
```

- `DefaultPreferredWidth = 360.dp`, `DefaultPreferredWidthXL = 412.dp` (large y extra-large),
  `DefaultPreferredHeight = 420.dp`.
- Vertical: `maxVerticalPartitions = 2` y `verticalPartitionSpacerSize = 24.dp` si la postura
  es de mesa o si hay un solo panel horizontal con alto expanded; si no, 1 y 0.
- `calculatePaneScaffoldDirectiveWithTwoPanesOnMediumWidth` es la variante "densa": dos paneles
  y 24 de separación también en medium. El comentario avisa que puede quedar "demasiado
  apretado".
- `excludedBounds`: zonas a evitar (bisagras), según una `HingePolicy`.
- La directiva es una clase de datos con `copy(...)`: la app puede partir de la de Material y
  cambiar un valor.

### Cómo decide qué panel se ve: `calculateThreePaneScaffoldValue`

Los dos scaffolds son el mismo `ThreePaneScaffold` con tres roles (`Primary`, `Secondary`,
`Tertiary`) y un orden horizontal distinto:

| Scaffold | Primary (prioridad 10) | Secondary (5) | Tertiary (1) | Orden de inicio a fin |
|---|---|---|---|---|
| `ListDetailPaneScaffold` | Detail | List | Extra | List, Detail, Extra |
| `SupportingPaneScaffold` | Main | Supporting | Extra | Main, Supporting, Extra |

El algoritmo (`ThreePaneScaffoldValue.kt`):

1. Recorre los paneles por prioridad: primero el historial de destinos, del último al primero
   (el destino actual gana), y después Primary, Secondary y Tertiary.
2. Mientras queden particiones (`maxHorizontalPartitions`), cada panel pasa a `Expanded`.
3. Los que no entran se resuelven con su `AdaptStrategy`; sin estrategia especial, `Hidden`.

El navegador (`rememberListDetailPaneScaffoldNavigator`) arranca con el historial "solo el
panel de lista". Resultado: en compact y medium se ve la lista; al elegir un elemento, la app
navega al detalle y **la lista se oculta**; Atrás vuelve. En expanded se ven lista y detalle
(el detalle entra por prioridad aunque no haya destino); en large, también el extra.

`AdaptStrategy` (`AdaptStrategy.kt`):

- `Hide`: el valor por defecto de todos los paneles en list-detail.
- `Reflow(reflowUnder)`: con un solo panel horizontal y dos verticales permitidos, el panel se
  pone **debajo** de otro en vez de ocultarse. Es el valor por defecto del panel Supporting en
  `SupportingPaneScaffold` (`Reflow(Main)`). Nunca se aplica si hay más de una partición
  horizontal.
- `Levitate(alignment, scrim, dragToResizeState)`: si el panel es el destino actual, flota
  sobre los demás como un diálogo o una hoja, con fondo opcional (`LevitatedPaneScrim`). Hay
  `onlyIfSinglePane(directive)` para levitar solo en pantallas de un panel.

### Cómo reparte el ancho

`measureAndPlacePartitionsInBounds` (`ThreePaneScaffold.kt`):

- Ancho disponible = ancho **del scaffold** (sus restricciones, no la ventana) menos
  `(paneles - 1) × 24`.
- Cada panel parte de su ancho preferido (`Modifier.preferredWidth(…)` en dp o en proporción;
  si no tiene, el de la directiva: 360 o 412).
- Si sobra espacio, **todo el sobrante va al panel de mayor prioridad** (Detail o Main).
- Si falta, todos se achican en proporción.
- Ejemplo: ventana de 840 sin márgenes, dos paneles: 840 − 24 = 816; lista 360, detalle
  360 + 96 = 456. Con 1200 y tres paneles: 1200 − 48 = 1152 < 3 × 412, y quedan los tres en 384.
- Los paneles apilados (reflow) toman su alto preferido (420), y el de arriba conserva al menos
  la mitad.
- Ancho mínimo de un panel que se redimensiona: `MinPaneWidth = 48.dp`.

En web es casi literal: el panel secundario con `flex: 0 1 22.5rem` (360) y el principal con
`flex: 1 1 0`.

### Márgenes

El scaffold **no trae márgenes exteriores en dp**. `PaneMargins` (`PaneMargins.kt`) es una
interfaz: `Unspecified` por defecto (el panel toca el borde) o `Modifier.paneMargins(fixedMargins,
insets)`, que toma el mayor entre un margen fijo que pasa la app y los insets del sistema
(barras, recortes). La separación interna es la de la directiva (24), y el código documenta que
equivale a los márgenes izquierdo y derecho de cada partición.

De memoria (guía de Material 3 sobre layout, no verificado porque m3.material.io no se pudo
leer): márgenes de 16 en compact y 24 desde medium, y separación entre paneles (spacer) de 24.
El 24 de la separación coincide con el código; los márgenes no aparecen en ninguna constante de
Compose.

### Arrastre del divisor

- `PaneExpansionState` (`PaneExpansionState.kt`): con exactamente dos paneles expandidos, la
  división puede fijarse por ancho (`firstPaneWidth`), por proporción (`setFirstPaneProportion`)
  o arrastrando. Tiene anclas (`PaneExpansionAnchor.Proportion(0.5f)`,
  `Offset.fromStart(150.dp)`, `Offset.fromEnd(…)`) a las que se acomoda con un resorte al
  soltar, según la velocidad. Arrastrar hasta el borde (a menos de media separación) deja un
  solo panel a todo el ancho.
- El estado se guarda por par de paneles (`PaneExpansionStateKey`): la división de lista y
  detalle no es la de detalle y extra.
- No hay divisor visible por defecto: la app pone un `VerticalDragHandle` (Material 3,
  `DragHandle.kt`). Tokens (`DragHandleTokens.kt`): 4 × 48 en reposo, 12 × 52 presionado o
  arrastrado, área de 24 de ancho, color `outline` (presionado `on-surface`), forma completa
  (presionado `CornerMedium`), sin sombra.
- Un panel levitado también puede redimensionarse (`DragToResizeState`).

Todo esto es `@ExperimentalMaterial3AdaptiveApi`: la API cambia entre versiones.

## 3. Navegación adaptable: `NavigationSuiteScaffold`

`NavigationSuiteScaffold` recibe los destinos una sola vez y los dibuja con el componente que
corresponde. La elección es `NavigationSuiteScaffoldDefaults.navigationSuiteType(adaptiveInfo)`:

```kotlin
if (ancho == Compact)                    ShortNavigationBarCompact   // barra, destinos verticales
else if (modo mesa || alto == Compact)   ShortNavigationBarMedium    // barra, destinos horizontales
else                                     WideNavigationRailCollapsed // rail contraído
```

- **Nunca elige sola el rail expandido ni el drawer.** `WideNavigationRailExpanded` existe pero
  lo pide la app (por ejemplo con el botón de menú del rail). `NavigationDrawer` (drawer
  permanente), `NavigationBar` y `NavigationRail` son los tipos viejos, con comentarios que
  recomiendan los nuevos; la función vieja `calculateFromAdaptiveInfo` solo elige entre
  `NavigationBar` y `NavigationRail`.
- La barra va abajo y el contenido ocupa el resto; el rail va al inicio y el contenido se corre.
  Se puede ocultar con animación (`NavigationSuiteScaffoldState`, resorte 0,9 / 700). Alturas
  internas: barra corta 64, barra alta 80; la acción principal (FAB) va con 16 de relleno, arriba
  de la barra o dentro del rail.
- El default usa `currentWindowAdaptiveInfo()` (V1), así que large y extra-large no cambian
  nada: siguen con el rail contraído.

Relación con matekit: `NavigationBar` ya tiene destinos verticales y horizontales (los dos
`ShortNavigationBar*`) y `NavigationRail` ya tiene contraído (96) y expandido (220 a 360), y
comparten el destino (`src/internal/navigation-item.tsx`). Lo que falta es solo la regla de
cuál mostrar; hoy la decide la aplicación (`NavigationRail.tsx` sugiere `matchMedia`).

## 4. Espaciado

**Compose sí tiene ahora una escala de espaciado**, aunque interna: `MeasurementTokens.kt`
(`internal object`, generado de los tokens de Material 3 v41.1.19, agregado el 2026-11-24 en
`76990c62ac`). El plan dice que "Compose no publica tokens de espaciado"; desde ayer hay que
matizarlo: no es API pública, pero los tokens de componentes ya la referencian (`ListTokens`,
`ChipsTokens`, `Button*Tokens`, `AppBarTokens`, `SearchBarTokens`, `DockedToolbarTokens`, entre
otros).

| Token | dp | Token | dp | Token | dp |
|---|---|---|---|---|---|
| `Space0` | 0 | `Space150` | 12 | `Space450` | 36 |
| `Space25` | 2 | `Space175` | 14 | `Space500` | 40 |
| `Space50` | 4 | `Space200` | 16 | `Space600` | 48 |
| `Space75` | 6 | `Space250` | 20 | `Space700` | 56 |
| `Space100` | 8 | `Space300` | 24 | `Space800` | 64 |
| `Space125` | 10 | `Space400` | 32 | `Space900` | 72 |

El número es "centésimas de 8 dp": `Space100` = 8, `Space25` = 2. No es una retícula de 4
estricta: trae 2, 6, 10 y 14.

Ejemplos de uso en tokens: `ListTokens.SegmentedGap = Space25` (2),
`ListTokens.ItemLeadingSpace` y `ItemTrailingSpace = Space200` (16), `ItemTopSpace` y
`ItemBottomSpace = Space125` (10), `ItemBetweenSpace = Space150` (12);
`ConnectedButtonGroupSmallTokens.BetweenSpace = Space25` (2);
`StandardButtonGroupSmallTokens.BetweenSpace = Space150` (12).

Otras constantes de disposición (no son tokens):

| Valor | Dónde |
|---|---|
| 24 entre paneles (horizontal y vertical) | `PaneScaffoldDirective.kt` |
| 360 / 412 ancho preferido de panel, 420 alto preferido | `PaneScaffoldDirective.kt` |
| 48 ancho y alto mínimo de panel | `ThreePaneScaffoldDefaults.MinPaneWidth` |
| sin margen exterior (`PaneMargins.Unspecified`) | `PaneMargins.kt` |
| 64 y 80 alto de barra, 16 relleno de la acción principal | `NavigationSuiteScaffold.kt` |

Formas de los bloques conectados (para `Group`): la List segmentada usa
`ListItemDefaults.segmentedShapes(index, count)`: el primero recibe las esquinas de arriba de
`ListTokens.ContainerShape` (`CornerLarge`, 16), el último las de abajo, uno solo las cuatro, y
el resto queda con `ItemContainerExpressiveShape` (`CornerExtraSmall`, 4); separación
`SegmentedGap` (2). Al pasar el puntero el elemento va a `CornerMedium` (12) y con foco o
arrastrado a `CornerLarge` (16). Coincide con el kit (2, 16 afuera, 4 adentro). Los grupos de
botones conectados tienen otras esquinas interiores (`InnerCornerCornerSize` Small, 8;
presionado ExtraSmall, 4; seleccionado 50 %) y la misma separación de 2.

## 5. Primitivas de disposición

Compose tiene `Row`, `Column`, `Box`, `FlowRow` y `FlowColumn` desde siempre, y desde
Compose 1.14 (alfa) **`FlexBox` y `Grid`** (`FlexBox.kt`, `Grid.kt`; públicas en
`foundation-layout/api/current.txt`). `FlexBox` se describe como "un superconjunto de Row,
Column, FlowRow y FlowColumn" y copia el modelo de CSS: `direction`, `wrap`, `justifyContent`,
`alignItems`, `alignContent`, `rowGap`, `columnGap`, `gap`, y en los hijos `grow` (0 por
defecto), `shrink` (1), `basis` (`Auto`, dp o porcentaje), `alignSelf` y `order`. `Grid` trae
pistas fijas, `fr`, porcentajes y `Auto`, con ubicación automática. Es decir: Compose terminó
adoptando flexbox y grid de CSS. Para un `Stack` web esto confirma que conviene una capa
delgada sobre flex y no un modelo propio.

Qué trasladar:

| Compose | CSS | Nota |
|---|---|---|
| `Arrangement.spacedBy(8.dp)` | `gap` | Compose permite separación negativa (se superponen); `gap` no. |
| `Arrangement.SpaceBetween`, `SpaceAround`, `SpaceEvenly`, `Center`, `End` | `justify-content` | Igual. |
| `Alignment.CenterVertically` en `Row`, `Alignment.Start` en `Column` | `align-items` | El default de Compose es inicio, no estirar: `align-items: flex-start` en un `Stack` se parece más a Compose; `stretch` es el de CSS y suele servir en columnas. Decisión del ítem 13. |
| `Modifier.weight(1f)` | `flex: 1 1 0` y `min-inline-size: 0` | `weight` reparte lo que sobra después de medir a los demás; `fill = false` es `flex-grow` sin forzar el tamaño. Mejor como clase o estilo del hijo que como prop del `Stack`. |
| `FlowRow` / `FlowColumn` | `flex-wrap: wrap` | `maxItemsInEachRow` y `maxLines` no tienen equivalente directo (grid o `flex-basis` calculado). |
| `FlexBoxConfigScope.constraints` (la config lee el espacio que le da el padre) | container queries | Es la idea de "cambiar de dirección según el espacio disponible", resuelta en la medición, sin la ventana. |
| `start` / `end`, `RowReverse` | propiedades lógicas, `row-reverse` | RTL gratis en los dos. |

Qué no trasladar:

- `Box` como apilado en capas: en web es otra cosa (`display: grid` con `grid-area: 1 / 1`), no
  es un `Stack` de flex. Si hace falta, sería otra pieza.
- `Spacer`: con `gap` sobra; un hijo vacío para separar rompe `:first-child` y la semántica.
- `BoxWithConstraints` y las mediciones intrínsecas: en web se reemplazan con container queries,
  sin JavaScript ni `ResizeObserver`.
- El orden de los modificadores (`padding` antes o después de `background`): en CSS no aplica.

## 6. Qué traer a matekit

### Dónde va cada consulta

- **Media queries (la ventana), solo para la disposición de la página**: cuántos paneles
  (1 bajo 37,5rem, 1 o 2 entre 37,5 y 52,5rem, 2 desde 52,5rem, 3 desde 75rem si hay extra) y
  qué navegación (barra bajo 37,5rem o con alto bajo 30rem; rail desde 37,5rem). Es lo mismo que
  hace Compose: la directiva sale de la ventana.
- **Container queries, para todo componente**: Card (ya lo hace), List, `Stack` y `Group`. La
  razón está en el propio Compose: en una ventana expanded la lista vive en un panel de 360, así
  que sus elementos tienen que comportarse como en un teléfono aunque la ventana sea ancha. Lo
  que decide es el panel, no la ventana. También el reparto de ancho de un scaffold es del
  contenedor (el scaffold mide con sus propias restricciones).
- Detalle de CSS: en `@media` la rem es el tamaño de letra inicial del navegador (no el que fije
  la página) y en `@container` es el de la raíz; en ninguna de las dos **se pueden usar
  variables** en la condición, así que los cortes van escritos (37.5rem,
  52.5rem, 75rem, 100rem; 30rem y 56.25rem en alto). Un elemento tampoco puede consultar su
  propio tamaño: la consulta va contra un ancestro con `container-type`.

### Ítem 13

1. **Escala de espaciado**: tomar los valores de `MeasurementTokens.kt` (los 18, de 0 a 72),
   con la misma numeración (`25` = 2, `100` = 8), como `tokens/space.json` y CSS generado por
   `build-tokens.ts`. Fuente para el ADR: los tokens de Material 3 v41.1.19 vía Compose
   (`76990c62ac`). Reemplaza la escala inventada del plan, que es un subconjunto de esta; la
   escala que acepte la prop `gap` de `Stack` puede ser más chica (por ejemplo 0, 2, 4, 8, 12,
   16, 24, 32, 48). El nombre de la variable queda para el ADR: no se encontró el nombre oficial
   del token de Material (`md.sys.…`), solo el de Compose; si no aparece, mejor `--mk-space-*`
   que inventar un `--md-sys-*`. Regla de `lint:css` posible: `gap`, `padding` y `margin` con
   `var(--…space…)` o 0 en los componentes nuevos.
2. **Cortes de ventana** como datos documentados (no como variables CSS, porque no sirven en
   las condiciones): un `tokens/breakpoints.json` con 600, 840, 1200, 1600 y 480, 900, exportado
   también en TypeScript para quien use `matchMedia`. Sin hook en esta etapa (los componentes son
   universales).
3. **`Stack`**: `display: flex` con `direction`, `gap` en la escala, `wrap`, `align`, `justify`
   y `render` o `as`. El cambio de dirección por espacio, sin container query propia (el
   elemento no puede consultarse a sí mismo y agregar un contenedor sería otro `<div>`): el
   patrón "switcher", `flex-wrap: wrap` y en los hijos
   `flex-basis: calc((var(--mk-stack-switch-at) - 100%) * 999)`, que sí acepta una variable y
   pasa de fila a columna cuando el `Stack` mide menos que el umbral. La alternativa es que el
   `Stack` cambie de dirección con `@container` contra el ancestro más cercano. `weight` como
   clase o estilo del hijo, no como prop.
4. **`Group`**: lo que `segmentedShapes(index, count)` hace con índices, en CSS con
   `:first-child`, `:last-child` y `:only-child`, y con variables que cada componente fija:
   separación (2 por defecto), radio exterior (16 en List) y radio interior (4 en List, 8 en
   grupos de botones), con `border-radius` animable para que los botones agranden su esquina al
   presionar. Horizontal o vertical (las esquinas cambian de eje). Cada hijo debería leer las
   variables, no que `Group` pise su `border-radius` con selectores de hijos.

### Ítems futuros

- **List (14)**: diseñar `ListItem` para que se vea bien a 360 (el ancho del panel) y con
  container queries para los elementos finales; estado de elemento actual (`aria-current`) para
  marcar el que se ve en el detalle cuando hay dos paneles.
- **Scaffold de paneles** (nuevo, Tanda C, después de Top app bar y Sheets): `PaneScaffold` con
  roles `list`, `detail` y `extra` (o `main` y `supporting`), universal y solo CSS. La app indica
  el panel actual (`current="detail"`), y con un solo panel se oculta el resto; con dos o tres,
  el secundario mide 22,5rem (25,75rem desde 75rem), el principal toma lo que sobra, separación
  24 y márgenes 16 / 24 (estos a confirmar en la guía). La cantidad de paneles por media query,
  con la variante densa (dos en medium) como opción. `Reflow` es poner el panel de apoyo debajo
  (columna), trivial en CSS. `Levitate` se resuelve con el Sheet o el Dialog. El divisor
  arrastrable sería una parte cliente opcional (4 × 48, 12 × 52, `outline`), de prioridad baja.
- **Navegación adaptable**: una receta documentada o un `NavigationSuite` que dibuje los
  destinos una sola vez y cambie entre barra y rail con media queries (600 de ancho, 480 de
  alto), aprovechando que NavigationBar y NavigationRail ya comparten el destino. Como Compose,
  no expandiría el rail sola. Riesgo medio: dos componentes con DOM distinto (el rail tiene
  cabecera y FAB).

### Qué no traer

- Postura, bisagras y modo mesa (`Posture`, `HingePolicy`, `excludedBounds`): en web solo
  existe la Viewport Segments API, experimental.
- Una clase de tamaño como objeto en tiempo de ejecución que lean los componentes: en web la
  resuelve CSS, y los componentes universales no pueden leer la ventana.
- El historial de destinos, Atrás predictivo, las escenas de Navigation 3 y las animaciones de
  paneles (`PaneMotion`): son del enrutador de la app. Si se quiere animar el cambio de panel,
  View Transitions más adelante.
- Anclas con lanzamiento por velocidad en el divisor, y `BREAKPOINTS_V1` y las APIs obsoletas
  (`WindowWidthSizeClass`, `NavigationSuiteType.NavigationDrawer`).
