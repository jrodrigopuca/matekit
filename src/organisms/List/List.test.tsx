import { createRef, type AnchorHTMLAttributes, type ReactNode, type Ref } from 'react'
import { describe, expect, test } from 'vitest'
import { commands, page, server, userEvent } from 'vitest/browser'
import { ChevronRightIcon, MoreVertIcon, StarIcon } from '../../icons/icons.tsx'
import { Checkbox } from '../../molecules/Checkbox/Checkbox.tsx'
import { IconButton } from '../../molecules/IconButton/IconButton.tsx'
import { RadioButton } from '../../molecules/RadioButton/RadioButton.tsx'
import { RadioGroup } from '../../molecules/RadioButton/RadioGroup.tsx'
import { Switch } from '../../molecules/Switch/Switch.tsx'
import { render, roleColor, style } from '../../test/render.tsx'
import {
  List,
  ListItem,
  ListItemAction,
  ListItemDetails,
  ListItemHeadline,
  ListItemLeading,
  ListItemOverline,
  ListItemSummary,
  ListItemSupporting,
  ListItemTrailing,
} from './List.tsx'

const px = (v: string) => parseFloat(v)
const rect = (el: Element) => el.getBoundingClientRect()
const q = (c: ParentNode, sel: string) => {
  const el = c.querySelector(sel)
  if (!el) throw new Error(`no se encontró ${sel}`)
  return el as HTMLElement
}
const qa = (c: ParentNode, sel: string) => [...c.querySelectorAll(sel)] as HTMLElement[]
const corners = (el: Element) => {
  const s = style(el)
  return [s.borderStartStartRadius, s.borderStartEndRadius, s.borderEndStartRadius, s.borderEndEndRadius].map(px)
}
// WebKit en macOS no lleva el foco a enlaces ni botones con Tab (ajuste del sistema, ver CLAUDE.md).
// Las pruebas de estados de foco llegan en WebKit con .focus({ focusVisible: true }) (sin esa opción,
// un foco por script no aplica :focus-visible en WebKit), así prueban el CSS en los dos WebKit; el
// recorrido con Tab lo prueba "Tab recorre…", que en el WebKit de macOS falla por ese ajuste y en el
// de Linux del CI pasa.
async function keyboardFocus(el: HTMLElement) {
  await userEvent.keyboard('{Shift}')
  el.focus({ focusVisible: true } as FocusOptions)
}
const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex]'
const transparent = 'rgba(0, 0, 0, 0)'

function FakeLink({ to, ref, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; ref?: Ref<HTMLAnchorElement> }) {
  return <a {...props} ref={ref} href={to} data-router="" />
}

const Box = ({ width = 360, children, dir }: { width?: number; children: ReactNode; dir?: 'rtl' }) => (
  <div style={{ width }} dir={dir}>{children}</div>
)

