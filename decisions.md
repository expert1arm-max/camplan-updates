# Decisions

## Зафиксировано
- Backend не используется.
- Supabase не подключается.
- Основное хранилище - IndexedDB.
- Пароль скрыт по умолчанию.
- IndexedDB remains the primary store, but the latest snapshot is also mirrored to `localStorage` so the app can restore the last project on startup more reliably.
- Для импорта старых данных есть нормализация legacy-полей.
- Сохранён Lovable-ориентированный desktop layout.
- Windows releases publish through GitHub Actions + GitHub Releases, and `electron-updater` points to the release repo from `package.json`.
- Runtime release lookup in `electron/main.cjs` must not depend only on `build.publish` being present in the packaged `package.json`; it now accepts env overrides and falls back to the fixed GitHub releases repo so the update check still works in packaged builds.
- The update button now bypasses `electron-updater` for the download step and instead downloads the latest GitHub release installer asset directly, which avoids the packaged cache-path crash on Windows.
- The direct download flow now sanitizes the installer asset name and falls back to a synthesized filename so malformed release asset metadata cannot crash the update path.
- The manual update flow now requires an explicit confirmation step after download; only then does Electron main write a temp batch launcher next to the update debug logs, launch that `.cmd` detached and hidden during QA, and exit the app immediately after the helper is spawned. The installer package is now named separately from the app executable (`CamPlan-Installer-*` vs `CamPlan.exe`) to avoid NSIS self-detection. The launcher waits 5 seconds so NSIS starts only after the app has already shut down.
- The visible product name is now `CamPlan`, while the Electron `appId` stays unchanged to avoid breaking the existing update channel for already installed builds.
