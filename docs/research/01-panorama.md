# Panorama del ecosistema

Búsquedas web hechas el 2026-11-24. Son resultados de buscador, no una revisión del código
de cada proyecto.

## Librerías existentes

| Proyecto | Estado encontrado | Fuente |
|---|---|---|
| MUI (Material UI) | Su sitio dice que adopta Material Design 2, aunque ya publicó la v9. Material 3 estaba "tentativamente" planeado para la v7. Es de una empresa independiente, no de Google. | https://mui.com/material-ui/ · https://github.com/mui/material-ui/issues/29345 |
| `@material/web` | Oficial de Google, implementa Material 3 como web components (no React). En modo mantenimiento desde junio de 2024, sin trabajo futuro planeado. | https://github.com/material-components/material-web/discussions/5642 |
| `m3x` | React, apunta a Expressive. 1 estrella en GitHub. | https://github.com/tankrap/m3x |
| `@hadi_gunawan/md3-expressive-ds` | v0.2.3, dice tener más de 40 componentes. | https://www.jsdelivr.com/package/npm/@hadi_gunawan/md3-expressive-ds |
| `material-expressive-react` | v0.2.1, envuelve `@material/web`. | https://www.pkgstats.com/pkg:material-expressive-react |
| `@miyauci/material-react` | Beta, no distribuye su CSS por JSR. | https://jsr.io/@miyauci/material-react |

## Actualización (2026-11-24, consulta al registro de npm)

Dos librerías de React para Expressive que la búsqueda web no encontró:

| Paquete | Creado | Versión | Descargas último mes | Repositorio |
|---|---|---|---|---|
| `m3-expressive-react` | 2026-09-30 | 1.8.2 (15 versiones) | 1.367 | https://github.com/minop1205/m3-expressive-react |
| `expressive-react` | 2026-11-02 | 1.2.0 (2 versiones) | 437 | https://github.com/mooler-z/expressive-react |

Otras con nombre parecido, poco activas: `m3-react` (39 descargas, última versión en
2023), `md3-react` (79 descargas, 2024). Pendiente: revisar `m3-expressive-react` por
dentro (accesibilidad, temas, estados) antes de definir el diferencial de matekit.

## Conclusiones

- No hay una implementación madura de Material 3 para React, aunque desde septiembre de
  2026 hay dos intentos activos (ver la actualización de arriba). El hueco se está
  ocupando.
- Varias personas ya lo intentaron y ninguna se consolidó: el diferencial no es que exista
  una, sino que esté bien hecha (accesibilidad, teclado, foco, temas, mantenimiento).
- Según uno de los proyectos comunitarios, Google indicó que Material 3 Expressive para web
  es poco probable a corto plazo. Es un dato de segunda mano, sin confirmar.

## Material 3 Expressive

De fuentes secundarias y de la guía de Android (Wear OS), no de la especificación directa.
Expressive es una evolución de Material 3, no una versión nueva.

| Área | Qué agrega |
|---|---|
| Movimiento | Resortes en lugar de curvas y duraciones fijas; dos tipos: espaciales y de efectos |
| Formas | 35 formas decorativas, con transición animada entre ellas |
| Tipografía | Estilos "enfatizados", fuentes variables |
| Color | Paletas tonales más profundas, más tokens |
| Componentes | Grupos de botones, barras de herramientas, entre otros |

Fuentes: https://developer.android.com/design/ui/wear/guides/get-started/design-language ·
https://supercharge.design/blog/material-3-expressive
