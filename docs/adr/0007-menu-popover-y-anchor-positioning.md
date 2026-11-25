# ADR-0007: Menús con la API Popover y CSS anchor positioning, con respaldo en JavaScript

- Status: accepted (2026-11-24)
- Drivers:
  - El menú tiene que mostrarse sobre todo lo demás (también dentro de un `Dialog` modal o
    de un contenedor con `overflow: hidden`) y quedar pegado a su disparador, dándose vuelta
    cerca de los bordes de la ventana.
  - CLAUDE.md pide elementos nativos primero ("API Popover") y el plan pide verificar el
    soporte actual antes de decidir cómo posicionar (`docs/plan/README.md` § 5).
  - `@material/web` posiciona con JavaScript (`position: absolute`, `fixed`, `document` o
    `popover`) porque, al escribirse, Firefox no tenía Popover; sus documentos lo advierten
    (`docs/components/menu.md`, § Popover-positioned menus).
  - Los proyectos del autor usan Next.js con Server Components y React sobre Vite
    ([ADR-0003](0003-componentes-universales-e-interactivos.md)): cuanto menos haya que medir y
    recalcular en el cliente, mejor.
- Decision:
  - **Capa superior con Popover:** `MenuContent` es un `popover="manual"`. Se abre con
    `showPopover()` y se oculta con `hidePopover()` después de la animación de salida. Es
    `manual` y no `auto` porque el menú puede ser controlado (`open`/`onOpenChange`): con `auto`,
    el navegador lo cerraría solo con Escape o con un clic afuera, aunque el padre no lo haya
    pedido, y un clic en el disparador abierto lo cerraría y reabriría. Escape, Tab y el clic
    afuera los maneja el componente.
  - **Posición con CSS anchor positioning:** el disparador lleva `anchor-name` y el menú
    `position-anchor`, `position-area: block-end span-inline-end` (debajo, desde el borde
    inicial) y `position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline`. El
    navegador lo mantiene junto al disparador al desplazarse, sin escuchar `scroll`.
  - **Respaldo en JavaScript:** si `CSS.supports('position-area: bottom')` es falso, el menú se
    ubica con `fallbackPosition()` (`src/organisms/Menu/position.ts`), que aplica la misma regla
    a mano y se recalcula con `scroll` y `resize` mientras está abierto.
- Tradeoff accepted: en navegadores sin anchor positioning el menú se recalcula en cada
  `scroll`, sin la suavidad del posicionamiento nativo. El respaldo no se ejercita en las pruebas
  de navegador, porque Chrome sí tiene anchor positioning: solo se prueba la función pura.
  `popover="manual"` obliga a reimplementar Escape y el clic afuera, que `auto` daría gratis.
  Con `position-area`, el menú no puede quedar más cerca de 0 px del borde de la ventana, como
  sí permitiría un margen calculado en JavaScript (Compose deja 8 a los costados).
- Revisit if: el porcentaje de uso de Safari anterior a 26 y de Firefox anterior a 147 (Firefox
  ESR incluido) se vuelve despreciable; entonces se quita el respaldo de `position.ts`. Si se
  agregan submenús, evaluar `popover="auto"` anidado (cierre en cascada del navegador) y
  `position-area: inline-end span-block-end`. Si un proyecto necesita el menú dentro de un
  contexto de apilamiento propio, sin capa superior, revisar la decisión de Popover.
- Evidencia del soporte (verificado el 2026-11-24 en MDN browser-compat-data, la fuente de
  las tablas de compatibilidad de MDN; repositorio `mdn/browser-compat-data`, commit
  `ec27346411`):

  | Función | Chrome | Safari | Firefox |
  |---|---|---|---|
  | API Popover (`api.HTMLElement.popover`, `showPopover`, `:popover-open`) | 114 | 17 | 125 |
  | `anchor-name` | 125 | 26 | 147 |
  | `position-anchor` | 125 (*) | 26 (*) | 147 (*) |
  | `position-area` | 129 (125 con valores parciales) | 26 | 147 (148 completo) |
  | `position-try-fallbacks` con `flip-block` y `flip-inline` | 128 | 26 | 147 |
  | `@position-try` | 125 | 26 | 147 |

  (*) Implementación parcial solo en el valor inicial (`auto`/`none` en vez de `normal`):
  no afecta, porque `menu.css` define el valor.

  Versiones actuales según los mismos datos (`browsers/*.json`): Chrome 158 (2026-11-17),
  Safari 27.2 (2026-10-26) y Firefox 160 (2026-11-10). Fechas de las versiones mínimas:
  Chrome 129 (2024-09-17), Safari 26 (2025-09-15), Firefox 147 (2026-01-13).

  Comprobado en el Chrome de las pruebas (`Menu.test.tsx`): el menú queda debajo del
  disparador, se da vuelta cerca del borde inferior y del derecho, y sigue al disparador al
  desplazarse la página. No se probó en Safari ni en Firefox, y no se verificó qué versión de
  Firefox ESR está vigente.
