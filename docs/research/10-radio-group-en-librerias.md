# Grupos de radios en librerías React

Revisión del 2026-11-25 para decidir la API de `RadioGroup`
([ADR-0012](../adr/0012-radiogroup-con-estado-por-contexto.md)). Se leyó el código de la rama
principal de cada repositorio con `gh api`:

- MUI: `mui/material-ui`, `packages/mui-material/src/RadioGroup/RadioGroup.js`,
  `useRadioGroup.ts` y `Radio/Radio.js`.
- React Aria: `adobe/react-spectrum`, `packages/react-aria/src/radio/useRadioGroup.ts` y
  `useRadio.ts`, y `packages/react-stately/src/radio/useRadioGroupState.ts`.
- Radix: `radix-ui/primitives`, `packages/react/radio-group/src/radio-group.tsx` y `radio.tsx`.
- Base UI: `mui/base-ui`, `packages/react/src/radio-group/RadioGroup.tsx`, su `index.ts` y
  `radio/root/RadioRoot.tsx`.

## Comparación

| | MUI | React Aria | Radix | Base UI |
|---|---|---|---|---|
| Dónde vive el valor | Grupo, por contexto (`RadioGroupContext`) | Grupo (`useRadioGroupState`) | Grupo (`useControllableState`, contexto) | Grupo, por contexto |
| Aviso de cambio | `onChange(event, value)` | `onChange(value)` | `onValueChange(value)` | `onValueChange(value, eventDetails)`, cancelable |
| `name` | Generado con `useId` si falta | Generado con `useId` si falta | Solo si se pasa (sin `name`, el input oculto no se envía) | El del `Field` o el de la prop; no se genera |
| Elemento del radio | `<input type="radio">` nativo | `<input type="radio">` nativo | `<button role="radio">` con un input oculto para formularios (`BubbleInput`) | `<span role="radio">` con un input oculto |
| Teclado | El del navegador | Propio: `onKeyDown` en el grupo mueve el foco y `tabIndex` por radio (0 en el elegido, -1 en el resto) | Foco itinerante propio (`RovingFocusGroup`) | Foco itinerante propio (`CompositeRoot`) |
| Contenedor | `FormGroup` (un `<div>`) con `role="radiogroup"` | `role="radiogroup"` | `role="radiogroup"` | `role="radiogroup"` |
| Orientación | No | `orientation` (`aria-orientation`; cambia el sentido de las flechas con RTL) | `orientation` (`aria-orientation`) y `loop` | No en el grupo (lo resuelve el compuesto) |
| Hook para componer | `useRadioGroup()` (devuelve el contexto) | Los hooks son la API (`useRadioGroup`, `useRadio`) | No exporta uno | No exporta uno |
| Validación | No (la da `FormControl` aparte) | Sí (`useFormValidationState`) | No | Sí, con `Field` y `Fieldset` |

Lo común: las cuatro ponen el valor en el grupo y los radios declaran solo su `value`. Ninguna
pide repetir `name` en cada radio.

## Qué tomó matekit

- **El valor y el `name` en el grupo, por contexto, con `name` generado**: como MUI y React Aria.
  Es la diferencia que más se nota al usarlo, y la razón para hacer una excepción al ADR-0003.
- **`onValueChange(value, event)`**: el nombre de Radix y Base UI, porque `onChange` en el
  `<fieldset>` ya existe (el del elemento, que recibe el `change` de cualquier control de
  adentro) y no conviene taparlo con otra firma. El valor va primero, que es lo que casi siempre
  se usa (`onValueChange={setValue}`); el evento del radio va segundo, por si hace falta. La
  firma de MUI, `onChange(event, value)`, es la que el ADR-0002 nombra como el estilo del que
  matekit se aparta.
- **`useRadioGroup()`**, como MUI, para componer radios propios (por ejemplo un elemento de
  lista que se resalta al estar elegido). matekit devuelve solo `{ name, value, disabled }`, no
  el aviso de cambio: el radio propio usa un `RadioButton`, que ya avisa al grupo.
- **Inputs nativos, sin teclado propio**, como MUI: las flechas, la parada única de Tab, el envío
  en formularios y `required` son del navegador. Radix y Base UI dibujan el radio con otro
  elemento y reconstruyen todo eso; React Aria usa inputs nativos pero maneja él mismo el foco.
  El costo es aceptar las diferencias entre navegadores: WebKit no da la vuelta en los extremos
  y pierde `:focus-visible` al mover el foco con flechas. La segunda se corrige en
  `RadioButton` con una marca (`data-focus-visible`); la primera queda como en Safari.
- **`<fieldset role="radiogroup">`** en lugar del `<div>` de las cuatro: `disabled` deshabilita
  todo el grupo sin JavaScript y el `<legend>` da el nombre accesible.
- **`orientation`**, como React Aria y Radix, solo para la disposición y `aria-orientation`: las
  flechas nativas funcionan en los dos ejes.
- Sin validación propia: queda para cuando haya un componente de formulario (ver el "Revisit if"
  del ADR-0012).
