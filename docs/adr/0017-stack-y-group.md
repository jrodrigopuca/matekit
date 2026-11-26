# ADR-0017: `Stack` como capa delgada sobre flex y `Group` con esquinas por posición en variables que leen los hijos

- Status: accepted (2026-11-25)
- Drivers:
  - Ítem 13 del plan: una pila para la disposición y un grupo de bloques conectados que sirva de
    verdad a la List segmentada (ítem 14) y a los Button groups conectados (ítem 25), sin que cada
    uno repita la lógica de las esquinas.
  - Una API chica que no compita con escribir CSS plano: Compose terminó adoptando flexbox
    (`FlexBox`, Compose 1.14) y su `Row`/`Column`/`FlowRow` se traducen casi uno a uno a CSS
    (`docs/research/11-disposicion-adaptable-compose.md` § 5).
  - Universales (ADR-0003) y sin `<div>` sin semántica cuando el contenido es una lista o una
    navegación.
  - Las formas de Material 3 Expressive cambian por estado y se animan: Compose
    `ButtonGroupDefaults.connected*ButtonShapes` (exteriores `CornerFull`, interiores 8, 4 al
    presionar, 50 % seleccionado; `ConnectedButtonGroupSmallTokens.kt`) y
    `ListItemDefaults.segmentedShapes` (16 afuera, 4 adentro; con el puntero, las cuatro esquinas a
    12). Los hijos pueden ser componentes con radio propio (Button, Card).
