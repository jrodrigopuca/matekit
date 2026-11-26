'use client'
// Organismo interactivo (ADR-0003): el tooltip guarda si está visible, escucha el puntero, el foco
// y el teclado del disparador con demoras (temporizadores) y se coordina con los demás para que
// haya uno solo a la vez. Todo eso necesita estado, efectos y eventos, así que es cliente, como
// el Menu. El disparador puede ser universal (IconButton, Button, un chip, Interactive): el
// tooltip solo le suma atributos y una `ref`.
//
// Posicionamiento: CSS anchor positioning con el respaldo compartido con el Menu
// (src/internal/anchor-position.ts, ADR-0007). Decisiones: ADR-0021.

import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  useMemo,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
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

/** Props del disparador que el tooltip lee o combina. */
interface TriggerProps {
  label?: string | undefined
  'aria-label'?: string | undefined
  'aria-describedby'?: string | undefined
  children?: ReactNode
  style?: CSSProperties | undefined
  ref?: Ref<HTMLElement> | undefined
  [key: string]: unknown
}

export interface TooltipProps extends OpenStateProps, Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /**
   * Texto que describe el control, distinto de su nombre: queda como su descripción accesible
   * (`aria-describedby`), que se anuncia después del nombre. Sin `text`, el tooltip muestra el
   * nombre del disparador (su `label`, su `aria-label` o su texto) y no se vincula: el nombre ya
   * llega por el propio control, así que el lector de pantalla no lo repite.
   */
  text?: string | undefined
  /**
   * El disparador: un único elemento que pase `ref`, `style` y los `aria-*` a su elemento
   * interactivo (IconButton, Button, los chips, `Interactive` y los elementos nativos lo hacen).
   */
  children: ReactElement<TriggerProps>
  /** Llega al disparador, combinada con la del hijo. */
  ref?: Ref<HTMLElement> | undefined
}

/** Texto plano de los hijos de primer nivel (`'Texto'` o `[<Icono />, 'Texto']`). */
function plainText(children: ReactNode): string {
  return Children.toArray(children)
    .filter((c) => typeof c === 'string' || typeof c === 'number')
    .join('')
    .trim()
}

const isHandler = (key: string) => /^on[A-Z]/.test(key)

/**
 * Plain tooltip de Material 3: un texto breve sobre el control al que se refiere, típicamente un
 * IconButton. No dibuja ningún elemento alrededor del disparador: le suma los atributos y la
 * `ref`, y dibuja el tooltip (un popover con `role="tooltip"`) a continuación.
 *
 * ```tsx
 * <Tooltip><IconButton label="Más opciones"><MoreVertIcon /></IconButton></Tooltip>
 * <Tooltip text="Se guarda también en la nube"><Button>Guardar</Button></Tooltip>
 * ```
 *
 * - **Nombre o descripción:** sin `text` muestra el nombre del disparador (`label` de IconButton,
 *   `aria-label` o el texto, útil para el texto recortado de un chip) y queda oculto para los
 *   lectores de pantalla, que ya anuncian ese nombre. Con `text`, el tooltip es la descripción
 *   del disparador (`aria-describedby`): no repetir ahí el nombre.
 * - **Aparece** con el puntero tras 500 ms (o enseguida si ya hay otro tooltip visible) y con el
 *   foco de teclado; en táctil, con una pulsación larga. **Se oculta** 600 ms después de que el
 *   puntero sale del disparador y del tooltip (se puede pasar el puntero sobre él), al perder el
 *   foco, al presionar el disparador y con Escape, sin mover el foco. Uno solo a la vez.
 * - **Sin contenido interactivo:** para acciones, `RichTooltip` con `RichTooltipActions`.
 * - Las props nativas, `style` y `ref` llegan al disparador (combinadas con las suyas), así que se
 *   puede anidar con `MenuTrigger`: `<MenuTrigger><Tooltip><IconButton … /></Tooltip></MenuTrigger>`.
 */
export function Tooltip({ text, open, defaultOpen, onOpenChange, children, ref, ...outer }: TooltipProps) {
  const child = Children.only(children)
  if (!isValidElement<TriggerProps>(child)) {
    throw new Error('Tooltip espera un único elemento hijo, por ejemplo un <IconButton>.')
  }
  const own = child.props
  const name = own.label ?? own['aria-label'] ?? (outer['aria-label'] as string | undefined) ?? plainText(own.children)
  const shown = text ?? name
  if (!shown) {
    throw new Error(
      'Tooltip sin `text` muestra el nombre del disparador, pero este no tiene `label`, `aria-label` ni texto propio. Pasá `text`, o el nombre al disparador.',
    )
  }

  const { isOpen, setOpen, isOpenNow } = useOpenState({ open, defaultOpen, onOpenChange })
  const id = useId()
  const contentId = `${id}tooltip`
  const anchorName = anchorNameFor(id)
  const triggerRef = useRef<HTMLElement | null>(null)
  const contentRef = useRef<HTMLSpanElement | null>(null)

  useCoordinator(isOpen, false, setOpen)
  usePopover(isOpen, contentRef, triggerRef)
  useTransientTriggers(true, triggerRef, contentRef, setOpen, isOpenNow)

  const mergedRef = useMemo(() => mergeRefs<HTMLElement>(own.ref, ref, triggerRef), [own.ref, ref])

  // Las props que llegan al Tooltip (por ejemplo de un MenuTrigger que lo envuelve) son para el
  // disparador y ganan, salvo las que se combinan: manejadores (primero el del hijo), estilo
  // (los nombres de ancla se suman) y aria-describedby.
  const merged: Record<string, unknown> = { ...outer }
  for (const [key, value] of Object.entries(outer)) {
    const mine = own[key]
    if (isHandler(key) && typeof value === 'function' && typeof mine === 'function') {
      merged[key] = (...args: unknown[]) => {
        mine(...args)
        value(...args)
      }
    }
  }
  const outerStyle = outer.style
  const style: CSSProperties = {
    ...own.style,
    ...outerStyle,
    anchorName: joinList(', ', own.style?.anchorName, outerStyle?.anchorName, anchorName),
  }

  const trigger = cloneElement(child, {
    ...merged,
    ref: mergedRef,
    style,
    'aria-describedby': joinList(
      ' ',
      own['aria-describedby'],
      outer['aria-describedby'] as string | undefined,
      text === undefined ? undefined : contentId,
    ),
  })

  return (
    <>
      {trigger}
      {/* <span> y no <div>: el tooltip puede quedar dentro de un párrafo. */}
      <span
        ref={contentRef}
        id={contentId}
        role="tooltip"
        // Sin `text` repite el nombre que el disparador ya anuncia: solo visual.
        aria-hidden={text === undefined ? true : undefined}
        popover="manual"
        className="mk-tooltip mk-plain-tooltip"
        style={{ '--_anchor': anchorName } as CSSProperties}
      >
        {shown}
      </span>
    </>
  )
}
