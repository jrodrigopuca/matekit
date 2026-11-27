# ADR-0026: Search como combobox APG con `aria-activedescendant`, raíz `<search>` con estado por contexto, sugerencias como opciones con las partes de ListItem y vista docked o a pantalla completa elegida por la clase de ventana

- Status: accepted (2026-11-26)
- Actualización (2026-11-26, aprobada por el autor): el anillo de foco de la barra se ve solo con el
  foco de teclado. Un input de texto siempre es `:focus-visible` (también con un clic o un toque),
  así que la búsqueda lleva su propia señal: un `pointerdown` dentro de la raíz (mouse, táctil o
  lápiz, también en la barra de la vista y en las sugerencias) marca `data-pointer-focus` y el CSS
  oculta el anillo mientras esté. La marca se va cuando el foco vuelve a entrar desde afuera sin un
  gesto de puntero en curso (Tab, un atajo, un foco por script) o con una tecla de navegación
  (Flecha arriba y abajo, Escape, Enter, Tab, Re Pág, Av Pág), como hacen los navegadores con
  `:focus-visible` en un botón enfocado con el mouse cuando después se usa el teclado; escribir o
  mover el cursor no la quita (es editar, no navegar). Se borra al entrar y no al salir porque en
  WebKit un clic en un botón (borrar) no lo enfoca: el foco pasa por el `<body>` antes de volver al
  campo. Una sola marca en la raíz cubre la barra suelta, la de la vista a pantalla completa y la
  del TopAppBar. No hay otro estado de foco (el kit y Compose no tienen capa de foco en la barra);
  en alto contraste el anillo es un contorno en un color del sistema.
- Complementa: [ADR-0002](0002-api-por-composicion-con-capas-atomicas.md) (partes con nombres
  planos), [ADR-0003](0003-componentes-universales-e-interactivos.md) (qué es cliente),
  [ADR-0007](0007-menu-popover-y-anchor-positioning.md) y
  [ADR-0021](0021-tooltip-nombre-descripcion-y-rich-con-acciones.md) (capa anclada),
  [ADR-0016](0016-escala-de-espaciado-y-cortes-de-ventana.md) (cortes de ventana),
  [ADR-0018](0018-list-semantica-por-caso-y-partes.md) (partes de ListItem),
  [ADR-0024](0024-top-app-bar-sticky-en-su-contenedor-animaciones-por-desplazamiento-y-parte-cliente-aislada.md)
  (la search bar en el lugar del título) y
  [ADR-0025](0025-sheets-sobre-dialog-base-modal-comun-arrastre-con-puntero-y-desplazamiento-anidado.md)
  (`useModalDialog`).
- Drivers:
  - Ítem 21 del plan: search bar y search view (docked y a pantalla completa) con el patrón APG
    "Combobox" con listbox y autocompletado de lista; sugerencias provistas por el uso, sin filtrar
    adentro; carga, vacío y región viva; dentro del TopAppBar.
  - Kit (`docs/research/05-medidas.md` § Search) y Compose (`SearchBar.kt`, tokens de Search y
    AppBar, commit `76990c62ac`); conflictos en `docs/research/07-jetpack-compose.md` § Search.
  - Compose resuelve la vista a pantalla completa con un segundo campo dentro de un diálogo
    (`ExpandedFullScreenSearchBar` dibuja otra vez el `inputField`), y la docked con un popup anclado.
