# Project Roadmap

## Этап
MVP desktop-версии собран и упаковывается.

## Сейчас
- Довести UX мелкие поля и массовое редактирование до удобного рабочего состояния.
- Проверить новый masked-input пароля в карточке устройства на ввод, отображение `*` и показ реального значения.
- Проверить новый инструмент `Кабель` как polyline: single click добавляет точки, double click завершает, handles редактируют маршрут.
- Проверить одноразовый `Room` tool: после создания помещение возвращает режим на `select`, а новый room берёт preset color из палитры.
- Проверить один-клик создание `Room` 200×200 и выбор устройств по их визуальному блоку.
- Проверить цвета, lock и selection UX на плане: outline-only rooms, выбор по рамке/линии и сброс по клику вне объекта.
- При необходимости убрать оставшиеся lint warnings в shared UI.
- Проверить свежий unpacked Windows build из `release-view` на запуск и отображение стилей.
- Проверить undo/redo по горячим клавишам в Electron-окне.
- Проверить copy/paste выбранного устройства или элемента плана по горячим клавишам.
- Проверить старт в режиме просмотра и переход в режим редактирования кнопкой.

## Следующий шаг
- Провести ручную проверку в Electron-окне:
  - создание объекта
  - создание зоны
  - добавление устройства
  - редактирование устройства
  - добавление кабеля
  - импорт JSON
  - экспорт JSON/CSV
  - undo/redo через `Ctrl+Z`, `Ctrl+Shift+Z`, `Ctrl+Y`
  - copy/paste через `Ctrl+C`, `Ctrl+V`
  - старт в `Просмотр` и переключение в `Редактирование`

- Verify project save/load and JPG export in Electron.
- Verify left/right panel collapse and restore on relaunch.

- Verify the File menu flow for project open/save and image export.
- Verify panel collapse buttons stay attached above the left and right menus.

- Verify object selection opens the right panel and blank-canvas clicks close it.
- Verify pin keeps the right panel open after deselection.
- Verify collapsed left/right headers render arrow-only state.
