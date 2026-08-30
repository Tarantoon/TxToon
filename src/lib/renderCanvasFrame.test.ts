import { describe, expect, it, vi } from 'vitest'
import { renderCanvasFrame } from './renderCanvasFrame'
import type { EditorLayer } from '../types/editor'

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
  it('translates and scales the camera, clips the viewport, draws layers bottom-to-top, and renders selection overlays', () => {
    const context = createContextMock()

    renderCanvasFrame({
      context,
      layersBottomToTop: [
        createAsciiLayer('bottom', { '0,0': 'B' }),
        createImageLayer('reference'),
        createAsciiLayer('top', { '0,0': 'T' }),
      ],
      gridSize: { columns: 2, rows: 2 },
      viewport: { width: 120, height: 80 },
      metrics: { fontSize: 18, cellWidth: 10, cellHeight: 20 },
      showGrid: true,
      pixelRatio: 2,
      camera: { zoom: 2, pan: { x: 12, y: 6 } },
      selection: {
        cells: [{ point: { x: 1, y: 1 }, character: 'M' }],
        moveOffset: { x: 1, y: 0 },
        marquee: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
      },
    })

    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0)
    expect(context.translate).toHaveBeenCalledWith(12, 6)
    expect(context.scale).toHaveBeenCalledWith(2, 2)
    expect(context.clip).toHaveBeenCalledTimes(1)
    expect(context.drawImage).toHaveBeenCalledWith(
      expect.objectContaining({ complete: true, naturalWidth: 40, naturalHeight: 20 }),
      5,
      7,
      80,
      60,
    )
    expect(context.fillText).toHaveBeenNthCalledWith(1, 'B', 5, 10)
    expect(context.fillText).toHaveBeenNthCalledWith(2, 'T', 5, 10)
    expect(context.fillText).toHaveBeenNthCalledWith(3, 'M', 25, 30)
    expect(context.fillRect).toHaveBeenCalledWith(10, 20, 10, 20)
    expect(context.fillRect).toHaveBeenCalledWith(20, 20, 10, 20)
    expect(context.strokeRect).toHaveBeenCalledWith(10, 20, 10, 20)
    expect(context.strokeRect).toHaveBeenCalledWith(0, 0, 20, 40)
    expect(context.setLineDash).toHaveBeenCalledWith([3, 2])
    expect(context.setLineDash).toHaveBeenLastCalledWith([])

    const clipIndex = context.operations.indexOf('clip')
    const translateIndex = context.operations.indexOf('translate:12,6')
    const scaleIndex = context.operations.indexOf('scale:2,2')

    expect(clipIndex).toBeGreaterThan(-1)
    expect(translateIndex).toBeGreaterThan(-1)
    expect(scaleIndex).toBeGreaterThan(-1)
    expect(clipIndex).toBeGreaterThan(translateIndex)
    expect(clipIndex).toBeGreaterThan(scaleIndex)

    const bottomFillTextIndex = context.operations.indexOf('fillText:B:5:10')
    const imageDrawIndex = context.operations.indexOf('drawImage')
    const topFillTextIndex = context.operations.indexOf('fillText:T:5:10')
    const selectionFillTextIndex = context.operations.indexOf('fillText:M:25:30')

    expect(bottomFillTextIndex).toBeGreaterThan(-1)
    expect(imageDrawIndex).toBeGreaterThan(bottomFillTextIndex)
    expect(topFillTextIndex).toBeGreaterThan(imageDrawIndex)
    expect(selectionFillTextIndex).toBeGreaterThan(topFillTextIndex)
    expect(context.beginPath).toHaveBeenCalledTimes(2)
    expect(context.stroke).toHaveBeenCalledTimes(1)
  })

  it('skips hidden layers and the optional grid when disabled', () => {
    const context = createContextMock()

    renderCanvasFrame({
      context,
      layersBottomToTop: [
        createAsciiLayer('visible', { '0,0': 'A' }),
        createAsciiLayer('hidden', { '0,0': 'H' }, false),
      ],
      gridSize: { columns: 1, rows: 1 },
      viewport: { width: 10, height: 10 },
      metrics: { fontSize: 12, cellWidth: 10, cellHeight: 10 },
      showGrid: false,
      pixelRatio: 1,
      camera: { zoom: 1, pan: { x: 0, y: 0 } },
    })

    expect(context.fillText).toHaveBeenCalledTimes(1)
    expect(context.beginPath).toHaveBeenCalledTimes(1)
    expect(context.stroke).not.toHaveBeenCalled()
  })
})
