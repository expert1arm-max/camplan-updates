# Project Roadmap

## Этап

MVP desktop-версии реализован. Сейчас проект находится на этапе ручной QA-проверки Electron-сборки и доведения UX-мелочей.

## Сейчас
- Verify startup restores the last project using IndexedDB with a `localStorage` backup fallback when IndexedDB is unavailable or stale.
- Verify Save Project, JPG export, and CSV export stay disabled while the project is empty and become active only after content exists.
- Проверить, что при запуске приложение тихо проверяет latest release на GitHub, а кнопка `О программе` подсвечивается зелёным при наличии более новой версии.
- Проверить, что в empty-state центральная кнопка `+` открывает JSON-проект с компьютера и скрывается после появления объектов.
- Проверить, что кнопка `+` в левой панели открывает JSON-файл проекта с компьютера и импортирует его в текущее состояние.
- Проверить, что пункт `Новый проект` в меню `Файл` спрашивает подтверждение, даёт `Сохранить/Нет/Отмена`, закрывает текущий snapshot и создаёт пустой проект.

- Проверить свежий Windows installer `release\CamPlan-Installer-0.2.22.exe` на запуск, отображение стилей и update-launch логирование.
- Проверить старт в режиме `Просмотр` и переход в `Редактирование` кнопкой.
- Проверить masked-input пароля в карточке устройства: ввод, отображение `*` и показ реального значения.
- Проверить, что в таблице `Все устройства` клик по маске пароля раскрывает реальный пароль в этой же строке.
- Проверить инструмент `Кабель` как polyline: single click добавляет точки, double click завершает, handles редактируют маршрут.
- Проверить snap кабеля к устройствам и редактирование endpoint/route points.
- Проверить одноразовый `Room` tool: после создания помещение возвращает режим на `select`, а новый room берет preset color из палитры.
- Проверить один-клик создание `Room` 200x200 и выбор устройств по их визуальному блоку.
- Проверить resize `Room` перетягиванием за края и углы.
- Проверить цвета, `locked` и selection UX на плане: outline-only rooms, выбор по рамке/линии и сброс по клику вне объекта.
- Проверить undo/redo по горячим клавишам в Electron-окне.
- Проверить copy/paste выбранного устройства или элемента плана по горячим клавишам.
- Проверить меню `Файл`: save/load JSON, JPG export, CSV export.
- Проверить overlay layout: левая/правая панели не должны сдвигать canvas.
- Проверить новый lightweight explorer layout левой панели: scroll длинного списка, breadcrumb, прямой `+` для создания объекта, hover actions и inline rename.
- Проверить, что верхний `+` в блоке `Структура` создаёт объект напрямую, без dropdown, а `+` у строки объекта создаёт дочернюю зону/этаж.
- Проверить pin правой панели и поведение закрытия при blank-canvas deselection.
- Проверить новый порядок и inline-компоновку полей камеры в правой properties panel.
- Проверить, что при закреплённой правой панели клик по пустому месту карты не снимает selection.
- Проверить, что правая overlay-колонка больше не режет нижние поля камеры в режиме просмотра.
- Проверить, что после закрытия, повторного запуска и переключения этажей восстанавливается отдельный viewport каждого этажа и состояние левой/правой панелей.
- Проверить, что при старте больше не видна промежуточная демо-карта до загрузки сохранённого проекта.
- Проверить, что верхняя левая подпись на карте показывает `Объект - Зона` из левого меню вместо служебной подсказки.
- Проверить, что верхняя левая подпись на карте не перекрывается кнопкой открытия левого меню.
- Проверить, что новые комнаты после перезапуска снова стартуют чёрными, даже если до этого был выбран другой preset color.
- Проверить, что новые комнаты всегда создаются чёрными, даже если в правой панели выбран другой preset color.
- Проверить, что дверь фиксируется после отпускания мыши и не остаётся только в preview.
- Проверить, что в верхней панели `Файл`, `Редактирование` и `Все устройства` стоят в начале строки.
- Проверить, что бейдж `Просмотр/Редактирование` находится в конце строки и не сдвигает кнопки при переключении режима.
- Проверить, что при завершении редактирования в верхней строке не появляется отдельное сообщение `Изменения сохранены`.
- Проверить, что строка `Автосохранение • время` в верхней панели больше не отображается.
- Проверить, что карточка камеры в правом меню стала короче за счёт удаления `Серийный номер`, `Ответственный`, `Дата последней проверки` и `Web-строка`.
- Проверить, что блок `Связи` в карточке устройства виден без ухода в самый низ панели, а список подключений читается сразу.
- Проверить, что у камеры в карточке отображается read-only блок `Связь` с названием присоединённого устройства.
- Проверить новый порядок полей: `Статус` над `Тип устройства`, `Место установки` сразу под `Название`.
- Проверить, что web-link камеры с портом вроде `192.168.1.101:8080` открывается в браузере как обычный URL, а не как путь Windows.
- Проверить новый `Room` tool: drag создаёт прямоугольник, а одиночный клик создаёт квадрат 200x200.
- Проверить новый `Door` tool: дверь создаётся drag-to-draw жестом по стене или грани комнаты, а сторона определяется направлением рисования.
- Проверить hover-preview двери на стене или грани комнаты и постановку двери drag-gestures по этой поверхности.
- Проверить, что при активном инструменте `Door` клик по объектам не меняет selection и не переключает правую панель.
- Проверить, что `room` и `wall` по умолчанию создаются чёрными, `door` — коричневой, а в правой панели доступны только шесть быстрых цветов.
- Проверить, что `UTP` и `Coacsil/coaxial` кабели рисуются пунктиром так же, как `FTP`.
- Проверить настройку толщины линии у `room` и `wall` в правом меню и её сохранение после редактирования.
- Проверить, что новый `room` и `wall` по умолчанию создаются с толщиной линии `2`.
- При необходимости убрать оставшиеся lint warnings в shared UI.

