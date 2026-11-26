# ADR-0021: Tooltip que envuelve al disparador, nombre o descripción según `text`, rich con acciones como diálogo no modal, y posicionamiento compartido con el Menu

- Status: accepted (2026-11-26)
- Complementa: [ADR-0007](0007-menu-popover-y-anchor-positioning.md) (Popover, anchor
  positioning y su respaldo; acá se comparten con el Tooltip y se agrega una comprobación del
  centrado).
- Drivers:
  - El caso común es un `IconButton` con un texto breve encima. `IconButton` ya exige `label`
    (su nombre accesible, `aria-label`); casi siempre el tooltip dice lo mismo. Si el tooltip
    también se vincula como descripción, el lector de pantalla anuncia "Editar, botón, Editar".
  - WAI-ARIA APG (patrón "Tooltip"): el tooltip aparece con el foco o el puntero, se cierra con
    Escape, se vincula con `aria-describedby` y **no puede tener elementos interactivos**. El rich
    tooltip del kit trae acciones (botones de texto).
  - WCAG 2.2, 1.4.13 (contenido en hover o foco): descartable sin mover el puntero ni el foco
    (Escape), se puede pasar el puntero sobre él sin que desaparezca, persiste mientras haga falta.
  - El plan pide un solo tooltip visible a la vez, sin parpadeos al recorrer controles vecinos, y
    funcionar con los disparadores de matekit (IconButton, Button, chips) y con elementos propios
    (`Interactive`, ADR-0020) sin `<span>` envolventes.
  - El posicionamiento del Menu (`src/organisms/Menu/position.ts`) se comparte en vez de copiarse
    (decidido con el autor el 2026-11-26; también lo van a usar el FAB menu y Search).
