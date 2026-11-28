'use client'
// Organismo interactivo (ADR-0003, ADR-0029): un <dialog> abierto con showModal() (efecto), con la
// base modal común de Dialog y los sheets (src/internal/modal-dialog.ts, ADR-0025): foco atrapado,
// página inerte, Escape y scrim que avisan con onClose, Tab que da la vuelta, salida animada con
// settleAnimations y foco devuelto. Lo propio del rail: el <nav> del rail expandido adentro (las
// mismas partes y el mismo CSS que NavigationRail), el foco inicial en el destino actual y el cierre
// al elegir un destino. ModalNavigationRailClose lee el cierre por contexto, por eso es cliente.
//
// Arrastrar para cerrar (como ModalWideNavigationRail con hideOnCollapse, que lo habilita con
// anchoredDraggable): eventos de puntero sobre el <dialog>; el gesto pasa al rail solo si, al pasar
// los 8 px, es horizontal y hacia el borde de inicio (así no le quita al contenido el desplazamiento
// vertical ni, con mouse, la selección de texto); al soltar decide con computeTarget
// (src/internal/anchored-drag.ts, compartido con el BottomSheet) y los umbrales de Compose para el
// rail: la mitad del ancho o 125 px/s. Cerrar se pide a onClose; si el padre no cierra, vuelve. El
// táctil no necesita un `touchmove` no pasivo: `touch-action: pan-y pinch-zoom` deja el gesto
// horizontal a los eventos de puntero (modal-navigation-rail.css).
//
// Es un componente aparte y no una prop `modal` de NavigationRail: el rail sigue universal (sin
// 'use client'), y el modal comparte con él solo las partes (NavigationRailHeader,
// NavigationRailItem…), que son universales.
//
// Compose: ModalWideNavigationRail con hideOnCollapse (entra desde fuera de la pantalla), en
// compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/WideNavigationRail.kt
// (commit de12189a63, 2026-11-11). Ver modal-navigation-rail.css y 07-jetpack-compose.md.

import {
  createContext,
  use,
  useMemo,
  useRef,
  type ButtonHTMLAttributes,
  type DialogHTMLAttributes,
  type DragEvent,
  type MouseEvent,
  type PointerEvent,
  type Ref,
} from 'react'
import { IconButton } from '../../molecules/IconButton/IconButton.tsx'
import { MenuOpenIcon } from '../../icons/icons.tsx'
import { useModalDialog, onScrim } from '../../internal/modal-dialog.ts'
import { computeTarget, DRAG_SLOP, VELOCITY_THRESHOLD, VelocityTracker } from '../../internal/anchored-drag.ts'
import { partOutsideParent } from '../../internal/diagnostics.ts'
import { cx } from '../../internal/interactive.tsx'
import type { NavigationRailAlign } from './NavigationRail.tsx'
import { modalNavigationRailStrings } from './strings.ts'

interface ModalNavigationRailContextValue {
  requestClose: () => void
}

const ModalNavigationRailContext = createContext<ModalNavigationRailContextValue | null>(null)

const ITEM = '.mk-navigation-rail-item'
const CURRENT = `${ITEM}[aria-current]:not([aria-current='false'])`

/** Campos donde un arrastre con mouse selecciona texto: no arrastran el rail. */
const FIELD = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

/**
 * Umbral de distancia del rail en Compose: la mitad del recorrido (ModalWideNavigationRailContent,
 * `positionalThreshold = { distance -> distance * 0.5f }`). El de velocidad es el de
 * AnchoredDraggable, 125 px/s, igual que el del BottomSheet.
 */
const POSITIONAL_FRACTION = 0.5

interface Drag {
  id: number
  mouse: boolean
  startX: number
  startY: number
  /** -1 si el borde de inicio está a la izquierda (LTR), 1 si a la derecha (RTL). */
  dir: number
  width: number
  /** Distancia arrastrada hacia el borde, de 0 (abierto) al ancho (escondido). */
  offset: number
  active: boolean
  tracker: VelocityTracker
}

/** Clic que el navegador manda a otra pestaña o ventana: no cierra el rail. */
const opensElsewhere = (e: MouseEvent) => e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey

