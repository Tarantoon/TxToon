import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { CanvasEditor } from './CanvasEditor'
import { useEditorStore } from '../store/editorStore'

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

    fireEvent.pointerDown(canvas, {
      button: 2,
      buttons: 2,
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    })
    fireEvent.pointerMove(canvas, {
      pointerId: 1,
      buttons: 2,
      clientX: 110,
      clientY: 10,
    })
    fireEvent.pointerUp(canvas, {
      pointerId: 1,
      clientX: 110,
      clientY: 10,
    })

    expect(setPointerCaptureMock).toHaveBeenCalledWith(1)
    expect(releasePointerCaptureMock).toHaveBeenCalledWith(1)
    expect(useEditorStore.getState().layers[0]).toMatchObject({
      type: 'ascii',
      cells: { '1,0': 'A' },
    })
  })

  it('cancels right-button moves without committing selection changes', async () => {
    const { getByLabelText } = render(<CanvasEditor />)
    const canvas = getByLabelText('TxToon ASCII drawing canvas') as HTMLCanvasElement

    await waitFor(() => expect(canvas.width).toBe(200))

    fireEvent.pointerDown(canvas, {
      button: 2,
      buttons: 2,
      pointerId: 2,
      clientX: 10,
      clientY: 10,
    })
    fireEvent.pointerMove(canvas, {
      pointerId: 2,
      buttons: 2,
      clientX: 110,
      clientY: 10,
    })
    fireEvent.pointerCancel(canvas, {
      pointerId: 2,
    })

    expect(releasePointerCaptureMock).toHaveBeenCalledWith(2)
    expect(useEditorStore.getState().layers[0]).toMatchObject({
      type: 'ascii',
      cells: { '0,0': 'A' },
    })
  })
})
