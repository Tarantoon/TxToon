import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { getGridMetrics, interpolateGridPoints } from '../lib/canvasGrid'
import {
  renderCanvasFrame,
  type ViewportSize,
} from '../lib/renderCanvasFrame'
import { useEditorStore } from '../store/editorStore'
import type { Point } from '../types/editor'

export function CanvasEditor() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastPointRef = useRef<Point | null>(null)
  const activePointerIdRef = useRef<number | null>(null)
  const [viewport, setViewport] = useState<ViewportSize>({ width: 1, height: 1 })
  const layers = useEditorStore((state) => state.layers)
  const activeLayerId = useEditorStore((state) => state.activeLayerId)
  const granularity = useEditorStore((state) => state.granularity)
  const showGrid = useEditorStore((state) => state.showGrid)
  const gridSize = useEditorStore((state) => state.gridSize)
  const setGridSize = useEditorStore((state) => state.setGridSize)
  const paintCells = useEditorStore((state) => state.paintCells)
  const activeLayer = layers.find((layer) => layer.id === activeLayerId)
  const metrics = getGridMetrics(granularity)
  const renderStateRef = useRef({ layers, gridSize, showGrid, metrics, viewport })

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

  useEffect(() => {
    setGridSize({
      columns: Math.max(1, Math.floor(viewport.width / metrics.cellWidth)),
      rows: Math.max(1, Math.floor(viewport.height / metrics.cellHeight)),
    })
  }, [metrics.cellHeight, metrics.cellWidth, setGridSize, viewport])

  useLayoutEffect(() => {
    renderStateRef.current = { layers, gridSize, showGrid, metrics, viewport }
  }, [gridSize, layers, metrics, showGrid, viewport])

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
      })

      frameId = window.requestAnimationFrame(renderFrame)
    }

    frameId = window.requestAnimationFrame(renderFrame)
    return () => window.cancelAnimationFrame(frameId)
  }, [])

  const getPointerGridPoint = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ): Point | null => {
    const bounds = event.currentTarget.getBoundingClientRect()
    if (bounds.width <= 0 || bounds.height <= 0) {
      return null
    }

    const canvasX = ((event.clientX - bounds.left) / bounds.width) * viewport.width
    const canvasY = ((event.clientY - bounds.top) / bounds.height) * viewport.height
    const point = {
      x: Math.floor(canvasX / metrics.cellWidth),
      y: Math.floor(canvasY / metrics.cellHeight),
    }

    if (
      point.x < 0 ||
      point.y < 0 ||
      point.x >= gridSize.columns ||
      point.y >= gridSize.rows
    ) {
      return null
    }

    return point
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activeLayer?.type !== 'ascii' || event.button !== 0) {
      return
    }

    const point = getPointerGridPoint(event)
    if (!point) {
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    activePointerIdRef.current = event.pointerId
    lastPointRef.current = point
    paintCells([point])
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== event.pointerId || !lastPointRef.current) {
      return
    }

    const point = getPointerGridPoint(event)
    if (!point) {
      return
    }

    event.preventDefault()
    if (
      point.x === lastPointRef.current.x &&
      point.y === lastPointRef.current.y
    ) {
      return
    }

    paintCells(interpolateGridPoints(lastPointRef.current, point))
    lastPointRef.current = point
  }

  const stopDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    activePointerIdRef.current = null
    lastPointRef.current = null
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col border-2 border-black bg-neutral-800 shadow-[8px_8px_0_#000]">
      <div className="screentone-dark flex h-7 shrink-0 items-center justify-between border-b-2 border-black px-2 font-mono text-[10px] font-bold tracking-[0.18em] text-white">
        <span>WORKSPACE / PAGE 01</span>
        <span>{activeLayer?.type === 'ascii' ? 'INK READY' : 'SELECT INK LAYER'}</span>
      </div>
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden bg-neutral-200 p-3 sm:p-5"
      >
        <canvas
          ref={canvasRef}
          className={`block h-full w-full border-2 border-black bg-white shadow-[6px_6px_0_rgba(0,0,0,0.35)] ${activeLayer?.type === 'ascii' ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
          aria-label="TxToon ASCII drawing canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          onLostPointerCapture={() => {
            activePointerIdRef.current = null
            lastPointRef.current = null
          }}
        />
      </div>
      <div className="flex h-7 shrink-0 items-center justify-between border-t-2 border-black bg-white px-2 font-mono text-[10px] font-bold tracking-wider">
        <span>
          {gridSize.columns} COL × {gridSize.rows} ROW
        </span>
        <span>UTF-8 / {granularity} PX</span>
      </div>
    </section>
  )
}
