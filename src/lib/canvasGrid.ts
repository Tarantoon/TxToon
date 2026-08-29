import type { Point } from '../types/editor'

export interface GridMetrics {
  fontSize: number
  cellWidth: number
  cellHeight: number
}

export const getGridMetrics = (granularity: number): GridMetrics => ({
  fontSize: granularity,
  cellWidth: granularity * 0.62,
  cellHeight: granularity * 1.25,
})

export const interpolateGridPoints = (start: Point, end: Point): Point[] => {
  const points: Point[] = []
  let x = start.x
  let y = start.y
  const deltaX = Math.abs(end.x - start.x)
  const deltaY = Math.abs(end.y - start.y)
  const stepX = start.x < end.x ? 1 : -1
  const stepY = start.y < end.y ? 1 : -1
  let error = deltaX - deltaY

  while (true) {
    points.push({ x, y })
    if (x === end.x && y === end.y) {
      return points
    }

    const doubledError = error * 2
    if (doubledError > -deltaY) {
      error -= deltaY
      x += stepX
    }
    if (doubledError < deltaX) {
      error += deltaX
      y += stepY
    }
  }
}
