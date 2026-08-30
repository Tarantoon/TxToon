import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from './App'
import { useEditorStore } from './store/editorStore'

const { downloadAsciiTextMock } = vi.hoisted(() => ({
  downloadAsciiTextMock: vi.fn(),
}))

vi.mock('./components/CanvasEditor', () => ({
  CanvasEditor: () => null,
}))

vi.mock('./components/CharacterPalette', () => ({
  CharacterPalette: () => null,
}))

vi.mock('./components/LayerPanel', () => ({
  LayerPanel: () => null,
}))

vi.mock('./lib/exportAscii', async () => {
  const actual = await vi.importActual<typeof import('./lib/exportAscii')>(
    './lib/exportAscii',
  )

  return {
    ...actual,
    downloadAsciiText: downloadAsciiTextMock,
  }
})

beforeEach(() => {
  useEditorStore.getState().resetEditor()
  downloadAsciiTextMock.mockClear()
})

afterEach(() => {
  cleanup()
})

describe('App', () => {
  it('updates the project name in Zustand and exports using the sanitized filename', () => {
    useEditorStore.getState().setGridSize({ columns: 1, rows: 1 })
    useEditorStore.getState().paintCells([{ x: 0, y: 0 }], 'A')

    render(<App />)

    fireEvent.change(screen.getByLabelText('Project name'), {
      target: { value: '  My:Project?.TXT  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'TXT EXPORT' }))

    expect(useEditorStore.getState().projectName).toBe(
      '  My:Project?.TXT  ',
    )
    expect(downloadAsciiTextMock).toHaveBeenCalledWith(
      'A',
      'My-Project-.txt',
    )
  })
})
