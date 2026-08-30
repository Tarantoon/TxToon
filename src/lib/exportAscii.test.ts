import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  compileAsciiText,
  downloadAsciiText,
  getProjectFileName,
} from './exportAscii'
import type { EditorLayer } from '../types/editor'

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

const createImageLayer = (id: string, cells: Record<string, string>): EditorLayer =>
  ({
    id,
    type: 'image',
    name: id,
    visible: true,
    image: {} as HTMLImageElement,
    position: { x: 0, y: 0 },
    scale: { x: 1, y: 1 },
    opacity: 0.5,
    cells,
  } as EditorLayer)

describe('compileAsciiText', () => {
  it('renders a fixed grid and uses the topmost visible ASCII cell at each position', () => {
    const layers: EditorLayer[] = [
      createAsciiLayer('bottom', {
        '0,0': 'A',
        '1,1': 'B',
      }),
      createImageLayer('reference', {
        '0,0': 'I',
        '3,0': 'J',
      }),
      createAsciiLayer(
        'hidden',
        {
          '0,0': 'H',
          '2,0': 'Z',
        },
        false,
      ),
      createAsciiLayer('middle', {
        '0,0': 'M',
        '2,1': 'N',
      }),
      createAsciiLayer('top', {
        '0,0': 'T',
        '1,0': 'X',
        '2,1': ' ',
      }),
    ]

    expect(compileAsciiText(layers, { columns: 4, rows: 3 })).toBe(
      'TX  \n BN \n    ',
    )
  })
})

describe('downloadAsciiText', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('creates a UTF-8 text Blob, normalizes the .txt extension, and cleans up the download link', () => {
    const createObjectURL = vi.fn(() => 'blob:download-url')
    const revokeObjectURL = vi.fn()
    const append = vi.fn()
    const click = vi.fn()
    const remove = vi.fn()
    const createdLinks: Array<{
      href: string
      download: string
      style: { display?: string }
      click: () => void
      remove: () => void
    }> = []
    const createdBlobs: { parts: BlobPart[]; options?: BlobPropertyBag }[] = []

    class MockBlob {
      constructor(parts: BlobPart[], options?: BlobPropertyBag) {
        createdBlobs.push({ parts, options })
      }
    }

    vi.stubGlobal('Blob', MockBlob)
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    } as unknown as typeof URL)
    vi.stubGlobal('document', {
      body: { append },
      createElement: () => {
        const link = {
          href: '',
          download: '',
          style: {},
          click,
          remove,
        }
        createdLinks.push(link)
        return link
      },
    } as unknown as typeof document)

    downloadAsciiText('hello', 'export')
    downloadAsciiText('world', 'CON')

    expect(createdBlobs).toEqual([
      { parts: ['hello'], options: { type: 'text/plain;charset=utf-8' } },
      { parts: ['world'], options: { type: 'text/plain;charset=utf-8' } },
    ])
    expect(createObjectURL).toHaveBeenCalledTimes(2)
    expect(append).toHaveBeenCalledTimes(2)
    expect(click).toHaveBeenCalledTimes(2)
    expect(remove).toHaveBeenCalledTimes(2)
    expect(revokeObjectURL).toHaveBeenCalledTimes(2)
    expect(revokeObjectURL).toHaveBeenNthCalledWith(1, 'blob:download-url')
    expect(revokeObjectURL).toHaveBeenNthCalledWith(2, 'blob:download-url')

    const link = append.mock.calls[0][0] as {
      href: string
      download: string
      style: { display?: string }
    }

    expect(createdLinks[1].download).toBe('CON-.txt')
    expect(link.href).toBe('blob:download-url')
    expect(link.download).toBe('export.txt')
    expect(link.style.display).toBe('none')
  })
})

describe('getProjectFileName', () => {
  it('sanitizes invalid characters, trims existing extensions, and falls back to Untitled', () => {
    expect(getProjectFileName('  My:Project?.TXT  ')).toBe('My-Project-.txt')
    expect(getProjectFileName(' report.txt ')).toBe('report.txt')
    expect(getProjectFileName('   ')).toBe('Untitled.txt')
    expect(getProjectFileName('Ends with dot. ')).toBe('Ends with dot.txt')
    expect(getProjectFileName('CON')).toBe('CON-.txt')
    expect(getProjectFileName('com1.txt')).toBe('com1-.txt')
  })
})
