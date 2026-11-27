import { createRef, useState } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'
import { HomeIcon, MenuIcon, SearchIcon, StarIcon } from '../../icons/icons.tsx'
import { Badge } from '../../molecules/Badge/Badge.tsx'
import { IconButton } from '../../molecules/IconButton/IconButton.tsx'
import { render, roleColor, style, withMotion } from '../../test/render.tsx'
import { CANCEL_WAYS, cancelExit, entered, withTransitions } from '../../test/exit.ts'
import { NavigationRailHeader, NavigationRailItem, NavigationRailItemIcon, NavigationRailItemLabel } from './NavigationRail.tsx'
import { ModalNavigationRail, ModalNavigationRailClose, type ModalNavigationRailProps } from './ModalNavigationRail.tsx'

const q = <T extends Element = HTMLElement>(c: ParentNode, sel: string) => {
  const el = c.querySelector(sel)
  if (!el) throw new Error(`no se encontró ${sel}`)
  return el as unknown as T
}
const rail = (c: ParentNode) => q<HTMLDialogElement>(c, '.mk-navigation-rail-modal')
const vw = () => document.documentElement.clientWidth
const vh = () => document.documentElement.clientHeight
const ms = (v: string) => (v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000)
const token = (name: string) => style(document.documentElement).getPropertyValue(name).trim()