describe('estructura y semántica', () => {
  test('(a) contenido: <ul role="list"> con <li>, partes como <span> y nada enfocable', async () => {
    const c = await render(
      <List aria-label="Contactos">
        <ListItem>
          <ListItemLeading><StarIcon /></ListItemLeading>
          <ListItemOverline>Equipo</ListItemOverline>
          <ListItemHeadline>Ana</ListItemHeadline>
          <ListItemSupporting>ana@example.com</ListItemSupporting>
          <ListItemTrailing>Admin</ListItemTrailing>
        </ListItem>
        <ListItem><ListItemHeadline>Beto</ListItemHeadline></ListItem>
      </List>,
    )
    const ul = q(c, 'ul')
    // role="list" explícito: Safari deja de anunciar la lista con list-style: none.
    expect(ul.getAttribute('role')).toBe('list')
    expect(style(ul).listStyleType).toBe('none')
    await expect.element(page.getByRole('list', { name: 'Contactos' })).toBeInTheDocument()
    expect(page.getByRole('listitem').all()).toHaveLength(2)
    for (const sel of ['leading', 'overline', 'headline', 'supporting', 'trailing']) {
      expect(q(c, `.mk-list-item-${sel}`).tagName).toBe('SPAN')
    }
    expect(qa(c, FOCUSABLE)).toHaveLength(0)
    // Los átomos de la fila de selección están ocultos en un elemento de contenido.
    expect(style(q(c, 'li > .mk-state-layer')).display).toBe('none')
    expect(style(q(c, 'li > .mk-focus-ring')).display).toBe('none')
  })

  test('(b) elementos que son enlaces: <a> dentro del texto principal, nombre = texto, aria-current', async () => {
    const c = await render(
      <Box>
        <List aria-label="Mensajes">
          <ListItem>
            <ListItemLeading><StarIcon /></ListItemLeading>
            <ListItemHeadline><ListItemAction href="#ana" current>Ana Rivas</ListItemAction></ListItemHeadline>
            <ListItemSupporting>Reunión</ListItemSupporting>
          </ListItem>
          <ListItem>
            <ListItemHeadline><ListItemAction render={<FakeLink to="/beto" className="propia" />}>Beto</ListItemAction></ListItemHeadline>
          </ListItem>
        </List>
      </Box>,
    )
    await expect.element(page.getByRole('link', { name: 'Ana Rivas' })).toHaveAttribute('aria-current', 'page')
    const beto = page.getByRole('link', { name: 'Beto' }).element() as HTMLAnchorElement
    expect(beto.getAttribute('href')).toBe('/beto')
    expect(beto.dataset['router']).toBe('')
    expect(beto.className).toBe('mk-list-item-action propia')
    expect(beto.hasAttribute('aria-current')).toBe(false)
    // Sin interactivos anidados.
    for (const a of qa(c, 'a')) expect(a.querySelectorAll(FOCUSABLE)).toHaveLength(0)
  })

  test('(b) el área del enlace cubre todo el elemento: el inicio, el apoyo y el relleno', async () => {
    let clicks = 0
    const c = await render(
      <Box>
        <List>
          <ListItem>
            <ListItemLeading><StarIcon /></ListItemLeading>
            <ListItemHeadline>
              <ListItemAction href="#x" onClick={(e) => { e.preventDefault(); clicks++ }}>Ana</ListItemAction>
            </ListItemHeadline>
            <ListItemSupporting>Apoyo</ListItemSupporting>
          </ListItem>
        </List>
      </Box>,
    )
    const li = q(c, 'li')
    const a = q(c, 'a')
    const r = rect(li)
    for (const [x, y] of [[r.left + 3, r.top + 3], [r.left + 26, r.top + r.height / 2], [r.right - 3, r.bottom - 3], [r.left + 60, r.bottom - 14]]) {
      expect(document.elementFromPoint(x!, y!)).toBe(a)
    }
    await userEvent.click(q(c, '.mk-list-item-supporting'), { force: true })
    await userEvent.click(q(c, '.mk-list-item-leading'), { force: true })
    expect(clicks).toBe(2)
  })

  test('(c) acciones: botones con Enter y Espacio; un IconButton al final queda encima y aparte', async () => {
    const log: string[] = []
    const c = await render(
      <Box>
        <List>
          <ListItem>
            <ListItemHeadline><ListItemAction onClick={() => log.push('editar')}>Editar</ListItemAction></ListItemHeadline>
            <ListItemTrailing><IconButton label="Más" size="sm" onClick={() => log.push('más')}><MoreVertIcon /></IconButton></ListItemTrailing>
          </ListItem>
        </List>
      </Box>,
    )
    const action = page.getByRole('button', { name: 'Editar' }).element() as HTMLButtonElement
    expect(action.type).toBe('button')
    const more = page.getByRole('button', { name: 'Más' }).element() as HTMLButtonElement
    const mr = rect(more)
    expect(document.elementFromPoint(mr.left + mr.width / 2, mr.top + mr.height / 2)?.closest('button')).toBe(more)
    await userEvent.click(more)
    expect(log).toEqual(['más'])
    action.focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard(' ')
    expect(log).toEqual(['más', 'editar', 'editar'])
    expect(action.querySelectorAll(FOCUSABLE)).toHaveLength(0)
  })

  test('Tab recorre por separado el enlace, la acción, el IconButton, el control y el acordeón', async () => {
    // En el WebKit de macOS falla por el ajuste del sistema (no enfoca enlaces ni botones con Tab);
    // pasa en el de Linux del CI. Los estados de foco se prueban aparte con .focus().
    await render(
      <List>
        <ListItem><ListItemHeadline><ListItemAction href="#a">Enlace</ListItemAction></ListItemHeadline></ListItem>
        <ListItem>
          <ListItemHeadline><ListItemAction>Editar</ListItemAction></ListItemHeadline>
          <ListItemTrailing><IconButton label="Más" size="sm"><MoreVertIcon /></IconButton></ListItemTrailing>
        </ListItem>
        <ListItem><Checkbox><ListItemHeadline>Casilla</ListItemHeadline></Checkbox></ListItem>
        <ListItem>
          <ListItemDetails><ListItemSummary><ListItemHeadline>Acordeón</ListItemHeadline></ListItemSummary><p>x</p></ListItemDetails>
        </ListItem>
      </List>,
    )
    const names: string[] = []
    for (let i = 0; i < 5; i++) {
      await userEvent.tab()
      const el = document.activeElement as HTMLElement
      names.push(el.getAttribute('aria-label') ?? el.closest('label, a, button, summary')?.textContent ?? '')
    }
    expect(names).toEqual(['Enlace', 'Editar', 'Más', 'Casilla', 'Acordeón'])
  })

  test('(c) deshabilitado: solo como botón; no se enfoca y el contenido queda al 38 %', async () => {
    let clicks = 0
    const c = await render(
      <List>
        <ListItem>
          <ListItemLeading><StarIcon /></ListItemLeading>
          <ListItemHeadline><ListItemAction disabled onClick={() => clicks++}>Borrar</ListItemAction></ListItemHeadline>
          <ListItemSupporting>Sin permiso</ListItemSupporting>
        </ListItem>
      </List>,
    )
    await userEvent.click(q(c, 'li'), { force: true })
    expect(clicks).toBe(0)
    for (const sel of ['leading', 'headline', 'supporting']) expect(style(q(c, `.mk-list-item-${sel}`)).opacity).toBe('0.38')
    expect(style(q(c, 'li')).cursor).not.toBe('pointer')
    // @ts-expect-error: un enlace no se deshabilita (ADR-0010).
    void (<ListItemAction href="#" disabled>x</ListItemAction>)
  })

  test('(d) selección: la etiqueta del control envuelve el texto; toda la fila lo marca', async () => {
    const c = await render(
      <Box>
        <List>
          <ListItem>
            <ListItemLeading><StarIcon /></ListItemLeading>
            <Checkbox name="compras" value="leche">
              <ListItemHeadline>Leche</ListItemHeadline>
              <ListItemSupporting>1 unidad</ListItemSupporting>
            </Checkbox>
            <ListItemTrailing>$ 900</ListItemTrailing>
          </ListItem>
        </List>
      </Box>,
    )
    const box = page.getByRole('checkbox', { name: 'Leche 1 unidad' }).element() as HTMLInputElement
    expect(box.labels).toHaveLength(1)
    // Válido: la etiqueta no contiene otra etiqueta ni otro control.
    expect(box.labels?.[0]?.querySelectorAll('label, button, a')).toHaveLength(0)
    await userEvent.click(q(c, '.mk-list-item-leading'), { force: true })
    expect(box.checked).toBe(true)
    await userEvent.click(q(c, '.mk-list-item-trailing'), { force: true })
    expect(box.checked).toBe(false)
    await userEvent.click(q(c, 'li'), { position: { x: 3, y: 3 } })
    expect(box.checked).toBe(true)
    box.focus()
    await userEvent.keyboard(' ')
    expect(box.checked).toBe(false)
    // El control queda al final: la casilla, a 17 del borde (Compose).
    const li = q(c, 'li')
    expect(rect(li).right - rect(q(c, '.mk-checkbox-box')).right).toBeCloseTo(17, 1)
    // Sus átomos propios se ocultan; la fila usa los del <li>.
    expect(style(q(c, '.mk-checkbox-control > .mk-state-layer')).display).toBe('none')
    expect(style(q(c, 'li > .mk-state-layer')).display).toBe('block')
  })

  test('(d) radios en un RadioGroup: las flechas mueven la selección y el texto es el nombre', async () => {
    const c = await render(
      <RadioGroup aria-label="Envío" defaultValue="a">
        <List>
          <ListItem><RadioButton value="a"><ListItemHeadline>Correo</ListItemHeadline></RadioButton></ListItem>
          <ListItem><RadioButton value="b"><ListItemHeadline>Retiro</ListItemHeadline></RadioButton></ListItem>
        </List>
      </RadioGroup>,
    )
    const a = page.getByRole('radio', { name: 'Correo' }).element() as HTMLInputElement
    const b = page.getByRole('radio', { name: 'Retiro' }).element() as HTMLInputElement
    expect(a.checked).toBe(true)
    a.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(b.checked).toBe(true)
    await userEvent.click(qa(c, 'li')[0]!, { position: { x: 3, y: 3 } })
    expect(a.checked).toBe(true)
  })

  test('(d) el switch: toda la fila lo alterna; encendido no marca el elemento como seleccionado', async () => {
    const c = await render(
      <List>
        <ListItem><Switch defaultChecked><ListItemHeadline>Wi-Fi</ListItemHeadline></Switch></ListItem>
      </List>,
    )
    const sw = page.getByRole('switch', { name: 'Wi-Fi' }).element() as HTMLInputElement
    expect(sw.checked).toBe(true)
    expect(style(q(c, 'li')).backgroundColor).toBe(transparent)
    await userEvent.click(q(c, 'li'), { position: { x: 3, y: 3 } })
    expect(sw.checked).toBe(false)
    expect(rect(q(c, 'li')).right - rect(q(c, '.mk-switch-track')).right).toBeCloseTo(16, 1)
  })

  test('(d) deshabilitado: la fila no lo marca, inicio y final al 38 %, sin capa ni onda', async () => {
    const c = await render(
      <List>
        <ListItem>
          <ListItemLeading><StarIcon /></ListItemLeading>
          <Checkbox disabled><ListItemHeadline>Pan</ListItemHeadline></Checkbox>
          <ListItemTrailing>0</ListItemTrailing>
        </ListItem>
        <ListItem><Checkbox disabled defaultChecked><ListItemHeadline>Yerba</ListItemHeadline></Checkbox></ListItem>
      </List>,
    )
    const [li1, li2] = qa(c, 'li')
    await userEvent.click(li1!, { position: { x: 3, y: 3 }, force: true })
    expect((q(li1!, 'input') as HTMLInputElement).checked).toBe(false)
    expect(style(q(li1!, '.mk-list-item-leading')).opacity).toBe('0.38')
    expect(style(q(li1!, '.mk-list-item-trailing')).opacity).toBe('0.38')
    expect(style(q(li1!, '.mk-checkbox-label')).opacity).toBe('0.38')
    expect(style(q(li1!, ':scope > .mk-state-layer')).display).toBe('none')
    expect(style(q(li1!, ':scope > .mk-ripple')).display).toBe('none')
    // Seleccionado y deshabilitado: fondo On Surface al 10 %, contenido On Surface, radio 16 (kit).
    const probe = document.createElement('span')
    probe.style.backgroundColor = 'color-mix(in srgb, var(--md-sys-color-on-surface) 10%, transparent)'
    document.body.append(probe)
    expect(style(li2!).backgroundColor).toBe(getComputedStyle(probe).backgroundColor)
    probe.remove()
    expect(style(q(li2!, '.mk-list-item-headline')).color).toBe(roleColor('on-surface'))
    expect(corners(li2!)).toEqual([16, 16, 16, 16])
  })

  test('(e) acordeón: <details>/<summary>; Enter y Espacio; uno a la vez con name', async () => {
    const c = await render(
      <List>
        {['Uno', 'Dos'].map((t) => (
          <ListItem key={t}>
            <ListItemDetails name="faq">
              <ListItemSummary><ListItemHeadline>{t}</ListItemHeadline></ListItemSummary>
              <p>Contenido {t}</p>
            </ListItemDetails>
          </ListItem>
        ))}
      </List>,
    )
    const [d1, d2] = qa(c, 'details') as HTMLDetailsElement[]
    const [s1, s2] = qa(c, 'summary')
    expect(s1!.querySelectorAll(FOCUSABLE)).toHaveLength(0)
    expect(q(s1!, '.mk-list-item-expand').getAttribute('aria-hidden')).toBe('true')
    // El summary se llega con Tab en los tres motores (sonda del 2026-11-25, también WebKit de macOS).
    await userEvent.tab()
    expect(document.activeElement).toBe(s1)
    expect(s1!.matches(':focus-visible')).toBe(true)
    await userEvent.keyboard('{Enter}')
    expect(d1!.open).toBe(true)
    await userEvent.keyboard(' ')
    expect(d1!.open).toBe(false)
    await userEvent.click(s1!)
    expect(d1!.open).toBe(true)
    await userEvent.click(s2!)
    await expect.poll(() => d1!.open).toBe(false)
    expect(d2!.open).toBe(true)
    expect(rect(q(d2!, 'p')).height).toBeGreaterThan(0)
  })

  test('(e) acordeón: botón de 32 × 40 que gira al abrir, en Surface Container; el elemento en Surface', async () => {
    const c = await render(
      <Box>
        <List>
          <ListItem>
            <ListItemDetails>
              <ListItemSummary><ListItemHeadline>Uno</ListItemHeadline></ListItemSummary>
              <p>Contenido</p>
            </ListItemDetails>
          </ListItem>
        </List>
      </Box>,
    )
    const exp = q(c, '.mk-list-item-expand')
    expect(rect(exp).width).toBeCloseTo(32, 1)
    expect(rect(exp).height).toBeCloseTo(40, 1)
    expect(rect(q(c, 'summary')).right - rect(exp).right).toBeCloseTo(16, 1)
    expect(style(exp).backgroundColor).toBe(roleColor('surface'))
    expect(style(q(exp, '.mk-icon')).transform).toBe('none')
    ;(q(c, 'details') as HTMLDetailsElement).open = true
    await expect.poll(() => style(exp).backgroundColor).toBe(roleColor('surface-container'))
    expect(style(q(exp, '.mk-icon')).transform).toMatch(/^matrix\(-1, .*-1, 0, 0\)$/)
    expect(style(q(c, 'li')).backgroundColor).toBe(roleColor('surface'))
    expect(rect(q(c, 'summary')).height).toBeCloseTo(52, 1)
  })
})

