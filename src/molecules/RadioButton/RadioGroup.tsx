// Molécula universal (ADR-0003): sin estado, efectos, contexto ni eventos propios; no lleva
// 'use client'.
//
// El grupo es un <fieldset role="radiogroup"> y no un <div role="radiogroup"> porque el
// fieldset trae resuelto en HTML lo que el div exigiría programar:
// - `disabled` en el fieldset deshabilita todos los radios de adentro (:disabled en CSS y en el
//   árbol de accesibilidad), sin pasar la prop a cada uno.
// - El nombre accesible sale del <legend> (`RadioGroupLabel`), sin generar ids para
//   aria-labelledby (que exigirían useId y, con él, 'use client').
// El rol radiogroup (permitido en <fieldset> por ARIA in HTML) es el del patrón APG "Radio
// Group" y el que pide @material/web (docs/components/radio.md).
//
// El grupo NO reparte `name` a sus radios: hacerlo exigiría contexto de React y, con él,
// 'use client' en RadioGroup y en RadioButton. Recorrer los hijos con cloneElement tampoco
// sirve: solo alcanza a los hijos directos y se rompe al envolver un radio en otro elemento.
// Como en HTML, cada radio lleva su `name`. `onChange` en el grupo sí funciona sin contexto: el
// evento change de los radios sube hasta el fieldset (event.target es el radio elegido).

import type { BaseSyntheticEvent, ChangeEvent, FieldsetHTMLAttributes, HTMLAttributes, ReactNode, Ref } from 'react'

/** Cambio de selección en el grupo: `target` es el radio elegido y `currentTarget`, el fieldset. */
export type RadioGroupChangeEvent = BaseSyntheticEvent<Event, EventTarget & HTMLFieldSetElement, HTMLInputElement>

export interface RadioGroupProps extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, 'role' | 'onChange'> {
  /** `RadioGroupLabel` (opcional, si se usa `aria-label` o `aria-labelledby`) y los `RadioButton`. */
  children?: ReactNode
  /**
   * Se llama cuando cambia la selección de cualquier radio del grupo; `event.target.value` es el
   * valor elegido. Los cambios de otros controles dentro del grupo no llegan.
   */
  onChange?: ((event: RadioGroupChangeEvent) => void) | undefined
  /** Referencia al `<fieldset>`. */
  ref?: Ref<HTMLFieldSetElement> | undefined
}

/**
 * Grupo de botones de opción: un `<fieldset role="radiogroup">`. Necesita un nombre accesible:
 * `RadioGroupLabel` como primer hijo, o `aria-label` / `aria-labelledby`.
 *
 * `disabled` deshabilita todas las opciones. `onChange` recibe el cambio de cualquiera de
 * ellas (`event.target` es el radio).
 *
 * ```tsx
 * <RadioGroup>
 *   <RadioGroupLabel>Envío</RadioGroupLabel>
 *   <RadioButton name="envio" value="retiro" defaultChecked>Retiro en el local</RadioButton>
 *   <RadioButton name="envio" value="domicilio">A domicilio</RadioButton>
 * </RadioGroup>
 * ```
 *
 * Controlado: `checked={envio === 'retiro'}` y `onChange` en cada radio.
 */
export function RadioGroup({ children, className, onChange, ref, ...props }: RadioGroupProps) {
  return (
    <fieldset
      {...props}
      onChange={onChange && ((event) => radioChange(event, onChange))}
      ref={ref}
      role="radiogroup"
      className={className ? `mk-radio-group ${className}` : 'mk-radio-group'}
    >
      {children}
    </fieldset>
  )
}

export interface RadioGroupLabelProps extends HTMLAttributes<HTMLLegendElement> {
  /** Referencia al `<legend>`. */
  ref?: Ref<HTMLLegendElement> | undefined
}

/** Título visible del grupo: un `<legend>`, que da el nombre accesible al `RadioGroup`. Va primero. */
export function RadioGroupLabel({ className, ...props }: RadioGroupLabelProps) {
  return <legend {...props} className={className ? `mk-radio-group-label ${className}` : 'mk-radio-group-label'} />
}

// El evento change sube desde el radio, pero @types/react (19.3) tipa `target` como el elemento
// del manejador, el fieldset (su TODO lo reconoce como un error hasta React 20). Se comprueba en
// tiempo de ejecución que el target es un radio y solo entonces se cambia el tipo.
// No le quita lo universal (ADR-0003): el manejador envuelve al de quien lo pasa y solo existe si
// hay uno, y una función solo puede llegar como prop desde un componente cliente.
function radioChange(event: ChangeEvent<HTMLFieldSetElement>, onChange: (event: RadioGroupChangeEvent) => void) {
  const target: EventTarget = event.target
  if (target instanceof HTMLInputElement && target.type === 'radio') {
    onChange(event as BaseSyntheticEvent<Event, EventTarget & HTMLFieldSetElement> as RadioGroupChangeEvent)
  }
}
