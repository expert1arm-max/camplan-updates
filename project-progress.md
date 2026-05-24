# Project Progress

## Сделано

- Добавлен Electron main process и preload.
- Настроен безопасный `BrowserWindow`:
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - `sandbox: true`
- Подключен локальный data layer на IndexedDB.
- Переведены сущности на актуальную модель:
  - `objects`
  - `floors`
  - `mapElements`
  - `devices`
  - `deviceConnections`
  - `settings`
- Добавлена универсальная модель `devices` с миграцией старых `cameras`.
- Добавлена нормализация legacy import для `cameras`, `deviceCables` и `connections`.
- Обновлены:
  - поиск;
  - карточка устройства;
  - таблица всех устройств;
  - импорт/экспорт;
  - старт без demo data, восстановление snapshot и fallback active refs.
- Добавлен инструмент `Кабель / Connector` с кабельной моделью, snap to grid и привязкой к устройствам.
- Кабели сохраняются в `deviceConnections` вместе с типом, точками маршрута и endpoint-привязками.
- Доработан `Кабель / Connector` как polyline: single click добавляет точку, double click завершает, есть preview и handles для редактирования точек.
- Добавлены цвета и `locked` для map elements и cables, а также outline-only rooms, hitboxes и явный сброс selection по клику в пустоту.
- Инструмент `Помещение / Room` стал одноразовым: после создания room режим автоматически возвращается на `select`, а новый room берет preset color из панели.
- `Room` создается одним кликом как квадрат 200x200 по центру клика, а devices и locked объекты выбираются по всему визуальному блоку.
- `Room` теперь можно изменять по размеру перетягиванием за края и углы.
- Добавлен undo/redo через `Ctrl+Z`, `Ctrl+Shift+Z` и `Ctrl+Y` для изменений объектов, зон, плана и устройств.
- Добавлены copy/paste hotkeys (`Ctrl+C`, `Ctrl+V`) для выбранного устройства или элемента плана.
- Добавлен режим просмотра по умолчанию и ручное включение режима редактирования.
- В просмотре отключены опасные действия: drag, resize, rotate, delete и поля редактирования.
- В карточке устройства добавлен явный CTA для перехода в режим редактирования.
- Поле пароля в карточке устройства расширено; в скрытом состоянии оно показывает маску `*`, а при `Показать пароль` раскрывает реальное значение в том же поле.
- Добавлены collapsible left/right panels.
- Действия project JSON save/load, JPG export и CSV export перенесены в меню `Файл`.
- Клики по объектам в sidebar выбирают объект и открывают правую панель.
- Левая sidebar-панель переделана в lightweight explorer layout: breadcrumb сверху, scrollable tree объектов/зон, прямой `+` для создания объекта, hover actions, inline rename и без постоянной формы редактирования.
- В левой sidebar-панели верхний `+` в блоке `Структура` теперь создаёт объект напрямую, без выпадающего меню; кнопка `+` у строки объекта создаёт дочернюю зону/этаж в текущей модели данных.
- Правая панель получила pin toggle и закрывается при blank-canvas deselection, если не закреплена.
- Левая и правая панели работают как overlay drawers, поэтому открытие панели не сдвигает canvas.
- Правая properties panel сделана уже, чтобы оставлять больше места для canvas.
- Сохраняются viewport карты и состояние overlay-панелей (`leftCollapsed`, `rightCollapsed`, `rightPinned`) между перезапусками приложения.
- При старте приложение больше не показывает промежуточную демо-карту: до гидратации выводится нейтральный loader, затем открывается сохранённый план.
- Для восстановления последнего проекта добавлен backup snapshot в `localStorage`: IndexedDB остаётся основным хранилищем, а backup страхует старт, если IndexedDB недоступен или не успел записаться.
- Верхняя левая подпись на карте теперь показывает текущий объект и зону из левого меню вместо служебной подсказки режима.
- Верхняя левая подпись на карте сдвинута правее, чтобы не перекрываться кнопкой раскрытия левого меню.
- При старте `roomColorPreset` теперь сбрасывается на чёрный, чтобы новые помещения не наследовали старый цвет между запусками.
- Новые `Room` теперь создаются чёрными независимо от выбранного preset color в правой панели.
- Дверь теперь фиксируется по последней валидной привязке к стене/грани комнаты, с fallback на линию жеста при отпускании мыши.
- В верхней панели `Файл`, `Редактирование` и `Все устройства` перенесены в начало строки рядом с названием приложения.
- Нативное Electron-меню `File / Edit / View / Window / Help` отключено, чтобы остался только собственный toolbar приложения.
- В верхней панели добавлен раздел `Помощь` с пунктами `О программе` и `Обновить программу`.
- `О программе` показывает номер версии приложения, полученный из Electron runtime.
- `Обновить программу` открывает диалог сравнения версий и вручную проверяет latest release на GitHub через прямой API-запрос.
- Диалог `Обновить программу` показывает версию текущей сборки и версию на GitHub, а кнопка `Обновить` активируется только при расхождении версий.
- При отсутствии обновлений диалог сообщает `Обновлено до последней версии.` и не держит loader постоянно.
- Проверка latest release на GitHub ограничена таймаутом, чтобы окно не зависало в состоянии `Проверяем...` при сетевых проблемах.
- При старте приложение тихо проверяет latest release на GitHub и подсвечивает кнопку `О программе` зелёным, если доступна более новая версия.
- Dev-запуск `dev:desktop` переведён на strict port `5173`, а Electron запускается с локальным `userData/sessionData` и `swiftshader` fallback, чтобы не уезжать на `5174` и не упираться в AppData/GPU cache issues.
- Верхняя кнопка `Помощь` переименована в `О программе` и теперь сразу открывает окно обновления, без промежуточного выпадающего меню.
- Версия приложения поднята до `0.2.22`; локальный Windows installer `release\CamPlan-Installer-0.2.22.exe` собран для ручного теста update flow перед публикацией релиза.
- В верхней панели акцент режима редактирования перенесён с отдельного бейджа на кнопку `Завершить редактирование`, чтобы статус не дублировался в конце строки.
- При завершении редактирования больше не показывается отдельная надпись `Изменения сохранены` в верхней строке, остаётся только текст на кнопке.
- В верхней панели удалена строка `Автосохранение • время`, чтобы тулбар был чище и стабильнее по ширине.
- Исправлен выбор устройств на плане: клик по текстовой подписи внутри устройства (`DVR`, `NVR`, `PoE`, `SW`) теперь выбирает устройство так же, как клик по корпусу.
- Исправлена packaged-раздача статических assets из `dist/client`, чтобы свежий Windows `exe` открывал нормальный UI вместо unstyled/black screen.
- Для камеры обновлены порядок и компоновка полей в правой панели: `IP-адрес` теперь открывает web-link, а `Показать` и `Скопировать` пароль находятся в строке input.
- При закреплённой правой панели blank-click на карте больше не снимает selection с текущего объекта.
- Правая overlay-колонка переведена на flex-раскладку, чтобы кнопка сворачивания не отъедала высоту у properties panel и нижний `Поворот` был виден в режиме просмотра.
- Для карточки камеры из правого меню убраны вспомогательные поля `Серийный номер`, `Ответственный`, `Дата последней проверки` и отдельная `Web-строка`.
- Блок `Связи` в карточке устройства поднят выше по форме, а список подключений стал выше по внутреннему скроллу, чтобы не прятаться в самом низу панели.
- Для камеры добавлен отдельный read-only блок `Связь`, который показывает подключённое устройство и тип соединения.
- В карточке устройства `Статус` поднят над `Тип устройства`, а `Место установки` перемещено сразу под `Название`.
- Web-link камеры теперь корректно открывает `host:port` в браузере без принудительного `:80`.
- Инструмент `Помещение / Room` теперь поддерживает drag-to-draw прямоугольника, а одиночный клик по-прежнему создаёт квадрат 200x200.
- Инструмент `Door` теперь создаётся drag-to-draw жестом по стене или грани комнаты, а сторона двери определяется направлением рисования.
- При активном `Door` курсор над стеной или гранью комнаты показывает hover-preview двери, а drag по этой поверхности ставит дверь на ближайшую поверхность.
- Пока активен инструмент `Door` или другой инструмент рисования, клик по существующим объектам на карте не меняет selection.
- Дефолтные цвета плана выровнены: `room` и `wall` рисуются чёрным по умолчанию, `door` — коричневым, а быстрый выбор цвета в панели ограничен шестью базовыми цветами.
- Кабели `UTP` и `Coacsil/coaxial` теперь рисуются тем же пунктирным стилем, что и `FTP`.
- Для `room` и `wall` добавлена настройка толщины линии в правой properties panel, и рендер теперь берёт её из `strokeWidth` элемента.
- Для новых `room` и `wall` толщина линии по умолчанию теперь равна `2`.
- Добавлены команды:
  - `npm run dev`
  - `npm run dev:desktop`
  - `npm run build`
  - `npm run dist:win`
