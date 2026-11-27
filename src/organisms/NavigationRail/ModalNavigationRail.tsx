'use client'
// Organismo interactivo (ADR-0003, ADR-0029): un <dialog> abierto con showModal() (efecto), con la
// base modal común de Dialog y los sheets (src/internal/modal-dialog.ts, ADR-0025): foco atrapado,
// página inerte, Escape y scrim que avisan con onClose, Tab que da la vuelta, salida animada con
// settleAnimations y foco devuelto. Lo propio del rail: el <nav> del rail expandido adentro (las
// mismas partes y el mismo CSS que NavigationRail), el foco inicial en el destino actual y el cierre
// al elegir un destino. ModalNavigationRailClose lee el cierre por contexto, por eso es cliente.
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
  type ButtonHTMLAttributes,
  type DialogHTMLAttributes,
  type MouseEvent,
  type Ref,
} from 'react'
import { IconButton } from '../../molecules/IconButton/IconButton.tsx'
import { MenuOpenIcon } from '../../icons/icons.tsx'
import { useModalDialog } from '../../internal/modal-dialog.ts'
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

/** Clic que el navegador manda a otra pestaña o ventana: no cierra el rail. */
const opensElsewhere = (e: MouseEvent) => e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey

export interface ModalNavigationRailProps extends Omit<DialogHTMLAttributes<HTMLDialogElement>, 'open' | 'onClose'> {
  /** Abierto o cerrado. Lo controla la aplicación (por ejemplo, con el botón de menú). Por defecto cerrado. */
  open?: boolean | undefined
  /**
   * El usuario pidió cerrar: Escape, el clic en el scrim, `ModalNavigationRailClose`, un cierre del
   * navegador o, con `closeOnSelect`, elegir un destino. El rail es controlado: el padre tiene que
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
 * - **Cierre:** Escape, el scrim, `ModalNavigationRailClose` y, con `closeOnSelect` (por defecto),
 *   elegir un destino: todos llaman a `onClose`.
 * - **Medidas:** el ancho del rail expandido (220, `--mk-navigation-rail-expanded-width` hasta 360),
 *   sin pasar de la ventana menos 48 (para tocar el scrim y cerrar); `surface-container` con radio
 *   16. Suma las zonas seguras arriba, abajo y del lado del borde.
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
  ...props
}: ModalNavigationRailProps) {
  const modal = useModalDialog({
    open,
    onClose,
    closeOnScrimClick,
    ref,
    contentSelector: '.mk-navigation-rail',
    // El foco inicial va al destino actual (como el menú de páginas de una app); data-autofocus,
    // que el hook enfoca después, le gana.
    onOpen: (dialog) => dialog.querySelector<HTMLElement>(CURRENT)?.focus(),
    onCancel,
    onKeyDown,
    onPointerDown,
    onClick: (e) => {
      onClick?.(e)
      if (!closeOnSelect || opensElsewhere(e) || !(e.target instanceof Element)) return
      const item = e.target.closest(ITEM)
      if (!item || !e.currentTarget.contains(item) || item.matches("[aria-disabled='true'], :disabled")) return
      modal.requestClose()
    },
  })
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
