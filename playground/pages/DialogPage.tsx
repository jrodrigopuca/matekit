import { useState, type FormEvent } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogHeadline,
  DialogIcon,
  DeleteIcon,
  TextField,
  TextFieldInput,
  TextFieldLabel,
  TextFieldSupporting,
  WarningIcon,
} from '../../src/index.ts'

type Case = 'basic' | 'icon' | 'confirm' | 'long' | 'form'

const CASES: Record<Case, string> = {
  basic: 'Básico',
  icon: 'Con icono',
  confirm: 'Confirmación (alerta)',
  long: 'Lista larga con scroll',
  form: 'Formulario',
}

/** Caso abierto al cargar, desde la URL (`#dialog?open=icon`): solo para capturas. */
function initialCase(): Case | null {
  const value = new URLSearchParams(location.hash.split('?')[1] ?? '').get('open')
  return value && value in CASES ? (value as Case) : null
}

const COUNTRIES = [
  'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica', 'Cuba', 'Ecuador', 'El Salvador',
  'Guatemala', 'Honduras', 'México', 'Nicaragua', 'Panamá', 'Paraguay', 'Perú', 'República Dominicana',
  'Uruguay', 'Venezuela',
]

export function DialogPage() {
  const [openCase, setOpenCase] = useState<Case | null>(initialCase)
  const [log, setLog] = useState<string[]>([])
  const [name, setName] = useState('Mate amargo')
  const [country, setCountry] = useState('Uruguay')

  const note = (text: string) => setLog((l) => [text, ...l].slice(0, 5))
  const close = (why: string) => {
    note(why)
    setOpenCase(null)
  }
  const isOpen = (c: Case) => openCase === c

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    close(`Guardado: "${name}"`)
  }

  return (
    <>
      <section className="pg-section">
        <h2>Casos</h2>
        <div className="pg-controls">
          {(Object.keys(CASES) as Case[]).map((c) => (
            <Button key={c} variant="tonal" onClick={() => setOpenCase(c)}>
              {CASES[c]}
            </Button>
          ))}
        </div>
        <p className="pg-hint">
          Escape o un clic en el fondo llaman a <code>onClose</code>; el diálogo se cierra porque la página cambia
          <code> open</code>. La confirmación es una alerta (<code>role="alertdialog"</code>) que no se cierra con el
          fondo. Al cerrar, el foco vuelve al botón que la abrió. Últimos eventos: {log.length ? log.join(' · ') : '—'}
        </p>
      </section>

      <Dialog open={isOpen('basic')} onClose={() => close('Básico: pedido de cierre')}>
        <DialogHeadline>¿Descartar el borrador?</DialogHeadline>
        <DialogContent>El mensaje se va a borrar de este dispositivo y no se puede recuperar.</DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => close('Básico: Cancelar')}>Cancelar</Button>
          <Button variant="text" onClick={() => close('Básico: Descartar')}>Descartar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isOpen('icon')} onClose={() => close('Con icono: pedido de cierre')}>
        <DialogIcon>
          <DeleteIcon />
        </DialogIcon>
        <DialogHeadline>¿Eliminar el archivo?</DialogHeadline>
        <DialogContent>
          "presupuesto-2026.pdf" se va a eliminar de forma permanente de todos tus dispositivos.
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => close('Con icono: Cancelar')}>Cancelar</Button>
          <Button variant="text" onClick={() => close('Con icono: Eliminar')}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isOpen('confirm')}
        alert
        closeOnScrimClick={false}
        onClose={() => close('Confirmación: Escape')}
      >
        <DialogIcon>
          <WarningIcon />
        </DialogIcon>
        <DialogHeadline>¿Restablecer la configuración?</DialogHeadline>
        <DialogContent>Se van a perder los cambios de todas las cuentas. Esta acción no se puede deshacer.</DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => close('Confirmación: Cancelar')}>Cancelar</Button>
          <Button variant="text" onClick={() => close('Confirmación: Restablecer')}>Restablecer</Button>
        </DialogActions>
      </Dialog>

      {/* Contenido largo: no se usa como descripción accesible (se leería entero). */}
      <Dialog open={isOpen('long')} aria-describedby="" onClose={() => close('Lista: pedido de cierre')}>
        <DialogHeadline>Elegí un país</DialogHeadline>
        <DialogContent>
          <div role="radiogroup" aria-label="País" className="pg-dialog-list">
            {COUNTRIES.map((c) => (
              <label key={c} className="pg-dialog-option">
                <input
                  type="radio"
                  name="country"
                  checked={country === c}
                  onChange={() => setCountry(c)}
                  {...(country === c ? { 'data-autofocus': '' } : {})}
                />
                {c}
              </label>
            ))}
          </div>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => close('Lista: Cancelar')}>Cancelar</Button>
          <Button variant="text" onClick={() => close(`Lista: ${country}`)}>Aceptar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isOpen('form')} aria-describedby="" onClose={() => close('Formulario: pedido de cierre')}>
        <DialogHeadline>Renombrar lista</DialogHeadline>
        <DialogContent>
          <form id="pg-rename" onSubmit={onSubmit}>
            <TextField variant="outlined" error={name.trim() === ''} style={{ width: '100%', marginTop: 8 }}>
              <TextFieldLabel>Nombre</TextFieldLabel>
              <TextFieldInput value={name} onChange={(e) => setName(e.target.value)} required data-autofocus />
              <TextFieldSupporting>{name.trim() === '' ? 'Escribí un nombre' : 'Se ve en la pantalla principal'}</TextFieldSupporting>
            </TextField>
          </form>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => close('Formulario: Cancelar')}>Cancelar</Button>
          <Button variant="text" type="submit" form="pg-rename" disabled={name.trim() === ''}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
