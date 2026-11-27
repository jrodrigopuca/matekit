# ADR-0028: Diagnósticos con un formato único, códigos estables por causa, `MatekitError` público, catálogo y salidas en inglés

- Status: accepted (2026-11-27)
- Complementa: [ADR-0003](0003-componentes-universales-e-interactivos.md) (los componentes universales
  lanzan sus errores también en el servidor), [ADR-0027](0027-toolbar-apg-con-foco-itinerante-colores-por-variables-fab-en-toolbarlayout-y-ocultar-con-el-inset-del-sticky.md)
  (el aviso de `ToolbarLayout` y `src/internal/dev.ts`).
- Drivers:
  - Ítem "Diagnósticos" del plan (Tanda C, antes de NavigationSuite; decidido con el autor el
    2026-11-27). Había 18 `throw new Error` y dos avisos por consola, cada uno con su redacción; el
    de las Tabs (`console.error`) salía también en producción y en cada render.
  - Que sirvan a tres lectores: quien escribe la app (qué pasó y cómo se arregla), quien depura (datos
    sin interpretar texto) y un agente LLM (un código que puede buscar en un catálogo).
  - Los componentes universales se ejecutan en Server Components: el módulo no puede llevar
    `'use client'` ni depender de `window`.
  - `isDevelopment()` (`src/internal/dev.ts`) ya sigue el patrón de React: la expresión literal
    `process.env.NODE_ENV`, que el bundler reemplaza y en producción deja como código muerto.
- Decision:
  - **Módulo** `src/internal/diagnostics.ts`, universal: `mkError(code, message, details?)` y
    `mkWarn(code, message, details?, { once }?)`, con `message = { component, problem, fix }`. Los tres
    textos van separados (y no un solo texto) para que el formato sea igual en todos y el `fix` no
    se pueda olvidar: el tipo lo exige. Helpers para los errores que comparten varios componentes
    (`partOutsideParent`, `renderNotElement`, `triggerNotElement`), así el texto se escribe una vez.
  - **Formato:** `[matekit] <Component>: <what happened>. Fix: <how to fix it>. (<CODE>)`, y un objeto
    `{ component, code, docs, ...details }`: segundo argumento de `console.warn`, o `error.details`.
    `docs` es el enlace a la entrada del catálogo en GitHub (`…/docs/diagnostics.md#mk_…`), y la
    entrada enlaza el ADR o el JSDoc. Las claves `component`, `code` y `docs` quedan reservadas por
    tipo en los detalles.
  - **Salidas en inglés** (cambio de criterio del autor durante este ítem): los mensajes, las claves
    del objeto y el catálogo `docs/diagnostics.md` en inglés; comentarios, ADR, plan y documentación
    interna siguen en español. Por qué: el mensaje es salida para quien usa la librería, que no
    necesariamente lee español; el inglés es lo que se busca en un buscador o un issue y lo que un
    agente cruza con el resto de su contexto (el código, React, la plataforma); y el catálogo es
    parte de esa salida, porque cada mensaje apunta a su entrada: quien recibe un mensaje en inglés
    no debería caer en un catálogo en español. Los textos visibles por defecto de los componentes
    (por ejemplo "Supr para quitar") quedan fuera de esta decisión, pendientes de consultar.
  - **Códigos por causa, no por componente:** `MK_` y mayúsculas; el componente va en el código solo
    si la causa existe en uno (`MK_TOOLTIP_NO_TEXT`, `MK_TOOLBAR_EXPAND_IGNORED`), y si no, en
    `component` y en el texto (`MK_PART_OUTSIDE_PARENT` cubre las 25 partes de 9 componentes). Para un
    agente, la entrada del catálogo es la unidad: con códigos por componente habría 9 entradas
    idénticas para `…_OUTSIDE_PARENT`, y cada componente nuevo necesitaría un código nuevo para el
    mismo error (el catálogo se desincroniza justo ahí). Un código publicado no se renombra. Los
    códigos están declarados en dos listas (`MATEKIT_ERROR_CODES`, `MATEKIT_WARNING_CODES`) de las que
    salen los tipos: `mkError` no acepta un código de aviso ni al revés.
  - **`mkError` devuelve, no lanza:** se usa `throw mkError(…)`. El `throw` queda a la vista en el
    componente (quien lee sabe que ahí se corta), TypeScript corta el flujo sin depender de una
    función `never` declarada con tipo explícito (la regla de las funciones de aserción), y el error
    también sirve donde no se lanza (`Promise.reject`, un callback de error). El error siempre se
    crea, también en producción: el uso no funciona en ningún modo.
  - **`MatekitError extends Error`** con `name = 'MatekitError'`, `code` y `details`. **Público**
    (`src/index.ts`) junto con los tipos `MatekitErrorCode` y `MatekitWarningCode`, para que la app
    distinga los errores de matekit en un error boundary o en su reporte (`instanceof`, o
    `error.name`/`error.code` cuando hay dos copias del paquete y `instanceof` falla). `mkError`,
    `mkWarn` y los helpers siguen internos: la app no debería escribir diagnósticos de matekit.
  - **Avisos solo en desarrollo** (`isDevelopment()`) y **una vez**: con `once` (un objeto, por
    ejemplo de `useRef` por instancia) en un `WeakSet`, que se libera con la instancia; sin `once`,
    por el texto del aviso en un `Set`, como React, que sirve a los componentes universales (no
    tienen dónde guardar una instancia; `TabLink` es uno). Para que ese `Set` quede acotado, el
    texto no lleva valores variables: van en los detalles. En producción, `mkWarn` no escribe ni
    marca nada.
  - **Error interno:** `computeTarget` sin anclas no es un mal uso sino una falla de matekit (el
    BottomSheet siempre arma el ancla `hidden`). Es un `MatekitError` con `MK_INTERNAL_INVARIANT` y un
    `fix` que dice que se reporte: todo lo que lanza matekit tiene la misma forma (la app lo reconoce
    y agrupa por código igual), y el código le dice a quien lo lee, persona o agente, que no hay nada
    que arreglar en su código. Cuesta una entrada en el catálogo.
  - **Disparadores sin `Children.only`:** `Tooltip`, `RichTooltipTrigger` y `MenuTrigger` llamaban a
    `Children.only`, que lanza el error genérico de React antes del de matekit (el chequeo de matekit
    no se alcanzaba). Ahora miran `isValidElement` sobre los hijos y lanzan
    `MK_TRIGGER_NOT_ELEMENT`: lanzan en los mismos casos (varios hijos, un texto, nada), con un
    mensaje con arreglo.
  - **Catálogo** `docs/diagnostics.md`: una entrada `## MK_…` por código con tipo, componentes,
    causa, arreglo, un ejemplo mínimo que lo provoca y cómo se arregla, y lo relacionado.
    `tests/diagnostics.test.ts` (Node) comprueba que cada código usado en `src/` esté declarado y
    documentado, que cada entrada corresponda a un código declarado y usado fuera de las pruebas, y
    que cada entrada tenga sus campos. Corre en Node porque ahí `process.env.NODE_ENV` se lee en cada
    llamada y se puede simular producción; en las pruebas de Vitest, Vite reemplaza la expresión por
    `"test"` al compilar.
  - **Sin `setLogger`** (redirigir o silenciar los mensajes) por ahora: nadie lo pidió, los avisos ya
    desaparecen en producción, una prueba los silencia con `vi.spyOn(console, 'warn')`, y un
    registro global configurable es estado de módulo compartido entre peticiones en el servidor (lo
    que el ADR-0022 evitó para la cola del Snackbar).
