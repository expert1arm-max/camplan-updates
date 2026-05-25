# Project Roadmap

## Р­С‚Р°Рї

MVP desktop-РІРµСЂСЃРёРё СЂРµР°Р»РёР·РѕРІР°РЅ. РЎРµР№С‡Р°СЃ РїСЂРѕРµРєС‚ РЅР°С…РѕРґРёС‚СЃСЏ РЅР° СЌС‚Р°РїРµ СЂСѓС‡РЅРѕР№ QA-РїСЂРѕРІРµСЂРєРё Electron-СЃР±РѕСЂРєРё Рё РґРѕРІРµРґРµРЅРёСЏ UX-РјРµР»РѕС‡РµР№.

## РЎРµР№С‡Р°СЃ
- Verify startup restores the last project by selecting the freshest persisted snapshot between IndexedDB and the `localStorage` backup, instead of trusting backup storage first.
- Verify Save Project, JPG export, and CSV export stay disabled while the project is empty and become active only after content exists.
- Verify the restore flow persists imported JSON immediately to both IndexedDB and `localStorage`, and that an empty startup snapshot never overwrites a valid saved project.
- Use temporary QA logs to prove which storage write path emits an empty snapshot after import, then keep only the guard that blocks empty overwrite unless the action was an explicit `new-project-confirmed`.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РїСЂРё Р·Р°РїСѓСЃРєРµ РїСЂРёР»РѕР¶РµРЅРёРµ С‚РёС…Рѕ РїСЂРѕРІРµСЂСЏРµС‚ latest release РЅР° GitHub, Р° РєРЅРѕРїРєР° `Рћ РїСЂРѕРіСЂР°РјРјРµ` РїРѕРґСЃРІРµС‡РёРІР°РµС‚СЃСЏ Р·РµР»С‘РЅС‹Рј РїСЂРё РЅР°Р»РёС‡РёРё Р±РѕР»РµРµ РЅРѕРІРѕР№ РІРµСЂСЃРёРё.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РІ empty-state С†РµРЅС‚СЂР°Р»СЊРЅР°СЏ РєРЅРѕРїРєР° `+` РѕС‚РєСЂС‹РІР°РµС‚ JSON-РїСЂРѕРµРєС‚ СЃ РєРѕРјРїСЊСЋС‚РµСЂР° Рё СЃРєСЂС‹РІР°РµС‚СЃСЏ РїРѕСЃР»Рµ РїРѕСЏРІР»РµРЅРёСЏ РѕР±СЉРµРєС‚РѕРІ.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РєРЅРѕРїРєР° `+` РІ Р»РµРІРѕР№ РїР°РЅРµР»Рё РѕС‚РєСЂС‹РІР°РµС‚ JSON-С„Р°Р№Р» РїСЂРѕРµРєС‚Р° СЃ РєРѕРјРїСЊСЋС‚РµСЂР° Рё РёРјРїРѕСЂС‚РёСЂСѓРµС‚ РµРіРѕ РІ С‚РµРєСѓС‰РµРµ СЃРѕСЃС‚РѕСЏРЅРёРµ.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РїСѓРЅРєС‚ `РќРѕРІС‹Р№ РїСЂРѕРµРєС‚` РІ РјРµРЅСЋ `Р¤Р°Р№Р»` СЃРїСЂР°С€РёРІР°РµС‚ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ, РґР°С‘С‚ `РЎРѕС…СЂР°РЅРёС‚СЊ/РќРµС‚/РћС‚РјРµРЅР°`, Р·Р°РєСЂС‹РІР°РµС‚ С‚РµРєСѓС‰РёР№ snapshot Рё СЃРѕР·РґР°С‘С‚ РїСѓСЃС‚РѕР№ РїСЂРѕРµРєС‚.

