# ADR-0019: Chips con un grupo `toolbar` de foco itinerante, selección por contexto como toggles y quitado controlado por el uso

- Status: accepted (2026-11-25)
- Drivers:
  - Ítem 15 del plan: assist, filter, input y suggestion (outlined y elevated donde el kit los
    tiene), filter como toggle o en un grupo de selección, input con botón de quitar. El riesgo
    marcado: la navegación con teclado de un grupo de chips.
  - Los chips "should always appear in a set" (`@material/web` `docs/components/chip.md`), y en
    los usos típicos son muchos: una fila de 10 a 20 filtros, destinatarios de un correo. Con una
    parada de Tab por chip, cruzar el grupo cuesta tantas pulsaciones como chips.
  - Universal donde se pueda (ADR-0003); el precedente de estado de grupo por contexto es
    `RadioGroup` (ADR-0012).
  - El input chip tiene dos acciones (la principal y quitar) sin controles anidados, y quitarlo no
    puede dejar el foco perdido en `<body>`.
- Decision:
  - **Componentes:** `AssistChip` y `SuggestionChip` universales (botón, `href` o `render`,
    ADR-0010, con `interactiveElement`; el suggestion acepta `selected` como el Button, porque el kit
    tiene suggestion seleccionado); `FilterChip`, `InputChip` y `ChipGroup` con `'use client'`.
    Partes `ChipLabel` (etiqueta que no es solo texto) y `ChipAvatar`. El texto suelto se envuelve
    solo en la etiqueta (`<AssistChip><EventIcon />Agendar</AssistChip>`); lo de antes es el inicio
    y lo de después el final, y la configuración queda en `data-leading`, `data-trailing` y
    `data-avatar` para los rellenos del kit (`chip-content.tsx`).
  - **Grupo: `ChipGroup` es un `<div role="toolbar" aria-orientation="horizontal">` con nombre
    obligatorio en los tipos (`aria-label` o `aria-labelledby`), con una sola parada de Tab y
    flechas (foco itinerante).** Izquierda y derecha recorren las paradas en orden, con vuelta en los
    extremos y sin pasar por las deshabilitadas; Inicio y Fin van a la primera y la última; en RTL se
    invierten; las flechas con modificadores no se capturan. Es el patrón APG "Toolbar" y la conducta
    del `md-chip-set` (`chips/internal/chip-set.ts`: `role = 'toolbar'`, las mismas teclas, RTL y
    vuelta). Las paradas son todas las acciones (`data-chip-stop`), así que en el input chip la flecha
    pasa de la acción principal al botón de quitar y de ahí al chip siguiente, como
    `multi-action-chip.ts`, sin una lógica aparte para el chip. Fin lleva al último botón de quitar
    (en `@material/web`, `focus({ trailing: true })`).
    - El `tabIndex` se maneja sobre el DOM con un `MutationObserver` (chips que se agregan, quitan o
      deshabilitan), no con estado de React: no hace falta que cada chip se registre, y vale también
      para los de `render`. Sin JavaScript (antes de hidratar) cada chip es una parada: sigue usable.
    - La disposición es `Stack` (fila con `gap` 100, `wrap` según `layout`); el grupo solo suma
      `row-gap` 16 (kit) y la variante `scroll`.
    - Descartado **Tab por chip** (universal, sin JavaScript): costoso con muchos chips y distinto de
      `@material/web`. Descartados **`grid`** (React Aria TagGroup) y **`listbox`**: piden filas y
      celdas, o una selección que los assist y suggestion no tienen; un toolbar admite botones,
      toggles y enlaces mezclados.
  - **Selección: en el grupo, con `selectionMode` `single` o `multiple`, `value`/`defaultValue` y
    `onValueChange(value, event)`** (en `single`, `string | null`; en `multiple`, `string[]` en el
    orden de los clics), repartida por contexto a los `FilterChip` con `value`, y `useChipGroup()`
    (`{ selectionMode, value: readonly string[] }`). El `onClick` propio va antes; con
    `preventDefault()` el grupo no cambia. Un `selected` propio manda sobre el grupo.
    - **Semántica: los filtros son botones toggle con `aria-pressed` en los dos modos**, como el
      filter chip de `@material/web` (`filter-chip.ts`, `aria-pressed` en el `<button>`). Descartado
      `radiogroup`/`radio` para `single`: en APG las flechas de un grupo de radios también
      seleccionan, lo que choca con un toolbar que además lleva assist chips y con filtros que se
      aplican al tocarlos; y el filtro simple de Material se puede desmarcar (no hay "una opción
      obligatoria"). Contra: un lector no anuncia que en `single` las opciones se excluyen; se
      documenta usar `RadioGroup` para una elección obligatoria de formulario.
  - **Quitar: `onRemove(event)` obligatorio, la lista la maneja el uso (controlado).** El chip no se
    esconde solo (como `md-input-chip`, que se borra del DOM con `this.remove()`, lo que en React
    rompería el árbol). Se pide con el botón de quitar, o con Supr o Retroceso sobre cualquiera de
    las dos acciones (React Aria `useTag.ts`; `@material/web` no lo tiene, comprobado en sus fuentes).
    El nombre del botón es "Quitar" + la etiqueta por `aria-labelledby` (o + el `aria-label` del
    chip), como `trailing-icons.ts`; `removeLabel` cambia la primera parte. `removeOnly` deja la
    etiqueta como texto (el `remove-only` de `@material/web`).
    - **Foco después de quitar:** antes de avisar, el chip calcula el vecino (la primera acción del
      chip siguiente, o del anterior si era el último); cuando el chip desaparece del DOM (en una
      microtarea o en los dos cuadros siguientes) y el foco quedó en `<body>`, lo mueve ahí. Si no
      queda ninguno, al grupo (`tabIndex = -1`, como React Aria `useTagGroup.ts`). Si el uso movió el
      foco en `onRemove` (a su campo de texto) o no quitó el chip, no se toca.
  - **Excepción al ADR-0003**, como ADR-0012: `ChipGroup` (estado, efectos, contexto y teclado),
    `FilterChip` (lee el contexto) e `InputChip` (teclado y foco después de quitar) son cliente.
  - **Texto largo:** el chip no pasa del ancho de su contenedor (`max-inline-size: 100%`,
    `--mk-chip-max-width` para acotar más) y la etiqueta se recorta con puntos suspensivos sin
    cortar línea (es un control de 32 de alto); el nombre accesible sigue siendo el texto completo.
- Tradeoff accepted:
  - Tres módulos cliente: un grupo de filtros escrito en un Server Component hidrata el grupo y cada
    filtro. Los assist y suggestion sueltos siguen universales.
  - `useChipGroup()` y la forma de `onValueChange` pasan a ser API pública.
  - El foco itinerante toca `tabIndex` de elementos que dibuja React: un `tabIndex` propio en un chip
    dentro del grupo se pisa.
  - Con `layout="scroll"`, el grupo lleva 8 de relleno también a los costados para que el anillo de
    foco no se corte: los chips quedan 8 px adentro del borde del contenido.
  - El texto recortado no se ve completo hasta que haya Tooltip (ítem 16).
- Revisit if: APG publica un patrón propio para grupos de etiquetas o chips; los lectores de
  pantalla anuncian mal los toggles de un toolbar (comprobar con VoiceOver y NVDA, pendiente); el kit
  adopta la forma por estado de `ChipsTokens.kt`; o React gana una forma universal de repartir estado
  a descendientes.
- Evidencia (2026-11-25/26):
  - `Chip.test.tsx` (39 pruebas) en Chrome, Firefox y WebKit: roles y nombres de cada tipo, toggle,
    selección simple y múltiple (controlada y no), quitar con botón, Supr y Retroceso y adónde va el
    foco (siguiente, anterior, grupo, foco del uso respetado, chip no quitado), teclado del grupo con
    RTL, Inicio, Fin, vuelta, deshabilitados y chips que cambian, medidas y rellenos por
    configuración contra el kit, colores y elevación por estilo y estado, grupos de una fila y de
    varias, texto largo, props nativas y `ref`. Más `forced-colors.test.tsx`, `a11y.test.tsx` y
    `contrast.test.tsx`.
  - Revisión visual en el playground (`#chips`) a 320, 600 y 1200 px, claro y oscuro, sin desborde
    horizontal.
