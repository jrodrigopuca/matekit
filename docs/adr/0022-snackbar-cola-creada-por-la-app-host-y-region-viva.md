# ADR-0022: Snackbar con una cola que crea la app, un host por cola con región viva permanente, F6 para llegar a la acción y duraciones de Compose que se detienen

- Status: accepted (2026-11-26)
- Complementa: [ADR-0003](0003-componentes-universales-e-interactivos.md) (qué parte es universal),
  [ADR-0007](0007-menu-popover-y-anchor-positioning.md) (capa superior con `popover="manual"`).
- Drivers:
  - El plan (ítem 17) marca como riesgo principal la API de la cola sin acoplarse a un estado
    global: nada de un singleton de módulo, que se compartiría entre árboles de React y entre pedidos
    en el servidor (Next.js con Server Components, ADR-0003).
  - Tiene que haber más de un host posible (uno por panel, uno dentro de un `Dialog` modal, cuyo
    resto de la página queda inerte) y mostrarse mensajes desde cualquier lado: un componente, un
    manejador, una mutación de datos fuera de React.
  - Compose (`SnackbarHost.kt`, commit `7ac433e44e`) resuelve la cola con `SnackbarHostState`:
    `showSnackbar` suspende hasta que el snackbar se va y devuelve `ActionPerformed` o `Dismissed`;
    uno a la vez, en orden (un `Mutex` justo). Duraciones `Short` 4 s, `Long` 10 s e `Indefinite`,
    por defecto `Indefinite` con acción; Android las alarga según un ajuste del sistema.
  - WCAG 2.2.1 (Tiempo ajustable): un snackbar con acción que desaparece solo puede no dar tiempo a
    llegar a la acción con teclado o lector de pantalla. 2.4.3 (Orden del foco): no robar el foco al
    aparecer y no perderlo al desaparecer. 4.1.3 (Mensajes de estado): el mensaje se anuncia sin
    recibir el foco.
  - Las regiones vivas que se crean junto con su contenido no se anuncian en todos los lectores:
    tienen que existir antes del cambio. material-components-web (`packages/mdc-snackbar/util.ts`,
    commit `a246a4439c`) vacía y repone el texto de la región por eso mismo (probado allí con JAWS,
    NVDA y ChromeVox).
