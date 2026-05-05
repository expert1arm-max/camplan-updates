# Project Progress

## Сделано
- Добавлен Electron main process и preload.
- Настроен безопасный `BrowserWindow`:
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - `sandbox: true`
- Подключён локальный data layer на IndexedDB.
- Переведены сущности на актуальную модель:
  - objects
  - floors
  - mapElements
  - cameras
  - settings
- Обновлены:
  - поиск
  - карточка камеры
  - таблица всех камер
  - импорт/экспорт
  - demo data
- Исправлена packaged-раздача статических assets из `dist/client`, чтобы свежий Windows `exe` открывал нормальный UI вместо unstyled/black screen.
- Собран свежий unpacked-билд в `release-view\win-unpacked\CCTV Manager.exe`.
- Добавлен undo/redo через `Ctrl+Z`, `Ctrl+Shift+Z` и `Ctrl+Y` для изменений объектов, зон, плана и камер.
- Добавлены copy/paste hotkeys (`Ctrl+C`, `Ctrl+V`) для выбранной камеры или элемента плана.
- Добавлен режим просмотра по умолчанию и ручное включение режима редактирования.
- В просмотре отключены опасные инструменты: drag, resize, rotate, delete и поля редактирования.
- Добавлены команды:
  - `npm run dev`
  - `npm run dev:desktop`
  - `npm run build`
  - `npm run dist:win`

## Проверено
- `npm run build` проходит.
- `npm run lint` проходит без ошибок, остаются только предупреждения из базовых UI-файлов.
- `npm run dist:win` собирает Windows installer.
- `npm run dist:portable` собирает single-file portable `.exe`.
