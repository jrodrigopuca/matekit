# ADR-0004: Fuentes de verdad de los tokens y especificación de color 2021 por defecto

- Status: accepted (2026-11-24)
- Drivers:
  - El kit de Figma y Jetpack Compose no siempre coinciden. De lo comparado: el kit tenía dos
    errores evidentes (indicador de foco de 3 en vez de 2, icono de error del checkbox en
    `On Primary` en vez de `On Error`) y dos conflictos reales (relleno del botón XSmall y
    cuatro colores "on container"); ver
    [../research/07-jetpack-compose.md](../research/07-jetpack-compose.md).
  - `material-color-utilities` tiene tres especificaciones de color (2021, 2025, 2026). La
    2021 es la de por defecto de la librería y la única con la que coincide el esquema base
    del kit (37 de 45 roles en claro; la 2025, 10 de 45).
  - Jetpack Compose no usa esas versiones: su esquema Expressive
    (`expressiveLightColorScheme()`) es fijo, y el color dinámico de Android lo calcula el
    sistema operativo. En la web hay que generarlo con `material-color-utilities`.
- Decision:
  - **Prioridad de fuentes para los tokens:** el kit de Figma manda en lo visual (es
    Expressive y el más reciente). Jetpack Compose manda cuando el kit tiene un error
    evidente o le falta el dato. Un conflicto real se verifica con una tercera fuente antes
    de elegir, y la elección queda escrita en `docs/research/`.
  - **Colores "on container" del tema claro:** se usan los tonos 30 exactos de la paleta de
    Compose (`#4f378b`, `#4a4458`, `#633b48`, `#8c1d18`) en lugar de los valores redondeados
    del kit; el cambio de tono 10 a 30 lo confirma el commit `03336bf` (2024-06-11) de
    `material-color-utilities`. Registrado en `tokens/color.json`.
  - **Botón XSmall:** relleno lateral 12 y separación 4, como el kit, `expressive-react` y
    `m3-expressive-react` (frente a 16 y 8 en Compose).
  - **Color dinámico:** cuando se genere un esquema desde un color semilla, la
    especificación por defecto es la 2021; la 2025 queda como opción explícita.
- Tradeoff accepted: con la especificación 2021, un tema dinámico no tiene el aspecto de
  superficies y contornos de la 2025, que es la que Google asocia a la época Expressive.
  Elegir caso por caso entre kit y Compose exige mantener al día `07-jetpack-compose.md`.
- Revisit if: el kit de Figma se actualiza a colores de la especificación 2025, o
  `material-color-utilities` cambia su `DEFAULT_SPEC_VERSION`; entonces evaluar pasar el
  color dinámico a 2025. Si aparece una fuente oficial legible para m3.material.io, pasa a
  ser la primera en la prioridad de fuentes.
