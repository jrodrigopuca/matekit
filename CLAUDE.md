# matekit: convenciones para agentes y colaboradores

Librería de componentes React sobre Material 3 Expressive. Paquete `@matekit/react`.
Antes de decidir algo que cueste revertir, leer `docs/adr/README.md` y aplicar lo decidido.

## Reglas del proyecto

- **No commitear ni pushear.** El autor hace los commits. Al terminar, listar los archivos
  cambiados y proponer un mensaje en Conventional Commits.
- **Idioma:** documentación, comentarios y textos internos en español; nombres de código en inglés;
  las salidas para quien usa la librería (mensajes de diagnóstico y su catálogo, y los textos por
  defecto de los componentes) en inglés (ADR-0028).
- **Herramientas:** pnpm (no npm), Node 24 o superior, TypeScript 7 en modo estricto.
- **Dependencias:** no agregar ninguna sin pedirlo. Si hace falta una, versión exacta con al
  menos dos semanas de publicada.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Playground en `http://localhost:5175` (usa `src/` directamente) |
| `pnpm typecheck` | Verificación de tipos |
| `pnpm lint:css` | Revisa que el CSS de componentes use tokens para color, movimiento, tipografía y espaciado (este último salvo en los archivos de `SPACING_PENDING`, ADR-0016) |
| `pnpm test` | Pruebas de tokens, diagnósticos y textos por defecto (Node) y de componentes (Vitest en Chrome) |
| `pnpm test:browser` | Solo las pruebas de componentes, en el Chrome del sistema; `MK_BROWSERS=firefox` o `webkit` (separados por coma) los corre en esos motores, que el CI prueba en cada push |
| `pnpm tokens` | Regenera `src/tokens/*.css`, `src/tokens/palettes/*.css` y `src/tokens/space.ts` y `breakpoints.ts` desde `tokens/*.json` (paletas: ADR-0008; espaciado y cortes de ventana: ADR-0016) |
| `pnpm icons` / `pnpm icons:fetch` | Regenera los iconos (ver ADR-0006) |
| `pnpm shapes` | Regenera las 35 formas decorativas (`shapes/material-shapes.json`, `src/atoms/Shape/shapes.ts` y la hoja opcional `src/shapes.css`), los datos del indicador de carga (`src/molecules/LoadingIndicator/loading-indicator-data.ts`) y los contornos del progreso circular ondulado (`src/molecules/ProgressIndicator/circular-wavy-data.ts`) con la portación de `scripts/lib/shapes/` (ADR-0011) |

## Estructura y capas (ADR-0002)

