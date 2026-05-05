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
  - devices
  - deviceConnections
  - settings
- Обновлены:
  - поиск
  - карточка устройства
  - таблица всех устройств
  - импорт/экспорт
  - demo data
- Добавлен инструмент `Кабель / Connector` с кабельной моделью, snap to grid и привязкой к устройствам.
- Кабели теперь сохраняются в `deviceConnections` вместе с типом, точками маршрута и endpoint-привязками.
- Добавлены цвета и `locked` для map elements и cables, а также outline-only rooms, hitboxes и явный сброс selection по клику в пустоту.
- Исправлена packaged-раздача статических assets из `dist/client`, чтобы свежий Windows `exe` открывал нормальный UI вместо unstyled/black screen.
- Собран свежий unpacked-билд в `release-view\win-unpacked\CCTV Manager.exe`.
- Добавлен undo/redo через `Ctrl+Z`, `Ctrl+Shift+Z` и `Ctrl+Y` для изменений объектов, зон, плана и устройств.
- Добавлены copy/paste hotkeys (`Ctrl+C`, `Ctrl+V`) для выбранного устройства или элемента плана.
- Добавлен режим просмотра по умолчанию и ручное включение режима редактирования.
- В просмотре отключены опасные инструменты: drag, resize, rotate, delete и поля редактирования.
- В карточке устройства добавлен явный CTA для перехода в режим редактирования, чтобы пароль и другие поля было проще менять.
- Поле пароля в карточке устройства расширено; в скрытом состоянии оно показывает маску `*`, а при `Показать пароль` раскрывает реальное значение в том же поле.
- Добавлена универсальная модель `devices` с миграцией старых `cameras`.
- Доработан `Кабель / Connector` как polyline: single click добавляет точку, double click завершает, есть preview и handles для редактирования точек.
- Инструмент `Помещение / Room` стал одноразовым: после создания room режим автоматически возвращается на `select`, а новый room берёт preset color из панели.
- `Room` теперь создаётся одним кликом как квадрат 200×200 по центру клика, а devices и locked объекты выбираются по всему визуальному блоку.
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

- UI now has collapsible left and right panels.
- Toolbar exports/imports the map as a project JSON and supports JPG export of the plan.

- Toolbar project actions moved into a File dropdown.
- Left and right panel collapse controls now sit above their respective panels.
