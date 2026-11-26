'use client'
// Organismo interactivo (ADR-0003): RichTooltip guarda si está visible y lo comparte por contexto
// con el disparador y el contenido; las partes se registran para que el contenido sepa si tiene
// subtítulo (su nombre), texto (su descripción) y acciones (que lo vuelven un diálogo no modal).
// Estado, efectos, contexto y eventos: todas las partes son cliente, como en el Menu.
//
// Dos patrones según el contenido (ADR-0021):
// - Sin acciones: un tooltip (`role="tooltip"`, descripción del disparador), con el mismo
//   comportamiento que el plain (puntero con demora, foco, Escape, uno a la vez).
// - Con acciones (`RichTooltipActions`): contenido interactivo, que APG no admite en un tooltip.
//   Es un diálogo no modal (`role="dialog"`) que se abre y se cierra con un clic (o Enter y
//   Espacio) en el disparador, como el tooltip persistente de Compose y de material-components-web.

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  use,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react'
import { cx } from '../../internal/interactive.tsx'
import { mergeRefs } from '../../internal/merge-refs.ts'
import {
  anchorNameFor,
  joinList,
  useCoordinator,
  useOpenState,
  usePopover,
  useTransientTriggers,
  type OpenStateProps,
} from './tooltip-behavior.ts'

type Part = 'subhead' | 'supporting' | 'actions'

interface RichTooltipContextValue {
  open: boolean
  /** Tiene acciones: diálogo no modal que se abre con un clic. */
  persistent: boolean
  parts: Record<Part, number>
  register: (part: Part) => () => void
  triggerRef: RefObject<HTMLElement | null>
  contentRef: RefObject<HTMLDivElement | null>
  triggerId: string | undefined
  setTriggerId: (id: string | undefined) => void
  generatedTriggerId: string
  contentId: string
  subheadId: string
  supportingId: string
  anchorName: string
}

const RichTooltipContext = createContext<RichTooltipContextValue | null>(null)

function useRichTooltip(part: string): RichTooltipContextValue {
  const ctx = use(RichTooltipContext)
  if (!ctx) throw new Error(`${part} tiene que estar dentro de un <RichTooltip>.`)
  return ctx
}

/** Registra una parte mientras está montada. */
function usePart(part: Part, register: (part: Part) => () => void) {
  useLayoutEffect(() => register(part), [part, register])
}

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]'

/** Elementos del contenido alcanzables con Tab, en orden. */
function tabbables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(TABBABLE)].filter((el) => el.tabIndex >= 0 && el.checkVisibility())
}

/**
 * Con acciones: el disparador alterna el diálogo con un clic (Enter y Espacio en un botón también
 * llegan como clic); un clic afuera lo cierra sin mover el foco; Escape lo cierra y, si el foco
 * estaba adentro, lo devuelve al disparador; Tab desde el disparador entra a la primera acción,
 * Mayús+Tab desde la primera vuelve al disparador y Tab desde la última sigue después del
 * disparador (el diálogo se cierra). Si el foco se va a otro lado, se cierra.
 */
function usePersistentTriggers(
  enabled: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLDivElement | null>,
  setOpen: (open: boolean) => void,
  isOpenNow: () => boolean,
) {
  useEffect(() => {
    const trigger = triggerRef.current
    const content = contentRef.current
    if (!enabled || !trigger || !content) return

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return
      setOpen(!isOpenNow())
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!isOpenNow()) return
      const target = e.target as Node | null
      if (target && (trigger.contains(target) || content.contains(target))) return
      setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !isOpenNow()) return
      e.preventDefault()
      e.stopPropagation()
      if (content.contains(document.activeElement)) trigger.focus()
      setOpen(false)
    }
    const onTriggerKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || e.shiftKey || !isOpenNow()) return
      const first = tabbables(content)[0]
      if (!first) return
      e.preventDefault()
      first.focus()
    }
    const onContentKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const list = tabbables(content)
      if (e.shiftKey) {
        if (document.activeElement !== list[0]) return
        e.preventDefault()
        trigger.focus()
        return
      }
      if (document.activeElement !== list.at(-1)) return
      // Como el Menu: el foco pasa al disparador y el Tab del navegador (sin preventDefault)
      // sigue desde ahí. `inert` saca enseguida al contenido (que puede estar justo después del
      // disparador en el documento) del recorrido, sin esperar la salida animada.
      content.inert = true
      trigger.focus()
      setOpen(false)
    }
    const onFocusOut = (e: FocusEvent) => {
      const to = e.relatedTarget as Node | null
      // Sin destino (clic en un lugar no enfocable): lo decide el clic afuera.
      if (!to || trigger.contains(to) || content.contains(to)) return
      setOpen(false)
    }

    trigger.addEventListener('click', onClick)
    trigger.addEventListener('keydown', onTriggerKeyDown)
    trigger.addEventListener('focusout', onFocusOut)
    content.addEventListener('keydown', onContentKeyDown)
    content.addEventListener('focusout', onFocusOut)
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      trigger.removeEventListener('click', onClick)
      trigger.removeEventListener('keydown', onTriggerKeyDown)
      trigger.removeEventListener('focusout', onFocusOut)
      content.removeEventListener('keydown', onContentKeyDown)
      content.removeEventListener('focusout', onFocusOut)
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [enabled, triggerRef, contentRef, setOpen, isOpenNow])
}

