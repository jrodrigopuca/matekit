# ADR-0006: Átomo `Icon` como contenedor y un set acotado de Material Symbols en SVG

- Status: accepted (2026-11-24)
- Drivers:
  - Los componentes necesitan iconos propios (marca del Checkbox, cruz y marca del Switch,
    borrar y error del TextField, flecha de submenú) y los proyectos del autor necesitan
    algunos de uso común sin depender de otra librería.
  - Material Symbols tiene miles de iconos: incluirlos todos inflaría el paquete. El paquete
    comunitario `@material-symbols/svg-400` pesa unos 13 MB y trae la variante de 48 px de
    tamaño óptico (trazo de 60 unidades), más fina que la de 24 px (80 unidades) que
    corresponde a iconos de 20 a 24 px.
  - Materialize CSS, tomado como referencia, no incluía iconos propios: pedía cargar la fuente
    Material Icons desde Google Fonts (`<i class="material-icons">add</i>`).
- Decision:
  - **`Icon`** es un átomo universal que solo da tamaño (`--mk-icon-size`, 24 px por defecto,
    o el que defina el componente que lo contiene), color (`currentColor`) y accesibilidad
    (oculto por defecto; con `label`, `role="img"` y `aria-label`). Acepta cualquier SVG.
  - **Set acotado:** 32 iconos de Material Symbols, estilo Outlined, peso 400, tamaño óptico
    24 px, listados en `icons/icons.json`. Tres (star, favorite, bookmark) admiten `filled`.
    Se descargan del repositorio oficial `google/material-design-icons` en un commit fijo
    (`pnpm icons:fetch`) y se generan como componentes (`AddIcon`, `StarIcon`…) con
    `pnpm icons`. Los trazos se versionan en `icons/material-symbols.json`.
  - La licencia Apache-2.0 de los trazos se distribuye en `icons/LICENSE-material-symbols`.
  - La fuente tipográfica de Material Symbols no se soporta por ahora.
- Tradeoff accepted: un icono que no esté en la lista se agrega editando `icons.json` y
  regenerando, o se usa desde otra fuente envuelto en `<Icon>`. El estilo Outlined queda
  fijo para los iconos incluidos.
- Revisit if: los proyectos necesitan con frecuencia iconos fuera de la lista, o la animación
  de contorno a relleno de la fuente variable se vuelve necesaria (por ejemplo, en toggles);
  entonces evaluar soporte para la fuente de Material Symbols.
