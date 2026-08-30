import { create } from 'zustand'
import type {
  AsciiLayer,
  EditorLayer,
  EditorState,
  EditorStore,
  GridCellKey,
  GridResizeDelta,
  GridSize,
  ImageLayer,
  ImageLayerOptions,
  LayerId,
  Point,
} from '../types/editor'

export const GRID_SIZE_MIN = 1
export const GRID_SIZE_MAX = 500
export const CAMERA_ZOOM_MIN = 0.25
export const CAMERA_ZOOM_MAX = 8
export const DEFAULT_GRID_SIZE: GridSize = { columns: 120, rows: 80 }

const createLayerId = (): LayerId =>
  globalThis.crypto?.randomUUID?.() ??
  `layer-${Date.now()}-${Math.random().toString(36).slice(2)}`

const createAsciiLayer = (name: string): AsciiLayer => ({
  id: createLayerId(),
  type: 'ascii',
  name,
  visible: true,
  cells: {},
})

const clamp = (value: number, minimum: number, maximum: number): number =>
  Number.isFinite(value) ? Math.min(Math.max(value, minimum), maximum) : minimum

const normalizeScale = (value: number | undefined): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(value, 0.01)
    : 1

const normalizeCharacter = (value: string): string | null => {
  const character = Array.from(value)[0]
  if (!character || character === '\n' || character === '\r') {
    return null
  }

  return character
}

const normalizeGridSize = ({ columns, rows }: GridSize): GridSize => ({
  columns: Number.isFinite(columns)
    ? clamp(Math.floor(columns), GRID_SIZE_MIN, GRID_SIZE_MAX)
    : GRID_SIZE_MIN,
  rows: Number.isFinite(rows)
    ? clamp(Math.floor(rows), GRID_SIZE_MIN, GRID_SIZE_MAX)
    : GRID_SIZE_MIN,
})

const getCellKey = ({ x, y }: Point): GridCellKey => `${x},${y}`

const normalizeGridDelta = (delta: GridResizeDelta): Required<GridResizeDelta> => ({
  columns: Number.isFinite(delta.columns) ? Math.trunc(delta.columns ?? 0) : 0,
  rows: Number.isFinite(delta.rows) ? Math.trunc(delta.rows ?? 0) : 0,
})

const createInitialState = (): EditorState => {
  const initialLayer = createAsciiLayer('INK 01')

  return {
    layers: [initialLayer],
    activeLayerId: initialLayer.id,
    projectName: 'Untitled',
    selectedCharacter: '#',
    showGrid: true,
    gridSize: { ...DEFAULT_GRID_SIZE },
    camera: { zoom: 1, pan: { x: 0, y: 0 } },
  }
}

const findNextActiveLayer = (
  layers: EditorLayer[],
  removedLayerIndex: number,
): LayerId | null => {
  const nearbyLayer = layers[Math.min(removedLayerIndex, layers.length - 1)]
  const asciiLayer = layers.findLast((layer) => layer.type === 'ascii')
  return asciiLayer?.id ?? nearbyLayer?.id ?? null
}

const isPointInGrid = (point: Point, gridSize: GridSize): boolean =>
  Number.isInteger(point.x) &&
  Number.isInteger(point.y) &&
  point.x >= 0 &&
  point.y >= 0 &&
  point.x < gridSize.columns &&
  point.y < gridSize.rows

