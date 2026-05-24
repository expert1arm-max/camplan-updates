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
- `localStorage` stores a backup copy of the latest snapshot, and startup now compares it with IndexedDB so the freshest persisted snapshot is restored.

## Import / export
- JSON import/export для полного snapshot проекта.
- CSV export для таблицы всех устройств.
- JPG export текущего плана через SVG-to-canvas.
- Import поддерживает legacy-поля: `cameras`, `deviceCables`, `connections`.

## Packaging
- `npm run build` собирает frontend.
- `npm run dist:win` собирает Windows installer.
- Current packaged installer version is `0.2.25`.

## GitHub Releases
- Release automation uses GitHub Actions.
- Tag push `v*` builds the Windows installer and publishes release assets.
- `electron-updater` downloads updates from the GitHub release repo configured in `package.json`.
- Manual update check in the app reads the latest GitHub release directly from the GitHub API for the repo configured in `package.json`.
- The GitHub release lookup uses a timeout so a slow or unreachable GitHub response turns into an error instead of an infinite checking state.
- The update dialog compares the local app version with the GitHub version and only enables the update action when they differ.
- The update dialog can still listen to IPC progress events from Electron main while an actual download is running.
- Packaged builds also use a runtime fallback repo in `electron/main.cjs`, so the app can still find the release repository even if `build.publish` is not present in the shipped `package.json`.
- Update installation now downloads the latest GitHub release `.exe` asset directly and opens it from Electron main; `electron-updater` is no longer used for the download step.
- The direct download path now normalizes the installer asset name with a fallback filename so incomplete release metadata cannot crash `path.join(...)`.
- After the installer is downloaded, the renderer waits for user confirmation, then Electron main logs the absolute installer path to `%TEMP%\CamPlanUpdateDebug.log`, writes `%TEMP%\CamPlanUpdateLauncher.ps1`, and launches a hidden detached PowerShell helper so the app can quit cleanly before NSIS opens.
- The hidden detached PowerShell helper waits briefly, then checks for `CamPlan.exe` by process name and starts the installer only after it disappears.
- If PowerShell spawn fails, Electron main falls back to `shell.openPath` and then detached `cmd start`, logging which fallback path was used.
- A custom `build/installer.nsh` override replaces the default app-running check with a no-op because the update flow already closes CamPlan before NSIS starts.
- The current electron-builder schema does not accept a `closeRunningApp` NSIS option, so the no-op `build/installer.nsh` remains the actual guard that prevents the installer from trying to close CamPlan again. The launcher generation now fails fast if `parentPid` or `Get-Process -Id` ever appear in the generated PowerShell script.
- The update launcher script is written with `fs.writeFileSync` before any window teardown, and the PowerShell spawn is only attempted after that file exists on disk; the app closes only after the launcher is successfully spawned.
- The PowerShell helper is spawned hidden during QA and the existing debug/error logs still capture missing-installer details if the file cannot be found.
