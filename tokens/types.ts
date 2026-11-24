// Forma de los archivos tokens/*.json. Los usan el generador y las pruebas.

export interface ColorTokens {
  $source: string
  light: Record<string, string>
  dark: Record<string, string>
}

export interface TypeStyle {
  typeface: 'brand' | 'plain'
  size: number
  lineHeight: number
  tracking: number
  weight: number
  weightEmphasized: number
}

export interface TypescaleTokens {
  $source: string
  typeface: { brand: string; plain: string }
  weight: { regular: number; medium: number; semibold: number }
  styles: Record<string, TypeStyle>
}

export interface ShapeTokens {
  $source: string
  corner: Record<string, number>
}

/** [x, y, desenfoque, expansión, color] */
export type Shadow = readonly [number, number, number, number, string]

export type ElevationTokens = { $source: string } & Record<`level${number}`, Shadow[]>

export type StateTokens = {
  $source: string
  $notes: Record<string, string>
} & Record<string, number>
