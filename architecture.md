# Architecture

## Frontend
- React + Vite + TypeScript.
- TanStack Router for pages.
- Existing Lovable UI kept as base.

## Desktop shell
- Electron main process in `electron/main.cjs`.
- Preload bridge in `electron/preload.cjs`.
- Renderer uses safe IPC only for file dialogs.

## Data layer
- IndexedDB stores the app snapshot locally.
- Renderer does not work directly with `localStorage`.
- Import/export works through normalized app data.


## Selection and grouping
- Renderer keeps a multi-selection array for map objects so the right panel can switch between `Главная` and per-item tabs.
- Grouped devices and map elements share `groupId`; the canvas expands selection to the whole group and moves all grouped members together.
