# Investigación: matekit, librería de componentes React sobre Material 3

Notas recolectadas antes de escribir código. Última actualización: 2026-11-24.
El paquete se publicará como `@matekit/react` (ver
[../adr/0001-publicar-como-matekit-react.md](../adr/0001-publicar-como-matekit-react.md)).

## Archivos

| Archivo | Contenido |
|---|---|
| [01-panorama.md](01-panorama.md) | Estado del ecosistema: MUI, `@material/web`, librerías comunitarias |
| [02-kit-figma.md](02-kit-figma.md) | Estructura del Material 3 Design Kit y evidencia de que ya es Expressive |
| [03-tokens.md](03-tokens.md) | Tipografía, esquinas, elevación, color y capas de estado leídos del kit |
| [04-componentes.md](04-componentes.md) | Variantes y estados de los componentes del primer conjunto |
| [05-medidas.md](05-medidas.md) | Medidas internas, colores por estado y tipografía de cada componente |
| [06-alternativas.md](06-alternativas.md) | Revisión de `m3-expressive-react` y `expressive-react` |
| [data/color-schemes.csv](data/color-schemes.csv) | Los 49 roles de color, claro y oscuro |
| [tools/extraccion-pendiente.md](tools/extraccion-pendiente.md) | Ids de nodos consultados y cómo repetir la extracción |

## Fuentes

- **Kit de Figma (fuente principal):** copia propia del "Material 3 Design Kit (Community)".
  La clave de esa copia no se versiona: va en `.env.local` como `FIGMA_FILE_KEY` (ver
  [`.env.example`](../../.env.example)). Original:
  https://www.figma.com/community/file/1035203688168086460/material-3-design-kit
- **Especificación:** https://m3.material.io — no se pudo leer de forma automática (la página
  se dibuja con JavaScript). Pendiente de leer con navegador.
- **design.google:** sitio editorial, sin especificaciones. Solo sirve el artículo
  https://design.google/library/expressive-material-design-google-research

## Cómo leer estas notas

Cada dato indica de dónde salió. "Leído del kit" significa que se obtuvo con el conector de
Figma en esta fecha. "De memoria" o "fuente secundaria" significa que no está verificado
contra la especificación oficial.

## Decisiones abiertas

Ninguna está cerrada todavía.

1. **Dependencias headless.** Propuesta: empezar sin dependencias (elementos nativos,
   `<dialog>`, API Popover) y decidir caso por caso en los componentes difíciles
   (combobox, selector de fecha). Falta confirmar el soporte de navegadores.
2. **Base vs. Expressive.** El kit actual ya es Expressive y marca lo anterior como
   "Baseline" o "Deprecated". Propuesta: apuntar a lo que trae el kit y dejar movimiento
   y formas como tokens del tema.
3. **Primer conjunto de componentes.** Candidatos: Button, Text field, Checkbox, Switch,
   Dialog, Menu, Navigation bar.

## Pendiente de recolectar

- Modos de contraste medio y alto, y los 13 temas de color del kit (solo se exportaron
  Light y Dark).
- Valores de movimiento (resortes): el kit no tiene página de movimiento.
- Detalles sueltos de medidas: botón Square fuera de Medium, campo de texto sin iconos,
  texto del elemento de menú, nivel de sombra del botón Elevated, switch sin activar en
  hover (ver [05-medidas.md](05-medidas.md)).
- Páginas del kit no abiertas: App bars, Badges, Cards, Carousel, Chips, Date & time
  pickers, Dividers, Lists, Loading & progress, Radio button, Search, Sheets, Sliders,
  Snackbar, Tabs, Toolbars, Tooltips.
