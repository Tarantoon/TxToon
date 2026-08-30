import { beforeEach, describe, expect, it } from 'vitest'
import { compileAsciiText, getProjectFileName } from '../lib/exportAscii'
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
  it('reorders ASCII and image layers using bottom-to-top state order and respects ASCII export precedence', () => {
    const store = useEditorStore.getState()
    const bottomLayerId = store.activeLayerId

    if (!bottomLayerId) {
      throw new Error('Expected an initial active layer')
    }

    store.setGridSize({ columns: 1, rows: 1 })
    store.paintCells([{ x: 0, y: 0 }], 'A')

    const imageLayerId = store.addImageLayer({} as HTMLImageElement, {
      name: 'REFERENCE',
    })
    const topLayerId = store.addAsciiLayer('TOP')
    store.paintCells([{ x: 0, y: 0 }], 'B')

    expect(useEditorStore.getState().layers.map((layer) => layer.id)).toEqual([
      bottomLayerId,
      imageLayerId,
      topLayerId,
    ])
    expect(
      compileAsciiText(useEditorStore.getState().layers, useEditorStore.getState().gridSize),
    ).toBe('B')

    store.reorderLayer(imageLayerId, bottomLayerId)

    expect(useEditorStore.getState().layers.map((layer) => layer.id)).toEqual([
      imageLayerId,
      bottomLayerId,
      topLayerId,
    ])
    expect(
      compileAsciiText(useEditorStore.getState().layers, useEditorStore.getState().gridSize),
    ).toBe('B')

    store.reorderLayer(topLayerId, bottomLayerId)

    expect(useEditorStore.getState().layers.map((layer) => layer.id)).toEqual([
      imageLayerId,
      topLayerId,
      bottomLayerId,
    ])
    expect(
      compileAsciiText(useEditorStore.getState().layers, useEditorStore.getState().gridSize),
    ).toBe('A')
  })

  it('clamps grid size changes and preserves sparse cells outside a shrunken grid', () => {
    const store = useEditorStore.getState()
    const layerId = store.activeLayerId

    if (!layerId) {
      throw new Error('Expected an initial active layer')
    }

    store.setGridSize({ columns: 999.8, rows: 0 })

    expect(useEditorStore.getState().gridSize).toEqual({
      columns: 500,
      rows: 1,
    })

    store.setGridSize({ columns: 4.8, rows: 4.2 })
    store.paintCells([{ x: 0, y: 0 }], 'A')
    store.paintCells([{ x: 2, y: 1 }], 'C')
    store.paintCells([{ x: 3, y: 3 }], 'B')

    store.resizeGrid({ columns: -999, rows: -999 })

    expect(useEditorStore.getState().gridSize).toEqual({ columns: 1, rows: 1 })
    expect(getAsciiLayerCells(layerId)).toEqual({
      '0,0': 'A',
      '2,1': 'C',
      '3,3': 'B',
    })
    expect(
      compileAsciiText(useEditorStore.getState().layers, useEditorStore.getState().gridSize),
    ).toBe('A')

    store.resizeGrid({ columns: 3, rows: 3 })

    expect(useEditorStore.getState().gridSize).toEqual({ columns: 4, rows: 4 })
    expect(
      compileAsciiText(useEditorStore.getState().layers, useEditorStore.getState().gridSize),
    ).toBe('A   \n  C \n    \n   B')
  })

  it('moves a single cell, rejects invalid or out-of-bounds offsets, and no-ops on image layers', () => {
    const store = useEditorStore.getState()
    const asciiLayerId = store.activeLayerId

    if (!asciiLayerId) {
      throw new Error('Expected an initial active layer')
    }

    store.setGridSize({ columns: 3, rows: 2 })
    store.paintCells([{ x: 0, y: 0 }], 'A')

    store.moveCells([{ x: 0, y: 0 }], { x: 1, y: 1 })

    expect(getAsciiLayerCells(asciiLayerId)).toEqual({ '1,1': 'A' })

    store.moveCells([{ x: 1, y: 1 }], { x: 1.5, y: 0 })
    expect(getAsciiLayerCells(asciiLayerId)).toEqual({ '1,1': 'A' })

    store.moveCells([{ x: 1, y: 1 }], { x: 0, y: 0 })
    expect(getAsciiLayerCells(asciiLayerId)).toEqual({ '1,1': 'A' })

    store.moveCells([{ x: 1, y: 1 }], { x: 2, y: 0 })
    expect(getAsciiLayerCells(asciiLayerId)).toEqual({ '1,1': 'A' })
  })

  it('moves multiple cells using key translation and overwrites overlapping destinations', () => {
    const store = useEditorStore.getState()
    const asciiLayerId = store.activeLayerId

    if (!asciiLayerId) {
      throw new Error('Expected an initial active layer')
    }

    store.setGridSize({ columns: 3, rows: 2 })
    store.paintCells([{ x: 0, y: 0 }], 'A')
    store.paintCells([{ x: 1, y: 0 }], 'B')
    store.paintCells([{ x: 2, y: 0 }], 'Z')

    store.moveCells(
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
      { x: 1, y: 0 },
    )

    expect(getAsciiLayerCells(asciiLayerId)).toEqual({
      '1,0': 'A',
      '2,0': 'B',
    })
  })

  it('ignores moveCells calls when the active layer is not ASCII', () => {
    const store = useEditorStore.getState()
    const asciiLayerId = store.activeLayerId

    if (!asciiLayerId) {
      throw new Error('Expected an initial active layer')
    }

    store.paintCells([{ x: 0, y: 0 }], 'A')
    const imageLayerId = store.addImageLayer({} as HTMLImageElement)

    store.moveCells([{ x: 0, y: 0 }], { x: 1, y: 0 })

    expect(useEditorStore.getState().activeLayerId).toBe(imageLayerId)
    expect(getAsciiLayerCells(asciiLayerId)).toEqual({ '0,0': 'A' })
  })

  it('tracks projectName state and normalizes export file names', () => {
    const store = useEditorStore.getState()

    expect(store.projectName).toBe('Untitled')

    store.setProjectName('  Project: Draft?.TXT  ')

    expect(useEditorStore.getState().projectName).toBe(
      '  Project: Draft?.TXT  ',
    )
    expect(getProjectFileName(useEditorStore.getState().projectName)).toBe(
      'Project- Draft-.txt',
    )
    expect(getProjectFileName('')).toBe('Untitled.txt')
    expect(getProjectFileName('report.txt')).toBe('report.txt')
  })

  it('zooms around an anchor, clamps zoom bounds, pans, and resets the camera', () => {
    const store = useEditorStore.getState()

    store.panCamera({ x: 12, y: -8 })
    expect(useEditorStore.getState().camera.pan).toEqual({ x: 12, y: -8 })

    store.setCameraZoom(2, { x: 100, y: 50 })

    expect(useEditorStore.getState().camera).toEqual({
      zoom: 2,
      pan: { x: -76, y: -66 },
    })

    store.resetCamera()
    store.setCameraZoom(0.01, { x: 100, y: 50 })

    expect(useEditorStore.getState().camera).toEqual({
      zoom: 0.25,
      pan: { x: 75, y: 37.5 },
    })

    store.resetCamera()
    store.setCameraZoom(100, { x: 100, y: 50 })

    expect(useEditorStore.getState().camera).toEqual({
      zoom: 8,
      pan: { x: -700, y: -350 },
    })

    store.setCameraZoom(Number.POSITIVE_INFINITY, { x: 0, y: 0 })

    expect(useEditorStore.getState().camera).toEqual({
      zoom: 8,
      pan: { x: -700, y: -350 },
    })

    store.resetCamera()

    expect(useEditorStore.getState().camera).toEqual({
      zoom: 1,
      pan: { x: 0, y: 0 },
    })
  })
})
