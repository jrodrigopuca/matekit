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
| `pnpm test` | Pruebas de tokens (Node) y de componentes (Vitest en Chrome) |
| `pnpm test:browser` | Solo las pruebas de componentes |
| `pnpm tokens` | Regenera `src/tokens/*.css` desde `tokens/*.json` |
| `pnpm icons` / `pnpm icons:fetch` | Regenera los iconos (ver ADR-0006) |

## Estructura y capas (ADR-0002)

```
tokens/          datos de origen de los tokens (JSON) y su física (spring.ts)
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
- Solo tokens `--md-sys-*` para color, tipografía, forma, elevación, estados y movimiento;
  nada de colores ni duraciones sueltos. Movimiento: resortes
  `--md-sys-motion-spring-{fast,default,slow}-{spatial,effects}-{duration,easing}`.
- Estados en este orden: hover (solo dentro de `@media (hover: hover)`), foco, presionado,
  deshabilitado al final.

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

## Playground

Cada componente suma `playground/pages/NombrePage.tsx` (controles interactivos, matriz de
estados) y una entrada en `playground/App.tsx`. Revisarlo en tema claro y oscuro.

Para revisar visualmente, usar el playground que el autor suele tener abierto en
`http://localhost:5175` (recarga en caliente): comprobar con
`curl -s -o /dev/null -w "%{http_code}" http://localhost:5175/` y apuntar ahí las capturas.
Levantar otro servidor solo si ese no responde, y nunca detener el del autor.
