# Jetpack Compose como segunda fuente

Revisión del 2026-11-24. Fuente: archivos de tokens de Jetpack Compose Material 3 en
`androidx/androidx`, carpeta
`compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/`
(commit `160825094a`, del 2026-08-05). Son 120 archivos: tokens del sistema y de cada
componente. Se leyeron solo los que tocan el primer conjunto de componentes.

## Lo que confirma

| Tema | Resultado |
|---|---|
| Opacidades de estado | Idénticas: hover 0.08, foco 0.10, presionado 0.10, arrastre 0.16 (`StateTokens.kt`). Confirma que el 16 % es para arrastre. |
| Esquinas | Idénticas a la colección Shape del kit (`ShapeTokens.kt`). |
| Color oscuro | Los 47 roles de Compose coinciden con el kit. |
| Color claro | 43 de 47 coinciden (ver conflictos). |
| Tamaños del botón | Alto, icono y separación coinciden en Small, Medium, Large y XLarge. |

`surface-tint` y `shadow` están en el kit pero no en los tokens de color de Compose.

## Lo que resuelve

| Duda del kit | Compose |
|---|---|
| Indicador con foco del campo de texto: 3 en el kit | **2** en Filled (`FocusActiveIndicatorHeight`) y en Outlined (`FocusOutlineWidth`) |
| Icono del checkbox en error: `On Primary` en el kit | **`On Error`** (`SelectedErrorIconColor`): el kit tiene un error |
| Nivel de sombra del botón Elevated | **Nivel 1** en reposo y con foco, 0 deshabilitado |

## Datos nuevos

Botón, por tamaño (`Button{XSmall,Small,Medium,Large,XLarge}Tokens.kt`):

| Tamaño | Radio Square | Radio al presionar | Borde Outlined |
|---|---|---|---|
| XSmall | 12 (Medium) | 8 (Small) | 1 |
| Small | 12 (Medium) | 8 (Small) | 1 |
| Medium | 16 (Large) | 12 (Medium) | 1 |
| Large | 28 (Extra-large) | 16 (Large) | 2 |
| XLarge | 28 (Extra-large) | 16 (Large) | 3 |

Al presionar, el botón cambia de forma (redondo o cuadrado pasan al radio de la tabla).
Seleccionado (toggle) usa el radio Square. Coincide con lo que documenta `expressive-react`.

## Conflictos con el kit

| Tema | Kit | Compose | Comentario |
|---|---|---|---|
| Botón XSmall: espacio lateral y separación | 12 y 4 | 16 y 8 | `expressive-react` y `m3-expressive-react` usan 12 y 4, como el kit (`m3-expressive-react` declara priorizar m3.material.io sobre Compose). Tres fuentes contra una. **Decidido: 12 y 4** ([ADR-0004](../adr/0004-fuentes-de-verdad-y-especificacion-de-color.md)). |
| Color claro: `on-primary-container`, `on-secondary-container`, `on-tertiary-container`, `on-error-container` | Tono 30 (por ejemplo `#4f378a`) | Tono 10 (`#21005d`) | **Resuelto: vale el kit.** Ver la sección siguiente. |
| Menú | Radio 16, sombra 3, `Surface Container Low`, seleccionado `Tertiary Container` | Radio 4, sombra 2, `Surface Container`, seleccionado `Secondary Container` | `MenuTokens.kt` describe el menú anterior (baseline); no son la misma versión. |

## Colores "on container": verificado con material-color-utilities

Verificado el 2026-11-24 en `material-color-utilities` (la librería oficial de Google que
calcula los esquemas; repositorio `material-foundation/material-color-utilities`, commit
`0f07b68` del 2026-11-23):

- El commit `03336bf` del 2024-06-11 ("Update MCU to for expressive on-colors") cambió el
  tono de los cuatro roles `on-*-container` del tema claro de 10 a 30
  (`s.isDark ? 90 : 10` → `s.isDark ? 90 : 30`) en todas las versiones de la librería
  (TypeScript, Java, Dart, C++, Swift).
- La especificación 2021 vigente en esa librería devuelve tono 30 para
  `on-primary-container` en claro (comprobado ejecutando el paquete publicado 0.4.0).
