import { parseGridCellKey, type GridMetrics } from './canvasGrid'
import type {
  CameraState,
  EditorLayer,
  GridCellKey,
  GridSize,
  Point,
  ViewportSize,
} from '../types/editor'

export interface CanvasSelectionCell {
  point: Point
  character: string
}

export interface CanvasSelectionOverlay {
  cells: CanvasSelectionCell[]
  moveOffset: Point
  marquee: { start: Point; end: Point } | null
}

export interface CanvasFrameOptions {
  context: CanvasRenderingContext2D
  layersBottomToTop: EditorLayer[]
  gridSize: GridSize
  viewport: ViewportSize
  metrics: GridMetrics
  showGrid: boolean
  pixelRatio: number
  camera: CameraState
  selection?: CanvasSelectionOverlay
}

const CANVAS_FONT =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace'

export const renderCanvasFrame = ({
  context,
  layersBottomToTop,
  gridSize,
  viewport,
  metrics,
  showGrid,
  pixelRatio,
  camera,
  selection,
}: CanvasFrameOptions): void => {
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  context.globalAlpha = 1
  context.clearRect(0, 0, viewport.width, viewport.height)
  context.fillStyle = '#d4d4d4'
  context.fillRect(0, 0, viewport.width, viewport.height)
  context.save()
  context.translate(camera.pan.x, camera.pan.y)
  context.scale(camera.zoom, camera.zoom)
  context.beginPath()
  context.rect(0, 0, viewport.width, viewport.height)
  context.clip()
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, viewport.width, viewport.height)
  context.font = `600 ${metrics.fontSize}px ${CANVAS_FONT}`
  context.textAlign = 'center'
  context.textBaseline = 'middle'

  for (const layer of layersBottomToTop) {
    if (!layer.visible) {
      continue
    }

    if (layer.type === 'image') {
      if (layer.image.complete && layer.image.naturalWidth > 0) {
        context.save()
        context.globalAlpha = layer.opacity
        context.drawImage(
          layer.image,
          layer.position.x,
          layer.position.y,
          layer.image.naturalWidth * layer.scale.x,
          layer.image.naturalHeight * layer.scale.y,
        )
        context.restore()
      }
      continue
    }

    context.fillStyle = '#0a0a0a'
    for (const [key, character] of Object.entries(layer.cells)) {
      const { x, y } = parseGridCellKey(key as GridCellKey)
      if (x < 0 || y < 0 || x >= gridSize.columns || y >= gridSize.rows) {
        continue
      }
      context.fillText(
        character,
        x * metrics.cellWidth + metrics.cellWidth / 2,
        y * metrics.cellHeight + metrics.cellHeight / 2,
      )
    }
  }

  if (showGrid) {
    context.beginPath()
    context.globalAlpha = 0.16
    context.strokeStyle = '#171717'
    context.lineWidth = 1 / camera.zoom

    for (let x = 0; x <= gridSize.columns; x += 1) {
      const xPosition = x * metrics.cellWidth
      context.moveTo(xPosition, 0)
      context.lineTo(xPosition, viewport.height)
    }
    for (let y = 0; y <= gridSize.rows; y += 1) {
      const yPosition = y * metrics.cellHeight
      context.moveTo(0, yPosition)
      context.lineTo(viewport.width, yPosition)
    }

    context.stroke()
  }

  if (selection) {
    context.globalAlpha = 1
    context.lineWidth = 2 / camera.zoom
    context.strokeStyle = '#0a0a0a'
    context.fillStyle = '#737373'

    for (const cell of selection.cells) {
      context.globalAlpha = 0.2
      context.fillRect(
        cell.point.x * metrics.cellWidth,
        cell.point.y * metrics.cellHeight,
        metrics.cellWidth,
        metrics.cellHeight,
      )
      context.globalAlpha = 1
      context.strokeRect(
        cell.point.x * metrics.cellWidth,
        cell.point.y * metrics.cellHeight,
        metrics.cellWidth,
        metrics.cellHeight,
      )

      if (selection.moveOffset.x !== 0 || selection.moveOffset.y !== 0) {
        const destination = {
          x: cell.point.x + selection.moveOffset.x,
          y: cell.point.y + selection.moveOffset.y,
        }
        context.globalAlpha = 0.75
        context.fillStyle = '#ffffff'
        context.fillRect(
          destination.x * metrics.cellWidth,
          destination.y * metrics.cellHeight,
          metrics.cellWidth,
          metrics.cellHeight,
        )
        context.fillStyle = '#0a0a0a'
        context.fillText(
          cell.character,
          destination.x * metrics.cellWidth + metrics.cellWidth / 2,
          destination.y * metrics.cellHeight + metrics.cellHeight / 2,
        )
        context.globalAlpha = 1
      }
    }

    if (selection.marquee) {
      const minX = Math.min(selection.marquee.start.x, selection.marquee.end.x)
      const minY = Math.min(selection.marquee.start.y, selection.marquee.end.y)
      const width = Math.abs(
        selection.marquee.end.x - selection.marquee.start.x,
      ) + 1
      const height = Math.abs(
        selection.marquee.end.y - selection.marquee.start.y,
      ) + 1
      context.setLineDash([6 / camera.zoom, 4 / camera.zoom])
      context.globalAlpha = 0.12
      context.fillStyle = '#0a0a0a'
      context.fillRect(
        minX * metrics.cellWidth,
        minY * metrics.cellHeight,
        width * metrics.cellWidth,
        height * metrics.cellHeight,
      )
      context.globalAlpha = 1
      context.strokeRect(
        minX * metrics.cellWidth,
        minY * metrics.cellHeight,
        width * metrics.cellWidth,
        height * metrics.cellHeight,
      )
      context.setLineDash([])
    }
  }

  context.globalAlpha = 1
  context.restore()
}
