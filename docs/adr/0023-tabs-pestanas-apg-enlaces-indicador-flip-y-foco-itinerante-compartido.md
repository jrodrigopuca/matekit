# ADR-0023: Tabs con pestañas APG por contexto, una barra de enlaces aparte, paneles ocultos y montados, indicador por pestaña animado con FLIP y foco itinerante compartido en `src/internal/`

- Status: accepted (2026-11-26)
- Complementa: [ADR-0002](0002-api-por-composicion-con-capas-atomicas.md) (partes con nombres
  planos), [ADR-0003](0003-componentes-universales-e-interactivos.md) (qué es cliente),
  [ADR-0010](0010-enlaces-y-enrutadores-con-render.md) y [ADR-0020](0020-interactive-primitiva-publica.md)
  (enlaces y `render`), [ADR-0012](0012-radiogroup-con-estado-por-contexto.md) (estado por contexto),
  [ADR-0019](0019-chips-grupo-con-foco-itinerante-seleccion-y-quitado.md) (foco itinerante: la
  decisión sigue igual, solo cambia dónde vive el código).
- Drivers:
  - Ítem 18 del plan: primary y secondary, fixed y scrollable, patrón APG "Tabs" con activación
    automática o manual, indicador animado, y una variante de enlaces para navegar entre páginas.
    El autor decidió el 2026-11-26 sacar el foco itinerante del `ChipGroup` a `src/internal/` y
    compartirlo, pensando también en las Toolbars (ítem 22).
  - Las pestañas de contenido y la navegación entre páginas tienen la misma apariencia y semántica
    distinta: una pestaña APG controla un panel de la misma página (`tablist`/`tab`/`tabpanel`,
    una parada de Tab y flechas); un enlace lleva a otra URL (`<nav>`, `aria-current="page"`, Tab
    por enlace). Mezclarlas confunde a los lectores de pantalla (anuncian "pestaña 2 de 4" y al
    activarla cambia la página).
  - Sonda en los tres motores (2026-11-26) para el indicador: CSS anchor positioning existe en
    Chrome, Firefox y WebKit, pero al cambiar `anchor-name` de un elemento a otro con `transition`
    en `left`/`right`, Chrome y WebKit animan (dos transiciones en curso) y **Firefox salta** (cero
    animaciones). La Web Animations API con `translate` y `width`, un keyframe implícito al final y
    el `linear()` de los resortes como `easing` dio los mismos valores en los tres (a 0 ms el lugar
    de partida, a 500 ms el mismo punto intermedio). `scrollTo` en la barra no movió la página en
    ninguno. `hidden="until-found"` (`onbeforematch`) también existe en los tres.
  - Un formulario repartido en pestañas no puede perder lo escrito al cambiar de pestaña; un panel
    pesado (un mapa, una tabla grande) puede querer no estar montado.
  - Compose (`TabRow.kt`, commit `c61c795a52`): indicador con `DefaultSpatial`, la elegida centrada en
    la scrollable, ancho mínimo 90 y 52 a los lados; `@material/web` (`tabs/internal/tab.ts`, commit
    `dba9f5fe40`): un indicador por pestaña animado con FLIP, fundido con movimiento reducido.