describe('medidas (kit)', () => {
  const Lines = () => (
    <Box>
      <List>
        <ListItem id="l1"><ListItemLeading><StarIcon /></ListItemLeading><ListItemHeadline>Una</ListItemHeadline><ListItemTrailing>52</ListItemTrailing></ListItem>
        <ListItem id="l2"><ListItemLeading><StarIcon /></ListItemLeading><ListItemHeadline>Dos</ListItemHeadline><ListItemSupporting>Apoyo</ListItemSupporting></ListItem>
        <ListItem id="l3"><ListItemLeading><StarIcon /></ListItemLeading><ListItemOverline>Over</ListItemOverline><ListItemHeadline>Tres</ListItemHeadline><ListItemSupporting>Apoyo</ListItemSupporting></ListItem>
      </List>
    </Box>
  )

  test('alto de 52, 64 y 80 con una, dos y tres líneas; rellenos 10 y 16, separación 12', async () => {
    const c = await render(<Lines />)
    expect(rect(q(c, '#l1')).height).toBeCloseTo(52, 1)
    expect(rect(q(c, '#l2')).height).toBeCloseTo(64, 1)
    expect(rect(q(c, '#l3')).height).toBeCloseTo(80, 1)
    const li = q(c, '#l1')
    const s = style(li)
    expect([s.paddingTop, s.paddingBottom, s.paddingInlineStart, s.paddingInlineEnd]).toEqual(['10px', '10px', '16px', '16px'])
    const icon = q(li, '.mk-icon')
    expect(rect(icon).width).toBeCloseTo(20, 1)
    expect(rect(icon).left - rect(li).left).toBeCloseTo(16, 1)
    expect(rect(q(li, '.mk-list-item-headline')).left - rect(li).left).toBeCloseTo(48, 1)
    expect(rect(li).right - rect(q(li, '.mk-list-item-trailing')).right).toBeCloseTo(16, 1)
    // Centrado (middle): el icono y el texto, en el centro del alto.
    const mid = (el: Element) => rect(el).top + rect(el).height / 2
    expect(mid(icon)).toBeCloseTo(mid(li), 0)
    expect(mid(q(li, '.mk-list-item-headline'))).toBeCloseTo(mid(li), 0)
    // Tres líneas: el texto empieza a 10 del borde.
    const l3 = q(c, '#l3')
    expect(rect(q(l3, '.mk-list-item-overline')).top - rect(l3).top).toBeCloseTo(10, 1)
  })

  test('tipografía y colores del contenido (kit)', async () => {
    const c = await render(<Lines />)
    const l3 = q(c, '#l3')
    const t = (sel: string) => style(q(l3, sel))
    expect([t('.mk-list-item-headline').fontSize, t('.mk-list-item-headline').lineHeight]).toEqual(['16px', '24px'])
    expect([t('.mk-list-item-supporting').fontSize, t('.mk-list-item-supporting').lineHeight]).toEqual(['14px', '20px'])
    expect([t('.mk-list-item-overline').fontSize, t('.mk-list-item-overline').lineHeight]).toEqual(['12px', '16px'])
    expect(t('.mk-list-item-headline').color).toBe(roleColor('on-surface'))
    expect(t('.mk-list-item-supporting').color).toBe(roleColor('on-surface-variant'))
    expect(t('.mk-list-item-overline').color).toBe(roleColor('on-surface-variant'))
    expect(t('.mk-list-item-leading').color).toBe(roleColor('on-surface-variant'))
    const tr = style(q(c, '#l1 .mk-list-item-trailing'))
    expect([tr.fontSize, tr.lineHeight, tr.color]).toEqual(['14px', '20px', roleColor('on-surface-variant')])
    expect(style(q(c, 'li')).backgroundColor).toBe(transparent)
  })

  test('alineación arriba: inicio y final a 10 del borde superior', async () => {
    const c = await render(
      <Box>
        <List>
          <ListItem align="top">
            <ListItemLeading variant="image"><img alt="" /></ListItemLeading>
            <ListItemHeadline>Arriba</ListItemHeadline>
            <ListItemSupporting>Una línea de apoyo bastante larga que ocupa dos líneas completas en este ancho</ListItemSupporting>
            <ListItemTrailing>top</ListItemTrailing>
          </ListItem>
        </List>
      </Box>,
    )
    const li = q(c, 'li')
    expect(li.dataset['align']).toBe('top')
    expect(rect(q(c, '.mk-list-item-leading')).top - rect(li).top).toBeCloseTo(10, 1)
    expect(rect(q(c, '.mk-list-item-trailing')).top - rect(li).top).toBeCloseTo(10, 1)
    expect(rect(q(c, '.mk-list-item-headline')).top - rect(li).top).toBeCloseTo(10, 1)
  })

  test('partes de inicio: icono, sangría, avatar, imagen y video (kit)', async () => {
    const c = await render(
      <Box>
        <List>
          <ListItem id="indent"><ListItemLeading /><ListItemHeadline>Sangría</ListItemHeadline></ListItem>
          <ListItem id="avatar"><ListItemLeading variant="avatar"><span>AR</span></ListItemLeading><ListItemHeadline>Avatar</ListItemHeadline></ListItem>
          <ListItem id="image"><ListItemLeading variant="image"><img alt="" /></ListItemLeading><ListItemHeadline>Imagen</ListItemHeadline></ListItem>
          <ListItem id="video"><ListItemLeading variant="video"><img alt="" /></ListItemLeading><ListItemHeadline>Video</ListItemHeadline></ListItem>
        </List>
      </Box>,
    )
    const lead = (id: string) => q(c, `#${id} .mk-list-item-leading`)
    const head = (id: string) => q(c, `#${id} .mk-list-item-headline`)
    expect(rect(head('indent')).left - rect(q(c, '#indent')).left).toBeCloseTo(48, 1)
    expect([rect(lead('avatar')).width, rect(lead('avatar')).height]).toEqual([40, 40])
    expect(style(lead('avatar')).backgroundColor).toBe(roleColor('primary-container'))
    expect(style(lead('avatar')).color).toBe(roleColor('on-primary-container'))
    expect(style(lead('avatar')).fontSize).toBe('16px')
    expect([rect(lead('image')).width, rect(lead('image')).height]).toEqual([56, 56])
    expect(corners(lead('image'))).toEqual([4, 4, 4, 4])
    expect(style(lead('image')).outlineColor).toBe(roleColor('outline-variant'))
    expect(style(lead('image')).outlineWidth).toBe('1px')
    expect([rect(lead('video')).width, rect(lead('video')).height]).toEqual([114, 64])
    expect(rect(q(c, '#image')).height).toBeCloseTo(76, 1)
  })
})