- Los tokens estáticos de Compose (`ColorLightTokens.kt`) siguen en tono 10, es decir, son
  anteriores a ese cambio.

Conclusión: los valores del kit son los vigentes y `tokens/color.json` no cambia.

Otros hallazgos de la misma prueba:

- El esquema del kit no es el que genera la librería a partir de la semilla `#6750a4`
  (variante Tonal Spot): ahí `primary` sale `#65558f`, no `#6750a4`. El esquema base del kit
  usa paletas fijas elegidas a mano, como los tokens de Compose (`PaletteTokens.kt`). Al
  agregar color dinámico, un tema generado desde una semilla no va a reproducir el esquema
  base exacto; es esperable.
- La librería tiene especificaciones 2021, 2025 y 2026. El kit coincide con la 2021 en
  37 de 45 roles en claro (salvo primary, error y derivados, por lo de la paleta fija) y
  con la 2025 solo en 10 de 45. Pendiente decidir qué especificación usar para el color
  dinámico.
- El paquete publicado `@material/material-color-utilities@0.4.0` tiene imports internos
  sin extensión (`./dynamic_color` en vez de `./dynamic_color.js`) que Node no resuelve al
  ejecutarlo directamente. Los empaquetadores (Vite, el de Next.js) sí los resuelven.
  Tenerlo en cuenta si se usa en scripts de Node.

## Las tres especificaciones de color

Leído en el código de `material-color-utilities` el 2026-11-24
(`typescript/dynamiccolor/color_spec*.ts` y `dynamic_scheme.ts`).

| Versión | Agregada | Qué es | A qué variantes aplica |
|---|---|---|---|
| 2021 | Con la librería (2023 en TypeScript) | Material 3 original. Es la versión por defecto (`DEFAULT_SPEC_VERSION = '2021'`). | Todas |
| 2025 | 2025-04-07 | La generación de color de la época Expressive: redefine 51 roles (superficies, contornos, contenedores), agrega roles nuevos (`primaryDim`, `secondaryDim`, `tertiaryDim`, `errorDim`) y distingue plataforma (`phone` o `watch`). | Tonal Spot, Neutral, Vibrant y Expressive; el resto vuelve a 2021 |
| 2026 | 2026-02-17 | Agrega el esquema "CMF" y ajusta sus roles. Qué significa CMF no está documentado en el código. | Solo la variante CMF; las demás usan 2025 aunque se pida 2026 |

La librería conserva las versiones anteriores para que actualizarla no cambie los colores
de una aplicación existente: la versión nueva se elige de forma explícita.

El kit de Figma, aunque sus componentes son Expressive, usa colores de la especificación
2021 (con el cambio de tonos "on container" de 2024) sobre paletas fijas.

### Qué usa Jetpack Compose

Leído en `androidx/androidx` (commit `4d01fc9d`, 2026-11-24), carpeta
`compose/material3/material3/src`:

- **No usa las versiones de especificación de `material-color-utilities`.** No hay ninguna
  referencia a `SpecVersion` ni a las clases `ColorSpec*` en el código de Material 3.
- **Esquemas fijos:** `lightColorScheme()` es la línea base con "on container" en tono 10.
  `expressiveLightColorScheme()` (en `ColorScheme.kt`), documentado como el esquema por
  defecto de `MaterialExpressiveTheme`, es el mismo esquema con los cuatro "on container"
  en tono 30 (`PaletteTokens.Primary30`, `Secondary30`, `Tertiary30`, `Error30`). El oscuro
  es `darkColorScheme()` en ambos casos.
- **Color dinámico:** `dynamicLightColorScheme(context)` y `dynamicDarkColorScheme(context)`
  solo existen en Android 12 o superior y leen los colores que calcula el sistema operativo
  a partir del fondo de pantalla (`android.R.color.system_*`). Compose no los genera, así que
  la especificación depende de la versión de Android, no de Compose.

El kit coincide con `expressiveLightColorScheme()`. Comparando los cuatro roles con la
paleta de Compose: `on-primary-container` `#4f378a` frente a `#4f378b`,
`on-secondary-container` `#4a4459` frente a `#4a4458`, `on-tertiary-container` igual
(`#633b48`), y `on-error-container` `#852221` frente a `#8c1d18`, que es la única
diferencia visible.

