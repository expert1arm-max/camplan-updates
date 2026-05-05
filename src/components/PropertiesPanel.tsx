import { useState, type ReactNode } from "react";
import { Copy, Eye, EyeOff, Files, Trash2 } from "lucide-react";
import { useStore, statusLabels } from "@/data/store";
import type { Camera, CameraStatus, MapElement } from "@/types";
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

const statuses: CameraStatus[] = ["working", "offline", "needs_check", "reserve", "no_access"];

export function PropertiesPanel() {
  const {
    selectedId,
    selectedKind,
    isEditMode,
    cameras,
    mapElements,
    updateCamera,
    updateElement,
    removeCamera,
    duplicateCamera,
    removeElement,
  } = useStore();

  if (!selectedId || !selectedKind) {
    return (
      <aside className="w-80 border-l bg-card p-4 text-sm text-muted-foreground overflow-y-auto">
        Выберите камеру или элемент на плане, чтобы редактировать его свойства.
        <div className="mt-4 space-y-2 text-xs">
          <div className="font-semibold text-foreground">Подсказки:</div>
          <div>• Двойной клик по камере — открыть карточку</div>
          <div>• Перетаскивайте элементы мышкой</div>
          <div>• Синяя точка возле камеры — поворот</div>
          <div>• Delete — удалить выбранное</div>
        </div>
      </aside>
    );
  }

  if (selectedKind === "camera") {
    const camera = cameras.find((item) => item.id === selectedId);
    if (!camera) return null;
    return (
      <CameraPanel
        cam={camera}
        canEdit={isEditMode}
        onUpdate={(patch) => updateCamera(camera.id, patch)}
        onDelete={() => removeCamera(camera.id)}
        onDup={() => duplicateCamera(camera.id)}
      />
    );
  }

  const element = mapElements.find((item) => item.id === selectedId);
  if (!element) return null;
  return (
    <ElementPanel
      el={element}
      canEdit={isEditMode}
      onUpdate={(patch) => updateElement(element.id, patch)}
      onDelete={() => removeElement(element.id)}
    />
  );
}

