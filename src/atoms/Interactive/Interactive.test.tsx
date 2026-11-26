import { createRef, type AnchorHTMLAttributes, type ReactNode, type Ref } from 'react'
import { describe, expect, test } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'
import { FocusRing } from '../FocusRing/FocusRing.tsx'
import { Ripple } from '../Ripple/Ripple.tsx'
import { StateLayer } from '../StateLayer/StateLayer.tsx'
import { render, style } from '../../test/render.tsx'
import { Interactive, type InteractiveProps } from './Interactive.tsx'

const q = (c: ParentNode, sel: string) => {
  const el = c.querySelector(sel)
  if (!el) throw new Error(`no se encontró ${sel}`)
  return el as HTMLElement
}

/** Imita el Link de Next.js y de React Router: reparte el resto de sus props sobre un <a>. */
interface FakeLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string
  prefetch?: boolean | undefined
  ref?: Ref<HTMLAnchorElement> | undefined
  children?: ReactNode
}
function FakeLink({ to, prefetch, ref, ...rest }: FakeLinkProps) {
  return <a {...rest} ref={ref} href={to} data-prefetch={String(prefetch ?? true)} />
}

/** Imita el NavLink de React Router: pone aria-current él mismo y acepta className función. */
function FakeNavLink({
  to,
  current,
  className,
  ...rest
}: Omit<FakeLinkProps, 'className'> & { current: boolean; className?: string | ((s: { isActive: boolean }) => string) }) {
  return (
    <a
      {...rest}
      href={to}
      aria-current={current ? 'page' : undefined}
      className={typeof className === 'function' ? className({ isActive: current }) : className}
    />
  )
}

describe('Interactive: las tres formas', () => {
  test('con href, un <a> con sus atributos, sus hijos y la ref al <a>', async () => {
    const ref = createRef<HTMLAnchorElement>()
    const c = await render(
      <Interactive href="/ayuda" ref={ref} target="_blank" id="x" data-x="1" aria-label="Ayuda">
        <span>Ayuda</span>
      </Interactive>,
    )
    const a = q(c, 'a')
    expect(page.getByRole('link', { name: 'Ayuda' }).element()).toBe(a)
    expect(a.getAttribute('href')).toBe('/ayuda')
    expect(a.getAttribute('target')).toBe('_blank')
    expect(a.id).toBe('x')
    expect(a.dataset['x']).toBe('1')
    expect(a.innerHTML).toBe('<span>Ayuda</span>')
    expect(a.hasAttribute('type')).toBe(false)
    expect(a.hasAttribute('class')).toBe(false)
    expect(ref.current).toBe(a)
  })

  test('sin href, un <button type="button"> con sus atributos y la ref al <button>', async () => {
    const ref = createRef<HTMLButtonElement>()
    let clicks = 0
    const c = await render(
      <Interactive ref={ref} name="n" value="v" onClick={() => clicks++}>
        Guardar
      </Interactive>,
    )
    const b = q(c, 'button')
    expect(page.getByRole('button', { name: 'Guardar' }).element()).toBe(b)
    expect(b.getAttribute('type')).toBe('button')
    expect(b.getAttribute('name')).toBe('n')
    expect(b.hasAttribute('class')).toBe(false)
    expect(ref.current).toBe(b)
    await userEvent.click(b)
    expect(clicks).toBe(1)
  })

  test('type: "button" por defecto, también con type={undefined}, y otro si se pasa', async () => {
    const submits: string[] = []
    const c = await render(
      <form onSubmit={(e) => { e.preventDefault(); submits.push('submit') }}>
        <Interactive id="sin">Sin type</Interactive>
        <Interactive id="undef" type={undefined}>Undefined</Interactive>
        <Interactive id="submit" type="submit">Enviar</Interactive>
      </form>,
    )
    expect(q(c, '#sin').getAttribute('type')).toBe('button')
    expect(q(c, '#undef').getAttribute('type')).toBe('button')
    expect(q(c, '#submit').getAttribute('type')).toBe('submit')
    await userEvent.click(q(c, '#sin'))
    await userEvent.click(q(c, '#undef'))
    expect(submits).toEqual([])
    await userEvent.click(q(c, '#submit'))
    expect(submits).toEqual(['submit'])
  })

  test('disabled llega al <button> (las reglas de deshabilitado son del control)', async () => {
    const c = await render(<Interactive disabled>Nada</Interactive>)
    expect((q(c, 'button') as HTMLButtonElement).disabled).toBe(true)
  })

  test('con render, el elemento que se pase recibe las props, la ref y los hijos', async () => {
    const ref = createRef<HTMLElement>()
    const c = await render(
      <Interactive
        ref={ref}
        className="mk-x"
        id="d"
        data-x="1"
        aria-current="page"
        render={<FakeLink to="/pedidos" prefetch={false} />}
      >
        Pedidos
      </Interactive>,
    )
    const a = q(c, 'a')
    expect(page.getByRole('link', { name: 'Pedidos' }).element()).toBe(a)
    expect(a.getAttribute('href')).toBe('/pedidos')
    expect(a.dataset['prefetch']).toBe('false')
    expect(a.className).toBe('mk-x')
    expect(a.id).toBe('d')
    expect(a.dataset['x']).toBe('1')
    expect(a.getAttribute('aria-current')).toBe('page')
    expect(a.textContent).toBe('Pedidos')
    expect(ref.current).toBe(a)
  })

  test('render con un elemento nativo (<a>) también sirve', async () => {
    const c = await render(<Interactive className="mk-x" render={<a href="/x" />}>Ir</Interactive>)
    const a = q(c, 'a')
    expect(a.getAttribute('href')).toBe('/x')
    expect(a.className).toBe('mk-x')
    expect(a.textContent).toBe('Ir')
  })
})

