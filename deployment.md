# Deployment

## Web dev
```bash
npm run dev
```
`dev` запускает Vite в strict port mode, чтобы он не уезжал на другой порт при уже занятом `5173`.

## Desktop dev
```bash
npm run dev:desktop
```
`dev:desktop` поднимает Vite на `5173` в strict mode и запускает Electron с software-rendering fallback для Windows dev-сессии.

## Frontend build
```bash
npm run build
```

## Windows package
```bash
npm run dist:win
```

## GitHub release
- GitHub Actions workflow publishes Windows releases on tag push `v*`.
- Release build uses `electron-builder --win nsis --publish always`.
- `electron-updater` reads updates from the GitHub release repo configured in `package.json`.

## Output
- Frontend build goes to `dist/`.
- Electron packaging output goes to `release/`.
- Windows installer output goes to `release/` together with update metadata.