## Switch

Leído el 2026-11-24: `SwitchTokens.kt` (versión de tokens `v0_210`, último cambio en el commit
`160825094a` del 2026-08-05).

### Lo que confirma

Pista 52 × 32 con radio completo y borde de 2; capa de estado de 40; handle de 16
desactivado, 24 activado o con icono y 28 al presionar; iconos de 16. Colores de los estados
que trae el kit: pista y handle activados, hover, foco y presionado activados
(`primary-container`), presionado desactivado (`on-surface-variant`) y handles deshabilitados
(`surface` activado; `on-surface` al 38 % desactivado).

### Datos nuevos (el kit no los trae)

| Dato | Compose |
|---|---|
| Handle desactivado con hover y con foco | `on-surface-variant` (`UnselectedHoverHandleColor`, `UnselectedFocusHandleColor`); pista y borde sin cambios |
| Icono activado (todos los estados) | `on-primary-container` (`Selected*IconColor`) |
| Icono desactivado (todos los estados) | `surface-container-highest` (`Unselected*IconColor`) |
| Icono deshabilitado | activado `on-surface` al 38 %; desactivado `surface-container-highest` al 38 % |
| Anillo de foco | `secondary` (`FocusIndicatorColor`), igual que el átomo `FocusRing` |

La capa de estado de los estados desactivados (hover y foco) usa `on-surface`, por analogía
con el presionado del kit; Compose no la define en `SwitchTokens.kt`.

### Conflictos con el kit

| Tema | Kit | Compose | Decisión |
|---|---|---|---|
| Pista deshabilitada: opacidad | 10 % (activada y desactivada, y el borde) | 12 % (`DisabledTrackOpacity`) | **Kit** (ADR-0004): coincide con `--md-sys-state-disabled-container-opacity` (0.1), que ya usa el botón. |
| Pista deshabilitada desactivada: rol | `surface-variant` | `surface-container-highest` | **Kit**. En claro difieren en un punto (`#e7e0ec` y `#e6e0e9`) y al 10 % no se distinguen. |
| Colores deshabilitados semitransparentes | Opacidad sobre el fondo que haya | Compose los compone sobre `surface` (`compositeOver` en `Switch.kt`, según conocimiento previo; no verificado en el código) | **Kit**: semitransparentes. Sobre un fondo distinto de `surface` el aspecto cambia levemente. |

No se buscó una tercera fuente: las diferencias son de uno o dos puntos de opacidad o de tono
y no se ven a simple vista, así que no justifican apartarse del kit.

## IconButton

Leído el 2026-11-24 (último cambio en la carpeta de tokens: commit `ac364f3c7f`, del
2026-11-18): `IconButtonTokens.kt` (el objeto se llama `StandardIconButtonTokens`),
`{XSmall,Small,Medium,Large,XLarge}IconButtonTokens.kt`, `FilledIconButtonTokens.kt`,
`FilledTonalIconButtonTokens.kt`, `OutlinedIconButtonTokens.kt` y, fuera de `tokens/`,
`IconButtonDefaults.kt` (cálculo del ancho y borde del toggle).

### Medidas por tamaño

Ancho = icono + espacio inicial + espacio final (`IconButtonDefaults.*ContainerSize`). En
Large, el espacio de Default se llama `UniformLeadingSpace`.

| Tamaño | Alto | Icono | Espacio Narrow / Default / Wide | Ancho Narrow / Default / Wide | Radio Square | Al presionar | Borde Outlined |
|---|---|---|---|---|---|---|---|
| XSmall | 32 | 20 | 4 / 6 / 10 | 28 / 32 / 40 | 12 (Medium) | 8 (Small) | 1 |
| Small | 40 | 24 | 4 / 8 / 14 | 32 / 40 / 52 | 12 (Medium) | 8 (Small) | 1 |
| Medium | 56 | 24 | 12 / 16 / 24 | 48 / 56 / 72 | 16 (Large) | 12 (Medium) | 1 |
| Large | 96 | 32 | 16 / 32 / 48 | 64 / 96 / 128 | 28 (Extra-large) | 16 (Large) | 2 |
| XLarge | 136 | 40 | 32 / 48 / 72 | 104 / 136 / 184 | 28 (Extra-large) | 16 (Large) | 3 |