```
tokens/          datos de origen de los tokens (JSON) y su física (spring.ts)
scripts/lib/     color-schemes.ts, palette-css.ts y css.ts: generador de paletas, futuro
                 @matekit/theme (ADR-0009); no importan React, componentes ni tokens/
scripts/lib/shapes/  portación a TypeScript de androidx.graphics.shapes (con Morph),
                 MaterialShapes.kt, la animación de LoadingIndicator.kt y los contornos de
                 CircularWavyProgressModifiers.kt (Apache 2.0, con el aviso y el commit de
                 origen en cada archivo; ADR-0011); mismas reglas que scripts/lib/
shapes/          contornos SVG generados de las 35 formas decorativas (pnpm shapes)
src/tokens/      CSS generado (y space.ts y breakpoints.ts para TypeScript): no editar a mano
src/atoms/       primitivas: StateLayer, FocusRing, Ripple, Interactive (el <a>, <button> o
                 elemento de render de ADR-0010, pública por ADR-0020), Icon, Shape, Divider, y
                 las de disposición Stack y Group (ADR-0017)
src/molecules/   controles y piezas con significado propio: Button, Checkbox, Badge,
                 LoadingIndicator, …
src/organisms/   combinan controles: Dialog, Menu, NavigationBar, List, …
src/icons/       iconos generados
src/internal/    ayudas compartidas entre componentes, no exportadas (interactive.tsx: cx,
                 assertRenderElement, el error de render con el nombre del componente, y los
                 tipos de botón que también es enlace, ToggleButtonOrLinkProps;
                 navigation-item.tsx: base de los destinos de NavigationBar, NavigationRail y
                 NavigationSuite (ADR-0029); navigation-count.ts: el aviso de destinos de más,
                 contados en el render sobre los hijos;
                 merge-refs.ts: mergeRefs une varias ref con la limpieza de
                 React 19, sin hooks: memorizarla al llamarla, como Dialog y Menu;
                 accessible-name.ts: AccessibleNameProps, el nombre obligatorio por label,
                 aria-labelledby o aria-label de los indicadores; activity-pulse.css: el latido
                 de los indicadores indeterminados con movimiento reducido; layout-element.tsx:
                 el `<div>` (o `<header>`) o el elemento de `render` de Stack, Group y
                 TopAppBar; anchored-drag.ts: computeTarget y VelocityTracker, la decisión al soltar un
                 arrastre entre anclas portada de Compose, de BottomSheet y ModalNavigationRail; anchor-position.ts: la posición de una capa junto a su ancla, respaldo sin anchor positioning, de Menu y
                 Tooltip, ADR-0007 y ADR-0021; roving-focus.ts: useRovingFocus, el foco
                 itinerante de una sola parada de Tab de ChipGroup, Tabs y Toolbar, ADR-0023 y
                 ADR-0027; nearest-scroller.ts: el contenedor que se desplaza más cercano, de las
                 partes cliente de TopAppBar y Toolbar; dev.ts: isDevelopment, los avisos solo en
                 desarrollo con `process.env.NODE_ENV` como React; diagnostics.ts: mkWarn y mkError,
                 los avisos y errores con formato único y código, y MatekitError con los tipos de
                 código, que sí se reexportan desde src/index.ts (ADR-0028); settle-animations.ts:
                 settleAnimations, la espera de la salida animada de Snackbar, Tooltip, Menu, Dialog y los sheets, que no se traba si una
                 transición se cancela; modal-dialog.ts: useModalDialog, el ciclo de vida modal
                 sobre `<dialog>` (showModal, foco inicial, Escape y scrim, vuelta de Tab, salida
                 y foco devuelto) de Dialog, BottomSheet, SideSheet modal y ModalNavigationRail,
                 ADR-0025 y ADR-0029)
src/strings/     índice de los textos por defecto de los componentes (defaultStrings y el tipo
                 MatekitStrings, públicos): reúne los strings.ts de cada carpeta (ADR-0028)
src/styles.css   hoja única: importa tokens, átomos y componentes
playground/      páginas de prueba manual, una por componente
docs/research/   datos extraídos del kit de Figma y de Jetpack Compose
docs/diagnostics.md  catálogo de avisos y errores por código (en inglés: es salida de la librería)
docs/adr/        decisiones de arquitectura
```

Cada componente vive en su carpeta: `Nombre.tsx`, `nombre.css`, `Nombre.test.tsx` y, si pone textos
propios, `strings.ts`. Se exporta desde el `index.ts` de su capa y su CSS se importa en `src/styles.css`.

## Cómo se escribe un componente

- **API por composición (ADR-0002):** las partes son subcomponentes con nombres planos
  (`DialogHeadline`, `TextFieldLabel`), no propiedades de contenido ni `Dialog.Headline`.
  Los casos simples se escriben corto (`<Button><AddIcon />Crear</Button>`).
- **Universal o interactivo (ADR-0003):** sin estado, efectos, contexto ni eventos, el
  módulo no lleva `'use client'`. Si necesita algo de eso, `'use client'` en la primera línea.
  Preferir resolver estados con CSS (pseudo-clases) para que el componente quede universal.
- **Elementos nativos primero:** `<button>`, `<input>`, `<dialog>`, API Popover. El
  comportamiento de teclado sigue la guía WAI-ARIA APG.
- **Props:** se extienden los atributos del elemento nativo principal; `ref` como prop
  (React 19). Props opcionales tipadas como `T | undefined` (por `exactOptionalPropertyTypes`).
- **Átomos:** usar `StateLayer`, `FocusRing` y `Ripple` como hijos directos del elemento
  interactivo. Un control que es enlace, botón o `render` dibuja `<Interactive>` (ADR-0010,
  ADR-0020) y llama antes `assertRenderElement('Nombre', rest.render)`, como Button. Si el foco
  o el puntero están en otro elemento (por ejemplo un `<input>` oculto), activar con las
  variables `--mk-state-layer-opacity` y `--mk-focus-ring-visible`. Ejemplo completo:
  `src/molecules/Checkbox/`.