- Decision:
  - **Los dos son átomos** (`src/atoms/Stack`, `src/atoms/Group`, capa `matekit.atoms`):
    primitivas sin significado propio para armar componentes (ADR-0002). Así un componente con su
    propio radio (capa `matekit.components`) le gana a lo que Group pone en sus hijos sin pelear
    con la especificidad.
  - **Elemento: `render`**, con la forma de ADR-0010 (un elemento que se clona, no un componente):
    `<Stack render={<ul />}>`, `<Group render={<fieldset />}>`. Se descarta `as` por lo mismo que
    en ADR-0010 (tipos polimórficos) y por coherencia con el resto de la librería. A diferencia de
    `interactiveElement`, el `style` del elemento se combina con el del componente (Stack escribe
    ahí `--mk-stack-switch-at`). Ayuda compartida: `src/internal/layout-element.tsx`.
  - **`Stack`**, props y por qué cada una:
    - `direction` (`column` por defecto, o `row`): lo único que cambia entre Column y Row.
    - `gap`: un paso de la escala (`SpaceStep`, ADR-0016), no un número libre: es lo que la pila
      agrega sobre CSS (separaciones de Material sin buscar el token). Se aplica con
      `data-gap` y una regla por paso, no con un estilo en línea, para que una clase propia pueda
      cambiarlo.
    - `wrap`: el FlowRow de Compose; la herramienta básica a anchos chicos.
    - `align` y `justify`: los dos ejes, con nombres cortos (`between` = `space-between`).
    - `switchAt`: cambio de fila a columna según el ancho del propio Stack (ver abajo). Los tipos
      lo excluyen con `direction` y `wrap`, que el switcher fija.
    - Todo lo demás (`row-gap` distinto de `column-gap`, `order`, `align-content`, `inline-flex`)
      es CSS del uso. Los valores por defecto son los de CSS (sin separación, `align-items:
      stretch`, sin envoltura): quien conoce flex lee un Stack sin sorpresas. Se descarta copiar el
      inicio de Compose como alineación por defecto por eso, aunque en una columna los botones se
      estiren (se pide `align="start"`).
  - **Cambio de dirección por espacio: patrón "switcher"** (Heydon Pickering, Every Layout): fila
    con envoltura y, en cada hijo, `flex-basis: calc((var(--mk-stack-switch-at) - 100%) * 999)`.
    Se eligió con una sonda en los tres motores (2026-11-25), frente a container queries:
    - El switcher dio el mismo resultado en Chrome, Firefox y WebKit (fila a 400 px y columna a
      200 px con umbral de 300 px) y acepta una variable, así que el umbral es una prop.
    - `@container (width < var(--t))` no es válido según la especificación; Chrome y WebKit lo
      ignoran y Firefox lo aplicó. Con un umbral literal sí funciona, pero el umbral no podría ser
      una prop y el Stack necesitaría un ancestro con `container-type` (un elemento no se consulta
      a sí mismo): otro `<div>`.
    - Contra: en fila los hijos se reparten el ancho en partes iguales y `justify` no tiene efecto;
      un hijo con su propio `flex` (en `matekit.components` o en el CSS del uso) se sale del patrón.
  - **El `weight` de Compose queda documentado, sin API**: `style={{ flex: 1, minInlineSize: 0 }}`
    en el hijo. Una parte (`StackItem`) sumaría un elemento; una clase utilitaria sería API pública
    para dos declaraciones de CSS.
  - **`Group`**: `orientation` (`horizontal` por defecto, o `vertical`) y `render`. Nada más en
    props: los valores cambian por uso y por estado, y eso lo hacen mejor las variables.
  - **Contrato de Group con los hijos** (`src/atoms/Group/group.css`):
    - Entradas, que el uso define en el grupo o en un hijo, también en un estado del hijo:
      `--mk-group-gap` (por defecto `--md-sys-space-25`, 2), `--mk-group-outer-radius` (16,
      `corner-large`) y `--mk-group-inner-radius` (4, `corner-extra-small`). Los valores por
      defecto son los de la List segmentada (Compose y el kit).
    - Salidas, que el grupo declara en cada hijo directo según su posición (`:first-child`,
      `:last-child`; uno solo recibe las cuatro exteriores): `--mk-group-corner-start-start`,
      `-start-end`, `-end-start` y `-end-end`, una por esquina lógica (RTL sin reglas aparte).
      Como se declaran en el hijo con `var()` de las entradas, se resuelven con los valores del
      hijo: un hijo que redefine `--mk-group-inner-radius` en su `:active` cambia solo sus
      esquinas interiores, y su `transition` de `border-radius` lo anima.
    - Las salidas están registradas con `@property` (`syntax: '*'`, `inherits: false`, sin valor
      inicial): un componente anidado más adentro (un botón dentro de una tarjeta del grupo) no las
      ve y usa su respaldo. Comprobado en los tres motores.
    - Un hijo sin radio propio (`<div>`, `<li>`, un `<button>` del usuario sin clase de matekit)
      recibe `border-*-radius` de las salidas (especificidad 0). Un componente con radio propio
      **participa leyendo las salidas con su radio como respaldo**:
      `border-start-start-radius: var(--mk-group-corner-start-start, var(--_radius))` (y las otras
      tres). Fuera de un grupo, las salidas no existen y el componente queda igual.
    - Se descarta que Group pise el `border-radius` de los hijos con selectores de más
      especificidad: rompería el radio por estado de cada componente (Button presionado) y el
      orden de capas.
  - **Sin envoltura en Group**: con `flex-wrap`, el último de una línea quedaría con esquinas
    interiores contra el borde. A anchos chicos los hijos se achican (`min-inline-size: 0`) sin
    desbordar el grupo; si no entran, el uso elige `vertical` (Compose, en su lugar, pasa los
    botones que no entran a un menú; eso es del ButtonGroup, ítem 25).
  - **Accesibilidad: ninguno de los dos agrega roles.** Group puede ser una lista
    (`render={<ul />}`), un grupo de botones o un conjunto de tarjetas; un `role="group"` propio
    taparía la semántica de la lista. Un grupo de botones lleva `role="group"` y `aria-label` como
    props (lo hará por defecto el ButtonGroup del ítem 25, como `@material/web`, cuyo segmented button
    set dibuja `role="group"` con el `aria-label` del uso: `labs/segmentedbuttonset/internal/
    segmented-button-set.ts`, leído el 2026-11-25); para un conjunto de opciones de formulario, `render={<fieldset />}`.
  - **Alto contraste**: el navegador quita los fondos y los bloques que solo se distinguían por el
    fondo se fundirían. Group dibuja en cada hijo un contorno `CanvasText` de 1 px por dentro
    (`outline-offset: -1px`, sigue el radio y no cambia el tamaño), con especificidad 0 (un
    componente con su propio contorno de alto contraste le gana) y sin aplicarlo al hijo con
    `:focus-visible` (no tapa el anillo del navegador).
