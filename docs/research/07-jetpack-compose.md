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
| Botón XSmall: espacio lateral y separación | 12 y 4 | 16 y 8 | `expressive-react` usa 12 y 4, como el kit. Sin resolver. |
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

## No revisado

Los tokens de Switch, Dialog, Navigation rail y los de color de la barra de navegación
(los nombres de las variables de etiqueta activa no coincidieron con la búsqueda), y la
tipografía (`TypeScaleTokens.kt`, descargado pero sin comparar).