function mixColor(role: string, percent: number): string {
  const probe = document.createElement('span')
  probe.style.color = `color-mix(in srgb, var(--md-sys-color-${role}) ${percent}%, transparent)`
  document.body.append(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value
}

type HarnessProps = Omit<ModalNavigationRailProps, 'open' | 'onClose'> & {
  initialOpen?: boolean
  onRequest?: () => void
  onNavigate?: (id: string) => void
  /** Si el padre cierra al recibir onClose (si no, el rail queda abierto: es controlado). */
  obey?: boolean
}

const DESTINATIONS = [
  { id: 'home', label: 'Inicio', Icon: HomeIcon },
  { id: 'favs', label: 'Favoritos', Icon: StarIcon },
  { id: 'search', label: 'Buscar', Icon: SearchIcon },
] as const

function Harness({ initialOpen = false, onRequest, onNavigate, obey = true, ...props }: HarnessProps) {
  const [open, setOpen] = useState(initialOpen)
  const [current, setCurrent] = useState('favs')
  return (
    <>
      <IconButton label="Abrir navegación" aria-haspopup="dialog" className="opener" onClick={() => setOpen(true)}>
        <MenuIcon />
      </IconButton>
      <ModalNavigationRail
        {...props}
        open={open}
        onClose={() => {
          onRequest?.()
          if (obey) setOpen(false)
        }}
      >
        <NavigationRailHeader>
          <ModalNavigationRailClose />
        </NavigationRailHeader>
        {DESTINATIONS.map((d) => (
          <NavigationRailItem
            key={d.id}
            href={`#${d.id}`}
            active={d.id === current}
            className={d.id}
            onClick={(e) => {
              e.preventDefault()
              setCurrent(d.id)
              onNavigate?.(d.id)
            }}
          >
            <NavigationRailItemIcon><d.Icon filled={d.id === current} /></NavigationRailItemIcon>
            <NavigationRailItemLabel>{d.label}</NavigationRailItemLabel>
            {d.id === 'search' && <Badge label="3 resultados nuevos">3</Badge>}
          </NavigationRailItem>
        ))}
      </ModalNavigationRail>
    </>
  )
}

/** Posición de un elemento respecto de la caja del rail. */
const at = (c: ParentNode, el: Element) => {
  const s = rail(c).getBoundingClientRect()
  const r = el.getBoundingClientRect()
  return { x: r.left - s.left, y: r.top - s.top, right: s.right - r.right, width: r.width, height: r.height }
}

describe('ModalNavigationRail: apertura, cierre y accesibilidad', () => {
  test('cerrado no se muestra; abierto es un diálogo modal con nombre y un <nav> adentro', async () => {
    const c = await render(<Harness />)
    expect(style(rail(c)).display).toBe('none')
    await userEvent.click(q(c, '.opener'))
    expect(rail(c).tagName).toBe('DIALOG')
    expect(rail(c).matches(':modal')).toBe(true)
    await expect.element(page.getByRole('dialog', { name: 'Navigation rail' })).toBeVisible()
    const nav = q(rail(c), ':scope > nav')
    expect(nav.classList.contains('mk-navigation-rail')).toBe(true)
    expect(nav.dataset['expanded']).toBe('true')
    expect(page.getByRole('link', { name: 'Favoritos' }).element().getAttribute('aria-current')).toBe('page')
  })

  test('label cambia el nombre', async () => {
    await render(<Harness initialOpen label="Navegación" />)
    await expect.element(page.getByRole('dialog', { name: 'Navegación' })).toBeVisible()
  })

  test('con aria-labelledby, el nombre sale de ahí y no lleva aria-label', async () => {
    const c = await render(
      <>
        <h2 id="t">Secciones</h2>
        <ModalNavigationRail open aria-labelledby="t" />
      </>,
    )
    expect(rail(c).hasAttribute('aria-label')).toBe(false)
    await expect.element(page.getByRole('dialog', { name: 'Secciones' })).toBeVisible()
  })

  test('al abrir, el foco va al destino actual; Escape pide cerrar y el foco vuelve al botón', async () => {
    const onRequest = vi.fn()
    const c = await render(<Harness onRequest={onRequest} />)
    await userEvent.click(q(c, '.opener'))
    expect(document.activeElement).toBe(q(c, '.favs'))
    await userEvent.keyboard('{Escape}')
    expect(onRequest).toHaveBeenCalledTimes(1)
    await expect.poll(() => rail(c).open).toBe(false)
    expect(document.activeElement).toBe(q(c, '.opener'))
  })

  test('sin destino actual, el primer enfocable; data-autofocus le gana al destino actual', async () => {
    let c = await render(
      <ModalNavigationRail open>
        <NavigationRailItem href="#a" className="a"><NavigationRailItemLabel>A</NavigationRailItemLabel></NavigationRailItem>
        <NavigationRailItem href="#b"><NavigationRailItemLabel>B</NavigationRailItemLabel></NavigationRailItem>
      </ModalNavigationRail>,
    )
    expect(document.activeElement).toBe(q(c, '.a'))
    c = await render(
      <ModalNavigationRail open>
        <NavigationRailItem href="#a" active><NavigationRailItemLabel>A</NavigationRailItemLabel></NavigationRailItem>
        <NavigationRailItem href="#b" className="b" data-autofocus=""><NavigationRailItemLabel>B</NavigationRailItemLabel></NavigationRailItem>
      </ModalNavigationRail>,
    )
    expect(document.activeElement).toBe(q(c, '.b'))
  })

  test('el botón de cerrar ("Close rail") y el clic en el scrim piden cerrar', async () => {
    const onRequest = vi.fn()
    const c = await render(<Harness initialOpen onRequest={onRequest} obey={false} />)
    await page.getByRole('button', { name: 'Close rail' }).click()
    expect(onRequest).toHaveBeenCalledTimes(1)
    // Controlado: sin open={false} del padre, sigue abierto.
    expect(rail(c).open).toBe(true)
    await userEvent.click(rail(c), { position: { x: rail(c).getBoundingClientRect().width + 40, y: 20 } })
    expect(onRequest).toHaveBeenCalledTimes(2)
  })

  test('closeOnScrimClick={false}: el scrim no cierra', async () => {
    const onRequest = vi.fn()
    const c = await render(<Harness initialOpen closeOnScrimClick={false} onRequest={onRequest} />)
    await userEvent.click(rail(c), { position: { x: rail(c).getBoundingClientRect().width + 40, y: 20 } })
    expect(onRequest).not.toHaveBeenCalled()
  })

  test('ModalNavigationRailClose: label propio; un onClick con preventDefault no cierra', async () => {
    const onClose = vi.fn()
    await render(
      <ModalNavigationRail open onClose={onClose}>
        <ModalNavigationRailClose label="Cerrar" className="x" onClick={(e) => e.preventDefault()} />
      </ModalNavigationRail>,
    )
    await page.getByRole('button', { name: 'Cerrar' }).click()
    expect(onClose).not.toHaveBeenCalled()
  })

  test('Tab da la vuelta dentro del rail', async () => {
    const c = await render(<Harness initialOpen />)
    const stops = [q(c, '.mk-navigation-rail-modal-close'), q(c, '.home'), q(c, '.favs'), q(c, '.search')]
    stops[0]!.focus()
    for (const el of stops.slice(1)) {
      await userEvent.tab()
      expect(document.activeElement).toBe(el)
    }
    await userEvent.tab()
    expect(document.activeElement).toBe(stops[0])
    await userEvent.tab({ shift: true })
    expect(document.activeElement).toBe(stops.at(-1))
  })

  test('abierto, la página no se desplaza', async () => {
    const c = await render(<Harness />)
    expect(style(document.documentElement).overflow).toBe('visible')
    await userEvent.click(q(c, '.opener'))
    expect(style(document.documentElement).overflow).toBe('hidden')
  })

  test('ModalNavigationRailClose fuera de un ModalNavigationRail: error con código', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(render(<ModalNavigationRailClose />)).rejects.toMatchObject({
      code: 'MK_PART_OUTSIDE_PARENT',
      details: { component: 'ModalNavigationRailClose', parent: 'ModalNavigationRail' },
    })
  })
})

