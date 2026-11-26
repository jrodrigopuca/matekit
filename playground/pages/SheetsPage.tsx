import { useState } from 'react'
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHandle,
  BottomSheetTitle,
  Button,
  Checkbox,
  DownloadIcon,
  EditIcon,
  List,
  ListItem,
  ListItemAction,
  ListItemHeadline,
  ListItemLeading,
  ShareIcon,
  SideSheet,
  SideSheetActions,
  SideSheetBack,
  SideSheetClose,
  SideSheetContent,
  SideSheetHeader,
  SideSheetTitle,
  Switch,
} from '../../src/index.ts'

type Case = 'short' | 'long' | 'skip' | 'side' | 'side-back'

const CASES: Record<Case, string> = {
  short: 'Bottom sheet corto',
  long: 'Bottom sheet largo (parcial)',
  skip: 'Largo sin parcial',
  side: 'Side sheet modal',
  'side-back': 'Side sheet con volver',
}

/** Caso abierto al cargar, desde la URL (`#sheets?open=long`): solo para capturas. */
function initialCase(): Case | null {
  const value = new URLSearchParams(location.hash.split('?')[1] ?? '').get('open')
  return value && value in CASES ? (value as Case) : null
}

const ACTIONS = [
  { id: 'share', label: 'Compartir', Icon: ShareIcon },
  { id: 'edit', label: 'Editar', Icon: EditIcon },
  { id: 'download', label: 'Descargar', Icon: DownloadIcon },
]

const PLACES = Array.from({ length: 30 }, (_, i) => `Parada ${i + 1}`)

const FILTERS = ['Abierto ahora', 'Con estacionamiento', 'Acepta mascotas', 'Accesible']

function Filters() {
  return (
    <div style={{ display: 'grid', gap: 12, padding: '0 16px 16px' }}>
      {FILTERS.map((f) => (
        <Checkbox key={f} defaultChecked={f === 'Abierto ahora'}>
          {f}
        </Checkbox>
      ))}
    </div>
  )
}

export function SheetsPage() {
  const [openCase, setOpenCase] = useState<Case | null>(initialCase)
  const [log, setLog] = useState<string[]>([])
  const [standardOpen, setStandardOpen] = useState(true)
  const [rtl, setRtl] = useState(false)

  const note = (text: string) => setLog((l) => [text, ...l].slice(0, 5))
  const close = (why: string) => {
    note(why)
    setOpenCase(null)
  }
  const isOpen = (c: Case) => openCase === c

  return (
    <div dir={rtl ? 'rtl' : undefined}>
      <section className="pg-section">
        <h2>Casos</h2>
        <div className="pg-controls">
          {(Object.keys(CASES) as Case[]).map((c) => (
            <Button key={c} variant="tonal" onClick={() => setOpenCase(c)}>
              {CASES[c]}
            </Button>
          ))}
          <Switch checked={rtl} onChange={(e) => setRtl(e.currentTarget.checked)}>
            RTL
          </Switch>
        </div>
        <p className="pg-hint">
          Arrastrá el asa (o cualquier parte fuera de la lista, o la lista con el dedo desde arriba de todo) hacia
          arriba o abajo; al soltar decide por velocidad y distancia. El asa es un botón: expande, contrae o cierra.
          Escape o un clic en el fondo llaman a <code>onClose</code>. Últimos eventos:{' '}
          {log.length ? log.join(' · ') : '—'}
        </p>
      </section>

      <section className="pg-section">
        <h2>Side sheet standard</h2>
        <div className="pg-controls">
          <Button variant="outlined" onClick={() => setStandardOpen((o) => !o)}>
            {standardOpen ? 'Ocultar' : 'Mostrar'} el side sheet
          </Button>
        </div>
      </section>
      {/* Fuera de .pg-section: su regla para los h2 le ganaría al título del sheet. */}
      <div
        style={{
          marginBlockEnd: 40,
          display: 'flex',
          blockSize: 360,
          border: '1px solid var(--md-sys-color-outline-variant)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div style={{ flex: 1, minInlineSize: 0, padding: 16 }}>
          <p style={{ margin: 0 }}>Contenido principal. El side sheet standard queda al lado, con un divisor.</p>
        </div>
        <SideSheet modal={false} open={standardOpen} onClose={() => setStandardOpen(false)} style={{ maxInlineSize: '60%' }}>
          <SideSheetHeader>
            <SideSheetTitle>Detalles</SideSheetTitle>
            <SideSheetClose />
          </SideSheetHeader>
          <SideSheetContent>
            <Filters />
          </SideSheetContent>
          <SideSheetActions>
            <Button size="sm">Guardar</Button>
            <Button size="sm" variant="outlined" onClick={() => setStandardOpen(false)}>
              Cancelar
            </Button>
          </SideSheetActions>
        </SideSheet>
      </div>

      <BottomSheet open={isOpen('short')} onClose={() => close('Corto: pedido de cierre')}>
        <BottomSheetHandle />
        <BottomSheetTitle>Acciones</BottomSheetTitle>
        <BottomSheetContent>
          <List>
            {ACTIONS.map(({ id, label, Icon }) => (
              <ListItem key={id}>
                <ListItemLeading>
                  <Icon />
                </ListItemLeading>
                <ListItemHeadline>
                  <ListItemAction onClick={() => close(`Corto: ${label}`)}>{label}</ListItemAction>
                </ListItemHeadline>
              </ListItem>
            ))}
          </List>
        </BottomSheetContent>
      </BottomSheet>

      {(['long', 'skip'] as const).map((c) => (
        <BottomSheet
          key={c}
          open={isOpen(c)}
          skipPartiallyExpanded={c === 'skip'}
          onClose={() => close(`${CASES[c]}: pedido de cierre`)}
        >
          <BottomSheetHandle />
          <BottomSheetTitle>Recorrido</BottomSheetTitle>
          <BottomSheetContent>
            <List>
              {PLACES.map((p) => (
                <ListItem key={p}>
                  <ListItemHeadline>
                    <ListItemAction onClick={() => close(`${CASES[c]}: ${p}`)}>{p}</ListItemAction>
                  </ListItemHeadline>
                </ListItem>
              ))}
            </List>
          </BottomSheetContent>
        </BottomSheet>
      ))}

      {(['side', 'side-back'] as const).map((c) => (
        <SideSheet key={c} open={isOpen(c)} onClose={() => close(`${CASES[c]}: pedido de cierre`)}>
          <SideSheetHeader>
            {c === 'side-back' && <SideSheetBack onClick={() => close(`${CASES[c]}: volver`)} />}
            <SideSheetTitle>Filtros</SideSheetTitle>
            <SideSheetClose />
          </SideSheetHeader>
          <SideSheetContent>
            <Filters />
          </SideSheetContent>
          <SideSheetActions>
            <Button size="sm" onClick={() => close(`${CASES[c]}: Aplicar`)}>
              Aplicar
            </Button>
            <Button size="sm" variant="outlined" onClick={() => close(`${CASES[c]}: Cancelar`)}>
              Cancelar
            </Button>
          </SideSheetActions>
        </SideSheet>
      ))}
    </div>
  )
}
