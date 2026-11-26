# ADR-0018: List con semántica por caso (contenido, enlaces o botones, selección y acordeón), partes de frase y estados derivados de los controles

- Status: accepted (2026-11-25)
- Drivers:
  - Ítem 14 del plan: una lista que sirva para contenido, para elementos que son enlaces (filas de
    ajustes, resultados, lista y detalle), para acciones y para selección con casilla, radio o
    switch, sin interactivos anidados y con el texto del elemento como nombre accesible. No es
    navegación principal (eso son NavigationBar y NavigationRail; aclaración del autor).
  - Universal (ADR-0003): estados con CSS, sin contexto ni ids generados.
  - El kit de Expressive suma la segmentada (sobre Group, ADR-0017), el acordeón, el seleccionado
    en `Secondary Container` y una forma por estado.
  - Requisito del autor: fluida, adaptada a su propio ancho, para vivir en un panel de 360.
- Decision:
  - **`List` es un `<ul role="list">`.** El rol explícito porque, con `list-style: none`, Safari deja
    de anunciar la lista con VoiceOver. La segmentada se dibuja con `Group` (`render={<ul />}`). Los
    divisores (`dividers`, solo en la estándar) son un borde superior de cada elemento salvo el
    primero, no un `<hr>`: un `<hr>` no puede ser hijo de `<ul>`, y dentro del `<li>` el lector
    anunciaría un separador por elemento.
  - **`ListItem` es un `<li>`**; las partes son hijos con nombres planos (ADR-0002):
    `ListItemLeading` (con `variant`: icono, avatar, imagen o video), `ListItemOverline`,
    `ListItemHeadline`, `ListItemSupporting` y `ListItemTrailing`. **Todas son `<span>`**
    (contenido de frase), para valer dentro de un `<label>` y de un `<summary>`. No hay prop de
    "líneas": el alto sale del contenido (mínimos del kit por `:has()`), y `align` elige middle o
    top.
  - **Semántica por caso:**
    - (a) Contenido: el `<li>` con texto; nada enfocable.
    - (b) Elementos que son enlaces y (c) acciones: `ListItemAction`, un `<a>`, un `<button>` o el
      elemento de `render` (ADR-0010, con `interactiveElement`), **dentro de `ListItemHeadline`**: el
      nombre accesible es el texto principal. Su `::after`, su capa, su onda y su anillo se ubican
      contra el `<li>` (patrón de CardPrimaryAction, ADR-0015), así que todo el elemento es el
      enlace o el botón, y otro control del elemento (un IconButton al final) queda encima
      (`z-index: 2`) y se enfoca aparte. El deshabilitado solo existe como botón (los tipos lo
      rechazan con `href` y `render`).
    - (d) Selección: **el control envuelve el texto del elemento**:
      `<ListItem><Checkbox><ListItemHeadline>Leche</ListItemHeadline></Checkbox></ListItem>`. La
      etiqueta propia del control (`<label>`) es la del input, así que el nombre es el texto sin ids
      ni `aria-labelledby`, y el HTML es válido (una sola etiqueta, sin otro control adentro). La
      lista le da a esa etiqueta las columnas de texto, final y control con `subgrid` (el control
      queda al final, se mete en el relleno como en Compose y la fila de una línea sigue en 52) y un
      `::after` que cubre el `<li>`: toda la fila activa el input nativo (clic, Espacio; los radios
      con flechas, del navegador). Los átomos del control se ocultan y la fila usa los del `<li>`
      (ListItem siempre dibuja capa, onda y anillo; fuera de una fila de selección, ocultos).
      Checkbox, RadioButton y Switch no cambiaron.
    - (e) Seleccionado del kit: **sale de la semántica, sin prop**. `aria-current` en la acción (el
      elemento abierto en el panel de detalle; `current` pone `"page"`, y un `NavLink` lo pone solo)
      o una casilla o un radio marcados (Compose: `selected = checked`). Un switch encendido no
      selecciona (es un ajuste). No se usa `aria-selected`: solo vale en `listbox`, `grid` o
      `tablist`, y una lista de enlaces o de controles nativos no es eso. Un elemento de contenido no
      se selecciona ni se deshabilita: no hay estado sin semántica que lo respalde.
    - Acordeón: **`<details>`/`<summary>` nativos** (`ListItemDetails`, `ListItemSummary`), elegidos
      con una sonda en los tres motores (2026-11-25): el `<summary>` acepta `display: grid` con las
      columnas de la fila, el marcador se quita con `list-style: none` y
      `::-webkit-details-marker`, Tab lo alcanza (también en el WebKit de macOS), Enter y Espacio lo
      abren y cierran, y `name` deja uno abierto a la vez. Chrome lo expone como disclosure con
      `expanded` (árbol de accesibilidad leído por CDP). Así queda universal: un botón con
      `aria-expanded` necesitaría estado y `'use client'`. El botón de 32 × 40 del kit es un
      indicador (`aria-hidden`) dentro del `<summary>`, porque la fila entera es el botón; un
      segundo botón sería un interactivo anidado.
  - **Teclado: Tab por elemento**, como cualquier lista de enlaces o botones del navegador. Se
    descarta la parada única con flechas de `@material/web` (tabindex itinerante): es el patrón de
    `listbox`/`grid` y necesitaría estado y JavaScript. Los radios ya se mueven con flechas
    (nativo).
  - **Forma por estado** (Compose `shapeForInteraction`): reposo 4 (o las esquinas de Group en la
    segmentada), hover 12, foco, presionado y seleccionado 16, en las cuatro esquinas también en la
    segmentada. Las condiciones van en `:where()` para que el orden de las reglas sea la prioridad.
  - **Anillo de foco por dentro** (como `@material/web`): los elementos están pegados o a 2 px; en el
    seleccionado, `On Secondary Container` (Secondary sobre Secondary Container no llega a 3:1).
    Por lo mismo (ADR-0008), la casilla y el radio marcados dentro de un elemento seleccionado se
    pintan en `On Secondary Container`, como el resto del contenido final del kit.
  - **Responsive con container queries sobre la lista** (`container: mk-list / inline-size`): el
    texto principal corta línea y no se recorta (es el nombre); el apoyo se recorta a 2 líneas
    (`--mk-list-item-supporting-lines`, `none` lo desactiva); bajo 20rem el texto final que no
    acompaña a un control o un icono pasa debajo del texto; bajo 15rem la imagen o el video de
    inicio pasa arriba; el video mide `min(114px, 32cqi)`.
  - **Draggable y Swipe no se implementan** (gestos y reordenamiento con teclado son un ítem
    propio). La API los deja abiertos: el átomo StateLayer ya reacciona a `[data-dragged]`, los
    colores son variables (`--_container`, `--_headline`…) a las que un estado arrastrado sumaría
    `Tertiary Container` y la forma de 16, y las acciones de deslizar serían otra parte del
    elemento.
