# ADR-0001: Publicar la librería como `@matekit/react` dentro de la organización `matekit` de npm

- Status: accepted (2026-11-24)
- Drivers:
  - El nombre `matekit` estaba libre en npm y la organización `matekit` ya existe y es del
    autor, así que el ámbito `@matekit/` no puede chocar con nadie.
  - "mate" remite a Material sin usar la marca de Google y da una identidad propia. Se
    descartaron `matero` (ng-matero, unas 1.500 estrellas en GitHub, mismo juego de
    palabras con Angular Material) y `mateui` / `mate-components` (npm los bloquea por
    parecerse a `mate-ui` y `matecomponents`).
  - Separar desde el inicio deja lugar a otras piezas (`@matekit/tokens`, `@matekit/icons`,
    otra librería de interfaz) sin renombrar lo ya publicado.
- Decision: el paquete de componentes se publica como `@matekit/react`. La carpeta del
  proyecto es `matekit/`. El nombre sin ámbito `matekit` no se usa por ahora.
- Tradeoff accepted: quien instale escribe `@matekit/react` en vez de `matekit`, y el
  proyecto se encamina a tener varios paquetes, lo que a la larga pide herramientas de
  monorepo para versionar y publicar en conjunto. Mientras exista un solo paquete, ese
  costo no aparece. Los tokens viajan dentro de `@matekit/react` (por ejemplo como
  `@matekit/react/tokens.css`) hasta que haga falta separarlos.
- Revisit if: los tokens o los iconos necesitan usarse sin React, o versionarse aparte de
  los componentes; entonces se extraen a `@matekit/tokens` o `@matekit/icons` con una ADR
  nueva. Si el nombre sin ámbito `matekit` lo publica otra persona y genera confusión,
  evaluar reservarlo como paquete que reexporte `@matekit/react`.

Estado verificado al decidir: `@matekit/react` no existía en el registro de npm (404).
