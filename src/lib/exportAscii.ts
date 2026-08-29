import type { AsciiLayer, EditorLayer, GridSize } from '../types/editor'

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
  const safeFileName = fileName.toLowerCase().endsWith('.txt')
    ? fileName
    : `${fileName}.txt`
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const downloadUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = downloadUrl
  link.download = safeFileName
  link.style.display = 'none'
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(downloadUrl)
}
