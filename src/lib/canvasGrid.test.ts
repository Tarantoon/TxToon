import { describe, expect, it } from 'vitest'
import {
  CELL_WIDTH_TO_HEIGHT_RATIO,
  clampGridMoveOffset,
  MAX_CELL_HEIGHT,
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
  it('centers a 10x10 grid at the maximum cell height with blank margins and the strict width-to-height ratio', () => {
    const metrics = getGridMetrics(
      { columns: 10, rows: 10 },
      { width: 400, height: 400 },
    )

    expect(metrics.cellHeight).toBe(MAX_CELL_HEIGHT)
    expect(metrics.cellWidth / metrics.cellHeight).toBeCloseTo(
      CELL_WIDTH_TO_HEIGHT_RATIO,
    )
    expect(metrics.projectWidth).toBeCloseTo(168)
    expect(metrics.projectHeight).toBeCloseTo(280)
    expect(metrics.origin).toEqual({ x: 116, y: 60 })
    expect(metrics.fontSize).toBe(MAX_CELL_HEIGHT)
  })

  it('proportionally fits a 100x100 grid within the workspace margins', () => {
    const metrics = getGridMetrics(
      { columns: 100, rows: 100 },
      { width: 500, height: 500 },
    )

    expect(metrics.cellWidth / metrics.cellHeight).toBeCloseTo(
      CELL_WIDTH_TO_HEIGHT_RATIO,
    )
    expect(metrics.projectWidth).toBeCloseTo(266.4)
    expect(metrics.projectHeight).toBeCloseTo(444)
    expect(metrics.origin.x).toBeCloseTo(116.8)
    expect(metrics.origin.y).toBeCloseTo(28, 6)
    expect(metrics.origin.x).toBeGreaterThanOrEqual(28)
    expect(metrics.origin.y).toBeGreaterThanOrEqual(27.99)
    expect(metrics.origin.x + metrics.projectWidth).toBeLessThanOrEqual(472)
    expect(metrics.origin.y + metrics.projectHeight).toBeLessThanOrEqual(472)
  })
})

describe('getGridPointFromScreen', () => {
  it('inverts centered origin, camera pan, and zoom back to grid coordinates', () => {
    const gridSize = { columns: 10, rows: 10 }
    const metrics = getGridMetrics(gridSize, { width: 400, height: 400 })
    const camera = { zoom: 1.5, pan: { x: 18, y: -12 } }
    const targetPoint = { x: 3, y: 4 }
    const screenPoint = {
      x:
        camera.pan.x +
        camera.zoom *
          (metrics.origin.x + targetPoint.x * metrics.cellWidth + metrics.cellWidth * 0.25),
      y:
        camera.pan.y +
        camera.zoom *
          (metrics.origin.y + targetPoint.y * metrics.cellHeight + metrics.cellHeight * 0.5),
    }

    expect(getGridPointFromScreen(screenPoint, camera, metrics, gridSize)).toEqual(
      targetPoint,
    )
  })

  it('clamps out-of-bounds screen points when requested', () => {
    expect(
      getGridPointFromScreen(
        { x: -100, y: 999 },
        { zoom: 1, pan: { x: 0, y: 0 } },
        {
          cellWidth: 10,
          cellHeight: 10,
          fontSize: 12,
          origin: { x: 0, y: 0 },
          projectWidth: 40,
          projectHeight: 30,
          fitScale: 1,
        },
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
