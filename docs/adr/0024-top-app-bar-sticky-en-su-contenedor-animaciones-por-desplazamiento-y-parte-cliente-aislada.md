# ADR-0024: Top app bar universal, `position: sticky` en el contenedor que se desplaza, color y colapso con animaciones atadas a `scroll(nearest)`, títulos cruzados con una copia oculta, y una parte cliente aislada para el alto real, el respaldo y `enter-always`

- Status: accepted (2026-11-26)
- Complementa: [ADR-0002](0002-api-por-composicion-con-capas-atomicas.md) (partes con nombres
  planos), [ADR-0003](0003-componentes-universales-e-interactivos.md) (qué es cliente),
  [ADR-0013](0013-indicadores-de-progreso-dibujados-con-css.md) (estados dibujados con CSS y
  `@property`), [ADR-0016](0016-escala-de-espaciado-y-cortes-de-ventana.md) y
  [ADR-0017](0017-stack-y-group.md) (el `render` de las piezas de disposición, que ahora también
  dibuja `<header>`).
- Drivers:
  - Ítem 19 del plan: small, medium y large con las "flexible" de Expressive (título de varias
    líneas, alto variable), título, subtítulo y acciones, y los tres comportamientos de Compose al
    desplazar (`pinnedScrollBehavior`, `enterAlwaysScrollBehavior`,
    `exitUntilCollapsedScrollBehavior`), con CSS donde alcance y un respaldo.
  - El futuro scaffold de paneles (ítem 24) tiene un contenedor que se desplaza por panel, cada uno
    con su barra: la barra no puede depender de la ventana.
  - Sonda del 2026-11-26 en los tres motores del CI (Chrome 158, Firefox 159 y WebKit 27.2 de
    Playwright): `animation-timeline: scroll()` y `view()`, `scroll-timeline` con nombre,
    `timeline-scope` y `animation-range` en px existen y dan los mismos valores (a 24 px de 48, la
    mitad). `position: sticky` con `top` negativo y un hijo `sticky` que hereda el fondo animado
    (`background-color: inherit`) también. `container-type: scroll-state` (`stuck`) solo en Chrome; la
    consulta de dirección (`scrolled`) en ninguno. El Firefox de Playwright es un Nightly: que Firefox
    estable tenga las animaciones por desplazamiento quedó sin verificar.
  - Compose (`AppBar.kt`, commit `ed93193ac9`): el medium y el large colapsan la segunda fila (el
    título se va bajo la primera, recortado) y cruzan dos títulos (`TopTitleAlphaEasing` para el
    chico, `1 - fracción` para el grande, la semántica cambia a la mitad); el color del medium y el
    large sigue la fracción colapsada; el small cambia de color cuando hay contenido debajo;
    `enter-always` sigue el desplazamiento y se acomoda al soltar.
  - `@material/web` no tiene top app bar estable; `labs/gb/components/appbar` (commit `9200eb8a0e`) es
    una directiva de clases con un `scroll` que pone `app-bar-scrolled`, sin colapso.
