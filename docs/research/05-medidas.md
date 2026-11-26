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

### Variantes y detalles (leídos del kit el 2026-11-25)

- Conjuntos: `Navigation Rail` (contraída: Alignment Top o Middle, Nav items 3 a 6, Show Menu,
  Show FAB) y `Navigation Rail: Expanded` (lo mismo más Type Docked o Floating). La contraída
  no tiene variante Floating en el kit.
- Alineación Middle: los elementos quedan centrados en el alto. En la contraída, el bloque de
  menú y FAB queda arriba (y = 44) fuera del flujo; en la expandida, el bloque va arriba en el
  flujo y los elementos se centran en el alto total (en 800 de alto, y = 288 para 224 de
  elementos).
- Floating expandida: `Surface Container`, radio 16, sin sombra en el kit.
- Bloque superior: 116 de alto (menú 56, separación 4, FAB 56).
- Elemento vertical (contraída), con etiqueta: relleno 6 arriba y abajo, separación 4;
  indicador 56 × 32, radio 16, `Secondary Container`; icono 24 (relleno 4, 20 a los lados);
  etiqueta Label Medium (12/16, 500), `On Surface Variant` y activa `Secondary`. Icono
  `On Surface Variant` y activo `On Secondary Container`. El kit tiene un icono distinto para
  el seleccionado ("Icon (selected)"): la versión rellena.
- Elemento vertical sin etiqueta ("Show label" = False): relleno 4, indicador 56 × 56 de radio
  28 con el icono centrado.
- Insignia en el elemento vertical: sobre la esquina del icono (grande en x = 28, y = 2 dentro
  del indicador de 56 × 32), `Error` con texto Label Small `On Error`, 16 de alto, relleno 4.
- Elemento horizontal (expandida): 56 de alto, radio completo, relleno 16, separación 8 entre
  icono y etiqueta; etiqueta Label Large (14/20, 500). Activo: fondo `Secondary Container`,
  icono y etiqueta `On Secondary Container`; inactivo: `On Surface Variant`. La insignia grande
  va en línea después de la etiqueta (separación 8), no sobre el icono. Tiene "Show icon":
  el icono puede omitirse.

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

## Indicador de carga (Loading indicator)

Leído del kit el 2026-11-25 (página Loading & progress, conjunto `Loading indicator`;
variantes Steps 1 a 7 y Show container).

- 48 × 48 en total; la forma va dentro de un área de 38 × 38 ("Shape container").
- Sin contenedor: la forma en `Primary`.
- Con contenedor: círculo de 48 en `Primary Container` y la forma en `On Primary Container`.
- Los 7 pasos, en orden: Soft burst, 9-sided cookie, Pentagon, Pill, Sunny, 4-sided cookie y
  Oval (los mismos que `LoadingIndicatorDefaults` de Compose). La forma de cada paso mide
  unos 30 a 34 dentro del área de 38.

## Radio button

Leído del kit el 2026-11-25 (página Radio button, conjunto `Radio buttons` 51739:4608;
variantes Selected True/False × State Enabled, Hovered, Focused, Pressed, Disabled). No hay
variante de error.

- Área exterior 48 × 48; contenedor circular de 40 (radio completo) centrado, que es la capa
  de estado.
- Icono de 24 (`radio_button_checked` o `radio_button_unchecked`), dibujo de 20 × 20 centrado
  (relleno 8 dentro de la capa de 40).

| Estado | Icono, seleccionado | Capa, seleccionado | Icono, sin seleccionar | Capa, sin seleccionar |
|---|---|---|---|---|
| Enabled | `Primary` | — | `On Surface Variant` | — |
| Hovered | `Primary` | `Primary` 8 % | `On Surface` | `On Surface` 8 % |
| Focused | `Primary` | `Primary` 10 % | `On Surface` | `On Surface` 10 % |
| Pressed | `Primary` | `On Surface` 10 % | `On Surface` | `Primary` 10 % |
| Disabled | `On Surface` al 38 % | — | `On Surface` al 38 % | — |

