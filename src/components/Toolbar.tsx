import { Link } from "@tanstack/react-router";
import {
  Camera,
  Check,
  CircleHelp,
  Download,
  DoorOpen,
  Eye,
  ChevronDown,
  FilePlus2,
  Link2,
  Network,
  Pencil,
  Minus,
  RotateCcw,
  Search,
  Server,
  Square,
  Type,
  Upload,
  Wifi,
  Table2,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStore, deviceTypeLabels } from "@/data/store";
import type { CableType, DeviceType, EditorMode } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type UpdateProgress = {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
};

type UpdateEvent =
  | { type: "checking"; message: string }
  | { type: "available"; version: string; message: string }
  | { type: "progress"; progress: UpdateProgress }
  | { type: "not-available"; message: string }
  | { type: "downloaded"; version: string; message: string }
  | { type: "error"; message: string };

declare global {
  interface Window {
    cctvDesktop?: {
      getAppVersion: () => Promise<string>;
      getLatestReleaseVersion: () => Promise<{
        state: "available" | "error";
        version?: string;
        tagName?: string;
        htmlUrl?: string;
        message?: string;
      }>;
      checkForUpdates: () => Promise<{
        state: "disabled" | "not-available" | "available" | "error";
        message: string;
        version?: string;
      }>;
      checkAndDownloadUpdate: () => Promise<{
        state: "disabled" | "not-available" | "downloaded" | "error";
        message: string;
        version?: string;
      }>;
      onUpdateEvent: (callback: (event: UpdateEvent) => void) => () => void;
      openJsonFile: () => Promise<string | null>;
      openExternal: (url: string) => Promise<boolean>;
      saveTextFile: (payload: {
        defaultPath: string;
        content: string;
        filters: { name: string; extensions: string[] }[];
      }) => Promise<boolean>;
      saveBinaryFile: (payload: {
        defaultPath: string;
        dataUrl: string;
        filters: { name: string; extensions: string[] }[];
      }) => Promise<boolean>;
    };
  }
}

const toolGroups: { title: string; items: { mode: EditorMode; icon: typeof Square; label: string }[] }[] =
  [
    {
      title: "Общее",
      items: [{ mode: "select", icon: Eye, label: "Выбор" }],
    },
    {
      title: "План",
      items: [
        { mode: "room", icon: Square, label: "Комната" },
        { mode: "wall", icon: Minus, label: "Стена" },
        { mode: "curved_wall", icon: RotateCcw, label: "Полукруглая стена" },
        { mode: "door", icon: DoorOpen, label: "Дверь" },
      ],
    },
    {
      title: "Сервис",
      items: [{ mode: "text", icon: Type, label: "Текст" }],
    },
    {
      title: "Кабель",
      items: [{ mode: "connector", icon: Link2, label: "Кабель" }],
    },
    {
      title: "Девайсы",
      items: [
        { mode: "camera", icon: Camera, label: "Камера" },
        { mode: "nvr", icon: Server, label: "NVR" },
        { mode: "dvr", icon: Network, label: "DVR" },
        { mode: "switch", icon: Wifi, label: "Switch" },
        { mode: "poe_switch", icon: Zap, label: "PoE Switch" },
      ],
    },
  ];

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
}

function formatDownloadProgress(progress: UpdateProgress | null) {
  if (!progress) {
    return "Ожидание данных...";
  }

  const transferred = formatBytes(progress.transferred);
  const total = formatBytes(progress.total);
  const speed = progress.bytesPerSecond > 0 ? ` • ${formatBytes(progress.bytesPerSecond)}/с` : "";
  return `${transferred} / ${total}${speed}`;
}