function CameraPanel({
  cam,
  canEdit,
  onUpdate,
  onDelete,
  onDup,
}: {
  cam: Camera;
  canEdit: boolean;
  onUpdate: (p: Partial<Camera>) => void;
  onDelete: () => void;
  onDup: () => void;
}) {
  const [showPwd, setShowPwd] = useState(false);
  const copy = (value: string) => navigator.clipboard.writeText(value);

  return (
    <aside className="w-80 border-l bg-card overflow-y-auto">
      <div className="p-3 border-b sticky top-0 bg-card flex items-center justify-between z-10">
        <div className="font-semibold text-sm truncate">{cam.name || "Камера"}</div>
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

      <div className="p-3 space-y-3 text-xs">
        <Field label="Название">
          <Input
            value={cam.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="h-8"
            disabled={!canEdit}
          />
        </Field>

        <Field label="Статус">
          <Select
            value={cam.status}
            onValueChange={(value) => onUpdate({ status: value as CameraStatus })}
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

        <Field label="IP-адрес">
          <div className="flex gap-1">
            <Input
              value={cam.ip}
              onChange={(e) => onUpdate({ ip: e.target.value })}
              className="h-8"
              disabled={!canEdit}
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 shrink-0"
              onClick={() => copy(cam.ip)}
            >
              <Copy className="h-3 w-3 mr-1" /> Скопировать IP
            </Button>
          </div>
        </Field>

        <Field label="Логин">
          <Input
            value={cam.username}
            onChange={(e) => onUpdate({ username: e.target.value })}
            className="h-8"
            disabled={!canEdit}
          />
        </Field>

        <Field label="Пароль">
          <div className="flex gap-1">
            <Input
              type={showPwd ? "text" : "password"}
              value={cam.password}
              onChange={(e) => onUpdate({ password: e.target.value })}
              className="h-8 font-mono"
              disabled={!canEdit}
            />
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
              onClick={() => copy(cam.password)}
            >
              <Copy className="h-3 w-3 mr-1" /> Скопировать пароль
            </Button>
          </div>
          {/* TODO: later master password encryption. */}
        </Field>

        <Field label="RTSP-строка">
          <div className="flex gap-1">
            <Input
              value={cam.rtspUrl}
              onChange={(e) => onUpdate({ rtspUrl: e.target.value })}
              className="h-8 font-mono"
              disabled={!canEdit}
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 shrink-0"
              onClick={() => copy(cam.rtspUrl)}
            >
              <Copy className="h-3 w-3 mr-1" /> Скопировать RTSP
            </Button>
          </div>
        </Field>

        <Field label="Модель">
          <Input
            value={cam.model}
            onChange={(e) => onUpdate({ model: e.target.value })}
            className="h-8"
            disabled={!canEdit}
          />
        </Field>

        <Field label="Серийный номер">
          <Input
            value={cam.serialNumber}
            onChange={(e) => onUpdate({ serialNumber: e.target.value })}
            className="h-8"
            disabled={!canEdit}
          />
        </Field>

        <Field label="Место установки">
          <Input
            value={cam.location}
            onChange={(e) => onUpdate({ location: e.target.value })}
            className="h-8"
            disabled={!canEdit}
          />
        </Field>

        <Field label="Ответственный">
          <Input
            value={cam.responsiblePerson}
            onChange={(e) => onUpdate({ responsiblePerson: e.target.value })}
            className="h-8"
            disabled={!canEdit}
          />
        </Field>

        <Field label="Дата последней проверки">
          <Input
            type="date"
            value={cam.lastCheckedAt}
            onChange={(e) => onUpdate({ lastCheckedAt: e.target.value })}
            className="h-8"
            disabled={!canEdit}
          />
        </Field>

        <Field label="Заметки">
          <Textarea
            value={cam.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            rows={3}
            disabled={!canEdit}
          />
        </Field>

        <div className="pt-2 border-t space-y-3">
          <div className="font-semibold text-foreground">Обзор</div>
          <Field label={`Угол обзора: ${cam.fovAngle}°`}>
            <Slider
              value={[cam.fovAngle]}
              min={30}
              max={360}
              step={10}
              onValueChange={(value) => onUpdate({ fovAngle: value[0] })}
              disabled={!canEdit}
            />
          </Field>
          <Field label={`Дальность: ${cam.fovDistance}px`}>
            <Slider
              value={[cam.fovDistance]}
              min={40}
              max={400}
              step={10}
              onValueChange={(value) => onUpdate({ fovDistance: value[0] })}
              disabled={!canEdit}
            />
          </Field>
          <Field label={`Поворот: ${Math.round(cam.rotation)}°`}>
            <Slider
              value={[cam.rotation]}
              min={-180}
              max={180}
              step={5}
              onValueChange={(value) => onUpdate({ rotation: value[0] })}
              disabled={!canEdit}
            />
          </Field>
        </div>
      </div>
    </aside>
  );
}

function ElementPanel({
  el,
  canEdit,
  onUpdate,
  onDelete,
}: {
  el: MapElement;
  canEdit: boolean;
  onUpdate: (p: Partial<MapElement>) => void;
  onDelete: () => void;
}) {
  return (
    <aside className="w-80 border-l bg-card overflow-y-auto">
      <div className="p-3 border-b flex items-center justify-between">
        <div className="font-semibold text-sm">Элемент: {el.type}</div>
        {canEdit && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
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
        {el.type !== "text" && (
          <>
            <Field label="Цвет">
              <input
                type="color"
                value={el.color ?? "#dbeafe"}
                onChange={(e) => onUpdate({ color: e.target.value })}
                className="h-8 w-full rounded border"
                disabled={!canEdit}
              />
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
          </>
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
