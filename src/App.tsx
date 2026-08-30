import { CanvasEditor } from './components/CanvasEditor'
import { CharacterPalette } from './components/CharacterPalette'
import { LayerPanel } from './components/LayerPanel'
import {
  compileAsciiText,
  downloadAsciiText,
  getProjectFileName,
} from './lib/exportAscii'
import { useEditorStore } from './store/editorStore'

function App() {
  const layers = useEditorStore((state) => state.layers)
  const gridSize = useEditorStore((state) => state.gridSize)
  const projectName = useEditorStore((state) => state.projectName)
  const setProjectName = useEditorStore((state) => state.setProjectName)

  const exportTextFile = () => {
    downloadAsciiText(
      compileAsciiText(layers, gridSize),
      getProjectFileName(projectName),
    )
  }

  return (
    <div className="flex h-dvh min-h-[620px] flex-col overflow-hidden bg-neutral-950 text-neutral-950">
      <header className="flex h-14 shrink-0 items-stretch border-b-2 border-black bg-white">
        <div className="screentone-dark flex min-w-32 items-center border-r-2 border-black px-3 text-white sm:min-w-44 sm:px-4">
          <div>
            <div className="font-mono text-lg font-black leading-none tracking-[-0.08em]">
              TxTOON
            </div>
            <div className="mt-1 hidden font-mono text-[8px] font-bold tracking-[0.3em] sm:block">
              ASCII INK STUDIO
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 px-2 font-mono text-[9px] font-bold tracking-[0.16em] text-neutral-600 sm:px-4">
          <label htmlFor="project-name" className="hidden shrink-0 sm:inline">
            FILE /
          </label>
          <input
            id="project-name"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            maxLength={80}
            className="h-8 min-w-0 flex-1 border-2 border-black bg-neutral-100 px-2 font-mono text-[10px] font-black tracking-wider text-black outline-none focus:bg-white"
            aria-label="Project name"
          />
          <span className="hidden xl:inline">.TXT</span>
        </div>
        <button
          type="button"
          onClick={exportTextFile}
          className="ml-auto min-w-28 border-l-2 border-black bg-red-600 px-3 font-mono text-[10px] font-black tracking-[0.12em] text-white hover:bg-red-700 focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-white sm:min-w-36 sm:px-5 sm:text-xs sm:tracking-[0.18em]"
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
