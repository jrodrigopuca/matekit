# ADR-0025: Sheets sobre `<dialog>` con una base modal común (`useModalDialog`), estados parcial y expandido, arrastre con eventos de puntero y desplazamiento anidado decidido al empezar el gesto

- Status: accepted (2026-11-26)
- Complementa: [ADR-0002](0002-api-por-composicion-con-capas-atomicas.md) (partes con nombres
  planos), [ADR-0003](0003-componentes-universales-e-interactivos.md) (qué es cliente),
  [ADR-0005](0005-estilos-css-con-prefijo-y-capas.md),
  [ADR-0016](0016-escala-de-espaciado-y-cortes-de-ventana.md) (espaciado con tokens) y
  [ADR-0022](0022-snackbar-cola-creada-por-la-app-host-y-region-viva.md) y
  [ADR-0024](0024-top-app-bar-sticky-en-su-contenedor-animaciones-por-desplazamiento-y-parte-cliente-aislada.md)
  (salidas con `settleAnimations`).
- Drivers:
  - Ítem 20 del plan: bottom sheet modal y side sheet sobre `<dialog>` como el Dialog; el arrastre
    para cerrar es el riesgo. Ítem 23: la variante modal del NavigationRail (`ModalWideNavigationRail`
    en Compose, `WideNavigationRail.kt`, commit `de12189a63`) podría compartir base con el side sheet.
  - Kit (`docs/research/05-medidas.md` § Sheets) y Compose: `SheetDefaults.kt` (commit `5fd64f71fb`),
    `BottomSheet.kt` (`02b1dbcaeb`), `ModalBottomSheet.kt` (`f22fad2ca7`), `AnchoredDraggable.kt`
    (`8f52852d7a`), `VelocityTracker.kt` (`641155416f`). Compose no tiene side sheets:
    `material-components-android` `sidesheet/` (`d18d3119a7`). Conflictos en
    `docs/research/07-jetpack-compose.md` § Sheets.
  - APG "Dialog (Modal)" para los modales; un sheet no modal es una región complementaria.
  - Sonda del 2026-11-26 en Chrome con toques reales (CDP `Input.dispatchTouchEvent`, contra el
    playground): cancelar el `touchmove` cuando el sheet se adueña del gesto frena el desplazamiento
    nativo sin `pointercancel`, y los eventos de puntero siguen llegando; con el contenido ya
    desplazado, el gesto desplaza y el sheet no se mueve.
