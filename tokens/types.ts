// Forma de los archivos tokens/*.json. Los usan el generador y las pruebas.

export interface ColorTokens {
  $source: string
  $notes?: Record<string, string>
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

export interface Spring {
  /** Razón de amortiguación: menor que 1 rebota, 1 no rebota. */
  damping: number
  /** Rigidez con masa 1. */
  stiffness: number
}

export type SpringName =
  | 'fast-spatial'
  | 'default-spatial'
  | 'slow-spatial'
  | 'fast-effects'
  | 'default-effects'
  | 'slow-effects'

export interface MotionTokens {
  $source: string
  $notes: Record<string, string>
  springs: Record<'standard' | 'expressive', Record<SpringName, Spring>>
  duration: Record<string, number>
  /** Curvas de Bézier cúbicas: [x1, y1, x2, y2]. */
  easing: Record<string, readonly [number, number, number, number]>
}

export type StateTokens = {
  $source: string
  $notes: Record<string, string>
} & Record<string, number>
