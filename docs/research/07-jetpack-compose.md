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

## RadioButton

Leído el 2026-11-25: `tokens/RadioButtonTokens.kt` (versión de tokens `41.1.19`, commit
`76990c62ac` del 2026-11-24) y `RadioButton.kt` (commit `de12189a63` del 2026-11-11), en
`compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/`.

### Lo que confirma

Capa de estado de 40 (`StateLayerSize`), dibujo de 20 (`IconSize`), icono `primary`
seleccionado en todos los estados, `on-surface-variant` sin seleccionar y `on-surface` sin
seleccionar con hover, foco y presionado; deshabilitado `on-surface` al 38 % (seleccionado y
sin seleccionar).

### Datos nuevos (el kit no los trae)

| Dato | Compose |
|---|---|
| Trazo del anillo | 2 (`RadioStrokeWidth`), dibujado en un círculo de radio 10 − 1: borde exterior en 20 |
| Punto | radio animado de 0 a 6 (`RadioButtonDotSize / 2`), dibujado con radio − 1: **10 de diámetro** |
| Animación del punto | `animateDpAsState` con el resorte **FastSpatial** (rebota) |
| Animación del color | `animateColorAsState` con **DefaultEffects**; deshabilitado, sin animación ("snap") |

matekit escala un punto de 10 (`scale` de 0 a 1 con el mismo resorte). Compose anima el radio
antes de restarle el medio trazo, así que su punto empieza a verse algo más tarde y su rebote
llega a 11,1 en vez de 10,9: menos de 0,2 px de diferencia, que no se distingue.

### Conflictos y decisiones

| Tema | Kit | Compose | Decisión |
|---|---|---|---|
| Capa de estado al presionar | `On Surface` 10 % seleccionado, `Primary` 10 % sin seleccionar (al revés que hover y foco) | `RadioButtonTokens.kt` no tiene colores de capa (las versiones `v0_*` desde 2022 tampoco); el `ripple()` de `RadioButton.kt` no recibe color, así que usa el del contenido en todos los estados | **Kit**. Tercera fuente: los tokens de `@material/web` (`tokens/versions/latest/sass/_md-comp-radio-button.scss`, versión `34.0.21`, consultado el 2026-11-25) traen `selected.pressed.state-layer.color = on-surface` y `unselected.pressed.state-layer.color = primary`, iguales al kit. La onda usa el mismo color que la capa. |

`@material/web` (`docs/components/radio.md`, consultado el 2026-11-25), para comportamiento: los
radios forman grupo por `name`; el grupo va en `role="radiogroup"` con nombre visible
(`aria-label` o `aria-labelledby`). Su aviso de no envolver el radio en un `<label>` es propio
de su elemento personalizado (`md-radio`, con shadow DOM); con un `<input type="radio">` nativo
dentro del `<label>`, como hace matekit, el lector de pantalla cuenta la posición en el grupo.

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
| Tipografía del texto | Sin dato (la extracción no abrió la instancia del texto) | `Menu.kt` usa `typography.labelLarge` con un `// TODO replace with token`; `SegmentedMenuTokens.ItemLabelTextFont` dice `BodyLarge` | **Label Large**, que es lo que Compose dibuja hoy, lo que usaba el menú anterior y la misma familia que la etiqueta de sección del kit. **Confirmado en el kit el 2026-11-25:** el elemento Expressive (`Menu item/Standard`) usa el estilo `M3/label/large` (14/20, 500). `Body Large` es el del menú anterior (`Building Blocks/Menu list item`, con ayuda en `Body Medium`), que es a lo que corresponde el token de `SegmentedMenuTokens`. |
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

## FAB y FAB extendido

Revisión del 2026-11-25. Archivos (en `compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/`):
`tokens/FabBaselineTokens.kt`, `FabSmallTokens.kt`, `FabMediumTokens.kt`, `FabLargeTokens.kt`,
`FabPrimaryContainerTokens.kt`, `FabSecondaryContainerTokens.kt`, `ExtendedFabSmallTokens.kt`,
`ExtendedFabMediumTokens.kt`, `ExtendedFabLargeTokens.kt` y `ExtendedFabPrimaryTokens.kt` (commit
`160825094a`, 2026-08-05; tokens `v0_14_0`, salvo `ExtendedFabPrimaryTokens`, `v0_103`), y
`FloatingActionButton.kt` (`be3f6f8075`, 2026-09-14). No hay más archivos de color del FAB:
Compose no tiene tokens `FabTertiaryContainer` ni de los tonos `primary`/`secondary`/`tertiary`
(se arman pasando `containerColor`). Medidas y colores mandan los del kit
(`05-medidas.md` § FAB y FAB extendido, ADR-0004); Compose se usó para comparar y para lo que el
kit no trae.

### Lo que confirma

| Dato del kit | Compose |
|---|---|
| FAB 56 radio 16, icono 24 | `FabBaselineTokens`: 56, `CornerLarge`, 24 |
| FAB medium 80, radio 20, icono 28 | `FabMediumTokens`: 80, 28; radio `ShapeDefaults.LargeIncreased` (20) en `FloatingActionButtonDefaults.mediumShape` (el token de forma está comentado con un TODO) |
| FAB large 96, radio 28 | `FabLargeTokens`: 96, `CornerExtraLarge` |
| Extendido small: alto 56, radio 16, relleno 16, separación 8, icono 24, Title Medium | `ExtendedFabSmallTokens` y `SmallExtendedFabTextStyle` |
| Extendido medium: alto 80, radio 20, relleno 26, icono 28, Title Large | `ExtendedFabMediumTokens` y `MediumExtendedFabTextStyle` |
| Extendido large: alto 96, radio 28, relleno lateral 28, icono 36, Headline Small | `ExtendedFabLargeTokens` (28 y 28) y `LargeExtendedFabTextStyle` |
| Contenedor `primary-container` con contenido `on-primary-container` (y `secondary-container`) | `FabPrimaryContainerTokens`, `FabSecondaryContainerTokens`, `ExtendedFabPrimaryTokens` |
| Elevación 3 en reposo, 4 con el puntero, 3 con foco y presionado | `FabPrimaryContainerTokens` y `FloatingActionButtonDefaults.elevation()` |
| Contraído, el extendido mide lo mismo que el FAB de su alto | `ExtendedFloatingActionButton` (privado): ancho mínimo = `ContainerHeight` de su tamaño |

### Vigentes y obsoletos (tercera fuente: MDC-Android)

El código de Compose no marca nada como obsoleto (`SmallFloatingActionButton` no tiene
`@Deprecated`), pero solo las funciones nuevas de Expressive llevan la etiqueta
`@material3expressive` (commit del 2026-09-14). La guía de Google para Android,
`material-components-android/docs/components/FloatingActionButton.md` y
`ExtendedFloatingActionButton.md` (`fca1418bf4`, 2025-08-25), § "M3 Expressive update", dice:

- **Obsoletos:** el FAB pequeño de 40 (`FabSmallTokens`, radio 12), los FAB de color
  `surface` y el extendido original de 56 sin tamaño (`ExtendedFabPrimaryTokens`, con 16 y 20
  de relleno y Label Large), que se reemplaza por el extendido small.
- **Nuevos:** el FAB medium (80) y los extendidos small, medium y large; los colores de tono
  `primary`, `secondary` y `tertiary` (los que antes se llamaban así pasan a ser los
  `*-container`, con los mismos valores).
- El kit coincide: no trae el FAB de 40 ni colores `surface` (`05-medidas.md`).

matekit implementa solo los vigentes: FAB 56/80/96 y extendido 56/80/96, en los seis colores.

### Datos nuevos (el kit no los trae)

| Dato | Fuente | Uso en matekit |
|---|---|---|
| Elevación **lowered**: 1 en reposo, con foco y presionado; 2 con el puntero | `FloatingActionButtonDefaults.loweredElevation()` (también `ExtendedFabPrimaryTokens.Lowered*`) | prop `lowered` |
| Expandir: ancho con **FastSpatial** y aparición del texto con **DefaultEffects** | `extendedFabExpandAnimation()` (`expandHorizontally` + `fadeIn`) | `transition` del estado expandido |
| Contraer: ancho con **DefaultSpatial** y desaparición del texto con **FastEffects** | `extendedFabCollapseAnimation()` (`shrinkHorizontally` + `fadeOut`) | `transition` del estado contraído |
| Contraído, el texto se quita de la semántica (`clearAndSetSemantics`) y el nombre sale del `contentDescription` del icono | `ExtendedFloatingActionButton` | **Distinto en web:** el texto queda en el DOM (recortado y transparente) y sigue siendo el nombre accesible; el icono es decorativo. Así no hace falta repetir el nombre en el icono. |
| Sin estado deshabilitado: `FloatingActionButton` no tiene parámetro `enabled` | `FloatingActionButton.kt` | matekit no acepta `disabled` (la guía es ocultar el FAB, no atenuarlo) |
| El texto del extendido no usa los colores por estado: icono y texto son `on-X` en todos los estados | `ExtendedFabPrimaryTokens` (`Hover`/`Focus`/`Pressed*Color` = `OnPrimaryContainer`) | igual |

### Conflictos y decisiones

