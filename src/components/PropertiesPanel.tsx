import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Copy, Eye, EyeOff, Files, Link2, Lock, Pin, PinOff, Trash2 } from "lucide-react";
import { deviceTypeLabels, statusLabels, useStore } from "@/data/store";
import type {
  CableType,
  Device,
  DeviceConnection,
  DeviceStatus,
  DeviceType,
  MapElement,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { getTextElementBounds } from "@/utils/text-element";

const statuses: DeviceStatus[] = ["working", "offline", "needs_check", "reserve", "no_access"];
const deviceTypes: DeviceType[] = ["camera", "nvr", "dvr", "switch", "poe_switch"];
const cableLabels: Record<CableType, string> = {
  utp: "UTP",
  ftp: "FTP",
  coaxial: "Coaxial",
  power: "Power",
};
const cableDefaultColors: Record<CableType, string> = {
  utp: "#334155",
  ftp: "#1d4ed8",
  coaxial: "#6b21a8",
  power: "#b45309",
};
const quickColors = ["#000000", "#a16207", "#dc2626", "#16a34a", "#6b7280", "#2563eb"];

function buildCameraWebUrl(ip?: string) {
  const value = (ip ?? "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      url.protocol = "http:";
      return url.toString().replace(/\/+$/, "");
    } catch {
      return value;
    }
  }

  const cleaned = value.replace(/^\/+/, "").replace(/\/+$/, "");
  return `http://${cleaned}`;
}

function getElementLabel(element: MapElement) {
  if (element.type === "room") return element.label || "Помещение";
  if (element.type === "wall")
    return element.label || (element.wallShape === "arc" ? "Полукруглая стена" : "Стена");
  if (element.type === "door") return element.label || "Дверь";
  return element.label || "Текст";
}

export function PropertiesPanel({
  rightPinned,
  onToggleRightPin,
}: {
  rightPinned: boolean;
  onToggleRightPin: () => void;
}) {
  const {
    objects,
    activeObjectId,
    selectedId,
    selectedKind,
    selectedItems,
    isEditMode,
    setEditMode,
    devices,
    mapElements,
    deviceConnections,
    updateDevice,
    updateDeviceConnection,
    updateElement,
    updateSettings,
    renameObject,
    removeDevice,
    duplicateDevice,
    removeDeviceConnection,
    removeElement,
    toggleDeviceConnection,
  } = useStore();

  const activeObject = objects.find((item) => item.id === activeObjectId) ?? null;

  if (selectedItems.length > 1) {
    return (
      <MultiSelectionPanel
        items={selectedItems}
        canEdit={isEditMode}
        devices={devices}
        mapElements={mapElements}
        deviceConnections={deviceConnections}
        objects={objects}
        onEnterEditMode={() => setEditMode(true)}
        onTogglePin={onToggleRightPin}
        pinned={rightPinned}
      />
    );
  }

  if (!selectedId || !selectedKind) {
    return (
      <aside className="w-72 border-l bg-card p-4 text-sm text-muted-foreground overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold text-foreground">Выберите объект или устройство</div>
            <div className="mt-1 text-xs leading-5">
              Кликните по объекту, камере, кабелю или элементу плана, чтобы открыть карточку.
            </div>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onToggleRightPin}>
            {rightPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </Button>
        </div>
        {rightPinned && (
          <div className="mt-4 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Панель закреплена и останется открытой после клика по пустому месту.
          </div>
        )}
      </aside>
    );
  }

  if (selectedKind === "object") {
    if (!activeObject) return null;
    return (
      <ObjectPanel
        object={activeObject}
        canEdit={isEditMode}
        onEnterEditMode={() => setEditMode(true)}
        onUpdate={(name, description) => renameObject(activeObject.id, name, description)}
        onTogglePin={onToggleRightPin}
        pinned={rightPinned}
      />
    );
  }

  if (selectedKind === "device") {
    const device = devices.find((item) => item.id === selectedId);
    if (!device) return null;
    return (
      <DevicePanel
        device={device}
        canEdit={isEditMode}
        connections={deviceConnections}
        devices={devices}
        onEnterEditMode={() => setEditMode(true)}
        onUpdate={(patch) => updateDevice(device.id, patch)}
        onDelete={() => removeDevice(device.id)}
        onDup={() => duplicateDevice(device.id)}
        onTogglePin={onToggleRightPin}
        pinned={rightPinned}
        onToggleConnection={(toDeviceId, connectionType) =>
          toggleDeviceConnection(device.id, toDeviceId, connectionType)
        }
      />
    );
  }

  if (selectedKind === "connection") {
    const connection = deviceConnections.find((item) => item.id === selectedId);
    if (!connection) return null;
    return (
      <ConnectionPanel
        connection={connection}
        canEdit={isEditMode}
        devices={devices}
        onEnterEditMode={() => setEditMode(true)}
        onUpdate={(patch) => updateDeviceConnection(connection.id, patch)}
        onDelete={() => removeDeviceConnection(connection.id)}
        onTogglePin={onToggleRightPin}
        pinned={rightPinned}
      />
    );
  }

  const element = mapElements.find((item) => item.id === selectedId);
  if (!element) return null;
  return (
    <ElementPanel
      el={element}
      canEdit={isEditMode}
      onEnterEditMode={() => setEditMode(true)}
      onUpdate={(patch) => updateElement(element.id, patch)}
      onPresetColorChange={(color) => updateSettings({ roomColorPreset: color })}
      onDelete={() => removeElement(element.id)}
      onTogglePin={onToggleRightPin}
      pinned={rightPinned}
    />
  );
}

