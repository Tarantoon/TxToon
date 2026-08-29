import { CanvasEditor } from './components/CanvasEditor'
import { CharacterPalette } from './components/CharacterPalette'
import { LayerPanel } from './components/LayerPanel'
import { compileAsciiText, downloadAsciiText } from './lib/exportAscii'
import { useEditorStore } from './store/editorStore'

function App() {
  const layers = useEditorStore((state) => state.layers)
  const gridSize = useEditorStore((state) => state.gridSize)

  const exportTextFile = () => {
    downloadAsciiText(compileAsciiText(layers, gridSize))
  }

  return (
    <div className="flex h-dvh min-h-[620px] flex-col overflow-hidden bg-neutral-950 text-neutral-950">
      <header className="flex h-14 shrink-0 items-stretch border-b-2 border-black bg-white">
        <div className="screentone-dark flex min-w-44 items-center border-r-2 border-black px-4 text-white">
          <div>
            <div className="font-mono text-lg font-black leading-none tracking-[-0.08em]">
              TxTOON
            </div>
            <div className="mt-1 font-mono text-[8px] font-bold tracking-[0.3em]">
              ASCII INK STUDIO
            </div>
          </div>
        </div>
        <div className="hidden flex-1 items-center gap-5 px-4 font-mono text-[9px] font-bold tracking-[0.16em] text-neutral-600 sm:flex">
          <span>FILE / UNTITLED.TXT</span>
          <span className="hidden md:inline">MODE / DRAW</span>
          <span className="hidden xl:inline">ENGINE / HTML5 CANVAS</span>
        </div>
        <button
          type="button"
          onClick={exportTextFile}
          className="ml-auto min-w-36 border-l-2 border-black bg-red-600 px-5 font-mono text-xs font-black tracking-[0.18em] text-white hover:bg-red-700 focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-white"
        >
          TXT EXPORT
        </button>
      </header>
      <main className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(360px,1fr)_auto] gap-2 overflow-auto bg-neutral-900 p-2 lg:grid-cols-[220px_minmax(0,1fr)_260px] lg:grid-rows-1 lg:overflow-hidden">
        <CharacterPalette />
        <CanvasEditor />
        <LayerPanel />
      </main>
    </div>
  )
}

export default App