| Tema | Kit | Compose | Decisión |
|---|---|---|---|
| Icono del FAB large | 36 | `FabLargeTokens.IconSize` = 32, pero `FloatingActionButtonDefaults.LargeIconSize = 36.dp` con el comentario `// TODO: FabLargeTokens.IconSize is incorrect` | **36**, el kit; Compose reconoce el error de su token. |
| Icono del extendido large | 36 | `ExtendedFabLargeTokens.IconSize` = 32 | **36**, el kit (mismo error de token que el FAB large). |
| Separación icono–texto del extendido medium | 12 | `ExtendedFabMediumTokens.IconLabelSpace` = 16, pero `MediumExtendedFabIconPadding = 12.dp` con `// TODO: … IconLabelSpace is incorrect` | **12**, el kit; el código de Compose también usa 12. |
| Separación icono–texto del extendido large | 16 | `ExtendedFabLargeTokens.IconLabelSpace` = 20, pero `LargeExtendedFabIconPadding = 16.dp` con el mismo TODO | **16**, el kit y el código de Compose. |
| Colores de tono y `tertiary-container` | los seis | solo `primary-container` y `secondary-container` en tokens | Los seis del kit, siempre `on-X` sobre `X` (ADR-0008). MDC-Android los confirma. |

Ninguno es un conflicto real: en los cuatro casos el código de Compose (o su comentario) da la
razón al kit frente a su propio token.

### Pendiente de confirmar contra el kit

- Elevación **lowered** (1/2/1/1): el kit no tiene esa variante; viene solo de Compose.
- El **movimiento** de expandir y contraer (qué resorte para el ancho y cuál para el texto):
  el kit no tiene movimiento.
- Si en el kit el FAB y el extendido tienen variante **deshabilitada** en otra página (no está
  en los conjuntos `FAB` y `Extended FAB`).
- El relleno del FAB large que anota el kit (30) es `(96 − 36) / 2`: matekit centra el icono y
  no lo usa como dato aparte.

`@material/web` (`docs/components/fab.md`, consultado el 2026-11-25), para comportamiento:
el FAB con solo icono necesita `aria-label`; el extendido usa su texto como nombre; existe
`lowered`. Es anterior a Expressive (tamaños `small`/`medium`/`large` de 40/56/96): no se usó
para medidas.

## NavigationRail

Revisión del 2026-11-25. Archivos (en `compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/`):
`tokens/NavigationRailCollapsedTokens.kt`, `NavigationRailExpandedTokens.kt`,
`NavigationRailColorTokens.kt`, `NavigationRailVerticalItemTokens.kt`,
`NavigationRailHorizontalItemTokens.kt` y `NavigationRailBaselineItemTokens.kt` (commit
`160825094a`, 2026-08-05); `WideNavigationRail.kt` (`de12189a63`, 2026-11-11) y
`NavigationItem.kt` (`5f1e5af7ea`, 2026-11-03). El rail Expressive que se contrae y se expande es
`WideNavigationRail` (y `ModalWideNavigationRail`, que se superpone al contenido con un velo);
el `NavigationRail` de Compose es el anterior, de 80. Medidas y colores mandan los del kit
(`05-medidas.md` § Navigation rail, ADR-0004).

### Lo que confirma

Contraído de 96 (`ContainerWidth`), 44 arriba (`TopSpace`), 4 entre destinos
(`ItemVerticalSpace`), 40 entre el bloque superior y los destinos (`HeaderSpaceMinimum`), destino
vertical de 64 de alto con 6 de relleno (`ContainerHeight`, `ContainerVerticalSpace`), indicador
56 × 32, 4 entre indicador y etiqueta, Label Medium. Expandido de 220 como mínimo
(`ContainerWidthMinimum`), destino horizontal de 56 (`ActiveIndicatorHeight`), 16 a los lados y 8
entre icono y etiqueta, Label Large. Colores: indicador `secondary-container`, icono activo
`on-secondary-container`, etiqueta activa `secondary` (vertical) y `on-secondary-container`
(horizontal, `selectedTextColorStartIconPosition = ItemActiveIcon`), inactivos
`on-surface-variant`. Floating (en Compose, el modal expandido): `surface-container` con
`CornerLarge` (16). Sin etiqueta: indicador de 56 de alto con el icono centrado
(`WNRItemNoLabelIndicatorPadding = (56 − 24) / 2`).

### Datos nuevos (el kit no los trae)

| Dato | Fuente |
|---|---|
| Ancho expandido **mínimo 220 y máximo 360**; Compose lo ajusta al destino más ancho dentro de ese rango | `ContainerWidthMinimum`, `ContainerWidthMaximum`; `WideNavigationRailLayout` (`widestElementWidth`). matekit usa un ancho fijo (220) ajustable con `--mk-navigation-rail-expanded-width` entre 220 y 360: animar el ancho hasta el contenido (`auto`) no funciona igual en los tres navegadores. |
| El ancho anima con el resorte **DefaultSpatial** (FastSpatial en el modal) | `animateDpAsState(..., animationSpec = MotionSchemeKeyTokens.DefaultSpatial)`. matekit usa DefaultSpatial para docked y floating, porque su floating no se superpone. |
| La separación entre destinos pasa de **4 a 0** al expandir, animada | `itemVerticalSpacedBy`. El kit lo confirma: 224 de destinos expandidos son 4 × 56. |
| El destino expandido **abraza su contenido** (indicador = 16 + icono + 8 + etiqueta + 16) y empieza a 20 del borde; no ocupa todo el ancho | `placeAnimatedLabelAndIcon` (`widthStartIcon`), `WNRItemHorizontalPadding = 20`. |
| El paso de vertical a horizontal anima con **DefaultSpatial**: el tamaño del indicador y la posición del icono se interpolan; la etiqueta se desvanece hasta la mitad y reaparece en su lugar nuevo (alfa `4 (p − 0,5)²`), y la tipografía cambia de golpe a la mitad | `AnimatedNavigationItem`, `placeAnimatedLabelAndIcon`. matekit interpola también la posición y el tamaño de la etiqueta (sin desvanecerla): se resuelve con CSS sin JavaScript. |
| `Arrangement.Center` centra los destinos en el **alto total**, no en el lugar debajo del bloque superior | `WideNavigationRailLayout` (comentario "For centered arrangement the items will be centered in the container"). Coincide con el kit (288 en 800 de alto). Compose puede superponer destinos y bloque si no hay lugar; matekit los baja. |
| Capas de estado `on-secondary-container` (activo e inactivo) | `NavigationRailColorTokens.Item*StateLayer`. **Sin aplicar**: el kit dice que el destino contraído es "igual que el elemento vertical de la barra", cuya capa es `on-surface` 8 %; matekit comparte esa capa con la barra. |
| Ancho contraído angosto de 80 (`NarrowContainerWidth`) | Sin aplicar: el kit no lo tiene. |

### Conflictos y decisiones

| Tema | Kit | Compose | Decisión |
|---|---|---|---|
| Fondo del docked | Sin fondo | `ContainerColor = Surface` | Kit (ADR-0004: manda en lo visual). Sobre una página `surface` se ven igual; sin fondo, el rail toma el de su contenedor. No hay tercera fuente: `@material/web` no tiene rail (`docs/components/`, consultado el 2026-11-25). |
| Radio del indicador | 16 (vertical), 28 (sin etiqueta y horizontal, "radio completo") | `CornerFull` | Es lo mismo (la mitad del alto). matekit usa `corner-large` y `corner-extra-large`, no `corner-full`, porque el radio anima al expandir. |
| Rail contraído flotante | No existe (Floating solo en el expandido) | El modal contraído usa la forma del docked | matekit acepta `variant="floating"` contraído y lo dibuja como el docked; el fondo aparece al expandir. |
| Separación entre destinos expandidos | No la anota | 0 | Compose (el kit la confirma indirectamente con el alto de 224). |

## Indicadores de progreso (lineal y circular)

Revisión del 2026-11-25. Archivos (en `compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/`):
`tokens/LinearProgressIndicatorTokens.kt`, `tokens/CircularProgressIndicatorTokens.kt`,
`tokens/ProgressIndicatorTokens.kt`, `tokens/MeasurementTokens.kt` y `WavyProgressIndicator.kt`
(commit `76990c62ac`, 2026-11-24); `ProgressIndicator.kt` (`080d2b3e53`, 2026-07-24);
`internal/LinearWavyProgressModifiers.kt` e `internal/CircularWavyProgressModifiers.kt`
(`acea2f5c1f`, 2026-11-04); `internal/ShapeUtil.kt` (`e6d33dd5d0`). Ejemplos de grosor 8:
`samples/.../ProgressIndicatorSamples.kt` (`acea2f5c1f`). El kit trae el circular como vectores
rellenos (`05-medidas.md` § Indicadores de progreso), así que grosor, separación, onda y todas
las animaciones salen de acá.

### Lo que confirma

Grosor 4 (`ActiveThickness`, `TrackThickness`), separación 4 (`TrackActiveSpace` = `Space50`),
punto final de 4 (`StopSize`) a `(grosor - 4) / 2` del final como máximo 6
(`StopIndicatorTrailingSpace`): 0 con grosor 4 y 2 con grosor 8, como el kit. Pista
`SecondaryContainer`, indicador y punto `Primary`, formas `CornerFull` (`ProgressIndicatorTokens`).
Longitud de onda del lineal 40 y 20 en el indeterminado; circular de 40 (plano) y 48 (con onda),
y 44 y 52 con grosor 8 en los ejemplos, igual que el kit.

### Datos nuevos (el kit no los trae)

