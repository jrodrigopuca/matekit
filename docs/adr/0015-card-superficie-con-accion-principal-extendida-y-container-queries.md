# ADR-0015: Card como superficie con una acción principal extendida, y disposición por container queries

- Status: accepted (2026-11-25)
- Drivers:
  - El plan (ítem 12) pide la Card como superficie o interactiva (enlace o botón con `href` o
    `render`, ADR-0010) sin anidar interactivos. El ejemplo apilado del kit tiene un icon button en
    la cabecera y dos botones de acción: si toda la tarjeta fuera un `<a>` o un `<button>`, esos
    controles quedarían adentro, algo que HTML prohíbe (contenido interactivo dentro de `a` y
    `button`) y que axe marca (`nested-interactive`). Además, el nombre accesible sería todo el
    texto de la tarjeta.
  - El foco visible tiene que dibujarse en el borde de la tarjeta, y la tarjeta tiene que seguir
    siendo universal (ADR-0003): estados con CSS, sin eventos propios.
  - Requisito del autor: la tarjeta tiene que ser fluida y adaptarse al espacio que le da su
    contenedor (una columna angosta o una celda de una grilla ancha), no a la ventana; los
    umbrales, cambiables o desactivables desde afuera.
- Decision:
  - **La tarjeta es siempre una superficie (`<div>`).** Lo interactivo es una parte,
    `CardPrimaryAction`: un `<a>`, un `<button>` o el elemento de `render` (con
    `interactiveElement`, ADR-0010), que normalmente envuelve el texto del título
    (`<CardHeadline><CardPrimaryAction href="…">Título</CardPrimaryAction></CardHeadline>`). Su
    nombre accesible es el título.
  - **Área extendida con un pseudoelemento** (patrón "block link" o "stretched link", de Heydon
    Pickering en *Inclusive Components*, "Cards"): la acción principal no se posiciona, así que su
    `::after` (en absoluto, `inset: 0`), su capa de estado, su onda y su anillo de foco se ubican
    contra el elemento de disposición de la tarjeta y la cubren entera. Los demás controles de la
    tarjeta (`a[href]`, `button`, `input`, `select`, `textarea`, `summary`, `label`,
    `[tabindex]`) quedan por encima (`z-index: 2`, con especificidad 0) y se enfocan y activan por
    separado. Los estados de la tarjeta (elevación) se leen con `:has()` sobre la acción principal.
  - **Deshabilitado solo como botón** (`<CardPrimaryAction disabled>`), con los colores de
    Compose; los tipos lo rechazan en las formas de enlace, como en Button (ADR-0010). Los otros
    controles de la tarjeta no se deshabilitan solos.
  - **Partes** (ADR-0002): `CardHeader`, `CardHeadline` (un `<h3>` por defecto, `level` para
    cambiarlo), `CardSubhead`, `CardMedia`, `CardContent` y `CardActions`. Cada una ahorra CSS que
    el usuario tendría que escribir para armar los ejemplos del kit; el texto de apoyo no tiene
    parte (un `<p>` dentro de `CardContent` ya lo es) y el resto es contenido libre (el "Slot" del
    kit).
  - **Disposición por container queries.** La tarjeta es contenedor (`container: mk-card /
    inline-size`) y la disposición vive en un elemento interno (`.mk-card-layout`), porque una
    consulta no puede cambiar al propio contenedor. Toma el ancho de su contenedor y el alto de su
    contenido; los textos cortan línea (también palabras largas) y no se recortan con
    `line-clamp`: el título es el nombre de la acción principal y recortarlo escondería
    información (quien lo quiera, lo agrega con su CSS). Umbrales sobre el ancho de la tarjeta, en
    `rem` (con un texto más grande, cambia antes):
    - `vertical` desde 37,5rem (600 px): la imagen pasa al costado (40 %, `--mk-card-media-size`),
      porque esa tarjeta ya es más ancha que cualquier ventana compacta de Material 3 en una
      columna y la imagen 360/188 mediría más de 313 de alto.
    - `horizontal` bajo 20rem (320 px): se apila con la imagen arriba, porque con la imagen de 80,
      el avatar de 40 y los rellenos de 16 el título quedaría en menos de unos 150 px.
    - Bajo 15rem (240 px): las acciones se apilan a todo el ancho (antes, se envuelven).
  - **`adaptive={false}`** desactiva la adaptación (la disposición del kit a cualquier ancho). Los
    umbrales no son variables: una condición de `@container` no admite `var()` (CSS Conditional
    Rules 5 y Containment 3; las consultas de estilo, que sí leerían una variable, no están en
    Firefox). Para otros umbrales: `adaptive={false}` y elegir `orientation` desde la aplicación.
  - **Imagen** con proporción (`--mk-card-media-aspect-ratio`, 360 / 188 del kit por defecto) y
    `object-fit: cover`; el hijo va en absoluto, así no aporta alto propio y, al costado, toma el
    alto del texto. La tarjeta no recorta con `overflow` (cortaría el anillo de foco): la imagen
    redondea sus propias esquinas.
  - **Grillas de tarjetas con CSS grid**, sin componente propio (no está en el plan; el ítem 13,
    Stack y Group, es otro asunto): `repeat(auto-fill, minmax(min(100%, 280px), 1fr))`. La tarjeta
    se estira en la celda y `CardActions` queda abajo (margen automático).
  - Opciones descartadas:
    - **Toda la tarjeta como `<a>` o `<button>`** (`<Card href>`): solo sirve sin controles
      adentro, y el nombre accesible sería todo su texto. Ofrecerla como segunda variante daría dos
      formas de hacer lo mismo, una de ellas inválida en cuanto alguien agrega un botón.
    - **Clic en la tarjeta con JavaScript** (`onClick` en el `<div>` y `role`): necesita
      `'use client'`, no es un enlace real (abrir en otra pestaña, menú contextual) y duplica el
      teclado del navegador.
    - **Disposición por media queries de la ventana**: la misma tarjeta puede estar en una columna
      angosta de una pantalla ancha.
