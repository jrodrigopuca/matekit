import { createRef, useState } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'
import { Dialog, DialogContent, DialogHeadline, type DialogProps } from './Dialog.tsx'
import { DialogActions, DialogIcon } from './DialogSlots.tsx'
import { Button } from '../../molecules/Button/Button.tsx'
import { TextField, TextFieldInput, TextFieldLabel } from '../../molecules/TextField/TextField.tsx'
import { DeleteIcon } from '../../icons/icons.tsx'
import { render, roleColor, style, withMotion } from '../../test/render.tsx'

const q = <T extends Element = HTMLElement>(c: ParentNode, sel: string) => c.querySelector(sel) as T
const dialog = (c: ParentNode) => q<HTMLDialogElement>(c, '.mk-dialog')
const headline = (c: ParentNode) => q(c, '.mk-dialog-headline')
const content = (c: ParentNode) => q(c, '.mk-dialog-content')
const actions = (c: ParentNode) => q(c, '.mk-dialog-actions')
const icon = (c: ParentNode) => q(c, '.mk-dialog-icon')
const buttons = (c: ParentNode) => [...actions(c).querySelectorAll<HTMLButtonElement>('button')]
const px = (n: number) => `${n}px`

/** Valor calculado de una propiedad con un token (los de tipografía están en rem). */
function token(property: 'fontSize' | 'lineHeight', name: string): string {
  const probe = document.createElement('span')
  probe.style[property] = `var(${name})`
  document.body.append(probe)
  const value = getComputedStyle(probe)[property]
  probe.remove()
  return value
}

/** Fondo del ::backdrop. Su transición no la apaga el estilo de las pruebas: esperar con poll. */
const backdrop = (c: ParentNode) => getComputedStyle(dialog(c), '::backdrop').backgroundColor

/** Clic desde el código: con el diálogo modal, el resto de la página es inerte al puntero. */
const clickFromCode = (c: ParentNode, sel: string) => q<HTMLButtonElement>(c, sel).click()

