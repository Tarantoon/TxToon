import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { LayerPanel } from './LayerPanel'
import { useEditorStore } from '../store/editorStore'

const dndCallbacks = vi.hoisted(() => ({
  onDragStart: null as null | ((event: any) => void),
  onDragEnd: null as null | ((event: any) => void),
}))

const useSortableMock = vi.hoisted(() => vi.fn())

vi.mock('@dnd-kit/react', () => ({
  DragDropProvider: ({ children, onDragStart, onDragEnd }: any) => {
    dndCallbacks.onDragStart = onDragStart
    dndCallbacks.onDragEnd = onDragEnd
    return <div data-testid="drag-drop-provider">{children}</div>
  },
  DragOverlay: ({ children }: any) => (
    <div data-testid="drag-overlay">{children}</div>
  ),
}))

vi.mock('@dnd-kit/react/sortable', () => ({
  useSortable: (args: unknown) => useSortableMock(args),
}))

beforeEach(() => {
  useEditorStore.getState().resetEditor()
  useSortableMock.mockReset()
  dndCallbacks.onDragStart = null
  dndCallbacks.onDragEnd = null

  useSortableMock.mockImplementation(() => ({
    ref: vi.fn(),
    handleRef: vi.fn(),
    isDragging: false,
    isDropTarget: false,
  }))
})

afterEach(() => {
  cleanup()
})

describe('LayerPanel', () => {
  it('wires sortable ids and reorders from top to bottom through the Zustand store', async () => {
    const store = useEditorStore.getState()
    const bottomAsciiLayerId = store.activeLayerId

    if (!bottomAsciiLayerId) {
      throw new Error('Expected an initial active layer')
    }

    const imageLayerId = store.addImageLayer({} as HTMLImageElement, {
      name: 'REFERENCE',
    })
    const topAsciiLayerId = store.addAsciiLayer('OVERLAY')

    render(<LayerPanel />)

    expect(useSortableMock).toHaveBeenCalledWith({
      id: topAsciiLayerId,
      index: 0,
    })
    expect(useSortableMock).toHaveBeenCalledWith({
      id: imageLayerId,
      index: 1,
    })
    expect(useSortableMock).toHaveBeenCalledWith({
      id: bottomAsciiLayerId,
      index: 2,
    })

    expect(screen.getByLabelText('Drag OVERLAY to reorder')).not.toBeNull()
    expect(screen.getByLabelText('Drag REFERENCE to reorder')).not.toBeNull()
    expect(screen.getByLabelText('Drag INK 01 to reorder')).not.toBeNull()

    dndCallbacks.onDragStart?.({
      operation: { source: { id: topAsciiLayerId } },
    })

    await waitFor(() => {
      expect(screen.getByTestId('drag-overlay').textContent).toContain(
        'TXT / OVERLAY',
      )
    })

    dndCallbacks.onDragEnd?.({
      canceled: false,
      operation: {
        source: { id: topAsciiLayerId },
        target: { id: bottomAsciiLayerId },
      },
    })

    expect(useEditorStore.getState().layers.map((layer) => layer.id)).toEqual([
      topAsciiLayerId,
      bottomAsciiLayerId,
      imageLayerId,
    ])
  })
})