- Opciones descartadas:
  - **Toda la fila como `<a>`/`<button>`**: imposible con un IconButton al final y nombre accesible
    con todo el texto.
  - **Fila `<label>` con el control adentro**: el Checkbox, el RadioButton y el Switch ya dibujan su
    `<label>`; una dentro de otra es HTML inválido. Habría exigido cambiar los tres controles.
  - **`aria-labelledby` con ids**: sin contexto (universal) el uso tendría que escribir los ids.
  - **`display: contents` en la etiqueta del control**: funcionaba, pero `subgrid` da lo mismo sin
    sacar un elemento de la caja (riesgos conocidos de `display: contents` en accesibilidad).
  - **`listbox` con `aria-selected`**: necesita estado, flechas y `'use client'`; la selección con
    controles nativos ya funciona en formularios. Queda para una variante futura si aparece un caso
    de selección con flechas.
- Tradeoff accepted:
  - En los elementos interactivos el texto no se selecciona con el puntero (el área lo cubre).
  - La lista conoce las clases internas de Checkbox, RadioButton y Switch (`.mk-*-control`,
    `.mk-*-label`) para ubicarlos; un cambio en esos controles puede romperla (lo cubren las pruebas).
  - En una fila de selección con un control secundario (un IconButton), presionar ese control
    también dispara la onda de la fila (la onda del `<li>` escucha al `<li>`).
  - El control de selección va siempre al final (el kit lo pone al final; Compose permite inicio).
  - Como la lista mide su propio ancho, en una fila flex necesita `flex: 1` o un ancho; se estira
    sola en una columna flex que alinea al inicio (RadioGroup).
  - Piso de navegadores: `:has()`, `subgrid`, container queries, `<details name>`; presentes en los
    tres motores del CI.
- Revisit if: hace falta selección con flechas (listbox), reordenar o deslizar; HTML gana un
  elemento de lista interactiva; o los controles cambian su estructura.
- Evidencia (2026-11-25):
  - Sonda en Chrome, Firefox y WebKit (archivo temporal, borrado): `<summary>` en grilla, Tab, Enter,
    Espacio y `name`; etiqueta con `subgrid` y `::after`, clic en el inicio y en el relleno.
  - Árbol de accesibilidad de Chrome (CDP, sonda borrada): `list` "Prueba" con `list-style: none` y
    `role="list"`; `link` "Enlace actual"; `checkbox` "Leche 1 unidad"; `switch` "Wi-Fi";
    `DisclosureTriangle` "Pregunta" con `expanded=false`.
  - VoiceOver en Safari no se pudo automatizar: el rol explícito está probado como atributo; falta la
    comprobación manual (ver el plan).
  - `List.test.tsx` en los tres motores; `forced-colors.test.tsx`, `a11y.test.tsx` y
    `contrast.test.tsx`.