- `npm run dev` и `npm run dev:desktop` теперь запускают Vite в strict port mode, чтобы dev-сервер не молча переезжал с `5173` на другой порт.

## Проверено

- `npm run build` проходит.
- `src\components\Sidebar.tsx` проходит точечный ESLint.
- `npm run dist:win` собирает Windows installer.
- 22.05.2026 `npm run dist:win` успешно собрал Windows installer `release\CCTV Manager Setup 0.2.0.exe`.
- 14.05.2026 исправлена высота центральной рабочей области: `PlanCanvas` теперь занимает всю доступную высоту между toolbar и нижним краем окна, а SVG/grid растянуты на весь контейнер.
- 15.05.2026 после доработки старта без demo data, восстановления snapshot и empty-state `npm.cmd run build` проходит.
- 15.05.2026 empty-state централизован: в пустом проекте показана центральная CTA-кнопка `+` для открытия JSON-проекта, а центральная подсказка больше не использует испорченный текст.
- 15.05.2026 центральная CTA-кнопка в empty-state снова кликабельна: у overlay убран `pointer-events-none`, который блокировал действие.
- 15.05.2026 кнопка `+` в левой панели открывает файл проекта `JSON` с компьютера, а импорт сохраняется обратно в IndexedDB.
- 15.05.2026 в меню `Файл` добавлен `Новый проект`: текущий snapshot можно закрыть с подтверждением и сбросить к пустому проекту; диалог теперь даёт `Сохранить`, `Нет` и `Отмена`.
- 15.05.2026 нижние кнопки `+/-/Сброс` на canvas теперь меняют zoom по текущему viewport, а `Сброс` вызывает тот же fit-to-view, что и `Ctrl+0`.
- После redesign левой sidebar-панели `npm.cmd run build` проходит.
- Dev server запущен на `http://127.0.0.1:5173` и отвечает HTTP 200.

