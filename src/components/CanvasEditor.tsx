import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import {
  clampGridMoveOffset,
  getGridBounds,
  getGridMetrics,
  getGridPointFromScreen,
  interpolateGridPoints,
  parseGridCellKey,
} from '../lib/canvasGrid'
import { renderCanvasFrame } from '../lib/renderCanvasFrame'
import { useEditorStore } from '../store/editorStore'
import type {
  GridCellKey,
  Point,
  ViewportSize,
} from '../types/editor'

interface MarqueeSelection {
  start: Point
  end: Point
}

type CanvasInteraction =
  | { type: 'draw'; pointerId: number; lastPoint: Point }
  | { type: 'pan'; pointerId: number; lastScreenPoint: Point }
  | {
      type: 'marquee'
      pointerId: number
      start: Point
      end: Point
    }
  | {
      type: 'move'
      pointerId: number
      start: Point
      points: Point[]
      offset: Point
    }

const getCellKey = ({ x, y }: Point): GridCellKey => `${x},${y}`

const pointsMatch = (first: Point, second: Point): boolean =>
  first.x === second.x && first.y === second.y

export function CanvasEditor() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const interactionRef = useRef<CanvasInteraction | null>(null)
  const [viewport, setViewport] = useState<ViewportSize>({ width: 1, height: 1 })
  const [selectedPoints, setSelectedPoints] = useState<Point[]>([])
  const [selectionLayerId, setSelectionLayerId] = useState<string | null>(null)
  const [marquee, setMarquee] = useState<MarqueeSelection | null>(null)
  const [moveOffset, setMoveOffset] = useState<Point>({ x: 0, y: 0 })
  const layers = useEditorStore((state) => state.layers)
  const activeLayerId = useEditorStore((state) => state.activeLayerId)
  const showGrid = useEditorStore((state) => state.showGrid)
  const gridSize = useEditorStore((state) => state.gridSize)
  const camera = useEditorStore((state) => state.camera)
  const paintCells = useEditorStore((state) => state.paintCells)
  const moveCells = useEditorStore((state) => state.moveCells)
  const setCameraZoom = useEditorStore((state) => state.setCameraZoom)
  const panCamera = useEditorStore((state) => state.panCamera)
  const resetCamera = useEditorStore((state) => state.resetCamera)
  const activeLayer = layers.find((layer) => layer.id === activeLayerId)
  const metrics = getGridMetrics(gridSize, viewport)
  const activeSelectedPoints =
    selectionLayerId === activeLayerId
      ? selectedPoints.filter(
          (point) =>
            point.x < gridSize.columns && point.y < gridSize.rows,
        )
      : []
  const selectionCells =
    activeLayer?.type === 'ascii'
      ? activeSelectedPoints.flatMap((point) => {
          const character = activeLayer.cells[getCellKey(point)]
          return character ? [{ point, character }] : []
        })
      : []
  const selection = { cells: selectionCells, moveOffset, marquee }
  const renderStateRef = useRef({
    layers,
    gridSize,
    showGrid,
    metrics,
    viewport,
    camera,
    selection,
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const updateViewport = () => {
      const bounds = container.getBoundingClientRect()
      const width = Math.max(1, Math.floor(bounds.width))
      const height = Math.max(1, Math.floor(bounds.height))
      setViewport((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      )
    }

    updateViewport()
    const resizeObserver = new ResizeObserver(updateViewport)
    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [])

  useLayoutEffect(() => {
    renderStateRef.current = {
      layers,
      gridSize,
      showGrid,
      metrics,
      viewport,
      camera,
      selection,
    }
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.max(1, Math.floor(viewport.width * pixelRatio))
    canvas.height = Math.max(1, Math.floor(viewport.height * pixelRatio))
  }, [viewport])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    let frameId = 0
    const renderFrame = () => {
      const current = renderStateRef.current
      renderCanvasFrame({
        context,
        layersBottomToTop: current.layers,
        gridSize: current.gridSize,
        viewport: current.viewport,
        metrics: current.metrics,
        showGrid: current.showGrid,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        camera: current.camera,
        selection: current.selection,
      })

      frameId = window.requestAnimationFrame(renderFrame)
    }

    frameId = window.requestAnimationFrame(renderFrame)
    return () => window.cancelAnimationFrame(frameId)
  }, [])

  const getScreenPoint = (
    event:
      | ReactPointerEvent<HTMLCanvasElement>
      | ReactWheelEvent<HTMLCanvasElement>,
  ): Point | null => {
    const bounds = event.currentTarget.getBoundingClientRect()
    if (bounds.width <= 0 || bounds.height <= 0) {
      return null
    }

    return {
      x: ((event.clientX - bounds.left) / bounds.width) * viewport.width,
      y: ((event.clientY - bounds.top) / bounds.height) * viewport.height,
    }
  }

  const getPointerGridPoint = (
    event: ReactPointerEvent<HTMLCanvasElement>,
    shouldClamp = false,
  ): Point | null => {
    const screenPoint = getScreenPoint(event)
    return screenPoint
      ? getGridPointFromScreen(
          screenPoint,
          camera,
          metrics,
          gridSize,
          shouldClamp,
        )
      : null
  }

  const capturePointer = (
    event: ReactPointerEvent<HTMLCanvasElement>,
    interaction: CanvasInteraction,
  ) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    interactionRef.current = interaction
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (interactionRef.current) {
      return
    }

    if (event.button === 1 || (event.button === 0 && event.altKey)) {
      const screenPoint = getScreenPoint(event)
      if (screenPoint) {
        capturePointer(event, {
          type: 'pan',
          pointerId: event.pointerId,
          lastScreenPoint: screenPoint,
        })
      }
      return
    }

    if (activeLayer?.type !== 'ascii') {
      return
    }

    const point = getPointerGridPoint(event)
    if (!point) {
      return
    }

    if (event.button === 0) {
      setSelectedPoints([])
      setSelectionLayerId(null)
      setMarquee(null)
      setMoveOffset({ x: 0, y: 0 })
      paintCells([point])
      capturePointer(event, {
        type: 'draw',
        pointerId: event.pointerId,
        lastPoint: point,
      })
      return
    }

    if (event.button !== 2) {
      return
    }

    const character = activeLayer.cells[getCellKey(point)]
    if (character) {
      const isSelected = activeSelectedPoints.some((selectedPoint) =>
        pointsMatch(selectedPoint, point),
      )
      const points = isSelected ? activeSelectedPoints : [point]
      setSelectedPoints(points)
      setSelectionLayerId(activeLayer.id)
      setMarquee(null)
      setMoveOffset({ x: 0, y: 0 })
      capturePointer(event, {
        type: 'move',
        pointerId: event.pointerId,
        start: point,
        points,
        offset: { x: 0, y: 0 },
      })
      return
    }

    const nextMarquee = { start: point, end: point }
    setSelectedPoints([])
    setSelectionLayerId(activeLayer.id)
    setMarquee(nextMarquee)
    setMoveOffset({ x: 0, y: 0 })
    capturePointer(event, {
      type: 'marquee',
      pointerId: event.pointerId,
      ...nextMarquee,
    })
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const interaction = interactionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId) {
      return
    }

    event.preventDefault()
    if (interaction.type === 'pan') {
      const screenPoint = getScreenPoint(event)
      if (!screenPoint) {
        return
      }
      panCamera({
        x: screenPoint.x - interaction.lastScreenPoint.x,
        y: screenPoint.y - interaction.lastScreenPoint.y,
      })
      interaction.lastScreenPoint = screenPoint
      return
    }

    const point = getPointerGridPoint(
      event,
      interaction.type === 'marquee' || interaction.type === 'move',
    )
    if (!point) {
      return
    }

    if (interaction.type === 'draw') {
      if (!pointsMatch(point, interaction.lastPoint)) {
        paintCells(interpolateGridPoints(interaction.lastPoint, point))
        interaction.lastPoint = point
      }
      return
    }

    if (interaction.type === 'marquee') {
      interaction.end = point
      setMarquee({ start: interaction.start, end: point })
      return
    }

    const offset = clampGridMoveOffset(
      interaction.points,
      {
        x: point.x - interaction.start.x,
        y: point.y - interaction.start.y,
      },
      gridSize,
    )
    interaction.offset = offset
    setMoveOffset(offset)
  }

  const finishInteraction = (
    event: ReactPointerEvent<HTMLCanvasElement>,
    shouldCommit: boolean,
  ) => {
    const interaction = interactionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId) {
      return
    }

    if (shouldCommit && interaction.type === 'marquee') {
      const bounds = getGridBounds(interaction.start, interaction.end)
      const points =
        activeLayer?.type === 'ascii'
          ? Object.keys(activeLayer.cells)
              .map((key) => parseGridCellKey(key as GridCellKey))
              .filter(
                (point) =>
                  point.x >= bounds.minX &&
                  point.x <= bounds.maxX &&
                  point.y >= bounds.minY &&
                  point.y <= bounds.maxY &&
                  point.x < gridSize.columns &&
                  point.y < gridSize.rows,
              )
          : []
      setSelectedPoints(points)
      setSelectionLayerId(activeLayer?.id ?? null)
    }

    if (shouldCommit && interaction.type === 'move') {
      moveCells(interaction.points, interaction.offset)
      if (interaction.offset.x !== 0 || interaction.offset.y !== 0) {
        setSelectedPoints(
          interaction.points.map((point) => ({
            x: point.x + interaction.offset.x,
            y: point.y + interaction.offset.y,
          })),
        )
        setSelectionLayerId(activeLayer?.id ?? null)
      }
    }

    setMarquee(null)
    setMoveOffset({ x: 0, y: 0 })
    interactionRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    const anchor = getScreenPoint(event)
    if (!anchor) {
      return
    }

    event.preventDefault()
    setCameraZoom(camera.zoom * Math.exp(-event.deltaY * 0.0015), anchor)
  }

  const zoomAtCenter = (factor: number) => {
    setCameraZoom(camera.zoom * factor, {
      x: viewport.width / 2,
      y: viewport.height / 2,
    })
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col border-2 border-black bg-neutral-800 shadow-[8px_8px_0_#000]">
      <div className="screentone-dark flex h-9 shrink-0 items-center justify-between border-b-2 border-black px-2 font-mono text-[9px] font-bold tracking-[0.12em] text-white">
        <span>WORKSPACE / PAGE 01</span>
        <div className="flex items-center border border-white">
          <button type="button" onClick={() => zoomAtCenter(0.8)} className="h-6 w-7 border-r border-white hover:bg-white hover:text-black" aria-label="Zoom out">
            −
          </button>
          <span className="w-12 text-center">{Math.round(camera.zoom * 100)}%</span>
          <button type="button" onClick={() => zoomAtCenter(1.25)} className="h-6 w-7 border-l border-white hover:bg-white hover:text-black" aria-label="Zoom in">
            +
          </button>
          <button type="button" onClick={resetCamera} className="h-6 border-l border-white px-2 hover:bg-white hover:text-black">
            RESET
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden bg-neutral-300 p-3 sm:p-5"
      >
        <canvas
          ref={canvasRef}
          className={`block h-full w-full border-2 border-black bg-neutral-300 shadow-[6px_6px_0_rgba(0,0,0,0.35)] ${activeLayer?.type === 'ascii' ? 'cursor-crosshair' : 'cursor-grab'}`}
          aria-label="TxToon ASCII drawing canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => finishInteraction(event, true)}
          onPointerCancel={(event) => finishInteraction(event, false)}
          onLostPointerCapture={(event) => {
            if (interactionRef.current?.pointerId === event.pointerId) {
              interactionRef.current = null
              setMarquee(null)
              setMoveOffset({ x: 0, y: 0 })
            }
          }}
          onContextMenu={(event) => event.preventDefault()}
          onAuxClick={(event) => event.preventDefault()}
          onWheel={handleWheel}
        />
      </div>
      <div className="flex h-8 shrink-0 items-center justify-between gap-3 overflow-hidden border-t-2 border-black bg-white px-2 font-mono text-[9px] font-bold tracking-wider">
        <span className="shrink-0">
          {gridSize.columns} COL × {gridSize.rows} ROW
        </span>
        <span className="hidden truncate text-neutral-500 xl:inline">
          LEFT: DRAW / RIGHT: SELECT + MOVE / MIDDLE OR ALT: PAN / WHEEL: ZOOM
        </span>
        <span className="shrink-0">{activeSelectedPoints.length} SELECTED</span>
      </div>
    </section>
  )
}
