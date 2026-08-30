import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { CanvasEditor } from './CanvasEditor'
import { getGridMetrics } from '../lib/canvasGrid'
import { useEditorStore } from '../store/editorStore'
import type { ImageLayer } from '../types/editor'

const requestAnimationFrameMock = vi.fn(() => 1)
const cancelAnimationFrameMock = vi.fn()
const setPointerCaptureMock = vi.fn()
const releasePointerCaptureMock = vi.fn()
const hasPointerCaptureMock = vi.fn(() => true)
const getContextMock = vi.fn()

class MockResizeObserver {
  readonly callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe = vi.fn(() => {
    this.callback([], this as unknown as ResizeObserver)
  })

  disconnect = vi.fn()
}

const stubCanvasEnvironment = () => {
  Object.defineProperty(window, 'devicePixelRatio', {
    value: 1,
    configurable: true,
  })

  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    value: vi.fn(() => ({
      width: 200,
      height: 100,
      left: 0,
      top: 0,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })),
    configurable: true,
  })

  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: getContextMock.mockImplementation(() => ({} as CanvasRenderingContext2D)),
    configurable: true,
  })

  Object.defineProperty(HTMLCanvasElement.prototype, 'setPointerCapture', {
    value: setPointerCaptureMock,
    configurable: true,
  })

  Object.defineProperty(HTMLCanvasElement.prototype, 'releasePointerCapture', {
    value: releasePointerCaptureMock,
    configurable: true,
  })

  Object.defineProperty(HTMLCanvasElement.prototype, 'hasPointerCapture', {
    value: hasPointerCaptureMock,
    configurable: true,
  })

  vi.stubGlobal('ResizeObserver', MockResizeObserver)
  vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock)
  vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameMock)
}

