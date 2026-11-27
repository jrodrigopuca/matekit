// Textos por defecto de ModalNavigationRail (en inglés: son salida para quien usa la librería). El
// índice src/strings/index.ts los reúne con los demás. Son los de Compose (material3, res/values/
// strings.xml: m3c_wide_navigation_rail_pane_title y m3c_wide_navigation_rail_close_rail).

export interface ModalNavigationRailStrings {
  /** `ModalNavigationRail` `label`: el nombre del diálogo. */
  label: string
  /** `ModalNavigationRailClose` `label`: el botón que cierra el rail. */
  closeLabel: string
}

export const modalNavigationRailStrings: ModalNavigationRailStrings = {
  label: 'Navigation rail',
  closeLabel: 'Close rail',
}