export const useEditorStore = create<EditorStore>()((set) => ({
  ...createInitialState(),

  addAsciiLayer: (name) => {
    const layer = createAsciiLayer(name?.trim() || 'INK LAYER')
    set((state) => ({
      layers: [...state.layers, layer],
      activeLayerId: layer.id,
    }))
    return layer.id
  },

  addImageLayer: (image, options: ImageLayerOptions = {}) => {
    const layer: ImageLayer = {
      id: createLayerId(),
      type: 'image',
      name: options.name?.trim() || 'REFERENCE',
      visible: true,
      image,
      position: options.position ?? { x: 0, y: 0 },
      scale: {
        x: normalizeScale(options.scale?.x),
        y: normalizeScale(options.scale?.y),
      },
      opacity: clamp(options.opacity ?? 0.35, 0, 1),
    }

    set((state) => ({
      layers: [...state.layers, layer],
      activeLayerId: layer.id,
    }))
    return layer.id
  },

  removeLayer: (layerId) => {
    set((state) => {
      const removedLayerIndex = state.layers.findIndex(
        (layer) => layer.id === layerId,
      )
      if (removedLayerIndex === -1) {
        return state
      }

      const layers = state.layers.filter((layer) => layer.id !== layerId)
      return {
        layers,
        activeLayerId:
          state.activeLayerId === layerId
            ? findNextActiveLayer(layers, removedLayerIndex)
            : state.activeLayerId,
      }
    })
  },

  setActiveLayer: (layerId) => {
    set((state) =>
      state.layers.some((layer) => layer.id === layerId)
        ? { activeLayerId: layerId }
        : state,
    )
  },

  setLayerVisibility: (layerId, visible) => {
    set((state) => {
      const layer = state.layers.find((candidate) => candidate.id === layerId)
      if (!layer || layer.visible === visible) {
        return state
      }

      return {
        layers: state.layers.map((candidate) =>
          candidate.id === layerId ? { ...candidate, visible } : candidate,
        ),
      }
    })
  },

  setImageLayerOpacity: (layerId, opacity) => {
    const nextOpacity = clamp(opacity, 0, 1)
    set((state) => {
      const layer = state.layers.find((candidate) => candidate.id === layerId)
      if (layer?.type !== 'image' || layer.opacity === nextOpacity) {
        return state
      }

      return {
        layers: state.layers.map((candidate) =>
          candidate.id === layerId ? { ...candidate, opacity: nextOpacity } : candidate,
        ),
      }
    })
  },

  moveLayer: (layerId, direction) => {
    set((state) => {
      const layerIndex = state.layers.findIndex((layer) => layer.id === layerId)
      const nextIndex = direction === 'up' ? layerIndex + 1 : layerIndex - 1
      if (
        layerIndex === -1 ||
        nextIndex < 0 ||
        nextIndex >= state.layers.length
      ) {
        return state
      }

      const layers = [...state.layers]
      ;[layers[layerIndex], layers[nextIndex]] = [
        layers[nextIndex],
        layers[layerIndex],
      ]
      return { layers }
    })
  },

  reorderLayer: (layerId, targetLayerId) => {
    set((state) => {
      const sourceIndex = state.layers.findIndex((layer) => layer.id === layerId)
      const targetIndex = state.layers.findIndex(
        (layer) => layer.id === targetLayerId,
      )
      if (
        sourceIndex === -1 ||
        targetIndex === -1 ||
        sourceIndex === targetIndex
      ) {
        return state
      }

      const layers = [...state.layers]
      const [layer] = layers.splice(sourceIndex, 1)
      layers.splice(targetIndex, 0, layer)
      return { layers }
    })
  },

  setProjectName: (projectName) => {
    set((state) =>
      state.projectName === projectName ? state : { projectName },
    )
  },

  setSelectedCharacter: (value) => {
    const selectedCharacter = normalizeCharacter(value)
    set((state) =>
      selectedCharacter && state.selectedCharacter !== selectedCharacter
        ? { selectedCharacter }
        : state,
    )
  },

  setShowGrid: (showGrid) =>
    set((state) => (state.showGrid === showGrid ? state : { showGrid })),

  setGridSize: (gridSize) => {
    const normalizedGridSize = normalizeGridSize(gridSize)
    set((state) =>
      state.gridSize.columns === normalizedGridSize.columns &&
      state.gridSize.rows === normalizedGridSize.rows
        ? state
        : { gridSize: normalizedGridSize },
    )
  },

  resizeGrid: (delta) => {
    const normalizedDelta = normalizeGridDelta(delta)
    if (normalizedDelta.columns === 0 && normalizedDelta.rows === 0) {
      return
    }

    set((state) => {
      const gridSize = normalizeGridSize({
        columns: state.gridSize.columns + normalizedDelta.columns,
        rows: state.gridSize.rows + normalizedDelta.rows,
      })
      return state.gridSize.columns === gridSize.columns &&
        state.gridSize.rows === gridSize.rows
        ? state
        : { gridSize }
    })
  },

  paintCells: (points, character) => {
    set((state) => {
      const activeLayer = state.layers.find(
        (layer) => layer.id === state.activeLayerId,
      )
      const paintCharacter = normalizeCharacter(
        character ?? state.selectedCharacter,
      )
      if (activeLayer?.type !== 'ascii' || !paintCharacter) {
        return state
      }

      const cells = { ...activeLayer.cells }
      let hasChanges = false

      for (const point of points) {
        if (!isPointInGrid(point, state.gridSize)) {
          continue
        }

        const key = getCellKey(point)
        if (paintCharacter === ' ') {
          if (key in cells) {
            delete cells[key]
            hasChanges = true
          }
        } else if (cells[key] !== paintCharacter) {
          cells[key] = paintCharacter
          hasChanges = true
        }
      }

      if (!hasChanges) {
        return state
      }

      return {
        layers: state.layers.map((layer) =>
          layer.id === activeLayer.id ? { ...activeLayer, cells } : layer,
        ),
      }
    })
  },

  moveCells: (points, offset) => {
    if (
      !Number.isInteger(offset.x) ||
      !Number.isInteger(offset.y) ||
      (offset.x === 0 && offset.y === 0)
    ) {
      return
    }

    set((state) => {
      const activeLayer = state.layers.find(
        (layer) => layer.id === state.activeLayerId,
      )
      if (activeLayer?.type !== 'ascii') {
        return state
      }

      const uniquePoints = [
        ...new Map(points.map((point) => [getCellKey(point), point])).values(),
      ]
      const movingCells = uniquePoints.flatMap((point) => {
        const character = activeLayer.cells[getCellKey(point)]
        return character ? [{ point, character }] : []
      })
      if (movingCells.length === 0) {
        return state
      }

      const destinations = movingCells.map(({ point }) => ({
        x: point.x + offset.x,
        y: point.y + offset.y,
      }))
      if (destinations.some((point) => !isPointInGrid(point, state.gridSize))) {
        return state
      }

      const cells = { ...activeLayer.cells }
      for (const { point } of movingCells) {
        delete cells[getCellKey(point)]
      }
      movingCells.forEach(({ character }, index) => {
        cells[getCellKey(destinations[index])] = character
      })

      return {
        layers: state.layers.map((layer) =>
          layer.id === activeLayer.id ? { ...activeLayer, cells } : layer,
        ),
      }
    })
  },

  setCameraZoom: (zoom, anchor) => {
    if (!Number.isFinite(zoom) || !Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) {
      return
    }

    set((state) => {
      const nextZoom = clamp(zoom, CAMERA_ZOOM_MIN, CAMERA_ZOOM_MAX)
      if (nextZoom === state.camera.zoom) {
        return state
      }

      const zoomRatio = nextZoom / state.camera.zoom
      return {
        camera: {
          zoom: nextZoom,
          pan: {
            x: anchor.x - (anchor.x - state.camera.pan.x) * zoomRatio,
            y: anchor.y - (anchor.y - state.camera.pan.y) * zoomRatio,
          },
        },
      }
    })
  },

  panCamera: (delta) => {
    if (!Number.isFinite(delta.x) || !Number.isFinite(delta.y)) {
      return
    }

    set((state) =>
      delta.x === 0 && delta.y === 0
        ? state
        : {
            camera: {
              ...state.camera,
              pan: {
                x: state.camera.pan.x + delta.x,
                y: state.camera.pan.y + delta.y,
              },
            },
          },
    )
  },

  resetCamera: () => {
    set((state) =>
      state.camera.zoom === 1 &&
      state.camera.pan.x === 0 &&
      state.camera.pan.y === 0
        ? state
        : { camera: { zoom: 1, pan: { x: 0, y: 0 } } },
    )
  },

  resetEditor: () => set(createInitialState()),
}))