describe('ModalNavigationRail: cierre al elegir un destino', () => {
  test('elegir un destino pide cerrar (aunque su onClick llame a preventDefault, como un enrutador) y el foco vuelve', async () => {
    const onRequest = vi.fn()
    const onNavigate = vi.fn()
    const c = await render(<Harness initialOpen onRequest={onRequest} onNavigate={onNavigate} />)
    q(c, '.opener').focus()
    await page.getByRole('link', { name: 'Inicio' }).click()
    expect(onNavigate).toHaveBeenCalledWith('home')
    expect(onRequest).toHaveBeenCalledTimes(1)
    await expect.poll(() => rail(c).open).toBe(false)
  })

  test('con Enter también cierra', async () => {
    const onRequest = vi.fn()
    const c = await render(<Harness initialOpen onRequest={onRequest} />)
    expect(document.activeElement).toBe(q(c, '.favs'))
    await userEvent.keyboard('{Enter}')
    expect(onRequest).toHaveBeenCalledTimes(1)
  })

  test('un clic que abre otra pestaña, un destino aria-disabled o closeOnSelect={false} no cierran', async () => {
    const onClose = vi.fn()
    const c = await render(
      <ModalNavigationRail open onClose={onClose}>
        <NavigationRailItem href="#a" className="a" onClick={(e) => e.preventDefault()}>
          <NavigationRailItemLabel>A</NavigationRailItemLabel>
        </NavigationRailItem>
        <NavigationRailItem className="d" aria-disabled="true"><NavigationRailItemLabel>D</NavigationRailItemLabel></NavigationRailItem>
        <p className="texto">Texto</p>
      </ModalNavigationRail>,
    )
    q(c, '.a').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }))
    q(c, '.a').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true }))
    q(c, '.d').click()
    q(c, '.texto').click()
    expect(onClose).not.toHaveBeenCalled()
    const off = await render(
      <ModalNavigationRail open onClose={onClose} closeOnSelect={false}>
        <NavigationRailItem className="b"><NavigationRailItemLabel>B</NavigationRailItemLabel></NavigationRailItem>
      </ModalNavigationRail>,
    )
    q(off, '.b').click()
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('ModalNavigationRail: medidas y colores (Compose ModalWideNavigationRail)', () => {
  // Radio solo del lado del contenido (actualización del ADR-0029: Compose lo pone en las cuatro
  // esquinas, pero contra el borde asomaba el scrim).
  test('contra el borde de inicio, de alto completo, 220 de ancho, radio 16 del lado del contenido, surface-container, sin sombra, scrim al 32 %', async () => {
    const c = await render(<Harness initialOpen />)
    const r = rail(c).getBoundingClientRect()
    expect(r.left).toBeCloseTo(0, 1)
    expect(r.top).toBeCloseTo(0, 1)
    expect(r.height).toBeCloseTo(vh(), 1)
    expect(r.width).toBe(220)
    const s = style(rail(c))
    expect([s.borderTopLeftRadius, s.borderBottomLeftRadius]).toEqual(['0px', '0px'])
    expect([s.borderTopRightRadius, s.borderBottomRightRadius]).toEqual(['16px', '16px'])
    expect(s.backgroundColor).toBe(roleColor('surface-container'))
    expect(s.boxShadow).toBe('none')
    await expect.poll(() => getComputedStyle(rail(c), '::backdrop').backgroundColor).toBe(mixColor('scrim', 32))
  })

  test('el ancho sigue a --mk-navigation-rail-expanded-width (hasta 360) y deja 48 de scrim', async () => {
    const c = await render(<Harness initialOpen style={{ '--mk-navigation-rail-expanded-width': '400px' } as never} />)
    expect(rail(c).getBoundingClientRect().width).toBe(Math.min(360, vw() - 48))
    await page.viewport(320, 700)
    try {
      await expect.poll(() => rail(c).getBoundingClientRect().width).toBeCloseTo(272, 1)
    } finally {
      await page.viewport(414, 896)
    }
  })

  test('adentro, el rail expandido: botón de 56 a 20 y 44, destinos de 56 a 20 del borde, en on-surface-variant', async () => {
    const c = await render(<Harness initialOpen />)
    const close = at(c, q(c, '.mk-navigation-rail-modal-close'))
    expect([close.x, close.y, close.width, close.height]).toEqual([20, 44, 56, 56])
    const home = q(c, '.home')
    const pill = at(c, q(home, ':scope > .mk-state-layer'))
    expect(pill.x).toBeCloseTo(20, 1)
    expect(pill.height).toBe(56)
    expect(at(c, home).y).toBeCloseTo(44 + 56 + 40, 1)
    expect(style(q(home, ':scope > .mk-navigation-rail-item-label')).color).toBe(roleColor('on-surface-variant'))
    const active = q(c, '.favs')
    expect(style(q(active, ':scope > .mk-navigation-rail-item-indicator')).backgroundColor).toBe(roleColor('secondary-container'))
    expect(style(q(active, ':scope > .mk-navigation-rail-item-label')).color).toBe(roleColor('on-secondary-container'))
    // El rail de adentro no pone su fondo ni su radio: los pone el diálogo.
    expect(style(q(c, '.mk-navigation-rail')).backgroundColor).toBe('rgba(0, 0, 0, 0)')
  })

  test('zonas seguras: arriba, abajo y del lado del borde (env), también en RTL', async () => {
    // No se pueden emular las zonas seguras: se revisa la declaración de la hoja.
    const rules = [...document.styleSheets].flatMap((sheet) => {
      const walk = (list: CSSRuleList): CSSStyleRule[] =>
        [...list].flatMap((r) => (r instanceof CSSStyleRule ? [r, ...walk(r.cssRules)] : 'cssRules' in r ? walk((r as CSSGroupingRule).cssRules) : []))
      try {
        return walk(sheet.cssRules)
      } catch {
        return []
      }
    })
    const padding = (selector: string) => rules.find((r) => r.selectorText === selector)?.style.getPropertyValue('padding') ?? ''
    expect(padding('.mk-navigation-rail-modal')).toMatch(/safe-area-inset-top.*safe-area-inset-bottom.*safe-area-inset-left/)
    expect(padding('.mk-navigation-rail-modal:dir(rtl)')).toMatch(/safe-area-inset-top.*safe-area-inset-right.*safe-area-inset-bottom/)
  })

  test('RTL: el radio pasa al lado del contenido (la izquierda); contra el borde derecho, 0', async () => {
    const c = await render(<div dir="rtl"><Harness initialOpen /></div>)
    const s = style(rail(c))
    expect([s.borderTopRightRadius, s.borderBottomRightRadius]).toEqual(['0px', '0px'])
    expect([s.borderTopLeftRadius, s.borderBottomLeftRadius]).toEqual(['16px', '16px'])
  })

  test('RTL: contra el borde derecho, con menu_open espejado', async () => {
    const c = await render(<div dir="rtl"><Harness initialOpen /></div>)
    expect(rail(c).getBoundingClientRect().right).toBeCloseTo(vw(), 1)
    expect(style(q(c, '.mk-navigation-rail-modal-close > .mk-icon')).scale).toBe('-1 1')
    const pill = q(c, '.home > .mk-state-layer').getBoundingClientRect()
    expect(rail(c).getBoundingClientRect().right - pill.right).toBeCloseTo(20, 1)
  })
})

