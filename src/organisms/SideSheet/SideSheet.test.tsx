import { createRef, useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'
import { SideSheet, SideSheetClose, SideSheetTitle, type SideSheetModalProps } from './SideSheet.tsx'
import { SideSheetActions, SideSheetBack, SideSheetContent, SideSheetHeader } from './SideSheetSlots.tsx'
import { Button } from '../../molecules/Button/Button.tsx'
import { render, roleColor, style, withMotion } from '../../test/render.tsx'
import { CANCEL_WAYS, cancelExit, entered, withTransitions } from '../../test/exit.ts'

const q = <T extends Element = HTMLElement>(c: ParentNode, sel: string) => c.querySelector(sel) as T
const sheet = (c: ParentNode) => q(c, '.mk-side-sheet')
const vw = () => document.documentElement.clientWidth
const ms = (v: string) => (v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000)
const token = (name: string) => style(document.documentElement).getPropertyValue(name).trim()

/** Tamaño de letra de un token (en rem) como lo devuelve getComputedStyle. */
function fontSize(name: string): string {
  const probe = document.createElement('span')
  probe.style.fontSize = `var(${name})`
  document.body.append(probe)
  const value = getComputedStyle(probe).fontSize
  probe.remove()
  return value
}

function mixColor(role: string, percent: number): string {
  const probe = document.createElement('span')
  probe.style.color = `color-mix(in srgb, var(--md-sys-color-${role}) ${percent}%, transparent)`
  document.body.append(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value
}

type HarnessProps = Omit<SideSheetModalProps, 'open' | 'onClose'> & {
  initialOpen?: boolean
  back?: boolean
  onRequest?: () => void
  onBack?: () => void
}

function Harness({ initialOpen = false, back = false, onRequest, onBack, ...props }: HarnessProps) {
  const [open, setOpen] = useState(initialOpen)
  return (
    <>
      <Button className="opener" onClick={() => setOpen(true)}>Abrir</Button>
      <SideSheet
        {...props}
        open={open}
        onClose={() => {
          onRequest?.()
          setOpen(false)
        }}
      >
        <SideSheetHeader>
          {back && <SideSheetBack onClick={onBack} />}
          <SideSheetTitle>Filtros</SideSheetTitle>
          <SideSheetClose />
        </SideSheetHeader>
        <SideSheetContent>
          <p style={{ margin: 0 }}>Contenido</p>
        </SideSheetContent>
        <SideSheetActions>
          <Button size="sm">Aplicar</Button>
          <Button size="sm" variant="outlined">Cancelar</Button>
        </SideSheetActions>
      </SideSheet>
    </>
  )
}

/** Posición de un elemento respecto de la caja del sheet. */
const at = (c: ParentNode, el: Element) => {
  const s = sheet(c).getBoundingClientRect()
  const r = el.getBoundingClientRect()
  return { x: r.left - s.left, y: r.top - s.top, right: s.right - r.right, bottom: s.bottom - r.bottom, width: r.width, height: r.height }
}

describe('SideSheet modal: apertura, cierre y accesibilidad', () => {
  test('cerrado no se muestra; abierto es un diálogo modal con nombre desde el título', async () => {
    const c = await render(<Harness />)
    expect(style(sheet(c)).display).toBe('none')
    await userEvent.click(q(c, '.opener'))
    expect(sheet(c).tagName).toBe('DIALOG')
    expect(sheet(c).matches(':modal')).toBe(true)
    await expect.element(page.getByRole('dialog', { name: 'Filtros' })).toBeVisible()
  })

  test('al abrir enfoca el primer control (volver); Escape cierra y el foco vuelve', async () => {
    const onRequest = vi.fn()
    const c = await render(<Harness back onRequest={onRequest} />)
    await userEvent.click(q(c, '.opener'))
    expect(document.activeElement).toBe(q(c, '.mk-side-sheet-back'))
    await userEvent.keyboard('{Escape}')
    expect(onRequest).toHaveBeenCalledTimes(1)
    await expect.poll(() => (sheet(c) as HTMLDialogElement).open).toBe(false)
    expect(document.activeElement).toBe(q(c, '.opener'))
  })

  test('el botón de cerrar y el clic en el scrim piden cerrar; volver llama a su onClick', async () => {
    const onRequest = vi.fn()
    const onBack = vi.fn()
    const c = await render(<Harness initialOpen back onRequest={onRequest} onBack={onBack} />)
    await expect.element(page.getByRole('button', { name: 'Volver' })).toBeVisible()
    q<HTMLButtonElement>(c, '.mk-side-sheet-back').click()
    expect(onBack).toHaveBeenCalledTimes(1)
    expect(onRequest).not.toHaveBeenCalled()
    await page.getByRole('button', { name: 'Cerrar' }).click()
    expect(onRequest).toHaveBeenCalledTimes(1)
    await userEvent.click(q(c, '.opener'))
    await expect.poll(() => (sheet(c) as HTMLDialogElement).open).toBe(true)
    await userEvent.click(sheet(c), { position: { x: -40, y: 20 } })
    expect(onRequest).toHaveBeenCalledTimes(2)
  })

  test('closeOnScrimClick={false}: el scrim no cierra', async () => {
    const onRequest = vi.fn()
    const c = await render(<Harness initialOpen closeOnScrimClick={false} onRequest={onRequest} />)
    await userEvent.click(sheet(c), { position: { x: -40, y: 20 } })
    expect(onRequest).not.toHaveBeenCalled()
  })

  test('un onClick propio de SideSheetClose con preventDefault no cierra', async () => {
    const onClose = vi.fn()
    await render(
      <SideSheet open onClose={onClose}>
        <SideSheetHeader>
          <SideSheetTitle>T</SideSheetTitle>
          <SideSheetClose label="Salir" onClick={(e) => e.preventDefault()} />
        </SideSheetHeader>
      </SideSheet>,
    )
    await page.getByRole('button', { name: 'Salir' }).click()
    expect(onClose).not.toHaveBeenCalled()
  })

  test('Tab da la vuelta dentro del sheet', async () => {
    const c = await render(<Harness initialOpen />)
    const buttons = [...sheet(c).querySelectorAll<HTMLButtonElement>('button')]
    expect(document.activeElement).toBe(buttons[0])
    for (let i = 1; i < buttons.length; i++) await userEvent.tab()
    expect(document.activeElement).toBe(buttons.at(-1))
    await userEvent.tab()
    expect(document.activeElement).toBe(buttons[0])
  })

  test('abierto, la página no se desplaza', async () => {
    const c = await render(<Harness />)
    expect(style(document.documentElement).overflow).toBe('visible')
    await userEvent.click(q(c, '.opener'))
    expect(style(document.documentElement).overflow).toBe('hidden')
  })

  test('las partes cliente fuera de un SideSheet avisan con un error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(render(<SideSheetClose />)).rejects.toThrow('SideSheetClose tiene que estar dentro de un <SideSheet>.')
  })
})

describe('SideSheet modal: medidas y colores', () => {
  test('contra el borde final, de alto completo, radio 16 del lado del contenido, surface-container-low', async () => {
    const c = await render(<Harness initialOpen />)
    const r = sheet(c).getBoundingClientRect()
    expect(r.right).toBeCloseTo(vw(), 1)
    expect(r.top).toBeCloseTo(0, 1)
    expect(r.height).toBeCloseTo(document.documentElement.clientHeight, 1)
    const s = style(sheet(c))
    expect(s.borderTopLeftRadius).toBe('16px')
    expect(s.borderBottomLeftRadius).toBe('16px')
    expect(s.borderTopRightRadius).toBe('0px')
    expect(s.borderBottomRightRadius).toBe('0px')
    expect(s.backgroundColor).toBe(roleColor('surface-container-low'))
    expect(s.boxShadow).toBe('none')
    await expect.poll(() => getComputedStyle(sheet(c), '::backdrop').backgroundColor).toBe(mixColor('scrim', 32))
  })

  test('ventana compacta: deja 48 de scrim; ventana ancha: 320 de ancho', async () => {
    let c = await render(<Harness initialOpen />)
    expect(sheet(c).getBoundingClientRect().width).toBeCloseTo(Math.min(320, vw() - 48), 1)
    await page.viewport(320, 700)
    try {
      c = await render(<Harness initialOpen />)
      expect(sheet(c).getBoundingClientRect().width).toBeCloseTo(272, 1)
      await page.viewport(1200, 800)
      c = await render(<Harness initialOpen />)
      const r = sheet(c).getBoundingClientRect()
      expect(r.width).toBe(320)
      expect(r.right).toBeCloseTo(vw(), 1)
    } finally {
      await page.viewport(414, 896)
    }
  })

  test('cabecera de 76: volver a 4 + 8, título a 12 de volver (Title Large, on-surface-variant), cerrar a 12 + 4 del final', async () => {
    const c = await render(<Harness initialOpen back />)
    const header = q(c, '.mk-side-sheet-header')
    expect(header.getBoundingClientRect().height).toBe(76)
    const back = at(c, q(c, '.mk-side-sheet-back'))
    const close = at(c, q(c, '.mk-side-sheet-close'))
    const title = q(c, '.mk-side-sheet-title')
    // Volver: angosto (32) en un área de 48 que empieza a 4 del borde; cerrar: 40 en un área de 48
    // que termina a 12 del final. Los dos centrados en la fila de 48 (12 arriba).
    expect(back.width).toBe(32)
    expect(back.x).toBeCloseTo(12, 2)
    expect(close.width).toBe(40)
    expect(close.right).toBeCloseTo(16, 2)
    expect(back.y + back.height / 2).toBeCloseTo(12 + 24, 1)
    expect(at(c, title).x).toBeCloseTo(4 + 48 + 12, 2)
    expect(style(title).color).toBe(roleColor('on-surface-variant'))
    expect(style(title).fontSize).toBe(fontSize('--md-sys-typescale-title-large-size'))
    expect(title.tagName).toBe('H2')
  })

  test('sin volver, el título empieza a 16', async () => {
    const c = await render(<Harness initialOpen />)
    expect(at(c, q(c, '.mk-side-sheet-title')).x).toBeCloseTo(16, 2)
  })

  test('acciones: divisor de 1 en outline-variant, relleno 12, 24 y 20, separación 8', async () => {
    const c = await render(<Harness initialOpen />)
    const a = q(c, '.mk-side-sheet-actions')
    const s = style(a)
    expect(s.borderTopWidth).toBe('1px')
    expect(s.borderTopColor).toBe(roleColor('outline-variant'))
    const [first, second] = [...a.querySelectorAll('button')]
    const f = at(c, first!)
    expect(f.x).toBeCloseTo(24, 2)
    expect(f.bottom).toBeCloseTo(20, 2)
    expect(first!.getBoundingClientRect().top - a.getBoundingClientRect().top).toBeCloseTo(1 + 12, 2)
    expect(second!.getBoundingClientRect().left - first!.getBoundingClientRect().right).toBeCloseTo(8, 2)
    // Las acciones quedan al pie aunque el contenido sea corto.
    expect(at(c, a).bottom).toBeCloseTo(0, 2)
  })

  test('RTL: contra el borde izquierdo, radio del lado derecho, volver apunta a la derecha', async () => {
    const c = await render(<div dir="rtl"><Harness initialOpen back /></div>)
    const r = sheet(c).getBoundingClientRect()
    expect(r.left).toBeCloseTo(0, 1)
    const s = style(sheet(c))
    expect(s.borderTopRightRadius).toBe('16px')
    expect(s.borderTopLeftRadius).toBe('0px')
    expect(at(c, q(c, '.mk-side-sheet-back')).right).toBeCloseTo(12, 2)
    expect(style(q(c, '.mk-side-sheet-back > .mk-icon')).scale).toBe('-1 1')
  })
})

describe('SideSheet modal: movimiento', () => {
  test('entra y sale por el borde final (en RTL, el izquierdo) con resortes', async () => {
    const c = await render(<><Harness initialOpen /><div dir="rtl"><Harness initialOpen /></div></>)
    const [ltr, rtl] = [...c.querySelectorAll<HTMLElement>('.mk-side-sheet')] as [HTMLElement, HTMLElement]
    withMotion(() => {
      expect(style(ltr).transitionProperty).toBe('translate')
      expect(ms(style(ltr).transitionDuration)).toBe(ms(token('--md-sys-motion-spring-default-spatial-duration')))
      ltr.setAttribute('data-closing', '')
      expect(ms(style(ltr).transitionDuration)).toBe(ms(token('--md-sys-motion-spring-fast-effects-duration')))
      ltr.removeAttribute('data-closing')
    })
    for (const [el, value] of [[ltr, '100%'], [rtl, '-100%']] as const) {
      el.setAttribute('data-closing', '')
      expect(style(el).translate).toBe(value)
      el.removeAttribute('data-closing')
    }
  })

  test('con open={false} anima la salida antes de cerrar', async () => {
    await withTransitions(async () => {
      const c = await render(<Harness initialOpen />)
      const s = sheet(c) as HTMLDialogElement
      await entered(s)
      await userEvent.keyboard('{Escape}')
      await expect.poll(() => s.hasAttribute('data-closing')).toBe(true)
      expect(s.open).toBe(true)
      await expect.poll(() => s.open).toBe(false)
    })
  })

  for (const how of CANCEL_WAYS) {
    test(`salida cancelada (${how}): se cierra igual y se puede volver a abrir`, async () => {
      await withTransitions(async () => {
        const c = await render(<Harness initialOpen />)
        const s = sheet(c) as HTMLDialogElement
        await entered(s)
        await userEvent.keyboard('{Escape}')
        await cancelExit(s, how)
        await expect.poll(() => s.open).toBe(false)
        await userEvent.click(q(c, '.opener'))
        await expect.poll(() => s.open).toBe(true)
      })
    })
  }

  test('con movimiento reducido: fundido, sin deslizarse', async () => {
    await commands.reduceMotion(true)
    try {
      const c = await render(<Harness initialOpen />)
      withMotion(() => {
        expect(style(sheet(c)).transitionProperty).toBe('opacity')
      })
      sheet(c).setAttribute('data-closing', '')
      expect(style(sheet(c)).translate).toBe('none')
      expect(style(sheet(c)).opacity).toBe('0')
      sheet(c).removeAttribute('data-closing')
    } finally {
      await commands.reduceMotion(false)
    }
  })
})

describe('SideSheet standard', () => {
  function Standard({ open = true, onClose }: { open?: boolean; onClose?: () => void }) {
    return (
      <div style={{ display: 'flex', height: 400 }}>
        <main style={{ flex: 1 }}>Contenido</main>
        <SideSheet modal={false} open={open} onClose={onClose}>
          <SideSheetHeader>
            <SideSheetTitle>Detalles</SideSheetTitle>
            <SideSheetClose />
          </SideSheetHeader>
          <SideSheetContent>Texto</SideSheetContent>
        </SideSheet>
      </div>
    )
  }

  test('es una región complementaria con nombre, no un diálogo; no atrapa el foco', async () => {
    const c = await render(<Standard />)
    expect(sheet(c).tagName).toBe('ASIDE')
    await expect.element(page.getByRole('complementary', { name: 'Detalles' })).toBeVisible()
    expect(c.querySelector('dialog')).toBeNull()
    expect(style(document.documentElement).overflow).toBe('visible')
  })

  test('en el flujo, al lado del contenido: 320 de ancho, surface, divisor de 1 en outline-variant al inicio, sin radio', async () => {
    const c = await render(<Standard />)
    const r = sheet(c).getBoundingClientRect()
    expect(r.width).toBe(320)
    expect(r.height).toBe(400)
    const s = style(sheet(c))
    expect(s.backgroundColor).toBe(roleColor('surface'))
    expect(s.borderLeftWidth).toBe('1px')
    expect(s.borderLeftColor).toBe(roleColor('outline-variant'))
    expect(s.borderTopLeftRadius).toBe('0px')
    expect(s.position).toBe('static')
  })

  test('RTL: el divisor queda a la derecha (del lado del contenido)', async () => {
    const c = await render(<div dir="rtl"><Standard /></div>)
    expect(style(sheet(c)).borderRightWidth).toBe('1px')
    expect(style(sheet(c)).borderLeftWidth).toBe('0px')
  })

  test('el botón de cerrar llama a onClose; open={false} lo oculta', async () => {
    const onClose = vi.fn()
    await render(<Standard onClose={onClose} />)
    await page.getByRole('button', { name: 'Cerrar' }).click()
    expect(onClose).toHaveBeenCalledTimes(1)
    const hidden = await render(<Standard open={false} />)
    expect(sheet(hidden).hidden).toBe(true)
    expect(style(sheet(hidden)).display).toBe('none')
  })
})

describe('SideSheet: props nativas y ref', () => {
  test('modal: ref, className, style y atributos llegan al <dialog>', async () => {
    const ref = createRef<HTMLDialogElement>()
    const c = await render(
      <SideSheet open ref={ref} className="mio" style={{ color: 'red' }} data-x="1" aria-label="Hoja">
        <SideSheetContent className="cont" id="c1">Texto</SideSheetContent>
      </SideSheet>,
    )
    expect(ref.current).toBe(sheet(c))
    expect(sheet(c).classList.contains('mio')).toBe(true)
    expect(sheet(c).dataset['x']).toBe('1')
    expect(sheet(c).style.color).toBe('red')
    expect(sheet(c).getAttribute('aria-label')).toBe('Hoja')
    expect(q(c, '.cont').id).toBe('c1')
  })

  test('standard: ref y props llegan al <aside>; el título acepta id propio', async () => {
    const ref = createRef<HTMLElement>()
    const c = await render(
      <SideSheet modal={false} ref={ref} className="mio" data-x="1">
        <SideSheetHeader className="hh">
          <SideSheetTitle id="t1">Título</SideSheetTitle>
        </SideSheetHeader>
        <SideSheetActions data-y="2" />
      </SideSheet>,
    )
    expect(ref.current).toBe(sheet(c))
    expect(sheet(c).dataset['x']).toBe('1')
    expect(sheet(c).getAttribute('aria-labelledby')).toBe('t1')
    expect(q(c, '.hh').classList.contains('mk-side-sheet-header')).toBe(true)
    expect(q(c, '.mk-side-sheet-actions').dataset['y']).toBe('2')
  })
})
