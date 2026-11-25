import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/styles.css'
import '../src/tokens/palettes/index.css'
import './playground.css'
import { App } from './App.tsx'

const root = document.getElementById('root')
if (!root) throw new Error('Falta #root en index.html')
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
