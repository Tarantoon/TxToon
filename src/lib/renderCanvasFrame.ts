import type { GridMetrics } from './canvasGrid'
import type { EditorLayer, GridCellKey, GridSize } from '../types/editor'

export interface ViewportSize {
  width: number
  height: number
}

export interface CanvasFrameOptions {
  context: CanvasRenderingContext2D
  layersBottomToTop: EditorLayer[]
  gridSize: GridSize
  viewport: ViewportSize
  metrics: GridMetrics
  showGrid: boolean
  pixelRatio: number
}

const CANVAS_FONT =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace'

const parseGridKey = (key: GridCellKey): { x: number; y: number } => {
  const separatorIndex = key.indexOf(',')
  return {
    x: Number(key.slice(0, separatorIndex)),
    y: Number(key.slice(separatorIndex + 1)),
  }
}

export const renderCanvasFrame = ({
  context,
  layersBottomToTop,
  gridSize,
  viewport,
  metrics,
  showGrid,
  pixelRatio,
}: CanvasFrameOptions): void => {
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  context.globalAlpha = 1
  context.clearRect(0, 0, viewport.width, viewport.height)
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
      const { x, y } = parseGridKey(key as GridCellKey)
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

  if (!showGrid) {
    return
  }

  context.beginPath()
  context.globalAlpha = 0.16
  context.strokeStyle = '#171717'
  context.lineWidth = 1

  for (let x = 0; x <= gridSize.columns; x += 1) {
    const xPosition = Math.round(x * metrics.cellWidth) + 0.5
    context.moveTo(xPosition, 0)
    context.lineTo(xPosition, viewport.height)
  }
  for (let y = 0; y <= gridSize.rows; y += 1) {
    const yPosition = Math.round(y * metrics.cellHeight) + 0.5
    context.moveTo(0, yPosition)
    context.lineTo(viewport.width, yPosition)
  }

  context.stroke()
  context.globalAlpha = 1
}
