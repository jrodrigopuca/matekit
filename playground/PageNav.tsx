import { useEffect, useId, useRef, type MouseEvent } from 'react'
import {
  List,
  ListItem,
  ListItemAction,
  ListItemHeadline,
  ModalNavigationRailClose,
  NavigationRailHeader,
  NavigationRailItem,
  NavigationRailItemLabel,
  SearchIcon,
  Stack,
  TextField,
  TextFieldInput,
  TextFieldLabel,
  TextFieldLeading,
} from '../src/index.ts'

export interface NavEntry {
  id: string
  label: string
}

export interface NavGroup {
  id: string
  label: string
  entries: readonly NavEntry[]
}

/** Minúsculas y sin tildes, para que "disposicion" encuentre "Disposición". */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/** Grupos con las páginas cuyo nombre o id contiene el filtro; sin filtro, todos. */
export function filterGroups(groups: readonly NavGroup[], filter: string): NavGroup[] {
  const q = fold(filter.trim())
  if (!q) return [...groups]
  return groups
    .map((g) => ({ ...g, entries: g.entries.filter((e) => fold(e.label).includes(q) || e.id.includes(q)) }))
    .filter((g) => g.entries.length > 0)
}

interface PageNavProps {
  /**
   * `list` (por defecto): el panel lateral, un `<nav>` con una List por grupo. `rail`: el contenido
   * del `ModalNavigationRail` del menú de páginas en pantallas chicas (el rail ya pone el `<nav>`):
   * el botón de cerrar y el filtro en el bloque superior, y por grupo un encabezado y sus
   * `NavigationRailItem` sin icono.
   */
  variant?: 'list' | 'rail'
  groups: readonly NavGroup[]
  current: string
  filter: string
  onFilterChange: (filter: string) => void
  onNavigate: (id: string) => void
}

/** Un clic con modificador o con el botón del medio lo maneja el navegador (otra pestaña). */
const opensElsewhere = (e: MouseEvent) => e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0

/**
 * Navegación del playground: un filtro y los grupos de páginas, con enlaces y la página actual con
 * `aria-current="page"`. La usan el panel lateral (`list`) y el rail modal (`rail`).
 */
export function PageNav({ variant = 'list', groups, current, filter, onFilterChange, onNavigate }: PageNavProps) {
  const baseId = useId()
  const navRef = useRef<HTMLElement>(null)
  const shown = filterGroups(groups, filter)
  const count = shown.reduce((n, g) => n + g.entries.length, 0)

  // La página actual queda a la vista al montar (por ejemplo, al entrar por URL a una del final).
  // En el rail lo hace el foco inicial, que va al destino actual.
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' })
  }, [])

  const navigate = (id: string) => (e: MouseEvent) => {
    if (opensElsewhere(e)) return
    e.preventDefault()
    onNavigate(id)
  }

  const filterField = (
    <search className="pg-nav-filter">
      <TextField variant="outlined">
        <TextFieldLeading>
          <SearchIcon />
        </TextFieldLeading>
        <TextFieldLabel>Filtrar páginas</TextFieldLabel>
        <TextFieldInput
          type="search"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          onKeyDown={(e) => {
            // Enter abre la primera página que coincide.
            const first = shown[0]?.entries[0]
            if (e.key === 'Enter' && filter.trim() && first) onNavigate(first.id)
          }}
        />
      </TextField>
    </search>
  )
  // Cantidad de resultados para lectores de pantalla, solo mientras se filtra.
  const status = (
    <p className="pg-nav-status" role="status">
      {filter.trim() ? (count === 0 ? 'Ninguna página coincide.' : count === 1 ? '1 página' : `${count} páginas`) : ''}
    </p>
  )

  if (variant === 'rail') {
    return (
      <>
        <NavigationRailHeader className="pg-nav-rail-header">
          <ModalNavigationRailClose label="Cerrar páginas" />
          {filterField}
        </NavigationRailHeader>
        {status}
        {shown.map((group) => {
          const labelId = `${baseId}${group.id}`
          return (
            <div key={group.id} role="group" aria-labelledby={labelId} className="pg-nav-rail-group">
              <span id={labelId} className="pg-nav-group">
                {group.label}
              </span>
              {group.entries.map(({ id, label }) => (
                <NavigationRailItem key={id} href={`#${id}`} active={id === current} onClick={navigate(id)}>
                  <NavigationRailItemLabel>{label}</NavigationRailItemLabel>
                </NavigationRailItem>
              ))}
            </div>
          )
        })}
      </>
    )
  }

  return (
    <nav ref={navRef} className="pg-nav" aria-label="Páginas del playground">
      <Stack gap={200}>
        {filterField}
        {status}
        {shown.map((group) => {
          const labelId = `${baseId}${group.id}`
          return (
            <Stack key={group.id} gap={50}>
              <span id={labelId} className="pg-nav-group">
                {group.label}
              </span>
              <List aria-labelledby={labelId}>
                {group.entries.map(({ id, label }) => (
                  <ListItem key={id}>
                    <ListItemHeadline>
                      <ListItemAction href={`#${id}`} current={id === current} onClick={navigate(id)}>
                        {label}
                      </ListItemAction>
                    </ListItemHeadline>
                  </ListItem>
                ))}
              </List>
            </Stack>
          )
        })}
      </Stack>
    </nav>
  )
}
