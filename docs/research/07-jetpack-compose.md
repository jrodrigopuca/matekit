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

## No revisado

Los tokens de Dialog, Navigation rail y los de color de la barra de navegación
(los nombres de las variables de etiqueta activa no coincidieron con la búsqueda), y la
tipografía (`TypeScaleTokens.kt`, descargado pero sin comparar).