- Decision:
  - **API**: `TopAppBar` con `size` (`sm`, `md`, `lg`, como el FAB y labs), `centered` y
    `scrollBehavior` (`pinned`, `enter-always`, `exit-until-collapsed`, `none`; por defecto `pinned`
    en el small y `exit-until-collapsed` en el medium y el large, lo que muestra Material), y las
    partes `TopAppBarLeading` (el nombre del kit y de labs: puede ser navegación, avatar o logo),
    `TopAppBarTitle`, `TopAppBarSubtitle` y `TopAppBarActions` (como `CardActions` y
    `DialogActions`). Otro hijo directo ocupa el lugar del título (la search bar del ítem 21, sin un
    componente nuevo); una imagen dentro del título es el small con imagen (40 de alto). Las
    "flexible" no son un tamaño aparte: el medium y el large del kit ya son los flexible de Compose
    (los `MediumTopAppBar`/`LargeTopAppBar` anteriores, con otras alturas y títulos, no se hacen).
  - **Semántica**: `<header>` (por `render`, otro elemento): en el `<body>` es `banner`, dentro de
    `<main>` o de una sección es solo un encabezado, que es lo correcto para la barra de un panel.
    El título es un `<h1>` por defecto (la barra suele llevar el título de la página) con `level`,
    como `CardHeadline`; el subtítulo, un `<p>`. Las acciones no son un `toolbar`: un Tab por botón,
    como Compose y labs.
  - **Contenedor**: la barra va como primer hijo del elemento que se desplaza (la ventana o un
    elemento con `overflow`), sin prop ni `ref` que conectar: `position: sticky` y
    `scroll(nearest block)` usan el mismo, el más cercano. Una barra fuera del contenedor que se
    desplaza se ve plana y quieta (la línea de tiempo queda inactiva), sin romperse.
  - **Técnica**: la geometría es `position: sticky` (`top: 0` fija; `top: 64 - alto` en
    `exit-until-collapsed`, así el medium y el large se corren hasta dejar 64 y se expanden solo al
    volver arriba). La fila de iconos se queda arriba porque sus partes, el `::before` que hace de
    fondo de la banda y las copias del título son `sticky` dentro de la barra (abarcan todas las
    filas de la grilla para tener lugar donde quedarse). El color y el cruce de títulos son
    animaciones atadas a `scroll(nearest block)` dentro de `@supports`: el color en los primeros
    16 px (Compose cambia apenas hay contenido debajo, con un resorte en el tiempo; acá va atado al
    desplazamiento) o a lo largo del colapso con `FastOutLinearInEasing`; los títulos con las curvas
    de Compose. Los colores del fondo se registran como `<color>` para que la animación se
    recalcule al cambiar el tema.
  - **Parte cliente aislada**: `TopAppBar` es universal y dibuja como hija `TopAppBarScroll`
    (`'use client'`, un `<span hidden>`), que (1) mide el alto real con `ResizeObserver` (el CSS lo
    calcula con los tokens para una línea; los títulos de varias líneas y la letra más grande
    necesitan el medido para el `top` y el rango); (2) donde no hay `animation-timeline`, marca
    `data-scroll-driver="script"` y escribe el avance en `--_progress` y `--_tint`, que el CSS
    aplica a la misma animación detenida (`animation-delay` negativo, con otro nombre de
    `@keyframes` para que el motor cree una animación nueva); (3) hace `enter-always` en todos los
    motores, porque depende de la dirección: corrimiento con `translate` que sigue lo desplazado,
    la banda del medium y el large lo compensa (colapsa al small, no se esconde, como Compose), se
    acomoda al estado más cercano con `scrollend` (o 150 ms sin desplazar) y vuelve con el foco
    adentro. Sin JavaScript, la barra se ve bien arriba de todo (plana y expandida).
  - **Colapso**: dos títulos cruzados, como Compose, en vez de achicar uno: el título expandido es el
    encabezado de verdad, siempre en el árbol de accesibilidad; la copia de la barra colapsada
    (`TopAppBarTitle` y `TopAppBarSubtitle` la dibujan junto al original) lleva `aria-hidden` e
    `inert`, así el lector lee un solo título (y la búsqueda en la página puede saltearla: la
    especificación de `inert` lo permite; no se comprobó en cada motor). Achicar el
    texto con `scale` no sirve para las flexible (un título de tres líneas no se vuelve una línea
    con puntos suspensivos).
  - **Acciones que no entran**: queda documentado, no automático: hasta tres visibles y el resto
    en un `Menu` de más opciones (ejemplo en el playground). Medir y mover acciones a un menú
    necesitaría estado y duplicar los elementos.
  - **Movimiento reducido**: el colapso y el cruce van atados al desplazamiento (los mueve el
    usuario), así que quedan; el acomodo de `enter-always` salta en lugar de deslizarse.
  - **Alto contraste**: el navegador fuerza el fondo a `Canvas` y borra el cambio de color: la
    barra lleva un borde inferior `CanvasText` (siempre) y queda opaca sin la animación de color.
- Tradeoff accepted:
  - La barra tiene que ser hija del contenedor que se desplaza, sin otro `overflow` en el medio;
    una barra hermana del contenedor (como `Scaffold` de Compose) no cambia de color ni colapsa. Se
    podría conectar con `scroll-timeline` y `timeline-scope`, pero el colapso no (cambiaría el alto
    del contenedor que la empuja).
  - Antes de hidratar, un título de varias líneas colapsa con el alto de una línea (el `top` y el
    rango salen de los tokens): la barra colapsada muestra parte del título hasta que la parte
    cliente mide. Con una línea es exacto.
  - El texto del título está dos veces en el DOM (la copia oculta): los hijos del título no
    deberían llevar `id`.
  - En los motores sin `animation-timeline`, el color y el cruce se actualizan en el hilo principal
    (un cuadro después del desplazamiento); la geometría sigue siendo `sticky`. `enter-always` corre
    siempre en el hilo principal.
  - El cambio de color del small va atado a 16 px de desplazamiento, no a un tiempo: con la rueda
    del mouse (saltos de unos 100 px) cambia de golpe.
  - Lo que el kit llama Flat "sin relleno" es Surface opaca (Compose): con un fondo de página
    distinto, la barra se nota. La banda tiene que ser opaca para tapar al título que se colapsa.
- Revisit if: Firefox estable no tiene `animation-timeline` y hace falta que el respaldo también
  dé el resorte en el tiempo del small; aparece la consulta de dirección (`scroll-state(scrolled)`)
  en los tres motores (`enter-always` podría ser CSS); el scaffold de paneles (ítem 24) necesita
  la barra fuera del contenedor que se desplaza; o hace falta el menú de más acciones automático.
