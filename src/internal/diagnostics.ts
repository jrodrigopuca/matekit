// Módulo universal (ADR-0003, ADR-0028): sin 'use client' ni `window`, para que los componentes
// universales también puedan lanzar sus errores en el servidor. Interno salvo `MatekitError` y los
// tipos de código, que se reexportan desde src/index.ts.
//
// Todo aviso o error de matekit pasa por acá, con un formato único que sirve al dev, a quien depura
// y a un agente que lo busca en el catálogo (docs/diagnostics.md):
//
//   [matekit] <Component>: <what happened>. Fix: <how to fix it>. (<CODE>)
//
// Los textos van en inglés (ADR-0028): son salida para quien usa la librería, como el catálogo; los
// comentarios y la documentación interna siguen en español.
//
// y un objeto estructurado `{ component, code, docs, ...detalles }` (segundo argumento de
// `console.warn`, o `details` del error).

import { isDevelopment } from './dev.ts'

/**
 * Códigos de error. Nombran la causa, no el componente, salvo que la causa exista en uno solo: el
 * componente va en `details.component`. Un código publicado no cambia de nombre (lo puede buscar una
 * app o un agente); cada uno tiene su entrada en docs/diagnostics.md (lo comprueba
 * tests/diagnostics.test.ts).
 */
export const MATEKIT_ERROR_CODES = [
  'MK_PART_OUTSIDE_PARENT',
  'MK_RENDER_NOT_ELEMENT',
  'MK_TRIGGER_NOT_ELEMENT',
  'MK_TOOLTIP_NO_TEXT',
  'MK_SNACKBAR_HOST_MISSING',
  'MK_SNACKBAR_DURATION_INVALID',
  'MK_INTERNAL_INVARIANT',
] as const

/** Códigos de aviso (solo en desarrollo), con las mismas reglas que los de error. */
export const MATEKIT_WARNING_CODES = ['MK_TAB_UNNAMED', 'MK_TOOLBAR_EXPAND_IGNORED', 'MK_NAVIGATION_TOO_MANY_DESTINATIONS'] as const

/** Código de un `MatekitError`: estable, para distinguir el error con `error.code`. */
export type MatekitErrorCode = (typeof MATEKIT_ERROR_CODES)[number]
/** Código de un aviso de matekit por consola (solo en desarrollo). */
export type MatekitWarningCode = (typeof MATEKIT_WARNING_CODES)[number]

/** Catálogo publicado; cada código es un título `## MK_…`, y GitHub arma el ancla en minúsculas. */
const CATALOG_URL = 'https://github.com/jrodrigopuca/matekit/blob/main/docs/diagnostics.md'

/** Enlace a la entrada del catálogo de un código. */
export function docsFor(code: MatekitErrorCode | MatekitWarningCode): string {
  return `${CATALOG_URL}#${code.toLowerCase()}`
}

/** Las partes del mensaje, en inglés. Sin punto final: el formato lo agrega. */
export interface DiagnosticMessage {
  /** Lo que escribió quien usa la librería (`DialogHeadline`, `useSnackbar`), no la pieza interna. */
  component: string
  /** Qué pasó. */
  problem: string
  /** Cómo arreglarlo, con el código concreto cuando se puede. */
  fix: string
}

/**
 * Datos de la ocurrencia, para depurar o para que un agente los lea sin interpretar el texto. Las
 * claves del formato quedan reservadas.
 */
export type DiagnosticDetails = { [key: string]: unknown } & { component?: never; code?: never; docs?: never }

/** El objeto estructurado de un aviso o error. */
export type DiagnosticInfo<C extends string = MatekitErrorCode | MatekitWarningCode> = Readonly<
  { component: string; code: C; docs: string } & Record<string, unknown>
>

const withoutPeriod = (text: string) => text.trim().replace(/\.+$/, '')

/** El texto con el formato único. */
export function formatDiagnostic(code: string, { component, problem, fix }: DiagnosticMessage): string {
  return `[matekit] ${component}: ${withoutPeriod(problem)}. Fix: ${withoutPeriod(fix)}. (${code})`
}

function info<C extends MatekitErrorCode | MatekitWarningCode>(
  code: C,
  component: string,
  details: DiagnosticDetails | undefined,
): DiagnosticInfo<C> {
  return { component, code, docs: docsFor(code), ...details }
}