export interface RichTooltipProps extends OpenStateProps {
  children?: ReactNode
}

/**
 * Rich tooltip de Material 3: subtítulo, texto y acciones opcionales. No dibuja ningún elemento:
 * agrupa el disparador (`RichTooltipTrigger`) y el contenido (`RichTooltipContent`).
 *
 * ```tsx
 * <RichTooltip>
 *   <RichTooltipTrigger><IconButton label="Ayuda"><HelpIcon /></IconButton></RichTooltipTrigger>
 *   <RichTooltipContent>
 *     <RichTooltipSubhead>Copias automáticas</RichTooltipSubhead>
 *     <RichTooltipSupporting>Se guardan cada noche en tu cuenta.</RichTooltipSupporting>
 *     <RichTooltipActions><Button variant="text" size="sm">Configurar</Button></RichTooltipActions>
 *   </RichTooltipContent>
 * </RichTooltip>
 * ```
 *
 * - **Sin acciones** es un tooltip: describe al disparador (`aria-describedby`) y aparece y se
 *   oculta como el plain (`Tooltip`).
 * - **Con acciones** es un diálogo no modal (`role="dialog"`, con el subtítulo como nombre): un
 *   clic en el disparador lo abre y lo cierra (`aria-expanded`); Tab entra a las acciones desde el
 *   disparador; Escape lo cierra y devuelve el foco al disparador; un clic afuera o llevar el foco
 *   a otro lado lo cierran.
 */
export function RichTooltip({ open, defaultOpen, onOpenChange, children }: RichTooltipProps) {
  const { isOpen, setOpen, isOpenNow } = useOpenState({ open, defaultOpen, onOpenChange })
  const [parts, setParts] = useState<Record<Part, number>>({ subhead: 0, supporting: 0, actions: 0 })
  const [triggerId, setTriggerId] = useState<string | undefined>(undefined)
  const triggerRef = useRef<HTMLElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const id = useId()
  const persistent = parts.actions > 0

  const register = useCallback((part: Part) => {
    setParts((p) => ({ ...p, [part]: p[part] + 1 }))
    return () => setParts((p) => ({ ...p, [part]: p[part] - 1 }))
  }, [])

  useCoordinator(isOpen, persistent, setOpen)
  usePopover(isOpen, contentRef, triggerRef)
  useTransientTriggers(!persistent, triggerRef, contentRef, setOpen, isOpenNow)
  usePersistentTriggers(persistent, triggerRef, contentRef, setOpen, isOpenNow)

  const ctx = useMemo<RichTooltipContextValue>(
    () => ({
      open: isOpen,
      persistent,
      parts,
      register,
      triggerRef,
      contentRef,
      triggerId,
      setTriggerId,
      generatedTriggerId: `${id}trigger`,
      contentId: `${id}tooltip`,
      subheadId: `${id}subhead`,
      supportingId: `${id}supporting`,
      anchorName: anchorNameFor(id),
    }),
    [id, isOpen, persistent, parts, register, triggerId],
  )

  return <RichTooltipContext value={ctx}>{children}</RichTooltipContext>
}

interface TriggerChildProps {
  id?: string | undefined
  style?: CSSProperties | undefined
  ref?: Ref<HTMLElement> | undefined
  'aria-describedby'?: string | undefined
}

export interface RichTooltipTriggerProps {
  /**
   * El disparador: un único elemento que pase `id`, `style`, `ref` y los `aria-*` a su elemento
   * interactivo (IconButton, Button, los chips, `Interactive`). Con acciones, tiene que ser un
   * botón: se abre con su clic.
   */
  children: ReactElement<TriggerChildProps>
}

