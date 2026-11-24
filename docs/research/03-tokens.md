# Tokens

Leído del kit el 2026-11-24 (variables de las páginas Styles, Shape y Buttons).
Los valores están en la unidad del kit (dp); en web equivalen a px.

## Cómo nombra el kit sus variables

- `Schemes/<Rol>`: color semántico del tema activo (por ejemplo `Schemes/Primary`).
- `M3/sys/light/<rol>`: el mismo color como estilo, fijado al tema claro.
- `State Layers/<Rol>/Opacity-NN`: color "on" con opacidad, para hover, foco y presionado.
- `Static/<Estilo>/<Propiedad>`: piezas de la tipografía (Font, Size, Weight, Line Height, Tracking).
- `M3/<rol>/<tamaño>`: estilo tipográfico compuesto.
- `M3/Elevation Light/<n>` y `M3/Elevation Dark/<n>`: sombras.

## Tipografía

Fuente: Roboto en todos los estilos. Columnas: tamaño / interlineado, peso, espaciado entre letras.

| Estilo | Tamaño / interlineado | Peso | Espaciado | Peso enfatizado |
|---|---|---|---|---|
| Display Large | 57 / 64 | 400 | -0.25 | 500 |
| Display Medium | 45 / 52 | 400 | 0 | 500 |
| Display Small | 36 / 44 | 400 | 0 | 500 |
| Headline Large | 32 / 40 | 400 | 0 | 500 |
| Headline Medium | 28 / 36 | 400 | 0 | 500 |
| Headline Small | 24 / 32 | 400 | 0 | 500 |
| Title Large | 22 / 28 | 400 | 0 | 500 |
| Title Medium | 16 / 24 | 500 | 0.15 | 600 |
| Title Small | 14 / 20 | 500 | 0.1 | 600 |
| Body Large | 16 / 24 | 400 | 0.5 | 500 |
| Body Medium | 14 / 20 | 400 | 0.25 | 500 |
| Body Small | 12 / 16 | 400 | 0.4 | 500 |
| Label Large | 14 / 20 | 500 | 0.1 | 600 |
| Label Medium | 12 / 16 | 500 | 0.5 | 600 |
| Label Small | 11 / 16 | 500 | 0.5 | 600 |

Los estilos enfatizados (`M3/<rol>/<tamaño>-emphasized`) solo cambian el peso; tamaño,
interlineado y espaciado son los mismos.

## Esquinas

| Nombre | Radio |
|---|---|
| None | 0 |
| Extra-small | 4 |
| Small | 8 |
| Medium | 12 |
| Large | 16 |
| Large-increased | 20 |
| Extra-large | 28 |
| Extra-large-increased | 32 |
| Extra-extra-large | 48 |
| Full | 50 % |

La asociación nombre–valor se dedujo de la posición de las etiquetas en la página Shape.

## Formas decorativas (35)

Circle, Square, Slanted, Arch, Fan, Arrow, Semicircle, Oval, Pill, Triangle, Diamond,
Hexagon, Pentagon, Gem, Very sunny, Sunny, 4-sided cookie, 6-sided cookie, 7-sided cookie,
9-sided cookie, 12-sided cookie, Ghost-ish, 4-leaf clover, 8-leaf clover, Burst, Soft burst,
Boom, Soft boom, Flower, Puffy, Puffy diamond, Pixel circle, Pixel triangle, Bun, Heart.

En la página, la etiqueta de "Hexagon" dice "Clamshell".

## Elevación

Cada nivel son dos sombras. Formato: desplazamiento x y, desenfoque, expansión, color.
Los niveles claro y oscuro tienen los mismos valores.

| Nivel | Sombra 1 | Sombra 2 |
|---|---|---|
| 1 | 0 1 2 0 `#0000004D` | 0 1 3 1 `#00000026` |
| 2 | 0 1 2 0 `#0000004D` | 0 2 6 2 `#00000026` |
| 3 | 0 1 3 0 `#0000004D` | 0 4 8 3 `#00000026` |
| 4 | 0 2 3 0 `#0000004D` | 0 6 10 4 `#00000026` |
| 5 | 0 4 4 0 `#0000004D` | 0 8 12 6 `#00000026` |

