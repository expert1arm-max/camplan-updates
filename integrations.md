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

## GitHub Releases
- Release automation uses GitHub Actions.
- Tag push `v*` builds the Windows installer and publishes release assets.
- `electron-updater` downloads updates from the GitHub release repo configured in `package.json`.
- Manual update check in the app uses the same GitHub updater source.
- The update dialog compares the local app version with the GitHub version and only enables the update action when they differ.
- The update dialog can still listen to IPC progress events from Electron main while an actual download is running.
