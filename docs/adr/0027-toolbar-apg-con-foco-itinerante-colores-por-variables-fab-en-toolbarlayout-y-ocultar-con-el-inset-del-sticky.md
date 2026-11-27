# ADR-0027: Toolbar como `role="toolbar"` con el foco itinerante compartido, colores de los botones por variables públicas, FAB acompañante en `ToolbarLayout` y ocultar al desplazar con el inset del `position: sticky`

- Status: accepted (2026-11-26)
- Complementa: [ADR-0002](0002-api-por-composicion-con-capas-atomicas.md) (partes con nombres
  planos), [ADR-0003](0003-componentes-universales-e-interactivos.md) (qué es cliente),
  [ADR-0019](0019-chips-grupo-con-foco-itinerante-seleccion-y-quitado.md) y
  [ADR-0023](0023-tabs-pestanas-apg-enlaces-indicador-flip-y-foco-itinerante-compartido.md) (foco
  itinerante), [ADR-0024](0024-top-app-bar-sticky-en-su-contenedor-animaciones-por-desplazamiento-y-parte-cliente-aislada.md)
  (sticky en su contenedor y parte cliente aislada).
- Drivers:
  - Ítem 22 del plan: docked y floating de Expressive (horizontal y vertical en la floating),
    Standard y Vibrant, con el patrón APG "Toolbar". La docked reemplaza al Bottom app bar del kit.
  - Kit (`docs/research/05-medidas.md` § Toolbars): floating 64 de grosor, redonda, elevación 3;
    docked 64 a todo el ancho; colores de la barra y de sus icon buttons, icon buttons
    seleccionables y botones seleccionables, por estado.
  - Compose (commit `76990c62ac`): `HorizontalFloatingToolbar`/`VerticalFloatingToolbar` (con y sin
    `floatingActionButton`), `FlexibleBottomAppBar` (la docked), `FloatingToolbarDefaults`
    (`ScreenOffset` 16, `exitAlwaysScrollBehavior(exitDirection)`) y los tokens
    `FloatingToolbarTokens`, `DockedToolbarTokens`, `StandardToolbarTokens`, `VibrantToolbarTokens`
    y `FloatingToolbarFabTokens`.
  - Sonda del 2026-11-26 (Chrome, Firefox y WebKit de Playwright) sobre un contenedor que se
    desplaza: un elemento corrido hacia abajo o hacia el final de la línea con `translate` (o con
    márgenes negativos) agranda lo que se puede desplazar en Chrome y Firefox (WebKit no); cambiar el
    `bottom` de un `position: sticky` a un valor negativo lo saca por el borde sin agrandar nada en
    los tres. Un `float` con `position: sticky; top: 50%` y un margen inferior negativo mayor que su
    alto queda centrado en lo visible, se queda ahí al desplazar y el texto no lo rodea.