**Lo que confirma del kit:** Medium 56 × 56 con icono 24; Small de 40 visible con icono 24; los
anchos de Medium, Large y XLarge de la tabla de variantes. En Small y XSmall el kit da 48 en
los tres anchos porque mide el área táctil: el tamaño visible sale de esta tabla.

Alto, radios y borde coinciden con los del botón (`Button*Tokens.kt`), así que el CSS los
comparte. El icono también coincide salvo en Small (24 en el icon button, 20 en el botón).

### Forma seleccionada (toggle)

`SelectedContainerShapeRound` es la forma cuadrada del tamaño y
`SelectedContainerShapeSquare` es `CornerFull`: al seleccionar, el redondo pasa a cuadrado y
el cuadrado pasa a redondo. En el botón no es así (ver más abajo).

### Colores

| Estilo | Común | Sin seleccionar | Seleccionado | Deshabilitado |
|---|---|---|---|---|
| Standard | sin fondo, `on-surface-variant` | igual | sin fondo, `primary` | `on-surface` 38 % |
| Filled | `primary` / `on-primary` | `surface-container` / `on-surface-variant` | `primary` / `on-primary` | fondo `on-surface` 10 %, contenido 38 % |
| Tonal | `secondary-container` / `on-secondary-container` | igual | `secondary` / `on-secondary` | fondo `on-surface` 10 %, contenido 38 % |
| Outlined | sin fondo, `on-surface-variant`, borde `outline-variant` | igual | `inverse-surface` / `inverse-on-surface`, sin borde | sin seleccionar: borde `outline-variant`; seleccionado: fondo `on-surface` 10 % sin borde |

Filled, Tonal y Outlined coinciden con los del botón. El borde del Outlined seleccionado no
existe: `outlinedIconToggleButtonBorder` devuelve `null` si está seleccionado. Los
deshabilitados usan los mismos valores en los estados seleccionado y sin seleccionar.

### Conflictos con el kit

Ninguno: el kit no trae lo que Compose define (colores de toggle, Narrow y Wide visibles en
Small y XSmall, radios) y lo que trae coincide.

### Observaciones sobre el Button (no aplicadas)

- En los cinco `Button*Tokens.kt`, `SelectedContainerShapeRound = CornerFull` y
  `SelectedContainerShapeSquare` es el radio Square del tamaño: el botón seleccionado
  **conserva** su forma. El Button de matekit pasa a cuadrado al seleccionar,
  como el kit (Toggle M seleccionado, radio 16). Vale el kit (ADR-0004); se anota por si se
  revisa.
- El Button de matekit no atenúa los toggles deshabilitados: tonal seleccionado, filled sin
  seleccionar y outlined seleccionado deshabilitados se ven con sus colores normales (las
  reglas `[data-variant][aria-pressed]` le ganan en especificidad a `:disabled`). Compose
  atenúa todos. El IconButton lo resuelve en su CSS; el Button queda igual a pedido.

## TextField

Leído el 2026-11-24 (último cambio de los tokens: commit `160825094a`, del 2026-08-05):
`tokens/FilledTextFieldTokens.kt`, `tokens/OutlinedTextFieldTokens.kt` y, fuera de `tokens/`,
`TextFieldDefaults.kt`, `TextField.kt`, `OutlinedTextField.kt` e `internal/TextFieldImpl.kt`.

### Lo que confirma

Alto 56; radio 4 (`CornerExtraSmallTop` en el filled, `CornerExtraSmall` en el outlined);
contenedor `surface-container-highest`; iconos de 24; etiqueta Body Large que pasa a Body Small;
texto Body Large; ayuda Body Small; cursor `primary`; colores de reposo, hover del filled
(indicador `on-surface`), foco (`primary`), error (`error` en indicador, etiqueta, ayuda e icono
final; el inicial sigue en `on-surface-variant`) y deshabilitado del filled (contenedor
`on-surface` 4 %, indicador y contenido al 38 %).