describe('ModalNavigationRail: movimiento', () => {
  test('entra y sale por el borde de inicio (en RTL, el derecho) con el resorte espacial por defecto', async () => {
    const c = await render(<><Harness initialOpen /><div dir="rtl"><Harness initialOpen /></div></>)
    const [ltr, rtl] = [...c.querySelectorAll<HTMLElement>('.mk-navigation-rail-modal')] as [HTMLElement, HTMLElement]
    withMotion(() => {
      expect(style(ltr).transitionProperty).toBe('translate')
      expect(ms(style(ltr).transitionDuration)).toBe(ms(token('--md-sys-motion-spring-default-spatial-duration')))
      ltr.setAttribute('data-closing', '')
      expect(ms(style(ltr).transitionDuration)).toBe(ms(token('--md-sys-motion-spring-default-spatial-duration')))
      ltr.removeAttribute('data-closing')
    })
    for (const [el, value] of [[ltr, '-100%'], [rtl, '100%']] as const) {
      el.setAttribute('data-closing', '')
      expect(style(el).translate).toBe(value)
      el.removeAttribute('data-closing')
    }
  })

  test('con open={false} anima la salida antes de cerrar', async () => {
    await withTransitions(async () => {
      const c = await render(<Harness initialOpen />)
      await entered(rail(c))
      await userEvent.keyboard('{Escape}')
      await expect.poll(() => rail(c).hasAttribute('data-closing')).toBe(true)
      expect(rail(c).open).toBe(true)
      await expect.poll(() => rail(c).open).toBe(false)
    })
  })

  for (const how of CANCEL_WAYS) {
    test(`salida cancelada (${how}): se cierra igual, la página no queda inerte y se puede volver a abrir`, async () => {
      await withTransitions(async () => {
        const c = await render(<Harness initialOpen />)
        await entered(rail(c))
        await userEvent.keyboard('{Escape}')
        await cancelExit(rail(c), how)
        await expect.poll(() => rail(c).open).toBe(false)
        expect(rail(c).hasAttribute('data-closing')).toBe(false)
        await userEvent.click(q(c, '.opener'))
        await expect.poll(() => rail(c).open).toBe(true)
      })
    })
  }

  test('con movimiento reducido: fundido, sin deslizarse', async () => {
    await commands.reduceMotion(true)
    try {
      const c = await render(<Harness initialOpen />)
      withMotion(() => {
        expect(style(rail(c)).transitionProperty).toBe('opacity')
      })
      rail(c).setAttribute('data-closing', '')
      expect(style(rail(c)).translate).toBe('none')
      expect(style(rail(c)).opacity).toBe('0')
      rail(c).removeAttribute('data-closing')
    } finally {
      await commands.reduceMotion(false)
    }
  })
})