describe('Interactive: clases, precedencia e hijos de render', () => {
  test('className llega tal cual al <a> y al <button>', async () => {
    const c = await render(
      <>
        <Interactive href="/a" className="uno dos">A</Interactive>
        <Interactive className="tres">B</Interactive>
      </>,
    )
    expect(q(c, 'a').className).toBe('uno dos')
    expect(q(c, 'button').className).toBe('tres')
  })

  test('con render, las clases se combinan: las de Interactive primero y después las del elemento', async () => {
    const c = await render(
      <>
        <Interactive className="mk-x" render={<FakeLink to="/a" className="own" />}>A</Interactive>
        <Interactive render={<FakeLink to="/b" className="own" />}>B</Interactive>
        <Interactive className="mk-x" render={<FakeLink to="/c" />}>C</Interactive>
        <Interactive render={<FakeLink to="/d" />}>D</Interactive>
      </>,
    )
    const [a, b, cc, d] = [...c.querySelectorAll('a')]
    expect(a!.className).toBe('mk-x own')
    expect(b!.className).toBe('own')
    expect(cc!.className).toBe('mk-x')
    expect(d!.hasAttribute('class')).toBe(false)
  })

  test('className función (NavLink): recibe el estado y su resultado se suma', async () => {
    const c = await render(
      <>
        <Interactive className="mk-x" render={<FakeNavLink to="/a" current className={({ isActive }) => (isActive ? 'on' : 'off')} />}>
          A
        </Interactive>
        <Interactive className="mk-x" render={<FakeNavLink to="/b" current={false} className={({ isActive }) => (isActive ? 'on' : 'off')} />}>
          B
        </Interactive>
        <Interactive render={<FakeNavLink to="/c" current className={() => 'solo'} />}>C</Interactive>
      </>,
    )
    const [a, b, cc] = [...c.querySelectorAll('a')]
    expect(a!.className).toBe('mk-x on')
    expect(a!.getAttribute('aria-current')).toBe('page')
    expect(b!.className).toBe('mk-x off')
    expect(b!.hasAttribute('aria-current')).toBe(false)
    expect(cc!.className).toBe('solo')
  })

  test('las props del elemento de render ganan, incluida su ref', async () => {
    const mine = createRef<HTMLElement>()
    const own = createRef<HTMLAnchorElement>()
    let clicked = ''
    const c = await render(
      <Interactive
        ref={mine}
        id="interactive"
        aria-label="De Interactive"
        onClick={() => (clicked = 'interactive')}
        render={<FakeLink to="/a" ref={own} id="own" aria-label="Del enlace" onClick={() => (clicked = 'own')} />}
      >
        A
      </Interactive>,
    )
    const a = q(c, 'a')
    expect(a.id).toBe('own')
    expect(a.getAttribute('aria-label')).toBe('Del enlace')
    expect(own.current).toBe(a)
    expect(mine.current).toBeNull()
    a.addEventListener('click', (e) => e.preventDefault())
    await userEvent.click(a)
    expect(clicked).toBe('own')
  })

  test('los hijos del elemento de render se reemplazan por los de Interactive', async () => {
    const c = await render(
      <Interactive render={<FakeLink to="/a">Hijos del enlace</FakeLink>}>
        <span>De Interactive</span>
      </Interactive>,
    )
    expect(q(c, 'a').innerHTML).toBe('<span>De Interactive</span>')
  })

  test('render que no es un elemento: error claro', async () => {
    const bad = { render: FakeLink } as unknown as InteractiveProps
    await expect(render(<Interactive {...bad}>A</Interactive>)).rejects.toThrow(
      'Interactive espera en `render` un elemento, por ejemplo render={<Link href="/" />}.',
    )
  })
})