- РџСЂРѕРІРµСЂРёС‚СЊ СЃРІРµР¶РёР№ Windows installer `release\CamPlan-Installer-0.2.30.exe` РЅР° Р·Р°РїСѓСЃРє, РѕС‚РѕР±СЂР°Р¶РµРЅРёРµ СЃС‚РёР»РµР№ Рё update-launch Р»РѕРіРёСЂРѕРІР°РЅРёРµ.
- РџСЂРѕРІРµСЂРёС‚СЊ СЃС‚Р°СЂС‚ РІ СЂРµР¶РёРјРµ `РџСЂРѕСЃРјРѕС‚СЂ` Рё РїРµСЂРµС…РѕРґ РІ `Р РµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ` РєРЅРѕРїРєРѕР№.
- РџСЂРѕРІРµСЂРёС‚СЊ masked-input РїР°СЂРѕР»СЏ РІ РєР°СЂС‚РѕС‡РєРµ СѓСЃС‚СЂРѕР№СЃС‚РІР°: РІРІРѕРґ, РѕС‚РѕР±СЂР°Р¶РµРЅРёРµ `*` Рё РїРѕРєР°Р· СЂРµР°Р»СЊРЅРѕРіРѕ Р·РЅР°С‡РµРЅРёСЏ.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РІ С‚Р°Р±Р»РёС†Рµ `Р’СЃРµ СѓСЃС‚СЂРѕР№СЃС‚РІР°` РєР»РёРє РїРѕ РјР°СЃРєРµ РїР°СЂРѕР»СЏ СЂР°СЃРєСЂС‹РІР°РµС‚ СЂРµР°Р»СЊРЅС‹Р№ РїР°СЂРѕР»СЊ РІ СЌС‚РѕР№ Р¶Рµ СЃС‚СЂРѕРєРµ.
- РџСЂРѕРІРµСЂРёС‚СЊ РёРЅСЃС‚СЂСѓРјРµРЅС‚ `РљР°Р±РµР»СЊ` РєР°Рє polyline: single click РґРѕР±Р°РІР»СЏРµС‚ С‚РѕС‡РєРё, double click Р·Р°РІРµСЂС€Р°РµС‚, handles СЂРµРґР°РєС‚РёСЂСѓСЋС‚ РјР°СЂС€СЂРµРЅС‚.
- РџСЂРѕРІРµСЂРёС‚СЊ snap РєР°Р±РµР»СЏ Рє СѓСЃС‚СЂРѕР№СЃС‚РІР°Рј Рё СЂРµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ endpoint/route points.
- РџСЂРѕРІРµСЂРёС‚СЊ РѕРґРЅРѕСЂР°Р·РѕРІС‹Р№ `Room` tool: РїРѕСЃР»Рµ СЃРѕР·РґР°РЅРёСЏ РїРѕРјРµС‰РµРЅРёРµ РІРѕР·РІСЂР°С‰Р°РµС‚ СЂРµР¶РёРј РЅР° `select`, Р° РЅРѕРІС‹Р№ room Р±РµСЂРµС‚ preset color РёР· РїР°Р»РёС‚СЂС‹.
- РџСЂРѕРІРµСЂРёС‚СЊ РѕРґРёРЅ-РєР»РёРє СЃРѕР·РґР°РЅРёРµ `Room` 200x200 Рё РІС‹Р±РѕСЂ СѓСЃС‚СЂРѕР№СЃС‚РІ РїРѕ РёС… РІРёР·СѓР°Р»СЊРЅРѕРјСѓ Р±Р»РѕРєСѓ.
- РџСЂРѕРІРµСЂРёС‚СЊ resize `Room` РїРµСЂРµС‚СЏРіРёРІР°РЅРёРµРј Р·Р° РєСЂР°СЏ Рё СѓРіР»С‹.
- РџСЂРѕРІРµСЂРёС‚СЊ С†РІРµС‚Р°, `locked` Рё selection UX РЅР° РїР»Р°РЅРµ: outline-only rooms, РІС‹Р±РѕСЂ РїРѕ СЂР°РјРєРµ/Р»РёРЅРёРё Рё СЃР±СЂРѕСЃ РїРѕ РєР»РёРєСѓ РІРЅРµ РѕР±СЉРµРєС‚Р°.
- РџСЂРѕРІРµСЂРёС‚СЊ undo/redo РїРѕ РіРѕСЂСЏС‡РёРј РєР»Р°РІРёС€Р°Рј РІ Electron-РѕРєРЅРµ.
- РџСЂРѕРІРµСЂРёС‚СЊ copy/paste РІС‹Р±СЂР°РЅРЅРѕРіРѕ СѓСЃС‚СЂРѕР№СЃС‚РІР° РёР»Рё СЌР»РµРјРµРЅС‚Р° РїР»Р°РЅР° РїРѕ РіРѕСЂСЏС‡РёРј РєР»Р°РІРёС€Р°Рј.
- РџСЂРѕРІРµСЂРёС‚СЊ РјРµРЅСЋ `Р¤Р°Р№Р»`: save/load JSON, JPG export, CSV export.
- РџСЂРѕРІРµСЂРёС‚СЊ overlay layout: Р»РµРІР°СЏ/РїСЂР°РІР°СЏ РїР°РЅРµР»Рё РЅРµ РґРѕР»Р¶РЅС‹ СЃРґРІРёРіР°С‚СЊ canvas.
- РџСЂРѕРІРµСЂРёС‚СЊ РЅРѕРІС‹Р№ lightweight explorer layout Р»РµРІРѕР№ РїР°РЅРµР»Рё: scroll РґР»РёРЅРЅРѕРіРѕ СЃРїРёСЃРєР°, breadcrumb, РїСЂСЏРјРѕР№ `+` РґР»СЏ СЃРѕР·РґР°РЅРёСЏ РѕР±СЉРµРєС‚Р°, hover actions Рё inline rename.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РІРµСЂС…РЅРёР№ `+` РІ Р±Р»РѕРєРµ `РЎС‚СЂСѓРєС‚СѓСЂР°` СЃРѕР·РґР°С‘С‚ РѕР±СЉРµРєС‚ РЅР°РїСЂСЏРјСѓСЋ, Р±РµР· dropdown, Р° `+` Сѓ СЃС‚СЂРѕРєРё РѕР±СЉРµРєС‚Р° СЃРѕР·РґР°С‘С‚ РґРѕС‡РµСЂРЅСЋСЋ Р·РѕРЅСѓ/СЌС‚Р°Р¶.
- РџСЂРѕРІРµСЂРёС‚СЊ pin РїСЂР°РІРѕР№ РїР°РЅРµР»Рё Рё РїРѕРІРµРґРµРЅРёРµ Р·Р°РєСЂС‹С‚РёСЏ РїСЂРё blank-canvas deselection.
- РџСЂРѕРІРµСЂРёС‚СЊ РЅРѕРІС‹Р№ РїРѕСЂСЏРґРѕРє Рё inline-РєРѕРјРїРѕРЅРѕРІРєСѓ РїРѕР»РµР№ РєР°РјРµСЂС‹ РІ РїСЂР°РІРѕР№ properties panel.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РїСЂРё Р·Р°РєСЂРµРїР»С‘РЅРЅРѕР№ РїСЂР°РІРѕР№ РїР°РЅРµР»Рё РєР»РёРє РїРѕ РїСѓСЃС‚РѕРјСѓ РјРµСЃС‚Сѓ РєР°СЂС‚С‹ РЅРµ СЃРЅРёРјР°РµС‚ selection.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РїСЂР°РІР°СЏ overlay-РєРѕР»РѕРЅРєР° Р±РѕР»СЊС€Рµ РЅРµ СЂРµР¶РµС‚ РЅРёР¶РЅРёРµ РїРѕР»СЏ РєР°РјРµСЂС‹ РІ СЂРµР¶РёРјРµ РїСЂРѕСЃРјРѕС‚СЂР°.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РїРѕСЃР»Рµ Р·Р°РєСЂС‹С‚РёСЏ, РїРѕРІС‚РѕСЂРЅРѕРіРѕ Р·Р°РїСѓСЃРєР° Рё РїРµСЂРµРєР»СЋС‡РµРЅРёСЏ СЌС‚Р°Р¶РµР№ РІРѕСЃСЃС‚Р°РЅР°РІР»РёРІР°РµС‚СЃСЏ РѕС‚РґРµР»СЊРЅС‹Р№ viewport РєР°Р¶РґРѕРіРѕ СЌС‚Р°Р¶Р° Рё СЃРѕСЃС‚РѕСЏРЅРёРµ Р»РµРІРѕР№/РїСЂР°РІРѕР№ РїР°РЅРµР»РµР№.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РїСЂРё СЃС‚Р°СЂС‚Рµ Р±РѕР»СЊС€Рµ РЅРµ РІРёРґРЅР° РїСЂРѕРјРµР¶СѓС‚РѕС‡РЅР°СЏ РґРµРјРѕ-РєР°СЂС‚Р° РґРѕ Р·Р°РіСЂСѓР·РєРё СЃРѕС…СЂР°РЅС‘РЅРЅРѕРіРѕ РїСЂРѕРµРєС‚Р°.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РІРµСЂС…РЅСЏСЏ Р»РµРІР°СЏ РїРѕРґРїРёСЃСЊ РЅР° РєР°СЂС‚Рµ РїРѕРєР°Р·С‹РІР°РµС‚ `РћР±СЉРµРєС‚ - Р—РѕРЅР°` РёР· Р»РµРІРѕРіРѕ РјРµРЅСЋ РІРјРµСЃС‚Рѕ СЃР»СѓР¶РµР±РЅРѕР№ РїРѕРґСЃРєР°Р·РєРё.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РІРµСЂС…РЅСЏСЏ Р»РµРІР°СЏ РїРѕРґРїРёСЃСЊ РЅР° РєР°СЂС‚Рµ РЅРµ РїРµСЂРµРєСЂС‹РІР°РµС‚СЃСЏ РєРЅРѕРїРєРѕР№ РѕС‚РєСЂС‹С‚РёСЏ Р»РµРІРѕРіРѕ РјРµРЅСЋ.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РЅРѕРІС‹Рµ РєРѕРјРЅР°С‚С‹ РїРѕСЃР»Рµ РїРµСЂРµР·Р°РїСѓСЃРєР° СЃРЅРѕРІР° СЃС‚Р°СЂС‚СѓСЋС‚ С‡С‘СЂРЅС‹РјРё, РґР°Р¶Рµ РµСЃР»Рё РґРѕ СЌС‚РѕРіРѕ Р±С‹Р» РІС‹Р±СЂР°РЅ РґСЂСѓРіРѕР№ preset color.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РЅРѕРІС‹Рµ РєРѕРјРЅР°С‚С‹ РІСЃРµРіРґР° СЃРѕР·РґР°СЋС‚СЃСЏ С‡С‘СЂРЅС‹РјРё, РґР°Р¶Рµ РµСЃР»Рё РІ РїСЂР°РІРѕР№ РїР°РЅРµР»Рё РІС‹Р±СЂР°РЅ РґСЂСѓРіРѕР№ preset color.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РґРІРµСЂСЊ С„РёРєСЃРёСЂСѓРµС‚СЃСЏ РїРѕСЃР»Рµ РѕС‚РїСѓСЃРєР°РЅРёСЏ РјС‹С€Рё Рё РЅРµ РѕСЃС‚Р°С‘С‚СЃСЏ С‚РѕР»СЊРєРѕ РІ preview.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РІ РІРµСЂС…РЅРµР№ РїР°РЅРµР»Рё `Р¤Р°Р№Р»`, `Р РµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ` Рё `Р’СЃРµ СѓСЃС‚СЂРѕР№СЃС‚РІР°` СЃС‚РѕСЏС‚ РІ РЅР°С‡Р°Р»Рµ СЃС‚СЂРѕРєРё.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ Р±РµР№РґР¶ `РџСЂРѕСЃРјРѕС‚СЂ/Р РµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ` РЅР°С…РѕРґРёС‚СЃСЏ РІ РєРѕРЅС†Рµ СЃС‚СЂРѕРєРё Рё РЅРµ СЃРґРІРёРіР°РµС‚ РєРЅРѕРїРєРё РїСЂРё РїРµСЂРµРєР»СЋС‡РµРЅРёРё СЂРµР¶РёРјР°.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РїСЂРё Р·Р°РІРµСЂС€РµРЅРёРё РІ РІРµСЂС…РЅРµР№ СЃС‚СЂРѕРєРµ РЅРµ РїРѕСЏРІР»СЏРµС‚СЃСЏ РѕС‚РґРµР»СЊРЅРѕРµ СЃРѕРѕР±С‰РµРЅРёРµ `РР·РјРµРЅРµРЅРёСЏ СЃРѕС…СЂР°РЅРµРЅС‹`.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ СЃС‚СЂРѕРєР° `РђРІС‚РѕСЃРѕС…СЂР°РЅРµРЅРёРµ вЂў РІСЂРµРјСЏ` РІ РІРµСЂС…РЅРµР№ РїР°РЅРµР»Рё Р±РѕР»СЊС€Рµ РЅРµ РѕС‚РѕР±СЂР°Р¶Р°РµС‚СЃСЏ.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РєР°СЂС‚РѕС‡РєР° РєР°РјРµСЂС‹ РІ РїСЂР°РІРѕРј РјРµРЅСЋ СЃС‚Р°Р»Р° РєРѕСЂРѕС‡Рµ Р·Р° СЃС‡С‘С‚ СѓРґР°Р»РµРЅРёСЏ `РЎРµСЂРёР№РЅС‹Р№ РЅРѕРјРµСЂ`, `РћС‚РІРµС‚СЃС‚РІРµРЅРЅС‹Р№`, `Р”Р°С‚Р° РїРѕСЃР»РµРґРЅРµР№ РїСЂРѕРІРµСЂРєРё` Рё `Web-СЃС‚СЂРѕРєР°`.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ Р±Р»РѕРє `РЎРІСЏР·Рё` РІ РєР°СЂС‚РѕС‡РєРµ СѓСЃС‚СЂРѕР№СЃС‚РІР° РІРёРґРµРЅ Р±РµР· СѓС…РѕРґР° РІ СЃР°РјС‹Р№ РЅРёР· РїР°РЅРµР»Рё, Р° СЃРїРёСЃРѕРє РїРѕРґРєР»СЋС‡РµРЅРёР№ С‡РёС‚Р°РµС‚СЃСЏ СЃСЂР°Р·Сѓ.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ Сѓ РєР°РјРµСЂС‹ РІ РєР°СЂС‚РѕС‡РєРµ РѕС‚РѕР±СЂР°Р¶Р°РµС‚СЃСЏ read-only Р±Р»РѕРє `РЎРІСЏР·СЊ` СЃ РЅР°Р·РІР°РЅРёРµРј РїСЂРёСЃРѕРµРґРёРЅС‘РЅРЅРѕРіРѕ СѓСЃС‚СЂРѕР№СЃС‚РІР°.
- РџСЂРѕРІРµСЂРёС‚СЊ РЅРѕРІС‹Р№ РїРѕСЂСЏРґРѕРє РїРѕР»РµР№: `РЎС‚Р°С‚СѓСЃ` РЅР°Рґ `РўРёРї СѓСЃС‚СЂРѕР№СЃС‚РІР°`, `РњРµСЃС‚Рѕ СѓСЃС‚Р°РЅРѕРІРєРё` СЃСЂР°Р·Сѓ РїРѕРґ `РќР°Р·РІР°РЅРёРµ`.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ web-link РєР°РјРµСЂС‹ СЃ РїРѕСЂС‚РѕРј РІСЂРѕРґРµ `192.168.1.101:8080` РѕС‚РєСЂС‹РІР°РµС‚СЃСЏ РІ Р±СЂР°СѓР·РµСЂРµ РєР°Рє РѕР±С‹С‡РЅС‹Р№ URL, Р° РЅРµ РєР°Рє РїСѓС‚СЊ Windows.
- РџСЂРѕРІРµСЂРёС‚СЊ РЅРѕРІС‹Р№ `Room` tool: drag СЃРѕР·РґР°С‘С‚ РїСЂСЏРјРѕСѓРіРѕР»СЊРЅРёРє, Р° РѕРґРёРЅРѕС‡РЅС‹Р№ РєР»РёРє СЃРѕР·РґР°С‘С‚ РєРІР°РґСЂР°С‚ 200x200.
- РџСЂРѕРІРµСЂРёС‚СЊ РЅРѕРІС‹Р№ `Door` tool: РґРІРµСЂСЊ СЃРѕР·РґР°С‘С‚СЃСЏ drag-to-draw Р¶РµСЃС‚РѕРј РїРѕ СЃС‚РµРЅРµ РёР»Рё РіСЂР°РЅРё РєРѕРјРЅР°С‚С‹, Р° СЃС‚РѕСЂРѕРЅР° РѕРїСЂРµРґРµР»СЏРµС‚СЃСЏ РЅР°РїСЂР°РІР»РµРЅРёРµРј СЂРёСЃРѕРІР°РЅРёСЏ.
- РџСЂРѕРІРµСЂРёС‚СЊ hover-preview РґРІРµСЂРё РЅР° СЃС‚РµРЅРµ РёР»Рё РіСЂР°РЅРё РєРѕРјРЅР°С‚С‹ Рё РїРѕСЃС‚Р°РЅРѕРІРєСѓ РґРІРµСЂРё drag-gestures РїРѕ СЌС‚РѕР№ РїРѕРІРµСЂС…РЅРѕСЃС‚Рё.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РїСЂРё Р°РєС‚РёРІРЅРѕРј РёРЅСЃС‚СЂСѓРјРµРЅС‚Рµ `Door` РєР»РёРє РїРѕ РѕР±СЉРµРєС‚Р°Рј РЅРµ РјРµРЅСЏРµС‚ selection Рё РЅРµ РїРµСЂРµРєР»СЋС‡Р°РµС‚ РїСЂР°РІСѓСЋ РїР°РЅРµР»СЊ.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ `room` Рё `wall` РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ СЃРѕР·РґР°СЋС‚СЃСЏ С‡С‘СЂРЅС‹РјРё, `door` вЂ” РєРѕСЂРёС‡РЅРµРІРѕР№, Р° РІ РїСЂР°РІРѕР№ РїР°РЅРµР»Рё РґРѕСЃС‚СѓРїРЅС‹ С‚РѕР»СЊРєРѕ С€РµСЃС‚СЊ Р±С‹СЃС‚СЂС‹С… С†РІРµС‚РѕРІ.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ `UTP` Рё `Coacsil/coaxial` РєР°Р±РµР»Рё СЂРёСЃСѓСЋС‚СЃСЏ РїСѓРЅРєС‚РёСЂРѕРј С‚Р°Рє Р¶Рµ, РєР°Рє `FTP`.
- РџСЂРѕРІРµСЂРёС‚СЊ РЅР°СЃС‚СЂРѕР№РєСѓ С‚РѕР»С‰РёРЅС‹ Р»РёРЅРёРё Сѓ `room` Рё `wall` РІ РїСЂР°РІРѕРј РјРµРЅСЋ Рё РµС‘ СЃРѕС…СЂР°РЅРµРЅРёРµ РїРѕСЃР»Рµ СЂРµРґР°РєС‚РёСЂРѕРІР°РЅРёСЏ.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РЅРѕРІС‹Р№ `room` Рё `wall` РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ СЃРѕР·РґР°СЋС‚СЃСЏ СЃ С‚РѕР»С‰РёРЅРѕР№ Р»РёРЅРёРё `2`.
- РџСЂРё РЅРµРѕР±С…РѕРґРёРјРѕСЃС‚Рё СѓР±СЂР°С‚СЊ РѕСЃС‚Р°РІС€РёРµСЃСЏ lint warnings РІ shared UI.

