# Decisions

## Зафиксировано
- Backend не используется.
- Supabase не подключается.
- Основное хранилище - IndexedDB.
- Пароль скрыт по умолчанию.
- IndexedDB remains the primary store, but the latest snapshot is also mirrored to `localStorage` so the app can restore the last project on startup more reliably.
- On startup, the app now selects the freshest persisted snapshot between IndexedDB and `localStorage` instead of trusting the backup copy first.
- Для импорта старых данных есть нормализация legacy-полей.
- Сохранён Lovable-ориентированный desktop layout.
- Windows releases publish through GitHub Actions + GitHub Releases, and `electron-updater` points to the release repo from `package.json`.
- Runtime release lookup in `electron/main.cjs` must not depend only on `build.publish` being present in the packaged `package.json`; it now accepts env overrides and falls back to the fixed GitHub releases repo so the update check still works in packaged builds.
- The update button now bypasses `electron-updater` for the download step and instead downloads the latest GitHub release installer asset directly, which avoids the packaged cache-path crash on Windows.
- The direct download flow now sanitizes the installer asset name and falls back to a synthesized filename so malformed release asset metadata cannot crash the update path.
- The manual update flow now requires an explicit confirmation step after download; only then does Electron main write a real temp PowerShell launcher script, wait briefly and then check for `CamPlan.exe` by name before starting the installer, and exit the app immediately after the launcher process is spawned. The launcher logs to `%TEMP%\CamPlanUpdateDebug.log` and `%TEMP%\CamPlanUpdateError.log`, falls back to `shell.openPath` or detached `cmd start` if PowerShell spawn fails, and keeps the installer package named separately from the app executable (`CamPlan-Installer-*` vs `CamPlan.exe`) to avoid NSIS self-detection. A custom `build/installer.nsh` override disables the default app-running process check entirely because the app is already closed before the installer starts. The helper is hidden so no visible console window appears during update launch.
- The current electron-builder schema does not accept `build.nsis.closeRunningApp`, so the effective fix is the no-op `build/installer.nsh` override plus a runtime guard that rejects any launcher script containing `parentPid` or `Get-Process -Id`.
- The 0.2.25 update-launch fix writes `%TEMP%\CamPlanUpdateLauncher.ps1` synchronously before any window teardown, verifies the file exists, then spawns the hidden PowerShell helper, closes windows, and exits only after the launcher is running. This keeps the update flow reliable even when the app quits quickly.
- The visible product name is now `CamPlan`, while the Electron `appId` stays unchanged to avoid breaking the existing update channel for already installed builds.