/**
 * Convierte el hijo en el disparador del rich tooltip, sin agregar elementos: le suma un `id` (si
 * no tiene uno), la `ref`, el `anchor-name` con el que el tooltip se ubica a su lado y, sin
 * acciones, `aria-describedby`; con acciones, `aria-haspopup="dialog"`, `aria-expanded` y
 * `aria-controls`. Un `onClick` propio que llama a `preventDefault()` evita que se abra o cierre.
 */
export function RichTooltipTrigger({ children }: RichTooltipTriggerProps) {
  const ctx = useRichTooltip('RichTooltipTrigger')
  const child = Children.only(children)
  if (!isValidElement<TriggerChildProps>(child)) {
    throw new Error('RichTooltipTrigger espera un único elemento hijo, por ejemplo un <IconButton>.')
  }
  const { id: ownId, style, ref } = child.props
  const id = ownId ?? ctx.generatedTriggerId
  const { setTriggerId } = ctx

  useLayoutEffect(() => {
    setTriggerId(id)
    return () => setTriggerId(undefined)
  }, [id, setTriggerId])

  const mergedRef = useMemo(() => mergeRefs<HTMLElement>(ref, ctx.triggerRef), [ref, ctx.triggerRef])

  return cloneElement(child, {
    id,
    ref: mergedRef,
    style: { ...style, anchorName: joinList(', ', style?.anchorName, ctx.anchorName) },
    ...(ctx.persistent
      ? { 'aria-haspopup': 'dialog', 'aria-expanded': ctx.open, 'aria-controls': ctx.contentId }
      : { 'aria-describedby': joinList(' ', child.props['aria-describedby'], ctx.contentId) }),
  } as Partial<TriggerChildProps> & Record<`aria-${string}`, unknown>)
}

export interface RichTooltipContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Referencia al contenedor (el popover). */
  ref?: Ref<HTMLDivElement> | undefined
}

/**
 * El rich tooltip: un popover (`popover="manual"`, en la capa superior) arriba del disparador y
 * centrado, o debajo si arriba no entra, dentro de la ventana. Hasta 312 px de ancho (kit). Está
 * siempre montado y oculto mientras está cerrado (así la descripción existe aunque no se vea). Las
 * props nativas, `className`, `style` y `ref` llegan al contenedor.
 */
export function RichTooltipContent({ className, style, children, ref, ...props }: RichTooltipContentProps) {
  const ctx = useRichTooltip('RichTooltipContent')
  const mergedRef = useMemo(() => mergeRefs<HTMLDivElement>(ref, ctx.contentRef), [ref, ctx.contentRef])
  const roleProps = ctx.persistent
    ? {
        role: 'dialog',
        // Enfocable por script y por clic (no con Tab): un clic en el texto deja el foco adentro y
        // no en el body, así llevar el foco afuera después lo cierra.
        tabIndex: -1,
        'aria-labelledby': ctx.parts.subhead > 0 ? ctx.subheadId : ctx.triggerId,
        'aria-describedby': ctx.parts.supporting > 0 ? ctx.supportingId : undefined,
      }
    : { role: 'tooltip' }
  return (
    <div
      {...roleProps}
      {...props}
      ref={mergedRef}
      id={ctx.contentId}
      popover="manual"
      className={cx('mk-tooltip mk-rich-tooltip', className)}
      data-actions={ctx.persistent ? '' : undefined}
      style={{ ...style, '--_anchor': ctx.anchorName } as CSSProperties}
    >
      {children}
    </div>
  )
}

export interface RichTooltipPartProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement> | undefined
}

/** Subtítulo (Title Small). Con acciones, es el nombre del diálogo. */
export function RichTooltipSubhead({ className, ...props }: RichTooltipPartProps) {
  const ctx = useRichTooltip('RichTooltipSubhead')
  usePart('subhead', ctx.register)
  return <div id={ctx.subheadId} {...props} className={cx('mk-rich-tooltip-subhead', className)} />
}

/** Texto de apoyo (Body Medium). Con acciones, es la descripción del diálogo. */
export function RichTooltipSupporting({ className, ...props }: RichTooltipPartProps) {
  const ctx = useRichTooltip('RichTooltipSupporting')
  usePart('supporting', ctx.register)
  return <div id={ctx.supportingId} {...props} className={cx('mk-rich-tooltip-supporting', className)} />
}

/**
 * Fila de acciones: botones de texto (en el kit, `Button variant="text" size="sm"`). Su presencia
 * convierte el rich tooltip en un diálogo no modal que se abre con un clic.
 */
export function RichTooltipActions({ className, ...props }: RichTooltipPartProps) {
  const ctx = useRichTooltip('RichTooltipActions')
  usePart('actions', ctx.register)
  return <div {...props} className={cx('mk-rich-tooltip-actions', className)} />
}