## Colecciones de variables del kit

Leído con el API de plugins de Figma (solo lectura).

| Colección | Variables | Modos |
|---|---|---|
| M3 | 197 | 32 (ver abajo) |
| Typescale | 90 | Baseline |
| Shape | 10 | Baseline |
| Font theme | 7 | Baseline, Wireframe |

Modos de la colección M3: Light, Dark, sus versiones de contraste medio y alto
(Light/Dark Medium Contrast, Light/Dark High Contrast), Monochrome y 13 temas de color
(Pink, Rose, Red, Orange, Yellow, Chartreuse, Green, Teal, Cyan, Blue, Indigo, Purple),
cada uno en claro (LT) y oscuro (DT). Solo se exportaron Light y Dark.

La colección Shape confirma la tabla de esquinas; "Full" vale 1000 en el kit (en CSS,
`9999px` o `50%`). Font theme define la fuente de marca y la de texto (las dos Roboto) y
los pesos; el modo "Wireframe" las cambia por Flow Circular.

## Color

Esquema completo: 49 roles, claro y oscuro, en
[data/color-schemes.csv](data/color-schemes.csv). Leído del kit.

Grupos de roles:

- **Acento:** Primary, Secondary, Tertiary y Error, cada uno con su "On", su "Container" y
  su "On … Container".
- **Superficie:** Background, Surface, Surface Dim, Surface Bright, Surface Variant y los
  cinco Surface Container (Lowest a Highest), con sus "On".
- **Contorno:** Outline, Outline Variant.
- **Inversos:** Inverse Surface, Inverse On Surface, Inverse Primary.
- **Fijos:** Primary/Secondary/Tertiary Fixed y Fixed Dim, con sus "On" y "On … Variant".
  Valen lo mismo en claro y oscuro.
- **Otros:** Surface Tint, Shadow, Scrim.

Hay además una variable "Add-ons/Section background", propia de la presentación del kit,
que no es parte del sistema.

## Capas de estado

Los estados no usan colores nuevos: superponen el color de contenido con opacidad. El kit
define cada rol al 8 %, 10 % y 16 % (`State Layers/<Rol>/Opacity-08|10|16`).

Leído de las variables del botón relleno (Square, XLarge):

| Estado | Qué cambia |
|---|---|
| Enabled | Contenedor `Primary`, texto e icono `On Primary` |
| Hovered | Capa `On Primary` al 8 % |
| Focused | Capa `On Primary` al 10 %, más anillo de foco de 3 px en `Secondary` |
| Pressed | Capa `On Primary` al 8 % más onda (ripple) `On Primary` al 10 % |
| Disabled | Contenedor `On Surface` al 10 %, contenido `On Surface` al 38 % |

No se vio dónde se usa la opacidad del 16 %; probablemente en arrastre (sin verificar).

## Movimiento

El kit no trae valores de movimiento. Fuente usada: el código de Jetpack Compose Material 3
(`androidx/androidx`, commit `160825094a` del 2026-08-05), archivos
`StandardMotionTokens.kt`, `ExpressiveMotionTokens.kt` y `MotionTokens.kt`. Datos en
[../../tokens/motion.json](../../tokens/motion.json).

Resortes (amortiguación / rigidez, masa 1):

| Resorte | Standard | Expressive |
|---|---|---|
| Fast spatial | 0.9 / 1400 | 0.6 / 800 |
| Default spatial | 0.9 / 700 | 0.8 / 380 |
| Slow spatial | 0.9 / 300 | 0.8 / 200 |
| Fast effects | 1.0 / 3800 | 1.0 / 3800 |
| Default effects | 1.0 / 1600 | 1.0 / 1600 |
| Slow effects | 1.0 / 800 | 1.0 / 800 |

"Spatial" es para posición, tamaño y forma, y puede rebotar; "effects" es para color y
opacidad, y no rebota. Compose también define 16 duraciones (de 50 a 1000 ms) y 10 curvas de
Bézier (emphasized, standard, legacy, linear y sus variantes de aceleración y desaceleración).

En CSS cada resorte se convierte en una duración y una curva `linear()` (ver
`tokens/spring.ts`).