| Dato | Fuente |
|---|---|
| Onda del lineal: cuadráticas alternadas con el control a `height - stroke` (6) del centro; la curva llega a 3 (`ActiveWaveAmplitude`). La primera baja | `LinearProgressDrawingCache.updateFullPaths` |
| La onda se desplaza **una longitud de onda por segundo**, hacia el inicio | `waveSpeed = wavelength`; `updateDrawPaths` (`getSegment` desde cola + desfase y traslado de vuelta) |
| Amplitud del determinado: **0 hasta el 10 % y desde el 95 %**, 1 en el medio; el cambio dura 500 ms (`DurationLong2`), con `EasingStandard` al crecer y `EasingEmphasizedAccelerate` al aplanarse | `indicatorAmplitude`, `IncreasingAmplitudeAnimationSpec`, `DecreasingAmplitudeAnimationSpec` |
| Cerca de 0, la separación se achica (`min(cabeza - extremo, 4)`) y no se cuentan los extremos redondos hasta que la cabeza pasa el primero | `updateDrawPaths` (`adjustedTrackGapSize`, `adaptiveTrackSpacing`) |
| El punto final se achica cuando la cabeza lo alcanza y desaparece al 100 % | `drawStopIndicator` (lineal ondulado) |
| Compose no anima los cambios de valor; recomienda `WavyProgressIndicatorDefaults.ProgressAnimationSpec` (500 ms, lineal) | KDoc de `LinearWavyProgressIndicator` |
| Lineal indeterminado: ciclo de 1750 ms con dos líneas; cabeza y cola con demoras 0/250 (primera, 1000 ms) y 650/900 (segunda, 850 ms), `EasingEmphasizedAccelerate` | `ProgressIndicator.kt` (constantes `LinearAnimationDuration`, `First/SecondLine*`) |
| Circular indeterminado: ciclo de 6000 ms; barrido de 0,1 a 0,87 y de vuelta; 1080° de giro lineal; cuatro giros de 90° de 300 ms cada 1500 ms; con onda, giro base de 90° (el arco empieza a las 3, como el plano) | `circularIndeterminate*AnimationSpec`, `CircularIndeterminateBaseRotation` |
| En los `keyframes` de Compose, `using` fija el easing del tramo que **empieza** en ese fotograma (por defecto, lineal). Por eso en el circular la subida del barrido y los giros de 90° son lineales y solo la bajada del barrido usa `EasingStandard` | `AnimationSpec.kt` (`KeyframeEntity`, easing por defecto `LinearEasing`; KDoc de `using`: "for the next interval") |
| Circular con onda: estrella de `round(2π · 22 / 15)` = **9 puntas** (`innerRadius` 0,75), escalada a `size - stroke` = 44 en los dos grosores; la pista es un círculo de 9 vértices de radio 21,45. La onda mide 1,58 de amplitud, el `ActiveWaveAmplitude` de 1,6 (el código no usa ese token: sale de la estrella) | `CircularShapes.update`; generado con `pnpm shapes` en `src/molecules/ProgressIndicator/circular-wavy-data.ts` |
| La onda del circular se desplaza girando el trazo hacia atrás mientras el tramo avanza lo mismo: 1 s por onda, 9 s por vuelta | `startOffsetAnimation`, `updateDrawPaths` |
| Con las animaciones del sistema apagadas, el indeterminado se detiene (no hay versión propia) | `animateIndeterminateCycle` (`MotionDurationScale`) |

### Conflictos y decisiones

| Tema | Kit | Compose | Decisión |
|---|---|---|---|
| Alto del lineal | Contenedor de 12 (14 con onda y grosor 8) | El grosor (4 u 8) plano; 10 (`LargeHeight`) y 14 con onda | Compose: el elemento mide lo que se dibuja (una barra plana de 4 no reserva 8 de aire). El 12 del kit parece un marco común a las variantes (14 coincide con Compose). |
| Alto de la onda del lineal | "Onda de 12 de alto, medida del trazado" | Curva de ±3 (6 de alto) con los controles de las cuadráticas a ±6 | Compose. Hipótesis, sin verificar: el 12 del kit es el alto de los puntos de control (±6), no de la curva; con 12 de curva no entraría en su propio contenedor de 14 con grosor 8. |
| Separación del circular plano | 4 (los dos grosores, `TrackActiveSpace`) | `CircularProgressIndicator` convierte la separación a ángulo con el **diámetro exterior**: se ven 3,2 (grosor 4) y 1,8 (grosor 8). El ondulado la mide sobre el trazo y da 4 exactos | 4 exactos en los dos, con el cálculo del ondulado. |
| Pista del circular indeterminado plano | El conjunto (pista e indicador) gira | `circularIndeterminateTrackColor = Transparent` (sin pista); el ondulado sí la tiene | Con pista, como el kit y el ondulado. |
| Paso de indeterminado a determinado | — | Las líneas terminan de salir y el valor crece desde 0 (lineal), o el arco gira hasta las 12 (circular) | Sin transición: necesitaría estado (cliente). Pendiente si hace falta. |

## Slider

Revisión del 2026-11-25. Archivos (en `compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/`):
`tokens/SliderTokens.kt` (commit `76990c62ac`, 2026-11-24) y `Slider.kt` (`1495ff32c4`,
2026-10-22; `SliderDefaults`, `ThumbContent`, `drawTrack`, `slideOnKeyEvents`). No hay tokens por
tamaño (`SliderXSmallTokens.kt` y similares no existen): los tokens describen el tamaño XSmall
(pista de 16, handle de 4 × 44), y los cinco tamaños salen del kit
(`05-medidas.md` § Slider). Comportamiento web: `@material/web` (`docs/components/slider.md`,
`slider/internal/slider.ts` y `_slider.scss`) y sus tokens (`tokens/versions/v0_192/_md-comp-slider.scss`).

### Lo que confirma

Pista activa `Primary`, inactiva `SecondaryContainer`, handle `Primary` de 4 × 44 que pasa a 2 al
presionar (`PressedHandleWidth`), separación de 6 (`ActiveHandleLeadingSpace` = `Space75`), radio
2 junto al handle (`TrackInsideCornerSize`), punto de parada de 4 `OnSecondaryContainer`
(`StopIndicatorSize`, `InactiveStopIndicatorContainerColor`), indicador `InverseSurface` con
Label Large `InverseOnSurface`, deshabilitado `OnSurface` al 38 %.

### Datos nuevos (el kit no los trae)

| Dato | Fuente |
|---|---|
| El foco angosta el handle a 2, como el presionado y el arrastre (`FocusHandleWidth`); el cambio es inmediato, sin animación | `SliderTokens.kt`; `ThumbContent` (cualquier interacción de foco, presión o arrastre) |
| Con el tema de foco `InsetRing`, anillo alrededor del handle y 4 más de separación con las pistas (`insetFocusRingPadding`); el tema por defecto solo usa opacidad | `Slider.kt` (`SliderImpl`, `TrackImpl`); `Ripple.kt` (`InsetFocusRingThemeConfiguration`) |
| Los pasos que caen en la separación del handle (o en el centro del centrado) no se dibujan | `drawTrack` (`tickStartGap`, `tickEndGap`, `tickCenterGap`) |
| Pasos sobre la pista activa en `OnPrimary`; deshabilitados, `InverseOnSurface` sobre la activa y `OnSurface` sobre la inactiva | `ActiveStopIndicatorContainerColor`, `DisabledActiveStopIndicatorContainerColor`, `DisabledInactiveStopIndicatorContainerColor` |
| Teclado: Re Pág y Av Pág de a 10 % (entre 1 y 10 pasos), Inicio y Fin a los extremos, flechas de a un paso (1 % sin pasos) | `slideOnKeyEvents` |
| Área táctil mínima de 48 (`minimumInteractiveComponentSize`) | `SliderImpl` |
| `@material/web` muestra el indicador de valor con el handle enfocado (también por teclado), con el puntero encima y presionado | `_slider.scss` (`:host(:focus-within) .label`, `.handleContainer.hover .label`, `input:active`) |

### Conflictos y decisiones

| Tema | Kit | Compose | Decisión |
|---|---|---|---|
| Handle en los extremos | A 4 del borde (centro a 6), alineado con los puntos de parada a 4 | La pista empieza a 2 (medio handle) y el handle llega al borde (centro a 2); los puntos, a medio alto de la pista del final | Kit: el centro del handle va de 6 a L − 6 y los pasos caen en los mismos puntos que el handle. Sin tercera fuente (`@material/web` es anterior a Expressive). |
| Separación al angostarse | Las pistas crecen 1 de cada lado (6 desde el borde del handle de 2) | La separación se mide desde la caja de 4: se ven 7 | Kit. |
| Pasos sobre la pista activa | `Secondary Container` | `OnPrimary` | Compose, confirmado por `@material/web` (`with-tick-marks-active-container-color: on-primary`) y por la regla de pares del ADR-0008 (`secondary-container` sobre `primary` no tiene contraste garantizado). Error probable del kit. |
| Separación en el centro del centrado | 4 entre la pista inactiva y la activa | 6 (la separación del handle, con ancho 0) | Kit. |
| Pista inactiva deshabilitada | `On Surface` al 10 % | 12 % (`DisabledInactiveTrackOpacity`) | Kit (token `disabled-container-opacity`), como en el Switch. |
| Indicador de valor | 4 sobre el handle | 12 (`ValueIndicatorActiveBottomSpace` = `Space150`) | Kit; con foco de teclado, 4 más para el anillo. |
| Alto total | 44 (XSmall y Small) | 48 (área táctil) | 48 con el handle de 44 centrado, como el área de 48 del Switch. |
| Animación del handle | Sin datos | Sin animación | Resorte rápido espacial (el plan la pide); sin duración con movimiento reducido. |
| Cuándo aparece el indicador | Presionado | No lo dibuja por defecto | Presionado, arrastrando y con foco de teclado (`@material/web`): con el teclado no hay otra forma de ver el número. No con hover. |
| Punto centrado del rango ("Track dot - centered") | Con los dos handles en el mismo valor | Sin equivalente | Sin implementar: no está claro dónde va con los handles superpuestos. Pendiente de mirar en el kit. |

