import { useMemo, useState, type ReactNode } from "react";
import { Copy, Eye, EyeOff, Files, Lock, Trash2 } from "lucide-react";
import { deviceTypeLabels, statusLabels, useStore } from "@/data/store";
import type { CableType, Device, DeviceConnection, DeviceStatus, DeviceType, MapElement } from "@/types";
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
const quickColors = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#64748b", "#8b5cf6"];

export function PropertiesPanel() {
  const {
    selectedId,
    selectedKind,
    isEditMode,
    setEditMode,
    devices,
    mapElements,
    deviceConnections,
    updateDevice,
    updateDeviceConnection,
    updateElement,
    removeDevice,
    duplicateDevice,
    removeDeviceConnection,
    removeElement,
    toggleDeviceConnection,
  } = useStore();

  if (!selectedId || !selectedKind) {
    return (
      <aside className="w-80 border-l bg-card p-4 text-sm text-muted-foreground overflow-y-auto">
        Выберите устройство или элемент на плане, чтобы редактировать его свойства.
        <div className="mt-4 space-y-2 text-xs">
          <div className="font-semibold text-foreground">Подсказки:</div>
          <div>• Двойной клик по устройству — открыть карточку</div>
          <div>• Перетаскивайте элементы мышкой</div>
          <div>• Синяя точка возле камеры — поворот</div>
          <div>• Delete — удалить выбранное</div>
        </div>
      </aside>
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
      onDelete={() => removeElement(element.id)}
    />
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
}: {
  device: Device;
  canEdit: boolean;
  connections: DeviceConnection[];
  devices: Device[];
  onEnterEditMode: () => void;
  onUpdate: (p: Partial<Device>) => void;
  onDelete: () => void;
  onDup: () => void;
  onToggleConnection: (
    toDeviceId: string,
    cableType: CableType,
  ) => void;
}) {
  const [showPwd, setShowPwd] = useState(false);
  const copy = (value: string) => navigator.clipboard.writeText(value);
  const related = useMemo(
    () =>
      connections
        .filter((connection) => connection.from.deviceId === device.id)
        .map((connection) => ({
          connection,
          target: devices.find((item) => item.id === connection.to.deviceId) ?? null,
        }))
        .filter((item) => item.target),
    [connections, device.id, devices],
  );
  const candidates = useMemo(
    () =>
      devices.filter((item) => item.id !== device.id && item.objectId === device.objectId),
    [device.id, device.objectId, devices],
  );

  const connectionTypeForTarget = (target: Device): CableType => {
    if (device.type === "poe_switch") return target.type === "camera" ? "power" : "utp";
    if (device.type === "switch") return "utp";
    if (device.type === "nvr" || device.type === "dvr") return target.type === "camera" ? "coaxial" : "utp";
    return "utp";
  };

  return (
    <aside className="w-80 border-l bg-card overflow-y-auto">
      <div className="p-3 border-b sticky top-0 bg-card flex items-center justify-between z-10">
        <div className="font-semibold text-sm truncate flex items-center gap-2">
          <span>Выбран: {device.name || "Устройство"}</span>
          {device.locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
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

      <div className="p-3 space-y-3 text-xs">
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
          <div className="flex gap-1">
            <Input
              value={device.ip ?? ""}
              onChange={(e) => onUpdate({ ip: e.target.value })}
              className="h-8"
              disabled={!canEdit}
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 shrink-0"
              onClick={() => copy(device.ip ?? "")}
            >
              <Copy className="h-3 w-3 mr-1" /> Скопировать IP
            </Button>
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
          <div className="space-y-2">
            <div className="relative">
              <Input
                type="text"
                value={device.password ?? ""}
                onChange={(e) => onUpdate({ password: e.target.value })}
                className={`h-8 w-full font-mono pr-3 ${
                  showPwd ? "" : "text-transparent caret-foreground"
                }`}
                style={showPwd ? undefined : { caretColor: "hsl(var(--foreground))" }}
                disabled={!canEdit}
                spellCheck={false}
                autoComplete="new-password"
              />
              {!showPwd && device.password && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex items-center px-3 font-mono text-foreground/75 overflow-hidden whitespace-nowrap"
                >
                  {"*".repeat(device.password.length)}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 shrink-0"
                onClick={() => setShowPwd((value) => !value)}
              >
                {showPwd ? (
                  <>
                    <EyeOff className="h-3 w-3 mr-1" /> Скрыть
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3 mr-1" /> Показать пароль
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 shrink-0"
                onClick={() => copy(device.password ?? "")}
              >
                <Copy className="h-3 w-3 mr-1" /> Скопировать пароль
              </Button>
            </div>
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

        <Field label="Серийный номер">
          <Input
            value={device.serialNumber ?? ""}
            onChange={(e) => onUpdate({ serialNumber: e.target.value })}
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

        <Field label="Ответственный">
          <Input
            value={device.responsiblePerson ?? ""}
            onChange={(e) => onUpdate({ responsiblePerson: e.target.value })}
            className="h-8"
            disabled={!canEdit}
          />
        </Field>

        <Field label="Дата последней проверки">
          <Input
            type="date"
            value={device.lastCheckedAt ?? ""}
            onChange={(e) => onUpdate({ lastCheckedAt: e.target.value })}
            className="h-8"
            disabled={!canEdit}
          />
        </Field>

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
            <Field label="RTSP-строка">
              <div className="flex gap-1">
                <Input
                  value={device.rtspUrl ?? ""}
                  onChange={(e) => onUpdate({ rtspUrl: e.target.value })}
                  className="h-8 font-mono"
                  disabled={!canEdit}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 shrink-0"
                  onClick={() => copy(device.rtspUrl ?? "")}
                >
                  <Copy className="h-3 w-3 mr-1" /> Скопировать RTSP
                </Button>
              </div>
            </Field>
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
  onToggleConnection: (
    toDeviceId: string,
    cableType: CableType,
  ) => void;
  connectionTypeResolver: (target: Device) => CableType;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      <div className="max-h-44 overflow-y-auto space-y-1 rounded border bg-background/40 p-2">
        {candidates.length === 0 && <div className="text-[11px] text-muted-foreground">Нет устройств</div>}
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
}: {
  connection: DeviceConnection;
  canEdit: boolean;
  devices: Device[];
  onEnterEditMode: () => void;
  onUpdate: (p: Partial<DeviceConnection>) => void;
  onDelete: () => void;
}) {
  const fromName = devices.find((item) => item.id === connection.from.deviceId)?.name ?? "Точка A";
  const toName = devices.find((item) => item.id === connection.to.deviceId)?.name ?? "Точка B";
  const approxLength = (() => {
    const resolve = (endpoint: DeviceConnection["from"] | DeviceConnection["to"]) => {
      const device = endpoint.deviceId ? devices.find((item) => item.id === endpoint.deviceId) : null;
      if (!device) return { x: endpoint.x, y: endpoint.y };
      if (device.type === "camera") return { x: device.x, y: device.y };
      const size = device.type === "nvr" || device.type === "dvr" ? { width: 64, height: 36 } : { width: 72, height: 30 };
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
    return points.slice(1).reduce((sum, point, index) => {
      const prev = points[index];
      return sum + Math.hypot(point.x - prev.x, point.y - prev.y);
    }, 0).toFixed(1);
  })();

  return (
    <aside className="w-80 border-l bg-card overflow-y-auto">
      <div className="p-3 border-b flex items-center justify-between">
        <div className="font-semibold text-sm flex items-center gap-2">
          <span>Выбран: Кабель</span>
          {connection.locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
        {canEdit && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
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

      <div className="p-3 space-y-3 text-xs">
        <Field label="Тип кабеля">
          <Select
            value={connection.type}
            onValueChange={(value) => onUpdate({ type: value as CableType })}
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
  onDelete,
}: {
  el: MapElement;
  canEdit: boolean;
  onEnterEditMode: () => void;
  onUpdate: (p: Partial<MapElement>) => void;
  onDelete: () => void;
}) {
  return (
    <aside className="w-80 border-l bg-card overflow-y-auto">
      <div className="p-3 border-b flex items-center justify-between">
        <div className="font-semibold text-sm flex items-center gap-2">
          <span>
            Выбран: Элемент — {el.type === "room" ? "Помещение" : el.type === "wall" ? "Стена" : el.type === "door" ? "Дверь" : "Текст"}
          </span>
          {el.locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
        {canEdit && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
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
      <div className="p-3 space-y-3 text-xs">
        {(el.type === "room" || el.type === "text") && (
          <Field label="Подпись">
            <Input
              value={el.label ?? ""}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="h-8"
              disabled={!canEdit}
            />
          </Field>
        )}
        <Field label={el.type === "text" ? "Цвет текста" : "Цвет"}>
          <ColorControl
            value={el.color ?? (el.type === "text" ? "#111827" : "#64748b")}
            onChange={(color) => onUpdate({ color })}
            disabled={!canEdit}
          />
        </Field>
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
