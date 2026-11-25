# Lecciones de los componentes `mio-*` de m3.material.io

Resumen del 2026-11-24 de dos documentos temporales del autor (`mio.md`, una guía para
construir librerías de Web Components, y `mio-components.md`, la API extraída de los 31
componentes Angular `mio-*` del sitio m3.material.io). El sitio es código propietario de
Google: estas notas sirven para aprender cómo está armado, no para copiar su CSS ni su
estructura. Las fuentes de matekit siguen siendo las del ADR-0004.

## Qué confirma de matekit

- **Tokens como API de estilos**, por rol, con variables privadas `--_` y públicas por
  componente (ADR-0005). El sitio no fija colores a mano en sus componentes.
- **Contenido como hijos, no como props**, y nunca HTML dentro de strings (ADR-0002). El
  antipatrón del sitio: `mio-card`, con 40 entradas (12 solo para miniaturas por proporción y
  modo oscuro) y texto con HTML que hay que sanear.
- **Variantes como una unión de valores**, no un booleano por variante.
- **Componentes sin datos, sin router y sin analítica**: avisan con eventos y la aplicación
  decide. El sitio acopla analítica (`mioAnalyticsTracking` en 13 componentes) y servicios de
  tema inyectados (en 9).
- **Elemento nativo adentro, área táctil de 48 y movimiento reducido.** El switch del sitio
  mide 48 de alto y expone `role` + `aria-checked`; el de matekit usa `<input role="switch">`,
  que además participa en formularios.
- **Un solo sistema de tokens.** El sitio mezcla MDC, MWC, Angular Material y Carbon, con
  variables puente `--mdc-*`, `--mat-*` y `--crbn-*` para que hereden su tema.

## Qué le faltaba a matekit

| Tema | Detalle | Estado |
|---|---|---|
| Alto contraste (`forced-colors: active`) | El sitio lo atiende en el switch, el buscador y la cabecera. Sin él, los componentes que se distinguen por fondo o sombra pierden forma. | Hecho (2026-11-24): Checkbox y Switch desaparecían, el TextField filled y el Dialog perdían su borde, el toggle seleccionado no se distinguía. Pruebas en `src/test/forced-colors.test.tsx`. |
| Lint de valores sueltos | Rechazar en CI colores o duraciones literales en el CSS de los componentes. | Hecho (2026-11-24): `pnpm lint:css` revisa color, duración, curva y tipografía; corre en CI. |
| Revisión automática de accesibilidad | axe-core en las pruebas. Agrega una dependencia. | Hecho (2026-11-24): axe-core 4.14.0 (dev) en `src/test/a11y.test.tsx`; el contraste que axe deja sin decidir (elementos cubiertos por los átomos) se mide en `src/test/contrast.test.tsx`. |
| Paleta de referencia (`--md-ref-palette-*`) | Capa entre los valores crudos y los roles; facilita el color dinámico. | Para cuando se haga el color dinámico |
| Clases de tamaño de ventana | Compacto < 600, medio 600–839, expandido 840–1199, grande ≥ 1200 (M3). El sitio usa 600 / 960 / 1294 propios, con rangos que se solapan en 1 px (960/961, 1294/1295). | Para NavigationBar y NavigationRail |
| Container queries | Que un componente se adapte a su contenedor, no a la ventana (el sitio cambia `mio-card` con el ancho de la ventana). | Para componentes de contenido, más adelante |

## Qué no aplica

Shadow DOM, `delegatesFocus`, `ElementInternals`, `::part` y el Custom Elements Manifest son
propios de Web Components. El monorepo con varios paquetes, Changesets y la política de
versiones corresponden a la etapa de publicación (ADR-0001 ya prevé dividir en paquetes si
hace falta).

## Otros datos del sitio

- Usa la fuente Google Symbols con el eje `FILL` para iconos rellenos: es la opción de fuente
  que el ADR-0006 dejó para más adelante.
- Expresa la preferencia de animaciones con un interruptor propio además de
  `prefers-reduced-motion`; matekit usa la preferencia del sistema y `data-motion`.
