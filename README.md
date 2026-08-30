# TxToon

TxToon is a browser-based ASCII and UTF-8 art editor for tracing reference images, drawing on a character grid, and exporting the visible text composition as a `.txt` file.

Status: beta. The editor is usable, but the data model, interaction set, and file workflow are still evolving.

## Core functionality

- Draw and erase characters on an explicitly sized grid.
- Add image reference layers and adjust position, proportional scale, and opacity.
- Select, move, and reorder layers.
- Pan and zoom the workspace.
- Resize the grid without deleting existing sparse cell data.
- Export the current visible ASCII composition to TXT.

## Technology stack

- Bun
- Vite
- React 19
- TypeScript
- Tailwind CSS 4
- Zustand
- @dnd-kit/react
- Vitest
- jsdom
- @testing-library/react
- @testing-library/jest-dom
- oxlint

## Prerequisites

- Bun runtime
- A modern desktop browser with Pointer Events, Canvas 2D, ResizeObserver, Blob, and `URL.createObjectURL`

## Installation

From the project root:

```bash
bun install
```

## Usage

Start the development server:

```bash
bun run dev
```

Then open the local address printed by Vite.

Other project commands:

```bash
bun run build
bun run test
bun run lint
bun run typecheck
bun run preview
```

## Editor controls

### Canvas

- Left-drag on an ASCII layer to paint when a glyph is selected.
- With no glyph selected, left-drag pans the canvas in hand mode.
- Right-drag an existing glyph or an active selection to move it.
- Right-drag empty grid space to create a marquee selection.
- Middle-drag or Alt+left-drag to pan.
- Mouse wheel to zoom around the pointer.
- Use the canvas zoom buttons to zoom in, zoom out, or reset the view.
- Select an image layer, then drag inside the image to move it.
- Select an image layer, then drag the lower-right handle to resize proportionally.
- The canvas context menu is suppressed to preserve right-button editing.

### Character palette

- Choose the active drawing glyph from the preset character set.
- Click the active preset again, or clear the glyph field, to enter hand mode.
- Edit the active glyph directly in the text field.
- Change grid columns and rows with the number inputs or +/- buttons.
- Toggle the guide grid.

### Layer panel

- Add an ASCII layer with `+ INK`.
- Add an image reference layer with `+ IMAGE`.
- Drag the handle on a layer card to reorder it with pointer or keyboard input.
- Toggle visibility with `ON/OFF`.
- Move a layer one step up or down.
- Delete a layer.
- Adjust image layer opacity with the slider.

### Project naming and export

- Set the project name in the header.
- Export the current composition with `TXT EXPORT`.

## Architecture

Current source layout:

- `src/main.tsx` — React entry point.
- `src/App.tsx` — application shell, project naming, and TXT export action.
- `src/index.css` — global styles and Tailwind import.
- `src/types/editor.ts` — shared editor, layer, grid, and camera types.
- `src/store/editorStore.ts` — Zustand state, layer actions, grid actions, and camera actions.
- `src/lib/canvasGrid.ts` — grid metrics, hit testing, interpolation, and fit calculations.
- `src/lib/renderCanvasFrame.ts` — canvas rendering pipeline.
- `src/lib/exportAscii.ts` — ASCII compilation and TXT download logic.
- `src/components/CanvasEditor.tsx` — pointer interaction handling and render loop orchestration.
- `src/components/CharacterPalette.tsx` — glyph selection and grid controls.
- `src/components/LayerPanel.tsx` — layer management, drag reordering, visibility, opacity, and image upload.
- `src/**/*.test.tsx`, `src/**/*.test.ts` — unit and component tests.

### State and rendering semantics

- `src/store/editorStore.ts` stores `layers` in bottom-to-top order.
- `src/lib/renderCanvasFrame.ts` renders layers in array order, so later visible layers appear above earlier layers.
- `src/lib/exportAscii.ts` compiles only visible ASCII layers and scans from top to bottom so the topmost visible non-space glyph wins per cell.
- `src/components/LayerPanel.tsx` displays the layer list top-to-bottom by reversing the store order, while reordering still updates the underlying bottom-to-top array.

### Data model

- ASCII layers store glyphs in a sparse `Record<"x,y", string>` matrix. Painting a space removes the sparse entry.
- Image layers retain an `HTMLImageElement`, canonical project position, proportional scale, visibility, and opacity.
- Grid columns and rows define project and export bounds independently from camera zoom and pan.
- Shrinking the grid does not delete sparse cells outside the visible bounds. Expanding it can reveal them again.
- Camera state is visual only and never changes exported text.

### Grid fit and cell geometry

- `src/lib/canvasGrid.ts` uses a fixed cell width-to-height ratio of `0.6`.
- The grid is centered in the available viewport using a workspace margin of `28` pixels.
- Cell height is capped at `28` pixels for fit calculations.
- The canvas uses the resulting metrics to keep project-space coordinates stable during pan and zoom.

## Export rules

- Only visible ASCII layers are exported.
- Image layers are not included in TXT output.
- For each grid cell, the topmost visible ASCII layer takes precedence.
- Export size matches the current grid dimensions.
- Empty cells are exported as spaces.
- Every row contains exactly the configured number of columns, including trailing spaces.
- Rows use LF (`\n`) separators and the file has no additional final newline.
- File names are sanitized in `src/lib/exportAscii.ts`:
  - `.txt` is normalized.
  - invalid filename characters are replaced.
  - trailing dots and spaces are removed.
  - reserved Windows device names are adjusted.
  - file names are truncated to 80 characters.

## Testing

The project uses Vitest with jsdom and Testing Library.

Run the test suite:

```bash
bun run test
```

Run the supporting checks:

```bash
bun run lint
bun run typecheck
```

Relevant test coverage is in:

- `src/App.test.tsx`
- `src/components/CanvasEditor.test.tsx`
- `src/components/CharacterPalette.test.tsx`
- `src/components/LayerPanel.test.tsx`
- `src/lib/canvasGrid.test.ts`
- `src/lib/renderCanvasFrame.test.ts`
- `src/lib/exportAscii.test.ts`
- `src/store/editorStore.test.ts`

## Browser notes

- The editor depends on Pointer Events, so modern desktop browsers are recommended.
- The canvas disables touch action to keep pointer input deterministic.
- Right-click editing depends on the browser allowing pointer events for button `2` before the context menu is suppressed.
- The current workflow is in-memory only; reloading the page resets state.

## Known beta limitations

- No persistence or local save format is implemented.
- No undo/redo history is implemented.
- No TXT import pipeline is implemented.
- No collaboration, authentication, or deployment workflow is included.
- Browser support is only verified by the current automated test environment.

## Roadmap

Likely follow-up work for a stable release:

- persistence and project recovery
- undo/redo and history management
- import workflows for text and reference assets
- keyboard-first editing shortcuts
- accessibility hardening
- broader browser validation

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidance.

## License

MIT — see [LICENSE](./LICENSE).