export interface ModalNavigationRailProps extends Omit<DialogHTMLAttributes<HTMLDialogElement>, 'open' | 'onClose'> {
  /** Abierto o cerrado. Lo controla la aplicación (por ejemplo, con el botón de menú). Por defecto cerrado. */
  open?: boolean | undefined
  /**
   * El usuario pidió cerrar: Escape, el clic en el scrim, `ModalNavigationRailClose`, arrastrar el
   * rail hacia el borde (más de la mitad de su ancho, o rápido), un cierre del navegador o, con
   * `closeOnSelect`, elegir un destino. El rail es controlado: el padre tiene que
   * pasar `open={false}`.
   */
  onClose?: (() => void) | undefined
  /**
   * Si elegir un destino (`NavigationRailItem`) pide cerrar. Por defecto `true`: al navegar, el rail
   * deja ver la página nueva. No cuenta un clic que abre otra pestaña (con Ctrl, Cmd, Mayúsculas o
   * Alt, o con el botón del medio) ni un destino con `aria-disabled`. Con `false`, la aplicación
   * cierra cuando quiera (como en Compose, donde el cierre lo pide el `onClick` del destino).
   */
  closeOnSelect?: boolean | undefined
  /** Si el clic en el scrim pide cerrar. Por defecto `true`. */
  closeOnScrimClick?: boolean | undefined
  /**
   * Nombre accesible del diálogo (su `aria-label`). Por defecto "Navigation rail". Con
   * `aria-labelledby`, gana este.
   */
  label?: string | undefined
  'aria-label'?: never
  /** Alineación de los destinos, como en `NavigationRail`. Por defecto `top`. */
  align?: NavigationRailAlign | undefined
  /** Referencia al `<dialog>` nativo. */
  ref?: Ref<HTMLDialogElement> | undefined
}

/**
 * Variante modal del NavigationRail: el rail expandido sobre el contenido, desde el borde de inicio
 * (en RTL, el derecho), de alto completo, con scrim y foco atrapado. Es el `ModalWideNavigationRail`
 * de Compose que entra desde fuera de la pantalla, el reemplazo Expressive del navigation drawer:
 * para pantallas chicas con más destinos de los que entran en una barra, o para expandir un rail
 * contraído sin correr el contenido.
 *
 * ```tsx
 * const [open, setOpen] = useState(false)
 *
 * <IconButton label="Open navigation" aria-haspopup="dialog" onClick={() => setOpen(true)}>
 *   <MenuIcon />
 * </IconButton>
 * <ModalNavigationRail open={open} onClose={() => setOpen(false)}>
 *   <NavigationRailHeader>
 *     <ModalNavigationRailClose />
 *   </NavigationRailHeader>
 *   <NavigationRailItem href="/" active>
 *     <NavigationRailItemIcon><HomeIcon filled /></NavigationRailItemIcon>
 *     <NavigationRailItemLabel>Inicio</NavigationRailItemLabel>
 *   </NavigationRailItem>
 *   …
 * </ModalNavigationRail>
 * ```
 *
 * - **Contenido:** las partes del `NavigationRail` expandido (`NavigationRailHeader`,
 *   `NavigationRailItem`, `NavigationRailItemIcon`, `NavigationRailItemLabel`, `Badge`), dentro de
 *   un `<nav>`. También cualquier otro contenido (un título, un filtro, encabezados de grupo).
 * - **Foco:** al abrir, el destino actual (`active`); si no hay, el elemento con `data-autofocus`
 *   o el primer enfocable. Tab da la vuelta adentro. Al cerrar, vuelve a quien lo tenía (el botón
 *   de menú).
 * - **Cierre:** Escape, el scrim, `ModalNavigationRailClose`, arrastrar hacia el borde (sigue al
 *   puntero; al soltar cierra si pasó la mitad del ancho o iba rápido, y si el padre no cierra
 *   vuelve) y, con `closeOnSelect` (por defecto), elegir un destino: todos llaman a `onClose`.
 * - **Destinos:** sin límite: si no entran a lo alto, el rail se desplaza en vertical (no avisa nunca).
 *   Es donde van los destinos que no entran en una `NavigationBar` o un rail contraído.
 * - **Medidas:** el ancho del rail expandido (220, `--mk-navigation-rail-expanded-width` hasta 360),
 *   sin pasar de la ventana menos 48 (para tocar el scrim y cerrar); `surface-container` con radio
 *   16 del lado del contenido (contra el borde, 0). Suma las zonas seguras arriba, abajo y del lado
 *   del borde.
 *
 * Las props nativas, `className`, `style` y `ref` llegan al `<dialog>`.
 */