describe('Interactive: tipos', () => {
  test('cada forma acepta lo suyo y rechaza lo de las otras', () => {
    const anchorRef = createRef<HTMLAnchorElement>()
    const buttonRef = createRef<HTMLButtonElement>()
    const ok = [
      <Interactive key="1" href="/x" ref={anchorRef} target="_blank" download>A</Interactive>,
      <Interactive key="2" ref={buttonRef} type="submit" disabled>B</Interactive>,
      <Interactive key="3" render={<FakeLink to="/x" />} ref={createRef<HTMLElement>()}>C</Interactive>,
    ]
    const wrong = [
      // @ts-expect-error: href y render no van juntos.
      <Interactive key="4" href="/x" render={<FakeLink to="/x" />}>D</Interactive>,
      // @ts-expect-error: la ref de un <a> no es de un <button>.
      <Interactive key="5" href="/x" ref={buttonRef}>E</Interactive>,
      // @ts-expect-error: la ref de un <button> no es de un <a>.
      <Interactive key="6" ref={anchorRef}>F</Interactive>,
      // @ts-expect-error: render recibe un elemento, no un componente.
      <Interactive key="7" render={FakeLink}>G</Interactive>,
      // @ts-expect-error: un <a> no tiene disabled.
      <Interactive key="8" href="/x" disabled>H</Interactive>,
    ]
    expect(ok.length + wrong.length).toBe(8)
  })
})

// Un control propio armado con la API pública: Interactive y los tres átomos, con su CSS. Prueba
// que la composición alcanza para un control con foco visible y estados en las tres formas.
const CONTROL_CSS = `
  .my-control {
    display: inline-flex;
    align-items: center;
    padding: 8px 16px;
    border: 0;
    outline: none;
    border-radius: 8px;
    color: var(--md-sys-color-on-primary-container);
    background: var(--md-sys-color-primary-container);
    font: inherit;
    text-decoration: none;
  }
`
function MyControl({ className, children, ...props }: InteractiveProps) {
  return (
    <Interactive {...props} className={['my-control', className].filter(Boolean).join(' ')}>
      <StateLayer />
      <Ripple />
      <FocusRing />
      {children}
    </Interactive>
  )
}
async function renderControl(control: ReactNode) {
  return render(
    <>
      <style>{CONTROL_CSS}</style>
      {control}
    </>,
  )
}
const FORMS = {
  enlace: () => <MyControl href="#ayuda">Ayuda</MyControl>,
  botón: () => <MyControl>Ayuda</MyControl>,
  render: () => <MyControl render={<FakeLink to="#ayuda" />}>Ayuda</MyControl>,
} as const
const opacity = (el: Element | null) => Number(style(el).opacity)
const token = (name: string) => Number(getComputedStyle(document.documentElement).getPropertyValue(name))

