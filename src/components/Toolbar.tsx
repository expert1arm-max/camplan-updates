import { Link } from "@tanstack/react-router";
import {
  Camera,
  Check,
  Download,
  DoorOpen,
  Eye,
  Link2,
  Network,
  Pencil,
  Minus,
  Search,
  Server,
  Square,
  Type,
  Trash2,
  Upload,
  Wifi,
  RotateCcw,
  Table2,
  Zap,
} from "lucide-react";
import { useRef, useState } from "react";
import { useStore, deviceTypeLabels } from "@/data/store";
import type { CableType, DeviceType, EditorMode } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    cctvDesktop?: {
      openJsonFile: () => Promise<string | null>;
      saveTextFile: (payload: {
        defaultPath: string;
        content: string;
        filters: { name: string; extensions: string[] }[];
      }) => Promise<boolean>;
    };
  }
}

const tools: { mode: EditorMode; icon: typeof Square; label: string }[] = [
  { mode: "select", icon: Eye, label: "Выбор" },
  { mode: "room", icon: Square, label: "Комната" },
  { mode: "wall", icon: Minus, label: "Стена" },
  { mode: "door", icon: DoorOpen, label: "Дверь" },
  { mode: "text", icon: Type, label: "Текст" },
  { mode: "connector", icon: Link2, label: "Кабель" },
  { mode: "camera", icon: Camera, label: "Камера" },
  { mode: "nvr", icon: Server, label: "NVR" },
  { mode: "dvr", icon: Network, label: "DVR" },
  { mode: "switch", icon: Wifi, label: "Switch" },
  { mode: "poe_switch", icon: Zap, label: "PoE Switch" },
  { mode: "delete", icon: Trash2, label: "Удалить" },
];

export function Toolbar({ search, setSearch }: { search: string; setSearch: (s: string) => void }) {
  const {
    mode,
    isEditMode,
    currentCableType,
    setCableType,
    setEditMode,
    setMode,
    exportJSON,
    importJSON,
    resetDemo,
    savedAt,
  } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const saveFile = async (
    defaultPath: string,
    content: string,
    filters: { name: string; extensions: string[] }[],
  ) => {
    const bridge = window.cctvDesktop;
    if (bridge) {
      await bridge.saveTextFile({ defaultPath, content, filters });
      return;
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = defaultPath;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const handleExportJson = async () => {
    await saveFile(`cctv-export-${Date.now()}.json`, exportJSON(), [
      { name: "JSON", extensions: ["json"] },
    ]);
  };

  const handleExportCsv = async () => {
    const { devices, floors, objects } = useStore.getState();
    const csv = buildDeviceCsv(devices, floors, objects);
    await saveFile(`cctv-devices-${Date.now()}.csv`, csv, [{ name: "CSV", extensions: ["csv"] }]);
  };

  const handleImport = async () => {
    const bridge = window.cctvDesktop;
    if (bridge) {
      const text = await bridge.openJsonFile();
      if (text) {
        try {
          importJSON(text);
          alert("Импорт выполнен");
        } catch {
          alert("Ошибка импорта");
        }
      }
      return;
    }

    fileRef.current?.click();
  };

  return (
    <div
      className={cn(
        "border-b bg-card px-3 py-2 flex items-center gap-2 flex-wrap",
        isEditMode && "ring-1 ring-primary/15 bg-card/95",
      )}
    >
      <div className="flex items-center gap-2 mr-2">
        <div className="font-semibold text-sm">CCTV Manager</div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
            isEditMode
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
          )}
        >
          {isEditMode ? <Pencil className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {isEditMode ? "Редактирование" : "Просмотр"}
        </span>
        {!isEditMode && savedFlash && (
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            Изменения сохранены
          </span>
        )}
      </div>

      {isEditMode && (
        <div className="flex items-center gap-0.5 bg-muted rounded p-0.5">
          {tools.map((t) => (
            <button
              key={t.mode}
              title={t.label}
              onClick={() => setMode(t.mode)}
              className={cn(
                "h-8 w-8 flex items-center justify-center rounded transition-colors",
                mode === t.mode
                  ? "bg-background shadow-sm text-primary"
                  : "hover:bg-background/50",
              )}
            >
              <t.icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      )}

      {isEditMode && mode === "connector" && (
        <Select value={currentCableType} onValueChange={(value) => setCableType(value as CableType)}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="Тип кабеля" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="utp">UTP</SelectItem>
            <SelectItem value="ftp">FTP</SelectItem>
            <SelectItem value="coaxial">Coaxial</SelectItem>
            <SelectItem value="power">Power</SelectItem>
          </SelectContent>
        </Select>
      )}

      <div className="flex-1 max-w-md relative">
        <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск устройств: имя, IP, тип, объект, зона, статус"
          className="h-9 pl-8"
        />
      </div>

      <Link to="/cameras">
        <Button variant="outline" size="sm">
          <Table2 className="h-4 w-4 mr-1" /> Все устройства
        </Button>
      </Link>

      <Button
        variant={isEditMode ? "default" : "outline"}
        size="sm"
        onClick={() => {
          if (isEditMode) {
            setEditMode(false);
            setMode("select");
            setSavedFlash(true);
            window.setTimeout(() => setSavedFlash(false), 1500);
            return;
          }

          setEditMode(true);
          setSavedFlash(false);
        }}
      >
        {isEditMode ? <Check className="h-4 w-4 mr-1" /> : <Pencil className="h-4 w-4 mr-1" />}
        {isEditMode ? (savedFlash ? "Сохранено ✓" : "Завершить редактирование") : "Редактировать"}
      </Button>

      <Button variant="outline" size="sm" onClick={handleExportJson}>
        <Download className="h-4 w-4 mr-1" /> JSON
      </Button>

      <Button variant="outline" size="sm" onClick={handleExportCsv}>
        <Download className="h-4 w-4 mr-1" /> CSV
      </Button>

      <Button variant="outline" size="sm" onClick={handleImport}>
        <Upload className="h-4 w-4 mr-1" /> Импорт
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const text = await file.text();
          try {
            importJSON(text);
            alert("Импорт выполнен");
          } catch {
            alert("Ошибка импорта");
          }
          e.target.value = "";
        }}
      />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => confirm("Сбросить к демо-данным?") && resetDemo()}
      >
        <RotateCcw className="h-4 w-4" />
      </Button>

      <span className="text-xs text-muted-foreground ml-auto hidden lg:inline">
        Автосохранение • {new Date(savedAt).toLocaleTimeString()}
      </span>
    </div>
  );
}

function buildDeviceCsv(
  devices: ReturnType<typeof useStore.getState>["devices"],
  floors: ReturnType<typeof useStore.getState>["floors"],
  objects: ReturnType<typeof useStore.getState>["objects"],
) {
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const headers = [
    "type",
    "name",
    "ip",
    "object",
    "zone",
    "status",
    "model",
    "username",
    "password",
    "lastCheckedAt",
    "notes",
  ];

  const rows = devices.map((device) => {
    const floor = floors.find((item) => item.id === device.floorId);
    const object = objects.find(
      (item) => item.id === device.objectId || item.id === floor?.objectId,
    );
    return [
      deviceTypeLabels[device.type],
      device.name,
      device.ip ?? "",
      object?.name ?? "",
      floor?.name ?? "",
      device.status,
      device.model ?? "",
      device.username ?? "",
      device.password ? "******" : "",
      device.lastCheckedAt ?? "",
      device.notes ?? "",
    ]
      .map(escape)
      .join(",");
  });

  return "\uFEFF" + [headers.join(","), ...rows].join("\n");
}