- Decision:
  - **Cola como objeto de la app, sin estado de módulo.** `createSnackbarQueue()` (universal, sin
    React) devuelve `{ show, dismiss, clear, current, pending, subscribe }`. `show(options | texto)`
    encola y devuelve una promesa que se cumple cuando el snackbar se fue, con el motivo:
    `'action'`, `'dismiss'` (cerrar o Escape), `'timeout'` o `'cancel'` (`signal` abortado o
    `clear()`). Uno a la vez, en orden de llegada.
  - **Host que la dibuja y la reparte por contexto.** `<SnackbarHost>` (cliente) recibe `queue` o
    crea la suya, dibuja sus `children` (pueden ser de servidor) y le da la cola a `useSnackbar()`
    dentro de ellos; con hosts anidados gana el más cercano. Una cola, un host. Quien necesita la
    cola fuera del árbol del host la crea con `createSnackbarQueue()` (en `useState`, o por pedido) y
    se la pasa con `queue`.

    ```tsx
    // layout (puede ser un Server Component)
    <SnackbarHost><App /></SnackbarHost>

    // cualquier componente cliente de adentro
    const snackbar = useSnackbar()
    const onArchive = async () => {
      archive(photo)
      const result = await snackbar.show({ message: 'Foto archivada', action: 'Deshacer' })
      if (result === 'action') restore(photo)
    }
    ```
  - **Partes visuales universales.** `Snackbar`, `SnackbarMessage`, `SnackbarAction` (botón de
    texto) y `SnackbarClose` (IconButton con `close`, "Cerrar" por defecto) no tienen estado: el host
    las usa con sus manejadores, y sirven para dibujar uno fijo. La acción larga debajo del texto es
    la prop `actionOnNewLine` (como Compose), no una medida: quien escribe el texto sabe si la acción
    es larga, y medir cambiaría la disposición después de mostrarse.
  - **Región viva permanente.** El host dibuja siempre un `<div role="status" aria-live="polite"
    aria-atomic="true">` fuera de la vista y fuera del popover. Cuando un snackbar aparece, el texto
    (mensaje y, si hay, el texto de la acción, para saber que existe) llega un cuadro después; al
    irse, se vacía, así el mismo mensaje dos veces seguidas también se anuncia. Siempre `status`
    (cortés), nunca `alert`: Material define el snackbar como un aviso breve que no interrumpe; lo
    urgente va en un `Dialog` de alerta o en el contenido.
  - **Foco.** No se mueve al aparecer. **F6**, desde cualquier lugar de la página, lleva el foco a
    la acción (o al cerrar) y F6 otra vez lo devuelve (es la tecla de "ir a la siguiente región" de
    los navegadores y del Toast de React Spectrum); solo se atrapa mientras hay un snackbar con
    botones. El snackbar también queda en el orden de Tab donde está el host (en el DOM, aunque se vea
    en la capa superior): con el host envolviendo la app, después del contenido. Al irse con el foco
    adentro (acción, cerrar, Escape), el foco vuelve al elemento de donde vino. Escape con el foco
    adentro lo descarta (`'dismiss'`), sin cerrar un `Dialog` que contiene al host.
  - **Duraciones.** `short` 4000 ms, `long` 10000 ms, `indefinite` o milisegundos. Por defecto,
    `short` sin acción e `indefinite` con acción (Compose: "Snackbars with an action should not
    timeout"); el botón de cerrar aparece por defecto si la duración es indefinida. En web no hay un
    ajuste del sistema como el de Android: el tiempo se detiene mientras el puntero está encima, el
    foco adentro o la pestaña oculta, y al reanudarse sigue con lo que faltaba.
  - **Capa superior y posición.** El snackbar visible es un `popover="manual"` (el host lo abre y lo
    cierra después de la salida). Abajo a 12 de la ventana (Compose), centrado o al inicio
    (`align`), entre 344 y 600 de ancho; bajo 600 px, todo el ancho menos los márgenes.
    `--mk-snackbar-offset` lo sube por encima de una NavigationBar o un FAB.
  - Opciones descartadas:
    - **Singleton de módulo con `snackbar.show()` importable** (como muchas librerías de toasts): se
      comparte entre pedidos en el servidor y entre árboles de React, y no admite un host por panel.
    - **Solo contexto** (`useSnackbar()` sin poder crear la cola afuera): obliga a que todo el que
      muestra mensajes esté dentro del host y deja afuera el código que no es de React.
    - **Componente controlado `<Snackbar open message onClose>`**: dos caminos para mostrar lo mismo
      (dos snackbars superpuestos, sin la regla de uno a la vez), y el padre tendría que manejar el
      tiempo, la pausa y el anuncio. La cola con `signal` cubre el caso de "mostrar mientras dure
      algo".
    - **Región viva en el propio popover**: se crea (pasa de `display: none` a visible) junto con su
      contenido, lo que no todos los lectores anuncian.
    - **Mover el foco al snackbar al aparecer**: interrumpe lo que la persona estaba haciendo
      (2.4.3, y Material: no interrumpe).
    - **Que se vaya solo aunque tenga acción, con una duración mínima mayor**: cualquier número es
      arbitrario para quien usa un lector o un switch; indefinida con cerrar es lo que dicen Compose
      y WCAG 2.2.1.
    - **Tooltip "Cerrar" sobre el botón de cerrar** (Compose lo tiene): el botón ya tiene nombre, y el
      Escape del tooltip abierto con el foco de teclado se llevaría el primer Escape.
- Tradeoff accepted:
  - Mientras hay un snackbar con botones, F6 ya no lleva al navegador a la barra de direcciones (se
    devuelve con otro F6). Con varios hosts visibles a la vez, F6 lo atiende el primero que se montó.
  - Durante el snackbar, el texto está dos veces en el árbol de accesibilidad (la región oculta y el
    visible); quien recorre la página con el lector lo encuentra repetido hasta que se va.
  - El siguiente snackbar entra cuando el anterior terminó de salir (un solo popover por host), no
    superpuesto como en Compose.
  - Dos hosts visibles a la vez se superponen en la misma posición si no se ubican distinto (el host
    no se posiciona dentro de su panel; usa la ventana).
  - Un host fuera de un `Dialog` modal abierto queda inerte detrás de él (regla de `<dialog>`
    modal): para mensajes desde un diálogo, un host adentro (probado en `Snackbar.test.tsx`).
  - Sin ajuste de duración por usuario: una app que quiera ofrecerlo pasa `duration` en ms.
- Revisit if: hace falta un host que se ubique dentro de su panel (anchor positioning sobre un
  elemento del host); aparece un caso de mensajes urgentes en snackbar (evaluar `alert` como opción);
  un lector de pantalla probado a mano no anuncia el texto de la región (revisar el retraso de un
  cuadro); F6 molesta en un producto real (evaluar una tecla configurable).