## Card

Revisión del 2026-11-25. Archivos (en `compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/`,
commit `0594f962db80b7deafaaa83d08d4edbe55aa4ccd` de `androidx-main`): `tokens/ElevatedCardTokens.kt`,
`tokens/FilledCardTokens.kt`, `tokens/OutlinedCardTokens.kt` y `Card.kt` (`CardDefaults`,
`CardElevation.animateElevation`). `@material/web` no tiene card estable en `docs/components/`;
en `labs/card/` (commit `5c6c0471bb`) es solo una superficie sin interacción, con el contorno
encima del contenido y un borde transparente en los tres estilos "para el modo de alto contraste".

### Lo que confirma

Radio `CornerMedium` (12) en los tres; contenedores `SurfaceContainerLow` (elevated),
`SurfaceContainerHighest` (filled) y `Surface` con borde de 1 `OutlineVariant` (outlined);
elevated en nivel 1, hover 2, presionado 1, arrastrado 4; outlined arrastrado 3; hover del filled
en nivel 1.

### Datos nuevos (el kit no los trae)

| Dato | Fuente |
|---|---|
| Foco del filled: nivel 0 (como en reposo); del elevated: nivel 1; del outlined: nivel 0 | `*CardTokens.FocusContainerElevation` |
| Arrastrado del filled: nivel 3 | `FilledCardTokens.DraggedContainerElevation` |
| Deshabilitada: contenido `OnSurface` (el color de contenido del contenedor) al 38 % | `CardDefaults.*CardColors` (`DisabledAlpha`) |
| Deshabilitada, contenedor: elevated `Surface` al 38 % sobre `Surface` (o sea `Surface`) con nivel 1; filled `SurfaceVariant` al 38 % sobre `SurfaceContainerHighest`, nivel 0 (con un TODO: "valor desactualizado"); outlined `Surface` | `defaultElevatedCardColors`, `defaultCardColors`, `defaultOutlinedCardColors`, `DisabledContainerElevation` |
| Deshabilitada, borde del outlined: `Outline` al 12 % sobre `SurfaceContainerLow` | `outlinedCardBorder(enabled = false)` |
| Al pasar a deshabilitada, la elevación salta sin animación | `animateElevation` (`snapTo`) |

Los datos de deshabilitada no se usan (decisión del autor, 2026-11-25; ADR-0015, actualización):
el kit no tiene Card deshabilitada (Enabled, Hovered, Focused, Pressed, Dragged) y Compose la
tiene solo en la Card clicable, donde toda la tarjeta es el botón. En matekit, con controles
adentro que seguían activos, se veía deshabilitada sin estarlo. Si la acción principal es un
`<button disabled>`, la tarjeta solo deja de reaccionar, sin colores propios.
| Anillo de foco en `Secondary` | `*CardTokens.FocusIndicatorColor` |

### Conflictos y decisiones

| Tema | Kit | Compose | Decisión |
|---|---|---|---|
| Elevación del filled presionado | 1 | 0 (`PressedContainerElevation`) | Kit. |
| Elevación del outlined con el puntero | 1 | El token dice 1 (`HoverContainerElevation`), pero `outlinedCardElevation()` usa el reposo (0) para hover, foco y presionado | Kit, que coincide con el token. |
| Borde del outlined con foco | Sin dato | `FocusOutlineColor` = `OnSurface`, pero `outlinedCardBorder` no lo usa | Sin cambio de borde: Compose tampoco lo aplica; el foco lo marca el anillo. Pendiente de mirar en el kit (Focused del outlined). |
| Capa de presionado | 10 % | Onda (ripple) | 8 % más la onda, como Button y FAB (el kit suma la onda sobre la capa de hover). |

## List

Revisión del 2026-11-25. Archivos (en `compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/`
de `androidx-main`): `tokens/ListTokens.kt` y `tokens/ExpandedListTokens.kt` (commit `76990c62ac`
del 2026-11-24), `ListItem.kt` (`a4587705ec`, 2026-11-20) y `ListItemDefaults.kt` (`d70f2bdb44`,
2026-11-19). Uso y accesibilidad web: `@material/web` `docs/components/list.md` (commit
`12ec8884a6`): `md-list` con `role="list"`, elementos `type="text" | "link" | "button"` y flechas
con tabindex itinerante (matekit usa Tab por elemento, ADR-0018).

### Lo que confirma

Relleno 10 arriba y abajo (`ItemTopSpace`/`ItemBottomSpace` = Space125), 16 a los lados y 12 entre
partes (Space150); texto principal Body Large `OnSurface`, apoyo Body Medium `OnSurfaceVariant`,
iconos de 20 (`Item*IconExpressiveSize`) en `OnSurfaceVariant`, avatar de 40, imagen de 56, video
de 114 × 64; reposo `CornerExtraSmall`, hover `CornerMedium`, foco, presionado y seleccionado
`CornerLarge`; seleccionado `SecondaryContainer` con contenido `OnSecondaryContainer`; segmentada:
contenedor `CornerLarge`, separación Space25 (2) y elementos `Surface`; acordeón: indicador redondo
`Surface` cerrado y `SurfaceContainer` abierto.

### Conflictos (se sigue el kit salvo donde se indica)

| Dato | Kit | Compose | matekit |
|---|---|---|---|
| Alto mínimo con una, dos y tres líneas | 52, 64, 80 | 56, 72, 88 (`Item*LineContainerHeight`) | Kit. Con la misma tipografía y rellenos de 10, el contenido mide 44, 64 y 80: el kit coincide con el contenido; Compose redondea a los altos de Material 3 anterior. |
| Overline | Label Medium | Label Small (`ItemOverlineFont`) | Kit |
| Texto final | Label Large | Label Small (`ItemTrailingSupportingTextFont`) | Kit |
| Radio de la imagen y el video de inicio | 4 | `CornerSmall` (8) (`ItemLeadingImageExpressiveShape`, `ItemLeadingVideoShape`) | Kit |
| Caja del icono de inicio | 20 × 28 | 20 | Sin el alto de 28: en la grilla de la fila, un `min-block-size` en la parte de inicio hacía que Chrome agrandara las filas flexibles 2 px. Alineado arriba, el icono se centra en la primera línea (2 de margen). |
| Seleccionado y deshabilitado, fondo | `OnSurface` al 10 % | `OnSurface` al 38 % (`ItemSelectedDisabledContainerOpacity`) | Kit (y `--md-sys-state-disabled-container-opacity`, como Button) |

### Datos nuevos (el kit no los trae)

| Dato | Fuente | Uso |
|---|---|---|
| Prioridad de la forma: presionado > arrastrado > seleccionado > foco > hover > reposo | `shapeForInteraction` | Orden de las reglas de estado en `list.css` |
| Segmentada: solo la forma de reposo toma las esquinas exteriores; hover, foco, presionado y seleccionado usan su forma en las cuatro esquinas | `segmentedShapes` (cambia solo `shape`) | `--_state-radius` gana sobre las esquinas de Group |
| Divisores con 16 de sangría a cada lado | `DividerLeadingSpace`/`DividerTrailingSpace` (Space200) | Borde superior de cada elemento salvo el primero |
| Avatar con iniciales en `PrimaryContainer`/`OnPrimaryContainer`, Title Medium | `ItemLeadingAvatar*` | `ListItemLeading variant="avatar"` |
| Anillo de foco `Secondary` | `FocusIndicatorColor` | Por dentro; en el seleccionado, `OnSecondaryContainer` (Secondary sobre Secondary Container da 1,4:1) |
| Selección: en el elemento de selección simple el rol es radio y `selected = checked`; en el múltiple, casilla y `selected = checked` | `ListItem(selected, onClick)` y `ListItem(checked, onCheckedChange)` | Casilla o radio marcados = seleccionado. El switch no (decisión de matekit: es un ajuste) |
| El control final mide 20 dentro de la fila: el área táctil la da la fila | `TrailingDecorator` (`LocalMinimumInteractiveComponentSize` menos el relleno) | El control se mete en el relleno (casilla a 17 del borde) |
| Alineación por defecto: centrada en los cortos y arriba en los altos | `ListItemDefaults.verticalAlignment()` | No se copia (CSS no conoce el alto final): `align="top"` explícito |

## Chips

Revisión del 2026-11-25. Archivos (en `compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/`
de `androidx-main`, commit `0d8bdbdb7f`): `tokens/AssistChipTokens.kt`, `tokens/FilterChipTokens.kt`
(último cambio `76990c62ac`, 2026-11-24), `tokens/InputChipTokens.kt`, `tokens/SuggestionChipTokens.kt`,
`tokens/ChipsTokens.kt` y `Chip.kt` (último cambio `12f682dfc6`, 2026-09-14). Uso y accesibilidad
web: `@material/web` `docs/components/chip.md` y `chips/internal/{chip-set,multi-action-chip,input-chip,filter-chip,trailing-icons}.ts`
(commit `875a8b6b88`). Teclado de quitar: React Aria `packages/react-aria/src/tag/useTag.ts` y
`useTagGroup.ts` (commit `aadf9e27c0`).

### Lo que confirma

Alto 32, `CornerSmall` (8), Label Large, iconos de 18 y avatar de 24, borde de 1 `OutlineVariant`,
elevated `SurfaceContainerLow` con nivel 1, seleccionado `SecondaryContainer` sin borde con texto y
marca `OnSecondaryContainer`, texto del assist `OnSurface` y de los otros `OnSurfaceVariant`, icono
final `OnSurfaceVariant`, filter outlined seleccionado con el puntero a nivel 1
(`FlatSelectedHoverContainerElevation`), arrastrado a nivel 4, contenido deshabilitado `OnSurface`
al 38 %, separación de 8 entre partes (`HorizontalElementsPadding`).