describe('estados: colores y radios', () => {
  const Nav = ({ current = false, segmented = false }: { current?: boolean; segmented?: boolean }) => (
    <Box>
      <List {...(segmented ? { variant: 'segmented' as const } : {})}>
        {['a', 'b', 'c'].map((id) => (
          <ListItem key={id} id={id}>
            <ListItemLeading><StarIcon /></ListItemLeading>
            <ListItemHeadline><ListItemAction href={`#${id}`} current={current && id === 'b'}>{id}</ListItemAction></ListItemHeadline>
            <ListItemTrailing>3</ListItemTrailing>
          </ListItem>
        ))}
      </List>
    </Box>
  )

  test('reposo: radio 4 y sin capa', async () => {
    const c = await render(<Nav />)
    expect(corners(q(c, '#b'))).toEqual([4, 4, 4, 4])
    expect(style(q(c, '#b a > .mk-state-layer')).opacity).toBe('0')
  })

  test('hover: radio 12 y capa On Surface al 8 %', async () => {
    const c = await render(<Nav />)
    await userEvent.hover(q(c, '#b'))
    expect(corners(q(c, '#b'))).toEqual([12, 12, 12, 12])
    const layer = q(c, '#b a > .mk-state-layer')
    expect(style(layer).opacity).toBe('0.08')
    expect(style(layer).backgroundColor).toBe(roleColor('on-surface'))
    // La capa cubre el elemento y sigue su radio.
    expect(rect(layer).width).toBeCloseTo(360, 1)
    expect(corners(layer)).toEqual([12, 12, 12, 12])
  })

  test('foco de teclado: radio 16, capa al 10 % y anillo hacia adentro en el borde del elemento', async () => {
    const c = await render(<Nav />)
    const a = q(c, '#a a')
    if (server.browser === 'webkit') await keyboardFocus(a)
    else await userEvent.tab()
    expect(document.activeElement).toBe(a)
    expect(corners(q(c, '#a'))).toEqual([16, 16, 16, 16])
    expect(style(q(c, '#a a > .mk-state-layer')).opacity).toBe('0.1')
    const ring = q(c, '#a a > .mk-focus-ring')
    expect(style(ring).opacity).toBe('1')
    expect(style(ring).outlineOffset).toBe('-3px')
    expect(rect(ring).width).toBeCloseTo(360, 1)
  })

  test('presionado: radio 16, capa al 8 % y onda', async () => {
    const c = await render(<Nav />)
    await commands.pressDown('#b')
    try {
      expect(corners(q(c, '#b'))).toEqual([16, 16, 16, 16])
      expect(style(q(c, '#b a > .mk-state-layer')).opacity).toBe('0.08')
      await expect.poll(() => c.querySelectorAll('#b a .mk-ripple-wave').length).toBeGreaterThan(0)
    } finally {
      await commands.pressUp()
    }
  })

  test('seleccionado (aria-current): Secondary Container, contenido On Secondary Container, radio 16', async () => {
    const c = await render(<Nav current />)
    const b = q(c, '#b')
    expect(style(b).backgroundColor).toBe(roleColor('secondary-container'))
    for (const sel of ['headline', 'leading', 'trailing']) {
      expect(style(q(b, `.mk-list-item-${sel}`)).color).toBe(roleColor('on-secondary-container'))
    }
    expect(style(q(b, 'a > .mk-state-layer')).backgroundColor).toBe(roleColor('on-secondary-container'))
    expect(corners(b)).toEqual([16, 16, 16, 16])
    expect(style(q(c, '#a')).backgroundColor).toBe(transparent)
  })

  test('seleccionado por una casilla o un radio marcados', async () => {
    const c = await render(
      <List>
        <ListItem id="cb"><Checkbox defaultChecked><ListItemHeadline>A</ListItemHeadline></Checkbox></ListItem>
        <ListItem id="rb"><RadioButton name="r" defaultChecked><ListItemHeadline>B</ListItemHeadline></RadioButton></ListItem>
        <ListItem id="off"><Checkbox><ListItemHeadline>C</ListItemHeadline></Checkbox></ListItem>
      </List>,
    )
    expect(style(q(c, '#cb')).backgroundColor).toBe(roleColor('secondary-container'))
    expect(style(q(c, '#rb')).backgroundColor).toBe(roleColor('secondary-container'))
    expect(style(q(c, '#cb .mk-list-item-headline')).color).toBe(roleColor('on-secondary-container'))
    expect(style(q(c, '#off')).backgroundColor).toBe(transparent)
    await userEvent.click(q(c, '#off'), { position: { x: 3, y: 3 } })
    expect(style(q(c, '#off')).backgroundColor).toBe(roleColor('secondary-container'))
  })

  test('fila de selección: hover y foco en los átomos del <li>', async () => {
    const c = await render(
      <List>
        <ListItem><Checkbox><ListItemHeadline>A</ListItemHeadline></Checkbox></ListItem>
      </List>,
    )
    const li = q(c, 'li')
    await userEvent.hover(li)
    expect(corners(li)).toEqual([12, 12, 12, 12])
    expect(style(q(li, ':scope > .mk-state-layer')).opacity).toBe('0.08')
    await userEvent.hover(document.body, { position: { x: 1, y: 1 } }).catch(() => {})
    const input = q(c, 'input')
    if (server.browser === 'webkit') await keyboardFocus(input)
    else await userEvent.tab()
    expect(document.activeElement).toBe(input)
    await expect.poll(() => style(q(li, ':scope > .mk-focus-ring')).opacity).toBe('1')
    expect(corners(li)).toEqual([16, 16, 16, 16])
  })

  test('segmentada sobre Group: separación 2, 16 afuera y 4 adentro, fondo Surface; hover a 12 en las cuatro', async () => {
    const c = await render(<Nav segmented />)
    const ul = q(c, 'ul')
    expect(ul.classList.contains('mk-group')).toBe(true)
    expect(ul.getAttribute('role')).toBe('list')
    expect(ul.dataset['orientation']).toBe('vertical')
    const [a, b, cc] = [q(c, '#a'), q(c, '#b'), q(c, '#c')]
    expect(rect(b).top - rect(a).bottom).toBeCloseTo(2, 1)
    expect(corners(a)).toEqual([16, 16, 4, 4])
    expect(corners(b)).toEqual([4, 4, 4, 4])
    expect(corners(cc)).toEqual([4, 4, 16, 16])
    expect(style(a).backgroundColor).toBe(roleColor('surface'))
    await userEvent.hover(q(c, '#a'))
    expect(corners(a)).toEqual([12, 12, 12, 12])
    expect(corners(q(c, '#a a > .mk-state-layer'))).toEqual([12, 12, 12, 12])
    expect(corners(b)).toEqual([4, 4, 4, 4])
  })

  test('segmentada: foco a 16 en las cuatro esquinas; seleccionado en Secondary Container', async () => {
    const c = await render(<Nav segmented current />)
    expect(style(q(c, '#b')).backgroundColor).toBe(roleColor('secondary-container'))
    expect(corners(q(c, '#b'))).toEqual([16, 16, 16, 16])
    const a = q(c, '#c a')
    if (server.browser === 'webkit') await keyboardFocus(a)
    else {
      q(c, '#a a').focus()
      await userEvent.tab()
      await userEvent.tab()
    }
    expect(document.activeElement).toBe(a)
    expect(corners(q(c, '#c'))).toEqual([16, 16, 16, 16])
  })

  test('divisores: línea de 1 en Outline Variant con 16 de sangría, entre elementos', async () => {
    const c = await render(
      <Box>
        <List dividers>
          <ListItem id="a"><ListItemHeadline>A</ListItemHeadline></ListItem>
          <ListItem id="b"><ListItemHeadline>B</ListItemHeadline></ListItem>
        </List>
      </Box>,
    )
    expect(getComputedStyle(q(c, '#a'), '::before').content).toBe('none')
    const line = getComputedStyle(q(c, '#b'), '::before')
    expect(line.borderTopWidth).toBe('1px')
    expect(line.borderTopColor).toBe(roleColor('outline-variant'))
    expect([line.left, line.right, line.top]).toEqual(['16px', '16px', '0px'])
    // @ts-expect-error: la segmentada no tiene divisores.
    void (<List variant="segmented" dividers />)
    // Sin <hr> en el <ul>.
    expect(c.querySelector('ul > hr')).toBeNull()
  })
})

