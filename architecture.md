# Architecture

## Frontend
- React + Vite + TypeScript.
- TanStack Router for pages.
- Existing Lovable UI kept as base.

## Desktop shell
- Electron main process in `electron/main.cjs`.
- Preload bridge in `electron/preload.cjs`.
- Renderer uses safe IPC only for file dialogs.
- `dialog:open-json` returns both file contents and the absolute path, so the renderer can track the currently opened project file.
- Window close is mediated by `app:close-request` / `app:close-response`: the renderer reports whether the opened JSON file is dirty, and Electron main shows the native save confirmation before closing.
- In packaged builds the renderer loads from the stable custom origin `camplan://app/`; dev still loads from Vite at `http://127.0.0.1:5173`.
- The packaged app must not use a random localhost port, because IndexedDB/localStorage are origin-scoped and a changing port creates a fresh empty storage on every launch.

## Data layer
- IndexedDB stores the app snapshot locally.
- Renderer does not work directly with `localStorage`.
- Import/export works through normalized app data.
- The store keeps `projectFilePath` and `projectFileSavedAt` separately from IndexedDB autosave; this tracks whether the opened JSON file needs a save prompt without changing startup restore semantics.


## Selection and grouping
- Renderer keeps a multi-selection array for map objects so the right panel can switch between `Главная` and per-item tabs.
- Grouped devices and map elements share `groupId`; the canvas expands selection to the whole group and moves all grouped members together.
