import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LayerPanel } from './LayerPanel'
import { useEditorStore } from '../store/editorStore'

const createDataTransfer = () => {
  const store = new Map<string, string>()

  return {
    effectAllowed: 'all',
    dropEffect: 'none',
    setData: (type: string, value: string) => {
      store.set(type, value)
    },
    getData: (type: string) => store.get(type) ?? '',
  } as DataTransfer
}

beforeEach(() => {
  useEditorStore.getState().resetEditor()
})

afterEach(() => {
  cleanup()
})

describe('LayerPanel', () => {
  it('uses native drag and drop to reorder mixed layers in bottom-to-top store order', () => {
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

    const dragHandle = screen.getByLabelText('Drag OVERLAY to reorder')
    const dropTarget = screen.getByText('INK 01').closest('div')?.parentElement

    if (!dropTarget) {
      throw new Error('Expected a drop target')
    }

    const dataTransfer = createDataTransfer()

    fireEvent.dragStart(dragHandle, { dataTransfer })
    fireEvent.dragOver(dropTarget, { dataTransfer })
    fireEvent.drop(dropTarget, { dataTransfer })

    expect(useEditorStore.getState().layers.map((layer) => layer.id)).toEqual([
      topAsciiLayerId,
      bottomAsciiLayerId,
      imageLayerId,
    ])
  })
})