## Не проверено вручную

- Ручной запуск свежего Windows installer `release\CCTV Manager Setup 0.2.0.exe`.
- Полный сценарий создания объекта, зоны, устройств, элементов плана и кабеля в Electron-окне.
- Сохранение и открытие проекта через меню `Файл`.
- JPG export плана.
- CSV export таблицы всех устройств.
- Поведение overlay-панелей, collapsed state и pin правой панели после relaunch.
- Новый explorer-style layout левой sidebar-панели в реальном Electron-окне: scroll длинного дерева, hover actions и inline rename.
- Изменение размера `Room` по краям и углам в реальном Electron-окне.
- Undo/redo и copy/paste hotkeys в Electron-окне.
- Legacy JSON import с `cameras`, если будет тестовый файл.
- Полный `npm run lint` требует отдельной formatting pass по существующим файлам проекта: сейчас падает на старых Prettier-ошибках вне `Sidebar.tsx`.

## Последнее изменение

- Правая overlay-колонка переведена на flex-раскладку, чтобы в режиме просмотра нижний `Поворот` у камеры не обрезался.
- Состояние viewport карты и overlay-панелей теперь сохраняется в `settings.uiState` и восстанавливается при следующем запуске.
- Стартовый экран теперь ждёт гидратации стора, чтобы не мигала чужая карта перед восстановлением сохранённого плана.

