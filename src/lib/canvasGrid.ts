import type {
  CameraState,
  GridCellKey,
  GridSize,
  Point,
  ViewportSize,
} from '../types/editor'

export interface GridMetrics {
  fontSize: number
  cellWidth: number
  cellHeight: number
  origin: Point
  projectWidth: number
  projectHeight: number
  fitScale: number
}

export interface GridBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export const CELL_WIDTH_TO_HEIGHT_RATIO = 0.6
export const MAX_CELL_HEIGHT = 28
export const WORKSPACE_MARGIN = 28

export const getGridMetrics = (
  gridSize: GridSize,
  viewport: ViewportSize,
): GridMetrics => {
  const availableWidth = Math.max(1, viewport.width - WORKSPACE_MARGIN * 2)
  const availableHeight = Math.max(1, viewport.height - WORKSPACE_MARGIN * 2)
  const cellHeight = Math.min(
    MAX_CELL_HEIGHT,
    availableHeight / gridSize.rows,
    availableWidth / (gridSize.columns * CELL_WIDTH_TO_HEIGHT_RATIO),
  )
  const cellWidth = cellHeight * CELL_WIDTH_TO_HEIGHT_RATIO
  const projectWidth = cellWidth * gridSize.columns
  const projectHeight = cellHeight * gridSize.rows

  return {
    cellWidth,
    cellHeight,
    fontSize: cellHeight,
    origin: {
      x: (viewport.width - projectWidth) / 2,
      y: (viewport.height - projectHeight) / 2,
    },
    projectWidth,
    projectHeight,
    fitScale: cellHeight / MAX_CELL_HEIGHT,
  }
}

export const parseGridCellKey = (key: GridCellKey): Point => {
  const separatorIndex = key.indexOf(',')
  return {
    x: Number(key.slice(0, separatorIndex)),
    y: Number(key.slice(separatorIndex + 1)),
  }
}

export const getGridBounds = (start: Point, end: Point): GridBounds => ({
  minX: Math.min(start.x, end.x),
  minY: Math.min(start.y, end.y),
  maxX: Math.max(start.x, end.x),
  maxY: Math.max(start.y, end.y),
})

export const getGridPointFromScreen = (
  screenPoint: Point,
  camera: CameraState,
  metrics: GridMetrics,
  gridSize: GridSize,
  shouldClamp = false,
): Point | null => {
  const projectPoint = getProjectPointFromScreen(screenPoint, camera, metrics)
  const point = {
    x: Math.floor(projectPoint.x / metrics.cellWidth),
    y: Math.floor(projectPoint.y / metrics.cellHeight),
  }

  if (shouldClamp) {
    return {
      x: Math.min(Math.max(point.x, 0), gridSize.columns - 1),
      y: Math.min(Math.max(point.y, 0), gridSize.rows - 1),
    }
  }

  return point.x >= 0 &&
    point.y >= 0 &&
    point.x < gridSize.columns &&
    point.y < gridSize.rows
    ? point
    : null
}

export const getProjectPointFromScreen = (
  screenPoint: Point,
  camera: CameraState,
  metrics: GridMetrics,
): Point => ({
  x:
    (screenPoint.x - camera.pan.x) / camera.zoom -
    metrics.origin.x,
  y:
    (screenPoint.y - camera.pan.y) / camera.zoom -
    metrics.origin.y,
})

export const clampGridMoveOffset = (
  points: Point[],
  desiredOffset: Point,
  gridSize: GridSize,
): Point => {
  if (points.length === 0) {
    return { x: 0, y: 0 }
  }

  const xCoordinates = points.map((point) => point.x)
  const yCoordinates = points.map((point) => point.y)
  const minX = Math.min(...xCoordinates)
  const maxX = Math.max(...xCoordinates)
  const minY = Math.min(...yCoordinates)
  const maxY = Math.max(...yCoordinates)

  return {
    x: Math.min(
      Math.max(desiredOffset.x, -minX),
      gridSize.columns - 1 - maxX,
    ),
    y: Math.min(
      Math.max(desiredOffset.y, -minY),
      gridSize.rows - 1 - maxY,
    ),
  }
}

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