describe('ModalNavigationRail: props nativas y ref', () => {
  test('ref, className, style y atributos llegan al <dialog>; align al <nav>', async () => {
    const ref = createRef<HTMLDialogElement>()
    const c = await render(
      <ModalNavigationRail open ref={ref} className="mio" style={{ color: 'red' }} data-x="1" align="middle">
        <NavigationRailItem href="#a"><NavigationRailItemLabel>A</NavigationRailItemLabel></NavigationRailItem>
      </ModalNavigationRail>,
    )
    expect(ref.current).toBe(rail(c))
    expect(rail(c).classList.contains('mio')).toBe(true)
    expect(rail(c).dataset['x']).toBe('1')
    expect(rail(c).style.color).toBe('red')
    expect(q(rail(c), ':scope > nav').dataset['align']).toBe('middle')
  })

  test('los manejadores propios del <dialog> se llaman', async () => {
    const onKeyDown = vi.fn()
    const onClick = vi.fn()
    const c = await render(
      <ModalNavigationRail open onKeyDown={onKeyDown} onClick={onClick}>
        <NavigationRailItem className="a"><NavigationRailItemLabel>A</NavigationRailItemLabel></NavigationRailItem>
      </ModalNavigationRail>,
    )
    await userEvent.keyboard('a')
    q(c, '.a').click()
    expect(onKeyDown).toHaveBeenCalled()
    expect(onClick).toHaveBeenCalled()
  })
})