- Старт приложения больше не показывает demo data: при пустом IndexedDB открывается empty-state, а при наличии snapshot восстанавливаются activeObjectId / activeFloorId.
- Последний snapshot теперь также дублируется в `localStorage`, чтобы приложение поднимало последний проект даже при проблемах с IndexedDB на закрытии/старте.

## Дополнение 09.05.2026

- Правая properties panel теперь скроллится внутри контейнера, чтобы нижние поля камеры, включая `Место установки`, не уходили за экран.
- Для камер RTSP-блок заменён на кликабельную Web-строку, открывающую `http://<ip>:80` во внешнем браузере.

## Дополнение 10.05.2026

- Добавлено множественное выделение на плане: `Ctrl` + левая кнопка мыши по пустому месту карты рисует рамку выбора, а `Ctrl` + клик по объекту добавляет его в текущее выделение.
- Рамка `Ctrl`-выделения теперь также захватывает кабели, если их линия пересекает выделенную область.
- После завершения рисования новый кабель сразу получает selection, чтобы открывалась правая панель его свойств.
- Правая панель при множественном выделении показывает раскрывающийся список по выбранным объектам, а на главной карточке доступны кнопки группировки и разгруппировки.
- Для grouped devices/elements добавлен `groupId`; при перетаскивании одного участника группы сдвигается вся группа.
- Если в редакторе выбрано несколько объектов, drag по одному из выбранных теперь перемещает весь набор выбранных объектов вместе.
- Во время `Ctrl`-drag по пустому месту карты теперь отображается видимая синяя рамка выделения, которая двигается вместе с курсором до отпускания мыши.
- В режиме просмотра группировка не расширяет selection: при выходе из редактора текущее выделение схлопывается до одного объекта, а группа остаётся только для совместного перемещения в редактировании.

## Дополнение 11.05.2026

