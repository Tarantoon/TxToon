import type { AsciiLayer, EditorLayer, GridSize } from '../types/editor'

const MAX_FILE_NAME_LENGTH = 80

const RESERVED_WINDOWS_FILE_NAME_PATTERN =
  /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

const sanitizeProjectBaseName = (projectName: string): string => {
  const baseName = projectName
    .trim()
    .replace(/\.txt$/i, '')
    .replace(/[<>:"/\\|?*]/g, '-')
    .split('')
    .map((character) => (character.charCodeAt(0) < 32 ? '-' : character))
    .join('')
    .replace(/[. ]+$/g, '')
    .slice(0, MAX_FILE_NAME_LENGTH)
    .replace(/[. ]+$/g, '')

  if (!baseName) {
    return 'Untitled'
  }

  return RESERVED_WINDOWS_FILE_NAME_PATTERN.test(baseName)
    ? `${baseName}-`
    : baseName
}

export const compileAsciiText = (
  layersBottomToTop: EditorLayer[],
  gridSize: GridSize,
): string => {
  const visibleAsciiLayers = layersBottomToTop.filter(
    (layer): layer is AsciiLayer => layer.type === 'ascii' && layer.visible,
  )
  const rows: string[] = []

  for (let y = 0; y < gridSize.rows; y += 1) {
    let row = ''

    for (let x = 0; x < gridSize.columns; x += 1) {
      let character = ' '

      for (let index = visibleAsciiLayers.length - 1; index >= 0; index -= 1) {
        const candidate = visibleAsciiLayers[index].cells[`${x},${y}`]
        if (candidate && candidate !== ' ') {
          character = candidate
          break
        }
      }

      row += character
    }

    rows.push(row)
  }

  return rows.join('\n')
}

export const downloadAsciiText = (
  content: string,
  fileName = 'txtoon-export.txt',
): void => {
  const safeFileName = `${sanitizeProjectBaseName(fileName)}.txt`
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const downloadUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = downloadUrl
  link.download = safeFileName
  link.style.display = 'none'
  try {
    document.body.append(link)
    link.click()
  } finally {
    link.remove()
    URL.revokeObjectURL(downloadUrl)
  }
}

export const getProjectFileName = (projectName: string): string => {
  return `${sanitizeProjectBaseName(projectName)}.txt`
}