### Conflictos

| Dato | Kit | Compose | matekit |
|---|---|---|---|
| Forma del input chip con avatar | Redondo | `ContainerShape` `CornerSmall` (solo el avatar es `CornerFull`) | **Kit.** Tercera fuente: `@material/web` `chips/internal/_input-chip.scss` usa la mitad del alto del contenedor con `avatar`. |
| Icono de inicio del input sin seleccionar | `Primary` | `OnSurfaceVariant` (`UnselectedLeadingIconColor`; con hover, foco y presionado pasa a `Primary`) | Kit |
| Icono de inicio seleccionado del suggestion (kit) y del input (Compose) | `Primary` (suggestion) | `Primary` (input, `SelectedLeadingIconColor`) | **`OnSecondaryContainer`** en los dos: `Primary` sobre `SecondaryContainer` mide entre 1,4 y 2,5:1 en las 24 combinaciones de paleta, nivel y tema (`contrast.test.tsx`), y ADR-0008 solo garantiza on-X sobre X. |
| Deshabilitado: borde del outlined y fondo del elevated y del seleccionado | `OnSurface` al 10 % y `OnSurfaceVariant` al 10 % | `OnSurface` al 12 % los dos | Kit (con `--md-sys-state-disabled-container-opacity`, como Button y List) |
| Fondo del outlined con el puntero o el foco | `Surface` | Sin fondo (solo la capa) | Kit |
| Borde del outlined con foco | Sin cambio | `FlatFocusOutlineColor` (`OnSurface` en el assist, `OnSurfaceVariant` en los otros) | Kit (el foco lo marca el anillo) |
| Rellenos | 16/16 texto, 8/16 con icono, 16/8 con icono final; input 12, 8 o 4 al inicio y 8 al final | `ContentPadding` de 8 a cada lado más `HorizontalSpacing` 8 entre partes; input 4 u 8 al inicio (`contentPadding`) | Kit (los valores del kit son los resultantes; Compose los arma con relleno de etiqueta) |
| Suggestion seleccionado | Existe | No existe | Kit: `selected` en el `SuggestionChip` (toggle con `aria-pressed`) |

### Datos nuevos (el kit no los trae)

| Dato | Fuente | Uso |
|---|---|---|
| Elevated: nivel 2 con el puntero, 1 con foco y presionado, 0 deshabilitado | `Elevated*ContainerElevation` (assist, filter y suggestion) | `--_elevation-hover` |
| Área táctil de 48 | `Surface(onClick)` aplica `minimumInteractiveComponentSize` | `::before` de 48 de alto en el chip y en el botón de quitar |
| Avatar deshabilitado al 38 % | `DisabledAvatarOpacity` | Opacidad del `ChipAvatar` |
| Ancho máximo de 1000 dp para animar dentro de un desplazamiento | `maxChipWidth` | No se copia: en web, `max-inline-size: 100%` del contenedor y recorte de la etiqueta |

### No aplicado

- **`ChipsTokens.kt`** (Expressive, sobrecargas experimentales con `shapes: ChipShapes`): forma por
  estado (reposo `CornerMedium` 12, seleccionado `CornerFull`, presionado `CornerSmall`), separación
  de 4 (`GapHorizontal` = Space50), rellenos de 16 en el filter y 12 en el input, borde deshabilitado
  al 10 %. El kit de Expressive dibuja todos los chips con radio 8 fijo y rellenos distintos, así que
  se sigue el kit. Si el kit adopta esa forma, va como una variante nueva.
- **Arrastrado** (nivel 4, capa al 16 %): sin arrastre en esta entrega; las variables quedan (la capa
  ya responde a `[data-dragged]`).
- La animación de entrada de la marca del filter (`AnimatingChipContent`, expandir con FastSpatial):
  la marca aparece sin animar.

## Tooltip

Fuentes (2026-11-26): `tokens/PlainTooltipTokens.kt` y `tokens/RichTooltipTokens.kt` (versión
41.1.19), `Tooltip.kt` (los tres con último commit `76990c62ac`, 2026-11-24) e
`internal/BasicTooltip.kt` (commit `5a2d24b9bd`, 2026-11-13), en
`compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/`. Tercera fuente para
los conflictos y para el comportamiento con mouse en web: material-components-web,
`packages/mdc-tooltip/constants.ts` y `foundation.ts` (commit `817002c296`, 2022-12-13), la
implementación web de Google del tooltip de Material 2; `@material/web` no tiene componente de
tooltip (ni en `labs`), solo los tokens `_md-comp-plain-tooltip.scss` y `_md-comp-rich-tooltip.scss`.

### Lo que confirma

- Plain: `Inverse Surface`, `Inverse On Surface`, Body Small, radio `CornerExtraSmall` (4), relleno
  4/8 (`PaddingVertical` Space50, `PaddingHorizontal` Space100), alto mínimo 24.
- Rich: `Surface Container`, radio `CornerMedium` (12), elevación `Level2`, subtítulo Title Small y
  texto Body Medium en `On Surface Variant`, acciones Label Large en `Primary` (los botones de texto).

### Conflictos

| Dato | Kit | Compose | Decisión |
|---|---|---|---|
| Ancho máximo del plain | Multilínea de 200 | `PlainTooltipTokens.MaxWidth` 320, pero `TooltipDefaults.plainTooltipMaxWidth` 200 (el que usa `PlainTooltip`) | 200: kit, `TooltipDefaults` y MDC (`MAX_WIDTH: 200`) |
| Ancho del rich | 312 | `richTooltipMaxWidth` 320 (máximo; se achica con el contenido) | Hasta 312 (kit), achicándose con el contenido como Compose |
| Relleno del rich | 12 arriba, 4 abajo del contenido, separación 4; acciones a 8 del contenido y 8 abajo | Líneas de base: 28 al subtítulo, 24 al texto; 16 debajo del texto; acciones de 36 de alto mínimo con 8 abajo | Kit con acciones; sin acciones (el kit no lo dibuja), 16 debajo del texto como Compose |
| Alto máximo del plain | Sin dato | `MaxHeight` 56, que `PlainTooltip` no aplica | No se aplica: recortaría el único contenido |

### Comportamiento (Compose y web)

| Aspecto | Compose | matekit | Motivo |
|---|---|---|---|
| Mouse | Aparece al entrar y se va al salir, sin demora (`PointerEventType.Enter`/`Exit`) | 500 ms para aparecer y 600 ms para irse (MDC `SHOW_DELAY_MS`, `HIDE_DELAY_MS`); el siguiente aparece al instante si hay uno visible | Sin demora, cruzar una barra de iconos abre un tooltip por botón; la demora de salida deja pasar el puntero al tooltip (WCAG 1.4.13) |
| Foco de teclado | Aparece enseguida y se va a los 1500 ms (`TooltipDuration`, no persistente) | Aparece enseguida y queda mientras dure el foco | WCAG 1.4.13 (persistente); APG |
| Táctil | Pulsación larga (la del sistema), 1500 ms; consume el "up" | Pulsación larga de 500 ms (MDC), 1500 ms después de soltar, sin menú contextual ni clic | Igual que Compose; el umbral, de MDC |
| Escape | Cierra (`isEscape`) | Cierra sin mover el foco; no vuelve hasta salir y entrar o reenfocar | APG, WCAG 1.4.13 |
| Uno a la vez | `GlobalMutatorMutex` | Coordinador de módulo; un rich con acciones abierto no lo cierra un tooltip pasajero | Igual |
| Persistente con acción | `isPersistent`, `focusable` forzado con acción para accesibilidad; se abre también con el mouse | Diálogo no modal que se abre con un clic (ADR-0021) | APG: un tooltip no puede tener interactivos |
| Posición | `TooltipAnchorPosition.Above`: centrado arriba, abajo si no entra, dentro de la ventana; 4 de separación (`SpacingBetweenTooltipAndAnchor`, `GapTrigger`) | Igual, con CSS anchor positioning | — |
| Animación | Escala 0,8 → 1 (FastSpatial) y opacidad (FastEffects), desde el centro | Igual; con movimiento reducido, solo opacidad | — |
| Flecha | Opcional (`caretShape`) | Sin flecha | El kit no la trae |

## Snackbar

Fuentes (2026-11-26): `tokens/SnackbarTokens.kt` y `Snackbar.kt` (último commit `76990c62ac`,
2026-11-24) y `SnackbarHost.kt` (commit `7ac433e44e`, 2026-09-02), en
`compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/`. Tercera fuente:
material-components-web, `packages/mdc-snackbar/` (`constants.ts`, `_snackbar-theme.scss` y
`util.ts`, commit `a246a4439c`), la implementación web de Google del snackbar de Material 2.
`@material/web` no tiene snackbar (ni en `labs`, revisado el 2026-11-26: badge, card, item,
navigationbar, navigationdrawer, navigationtab, segmentedbutton).

### Lo que confirma

- `Inverse Surface`, texto Body Medium en `Inverse On Surface`, radio `CornerExtraSmall` (4),
  elevación `Level3`, alto 48 (`ContainerHeight`) y 68 con dos líneas (`LargeContainerHeight`).
- Acción Label Large en `Inverse Primary` (también en foco, hover y presionado); icono de cerrar de 24
  en `Inverse On Surface`.
