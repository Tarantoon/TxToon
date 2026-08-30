# TxToon

TxToon is a browser-based ASCII and UTF-8 art editor for tracing reference images and drawing on a dynamic character grid.

## Setup

```bash
bun create vite TxToon --template react-ts
cd TxToon
bun install
bun add zustand
bun add -D tailwindcss @tailwindcss/vite vitest jsdom @testing-library/jest-dom @testing-library/react
bun run dev
```

## Commands

```bash
bun run dev
bun run test
bun run lint
bun run typecheck
bun run build
```

## Architecture

- `src/types/editor.ts` defines the layer, grid, and editor contracts.
- `src/store/editorStore.ts` owns editor state and immutable layer operations.
- `src/components/CanvasEditor.tsx` handles sizing and pointer input.
- `src/lib/renderCanvasFrame.ts` composites visible image and ASCII layers.
- `src/lib/exportAscii.ts` compiles visible ASCII layers and downloads TXT files.
- `src/lib/canvasGrid.ts` provides grid metrics and drag interpolation.

## Editor Controls

- Left-drag paints the active glyph.
- Right-drag an existing glyph or selection to move it.
- Right-drag empty canvas space to create a multi-glyph selection.
- Select an image layer, then drag the image to move it or its lower-right handle to scale it.
- Middle-drag or Alt-drag pans the viewport.
- Mouse wheel or workspace buttons control visual zoom.
- Layer drag handles support pointer and keyboard bottom-to-top reordering.
- Column and row controls resize the export grid without deleting layer data.
