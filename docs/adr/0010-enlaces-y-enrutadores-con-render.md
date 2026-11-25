# ADR-0010: Destinos de navegación como `<a>`, `<button>` o el elemento de `render`, sin depender del enrutador

- Status: accepted (2026-11-25)
- Drivers:
  - Los elementos de NavigationBar (y después de NavigationRail, que comparte el código) son
    destinos: con `href` tienen que ser un `<a>` real (abrir en otra pestaña, copiar el
    enlace, el menú contextual del navegador), y sin `href`, un `<button>` (navegación por
    estado en una aplicación de una sola página).
  - Los proyectos del autor usan el `Link` de Next.js (App Router) y el de React Router
    ([ADR-0003](0003-componentes-universales-e-interactivos.md)): navegan sin recargar,
    precargan y respetan `basePath`. matekit no puede depender de ninguno de los dos.
  - La barra tiene que poder escribirse en un Server Component y quedar universal: el
    elemento activo lo decide la aplicación (`active`), no el componente leyendo la URL.
  - Las props del enrutador (`prefetch`, `replace`, `scroll`, `state`, `viewTransition`…)
    cambian entre enrutadores y versiones; matekit no debería tener que tiparlas ni
    reexportarlas.
- Decision:
  - **Tres formas de elemento** en `NavigationBarItem`: con `href`, un `<a>`; sin `href`, un
    `<button type="button">`; con `render`, el elemento que se pase:
    `<NavigationBarItem active render={<Link href="/" />}>…partes…</NavigationBarItem>`.
  - **`render` recibe un elemento, no un componente.** El item lo clona con `cloneElement`
    agregándole su clase (conserva la propia, también si es una función, como en el `NavLink`
    de React Router), `aria-current="page"` si está activo, sus demás props nativas y su `ref`,
    y las partes como hijos. Las props del elemento ganan (incluida su `ref`); sus hijos se
    reemplazan. El elemento tiene que pasar `className`, `aria-current`, `ref` y los hijos al
    `<a>` que dibuja.
  - **Activo por `[aria-current]`**, no por una clase: el CSS lee el atributo. Así un
    `NavLink`, que pone `aria-current="page"` por su cuenta, queda activo sin `active`.
  - Opciones descartadas:
    - **Prop con el componente** (`as={Link} href="/"`): obliga a tipos polimórficos
      genéricos para aceptar las props de cualquier enlace (`prefetch`, `to`…), con errores de
      tipos difíciles de leer, o a perder esos tipos. Con un elemento, las props del enlace las
      tipa el propio enlace.
    - **Un único hijo, como `MenuTrigger`** (`<NavigationBarItem><Link href="/">…partes…</Link></NavigationBarItem>`):
      en `MenuTrigger` el hijo siempre es el disparador; acá el item ya tiene hijos (las
      partes), así que habría que distinguir "un enlace" de "las partes" mirando el tipo del
      hijo, o sumar un indicador booleano (`asChild`) que cambie el significado de `children`.
      Con `render`, las partes siguen siendo hijos del item en las tres formas.
- Tradeoff accepted:
  - `render` es una prop más para aprender y depende de que el enlace reparta sus props sobre
    el `<a>`. Un enlace que no pase `className` o `ref` pierde estilos o la referencia sin que
    matekit lo detecte.
  - Si el elemento de `render` y el item traen las dos una `ref`, solo llega la del elemento
    (no se combinan, para no usar hooks en un componente universal).
  - Los hijos del elemento de `render` se descartan en silencio.
- Revisit if: otro componente (Button con `href`, una lista de enlaces) necesita lo mismo;
  entonces se extrae la lógica de clonado a una función interna compartida antes de repetirla.
  Si React o los enrutadores dejan de aceptar `className`/`ref` como props del enlace, o si
  aparece un estándar de facto distinto (por ejemplo, que la comunidad converja en
  `asChild`), revisar la forma.
- Evidencia (verificado el 2026-11-25, leyendo el código, no de memoria):
  - **React 19.3.1** (instalado): `cloneElement` e `isValidElement` están en
    `cjs/react.react-server.production.js`, la versión que usan los Server Components
    (condición `react-server` de `package.json`). Por eso el item, universal, puede clonar el
    elemento en el servidor.
  - **Next.js v16.4.6** (`packages/next/src/client/app-dir/link.tsx`, tag `v16.4.6`): el
    módulo es `'use client'`, saca `href`, `prefetch`, `replace`, `scroll`, `onClick`, `ref`
    y otras de las props, y dibuja `<a {...restProps} {...childProps}>{children}</a>`
    (línea 787), con la `ref` combinada (`useMergedRef`). `className`, `aria-current`, `id`,
    `data-*` y los hijos llegan al `<a>`. Como el item no agrega funciones a las props del
    `Link`, todo lo que cruza de servidor a cliente es serializable (texto y elementos).
  - **React Router 8.5.3** (`packages/react-router/lib/dom/lib.tsx`, rama main): `Link` dibuja
    `<a {...rest} href=… ref={mergeRefs(forwardedRef, prefetchRef)}>`; `NavLink` calcula
    `aria-current` (por defecto `"page"` si está activo, después de `{...rest}`, así que gana
    al nuestro) y acepta `className` como función de su estado.
  - Cubierto en `NavigationBar.test.tsx` con un enlace propio que imita a los dos (recibe
    `prefetch`, `to`, la clase, `aria-current`, `id`, `data-*` y la `ref`) y con uno que imita a
    `NavLink`.
  - **Next.js 16.4.6, verificado el 2026-11-25** en una aplicación mínima (App Router, React
    19.3.1) con la barra en un Server Component y `render={<Link href="…" />}`:
    - `next build` sin errores; las dos rutas se prerenderizan como estáticas.
    - El HTML trae un `<a href>` real con las clases de matekit más la propia del `Link`,
      `aria-current="page"` en el activo, las partes adentro y el texto oculto de la insignia.
    - En Chrome, el clic y Tab + Enter navegan del lado del cliente (una sola carga de
      documento; el estado de `window` sobrevive), el activo cambia y no hay errores de
      hidratación en la consola.
  - React Router no se reprodujo en una aplicación real (solo con el enlace que lo imita).