- Texto con 14 arriba y abajo (`SnackbarVerticalPadding`) y 16 al inicio (`HorizontalSpacing`); la
  acción larga debajo del texto, alineada al final, con 4 abajo (`ActionButtonBottomPadding`) y 8 al
  final sin cerrar (`HorizontalSpacingButtonSide`), como el kit (112 con dos líneas).

### Conflictos y datos nuevos

| Dato | Kit | Compose | Decisión |
|---|---|---|---|
| Ancho | 344 (el del ejemplo) | Llena hasta `ContainerMaxWidth` 600, sin mínimo | Ancho del contenido entre 344 (kit y `min-width` de MDC) y 600 (Compose; MDC dice 672). En ventanas compact (< 600), todo el ancho menos los márgenes |
| Margen con la ventana | Sin dato | `padding(12.dp)` alrededor del snackbar del host | 12 a los lados y abajo (MDC usa 8 en angostas y 24 en anchas) |
| Separación texto–acción | 4 | Sin separación fija (el texto ocupa lo que sobra) | 4 (kit) |
| Acción larga | Debajo del texto | `actionOnNewLine`, una prop | Prop `actionOnNewLine` (no se decide por medida) |
| Tooltip en el cerrar | Sin dato | `TooltipBox` con "Dismiss" sobre el `IconButton` | Sin tooltip: el botón ya tiene nombre, y el Escape del tooltip se llevaría el primer Escape del snackbar (ADR-0022) |
| Duraciones | Sin dato | `Short` 4000, `Long` 10000, `Indefinite`; por defecto `Indefinite` con acción y `Short` sin ella; Android las alarga con `calculateRecommendedTimeoutMillis` (ajuste del sistema) | Iguales; en web no hay ajuste del sistema: el tiempo se detiene con el puntero, el foco y la pestaña oculta (WCAG 2.2.1). MDC: 5000 por defecto, entre 4000 y 10000 |
| Animación | Sin dato | Opacidad con FastEffects y escala 0,8 → 1 con FastSpatial (`FadeInFadeOutWithScale`); el siguiente entra mientras el anterior sale | Igual, pero el siguiente entra cuando el anterior terminó de salir (un solo popover); con movimiento reducido, solo opacidad |
| Accesibilidad | Sin dato | `liveRegion = Polite` en el visible, `paneTitle` y la acción `dismiss` de accesibilidad | Región viva `role="status"` que existe siempre en el host y recibe el texto un cuadro después (MDC hace algo parecido en `util.ts`: vacía y repone el texto para que se anuncie); F6 y Escape (ADR-0022) |
| Resultado | Sin dato | `ActionPerformed` o `Dismissed` (el tiempo cuenta como `Dismissed`) | `'action'`, `'dismiss'`, `'timeout'` o `'cancel'` |

## Tabs

Revisado el 2026-11-26 para el ítem 18 (ADR-0023). Archivos en
`compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/`:
`tokens/PrimaryNavigationTabTokens.kt` y `tokens/SecondaryNavigationTabTokens.kt` (commit
`76990c62ac`, 2026-11-24), `Tab.kt` y `TabRow.kt` (commit `c61c795a52`, 2026-11-09), `Badge.kt`
(commit `bbc070798f`). Uso web: `@material/web` `docs/components/tabs.md` (commit `12ec8884a6`),
`tabs/internal/tab.ts` (`dba9f5fe40`), `tabs.ts` (`9bbe75a492`), `_tab.scss` (`0a1f511ed8`),
`_tabs.scss` (`274ce3e4e0`) y `tokens/versions/v0_192/_md-comp-primary-navigation-tab.scss`.

### Lo que confirma

- Barra en `Surface`, sin elevación; etiqueta Title Small; alto 48 (`ContainerHeight`); icono de 24.
- Primary: indicador de 3 en `Primary`, etiqueta e indicador de la elegida en `Primary`, sin elegir
  `On Surface Variant`. Secondary: indicador de 2 en `Primary`, elegida `On Surface`.
- Relleno de 16 a los lados (`HorizontalTextPadding`); icono y etiqueta en línea con 8 de separación
  (`TextDistanceFromLeadingIcon`); 52 de margen en la scrollable (`ScrollableTabRowEdgeStartPadding`).

### Conflictos

| Dato | Kit | Compose | Decisión |
|---|---|---|---|
| Alto con icono y etiqueta (primary) | 64 | `LargeContainerHeight` 64 en los tokens, pero `Tab.kt` usa `LargeTabHeight = 72.dp` | 64 (kit y tokens; el 72 es de la versión anterior del layout de dos líneas) |
| Forma del indicador primary | Radio completo arriba, 0 abajo | `ActiveIndicatorShape = RoundedCornerShape(3.dp)` en las cuatro esquinas, con un TODO que lo da por desactualizado (b/588071802) | Kit |
| Ancho del indicador primary | Ancho del contenido menos 2 por lado (20 sobre 24) | Ancho del contenido, mínimo 24 (`maxOf(contentWidth, 24.dp)`, "minimum touch target") | Kit (el mínimo de 24 no tiene sentido para algo que no se toca); el indicador de solo icono mide 20 |
| Margen de la scrollable | 52 al inicio | 52 a los dos lados (`layoutWidth = padding * 2 + …`) | 52 a los dos lados: el kit muestra solo el principio de la barra |

### Datos nuevos (el kit no los trae)

- Sin elegir con el puntero, el foco o presionada: etiqueta e icono `On Surface`
  (`Inactive{Hover,Focus,Pressed}{Icon,LabelText}Color`; en la secondary,
  `{Hover,Focus,Pressed}*`). Icono como la etiqueta en cada estado. Anillo de foco `Secondary`.
- Capa de estado: `Primary` en la elegida y `On Surface` en las demás (tokens de `@material/web`;
  Compose usa `selectedContentColor` para la onda de todas, que en la primary es `Primary`). El kit
  dice "capa Primary al 8 %" sin separar elegida y no elegida: se sigue a `@material/web`.
- Ancho mínimo de pestaña en la scrollable: 90 (`ScrollableTabRowMinTabWidth`).
- Movimiento: el indicador va de una pestaña a otra con `DefaultSpatial` (`tabIndicatorAnimationSpec`);
  el color con `DefaultEffects` al cambiar la elegida; la scrollable centra la elegida con
  `DefaultSpatial` (`ScrollableTabData.calculateTabOffset`). `@material/web` desliza el indicador
  con FLIP (`translateX` y `scaleX`, 250 ms con su easing enfatizado) y con movimiento reducido lo
  hace aparecer con un fundido.
- Insignia: `Tab` aplica `badgeBounds()` (la insignia de un `BadgedBox` queda dentro de la
  pestaña); va sobre el icono como en la barra de navegación.
- Deshabilitada: `Tab(enabled = false)` no cambia el color (`TabTransition` no recibe `enabled`) y
  `@material/web` no tiene pestañas deshabilitadas. matekit usa el deshabilitado general de Material 3
  (contenido `On Surface` al 38 %) para que se distinga.
- Dos líneas de etiqueta (`DoubleLineTextBaselineWithIcon`): no se aplica; en las fijas la etiqueta
  va en una línea y se recorta (ver ADR-0023).
- `@material/web`: activación manual por defecto (`autoActivate = false`), anillo de foco por dentro
  de radio 8 que en la elegida termina 1 arriba del indicador, barra sin barra de desplazamiento
  (`scrollbar-width: none`) y la pestaña traída a la vista con 48 de margen. matekit usa la
  activación automática por defecto (APG, con paneles que se muestran al instante) y centra como
  Compose.

## Top app bar

Revisado el 2026-11-26 para el ítem 19 (ADR-0024). Archivos en
`compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/`:
`tokens/AppBarTokens.kt`, `tokens/AppBarSmallTokens.kt`, `tokens/AppBarMediumFlexibleTokens.kt`,
`tokens/AppBarLargeFlexibleTokens.kt`, `tokens/AppBarMediumTokens.kt` y `tokens/AppBarLargeTokens.kt`
(commit `76990c62ac`, 2026-11-24), `AppBar.kt` (commit `ed93193ac9`, 2026-11-11). Uso web:
`@material/web` no tiene top app bar estable; `labs/gb/components/appbar/` (commit `9200eb8a0e`,
2026-09-21) trae tokens y una directiva que pone `app-bar-scrolled` con un evento `scroll`.

### Lo que confirma

- Small de 64 (`AppBarSmallTokens.ContainerHeight`), título Title Large, subtítulo Label Medium,
  relleno de 4 a los lados (`LeadingSpace`/`TrailingSpace` = `Space50`), sin separación entre
  acciones (`IconButtonSpace` = `Space0`), avatar de 32 e iconos de 24.
- Medium flexible de 112 con título Headline Medium y subtítulo Label Large; large flexible de 120
  con título Display Small y subtítulo Title Medium (los tokens y `labs` coinciden).
- Título On Surface, subtítulo On Surface Variant, Surface Container al desplazar
  (`OnScrollContainerColor`). Search de 56, radio completo, Surface Container, texto Body Large On
  Surface Variant (para el ítem 21).

### Conflictos y datos nuevos (el kit no los trae)

