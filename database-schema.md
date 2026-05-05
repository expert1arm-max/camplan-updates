# Database Schema

## App data snapshot
- `objects`
- `floors`
- `mapElements`
- `cameras`
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
- `type`
- `x`
- `y`
- `width`
- `height`
- `rotation`
- `label`
- `color`
- `createdAt`
- `updatedAt`

## Camera
- `id`
- `floorId`
- `objectId`
- `name`
- `ip`
- `username`
- `password`
- `rtspUrl`
- `model`
- `serialNumber`
- `location`
- `status`
- `notes`
- `x`
- `y`
- `rotation`
- `fovAngle`
- `fovDistance`
- `lastCheckedAt`
- `responsiblePerson`
- `createdAt`
- `updatedAt`