- **Avisos y errores (ADR-0028):** todo aviso o error nuevo pasa por `mkWarn` o `mkError` de
  `src/internal/diagnostics.ts` (`throw mkError(…)`; nunca `console.*` ni `throw new Error` sueltos),
  con un código `MK_…` declarado ahí, un `fix` concreto (el texto sale como
  `[matekit] <Component>: <what happened>. Fix: <how to fix it>. (<CODE>)`, en inglés) y su entrada
  en `docs/diagnostics.md`. El código nombra la causa (`MK_PART_OUTSIDE_PARENT`), y el componente solo
  si la causa existe en uno; un código publicado no se renombra. Error: un uso que no puede funcionar
  (siempre). Aviso: funciona pero está mal (solo en desarrollo, una vez; `once` con un objeto por
  instancia, o por texto: los valores variables van en los detalles, no en el texto).
  `tests/diagnostics.test.ts` comprueba que el catálogo y los códigos de `src/` coincidan. Las
  pruebas de los componentes comparan `code` (y si hace falta que el mensaje contenga `Fix:`), no el
  texto.
- **Textos por defecto (actualización del ADR-0028):** todo texto visible o anunciado que el componente
  pone por su cuenta (nombre de un botón, `aria-label`, región viva, texto oculto de una descripción,
  vacío o carga) va en el `strings.ts` de su carpeta, en inglés, con su interfaz (`SearchStrings`) y
  cada clave llamada como la prop que lo cambia, y se suma a `MatekitStrings` y `defaultStrings` en
  `src/strings/index.ts`. Siempre hay una prop para cambiarlo, con el valor del `strings.ts` por
  defecto (`closeLabel = snackbarStrings.closeLabel`) y su JSDoc dice el texto (`Por defecto "Close"`).
  Un texto con datos es una función (``formatRemoved: (text) => `Removed ${text}` ``), y un plural,
  una función que el idioma arma a su manera (`Intl.PluralRules` si hace falta), no una frase armada
  en el componente (única excepción, anterior: el nombre del botón de quitar de `InputChip`, que es
  `removeLabel` seguido de la etiqueta por `aria-labelledby`). Sin llamadas al cargar el módulo. `tests/strings.test.ts` (Node)
  falla si queda un texto escrito a mano en `src/` fuera de los `strings.ts` (letras del español, un
  literal en una clave o prop de texto, texto JSX, o una frase) o si un `strings.ts` no está en el
  índice; los comentarios no cuentan. El playground pasa los textos en español desde
  `playground/strings-es.ts`, como haría una app.
- **Iconos:** los de `src/icons/` o cualquier SVG dentro de `<Icon>`. El componente define
  `--mk-icon-size` para el tamaño. Un estado activo o seleccionado rellena el icono con
  `filled` (todos lo aceptan). El grado -25 en tema oscuro es automático (ADR-0006): no
  cambiar el `fill` de los trazos `.mk-icon-grade-*` desde un componente.

## CSS (ADR-0005)

- CSS plano. Clases con prefijo `mk-` (`mk-switch`, `mk-switch-track`), variables internas
  con `--_` y variables públicas de personalización con `--mk-`.
- Todo dentro de `@layer matekit.components` (o `matekit.atoms`).
- **Color con contraste garantizado (ADR-0008):** combinar solo `on-X` sobre `X`, y el
  contenido (`on-surface`, `on-surface-variant`, `primary`, `outline`) sobre las superficies.
  Otro par (por ejemplo `tertiary` sobre `tertiary-container`) puede cumplir en el nivel
  estándar y fallar en el medio o el alto. `src/test/contrast.test.tsx` mide cada componente
  en todas las paletas, niveles y temas.
- Solo tokens `--md-sys-*` para color, tipografía, forma, elevación, estados, movimiento y
  espaciado (`gap`, `padding` y `margin` con `--md-sys-space-*`, ADR-0016); nada de colores,
  duraciones ni separaciones sueltos. `pnpm lint:css` lo verifica (también en CI); una
  excepción justificada lleva `/* lint-css-allow: motivo */` al final de la declaración. Movimiento: resortes
  `--md-sys-motion-spring-{fast,default,slow}-{spatial,effects}-{duration,easing}`.
- **Dentro de `Group`** (bloques conectados, ADR-0017): un componente con radio propio lee
  `--mk-group-corner-{start-start,start-end,end-start,end-end}` con su radio como respaldo.