Al presionar, la capa toma el color del estado de destino (al revés que en hover y foco):
`On Surface` sobre el seleccionado y `Primary` sobre el sin seleccionar. Compose no lo define
(ya no trae colores de capa); lo confirman los tokens de `@material/web`: ver
[07-jetpack-compose.md § RadioButton](07-jetpack-compose.md#radiobutton).

## Divider

Leído del kit el 2026-11-25 (página Dividers; componentes sueltos, sin conjunto).

- Línea de 1 en `Outline Variant`.
- Horizontal: Full-width (sin sangría), Inset (16 al inicio), Middle-inset (16 a ambos
  lados). Vertical: lo mismo arriba y abajo (Full-width, Inset 16 arriba, Middle-inset 16 y 16).
- "Divider with subhead" (horizontal): relleno 16 a ambos lados, la línea y debajo, con
  separación 4, un subtítulo Title Small (14/20, 500) en `On Surface Variant`; 25 de alto.

## Indicadores de progreso (lineal y circular)

Leído del kit el 2026-11-25 (página Loading & progress; conjuntos
`Linear-determinate progress indicator` 58005:7997, `Linear-indeterminate progress indicator`
58005:8284, `Circular-determinate progress indicator` 58005:8459 y
`Circular-indeterminate progress indicator` 58005:8525; piezas en
`.Building Blocks/Progress indicator/`). Variantes: Type Flat o Wave, Thickness 4 u 8 dp, y
Progress 0, 10, 20 (30 en el circular), 50, 80 y 100, o Step 0 a 2 en los indeterminados.

### Lineal

- Contenedor de 12 de alto (14 en Wave de 8); el ancho lo da el padre (404 en el kit).
- Pista: `Secondary Container`, alto igual al grosor (4 u 8), radio la mitad (2 o 4).
- Indicador activo: trazo `Primary` del grosor (4 u 8) con extremos redondos (`cap=ROUND`). Los
  extremos sobresalen medio grosor: el kit lo compensa con relleno 2 (grosor 4) o 4 (grosor 8)
  al inicio, y al 100 % también al final.
- Separación visible entre el indicador y la pista: 4 en los dos grosores (relleno 6 menos 2 del
  extremo redondo con grosor 4; 8 menos 4 con grosor 8).
- Punto de parada (stop): cuadrado de 4 × 4 `Primary`, redondo, al final de la pista y centrado
  en su alto. Con grosor 4 toca el borde final; con grosor 8 queda a 2 del final (centrado en un
  cuadrado de 8). Se ve de 0 % a 80 %; al 100 % no hay pista ni punto.
- 0 %: solo pista y punto, sin indicador activo.
- Wave: el indicador activo es una onda de 12 de alto (medida del trazado, sin el grosor del
  trazo), longitud de onda 40 en el determinado y 20 en el indeterminado; el primer tramo va
  girado 180°. La pista sigue plana.
- Indeterminado: pista, separación, indicador activo, separación, pista (Step 1: pista de unos
  40, indicador de unos 120 y el resto pista, en 404).

### Circular

- Tamaño total: Flat 4 dp 40 × 40, Flat 8 dp 44 × 44, Wave 4 dp 48 × 48, Wave 8 dp 52 × 52.
- Pista `Secondary Container` e indicador activo `Primary` (en el kit son vectores rellenos:
  el grosor, la separación y la onda se toman de Compose).
- Indeterminado: el indicador gira (en Step 1 el conjunto está rotado unos −100°).

## Slider

Leído del kit el 2026-11-25 (página Sliders; conjuntos `Standard slider` 58008:10356,
`Centered slider` 58008:10979 y `Range slider` 58008:11810; piezas en `.Building Blocks/`).
Variantes: Orientation Horizontal o Vertical, Size XSmall a XLarge, State Enabled, Hovered,
Pressed y Disabled (no hay Focused), y Value 0, 50 y 100 (−50, 0 y +50 en centered y range).

| Tamaño | Alto de la pista | Radio exterior | Alto del handle (= alto total) |
|---|---|---|---|
| XSmall | 16 | 8 (completo) | 44 |
| Small | 24 | 8 | 44 |
| Medium | 40 | 12 | 52 |
| Large | 56 | 16 | 68 |
| XLarge | 96 | 28 | 108 |

- Handle: barra de 4 de ancho, radio 2, `Primary`; al presionar se angosta a 2 (las pistas
  crecen 1 de cada lado).
- Separación de 6 entre el handle y cada pista. Las esquinas de la pista junto al handle tienen
  radio 2; las de los extremos, el radio exterior de la tabla.
- Pista activa `Primary`; pista inactiva `Secondary Container`.
- Punto de parada (track stop): círculo de 4 `On Secondary Container`, centrado en el alto y a 4
  del final de la pista inactiva. En el slider con pasos ("Stops"), puntos de 4 repartidos con
  4 de margen en los extremos; sobre la pista activa van en `Secondary Container`.
- Valor 0: sin pista activa, el handle a 4 del inicio. Valor 100: sin pista inactiva ni punto,
  el handle a 4 del final.
- Hover: capa `On Primary` al 8 % sobre el handle. Presionado: capa `On Primary` al 10 %, handle
  de 2 y el indicador de valor.
- Indicador de valor (presionado): píldora de 48 × 44 (radio completo), `Inverse Surface`,
  relleno 12 arriba y abajo y 16 a los lados, texto Label Large en `Inverse On Surface`, 4 por
  encima del handle.
- Deshabilitado: pista activa y handle `On Surface` al 38 %, pista inactiva `On Surface` al
  10 %, punto `On Surface` al 38 %. (En el kit la pista activa deshabilitada pierde el radio:
  probable error del kit.)
- Vertical: el mismo dibujo girado; la pista activa abajo y la inactiva arriba.
- Centered: la pista activa va del centro al valor; puntos de parada en los dos extremos; 4 de
  separación entre la pista inactiva izquierda y la activa en el centro.
- Range: dos handles con la pista activa entre ellos; con los dos en el mismo valor, un punto en
  el centro ("Track dot - centered").

## Card

Leído del kit el 2026-11-25 (página Cards; conjuntos `Stacked card` 52346:27573 y
`Horizontal card` 52350:27876, con Style Outlined, Elevated o Filled y Layout "Media & text" o
"Slot"; estados en `.Building Blocks/Card states/{Outlined,Elevated,Filled}`).

- Radio 12 (`Corner/Medium`) en los tres estilos.

| Estilo | Contenedor | Enabled | Hovered | Focused | Pressed | Dragged |
|---|---|---|---|---|---|---|
| Elevated | `Surface Container Low` | elevación 1 | elevación 2, capa 8 % | capa 10 % | elevación 1, capa 10 % | elevación 4, capa 16 % |
| Filled | `Surface Container Highest` | sin elevación | elevación 1, capa 8 % | (no extraído) | elevación 1, capa 10 % | (no extraído) |
| Outlined | `Surface` y borde 1 interior `Outline Variant` | sin elevación | elevación 1, capa 8 % | capa 10 % | capa 10 % | elevación 3, capa 16 % |

La capa de estado es siempre `On Surface`.

- Ejemplo apilado ("Media & text", 360 × 480):
  - Cabecera de 72: relleno 12 arriba y abajo, 16 al inicio y 4 al final. Avatar de 40 y,
    separado 16, el título en Title Medium y el subtítulo en Body Medium (los dos en
    `On Surface`, separación 4). Al final, un icon button standard Small.
  - Imagen de 188 de alto a todo el ancho (`Surface Container High` de fondo).
  - Texto: relleno 16 y separación 32 entre bloques. Título en Body Large (`On Surface`),
    subtítulo y texto de apoyo en Body Medium (`On Surface Variant`). Acciones alineadas al
    final, separación 8: un botón outlined Small y uno filled Small.
- Ejemplo horizontal (360 × 80): contenido con relleno 16 y separación 16 (avatar de 40,
  título y subtítulo) e imagen de 80 × 80 al final.
- "Slot": contenido libre que ocupa toda la tarjeta (el kit muestra una zona de 16 de margen).

## List

Leído del kit el 2026-11-25 (página Lists). El kit trae dos generaciones: los conjuntos
"baseline" anteriores (`List item/List Item: 0 Density (baseline)`, con densidades 0, −2 y −4)
y los de Expressive, que son los que se usan acá: `List` 59106:13028 (Type Standard, Segmented
(filled), Expandable, Draggable; Multi-line), `List item` 59106:13183 (Alignment Middle o Top,
State Enabled, Hovered, Focused, Pressed, Dragged, Disabled; Selected), `List item - Accordion`,
`List Item - Swipe` y las piezas en `Building blocks/`.

- Elemento: relleno 10 arriba y abajo y 16 a los lados; separación 12 entre partes. Alto: 52
  con una línea, 64 con dos y 80 con tres (100 alineado arriba en el ejemplo del kit).
- Contenido: overline en Label Medium `On Surface Variant`; texto principal en Body Large
  `On Surface`; texto de apoyo en Body Medium `On Surface Variant`.
- Inicio (leading): icono de 20 (en una caja de 20 × 28), sangría de 20, imagen de 56 × 56
  (radio 4, borde 1 `Outline Variant`; seleccionada lleva un check de 20 en `Primary`), video
  de 114 × 64 (radio 4), avatar de 40 o icon button.
- Final (trailing): texto en Label Large `On Surface Variant` y/o icono de 20 (separación 8);
  checkbox o radio (48), switch (52 × 32) o icon button tonal angosto; el texto puede
  acompañar a cualquiera.
- Alineación Middle (todo centrado en el alto) o Top (inicio y final arriba, a 10 del borde).
- Radio del elemento: 4 (`Corner/Extra-small`) en reposo; la capa de hover tiene radio 12
  (`Corner/Medium`); con foco, presionado o seleccionado, radio 16 (`Corner/Large`).
- Estados (capa `On Surface`): hover 8 %, foco 10 %, presionado 8 % más la onda al 10 %.
- Seleccionado: fondo `Secondary Container`, icono relleno, texto final y capas en
  `On Secondary Container` (8 % hover, 10 % foco).
- Deshabilitado: inicio, contenido y final al 38 %; seleccionado y deshabilitado, fondo
  `On Surface` al 10 %.
- Arrastrado: el elemento en `Tertiary Container` con capa `On Tertiary Container` al 16 %,
  sobre un hueco en `Surface Container`.
- Tipos de lista: Standard (elementos pegados); Segmented (filled): separación 2, cada
  elemento con fondo `Surface` y el contenedor con radio 16; Expandable: acordeón con un botón
  de 32 × 40 (radio completo, icono de 20 `keyboard_arrow_down`/`up`, capa
  `On Surface Variant`); expandido, el elemento con fondo `Surface` y el botón en
  `Surface Container`; Draggable; y Swipe (acciones que aparecen al deslizar).

## Chips

Leído del kit el 2026-11-25 (página Chips; conjuntos `Assistive chip` 53923:28089,
`Filter chip` 53923:28270, `Input chip` 53923:27888, `Suggestion chip` 53923:28679 y
`Chip groups` 57376:5501). Variantes: Style Outlined o Elevated (assist, filter, suggestion),
State Enabled, Hovered, Focused, Pressed, Dragged, Disabled, Selected (filter, input y
suggestion) y la configuración de iconos.

- Alto 32, radio 8; el input chip con avatar es redondo (radio completo).
- Rellenos (arriba, final, abajo, inicio): con icono al inicio 6, 16, 6, 8; solo texto 6, 16,
  6, 16; con icono al final (filter) 6, 8, 6, 16; input solo texto con cerrar 6, 8, 6, 12; input
  con icono y cerrar 6, 8, 6, 8; input con avatar 4, 8, 4, 4. Separación 8 entre partes.
- Iconos de 18 (avatar de 24). Texto en Label Large.
- Outlined: borde 1 interior `Outline Variant`, sin fondo (con hover o foco, fondo `Surface`).
  Elevated: `Surface Container Low` y elevación 1.
- Colores del texto: assist `On Surface`; filter, input y suggestion `On Surface Variant`.
  Icono al inicio `Primary`; icono al final y cerrar `On Surface Variant`.
- Seleccionado (filter, input, suggestion): fondo `Secondary Container`, sin borde; texto, icono
  de check (filter) y cerrar en `On Secondary Container`. En el filter el icono de inicio pasa a
  un check de 18; en el input con avatar, el avatar pasa a un check sobre
  `On Secondary Container`. En el suggestion seleccionado el icono de inicio sigue en `Primary`.
- Estados (capa `On Surface Variant`; seleccionado, `On Secondary Container`): hover 8 % (el
  filter seleccionado además sube a elevación 1), foco 10 %, presionado 10 %; arrastrado capa
  `On Surface` 16 % y elevación 4.
- Deshabilitado: borde `On Surface` al 10 % (outlined) o fondo `On Surface Variant` al 10 %
  (elevated y seleccionado); icono y texto `On Surface` al 38 %.
- Grupos: una fila con desplazamiento horizontal (relleno 8 arriba y abajo, separación 8) o
  varias filas con envoltura (separación 8 entre chips y 16 entre filas, en el kit).

## Tooltip

Leído del kit el 2026-11-26 (página Tooltips; conjunto `Plain Tooltip` 54061:33881 con Type
Single line y Multi line, y componente `Rich Tooltip` 54061:33872). El kit no trae estados ni
flecha.

- Plain: relleno 4 arriba y abajo y 8 a los lados, radio 4, fondo `Inverse Surface`, texto en
  Body Small (`Inverse On Surface`); 24 de alto con una línea. El multilínea del kit mide 200 de
  ancho (ancho máximo a confirmar en Compose).
- Rich: 312 de ancho, radio 12, fondo `Surface Container`, elevación 2.
  - Contenido: relleno 12 arriba, 16 a los lados y 4 abajo, separación 4; subtítulo en Title Small
    y texto en Body Medium, los dos en `On Surface Variant`.
  - Acciones: fila con relleno 4 a los lados y 8 abajo (del contenedor), separación 8, con botones
    de texto Small (40 de alto). El conjunto separa contenido y acciones por 8.

## Diferencias con la especificación a revisar

- El indicador con foco del campo de texto mide 3 en el kit. Confirmar en m3.material.io.
- Icono del checkbox en error con `On Primary`.
- Color de la etiqueta seleccionada en la barra de navegación (`Secondary` frente a
  `On Secondary Container`).
