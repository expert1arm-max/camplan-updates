# Database Schema

## App data snapshot
- `objects`
- `floors`
- `mapElements`
- `devices`
- `deviceConnections`
- `settings`

## Object
- `id`
- `name`
- `description?`
- `createdAt`
- `updatedAt`

## Floor / zone
- `id`
- `objectId`
- `name`
- `sortOrder`
- `createdAt`
- `updatedAt`

## Map element
- `id`
- `floorId`
- `type`: `room`, `wall`, `door`, `text`
- `x`
- `y`
- `width`
- `height`
- `rotation?`
- `label?`
- `color?`
- `strokeWidth?` for `room` and `wall`
- `wallShape?` for `wall`: `straight` or `arc`
- `curveOffset?` for `wall` with `wallShape: arc`
- `locked?`
- `doorAxis?` for `door`: `horizontal` or `vertical`
- `doorSide?` for `door`: `top`, `right`, `bottom`, `left`
- `createdAt`
- `updatedAt`

## Device
- `id`
- `objectId`
- `floorId`
- `type`: `camera`, `nvr`, `dvr`, `switch`, `poe_switch`
- `name`
- `ip?`
- `username?`
- `password?`
- `model?`
- `serialNumber?`
- `location?`
- `status`: `working`, `offline`, `needs_check`, `reserve`, `no_access`
- `notes?`
- `x`
- `y`
- `rotation?`
- `locked?`
- `createdAt`
- `updatedAt`

## Camera-specific fields
- `rtspUrl?`
- `fovAngle?`
- `fovDistance?`
- `lastCheckedAt?`
- `responsiblePerson?`

## Recorder fields
- `channelCount?`
- `storageCapacityTb?`
- `hddCount?`
- `connectedCameraIds?`

## Network device fields
- `portCount?`
- `poePortCount?`
- `poeBudgetW?`
- `uplinkPorts?`
- `connectedDeviceIds?`

## Device connection
- `id`
- `objectId`
- `floorId`
- `type`: `utp`, `ftp`, `coaxial`, `power`
- `from`: endpoint with `deviceId?`, `anchor?`, `x`, `y`
- `to`: endpoint with `deviceId?`, `anchor?`, `x`, `y`
- `points`: промежуточные точки polyline-маршрута
- `color?`
- `locked?`
- `label?`
- `notes?`
- `createdAt`
- `updatedAt`

## Settings
- `theme`
- `masterPasswordEncryption`
- `roomColorPreset`
- `uiState.viewport?`: legacy/fallback viewport карты
- `uiState.viewportByFloorId?`: сохранённый viewport карты отдельно для каждого `floorId`
- `uiState.leftCollapsed?`
- `uiState.rightCollapsed?`
- `uiState.rightPinned?`
- `uiState.showIpLabels?`
- `uiState.activeObjectId?`
- `uiState.activeFloorId?`

## Legacy compatibility
- Старые JSON-экспорты с `cameras` нормализуются в `devices`.
- Старые связи `deviceCables` или `connections` нормализуются в `deviceConnections`.

## Group metadata
- `groupId?` on `Device` and `MapElement` is used for plan grouping, multi-selection expansion, and grouped dragging.
