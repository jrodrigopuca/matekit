// Iconos de prueba (trazos de Material Symbols "add" y "star"), hasta tener el átomo Icon.

export function PlusIcon() {
  return (
    <svg viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
      <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z" />
    </svg>
  )
}

export function StarIcon({ filled = false }: { filled?: boolean }) {
  return filled ? (
    <svg viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
      <path d="m233-80 65-281L80-550l288-25 112-265 112 265 288 25-218 189 65 281-247-149L233-80Z" />
    </svg>
  ) : (
    <svg viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
      <path d="m354-287 126-76 126 77-33-144 111-96-146-13-58-136-58 135-146 13 111 97-33 143ZM233-80l65-281L80-550l288-25 112-265 112 265 288 25-218 189 65 281-247-149L233-80Zm247-350Z" />
    </svg>
  )
}