- После запуска проверить, что empty-state исчезает после создания первого объекта/этажа и что повторный старт открывает последний snapshot.

## Следующий шаг

Провести ручную проверку свежего Windows installer по `qa-checklist.md`:

- создание объекта и зоны;
- добавление и редактирование устройств;
- добавление элементов плана;
- добавление и редактирование кабеля;
- изменение размера `Room` за края и углы;
- импорт и экспорт JSON;
- экспорт CSV и JPG;
- undo/redo через `Ctrl+Z`, `Ctrl+Shift+Z`, `Ctrl+Y`;
- copy/paste через `Ctrl+C`, `Ctrl+V`;
- проверка режима `Просмотр` и ручного включения `Редактирование`;
- проверка overlay-панелей, collapsed state и pin правой панели.
- проверка нового explorer-style UX левой sidebar-панели.
- проверка нового порядка полей камеры и поведения blank-click при pinned правой панели.
- проверка, что нижний `Поворот` у камеры виден в режиме просмотра и контент реально доскролливается до конца.

## После QA

- Исправить найденные UX/логические ошибки.
- Обновить `project-progress.md` результатами ручной проверки.
- Если изменения существенные, собрать новую Windows-сборку и сделать git commit.

## Сейчас
- Проверить свежий Windows installer `release\CamPlan-Installer-0.2.22.exe` на множественное выделение, раскрывающийся список в правой панели и группировку объектов.
- Проверить, что `Ctrl` + drag по пустому месту карты действительно рисует рамку выбора, а `Ctrl` + клик по объекту расширяет выделение.
- Проверить, что рамка `Ctrl`-выделения также захватывает кабели, если их линия пересекает box.
- Проверить, что после завершения рисования кабель сразу выделяется и открывает правую панель свойств.
- Проверить group/ungroup и перетаскивание grouped объектов как одного блока.
- Проверить, что drag по одному из нескольких выбранных объектов двигает весь набор выбранных объектов вместе.
- Проверить, что в режиме просмотра группа не влияет на выбор объекта, а расширение selection работает только в редакторе.