describe('adaptación al ancho de la lista', () => {
  const Wide = ({ width }: { width: number }) => (
    <Box width={width}>
      <List>
        <ListItem id="text">
          <ListItemLeading><StarIcon /></ListItemLeading>
          <ListItemHeadline><ListItemAction href="#">Un texto principal largo con unapalabrasinespaciosmuylargaquetienequecortar</ListItemAction></ListItemHeadline>
          <ListItemSupporting>{'Texto de apoyo que ocupa varias líneas y se recorta a dos con puntos suspensivos para que la lista no crezca. '.repeat(3)}</ListItemSupporting>
          <ListItemTrailing>Hace 3 horas</ListItemTrailing>
        </ListItem>
        <ListItem id="icon">
          <ListItemHeadline>Con icono</ListItemHeadline>
          <ListItemTrailing>Nuevo<ChevronRightIcon /></ListItemTrailing>
        </ListItem>
        <ListItem id="control">
          <Checkbox><ListItemHeadline>Casilla</ListItemHeadline></Checkbox>
          <ListItemTrailing>3</ListItemTrailing>
        </ListItem>
        <ListItem id="video">
          <ListItemLeading variant="video"><img alt="" /></ListItemLeading>
          <ListItemHeadline>Video</ListItemHeadline>
        </ListItem>
      </List>
    </Box>
  )

  for (const width of [200, 360, 800]) {
    test(`${width} px: sin desborde, el texto principal corta línea y el apoyo se recorta a 2 líneas`, async () => {
      const c = await render(<Wide width={width} />)
      const ul = q(c, 'ul')
      expect(ul.scrollWidth).toBeLessThanOrEqual(ul.clientWidth)
      for (const li of qa(c, 'li')) {
        expect(rect(li).width).toBeCloseTo(width, 1)
        expect(li.scrollWidth).toBeLessThanOrEqual(li.clientWidth)
      }
      const sup = q(c, '#text .mk-list-item-supporting')
      expect(rect(sup).height).toBeCloseTo(40, 1)
      expect(sup.scrollHeight).toBeGreaterThan(sup.clientHeight)
      const head = q(c, '#text .mk-list-item-headline')
      expect(head.scrollHeight).toBeLessThanOrEqual(head.clientHeight + 1)
      if (width < 800) expect(rect(head).height).toBeGreaterThan(24)
    })
  }

  test('360 y 800: el texto final queda al final; 200: pasa debajo del texto principal', async () => {
    for (const width of [360, 800]) {
      const c = await render(<Wide width={width} />)
      const tr = q(c, '#text .mk-list-item-trailing')
      expect(rect(q(c, '#text')).right - rect(tr).right).toBeCloseTo(16, 1)
      expect(rect(q(c, '#video .mk-list-item-leading')).width).toBeCloseTo(114, 1)
    }
    const c = await render(<Wide width={200} />)
    const tr = q(c, '#text .mk-list-item-trailing')
    expect(rect(tr).top).toBeGreaterThanOrEqual(rect(q(c, '#text .mk-list-item-supporting')).bottom - 0.5)
    expect(rect(tr).left).toBeCloseTo(rect(q(c, '#text .mk-list-item-headline')).left, 1)
    // Con icono o con un control, el final se queda al final.
    const icon = q(c, '#icon .mk-list-item-trailing')
    expect(rect(q(c, '#icon')).right - rect(icon).right).toBeCloseTo(16, 1)
    const ctl = q(c, '#control .mk-checkbox-box')
    expect(rect(q(c, '#control')).right - rect(ctl).right).toBeCloseTo(17, 1)
    // El video pasa arriba del texto, a todo su ancho (bajo 240 px).
    const video = q(c, '#video .mk-list-item-leading')
    expect(rect(video).width).toBeCloseTo(200 - 32, 1)
    expect(rect(q(c, '#video .mk-list-item-headline')).top).toBeGreaterThanOrEqual(rect(video).bottom)
  })

  test('el recorte del apoyo se cambia con --mk-list-item-supporting-lines', async () => {
    const c = await render(
      <Box width={200}>
        <List style={{ ['--mk-list-item-supporting-lines' as string]: 'none' }}>
          <ListItem><ListItemHeadline>A</ListItemHeadline><ListItemSupporting>Texto de apoyo que ocupa varias líneas en un ancho chico.</ListItemSupporting></ListItem>
        </List>
      </Box>,
    )
    const sup = q(c, '.mk-list-item-supporting')
    expect(rect(sup).height).toBeGreaterThan(40)
    expect(sup.scrollHeight).toBeLessThanOrEqual(sup.clientHeight + 1)
  })

  test('RTL: inicio a la derecha y final a la izquierda', async () => {
    const c = await render(
      <Box dir="rtl">
        <List>
          <ListItem>
            <ListItemLeading><StarIcon /></ListItemLeading>
            <ListItemHeadline>שלום</ListItemHeadline>
            <ListItemTrailing>3</ListItemTrailing>
          </ListItem>
          <ListItem><Checkbox><ListItemHeadline>תיבה</ListItemHeadline></Checkbox></ListItem>
        </List>
      </Box>,
    )
    const [li, li2] = qa(c, 'li')
    expect(rect(li!).right - rect(q(li!, '.mk-icon')).right).toBeCloseTo(16, 1)
    expect(rect(q(li!, '.mk-list-item-trailing')).left - rect(li!).left).toBeCloseTo(16, 1)
    expect(rect(q(li2!, '.mk-checkbox-box')).left - rect(li2!).left).toBeCloseTo(17, 1)
  })
})

