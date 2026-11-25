import { useRef, useState, type FormEvent } from 'react'
import {
  ArrowDropDownIcon,
  Button,
  CheckCircleIcon,
  CheckIcon,
  Checkbox,
  DeleteIcon,
  Dialog,
  DialogActions,
  DialogContent,
  DialogHeadline,
  DialogIcon,
  EditIcon,
  LoadingIndicator,
  Menu,
  MenuContent,
  MenuItem,
  MenuItemLeading,
  MenuTrigger,
  Shape,
  Switch,
  TextField,
  TextFieldInput,
  TextFieldLabel,
  TextFieldSupporting,
  TextFieldTextarea,
} from '../../src/index.ts'

// Ejemplos de uso: componentes combinados como en una aplicación. Toman la paleta, el contraste
// y el tema de la cabecera del playground (ADR-0008). El comportamiento es el mínimo para ver los
// componentes en uso: el envío se simula con una espera.

const SUBJECTS = ['Consulta', 'Soporte', 'Ventas'] as const
type Subject = (typeof SUBJECTS)[number]
type Status = 'editing' | 'sending' | 'sent'

function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [subject, setSubject] = useState<Subject>('Consulta')
  const [status, setStatus] = useState<Status>('editing')
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const reset = () => {
    formRef.current?.reset()
    setSubject('Consulta')
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    window.setTimeout(() => setStatus('sent'), 1800)
  }

  return (
    <form ref={formRef} className="pg-example-form" onSubmit={submit} aria-busy={status === 'sending'}>
      <header className="pg-example-header">
        {/* Shape: el fondo del icono con una de las formas de Expressive (hoja shapes.css). */}
        <Shape shape="cookie-9-sided" className="pg-example-badge">
          <EditIcon />
        </Shape>
        <div>
          <h3 className="pg-example-title">Escribinos</h3>
          <p className="pg-example-subtitle">Te respondemos en 48 horas</p>
        </div>
      </header>

      {status === 'sent' ? (
        <div className="pg-example-done" role="status">
          <Shape shape="sunny" className="pg-example-badge pg-example-badge-done">
            <CheckCircleIcon filled />
          </Shape>
          <p>¡Gracias! Recibimos tu mensaje sobre «{subject.toLowerCase()}».</p>
          <Button
            variant="tonal"
            type="button"
            onClick={() => {
              reset()
              setStatus('editing')
            }}
          >
            Escribir otro
          </Button>
        </div>
      ) : (
        <>
          <TextField variant="outlined">
            <TextFieldLabel>Nombre</TextFieldLabel>
            <TextFieldInput name="name" required disabled={status === 'sending'} />
          </TextField>

          <TextField variant="outlined">
            <TextFieldLabel>Correo</TextFieldLabel>
            <TextFieldInput name="email" type="email" disabled={status === 'sending'} />
            <TextFieldSupporting>Solo para responderte</TextFieldSupporting>
          </TextField>

          {/* Menu: elegir una opción (menuitemradio) desde un botón. */}
          <div className="pg-example-row">
            <span className="pg-example-label" id="subject-label">Asunto</span>
            <Menu>
              <MenuTrigger>
                <Button variant="outlined" type="button" aria-describedby="subject-label" disabled={status === 'sending'}>
                  {subject}
                  <ArrowDropDownIcon />
                </Button>
              </MenuTrigger>
              <MenuContent>
                {SUBJECTS.map((s) => (
                  <MenuItem key={s} type="radio" selected={s === subject} onSelect={() => setSubject(s)}>
                    <MenuItemLeading>{s === subject ? <CheckIcon /> : null}</MenuItemLeading>
                    {s}
                  </MenuItem>
                ))}
              </MenuContent>
            </Menu>
          </div>

          <TextField variant="filled">
            <TextFieldLabel>Mensaje</TextFieldLabel>
            <TextFieldTextarea name="message" rows={4} disabled={status === 'sending'} />
          </TextField>

          <Checkbox name="terms" required disabled={status === 'sending'}>Acepto los términos</Checkbox>
          <Switch name="news" defaultChecked disabled={status === 'sending'}>Recibir novedades</Switch>

          <div className="pg-example-actions">
            {status === 'sending' ? (
              // LoadingIndicator: reemplaza los botones mientras se envía (no va dentro de un botón).
              <span className="pg-example-sending">
                <LoadingIndicator contained label="Enviando el mensaje" />
                Enviando…
              </span>
            ) : (
              <>
                <Button variant="text" type="button" onClick={() => setConfirmDiscard(true)}>
                  Cancelar
                </Button>
                <Button type="submit">Enviar</Button>
              </>
            )}
          </div>
        </>
      )}

      {/* Dialog de alerta: confirma una acción destructiva antes de hacerla. */}
      <Dialog alert open={confirmDiscard} onClose={() => setConfirmDiscard(false)}>
        <DialogIcon><DeleteIcon /></DialogIcon>
        <DialogHeadline>¿Descartar el mensaje?</DialogHeadline>
        <DialogContent>Se borra lo que escribiste. No se puede deshacer.</DialogContent>
        <DialogActions>
          <Button variant="text" type="button" data-autofocus onClick={() => setConfirmDiscard(false)}>
            Seguir escribiendo
          </Button>
          <Button
            variant="text"
            type="button"
            onClick={() => {
              reset()
              setConfirmDiscard(false)
            }}
          >
            Descartar
          </Button>
        </DialogActions>
      </Dialog>
    </form>
  )
}

export function ExamplesPage() {
  return (
    <section className="pg-section">
      <h2>Formulario de contacto</h2>
      <div className="pg-stage" style={{ padding: 24 }}>
        <ContactForm />
      </div>
      <p className="pg-hint">
        Usa la paleta, el contraste y el tema elegidos en la cabecera. Combina Shape (el fondo del
        icono), TextField, Menu (asunto), Checkbox, Switch, Button, LoadingIndicator (al enviar) y
        Dialog (al cancelar). En una aplicación, la paleta y el contraste van en{' '}
        <code>&lt;html&gt;</code> o en cualquier contenedor:
      </p>
      <pre className="pg-code">{'<html data-palette="orange" data-contrast="high" data-theme="dark">'}</pre>
    </section>
  )
}
