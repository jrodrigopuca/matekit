import { useState } from 'react'
import { ButtonPage } from './pages/ButtonPage.tsx'
import { TokensPage } from './pages/TokensPage.tsx'

type Theme = 'system' | 'light' | 'dark'
type Motion = 'expressive' | 'standard'

const PAGES = {
  button: { label: 'Button', Page: ButtonPage },
  tokens: { label: 'Tokens', Page: TokensPage },
} as const
type PageId = keyof typeof PAGES

const readHash = (): PageId => {
  const id = location.hash.slice(1)
  return id in PAGES ? (id as PageId) : 'button'
}

export function App() {
  const [page, setPage] = useState<PageId>(readHash)
  const [theme, setTheme] = useState<Theme>('system')
  const [motion, setMotion] = useState<Motion>('expressive')
  const { Page } = PAGES[page]

  const go = (id: PageId) => {
    location.hash = id
    setPage(id)
  }

  return (
    <div
      className="pg"
      {...(theme === 'system' ? {} : { 'data-theme': theme })}
      data-motion={motion}
    >
      <header className="pg-header">
        <strong className="pg-brand">matekit</strong>
        <nav className="pg-nav">
          {(Object.keys(PAGES) as PageId[]).map((id) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={page === id ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault()
                go(id)
              }}
            >
              {PAGES[id].label}
            </a>
          ))}
        </nav>
        <label className="pg-field">
          Tema
          <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
            <option value="system">Sistema</option>
            <option value="light">Claro</option>
            <option value="dark">Oscuro</option>
          </select>
        </label>
        <label className="pg-field">
          Movimiento
          <select value={motion} onChange={(e) => setMotion(e.target.value as Motion)}>
            <option value="expressive">Expressive</option>
            <option value="standard">Standard</option>
          </select>
        </label>
      </header>
      <main className="pg-main">
        <Page />
      </main>
    </div>
  )
}