/** Color de un rol mezclado con transparente, como lo devuelve getComputedStyle. */
function mixColor(role: string, percent: number): string {
  const probe = document.createElement('span')
  probe.style.color = `color-mix(in srgb, var(--md-sys-color-${role}) ${percent}%, transparent)`
  document.body.append(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value
}

/** Posición de un elemento respecto del borde superior izquierdo del diálogo. */
const at = (c: ParentNode, el: Element) => {
  const d = dialog(c).getBoundingClientRect()
  const r = el.getBoundingClientRect()
  return { x: r.left - d.left, y: r.top - d.top, right: d.right - r.right, bottom: d.bottom - r.bottom, width: r.width, height: r.height }
}

/** Clic en el fondo (::backdrop): fuera de la caja del diálogo, en la esquina de la ventana. */
async function clickScrim(c: ParentNode) {
  const r = dialog(c).getBoundingClientRect()
  await userEvent.click(dialog(c), { position: { x: -r.left + 4, y: -r.top + 4 } })
}

type HarnessProps = Omit<DialogProps, 'open' | 'onClose'> & {
  initialOpen?: boolean
  /** Si es true, el padre no cambia `open` al recibir onClose. */
  ignoreClose?: boolean
  onCloseSpy?: () => void
  withIcon?: boolean
  long?: boolean
}

function Harness({ initialOpen = false, ignoreClose = false, onCloseSpy, withIcon = false, long = false, ...props }: HarnessProps) {
  const [open, setOpen] = useState(initialOpen)
  return (
    <>
      <button id="opener" onClick={() => setOpen(true)}>Abrir</button>
      <button id="toggle-off" onClick={() => setOpen(false)}>Cerrar desde afuera</button>
      <Dialog
        {...props}
        open={open}
        onClose={() => {
          onCloseSpy?.()
          if (!ignoreClose) setOpen(false)
        }}
      >
        {withIcon && (
          <DialogIcon>
            <DeleteIcon />
          </DialogIcon>
        )}
        <DialogHeadline>¿Eliminar archivo?</DialogHeadline>
        <DialogContent>
          {long ? Array.from({ length: 60 }, (_, i) => <p key={i}>Línea {i + 1} de un texto largo.</p>) : 'No se puede deshacer.'}
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="text" onClick={() => setOpen(false)}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

const open = async (c: HTMLElement) => {
  await userEvent.click(q(c, '#opener'))
  await expect.poll(() => dialog(c).open).toBe(true)
}

describe('Dialog: apertura y cierre', () => {
  test('cerrado no se muestra; con open queda modal', async () => {
    const c = await render(<Harness />)
    expect(dialog(c).open).toBe(false)
    expect(style(dialog(c)).display).toBe('none')
    await open(c)
    expect(dialog(c).matches(':modal')).toBe(true)
    expect(style(dialog(c)).display).toBe('flex')
  })

  test('abierto desde el primer render', async () => {
    const c = await render(<Harness initialOpen />)
    expect(dialog(c).open).toBe(true)
    expect(dialog(c).matches(':modal')).toBe(true)
  })

  test('open={false} desde el padre lo cierra', async () => {
    const c = await render(<Harness initialOpen />)
    await userEvent.click(buttons(c)[0]!)
    await expect.poll(() => dialog(c).open).toBe(false)
  })

  test('Escape llama a onClose y el padre lo cierra', async () => {
    const spy = vi.fn()
    const c = await render(<Harness onCloseSpy={spy} />)
    await open(c)
    await userEvent.keyboard('{Escape}')
    expect(spy).toHaveBeenCalledTimes(1)
    await expect.poll(() => dialog(c).open).toBe(false)
  })

  test('Escape no cierra si el padre no cambia open', async () => {
    const spy = vi.fn()
    const c = await render(<Harness onCloseSpy={spy} ignoreClose />)
    await open(c)
    await userEvent.keyboard('{Escape}')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(dialog(c).open).toBe(true)
  })

  test('si el navegador fuerza el cierre (segundo Escape seguido), avisa con onClose una vez más', async () => {
    const spy = vi.fn()
    const c = await render(<Harness onCloseSpy={spy} ignoreClose />)
    await open(c)
    await userEvent.keyboard('{Escape}')
    await userEvent.keyboard('{Escape}')
    // Chrome no deja cancelar el segundo: el diálogo se cierra y se pide cerrar otra vez.
    await expect.poll(() => spy.mock.calls.length).toBe(2)
  })

  test('clic en el fondo llama a onClose; clic dentro, no', async () => {
    const spy = vi.fn()
    const c = await render(<Harness onCloseSpy={spy} ignoreClose />)
    await open(c)
    await userEvent.click(headline(c))
    await userEvent.click(content(c))
    expect(spy).not.toHaveBeenCalled()
    await clickScrim(c)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(dialog(c).open).toBe(true)
  })

  test('closeOnScrimClick={false}: el fondo no cierra y Escape sí', async () => {
    const spy = vi.fn()
    const c = await render(<Harness onCloseSpy={spy} closeOnScrimClick={false} />)
    await open(c)
    await clickScrim(c)
    expect(spy).not.toHaveBeenCalled()
    expect(dialog(c).open).toBe(true)
    await userEvent.keyboard('{Escape}')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  test('la página no se desplaza mientras está abierto y se restaura al cerrar', async () => {
    const before = style(document.documentElement).overflow
    const c = await render(<Harness />)
    await open(c)
    expect(style(document.documentElement).overflow).toBe('hidden')
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => dialog(c).open).toBe(false)
    expect(style(document.documentElement).overflow).toBe(before)
  })
})

describe('Dialog: foco y teclado', () => {
  test('al abrir enfoca el primer enfocable; al cerrar vuelve al disparador', async () => {
    const c = await render(<Harness />)
    await open(c)
    expect(document.activeElement).toBe(buttons(c)[0])
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => dialog(c).open).toBe(false)
    expect(document.activeElement).toBe(q(c, '#opener'))
  })

  test('data-autofocus elige el foco inicial', async () => {
    function WithField() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button id="opener" onClick={() => setOpen(true)}>Abrir</button>
          <Dialog open={open} onClose={() => setOpen(false)}>
            <DialogHeadline>Renombrar</DialogHeadline>
            <DialogContent>
              <Button variant="text">Antes</Button>
              <TextField>
                <TextFieldLabel>Nombre</TextFieldLabel>
                <TextFieldInput data-autofocus />
              </TextField>
            </DialogContent>
          </Dialog>
        </>
      )
    }
    const c = await render(<WithField />)
    await open(c)
    expect(document.activeElement).toBe(q(c, '.mk-text-field-input'))
  })

  test('Tab y Shift+Tab dan la vuelta sin salir del diálogo', async () => {
    const c = await render(<Harness />)
    await open(c)
    const [cancel, remove] = buttons(c)
    expect(document.activeElement).toBe(cancel)
    await userEvent.tab()
    expect(document.activeElement).toBe(remove)
    await userEvent.tab()
    expect(document.activeElement).toBe(cancel)
    await userEvent.tab({ shift: true })
    expect(document.activeElement).toBe(remove)
  })

  test('el contenido largo sin enfocables entra en la vuelta de Tab (para desplazarlo)', async () => {
    const c = await render(<Harness long />)
    await open(c)
    const [cancel, remove] = buttons(c)
    // Chrome le da el foco inicial al contenido con scroll. Orden: contenido, Cancelar, Eliminar.
    expect(document.activeElement).toBe(content(c))
    await userEvent.tab()
    expect(document.activeElement).toBe(cancel)
    await userEvent.tab()
    expect(document.activeElement).toBe(remove)
    await userEvent.tab()
    expect(document.activeElement).toBe(content(c))
    // Con el anillo de Material (secondary, por dentro), no con el contorno del navegador.
    expect(content(c).matches(':focus-visible')).toBe(true)
    expect(style(content(c)).outlineColor).toBe(roleColor('secondary'))
    expect(style(content(c)).outlineOffset).toBe(`-${style(content(c)).outlineWidth}`)
    await userEvent.tab({ shift: true })
    expect(document.activeElement).toBe(remove)
  })
})

describe('Dialog: accesibilidad', () => {
  test('nombre desde el título y descripción desde el texto', async () => {
    const c = await render(<Harness initialOpen />)
    const el = page.getByRole('dialog', { name: '¿Eliminar archivo?' }).element()
    expect(el).toBe(dialog(c))
    expect(el.getAttribute('aria-labelledby')).toBe(headline(c).id)
    expect(el.getAttribute('aria-describedby')).toBe(content(c).id)
    expect(headline(c).tagName).toBe('H2')
    await expect.element(page.getByRole('dialog')).toHaveAccessibleDescription('No se puede deshacer.')
  })

  test('respeta ids propios y aria-describedby="" quita la descripción', async () => {
    const c = await render(
      <Dialog open aria-describedby="">
        <DialogHeadline id="mi-titulo">Título</DialogHeadline>
        <DialogContent>Texto</DialogContent>
      </Dialog>,
    )
    expect(dialog(c).getAttribute('aria-labelledby')).toBe('mi-titulo')
    expect(dialog(c).hasAttribute('aria-describedby')).toBe(false)
  })

  test('sin título no apunta a un id inexistente', async () => {
    const c = await render(
      <Dialog open aria-label="Aviso">
        <DialogContent>Texto</DialogContent>
      </Dialog>,
    )
    expect(dialog(c).hasAttribute('aria-labelledby')).toBe(false)
    expect(page.getByRole('dialog', { name: 'Aviso' }).element()).toBe(dialog(c))
  })

  test('alert usa role="alertdialog"', async () => {
    const c = await render(<Harness initialOpen alert />)
    expect(page.getByRole('alertdialog', { name: '¿Eliminar archivo?' }).element()).toBe(dialog(c))
  })

  test('las partes fuera de un Dialog avisan con un error', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(render(<DialogHeadline>Suelto</DialogHeadline>)).rejects.toThrow('DialogHeadline')
    err.mockRestore()
  })
})