- Tradeoff accepted:
  - Un mensaje no lleva la pila de componentes de React (la consola del navegador muestra la pila de
    JavaScript; React agrega la de componentes a los errores de render). Un aviso deduplicado por
    texto sale una vez por componente aunque haya varias instancias mal usadas; la primera alcanza
    para encontrar el uso y el resto aparece al corregirla.
  - En producción, Next.js reemplaza el mensaje de un error lanzado en un Server Component por un
    resumen (`digest`), y `code` no cruza al cliente: el diagnóstico completo se ve en el registro del
    servidor o en desarrollo.
  - `docs` apunta a la rama `main` del repositorio en GitHub: si el repositorio no es público cuando
    se publique el paquete, el enlace no abre para quien lo usa.
  - `mkWarn` recibe `once` como cuarto argumento: sin detalles, obliga a pasar `undefined` en el
    tercero (no pasa en ningún uso actual).
- Revisit if: un proyecto pide redirigir o silenciar los avisos (evaluar `setLogger`, cuidando el
  estado compartido en el servidor); el paquete se publica con un sitio de documentación o el
  repositorio sigue privado (cambiar `CATALOG_URL` o incluir el catálogo en el paquete); un aviso
  necesita salir más de una vez (por ejemplo por valor) o los avisos por texto crecen sin cota;
  aparece un error que la app debería poder recuperar (evaluar una jerarquía de errores o un campo
  `recoverable`); se decide traducir los textos visibles de los componentes (revisar si los
  diagnósticos siguen el mismo criterio).
