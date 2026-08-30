import { describe, expect, it } from 'vitest'
import {
  clampGridMoveOffset,
  getGridMetrics,
  getGridPointFromScreen,
  interpolateGridPoints,
} from './canvasGrid'

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

describe('getGridMetrics', () => {
  it('derives independent cell width and height from the viewport and grid size', () => {
    expect(
      getGridMetrics({ columns: 4, rows: 2 }, { width: 100, height: 80 }),
    ).toMatchObject({
      cellWidth: 25,
      cellHeight: 40,
    })

    expect(
      getGridMetrics({ columns: 4, rows: 2 }, { width: 100, height: 80 }).fontSize,
    ).toBeCloseTo(31.2)
  })
})

describe('getGridPointFromScreen', () => {
  it('maps screen coordinates back through pan and zoom into grid coordinates', () => {
    expect(
      getGridPointFromScreen(
        { x: 30, y: 60 },
        { zoom: 2, pan: { x: 10, y: 20 } },
        { cellWidth: 5, cellHeight: 10, fontSize: 12 },
        { columns: 10, rows: 10 },
      ),
    ).toEqual({ x: 2, y: 2 })
  })

  it('clamps out-of-bounds screen points when requested', () => {
    expect(
      getGridPointFromScreen(
        { x: -100, y: 999 },
        { zoom: 1, pan: { x: 0, y: 0 } },
        { cellWidth: 10, cellHeight: 10, fontSize: 12 },
        { columns: 4, rows: 3 },
        true,
      ),
    ).toEqual({ x: 0, y: 2 })
  })
})

describe('clampGridMoveOffset', () => {
  it('clamps movement to keep all selected points inside the grid', () => {
    expect(
      clampGridMoveOffset(
        [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
        { x: 2, y: 2 },
        { columns: 3, rows: 3 },
      ),
    ).toEqual({ x: 1, y: 1 })
  })

  it('returns a zero offset for an empty selection', () => {
    expect(
      clampGridMoveOffset([], { x: 5, y: -5 }, { columns: 3, rows: 3 }),
    ).toEqual({ x: 0, y: 0 })
  })
})