- **Forma:** radios con `--md-sys-shape-corner-*`; las variantes parciales de Compose
  (`CornerExtraLargeTop`, `CornerLargeEnd`) se arman combinando radios por esquina, sin tokens
  nuevos. Un radio que anima (cambio de forma al presionar o seleccionar) **no usa
  `--md-sys-shape-corner-full`**: vale 9999px y la interpolación hacia otro radio no se ve
  hasta el final. Para la forma redonda, usar la mitad del alto (`calc(var(--_height) / 2)`,
  como el Button).
- Estados en este orden: hover (solo dentro de `@media (hover: hover)`), foco, presionado,
  deshabilitado al final.
- **Alto contraste:** un bloque `@media (forced-colors: active)` al final de cada CSS. El
  navegador quita fondos y sombras (incluidas las sombras interiores usadas como borde) y
  fuerza colores del sistema: la forma se dibuja con `outline` o `border`, y los estados con
  colores del sistema (`Highlight`/`HighlightText` para seleccionado o activado, `GrayText`
  para deshabilitado, sin sumar opacidad), con `forced-color-adjust: none` donde haga falta.
  Ejemplos: Checkbox, Switch, TextField.

## Fuentes de verdad (ADR-0004)

1. Kit de Figma, ya extraído: `docs/research/05-medidas.md` (medidas y colores por estado) y
   `docs/research/03-tokens.md`.
2. Jetpack Compose, para lo que el kit no trae o donde tiene un error evidente: tokens en
   `androidx/androidx`, carpeta
   `compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/`
   (leer con `gh api repos/androidx/androidx/contents/<ruta> -H "Accept: application/vnd.github.raw"`).
3. Un conflicto real entre ambos se verifica con una tercera fuente y se anota en
   `docs/research/07-jetpack-compose.md`.

**Comportamiento y accesibilidad en web:** la documentación de `@material/web`, la
librería web oficial de Google, en `material-components/material-web`, carpeta
`docs/components/` (`text-field.md`, `menu.md`, `dialog.md`, …; leer con
`gh api "repos/material-components/material-web/contents/docs/components/<archivo>.md" -H "Accept: application/vnd.github.raw"`).
Sirve para uso, teclado, roles, validación y posicionamiento. **No** para medidas ni colores:
es Material 3 anterior a Expressive (sin tamaños XS–XL, sin cambio de forma, sin Vibrant).

No llamar al conector de Figma salvo que falte un dato imprescindible: tiene límite de uso.

## Pruebas

- Pruebas en navegador real (`*.test.tsx` junto al componente) con `render`, `style` y
  `roleColor` de `src/test/render.tsx`, `userEvent` de `vitest/browser`, y los comandos
  `commands.pressDown(selector)` / `commands.pressUp()` para el estado presionado. Para el
  puntero en un punto del elemento (x, y desde su esquina superior izquierda):
  `commands.moveTo(selector, x, y)`, `commands.pressAt(selector, x, y)` (mueve y aprieta) y
  `commands.dragThrough(selector, puntos)` (aprieta en el primero y pasa por los demás sin
  soltar; después, `pressUp`). Están en `vitest.config.ts` y sus tipos en `src/test/commands.d.ts`.
- Probar: estructura y accesibilidad (roles, nombres, `aria-*`), teclado, medidas contra la
  fuente, colores por estado con `roleColor`, deshabilitado, y que las props nativas y `ref`
  lleguen al elemento.
- Antes de dar algo por terminado: `pnpm typecheck` y `pnpm test` en verde, y romper a
  propósito una regla CSS para confirmar que alguna prueba falla (luego restaurarla).
- Para esperar animaciones, `expect.poll`, no tiempos fijos.
- Alto contraste: sumar el componente a `src/test/forced-colors.test.tsx`, que emula el modo
  con `commands.forcedColors(true)` y compara contra los colores del sistema (`systemColor`).
- Accesibilidad automática: sumar una galería del componente (estados principales) a
  `src/test/a11y.test.tsx`, que corre axe-core (WCAG 2.2 A/AA) en tema claro y oscuro.
- Contraste: sumar el componente a `src/test/contrast.test.tsx` (4,5:1 texto, 3:1 iconos y
  bordes que identifican el control), que lo recorre en las 4 paletas, los 3 niveles de
  contraste y los 2 temas. axe no decide el contraste de elementos cubiertos por los
  átomos (StateLayer, Ripple, FocusRing), por eso existe esta prueba propia.
