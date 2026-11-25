# ADR-0014: Slider dibujado sobre un `<input type="range">` nativo e invisible, como componente cliente (excepción al ADR-0003)

- Status: accepted (2026-11-25)
- Drivers:
  - El plan (ítem 11) pide el Slider sobre `<input type="range">` mientras alcance (teclado,
    formularios y accesibilidad nativos) y señala el riesgo: que se vea igual en Chrome, Firefox y
    WebKit. Había dos vías: estilizar el `range` con `::-webkit-slider-thumb` y
    `::-moz-range-thumb`, o dibujar el control y dejar el input invisible encima, como el Switch.
  - El dibujo de Expressive no entra en los pseudo-elementos del `range`: la pista se corta a 6 del
    handle (a 10 con foco), con radio 2 en esos cortes y el radio del tamaño en los extremos; los
    puntos de parada desaparecen en ese corte; el handle se angosta de 4 a 2; el centrado y el de
    rango tienen tres tramos.
  - La pista activa depende del valor. Firefox la puede pintar con `::-moz-range-progress`; Chrome y
    WebKit no tienen equivalente, y CSS no puede leer el valor de un input. Hace falta JavaScript
    para que el CSS conozca el valor, sea cual sea la vía.
  - Sonda del 2026-11-25 en los tres motores del CI (Chrome del sistema, Firefox y WebKit de
    Playwright 1.65), con un `range` de 300 de largo, `appearance: none` y un thumb de 12:
    - El valor sigue la misma escala en los tres: el centro del thumb va de 6 a L − 6 (clic en 6 →
      0, en 78 → 25, en 294 → 100); en RTL se invierte; con `writing-mode: vertical-lr` y
      `direction: rtl` el mínimo queda abajo, en los tres.
    - El arrastre sigue al puntero y no pasa de los extremos; el input conserva el arrastre aunque
      el puntero salga de su zona recortada con `clip-path`, y `clip-path` recorta también la zona
      que recibe clics (dos inputs superpuestos, cada uno con su mitad).
    - Teclado: flechas de a un paso, Re Pág y Av Pág de a 10 % del recorrido (o un paso, si es
      mayor), Inicio y Fin, igual en los tres. Difieren las flechas izquierda y derecha: en RTL,
      Chrome y Firefox mueven el handle hacia la flecha y WebKit al revés; en vertical, Chrome y
      WebKit suben con la derecha (como la guía APG) y Firefox baja.
    - Un clic no enfoca el `range` en WebKit; en Chrome y Firefox sí. `:active` se mantiene durante
      el arrastre en los tres.
    - `CSS.supports('selector(::-moz-range-progress)')` es verdadero solo en Firefox.
- Decision:
  - **Control dibujado con el input nativo invisible encima.** El `<input type="range">` cubre todo
    el control con opacidad 0 y un thumb de 12 de largo, así el navegador ubica cada valor en el
    mismo punto que el handle dibujado (de 6 a L − 6, el recorrido del kit). Puntero, teclado,
    formularios, rol `slider` y valores son del navegador. La pista, el handle, los puntos y el
    indicador de valor son elementos propios: el dibujo es el mismo en los tres motores.
  - **`Slider`, `RangeSlider`, `RangeSliderStart` y `RangeSliderEnd` llevan `'use client'`**: el
    componente guarda el valor (o lo recibe, controlado) y lo pasa al CSS como fracción
    (`--_v1`, `--_v2`), con la que se calculan tramos, handles y marcas, y con él escribe el
    indicador de valor y `aria-valuetext`.
  - **Geometría en CSS con unidades lógicas**: la orientación vertical es el mismo CSS con
    `writing-mode: vertical-lr` y `direction: rtl`, y RTL sale solo; las posiciones de la pista se
    miden en `cqi` (la pista es un contenedor de consultas), y el ancho del handle y la separación
    son propiedades registradas (`@property`) para animar el angostamiento sin animar la posición.
  - **Rango**: dos inputs nativos superpuestos (patrón APG "Slider (Multi-Thumb)", cada uno con su
    nombre accesible y su `name`), recortados con `clip-path` en el punto medio entre los handles,
    como `@material/web`. El componente impide que se crucen (si un valor pasa al otro, vuelve a
    quedar igual) y, con los dos iguales, arrastrar hacia el lado del otro mueve al otro ("flip"
    de `@material/web`). API por composición (ADR-0002): `RangeSlider` reparte por contexto el valor
    a `RangeSliderStart` y `RangeSliderEnd`, como `RadioGroup` (ADR-0012).
  - **Ayudas de teclado y foco, las mínimas**: las flechas izquierda y derecha en vertical y en RTL
    se resuelven en el componente como en Chrome (vertical: derecha sube; RTL: el handle va hacia la
    flecha); el resto del teclado es nativo. Al soltar el puntero se enfoca el input, porque WebKit
    no lo hace con el clic (como `@material/web`).
  - **`aria-valuemin`/`aria-valuemax` no se reescriben en el rango**: cada input conserva `min` y
    `max` de todo el recorrido. La guía APG sugiere que el máximo del inicio sea el valor del fin;
    ARIA in HTML pide no usar `aria-valuemin`/`aria-valuemax` en elementos con `min`/`max`. Se
    sigue la especificación (ARIA in HTML); un valor que no puede avanzar simplemente no cambia.
- Tradeoff accepted:
  - Cuatro módulos más son cliente; un formulario de un Server Component que use un slider lo
    hidrata. Sin JavaScript el input nativo funciona igual (teclado, puntero, formulario) y el
    dibujo queda en el valor inicial.
  - El input invisible y el dibujo tienen que coincidir: el thumb de 12 del CSS es el que ubica los
    valores, y las pruebas lo comparan en los tres motores (clic, arrastre, vertical y RTL).
  - Las flechas izquierda y derecha en vertical y RTL ya no son las del navegador (se emiten
    `input` y `change` como las nativas). En WebKit con RTL y en Firefox en vertical eso cambia la
    conducta propia del motor.
  - Piso de navegadores: `:has()`, `:dir()`, consultas de contenedor con `cqi`, `@property`,
    `writing-mode` vertical en `range` (según la sonda, en los tres del CI; sin verificar versiones
    mínimas contra MDN al decidir).
  - En Firefox, las tres pruebas de arrastre pasan con su archivo solo o con
    `--no-file-parallelism` y fallan cuando corren otros archivos en paralelo (ni el primer
    movimiento llega, también en el Slider simple; el clic sí funciona). Sin causa encontrada; se
    saltean en Firefox con el motivo en la prueba, y el arrastre en Firefox queda cubierto por la
    sonda y por la corrida en serie (comprobado el 2026-11-25).
- Revisit if: Chrome y WebKit implementan una forma de pintar el progreso de un `range` con CSS
  (como `::-moz-range-progress`) o CSS puede leer el valor de un input (`attr()` tipado sobre la
  propiedad `value`, no el atributo): entonces un Slider simple podría volver a ser universal. Si
  los motores unifican las flechas en vertical y RTL, quitar la ayuda de teclado.
