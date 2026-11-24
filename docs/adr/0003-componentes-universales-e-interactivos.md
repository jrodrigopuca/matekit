# ADR-0003: Componentes universales sin `'use client'` e interactivos con `'use client'`

- Status: accepted (2026-11-24)
- Drivers:
  - El autor usa matekit en proyectos con Next.js (App Router, con React Server Components) y
    con React sobre Vite. La misma librería tiene que servir en ambos sin variantes.
  - El tema son variables CSS ([../research/03-tokens.md](../research/03-tokens.md)), así que
    los componentes no necesitan contexto de React para el color; y las capas de estado
    (hover, foco, presionado) se pueden resolver con pseudo-clases de CSS. Eso permite que
    buena parte de la librería no dependa de JavaScript de cliente.
  - Con la API por composición de [ADR-0002](0002-api-por-composicion-con-capas-atomicas.md),
    las partes sin interacción de un componente cliente pueden seguir siendo de servidor
    cuando se pasan como hijos.
- Decision: cada módulo de la librería cae en uno de dos grupos.
  - **Universal:** no usa estado, efectos, contexto de React ni manejadores de eventos, y no
    lleva `'use client'`. Corre en el servidor si lo importa un Server Component y en el
    cliente si lo importa un componente cliente. Ejemplos previstos: `Icon`, `Elevation`,
    `Divider`, `Badge`, `StateLayer` y `FocusRing` si se resuelven solo con CSS, y las partes
    de texto de los compuestos (`DialogHeadline`, `TextFieldSupporting`).
  - **Interactivo:** usa algo de lo anterior y lleva `'use client'` en la primera línea del
    archivo. Ejemplos previstos: `Button` (por `onClick` y `Ripple`), `Checkbox`, `Switch`,
    `TextField`, `Dialog`, `Menu`.
  - Un componente universal no importa uno interactivo de forma que lo vuelva cliente sin
    querer; si necesita interacción, se divide en una parte universal y otra interactiva.
- Tradeoff accepted: diseñar cada componente pensando en qué parte necesita JavaScript, y
  dividir algunos en dos archivos. La compilación de la librería debe conservar un archivo
  por módulo para que cada directiva `'use client'` quede al inicio del suyo; un único
  archivo empaquetado no sirve.
- Revisit if: el autor deja de usar React Server Components; entonces la regla de los
  universales pasa a ser solo buena práctica. Si el empaquetador elegido no puede conservar
  las directivas por módulo, revisar la forma de compilar antes de relajar la regla.
- Sin verificar al decidir: que empaquetar en un solo archivo pierde las directivas (Rollup
  avisa de algo así, según conocimiento previo). Comprobarlo al configurar la compilación.
  Verificable con una prueba automática que revise que los módulos universales no usan hooks
  y que los interactivos empiezan con `'use client'`.
