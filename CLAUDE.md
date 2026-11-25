# matekit: convenciones para agentes y colaboradores

Librería de componentes React sobre Material 3 Expressive. Paquete `@matekit/react`.
Antes de decidir algo que cueste revertir, leer `docs/adr/README.md` y aplicar lo decidido.

## Reglas del proyecto

- **No commitear ni pushear.** El autor hace los commits. Al terminar, listar los archivos
  cambiados y proponer un mensaje en Conventional Commits.
- **Idioma:** documentación, comentarios y textos en español; nombres de código en inglés.
- **Herramientas:** pnpm (no npm), Node 24 o superior, TypeScript 7 en modo estricto.
- **Dependencias:** no agregar ninguna sin pedirlo. Si hace falta una, versión exacta con al
  menos dos semanas de publicada.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Playground en `http://localhost:5175` (usa `src/` directamente) |
| `pnpm typecheck` | Verificación de tipos |
| `pnpm lint:css` | Revisa que el CSS de componentes use tokens para color, movimiento y tipografía |
| `pnpm test` | Pruebas de tokens (Node) y de componentes (Vitest en Chrome) |
| `pnpm test:browser` | Solo las pruebas de componentes, en el Chrome del sistema; `MK_BROWSERS=firefox` o `webkit` (separados por coma) los corre en esos motores, que el CI prueba en cada push |
| `pnpm tokens` | Regenera `src/tokens/*.css` y `src/tokens/palettes/*.css` desde `tokens/*.json` (paletas: ADR-0008) |
| `pnpm icons` / `pnpm icons:fetch` | Regenera los iconos (ver ADR-0006) |

## Estructura y capas (ADR-0002)

```
tokens/          datos de origen de los tokens (JSON) y su física (spring.ts)
scripts/lib/     color-schemes.ts, palette-css.ts y css.ts: generador de paletas, futuro
                 @matekit/theme (ADR-0009); no importan React, componentes ni tokens/
src/tokens/      CSS generado: no editar a mano
src/atoms/       primitivas: StateLayer, FocusRing, Ripple, Icon
src/molecules/   controles: Button, Checkbox, …
src/organisms/   combinan controles: Dialog, Menu, NavigationBar, …
src/icons/       iconos generados
src/styles.css   hoja única: importa tokens, átomos y componentes
playground/      páginas de prueba manual, una por componente
docs/research/   datos extraídos del kit de Figma y de Jetpack Compose
docs/adr/        decisiones de arquitectura
```

Cada componente vive en su carpeta: `Nombre.tsx`, `nombre.css`, `Nombre.test.tsx`. Se
exporta desde el `index.ts` de su capa y su CSS se importa en `src/styles.css`.

## Cómo se escribe un componente

- **API por composición (ADR-0002):** las partes son subcomponentes con nombres planos
  (`DialogHeadline`, `TextFieldLabel`), no propiedades de contenido ni `Dialog.Headline`.
  Los casos simples se escriben corto (`<Button><AddIcon />Crear</Button>`).
- **Universal o interactivo (ADR-0003):** sin estado, efectos, contexto ni eventos, el
  módulo no lleva `'use client'`. Si necesita algo de eso, `'use client'` en la primera línea.
  Preferir resolver estados con CSS (pseudo-clases) para que el componente quede universal.
- **Elementos nativos primero:** `<button>`, `<input>`, `<dialog>`, API Popover. El
  comportamiento de teclado sigue la guía WAI-ARIA APG.
- **Props:** se extienden los atributos del elemento nativo principal; `ref` como prop
  (React 19). Props opcionales tipadas como `T | undefined` (por `exactOptionalPropertyTypes`).
- **Átomos:** usar `StateLayer`, `FocusRing` y `Ripple` como hijos directos del elemento
  interactivo. Si el foco o el puntero están en otro elemento (por ejemplo un `<input>`
  oculto), activar con las variables `--mk-state-layer-opacity` y `--mk-focus-ring-visible`.
  Ejemplo completo: `src/molecules/Checkbox/`.
- **Iconos:** los de `src/icons/` o cualquier SVG dentro de `<Icon>`. El componente define
  `--mk-icon-size` para el tamaño.

## CSS (ADR-0005)

- CSS plano. Clases con prefijo `mk-` (`mk-switch`, `mk-switch-track`), variables internas
  con `--_` y variables públicas de personalización con `--mk-`.
- Todo dentro de `@layer matekit.components` (o `matekit.atoms`).
- **Color con contraste garantizado (ADR-0008):** combinar solo `on-X` sobre `X`, y el
  contenido (`on-surface`, `on-surface-variant`, `primary`, `outline`) sobre las superficies.
  Otro par (por ejemplo `tertiary` sobre `tertiary-container`) puede cumplir en el nivel
  estándar y fallar en el medio o el alto. `src/test/contrast.test.tsx` mide cada componente
  en todas las paletas, niveles y temas.
- Solo tokens `--md-sys-*` para color, tipografía, forma, elevación, estados y movimiento;
  nada de colores ni duraciones sueltos. `pnpm lint:css` lo verifica (también en CI); una
  excepción justificada lleva `/* lint-css-allow: motivo */` al final de la declaración. Movimiento: resortes
  `--md-sys-motion-spring-{fast,default,slow}-{spatial,effects}-{duration,easing}`.
- **Forma:** radios con `--md-sys-shape-corner-*`; las variantes parciales de Compose
  (`CornerExtraLargeTop`, `CornerLargeEnd`) se arman combinando radios por esquina, sin tokens
  nuevos. Un radio que anima (cambio de forma al presionar o seleccionar) **no usa
  `--md-sys-shape-corner-full`**: vale 9999px y la interpolación hacia otro radio no se ve
  hasta el final. Para la forma redonda, usar la mitad del alto (`calc(var(--_height) / 2)`,
  como el Button).
