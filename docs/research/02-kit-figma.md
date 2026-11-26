# Material 3 Design Kit (Figma)

Leído del kit el 2026-11-24, desde una copia propia del archivo de la comunidad
(clave en `FIGMA_FILE_KEY`, fuera del repositorio).

## Páginas

Los identificadores sirven para volver a consultar cada página con el conector de Figma.

| Página | Id | Abierta |
|---|---|---|
| Getting started | 11:1833 | sí |
| Table of contents | 55879:3580 | no |
| Avatars | 55595:3788 | no |
| Icons | 55594:2483 | no |
| Examples | 55594:2480 | no |
| Shape | 58548:7093 | sí |
| Styles | 49823:12141 | sí |
| Utilities | 55594:2484 | no |
| App bars | 55141:14169 | no |
| Badges | 55141:14167 | no |
| Buttons | 55141:14168 | sí |
| Cards | 55141:14171 | sí |
| Carousel | 55141:14172 | no |
| Checkboxes | 55141:14173 | sí |
| Chips | 55141:14174 | sí |
| Date & time pickers | 55141:14175 | no |
| Dialogs | 55141:14176 | sí |
| Dividers | 55141:14177 | sí |
| Lists | 55141:14249 | sí |
| Loading & progress | 55141:14252 | sí |
| Menu | 55141:14250 | sí |
| Navigation | 55141:14251 | sí |
| Radio button | 55141:14253 | sí |
| Search | 55141:14254 | no |
| Sheets | 55141:14170 | no |
| Sliders | 55141:14255 | sí |
| Snackbar | 55141:14256 | sí |
| Switch | 55141:14257 | sí |
| Tabs | 55141:14258 | sí |
| Text fields | 55141:14259 | sí |
| Toolbars | 58295:22726 | no |
| Tooltips | 55141:14261 | sí |

No existe una página de movimiento.

## El kit ya es Material 3 Expressive

Evidencia leída del archivo:

- **Shape:** contiene 35 formas decorativas y la escala de esquinas ampliada
  (ver [03-tokens.md](03-tokens.md)).
- **Buttons:** incluye Split button, FAB menu y Button groups. El Segmented button está en
  una sección llamada "Baseline".
- **Menu:** el menú nuevo tiene temas Standard y Vibrant; el anterior está en una sección
  "Baseline" con el nombre "Menu (baseline)".
- **Navigation:** el Navigation Drawer está en una sección "Deprecated".
- **Styles:** la escala tipográfica incluye las variantes "emphasized".
- **Toolbars:** componente propio de Expressive.

Consecuencia: el kit no ofrece un Material 3 "base" separado. Lo anterior aparece rotulado
como "Baseline" o "Deprecated".

## Otros hallazgos

- La portada del kit dice que Material para Android es "Compose-first" y que la librería de
  Views (MDC-Android) está en modo mantenimiento.
- Varias páginas incluyen variantes "XR" (Dialog, Navigation bar, Navigation rail), pensadas
  para realidad extendida. No aplican a web.
- Los nombres de variantes tienen erratas (por ejemplo "Presssed" en botones). No copiarlos
  sin revisar.
