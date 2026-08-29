import {
  GRANULARITY_MAX,
  GRANULARITY_MIN,
  useEditorStore,
} from '../store/editorStore'

const CHARACTERS = [
  '#',
  '@',
  '/',
  '\\',
  '|',
  '_',
  '-',
  '+',
  '*',
  '=',
  '.',
  ':',
  '█',
  '▓',
  '▒',
  ' ',
]

export function CharacterPalette() {
  const selectedCharacter = useEditorStore((state) => state.selectedCharacter)
  const granularity = useEditorStore((state) => state.granularity)
  const showGrid = useEditorStore((state) => state.showGrid)
  const setSelectedCharacter = useEditorStore(
    (state) => state.setSelectedCharacter,
  )
  const setGranularity = useEditorStore((state) => state.setGranularity)
  const setShowGrid = useEditorStore((state) => state.setShowGrid)

  return (
    <aside className="screentone flex min-h-0 flex-col border-2 border-black bg-neutral-100 lg:border-r-0">
      <div className="border-b-2 border-black bg-black px-3 py-2 font-mono text-[11px] font-black tracking-[0.22em] text-white">
        NIB / CHARACTER
      </div>
      <div className="grid grid-cols-[72px_1fr] gap-3 border-b-2 border-black bg-white p-3 lg:grid-cols-1">
        <label className="flex flex-col gap-1 font-mono text-[10px] font-black tracking-widest">
          ACTIVE GLYPH
          <input
            value={selectedCharacter}
            onChange={(event) => setSelectedCharacter(event.target.value)}
            className="h-14 w-full border-2 border-black bg-white text-center font-mono text-3xl font-black outline-none focus:bg-neutral-100"
            aria-label="Selected drawing character"
          />
        </label>
        <div className="grid grid-cols-4 gap-px border-2 border-black bg-black">
          {CHARACTERS.map((character) => (
            <button
              key={character}
              type="button"
              onClick={() => setSelectedCharacter(character)}
              className={`h-9 bg-white font-mono text-sm font-black hover:bg-neutral-300 ${selectedCharacter === character ? 'bg-black text-white hover:bg-black' : ''}`}
              aria-label={character === ' ' ? 'Eraser' : `Use ${character}`}
              aria-pressed={selectedCharacter === character}
            >
              {character === ' ' ? 'DEL' : character}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 bg-neutral-100 p-3">
        <label className="flex flex-col gap-2 font-mono text-[10px] font-black tracking-widest">
          <span className="flex justify-between">
            GRANULARITY <b>{granularity} PX</b>
          </span>
          <input
            type="range"
            min={GRANULARITY_MIN}
            max={GRANULARITY_MAX}
            step="1"
            value={granularity}
            onChange={(event) => setGranularity(event.target.valueAsNumber)}
            className="accent-black"
          />
          <span className="flex justify-between text-[9px] text-neutral-500">
            <span>FINE</span>
            <span>COARSE</span>
          </span>
        </label>
        <button
          type="button"
          onClick={() => setShowGrid(!showGrid)}
          className={`border-2 border-black px-3 py-2 text-left font-mono text-[10px] font-black tracking-widest ${showGrid ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-200'}`}
          aria-pressed={showGrid}
        >
          GUIDE GRID: {showGrid ? 'ON' : 'OFF'}
        </button>
      </div>
    </aside>
  )
}