El kit escribe los rellenos como "vertical / horizontal" y "arriba, derecha, abajo, izquierda":
"capa de estado 4 / 0" y "bloque de texto 4 / 0" son 4 arriba y abajo. Así los 56 quedan en
4 + 4 + 16 (etiqueta flotante) + 24 (texto) + 4 + 4, lo mismo que Compose (8 arriba y abajo,
`TextFieldWithLabelVerticalPadding`).

### Lo que resuelve

| Duda | Compose |
|---|---|
| Indicador con foco: 3 en el kit | **2** (`FocusActiveIndicatorHeight`, `FocusOutlineWidth`; ya anotado arriba) |
| Relleno lateral sin icono (el kit no consultó esa variante) | **16** (`TextFieldPadding`) |
| Relleno entre icono y texto | **4**: `TextFieldPadding` menos `(48 − 24) / 2` (`textFieldHorizontalIconPadding`); el texto empieza en 52 con icono |

### Datos nuevos (el kit no los trae)

| Dato | Compose |
|---|---|
| Error con hover | indicador o borde, etiqueta e icono final en `on-error-container` (`ErrorHover*`) |
| Error con foco | indicador o borde de 2 en `error`; etiqueta `error`; cursor `error` (`ErrorFocusCaretColor`) |
| Outlined con hover | borde **y etiqueta** en `on-surface` (`HoverOutlineColor`, `HoverLabelColor`); en el filled la etiqueta no cambia con hover |
| Outlined deshabilitado | borde `on-surface` al **12 %** (`DisabledOutlineOpacity`), de 1; contenido al 38 % |
| Etiqueta flotante del outlined | centrada sobre el borde superior (y = −8) y en el relleno de 16 **aunque haya icono inicial** (`endX` en `TextFieldImpl.kt`); en el filled queda alineada con el texto (52 con icono) |
| Corte del borde | 4 a cada lado del texto de la etiqueta (`OutlinedTextFieldInnerPadding`), igual que el relleno 0, 4 del kit |
| Ancho | mínimo 280 (`TextFieldDefaults.MinWidth`); matekit lo usa como ancho por defecto |
| Multilínea | la etiqueta en reposo se alinea arriba con el relleno, no al centro |
| Movimiento | etiqueta con `FastSpatial`; colores con `FastEffects`; grosor del borde con `FastSpatial` |

### Conflictos y decisiones

| Tema | Kit | Compose | Decisión |
|---|---|---|---|
| Capa de estado con hover | Filled: `on-surface` 8 % | No hay capa en los tokens ni en `TextFieldImpl.kt` | **Kit** (ADR-0004): el kit es la primera fuente y trae el dato. |
| Capa de estado del outlined | No consultado | Sin capa | **Sin capa**: el hover cambia el borde. |
| Borde del outlined deshabilitado | No consultado | 12 % | **Compose** (es la única fuente). Es 2 puntos más que `--md-sys-state-disabled-container-opacity` (10 %), así que va escrito en el CSS con la cita. Revisar si se prefiere el token. |
| Corte del borde | Etiqueta con fondo `surface` | Recorte del borde (`clipRect` con `ClipOp.Difference`) | **Recorte** (con `<fieldset>`/`<legend>` en web): el fondo `surface` del kit se ve mal sobre cualquier otra superficie (tarjetas, diálogos, `surface-container-*`). Mismo resultado visual sobre `surface`. |

No se buscó una tercera fuente: no hay conflictos de valor, solo datos que el kit no trae y una
técnica de dibujo.

## Dialog

Leído el 2026-11-24: `tokens/DialogTokens.kt` y `tokens/ScrimTokens.kt` (commit `160825094a`, del
2026-08-05) y, fuera de `tokens/`, `AlertDialog.kt` (último cambio: commit `080d2b3e53`, del
2026-07-24). Tercera fuente para comportamiento y para el conflicto de alineación:
`@material/web` (`docs/components/dialog.md`, `dialog/internal/dialog.ts`, `_dialog.scss` y
`animations.ts`).

### Lo que confirma

Radio 28 (`CornerExtraLarge`), fondo `surface-container-high`, título Headline Small en
`on-surface`, texto Body Medium en `on-surface-variant`, icono de 24 en `secondary`, acciones en
`primary` (Label Large). Rellenos: Compose usa 24 en los cuatro lados (`dialogPadding`), 16 bajo
el icono y bajo el título (`IconPadding`, `TitlePadding`) y 24 bajo el texto (`textPadding`): lo
mismo que el kit una vez que se descuenta el área táctil de los botones (ver abajo). Acciones con
8 de separación (`ButtonsMainAxisSpacing`) y alineadas al final.

