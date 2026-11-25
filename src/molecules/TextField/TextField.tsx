'use client'
// Molécula interactiva (ADR-0003): la etiqueta, el input y el texto de ayuda son partes
// separadas (ADR-0002) que tienen que compartir ids para la asociación accesible
// (<label htmlFor> ↔ input y aria-describedby ↔ texto de ayuda). Esos ids viajan por
// contexto de React, que solo existe en el cliente.
//
// Lo visual no depende de JavaScript: la etiqueta flotante, los estados (hover, foco, error,
// deshabilitado) y el corte del borde del outlined se resuelven en text-field.css. Las partes
// sin ids (TextFieldLeading, TextFieldTrailing) son universales y están en TextFieldSlots.tsx.

import {
  createContext,
  use,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
} from 'react'
import { StateLayer } from '../../atoms/StateLayer/StateLayer.tsx'

export type TextFieldVariant = 'filled' | 'outlined'

interface TextFieldContextValue {
  variant: TextFieldVariant
  error: boolean
  disabled: boolean
  inputId: string
  supportingId: string | undefined
  setCustomInputId: (id: string | undefined) => void
  setSupportingId: (id: string | undefined) => void
}

const TextFieldContext = createContext<TextFieldContextValue | null>(null)

function useTextField(part: string): TextFieldContextValue {
  const ctx = use(TextFieldContext)
  if (!ctx) throw new Error(`${part} tiene que estar dentro de un <TextField>.`)
  return ctx
}

const cx = (base: string, extra: string | undefined) => (extra ? `${base} ${extra}` : base)

export interface TextFieldProps extends HTMLAttributes<HTMLDivElement> {
  /** `filled` (por defecto, con fondo e indicador inferior) u `outlined` (con borde). */
  variant?: TextFieldVariant | undefined
  /** Estado de error: colores de error y `aria-invalid` en el input. */
  error?: boolean | undefined
  /** Deshabilita el input. También se puede pasar `disabled` al `TextFieldInput`. */
  disabled?: boolean | undefined
  /** Referencia al contenedor. Para el input, usar `ref` en `TextFieldInput`. */
  ref?: Ref<HTMLDivElement> | undefined
}

/**
 * Campo de texto de Material 3, armado por composición. Las partes van como hijos directos
 * (el contenedor es una grilla que las ubica por clase, sin importar el orden):
 *
 * ```tsx
 * <TextField variant="outlined" error={!!err}>
 *   <TextFieldLeading><SearchIcon /></TextFieldLeading>
 *   <TextFieldLabel>Buscar</TextFieldLabel>
 *   <TextFieldInput value={q} onChange={(e) => setQ(e.target.value)} />
 *   <TextFieldTrailing><IconButton label="Borrar"><CancelIcon /></IconButton></TextFieldTrailing>
 *   <TextFieldSupporting>{err ?? 'Mínimo 3 letras'}</TextFieldSupporting>
 * </TextField>
 * ```
 *
 * La etiqueta queda asociada al input y el texto de ayuda a su descripción sin pasar ids; si
 * se pasan (`id` en `TextFieldInput` o en `TextFieldSupporting`), se respetan.
 * `className` y `style` van al contenedor; el ancho por defecto es 280 px.
 */
export function TextField({
  variant = 'filled',
  error = false,
  disabled = false,
  className,
  children,
  ref,
  ...props
}: TextFieldProps) {
  const generatedId = useId()
  const [customInputId, setCustomInputId] = useState<string | undefined>(undefined)
  const [supportingId, setSupportingId] = useState<string | undefined>(undefined)
  const inputId = customInputId ?? `${generatedId}input`

  const ctx = useMemo<TextFieldContextValue>(
    () => ({ variant, error, disabled, inputId, supportingId, setCustomInputId, setSupportingId }),
    [variant, error, disabled, inputId, supportingId],
  )

  return (
    <TextFieldContext value={ctx}>
      <div
        {...props}
        ref={ref}
        className={cx('mk-text-field', className)}
        data-variant={variant}
        data-error={error || undefined}
      >
        {/* Fondo, capa de estado e indicador (filled) o borde sin etiqueta (outlined). */}
        <span className="mk-text-field-container" aria-hidden="true">
          <StateLayer />
        </span>
        {children}
      </div>
    </TextFieldContext>
  )
}

export interface TextFieldLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  /** Texto de la etiqueta. En el outlined se repite, oculto, para abrir el corte del borde. */
  children?: ReactNode
}

