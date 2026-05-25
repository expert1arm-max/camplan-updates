# Decisions

## Р—Р°С„РёРєСЃРёСЂРѕРІР°РЅРѕ
- Backend РЅРµ РёСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ.
- Supabase РЅРµ РїРѕРґРєР»СЋС‡Р°РµС‚СЃСЏ.
- РћСЃРЅРѕРІРЅРѕРµ С…СЂР°РЅРёР»РёС‰Рµ - IndexedDB.
- РџР°СЂРѕР»СЊ СЃРєСЂС‹С‚ РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ.
- IndexedDB remains the primary store, but the latest snapshot is also mirrored to `localStorage` so the app can restore the last project on startup more reliably.
- On startup, the app now selects the freshest persisted snapshot between IndexedDB and `localStorage` instead of trusting the backup copy first.
- Р”Р»СЏ РёРјРїРѕСЂС‚Р° СЃС‚Р°СЂС‹С… РґР°РЅРЅС‹С… РµСЃС‚СЊ РЅРѕСЂРјР°Р»РёР·Р°С†РёСЏ legacy-РїРѕР»РµР№.
- РЎРѕС…СЂР°РЅС‘РЅ Lovable-РѕСЂРёРµРЅС‚РёСЂРѕРІР°РЅРЅС‹Р№ desktop layout.
- Windows releases publish through GitHub Actions + GitHub Releases, and `electron-updater` points to the release repo from `package.json`.
- Runtime release lookup in `electron/main.cjs` must not depend only on `build.publish` being present in the packaged `package.json`; it now accepts env overrides and falls back to the fixed GitHub releases repo so the update check still works in packaged builds.
- The update button now bypasses `electron-updater` for the download step and instead downloads the latest GitHub release installer asset directly, which avoids the packaged cache-path crash on Windows.
- The direct download flow now sanitizes the installer asset name and falls back to a synthesized filename so malformed release asset metadata cannot crash the update path.
- The manual update flow now requires an explicit confirmation step after download; only then does Electron main write real temp WScript + CMD launcher files, wait briefly and then check for `CamPlan.exe` by name before starting the installer, and exit the app immediately after the launcher process is spawned. The launcher logs to `%TEMP%\CamPlanUpdateDebug.log` and `%TEMP%\CamPlanUpdateError.log`, keeps the installer package named separately from the app executable (`CamPlan-Installer-*` vs `CamPlan.exe`) to avoid NSIS self-detection, and no longer uses PowerShell or fallback launch paths. A custom `build/installer.nsh` override disables the default app-running process check entirely because the app is already closed before the installer starts. The helper is hidden so no visible console window appears during update launch.
- The current electron-builder schema does not accept `build.nsis.closeRunningApp`, so the effective fix is the no-op `build/installer.nsh` override; the update flow now uses only the hidden WScript + CMD launcher and no PowerShell launcher path remains.
- The 0.2.26 update-launch fix writes `%TEMP%\CamPlanUpdateLauncher.cmd` and `%TEMP%\CamPlanUpdateLauncher.vbs` synchronously before any window teardown, verifies both files exist, then spawns the hidden WScript helper, closes windows, and exits only after the launcher is running. This keeps the update flow reliable even when the app quits quickly.
- The visible product name is now `CamPlan`, while the Electron `appId` stays unchanged to avoid breaking the existing update channel for already installed builds.
- SVG pointer coordinates for plan drawing now use `getScreenCTM()`/SVG matrix transforms instead of rect-based ratios, because the canvas can letterbox or scale inside the page and rect math introduces a visible offset when starting walls or rooms.
- The coordinate fix is intentionally centralized in `PlanCanvas` helper conversion functions so walls, rooms, and any other pointer-driven SVG interactions stay aligned under the cursor across zoom, scaling, and letterboxing.
- The last opened project is now flushed again on `beforeunload`/`pagehide` so a quick app close does not lose the most recent persisted snapshot before the next startup restore.
- NSIS running-app close/retry prompts are disabled by overriding `customCheckAppRunning` to a no-op in `build/installer.nsh`; the update launcher already closes CamPlan before starting the installer, so the installer must not try to kill or retry the app itself.
- The visible `РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РєСЂС‹С‚СЊ CamPlan` prompt was actually coming from the stock `installUtil.nsh` old-version uninstall loop, so the repo now carries a local `build/installUtil.nsh` override that removes the retry dialog entirely.
- Imported projects are now persisted immediately to both IndexedDB and the `localStorage` backup, and startup restore prefers the freshest non-empty snapshot so a blank startup state cannot overwrite the last opened project.
- Restore/autosave now uses an explicit `hasHydratedFromStorage` guard and blocks empty snapshot overwrites unless the action was an explicit `new-project-confirmed`.
- NSIS close/retry prompts are being removed by local template overrides in `build/installer.nsh`, `build/installUtil.nsh`, and `build/allowOnlyOneInstallerInstance.nsh` so the update installer can continue without a blocking app-close dialog.
# Restore QA decisions

- Restore QA logs are written both to DevTools console and to `localStorage["camplan:qa-debug-log"]` so the team can prove where a snapshot is lost before changing behavior again.
- `saveSnapshot(snapshot, source)` and `loadBestSnapshot()` are the supported restore/persist entry points; ad hoc save calls should not be added outside this flow.
