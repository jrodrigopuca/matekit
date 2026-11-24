# Componentes del primer conjunto

Leído del kit el 2026-11-24. Solo nombres de variantes, propiedades y tamaños exteriores.
Faltan las medidas internas (rellenos, tamaños de icono) y los colores por estado.

## Button (página Buttons, 55141:14168)

La página tiene 3.018 variantes en total entre todos sus componentes.

Componentes de la página:

- Button, en cinco colores: Filled (el marco se llama solo "Button"), Tonal, Outlined,
  Elevated y Text.
- Toggle button, en Filled, Tonal, Outlined y Elevated.
- Icon button, en Filled, Tonal, Outlined y Standard, cada uno con versión alternable.
- Split button, FAB, Extended FAB, FAB menu.
- Button groups: Standard y Connected.
- Segmented button, en la sección "Baseline".

Propiedades del botón común:

| Propiedad | Valores |
|---|---|
| Type (forma) | Round, Square |
| Size | XSmall, Small, Medium, Large, XLarge |
| State | Enabled, Hovered, Focused, Pressed, Disabled |

Otras propiedades vistas en la página, sin asignar todavía a un componente concreto:
Configuration (Icon only, Label only, Label & icon), Selected, Width (Narrow, Default, Wide),
Density (0 a -3), Segments (2 a 5).

## Text field (página Text fields, 55141:14259)

120 variantes, todas de 210 × 56.

| Propiedad | Valores |
|---|---|
| Style | Filled, Outlined |
| State | Enabled, Hovered, Focused, Error, Disabled |
| Text configurations | Input text, Label text, Placeholder text |
| Leading icon | True, False |
| Trailing icon | True, False |

No hay estado Pressed. No se vio variante multilínea.

## Checkbox (página Checkboxes, 55141:14173)

30 variantes, área de 48 × 48.

| Propiedad | Valores |
|---|---|
| Type | Selected, Indeterminate, Unselected, Error selected, Error indeterminate, Error unselected |
| State | Enabled, Hovered, Focused, Pressed, Disabled |

## Switch (página Switch, 55141:14257)

20 variantes, de 52 × 32.

| Propiedad | Valores |
|---|---|
| Selected | True, False |
| State | Enabled, Hovered, Focused, Pressed, Disabled |
| Icon | True, False |

## Dialog (página Dialogs, 55141:14176)

Tres tipos, todos de 312 de ancho, cada uno con la propiedad Icon (True, False):

- Basic dialog
- List dialog
- Scrollable list dialog

Hay además un "XR Dialog", que no aplica a web. No se vio un diálogo a pantalla completa.

## Menu (página Menu, 55141:14250)

Menú actual, de 208 de ancho:

| Propiedad | Valores |
|---|---|
| Theme | Standard, Vibrant |
| Groups | 1, 2, 3 |

Elemento de menú (Menu item), de 48 de alto:

| Propiedad | Valores |
|---|---|
| State | Enabled, Hovered, Focused, Pressed, Disabled, Active |
| Selected | True, False |

Partes del elemento:

- Elemento inicial: Indent, Icon o Slot.
- Contenido: Text o Slot.
- Elemento final: Text, Icon, Slot o Badge.
- Etiqueta de sección, en versión básica y Vibrant.
- Divisor entre grupos.

"Slot" es un hueco para contenido libre. El menú anterior ("Menu (baseline)") usa densidades
0, -2 y -4 y está en la sección "Baseline".

## Navigation (página Navigation, 55141:14251)

| Componente | Propiedades |
|---|---|
| Navigation bar, elementos verticales | Nav items: 3, 4, 5 |
| Navigation bar, elementos horizontales | Nav items: 3, 4, 5, 6 |
| Navigation rail (contraída, 96 de ancho) | Alignment: Top, Middle · Nav items: 3 a 6 |
| Navigation rail expandida (220 de ancho) | Type: Docked, Floating · Alignment: Top, Middle · Nav items: 3 a 6 |

Elemento de navegación (Nav item):

| Propiedad | Valores |
|---|---|
| State | Enabled, Hovered, Focused, Pressed |
| Selected | True, False |
| Badge | None, Small, Large |
| Show label | True, False (solo en la rail vertical) |

Los elementos de navegación no tienen estado Disabled. El Navigation Drawer está en la
sección "Deprecated". Las variantes "XR" no aplican a web.

## Observaciones para el diseño de la API

- Los estados Hovered, Focused y Pressed son estados de interacción: en código salen de
  pseudo-clases de CSS, no de propiedades del componente.
- Error en Text field y Checkbox sí es una propiedad.
- Varios componentes nuevos usan "Slot", lo que sugiere APIs por composición más que por
  muchas propiedades.
