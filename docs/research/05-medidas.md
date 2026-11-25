# Medidas internas del primer conjunto

Leído del kit el 2026-11-24 con [tools/extract-figma.js](tools/extract-figma.js) (solo lectura).
Unidades en dp del kit; en web equivalen a px. Los colores son roles del esquema
([data/color-schemes.csv](data/color-schemes.csv)); "capa X %" es la capa de estado del
color indicado con esa opacidad ([03-tokens.md](03-tokens.md#capas-de-estado)).

Notación de rellenos: arriba, derecha, abajo, izquierda.

## Convenciones del kit que se repiten

- **Área táctil de 48.** Los componentes pequeños tienen un marco exterior de 48 de alto
  aunque lo visible sea menor (botón XS de 32, botón S de 40, checkbox de 18, icon button
  pequeño de 40). En web esto es un área de clic ampliada, no tamaño visible.
- **Capa de estado aparte.** Cada componente tiene un nodo "State-layer" encima del
  contenedor; hover, foco y presionado solo cambian ese nodo.
- **Deshabilitado = 38 %** de opacidad sobre el contenido, y un contenedor de
  `On Surface` al 10 % (o al 4 % en el campo de texto).
- **Iconos con dos versiones.** Los componentes con selección usan un icono de contorno
  sin seleccionar y uno relleno al seleccionar (por ejemplo `stars` y `stars_filled`).

## Button

Variantes consultadas: Filled Round en los cinco tamaños, Filled Square M, Tonal, Outlined,
Elevated y Text en M, Toggle M seleccionado y sin seleccionar, Icon button standard M.

### Tamaños

| Tamaño | Alto visible | Área exterior | Relleno (vert. / horiz.) | Separación | Icono | Texto |
|---|---|---|---|---|---|---|
| XSmall | 32 | 48 | 6 / 12 | 4 | 20 | Label Large |
| Small | 40 | 48 | 10 / 16 | 8 | 20 | Label Large |
| Medium | 56 | 56 | 16 / 24 | 8 | 24 | Title Medium |
| Large | 96 | 96 | 32 / 48 | 12 | 32 | Headline Small |
| XLarge | 136 | 136 | 48 / 64 | 16 | 40 | Headline Large |

Los anchos de la tabla de variantes (83, 95, 120, 199, 262) corresponden a la etiqueta
"Label" con icono; el ancho real depende del texto.

### Forma

- **Round:** radio completo (100 en el kit).
- **Square:** radio 16 en Medium. No se consultaron los demás tamaños.

### Colores por estilo (estado Enabled)

| Estilo | Contenedor | Texto e icono | Otros |
|---|---|---|---|
| Filled | `Primary` | `On Primary` | |
| Tonal | `Secondary Container` | `On Secondary Container` | |
| Outlined | ninguno | `On Surface Variant` | borde 1 interior `Outline Variant` |
| Elevated | `Surface Container Low` | `Primary` | sombra de elevación del kit (nivel por confirmar) |
| Text | ninguno | `Primary` | |

Estados del Filled: ver [03-tokens.md](03-tokens.md#capas-de-estado).

### Toggle button (Medium)

| | Contenedor | Texto e icono | Forma | Icono |
|---|---|---|---|---|
| Seleccionado | `Primary` | `On Primary` | radio 16 (cuadrada) | relleno |
| Sin seleccionar | `Surface Container` | `On Surface Variant` | radio completo | contorno |

La forma cambia al seleccionar: de redonda a cuadrada. Es el cambio de forma propio de
Expressive.

### Icon button

- Standard Medium (ancho Default): 56 × 56, radio completo, icono 24, sin relleno.
- Small (usado dentro del campo de texto): 40 visible dentro de un área de 48, icono 24.
- Anchos Narrow, Default y Wide: ver tabla de variantes en
  [04-componentes.md](04-componentes.md).
- Tamaños visibles, iconos, espacios laterales y colores de toggle completados con Compose:
  ver [07-jetpack-compose.md](07-jetpack-compose.md#iconbutton).

## Text field

Variantes consultadas: Filled en Enabled, Hovered, Focused, Error, Disabled y con texto
escrito; Outlined en Enabled, Focused y Error. Todas con iconos a ambos lados y etiqueta.

### Estructura

- Contenedor de 56 de alto.
- Capa de estado: relleno 4 / 0, separación 4, en fila.
- Iconos inicial y final: icon button Small (área 48, visible 40, icono 24).
- Bloque de texto: relleno 4 / 0, en columna, centrado verticalmente.
- Texto de ayuda (supporting text): bloque de 20 de alto, relleno 4, 16, 0, 16; estilo
  Body Small.

No se consultó la variante sin iconos, así que el relleno lateral sin icono queda pendiente.
Resuelto con Jetpack Compose: 16 (ver [07-jetpack-compose.md § TextField](07-jetpack-compose.md#textfield)).

### Tipografía

| Elemento | Estilo | Color |
|---|---|---|
| Etiqueta en reposo (campo vacío) | Body Large | `On Surface Variant` |
| Etiqueta flotante (con foco o con texto) | Body Small | `On Surface Variant`; `Primary` con foco |
| Texto escrito | Body Large | `On Surface` |
| Texto de ayuda | Body Small | `On Surface Variant` |
| Cursor | trazo 1 | `Primary` |

### Filled

- Radio 4 solo en las esquinas superiores. Contenedor `Surface Container Highest`.
- Indicador activo: línea inferior.

| Estado | Indicador | Otros cambios |
|---|---|---|
| Enabled | 1, `On Surface Variant` | |
| Hovered | 1, `On Surface` | capa `On Surface` 8 % |
| Focused | 3, `Primary` | etiqueta flotante en `Primary` |
| Error | 1, `Error` | etiqueta, texto de ayuda e icono final (`error`) en `Error` |
| Disabled | 1, `On Surface` al 38 % | contenedor `On Surface` 4 %; contenido y ayuda al 38 % |

### Outlined

- Radio 4 en las cuatro esquinas. Sin relleno. Borde interior.
- La etiqueta flotante lleva relleno 0, 4 y fondo `Surface`: así "corta" el borde.

| Estado | Borde |
|---|---|
| Enabled | 1, `Outline` |
| Focused | 3, `Primary` |
| Error | 1, `Error` |

## Checkbox

- Área exterior 48 con relleno 4. Capa de estado circular de 40.
- Caja de 18 × 18, radio 2.
- Icono de 24 (`check_small` o `check_indeterminate_small`), dibujo de 12 × 9,4 (marca)
  o 12 × 2 (indeterminado).

| Estado | Caja | Icono | Capa de estado |
|---|---|---|---|
| Sin marcar | borde 2 interior `On Surface Variant` | | |
| Marcado / indeterminado | `Primary` | `On Primary` | |
| Marcado, hover | `Primary` | `On Primary` | `Primary` 8 % |
| Marcado, foco | `Primary` | `On Primary` | `Primary` 10 % |
| Marcado, presionado | `Primary` | `On Primary` | `Primary` 10 % y onda `On Surface` 20 % |
| Error marcado | `Error` | `On Primary` en el kit | |
| Error sin marcar | borde 2 `Error` | | |
| Deshabilitado marcado | `On Surface` | `Surface` | todo al 38 % |
| Deshabilitado sin marcar | borde 2 `On Surface` | | todo al 38 % |

Posible error del kit: el icono del checkbox en error usa `On Primary` y no `On Error`.
Revisar contra la especificación.

## Switch

- Pista de 52 × 32, radio completo.
- Área táctil de 48 y capa de estado circular de 40, centradas en el control deslizante
  (handle).

| Estado | Pista | Handle | Capa de estado |
|---|---|---|---|
| Activado | `Primary`, relleno 2, 4 | 24, `On Primary` | |
| Desactivado | `Surface Container Highest`, borde 2 `Outline`, relleno 2, 8 | 16, `Outline` | |
| Desactivado con icono | igual, relleno 4 | 24, `Outline`, icono `close` 16 | |
| Activado con icono | igual que activado | 24, `On Primary`, icono `check` 16 | |
| Activado, hover | `Primary` | 24, `Primary Container` | `Primary` 8 % |
| Activado, foco | `Primary` | 24, `Primary Container` | `Primary` 10 % |
| Activado, presionado | `Primary`, relleno 2 | 28, `Primary Container` | `Primary` 10 % |
| Desactivado, presionado | relleno 2 | 28, `On Surface Variant` | `On Surface` 10 % |
| Activado, deshabilitado | `On Surface` 10 % | 24, `Surface` | |
| Desactivado, deshabilitado | `Surface Variant` 10 %, borde `On Surface` 10 % | 16, `On Surface` 38 % | |

El handle crece al presionar (16 o 24 → 28). No se consultó el hover sin activar; se tomó de
Jetpack Compose, junto con el color de los iconos (ver
[07-jetpack-compose.md § Switch](07-jetpack-compose.md#switch)).

## Dialog (básico)

- Ancho 312 en el kit, radio 28, fondo `Surface Container High`.
- No tiene sombra en el kit.
- Contenido: relleno 24, 24, 0, 24; separación 16.
- Icono opcional: 24, color `Secondary`. Con icono, todo el contenido se centra.
- Título: Headline Small, `On Surface`.
- Texto: Body Medium, `On Surface Variant`.
- Acciones: 88 de alto, relleno 20, 24, 20, 8, separación 8, alineadas a la derecha.
  Son botones Text Small.
- Diálogo con lista: el título lleva relleno 24 en los cuatro lados; las acciones, 16 a la
  izquierda. La lista usa elementos de lista "baseline" de 56–57 de alto.

## Menu

### Contenedor

- Ancho 208 en el kit, radio 16 (`Corner/Large`).
- Fondo `Surface Container Low`, sombra de elevación 3.
- Lista con relleno 2 arriba y abajo. El último elemento lleva radio 16 abajo.

### Elemento (Standard)

- Alto 48: relleno exterior 2, 4. Contenido interno de 44, radio 4 (`Corner/Extra-small`).
- Capa de estado: relleno 12, separación 8, en fila.
- Elementos inicial y final: iconos de 20.

| Estado | Cambio |
|---|---|
| Hover | capa `On Surface` 8 % |
| Focused | capa `On Surface` 10 % |
| Pressed | capa `On Surface` 8 % y onda `On Surface` 10 % |
| Active (submenú abierto) | capa `On Surface` 8 % |
| Disabled | iconos al 38 % |
| Selected | fondo `Tertiary Container`, radio 12 (`Corner/Medium`), icono relleno |

### Elemento (Vibrant)

- Fondo del elemento `Tertiary Container`.
- Seleccionado: fondo `Tertiary`, radio 12.

### Etiqueta de sección

- 32 de alto; relleno exterior 0, 4; interior 6, 12, 0, 12. Radio 4.
- Label Large. Básica: `On Surface Variant` sobre `Surface Container Low`.
  Vibrant: `On Tertiary Container` sobre `Tertiary Container`.

Pendiente: el estilo y color del texto del elemento (está dentro de una instancia que el
script no abrió) y los colores de texto en Vibrant.
Los colores se completaron con Jetpack Compose y la tipografía queda sin confirmar: ver
[07-jetpack-compose.md § Menu](07-jetpack-compose.md#menu).

## Navigation bar

- 64 de alto, fondo `Surface Container`. Los elementos se reparten el ancho.

### Elemento vertical (icono sobre etiqueta)

- Relleno 6 arriba y abajo, separación 4.
- Indicador: 56 × 32, radio 16. Seleccionado: `Secondary Container`.
- Icono 24: `On Surface Variant` (contorno) sin seleccionar; `On Secondary Container`
  (relleno) seleccionado.
- Etiqueta: Label Medium. `On Surface Variant` sin seleccionar. Seleccionado: `Secondary`
  en la variante sin insignia y `On Secondary Container` en la variante con insignia; el kit
  es inconsistente.
- Hover: capa `On Surface` 8 % sobre el indicador.

### Elemento horizontal (icono junto a etiqueta)

- Indicador de 40 de alto, radio 20, relleno 8, 16, separación 4.
- Etiqueta Label Medium.

### Insignia (badge) grande

- 16 de alto, relleno 0, 4, radio completo, `Error`.
- Texto Label Small, `On Error`.

## Navigation rail

### Contraída

- 96 de ancho. Relleno 44 arriba, 56 abajo. Separación 40 entre el bloque superior y los
  elementos. Sin fondo.
- Bloque superior: icon button Square Medium (56, radio 16) para el menú y FAB de 56,
  radio 16, `Primary Container`.
- Elementos: 96 × 64, separación 4, igual que el elemento vertical de la barra.

### Expandida

- 220 de ancho, relleno 44, 20, 20, 20, separación 40.
- Docked: sin fondo. Floating: fondo `Surface Container`, radio 16.
- Bloque superior con FAB extendido (alto 56, radio 16).
- Elementos horizontales: 56 de alto, radio completo, relleno 16, separación 8, icono 24,
  etiqueta Label Large. Seleccionado: `Secondary Container` y texto e icono
  `On Secondary Container`.

## FAB y FAB extendido

Leído del kit el 2026-11-25 (página Buttons, conjuntos `FAB` y `Extended FAB`; variante
Primary container, Enabled, salvo que se indique). Variantes del kit: Size, Color (Primary
container, Secondary container, Tertiary container, Primary, Secondary, Tertiary) y State
(Enabled, Hovered, Focused, Pressed). No hay variante deshabilitada ni "lowered".

| Componente | Tamaño | Medida | Radio | Relleno | Separación | Icono | Texto |
|---|---|---|---|---|---|---|---|
| FAB | Default | 56 × 56 | 16 | 16 | — | 24 | — |
| FAB | Medium | 80 × 80 | 20 | 26 | — | 28 | — |
| FAB | Large | 96 × 96 | 28 | 30 | — | 36 | — |
| Extended FAB | Small | alto 56 (ancho 104 con "Label") | 16 | 16 | 8 | 24 | Title Medium (16/24, 500) |
| Extended FAB | Medium | alto 80 (ancho 146) | 20 | 26 | 12 | 28 | Title Large (22/28, 400) |
| Extended FAB | Large | alto 96 (ancho 167) | 28 | 30 arriba y abajo, 28 a los lados | 16 | 36 | Headline Small (24/32, 400) |

Colores (iguales en FAB y extendido): contenedor `X` y contenido (icono y texto) `On X`, para
X = Primary Container, Secondary Container, Tertiary Container, Primary, Secondary y Tertiary.

Estados (Primary container):

| Estado | Elevación | Capa de estado |
|---|---|---|
| Enabled | 3 | — |
| Hovered | 4 | On Primary Container 8 % |
| Focused | 3 | On Primary Container 10 %, con indicador de foco |
| Pressed | 3 | On Primary Container 8 % (más la onda) |

## Diferencias con la especificación a revisar

- El indicador con foco del campo de texto mide 3 en el kit. Confirmar en m3.material.io.
- Icono del checkbox en error con `On Primary`.
- Color de la etiqueta seleccionada en la barra de navegación (`Secondary` frente a
  `On Secondary Container`).