describe('props nativas y ref', () => {
  test('List, ListItem, las partes, ListItemAction y ListItemDetails reciben sus props y ref', async () => {
    const ul = createRef<HTMLUListElement>()
    const li = createRef<HTMLLIElement>()
    const span = createRef<HTMLSpanElement>()
    const a = createRef<HTMLAnchorElement>()
    const details = createRef<HTMLDetailsElement>()
    const summary = createRef<HTMLElement>()
    const c = await render(
      <List ref={ul} id="lista" className="mia" data-x="1" style={{ marginTop: 7 }}>
        <ListItem ref={li} className="item" data-y="2">
          <ListItemHeadline ref={span} className="h"><ListItemAction ref={a} href="#" target="_blank">A</ListItemAction></ListItemHeadline>
        </ListItem>
        <ListItem>
          <ListItemDetails ref={details} open name="g">
            <ListItemSummary ref={summary} id="s"><ListItemHeadline>B</ListItemHeadline></ListItemSummary>
          </ListItemDetails>
        </ListItem>
      </List>,
    )
    expect(ul.current).toBe(q(c, 'ul'))
    expect(ul.current?.className).toBe('mk-list mia')
    expect(ul.current?.id).toBe('lista')
    expect(ul.current?.dataset['x']).toBe('1')
    expect(ul.current?.style.marginTop).toBe('7px')
    expect(li.current?.className).toBe('mk-list-item item')
    expect(li.current?.dataset['y']).toBe('2')
    expect(span.current?.className).toBe('mk-list-item-headline h')
    expect(a.current?.target).toBe('_blank')
    expect(details.current?.open).toBe(true)
    expect(details.current?.name).toBe('g')
    expect(summary.current?.id).toBe('s')
  })

  test('la segmentada pasa la ref y las props al <ul>', async () => {
    const ul = createRef<HTMLUListElement>()
    const c = await render(<List variant="segmented" ref={ul} className="mia" aria-label="L"><ListItem><ListItemHeadline>A</ListItemHeadline></ListItem></List>)
    expect(ul.current).toBe(q(c, 'ul'))
    expect(ul.current?.className).toBe('mk-group mk-list mia')
    expect(ul.current?.getAttribute('aria-label')).toBe('L')
  })
})
