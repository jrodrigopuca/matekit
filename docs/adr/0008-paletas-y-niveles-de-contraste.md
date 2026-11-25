# ADR-0008: Paletas opcionales y niveles de contraste generados al compilar, con `light-dark()`

- Status: accepted (2026-11-24)
- Drivers:
  - Hasta ahora había un solo conjunto de colores: el esquema base del kit (violeta
    `#6750a4`) en claro y oscuro. Material 3 genera esquemas completos desde un color semilla,
    con variantes (Tonal Spot, Vibrant, …) y tres niveles de contraste (estándar, medio y
    alto), con `material-color-utilities`, la librería oficial de Google.
  - Los componentes solo leen los 49 roles `--md-sys-color-*` (lo controla `pnpm lint:css`):
    otro conjunto de colores es otro juego de valores para esos roles, sin tocar componentes.
  - El paquete no debería sumar código ni dependencias en el cliente para algo que se puede
    resolver al compilar, y tiene que servir desde un Server Component (ADR-0003).
  - `data-theme` ya funcionaba en cualquier elemento. La paleta y el contraste tienen que poder
    hacer lo mismo y combinarse anidados (por ejemplo, una sección en otra paleta dentro de una
    página en tema oscuro y contraste alto).
- Decision:
  - **Generación al compilar** (solo para las paletas opcionales). `pnpm tokens` calcula los esquemas con
    `@material/material-color-utilities` 0.4.0 (dependencia de desarrollo; especificación 2021,
    ADR-0004) y los escribe como CSS versionado. Configuración en `tokens/palettes.json`;
    cálculo en `scripts/lib/color-schemes.ts`.
  - **Niveles de contraste:** `contrastLevel` 0 (estándar), 0,5 (medio) y 1 (alto). Se eligen
    con `data-contrast="standard|medium|high"` en cualquier elemento, y
    `prefers-contrast: more` elige el alto donde nadie fijó `data-contrast`.
  - **Esquema base:** no se genera. El nivel estándar es el del kit y el medio y el alto son
    los valores oficiales de m3.material.io (Styles > Color > Static > Baseline), todos en
    `tokens/color.json`. El estándar oficial coincide con el kit en los 49 roles. (Decidido el
    2026-11-25; hasta entonces el medio y el alto se generaban desde las paletas fijas del
    kit, y diferían de los oficiales en 12 a 25 roles. Ver
    [../research/09-colores-estaticos.md](../research/09-colores-estaticos.md).)
  - **Paletas opcionales:** `green` (semilla `#4c7a34`), `blue` (`#1b6ef3`) y `orange`
    (`#e8710a`), las tres Tonal Spot. Se eligieron por tono, lejos del violeta y entre sí
    (138°, 269° y 50° en HCT, frente a 299° del base). Cada una es un archivo
    (`src/tokens/palettes/<nombre>.css`, más `index.css` con todas) que se importa aparte y se
    activa con `data-palette="<nombre>"`; `data-palette="baseline"` vuelve al base.
  - **Tema con `light-dark()`.** Cada rol se escribe una sola vez,
    `light-dark(claro, oscuro)`. El navegador elige según el `color-scheme` del elemento donde
    se usa la variable, que se hereda: `:root` tiene `light dark` (sigue al sistema) y
    `data-theme` lo fija. Así un `data-theme` anidado funciona aunque los roles vengan de un
    ancestro, y el CSS de colores mide la mitad. Soporte (MDN browser-compat-data, consultado el
    2026-11-24): `light-dark()` desde Chrome 123, Safari 17.5 y Firefox 120;
    `prefers-contrast` desde Chrome 96, Safari 14.1 y Firefox 101.
  - **Capa `matekit.palettes`**, entre `matekit.tokens` y `matekit.atoms`. Cada archivo de
    paleta declara el orden de capas completo, así que le gana al esquema base sin importar el
    orden en que se importe.
  - **Selectores** (generados por `schemeRules` en `scripts/build-tokens.ts`): el nivel estándar
    es el selector de la paleta; cada nivel agrega la paleta con `data-contrast` en el mismo
    elemento (especificidad 0,2,0), en un ancestro (`:where(...)`, 0,1,0, gana por orden al
    estándar) o en un descendiente (0,2,0; vuelve a declarar los roles con la paleta de arriba).
  - **Regla para los componentes:** usar solo pares de roles con contraste garantizado por el
    generador: `on-X` sobre `X`, y el contenido (`on-surface`, `on-surface-variant`, `primary`,
    `outline`) sobre las superficies. Primer caso: el Menu Vibrant dejaba los iconos en
    `tertiary` sobre `tertiary-container` con el puntero o el foco (como Compose), que baja a
    2,3:1 y 1,5:1 en los niveles medio y alto. Quedan en `on-tertiary-container`.
  - **Pruebas:** `tests/palettes.test.ts` (estructura y contraste WCAG de los roles en todas
    las combinaciones), `src/test/palettes.test.tsx` (cómo resuelve el navegador los atributos
    anidados y `prefers-contrast`) y `src/test/contrast.test.tsx`, que mide los componentes en
    las 24 combinaciones de paleta, nivel y tema.
- Tradeoff accepted:
  - Sin color dinámico en el cliente: una paleta nueva (un color elegido por el usuario o
    tomado de una imagen) exige agregarla a `tokens/palettes.json` y regenerar.
  - Cada paleta suma unas 275 líneas de CSS en los tres niveles; por eso son opcionales y van
    fuera de `styles.css`.
  - Límites de los selectores: dos `data-contrast` distintos encima de una misma paleta se
    resuelven por orden (alto, después medio, después estándar), no por cercanía; y una paleta
    anidada dentro de otra, con un `data-contrast` adentro, depende del orden de los archivos.
    Lo esperable es poner `data-palette` y `data-contrast` en el mismo elemento o en
    `<html>`.
  - Con Tonal Spot, una semilla muy saturada sale más apagada (el naranja queda tirando a
    marrón); la variante se puede cambiar por paleta en `tokens/palettes.json`.
  - El Menu Vibrant pierde el matiz de color de los iconos con el puntero o el foco.
- Revisit if:
  - (Paletas propias de cada proyecto: ver ADR-0009, `@matekit/theme`.)
  - Un proyecto necesita color elegido en tiempo de ejecución: agregar un módulo opcional que
    calcule los roles en el cliente (con `material-color-utilities` como dependencia de ese
    módulo, no del paquete principal).
  - CSS ofrece una forma de elegir por cercanía (por ejemplo, proximidad de `@scope` con
    soporte en los tres navegadores): reemplazar los selectores de contraste.
  - Se pasa el color dinámico a la especificación 2025 (ver ADR-0004).
