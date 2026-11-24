# ADR-0002: API por composición, con capas inspiradas en Atomic Design y partes con nombres planos

- Status: accepted (2026-11-24)
- Drivers:
  - Uso previsto: base para proyectos personales del autor, donde importa que sea sencilla
    de usar y fácil de extender con componentes propios, no competir en catálogo.
  - Diferenciarse de `m3-expressive-react` (43 componentes, API al estilo MUI con `variant`,
    `startIcon`, `onChange(event, value)`), que ya cubre el enfoque de propiedades; ver
    [../research/06-alternativas.md](../research/06-alternativas.md).
  - El kit oficial de Figma ya modela los componentes nuevos con "slots" (Menu, Dialog,
    Navigation), así que la composición sigue la forma del propio sistema; ver
    [../research/04-componentes.md](../research/04-componentes.md).
- Decision:
  - **Composición:** los componentes con varias partes se arman con subcomponentes en vez de
    propiedades de contenido. Ejemplo: `TextField` con `TextFieldLeading`, `TextFieldLabel`,
    `TextFieldInput` y `TextFieldSupporting`. Los casos simples se escriben corto:
    `<Button><Icon name="add" />Crear</Button>`, sin `startIcon`.
  - **Capas de dependencia** (cada una usa solo las de abajo):
    1. Tokens: variables CSS de color, tipografía, esquinas, elevación y movimiento.
    2. Átomos: primitivas sin significado propio, exportadas para construir componentes
       propios (`StateLayer`, `FocusRing`, `Ripple`, `Icon`, `Elevation`).
    3. Moléculas: controles completos (Button, IconButton, Checkbox, Switch, TextField).
    4. Organismos: combinan controles (Dialog, Menu, NavigationBar, NavigationRail).
    Las plantillas y páginas de Atomic Design no forman parte de la librería.
  - **Nombres planos:** cada parte es una exportación con nombre propio (`DialogHeadline`),
    no una propiedad del componente padre (`Dialog.Headline`).
- Tradeoff accepted: escribir un componente complejo lleva más líneas que con propiedades, y
  los nombres de las partes son más largos. La clasificación en capas exige decidir dónde cae
  cada componente nuevo. Los átomos exportados pasan a ser API pública, así que cambiarlos
  rompe a quien los use.
- Revisit if: la composición resulta incómoda en el uso real de los proyectos personales
  (por ejemplo, si la mayoría de los usos repite siempre las mismas partes); entonces se
  agregan atajos con propiedades sobre la composición, sin quitarla. Si React deja de lanzar
  el error al acceder a propiedades de una referencia de cliente, o si la librería no se usa
  nunca con React Server Components, los nombres con punto vuelven a ser una opción
  aceptable.
- Evidencia del motivo de los nombres planos (verificado el 2026-11-24):
  - En el código de React (`packages/react-server-dom-webpack/src/ReactFlightWebpackReferences.js`
    y su equivalente para Turbopack, rama main), acceder a una propiedad de una exportación de
    un módulo `'use client'` desde un Server Component lanza
    `Cannot access Dialog.Headline on the server. You cannot dot into a client module from a
    server component. You can only pass the imported name through.` Lo cubre la prueba
    "throws when accessing a member below the client exports" en `ReactFlightDOM-test.js`.
  - Next.js trae ese mismo runtime (`packages/next/src/compiled/react-server-dom-webpack` y
    `react-server-dom-turbopack`); el mensaje está en
    `react-server-dom-turbopack-server.node.production.js` (Next.js v16.4.6).
  - No se reprodujo en una aplicación Next.js real.
  - Que los nombres planos eliminan mejor el código no usado es un razonamiento, no una
    medición: con nombres con punto, todas las partes cuelgan del componente padre y se
    incluyen al importarlo.