describe('Dialog: medidas y colores', () => {
  test('contenedor: ancho 312, radio 28, surface-container-high, sin sombra', async () => {
    const c = await render(<Harness initialOpen />)
    const s = style(dialog(c))
    expect(dialog(c).getBoundingClientRect().width).toBe(312)
    expect(s.borderTopLeftRadius).toBe('28px')
    expect(s.borderBottomRightRadius).toBe('28px')
    expect(s.backgroundColor).toBe(roleColor('surface-container-high'))
    expect(s.boxShadow).toBe('none')
  })

  test('ancho mínimo 280 y máximo 560 (o la ventana menos 48)', async () => {
    const c = await render(<Harness initialOpen style={{ width: 100 }} />)
    expect(dialog(c).getBoundingClientRect().width).toBe(Math.min(280, innerWidth - 48))
    const c2 = await render(<Harness initialOpen style={{ width: 2000 }} />)
    expect(dialog(c2).getBoundingClientRect().width).toBe(Math.min(560, innerWidth - 48))
  })

  test('fondo: scrim al 32 %', async () => {
    const c = await render(<Harness initialOpen />)
    await expect.poll(() => backdrop(c)).toBe(mixColor('scrim', 32))
  })

  test('rellenos: 24 arriba y a los lados, 16 entre título y texto', async () => {
    const c = await render(<Harness initialOpen />)
    const h = at(c, headline(c))
    expect(h.y).toBe(24)
    expect(style(headline(c)).paddingLeft).toBe('24px')
    expect(style(headline(c)).paddingRight).toBe('24px')
    expect(style(content(c)).paddingLeft).toBe('24px')
    expect(at(c, content(c)).y - (h.y + h.height)).toBe(16)
  })

  test('acciones: 88 de alto, a la derecha a 24 del borde, 8 entre botones, 24 abajo', async () => {
    const c = await render(<Harness initialOpen />)
    const a = at(c, actions(c))
    expect(a.height).toBe(88)
    expect(a.bottom).toBe(0)
    const [cancel, remove] = buttons(c).map((b) => at(c, b))
    expect(remove!.right).toBe(24)
    expect(remove!.x - (cancel!.x + cancel!.width)).toBe(8)
    expect(a.bottom + remove!.bottom).toBe(24)
    // Del texto al botón: 24 (20 del kit más la mitad de la diferencia con el área táctil).
    const t = at(c, content(c))
    expect(cancel!.y - (t.y + t.height)).toBe(24)
    expect(style(buttons(c)[0]!).color).toBe(roleColor('primary'))
  })

  test('tipografía y colores del título y del texto', async () => {
    const c = await render(<Harness initialOpen />)
    const h = style(headline(c))
    expect(h.color).toBe(roleColor('on-surface'))
    expect(h.fontSize).toBe(token('fontSize', '--md-sys-typescale-headline-small-size'))
    expect(h.lineHeight).toBe(token('lineHeight', '--md-sys-typescale-headline-small-line-height'))
    expect(h.textAlign).toBe('start')
    const t = style(content(c))
    expect(t.color).toBe(roleColor('on-surface-variant'))
    expect(t.fontSize).toBe(token('fontSize', '--md-sys-typescale-body-medium-size'))
    expect(t.lineHeight).toBe(token('lineHeight', '--md-sys-typescale-body-medium-line-height'))
  })

  test('con icono: icono de 24 en secondary, icono y título centrados, texto al inicio', async () => {
    const c = await render(<Harness initialOpen withIcon />)
    const i = at(c, icon(c).querySelector('svg')!)
    const d = dialog(c).getBoundingClientRect()
    expect(i.width).toBe(24)
    expect(i.height).toBe(24)
    expect(i.y).toBe(24)
    expect(i.x + i.width / 2).toBe(d.width / 2)
    expect(style(icon(c)).color).toBe(roleColor('secondary'))
    const h = at(c, headline(c))
    expect(h.y - (i.y + i.height)).toBe(16)
    expect(style(headline(c)).textAlign).toBe('center')
    expect(style(content(c)).textAlign).toBe('start')
  })

  test('contenido largo: solo el texto se desplaza; título y acciones quedan a la vista', async () => {
    const c = await render(<Harness initialOpen long />)
    const d = dialog(c).getBoundingClientRect()
    expect(d.height).toBeLessThanOrEqual(innerHeight - 48)
    const t = content(c)
    expect(style(t).overflowY).toBe('auto')
    expect(t.scrollHeight).toBeGreaterThan(t.clientHeight)
    expect(at(c, headline(c)).y).toBe(24)
    expect(at(c, actions(c)).bottom).toBe(0)
    expect(at(c, actions(c)).height).toBe(88)
  })
})

