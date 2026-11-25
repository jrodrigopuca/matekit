# matekit

Librería de componentes React basada en Material 3 Expressive, la versión actual del
sistema de diseño de Google. Se publicará en npm como `@matekit/react`.

> **Estado:** en investigación. Todavía no hay código ni paquete publicado.

## Por qué

Google mantiene implementaciones oficiales de Material 3 para Android y Flutter, pero no para
React. Su librería web (`@material/web`) son web components y está en modo mantenimiento
desde 2024, y MUI sigue basada en Material Design 2. matekit busca una implementación de
Material 3 para React hecha con cuidado: accesible, con temas completos y fiel al kit de
diseño oficial.

## Enfoque

- **Fuente de verdad:** el Material 3 Design Kit oficial de Figma, del que se extrajeron
  tokens y medidas.
- **Tokens primero:** color (claro y oscuro), tipografía, esquinas, elevación y capas de
  estado como variables CSS, antes que cualquier componente.
- **Paletas y contraste:** además del esquema del kit, paletas opcionales generadas desde un
  color semilla y tres niveles de contraste, elegidos con atributos en cualquier elemento
  ([ADR-0008](docs/adr/0008-paletas-y-niveles-de-contraste.md)):

  ```html
  <!-- import '@matekit/react/styles.css' y, si se usa, la paleta: tokens/palettes/green.css -->
  <html data-palette="green" data-contrast="high" data-theme="dark">
  ```
- **Sin dependencias de comportamiento al inicio:** elementos nativos de HTML, `<dialog>` y
  la API Popover donde alcancen.
- **API por composición:** las partes de cada componente se arman con subcomponentes
  (`TextFieldLabel`, `DialogActions`) organizados en capas al estilo Atomic Design, y las
  primitivas se exportan para construir componentes propios
  ([ADR-0002](docs/adr/0002-api-por-composicion-con-capas-atomicas.md)).
- **Pocos componentes, bien hechos:** primer conjunto de Button, Text field, Checkbox,
  Switch, Dialog, Menu y Navigation.

## Documentación

- [Investigación](docs/research/README.md): panorama, kit de Figma, tokens, componentes y
  medidas.
- [Decisiones de arquitectura](docs/adr/README.md).

## Contribuir con la investigación

Las herramientas de extracción leen una copia propia del kit de Figma. Copia
[`.env.example`](.env.example) a `.env.local` y completa la clave de tu copia; ese archivo no
se versiona.

## Licencia

Por definir.