/**
 * Error de matekit: un uso que no puede funcionar (o, con `MK_INTERNAL_INVARIANT`, una falla de la
 * librería). `code` es estable; `details` trae el componente, el enlace al catálogo y los datos del
 * caso. Con varias copias del paquete, `instanceof` puede fallar: `error.name === 'MatekitError'` o
 * `error.code` no dependen de la copia.
 */
export class MatekitError extends Error {
  override name = 'MatekitError'
  readonly code: MatekitErrorCode
  readonly details: DiagnosticInfo<MatekitErrorCode>

  constructor(code: MatekitErrorCode, message: string, details: DiagnosticInfo<MatekitErrorCode>) {
    super(message)
    this.code = code
    this.details = details
  }
}

/**
 * Crea (no lanza) el error: se usa como `throw mkError(…)`, así el `throw` queda a la vista en el
 * componente y TypeScript corta el flujo ahí sin depender de un tipo `never`. Siempre, también en
 * producción: el uso no funciona en ningún modo.
 */
export function mkError(code: MatekitErrorCode, message: DiagnosticMessage, details?: DiagnosticDetails): MatekitError {
  return new MatekitError(code, formatDiagnostic(code, message), info(code, message.component, details))
}

// Deduplicación de avisos. Por clave de objeto (una instancia: una ref, un objeto propio) en un
// WeakSet, que el recolector libera con la instancia; sin clave, por el texto del aviso, como React.
// El texto no lleva valores sin cota (van en `details`), así que el Set queda acotado.
const warnedObjects = new WeakSet<object>()
const warnedMessages = new Set<string>()

export interface WarnOptions {
  /**
   * Una vez por esta clave (por ejemplo un objeto de `useRef` por instancia). Sin ella, una vez por
   * texto: alcanza para los componentes universales, que no tienen dónde guardar una instancia.
   */
  once?: object | undefined
}

/**
 * Aviso por consola de un uso que funciona pero está mal (accesibilidad, un pedido ignorado). Solo en
 * desarrollo (`isDevelopment()`) y una vez. Devuelve si avisó.
 */
export function mkWarn(
  code: MatekitWarningCode,
  message: DiagnosticMessage,
  details?: DiagnosticDetails,
  options?: WarnOptions,
): boolean {
  if (!isDevelopment()) return false
  const text = formatDiagnostic(code, message)
  const key = options?.once
  if (key ? warnedObjects.has(key) : warnedMessages.has(text)) return false
  if (key) warnedObjects.add(key)
  else warnedMessages.add(text)
  console.warn(text, info(code, message.component, details))
  return true
}

// Errores que comparten varios componentes: el texto se arma en un solo lugar para que sea igual en
// todos.

/** Una parte que lee el contexto de su componente (`DialogHeadline` sin `<Dialog>`). */
export function partOutsideParent(part: string, parent: string): MatekitError {
  return mkError(
    'MK_PART_OUTSIDE_PARENT',
    {
      component: part,
      problem: `was rendered outside a <${parent}>; its parts read the component state from context`,
      fix: `render it inside <${parent}>…</${parent}>; if it lives in another component, render that component inside the <${parent}>`,
    },
    { parent },
  )
}

/** Un disparador que envuelve a su hijo y le pasa props y `ref` (`Tooltip`, `MenuTrigger`). */
export function triggerNotElement(component: string, received: unknown): MatekitError {
  return mkError(
    'MK_TRIGGER_NOT_ELEMENT',
    {
      component,
      problem: 'expects a single element child to act as the trigger',
      fix: `pass exactly one element that accepts a ref, for example <${component}><IconButton label="More">…</IconButton></${component}>; several children, text or nothing will not work`,
    },
    { received: Array.isArray(received) ? 'array' : typeof received },
  )
}

/** `render` con algo que no es un elemento de React (ADR-0010, ADR-0020). */
export function renderNotElement(component: string, received: unknown, example: string): MatekitError {
  return mkError(
    'MK_RENDER_NOT_ELEMENT',
    {
      component,
      problem: '`render` received something that is not a React element',
      fix: `pass an element, for example ${example}, not the component itself (render={Link}) or a string`,
    },
    { received: typeof received },
  )
}
