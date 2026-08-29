import { useState, type ChangeEvent } from 'react'
import { useEditorStore } from '../store/editorStore'

export function LayerPanel() {
  const [uploadError, setUploadError] = useState('')
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
      const fitScale = Math.min(
        1,
        960 / image.naturalWidth,
        640 / image.naturalHeight,
      )
      addImageLayer(image, {
        name: file.name.replace(/\.[^.]+$/, '').toUpperCase(),
        scale: { x: fitScale, y: fitScale },
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
              className={`border-2 border-black bg-white ${activeLayerId === layer.id ? 'shadow-[4px_4px_0_#000]' : ''}`}
            >
              <button
                type="button"
                onClick={() => setActiveLayer(layer.id)}
                className={`flex w-full items-center gap-2 border-b-2 border-black px-2 py-2 text-left font-mono ${activeLayerId === layer.id ? 'bg-black text-white' : 'bg-white hover:bg-neutral-100'}`}
              >
                <span className="w-8 text-[9px] font-black">
                  {layer.type === 'ascii' ? 'TXT' : 'IMG'}
                </span>
                <span className="min-w-0 flex-1 truncate text-[10px] font-bold tracking-wider">
                  {layer.name}
                </span>
              </button>
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
        STACK ORDER<br />TOP COMPOSITES LAST
      </div>
    </aside>
  )
}