// Arrastrar para cerrar. Los gestos táctiles se despachan a mano con el reloj de performance.now()
// falso (la velocidad depende del tiempo entre movimientos, como en BottomSheet.test.tsx); el
// mouse real de Playwright (commands.dragThrough) prueba que el rail sigue al puntero.

/** Gesto despachado a mano (táctil por defecto) desde el centro de `target`. */
function gesture(target: Element, pointerType: 'touch' | 'mouse' = 'touch') {
  const r = target.getBoundingClientRect()
  let x = r.left + r.width / 2
  let y = r.top + r.height / 2
  const send = (type: string) =>
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: x,
        clientY: y,
        pointerId: 12,
        pointerType,
        isPrimary: true,
        button: type === 'pointermove' ? -1 : 0,
        buttons: type === 'pointerup' ? 0 : 1,
      }),
    )
  return {
    down: () => send('pointerdown'),
    /** Mueve (`dx`, `dy`) en `n` pasos, cada uno `ms` después del anterior. */
    move(dx: number, dy = 0, ms = 16, n = Math.max(1, Math.round(Math.max(Math.abs(dx), Math.abs(dy)) / 4))) {
      for (let i = 0; i < n; i++) {
        vi.advanceTimersByTime(ms)
        x += dx / n
        y += dy / n
        send('pointermove')
      }
    },
    wait: (ms: number) => vi.advanceTimersByTime(ms),
    up: () => send('pointerup'),
  }
}

const fakeClock = () => vi.useFakeTimers({ toFake: ['performance'] })
afterEach(() => {
  vi.useRealTimers()
})

/** Corrimiento del rail hacia el borde de inicio, medido en pantalla (LTR). */
const shift = (c: ParentNode) => -rail(c).getBoundingClientRect().left

/** Rail con muchos destinos: la lista se desplaza en vertical (como el menú de páginas del playground). */
function LongHarness({ onRequest }: { onRequest?: () => void }) {
  return (
    <ModalNavigationRail open onClose={onRequest}>
      {Array.from({ length: 30 }, (_, i) => (
        <NavigationRailItem key={i} href={`#p${i}`} className={i === 0 ? 'home' : undefined}>
          <NavigationRailItemLabel>Página {i + 1}</NavigationRailItemLabel>
        </NavigationRailItem>
      ))}
    </ModalNavigationRail>
  )
}