- Decision:
  - **Pestañas de contenido: `Tabs`, `TabList`, `Tab`, `TabPanel` y `TabLabel`** (nombres planos,
    los de Radix, React Aria y Base UI: quien viene de ahí los reconoce). `Tabs` es un `<div>` que
    reparte por contexto `value` (controlado) o `defaultValue` (no controlado), **uno de los dos
    obligatorio en los tipos** (APG pide una elegida y sin JavaScript no hay de dónde sacarla), y
    `onValueChange(value, event)` (evento de clic o de tecla), como el RadioGroup. `TabList` es el
    `role="tablist"` y lleva el aspecto (`variant` primary o secondary, `layout` fixed o scrollable);
    `Tab` es un `<button role="tab">` con `aria-selected` y `aria-controls`; `TabPanel`, un
    `role="tabpanel"` con `aria-labelledby` y `tabIndex={0}`. Los `id` salen de `useId` y del valor
    (con `encodeURIComponent`, sin espacios); `id`, `aria-controls` y `aria-labelledby` no se aceptan
    como props (romperían la relación).
    - **Activación automática por defecto** (`activation="automatic"`: la flecha mueve el foco y
      elige, lo que APG recomienda si mostrar el panel es inmediato, como con paneles montados) y
      `activation="manual"` (las flechas solo mueven el foco; Enter o Espacio, los del botón,
      eligen). `@material/web` usa la manual por defecto; se prefirió APG.
    - **Contenido como el Button y los chips:** `<Tab value="a"><FlightIcon />Vuelos</Tab>`. El texto
      suelto va a la etiqueta (`.mk-tab-label`), `TabLabel` envuelve una etiqueta que no es texto,
      una `Badge` va sobre la esquina del icono (su texto para lectores después de la etiqueta, para
      que el nombre sea "Favoritos 3 nuevos") o después de la etiqueta si no hay icono, y cualquier
      otro elemento es el icono. Los fragmentos se aplanan. Sin etiqueta visible y sin `aria-label`
      ni `aria-labelledby`, `console.error` (no se puede exigir en los tipos).
  - **Paneles ocultos con `hidden` y montados por defecto** (conservan lo escrito, el estado de sus
    componentes y el desplazamiento; están en el HTML del servidor). `unmount` en un `TabPanel`
    desmonta su contenido mientras no está elegido, pero deja el elemento del panel, así
    `aria-controls` nunca apunta a un `id` que no existe. Se elige por panel.
  - **Navegación entre páginas: `TabNav` y `TabLink`, componentes propios** (no una prop de
    `TabList`). `TabNav` es un `<nav>` con el mismo aspecto (`variant`, `layout`) y `TabLink` un
    `<a>` con `href` o el `Link` del enrutador con `render` (átomo `Interactive`), activo con
    `active` → `aria-current="page"` (o el que ponga un `NavLink`), como los destinos de
    NavigationBar. Sin `tablist`, sin paneles, sin foco itinerante: Tab recorre los enlaces, como
    en cualquier lista de enlaces. `TabLink` es universal; `TabNav` es cliente solo para el
    deslizamiento del indicador y el desplazamiento (un `MutationObserver` sobre `aria-current`),
    sin JavaScript se ve igual.
    - Descartada una prop (`<TabList as="nav">` o `<Tabs links>`): un mismo componente cambiaría de
      roles, de teclado y del tipo de sus hijos (botones con `value` o enlaces con `href`) según una
      prop, y los tipos no podrían impedir un `Tab` con `href` dentro de un `tablist`. Con
      componentes propios, cada uno tiene los tipos y la semántica que le corresponden.
  - **Indicador: uno por pestaña, visible en la elegida, animado con FLIP** (`tab-motion.ts`): al
    cambiar la elegida, el indicador nuevo se anima con la Web Animations API desde el rect del
    anterior (`translate` y `width` en un keyframe con `offset: 0`, el final es su lugar), con la
    duración y el `linear()` de `--md-sys-motion-spring-default-spatial-*`. Con movimiento reducido
    esa duración es 0 y el nuevo aparece con un fundido (`fast-effects`), sin desplazarse. En la
    primary el indicador está dentro del contenido (`position: relative`) y mide su ancho menos 2 por
    lado; en la secondary, el contenido no está posicionado y mide la pestaña. Ancho y posición
    físicos (`left`, `width`), iguales en RTL.
    - Descartado **un indicador único medido con JavaScript**: sin JavaScript (Server Components,
      antes de hidratar) no estaría en su lugar, y necesita `ResizeObserver` para seguir cambios de
      ancho, de fuente o de contenido.
    - Descartado **CSS anchor positioning con transición**: Firefox no anima el cambio de ancla
      (sonda), habría que mantener un respaldo igual, y comparte el problema de antes de hidratar.
    - `scaleX` (como `@material/web`) se descartó porque deforma las esquinas redondeadas del primary.
  - **Scrollable:** `overflow-x: auto` sin barra (`scrollbar-width: none`; la barra taparía el
    indicador y el divisor), 52 a los lados, pestañas de 90 como mínimo; la elegida se centra con
    `scrollTo` en la barra (no `scrollIntoView`, que movería la página en vertical), suave salvo con
    movimiento reducido; el anillo de foco va por dentro para verse en los extremos.
  - **Fixed en un ancho chico:** la etiqueta va en una línea y se recorta con puntos suspensivos (el
    nombre accesible queda completo); para más de cuatro pestañas o etiquetas largas se recomienda
    `scrollable`. Descartadas las dos líneas de Compose: a 320 px con seis pestañas quedan 21 px de
    texto y parten las palabras ("Ini/cio").
  - **Foco itinerante compartido: `src/internal/roving-focus.ts`** (`useRovingFocus`,
    `updateRovingStops`, `rovingStops`), no exportado. Opciones: `stop` y `scope` (selectores),
    `orientation` (`horizontal`, `vertical`, `both`), `loop` (vuelta, por defecto sí), `preferred`
    (la parada cuando el foco está fuera: la pestaña elegida, como pide APG al volver con Mayús+Tab)
    y `activate` (si se pasa, mover el foco con teclado activa: Tabs automática; sin ella, manual,
    ChipGroup y la futura Toolbar). Mismo funcionamiento que el del ChipGroup (tabIndex sobre el
    DOM con `MutationObserver`, RTL, Inicio y Fin, sin deshabilitadas, sin modificadores,
    `focus({ focusVisible: true })`). El ChipGroup lo usa sin cambiar su conducta: sus 39 pruebas
    pasan sin tocarlas.
  - **Excepción al ADR-0003**, como ADR-0012 y ADR-0019: `Tabs`, `TabList`, `Tab`, `TabPanel` (en
    `Tabs.tsx`) y `TabNav` son cliente; `TabLink` y `TabLabel` son universales.