- РџРѕСЃР»Рµ Р·Р°РїСѓСЃРєР° РїСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ empty-state РёСЃС‡РµР·Р°РµС‚ РїРѕСЃР»Рµ СЃРѕР·РґР°РЅРёСЏ РїРµСЂРІРѕРіРѕ РѕР±СЉРµРєС‚Р°/СЌС‚Р°Р¶Р° Рё С‡С‚Рѕ РїРѕРІС‚РѕСЂРЅС‹Р№ СЃС‚Р°СЂС‚ РѕС‚РєСЂС‹РІР°РµС‚ РїРѕСЃР»РµРґРЅРёР№ snapshot.

## РЎР»РµРґСѓСЋС‰РёР№ С€Р°Рі

РџСЂРѕРІРµСЃС‚Рё СЂСѓС‡РЅСѓСЋ QA-РїСЂРѕРІРµСЂРєСѓ СЃРІРµР¶РµРіРѕ Windows installer РїРѕ `qa-checklist.md`:

- СЃРѕР·РґР°РЅРёРµ РѕР±СЉРµРєС‚Р° Рё Р·РѕРЅС‹;
- РґРѕР±Р°РІР»РµРЅРёРµ Рё СЂРµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ СѓСЃС‚СЂРѕР№СЃС‚РІ;
- РґРѕР±Р°РІР»РµРЅРёРµ СЌР»РµРјРµРЅС‚РѕРІ РїР»Р°РЅР°;
- РґРѕР±Р°РІР»РµРЅРёРµ Рё СЂРµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ РєР°Р±РµР»СЏ;
- РёР·РјРµРЅРµРЅРёРµ СЂР°Р·РјРµСЂР° `Room` Р·Р° РєСЂР°СЏ Рё СѓРіР»С‹;
- РёРјРїРѕСЂС‚ Рё СЌРєСЃРїРѕСЂС‚ JSON;
- СЌРєСЃРїРѕСЂС‚ CSV Рё JPG;
- undo/redo С‡РµСЂРµР· `Ctrl+Z`, `Ctrl+Shift+Z`, `Ctrl+Y`;
- copy/paste С‡РµСЂРµР· `Ctrl+C`, `Ctrl+V`;
- РїСЂРѕРІРµСЂРєР° СЂРµР¶РёРјР° `РџСЂРѕСЃРјРѕС‚СЂ` Рё СЂСѓС‡РЅРѕРіРѕ РІРєР»СЋС‡РµРЅРёСЏ `Р РµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ`;
- РїСЂРѕРІРµСЂРєР° overlay-РїР°РЅРµР»РµР№, collapsed state Рё pin РїСЂР°РІРѕР№ РїР°РЅРµР»Рё.
- РїСЂРѕРІРµСЂРєР° РЅРѕРІРѕРіРѕ explorer-style UX Р»РµРІРѕР№ sidebar-РїР°РЅРµР»Рё.
- РїСЂРѕРІРµРСЂРєР° РЅРѕРІРѕРіРѕ РїРѕСЂСЏРґРєР° РїРѕР»РµР№ РєР°РјРµСЂС‹ Рё РїРѕРІРµРґРµРЅРёСЏ blank-click РїСЂРё pinned РїСЂР°РІРѕР№ РїР°РЅРµР»Рё.
- РїСЂРѕРІРµСЂРєР°, С‡С‚Рѕ РЅРёР¶РЅРёР№ `РџРѕРІРѕСЂРѕС‚` Сѓ РєР°РјРµСЂС‹ РІРёРґРµРЅ РІ РІРµСЂР¶РёРјРµ РїСЂРѕСЃРјРѕС‚СЂР° Рё РєРѕРЅС‚РµРЅС‚ РµС‚РёС‰Р° РґРѕСЃРєСЂРѕР»Р»РёРІР°РµС‚СЃСЏ РґРѕ РєРѕРЅС†Р°.

