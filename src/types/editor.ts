export type LayerId = string
export type GridCellKey = `${number},${number}`
export type SparseCharacterMatrix = Record<GridCellKey, string>

export interface Point {
  x: number
  y: number
}

export interface Scale {
  x: number
  y: number
}

export interface GridSize {
  columns: number
  rows: number
}

export interface ViewportSize {
  width: number
  height: number
}

export interface CameraState {
  zoom: number
  pan: Point
}

export interface GridResizeDelta {
  columns?: number
  rows?: number
}

export interface BaseLayer {
  id: LayerId
  name: string
  visible: boolean
}

export interface ImageLayer extends BaseLayer {
  type: 'image'
  image: HTMLImageElement
  position: Point
  scale: Scale
  opacity: number
}

export interface AsciiLayer extends BaseLayer {
  type: 'ascii'
  cells: SparseCharacterMatrix
}

export type EditorLayer = ImageLayer | AsciiLayer

export interface ImageLayerOptions {
  name?: string
  position?: Point
  scale?: Scale
  opacity?: number
}

export type LayerDirection = 'up' | 'down'

export interface EditorState {
  layers: EditorLayer[]
  activeLayerId: LayerId | null
  projectName: string
  selectedCharacter: string
  showGrid: boolean
  gridSize: GridSize
  camera: CameraState
}

export interface EditorActions {
  addAsciiLayer: (name?: string) => LayerId
  addImageLayer: (
    image: HTMLImageElement,
    options?: ImageLayerOptions,
  ) => LayerId
  removeLayer: (layerId: LayerId) => void
  setActiveLayer: (layerId: LayerId) => void
  setLayerVisibility: (layerId: LayerId, visible: boolean) => void
  setImageLayerOpacity: (layerId: LayerId, opacity: number) => void
  setImageLayerTransform: (
    layerId: LayerId,
    position: Point,
    scale: Scale,
  ) => void
  moveLayer: (layerId: LayerId, direction: LayerDirection) => void
  reorderLayer: (layerId: LayerId, targetLayerId: LayerId) => void
  setProjectName: (projectName: string) => void
  setSelectedCharacter: (character: string) => void
  setShowGrid: (showGrid: boolean) => void
  setGridSize: (gridSize: GridSize) => void
  resizeGrid: (delta: GridResizeDelta) => void
  paintCells: (points: Point[], character?: string) => void
  moveCells: (points: Point[], offset: Point) => void
  setCameraZoom: (zoom: number, anchor: Point) => void
  panCamera: (delta: Point) => void
  resetCamera: () => void
  resetEditor: () => void
}

export type EditorStore = EditorState & EditorActions
