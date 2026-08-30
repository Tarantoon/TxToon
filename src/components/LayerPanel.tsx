import { useState, type ChangeEvent, type DragEvent } from 'react'
import { useEditorStore } from '../store/editorStore'

export function LayerPanel() {
  const [uploadError, setUploadError] = useState('')
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null)
  const [dragTargetLayerId, setDragTargetLayerId] = useState<string | null>(null)
  const layers = useEditorStore((state) => state.layers)
  const activeLayerId = useEditorStore((state) => state.activeLayerId)
  const addAsciiLayer = useEditorStore((state) => state.addAsciiLayer)
  const addImageLayer = useEditorStore((state) => state.addImageLayer)
  const removeLayer = useEditorStore((state) => state.removeLayer)
  const setActiveLayer = useEditorStore((state) => state.setActiveLayer)
  const setLayerVisibility = useEditorStore(
    (state) => state.setLayerVisibility,
  )
  const setImageLayerOpacity = useEditorStore(
    (state) => state.setImageLayerOpacity,
  )
  const moveLayer = useEditorStore((state) => state.moveLayer)
  const reorderLayer = useEditorStore((state) => state.reorderLayer)

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }
    if (!file.type.startsWith('image/')) {
      setUploadError('IMAGE FILES ONLY')
      return
    }

    const source = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      addImageLayer(image, {
        name: file.name.replace(/\.[^.]+$/, '').toUpperCase(),
      })
      URL.revokeObjectURL(source)
      setUploadError('')
    }
    image.onerror = () => {
      URL.revokeObjectURL(source)
      setUploadError('COULD NOT LOAD IMAGE')
    }
    image.src = source
  }

  const handleDragStart = (
    event: DragEvent<HTMLSpanElement>,
    layerId: string,
  ) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', layerId)
    setDraggedLayerId(layerId)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>, targetLayerId: string) => {
    event.preventDefault()
    const sourceLayerId =
      draggedLayerId || event.dataTransfer.getData('text/plain')
    if (sourceLayerId) {
      reorderLayer(sourceLayerId, targetLayerId)
    }
    setDraggedLayerId(null)
    setDragTargetLayerId(null)
  }

  return (
    <aside className="screentone flex min-h-0 flex-col border-2 border-black bg-neutral-100 lg:border-l-0">
      <div className="flex items-center justify-between border-b-2 border-black bg-black px-3 py-2 font-mono text-[11px] font-black tracking-[0.22em] text-white">
        <span>LAYERS</span>
        <span>{layers.length.toString().padStart(2, '0')}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 border-b-2 border-black bg-white p-2">
        <button
          type="button"
          onClick={() =>
            addAsciiLayer(`INK ${String(layers.length + 1).padStart(2, '0')}`)
          }
          className="border-2 border-black bg-white px-2 py-2 font-mono text-[10px] font-black tracking-wider hover:bg-neutral-200"
        >
          + INK
        </button>
        <label className="cursor-pointer border-2 border-black bg-white px-2 py-2 text-center font-mono text-[10px] font-black tracking-wider hover:bg-neutral-200">
          + IMAGE
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="sr-only"
          />
        </label>
      </div>
      {uploadError && (
        <p
          role="alert"
          className="border-b-2 border-black bg-white px-2 py-1 font-mono text-[9px] font-black"
        >
          {uploadError}
        </p>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-200 p-2">
        <div className="flex flex-col gap-2">
          {[...layers].reverse().map((layer) => (
            <div
              key={layer.id}
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                setDragTargetLayerId(layer.id)
              }}
              onDragLeave={() =>
                setDragTargetLayerId((current) =>
                  current === layer.id ? null : current,
                )
              }
              onDrop={(event) => handleDrop(event, layer.id)}
              className={`border-2 border-black bg-white ${activeLayerId === layer.id ? 'shadow-[4px_4px_0_#000]' : ''} ${dragTargetLayerId === layer.id && draggedLayerId !== layer.id ? 'outline-4 outline-offset-2 outline-black' : ''}`}
            >
              <div className={`flex border-b-2 border-black font-mono ${activeLayerId === layer.id ? 'bg-black text-white' : 'bg-white'}`}>
                <span
                  draggable
                  onDragStart={(event) => handleDragStart(event, layer.id)}
                  onDragEnd={() => {
                    setDraggedLayerId(null)
                    setDragTargetLayerId(null)
                  }}
                  className="flex w-8 cursor-grab items-center justify-center border-r-2 border-black text-xs active:cursor-grabbing"
                  aria-label={`Drag ${layer.name} to reorder`}
                  title="Drag to reorder"
                >
                  ≡
                </span>
                <button
                  type="button"
                  onClick={() => setActiveLayer(layer.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left hover:bg-neutral-300 hover:text-black"
                >
                  <span className="w-8 text-[9px] font-black">
                    {layer.type === 'ascii' ? 'TXT' : 'IMG'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[10px] font-bold tracking-wider">
                    {layer.name}
                  </span>
                </button>
              </div>
              {layer.type === 'image' && (
                <label className="flex items-center gap-2 border-b-2 border-black px-2 py-1 font-mono text-[9px] font-black">
                  OPACITY
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={layer.opacity}
                    onChange={(event) =>
                      setImageLayerOpacity(layer.id, event.target.valueAsNumber)
                    }
                    className="min-w-0 flex-1 accent-black"
                  />
                </label>
              )}
              <div className="grid grid-cols-4 divide-x-2 divide-black font-mono text-[9px] font-black">
                <button
                  type="button"
                  onClick={() => setLayerVisibility(layer.id, !layer.visible)}
                  className="py-1.5 hover:bg-neutral-200"
                  aria-label={`${layer.visible ? 'Hide' : 'Show'} ${layer.name}`}
                >
                  {layer.visible ? 'ON' : 'OFF'}
                </button>
                <button
                  type="button"
                  onClick={() => moveLayer(layer.id, 'up')}
                  className="py-1.5 hover:bg-neutral-200"
                  aria-label={`Move ${layer.name} up`}
                >
                  UP
                </button>
                <button
                  type="button"
                  onClick={() => moveLayer(layer.id, 'down')}
                  className="py-1.5 hover:bg-neutral-200"
                  aria-label={`Move ${layer.name} down`}
                >
                  DN
                </button>
                <button
                  type="button"
                  onClick={() => removeLayer(layer.id)}
                  className="py-1.5 hover:bg-neutral-200"
                  aria-label={`Delete ${layer.name}`}
                >
                  DEL
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t-2 border-black bg-white px-3 py-2 font-mono text-[9px] font-bold leading-relaxed tracking-wider">
        DRAG HANDLE TO REORDER<br />TOP COMPOSITES LAST
      </div>
    </aside>
  )
}