## РџРѕСЃР»Рµ QA

- РСЃРїСЂР°РІРёС‚СЊ РЅР°Р№РґРµРЅРЅС‹Рµ UX/Р»РѕРіРёС‡РµСЃРєРёРµ РѕС€РёР±РєРё.
- РћР±РЅРѕРІРёС‚СЊ `project-progress.md` СЂРµР·СѓР»СЊС‚Р°С‚Р°РјРё СЂСѓС‡РЅРѕР№ РїСЂРѕРІРµСЂРєРё.
- Р•СЃР»Рё РёР·РјРµРЅРµРЅРёСЏ СЃСѓС‰РµСЃС‚РІРµРЅРЅС‹Рµ, СЃРѕР±СЂР°С‚СЊ РЅРѕРІСѓСЋ Windows-СЃР±РѕСЂРєСѓ Рё СЃРґРµР»Р°С‚СЊ git commit.

## РЎРµР№С‡Р°СЃ
- РџСЂРѕРІРµСЂРёС‚СЊ СЃРІРµР¶РёР№ Windows installer `release\CamPlan-Installer-0.2.30.exe` РЅР° РјРЅРѕР¶РµСЃС‚РІРµРЅРЅРѕРµ РІС‹РґРµР»РµРЅРёРµ, СЂР°СЃРєСЂС‹РІР°СЋС‰РёР№СЃСЏ СЃРїРёСЃРѕРє РІ РїСЂР°РІРѕР№ РїР°РЅРµР»Рё Рё РіСЂСѓРїРїРёСЂРѕРІРєСѓ РѕР±СЉРµРєС‚РѕРІ.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ `Ctrl` + drag РїРѕ РїСѓСЃС‚РѕРјСѓ РјРµСЃС‚Сѓ РєР°СЂС‚С‹ РґРµР№СЃС‚РІРёС‚РµР»СЊРЅРѕ СЂРёСЃСѓРµС‚ СЂР°РјРєСѓ РІС‹Р±РѕСЂР°, Р° `Ctrl` + РєР»РёРє РїРѕ РѕР±СЉРµРєС‚Сѓ Р°СЃС€РёСЂСЏРµС‚ РІС‹РґРµР»РµРЅРёРµ.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ Р°РјРєР° `Ctrl`-РІС‹РґРµР»РµРЅРёСЏ С‚Р°РєР¶Рµ Р·Р°С…РІР°С‚С‹РІР°РµС‚ РєР°Р±РµР»Рё, РµСЃР»Рё РёС… Р»РёРЅРёСЏ РїРµСЂРµСЃРµРєР°РµС‚ box.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РїРѕСЃР»Рµ Р·Р°РІРµСЂС€РµРЅРёСЏ СЂРёСЃРѕРІР°РЅРёСЏ РєР°Р±РµР»СЊ СЂР°Р·Сѓ РІС‹РґРµР»СЏРµС‚СЃСЏ Рё РѕС‚РєСЂС‹РІР°РµС‚ РїСЂР°РІСѓСЋ РїР°РЅРµР»СЊ СЃРІРѕР№СЃС‚РІ.
- РџСЂРѕРІРµСЂРёС‚СЊ group/ungroup Рё РїРµСЂРµС‚Р°СЃРєРёРІР°РЅРёРµ grouped РѕР±СЉРµРєС‚РѕРІ РєР°Рє РѕРґРЅРѕРіРѕ Р±Р»РѕРєР°.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ drag РїРѕ РѕРґРЅРѕРјСѓ РёР· РЅРµСЃРєРѕР»СЊРєРёС… РІС‹Р±СЂР°РЅРЅС‹С… РѕР±СЉРµРєС‚РѕРІ РґРІРёРіР°РµС‚ РІРµСЃСЊ РЅР°Р±РѕСЂ РІС‹Р±СЂР°РЅРЅС‹С… РѕР±СЉРµРєС‚РѕРІ РІРјРµСЃС‚Рµ.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РІ СЂРµР¶РёРјРµ РїСЂРѕСЃРјРѕС‚СЂР° РіСЂСѓРїРїР° РЅРµ РІР»РёСЏРµС‚ РЅР° РІС‹Р±РѕСЂ РѕР±СЉРµРєС‚Р°, Р° СЂР°СЃС€РёСЂРµРЅРёРµ selection Р°Р±РѕС‚Р°РµС‚ С‚РѕР»СЊРєРѕ РІ СЂРµРґР°РєС‚РѕСЂРµ.