## Следующий шаг

- Провести ручную QA-проверку свежего Windows installer по обновлённому сценарию multi-select/grouping и затем исправить найденные UX/логические ошибки.
- Проверить, что синяя рамка выделения во время `Ctrl`-drag видна всегда и не конфликтует с pan/room tools.
- Проверить, что сохранённые viewport и состояние панелей не перетираются стартовым auto-fit после перезапуска.

## Дополнение 11.05.2026

- Проверить автоцентрирование карты при старте: все объекты активного этажа должны попадать в безопасную видимую зону.
- Если на старте есть глубокая ссылка/подсветка объекта, убедиться, что авто-fit не ломает явный фокус.
## Дополнение 11.05.2026

- Проверить, что Ctrl-рамка выбора стабильно выделяет не только объекты, но и кабели по всей длине полилинии.
## Дополнение 11.05.2026

- Проверить, что Ctrl-выделение кабелей стало стабильным после добавления расширенного hit-test по bounding box и толщине линии.
## Дополнение 11.05.2026

- Проверить, что кабели в Ctrl-рамке выбираются по более стабильной полосе сегмента, а не только по тонкой математической линии.
## Дополнение 11.05.2026

- Проверить, что при multi-select кабелей все выбранные соединения подсвечиваются на canvas, а правая панель показывает отличимые подписи по endpoint-ам.
## Дополнение 11.05.2026

- Проверить, что при смене типа кабеля в правом меню имя кабеля автоматически синхронизируется с новым типом.
## Дополнение 11.05.2026

- Проверить, что подписи кабелей на ломаных маршрутах лежат на первой половине линии и читаются вдоль сегмента.
- Провести ручную проверку нового inline-ввода текста на карте: клик по инструменту `Text`, ввод на месте, сохранение Enter/blur и отмена Esc.
- Проверить, что удаление осталось доступным из карточек объектов и по горячим клавишам, а отдельная кнопка `Удалить` в тулбаре не показывается.
- Verify the updated Text draft UX: blur or blank-canvas click on empty input removes the draft, while filled text commits onto the map.
- Re-test the canvas Text tool after the focus fix to confirm multi-character typing works normally and blur no longer erases the draft.
- Re-check the inline Text UX after adding the Enter hint, especially save-on-blur behavior and visual placement.
- Re-test Text creation after the canvas-click commit fix to confirm the draft survives until it is explicitly committed or cancelled.
- Verify that text font-size edits in the right panel immediately affect the canvas label size.
- Verify that text size changes keep the selection block and label synchronized after the width/height cleanup.
- Verify cable cursor UX in edit mode: hovering a cable line, dashed gap, edge, or editable point handle should keep the standard black arrow cursor without flicker while click selection and point editing still work.
- Verify cable point deletion: route handles should turn selected and delete only that route point; endpoint handles should turn selected and Delete/Backspace should remove that endpoint by shortening the cable when a neighboring route point exists; clicking the line should clear handle selection.
- Verify cable point drag cursor: while a cable route point or endpoint is being dragged, the cursor should remain the standard black arrow until mouseup.
- Verify cable endpoint detach UX: with a cable selected and attached to a device, dragging the attached device area should detach/move the cable endpoint instead of moving the device.
- Verify cable hover during drag: while dragging an object, wall endpoint, cable point, or selection across a cable, the cable should not highlight and should not show its tooltip.
- Verify camera required-field warnings: empty `IP-адрес` or `Пароль` should be highlighted in orange in the right panel and should clear after the value is filled.
- Verify camera password input: hidden mode should keep normal caret/selection/typing behavior, and the eye button should reveal or hide the real value.
- Verify map IP labels: `Показать IP адреса` should toggle compact labels on the map only for devices with non-empty IP values, and the toggle state should persist.
- Verify per-floor viewport memory: leave each floor at a different zoom/pan, switch between floors from the left menu, and confirm every floor restores its own last viewed map position without briefly flashing the previous floor zoom.
- Verify `Ctrl+0` map fit: pressing `Ctrl+0` should fit all active-floor elements tightly inside the visible canvas area, accounting for open left/right overlay menus so plan items do not sit under those panels and the plan is not over-zoomed out.
- Re-check `Ctrl+0` after the explicit scale/pan rewrite: with left/right panels open and closed, the active-floor bounds should center inside the free canvas strip without drifting or leaving oversized empty margins.
- Re-check the new DOM overlap detection for `Ctrl+0`: when panels are true overlays the fit should subtract only their real overlap with canvas, and when canvas is already constrained between panels it should not subtract them a second time.
- Verify full-height canvas layout in `dev:desktop`: the central grid must reach the bottom edge of the window, and only after that re-check `Ctrl+0` fit/debug numbers.
- Verify diagonal wall doors: placing `Door` on a diagonal `wall` should preview and create a door rotated along the wall angle.
- Verify door resize on diagonal walls: dragging the selected door resize handle should grow/shrink the door along the wall axis instead of screen X/Y.
- Verify proportional door resize: increasing a door should also thicken the curved door head proportionally, including on diagonal walls.
- Verify `Полукруглая стена`: drag should create a curved wall, selection should work on the arc hit area, and `Изгиб полукруга` should update the curve in the right panel.
- Verify wall endpoint resize and release snap: selected straight and curved walls should show endpoint squares on both ends; dragging either endpoint should extend or shorten the wall along its current direction, and releasing near an intersecting wall or room border should auto-fit the endpoint to that structure.
- Verify moved wall release snap: when dragging the whole selected wall, releasing it with one endpoint square near another wall or room border should auto-fit that endpoint to the nearest valid junction.
- Verify wall drawing over existing objects: with `Стена` or `Полукруглая стена` active, hovering other objects should keep the drawing cursor and click-drag should start a new wall at that point.
- Verify wall minimum length: a single click with `Стена` or `Полукруглая стена` should not leave a dot/zero-length wall; only a dragged minimum-length line should be saved.
- Verify wall and room snapping: while drawing `Стена` or `Полукруглая стена`, starting or ending near another wall or room border should magnet to that structure; normal grid/direction drawing should remain available away from structures.
- Verify GitHub Actions release publishing on tag push `v*` and confirm `electron-updater` can consume the published GitHub release.

