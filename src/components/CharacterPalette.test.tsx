import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CharacterPalette } from './CharacterPalette'
import { useEditorStore } from '../store/editorStore'

beforeEach(() => {
  useEditorStore.getState().resetEditor()
})

afterEach(() => {
  cleanup()
})

describe('CharacterPalette', () => {
  it('updates grid size through inputs and step controls without mutating existing layers', () => {
    const store = useEditorStore.getState()
    const baseAsciiLayerId = store.activeLayerId

    if (!baseAsciiLayerId) {
      throw new Error('Expected an initial active layer')
    }

    store.setGridSize({ columns: 4, rows: 3 })
    store.paintCells(
      [
        { x: 0, y: 0 },
        { x: 3, y: 2 },
      ],
      '#',
    )

    const imageLayerId = store.addImageLayer({} as HTMLImageElement, {
      name: 'REFERENCE',
    })

    const asciiLayer = useEditorStore
      .getState()
      .layers.find((layer) => layer.id === baseAsciiLayerId)

    const imageLayer = useEditorStore
      .getState()
      .layers.find((layer) => layer.id === imageLayerId)

    if (!asciiLayer || asciiLayer.type !== 'ascii' || !imageLayer) {
      throw new Error('Expected seeded layers')
    }

    const preservedCells = asciiLayer.cells
    const preservedImageLayer = imageLayer

    render(<CharacterPalette />)

    fireEvent.change(screen.getByLabelText('COLUMNS count'), {
      target: { value: '6' },
    })
    fireEvent.click(screen.getByLabelText('Add one rows'))
    fireEvent.click(screen.getByLabelText('Remove one columns'))

    expect(useEditorStore.getState().gridSize).toEqual({ columns: 5, rows: 4 })
    const currentAsciiLayer = useEditorStore
      .getState()
      .layers.find((layer) => layer.id === baseAsciiLayerId)

    expect(currentAsciiLayer?.type).toBe('ascii')
    expect(currentAsciiLayer?.type === 'ascii' ? currentAsciiLayer.cells : null).toBe(
      preservedCells,
    )
    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === imageLayerId),
    ).toBe(preservedImageLayer)
    expect(preservedCells).toEqual({
      '0,0': '#',
      '3,2': '#',
    })
  })

  it('toggles nullable glyph selection, keeps eraser independent, and clears to PAN mode', () => {
    render(<CharacterPalette />)

    const hashButton = screen.getByRole('button', { name: 'Use #' }) as HTMLButtonElement
    const eraserButton = screen.getByRole('button', { name: 'Eraser' }) as HTMLButtonElement
    const selectedGlyphInput = screen.getByLabelText('Selected drawing character') as HTMLInputElement

    expect(hashButton.getAttribute('aria-pressed')).toBe('true')
    expect(hashButton.className).toContain('bg-black')
    expect(hashButton.className).toContain('text-white')

    fireEvent.click(hashButton)
    expect(useEditorStore.getState().selectedCharacter).toBeNull()
    expect(hashButton.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(hashButton)
    expect(useEditorStore.getState().selectedCharacter).toBe('#')
    expect(hashButton.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(eraserButton)
    expect(useEditorStore.getState().selectedCharacter).toBe(' ')
    expect(eraserButton.getAttribute('aria-pressed')).toBe('true')
    expect(eraserButton.className).toContain('bg-black')
    expect(eraserButton.className).toContain('text-white')

    fireEvent.click(eraserButton)
    expect(useEditorStore.getState().selectedCharacter).toBeNull()
    expect(eraserButton.getAttribute('aria-pressed')).toBe('false')

    fireEvent.change(selectedGlyphInput, { target: { value: '' } })
    expect(useEditorStore.getState().selectedCharacter).toBeNull()
    expect(selectedGlyphInput.value).toBe('')
    expect(selectedGlyphInput.placeholder).toBe('PAN')
  })
})