| Dato | Kit | Compose | Decisión |
|---|---|---|---|
| Fondo en reposo | Flat "sin relleno" | `ContainerColor` = Surface | Surface opaca: la banda tiene que tapar al título que se colapsa por debajo |
| Sombra al desplazar | Sin sombra | `OnScrollContainerElevation` = Level2 en los tokens, pero `AppBar.kt` solo pinta el color; `labs` sí suma `shadow-2` | Sin sombra (kit y la implementación de Compose) |
| Color del icono de inicio y de las acciones | No se distingue | `LeadingIconColor` On Surface, `TrailingIconColor` On Surface Variant | Compose |
| Alto con subtítulo | Medium 112 y large 120 (sin subtítulo) | 136 y 152 (`LargeContainerHeight`) | Compose; coincide con sumar el subtítulo a las medidas del kit (4 + 20 en el medium, 8 + 24 en el large) |
| Medium y large "no flexible" | — | `MediumTopAppBar` 112 con Headline Small y `LargeTopAppBar` 152 con Headline Medium | No se hacen: el medium y el large del kit son los flexible |
| Medium/large pinned | El kit muestra On-scroll para todos los tamaños | `TwoRowsTopAppBar` toma el color de `collapsedFraction`: sin colapsar no cambia nunca | matekit cambia el color del medium y el large fijos cuando hay contenido debajo, como el small (definición del kit) |

- Alto variable: la fila del título mide `max(alto, alto del título)` (`TopAppBarMeasurePolicy`):
  el título de las flexible ocupa las líneas que necesite y la barra crece.
- Título expandido apoyado abajo (`titleBottomPadding` de 24 en el medium y 28 en el large, medido
  desde la línea base). matekit sigue al kit (12 desde la caja de la línea del texto), que con los
  altos de línea de los tokens suma los 112 y 120 de Compose; la distancia a la línea base depende de
  la fuente y no se comparó.
  Sin icono de inicio, el título empieza a 16 (`TopAppBarTitleInset` 12 + relleno 4).
- Centrado: centrado sobre todo el ancho y corrido lejos de las acciones o el inicio si no entra
  (`placeTopAppBar`).
- Colapso: dos títulos cruzados; el chico con `TopTitleAlphaEasing` = `CubicBezierEasing(.8, 0, .8,
  .15)` y el grande con `1 - collapsedFraction`; la semántica pasa de uno a otro a la mitad. matekit
  deja siempre el grande como encabezado y oculta la copia chica (ADR-0024).
- Color: `lerp(containerColor, scrolledContainerColor, FastOutLinearInEasing(fraction))`; el medium y
  el large usan la fracción colapsada; el small, `overlappedFraction > 0.01` y anima el color con
  `DefaultEffects` en el tiempo. matekit ata el del small a los primeros 16 px de desplazamiento.
- Comportamientos: `pinned` solo cambia el color; `enterAlways` mueve `heightOffset` con cada
  desplazamiento (el small llega a esconderse entero; en el medium y el large el límite es la segunda
  fila, así que colapsan al small y no se esconden) y se acomoda al soltar (`settleAppBar`, a la
  mitad, con `snapAnimationSpec` = `DefaultEffects`); `exitUntilCollapsed` colapsa al bajar y se
  expande solo cuando el contenido vuelve al principio. Compose también deja arrastrar la barra; matekit
  no (en web el gesto es el desplazamiento del contenido).

## Sheets

Revisado el 2026-11-26 para el ítem 20 (ADR-0025). Archivos en
`compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/`:
`tokens/SheetBottomTokens.kt` y `tokens/ScrimTokens.kt` (commit `76990c62ac`, 2026-11-24),
`SheetDefaults.kt` (`5fd64f71fb`, 2026-10-27), `BottomSheet.kt` (`02b1dbcaeb`, 2026-10-07),
`ModalBottomSheet.kt` (`f22fad2ca7`, 2026-08-05), `BottomSheetScaffold.kt` y `Scrim.kt`
(`080d2b3e53`, 2026-07-24), `ComposeMaterial3Flags.kt`, `WideNavigationRail.kt` (`de12189a63`,
2026-11-11); `compose/foundation/.../gestures/AnchoredDraggable.kt` (`8f52852d7a`, 2026-11-20) y
`compose/ui/.../pointer/util/VelocityTracker.kt` (`641155416f`, 2026-11-20). Compose no tiene side
sheets: `material-components-android`, `lib/java/com/google/android/material/sidesheet/` (`d18d3119a7`,
2026-09-10).

### Lo que confirma

- Bottom sheet: `DockedContainerShape` = `CornerExtraLargeTop` (28 arriba), `DockedContainerColor` =
  Surface Container Low, asa de 32 × 4 con radio `extraLarge` (completo para 4 de alto).
- Side sheet modal: Surface Container Low y radio Corner Large (16) del lado del contenido
  (`m3_comp_sheet_side_docked_modal_container_shape` con `Corner.Left` para el de la derecha);
  standard: Surface, sin radio.

### Lo que el kit no trae (se toma de Compose o de MDC)

- Scrim: `Scrim` al 32 % (`ScrimTokens.ContainerOpacity`), aparece y se va con `DefaultEffects`.
- Ancho máximo del bottom sheet: 640 (`SheetMaxWidth`), arriba al centro, sin margen a los lados.
- Expandido: todo el alto del sheet, como mucho el de la ventana (`Expanded at max(0, fullHeight -
  sheetHeight)`); zonas seguras arriba y abajo en el relleno del contenido (`modalWindowInsets`).
- Umbrales al soltar: 56 dp de distancia (`PositionalThreshold`, absoluto: no la mitad del tramo que
  usa `AnchoredDraggable` por defecto) y 125 dp/s (`VelocityThreshold`); `computeTarget` va al ancla
  más cercana si no hay velocidad, a la siguiente en el sentido del gesto si la velocidad pasa el
  umbral, y si no, a la siguiente solo si se alejó 56 de la anterior. Velocidad de los últimos 100 ms,
  0 si el puntero se quedó quieto 40 ms (`VelocityTracker`). Touch slop de 8 dp.
- Movimiento: entrada y "expandir" con `defaultSpatialSpec` (resorte con rebote), salida y
  "contraer" con `fastEffectsSpec`; el asentamiento tras soltar con `defaultSpatialSpec`.
- Asa: al tocarla, parcial → expandido, expandido → cierra, oculto → muestra; acciones de
  accesibilidad para cerrar, expandir (si está parcial) y contraer (si está expandido y hay parcial).
- Side sheet (MDC): de alto completo contra el borde final (`layout_gravity end`), margen de 16 en el
  "detached" (no se hace), entra y sale deslizándose por ese borde.

### Diferencias y cómo se resolvieron

| Tema | Kit | Compose / MDC | Decisión |
|---|---|---|---|
| Color del asa | `Outline` | `DockedDragHandleColor` On Surface Variant | Kit (fuente 1). Los dos pasan 3:1 sobre Surface Container Low (`contrast.test.tsx`) |
| Alto de la cabecera del asa | 36 (16 arriba y abajo) | 48 (`DragHandleVerticalPadding` 22) | Kit para lo visible; el botón del asa mide 48 de ancho por el área táctil |
| Elevación | Modal sin elevación; standard 3 | `DockedModalContainerElevation` y `DockedStandardContainerElevation` = Level 1 | Kit para el modal (sin sombra); el standard no se hace en este ítem |
| Estado parcial | — | Por defecto (`isBottomSheetPartiallyExpandedDeterministicEnabled = true`) siempre existe y muestra la mitad del sheet (como mucho, de la ventana); antes, solo si el sheet pasaba la mitad de la ventana, y mostraba la mitad de la ventana | La regla anterior (ADR-0025): un sheet corto no abre a medias |
| Atrás / Escape desde expandido | — | `settleToDismiss`: si hay parcial, va al parcial | Escape cierra desde cualquier estado (APG "Dialog (Modal)") |
| Ancho del side sheet | 320 | 256 (`m3_comp_sheet_side_docked_container_width`) | Kit (fuente 1); el modal deja al menos 48 de scrim en ventanas angostas |
| Desplazamiento anidado | — | `ConsumeSwipeWithinBottomSheetBoundsNestedScrollConnection`: hacia arriba, el sheet consume antes que el contenido; hacia abajo, después (lo que sobra cuando el contenido llegó arriba) | Se decide al empezar el gesto (ADR-0025): en web no se puede pasar a mitad del gesto un desplazamiento nativo ya empezado |
| Rebote de la entrada | — | `verticalScaleUp` estira el sheet para no dejar hueco abajo | Un `::after` del color del sheet debajo |

## Search

Revisado el 2026-11-26 para el ítem 21 (ADR-0026). Archivos en
`compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/`, todos en el commit
`76990c62ac` (2026-11-24): `tokens/SearchBarTokens.kt`, `tokens/SearchViewTokens.kt`,
`tokens/AppBarTokens.kt` y `SearchBar.kt` (`SearchBar`, `TopSearchBar`, `AppBarWithSearch`,
`ExpandedFullScreenSearchBar`, `ExpandedFullScreenContainedSearchBar`, `ExpandedDockedSearchBar`,
`ExpandedDockedSearchBarWithGap`, `SearchBarDefaults`, `SearchBarState`). Tercera fuente para el color
dentro de la barra superior: `@material/web` labs, `labs/gb/components/appbar/_app-bar-tokens.scss`
(commit `9200eb8a0e`).

### Lo que confirma

- Barra de 56 (`ContainerHeight`), `CornerFull`, Surface Container High (`ContainerColor`), texto y
  ayuda en Body Large, ayuda On Surface Variant, avatar de 30.
- Docked con separación (`ExpandedDockedSearchBarWithGap`): la lista separada 2 de la barra
  (`ContainedDockedBarResultsGap` = Space25), radio 12 (`dockedDropdownShape`), mismo color que la
  barra.
- Pantalla completa contenida (`ExpandedFullScreenContainedSearchBar`): la barra con 12 a los lados
  (`ContainedLeadingMargin`/`TrailingMargin` = Space150) y la lista con radio 12
  (`ContainedDockedResultsShape` = Corner Medium).

