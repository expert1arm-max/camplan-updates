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
- Добавлены команды:
  - `npm run dev`
  - `npm run dev:desktop`
  - `npm run build`
  - `npm run dist:win`

## Проверено
- `npm run build` проходит.
- `npm run lint` проходит без ошибок, остаются только предупреждения из базовых UI-файлов.
- `npm run dist:win` собирает Windows installer.

