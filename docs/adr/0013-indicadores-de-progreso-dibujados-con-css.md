# ADR-0013: Indicadores de progreso universales dibujados con CSS (consultas de contenedor, `@property` y guiones SVG)

- Status: accepted (2026-11-25)
- Drivers:
  - `LinearProgressIndicator` y `CircularProgressIndicator` (plan, ítem 10) deberían ser
    universales ([ADR-0003](0003-componentes-universales-e-interactivos.md)), como el
    `LoadingIndicator`.
  - El lineal ocupa el ancho de su contenedor, que no se conoce al renderizar, y la onda de
    Expressive tiene una longitud fija en dp (40 o 20): no se puede estirar un SVG con
    `viewBox`. Compose dibuja cada fotograma con el ancho medido.
  - Los extremos del indicador son redondos (`StrokeCap.Round`) también en la onda, y la onda se
    aplana y crece en 500 ms cerca de 0 % y 100 %.
  - Comprobado el 2026-11-25 en Chrome, Firefox y WebKit (los tres del CI): `stroke-dasharray` y
    `stroke-dashoffset` con `calc()` sobre `cqw` (unidades de consulta de contenedor),
    `pathLength`, propiedades registradas con `@property` animadas y transicionadas, y
    `vector-effect: non-scaling-stroke` (que en los tres mide los guiones en la pantalla)
    funcionan igual. La propiedad CSS `d` no existe en WebKit. Firefox descarta un `calc()` sin
    unidades en `stroke-dasharray` y no resuelve `var()` dentro de un `@keyframes` para una
    propiedad registrada; Chrome no resuelve `var()` en `animation-timing-function` dentro de
    un `@keyframes` (en los otros no se probó: se escribe el valor en los tres).
- Decision:
  - **Los dos son universales, sin JavaScript en el navegador**: SVG y CSS.
  - **Lineal:** el lienzo es un contenedor de consultas (`container-type: inline-size`) y todas
    las posiciones se calculan en CSS con `100cqw`, portando `updateDrawPaths` de Compose
    (`LinearWavyProgressModifiers.kt`). Cada tramo del indicador es un guion de un trazado
    precalculado de 4096 px, así los extremos son redondos de verdad. La amplitud se anima con
    `scaleY` y `vector-effect: non-scaling-stroke`, con el largo del guion corregido por el largo
    de la curva. Las fracciones de las líneas, la amplitud y el desplazamiento de la onda son
    propiedades registradas (`@property`) animadas con `@keyframes`.
  - **Circular:** tamaño fijo; pista e indicador son guiones con `pathLength`. Los contornos con
    onda se generan con la portación de `androidx.graphics.shapes`
    ([ADR-0011](0011-formas-decorativas-portando-graphics-shapes.md)) en `pnpm shapes`. El cambio
    de amplitud interpola la propiedad CSS `d` donde existe (Chrome y Firefox); en WebKit el
    contorno cambia sin transición (mejora progresiva).
  - Todo en px dentro de los `calc()`, y los valores que no pueden salir de una variable dentro de
    un `@keyframes` (easings y longitudes de onda) se escriben, con la excepción del lint
    explicada.
- Tradeoff accepted:
  - Piso de navegadores: consultas de contenedor, `@property` y funciones `sqrt()`/`log()` de
    CSS (Chrome 120, Firefox 128 y Safari 16.4 o posteriores, según conocimiento previo; sin
    verificar contra MDN al decidir).
  - El lineal con onda llega hasta 4096 px de ancho; más allá, el indicador se corta.
  - El CSS es más difícil de leer que un componente que mide y dibuja: cada fórmula cita la de
    Compose, y las pruebas comparan los tramos contra una portación en JavaScript de
    `updateDrawPaths`.
  - En WebKit, la onda del circular aparece o se aplana sin los 500 ms de transición.
  - El paso de indeterminado a determinado no se anima (Compose lo hace): necesitaría estado.
  - El lienzo del lineal crea contención de diseño; por eso el contenedor de consultas es un hijo
    absoluto y el elemento principal sigue siendo un bloque común.
- Revisit if: WebKit implementa la propiedad CSS `d` (la onda del circular se interpola sin
  más); aparece `shape()` animable en los tres (podría reemplazar los guiones); o hace falta la
  transición de indeterminado a determinado, que llevaría a una parte cliente.
