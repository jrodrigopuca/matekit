# Extracción de medidas internas

Estado al 2026-11-24: hecha. El primer intento chocó con el límite de llamadas del
conector de Figma; el segundo funcionó. Resultado en
[../05-medidas.md](../05-medidas.md).

## Qué se quiere sacar

Para cada variante: tamaño, auto-layout (dirección, rellenos, separación, alineación),
radio de esquinas, rellenos y bordes con la variable que usan, opacidad, sombra, estilo de
texto e instancias anidadas. El script es [extract-figma.js](extract-figma.js) (solo lectura,
se ejecuta con la herramienta `use_figma` del conector o como plugin de Figma).

## Nodos a consultar

Archivo: el de `FIGMA_FILE_KEY` (copia propia del kit; la clave no se versiona). Los ids de
página y de nodo son los del kit de la comunidad y se conservan al duplicarlo (verificado
el 2026-11-24 sobre una segunda copia: las 9 páginas, 2 variantes de muestra y las 4
colecciones de variables coincidían). Una llamada por página.

| Página | Id de página | Variantes (ids) |
|---|---|---|
| Buttons | 55141:14168 | Filled Round XL/L/M/S/XS: 57994:2318, 2320, 2322, 2324, 2326 · Filled Square M: 57994:2312 · Tonal M: 57994:2302 · Outlined M: 57994:2282 · Elevated M: 57994:2242 · Text M: 57994:2262 · Toggle M seleccionado/no: 57994:2473, 2483 · Icon button standard M: 57994:10126 |
| Text fields | 55141:14259 | Filled (etiqueta, iconos ambos) Enabled/Focused/Error/Disabled/Hovered: 52798:25381, 25631, 25709, 25463, 25541 · Outlined Enabled/Focused/Error: 52798:25353, 25596, 25681 · Filled con texto escrito: 52798:24441 |
| Checkboxes | 55141:14173 | Selected, Unselected, Indeterminate, Selected Hovered, Selected Focused, Selected Pressed, Error selected, Error unselected, Disabled selected, Disabled unselected: 51859:5629, 5665, 5637, 5679, 5695, 5645, 5633, 5668, 5723, 5739 |
| Switch | 55141:14257 | Sel/No sel, con icono sel/no, Hovered, Focused, Pressed sel, Pressed no sel, Disabled sel/no: 54446:25290, 25355, 25320, 25385, 25296, 25302, 25308, 25373, 25314, 25379 |
| Dialogs | 55141:14176 | Basic con/sin icono: 50723:10930, 10948 · List: 50723:10964 |
| Menu | 55141:14250 | Menú Standard 1 grupo: 58966:4078 · Item Enabled, Selected, Hovered, Focused, Pressed, Disabled, Active: 58966:4101, 4107, 4113, 4125, 4139, 4153, 4165 · Item Vibrant y Vibrant seleccionado: 58966:4172, 4178 · Etiquetas básica/vibrant: 58966:4267, 4272 |
| Navigation | 55141:14251 | Bar vertical 3 items: 58016:37260 · Item vertical Enabled, Selected, Hovered, Selected+badge grande: 58016:37093, 37073, 37088, 36980 · Item horizontal: 58016:37117, 37100 · Rail Top 3: 58016:36948 · Item de rail: 58016:36536, 36460 · Rail expandida Docked/Floating: 58016:36671, 36723 · Item horizontal de rail: 58016:36614 |

## Alternativa sin el conector

La API REST de Figma (`GET /v1/files/$FIGMA_FILE_KEY/nodes?ids=...`) devuelve el
JSON completo de cada nodo, con auto-layout, radios, rellenos y variables vinculadas. Tiene
un límite aparte del conector y aceptaría todos los ids anteriores en pocas peticiones.
Requiere un token de acceso personal de Figma (`FIGMA_TOKEN` en `.env.local`, nunca en el
repositorio).