El kit mide las acciones con el botón de 48 (su área táctil): 88 = 20 + 48 + 20. El botón visible
mide 40, así que del texto al botón hay 20 + 4 = 24 y del botón al borde inferior otros 24, como
en Compose. En matekit el área táctil es un `::before` que no ocupa lugar: la fila lleva 24 de
relleno vertical y sigue midiendo 88.

### Datos nuevos (el kit no los trae)

| Dato | Fuente |
|---|---|
| Ancho mínimo **280** y máximo **560** | `AlertDialog.kt`: `DialogMinWidth = 280.dp`, `DialogMaxWidth = 560.dp` (usados en `sizeIn`). Confirma los valores que se recordaban. |
| Fondo (scrim) al **32 %** del rol `scrim` | `ScrimTokens.kt`: `ContainerOpacity = 0.32f`. `@material/web` anima el scrim a 0.32. |
| Sin sombra | `AlertDialogDefaults.TonalElevation = 0.dp` y `Surface` sin `shadowElevation`. `DialogTokens.ContainerElevation` (nivel 3) existe pero `AlertDialog` no lo usa. Coincide con el kit. |
| Acciones que no entran en una fila | Pasan a la siguiente (`FlowRow`, 8 entre filas). |
| Margen con la ventana y scroll | `@material/web`: máximo `min(560px, 100% - 48px)` de ancho y `100% - 48px` de alto; solo el contenido se desplaza, el título y las acciones quedan fijos. |
| Cierre con clic afuera | Compose: `DialogProperties.dismissOnClickOutside = true` por defecto; `@material/web`: el clic en el scrim cancela y cierra. Escape (atrás en Android) también. Ninguna de las dos fuentes cambia esto para las alertas. |
| Alerta | `@material/web`: `type="alert"` pone `role="alertdialog"`; nada más cambia. |
| Movimiento | Compose no anima `AlertDialog` (lo hace la ventana de la plataforma). `@material/web` desliza 50 px desde arriba con fundido. matekit usa 48 px con los resortes por defecto al entrar y los rápidos al salir. |

### Conflictos y decisiones

| Tema | Kit | Compose y `@material/web` | Decisión |
|---|---|---|---|
| Alineación con icono | "Con icono, todo el contenido se centra" | Se centran el icono y el título; el texto sigue al inicio (`Alignment.Start` en `AlertDialog.kt`; `@material/web` centra solo el título) | **Icono y título centrados, texto al inicio**: dos fuentes contra una, y un párrafo centrado se lee peor. El kit no distingue texto de una línea y de varias; puede que "todo" se refiera al bloque superior. |

## Menu

Leído el 2026-11-24: `tokens/StandardMenuTokens.kt`, `tokens/VibrantMenuTokens.kt` y
`tokens/SegmentedMenuTokens.kt` (commit `160825094a`, del 2026-08-05), que describen el menú
Expressive, y `Menu.kt` (último cambio: commit `23acf55b06`, del 2026-10-19). `MenuTokens.kt`
es el menú anterior y no se usa (ver "Conflictos con el kit"). Comportamiento: `@material/web`
`docs/components/menu.md` y WAI-ARIA APG (patrones "Menu Button" y "Menu and Menubar",
`w3c/aria-practices`, commit `b20627c7b3`).

### Lo que confirma

Fondo `surface-container-low` (Standard) y `tertiary-container` (Vibrant); elemento de 44
(`SegmentedMenuTokens.Item`) con 4 a los costados (`DropdownMenuSelectableItemPadding`), radio
`CornerExtraSmall` y seleccionado `CornerMedium`; iconos de 20; seleccionado en
`tertiary-container` (Standard) y `tertiary` (Vibrant). Coincide con el kit.

### Datos nuevos (el kit no los trae)