- Qué tienen que hacer los componentes para participar (propuesto; no se tocó ninguno):
  - **Button e IconButton** (`button.css`): leer las cuatro salidas en vez de
    `border-radius: var(--_radius)`, con `var(--_radius)` como respaldo. El ButtonGroup conectado
    (ítem 25) definirá en sus hijos (no en el grupo, para que `--_height` se resuelva en cada
    botón) `--mk-group-outer-radius: calc(var(--_height) / 2)` (redondo que se anima, no
    `corner-full`), `--mk-group-inner-radius: var(--md-sys-shape-corner-small)`, en `:active`
    `corner-extra-small` y en `[aria-pressed='true']` la mitad del alto; `role="group"` con nombre.
    El playground (`playground/playground.css`, `.pg-button-group`) ya lo hace con CSS propio y se
    ve bien. Ojo: hoy el toggle seleccionado del Button es cuadrado; en el grupo conectado, Compose
    lo hace redondo, y lo decide el ButtonGroup.
  - **Card** (`card.css`): leer las salidas en su radio y pasarlas a lo que hoy usa `--_radius`
    (el `::before` del contorno, la imagen y la capa de estado heredan con `border-radius:
    inherit`, pero la imagen y las disposiciones horizontal/vertical combinan radios por esquina:
    habría que reemplazar `var(--_radius)` por la salida de cada esquina). Para "tarjetas
    agrupadas".
  - **List (ítem 14)**: `ListItem` como `<li>` sin radio propio recibe la forma sola; si tiene
    radio (para la List no segmentada), lee las salidas. Con el puntero redefine las dos entradas
    a `corner-medium` y con foco o arrastre a `corner-large` (Compose `ItemHovered…` y
    `ItemFocused…ExpressiveShape`). La lista sería `<Group orientation="vertical"
    render={<ul />}>`; ojo con `list-style: none` en Safari (VoiceOver deja de anunciar la lista
    salvo con `role="list"`): por eso ni Stack ni Group quitan los estilos del `<ul>`.
- Tradeoff accepted:
  - Las posiciones salen de `:first-child`/`:last-child`: un hijo que no es un bloque (un
    `<input type="hidden">`, un `<template>`) rompe las esquinas. Los hijos tienen que ser los
    bloques.
  - Un componente de terceros con radio propio no participa sin leer las variables.
  - `@property` es global (no entra en capas); los cuatro nombres quedan reservados.
  - El switcher reparte en partes iguales y desactiva `justify` en fila.
  - Piso de navegadores: `@property` y propiedades lógicas de radio, presentes en los tres motores
    del CI (comprobado con las pruebas el 2026-11-25).
- Revisit if: las consultas de estilo (`@container style(...)`) llegan a Firefox (Group podría
  cambiar de orientación por espacio sin el uso); CSS gana un selector de "último de su línea"
  (Group podría envolver); o aparece `corner-shape`/forma por posición nativa. Si el ButtonGroup o
  la List necesitan algo que el contrato no da, una ADR nueva lo extiende antes de copiar lógica.
- Evidencia (2026-11-25):
  - Sonda en Chrome, Firefox y WebKit (archivo temporal, borrado): switcher, `@container` con
    `var()` y `@property` sin herencia, con los resultados de arriba.
  - `Stack.test.tsx` y `Group.test.tsx` en los tres motores: dirección, cada paso de `gap`,
    envoltura sin desborde, alineación medida, switcher a 400 y 300 px y al cambiar el contenedor,
    `render`, props nativas y `ref`, tipos; esquinas por posición con 1, 2, 3 y 4 hijos en las dos
    orientaciones, separación, RTL, variables del uso, presionado de 8 a 4 en un solo hijo,
    transición de `border-radius` al cambiar una variable, componente que lee o no las salidas,
    nieto sin herencia, 200 px sin desborde. `forced-colors.test.tsx` y `a11y.test.tsx` cubren el
    alto contraste y axe.
