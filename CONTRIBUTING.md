# Contributing to TxToon

TxToon is a Bun/Vite/React/TypeScript editor for canvas-based ASCII and UTF-8 art.

## Prerequisites and setup

- Bun runtime
- Modern desktop browser with Pointer Events, Canvas 2D, ResizeObserver, and Blob support

```bash
bun install
bun run dev
```

## Branch and issue workflow

- Start from a focused issue or a small, specific proposal.
- Keep each branch narrow in scope and easy to review.
- Avoid mixing feature work, refactors, and unrelated fixes.
- Rebase or otherwise keep history clean before opening a pull request.

## Bug reports

Include:

- Clear summary
- Reproduction steps
- Expected and actual behavior
- Browser and OS details
- Relevant screenshots or recordings
- Console output when applicable

## Feature proposals

Include:

- User problem
- Proposed behavior
- Constraints and edge cases
- Accessibility impact
- Minimal acceptance criteria

Prefer incremental changes over broad redesigns.

## Code conventions

- Use TypeScript and self-explanatory names.
- Keep code clean and modular.
- Follow the existing zero-comment policy in source files.
- Use the linter to enforce formatting and style.
- Preserve existing import, naming, and file-organization patterns.

## Canvas rendering boundaries

- Keep all HTML5 canvas drawing in `src/lib/renderCanvasFrame.ts`.
- Let `CanvasEditor` handle input, viewport measurement, and render scheduling.
- Do not add ad hoc DOM drawing for editor content.
- Preserve HiDPI handling and camera-aware transforms.
- Use canonical project coordinates so pointer, grid, and image math stay aligned.
- Maintain the strict `0.6` cell width-to-height ratio from `src/lib/canvasGrid.ts`.

## Zustand and layer semantics

- Treat Zustand state as immutable.
- Return new objects and arrays instead of mutating existing state.
- Keep normalization and clamping inside store actions.
- Preserve bottom-to-top layer order in the store and renderer.
- Reordering behavior should keep rendering and export semantics consistent.

## React, UI, accessibility, and dnd-kit

- Keep controls keyboard accessible.
- Maintain clear labels, focus behavior, and readable contrast.
- Do not rely on color alone to convey state.
- Preserve pointer behavior for canvas interactions.
- Keep `@dnd-kit/react` wiring aligned with layer reordering and drag overlays.

## Tests required for changes

Every behavior change should include tests.

- Add or update tests near the affected code.
- Cover store, canvas, UI, and interaction changes where relevant.
- Do not submit unverified behavior changes.

## Commands

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

## Commit messages

Use Conventional Commits:

```text
type(scope): description
```

## Pull request checklist

- Focused scope
- Linked issue or proposal
- Tests updated or added
- `bun run lint` passes
- `bun run typecheck` passes
- `bun run test` passes
- `bun run build` passes
- UI and accessibility reviewed
- No unrelated changes

## Security reporting

Do not file sensitive reports publicly. Use the project’s private security channel if one is listed elsewhere by the maintainers. If no private contact is provided, request the reporting path from a maintainer without posting exploit details publicly.