### Lo que el kit no trae (se toma de Compose)

- Iconos de 24; inicio On Surface, final On Surface Variant; anillo de foco Secondary; caret Primary
  (`FilledTextFieldTokens.CaretColor`, como el TextField).
- Separaciones de la barra contenida: 4 entre un icono y el texto (`ContainedIconLabelGap`), 16 sin
  iconos (`ContainedNoActionsLeadingSpace`/`TrailingSpace`): con el relleno de 4 dan los 20 del kit.
- Ancho máximo 720 (`SearchBarMaxWidth`). El mínimo de 360 (`SearchBarMinWidth`) no se aplica: en
  una ventana de 320 desbordaría; la barra es fluida.
- Fondo de la vista a pantalla completa contenida: Surface Container Low (`ContainedBackgroundColor`).
- Sombra de la lista docked: Level3 (`SearchViewTokens.ContainerElevation`). Compose dibuja la
  versión con separación sin sombra pero con un scrim; en web, sin scrim (la página sigue usable
  hasta que el foco sale), la sombra la separa del contenido.
- Lista docked de hasta la mitad de la ventana (`DockedExpandedWithGapTableMaxHeightScreenRatio`).
- Animación: la contenida usa `FastSpatial` para expandir y contraer
  (`rememberContainedSearchBarState`); la barra se estira desde su lugar hasta el de la vista.
- En la barra superior: 8 a los lados (`AppBarTokens.SearchLeadingSpace`/`TrailingSpace`), 4 arriba y
  abajo (`AppBarWithSearchVerticalPadding`), Surface Container Highest al desplazar
  (`SearchOnScrollContainerColor`).
- Cuándo docked y cuándo pantalla completa: Compose no lo elige (son dos composables); matekit elige
  por la clase de ventana (ADR-0026).

### Diferencias y cómo se resolvieron

- **Color dentro de la barra superior**: el kit (página App bars) y `AppBarTokens.SearchContainerColor`
  dicen Surface Container; `SearchBar.kt` (`appBarWithSearchColors`) usa `SearchBarDefaults.colors()`,
  es decir Surface Container High, y no lee ese token. Labs de `@material/web`
  (`md.comp.app-bar.search.container.color`) también dice Surface Container. Tres contra uno: dentro
  del TopAppBar, Surface Container; suelta, Surface Container High (página Search del kit).
- **Radio de la vista a pantalla completa**: el kit muestra 16; Compose `FullScreenContainerShape` es
  Corner None. Se usa 0: la vista ocupa la ventana, y con radio se verían las esquinas de la página
  inerte detrás; los 16 del kit coinciden con las esquinas de la pantalla del teléfono de la maqueta.
- **Separación barra–lista a pantalla completa**: kit 2; Compose deja 8 abajo de la barra
  (`SearchBarVerticalPadding`). Gana el kit (y coincide con `ContainedDockedBarResultsGap`).
- **Relleno lateral de la barra a pantalla completa**: kit y tokens 12; `SearchBar.kt` usa 8
  (`FullScreenExpandedHorizontalPadding`). Ganan kit y tokens.
- **Alto mínimo de la lista docked**: Compose 240 (`DockedExpandedTableMinHeight`). No se aplica: con
  una sola sugerencia la lista quedaría vacía en sus dos tercios.
- **Elementos de 64**: el kit dibuja sugerencias de 64 (de dos líneas); las sugerencias usan las
  reglas de List (52 con una línea, 64 con dos).

## Toolbars

Leído el 2026-11-26 en `androidx/androidx`, commit `76990c62ac`, carpeta
`compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/`: `FloatingToolbar.kt`
(`HorizontalFloatingToolbar`, `VerticalFloatingToolbar`, `FloatingToolbarDefaults`,
`FloatingToolbarScrollBehavior`, `FloatingToolbarExitDirection`), `AppBar.kt`
(`FlexibleBottomAppBar`, `BottomAppBarDefaults`) y `tokens/{Floating,Docked,Standard,Vibrant}ToolbarTokens.kt`
y `tokens/FloatingToolbarFabTokens.kt`. Kit: `05-medidas.md` § Toolbars. Decisiones: ADR-0027.

### Lo que confirma

- Floating de 64 (`HorizontalContainerHeight`, `VerticalContainerWidth`), redonda (`CornerFull`),
  elevación 3 (`ContainerElevation`); docked de 64 (`ContainerHeight`), sin radio.
- Colores: Standard `SurfaceContainer` con iconos `OnSurfaceVariant` y seleccionados
  `SecondaryContainer`/`OnSecondaryContainer`; Vibrant `PrimaryContainer` con `OnPrimaryContainer` y
  seleccionados `SurfaceContainer`/`OnSurface`; deshabilitados `OnSurface` al 38 %. El botón sin
  seleccionar lleva el color de la barra (`ButtonContainerColor`). Hover, foco y presionado no cambian
  el color del contenido (la capa de estado lo tiñe).
- Relleno: 8 en la floating (`ContainerLeadingSpace`/`TrailingSpace`, hasta el área de 48) y 4 entre
  botones (`ContainerBetweenSpace`): con iconos de 40 visibles, 12 del borde y 12 entre iconos, lo que
  el kit mide como 12 en el eje corto. Docked: 16 a los lados (`ContainerLeadingSpace`).

### Lo que el kit no trae (se toma de Compose)

- Margen al borde: 16 en la horizontal (`HorizontalContainerExternalSpace` =
  `FloatingToolbarDefaults.ScreenOffset`) y 24 en la vertical (`VerticalContainerExternalSpace`).
- Docked: los botones repartidos (`FlexibleHorizontalArrangement = Arrangement.SpaceBetween`; con
  separación fija, `FlexibleFixedHorizontalArrangement` de 32 centrado, que no se hace) y las zonas
  seguras de abajo y los costados (`BottomAppBarDefaults.windowInsets`).
- Si no entra, la fila de la floating se desplaza a lo ancho (`horizontalScroll`).
- FAB acompañante: 8 entre barra y FAB (`FloatingToolbarFabTokens.BetweenSpace`), al final por defecto
  (`FloatingToolbarHorizontalFabPosition.End`), de 56 con la barra expandida y 80 contraída
  (`FabSizeRange`); el FAB queda fuera de la fila de la barra.
- Ocultar al desplazar: `exitAlwaysScrollBehavior(exitDirection)` sigue lo desplazado
  (`onPostScroll`), sale del todo por el borde (`offsetLimit` = tamaño más distancia al borde) y se
  acomoda al soltar (`settleFloatingToolbar`); la animación de la barra es `FastSpatial`
  (`FloatingToolbarDefaults.animationSpec`). Con TalkBack la barra no se contrae ni se esconde.

### Conflictos y cómo se resolvieron

- **Elevación**: kit y `FloatingToolbarTokens.ContainerElevation` dicen 3;
  `FloatingToolbarDefaults.ContainerExpandedElevation` usa 0 (con un `TODO read from token`) y 1 con FAB
  (`ContainerExpandedElevationWithFab`). Gana el kit con el token: 3, también con FAB.
- **Separación mínima de la docked**: kit 8; `DockedToolbarTokens.ContainerMinSpacing` 4. Gana el kit
  (solo importa cuando los botones casi no entran).
- **Color del FAB**: `FloatingToolbarFabTokens` dice `SecondaryContainer` con la Standard y
  `TertiaryContainer` con la Vibrant; `FloatingToolbarDefaults.standardFloatingToolbarColors` usa
  `PrimaryContainer` con la Standard (con un `TODO load colors from the toolbar tokens`). El kit no lo
  trae. La librería no fuerza el color del FAB (es un `Fab` del uso); el playground y la documentación
  usan los tokens.
- **Forma de los seleccionados**: el kit dibuja el icon button y el button seleccionables de la barra
  con radio completo (fondo de 40 × 40 con radio 100 en el icon button). Compose: `IconToggleButton`
  usa `IconButtonDefaults.standardShape` (redonda) con y sin seleccionar (IconButton.kt, commit
  `21843a1225`), así que coincide; `ToggleButton` pasa a `SelectedContainerShapeSquare` al
  seleccionar (`ToggleButtonDefaults.shapesFor`, ToggleButton.kt), que choca con el kit. Las muestras
  de Compose (`FloatingToolbarSamples.kt`, commit `43fe84dbc1`) solo usan `IconButton` y
  `FilledIconButton`, sin toggles. Gana el kit: dentro de la barra, los dos seleccionados quedan
  redondos (`--mk-icon-button-selected-round` y `--mk-button-selected-round`, ADR-0027); al presionar
  siguen pasando a la forma presionada, como los de Compose (`pressedShape`).
- **Docked con FAB**: ni el kit (configuraciones Docked y Floating, el FAB solo junto a la floating)
  ni `FlexibleBottomAppBar` (AppBar.kt, sin parámetro de FAB) lo definen; el `BottomAppBar` con
  `floatingActionButton` es el Bottom app bar que la docked reemplaza. No se hace (ADR-0027).
- **Contraer hacia el FAB**: `HorizontalFloatingToolbarWithFabLayout` encoge el ancho de la barra
  con el avance (`targetWidth = ancho máximo × progreso`) dejando el ancho total y el FAB en su lugar, y
  el FAB va de 56 a 80 (`FabSizeRange`); el umbral del desplazamiento es 40 dp
  (`ScrollDistanceThreshold`, `VerticalNestedScrollExpansionNode`).

## No revisado

La tipografía (`TypeScaleTokens.kt`, descargado pero sin comparar).