- Decision:
  - **Base común**: el ciclo de vida modal del Dialog (`showModal()`, foco inicial con
    `data-autofocus` o el contenido largo, Escape y scrim que avisan con `onClose` en una capa
    controlada, Tab que da la vuelta, salida con `data-closing` y `settleAnimations`, foco devuelto)
    pasa a `src/internal/modal-dialog.ts` (`useModalDialog` y `useRegisteredId`), sin cambiar su
    conducta (las 36 pruebas del Dialog pasan igual; en el WebKit local fallan las mismas 3 de foco
    que antes, por el ajuste de Tab de macOS). Lo usan `Dialog`,
    `BottomSheet` y el `SideSheet` modal, y la variante modal del NavigationRail del ítem 23 lo va a
    usar igual: un `<dialog>` contra el borde de inicio con la misma entrada por `translate` que el
    side sheet (que entra por el final). Lo común entre side sheet y rail es el ciclo de vida, no el
    contenido (cabecera y acciones frente a destinos), así que no hay un componente "panel lateral"
    compartido: cada uno dibuja su `<dialog>` sobre el hook.
  - **API**: `BottomSheet` (modal, `<dialog>`) con `open`/`onClose`/`closeOnScrimClick` como el
    Dialog y `skipPartiallyExpanded`; partes `BottomSheetHandle`, `BottomSheetTitle` (`<h2>`,
    `aria-labelledby`) y `BottomSheetContent` (universal). `SideSheet` con `modal` (por defecto
    `true`: `<dialog>`; `false`: `<aside>`, región complementaria, `open={false}` lo oculta), unión
    de props discriminada por `modal` (la `ref` es del `<dialog>` o del `<aside>`); partes
    `SideSheetHeader`, `SideSheetBack`, `SideSheetTitle`, `SideSheetClose` (llama a `onClose`, salvo
    `preventDefault()`), `SideSheetContent` y `SideSheetActions`. Universales las que no necesitan
    contexto ni eventos propios.
  - **Estados del bottom sheet**: parcial y expandido (el oculto es `open={false}`), como
    `SheetState`, internos y expuestos en `data-state`. El parcial existe si no hay
    `skipPartiallyExpanded` y el sheet es más alto que la mitad de la ventana, y deja la mitad de la
    ventana a la vista: la regla anterior de Compose. La vigente
    (`isBottomSheetPartiallyExpandedDeterministicEnabled`, por defecto `true`) siempre crea el
    parcial con la mitad del sheet (como mucho, de la ventana), así que un sheet de 300 abriría
    mostrando 150; se descartó: un sheet corto a medias no ayuda en web, y el plan pide el parcial
    "si el contenido es alto". Abre en el parcial si existe, como `show()`.
  - **Asa**: un `<button>` (48 × 36, con la barra de 32 × 4) que hace lo que el toque del asa de
    Compose: parcial → expande ("Expandir"), expandido con parcial → contrae ("Contraer"), sin
    parcial → cierra ("Cerrar"). El nombre cambia con la acción (no `aria-expanded`: no muestra ni
    oculta otra cosa). Las acciones de accesibilidad de Compose (expandir, contraer, cerrar a la vez)
    no tienen equivalente en un botón web; cerrar también queda en Escape y el scrim.
  - **Arrastre**: eventos de puntero en el `<dialog>`, sin dependencias. El gesto es del sheet al
    pasar 8 px (touch slop de Compose) si es más vertical que horizontal; desde ahí la posición
    sigue al puntero (`--_drag`, sin transición), entre expandido y oculto, con captura del puntero.
    Al soltar decide `computeTarget` portado de `AnchoredDraggable.kt` con los umbrales de
    `BottomSheetDefaults` (56 px, 125 px/s) y una velocidad de los últimos 100 ms (0 si se quedó
    quieto 40 ms). Con mouse no arrastra desde el contenido ni desde campos (selecciona texto);
    táctil y lápiz, desde cualquier parte. Cerrar es pedirlo con `onClose`: si el padre cierra, la
    salida parte del punto donde se soltó; si no, vuelve a su estado. Con movimiento reducido el
    arrastre sigue al dedo y lo demás salta (los resortes spatial valen 0) o se funde.
  - **Desplazamiento anidado**: se decide al pasar el umbral, no a mitad del gesto. Dentro de
    `BottomSheetContent` (o de otro elemento desplazable del sheet), el sheet se queda con el gesto
    si está parcial (hacia arriba expande, hacia abajo baja), o si va hacia abajo y nada entre el
    dedo y el sheet está desplazado; si no, el gesto desplaza como siempre. Para frenar el
    desplazamiento nativo, un `touchmove` no pasivo (el `onTouchMove` de React es pasivo) lo cancela
    mientras el sheet arrastra. `touch-action: none` solo fuera del contenido.
  - **Medidas**: ancho máximo 640 centrado (`SheetMaxWidth`), sin margen; expandido hasta arriba de
    la ventana menos `env(safe-area-inset-top)`; zonas seguras abajo y a los costados en el relleno
    del bottom sheet, y arriba, abajo y el costado del borde en el del side sheet modal. Side sheet
    de 320 (kit; MDC dice 256), y el modal deja al menos 48 de scrim en ventanas angostas (a 320 mide
    272): se ve que está encima y queda un área táctil mínima para cerrar tocando afuera.
  - **Bottom sheet standard (no modal)**: fuera de este ítem. En Compose vive en `BottomSheetScaffold`
    (alto de asomo de 56, convive con el contenido y se arrastra entre asomado y expandido): es parte
    del scaffold de paneles (ítem 24), donde se decide cómo comparte la pantalla. El arrastre y
    `computeTarget` de este ítem se pueden reutilizar sin el `<dialog>`.
