// Módulo interno (no se exporta desde src/index.ts): saber si corre una compilación de desarrollo,
// para los avisos por consola que solo ayudan mientras se escribe la app (ToolbarLayout, ADR-0027).
//
// Patrón de React y de las librerías que se publican sin compilar por su cuenta: la expresión
// literal `process.env.NODE_ENV`, que los bundlers (Vite, webpack, Next, esbuild) reemplazan por el
// texto del modo, así que en producción queda `"production" === 'production'` y el aviso se puede
// eliminar como código muerto. Sin bundler ni `process` (un módulo ES cargado tal cual en el
// navegador), leerla lanza: se toma como desarrollo, porque el aviso solo sale ante un uso
// equivocado. matekit no tenía este patrón (el aviso de Tabs sale siempre).

/** `true` salvo en una compilación de producción. */
export function isDevelopment(): boolean {
  try {
    return process.env.NODE_ENV !== 'production'
  } catch {
    return true
  }
}