- Decision:
  - **API**: `Toolbar` con `variant` (`floating` por defecto, la que Expressive recomienda; `docked`),
    `color` (`standard` o `vibrant`), `orientation` (la vertical solo existe en la floating: el tipo
    la rechaza con `docked`) y `scrollBehavior` (`none` por defecto o `exit-always`, el nombre de
    Compose). Nombre accesible obligatorio con `AccessibleNameProps` (`label`, `aria-label` o
    `aria-labelledby`). Los hijos son los componentes que ya existen (IconButton, Button, Menu,
    Tooltip): no hay botones propios de la barra. `ToolbarLayout` ubica una floating con su FAB.
  - **Semántica y teclado**: `<div role="toolbar" aria-orientation>`, patrón APG "Toolbar" con
    `useRovingFocus` sin cambios en `src/internal/roving-focus.ts` (las paradas son `button` y
    `a[href]` de la barra; el `scope` deja afuera los de un menú, un popover o un diálogo que vivan en
    su árbol): una parada de Tab, flechas en el eje (invertidas en RTL), vuelta, Inicio y Fin.
    - Deshabilitados: `disabled` los saltea (no se pueden enfocar, como Compose); `aria-disabled` los
      deja como parada, que APG admite y recomienda en una toolbar para que se descubran. El módulo ya
      lo hacía (filtra `:disabled`, y `aria-disabled` no lo es), así que no hizo falta una opción. El
      uso ignora el clic de un botón con `aria-disabled` (los estilos ya lo atenúan).
    - Un campo de texto u otro control que usa las flechas no es parada: conserva su propio Tab y sus
      flechas (APG lo trata aparte). Tampoco hizo falta una opción: lo decide el selector de paradas.
    - En la vertical, arriba y abajo sobre un disparador de menú (`aria-haspopup`) mueven el foco en
      lugar de abrir el menú (en APG "Menu Button" abrir con las flechas es opcional; Enter y Espacio
      lo abren). Se resuelve en la captura del teclado de la barra, antes del `MenuTrigger`.
  - **Colores de los botones**: la barra define variables públicas que los botones leen, sin
    componentes nuevos: `--mk-icon-button-color` (ya existía), `--mk-icon-button-selected-container`
    y `--mk-icon-button-selected-color` (IconButton `standard`, toggle seleccionado) y
    `--mk-button-unselected-container`, `--mk-button-unselected-color`,
    `--mk-button-selected-container` y `--mk-button-selected-color` (Button `filled` toggle). Sin las
    variables, los botones conservan sus colores (los respaldos son los anteriores). Deshabilitado
    gana por orden, como antes.
  - **Forma de los seleccionados**: redonda, como el kit (radio completo en el icon button y el
    button seleccionables de la barra). La barra define `--mk-icon-button-selected-round: 1` y
    `--mk-button-selected-round: 1`, que el IconButton y el Button leen para su radio seleccionado
    (un `calc` entre el cuadrado y el redondo, así el cambio de forma sigue animando); sin ellas, el
    toggle pasa a cuadrado como siempre. Al presionar, el seleccionado pasa a la forma presionada y
    vuelve a redondo. Compose coincide en el icon button (`IconToggleButton` es redondo) y choca en el
    Button (`ToggleButton` pasa a cuadrado): gana el kit (`07-jetpack-compose.md`).
  - **FAB acompañante**: `ToolbarLayout` contiene la barra y un `Fab` como hermanos, a 8,
    centrados en el otro eje; el FAB va donde se lo escriba (al final, lo que Compose hace por
    defecto, o al principio). El FAB queda fuera del `role="toolbar"`: es su propia parada de Tab,
    como en Compose, que lo deja fuera de la fila. La posición, el margen, las zonas seguras y el
    ocultar al desplazar pasan al conjunto. El color del FAB lo elige el uso (los tokens dicen
    Secondary Container con la Standard y Tertiary Container con la Vibrant; ver
    `07-jetpack-compose.md`).
  - **Contraer hacia el FAB**: `ToolbarLayout` lleva `expanded`/`defaultExpanded` (por defecto
    `true`) y `onExpandedChange(expanded, reason)`, como el resto de la librería, y por eso es
    cliente. Contraída, la barra se cierra hacia el FAB con un `clip-path: inset()` que pasa de
    abarcar la barra y su sombra (24 más afuera, con el radio concéntrico) a cerrarse del lado
    opuesto al FAB, y el FAB crece de 56 a 80 con `scale` anclado en su extremo exterior; las dos
    cosas con FastSpatial (sin transición con movimiento reducido). El conjunto conserva su tamaño,
    así el FAB no se mueve (como Compose). Se eligió el recorte y no animar el ancho porque el ancho
    `fit-content` no se puede animar sin medir, y con el ancho cambiaría el centrado. La caja del
    conjunto no recibe el puntero (sí sus hijos), así el lugar vacío no tapa el contenido.
    - Accesibilidad: contraída, la Toolbar (que lee el estado por contexto) queda `inert`: sin paradas
      de Tab ni lectura; el FAB sigue accesible. El foco de teclado que llega al FAB pide expandir
      (`'focus'`), así los botones quedan a un Mayús+Tab (Compose ofrece acciones de accesibilidad para
      expandir y contraer, que la web no tiene).
    - Qué dispara el cambio: por defecto, nada (queda expandida y la app decide, como Compose sin
      modificador). `scrollBehavior="collapse"` en la Toolbar lo ata al desplazamiento: contrae al bajar
      40 px y expande al subir 40 px desde el último cambio (`floatingToolbarVerticalNestedScroll`,
      `ScrollDistanceThreshold`); no contrae con el foco adentro de la barra. Es lo que Compose
      recomienda para la barra a un costado; para la centrada, `exit-always`.
  - **Docked con FAB**: no se hace. Ni el kit ni `FlexibleBottomAppBar` lo definen (el `BottomAppBar`
    de Compose con `floatingActionButton` es el que la docked reemplaza). Para una barra con FAB, la
    floating dentro de `ToolbarLayout`; si hace falta la docked, el FAB suelto encima, como sobre una
    NavigationBar. Documentado en el JSDoc de Toolbar y ToolbarLayout.
  - **Posición**: como el TopAppBar, `position: sticky` en el contenedor que se desplaza más cercano
    (la ventana o un panel), sin `ref` que conectar. La docked y la floating horizontal van como
    último hijo (abajo, `bottom` 0 o 16 más la zona segura); la floating horizontal centrada con
    `margin-inline: auto` y como mucho el ancho del contenedor menos 16 a cada lado. La vertical va
    como primer hijo: un `float` al final de la línea (o al principio, con `side="start"`; en RTL se
    invierten), sticky al 50 % del alto visible y con un margen inferior negativo que anula su alto
    (el texto no la rodea), a 24 del costado. Su alto máximo es lo visible del contenedor menos 24
    arriba y abajo: la parte cliente lo mide (`clientHeight` del contenedor, o de la ventana) y lo
    escribe en `--_scrollport`; antes de hidratar vale `100dvh`. No se usan unidades de contenedor
    porque exigirían `container-type` en el contenedor que se desplaza, que es de la app. Zonas seguras con
    `env(safe-area-inset-*)`: abajo y a los costados en la docked, abajo en la horizontal, el costado
    en la vertical.
  - **Ventanas chicas**: la docked reparte los botones (`space-between`, como `FlexibleBottomAppBar`)
    y la floating mide lo que sus botones; si no entran, la barra se desplaza a lo ancho dentro de sí
    (como la fila de Compose, `horizontalScroll`) sin desbordar la página, y el botón enfocado se trae
    a la vista. Lo recomendado (documentado y en el playground) es hasta cinco acciones y el resto en un
    `Menu` de más acciones; moverlas solas al menú necesitaría medir y duplicar elementos (el mismo
    motivo del TopAppBar).
  - **Ocultar al desplazar**: parte cliente aislada `ToolbarScroll` (un `<span hidden>`, como
    `TopAppBarScroll`), con el algoritmo de `enter-always` del TopAppBar y de
    `ExitAlwaysFloatingToolbarScrollBehavior`: el corrimiento sigue lo desplazado, se acomoda al
    estado más cercano al terminar (`scrollend`, o 150 ms sin desplazar) con FastSpatial y vuelve
    cuando el foco entra. Diferencias con el TopAppBar y con Compose:
    - Se corre el `bottom` del sticky (`--_offset`), no `translate`: con `translate` la página se
      agrandaría al esconderla (la sonda). Por eso, al final del contenido la barra queda en su lugar
      del flujo, a la vista (Compose la deja escondida).
    - La vertical no puede salir por el costado sin agrandar el ancho desplazable con ninguna de las
      técnicas probadas: se corre hasta el borde (sus 24) y se desvanece; escondida no recibe el
      puntero.
    - Con el foco adentro no se esconde (un control enfocado no puede quedar tapado, WCAG 2.4.11).
      Firefox desplaza el contenedor para mostrar el botón enfocado de una barra escondida antes del
      `focusin`; la parte cliente deshace ese salto.
    - Con movimiento reducido, el acomodo salta; el corrimiento que sigue al dedo queda (lo mueve el
      usuario), como en el TopAppBar.
  - **Qué es cliente**: `Toolbar` lleva `'use client'` (excepción al ADR-0003, como el ChipGroup): el
    foco itinerante necesita un efecto y manejadores de teclado en la raíz. Aislarlo en una hija con
    `addEventListener` haría que el teclado de la barra corra antes que los manejadores de React de los
    hijos (el `MenuTrigger` cancela las flechas para abrir) y el orden quedaría al revés.
    `ToolbarLayout` también, por `expanded`; `ToolbarScroll` es la única parte con desplazamiento y
    medida (`exit-always`, `collapse` y el alto de la vertical).
  - **Medidas**: el IconButton de matekit mide 40 (el área de 48 es un `::before`); dentro de la barra
    lleva 4 de margen en el eje de la barra, así rellenos y separaciones son los de Compose medidos
    hasta el área de 48 (12 del borde a cada icono visible, 12 entre iconos). El Button mide su ancho.
  - **Alto contraste**: contorno `CanvasText` en las dos (el navegador quita fondo y sombra); los
    seleccionados en `Highlight` y los deshabilitados en `GrayText` vienen de `button.css`.
