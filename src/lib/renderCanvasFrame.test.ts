import { describe, expect, it, vi } from 'vitest'
import { renderCanvasFrame } from './renderCanvasFrame'
import type { EditorLayer, ImageLayer } from '../types/editor'
import { getGridMetrics } from './canvasGrid'

const createContextMock = () => {
  const operations: string[] = []
  const context = {
    setTransform: vi.fn((...args: number[]) =>
      operations.push(`setTransform:${args.join(',')}`),
    ),
    clearRect: vi.fn((...args: number[]) =>
      operations.push(`clearRect:${args.join(',')}`),
    ),
    fillRect: vi.fn((...args: number[]) =>
      operations.push(`fillRect:${args.join(',')}`),
    ),
    strokeRect: vi.fn((...args: number[]) =>
      operations.push(`strokeRect:${args.join(',')}`),
    ),
    drawImage: vi.fn(() => operations.push('drawImage')),
    fillText: vi.fn((character: string, x: number, y: number) =>
      operations.push(`fillText:${character}:${x}:${y}`),
    ),
    beginPath: vi.fn(() => operations.push('beginPath')),
    rect: vi.fn((...args: number[]) =>
      operations.push(`rect:${args.join(',')}`),
    ),
    clip: vi.fn(() => operations.push('clip')),
    moveTo: vi.fn((...args: number[]) =>
      operations.push(`moveTo:${args.join(',')}`),
    ),
    lineTo: vi.fn((...args: number[]) =>
      operations.push(`lineTo:${args.join(',')}`),
    ),
    stroke: vi.fn(() => operations.push('stroke')),
    save: vi.fn(() => operations.push('save')),
    restore: vi.fn(() => operations.push('restore')),
    translate: vi.fn((...args: number[]) =>
      operations.push(`translate:${args.join(',')}`),
    ),
    scale: vi.fn((...args: number[]) =>
      operations.push(`scale:${args.join(',')}`),
    ),
    setLineDash: vi.fn((segments: number[]) =>
      operations.push(`setLineDash:${segments.join(',')}`),
    ),
  } as Partial<CanvasRenderingContext2D>

  const defineTrackedProperty = <K extends keyof CanvasRenderingContext2D>(
    key: K,
    initialValue: CanvasRenderingContext2D[K],
  ) => {
    let value = initialValue

    Object.defineProperty(context, key, {
      get: () => value,
      set: (nextValue) => {
        value = nextValue
        operations.push(`${String(key)}:${String(nextValue)}`)
      },
      configurable: true,
    })
  }

  defineTrackedProperty('globalAlpha', 1)
  defineTrackedProperty('fillStyle', '#000000')
  defineTrackedProperty('strokeStyle', '#000000')
  defineTrackedProperty('lineWidth', 1)
  defineTrackedProperty('font', '')
  defineTrackedProperty('textAlign', 'start')
  defineTrackedProperty('textBaseline', 'alphabetic')

  return Object.assign(context, { operations }) as CanvasRenderingContext2D & {
    operations: string[]
  }
}

const createAsciiLayer = (
  id: string,
  cells: Record<string, string>,
  visible = true,
): EditorLayer => ({
  id,
  type: 'ascii',
  name: id,
  visible,
  cells,
})

const createImageLayer = (id: string): EditorLayer => ({
  id,
  type: 'image',
  name: id,
  visible: true,
  image: {
    complete: true,
    naturalWidth: 40,
    naturalHeight: 20,
  } as HTMLImageElement,
  position: { x: 5, y: 7 },
  scale: { x: 2, y: 3 },
  opacity: 0.5,
})

