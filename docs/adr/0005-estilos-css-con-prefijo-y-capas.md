# ADR-0005: Estilos en CSS plano con prefijo `mk-`, capas `@layer` y una hoja única

- Status: accepted (2026-11-24)
- Drivers:
  - La librería tiene que funcionar igual en Next.js (App Router) y en React con Vite
    ([ADR-0003](0003-componentes-universales-e-interactivos.md)); los componentes
    universales no pueden depender de JavaScript para estilarse.
  - Los átomos reaccionan a los estados del padre con pseudo-clases (`:hover >
    .mk-state-layer`), lo que exige nombres de clase estables y conocidos, no generados.
  - Los proyectos del autor tienen que poder sobrescribir cualquier estilo sin pelear con la
    especificidad.
- Decision:
  - CSS plano, sin CSS-in-JS ni módulos CSS. Las clases llevan el prefijo `mk-`
    (`mk-state-layer`, `mk-focus-ring`) y las variables propias de componentes, `--mk-`;
    los tokens mantienen los nombres oficiales `--md-sys-*`.
  - Todo el CSS de la librería vive en capas: `@layer matekit.tokens, matekit.atoms,
    matekit.components`. Un estilo del proyecto fuera de `@layer` gana siempre. (Desde el
    ADR-0008, las paletas opcionales van en `matekit.palettes`, entre tokens y átomos.)
  - Una sola hoja, `src/styles.css`, que la aplicación importa una vez. Los módulos de
    componentes no importan CSS.
  - Las reglas que tocan al padre de un átomo usan `:where()` para quedar con especificidad 0.
- Tradeoff accepted: las clases `mk-*` y las variables `--mk-*` son API pública; renombrarlas
  rompe estilos de quien las use. La hoja única carga el CSS de todos los componentes aunque
  se use uno solo.
- Revisit if: el CSS total pesa lo suficiente como para notarse en la carga (por ejemplo,
  más de 50 kB comprimido); entonces evaluar hojas por componente.