beforeEach(() => {
  useEditorStore.getState().resetEditor()
  useEditorStore.getState().setGridSize({ columns: 2, rows: 2 })
  useEditorStore.getState().paintCells([{ x: 0, y: 0 }], 'A')

  requestAnimationFrameMock.mockClear()
  cancelAnimationFrameMock.mockClear()
  setPointerCaptureMock.mockClear()
  releasePointerCaptureMock.mockClear()
  hasPointerCaptureMock.mockClear()
  getContextMock.mockClear()

  stubCanvasEnvironment()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('CanvasEditor', () => {
  it('suppresses the context menu and commits pointer-driven cell moves', async () => {
    const { getByLabelText } = render(<CanvasEditor />)
    const canvas = getByLabelText('TxToon ASCII drawing canvas') as HTMLCanvasElement

    await waitFor(() => expect(canvas.width).toBe(200))
    expect(requestAnimationFrameMock).toHaveBeenCalled()
    expect(fireEvent.contextMenu(canvas)).toBe(false)

    const metrics = getGridMetrics({ columns: 2, rows: 2 }, { width: 200, height: 100 })
    const startPoint = {
      x: metrics.origin.x + metrics.cellWidth / 2,
      y: metrics.origin.y + metrics.cellHeight / 2,
    }
    const endPoint = {
      x: metrics.origin.x + metrics.cellWidth * 1.5,
      y: metrics.origin.y + metrics.cellHeight / 2,
    }

    fireEvent.pointerDown(canvas, {
      button: 2,
      buttons: 2,
      pointerId: 1,
      clientX: startPoint.x,
      clientY: startPoint.y,
    })
    fireEvent.pointerMove(canvas, {
      pointerId: 1,
      buttons: 2,
      clientX: endPoint.x,
      clientY: endPoint.y,
    })
    fireEvent.pointerUp(canvas, {
      pointerId: 1,
      clientX: endPoint.x,
      clientY: endPoint.y,
    })

    expect(useEditorStore.getState().layers[0]).toMatchObject({
      type: 'ascii',
      cells: { '1,0': 'A' },
    })
  })

  it('cancels right-button moves without committing selection changes', async () => {
    const { getByLabelText } = render(<CanvasEditor />)
    const canvas = getByLabelText('TxToon ASCII drawing canvas') as HTMLCanvasElement

    await waitFor(() => expect(canvas.width).toBe(200))

    const metrics = getGridMetrics({ columns: 2, rows: 2 }, { width: 200, height: 100 })
    const startPoint = {
      x: metrics.origin.x + metrics.cellWidth / 2,
      y: metrics.origin.y + metrics.cellHeight / 2,
    }
    const endPoint = {
      x: metrics.origin.x + metrics.cellWidth * 1.5,
      y: metrics.origin.y + metrics.cellHeight / 2,
    }

    fireEvent.pointerDown(canvas, {
      button: 2,
      buttons: 2,
      pointerId: 2,
      clientX: startPoint.x,
      clientY: startPoint.y,
    })
    fireEvent.pointerMove(canvas, {
      pointerId: 2,
      buttons: 2,
      clientX: endPoint.x,
      clientY: endPoint.y,
    })
    fireEvent.pointerCancel(canvas, {
      pointerId: 2,
    })

    expect(useEditorStore.getState().layers[0]).toMatchObject({
      type: 'ascii',
      cells: { '0,0': 'A' },
    })
  })

  it('blurs a focused external input and moves the active image layer with a left drag', async () => {
    const imageElement = {
      complete: true,
      naturalWidth: 20,
      naturalHeight: 10,
    } as HTMLImageElement

    const store = useEditorStore.getState()
    store.setGridSize({ columns: 2, rows: 2 })
    const imageLayerId = store.addImageLayer(imageElement, {
      name: 'REFERENCE',
      position: { x: 20, y: 10 },
      scale: { x: 1, y: 1 },
    })

    const { getByLabelText, getByTestId } = render(
      <>
        <input data-testid="external-input" />
        <CanvasEditor />
      </>,
    )
    const canvas = getByLabelText('TxToon ASCII drawing canvas') as HTMLCanvasElement
    const externalInput = getByTestId('external-input') as HTMLInputElement
    const blurSpy = vi.spyOn(externalInput, 'blur')

    externalInput.focus()

    await waitFor(() => expect(canvas.width).toBe(200))

    const metrics = getGridMetrics({ columns: 2, rows: 2 }, { width: 200, height: 100 })
    const startPoint = {
      x: metrics.origin.x + 25 * metrics.fitScale,
      y: metrics.origin.y + 15 * metrics.fitScale,
    }
    const endPoint = {
      x: startPoint.x + 14 * metrics.fitScale,
      y: startPoint.y + 6 * metrics.fitScale,
    }

    fireEvent.pointerDown(canvas, {
      button: 0,
      buttons: 1,
      pointerId: 11,
      clientX: startPoint.x,
      clientY: startPoint.y,
    })
    fireEvent.pointerMove(canvas, {
      pointerId: 11,
      buttons: 1,
      clientX: endPoint.x,
      clientY: endPoint.y,
    })
    fireEvent.pointerUp(canvas, {
      pointerId: 11,
      clientX: endPoint.x,
      clientY: endPoint.y,
    })

    const movedLayer = useEditorStore
      .getState()
      .layers.find((layer) => layer.id === imageLayerId) as ImageLayer | undefined

    expect(blurSpy).toHaveBeenCalledTimes(1)
    expect(movedLayer?.type).toBe('image')
    expect(movedLayer?.position.x).toBeCloseTo(34)
    expect(movedLayer?.position.y).toBeCloseTo(16)
    expect(movedLayer?.scale.x).toBeCloseTo(1)
    expect(movedLayer?.scale.y).toBeCloseTo(1)
  })

  it('scales the active image layer from the lower-right handle and restores the original transform on cancel and lost capture', async () => {
    const imageElement = {
      complete: true,
      naturalWidth: 20,
      naturalHeight: 10,
    } as HTMLImageElement

    const store = useEditorStore.getState()
    store.setGridSize({ columns: 2, rows: 2 })
    const imageLayerId = store.addImageLayer(imageElement, {
      name: 'REFERENCE',
      position: { x: 20, y: 10 },
      scale: { x: 1, y: 1 },
    })

    const { getByLabelText } = render(<CanvasEditor />)
    const canvas = getByLabelText('TxToon ASCII drawing canvas') as HTMLCanvasElement

    await waitFor(() => expect(canvas.width).toBe(200))

    const metrics = getGridMetrics({ columns: 2, rows: 2 }, { width: 200, height: 100 })
    const resizeHandlePoint = {
      x: metrics.origin.x + 40 * metrics.fitScale,
      y: metrics.origin.y + 20 * metrics.fitScale,
    }
    const scaledPoint = {
      x: metrics.origin.x + 60 * metrics.fitScale,
      y: metrics.origin.y + 30 * metrics.fitScale,
    }

    fireEvent.pointerDown(canvas, {
      button: 0,
      buttons: 1,
      pointerId: 12,
      clientX: resizeHandlePoint.x,
      clientY: resizeHandlePoint.y,
    })
    fireEvent.pointerMove(canvas, {
      pointerId: 12,
      buttons: 1,
      clientX: scaledPoint.x,
      clientY: scaledPoint.y,
    })

    const scaledLayer = useEditorStore
      .getState()
      .layers.find((layer) => layer.id === imageLayerId) as ImageLayer | undefined

    expect(scaledLayer?.type).toBe('image')
    expect(scaledLayer?.position.x).toBeCloseTo(20)
    expect(scaledLayer?.position.y).toBeCloseTo(10)
    expect(scaledLayer?.scale.x).toBeCloseTo(2)
    expect(scaledLayer?.scale.y).toBeCloseTo(2)

    fireEvent.pointerCancel(canvas, {
      pointerId: 12,
    })

    const cancelledLayer = useEditorStore
      .getState()
      .layers.find((layer) => layer.id === imageLayerId) as ImageLayer | undefined

    expect(cancelledLayer?.type).toBe('image')
    expect(cancelledLayer?.position.x).toBeCloseTo(20)
    expect(cancelledLayer?.position.y).toBeCloseTo(10)
    expect(cancelledLayer?.scale.x).toBeCloseTo(1)
    expect(cancelledLayer?.scale.y).toBeCloseTo(1)

    fireEvent.pointerDown(canvas, {
      button: 0,
      buttons: 1,
      pointerId: 13,
      clientX: resizeHandlePoint.x,
      clientY: resizeHandlePoint.y,
    })
    fireEvent.pointerMove(canvas, {
      pointerId: 13,
      buttons: 1,
      clientX: scaledPoint.x,
      clientY: scaledPoint.y,
    })
    fireEvent.lostPointerCapture(canvas, {
      pointerId: 13,
    })

    const restoredLayer = useEditorStore
      .getState()
      .layers.find((layer) => layer.id === imageLayerId) as ImageLayer | undefined

    expect(restoredLayer?.type).toBe('image')
    expect(restoredLayer?.position.x).toBeCloseTo(20)
    expect(restoredLayer?.position.y).toBeCloseTo(10)
    expect(restoredLayer?.scale.x).toBeCloseTo(1)
    expect(restoredLayer?.scale.y).toBeCloseTo(1)
  })

  it('accepts resize-handle hits using canonical image coordinates derived from the fit scale', async () => {
    const imageElement = {
      complete: true,
      naturalWidth: 20,
      naturalHeight: 10,
    } as HTMLImageElement

    const store = useEditorStore.getState()
    store.setGridSize({ columns: 2, rows: 2 })
    const imageLayerId = store.addImageLayer(imageElement, {
      name: 'REFERENCE',
      position: { x: 20, y: 10 },
      scale: { x: 1, y: 1 },
    })

    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      value: vi.fn(() => ({
        width: 200,
        height: 84,
        left: 0,
        top: 0,
        right: 200,
        bottom: 84,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      })),
      configurable: true,
    })

    const { getByLabelText } = render(<CanvasEditor />)
    const canvas = getByLabelText('TxToon ASCII drawing canvas') as HTMLCanvasElement

    await waitFor(() => expect(canvas.width).toBe(200))

    const metrics = getGridMetrics({ columns: 2, rows: 2 }, { width: 200, height: 84 })
    const handlePoint = {
      x: metrics.origin.x + 40 * metrics.fitScale,
      y: metrics.origin.y + 20 * metrics.fitScale,
    }

    fireEvent.pointerDown(canvas, {
      button: 0,
      buttons: 1,
      pointerId: 14,
      clientX: handlePoint.x + 7,
      clientY: handlePoint.y,
    })
    fireEvent.pointerMove(canvas, {
      pointerId: 14,
      buttons: 1,
      clientX: handlePoint.x + 7 + 20 * metrics.fitScale,
      clientY: handlePoint.y + 10 * metrics.fitScale,
    })
    fireEvent.pointerUp(canvas, {
      pointerId: 14,
      clientX: handlePoint.x + 7 + 20 * metrics.fitScale,
      clientY: handlePoint.y + 10 * metrics.fitScale,
    })

    const scaledLayer = useEditorStore
      .getState()
      .layers.find((layer) => layer.id === imageLayerId) as ImageLayer | undefined

    expect(scaledLayer?.type).toBe('image')
    expect(scaledLayer?.scale.x).toBeCloseTo(2)
    expect(scaledLayer?.scale.y).toBeCloseTo(2)
  })
})
