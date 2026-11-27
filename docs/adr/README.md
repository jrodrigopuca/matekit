# Decisiones de arquitectura

Una decisión por archivo, numeradas. Una decisión aceptada no se edita: si cambia, una ADR
nueva la reemplaza y la anterior pasa a "superseded by".

| N.º | Decisión | Estado |
|---|---|---|
| [0001](0001-publicar-como-matekit-react.md) | Publicar la librería como `@matekit/react` dentro de la organización `matekit` | accepted |
| [0002](0002-api-por-composicion-con-capas-atomicas.md) | API por composición, con capas inspiradas en Atomic Design y partes con nombres planos | accepted |
| [0003](0003-componentes-universales-e-interactivos.md) | Componentes universales sin `'use client'` e interactivos con `'use client'` | accepted |
| [0004](0004-fuentes-de-verdad-y-especificacion-de-color.md) | Fuentes de verdad de los tokens y especificación de color 2021 por defecto | accepted |
| [0005](0005-estilos-css-con-prefijo-y-capas.md) | Estilos en CSS plano con prefijo `mk-`, capas `@layer` y una hoja única | accepted |
| [0006](0006-iconos-atomo-y-set-acotado.md) | Átomo `Icon` como contenedor y un set acotado de Material Symbols en SVG | accepted |
| [0007](0007-menu-popover-y-anchor-positioning.md) | Menús con la API Popover y CSS anchor positioning, con respaldo en JavaScript | accepted |
| [0008](0008-paletas-y-niveles-de-contraste.md) | Paletas opcionales y niveles de contraste generados al compilar, con `light-dark()` | accepted |
| [0009](0009-paquete-matekit-theme.md) | Generador de paletas como paquete aparte, `@matekit/theme`, que trabaja al compilar con un solo color | accepted |
| [0010](0010-enlaces-y-enrutadores-con-render.md) | Destinos de navegación como `<a>`, `<button>` o el elemento de `render`, sin depender del enrutador | accepted |
| [0011](0011-formas-decorativas-portando-graphics-shapes.md) | Formas decorativas e indicador de carga, portando `androidx.graphics.shapes` como herramienta de compilación | accepted |
| [0012](0012-radiogroup-con-estado-por-contexto.md) | `RadioGroup` con estado compartido por contexto y `onValueChange`, como excepción al ADR-0003 | accepted |
| [0013](0013-indicadores-de-progreso-dibujados-con-css.md) | Indicadores de progreso universales dibujados con CSS (consultas de contenedor, `@property` y guiones SVG) | accepted |
| [0014](0014-slider-dibujado-sobre-input-range-nativo.md) | Slider dibujado sobre un `<input type="range">` nativo e invisible, como componente cliente (excepción al ADR-0003) | accepted |
| [0015](0015-card-superficie-con-accion-principal-extendida-y-container-queries.md) | Card como superficie con una acción principal extendida a toda la tarjeta, y disposición por container queries sobre su propio ancho | accepted |
| [0016](0016-escala-de-espaciado-y-cortes-de-ventana.md) | Escala de espaciado como `--md-sys-space-*` y cortes de ventana como datos, no como variables CSS | accepted |
| [0017](0017-stack-y-group.md) | `Stack` como capa delgada sobre flex y `Group` con esquinas por posición en variables que leen los hijos | accepted |
| [0018](0018-list-semantica-por-caso-y-partes.md) | List con semántica por caso (contenido, enlaces o botones con un área extendida, selección con el control envolviendo el texto, acordeón con `<details>`), partes de frase y estados derivados de los controles | accepted |
| [0019](0019-chips-grupo-con-foco-itinerante-seleccion-y-quitado.md) | Chips con un grupo `toolbar` de foco itinerante, selección por contexto como toggles y quitado controlado por el uso, como excepción al ADR-0003 | accepted |
| [0020](0020-interactive-primitiva-publica.md) | `Interactive` como primitiva pública de elemento interactivo; el contrato de `render` de ADR-0010 pasa a ser API pública | accepted |
| [0021](0021-tooltip-nombre-descripcion-y-rich-con-acciones.md) | Tooltip que envuelve al disparador, nombre o descripción según `text`, rich con acciones como diálogo no modal, y posicionamiento compartido con el Menu | accepted |
| [0022](0022-snackbar-cola-creada-por-la-app-host-y-region-viva.md) | Snackbar con una cola que crea la app (`createSnackbarQueue`), un host por cola con región viva permanente, F6 para llegar a la acción y duraciones de Compose que se detienen con el puntero y el foco | accepted |
| [0023](0023-tabs-pestanas-apg-enlaces-indicador-flip-y-foco-itinerante-compartido.md) | Tabs con pestañas APG por contexto, `TabNav`/`TabLink` aparte para navegar entre páginas, paneles ocultos y montados (`unmount` opcional), indicador por pestaña animado con FLIP y foco itinerante compartido en `src/internal/roving-focus.ts` | accepted |
| [0024](0024-top-app-bar-sticky-en-su-contenedor-animaciones-por-desplazamiento-y-parte-cliente-aislada.md) | Top app bar universal: `position: sticky` en el contenedor que se desplaza, color y colapso con animaciones atadas a `scroll(nearest)`, títulos cruzados con una copia oculta y una parte cliente aislada para el alto real, el respaldo y `enter-always` | accepted |
| [0025](0025-sheets-sobre-dialog-base-modal-comun-arrastre-con-puntero-y-desplazamiento-anidado.md) | Sheets sobre `<dialog>` con una base modal común (`useModalDialog`, también para el NavigationRail modal), estados parcial y expandido, arrastre con eventos de puntero y desplazamiento anidado decidido al empezar el gesto | accepted |
| [0026](0026-search-combobox-apg-con-activedescendant-vista-docked-o-pantalla-completa-por-ventana.md) | Search como combobox APG con `aria-activedescendant`, raíz `<search>` con estado por contexto, sugerencias como opciones con las partes de ListItem y vista docked o a pantalla completa elegida por la clase de ventana | accepted |
| [0027](0027-toolbar-apg-con-foco-itinerante-colores-por-variables-fab-en-toolbarlayout-y-ocultar-con-el-inset-del-sticky.md) | Toolbar como `role="toolbar"` con el foco itinerante compartido, colores de los botones por variables públicas que leen IconButton y Button, FAB acompañante en `ToolbarLayout` y ocultar al desplazar con el inset del `position: sticky` | accepted |
| [0028](0028-diagnosticos-con-formato-unico-codigos-estables-y-catalogo.md) | Diagnósticos con un formato único (`[matekit] <Component>: … Fix: … (<CODE>)`), códigos estables por causa, `MatekitError` público, catálogo `docs/diagnostics.md` y salidas de la librería en inglés | accepted |
| [0029](0029-navigation-suite-con-una-sola-estructura-y-media-queries-y-navigation-rail-modal.md) | `NavigationSuite` universal con una sola estructura que cambia de presentación con media queries (regla de Compose, sin rail expandido automático), y `ModalNavigationRail` sobre la base modal común | accepted |
