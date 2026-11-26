// Cola de snackbars (ADR-0022): un objeto que crea la app, sin estado de módulo. Universal: no
// importa React, así que se puede crear y usar en cualquier lado (un manejador, una tienda de
// estado, una mutación de datos) y pasarle al SnackbarHost que la dibuja.
//
// Modelo: SnackbarHostState de Jetpack Compose (SnackbarHost.kt, commit 7ac433e44e): `show`
// encola y devuelve una promesa que se cumple cuando el snackbar se fue, con el motivo; uno solo a
// la vez, en orden de llegada. Compose usa un Mutex (cola justa) y devuelve ActionPerformed o
// Dismissed; acá el motivo distingue además el tiempo cumplido y la cancelación.

/**
 * Cuánto queda visible: `short` 4 s y `long` 10 s (`SnackbarDuration.toMillis` de Compose), o
 * `indefinite` (hasta que se lo descarta o se usa la acción), o milisegundos. El tiempo se detiene
 * mientras el puntero está encima, el foco adentro o la pestaña oculta.
 */
export type SnackbarDuration = 'short' | 'long' | 'indefinite' | number

/** Por qué se fue: la acción, el botón de cerrar o Escape (`dismiss`), el tiempo o `cancel`. */
export type SnackbarResult = 'action' | 'dismiss' | 'timeout' | 'cancel'

export const SNACKBAR_DURATION_MS = { short: 4000, long: 10000 } as const

export interface SnackbarOptions {
  /** El texto. Se anuncia una vez al aparecer (región viva `role="status"`). */
  message: string
  /** Texto del botón de acción (uno solo, como en Material 3). La promesa da `'action'`. */
  action?: string | undefined
  /**
   * Botón de cerrar. Por defecto, sí cuando la duración es `indefinite` (Compose lo recomienda:
   * es la forma de descartarlo sin usar la acción).
   */
  dismissible?: boolean | undefined
  /**
   * Por defecto `short` sin acción e `indefinite` con acción (Compose, y WCAG 2.2.1: una acción que
   * desaparece sola puede no dar tiempo a llegar a ella con el teclado o el lector de pantalla).
   */
  duration?: SnackbarDuration | undefined
  /** La acción debajo del texto, alineada al final: para textos de acción largos (kit, Compose). */
  actionOnNewLine?: boolean | undefined
  /** Nombre del botón de cerrar. Por defecto, el `closeLabel` del host ("Cerrar"). */
  closeLabel?: string | undefined
  /** Al abortarse, lo quita de la pantalla o de la cola; la promesa da `'cancel'`. */
  signal?: AbortSignal | undefined
}

/** Un snackbar de la cola, con las opciones resueltas. Lo dibuja el host. */
export interface SnackbarEntry {
  /** Único dentro de la cola (clave de React). */
  readonly id: number
  readonly message: string
  readonly action: string | undefined
  readonly dismissible: boolean
  /** En milisegundos; `Infinity` si es `indefinite`. */
  readonly duration: number
  readonly actionOnNewLine: boolean
  readonly closeLabel: string | undefined
  /** Lo saca de la pantalla y cumple su promesa con `result`. Una segunda llamada no hace nada. */
  close(result: SnackbarResult): void
}

export interface SnackbarQueue {
  /**
   * Muestra un snackbar o lo encola detrás de los que ya hay. Se cumple cuando se fue, con el
   * motivo. Un texto solo es `{ message }`.
   */
  show(options: SnackbarOptions | string): Promise<SnackbarResult>
  /** Descarta el visible (`'dismiss'`); el siguiente de la cola pasa a mostrarse. */
  dismiss(): void
  /** Cancela el visible y los que esperan (`'cancel'`). */
  clear(): void
  /** El que se está mostrando, o `null`. */
  readonly current: SnackbarEntry | null
  /** Cuántos esperan detrás del visible. */
  readonly pending: number
  /** Avisa cada vez que cambia `current` (para `useSyncExternalStore`). Devuelve la baja. */
  subscribe(listener: () => void): () => void
}

function toMillis(duration: SnackbarDuration): number {
  if (duration === 'indefinite') return Infinity
  if (typeof duration === 'number') {
    if (!(duration > 0)) throw new Error(`Snackbar: duration tiene que ser positiva (llegó ${duration}).`)
    return duration
  }
  return SNACKBAR_DURATION_MS[duration]
}

/**
 * Crea una cola de snackbars. Cada `SnackbarHost` dibuja una; sin `queue`, el host crea la suya.
 * Crearla dentro del árbol de React (`useState(createSnackbarQueue)`) o por pedido: una cola a
 * nivel de módulo se compartiría entre pedidos en el servidor.
 *
 * ```ts
 * const queue = createSnackbarQueue()
 * const result = await queue.show({ message: 'Foto archivada', action: 'Deshacer' })
 * if (result === 'action') restore()
 * ```
 */
export function createSnackbarQueue(): SnackbarQueue {
  const waiting: SnackbarEntry[] = []
  const listeners = new Set<() => void>()
  let current: SnackbarEntry | null = null
  let nextId = 1

  const notify = () => {
    for (const listener of [...listeners]) listener()
  }
  const advance = () => {
    current = waiting.shift() ?? null
    notify()
  }

  return {
    show(input) {
      const options = typeof input === 'string' ? { message: input } : input
      const duration = toMillis(options.duration ?? (options.action === undefined ? 'short' : 'indefinite'))
      return new Promise<SnackbarResult>((resolve) => {
        const { signal } = options
        if (signal?.aborted) {
          resolve('cancel')
          return
        }
        let done = false
        const onAbort = () => entry.close('cancel')
        const entry: SnackbarEntry = {
          id: nextId++,
          message: options.message,
          action: options.action,
          dismissible: options.dismissible ?? duration === Infinity,
          duration,
          actionOnNewLine: options.actionOnNewLine ?? false,
          closeLabel: options.closeLabel,
          close(result) {
            if (done) return
            done = true
            signal?.removeEventListener('abort', onAbort)
            resolve(result)
            if (current === entry) {
              advance()
              return
            }
            const i = waiting.indexOf(entry)
            if (i >= 0) waiting.splice(i, 1)
          },
        }
        signal?.addEventListener('abort', onAbort, { once: true })
        if (current) {
          waiting.push(entry)
        } else {
          current = entry
          notify()
        }
      })
    },
    dismiss() {
      current?.close('dismiss')
    },
    clear() {
      for (const entry of waiting.splice(0)) entry.close('cancel')
      current?.close('cancel')
    },
    get current() {
      return current
    },
    get pending() {
      return waiting.length
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
