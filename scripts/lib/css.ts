// Ayudas para escribir CSS desde los generadores (tokens y paletas).

export type Decl = readonly [name: string, value: string | number]

/** Un bloque `selector { nombre: valor; … }` con la sangría indicada. */
export function block(selector: string, decls: readonly Decl[], indent = ''): string {
  const body = decls.map(([name, value]) => `${indent}  ${name}: ${value};`).join('\n')
  return `${indent}${selector} {\n${body}\n${indent}}\n`
}
