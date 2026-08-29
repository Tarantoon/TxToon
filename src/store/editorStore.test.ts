import { beforeEach, describe, expect, it } from 'vitest'
import { compileAsciiText } from '../lib/exportAscii'
import { useEditorStore } from './editorStore'

const getAsciiLayerCells = (layerId: string) => {
  const layer = useEditorStore
    .getState()
    .layers.find((candidate) => candidate.id === layerId)

  if (!layer || layer.type !== 'ascii') {
    throw new Error(`ASCII layer not found: ${layerId}`)
  }

  return layer.cells
}

beforeEach(() => {
  useEditorStore.getState().resetEditor()
})

describe('useEditorStore', () => {
  it('paints only the active ASCII layer, ignores out-of-bounds points, and erases cells with a space character', () => {
    const initialState = useEditorStore.getState()
    const initialLayerId = initialState.activeLayerId

    if (!initialLayerId) {
      throw new Error('Expected an initial active layer')
    }

    useEditorStore.getState().setGridSize({ columns: 3, rows: 2 })

    const imageLayerId = useEditorStore.getState().addImageLayer(
      {} as HTMLImageElement,
    )

    useEditorStore.getState().setActiveLayer('missing-layer')
    expect(useEditorStore.getState().activeLayerId).toBe(imageLayerId)

    useEditorStore
      .getState()
      .paintCells([
        { x: 0, y: 0 },
        { x: 2, y: 1 },
        { x: 3, y: 0 },
        { x: -1, y: 1 },
      ], '#')

    expect(getAsciiLayerCells(initialLayerId)).toEqual({})

    useEditorStore.getState().setActiveLayer(initialLayerId)

    useEditorStore
      .getState()
      .paintCells([
        { x: 0, y: 0 },
        { x: 2, y: 1 },
        { x: 3, y: 0 },
        { x: -1, y: 1 },
      ], '#')

    expect(getAsciiLayerCells(initialLayerId)).toEqual({
      '0,0': '#',
      '2,1': '#',
    })

    useEditorStore.getState().paintCells([{ x: 0, y: 0 }], ' ')

    expect(getAsciiLayerCells(initialLayerId)).toEqual({
      '2,1': '#',
    })
  })

  it('clamps granularity to the supported range and ignores non-finite input', () => {
    const store = useEditorStore.getState()

    store.setGranularity(9.2)
    expect(useEditorStore.getState().granularity).toBe(10)

    store.setGranularity(48.7)
    expect(useEditorStore.getState().granularity).toBe(32)

    store.setGranularity(Number.NaN)
    expect(useEditorStore.getState().granularity).toBe(32)
  })

  it('reorders layers and respects visibility when exporting ASCII', () => {
    const store = useEditorStore.getState()
    const bottomLayerId = store.activeLayerId

    if (!bottomLayerId) {
      throw new Error('Expected an initial active layer')
    }

    store.setGridSize({ columns: 1, rows: 1 })
    store.paintCells([{ x: 0, y: 0 }], 'A')

    const topLayerId = store.addAsciiLayer('TOP')
    store.paintCells([{ x: 0, y: 0 }], 'B')

    expect(
      compileAsciiText(useEditorStore.getState().layers, useEditorStore.getState().gridSize),
    ).toBe('B')

    store.moveLayer(bottomLayerId, 'up')

    expect(
      compileAsciiText(useEditorStore.getState().layers, useEditorStore.getState().gridSize),
    ).toBe('A')

    store.setLayerVisibility(bottomLayerId, false)

    expect(
      compileAsciiText(useEditorStore.getState().layers, useEditorStore.getState().gridSize),
    ).toBe('B')

    expect(useEditorStore.getState().layers.map((layer) => layer.id)).toEqual([
      topLayerId,
      bottomLayerId,
    ])
  })

  it('selects the nearest remaining ASCII layer when removing the active layer', () => {
    const store = useEditorStore.getState()
    const baseLayerId = store.activeLayerId

    if (!baseLayerId) {
      throw new Error('Expected an initial active layer')
    }

    const imageLayerId = store.addImageLayer({} as HTMLImageElement)
    const topLayerId = store.addAsciiLayer('OVERLAY')

    store.setActiveLayer(imageLayerId)
    store.removeLayer(imageLayerId)

    expect(useEditorStore.getState().activeLayerId).toBe(topLayerId)
    expect(useEditorStore.getState().layers.some((layer) => layer.id === imageLayerId)).toBe(
      false,
    )
    expect(useEditorStore.getState().layers.some((layer) => layer.id === baseLayerId)).toBe(
      true,
    )
  })
})
