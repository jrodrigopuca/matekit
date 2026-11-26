import { useEffect, useId, useRef } from 'react'
import {
  List,
  ListItem,
  ListItemAction,
  ListItemHeadline,
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
  groups: readonly NavGroup[]
  current: string
  filter: string
  onFilterChange: (filter: string) => void
  onNavigate: (id: string) => void
}

/**
 * Navegación del playground: un filtro y una List por grupo, con enlaces (ListItemAction) y la
 * página actual con `current` (`aria-current="page"`). La usan el panel lateral y el diálogo.
 */
export function PageNav({ groups, current, filter, onFilterChange, onNavigate }: PageNavProps) {
  const baseId = useId()
  const navRef = useRef<HTMLElement>(null)
  const shown = filterGroups(groups, filter)
  const count = shown.reduce((n, g) => n + g.entries.length, 0)

  // La página actual queda a la vista al montar (por ejemplo, al entrar por URL a una del final).
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' })
  }, [])

  return (
    <nav ref={navRef} className="pg-nav" aria-label="Páginas del playground">
      <Stack gap={200}>
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
        {/* Cantidad de resultados para lectores de pantalla, solo mientras se filtra. */}
        <p className="pg-nav-status" role="status">
          {filter.trim() ? (count === 0 ? 'Ninguna página coincide.' : count === 1 ? '1 página' : `${count} páginas`) : ''}
        </p>
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
                      <ListItemAction
                        href={`#${id}`}
                        current={id === current}
                        // El diálogo enfoca la página actual al abrir (en lugar del filtro, que
                        // abriría el teclado en un teléfono).
                        {...(id === current ? { 'data-autofocus': '' } : {})}
                        onClick={(e) => {
                          // Clic con modificador o botón del medio: el navegador abre otra pestaña.
                          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                          e.preventDefault()
                          onNavigate(id)
                        }}
                      >
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
