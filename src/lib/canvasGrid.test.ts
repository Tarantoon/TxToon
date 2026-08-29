import { describe, expect, it } from 'vitest'
import { interpolateGridPoints } from './canvasGrid'

describe('interpolateGridPoints', () => {
  it('interpolates horizontal lines in both directions', () => {
    expect(
      interpolateGridPoints({ x: 1, y: 2 }, { x: 4, y: 2 }),
    ).toEqual([
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
    ])

    expect(
      interpolateGridPoints({ x: 4, y: 2 }, { x: 1, y: 2 }),
    ).toEqual([
      { x: 4, y: 2 },
      { x: 3, y: 2 },
      { x: 2, y: 2 },
      { x: 1, y: 2 },
    ])
  })

  it('interpolates diagonal and reverse-sloping lines in both directions', () => {
    expect(
      interpolateGridPoints({ x: 1, y: 1 }, { x: 4, y: 4 }),
    ).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
      { x: 4, y: 4 },
    ])

    expect(
      interpolateGridPoints({ x: 4, y: 1 }, { x: 1, y: 4 }),
    ).toEqual([
      { x: 4, y: 1 },
      { x: 3, y: 2 },
      { x: 2, y: 3 },
      { x: 1, y: 4 },
    ])

    expect(
      interpolateGridPoints({ x: 1, y: 4 }, { x: 4, y: 1 }),
    ).toEqual([
      { x: 1, y: 4 },
      { x: 2, y: 3 },
      { x: 3, y: 2 },
      { x: 4, y: 1 },
    ])
  })
})