/**
 * Etiqueta del campo: en reposo ocupa el lugar del texto (Body Large) y flota arriba (Body
 * Small) con foco o con valor. Es un `<label>` asociado al input.
 *
 * En el outlined dibuja además el borde (un `<fieldset>` con `<legend>`, ocultos para los
 * lectores de pantalla): el `<legend>` lleva una copia invisible del texto y el navegador
 * corta el borde a su medida. Por eso conviene que el contenido sea solo texto.
 */
export function TextFieldLabel({ className, htmlFor, children, ...props }: TextFieldLabelProps) {
  const { inputId, variant } = useTextField('TextFieldLabel')
  return (
    <>
      <label {...props} htmlFor={htmlFor ?? inputId} className={cx('mk-text-field-label', className)}>
        {children}
      </label>
      {variant === 'outlined' && (
        <fieldset className="mk-text-field-outline" aria-hidden="true">
          <legend className="mk-text-field-notch">
            <span>{children}</span>
          </legend>
        </fieldset>
      )}
    </>
  )
}

/** Registra un id propio del input para que la etiqueta lo use. */
function useInputId(id: string | undefined, part: string) {
  const ctx = useTextField(part)
  const { setCustomInputId } = ctx
  useLayoutEffect(() => {
    if (id === undefined) return
    setCustomInputId(id)
    return () => setCustomInputId(undefined)
  }, [id, setCustomInputId])
  return ctx
}

const describedBy = (own: string | undefined, supporting: string | undefined) =>
  [own, supporting].filter(Boolean).join(' ') || undefined

export interface TextFieldInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'children'> {
  /** Referencia al `<input>` nativo. */
  ref?: Ref<HTMLInputElement> | undefined
}

/**
 * El `<input>` nativo del campo. Acepta todas sus props (`type`, `value`, `defaultValue`,
 * `onChange`, `name`, `required`, `maxLength`, `autoComplete`…) y `ref`.
 *
 * Sin `placeholder` se usa uno de un espacio: la etiqueta flotante lo necesita para saber, con
 * `:placeholder-shown`, si el campo está vacío. Un `placeholder` propio se muestra solo
 * cuando la etiqueta ya flotó (con foco), como en Material 3.
 */
export function TextFieldInput({ id, className, placeholder, ref, ...props }: TextFieldInputProps) {
  const ctx = useInputId(id, 'TextFieldInput')
  return (
    <input
      {...props}
      ref={ref}
      id={id ?? ctx.inputId}
      className={cx('mk-text-field-input', className)}
      placeholder={placeholder || ' '}
      disabled={ctx.disabled || props.disabled}
      aria-invalid={ctx.error || props['aria-invalid'] || undefined}
      aria-describedby={describedBy(props['aria-describedby'], ctx.supportingId)}
    />
  )
}

export interface TextFieldTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'children'> {
  /** Referencia al `<textarea>` nativo. */
  ref?: Ref<HTMLTextAreaElement> | undefined
}

/**
 * Variante multilínea: un `<textarea>` nativo en lugar del input. El campo crece con `rows`
 * (2 por defecto) o con CSS (`field-sizing: content`, `resize`). Mismas reglas de etiqueta,
 * placeholder y asociación accesible que `TextFieldInput`.
 */
export function TextFieldTextarea({ id, className, placeholder, ref, ...props }: TextFieldTextareaProps) {
  const ctx = useInputId(id, 'TextFieldTextarea')
  return (
    <textarea
      {...props}
      ref={ref}
      id={id ?? ctx.inputId}
      className={cx('mk-text-field-input mk-text-field-textarea', className)}
      placeholder={placeholder || ' '}
      disabled={ctx.disabled || props.disabled}
      aria-invalid={ctx.error || props['aria-invalid'] || undefined}
      aria-describedby={describedBy(props['aria-describedby'], ctx.supportingId)}
    />
  )
}

export interface TextFieldSupportingProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * Texto de ayuda bajo el campo (Body Small). Queda como descripción accesible del input
 * (`aria-describedby`). En error toma el color de error: para mostrar el mensaje de error,
 * cambiar su contenido.
 */
export function TextFieldSupporting({ id, className, ...props }: TextFieldSupportingProps) {
  const { setSupportingId } = useTextField('TextFieldSupporting')
  const generatedId = useId()
  const ownId = id ?? generatedId
  useLayoutEffect(() => {
    setSupportingId(ownId)
    return () => setSupportingId(undefined)
  }, [ownId, setSupportingId])
  return <div {...props} id={ownId} className={cx('mk-text-field-supporting', className)} />
}
