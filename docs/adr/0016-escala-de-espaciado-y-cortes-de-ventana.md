# ADR-0016: Escala de espaciado como `--md-sys-space-*` y cortes de ventana como datos, no como variables CSS

- Status: accepted (2026-11-25)
- Drivers:
  - El ítem 13 del plan pide una escala de espaciado para `Stack`, `Group` y los componentes que
    vienen (List, Chips, Button groups), tomada de Compose `tokens/MeasurementTokens.kt` (tokens
    de Material 3 v41.1.19, commit `76990c62ac` del 2026-11-24), donde ya la usan `ListTokens`,
    `ChipsTokens`, `Button*Tokens` y `ConnectedButtonGroupSmallTokens`.
  - ADR-0005: los tokens llevan los nombres oficiales `--md-sys-*`. La investigación previa
    (`docs/research/11-disposicion-adaptable-compose.md`) no había encontrado un nombre oficial
    para el espaciado y proponía `--mk-space-*` para no inventar un `--md-sys-*`.
  - Las clases de tamaño de ventana (Compose `WindowSizeClass.kt`) sirven para la disposición de
    la página, pero las condiciones de `@media` y `@container` no aceptan `var()`.
  - El CSS de los componentes ya existentes escribe el espaciado en px; migrarlo no entra en este
    ítem, pero lo nuevo no debería sumar más.
- Decision:
  - **Nombre: `--md-sys-space-<paso>`**, el que publica Google en `@material/web`,
    `labs/gb/styles/space/md-space-tokens.scss` (commit `026f39dbd2`, 2026-04-28, "feat(labs): add
    spacing system stylesheet"; leído el 2026-11-25 en `main`, `875a8b6b88`). Trae los mismos 18
    pasos que Compose con la misma numeración (`--md-sys-space-25` = 2, `--md-sys-space-100` = 8), y
    la integración con Tailwind del mismo directorio (`labs/gb/styles/tailwind.scss`) los expone
    como `--spacing-s0` … `--spacing-s900`. Existiendo el nombre oficial, se descarta `--mk-space-*`.
  - **Numeración de Compose y de `@material/web`**: el paso es centésimas de 8 (0, 25, 50, 75,
    100, 125, 150, 175, 200, 250, 300, 400, 450, 500, 600, 700, 800 y 900 → 0, 2, 4, 6, 8, 10, 12,
    14, 16, 20, 24, 32, 36, 40, 48, 56, 64 y 72). No es una retícula de 4 (trae 2, 6, 10 y 14).
    Se descartan numeraciones propias (`xs`…`xl`, o el valor en px): no coincidirían con los tokens
    de componentes de Compose, que citan `Space150`, ni con `@material/web`.
  - **Valores literales en px** (como `--md-sys-shape-corner-*`), generados por `pnpm tokens` desde
    `tokens/space.json` en `src/tokens/space.css`, dentro de `matekit.tokens`. `@material/web` los
    escribe como `calc(var(--md-sys-space-unit) * n)` con `--md-sys-space-unit: 8px`; no se trae la
    unidad: Compose no la tiene, y cambiar la densidad no está pedido.
  - **TypeScript**: el mismo generador escribe `src/tokens/space.ts` (`SPACE`, paso → px, y el tipo
    `SpaceStep`) para tipar la prop `gap` de `Stack` (ADR-0017).
  - **Cortes de ventana como datos**: `tokens/breakpoints.json` y `src/tokens/breakpoints.ts`
    (`WINDOW_WIDTH` = medium 600, expanded 840, large 1200, extraLarge 1600; `WINDOW_HEIGHT` =
    medium 480, expanded 900; `BREAKPOINTS_V2` de `WindowSizeClass.kt`, commit `5c7b947a5b`),
    exportados desde `src/index.ts` para `matchMedia`. Sin variables CSS. En CSS se escriben
    literales en rem (37.5rem, 52.5rem, 75rem, 100rem; 30rem y 56.25rem), como ya hace `card.css`.
    Son para la página (paneles, barra o rail); los componentes se adaptan a su contenedor con
    container queries. Coinciden con los `--breakpoint-*` de `labs/gb/styles/tailwind.scss`.
  - **Regla de `pnpm lint:css` para el espaciado, desde ahora**: `gap`, `row-gap`, `column-gap`,
    `padding*` y `margin*` no pueden llevar longitudes escritas a mano distintas de 0 (sí
    `var(--md-sys-space-*)`, otras variables, `0`, `auto` y `%`). Una medida fuera de la escala se
    marca con `/* lint-css-allow: motivo */`. Se aplica a todo archivo **salvo** los 12 que hoy
    tienen espaciado literal, listados en `SPACING_PENDING` de `scripts/lint-css.ts`; el lint falla
    si uno de esos ya no tiene espaciado literal (hay que sacarlo de la lista) o si no existe, así
    la lista solo se achica. La migración queda en el plan como pendiente.
  - Opciones descartadas para la regla:
    - **Esperar a migrar todo**: cada componente nuevo sumaría espaciado literal mientras tanto.
    - **Solo archivos nuevos (por fecha o por git)**: depende del historial y no es reproducible en
      el CI; la lista explícita se ve y se revisa.
    - **Excepciones en línea en los 12 archivos**: ensuciaría unas 47 declaraciones con
      comentarios que se borrarían al migrar.
- Tradeoff accepted:
  - El nombre sale de un directorio `labs` de `@material/web`: Google puede cambiarlo. Si pasa, se
    renombra antes de publicar (las variables `--md-sys-*` son API pública, ADR-0005).
  - La regla revisa las declaraciones, no el valor de las variables internas: `--_padding: 16px`
    seguido de `padding: var(--_padding)` pasa (igual que con el color). Es una red para lo obvio,
    no una garantía.
  - `gap={200}` puede leerse como 200 px; los tipos solo aceptan los 18 pasos (`gap={16}` no
    compila), y el JSDoc lo explica.
  - En `@media` la rem es el tamaño de letra inicial del navegador, no el que fije la página.
- Revisit if: `@material/web` saca la escala de `labs` con otro nombre o Compose la hace pública
  con otro; Material publica tokens de espaciado por componente que cambien la escala; o las
  condiciones de `@media`/`@container` aceptan variables (entonces los cortes podrían ser CSS).
- Evidencia (2026-11-25):
  - `MeasurementTokens.kt` leído con `gh api` (versión 41.1.19 en la cabecera, último commit
    `76990c62ac`): los 18 valores. `WindowSizeClass.kt`: las seis constantes `*_LOWER_BOUND`.
  - `tests/tokens.test.ts` compara `tokens/space.json`, `src/tokens/space.css` y `SPACE` contra los
    18 valores escritos a mano, y los cortes contra los de Compose; `tests/lint-css.test.ts` cubre
    la regla nueva. `pnpm tokens` no cambió ningún archivo de tokens existente salvo
    `src/tokens/index.css` (un `@import` más).
