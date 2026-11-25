# ADR-0009: Generador de paletas como paquete aparte, `@matekit/theme`, que trabaja al compilar con un solo color

- Status: accepted (2026-11-25)
- Drivers:
  - Los proyectos que usen matekit van a querer su propia paleta (por ejemplo, la de una
    marca). Esa paleta pertenece a cada proyecto, no a la librería: hace falta una forma de
    generarla fuera de este repositorio.
  - El generador necesita `@material/material-color-utilities`. Si viviera en
    `@matekit/react`, todos los que instalen los componentes la descargarían, la usen o no.
  - Cómo lo resuelven las alternativas (revisado el 2026-11-25 en su documentación y en sus
    dependencias de npm):
    - Angular Material 22.3.0: generador de línea de comandos
      (`ng generate @angular/material:theme-color`), con un `primaryColor` obligatorio y los
      demás opcionales, más `includeHighContrast`. `material-color-utilities` va empaquetada
      dentro del generador: el paquete solo depende de `tslib`.
    - `@material/web` 2.5.0: no genera; su documentación remite al plugin Material Theme
      Builder de Figma o a usar `material-color-utilities` por cuenta propia.
    - `m3-expressive-react` 1.8.2: un `ThemeProvider` calcula los roles en el navegador.
  - matekit ya genera al compilar (ADR-0008), sin costo para el usuario final y compatible con
    Server Components (ADR-0003).
- Decision:
  - **Paquete aparte, `@matekit/theme`**, con un comando
    (`npx @matekit/theme --seed "#c2185b" --name marca > marca.css`) y una función para usar
    desde un script propio. Escribe el mismo CSS que las paletas de matekit
    (`data-palette`, tres niveles de contraste, `light-dark()`, capa `matekit.palettes`).
  - **Un solo color obligatorio, la semilla.** Secundario, terciario, neutros y error los
    deriva el algoritmo, que asegura las diferencias entre roles y el contraste en los tres
    niveles. No se aceptan colores por grupo (a diferencia de Angular Material): elegirlos a
    mano puede romper el contraste. La variante es opcional (Tonal Spot por defecto).
  - **Solo al compilar.** Nada se calcula en el navegador.
  - **El esquema por defecto es la base del kit**, en `@matekit/react`: sin `data-palette`,
    o con `data-palette="baseline"`, se usan los valores del kit y los oficiales de contraste
    medio y alto (ADR-0008).
  - **Cuándo:** el paquete se crea al preparar la primera publicación (con workspaces de pnpm,
    ADR-0001). Hasta entonces el generador vive en `scripts/lib/` (`color-schemes.ts`,
    `palette-css.ts` y `css.ts`), sin depender de React, de los componentes ni de los
    archivos de `tokens/`, para que crear el paquete sea mudar esos archivos y agregar el
    comando.
- Tradeoff accepted:
  - Dos paquetes que publicar y versionar, y un repositorio con workspaces.
  - Con un solo color no se puede imponer un secundario o un terciario de marca; quien lo
    necesite tiene que escribir los roles a mano (son variables CSS).
  - Sin color elegido en tiempo de ejecución (por ejemplo, desde una preferencia del usuario).
- Revisit if:
  - Un proyecto necesita colores de marca en más de un grupo: evaluar colores opcionales por
    grupo con una verificación de contraste que rechace combinaciones que no cumplan.
  - Se necesita color en tiempo de ejecución: un módulo opcional dentro de `@matekit/theme`,
    nunca en `@matekit/react`.
