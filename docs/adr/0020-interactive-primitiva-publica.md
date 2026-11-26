# ADR-0020: `Interactive` como primitiva pública de elemento interactivo; el contrato de `render` pasa a ser API pública

- Status: accepted (2026-11-26)
- Complementa: [ADR-0010](0010-enlaces-y-enrutadores-con-render.md) (no lo reemplaza: las tres
  formas y las reglas de `render` siguen siendo las de ese ADR; acá cambia quién puede usarlas).
- Drivers:
  - `StateLayer`, `FocusRing` y `Ripple` ya son públicos (ADR-0003, `src/atoms/`), y la guía de
    composición de matekit dice que van como hijos directos del elemento interactivo. Quien arma
    un control propio (una etiqueta de tema, una tarjeta de producto, un destino de un menú lateral
    propio) tiene las capas pero no la pieza que elige ese elemento: hoy tendría que copiar la
    lógica de `src/internal/interactive.tsx` (el `<a>` o `<button type="button">`, el clonado de
    `render`, la combinación de clases con la `className` función del `NavLink`, el `type` por
    defecto que sobrevive a `type={undefined}`), con sus errores sutiles.
  - Siete componentes ya la usan (Button, IconButton, los FAB, los destinos de NavigationBar y
    NavigationRail, `CardPrimaryAction`, `ListItemAction` y los chips de una acción): la lógica está
    probada en los tres motores, con enrutadores imitados y con Next.js real (ADR-0010).
  - Tiene que seguir siendo universal (sin `'use client'`), para que un control propio se escriba
    en un Server Component, y la API pública tiene que ser chica: cada tipo exportado es un
    compromiso de compatibilidad.
