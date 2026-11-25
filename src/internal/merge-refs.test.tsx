import { createRef, useMemo, useState, type Ref } from 'react'
import { describe, expect, test } from 'vitest'
import { render } from '../test/render.tsx'
import { mergeRefs } from './merge-refs.ts'

// Llamadas directas (como hace React: la función recibe el nodo y devuelve su limpieza) y un
// montaje real, para comprobar que React 19 usa esa limpieza en lugar de llamar con null.

describe('mergeRefs: llamadas directas', () => {
  const node = document.createElement('div')

  test('referencias de objeto: reciben el nodo y vuelven a null al limpiar', () => {
    const a = createRef<HTMLDivElement>()
    const b = { current: null as HTMLDivElement | null }
    const cleanup = mergeRefs<HTMLDivElement>(a, b)(node)
    expect(a.current).toBe(node)
    expect(b.current).toBe(node)
    expect(typeof cleanup).toBe('function')
    cleanup?.()
    expect(a.current).toBeNull()
    expect(b.current).toBeNull()
  })

  test('función sin limpieza: recibe el nodo y después null', () => {
    const calls: Array<HTMLDivElement | null> = []
    const cleanup = mergeRefs<HTMLDivElement>((n) => {
      calls.push(n)
    })(node)
    expect(calls).toEqual([node])
    cleanup?.()
    expect(calls).toEqual([node, null])
  })

  test('función con limpieza: se llama su limpieza y no recibe null', () => {
    const calls: Array<HTMLDivElement | null> = []
    let cleaned = 0
    const cleanup = mergeRefs<HTMLDivElement>((n) => {
      calls.push(n)
      return () => {
        cleaned++
      }
    })(node)
    cleanup?.()
    expect(calls).toEqual([node])
    expect(cleaned).toBe(1)
  })

  test('undefined y null se ignoran, y las demás siguen funcionando', () => {
    const a = createRef<HTMLDivElement>()
    const cleanup = mergeRefs<HTMLDivElement>(undefined, null, a)(node)
    expect(a.current).toBe(node)
    expect(() => cleanup?.()).not.toThrow()
    expect(a.current).toBeNull()
  })

  test('asigna y limpia en el orden en que se pasan', () => {
    const order: string[] = []
    const obj = {
      set current(n: HTMLDivElement | null) {
        order.push(n ? 'objeto' : 'objeto null')
      },
      get current() {
        return null
      },
    }
    const cleanup = mergeRefs<HTMLDivElement>(obj, (n) => {
      order.push(n ? 'función' : 'función null')
    }, () => {
      order.push('con limpieza')
      return () => {
        order.push('limpieza')
      }
    })(node)
    cleanup?.()
    expect(order).toEqual(['objeto', 'función', 'con limpieza', 'objeto null', 'función null', 'limpieza'])
  })
})

describe('mergeRefs: con React 19', () => {
  function Probe({ refs }: { refs: Array<Ref<HTMLSpanElement> | undefined> }) {
    const [shown, setShown] = useState(true)
    // Memorizada, como en Dialog y Menu.
    const merged = useMemo(() => mergeRefs(...refs), [refs])
    return (
      <>
        <button type="button" onClick={() => setShown(false)}>ocultar</button>
        {shown && <span ref={merged} />}
      </>
    )
  }

  test('al montar reciben el nodo; al desmontar, React usa la limpieza combinada', async () => {
    const obj = createRef<HTMLSpanElement>()
    const plain: Array<HTMLSpanElement | null> = []
    let cleaned = 0
    const refs = [
      obj,
      (n: HTMLSpanElement | null) => {
        plain.push(n)
      },
      () => () => {
        cleaned++
      },
      undefined,
    ]
    const c = await render(<Probe refs={refs} />)
    const span = c.querySelector('span')
    expect(span).not.toBeNull()
    expect(obj.current).toBe(span)
    expect(plain).toEqual([span])
    c.querySelector('button')?.click()
    await expect.poll(() => c.querySelector('span')).toBeNull()
    expect(obj.current).toBeNull()
    expect(plain).toEqual([span, null])
    expect(cleaned).toBe(1)
  })
})