describe('renderCanvasFrame', () => {
  it('offsets page, ASCII, grid, and image drawing by the grid origin, clips to the project bounds, and renders the active image outline and resize handle', () => {
    const context = createContextMock()
    const viewport = { width: 400, height: 400 }
    const gridSize = { columns: 10, rows: 10 }
    const metrics = getGridMetrics(gridSize, viewport)
    const activeImageLayer = createImageLayer('reference') as ImageLayer

    renderCanvasFrame({
      context,
      layersBottomToTop: [
        createAsciiLayer('bottom', { '0,0': 'B', '99,99': 'X' }),
        activeImageLayer,
        createAsciiLayer('top', { '1,1': 'T' }),
      ],
      gridSize,
      viewport,
      metrics,
      showGrid: true,
      pixelRatio: 2,
      camera: { zoom: 1.5, pan: { x: 12, y: -8 } },
      activeImageLayerId: activeImageLayer.id,
    })

    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0)
    expect(context.translate).toHaveBeenCalledWith(12, -8)
    expect(context.scale).toHaveBeenCalledWith(1.5, 1.5)
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 400, 400)
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 400, 400)
    expect(context.fillRect).toHaveBeenCalledWith(
      metrics.origin.x,
      metrics.origin.y,
      metrics.projectWidth,
      metrics.projectHeight,
    )
    expect(context.clip).toHaveBeenCalledTimes(1)
    expect(context.drawImage).toHaveBeenCalledWith(
      expect.objectContaining({
        complete: true,
        naturalWidth: 40,
        naturalHeight: 20,
      }),
      metrics.origin.x + activeImageLayer.position.x,
      metrics.origin.y + activeImageLayer.position.y,
      80,
      60,
    )
    const fillTextMock = context.fillText as unknown as {
      mock: { calls: Array<[string, number, number, number?]> }
    }
    const firstFillTextCall = fillTextMock.mock.calls[0]
    const secondFillTextCall = fillTextMock.mock.calls[1]

    expect(firstFillTextCall[0]).toBe('B')
    expect(firstFillTextCall[1]).toBeCloseTo(
      metrics.origin.x + metrics.cellWidth / 2,
      6,
    )
    expect(firstFillTextCall[2]).toBeCloseTo(
      metrics.origin.y + metrics.cellHeight / 2,
      6,
    )
    expect(secondFillTextCall[0]).toBe('T')
    expect(secondFillTextCall[1]).toBeCloseTo(
      metrics.origin.x + metrics.cellWidth * 1.5,
      6,
    )
    expect(secondFillTextCall[2]).toBeCloseTo(
      metrics.origin.y + metrics.cellHeight * 1.5,
      6,
    )
    expect(context.fillText).toHaveBeenCalledTimes(2)
    expect(context.beginPath).toHaveBeenCalledTimes(2)
    expect(context.rect).toHaveBeenCalledWith(
      metrics.origin.x,
      metrics.origin.y,
      metrics.projectWidth,
      metrics.projectHeight,
    )
    expect(context.moveTo).toHaveBeenCalledWith(metrics.origin.x, metrics.origin.y)
    expect(context.lineTo).toHaveBeenCalledWith(
      metrics.origin.x,
      metrics.origin.y + metrics.projectHeight,
    )
    expect(context.moveTo).toHaveBeenCalledWith(metrics.origin.x, metrics.origin.y)
    expect(context.lineWidth).toBeCloseTo(2 / 1.5)
    expect(context.strokeRect).toHaveBeenCalledWith(
      metrics.origin.x + activeImageLayer.position.x,
      metrics.origin.y + activeImageLayer.position.y,
      80,
      60,
    )
    expect(context.strokeRect).toHaveBeenCalledWith(
      metrics.origin.x + activeImageLayer.position.x + 80 - 10 / 1.5 / 2,
      metrics.origin.y + activeImageLayer.position.y + 60 - 10 / 1.5 / 2,
      10 / 1.5,
      10 / 1.5,
    )
    expect(context.setLineDash).toHaveBeenCalledWith([5 / 1.5, 3 / 1.5])
    expect(context.setLineDash).toHaveBeenLastCalledWith([])

    const clipIndex = context.operations.indexOf('clip')
    const translateIndex = context.operations.indexOf('translate:12,-8')
    const scaleIndex = context.operations.indexOf('scale:1.5,1.5')

    expect(clipIndex).toBeGreaterThan(-1)
    expect(translateIndex).toBeGreaterThan(-1)
    expect(scaleIndex).toBeGreaterThan(-1)
    expect(clipIndex).toBeGreaterThan(translateIndex)
    expect(clipIndex).toBeGreaterThan(scaleIndex)

    const bottomFillTextIndex = context.operations.findIndex((entry) =>
      entry.startsWith('fillText:B:'),
    )
    const imageDrawIndex = context.operations.indexOf('drawImage')
    const topFillTextIndex = context.operations.findIndex((entry) =>
      entry.startsWith('fillText:T:'),
    )

    expect(bottomFillTextIndex).toBeGreaterThan(-1)
    expect(imageDrawIndex).toBeGreaterThan(bottomFillTextIndex)
    expect(topFillTextIndex).toBeGreaterThan(imageDrawIndex)
    expect(context.stroke).toHaveBeenCalledTimes(1)
  })

  it('skips hidden layers and the optional grid when disabled', () => {
    const context = createContextMock()
    const viewport = { width: 120, height: 80 }
    const gridSize = { columns: 2, rows: 2 }
    const metrics = getGridMetrics(gridSize, viewport)

    renderCanvasFrame({
      context,
      layersBottomToTop: [
        createAsciiLayer('visible', { '0,0': 'A' }),
        createAsciiLayer('hidden', { '0,0': 'H' }, false),
      ],
      gridSize,
      viewport,
      metrics,
      showGrid: false,
      pixelRatio: 1,
      camera: { zoom: 1, pan: { x: 0, y: 0 } },
    })

    expect(context.fillText).toHaveBeenCalledTimes(1)
    expect(context.beginPath).toHaveBeenCalledTimes(1)
    expect(context.stroke).not.toHaveBeenCalled()
  })
})
