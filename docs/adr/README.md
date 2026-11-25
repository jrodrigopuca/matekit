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
