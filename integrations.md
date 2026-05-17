# Integrations

## Electron
- `electron/main.cjs`
- `electron/preload.cjs`
- Безопасный `BrowserWindow` с `contextIsolation`, отключенным `nodeIntegration` и `sandbox`.
- Native file dialogs для открытия JSON и сохранения JSON/CSV/JPG.

## Storage
- IndexedDB в renderer.
- Локально сохраняется полный `AppData` snapshot.
- `localStorage` не используется как основное хранилище.

## Import / export
- JSON import/export для полного snapshot проекта.
- CSV export для таблицы всех устройств.
- JPG export текущего плана через SVG-to-canvas.
- Import поддерживает legacy-поля: `cameras`, `deviceCables`, `connections`.

## Packaging
- `npm run build` собирает frontend.
- `npm run dist:win` собирает Windows installer.
- `npm run dist:portable` собирает portable `.exe`.