export function Toolbar({ search, setSearch }: { search: string; setSearch: (s: string) => void }) {
  const {
    mode,
    isEditMode,
    currentCableType,
    settings,
    clearSelection,
    setCableType,
    setEditMode,
    setMode,
    updateUiState,
    newProject,
    exportJSON,
    importJSON,
  } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [newProjectPromptOpen, setNewProjectPromptOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [appVersion, setAppVersion] = useState("0.1.1");
  const [githubVersion, setGithubVersion] = useState<string | null>(null);
  const [updateMessage, setUpdateMessage] = useState("");
  const [updatePhase, setUpdatePhase] = useState<"idle" | "checking" | "downloading" | "done" | "error">("idle");
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress | null>(null);
  const showIpLabels = settings.uiState?.showIpLabels ?? false;
  const updateAvailable = Boolean(githubVersion && githubVersion !== appVersion);

  useEffect(() => {
    const bridge = window.cctvDesktop;
    if (!bridge) return;

    let alive = true;
    void bridge.getAppVersion().then((version) => {
      if (alive && version) {
        setAppVersion(version);
      }
    });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const bridge = window.cctvDesktop;
    if (!bridge?.onUpdateEvent) return undefined;

    return bridge.onUpdateEvent((event) => {
      if (!event || typeof event !== "object") return;

      switch (event.type) {
        case "checking":
          setUpdateOpen(true);
          setUpdatePhase("checking");
          setUpdateProgress(null);
          setUpdateMessage(event.message);
          break;
        case "available":
          setUpdateOpen(true);
          setUpdatePhase("downloading");
          setUpdateMessage(event.message);
          break;
        case "progress":
          setUpdateOpen(true);
          setUpdatePhase("downloading");
          setUpdateProgress(event.progress);
          break;
        case "not-available":
          setUpdatePhase("done");
          setUpdateProgress(null);
          setUpdateMessage(event.message);
          break;
        case "downloaded":
          setUpdatePhase("done");
          setUpdateProgress(null);
          setUpdateMessage(event.message);
          break;
        case "error":
          setUpdatePhase("error");
          setUpdateProgress(null);
          setUpdateMessage(event.message);
          break;
      }
    });
  }, []);

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

  const handleExportJpg = async () => {
    const svg = document.getElementById("plan-canvas-svg") as SVGSVGElement | null;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const width = Math.max(1200, Math.round(svg.viewBox.baseVal.width || rect.width || 1200));
    const height = Math.max(800, Math.round(svg.viewBox.baseVal.height || rect.height || 800));

    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));

    const svgData = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas context unavailable"));
            return;
          }
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.95));
        };
        img.onerror = () => reject(new Error("Failed to render SVG"));
        img.src = url;
      });

      const bridge = window.cctvDesktop;
      if (bridge) {
        await bridge.saveBinaryFile({
          defaultPath: `cctv-map-${Date.now()}.jpg`,
          dataUrl,
          filters: [{ name: "JPEG", extensions: ["jpg", "jpeg"] }],
        });
        return;
      }

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `cctv-map-${Date.now()}.jpg`;
      a.click();
    } finally {
      URL.revokeObjectURL(url);
    }
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

  const handleNewProject = () => {
    const state = useStore.getState();
    const hasContent =
      state.objects.length > 0 ||
      state.floors.length > 0 ||
      state.mapElements.length > 0 ||
      state.devices.length > 0 ||
      state.deviceConnections.length > 0;

    if (hasContent) {
      setNewProjectPromptOpen(true);
      return;
    }

    newProject();
  };

  const handleNewProjectSave = async () => {
    setNewProjectPromptOpen(false);
    await handleExportJson();
    newProject();
  };

  const handleNewProjectNo = () => {
    setNewProjectPromptOpen(false);
    newProject();
  };

  const handleUpdateOpen = async () => {
    setUpdateOpen(true);
    setUpdatePhase("checking");
    setUpdateProgress(null);
    setGithubVersion(null);
    setUpdateMessage("Проверяем версию на GitHub...");

    const bridge = window.cctvDesktop;
    if (!bridge) {
      setUpdatePhase("error");
      setUpdateMessage("Проверка обновлений доступна только в Electron.");
      return;
    }

    const result = await bridge.getLatestReleaseVersion();

    if (result.state === "available" && result.version) {
      setGithubVersion(result.version);
      setUpdatePhase("done");
      setUpdateProgress(null);
      if (result.version === appVersion) {
        setUpdateMessage("Обновлено до последней версии.");
        return;
      }

      setUpdateMessage(`Доступна версия ${result.version}.`);
      return;
    }

    if (result.state === "error") {
      setUpdatePhase("error");
      setUpdateProgress(null);
      setUpdateMessage(result.message || "Не удалось получить версию GitHub Releases.");
    }
  };

  const handleUpdateInstall = async () => {
    const bridge = window.cctvDesktop;
    if (!bridge || !updateAvailable) {
      return;
    }

    setUpdatePhase("downloading");
    setUpdateProgress(null);
    setUpdateMessage(`Скачиваем версию ${githubVersion}...`);

    const result = await bridge.checkAndDownloadUpdate();

    if (result.state === "not-available") {
      setGithubVersion(appVersion);
      setUpdatePhase("done");
      setUpdateProgress(null);
      setUpdateMessage("Обновлено до последней версии.");
      return;
    }

    if (result.state === "downloaded") {
      setGithubVersion(result.version ?? githubVersion);
      setUpdatePhase("done");
      setUpdateProgress(null);
      setUpdateMessage(result.message);
      return;
    }

    if (result.state === "error" || result.state === "disabled") {
      setUpdatePhase("error");
      setUpdateProgress(null);
      setUpdateMessage(result.message);
    }
  };

  return (
    <div
      className={cn(
        "border-b bg-card px-3 py-2 flex items-center gap-2 flex-wrap",
        isEditMode && "ring-1 ring-primary/15 bg-card/95",
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Файл
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={handleNewProject}>
            <FilePlus2 className="h-4 w-4" /> Новый проект
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExportJson}>
            <Download className="h-4 w-4" /> Сохранить проект
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleImport}>
            <Upload className="h-4 w-4" /> Открыть проект
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExportJpg}>
            <Download className="h-4 w-4" /> Экспорт JPG
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportCsv}>
            <Download className="h-4 w-4" /> Экспорт CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={newProjectPromptOpen} onOpenChange={setNewProjectPromptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Создать новый проект?</AlertDialogTitle>
            <AlertDialogDescription>
              Текущий проект будет закрыт. Можно сохранить его в JSON-файл перед созданием нового,
              либо закрыть без сохранения.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNewProjectPromptOpen(false)}>
              Отмена
            </AlertDialogCancel>
            <Button variant="outline" onClick={handleNewProjectNo}>
              Нет
            </Button>
            <AlertDialogAction onClick={handleNewProjectSave}>
              Сохранить и создать
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={updateOpen}
        onOpenChange={(open) => {
          if (!open && (updatePhase === "checking" || updatePhase === "downloading")) {
            return;
          }

          setUpdateOpen(open);

          if (!open) {
            setUpdatePhase("idle");
            setUpdateProgress(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Обновить программу</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Данная версия</span>
                  <span className="font-medium">{appVersion}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Версия на GitHub</span>
                  <span className="font-medium">
                    {githubVersion ?? (updatePhase === "checking" ? "Проверяем..." : "Не определена")}
                  </span>
                </div>
              </div>

              {updatePhase !== "idle" && updateMessage ? (
                <div className="text-sm text-muted-foreground">{updateMessage}</div>
              ) : null}

              {updatePhase === "downloading" ? (
                <div className="space-y-3">
                  <Progress value={updateProgress?.percent ?? 0} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{Math.round(updateProgress?.percent ?? 0)}%</span>
                    <span>{formatDownloadProgress(updateProgress)}</span>
                  </div>
                </div>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUpdateOpen(false)}>Закрыть</AlertDialogCancel>
            <Button onClick={handleUpdateInstall} disabled={!updateAvailable || updatePhase === "checking" || updatePhase === "downloading"}>
              Обновить
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button
        variant="outline"
        size="sm"
        className={cn(
          "min-w-[176px] justify-center whitespace-nowrap",
          isEditMode &&
            "border-amber-500/30 bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300",
        )}
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

      <Link to="/cameras">
        <Button variant="outline" size="sm">
          <Table2 className="h-4 w-4 mr-1" /> Все устройства
        </Button>
      </Link>

      <Button variant="outline" size="sm" onClick={handleUpdateOpen}>
        <CircleHelp className="h-4 w-4 mr-1" />
        О программе
      </Button>

      <Button
        variant={showIpLabels ? "default" : "outline"}
        size="sm"
        onClick={() => updateUiState({ showIpLabels: !showIpLabels })}
      >
        <Network className="h-4 w-4 mr-1" />
        {showIpLabels ? "Скрыть IP адреса" : "Показать IP адреса"}
      </Button>

      {isEditMode && mode === "connector" && (
        <Select
          value={currentCableType}
          onValueChange={(value) => setCableType(value as CableType)}
        >
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

      {isEditMode && (
        <div className="flex items-stretch gap-1 rounded bg-muted p-0.5">
          {toolGroups.map((group, groupIndex) => (
            <div
              key={group.title}
              className={cn(
                "flex items-center gap-0.5",
                groupIndex > 0 && "border-l border-border pl-1.5 ml-0.5",
              )}
              aria-label={group.title}
            >
              {group.items.map((t) => (
                <button
                  key={t.mode}
                  title={t.label}
                  onClick={() => {
                    if (t.mode !== "select") {
                      clearSelection();
                    }
                    setMode(t.mode);
                  }}
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
          ))}
        </div>
      )}

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