## Р”РѕРїРѕР»РЅРµРЅРёРµ 11.05.2026

- РџСЂРѕРІРµСЂРёС‚СЊ Р°РІС‚РѕС†РµРЅС‚СЂРёСЂРѕРІР°РЅРёРµ РєР°СЂС‚С‹ РїСЂРё СЃС‚Р°СЂС‚Рµ: РІСЃРµ РѕР±СЉРµРєС‚С‹ Р°РєС‚РёРІРЅРѕРіРѕ СЌС‚Р°Р¶Р° РґРѕР»Р¶РЅС‹ РїРѕРїР°РґР°С‚СЊ РІ Р±РµР·РѕРїР°СЃРЅСѓСЋ РІРёРґРёРјСѓСЋ Р·РѕРЅСѓ.
- Р•СЃР»Рё РЅР° СЃС‚Р°СЂС‚Рµ РµСЃС‚СЊ РіР»СѓР±РѕРєР°СЏ СЃСЃС‹Р»РєР°/РїРѕРґСЃРІРµС‚РєР° РѕР±СЉРµРєС‚Р°, СѓР±РµРґРёС‚СЊСЃСЏ, С‡С‚Рѕ Р°РІС‚Рѕ-fit РЅРµ Р»РѕРјР°РµС‚ СЏРІРЅС‹Р№ С„РѕРєСѓСЃ.
## Р”РѕРїРѕР»РЅРµРЅРёРµ 11.05.2026

- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ Ctrl-СЂР°РјРєР° РІС‹Р±РѕСЂР° СЃС‚Р°Р±РёР»СЊРЅРѕ РІС‹РґРµР»СЏРµС‚ РЅРµ С‚РѕР»СЊРєРѕ РѕР±СЉРµРєС‚С‹, РЅРѕ Рё РєР°Р±РµР»Рё РїРѕ РІСЃРµР№ РґР»РёРЅРµ РїРѕР»РёР»РёРЅРёРё.
## Р”РѕРїРѕР»РЅРµРЅРёРµ 11.05.2026

- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ Ctrl-РІС‹РґРµР»РµРЅРёРµ РєР°Р±РµР»РµР№ СЃС‚Р°Р»Рѕ СЃС‚Р°Р±РёР»СЊРЅС‹Рј РїРѕСЃР»Рµ РґРѕР±Р°РІР»РµРЅРёСЏ СЂР°СЃС€РёСЂРµРЅРЅРѕРіРѕ hit-test РїРѕ bounding box Рё С‚РѕР»С‰РёРЅРµ Р»РёРЅРёРё.
## Р”РѕРїРѕР»РЅРµРЅРёРµ 11.05.2026

- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РєР°Р±РµР»Рё РІ Ctrl-СЂР°РјРєРµ РІС‹Р±РёСЂР°СЋС‚СЃСЏ РїРѕ Р±РѕР»РµРµ СЃС‚Р°Р±РёР»СЊРЅРѕР№ РїРѕР»РѕСЃРµ СЃРµРіРјРµРЅС‚Р°, Р° РЅРµ С‚РѕР»СЊРєРѕ РїРѕ С‚РѕРЅРєРѕР№ РјР°С‚РµРјР°С‚РёС‡РµСЃРєРѕР№ Р»РёРЅРёРё.
## Р”РѕРїРѕР»РЅРµРЅРёРµ 11.05.2026

- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РїСЂРё multi-select РєР°Р±РµР»РµР№ РІСЃРµ РІС‹Р±СЂР°РЅРЅС‹Рµ СЃРѕРµРґРёРЅРµРЅРёСЏ РїРѕРґСЃРІРµС‡РёРІР°СЋС‚СЃСЏ РЅР° canvas, Р° РїСЂР°РІР°СЏ РїР°РЅРµР»СЊ РїРѕРєР°Р·С‹РІР°РµС‚ РѕС‚Р»РёС‡РёРјС‹Рµ РїРѕРґРїРёСЃРё РїРѕ endpoint-Р°Рј.
## Р”РѕРїРѕР»РЅРµРЅРёРµ 11.05.2026

- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РїСЂРё СЃРјРµРЅРµ С‚РёРїР° РєР°Р±РµР»СЏ РІ РїСЂР°РІРѕРј РјРµРЅСЋ РёРјСЏ РєР°Р±РµР»СЏ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё СЃРёРЅС…СЂРѕРЅРёР·РёСЂСѓРµС‚СЃСЏ СЃ РЅРѕРІС‹Рј С‚РёРїРѕРј.
## Р”РѕРїРѕР»РЅРµРЅРёРµ 11.05.2026

- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РїРѕРґРїРёСЃРё РєР°Р±РµР»РµР№ РЅР° Р»РѕРјР°РЅС‹С… РјР°СЂС€СЂСѓС‚Р°С… Р»РµР¶Р°С‚ РЅР° РїРµСЂРІРѕР№ РїРѕР»РѕРІРёРЅРµ Р»РёРЅРёРё Рё С‡РёС‚Р°СЋС‚СЃСЏ РІРґРѕР»СЊ СЃРµРіРјРµРЅС‚Р°.
- РџСЂРѕРІРµСЃС‚Рё СЂСѓС‡РЅСѓСЋ РїСЂРѕРІРµСЂРєСѓ РЅРѕРІРѕРіРѕ inline-РІРІРѕРґР° С‚РµРєСЃС‚Р° РЅР° РєР°СЂС‚Рµ: РєР»РёРє РїРѕ РёРЅСЃС‚СЂСѓРјРµРЅС‚Сѓ `Text`, РІРІРѕРґ РЅР° РјРµСЃС‚Рµ, СЃРѕС…СЂР°РЅРµРЅРёРµ Enter/blur Рё РѕС‚РјРµРЅР° Esc.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ СѓРґР°Р»РµРЅРёРµ РѕСЃС‚Р°Р»РѕСЃСЊ РґРѕСЃС‚СѓРїРЅС‹Рј РёР· РєР°СЂС‚РѕС‡РµРє РѕР±СЉРµРєС‚РѕРІ Рё РїРѕ РіРѕСЂСЏС‡РёРј РєР»Р°РІРёС€Р°Рј, Р° РѕС‚РґРµР»СЊРЅР°СЏ РєРЅРѕРїРєР° `РЈРґР°Р»РёС‚СЊ` РІ С‚СѓР»Р±Р°СЂРµ РЅРµ РїРѕРєР°Р·С‹РІР°РµС‚СЃСЏ.
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
- Verify camera required-field warnings: empty `IP-Р°РґСЂРµСЃ` or `РџР°СЂРѕР»СЊ` should be highlighted in orange in the right panel and should clear after the value is filled.
- Verify camera password input: hidden mode should keep normal caret/selection/typing behavior, and the eye button should reveal or hide the real value.
- Verify map IP labels: `РџРѕРєР°Р·Р°С‚СЊ IP Р°РґСЂРµСЃР°` should toggle compact labels on the map only for devices with non-empty IP values, and the toggle state should persist.
- Verify per-floor viewport memory: leave each floor at a different zoom/pan, switch between floors from the left menu, and confirm every floor restores its own last viewed map position without briefly flashing the previous floor zoom.
- Verify `Ctrl+0` map fit: pressing `Ctrl+0` should fit all active-floor elements tightly inside the visible canvas area, accounting for open left/right overlay menus so plan items do not sit under those panels and the plan is not over-zoomed out.
- Re-check `Ctrl+0` after the explicit scale/pan rewrite: with left/right panels open and closed, the active-floor bounds should center inside the free canvas strip without drifting or leaving oversized empty margins.
- Re-check the new DOM overlap detection for `Ctrl+0`: when panels are true overlays the fit should subtract only their real overlap with canvas, and when canvas is already constrained between panels it should not subtract them a second time.
- Verify full-height canvas layout in `dev:desktop`: the central grid must reach the bottom edge of the window, and only after that re-check `Ctrl+0` fit/debug numbers.
- Verify diagonal wall doors: placing `Door` on a diagonal `wall` should preview and create a door rotated along the wall angle.
- Verify door resize on diagonal walls: dragging the selected door resize handle should grow/shrink the door along the wall axis instead of screen X/Y.
- Verify proportional door resize: increasing a door should also thicken the curved door head proportionally, including on diagonal walls.
- Verify `РџРѕР»СѓРєСЂСѓРіР»Р°СЏ СЃС‚РµРЅР°`: drag should create a curved wall, selection should work on the arc hit area, and `РР·РіРёР± РїРѕР»СѓРєСЂСѓРіР°` should update the curve in the right panel.
- Verify wall endpoint resize and release snap: selected straight and curved walls should show endpoint squares on both ends; dragging either endpoint should extend or shorten the wall along its current direction, and releasing near an intersecting wall or room border should auto-fit the endpoint to that structure.
- Verify moved wall release snap: when dragging the whole selected wall, releasing it with one endpoint square near another wall or room border should auto-fit that endpoint to the nearest valid junction.
- Verify wall drawing over existing objects: with `РЎС‚РµРЅР°` or `РџРѕР»СѓРєСЂСѓРіР»Р°СЏ СЃС‚РµРЅР°` active, hovering other objects should keep the drawing cursor and click-drag should start a new wall at that point.
- Verify wall minimum length: a single click with `РЎС‚РµРЅР°` or `РџРѕР»СѓРєСЂСѓРіР»Р°СЏ СЃС‚РµРЅР°` should not leave a dot/zero-length wall; only a dragged minimum-length line should be saved.
- Verify wall and room snapping: while drawing `РЎС‚РµРЅР°` or `РџРѕР»СѓРєСЂСѓРіР»Р°СЏ СЃС‚РµРЅР°`, starting or ending near another wall or room border should magnet to that structure; normal grid/direction drawing should remain available away from structures.
- Verify GitHub Actions release publishing on tag push `v*` and confirm `electron-updater` can consume the published GitHub release.