- Estados en este orden: hover (solo dentro de `@media (hover: hover)`), foco, presionado,
  deshabilitado al final.
- **Alto contraste:** un bloque `@media (forced-colors: active)` al final de cada CSS. El
  navegador quita fondos y sombras (incluidas las sombras interiores usadas como borde) y
  fuerza colores del sistema: la forma se dibuja con `outline` o `border`, y los estados con
  colores del sistema (`Highlight`/`HighlightText` para seleccionado o activado, `GrayText`
  para deshabilitado, sin sumar opacidad), con `forced-color-adjust: none` donde haga falta.
  Ejemplos: Checkbox, Switch, TextField.

## Fuentes de verdad (ADR-0004)

1. Kit de Figma, ya extraído: `docs/research/05-medidas.md` (medidas y colores por estado) y
   `docs/research/03-tokens.md`.
2. Jetpack Compose, para lo que el kit no trae o donde tiene un error evidente: tokens en
   `androidx/androidx`, carpeta
   `compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/`
   (leer con `gh api repos/androidx/androidx/contents/<ruta> -H "Accept: application/vnd.github.raw"`).
3. Un conflicto real entre ambos se verifica con una tercera fuente y se anota en
   `docs/research/07-jetpack-compose.md`.

**Comportamiento y accesibilidad en web:** la documentación de `@material/web`, la
librería web oficial de Google, en `material-components/material-web`, carpeta
`docs/components/` (`text-field.md`, `menu.md`, `dialog.md`, …; leer con
`gh api "repos/material-components/material-web/contents/docs/components/<archivo>.md" -H "Accept: application/vnd.github.raw"`).
Sirve para uso, teclado, roles, validación y posicionamiento. **No** para medidas ni colores:
es Material 3 anterior a Expressive (sin tamaños XS–XL, sin cambio de forma, sin Vibrant).

No llamar al conector de Figma salvo que falte un dato imprescindible: tiene límite de uso.

## Pruebas

- Pruebas en navegador real (`*.test.tsx` junto al componente) con `render`, `style` y
  `roleColor` de `src/test/render.tsx`, `userEvent` de `vitest/browser`, y los comandos
  `commands.pressDown(selector)` / `commands.pressUp()` para el estado presionado.
- Probar: estructura y accesibilidad (roles, nombres, `aria-*`), teclado, medidas contra la
  fuente, colores por estado con `roleColor`, deshabilitado, y que las props nativas y `ref`
  lleguen al elemento.
- Antes de dar algo por terminado: `pnpm typecheck` y `pnpm test` en verde, y romper a
  propósito una regla CSS para confirmar que alguna prueba falla (luego restaurarla).
- Para esperar animaciones, `expect.poll`, no tiempos fijos.
- Alto contraste: sumar el componente a `src/test/forced-colors.test.tsx`, que emula el modo
  con `commands.forcedColors(true)` y compara contra los colores del sistema (`systemColor`).
- Accesibilidad automática: sumar una galería del componente (estados principales) a
  `src/test/a11y.test.tsx`, que corre axe-core (WCAG 2.2 A/AA) en tema claro y oscuro.
- Contraste: sumar el componente a `src/test/contrast.test.tsx` (4,5:1 texto, 3:1 iconos y
  bordes que identifican el control), que lo recorre en las 4 paletas, los 3 niveles de
  contraste y los 2 temas. axe no decide el contraste de elementos cubiertos por los
  átomos (StateLayer, Ripple, FocusRing), por eso existe esta prueba propia.
- **Motores:** el CI corre las pruebas en Chrome, Firefox y WebKit (`MK_BROWSERS`). Lo que
  ya se sabe de cada uno (comprobado el 2026-11-25):
  - Medidas: comparar posiciones restadas con `toBeCloseTo(x, 2)`; Firefox ubica en subpíxeles.
  - Foco de teclado: llegar con `userEvent.tab()`, no con `.focus()`; Firefox no muestra el foco
    visible en un elemento enfocado por script si el foco anterior no era de teclado.
  - WebKit activa `forced-colors` pero no reemplaza colores: probar ahí solo lo que el CSS de
    matekit define a mano.
  - Una prueba que no aplica en un motor se saltea con `test.skipIf(server.browser === '…')` y
    el motivo comprobado en un comentario, nunca en silencio.
  - WebKit en macOS no lleva el foco a los botones con Tab ni con clic (ajuste del sistema):
    en local, esas pruebas fallan; la referencia es el WebKit de Linux del CI.
- `src/test/render.tsx` aísla cada prueba: desmonta lo renderizado al terminar y deja el
  puntero en una esquina antes de empezar. No repetir eso en cada archivo. Para detectar
  dependencias de orden: `pnpm exec vitest run --sequence.shuffle --sequence.seed=<n>`.

## Playground

Cada componente suma `playground/pages/NombrePage.tsx` (controles interactivos, matriz de
estados) y una entrada en `playground/App.tsx`. Revisarlo en tema claro y oscuro (la cabecera
también elige paleta y nivel de contraste).

Para revisar visualmente, usar el playground que el autor suele tener abierto en
`http://localhost:5175` (recarga en caliente): comprobar con
`curl -s -o /dev/null -w "%{http_code}" http://localhost:5175/` y apuntar ahí las capturas.
Levantar otro servidor solo si ese no responde, y nunca detener el del autor.