- Decision:
  - **API.** `Tooltip` envuelve al disparador y lleva el texto como prop:
    `<Tooltip><IconButton label="Editar">…</IconButton></Tooltip>`. Es la forma más corta del caso
    común y no agrega elementos: clona el hijo (como `MenuTrigger`) y dibuja el popover a
    continuación, como hermano. Las props que recibe (y su `ref`) son para el disparador y se
    combinan con las del hijo (manejadores encadenados, estilo, `anchor-name` en lista,
    `aria-describedby`), así se anida dentro de un `MenuTrigger`. El rich, que tiene partes, sigue
    la composición del Menu: `RichTooltip`, `RichTooltipTrigger`, `RichTooltipContent`,
    `RichTooltipSubhead`, `RichTooltipSupporting` y `RichTooltipActions`. `open`, `defaultOpen` y
    `onOpenChange` en los dos.
  - **Nombre o descripción, según `text`:**
    - Sin `text`, el tooltip muestra el nombre del disparador, tomado de sus props (`label`,
      `aria-label` o el texto de primer nivel de sus hijos) y queda con `aria-hidden="true"`, sin
      vínculo: el nombre ya llega por el propio control y se anuncia una vez. Resuelve el IconButton
      y el texto recortado de un chip (ADR-0019, que ya expone el nombre completo).
    - Con `text`, el tooltip es la **descripción** del disparador (`aria-describedby`, sumada a la
      que tenga): información adicional al nombre, que se anuncia después de él.
    - El tooltip **nunca es el nombre** (`aria-labelledby`): el nombre queda en el control, donde lo
      exigen los tipos (IconButton) y donde sigue aunque el tooltip se quite o falle.
  - **Rich según su contenido.** Sin `RichTooltipActions` es un tooltip (`role="tooltip"`,
    descripción del disparador) con el mismo comportamiento que el plain. Con acciones es un
    **diálogo no modal** (`role="dialog"`, sin `aria-modal`, nombre por el subtítulo y descripción
    por el texto): el disparador lleva `aria-haspopup="dialog"`, `aria-expanded` y `aria-controls`,
    y lo abre y cierra un clic (Enter y Espacio en un botón). El foco no se mueve al abrir; Tab
    desde el disparador entra a la primera acción, Mayús+Tab desde ella vuelve, Tab desde la última
    sigue después del disparador (el diálogo se cierra), Escape cierra y devuelve el foco al
    disparador si estaba adentro, y un clic afuera o llevar el foco a otro lado lo cierran sin
    moverlo. Las partes se registran por contexto para elegir el patrón.
  - **Comportamiento del pasajero** (plain y rich sin acciones), con eventos nativos sobre la `ref`
    del disparador: puntero con 500 ms para aparecer y 600 ms para irse (material-components-web;
    Compose no tiene demora con el mouse), el siguiente al instante si ya hay uno visible; foco de
    teclado (`:focus-visible`) al instante y mientras dure; presionar lo oculta; Escape lo oculta
    (con `preventDefault`, así un Dialog que lo contiene no se cierra) sin mover el foco; táctil
    con pulsación larga de 500 ms, sin menú contextual ni clic al soltar, y 1500 ms después de
    soltar (Compose); un toque común no lo muestra. Un coordinador de módulo deja un pasajero
    visible a la vez; abrir un rich con acciones cierra el pasajero, pero un pasajero no cierra un
    rich con acciones abierto.
  - **Capa superior con `popover="manual"`**, como el Menu. Una sonda del 2026-11-26 mostró que
    `popover="hint"` existe en los tres motores de las pruebas (Chrome 158, Firefox 159, WebKit
    27.2), pero `hint` cierra solo con Escape y con un clic afuera: el estado quedaría en dos
    lugares (el componente, con sus demoras, y el navegador), y el control con `open` dejaría de
    mandar. Con `manual`, el estado, las demoras y el coordinador son una sola fuente.
  - **Posición:** `position-area: top` (arriba y centrado; `anchor-center` lo corre para quedar
    dentro de la ventana, igual en los tres motores según la sonda), `flip-block` si arriba no
    entra, 4 px de separación como margen del lado del ancla. Respaldo y DOM compartidos con el
    Menu en `src/internal/anchor-position.ts` (interno, no exportado): `fallbackPosition` acepta
    `side`, `align` y `gap` (sin opciones, la regla del menú, sin cambios), `placeNextTo` y
    `followAnchor`. `src/organisms/Menu/position.ts` queda como reexportación para
    `Menu.test.tsx`, que se mantuvo sin tocar.
  - **Comprobación del centrado:** Firefox 159 centra mal `anchor-center` cuando el ancla está en
    un contexto RTL (la capa queda corrida casi 300 px, fuera de la ventana; sonda con
    `position-area: top`, `block-start`, `top span-all`, `justify-self: anchor-center` y
    `direction: ltr` en la capa: falla con todas). Para una capa centrada, `placeNextTo` compara la
    posición del navegador (sin la escala de la entrada) con el cálculo y, si difieren, pone
    `data-manual-position` (el CSS quita `position-area`) y escribe la posición calculada. Mientras
    está abierto, el tooltip sigue al disparador con `scroll` y `resize` siempre.
  - Opciones descartadas:
    - **`TooltipTrigger` + `TooltipContent` también para el plain:** tres elementos para decir
      "este botón, este texto"; el texto plano no tiene partes. Queda para el rich.
    - **Tooltip como nombre (`aria-labelledby`):** reemplaza el `aria-label` del IconButton en
      silencio cuando los textos difieren, y el nombre pasa a depender de un popover oculto.
    - **Siempre descripción:** duplica el anuncio en el caso común (el nombre y el tooltip dicen lo
      mismo).
    - **Detectar en el DOM si el texto del tooltip repite el nombre:** el nombre accesible no se
      calcula de forma confiable a mano (`aria-labelledby`, contenido oculto); la regla por `text`
      es explícita y se ve en el código.
    - **Rich con acciones que se abre con el puntero o el foco** (como el persistente de Compose):
      abrir contenido interactivo al pasar el puntero o al recorrer con Tab mueve la pantalla sin
      pedirlo, y APG no admite interactivos en un tooltip. **Mover el foco al diálogo al abrir:**
      se descartó por el patrón no modal; quien quiere las acciones sigue con Tab.
    - **Portal al `body`:** perdería el tema y la paleta heredados del lugar donde se usa
      (`data-palette`, `data-theme`, ADR-0008); el popover queda en el DOM del disparador.
- Tradeoff accepted:
  - El popover del plain es un hermano del disparador: en un contenedor que mira `:last-child` o
    `:first-child` (por ejemplo `Group`, ADR-0017), el último hijo pasa a ser el tooltip.
  - Sin `text`, el nombre se toma de las props del hijo: un disparador con el nombre armado de otra
    forma (un `aria-labelledby`, hijos con elementos) necesita `text` o lanza un error que lo dice.
    Con `text`, quien lo usa decide que es una descripción y no repite el nombre.
  - El rich con acciones no se abre con el puntero, a diferencia de Compose.
  - Las demoras no son configurables (no hay prop): se cambian en `tooltip-behavior.ts`.
  - La comprobación del centrado mide en cada apertura; con la corrección activa (Firefox en RTL)
    la posición se recalcula en cada `scroll`.
  - El Escape de un tooltip visible no llega a otros manejadores (`stopPropagation`).
- Revisit if: Firefox corrige `anchor-center` en RTL (la prueba "en RTL también queda arriba y
  centrado" pasa sin `data-manual-position`): se puede quitar la comprobación. Si un caso real
  necesita el tooltip como nombre de un control sin nombre propio, evaluar `aria-labelledby` con un
  prop explícito. Si `Group` o Button groups (ítem 25) llevan tooltips, cambiar sus selectores
  de posición para que ignoren `[popover]` (`:nth-child(1 of :not([popover]))`). Si se exporta el
  posicionamiento como API pública (al preparar la publicación), revisar los nombres de
  `anchor-position.ts`.