| Dato | Fuente |
|---|---|
| Texto del elemento en **`on-surface`** e iconos en **`on-surface-variant`** (Standard) | `StandardMenuTokens.ItemLabelTextColor`, `ItemLeadingIconColor`, `ItemTrailingIconColor` |
| Seleccionado: texto e iconos en **`on-tertiary-container`** (Standard) y **`on-tertiary`** (Vibrant) | `ItemSelectedLabelTextColor`, `ItemSelectedLeadingIconColor` |
| Vibrant: texto e iconos en **`on-tertiary-container`**; iconos con hover, foco o presionado en **`tertiary`** | `VibrantMenuTokens.ItemLabelTextColor`, `ItemHoveredLeadingIconColor` y afines |
| Deshabilitado al **38 %** de `on-surface` (Standard) o `on-tertiary-container` (Vibrant); seleccionado y deshabilitado, también el fondo al 38 % | `ItemDisabledLabelTextOpacity`, `ItemSelectedDisabledContainerOpacity` |
| Ancho entre **112** y **280** | `Menu.kt`: `DropdownMenuItemDefaultMinWidth`, `DropdownMenuItemDefaultMaxWidth`. El kit muestra 208, que es un ejemplo. |
| Margen de **48** con los bordes superior e inferior de la ventana | `Menu.kt`: `MenuVerticalMargin`. matekit lo usa como alto máximo: `100dvh - 96px`. |
| Animación: escala **0,8 → 1** con `FastSpatial` y opacidad con `FastEffects`, desde el borde del disparador | `Menu.kt`: `ClosedScaleTarget`, `transformOrigin` |
| Semántica del seleccionado | `Menu.kt`: el elemento con `selected` tiene rol `RadioButton` y el de `checked`, `Checkbox`. En web: `menuitemradio` y `menuitemcheckbox` con `aria-checked`. |
| Divisor de 1 en `outline-variant` | `DividerTokens.kt`. El margen (8 a cada lado) no está en ninguna de las dos fuentes; es el del menú anterior. |

### Conflictos y decisiones

| Tema | Kit | Compose | Decisión |
|---|---|---|---|
| Tipografía del texto | Sin dato (la extracción no abrió la instancia del texto) | `Menu.kt` usa `typography.labelLarge` con un `// TODO replace with token`; `SegmentedMenuTokens.ItemLabelTextFont` dice `BodyLarge` | **Label Large**, que es lo que Compose dibuja hoy, lo que usaba el menú anterior y la misma familia que la etiqueta de sección del kit. **Sin confirmar**: el token nuevo (`BodyLarge`) puede ser el destino del TODO. Se resuelve leyendo el estilo del texto del elemento en el kit (nodo `58966:4101`). |
| Radio del último elemento | "El último elemento lleva radio 16 abajo" | `ItemLastChildShape = CornerMedium` (12), con esquinas interiores de 4, en el menú segmentado | **Sin aplicar**: todos los elementos llevan radio 4. El dato del kit parece describir el marco del elemento, que en matekit no se dibuja. |

## NavigationBar

Revisión del 2026-11-25. Archivos (en `compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/`):
`tokens/NavigationBarTokens.kt`, `tokens/NavigationBarVerticalItemTokens.kt`,
`tokens/NavigationBarHorizontalItemTokens.kt` y `tokens/BadgeTokens.kt` (commit `160825094a`,
2026-08-05); `ShortNavigationBar.kt` (`de12189a63`, 2026-11-11), `NavigationItem.kt`
(`5f1e5af7ea`, 2026-11-03) y `Badge.kt` (`bbc070798f`, 2026-11-09). La barra Expressive de 64
es `ShortNavigationBar`; la `NavigationBar` de Compose es la anterior, de 80
(`TallContainerHeight`).

### Lo que confirma

Alto 64, fondo `surface-container`, indicador 56 × 32 en `secondary-container`, icono 24,
relleno vertical 6 y separación 4 (`ContainerBetweenSpace`, `TopIconIndicatorToLabelPadding`),
etiqueta Label Medium, colores sin activar en `on-surface-variant` e icono activo en
`on-secondary-container`. Horizontal: indicador de 40 de alto con 16 a los lados
(`ActiveIndicatorLeadingSpace`/`TrailingSpace`) y 4 entre icono y etiqueta
(`ItemActiveIndicatorIconLabelSpace`). Insignia grande: 16, `error`, Label Small `on-error`.