- Tradeoff accepted:
  - Mientras la acción principal cubre la tarjeta, el texto de la tarjeta no se puede seleccionar
    con el puntero (sí el de los controles de encima). Es la contra conocida del patrón.
  - Una sola acción principal por tarjeta, y tiene que ser descendiente de la tarjeta sin un
    ancestro posicionado en el medio (si el usuario posiciona un envoltorio, el área se achica a
    ese envoltorio).
  - Como la tarjeta mide su propio ancho (`container-type: inline-size`), su ancho no puede salir
    del contenido: en una fila flex necesita `flex: 1` o un ancho; en `inline-block` mide 0. En un
    bloque o una celda de grilla, nada cambia.
  - Las tarjetas anidadas comparten el nombre de contenedor `mk-card` (cada una consulta la más
    cercana, la propia) y el `:has()` de los estados vería la acción de una tarjeta interna.
  - Piso de navegadores: `:has()`, container queries con nombre y `aspect-ratio`, presentes en los
    tres motores del CI (comprobado con las pruebas el 2026-11-25).
- Revisit if: las consultas de estilo (`@container style(--x: …)`) llegan a Firefox (los umbrales
  podrían ser variables públicas), o HTML o ARIA definen una forma estándar de una región
  clicable con controles adentro. Si aparece la necesidad de arrastrar tarjetas (Dragged del kit):
  los estados viven en variables por estado (`--_elevation-*`), y el átomo StateLayer ya reacciona
  a `[data-dragged]`; un `dragged` futuro pondría el atributo y la elevación de arrastre (4, 3 y 3)
  sin cambiar la API actual.
- Evidencia (2026-11-25):
  - `Card.test.tsx` en Chrome, Firefox y WebKit: `elementFromPoint` en la imagen, el texto, el
    avatar y una esquina devuelve la acción principal, y en los botones devuelve cada botón; un clic
    en la imagen activa la acción y uno en un botón no; Tab recorre la acción principal y los tres
    botones por separado; el anillo de foco coincide con el borde de la tarjeta; disposición medida
    a 400 y 700 px (vertical) y a 360 y 280 px (horizontal); sin desborde a 200 px con una palabra
    de 70 letras; acciones envueltas a 300 px y apiladas a 220 px; alturas parejas en una grilla.
  - En WebKit de macOS, las pruebas que llegan con Tab fallan por el ajuste del sistema (ver
    `CLAUDE.md`); se verificaron con `.focus()` (anillo en el borde, capa de 10 %, elevación de
    foco, Enter).
  - axe-core sin violaciones (`src/test/a11y.test.tsx`), con controles dentro de tarjetas enlace y
    botón.