- Decision:
  - **Un átomo universal `Interactive`** en `src/atoms/Interactive/`, exportado con su tipo
    `InteractiveProps`, y nada más. `InteractiveProps` es la unión de las tres formas de ADR-0010
    (con `href`, un `<a>`; sin `href`, un `<button type="button">`; con `render`, el elemento que
    se pase) más `className` y `children`.
  - **El contrato de `render` es API pública** y se documenta en el JSDoc de `Interactive`: recibe
    un elemento, no un componente (con otra cosa, error que lo explica); se clona con
    `cloneElement`; sus props ganan, incluida la `ref` (no se combinan); las clases se combinan,
    primero las de `Interactive`, y una `className` función se envuelve; sus hijos se reemplazan; el
    elemento tiene que pasar `className`, `aria-*`, `ref` y los hijos al `<a>`. Cambiar cualquiera
    de esas reglas pasa a ser un cambio incompatible.
  - **Una sola fuente de la lógica:** el átomo. `interactiveElement` desaparece; los siete
    componentes dibujan `<Interactive>` en JSX. En `src/internal/interactive.tsx` queda lo que no es
    público: `cx`, `assertRenderElement` (el error de `render` con el nombre de cada componente) y
    los tipos `ToggleButtonOrLinkProps` y `LinkModeExclusions`.
  - **El error nombra al componente que escribió quien lo usa.** Con JSX, `Interactive` no sabe
    quién lo dibuja; cada componente llama `assertRenderElement('Fab', rest.render)` antes (una
    línea), así `<Fab render={Link}>` sigue diciendo "Fab espera en `render` un elemento…" (lo
    comprueban `Fab.test.tsx` y `NavigationRail.test.tsx`). Un componente nuevo que la olvide
    recibe el mensaje de `Interactive`, que igual explica el problema.
  - **Queda afuera, a propósito:**
    - Estilos y átomos incluidos: `Interactive` no dibuja `StateLayer`, `Ripple` ni `FocusRing`.
      Cada control decide cuáles usa y dónde (los destinos de navegación ponen antes un indicador;
      un control puede querer el anillo y no la onda). Con los átomos adentro haría falta una prop
      para quitarlos o reordenarlos.
    - Estado activo (`aria-current`) y reglas de deshabilitado (rechazar `disabled` en un enlace,
      ARIA in HTML): cambian por componente. `ListItemAction` tiene `current`; el FAB no tiene
      `disabled`; Button y IconButton rechazan `selected` y `disabled` en un enlace con sus tipos.
    - El tipo `ToggleButtonOrLinkProps` (y `LinkModeExclusions`): sirve para un botón que también
      es toggle y enlace, con las reglas de Button e IconButton; exportarlo fija esas reglas como
      API y su forma (un genérico sobre las props propias) es incómoda de mantener compatible.
    - Los tipos de cada forma (`LinkElementProps`, `ButtonElementProps`, `RenderElementProps`) se
      exportan del módulo del átomo para los componentes de matekit, pero no desde `src/index.ts`.
  - **El CSS del control quita el contorno nativo** (`outline: none`): `FocusRing` dibuja el
    anillo; sin eso, el navegador suma el suyo y se ven dos (encontrado al armar el ejemplo del
    playground). Lo dice el JSDoc y lo comprueba `Interactive.test.tsx`.
  - Opciones descartadas:
    - **Otro nombre.** `Pressable` (React Native, React Aria) promete eventos de presión
      normalizados que `Interactive` no da: es solo la elección del elemento. `Clickable` sugiere
      un `onClick` en cualquier elemento, justo lo que evita (un `<div>` con clic no es accesible).
      `Slot` (Radix) es otro patrón: fusiona props en el único hijo (`asChild`), descartado en
      ADR-0010 porque acá los hijos son el contenido. `Interactive` describe lo que es: el elemento
      interactivo del control, el mismo nombre que la documentación ya usaba ("hijos directos del
      elemento interactivo").
    - **Exportar también `ToggleButtonOrLinkProps`**: ver arriba; si aparece la necesidad, se
      evalúa con un caso concreto.
    - **Dejar `interactiveElement` como función interna y que `Interactive` la envuelva**: con los
      siete componentes en JSX, la función quedaría con un solo uso y un parámetro (`name`) que solo
      sirve para el error; el chequeo con nombre se separó en `assertRenderElement` y la lógica
      queda en un solo lugar.
    - **Mantener los componentes llamando a la función** en lugar de JSX: menos líneas tocadas,
      pero dos formas de usar la misma pieza (una para matekit, otra para el público) y la pública
      menos ejercitada. Con JSX, los componentes son la primera prueba de que la API pública alcanza.
- Tradeoff accepted:
  - Todo lo que ADR-0010 aceptaba (un enlace que no reparta `className` o `ref` pierde estilos o la
    referencia sin aviso; las dos `ref` no se combinan; los hijos de `render` se descartan) ahora
    lo acepta también quien usa la librería, sin la revisión de matekit en el medio.
  - Una línea más por componente (`assertRenderElement`) para conservar el nombre en el error.
  - `Interactive` es un componente más en el árbol de React (Button → Interactive → `<button>` en
    las herramientas de desarrollo); no agrega elementos al DOM.
  - El chip pasa sus props con un `as InteractiveProps` comentado (ya tenía uno con la función):
    llegan como un registro sin forma desde `AssistChip`, `FilterChip` y `SuggestionChip`, que sí
    las tipan.
- Revisit if: si una necesidad real pide exportar `ToggleButtonOrLinkProps` (un control propio que
  sea toggle y enlace con las reglas de Button), si React o los enrutadores dejan de aceptar
  `className`/`ref` como props del enlace (la misma condición de ADR-0010), o si se necesita
  combinar las dos `ref` (exigiría un hook y sacar al átomo de universal, o `mergeRefs` memorizado
  por quien lo usa).
- Evidencia (verificado el 2026-11-26):
  - Los siete componentes migrados pasan las mismas 364 pruebas que antes en Chrome y Firefox; en
    WebKit local fallan las mismas 18 que en `HEAD` (todas de Tab y foco, el ajuste de macOS).
  - `Interactive.test.tsx` (29 pruebas): las tres formas con su `ref`, `type` por defecto (también
    `type={undefined}`, sin enviar el formulario), clases combinadas (también la función de un
    `NavLink` imitado), precedencia de las props y la `ref` del elemento de `render`, hijos
    reemplazados, el error, tipos con `@ts-expect-error` (`href` con `render`, `ref` de otra forma,
    `render` con un componente, `disabled` en un enlace) y un control propio con `StateLayer`,
    `Ripple` y `FocusRing` (hover, foco visible, presionado con onda, deshabilitado) en las tres
    formas.
  - Falsación: romper la combinación de clases con `render` hace fallar 17 pruebas (de
    `Interactive` y de los siete componentes); quitar el `type="button"` por defecto, 11 (ídem).