describe('Dialog: movimiento', () => {
  const noMotion = () => document.getElementById('mk-test-no-motion') as HTMLStyleElement

  afterEach(async () => {
    noMotion().media = ''
    await commands.reduceMotion(false)
  })

  /**
   * Espera el fin de la entrada. Si se cierra al mismo instante de abrir, la opacidad todavía
   * está en 0 (el destino de la salida): no hay transición y el diálogo cierra enseguida.
   */
  const entered = async (c: ParentNode) => {
    await Promise.allSettled(dialog(c).getAnimations().map((a) => a.finished))
  }

  /** La curva de un resorte, serializada como la devuelve el navegador. */
  function easing(name: string) {
    const probe = document.createElement('span')
    probe.style.transitionTimingFunction = `var(--md-sys-motion-spring-${name}-easing)`
    document.body.append(probe)
    const value = withMotion(() => getComputedStyle(probe).transitionTimingFunction)
    probe.remove()
    return value
  }

  test('entrada y salida declaradas con resortes', async () => {
    const c = await render(<Harness initialOpen />)
    const d = dialog(c)
    const read = () =>
      withMotion(() => {
        const s = style(d)
        return [s.transitionProperty, s.transitionDuration, s.transitionTimingFunction.split(/, (?=linear)/)]
      })
    expect(read()).toEqual([
      'opacity, translate',
      '0.24s, 0.44s',
      [easing('default-effects'), easing('default-spatial')],
    ])
    d.setAttribute('data-closing', '')
    expect(read()).toEqual(['opacity, translate', '0.15s, 0.36s', [easing('fast-effects'), easing('fast-spatial')]])
    expect(style(d).opacity).toBe('0')
    expect(style(d).translate).toBe('0px -48px')
    await expect.poll(() => backdrop(c)).toBe('rgba(0, 0, 0, 0)')
    d.removeAttribute('data-closing')
  })

  test('con open={false} anima la salida antes de cerrar', async () => {
    noMotion().media = 'not all'
    const c = await render(<Harness initialOpen />)
    await entered(c)
    // El cierre lo pide el padre desde afuera (el resto de la página es inerte al puntero).
    clickFromCode(c, '#toggle-off')
    // Sigue abierto (en la capa superior, con su fondo) mientras dura la salida.
    await expect.poll(() => dialog(c).hasAttribute('data-closing')).toBe(true)
    expect(dialog(c).open).toBe(true)
    expect(dialog(c).getAnimations().length).toBeGreaterThan(0)
    await expect.poll(() => dialog(c).open).toBe(false)
    expect(dialog(c).hasAttribute('data-closing')).toBe(false)
  })

  test('volver a abrir durante la salida la anula', async () => {
    noMotion().media = 'not all'
    const c = await render(<Harness initialOpen />)
    await entered(c)
    clickFromCode(c, '#toggle-off')
    await expect.poll(() => dialog(c).hasAttribute('data-closing')).toBe(true)
    clickFromCode(c, '#opener')
    await expect.poll(() => dialog(c).hasAttribute('data-closing')).toBe(false)
    // Esperar a que terminen todas las transiciones: el cierre anulado no se ejecuta después.
    await Promise.allSettled(dialog(c).getAnimations().map((a) => a.finished))
    expect(dialog(c).open).toBe(true)
  })

  test('el resto de la página es inerte mientras está abierto', async () => {
    const c = await render(<Harness initialOpen />)
    expect(document.elementFromPoint(5, 5)).toBe(dialog(c))
    expect(q(c, '#opener').matches(':modal')).toBe(false)
  })

  test('con prefers-reduced-motion: sin desplazamiento, solo fundido', async () => {
    await commands.reduceMotion(true)
    const c = await render(<Harness initialOpen />)
    const d = dialog(c)
    d.setAttribute('data-closing', '')
    expect(style(d).translate).toBe('none')
    expect(style(d).opacity).toBe('0')
    const duration = withMotion(() => style(d).transitionDuration)
    expect(duration).toBe('0.15s, 0s')
    d.removeAttribute('data-closing')
  })
})

