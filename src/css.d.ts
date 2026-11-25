// Importar una hoja de estilos solo por su efecto (las pruebas cargan styles.css).
// Hace falta porque tsconfig activa noUncheckedSideEffectImports.
declare module '*.css' {}

// Una hoja de estilos como texto (Vite, sufijo ?raw): las pruebas leen de ahí los valores
// esperados de los tokens generados.
declare module '*.css?raw' {
  const css: string
  export default css
}
