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
- **Sin dependencias de comportamiento al inicio:** elementos nativos de HTML, `<dialog>` y
  la API Popover donde alcancen.
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
