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