- Tradeoff accepted:
  - Las variables de color se heredan: un IconButton `standard` o un Button `filled` toggle dentro de
    algo que viva en el árbol de la barra (por ejemplo el contenido de un menú) también las toma.
  - La barra tiene que ser hija (último o primer hijo) del contenedor que se desplaza, o de un
    elemento que llegue hasta su final, en flujo de bloque; la vertical como `float` no sirve dentro de
    un contenedor flex o grid (ahí ocupa lugar). Para otra disposición, el uso pisa `position`.
  - La vertical no sale del todo por el costado: se desvanece en su lugar, corrida 24.
  - La docked con `exit-always` aparece al final del contenido aunque se siga bajando.
  - `ToolbarLayout` es para la floating; la docked no tiene FAB acompañante.
  - Antes de hidratar, la vertical se limita con `100dvh`: dentro de un panel más bajo que la ventana
    puede quedar más alta que lo visible hasta que la parte cliente mide.
  - Contraída, la caja de la barra sigue ocupando su lugar (transparente y sin puntero); el FAB crecido
    con `scale` sobresale 12 de la caja del conjunto.
  - El foco de teclado que llega al FAB expande la barra: si la app la quería contraída (controlada),
    recibe el pedido y decide.
- Revisit if: `interpolate-size` llega a los tres motores (el ancho de la barra se podría animar en
  lugar de recortar); aparece la consulta de dirección (`scroll-state(scrolled)`) en los tres motores (el
  ocultar podría ser CSS); el scaffold de paneles (ítem 24) necesita la barra fuera del contenedor que se
  desplaza o una docked con FAB; o un lector de pantalla anuncia mal los toggles o las paradas
  `aria-disabled` de la barra (VoiceOver y NVDA, pendiente).
