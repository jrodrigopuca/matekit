# Colores estáticos de m3.material.io

Leído el 2026-11-25 en https://m3.material.io/styles/color/static/baseline y
https://m3.material.io/styles/color/static/custom-brand. El sitio es una aplicación JavaScript:
el texto se leyó renderizando la página con Chrome sin interfaz, y la tabla de tokens, del
archivo de datos que carga la página (`/_dsm/data/dsdb-m3/<fecha>/COLOR.<id>.json`, versión del
2026-11-19). Ese archivo no es una API documentada y puede cambiar de ruta o de forma; por eso
los valores quedan copiados en `tokens/color.json` y no se descargan en cada compilación. El
archivo incluye datos personales de autores de Google: no se versiona.

## Qué dice la sección

- **Baseline** es el único esquema estático predefinido: el violeta del kit, en claro y
  oscuro, con pares de colores accesibles.
- **Custom brand** no es una paleta: es el método para armar un esquema con los colores de una
  marca. En el plugin Material Theme Builder de Figma se elige un color fuente para el
  primario y, si se quiere, para el secundario, el terciario, el error, el neutro y el neutro
  variante; el plugin genera el resto. La página aclara que ese esquema queda a cargo del
  equipo que lo crea.

## La tabla de tokens

Cada rol `md.sys.color.*` tiene un valor por contexto: tema (Light, Dark), contraste (Default,
Medium contrast, High contrast), plataforma (Web, Android, Compose, iOS) y audiencia (3P y
1P Baseline). La página pública muestra 3P.

| Comparación | Resultado |
|---|---|
| 3P Web, contraste estándar, frente a `tokens/color.json` | Iguales en los 49 roles, en claro y en oscuro (confirma también los cuatro `on-*-container` en tono 30 del ADR-0004) |
| 3P Web, medio y alto, frente a lo que generaba `material-color-utilities` desde las paletas del kit | Distintos en 12 a 25 roles por combinación, hasta 66 unidades por canal. Ejemplo: `primary` medio claro, oficial `#4f378b` (tono 30), generado `#3e2578` |
| Superficies, fondo, `shadow`, `scrim`, `inverse-surface`, `inverse-primary` | En la tabla oficial no cambian con el contraste (el valor está en el contexto sin nivel) |
| Contraste WCAG de los oficiales | `on-X` sobre `X`: mínimo 6,44:1 en medio y 9,11:1 en alto (los generados daban 5,15 y 8,96). Texto sobre superficies: 9,51:1 o más en medio |
| 1P Baseline | Otro esquema: el azul de los productos de Google (`primary` claro `#0b57d0`), con los tres niveles. No está en la página pública; no se adopta |

Decisión: el esquema base usa los valores oficiales en los niveles medio y alto
(`tokens/color.json`, campo `contrast`), y `material-color-utilities` queda solo para las
paletas opcionales (ADR-0008).

## Otros datos del archivo

- `md.ref.palette`: la paleta de referencia (los tonos de cada paleta del baseline). Sirve para
  el pendiente de `08-guia-mio.md` (capa `--md-ref-palette-*`) cuando se haga.
- Hay un rol extra, `md.sys.color.surface-tint-color`, que matekit no usa.