describe('Interactive: control propio con StateLayer, Ripple y FocusRing', () => {
  for (const [form, Control] of Object.entries(FORMS)) {
    test(`${form}: los átomos son hijos directos y en reposo no se ven`, async () => {
      const c = await renderControl(<Control />)
      const el = q(c, '.my-control')
      expect(el.querySelectorAll(':scope > .mk-state-layer, :scope > .mk-ripple, :scope > .mk-focus-ring')).toHaveLength(3)
      expect(style(el).position).toBe('relative')
      expect(opacity(el.querySelector('.mk-state-layer'))).toBe(0)
      expect(opacity(el.querySelector('.mk-focus-ring'))).toBe(0)
    })

    test(`${form}: con el puntero encima, capa de hover`, async () => {
      const c = await renderControl(<Control />)
      const el = q(c, '.my-control')
      await userEvent.hover(el)
      expect(opacity(el.querySelector('.mk-state-layer'))).toBeCloseTo(token('--md-sys-state-hover-state-layer-opacity'))
    })

    test(`${form}: foco de teclado con anillo visible y capa de foco, sin onda`, async () => {
      const c = await renderControl(<Control />)
      const el = q(c, '.my-control')
      await userEvent.tab()
      expect(document.activeElement).toBe(el)
      expect(opacity(el.querySelector('.mk-focus-ring'))).toBe(1)
      expect(opacity(el.querySelector('.mk-state-layer'))).toBeCloseTo(token('--md-sys-state-focus-state-layer-opacity'))
      expect(el.querySelector('.mk-ripple-wave')).toBeNull()
    })

    // WebKit en macOS no lleva el foco con Tab a enlaces ni botones: el estado de foco visible se
    // prueba además enfocando por script con focusVisible, que los tres motores respetan.
    test(`${form}: foco visible por script (focusVisible) con anillo y capa de foco`, async () => {
      const c = await renderControl(<Control />)
      const el = q(c, '.my-control')
      el.focus({ focusVisible: true })
      expect(document.activeElement).toBe(el)
      expect(opacity(el.querySelector('.mk-focus-ring'))).toBe(1)
      expect(opacity(el.querySelector('.mk-state-layer'))).toBeCloseTo(token('--md-sys-state-focus-state-layer-opacity'))
      // Un solo anillo: el del FocusRing, no el contorno nativo del navegador.
      expect(style(el).outlineStyle).toBe('none')
    })

    test(`${form}: presionado, capa de presionado y onda que se va al soltar`, async () => {
      const c = await renderControl(<Control />)
      const el = q(c, '.my-control')
      el.addEventListener('click', (e) => e.preventDefault())
      await commands.pressDown('.my-control')
      expect(opacity(el.querySelector('.mk-state-layer'))).toBeCloseTo(token('--md-sys-state-pressed-state-layer-opacity'))
      expect(el.querySelector('.mk-ripple-wave')).not.toBeNull()
      await commands.pressUp()
      await expect.poll(() => el.querySelector('.mk-ripple-wave'), { timeout: 2000 }).toBeNull()
    })
  }

  test('botón deshabilitado: sin capa ni onda (lo resuelven los átomos)', async () => {
    const c = await renderControl(<MyControl disabled>Nada</MyControl>)
    const el = q(c, '.my-control')
    await commands.pressDown('.my-control')
    expect(opacity(el.querySelector('.mk-state-layer'))).toBe(0)
    expect(el.querySelector('.mk-ripple-wave')).toBeNull()
    await commands.pressUp()
  })
})