- Tradeoff accepted:
  - Un gesto táctil que empezó desplazando el contenido no pasa al sheet al llegar arriba (Compose sí:
    `onPostScroll` le da el resto al sheet): en web, una vez empezado el desplazamiento nativo, el
    `touchmove` ya no se puede cancelar. Hay que soltar y volver a deslizar desde arriba.
  - La rueda del mouse y el trackpad no mueven el sheet (Compose los trata como desplazamiento
    anidado): solo desplazan el contenido.
  - El lápiz en el contenido sigue la regla del dedo solo donde el navegador manda `touchmove` por el
    lápiz; si no, el lápiz desplaza el contenido y arrastra el sheet desde fuera del contenido.
  - Escape cierra desde cualquier estado (APG); el "atrás" de Compose desde expandido va primero al
    parcial.
  - El resorte de la entrada se pasa del destino: un `::after` del color del sheet tapa el hueco de
    abajo (Compose estira el sheet). El clic en ese relleno, solo visible durante el rebote, cuenta
    como scrim.
  - El estado parcial o expandido no es controlado desde afuera ni avisa cuando cambia (se lee en
    `data-state`); agregarlo después no rompe la API.
  - El contenido largo sin enfocables recibe el foco inicial (como en el Dialog) aunque el asa vaya
    antes; el asa queda a un Mayús+Tab.
- Revisit if: el scaffold de paneles (ítem 24) necesita el bottom sheet standard o el side sheet
  standard con animación al mostrarse; aparece una forma de pasarle el resto de un desplazamiento
  nativo al sheet a mitad del gesto; los usuarios piden controlar el estado (`state`/`onStateChange`);
  o la variante modal del NavigationRail (ítem 23) necesita algo del ciclo de vida que el hook no
  da (por ejemplo, arrastre horizontal para cerrar, que Compose tiene: se reutilizaría
  `computeTarget` en el eje horizontal).
- Actualización (2026-11-26): el estado del bottom sheet se puede controlar y el arrastre expone su
  avance, con el modelo de Vaul (elegido por el autor tras comparar `SheetState` de Compose,
  `BottomSheetBehavior` de MDC, el sheet modal de Ionic, Vaul y gorhom: todas avisan cuando el
  estado se asienta, dejan fijarlo desde afuera y casi todas exponen el avance).
  - **`state`/`defaultState`/`onStateChange(state, reason)`**, separados de `open`/`onClose` (que no
    cambian), con el patrón controlado o no de `RadioGroup` (ADR-0012). Sin `state`, como antes (y
    `defaultState` elige el de apertura, por defecto el parcial si existe). Con `state`, el arrastre,
    el asa y el foco solo piden: si el padre no actualiza `state`, el sheet vuelve al anterior (el
    veto de `confirmValueChange`, como ya pasaba con el cierre por arrastre y `onClose`).
  - **`reason`**: `drag` (al soltar, con el destino decidido), `handle`, `focus` (el foco en algo que
    el parcial deja fuera de la ventana expande, ya lo hacía) y `resize`. Una llamada por cambio
    asentado, nunca por cuadro; los cambios que hace el padre no se avisan.
  - **`partial` sin parcial** (sheet que no pasa la mitad de la ventana, o `skipPartiallyExpanded`):
    se muestra expandido y avisa `('expanded', 'resize')`, al abrir, al medir o cuando el padre lo
    pide. Si el parcial vuelve a existir y `state` sigue en `partial`, vuelve y avisa
    `('partial', 'resize')`. Sin controlar, el estado queda en expandido (como Compose).
  - **Avance**: `--mk-bottom-sheet-progress` en el `<dialog>`, lo visible de su alto (0 cerrado, 1
    expandido; el parcial, media ventana sobre el alto del sheet), escrito con `style.setProperty` al
    mover el puntero y cuadro a cuadro mientras corren las transiciones (entrada, acomodo, salida),
    sin volver a dibujar con React. Se eligió la fracción visible y no la posición entre estados
    porque sirve igual con y sin parcial, y porque con 1 − progreso × alto se recupera la
    posición. Una variable en el `<dialog>` no llega a la página de atrás (la herencia baja), pero sí
    al contenido y al `::backdrop`, que la hereda en los tres motores (sonda del 2026-11-26): alcanza
    para atenuar el scrim o revelar algo al expandir (ejemplo en el playground).
  - Corregido de paso: un arrastre táctil dejaba puesta la marca que descarta el clic siguiente y se
    comía la próxima activación del asa con el teclado; ahora solo la deja un arrastre con mouse,
    que siempre termina en un clic.