- Tradeoff accepted:
  - Un grupo de pestañas escrito en un Server Component hidrata `Tabs.tsx` entero; el contenido de
    los paneles puede seguir siendo de servidor (llega como hijos).
  - Paneles montados: todo el contenido se renderiza aunque no se vea. Un campo `required` dentro de
    un panel oculto bloquea el envío del formulario sin poder mostrarse ("invalid form control is not
    focusable"); se documenta validar por pestaña o usar `unmount` si el dato no es del formulario.
  - Sin barra de desplazamiento, quien usa un mouse sin rueda horizontal desplaza la scrollable con
    Mayús+rueda, el teclado o tocando una pestaña a medio ver (como Compose y `@material/web`).
  - `TabList` en un contenedor de grilla o flex sin `minmax(0, …)`/`min-width: 0` toma el ancho de
    todas las etiquetas enteras (su mínimo por contenido) y se sale; pasa lo mismo con la
    NavigationBar. Se dejó así: contenerlo (`contain: inline-size`) lo haría medir 0 en una fila flex.
  - `useRovingFocus` toca `tabIndex` de elementos que dibuja React (ya aceptado en ADR-0019).
  - El indicador de cada pestaña es un elemento más por pestaña.
- Revisit if: Firefox anima el cambio de ancla en anchor positioning y conviene un solo indicador sin
  JavaScript; React ofrece una forma universal de repartir estado a descendientes; hace falta buscar
  con Ctrl+F dentro de paneles ocultos (`hidden="until-found"` con `beforematch` existe en los tres
  motores: sería una opción más de `TabPanel`); los lectores de pantalla anuncian mal la barra de
  enlaces o la activación automática (VoiceOver y NVDA, pendiente); o las Toolbars necesitan algo que
  `roving-focus.ts` no cubre (paradas deshabilitadas enfocables con `aria-disabled`, como admite APG).
- Evidencia (2026-11-26):
  - `Tabs.test.tsx` (40 pruebas) en Chrome, Firefox y WebKit: roles y relaciones APG, ids, nombre de
    solo icono, teclado (una parada, flechas con vuelta, Inicio, Fin, RTL, deshabilitadas,
    modificadores, automática y manual con Enter y Espacio, la parada vuelve a la elegida),
    controlado y no controlado, paneles (`hidden` conserva lo escrito, `unmount`), medidas y colores
    por estilo y estado contra el kit, indicador animado congelado a 0 ms (también en RTL y con
    movimiento reducido), scrollable con la elegida visible sin mover la página y el anillo entero en
    los extremos, fixed a 320 px, insignias, `TabNav` con `aria-current`, `render`, Tab por enlace y
    deslizamiento. En el WebKit de macOS falla solo "Tab recorre cada enlace" (el Tab del sistema no
    llega a los enlaces); lo mismo sin Tab pasa. Más `forced-colors.test.tsx`, `a11y.test.tsx` y
    `contrast.test.tsx`.
  - `Chip.test.tsx`: 39 pruebas antes y 39 después, sin cambios, en los tres motores (en el WebKit
    local falla la de Tab, igual que antes del cambio: comprobado con el `ChipGroup.tsx` original).
  - Revisión visual en el playground (`#tabs`) a 320 y 1200 px, claro y oscuro, también en RTL.