- При запуске приложения карта автоматически подгоняется под все объекты активного этажа с safe-padding, чтобы они были в безопасной видимой зоне.
- Ctrl-рамка выбора теперь использует расширенный hit-test по полилинии кабеля, чтобы кабели выбирались так же, как объекты.
- Ctrl-рамка выбора кабелей теперь использует расширенный hit-test: bounding box полилинии + запас по толщине линии.
- Ctrl-рамка выбора кабелей перешла на более стабильный hit-test по толстой полосе сегмента, а не только по тонкой линии.
- Multi-select для кабелей теперь подсвечивает все выбранные соединения на canvas, а в правой панели показывает endpoint-описание для каждого кабеля.
- При смене типа кабеля в правом меню его `label` автоматически синхронизируется с новым типом.
- Подпись кабеля на canvas теперь ставится по первой половине полилинии и поворачивается вдоль локального сегмента.
- В `settings.uiState` теперь сохраняются viewport карты и состояние overlay-панелей; viewport дополнительно хранится по `floorId`, чтобы каждый этаж открывался в последнем оставленном пользователем положении.
- Восстановление viewport при переключении этажа теперь выполняется до отрисовки кадра, чтобы карта не мигала старым масштабом перед правильным положением.
- Горячая клавиша `Ctrl+0` теперь центрирует карту активного этажа, подгоняет масштаб под все объекты этажа и сохраняет этот viewport для текущего этажа.
- Подгонка карты по `Ctrl+0` снова учитывает все элементы этажа, но рассчитывает видимую область с фактическими overlay-отступами открытого левого и правого меню, чтобы элементы не попадали под панели.
- Safe-padding у `Ctrl+0` уменьшен, чтобы план занимал свободную область между открытыми меню плотнее и выглядел как ожидаемый fit, а не чрезмерно отдалялся.
- Математика `Ctrl+0` переписана через явный `scale` и центр доступной области canvas: fit теперь использует реальные размеры контейнера, вычитает overlay-панели из доступной ширины и центрирует bounds активного этажа внутри свободной области между меню.
- `Ctrl+0` теперь различает два DOM-режима layout автоматически: если панели реально перекрывают canvas, fit вычитает только фактическое горизонтальное overlap; если canvas уже ужат между панелями, overlap остаётся `0` и панельные ширины второй раз не применяются.
- В toolbar добавлен переключатель `Показать IP адреса`; состояние сохраняется в `settings.uiState`, а canvas показывает компактные IP-подписи у устройств с заполненным IP.
- Инструмент `Text` больше не использует `prompt`: при клике на карту появляется inline-input на месте клика, а текст фиксируется Enter или blur.
- Верхний инструмент `Удалить` убран из тулбара, чтобы не дублировать delete-кнопки в карточках объектов.
- Empty Text draft now disappears on blur or blank-canvas click, while filled text still commits from Enter, blur, or a canvas click.
- Text draft focus is now pinned to the draft id, so typed characters no longer get replaced one by one.
- Text overlay now shows an explicit Enter hint beside the inline input to make confirmation clearer.
- Clicking back onto the map now commits the current Text draft instead of starting a second text element.
- The inline Text draft hint was removed, and text elements now expose a font-size field in the right properties panel.
- Text properties were simplified: width/height inputs were removed, and the canvas block now resizes together with text size and label length.
- Cursor UX on the map was normalized: empty canvas keeps pan affordance, movable objects show move/grabbing cursors in edit mode, and cable line/point hover keeps the standard black arrow cursor without jumping over dashed cable gaps, cable edges, or small cable-point handles.
- Cable endpoint handles now become selected like route-point handles; Delete/Backspace removes the selected handle, line click clears the selected handle, and deleting an endpoint shortens the cable to the nearest route point when possible.
- While dragging a cable point or cable endpoint, the cursor now stays as the standard black arrow until the mouse button is released.
- When a selected cable is attached to a device, dragging that endpoint device now grabs the cable endpoint first, allowing the cable to be detached without moving the device.
- Cable hover highlight and tooltip are now suppressed while any object, wall handle, cable point, or selection is being dragged across the canvas.
- The camera properties panel now highlights missing important fields `IP-адрес` and `Пароль` in orange, matching the orange warning dot shown on the map.
- Camera password input now uses native `password`/`text` modes instead of a custom transparent text mask, fixing caret, selection, and delayed typing behavior.
- In the `Все устройства` table, clicking the masked password now reveals the real password inline for the selected row.
- In the `Все устройства` table, the redundant `Правка` action was removed; `На план` remains as the single navigation action in edit mode.
- In the `Все устройства` table, the `Объект` and `Зона` columns are clickable and sort rows by object and floor name.
- In the `Все устройства` table, the active top filter selects are highlighted with a red outline so the current filter state is obvious.
- In the left sidebar, the top `+` creates an object directly and returns focus to the plan canvas instead of opening inline rename.
- The object-row `+` creates a child floor/zone and also returns focus to the plan canvas.
- Sidebar object and floor rename fields are rendered outside nested buttons, so manual rename through pencil or double click remains editable.
- Sidebar rename inputs now handle printable keys, Backspace/Delete and paste directly on `keydown`/`paste`, so newly created objects remain editable even if Electron misses a normal React `change` event.
- Clicking the plan canvas now blurs any active sidebar rename input first, committing the entered object/zone name and moving focus back to the map.
- Sidebar rename commit now also runs on global outside `pointerdown`, so clicks on the plan, right panel or another sidebar row reliably finish the active rename; draft typing also previews the name in store so the right properties panel updates in sync.
- Temporary rename diagnostics and `Ctrl+0` fit debug output were removed from the codebase; the app no longer writes those debug events to the dev console or shows the fit overlay on the canvas.
- Creating a new object now automatically creates its first `Новая зона`, activates that zone, and opens the object branch in the left sidebar.
- Fixed mojibake labels in `PlanCanvas`: newly created rooms, devices, text input placeholder, hover tooltips and the empty object caption now use proper Russian text.
- Added a defensive mojibake repair layer in `store.ts` for default object, floor, map element and device names, so newly created cameras/devices/rooms cannot keep known broken Russian labels even if a stale creation path passes them in.
- Replaced SVG emoji glyphs on the plan canvas with stable text/SVG marks: camera now shows `CAM`, switch/device badges use ASCII letters, and locked objects/cables use a drawn SVG lock instead of broken emoji symbols.
- While any draw tool is active, hover over rooms/objects no longer switches the cursor away from the drawing crosshair.
- Wall drawing now locks its direction after the first meaningful drag movement, so horizontal/vertical/diagonal wall previews no longer flicker between axes while the mouse is moved sideways.
- Door placement on diagonal `wall` elements now stores the wall angle and renders the door rotated along that diagonal wall.
- Resizing a selected door now changes its length along the door/wall axis, so diagonal doors grow and shrink along the wall they are attached to.
- Door resize now scales the door arc thickness proportionally with its length, so the curved door head grows together with the door span.
- Added a `Полукруглая стена` editor tool that creates `wall` elements with `wallShape: arc`, renders them as curved SVG paths, and exposes `Изгиб полукруга` in the right properties panel.
- Selected walls now show resize squares on both endpoints; dragging either endpoint extends or shortens the wall along its current direction, and on mouse release the endpoint auto-fits to a nearby intersecting wall or room border.
- Moving a selected wall now uses the same release auto-fit: if one endpoint square lands near another wall or room border, that endpoint is extended or shortened to the nearest valid junction.
- While `Стена` or `Полукруглая стена` is active, hovering existing objects keeps the drawing cursor and clicking over them starts a new wall instead of selecting/moving the object.
- Wall tools now discard accidental click-only drafts: a wall is saved only after the dragged line reaches a minimum grid-step length.
- While drawing `Стена` or `Полукруглая стена`, the start and end points now snap to nearby existing wall lines and room borders, making wall-to-wall and wall-to-room joins easier to connect cleanly.
- Selected walls now rotate from an endpoint handle around the opposite end, so dragging one end changes wall angle instead of only stretching the line.
- Wall drawing now follows the cursor in any direction with grid snapping, without axis jitter while dragging.
- Selected wall endpoint dragging now uses the live pointer distance, so existing walls can be resized and re-angled with the same feel as a newly drawn wall.
- Room tool can now start a new room even when the cursor is over an existing room, so existing geometry no longer blocks room creation.
- Switching to any non-select tool now clears current map selection immediately, so previously marked objects no longer stay highlighted while drawing.
- Added GitHub Actions release workflow that publishes Windows installer assets on tag push `v*` into the GitHub release repo configured for `electron-updater`.
- Added a renderer Content Security Policy in the root HTML shell and relaxed script policy enough for TanStack Start inline bootstrap scripts to run in Electron dev/prod without blocking the app.
- Fixed runtime update lookup so packaged builds can still resolve the GitHub releases repo even when the shipped `package.json` does not include `build.publish`.
- Replaced the packaged update download path with a direct GitHub release asset download/open flow so the update button no longer depends on `electron-updater` cache path internals and avoids the `path` undefined crash.
- Hardened the direct update download path so missing release asset metadata falls back to a synthesized installer filename instead of crashing on `path.join(...)`.
- The direct update installer now waits for an explicit confirmation after download, then starts from a detached delayed helper only after the app is quitting.
- Removed modal `alert()` dialogs from project open/import flows so opening a file no longer shows a blocking system window; failures now go to the console.
- File menu save/export actions are disabled until the project contains content, so empty projects stay passive for Save Project, JPG export, and CSV export.
- Released `0.2.14` with the confirmation-first detached installer launcher and with the `CamPlan` product name.
- Prepared `0.2.22` locally with a hidden detached PowerShell launcher that writes `%TEMP%\CamPlanUpdateLauncher.ps1`, `%TEMP%\CamPlanUpdateDebug.log`, and `%TEMP%\CamPlanUpdateError.log`; the launcher now waits for the Electron PID to exit, starts invisibly during QA, and falls back to `shell.openPath` or detached `cmd start` if PowerShell spawn fails. A custom `build/installer.nsh` suppresses the default NSIS running-app check because the app is already closed before installation. The GitHub release has not been published yet.
- Wall endpoint rotation drag no longer cancels on canvas exit; the drag stays active when the cursor leaves and re-enters the field, and it ends on mouseup even if release happens outside the SVG.