export function ModalNavigationRail({
  open = false,
  onClose,
  closeOnSelect = true,
  closeOnScrimClick = true,
  label = modalNavigationRailStrings.label,
  align = 'top',
  className,
  children,
  ref,
  onCancel,
  onClick,
  onKeyDown,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onClickCapture,
  onDragStart,
  ...props
}: ModalNavigationRailProps) {
  const drag = useRef<Drag | null>(null)
  // El clic que el navegador manda al terminar un arrastre con mouse no elige el destino de abajo.
  const swallowClick = useRef(false)

  const clearDrag = (dialog: HTMLDialogElement) => {
    dialog.removeAttribute('data-dragging')
    dialog.removeAttribute('data-released')
    dialog.style.removeProperty('--_drag')
  }

  const modal = useModalDialog({
    open,
    onClose,
    closeOnScrimClick,
    ref,
    contentSelector: '.mk-navigation-rail',
    // El foco inicial va al destino actual (como el menú de páginas de una app); data-autofocus,
    // que el hook enfoca después, le gana.
    onOpen: (dialog) => {
      drag.current = null
      clearDrag(dialog)
      dialog.querySelector<HTMLElement>(CURRENT)?.focus()
    },
    onClosed: (dialog) => {
      drag.current = null
      clearDrag(dialog)
    },
    onCancel,
    onKeyDown,
    onPointerDown: (e) => {
      onPointerDown?.(e)
      swallowClick.current = false
      const dialog = e.currentTarget
      if (e.defaultPrevented || !e.isPrimary || e.button !== 0 || drag.current) return
      if (dialog.hasAttribute('data-closing') || onScrim(dialog, e)) return
      const mouse = e.pointerType === 'mouse'
      if (mouse && (e.target as Element).closest(FIELD)) return
      const dir = getComputedStyle(dialog).direction === 'rtl' ? 1 : -1
      const tracker = new VelocityTracker()
      tracker.add(performance.now(), dir * e.clientX)
      drag.current = {
        id: e.pointerId,
        mouse,
        startX: e.clientX,
        startY: e.clientY,
        dir,
        width: dialog.getBoundingClientRect().width,
        offset: 0,
        active: false,
        tracker,
      }
    },
    onClick: (e) => {
      onClick?.(e)
      if (!closeOnSelect || opensElsewhere(e) || !(e.target instanceof Element)) return
      const item = e.target.closest(ITEM)
      if (!item || !e.currentTarget.contains(item) || item.matches("[aria-disabled='true'], :disabled")) return
      modal.requestClose()
    },
  })
  const handlePointerMove = (e: PointerEvent<HTMLDialogElement>) => {
    onPointerMove?.(e)
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dialog = e.currentTarget
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.active) {
      if (Math.hypot(dx, dy) < DRAG_SLOP) return
      // Solo un gesto horizontal hacia el borde es del rail: uno vertical desplaza los destinos y,
      // con mouse, uno hacia el contenido sigue seleccionando texto.
      if (Math.abs(dx) <= Math.abs(dy) || Math.sign(dx) !== d.dir) {
        drag.current = null
        return
      }
      d.active = true
      // Sigue al puntero desde acá, sin el salto del umbral.
      d.startX = e.clientX
      try {
        dialog.setPointerCapture(e.pointerId)
      } catch {
        // NotFoundError: un evento sintético, sin puntero activo detrás.
      }
      // Con mouse, el gesto pudo empezar una selección de texto: ya no es una selección.
      if (d.mouse) dialog.ownerDocument.getSelection()?.removeAllRanges()
      dialog.setAttribute('data-dragging', '')
    }
    e.preventDefault()
    d.offset = Math.min(Math.max(d.dir * (e.clientX - d.startX), 0), d.width)
    d.tracker.add(performance.now(), d.dir * e.clientX)
    dialog.style.setProperty('--_drag', `${d.offset}px`)
  }

  const release = (dialog: HTMLDialogElement, velocity: number | null) => {
    const d = drag.current
    drag.current = null
    if (!d?.active) return
    // Con mouse, el gesto termina en un clic sobre el <dialog> (por la captura): ese no cuenta.
    swallowClick.current = d.mouse
    const target =
      velocity === null
        ? 'open'
        : computeTarget(
            [
              ['open', 0],
              ['closed', d.width],
            ],
            d.offset,
            velocity,
            d.width * POSITIONAL_FRACTION,
            VELOCITY_THRESHOLD,
            'ModalNavigationRail',
          )
    dialog.removeAttribute('data-dragging')
    if (target === 'open') {
      // Sin data-dragging vuelve la transición: del punto donde se soltó a su lugar.
      dialog.style.removeProperty('--_drag')
      return
    }
    // Cerrar se pide al padre. Si cierra, la salida parte del punto donde se soltó; si no, el rail
    // vuelve en el cuadro siguiente.
    // data-released: con movimiento reducido, la salida se funde en ese punto en vez de saltar.
    dialog.setAttribute('data-released', '')
    modal.requestClose()
    requestAnimationFrame(() => {
      if (!dialog.hasAttribute('data-closing')) clearDrag(dialog)
    })
  }

  const handlePointerUp = (e: PointerEvent<HTMLDialogElement>) => {
    onPointerUp?.(e)
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    release(e.currentTarget, d.active ? d.tracker.velocity(performance.now()) : 0)
  }

  const handlePointerCancel = (e: PointerEvent<HTMLDialogElement>) => {
    onPointerCancel?.(e)
    if (drag.current?.id !== e.pointerId) return
    release(e.currentTarget, null)
  }

  const handleClickCapture = (e: MouseEvent<HTMLDialogElement>) => {
    onClickCapture?.(e)
    if (!swallowClick.current) return
    swallowClick.current = false
    e.preventDefault()
    e.stopPropagation()
  }

  // Un destino es un enlace: con mouse, el navegador empezaría a arrastrar el enlace (y cancelaría
  // los eventos de puntero) antes de que el gesto se decida.
  const handleDragStart = (e: DragEvent<HTMLDialogElement>) => {
    onDragStart?.(e)
    if (drag.current) e.preventDefault()
  }

  const ctx = useMemo<ModalNavigationRailContextValue>(
    () => ({ requestClose: modal.requestClose }),
    // requestClose cambia con onClose.
    [onClose],
  )
  return (
    <ModalNavigationRailContext value={ctx}>
      <dialog
        {...props}
        {...modal.dialogProps}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClickCapture={handleClickCapture}
        onDragStart={handleDragStart}
        ref={modal.setRef}
        className={cx('mk-navigation-rail-modal', className)}
        aria-label={props['aria-labelledby'] ? undefined : label}
      >
        <nav className="mk-navigation-rail" data-expanded="true" data-variant="docked" data-align={align}>
          {children}
        </nav>
      </dialog>
    </ModalNavigationRailContext>
  )
}

export interface ModalNavigationRailCloseProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  /** Nombre accesible del botón (su `aria-label`). Por defecto "Close rail". */
  label?: string | undefined
  'aria-label'?: never
  ref?: Ref<HTMLButtonElement> | undefined
}

/**
 * Botón de menú del rail abierto, dentro de `NavigationRailHeader`: el icon button cuadrado de 56
 * del kit con `menu_open` (espejado en RTL, como el `AutoMirrored` de Compose). Llama a `onClose`
 * del `ModalNavigationRail`, salvo que el `onClick` propio llame a `preventDefault()`.
 */
export function ModalNavigationRailClose({
  label = modalNavigationRailStrings.closeLabel,
  className,
  onClick,
  ...props
}: ModalNavigationRailCloseProps) {
  const ctx = use(ModalNavigationRailContext)
  if (!ctx) throw partOutsideParent('ModalNavigationRailClose', 'ModalNavigationRail')
  return (
    <IconButton
      {...props}
      label={label}
      size="md"
      shape="square"
      className={cx('mk-navigation-rail-modal-close', className)}
      onClick={(e) => {
        onClick?.(e)
        if (!e.defaultPrevented) ctx.requestClose()
      }}
    >
      <MenuOpenIcon />
    </IconButton>
  )
}