## Р”РѕРїРѕР»РЅРµРЅРёРµ 22.05.2026

- Verify the update dialog now shows the current app version and the GitHub version first, and only enables `РћР±РЅРѕРІРёС‚СЊ` when the versions differ.

## Р вЂќР С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р РЎвЂќ 23.05.2026

- Verify the `Р С›Р В±Р Р…Р С•Р Р†Р С‘РЎвЂљРЎРЉ` button now downloads the Windows installer directly from the latest GitHub release asset and launches it without relying on `electron-updater` cache path logic.
- Verify the direct update flow also survives incomplete release asset metadata by falling back to a synthesized installer filename instead of throwing `path ... undefined`.
- Verify the downloaded installer keeps running after the app exits, and that the launcher waits for `CamPlan.exe` by name instead of PID before starting the installer.
- Verify opening a project file from the canvas or toolbar does not show a modal system alert after successful import.
- Verify wall endpoint rotation keeps the drag active when the cursor leaves and re-enters the canvas, and that mouseup outside the SVG still ends the interaction cleanly.
- Verify the installer launched by the update flow is started only after the user confirms the dialog, the app exits cleanly first, and the installer opens once from a detached delayed helper.

## Р В РІР‚СњР В РЎвЂўР В РЎвЂ”Р В РЎвЂўР В Р’В»Р В Р вЂ¦Р В Р’ВµР В Р вЂ¦Р В РЎвЂР В Р’Вµ 24.05.2026

- РџСЂРѕРІРµСЂРёС‚СЊ Р»РѕРєР°Р»СЊРЅРѕ СЃРѕР±СЂР°РЅРЅС‹Р№ Windows installer `release\CamPlan-Installer-0.2.30.exe` РЅР° СЂСѓС‡РЅРѕР№ СЃС†РµРЅР°СЂРёР№ РѕР±РЅРѕРІР»РµРЅРёСЏ РїРµСЂРµРґ РїСѓР±Р»РёРєР°С†РёРµР№ СЂРµР»РёР·Р°.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ update-install logging С„РёРєСЃРёСЂСѓРµС‚ РїСѓС‚СЊ СѓСЃС‚Р°РЅРѕРІС‰РёРєР°, С„Р°РєС‚ СЃСѓС‰РµСЃС‚РІРѕРІР°РЅРёСЏ С„Р°Р№Р», РІС‹Р±СЂР°РЅРЅС‹Р№ РјРµС‚РѕРґ Р·Р°РїСѓСЃРєР° Рё СЃРєСЂС‹С‚С‹Р№ WScript + CMD launcher РІ QA.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РѕР¶РёРґР°РЅРёРµ PID Electron, immediate `app.exit(0)` Рё custom `build/installer.nsh` СѓР±РёСЂР°СЋС‚ prompt NSIS РїСЂРѕ Р·Р°РєСЂС‹С‚РёРµ CCTV Manager/CamPlan.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РїСЂРё СЂРёСЃРѕРІР°РЅРёРё СЃС‚РµРЅ Рё РєРѕРјРЅР°С‚ pointer-to-SVG conversion РёСЃРїРѕР»СЊР·СѓРµС‚ С‚РѕС‡РЅСѓСЋ РјР°С‚СЂРёС†Сѓ SVG, С‡С‚РѕР±С‹ Р»РёРЅРёСЏ/РєРѕРјРЅР°С‚Р° РЅР°С‡РёРЅР°Р»РёСЃСЊ РїСЂСЏРјРѕ РїРѕРґ РєСѓСЂСЃРѕСЂРѕРј Р±РµР· СЃРјРµС‰РµРЅРёСЏ.
- РџСЂРѕРІРµСЂРёС‚СЊ Р»РѕРєР°Р»СЊРЅРѕ СЃРѕР±СЂР°РЅРЅС‹Р№ Windows installer `release\CamPlan-Installer-0.2.30.exe` РЅР° РѕР±С‹С‡РЅС‹Р№ Р·Р°РїСѓСЃРє Рё РѕР±РЅРѕРІР»РµРЅРёРµ РїРѕСЃР»Рµ pointer-alignment fix.
- РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ РїРѕСЃР»Рµ РѕС‚РєСЂС‹С‚РёСЏ РїСЂРѕРµРєС‚Р°, Р·Р°РєСЂС‹С‚РёСЏ CamPlan Рё РїРѕРІС‚РѕСЂРЅРѕРіРѕ Р·Р°РїСѓСЃРєР° РїСЂРёР»РѕР¶РµРЅРёРµ РїРѕРґРЅРёРјР°РµС‚ РїРѕСЃР»РµРґРЅРёР№ СЃРѕС…СЂР°РЅС‘РЅРЅС‹Р№ РїСЂРѕРµРєС‚, Р° `beforeunload/pagehide` flush РЅРµ С‚РµСЂСЏРµС‚ snapshot.
- РџСЂРѕРІРµСЂРёС‚СЊ Р»РѕРєР°Р»СЊРЅРѕ СЃРѕР±СЂР°РЅРЅС‹Р№ Windows installer `release\CamPlan-Installer-0.2.30.exe` РЅР° update flow Р±РµР· running-app close/retry prompt.
- Verify the local `build/allowOnlyOneInstallerInstance.nsh` override removes the remaining close/retry app-running dialog and that `0.2.31` installs cleanly from `0.2.30` without waiting for any hidden prompt.
# 25.05.2026 current focus

- Prove the restore bug source with logs, not guesses.
- Verify the same non-empty snapshot survives import, shutdown, and restart for all open/import entry points.
- Keep the hydration guard in place so empty startup state cannot overwrite a valid saved project.
- Confirm QA logs in DevTools/localStorage show the import and restore path end-to-end.