function MultiSelectionPanel({
  items,
  canEdit,
  devices,
  mapElements,
  deviceConnections,
  objects,
  onEnterEditMode,
  onTogglePin,
  pinned,
}: {
  items: { kind: "object" | "device" | "element" | "connection"; id: string }[];
  canEdit: boolean;
  devices: Device[];
  mapElements: MapElement[];
  deviceConnections: DeviceConnection[];
  objects: { id: string; name: string }[];
  onEnterEditMode: () => void;
  onTogglePin: () => void;
  pinned: boolean;
}) {
  const { groupSelectedItems, ungroupSelectedItems } = useStore();
  const entries = useMemo(
    () =>
      items
        .map((item) => {
          if (item.kind === "device") {
            const device = devices.find((entry) => entry.id === item.id);
            return device
              ? {
                  item,
                  title: device.name || "Устройство",
                  subtitle: deviceTypeLabels[device.type],
                  groupId: device.groupId ?? null,
                }
              : null;
          }
          if (item.kind === "element") {
            const element = mapElements.find((entry) => entry.id === item.id);
            return element
              ? {
                  item,
                  title: getElementLabel(element),
                  subtitle: element.type,
                  groupId: element.groupId ?? null,
                }
              : null;
          }
          if (item.kind === "connection") {
            const connection = deviceConnections.find((entry) => entry.id === item.id);
            return connection
              ? {
                  item,
                  title: connection.label || cableLabels[connection.type],
                  subtitle: `${devices.find((entry) => entry.id === connection.from.deviceId)?.name ?? "Точка A"} → ${devices.find((entry) => entry.id === connection.to.deviceId)?.name ?? "Точка B"}`,
                  groupId: null,
                }
              : null;
          }
          const object = objects.find((entry) => entry.id === item.id);
          return object
            ? {
                item,
                title: object.name,
                subtitle: "Объект",
                groupId: null,
              }
            : null;
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    [deviceConnections, devices, items, mapElements, objects],
  );
  const [activeKey, setActiveKey] = useState("main");

  useEffect(() => {
    const keys = new Set([
      "main",
      ...entries.map((entry) => `${entry.item.kind}:${entry.item.id}`),
    ]);
    if (!keys.has(activeKey)) setActiveKey("main");
  }, [activeKey, entries]);

  const groupableEntries = entries.filter(
    (entry) => entry.item.kind === "device" || entry.item.kind === "element",
  );
  const firstGroupId = groupableEntries[0]?.groupId ?? null;
  const allSameGroup =
    !!firstGroupId &&
    groupableEntries.length > 1 &&
    groupableEntries.every((entry) => entry.groupId === firstGroupId);
  const canGroup = canEdit && groupableEntries.length > 1 && !allSameGroup;
  const canUngroup = canEdit && groupableEntries.some((entry) => entry.groupId);
  const selectedEntry =
    activeKey === "main"
      ? null
      : (entries.find((entry) => `${entry.item.kind}:${entry.item.id}` === activeKey) ?? null);

  const renderEntryPanel = (entry: (typeof entries)[number]) => {
    if (entry.item.kind === "object") {
      const object = objects.find((item) => item.id === entry.item.id);
      if (!object) return null;
      return (
        <ObjectPanel
          object={object}
          canEdit={canEdit}
          onEnterEditMode={onEnterEditMode}
          onUpdate={(name, description) => {
            const current = objects.find((item) => item.id === entry.item.id);
            if (!current) return;
            useStore.getState().renameObject(current.id, name, description);
          }}
          onTogglePin={onTogglePin}
          pinned={pinned}
          embedded
        />
      );
    }

    if (entry.item.kind === "device") {
      const device = devices.find((item) => item.id === entry.item.id);
      if (!device) return null;
      return (
        <DevicePanel
          device={device}
          canEdit={canEdit}
          connections={deviceConnections}
          devices={devices}
          onEnterEditMode={onEnterEditMode}
          onUpdate={(patch) => {
            const current = devices.find((item) => item.id === entry.item.id);
            if (!current) return;
            useStore.getState().updateDevice(current.id, patch);
          }}
          onDelete={() => {
            const current = devices.find((item) => item.id === entry.item.id);
            if (!current) return;
            useStore.getState().removeDevice(current.id);
          }}
          onDup={() => {
            const current = devices.find((item) => item.id === entry.item.id);
            if (!current) return;
            useStore.getState().duplicateDevice(current.id);
          }}
          onTogglePin={onTogglePin}
          pinned={pinned}
          onToggleConnection={(toDeviceId, connectionType) => {
            const current = devices.find((item) => item.id === entry.item.id);
            if (!current) return;
            useStore.getState().toggleDeviceConnection(current.id, toDeviceId, connectionType);
          }}
          embedded
        />
      );
    }

    if (entry.item.kind === "connection") {
      const connection = deviceConnections.find((item) => item.id === entry.item.id);
      if (!connection) return null;
      return (
        <ConnectionPanel
          connection={connection}
          canEdit={canEdit}
          devices={devices}
          onEnterEditMode={onEnterEditMode}
          onUpdate={(patch) => {
            const current = deviceConnections.find((item) => item.id === entry.item.id);
            if (!current) return;
            useStore.getState().updateDeviceConnection(current.id, patch);
          }}
          onDelete={() => {
            const current = deviceConnections.find((item) => item.id === entry.item.id);
            if (!current) return;
            useStore.getState().removeDeviceConnection(current.id);
          }}
          onTogglePin={onTogglePin}
          pinned={pinned}
          embedded
        />
      );
    }

    const element = mapElements.find((item) => item.id === entry.item.id);
    if (!element) return null;
    return (
      <ElementPanel
        el={element}
        canEdit={canEdit}
        onEnterEditMode={onEnterEditMode}
        onUpdate={(patch) => {
          const current = mapElements.find((item) => item.id === entry.item.id);
          if (!current) return;
          useStore.getState().updateElement(current.id, patch);
        }}
        onPresetColorChange={(color) =>
          useStore.getState().updateSettings({ roomColorPreset: color })
        }
        onDelete={() => {
          const current = mapElements.find((item) => item.id === entry.item.id);
          if (!current) return;
          useStore.getState().removeElement(current.id);
        }}
        onTogglePin={onTogglePin}
        pinned={pinned}
        embedded
      />
    );
  };

  return (
    <aside className="w-80 border-l bg-card flex h-full min-h-0 flex-col overflow-hidden">
      <div className="p-3 border-b flex items-center justify-between gap-2 shrink-0">
        <div className="font-semibold text-sm truncate">
          Выбрано: {entries.length} {entries.length === 1 ? "объект" : "объектов"}
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onTogglePin}>
          {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        </Button>
      </div>

      {!canEdit && (
        <div className="px-3 pt-3">
          <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between gap-2">
            <span>Для редактирования нескольких объектов включите режим редактирования.</span>
            <Button size="sm" variant="outline" className="h-7" onClick={onEnterEditMode}>
              Редактировать
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden p-3">
        <div className="flex h-full min-h-0 flex-col gap-3">
          <Field label="Объект">
            <Select value={activeKey} onValueChange={setActiveKey}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Выберите объект" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="main">Главная</SelectItem>
                {entries.map((entry) => (
                  <SelectItem
                    key={`${entry.item.kind}:${entry.item.id}`}
                    value={`${entry.item.kind}:${entry.item.id}`}
                  >
                    {entry.title} — {entry.subtitle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="flex-1 min-h-0 overflow-hidden">
            {activeKey === "main" ? (
              <div className="space-y-3 text-xs">
                <div className="rounded-md border bg-background/40 p-2 space-y-1">
                  <div>Выбрано: {entries.length}</div>
                  <div>
                    Типы:{" "}
                    {Array.from(new Set(entries.map((entry) => entry.subtitle))).join(", ") || "—"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={groupSelectedItems}
                    disabled={!canGroup}
                  >
                    Группировать
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={ungroupSelectedItems}
                    disabled={!canUngroup}
                  >
                    Разгруппировать
                  </Button>
                </div>
                <div className="space-y-1">
                  {entries.map((entry) => (
                    <div
                      key={`${entry.item.kind}:${entry.item.id}`}
                      className="rounded border bg-background px-2 py-1"
                    >
                      <div className="font-medium truncate">{entry.title}</div>
                      <div className="text-muted-foreground truncate">{entry.subtitle}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full min-h-0">
                {selectedEntry ? renderEntryPanel(selectedEntry) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

function ObjectPanel({
  object,
  canEdit,
  onEnterEditMode,
  onUpdate,
  onTogglePin,
  pinned,
  embedded = false,
}: {
  object: { id: string; name: string; description?: string };
  canEdit: boolean;
  onEnterEditMode: () => void;
  onUpdate: (name: string, description?: string) => void;
  onTogglePin: () => void;
  pinned: boolean;
  embedded?: boolean;
}) {
  const { floors, activeFloorId, activeObjectId } = useStore();
  const floorCount = floors.filter((floor) => floor.objectId === object.id).length;
  const activeFloor = floors.find((floor) => floor.id === activeFloorId) ?? null;

  return (
    <aside
      className={
        embedded
          ? "flex h-full min-h-0 flex-col overflow-hidden"
          : "w-72 border-l bg-card flex h-full min-h-0 flex-col overflow-hidden"
      }
    >
      <div className="p-3 border-b flex items-center justify-between shrink-0">
        <div className="font-semibold text-sm flex items-center gap-2 truncate">
          <span>Выбран: Объект — {object.name}</span>
        </div>
        {!embedded && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onTogglePin}>
            {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </Button>
        )}
      </div>
      {!canEdit && (
        <div className="px-3 pt-3">
          <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between gap-2">
            <span>Объект доступен только в режиме редактирования.</span>
            <Button size="sm" variant="outline" className="h-7" onClick={onEnterEditMode}>
              Редактировать
            </Button>
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 text-xs">
        <Field label="Название объекта">
          <Input
            value={object.name}
            onChange={(e) => onUpdate(e.target.value, object.description)}
            className="h-8"
            disabled={!canEdit}
          />
        </Field>
        <Field label="Описание">
          <Textarea
            value={object.description ?? ""}
            onChange={(e) => onUpdate(object.name, e.target.value)}
            rows={4}
            disabled={!canEdit}
          />
        </Field>
        <div className="rounded-md border bg-background/40 p-2 text-xs space-y-1">
          <div>Зон: {floorCount}</div>
          <div>Активный объект: {activeObjectId === object.id ? "Да" : "Нет"}</div>
          <div>Активная зона: {activeFloor?.name ?? "Не выбрана"}</div>
        </div>
      </div>
    </aside>
  );
}

function DevicePanel({
  device,
  canEdit,
  connections,
  devices,
  onEnterEditMode,
  onUpdate,
  onDelete,
  onDup,
  onToggleConnection,
  onTogglePin,
  pinned,
  embedded = false,
}: {
  device: Device;
  canEdit: boolean;
  connections: DeviceConnection[];
  devices: Device[];
  onEnterEditMode: () => void;
  onUpdate: (p: Partial<Device>) => void;
  onDelete: () => void;
  onDup: () => void;
  onToggleConnection: (toDeviceId: string, cableType: CableType) => void;
  onTogglePin: () => void;
  pinned: boolean;
  embedded?: boolean;
}) {
  const [showPwd, setShowPwd] = useState(false);
  const copy = (value: string) => navigator.clipboard.writeText(value);
  const openExternal = (url: string) => {
    const bridge = window.cctvDesktop;
    if (bridge) {
      void bridge.openExternal(url);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const related = useMemo(
    () =>
      connections
        .filter((connection) => connection.from.deviceId === device.id)
        .map((connection) => ({
          connection,
          target: devices.find((item) => item.id === connection.to.deviceId) ?? null,
        }))
        .filter(
          (item): item is { connection: DeviceConnection; target: Device } => item.target !== null,
        ),
    [connections, device.id, devices],
  );
  const cameraLinks = useMemo(
    () =>
      connections
        .filter(
          (connection) =>
            connection.from.deviceId === device.id || connection.to.deviceId === device.id,
        )
        .map((connection) => {
          const otherId =
            connection.from.deviceId === device.id
              ? connection.to.deviceId
              : connection.from.deviceId;
          return {
            connection,
            target: devices.find((item) => item.id === otherId) ?? null,
            direction: connection.from.deviceId === device.id ? "out" : "in",
          };
        })
        .filter(
          (
            item,
          ): item is {
            connection: DeviceConnection;
            target: Device;
            direction: "out" | "in";
          } => item.target !== null,
        ),
    [connections, device.id, devices],
  );
  const candidates = useMemo(
    () => devices.filter((item) => item.id !== device.id && item.objectId === device.objectId),
    [device.id, device.objectId, devices],
  );
  const missingCameraIp = device.type === "camera" && !device.ip?.trim();
  const missingCameraPassword = device.type === "camera" && !device.password?.trim();
  const requiredFieldClass =
    "border-orange-400 bg-orange-50/70 focus-visible:ring-orange-500 disabled:opacity-100";

  const connectionTypeForTarget = (target: Device): CableType => {
    if (device.type === "poe_switch") return target.type === "camera" ? "power" : "utp";
    if (device.type === "switch") return "utp";
    if (device.type === "nvr" || device.type === "dvr")
      return target.type === "camera" ? "coaxial" : "utp";
    return "utp";
  };

  return (
    <aside
      className={
        embedded
          ? "flex h-full min-h-0 flex-col overflow-hidden"
          : "w-72 border-l bg-card flex h-full min-h-0 flex-col overflow-hidden"
      }
    >
      <div className="p-3 border-b sticky top-0 bg-card flex items-center justify-between gap-2 z-10 shrink-0">
        <div className="font-semibold text-sm truncate flex items-center gap-2">
          <span>Выбран: {device.name || "Устройство"}</span>
          {device.locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-1">
          {!embedded && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onTogglePin}>
              {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </Button>
          )}
          {canEdit && (
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={onDup}
                title="Дублировать"
              >
                <Files className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={onDelete}
                title="Удалить"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {!canEdit && (
        <div className="px-3 pt-3">
          <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between gap-2">
            <span>Поля доступны только в режиме редактирования.</span>
            <Button size="sm" variant="outline" className="h-7" onClick={onEnterEditMode}>
              Редактировать
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 text-xs">
        <Field label="Статус">
          <Select
            value={device.status}
            onValueChange={(value) => onUpdate({ status: value as DeviceStatus })}
          >
            <SelectTrigger className="h-8" disabled={!canEdit}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Тип устройства">
          <Select
            value={device.type}
            onValueChange={(value) => onUpdate({ type: value as DeviceType })}
            disabled={!canEdit}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {deviceTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {deviceTypeLabels[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Название">
          <Input
            value={device.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="h-8"
            disabled={!canEdit}
          />
        </Field>

        <Field label="Место установки">
          <Input
            value={device.location ?? ""}
            onChange={(e) => onUpdate({ location: e.target.value })}
            className="h-8"
            disabled={!canEdit}
          />
        </Field>

        <Field label="Заморозить">
          <label className="flex items-center gap-2 rounded border bg-background px-2 h-8 text-xs">
            <input
              type="checkbox"
              checked={Boolean(device.locked)}
              onChange={(e) => onUpdate({ locked: e.target.checked })}
              disabled={!canEdit}
            />
            <span>{device.locked ? "Locked" : "Unlocked"}</span>
          </label>
        </Field>

        <Field label="IP-адрес">
          <div className="space-y-1">
            <div className="flex gap-1">
              <Input
                value={device.ip ?? ""}
                onChange={(e) => onUpdate({ ip: e.target.value })}
                className={`h-8 ${missingCameraIp ? requiredFieldClass : ""}`}
                disabled={!canEdit}
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 shrink-0"
                onClick={() => {
                  const url = buildCameraWebUrl(device.ip);
                  if (url) openExternal(url);
                }}
                disabled={!device.ip}
              >
                <Link2 className="h-3 w-3 mr-1" /> Линк
              </Button>
            </div>
            {missingCameraIp && (
              <div className="text-[11px] font-medium text-orange-700">
                Важное поле: из-за него камера отмечена оранжевой точкой.
              </div>
            )}
          </div>
        </Field>

        <Field label="Логин">
          <Input
            value={device.username ?? ""}
            onChange={(e) => onUpdate({ username: e.target.value })}
            className="h-8"
            disabled={!canEdit}
          />
        </Field>

        <Field label="Пароль">
          <div className="space-y-1">
            <div className="flex gap-1 items-start">
              <div className="relative min-w-0 flex-1">
                <Input
                  type={showPwd ? "text" : "password"}
                  value={device.password ?? ""}
                  onChange={(e) => onUpdate({ password: e.target.value })}
                  className={`h-8 w-full font-mono pr-3 ${
                    missingCameraPassword ? requiredFieldClass : ""
                  }`}
                  disabled={!canEdit}
                  spellCheck={false}
                  autoComplete="new-password"
                />
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 shrink-0"
                onClick={() => setShowPwd((value) => !value)}
              >
                {showPwd ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 shrink-0"
                onClick={() => copy(device.password ?? "")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            {missingCameraPassword && (
              <div className="text-[11px] font-medium text-orange-700">
                Важное поле: из-за него камера отмечена оранжевой точкой.
              </div>
            )}
          </div>
          {/* TODO: later master password encryption. */}
        </Field>

        <Field label="Модель">
          <Input
            value={device.model ?? ""}
            onChange={(e) => onUpdate({ model: e.target.value })}
            className="h-8"
            disabled={!canEdit}
          />
        </Field>

        {device.type === "camera" && (
          <div className="pt-2 border-t space-y-2">
            <div className="font-semibold text-foreground">Связь</div>
            {cameraLinks.length > 0 ? (
              <div className="space-y-1">
                {cameraLinks.map(({ connection, target, direction }) => (
                  <div
                    key={connection.id}
                    className="rounded border bg-background/40 px-2 py-1 text-[11px] leading-4"
                  >
                    <div className="font-medium text-foreground truncate">
                      {direction === "out" ? "К" : "От"} {target?.name ?? "Устройство"}
                    </div>
                    <div className="text-muted-foreground truncate">
                      {cableLabels[connection.type]}
                      {connection.label ? ` • ${connection.label}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded border bg-background/40 px-2 py-1 text-[11px] text-muted-foreground">
                Камера не подключена
              </div>
            )}
          </div>
        )}

        {canEdit && (
          <div className="pt-2 border-t space-y-2">
            <div className="font-semibold text-foreground">Связи</div>
            {device.type === "nvr" || device.type === "dvr" ? (
              <ConnectionList
                title="Подключённые камеры"
                candidates={candidates.filter((item) => item.type === "camera")}
                related={related}
                onToggleConnection={onToggleConnection}
                connectionTypeResolver={connectionTypeForTarget}
              />
            ) : device.type === "switch" || device.type === "poe_switch" ? (
              <ConnectionList
                title="Подключённые устройства"
                candidates={candidates}
                related={related}
                onToggleConnection={onToggleConnection}
                connectionTypeResolver={connectionTypeForTarget}
              />
            ) : null}
          </div>
        )}

        <Field label="Заметки">
          <Textarea
            value={device.notes ?? ""}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            rows={3}
            disabled={!canEdit}
          />
        </Field>

        {device.type === "camera" && (
          <>
            <div className="pt-2 border-t space-y-3">
              <div className="font-semibold text-foreground">Обзор</div>
              <Field label={`Угол обзора: ${device.fovAngle ?? 90}°`}>
                <Slider
                  value={[device.fovAngle ?? 90]}
                  min={30}
                  max={360}
                  step={10}
                  onValueChange={(value) => onUpdate({ fovAngle: value[0] })}
                  disabled={!canEdit}
                />
              </Field>
              <Field label={`Дальность: ${device.fovDistance ?? 150}px`}>
                <Slider
                  value={[device.fovDistance ?? 150]}
                  min={40}
                  max={400}
                  step={10}
                  onValueChange={(value) => onUpdate({ fovDistance: value[0] })}
                  disabled={!canEdit}
                />
              </Field>
              <Field label={`Поворот: ${Math.round(device.rotation ?? 0)}°`}>
                <Slider
                  value={[device.rotation ?? 0]}
                  min={-180}
                  max={180}
                  step={5}
                  onValueChange={(value) => onUpdate({ rotation: value[0] })}
                  disabled={!canEdit}
                />
              </Field>
            </div>
          </>
        )}

        {device.type === "nvr" || device.type === "dvr" ? (
          <div className="pt-2 border-t space-y-3">
            <div className="font-semibold text-foreground">Запись</div>
            <Field label="Количество каналов">
              <Input
                type="number"
                value={device.channelCount ?? 0}
                onChange={(e) => onUpdate({ channelCount: Number(e.target.value) })}
                className="h-8"
                disabled={!canEdit}
              />
            </Field>
            <Field label="Объём хранения, TB">
              <Input
                type="number"
                value={device.storageCapacityTb ?? 0}
                onChange={(e) => onUpdate({ storageCapacityTb: Number(e.target.value) })}
                className="h-8"
                disabled={!canEdit}
              />
            </Field>
            <Field label="Количество HDD">
              <Input
                type="number"
                value={device.hddCount ?? 0}
                onChange={(e) => onUpdate({ hddCount: Number(e.target.value) })}
                className="h-8"
                disabled={!canEdit}
              />
            </Field>
          </div>
        ) : null}

        {device.type === "switch" || device.type === "poe_switch" ? (
          <div className="pt-2 border-t space-y-3">
            <div className="font-semibold text-foreground">Сеть</div>
            <Field label="Количество портов">
              <Input
                type="number"
                value={device.portCount ?? 0}
                onChange={(e) => onUpdate({ portCount: Number(e.target.value) })}
                className="h-8"
                disabled={!canEdit}
              />
            </Field>
            {device.type === "poe_switch" && (
              <>
                <Field label="PoE-порты">
                  <Input
                    type="number"
                    value={device.poePortCount ?? 0}
                    onChange={(e) => onUpdate({ poePortCount: Number(e.target.value) })}
                    className="h-8"
                    disabled={!canEdit}
                  />
                </Field>
                <Field label="PoE budget, W">
                  <Input
                    type="number"
                    value={device.poeBudgetW ?? 0}
                    onChange={(e) => onUpdate({ poeBudgetW: Number(e.target.value) })}
                    className="h-8"
                    disabled={!canEdit}
                  />
                </Field>
              </>
            )}
            <Field label="Uplink ports">
              <Input
                type="number"
                value={device.uplinkPorts ?? 0}
                onChange={(e) => onUpdate({ uplinkPorts: Number(e.target.value) })}
                className="h-8"
                disabled={!canEdit}
              />
            </Field>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function ConnectionList({
  title,
  candidates,
  related,
  onToggleConnection,
  connectionTypeResolver,
}: {
  title: string;
  candidates: Device[];
  related: { connection: DeviceConnection; target: Device }[];
  onToggleConnection: (toDeviceId: string, cableType: CableType) => void;
  connectionTypeResolver: (target: Device) => CableType;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      <div className="max-h-56 overflow-y-auto space-y-1 rounded border bg-background/40 p-2">
        {candidates.length === 0 && (
          <div className="text-[11px] text-muted-foreground">Нет устройств</div>
        )}
        {candidates.map((candidate) => {
          const active = related.some((item) => item.target.id === candidate.id);
          return (
            <label
              key={candidate.id}
              className="flex items-center gap-2 text-[11px] leading-none cursor-pointer"
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => onToggleConnection(candidate.id, connectionTypeResolver(candidate))}
              />
              <span className="truncate flex-1">
                {candidate.name} • {candidate.ip || "без IP"}
              </span>
            </label>
          );
        })}
      </div>
      {related.length > 0 && (
        <div className="text-[11px] text-muted-foreground space-y-1">
          {related.map(({ target, connection }) => (
            <div key={connection.id}>
              {target.name} • {cableLabels[connection.type]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConnectionPanel({
  connection,
  canEdit,
  devices,
  onEnterEditMode,
  onUpdate,
  onDelete,
  onTogglePin,
  pinned,
  embedded = false,
}: {
  connection: DeviceConnection;
  canEdit: boolean;
  devices: Device[];
  onEnterEditMode: () => void;
  onUpdate: (p: Partial<DeviceConnection>) => void;
  onDelete: () => void;
  onTogglePin: () => void;
  pinned: boolean;
  embedded?: boolean;
}) {
  const fromName = devices.find((item) => item.id === connection.from.deviceId)?.name ?? "Точка A";
  const toName = devices.find((item) => item.id === connection.to.deviceId)?.name ?? "Точка B";
  const approxLength = (() => {
    const resolve = (endpoint: DeviceConnection["from"] | DeviceConnection["to"]) => {
      const device = endpoint.deviceId
        ? devices.find((item) => item.id === endpoint.deviceId)
        : null;
      if (!device) return { x: endpoint.x, y: endpoint.y };
      if (device.type === "camera") return { x: device.x, y: device.y };
      const size =
        device.type === "nvr" || device.type === "dvr"
          ? { width: 64, height: 36 }
          : { width: 72, height: 30 };
      const halfW = size.width / 2;
      const halfH = size.height / 2;
      switch (endpoint.anchor) {
        case "top":
          return { x: device.x, y: device.y - halfH };
        case "right":
          return { x: device.x + halfW, y: device.y };
        case "bottom":
          return { x: device.x, y: device.y + halfH };
        case "left":
          return { x: device.x - halfW, y: device.y };
        default:
          return { x: device.x, y: device.y };
      }
    };
    const points = [resolve(connection.from), ...connection.points, resolve(connection.to)];
    return points
      .slice(1)
      .reduce((sum, point, index) => {
        const prev = points[index];
        return sum + Math.hypot(point.x - prev.x, point.y - prev.y);
      }, 0)
      .toFixed(1);
  })();

  return (
    <aside
      className={
        embedded
          ? "flex h-full min-h-0 flex-col overflow-hidden"
          : "w-72 border-l bg-card flex h-full min-h-0 flex-col overflow-hidden"
      }
    >
      <div className="p-3 border-b flex items-center justify-between gap-2 shrink-0">
        <div className="font-semibold text-sm flex items-center gap-2">
          <span>Выбран: Кабель</span>
          {connection.locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-1">
          {!embedded && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onTogglePin}>
              {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </Button>
          )}
          {canEdit && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>
      {!canEdit && (
        <div className="px-3 pt-3">
          <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between gap-2">
            <span>Кабель доступен только в режиме редактирования.</span>
            <Button size="sm" variant="outline" className="h-7" onClick={onEnterEditMode}>
              Редактировать
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 text-xs">
        <Field label="Тип кабеля">
          <Select
            value={connection.type}
            onValueChange={(value) => {
              const nextType = value as CableType;
              onUpdate({ type: nextType, label: cableLabels[nextType] });
            }}
            disabled={!canEdit}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(cableLabels) as CableType[]).map((type) => (
                <SelectItem key={type} value={type}>
                  {cableLabels[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Цвет">
          <ColorControl
            value={connection.color ?? cableDefaultColors[connection.type]}
            onChange={(color) => onUpdate({ color })}
            disabled={!canEdit}
          />
        </Field>

        <Field label="От устройства">
          <Input value={fromName} className="h-8" disabled readOnly />
        </Field>

        <Field label="До устройства">
          <Input value={toName} className="h-8" disabled readOnly />
        </Field>

        <Field label="Label">
          <Input
            value={connection.label ?? ""}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="h-8"
            disabled={!canEdit}
          />
        </Field>

        <Field label="Notes">
          <Textarea
            value={connection.notes ?? ""}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            rows={3}
            disabled={!canEdit}
          />
        </Field>

        <Field label="Заморозить">
          <label className="flex items-center gap-2 rounded border bg-background px-2 h-8 text-xs">
            <input
              type="checkbox"
              checked={Boolean(connection.locked)}
              onChange={(e) => onUpdate({ locked: e.target.checked })}
              disabled={!canEdit}
            />
            <span>{connection.locked ? "Locked" : "Unlocked"}</span>
          </label>
        </Field>

        <Field label="Точек маршрута">
          <Input value={connection.points.length} className="h-8" disabled readOnly />
        </Field>

        <Field label="Условная длина">
          <Input value={approxLength} className="h-8" disabled readOnly />
        </Field>
      </div>
    </aside>
  );
}

function ElementPanel({
  el,
  canEdit,
  onEnterEditMode,
  onUpdate,
  onPresetColorChange,
  onDelete,
  onTogglePin,
  pinned,
  embedded = false,
}: {
  el: MapElement;
  canEdit: boolean;
  onEnterEditMode: () => void;
  onUpdate: (p: Partial<MapElement>) => void;
  onPresetColorChange: (color: string) => void;
  onDelete: () => void;
  onTogglePin: () => void;
  pinned: boolean;
  embedded?: boolean;
}) {
  const updateTextSize = (label: string, fontSize: number) => {
    const bounds = getTextElementBounds(label, fontSize);
    onUpdate({ label, fontSize, width: bounds.width, height: bounds.height });
  };

  return (
    <aside
      className={
        embedded
          ? "flex h-full min-h-0 flex-col overflow-hidden"
          : "w-80 border-l bg-card flex h-full min-h-0 flex-col overflow-hidden"
      }
    >
      <div className="p-3 border-b flex items-center justify-between gap-2 shrink-0">
        <div className="font-semibold text-sm flex items-center gap-2">
          <span>
            Выбран: Элемент —{" "}
            {el.type === "room"
              ? "Помещение"
              : el.type === "wall"
                ? el.wallShape === "arc"
                  ? "Полукруглая стена"
                  : "Стена"
                : el.type === "door"
                  ? "Дверь"
                  : "Текст"}
          </span>
          {el.locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-1">
          {!embedded && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onTogglePin}>
              {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </Button>
          )}
          {canEdit && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>
      {!canEdit && (
        <div className="px-3 pt-3">
          <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between gap-2">
            <span>Редактирование элемента доступно только в режиме редактирования.</span>
            <Button size="sm" variant="outline" className="h-7" onClick={onEnterEditMode}>
              Редактировать
            </Button>
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 text-xs">
        {(el.type === "room" || el.type === "text") && (
          <Field label="Подпись">
            <Input
              value={el.label ?? ""}
              onChange={(e) => {
                const label = e.target.value;
                if (el.type === "text") {
                  updateTextSize(label, el.fontSize ?? 16);
                  return;
                }
                onUpdate({ label });
              }}
              className="h-8"
              disabled={!canEdit}
            />
          </Field>
        )}
        {el.type === "text" && (
          <Field label="Размер текста">
            <Input
              type="number"
              min={8}
              max={64}
              step={1}
              value={el.fontSize ?? 16}
              onChange={(e) => updateTextSize(el.label ?? "", Number(e.target.value) || 16)}
              className="h-8"
              disabled={!canEdit}
            />
          </Field>
        )}
        <Field label={el.type === "text" ? "Цвет текста" : "Цвет"}>
          <ColorControl
            value={el.color ?? (el.type === "text" ? "#111827" : "#64748b")}
            onChange={(color) => {
              onUpdate({ color });
              if (el.type === "room") onPresetColorChange(color);
            }}
            disabled={!canEdit}
          />
        </Field>

        {(el.type === "room" || el.type === "wall") && (
          <Field label="Толщина линии">
            <Input
              type="number"
              min={1}
              max={20}
              step={0.5}
              value={el.strokeWidth ?? 2}
              onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) })}
              className="h-8"
              disabled={!canEdit}
            />
          </Field>
        )}

        {el.type === "wall" && el.wallShape === "arc" && (
          <Field label="Изгиб полукруга">
            <Input
              type="number"
              step={5}
              value={Math.round(el.curveOffset ?? Math.hypot(el.width, el.height) / 2)}
              onChange={(e) => onUpdate({ curveOffset: Number(e.target.value) })}
              className="h-8"
              disabled={!canEdit}
            />
          </Field>
        )}

        <Field label="Заморозить">
          <label className="flex items-center gap-2 rounded border bg-background px-2 h-8 text-xs">
            <input
              type="checkbox"
              checked={Boolean(el.locked)}
              onChange={(e) => onUpdate({ locked: e.target.checked })}
              disabled={!canEdit}
            />
            <span>{el.locked ? "Locked" : "Unlocked"}</span>
          </label>
        </Field>
        {el.type !== "text" && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Ширина">
              <Input
                type="number"
                value={Math.round(el.width)}
                onChange={(e) => onUpdate({ width: +e.target.value })}
                className="h-8"
                disabled={!canEdit}
              />
            </Field>
            <Field label="Высота">
              <Input
                type="number"
                value={Math.round(el.height)}
                onChange={(e) => onUpdate({ height: +e.target.value })}
                className="h-8"
                disabled={!canEdit}
              />
            </Field>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Field label="X">
            <Input
              type="number"
              value={Math.round(el.x)}
              onChange={(e) => onUpdate({ x: +e.target.value })}
              className="h-8"
              disabled={!canEdit}
            />
          </Field>
          <Field label="Y">
            <Input
              type="number"
              value={Math.round(el.y)}
              onChange={(e) => onUpdate({ y: +e.target.value })}
              className="h-8"
              disabled={!canEdit}
            />
          </Field>
        </div>
      </div>
    </aside>
  );
}

function ColorControl({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full rounded border bg-background"
        disabled={disabled}
      />
      <div className="flex flex-wrap gap-1">
        {quickColors.map((color) => (
          <button
            key={color}
            type="button"
            className="h-5 w-5 rounded-full border"
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
            disabled={disabled}
            aria-label={`Set color ${color}`}
          />
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
