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
- Current packaged installer version is `0.2.30`.

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
- After the installer is downloaded, the renderer waits for user confirmation, then Electron main logs the absolute installer path to `%TEMP%\CamPlanUpdateDebug.log`, writes `%TEMP%\CamPlanUpdateLauncher.cmd` and `%TEMP%\CamPlanUpdateLauncher.vbs`, and launches a hidden detached WScript helper so the app can quit cleanly before NSIS opens.
- The hidden launcher waits briefly, then checks for `CamPlan.exe` by process name and starts the installer only after it disappears.
- The update launcher no longer uses PowerShell or fallback launch paths; the hidden WScript + CMD pair is the only launch path.
- A custom `build/installer.nsh` override replaces the default app-running check with a no-op because the update flow already closes CamPlan before NSIS starts.
- The current electron-builder schema does not accept a `closeRunningApp` NSIS option, so the no-op `build/installer.nsh` remains the actual guard that prevents the installer from trying to close CamPlan again.
- The close/retry prompt text `Не удалось закрыть CamPlan` came from the stock `installUtil.nsh` old-version uninstall loop, so the project now carries a local `build/installUtil.nsh` override to remove that blocking dialog entirely.
- The update launcher scripts are written with `fs.writeFileSync` before any window teardown, and the WScript spawn is only attempted after both files exist on disk; the app closes only after the launcher is successfully spawned.
- The hidden WScript helper is spawned during QA and the existing debug/error logs still capture missing-installer details if the file cannot be found.
- Restore persistence now writes the imported/edited snapshot to both IndexedDB and `localStorage`, records `savedAt`/`updatedAt` plus active object/floor metadata, and startup chooses the freshest non-empty snapshot so an empty project cannot overwrite a valid one on reopen.
- Temporary QA instrumentation now logs every storage read/write with object/floor counts, active refs, and first object name so the empty-overwrite source can be proven before the guard is kept.
- The NSIS installer now relies on local template overrides in `build/installer.nsh`, `build/installUtil.nsh`, and `build/allowOnlyOneInstallerInstance.nsh` to keep the update install flow silent after CamPlan exits.
# Restore QA logging

- `localStorage["camplan:qa-debug-log"]` keeps the temporary QA log buffer for restore/persist diagnosis.