### Lo que resuelve

| Duda del kit | Compose |
|---|---|
| Etiqueta activa: `Secondary` (variante sin insignia) u `On Secondary Container` (con insignia) | **`secondary`** en la vertical (`ItemActiveLabelTextColor`) y **`on-secondary-container`** en la horizontal, donde la etiqueta queda dentro del indicador (`ShortNavigationBar.kt`: `selectedTextColorStartIconPosition = ItemActiveIconColor`). Las dos variantes del kit son correctas, cada una en su disposición. |

### Datos nuevos (el kit no los trae)

| Dato | Fuente |
|---|---|
| Insignia pequeña: **6**, `error`, radio completo | `BadgeTokens.Size`, `Color`, `Shape` |
| Insignia grande: ancho mínimo 16 y **4** de relleno lateral | `Badge.kt`: `defaultMinSize`, `BadgeWithContentHorizontalPadding` |
| Posición: la pequeña a 6 del borde final del icono, sin sobresalir arriba; la grande desde 12 del borde final y 2 por encima (se superpone 14 con el icono) | `Badge.kt`: `BadgeOffset`, `BadgeWithContentHorizontalOffset`, `BadgeWithContentVerticalOffset` |
| **Sin elevación**: `ShortNavigationBar` usa `Surface` sin `tonalElevation` ni `shadowElevation`; el token `ContainerElevation` (Level2) existe pero no se usa | `ShortNavigationBar.kt` |
| Relleno para las barras del sistema **abajo y a los costados** | `ShortNavigationBarDefaults.windowInsets` (`systemBarsForVisualComponents`, Horizontal + Bottom). En web: `env(safe-area-inset-*)`. |
| Todo el elemento es el área táctil (mínimo 48), pero la onda y el anillo de foco van solo en el indicador | `NavigationItem.kt`: `selectable` en el elemento, `IndicatorRipple` con `focusRingShape = indicatorShape` |
| El indicador aparece creciendo a lo ancho desde el centro, con el resorte **DefaultSpatial** | `NavigationItem.kt`: `animateIndicatorProgressAsState`, `animatedIndicatorWidth` |
| Semántica: elemento `selectable` con rol `Tab` dentro de un `selectableGroup` | `NavigationItem.kt`. En web, matekit usa enlaces con `aria-current="page"` dentro de `<nav>` (patrón de navegación de APG): los destinos cambian de página, no muestran paneles. |
| Disposición `Centered` para pantallas medianas: elementos centrados ocupando del 60 al 90 % del ancho según la cantidad | `ShortNavigationBarArrangement.Centered`. **Sin aplicar**: matekit reparte siempre (`EqualWeight`). |

### Conflictos y decisiones

| Tema | Kit | Compose | Decisión |
|---|---|---|---|
| Radio del indicador | 16 (vertical) y 20 (horizontal) | `CornerFull` | Es lo mismo (la mitad del alto). matekit usa `corner-large` (16) y `corner-large-increased` (20), no `corner-full`, porque el ancho del indicador anima. |
| `secondary` sobre `surface-container` (etiqueta activa vertical) | — | — | No está en la lista de pares garantizados de CLAUDE.md (que nombra `primary`, no `secondary`). En `material-color-utilities` 0.4.0 (`dynamiccolor/color_spec_2021.js`), `secondary` tiene la misma curva que `primary` y `error` (`ContrastCurve(3, 4.5, 7, 7)`) contra `highestSurface`, no contra `surface-container`, y el esquema base no se genera (ADR-0008); así que la garantía no alcanza sola. Se sigue a Compose porque `src/test/contrast.test.tsx` lo mide: cumple 4,5:1 en las 24 combinaciones. Si una paleta nueva falla, la salida es `on-surface`. |

`@material/web` no tiene documentación de la barra de navegación
(`docs/components/navigation-bar.md` no existe; consultado el 2026-11-25). Su versión en
`labs/navigationbar` usa `role="tablist"` y `role="tab"` con flechas; matekit no la sigue
(ver la fila de semántica).

## No revisado

Los tokens de Navigation rail, y la
tipografía (`TypeScaleTokens.kt`, descargado pero sin comparar).
