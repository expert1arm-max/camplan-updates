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

