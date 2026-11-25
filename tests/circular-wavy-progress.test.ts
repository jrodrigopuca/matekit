// Pruebas del indicador de progreso circular ondulado: la portación de
// scripts/lib/shapes/CircularWavyProgress.ts y los datos que genera pnpm shapes en
// src/molecules/ProgressIndicator/circular-wavy-data.ts.
// Uso: pnpm test:tokens

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  circularPath,
  circularPolygons,
  pathLength,
  radialRange,
  vertexCount,
} from '../scripts/lib/shapes/CircularWavyProgress.ts'
import { FLAT_PATH, TRACK_LENGTH, TRACK_PATH, WAVE_PATH, WAVE_VERTICES } from '../src/molecules/ProgressIndicator/circular-wavy-data.ts'

const commandsOf = (d: string) => d.replace(/[^MCLZ]/g, '')

describe('CircularWavyProgress', () => {
  test('9 ondas en 48 con trazo 4 y en 52 con trazo 8 (2π · 22 / 15 = 9,2)', () => {
    assert.equal(vertexCount(48, 4), 9)
    assert.equal(vertexCount(52, 8), 9)
    assert.equal(WAVE_VERTICES, 9)
    // MinCircularVertexCount: nunca menos de 5.
    assert.equal(vertexCount(10, 4), 5)
  })

  test('la onda mide ActiveWaveAmplitude (1,6 dp) y la pista es un círculo', () => {
    const { track, morph } = circularPolygons(9)
    const [min, max] = radialRange(circularPath(morph.asCubics(1), 44))
    assert.ok(Math.abs((max - min) / 2 - 1.6) < 0.05, `amplitud ${(max - min) / 2}`)
    const [tmin, tmax] = radialRange(circularPath(track.cubics, 44))
    assert.ok(tmax - tmin < 0.01, `pista de radio ${tmin} a ${tmax}`)
    // El trazo de 4 (o de 8) no se sale del indicador de 48 (o de 52).
    assert.ok(tmax + 2 <= 24 && max + 2 <= 24)
  })

  test('los contornos empiezan a las 12', () => {
    for (const d of [TRACK_PATH, FLAT_PATH, WAVE_PATH]) {
      const [x, y] = d.slice(1).split(/[ C]/).map(Number)
      assert.ok(Math.abs(x!) < 0.1 && y! < 0, `${d.slice(0, 20)}`)
    }
  })

  test('la onda y su versión plana tienen los mismos comandos (la propiedad CSS d las interpola)', () => {
    assert.equal(commandsOf(FLAT_PATH), commandsOf(WAVE_PATH))
    assert.ok(!/L/.test(WAVE_PATH))
  })

  test('el largo de la pista generado coincide con la portación', () => {
    const { track } = circularPolygons(9)
    assert.ok(Math.abs(pathLength(circularPath(track.cubics, 44)) - TRACK_LENGTH) < 0.001)
    // Un círculo de radio 21,45.
    assert.ok(Math.abs(TRACK_LENGTH - 2 * Math.PI * 21.45) < 0.1)
  })
})
