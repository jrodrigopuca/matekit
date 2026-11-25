import { useState, type FormEvent } from 'react'
import {
  Button,
  CancelIcon,
  IconButton,
  SearchIcon,
  TextField,
  TextFieldInput,
  TextFieldLabel,
  TextFieldLeading,
  TextFieldSupporting,
  TextFieldTextarea,
  TextFieldTrailing,
  VisibilityIcon,
  VisibilityOffIcon,
  type TextFieldVariant,
} from '../../src/index.ts'

const VARIANTS: TextFieldVariant[] = ['filled', 'outlined']

export function TextFieldPage() {
  const [variant, setVariant] = useState<TextFieldVariant>('outlined')
  const [leading, setLeading] = useState(true)
  const [trailing, setTrailing] = useState(true)
  const [forceError, setForceError] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const [withSupporting, setWithSupporting] = useState(true)
  const [q, setQ] = useState('yerba')

  const tooShort = q.length > 0 && q.length < 3
  const error = forceError || tooShort

  return (
    <>
      <section className="pg-section">
        <h2>Interactivo</h2>
        <div className="pg-controls">
          <label className="pg-field">
            Variante
            <select value={variant} onChange={(e) => setVariant(e.target.value as TextFieldVariant)}>
              {VARIANTS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </label>
          <Check label="Icono inicial" value={leading} onChange={setLeading} />
          <Check label="Botón final" value={trailing} onChange={setTrailing} />
          <Check label="Texto de ayuda" value={withSupporting} onChange={setWithSupporting} />
          <Check label="Error" value={forceError} onChange={setForceError} />
          <Check label="Deshabilitado" value={disabled} onChange={setDisabled} />
        </div>
        <div className="pg-stage" style={{ placeItems: 'center start', padding: 24 }}>
          <TextField variant={variant} error={error} disabled={disabled}>
            {leading && (
              <TextFieldLeading>
                <SearchIcon />
              </TextFieldLeading>
            )}
            <TextFieldLabel>Buscar</TextFieldLabel>
            <TextFieldInput value={q} onChange={(e) => setQ(e.target.value)} />
            {trailing && (
              <TextFieldTrailing>
                <IconButton label="Borrar" disabled={disabled || q === ''} onClick={() => setQ('')}>
                  <CancelIcon />
                </IconButton>
              </TextFieldTrailing>
            )}
            {withSupporting && (
              <TextFieldSupporting>{tooShort ? 'Escribí al menos 3 letras' : 'Mínimo 3 letras'}</TextFieldSupporting>
            )}
          </TextField>
        </div>
        <p className="pg-hint">
          La etiqueta flota con foco o con texto (CSS, sin JavaScript). Con menos de 3 letras se marca el error.
          Sobre el fondo de este recuadro (surface-container-low) el outlined corta el borde sin pintar fondo.
        </p>
      </section>

      <section className="pg-section">
        <h2>Estados</h2>
        <div className="pg-grid" style={{ gridTemplateColumns: 'max-content repeat(2, max-content)', alignItems: 'start' }}>
          <span />
          {VARIANTS.map((v) => (
            <span key={v} className="pg-col-head">{v}</span>
          ))}
          {STATES.map((s) => (
            <StateRow key={s.name} {...s} />
          ))}
        </div>
      </section>

      <section className="pg-section">
        <h2>Tipos y multilínea</h2>
        <div className="pg-row" style={{ alignItems: 'start' }}>
          {VARIANTS.map((v) => (
            <TextField key={`date-${v}`} variant={v}>
              <TextFieldLabel>Fecha</TextFieldLabel>
              <TextFieldInput type="date" />
              <TextFieldSupporting>type="date": la etiqueta queda arriba</TextFieldSupporting>
            </TextField>
          ))}
          {VARIANTS.map((v) => (
            <TextField key={`ph-${v}`} variant={v}>
              <TextFieldLabel>Correo</TextFieldLabel>
              <TextFieldInput type="email" placeholder="ana@ejemplo.com" />
              <TextFieldSupporting>El placeholder aparece con foco</TextFieldSupporting>
            </TextField>
          ))}
          {VARIANTS.map((v) => (
            <TextField key={`ta-${v}`} variant={v}>
              <TextFieldLabel>Comentario</TextFieldLabel>
              <TextFieldTextarea rows={3} defaultValue={'Primera línea\nSegunda línea'} />
              <TextFieldSupporting>TextFieldTextarea, 3 filas</TextFieldSupporting>
            </TextField>
          ))}
        </div>
      </section>

      <section className="pg-section">
        <h2>Formulario</h2>
        <SignUpForm />
      </section>
    </>
  )
}

function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="pg-check">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

interface StateDef {
  name: string
  value?: string
  error?: boolean
  disabled?: boolean
  icons?: boolean
}

const STATES: StateDef[] = [
  { name: 'Vacío' },
  { name: 'Con texto', value: 'Ana' },
  { name: 'Con iconos', value: 'Ana', icons: true },
  { name: 'Error', value: 'Ana', error: true, icons: true },
  { name: 'Deshabilitado', disabled: true },
  { name: 'Deshabilitado con texto', value: 'Ana', disabled: true, icons: true },
]

function StateRow({ name, value, error = false, disabled = false, icons = false }: StateDef) {
  return (
    <>
      <span className="pg-row-head" style={{ paddingTop: 20 }}>{name}</span>
      {VARIANTS.map((v) => (
        <TextField key={v} variant={v} error={error} disabled={disabled}>
          {icons && (
            <TextFieldLeading>
              <SearchIcon />
            </TextFieldLeading>
          )}
          <TextFieldLabel>Nombre</TextFieldLabel>
          <TextFieldInput {...(value === undefined ? {} : { defaultValue: value })} />
          {icons && (
            <TextFieldTrailing>
              <IconButton label="Borrar" disabled={disabled}>
                <CancelIcon />
              </IconButton>
            </TextFieldTrailing>
          )}
          <TextFieldSupporting>{error ? 'Nombre no disponible' : 'Texto de ayuda'}</TextFieldSupporting>
        </TextField>
      ))}
    </>
  )
}

function SignUpForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [sent, setSent] = useState<string | null>(null)

  const emailError = submitted && !/^\S+@\S+\.\S+$/.test(email)
  const passwordError = submitted && password.length < 8

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitted(true)
    if (/^\S+@\S+\.\S+$/.test(email) && password.length >= 8) setSent(email)
  }

  return (
    <form onSubmit={onSubmit} noValidate style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
      <TextField variant="outlined" error={emailError}>
        <TextFieldLabel>Correo</TextFieldLabel>
        <TextFieldInput type="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextFieldSupporting>{emailError ? 'Ingresá un correo válido' : 'Te mandamos la confirmación acá'}</TextFieldSupporting>
      </TextField>
      <TextField variant="outlined" error={passwordError}>
        <TextFieldLabel>Contraseña</TextFieldLabel>
        <TextFieldInput
          type={show ? 'text' : 'password'}
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <TextFieldTrailing>
          <IconButton label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} selected={show} onClick={() => setShow(!show)}>
            {show ? <VisibilityOffIcon /> : <VisibilityIcon />}
          </IconButton>
        </TextFieldTrailing>
        <TextFieldSupporting>{passwordError ? 'Tiene que tener 8 caracteres o más' : 'Mínimo 8 caracteres'}</TextFieldSupporting>
      </TextField>
      <Button type="submit">Crear cuenta</Button>
      {sent && <p className="pg-hint">Cuenta creada para {sent}.</p>}
    </form>
  )
}
