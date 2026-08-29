import { describe, expect, it, vi } from 'vitest'
import { renderCanvasFrame } from './renderCanvasFrame'
import type { EditorLayer } from '../types/editor'

const createContextMock = () => {
  const operations: string[] = []
  const context = {
    setTransform: vi.fn(() => operations.push('setTransform')),
    clearRect: vi.fn((...args: number[]) =>
      operations.push(`clearRect:${args.join(',')}`),
    ),
    fillRect: vi.fn((...args: number[]) =>
      operations.push(`fillRect:${args.join(',')}`),
    ),
    drawImage: vi.fn((...args: unknown[]) =>
      operations.push(`drawImage:${args.length}`),
    ),
    fillText: vi.fn((character: string, x: number, y: number) =>
      operations.push(`fillText:${character}:${x}:${y}`),
    ),
    beginPath: vi.fn(() => operations.push('beginPath')),
    moveTo: vi.fn((x: number, y: number) =>
      operations.push(`moveTo:${x}:${y}`),
    ),
    lineTo: vi.fn((x: number, y: number) =>
      operations.push(`lineTo:${x}:${y}`),
    ),
    stroke: vi.fn(() => operations.push('stroke')),
    save: vi.fn(() => operations.push('save')),
    restore: vi.fn(() => operations.push('restore')),
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
  defineTrackedProperty('font', '')
  defineTrackedProperty('textAlign', 'start')
  defineTrackedProperty('textBaseline', 'alphabetic')
  defineTrackedProperty('strokeStyle', '#000000')
  defineTrackedProperty('lineWidth', 1)

  return Object.assign(context, { operations }) as unknown as
    CanvasRenderingContext2D & { operations: string[] }
}

const createAsciiLayer = (
  cells: Record<string, string>,
  visible = true,
): EditorLayer => ({
  id: 'ascii',
  type: 'ascii',
  name: 'ascii',
  visible,
  cells,
})

const createImageLayer = (visible = true): EditorLayer => ({
  id: 'image',
  type: 'image',
  name: 'image',
  visible,
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
  it('clears and paints the background, draws visible layers, skips hidden layers, and renders the grid when enabled', () => {
    const context = createContextMock()

    renderCanvasFrame({
      context,
      layersBottomToTop: [
        createImageLayer(true),
        createAsciiLayer({ '1,1': 'X' }, true),
        createImageLayer(false),
        createAsciiLayer({ '0,0': 'H' }, false),
      ],
      gridSize: { columns: 2, rows: 2 },
      viewport: { width: 120, height: 80 },
      metrics: { fontSize: 18, cellWidth: 10, cellHeight: 12 },
      showGrid: true,
      pixelRatio: 2,
    })

    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0)
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 120, 80)
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 120, 80)
    expect(context.drawImage).toHaveBeenCalledWith(
      expect.objectContaining({ complete: true, naturalWidth: 40, naturalHeight: 20 }),
      5,
      7,
      80,
      60,
    )
    expect(context.fillText).toHaveBeenCalledWith('X', 15, 18)
    expect(context.fillText).not.toHaveBeenCalledWith('H', expect.any(Number), expect.any(Number))
    expect(context.beginPath).toHaveBeenCalledTimes(1)
    expect(context.stroke).toHaveBeenCalledTimes(1)
    expect(context.operations).toEqual(
      expect.arrayContaining([
        'setTransform',
        'globalAlpha:1',
        'clearRect:0,0,120,80',
        'fillStyle:#ffffff',
        'fillRect:0,0,120,80',
        'fillStyle:#0a0a0a',
        'save',
        'globalAlpha:0.5',
        'drawImage:5',
        'restore',
        'beginPath',
        'globalAlpha:0.16',
        'strokeStyle:#171717',
        'lineWidth:1',
        'stroke',
        'globalAlpha:1',
      ]),
    )
  })

  it('skips the optional grid stroke when disabled', () => {
    const context = createContextMock()

    renderCanvasFrame({
      context,
      layersBottomToTop: [createAsciiLayer({ '0,0': 'A' })],
      gridSize: { columns: 1, rows: 1 },
      viewport: { width: 10, height: 10 },
      metrics: { fontSize: 12, cellWidth: 10, cellHeight: 10 },
      showGrid: false,
      pixelRatio: 1,
    })

    expect(context.beginPath).not.toHaveBeenCalled()
    expect(context.stroke).not.toHaveBeenCalled()
    expect(context.fillText).toHaveBeenCalledTimes(1)
  })
})