- **Motores:** el CI corre las pruebas en Chrome, Firefox y WebKit (`MK_BROWSERS`). Lo que
  ya se sabe de cada uno (comprobado el 2026-11-25):
  - Medidas: comparar posiciones restadas con `toBeCloseTo(x, 2)`; Firefox ubica en subpíxeles.
  - Foco de teclado: llegar con `userEvent.tab()`, no con `.focus()`; Firefox no muestra el foco
    visible en un elemento enfocado por script si el foco anterior no era de teclado.
  - WebKit activa `forced-colors` pero no reemplaza colores: probar ahí solo lo que el CSS de
    matekit define a mano.
  - Una prueba que no aplica en un motor se saltea con `test.skipIf(server.browser === '…')` y
    el motivo comprobado en un comentario, nunca en silencio.
  - WebKit en macOS no lleva el foco a los botones con Tab ni con clic (ajuste del sistema):
    en local, esas pruebas fallan; la referencia es el WebKit de Linux del CI.
  - WebKit con `<input type="radio">` nativos (comprobado el 2026-11-25, también en Linux): las
    flechas no dan la vuelta en los extremos (en el último, flecha abajo no hace nada; en el
    primero, flecha arriba tampoco), y el radio al que se llega con flechas pierde
    `:focus-visible`. `RadioButton` corrige lo segundo con `data-focus-visible`; lo primero es la
    conducta de Safari y se saltea en las pruebas.
  - WebKit en macOS tampoco lleva el foco con Tab a los `<input>` de casillas, radios y switches;
    a un `<summary>` sí (comprobado el 2026-11-25). Para probar el estado de foco de teclado en
    WebKit sin Tab: `el.focus({ focusVisible: true })` (un `.focus()` común no aplica
    `:focus-visible` en WebKit); el recorrido con Tab se prueba aparte y en local falla.
  - Grilla con filas `1fr` para centrar (List, comprobado el 2026-11-25): un `min-block-size` en un
    hijo que cruza esas filas hace que Chrome las agrande de más; usar el alto o nada.
  - `<details>`/`<summary>` (List): `display: grid` en el `<summary>`, Enter, Espacio y `name` (uno
    abierto a la vez) iguales en los tres motores.
  - Firefox: un segundo `commands.pressDown` en la misma prueba no activa `:active`
    (comprobado el 2026-11-25); una prueba por presionado.
  - `<input type="range">` (Slider, comprobado el 2026-11-25): en RTL, WebKit invierte las
    flechas izquierda y derecha; en vertical (`writing-mode: vertical-lr`), Firefox invierte la
    flecha derecha. El Slider resuelve las flechas en esos dos casos. WebKit no enfoca un
    `range` con el clic: el Slider lo enfoca al soltar el puntero.
  - Firefox, arrastres del Slider: pasan con los archivos de prueba de a uno y fallan cuando
    otros archivos corren en paralelo (ni el primer movimiento llega; el clic sí funciona; causa
    sin encontrar). En la corrida normal se saltean en Firefox; `MK_SERIAL=1` corre los
    archivos de a uno y los habilita (`inject('serial')`), y el CI los corre así en un paso
    aparte: `MK_BROWSERS=firefox MK_SERIAL=1 pnpm test:browser src/molecules/Slider`.
  - Una animación que sigue corriendo (por ejemplo el latido de movimiento reducido de los
    indicadores) cambia los píxeles según el instante: congelarla (`pause()` y `currentTime`)
    antes de leer píxeles o colores calculados. El circular fallaba de vez en cuando en Firefox
    por eso.
  - Animación SVG nativa (SMIL, LoadingIndicator): `begin` negativo, `accumulate="sum"` en
    `<animateTransform>`, `calcMode="spline"` en `d` y `visibility` discreta funcionan igual en
    los tres. Para probarla, congelar el reloj del `<svg>` con `pauseAnimations()` y
    `setCurrentTime(s)` y esperar el valor con `expect.poll` (`getBBox()`, `transform.animVal`,
    `getComputedStyle().visibility`).
  - CSS en SVG (indicadores de progreso, comprobado el 2026-11-25): `stroke-dasharray` con `calc()`
    sobre `cqw`, `pathLength`, `@property` animada o transicionada y `vector-effect:
    non-scaling-stroke` (mide los guiones en pantalla) andan igual en los tres; la propiedad CSS
    `d` no existe en WebKit. Firefox descarta un `calc()` sin unidades en `stroke-dasharray` (usar
    px). Dentro de un `@keyframes`, `var()` no se resuelve en `animation-timing-function`
    (comprobado en Chrome) ni en el valor de una propiedad registrada (Firefox). Para probar animaciones CSS:
    `el.getAnimations()`, `pause()` y `currentTime`. En WebKit, mover `currentTime` de una
    *transición* de una propiedad registrada no cambia el estilo calculado, y una captura de
    Playwright da la transición por terminada: probar las transiciones por su declaración.
  - CSS anchor positioning (Tooltip, comprobado el 2026-11-26): `position-area: top` con
    `flip-block` centra la capa sobre el ancla y la corre para quedar dentro de la ventana igual en
    los tres, salvo Firefox con el ancla en un contexto RTL, que la corre casi 300 px
    (`anchor-center` mal resuelto). `placeNextTo` lo detecta y corrige (ADR-0021).
    `popover="hint"` existe en los tres.
  - Indicador de Tabs (comprobado el 2026-11-26): con anchor positioning, cambiar `anchor-name` de un
    elemento a otro con `transition` en `left`/`right` anima en Chrome y WebKit y salta en Firefox. La
    Web Animations API con `translate` y `width`, un keyframe con `offset: 0` (final implícito) y un
    `linear()` de los tokens como `easing` da lo mismo en los tres; para probarla, `getAnimations()`,
    `pause()` y `currentTime`. El global `transition: none` de `render.tsx` no la afecta.
    `hidden="until-found"` (`onbeforematch`) existe en los tres. La ventana de las pruebas mide unos
    414 px: un componente más ancho hace que el clic desplace la página y corre las medidas.
  - Animaciones por desplazamiento (TopAppBar, comprobado el 2026-11-26): `animation-timeline:
    scroll()` y `view()`, `scroll-timeline` con nombre, `timeline-scope` y `animation-range` en px
    existen en los tres de Playwright y dan los mismos valores (el Firefox es un Nightly: Firefox
    estable sin verificar); `container-type: scroll-state` solo en Chrome. Para probarlas, fijar
    `scrollTop` y esperar dos o tres cuadros (`requestAnimationFrame`), sin pausarlas. Pasar una
    animación con el mismo nombre de una línea de tiempo de desplazamiento a una detenida
    (`paused` y `animation-delay` negativo) deja un tiempo actual cualquiera: usar otro nombre de
    `@keyframes`. En Chrome, una animación de `background-color` con `var()` de un token
    `light-dark()` no se recalcula al cambiar el tema: registrar el color con `@property` y sintaxis
    `<color>`. Una animación de `opacity` vuelve al elemento un contexto de apilado que, por orden en
    el árbol, tapa a un hermano posicionado anterior (`z-index` en los ítems de grilla lo ordena).
  - Grilla con filas `auto` e ítems que las abarcan (TopAppBar, comprobado en Chrome el 2026-11-26):
    un ítem de 48 sobre dos filas `auto` (28 y 0) las dejó en 28 y 24; con filas `minmax(0, 1fr)`
    arriba y abajo y `min-block-size`, el centrado da lo esperado. Un ítem que abarca columnas
    `minmax(max-content, 1fr) auto minmax(max-content, 1fr)` aporta su ancho máximo y le quita lugar
    a la columna `auto` (de 204 libres le dejó 72, o 0): `contain: inline-size` en ese ítem lo evita.
  - Capa anclada del ancho del ancla (Search, comprobado el 2026-11-26): un `popover` trae `width:
    fit-content` del navegador; `position-area` con un solo valor (`bottom`, `block-end`) abarca todo el
    otro eje (`span-all`). `position-area: block-end center` con `justify-self: stretch` e
    `inline-size: auto` la deja del ancho del ancla y alineada con sus dos bordes igual en los tres,
    también en RTL (con `span-inline-end` y el ancho escrito, Firefox la corría unos 114 px en RTL).
    `<search>` tiene rol `search` en los tres (árbol de Playwright), pero los localizadores de Vitest
    (`getByRole('search')`) no lo encuentran. En un `<input type="search">` con texto, Chrome usa Escape
    para borrarlo y, dentro de un `<dialog>` modal, el diálogo no recibe el `cancel` (en los otros dos
    no se aisló: Search cancela ese Escape en todos).
    `aria-disabled` hace que el `click` de Playwright espere (usar `{ force: true }`).
  - Corrimientos dentro de un contenedor que se desplaza (Toolbar, comprobado el 2026-11-26): un
    elemento corrido hacia abajo o hacia el final de la línea con `translate` o con márgenes negativos
    agranda `scrollHeight`/`scrollWidth` en Chrome y Firefox (WebKit no); cambiar el `bottom` de un
    `position: sticky` a un valor negativo lo saca por el borde sin agrandar nada en los tres. Un
    `float` con `position: sticky; top: 50%` y un margen inferior negativo mayor que su alto queda
    centrado en lo visible y el texto no lo rodea, igual en los tres. Firefox, al enfocar un botón que
    está fuera de lo visible (una barra escondida), desplaza el contenedor antes del `focusin` (Chrome
    no).
  - Presentación por la ventana (NavigationSuite, comprobado el 2026-11-27): `page.viewport(w, h)`
    cambia el iframe y las media queries de ancho y de alto (`(width < 37.5rem), (height < 30rem)`)
    responden igual en los tres; esperar el tamaño nuevo con `expect.poll` sobre `innerWidth` e
    `innerHeight` y devolver la ventana a 414 × 896 al terminar. Una etiqueta centrada con
    `translate(-50%)` queda 0,08 px corrida en WebKit (redondeo de subpíxeles). Para probar el HTML
    del servidor, `renderToString` y `hydrateRoot` en la prueba (`react-dom/server` está en
    `optimizeDeps` de `vitest.config.ts`: si Vite lo descubre a mitad de la corrida, recarga y deja
    dos copias de React).
