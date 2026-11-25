# ADR-0012: RadioGroup con estado compartido por contexto (excepción al ADR-0003)

- Status: accepted (2026-11-25)
- Drivers:
  - La primera versión de `RadioGroup` y `RadioButton` era universal
    ([ADR-0003](0003-componentes-universales-e-interactivos.md)): cada radio llevaba su `name`
    y su `checked`, como en HTML, y el grupo solo aportaba el `<fieldset>`. Al revisarla, el
    autor encontró que no es lo que espera quien usa React: MUI, React Aria, Radix y Base UI
    ponen el valor elegido en el grupo y los radios solo declaran su `value`
    ([../research/10-radio-group-en-librerias.md](../research/10-radio-group-en-librerias.md)).
  - Repetir `name` en cada radio es fácil de olvidar (sin él, los radios no forman grupo ni se
    envían en el formulario) y obliga a inventar nombres únicos cuando hay varios grupos.
  - Controlar la selección radio por radio (`checked={v === 'x'}` y `onChange` en cada uno)
    reparte el estado en N lugares; el grupo controlado lo concentra en uno (`value` y
    `onValueChange`).
  - Componer radios propios (un elemento de lista que se resalta cuando su opción está
    elegida) necesita leer el valor del grupo desde un descendiente: un hook, como
    `useRadioGroup()` de MUI.
- Decision:
  - **`RadioGroup` y `RadioButton` llevan `'use client'`.** El grupo guarda el valor (controlado
    con `value`, no controlado con `defaultValue`) y reparte por contexto `name` (el de la prop
    o uno de `useId`), `value`, `disabled`, `required` y el aviso de cambio. `RadioButton`, si no
    recibe `checked` ni `defaultChecked`, se marca cuando el valor del grupo es el suyo
    (comparados como texto, como MUI); si no recibe `name`, usa el del grupo; su `onChange`
    propio se llama antes del aviso del grupo. Sin grupo funciona suelto, como antes.
  - **El aviso del grupo es `onValueChange(value, event)`**, no `onChange`: `onChange` en el
    `<fieldset>` es el del elemento (recibe el `change` que sube de cualquier control de
    adentro) y queda sin tocar. El nombre y el orden de los argumentos siguen a Radix y Base UI;
    el evento del radio va segundo, para quien lo necesite.
  - **Se exporta `useRadioGroup()`**: devuelve `{ name, value, disabled }` o `null` fuera de un
    grupo.
  - **Se mantienen los `<input type="radio">` nativos y el `<fieldset role="radiogroup">`**: el
    teclado (flechas, una sola parada de Tab) y el envío en formularios siguen siendo del
    navegador, y `disabled` del fieldset deshabilita también radios que no leen el contexto. No
    se implementa foco itinerante (roving tabindex) propio. La única ayuda de teclado es marcar
    con `data-focus-visible` el radio al que se llegó con flechas, porque WebKit le quita
    `:focus-visible` (ver `RadioButton.tsx`).
  - Se agrega `orientation` (`vertical` u `horizontal`): disposición y `aria-orientation`.
- Tradeoff accepted:
  - Dos módulos más pasan a ser cliente. Un formulario escrito en un Server Component que use
    radios ahora los hidrata (el grupo y cada radio). El contenido de las etiquetas puede seguir
    siendo de servidor, porque llega como hijos.
  - Un radio con `checked`, `defaultChecked` o `name` propios se sale del grupo para ese dato;
    si se mezcla `defaultChecked` en un radio con `value`/`defaultValue` en el grupo, mandan dos
    fuentes. Se documenta que dentro de un grupo se use el valor del grupo.
  - `useRadioGroup()` pasa a ser API pública: cambiar su forma rompe a quien componga radios
    propios.
- Revisit if: si React permite leer contexto en componentes de servidor o aparece una forma
  universal de repartir `name` y valor (por ejemplo, un atributo de HTML que agrupe radios por
  contenedor), volver a evaluar un grupo universal. Si una librería de formularios que use el
  autor necesita validación integrada (como `Field` de Base UI o la validación de React Aria),
  revisar si el contexto tiene que llevar también el estado de error.