describe('ModalNavigationRail: arrastrar para cerrar (Compose: la mitad del ancho o 125 px/s)', () => {
  test('con el mouse, el rail sigue al puntero hacia el borde; al soltar quieto y corto, vuelve', async () => {
    const onRequest = vi.fn()
    const c = await render(<Harness initialOpen onRequest={onRequest} />)
    await commands.dragThrough('.mk-navigation-rail-modal', [[150, 400], [140, 400], [120, 400], [90, 400]])
    try {
      // Pasado el umbral de 8 px (en 140), sigue al puntero desde ahí: 50 px.
      await expect.poll(() => shift(c)).toBeCloseTo(50, 0)
      expect(rail(c).hasAttribute('data-dragging')).toBe(true)
    } finally {
      // Quieto más de 40 ms antes de soltar: velocidad 0, gana el ancla más cercana (abierto).
      await new Promise((r) => setTimeout(r, 80))
      await commands.pressUp()
    }
    await expect.poll(() => shift(c)).toBeCloseTo(0, 0)
    expect(onRequest).not.toHaveBeenCalled()
    expect(rail(c).hasAttribute('data-dragging')).toBe(false)
  })

  // Soltando en movimiento lento (80 px/s, menos de 125): decide la distancia contra la mitad del
  // ancho (110). Quieto antes de soltar (velocidad 0) ganaría el ancla más cercana, sin umbral.
  test('despacio, más de la mitad del ancho: pide cerrar y cierra', async () => {
    const onRequest = vi.fn()
    const c = await render(<Harness initialOpen onRequest={onRequest} />)
    fakeClock()
    const g = gesture(q(c, '.home'))
    g.down()
    g.move(-10)
    g.move(-120, 0, 50, 30)
    expect(shift(c)).toBeCloseTo(120, 0)
    g.up()
    expect(onRequest).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
    await expect.poll(() => rail(c).open).toBe(false)
  })

  test('despacio, menos de la mitad: vuelve sin pedir cerrar', async () => {
    const onRequest = vi.fn()
    const c = await render(<Harness initialOpen onRequest={onRequest} />)
    fakeClock()
    const g = gesture(q(c, '.home'))
    g.down()
    g.move(-10)
    g.move(-100, 0, 50, 25)
    g.up()
    expect(onRequest).not.toHaveBeenCalled()
    expect(rail(c).style.getPropertyValue('--_drag')).toBe('')
  })

  test('rápido y corto (más de 125 px/s): pide cerrar; si el padre no cierra, vuelve a su lugar', async () => {
    const onRequest = vi.fn()
    const c = await render(<Harness initialOpen onRequest={onRequest} obey={false} />)
    fakeClock()
    const g = gesture(q(c, '.home'))
    g.down()
    g.move(-10)
    g.move(-30, 0, 10, 3) // 1000 px/s, 30 px
    g.up()
    expect(onRequest).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
    await expect.poll(() => rail(c).style.getPropertyValue('--_drag')).toBe('')
    expect(rail(c).open).toBe(true)
    expect(shift(c)).toBeCloseTo(0, 0)
  })

  test('elegir un destino después de arrastrar con el mouse no navega ni cierra', async () => {
    const onRequest = vi.fn()
    const onNavigate = vi.fn()
    const c = await render(<Harness initialOpen onRequest={onRequest} onNavigate={onNavigate} />)
    fakeClock()
    const g = gesture(q(c, '.home'), 'mouse')
    g.down()
    g.move(-10)
    g.move(-20, 0, 30)
    g.wait(60)
    g.up()
    // El clic que el navegador manda al terminar el gesto con mouse.
    q(c, '.home').click()
    expect(onNavigate).not.toHaveBeenCalled()
    expect(onRequest).not.toHaveBeenCalled()
  })

  test('un gesto vertical (desplazar la lista) o hacia el contenido no mueve el rail', async () => {
    const onRequest = vi.fn()
    const c = await render(<LongHarness onRequest={onRequest} />)
    fakeClock()
    for (const [dx, dy] of [[-6, 80], [0, -80], [60, 0]] as const) {
      const g = gesture(q(c, '.home'))
      g.down()
      // Un movimiento vertical no se cancela (el navegador puede desplazar la lista).
      const target = q(c, '.home')
      const probe = new PointerEvent('pointermove', { bubbles: true, cancelable: true, clientX: target.getBoundingClientRect().left + 40 + dx, clientY: target.getBoundingClientRect().top + 20 + dy, pointerId: 12, pointerType: 'touch', isPrimary: true })
      g.move(dx, dy)
      target.dispatchEvent(probe)
      expect(probe.defaultPrevented, `${dx}, ${dy}`).toBe(false)
      expect(rail(c).hasAttribute('data-dragging'), `${dx}, ${dy}`).toBe(false)
      expect(shift(c)).toBeCloseTo(0, 0)
      g.up()
    }
    expect(onRequest).not.toHaveBeenCalled()
    const list = q(c, '.mk-navigation-rail')
    expect(list.scrollHeight).toBeGreaterThan(list.clientHeight)
    // El táctil vertical queda para el navegador (desplazamiento nativo); el horizontal, para el rail.
    expect(style(rail(c)).touchAction).toBe('pan-y pinch-zoom')
  })

  test('con el mouse en un campo de texto no arrastra (selecciona)', async () => {
    const c = await render(
      <ModalNavigationRail open>
        <input className="campo" defaultValue="texto largo para seleccionar" />
        <NavigationRailItem href="#a"><NavigationRailItemLabel>A</NavigationRailItemLabel></NavigationRailItem>
      </ModalNavigationRail>,
    )
    fakeClock()
    const g = gesture(q(c, '.campo'), 'mouse')
    g.down()
    g.move(-60)
    expect(rail(c).hasAttribute('data-dragging')).toBe(false)
    g.up()
  })

  test('RTL: se arrastra hacia la derecha; hacia la izquierda no', async () => {
    const onRequest = vi.fn()
    const c = await render(<div dir="rtl"><Harness initialOpen onRequest={onRequest} /></div>)
    const right = () => rail(c).getBoundingClientRect().right
    fakeClock()
    let g = gesture(q(c, '.home'))
    g.down()
    g.move(-60)
    expect(rail(c).hasAttribute('data-dragging')).toBe(false)
    g.up()
    g = gesture(q(c, '.home'))
    g.down()
    g.move(10)
    g.move(50, 0, 30)
    expect(right() - vw()).toBeCloseTo(50, 0)
    g.wait(60)
    g.move(100, 0, 30)
    g.wait(60)
    g.up()
    expect(onRequest).toHaveBeenCalledTimes(1)
  })

  test('con movimiento reducido: sigue al dedo; al soltar no se desliza (se funde donde quedó)', async () => {
    await withTransitions(async () => {
      await commands.reduceMotion(true)
      const c = await render(<Harness initialOpen />)
      await entered(rail(c))
      fakeClock()
      const g = gesture(q(c, '.home'))
      g.down()
      g.move(-10)
      g.move(-150, 0, 30)
      expect(shift(c)).toBeCloseTo(150, 0)
      expect(style(rail(c)).transitionProperty).toBe('none')
      g.wait(60)
      g.up()
      vi.useRealTimers()
      // Cerrando: se funde (solo opacity) en el lugar donde se soltó, sin volver ni salir deslizándose.
      await expect.poll(() => rail(c).hasAttribute('data-closing')).toBe(true)
      expect(style(rail(c)).transitionProperty).toBe('opacity')
      expect(style(rail(c)).translate).toBe('-150px')
      await expect.poll(() => rail(c).open).toBe(false)
    })
  })
})
