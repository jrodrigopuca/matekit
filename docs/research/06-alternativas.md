# Alternativas existentes

Revisión del 2026-11-24. Se clonaron los repositorios y se leyó su código, pruebas y
configuración; no se ejecutaron ni se probaron en un navegador. Las cifras de descargas son
del último mes según la API de npm.

## Resumen

| | `m3-expressive-react` | `expressive-react` |
|---|---|---|
| Repositorio | https://github.com/minop1205/m3-expressive-react | https://github.com/mooler-z/expressive-react |
| Documentación | https://minop1205.github.io/m3-expressive-react/ | https://expressive-react.moolerz.et |
| Versión | 1.8.2 | 1.2.0 |
| Licencia | MIT | MIT |
| Repositorio creado | 2026-06-18 (npm: 2026-09-30) | 2026-10-27 (npm: 2026-11-02) |
| Último cambio | 2026-11-15 | 2026-11-05 |
| Autores | 1 persona (más un bot de publicación) | 1 persona |
| Actividad | Cientos de commits, flujo con ramas y PRs, changelog | 11 commits en unos diez días |
| Descargas último mes | 1.367 | 437 |
| Estrellas / issues abiertos | 2 / 2 | 1 / 0 |
| Componentes | 43 | 79 en `ui`, más bloques y plantillas (186 entradas en su registro) |
| Dependencias | solo `clsx` | React Aria, Tailwind v4, Motion, Recharts y otras |
| Requisitos | React 18 o 19 | React 19 y Tailwind CSS 4.1 |
| Pruebas | 81 archivos de pruebas unitarias (Vitest) y pruebas visuales con Playwright | 1 archivo de pruebas |

## `m3-expressive-react`

Es lo más parecido al plan de matekit, casi punto por punto.

- **Tokens primero.** Todo sale de propiedades CSS `--md-sys-*`; un script de lint impide
  valores de respaldo sueltos. El estilo se importa aparte (`styles.css`).
- **Color dinámico.** `ThemeProvider` genera los 49 roles (claro y oscuro) a partir de un
  color semilla.
- **Movimiento con resortes.** Tiene los tokens de resortes de Expressive (amortiguación y
  rigidez) y un esquema de movimiento estándar y expresivo, como Compose.
- **Accesibilidad sin dependencias.** Elementos nativos (`<input type="checkbox">`, etc.)
  y patrones de teclado propios según la guía WAI-ARIA APG: el menú tiene flechas, inicio,
  fin y búsqueda por letra, con pruebas de teclado.
- **Fidelidad al kit.** Coincide con lo que extrajimos del kit de Figma: botones en los
  cinco tamaños de Expressive, cambio de forma redonda ⇄ cuadrada, menú Standard y Vibrant.
- **Fuentes de la especificación**, en orden: m3.material.io, luego Jetpack Compose, luego
  `@material/web`.
- **Calidad del proceso.** Integración continua, Storybook, sitio de documentación con
  tablas de propiedades generadas, soporte para Next.js App Router y un chequeo del paquete
  antes de publicar.
- **API al estilo MUI**: un componente por tipo con `variant`, `onChange(event, value)`,
  `startIcon` / `endIcon`.
- Está desarrollada con asistencia de IA (tiene un `CLAUDE.md` con reglas para
  colaboradores humanos o IA).

Riesgos:

- Depende de una sola persona y es muy nueva; casi no tiene comunidad (2 estrellas).
- La API imita a MUI; si se prefiere composición (slots), no encaja.

## `expressive-react`

Un enfoque distinto: estilo shadcn.

- **Dos formas de uso:** copiar el código de cada componente al propio proyecto con la CLI
  de shadcn, o instalar el paquete de npm.
- **Comportamiento con React Aria**, estilos con Tailwind CSS v4 y animación con Motion.
- **Mucho alcance:** además de los componentes, bloques y plantillas (tableros, calendario,
  agenda, visor de imágenes) y 20 temas predefinidos.
- Los tamaños del botón coinciden con el kit. Documenta además radios del botón cuadrado
  por tamaño (12, 12, 16, 28, 28) y radios al presionar, que en el kit no se extrajeron.

Riesgos:

- Muy nuevo y con casi nada de pruebas (1 archivo).
- Obliga a usar React 19 y Tailwind 4, y arrastra dependencias pesadas.
- Gran parte del alcance responde a un producto concreto del autor (por ejemplo, un
  calendario etíope para un sistema escolar).

## Qué implica para matekit

`m3-expressive-react` ya cubre el hueco que matekit quería llenar, con el mismo enfoque
(tokens CSS, sin dependencias, elementos nativos, fiel a Expressive) y más avanzado:
43 componentes probados frente a cero. Competir de frente con la misma propuesta tiene poco
sentido. Las opciones están en la conversación del 2026-11-24 y se registrarán como ADR
cuando haya decisión.
