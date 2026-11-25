import {
  Button,
  Checkbox,
  Switch,
  TextField,
  TextFieldInput,
  TextFieldLabel,
  TextFieldSupporting,
  TextFieldTextarea,
} from '../../src/index.ts'

// Ejemplos de uso: componentes combinados como en una aplicación. Toman la paleta, el contraste
// y el tema de la cabecera del playground (ADR-0008). Solo lo que se renderiza: sin
// comportamiento.

function ContactForm() {
  return (
    <form className="pg-example-form" onSubmit={(e) => e.preventDefault()}>
      <h3 className="pg-example-title">Escribinos</h3>

      <TextField variant="outlined">
        <TextFieldLabel>Nombre</TextFieldLabel>
        <TextFieldInput name="name" required />
      </TextField>

      <TextField variant="outlined">
        <TextFieldLabel>Correo</TextFieldLabel>
        <TextFieldInput name="email" type="email" />
        <TextFieldSupporting>Te respondemos en 48 horas</TextFieldSupporting>
      </TextField>

      <TextField variant="filled">
        <TextFieldLabel>Mensaje</TextFieldLabel>
        <TextFieldTextarea name="message" rows={4} />
      </TextField>

      <Checkbox name="terms">Acepto los términos</Checkbox>
      <Switch name="news" defaultChecked>Recibir novedades</Switch>

      <div className="pg-example-actions">
        <Button variant="text" type="reset">Cancelar</Button>
        <Button type="submit">Enviar</Button>
      </div>
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
        Usa la paleta, el contraste y el tema elegidos en la cabecera. En una aplicación, esos
        atributos van en <code>&lt;html&gt;</code> o en cualquier contenedor:
      </p>
      <pre className="pg-code">{'<html data-palette="orange" data-contrast="high" data-theme="dark">'}</pre>
    </section>
  )
}