## Дополнение 22.05.2026

- Verify the update dialog now shows the current app version and the GitHub version first, and only enables `Обновить` when the versions differ.

## Р”РѕРїРѕР»РЅРµРЅРёРµ 23.05.2026

- Verify the `РћР±РЅРѕРІРёС‚СЊ` button now downloads the Windows installer directly from the latest GitHub release asset and launches it without relying on `electron-updater` cache path logic.
- Verify the direct update flow also survives incomplete release asset metadata by falling back to a synthesized installer filename instead of throwing `path ... undefined`.
- Verify the downloaded installer keeps running after the app exits, and that the launcher waits for `CamPlan.exe` by name instead of PID before starting the installer.
- Verify opening a project file from the canvas or toolbar does not show a modal system alert after successful import.
- Verify wall endpoint rotation keeps the drag active when the cursor leaves and re-enters the canvas, and that mouseup outside the SVG still ends the interaction cleanly.
- Verify the installer launched by the update flow is started only after the user confirms the dialog, the app exits cleanly first, and the installer opens once from a detached delayed helper.

## Р вЂќР С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р Вµ 24.05.2026

- Проверить локально собранный Windows installer `release\CamPlan-Installer-0.2.22.exe` на ручной сценарий обновления перед публикацией релиза.
- Проверить, что update-install logging фиксирует путь установщика, факт существования файла, выбранный метод запуска и скрытый PowerShell launcher в QA.
- Проверить, что ожидание PID Electron, immediate `app.exit(0)` и custom `build/installer.nsh` убирают prompt NSIS про закрытие CCTV Manager/CamPlan.
