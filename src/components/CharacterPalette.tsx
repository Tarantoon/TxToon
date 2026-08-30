import {
  GRID_SIZE_MAX,
  GRID_SIZE_MIN,
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

interface DimensionControlProps {
  label: string
  value: number
  onChange: (value: number) => void
  onStep: (delta: number) => void
}

function DimensionControl({
  label,
  value,
  onChange,
  onStep,
}: DimensionControlProps) {
  return (
    <div className="grid grid-cols-[1fr_28px_58px_28px] items-center border-2 border-black bg-black font-mono text-[9px] font-black">
      <span className="px-2 text-white">{label}</span>
      <button type="button" onClick={() => onStep(-1)} className="h-8 border-l-2 border-black bg-white text-black hover:bg-neutral-300" aria-label={`Remove one ${label.toLowerCase()}`}>
        −
      </button>
      <input
        type="number"
        min={GRID_SIZE_MIN}
        max={GRID_SIZE_MAX}
        value={value}
        onChange={(event) => onChange(event.target.valueAsNumber)}
        className="h-8 border-x-2 border-black bg-white text-center text-black outline-none focus:bg-neutral-200"
        aria-label={`${label} count`}
      />
      <button type="button" onClick={() => onStep(1)} className="h-8 bg-white text-black hover:bg-neutral-300" aria-label={`Add one ${label.toLowerCase()}`}>
        +
      </button>
    </div>
  )
}

export function CharacterPalette() {
  const selectedCharacter = useEditorStore((state) => state.selectedCharacter)
  const gridSize = useEditorStore((state) => state.gridSize)
  const showGrid = useEditorStore((state) => state.showGrid)
  const setSelectedCharacter = useEditorStore(
    (state) => state.setSelectedCharacter,
  )
  const setGridSize = useEditorStore((state) => state.setGridSize)
  const resizeGrid = useEditorStore((state) => state.resizeGrid)
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
            value={selectedCharacter ?? ''}
            onChange={(event) => setSelectedCharacter(event.target.value)}
            placeholder="PAN"
            className="h-14 w-full border-2 border-black bg-white text-center font-mono text-3xl font-black outline-none focus:bg-neutral-100"
            aria-label="Selected drawing character"
          />
        </label>
        <div className="grid grid-cols-4 gap-px border-2 border-black bg-black">
          {CHARACTERS.map((character) => (
            <button
              key={character}
              type="button"
              onClick={() =>
                setSelectedCharacter(
                  selectedCharacter === character ? null : character,
                )
              }
              className={`h-9 bg-white font-mono text-sm font-black hover:bg-neutral-300 ${selectedCharacter === character ? 'bg-black text-white hover:bg-black' : ''}`}
              aria-label={character === ' ' ? 'Eraser' : `Use ${character}`}
              aria-pressed={selectedCharacter === character}
            >
              {character === ' ' ? 'DEL' : character}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 bg-neutral-100 p-3">
        <div className="font-mono text-[10px] font-black tracking-widest">
          GRID GRANULARITY
        </div>
        <DimensionControl
          label="COLUMNS"
          value={gridSize.columns}
          onChange={(columns) => setGridSize({ ...gridSize, columns })}
          onStep={(columns) => resizeGrid({ columns })}
        />
        <DimensionControl
          label="ROWS"
          value={gridSize.rows}
          onChange={(rows) => setGridSize({ ...gridSize, rows })}
          onStep={(rows) => resizeGrid({ rows })}
        />
        <p className="font-mono text-[8px] font-bold leading-relaxed tracking-wider text-neutral-500">
          RESIZING PRESERVES ALL LAYER DATA
        </p>
        <button
          type="button"
          onClick={() => setShowGrid(!showGrid)}
          className={`mt-auto border-2 border-black px-3 py-2 text-left font-mono text-[10px] font-black tracking-widest ${showGrid ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-200'}`}
          aria-pressed={showGrid}
        >
          GUIDE GRID: {showGrid ? 'ON' : 'OFF'}
        </button>
      </div>
    </aside>
  )
}