describe('Dialog: props nativas y ref', () => {
  test('ref, className, style y atributos llegan al <dialog>', async () => {
    const ref = createRef<HTMLDialogElement>()
    const c = await render(
      <Dialog open ref={ref} className="propio" style={{ marginTop: 10 }} data-testid="d" id="mi-dialogo">
        <DialogHeadline>Título</DialogHeadline>
      </Dialog>,
    )
    expect(ref.current).toBe(dialog(c))
    expect(ref.current).toBeInstanceOf(HTMLDialogElement)
    expect(dialog(c).className).toBe('mk-dialog propio')
    expect(dialog(c).style.marginTop).toBe('10px')
    expect(dialog(c).dataset.testid).toBe('d')
    expect(dialog(c).id).toBe('mi-dialogo')
  })

  test('los manejadores propios se siguen llamando', async () => {
    const onKeyDown = vi.fn()
    const onClick = vi.fn()
    const onCancel = vi.fn()
    const c = await render(<Harness initialOpen onKeyDown={onKeyDown} onClick={onClick} onCancel={onCancel} ignoreClose />)
    await userEvent.click(headline(c))
    await userEvent.keyboard('{Escape}')
    expect(onClick).toHaveBeenCalled()
    expect(onKeyDown).toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('las partes aceptan ref y props nativas', async () => {
    const h = createRef<HTMLHeadingElement>()
    const t = createRef<HTMLDivElement>()
    const i = createRef<HTMLSpanElement>()
    const a = createRef<HTMLDivElement>()
    const c = await render(
      <Dialog open>
        <DialogIcon ref={i} className="x"><DeleteIcon /></DialogIcon>
        <DialogHeadline ref={h} title="t">Título</DialogHeadline>
        <DialogContent ref={t} data-x="1">Texto</DialogContent>
        <DialogActions ref={a}><Button variant="text">Ok</Button></DialogActions>
      </Dialog>,
    )
    expect(h.current).toBe(headline(c))
    expect(h.current?.title).toBe('t')
    expect(t.current).toBe(content(c))
    expect(t.current?.dataset.x).toBe('1')
    expect(i.current).toBe(icon(c))
    expect(i.current?.className).toBe('mk-dialog-icon x')
    expect(a.current).toBe(actions(c))
  })
})
