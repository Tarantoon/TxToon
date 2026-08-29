import { create } from 'zustand'
import type {
  AsciiLayer,
  EditorLayer,
  EditorState,
  EditorStore,
  GridCellKey,
  GridSize,
  ImageLayer,
  ImageLayerOptions,
  LayerId,
  Point,
} from '../types/editor'

export const GRANULARITY_MIN = 10
export const GRANULARITY_MAX = 32
export const DEFAULT_GRANULARITY = 18
export const DEFAULT_GRID_SIZE: GridSize = { columns: 80, rows: 32 }

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
  columns: Number.isFinite(columns) ? Math.max(1, Math.floor(columns)) : 1,
  rows: Number.isFinite(rows) ? Math.max(1, Math.floor(rows)) : 1,
})

const createInitialState = (): EditorState => {
  const initialLayer = createAsciiLayer('INK 01')

  return {
    layers: [initialLayer],
    activeLayerId: initialLayer.id,
    selectedCharacter: '#',
    granularity: DEFAULT_GRANULARITY,
    showGrid: true,
    gridSize: { ...DEFAULT_GRID_SIZE },
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

  setSelectedCharacter: (value) => {
    const selectedCharacter = normalizeCharacter(value)
    set((state) =>
      selectedCharacter && state.selectedCharacter !== selectedCharacter
        ? { selectedCharacter }
        : state,
    )
  },

  setGranularity: (granularity) => {
    if (Number.isFinite(granularity)) {
      set({
        granularity: clamp(
          Math.round(granularity),
          GRANULARITY_MIN,
          GRANULARITY_MAX,
        ),
      })
    }
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

        const key = `${point.x},${point.y}` as GridCellKey
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

  resetEditor: () => set(createInitialState()),
}))
