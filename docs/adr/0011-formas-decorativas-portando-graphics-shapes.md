# ADR-0011: Formas decorativas e indicador de carga, portando `androidx.graphics.shapes` como herramienta de compilación

- Status: accepted (2026-11-25)
- Drivers:
  - Material 3 Expressive suma 35 formas decorativas (`03-tokens.md` § Formas decorativas; el
    kit las tiene en la página Shape, conjunto "Shape Set") para recortar avatares, imágenes y
    fondos de iconos, y un indicador de carga que pasa de una forma a otra mientras gira.
  - Compose (`MaterialShapes.kt`, `LoadingIndicator.kt`) las construye con
    `androidx.graphics.shapes` (licencia Apache 2.0): polígonos con esquinas redondeadas
    (`RoundedPolygon`) convertidos en curvas cúbicas, y `Morph`, que empareja los contornos de
    dos formas para interpolarlos. El indicador recorre 7 formas: SoftBurst, Cookie9Sided,
    Pentagon, Pill, Sunny, Cookie4Sided y Oval.
  - Soporte en navegadores (MDN browser-compat-data, consultado el 2026-11-25):
    `mask-image` sin prefijo en Chrome 120, Safari 15.4 y Firefox 53; la propiedad CSS `d`
    (animar un contorno desde CSS) **no existe en Safari**; la animación SVG nativa
    (`<animate>`) está en los tres desde hace años, y exige contornos con la misma cantidad y
    tipo de comandos.
  - Exportar los SVG del kit da formas exactas pero no sirve para animar: los contornos no son
    compatibles entre sí.
- Decision:
  - **Portar a TypeScript la parte necesaria de `androidx.graphics.shapes`** como herramienta
    de compilación, en `scripts/lib/shapes/`, sin dependencias, con el aviso de licencia de
    Apache 2.0 en cada archivo portado y la referencia al archivo y commit de origen. Se porta
    también `MaterialShapes.kt` (las 35 definiciones). Nada de esto llega al navegador: se
    generan datos.
  - **Entrega 1:** `RoundedPolygon`, `CornerRounding`, `Cubic`, las características
    (`Features`) y las utilidades que haga falta; las 35 formas como contornos SVG
    normalizados, generados con `pnpm shapes` y versionados; el átomo `Shape`, que recorta su
    contenido con `mask-image` (solo CSS, universal, se adapta al tamaño); y la página de
    formas en el playground.
  - **Entrega 2:** `Morph` y lo que necesita (`FeatureMapping`, `FloatMapping`,
    `PolygonMeasure`); el `LoadingIndicator`, con los pasos de transición entre las 7 formas
    precalculados al compilar y animados con `<animate>` (más el giro), y una versión sin
    animación con `prefers-reduced-motion`.
  - **Comprobación de la portación:** pruebas portadas de las de `androidx.graphics.shapes`
    donde se pueda, pruebas propias de los contornos generados, y una comparación visual de
    las 35 formas contra el "Shape Set" del kit.
- Tradeoff accepted:
  - Mantener una portación de varios miles de líneas: si Google cambia la geometría de una
    forma, hay que traer el cambio a mano (se registra el commit de origen para comparar).
  - Recortar con `mask-image` no recorta los eventos del puntero: el área interactiva sigue
    siendo el rectángulo del elemento.
  - `<animate>` no sigue `prefers-reduced-motion` por sí solo: hace falta CSS que muestre la
    versión estática.
- Revisit if: `shape()` y la animación de contornos desde CSS están en los tres navegadores y
  simplifican el indicador; o Google publica la geometría en un formato que se pueda importar
  sin portar código.