- Snackbar (comprobado el 2026-11-26): un `popover` dentro de un `<dialog>` modal abierto se puede
  usar en los tres motores (fuera del diálogo queda inerte). Un F6 real que la página no atrapa
  saca el foco del documento en Firefox: para probar que un componente no atrapa una tecla, despachar
  el evento a mano y mirar `defaultPrevented`. Para disparar `onPointerEnter`/`onPointerLeave` de
  React a mano, despachar `pointerover`/`pointerout` (React no escucha `pointerenter`).
- Relojes falsos (`vi.useFakeTimers`) con demoras propias (Tooltip, comprobado el 2026-11-26):
  `expect.poll` avanza el reloj falso en cada intento (el código de Vitest 5.1 llama a
  `vi.advanceTimersByTime(interval)`), y las acciones de `userEvent` también lo avanzan (tras un
  `hover`, una demora de 500 ms se cumplía con 499 ms de avance; el mecanismo no se buscó). Una
  demora medida a través de ellos sale más corta y varía. Para medir demoras: eventos despachados a
  mano y esperas cuadro a cuadro (`requestAnimationFrame`), como en `Tooltip.test.tsx`.
- `src/test/render.tsx` aísla cada prueba: desmonta lo renderizado al terminar y deja el
  puntero en una esquina antes de empezar. No repetir eso en cada archivo. Para detectar
  dependencias de orden: `pnpm exec vitest run --sequence.shuffle --sequence.seed=<n>`.

## Playground

Cada componente suma `playground/pages/NombrePage.tsx` (controles interactivos, matriz de
estados) y una entrada en `PAGES` de `playground/App.tsx` con su id de URL (`#id`, no cambiarlo
después: lo usan capturas y notas), `label` y `group`, la capa del componente en `src/` (`atoms`,
`molecules`, `organisms`; `foundations` para disposición y tokens, `examples`). La navegación
(`playground/PageNav.tsx`) se arma sola desde ahí, en el orden de `PAGES` dentro de cada grupo
(alfabético). Revisarlo en tema claro y oscuro (la cabecera también elige paleta y nivel de
contraste) y a 320 px sin desborde horizontal: una matriz ancha a propósito va en `.pg-grid` (o
con `overflow-x: auto` propio), que se desplaza dentro de su contenedor y no la página.

Para revisar visualmente, usar el playground que el autor suele tener abierto en
`http://localhost:5175` (recarga en caliente): comprobar con
`curl -s -o /dev/null -w "%{http_code}" http://localhost:5175/` y apuntar ahí las capturas.
Levantar otro servidor solo si ese no responde, y nunca detener el del autor.