- Decision:
  - **Partes** (nombres planos): `Search` (raíz, un `<search>` con el estado por contexto: texto
    `value`/`defaultValue`/`onValueChange`, `onSubmit`, `onSelect`, `view`), `SearchBar` (la píldora
    con el `<input type="search">`; sus props nativas y `ref` van al input, `className`/`style` a la
    píldora; nombre obligatorio con `AccessibleNameProps`), `SearchBarLeading`/`SearchBarTrailing`
    (universales, como `TextFieldLeading`/`TextFieldTrailing`), `SearchView` (las sugerencias; props
    nativas y `ref` al `listbox`), `SearchSuggestion` y `SearchSuggestionGroup`. La raíz aparte (y no
    el estado dentro de `SearchBar`) deja la barra y la vista como hermanas en el DOM: la capa y el
    diálogo no quedan dentro de la píldora (su `:hover`, `:active` y los clics no se mezclan). Una
    barra suelta es `<Search><SearchBar label="Buscar" /></Search>`: sin `SearchView` el input es un
    campo de búsqueda común, sin rol de combobox.
    ```tsx
    <Search value={q} onValueChange={setQ} onSubmit={buscar} onSelect={abrir}>
      <SearchBar label="Buscar frutas" placeholder="Buscar frutas">
        <SearchBarLeading><SearchIcon /></SearchBarLeading>
      </SearchBar>
      <SearchView loading={cargando}>
        <SearchSuggestionGroup label="Recientes">
          {recientes.map((r) => <SearchSuggestion key={r} value={r} />)}
        </SearchSuggestionGroup>
        {resultados.map((f) => <SearchSuggestion key={f.id} value={f.id} textValue={f.nombre} />)}
      </SearchView>
    </Search>
    ```
  - **Modelo de datos**: el uso filtra o busca (local o remoto) con el texto controlado y pasa las
    sugerencias como hijos; la búsqueda no filtra ni guarda una lista. `SearchSuggestion` tiene
    `value` (lo que recibe `onSelect`) y `textValue` (lo que pasa a la barra al elegirla, por defecto
    `value`). Las opciones se recorren en el orden del DOM del listbox (así valen los grupos y los
    componentes propios del uso) y sus datos se registran en un `Map` por id; la cantidad se cuenta
    del DOM con un `MutationObserver`. `loading` muestra una barra de progreso y la lista abierta;
    con texto, sin opciones ni carga, "Sin resultados" (`emptyLabel`).
  - **Raíz `<search>`**: el elemento de región de búsqueda, sin `role` explícito (redundante). Sonda
    del 2026-11-26 con Playwright en Chrome, Firefox y WebKit: el árbol de accesibilidad lo expone
    como `search`. Los localizadores de Vitest (`getByRole`) no lo conocen: las pruebas miran la
    etiqueta.
  - **Combobox APG con `aria-activedescendant`**: el foco se queda en el input (el texto se sigue
    editando, el teclado del teléfono no se cierra); la activa es `aria-activedescendant` más
    `aria-selected` y un foco visual (capa al 10 %, anillo por dentro y radio 16, como el foco de una
    fila de List). Flechas con vuelta (cerrada: abajo abre en la primera, arriba en la última);
    Alt+Flecha abajo abre sin activar y Alt+Flecha arriba cierra; Izquierda, Derecha, Inicio y Fin y
    escribir sueltan la activa; Enter elige la activa (su texto a la barra, `onSelect`, cierra) o, sin
    activa, busca (`onSubmit`) y envía el `<form>` que la contenga con `requestSubmit` y el botón de
    envío por defecto (con dos campos de texto en el formulario, el de la barra y el de la vista, el
    navegador no haría el envío implícito); Escape cierra y, cerrada, borra el texto (se cancela el
    Escape nativo del campo de búsqueda, que Chrome usa para borrar y que dentro de un `<dialog>`
    impedía cerrarlo). Un clic en una sugerencia la elige sin sacarle el foco al input
    (se cancela el `mousedown` de la lista). Las deshabilitadas (`aria-disabled`) se saltean.
  - **Sugerencias**: `<li role="option">` dibujado con `ListItem` (sus partes `ListItemLeading`,
    `ListItemHeadline`, `ListItemSupporting`, `ListItemTrailing` son `<span>`, contenido de frase
    válido en una opción); sin hijos o con solo texto, el texto va en `ListItemHeadline`. No es un
    `ListItemAction` (botón): una opción no puede tener interactivos ni ser parada de Tab. Los
    grupos son `<ul role="group">` nombrado por un `<li role="presentation">` visible, dentro de un
    `<li role="none">` (axe: un `<li>` no admite `group`), el listbox agrupado de APG.
  - **Vista docked**: un `popover="manual"` (capa superior, sin recortes de `overflow`) anclado con
    CSS anchor positioning en `block-end center` y estirado (`justify-self: stretch`): del ancho de
    la barra sin escribir el ancho, a 2 de ella, con `flip-block`. Con `span-inline-end` y el ancho
    escrito, Firefox la corría unos 114 px en RTL; estirada, los tres motores coinciden (sin anchor
    positioning, `placeNextTo` escribe la posición y el ancho). Se abre al escribir, con un clic o
    con las flechas, y se cierra con Escape, al elegir, al buscar o cuando el foco sale de la raíz.
  - **Vista a pantalla completa**: un `<dialog>` modal con `useModalDialog` (foco atrapado, Escape,
    salida con `data-closing` y `settleAnimations`, foco devuelto a la barra), con su propia barra
    (volver, el campo y borrar) y la lista, como Compose (un segundo campo, sin `name`: el valor
    viaja en el de la barra). La barra de afuera es un `combobox` con `aria-haspopup="dialog"` que
    abre la vista con un clic, al escribir o con las flechas (Tab solo la enfoca: abrir una vista
    modal con Tab desorienta). Se descartó mover el campo de la barra al diálogo (desmontarlo y
    montarlo le saca el foco y en iOS el teclado se cierra) y usar un `<dialog>` cerrado como barra
    en el flujo (expone un `dialog` sin abrir). La región viva va dentro del diálogo (afuera
    quedaría inerte). La barra de la vista sale del lugar de la barra de afuera y se estira hasta el
    suyo (FLIP con la Web Animations API, `translate` y `inline-size`, resorte FastSpatial de la
    variante contenida de Compose); con movimiento reducido el resorte spatial vale 0 y no hay
    desplazamiento (queda el fundido de la vista).
  - **Cuál vista**: `view` `auto` (por defecto), `docked` o `full-screen`. `auto` elige por la clase
    de ventana con los cortes de ADR-0016: pantalla completa en compact (menos de 600 px,
    `WINDOW_WIDTH.medium`) y docked desde medium, la guía de Material para la search view. Es por
    la ventana y no por el contenedor porque la vista a pantalla completa ocupa la ventana. Compose
    no elige solo; la prop explícita sigue para quien quiera fijarla. En el servidor, docked; cambiar
    de clase con la vista abierta la cierra.
  - **Región viva**: un `role="status"` siempre montado anuncia "N sugerencias", "Sin resultados" o
    "Buscando…" medio segundo después del último cambio del mensaje (no en cada tecla; si la cantidad
    no cambia, no repite), y se vacía al cerrar.
  - **No se envuelve el TextField** (decidido con el autor el 2026-11-26): son controles distintos (el
    TextField es filled u outlined con etiqueta flotante, indicador y texto de apoyo; la search bar es
    una píldora de 56 sin etiqueta visible, con texto de ayuda e icon buttons adentro). Envolverlo
    obligaría a pisar casi todo su CSS y acoplaría el Search a sus cambios, y el input del combobox
    necesita sus propios atributos ARIA. Compose separa igual (`SearchBar` arma el campo sobre
    `BasicTextField`). Del TextField se reutiliza el patrón (partes de inicio y final ubicadas por
    clase en una grilla, ids generados) y el caret Primary; no había reglas propias que compartir
    (el TextField no trata la "x" nativa ni el autocompletado), así que no se sacó nada a
    `src/internal/` y el TextField no cambió.
  - **Cliente**: `Search.tsx` lleva `'use client'` (estado del combobox, efectos, contexto, eventos,
    `matchMedia`, `showModal`); `SearchBarLeading` y `SearchBarTrailing` son universales.
  - **Dentro del TopAppBar**: la raíz como hijo directo ocupa el lugar del título (ADR-0024); la
    píldora queda a 8 del inicio y las acciones, 4 arriba y abajo (la barra superior sigue en 64),
    centrada hasta 720, en Surface Container y Surface Container Highest al desplazar, con la misma
    animación atada a `scroll(nearest block)` y el mismo respaldo (`--_tint`) que el color de la
    barra superior. Sin cambios en el TopAppBar.
- Tradeoff accepted:
  - Dos campos a pantalla completa: los atributos nativos (`name`, `maxLength`, `onFocus`…) y la
    `ref` son del campo de la barra; el de la vista copia el nombre accesible y el texto de ayuda.
  - El envío del formulario lo hace la búsqueda con `requestSubmit`: con un botón de envío
    deshabilitado no envía (como el navegador), y el envío nativo con Enter queda cancelado.
  - Contar las opciones y recorrerlas por el DOM supone que son `role="option"` dentro del listbox;
    una opción propia del uso tiene que respetar eso.
  - No se aplica el ancho mínimo de 360 ni el alto mínimo de 240 de Compose, ni el scrim del docked
    (ver 07-jetpack-compose.md).
  - La apertura en iOS (teclado al pasar el foco al campo de la vista dentro del mismo gesto) no se
    comprobó en un dispositivo.
- Revisit if: hace falta abrir la vista docked al enfocar o controlar `open` desde afuera; los
  localizadores de las pruebas reconocen `<search>`; Safari en iOS no muestra el teclado al abrir la
  vista; o un proyecto necesita autocompletado en línea (`aria-autocomplete="both"`).
