import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, Download, MapPin, Trash2 } from "lucide-react";
import { deviceTypeLabels, statusColors, statusLabels, useStore } from "@/data/store";
import type { DeviceStatus, DeviceType } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/cameras")({
  head: () => ({
    meta: [
      { title: "Все устройства — CamPlan" },
      { name: "description", content: "Таблица всех устройств видеонаблюдения." },
    ],
  }),
  component: DevicesPage,
});

type SortKey = "type" | "name" | "ip" | "object" | "floor" | "status" | "lastCheckedAt";

function DevicesPage() {
  const { devices, floors, objects, focusDevice, removeDevice, isEditMode } = useStore();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [objectFilter, setObjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [revealedPasswordId, setRevealedPasswordId] = useState<string | null>(null);

  const locationName = useCallback(
    (device: (typeof devices)[number]) => {
      const floor = floors.find((item) => item.id === device.floorId);
      const object = objects.find(
        (item) => item.id === device.objectId || item.id === floor?.objectId,
      );
      return { object: object?.name ?? "", floor: floor?.name ?? "", objectId: object?.id ?? "" };
    },
    [floors, objects],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = devices.filter((device) => {
      const place = locationName(device);
      if (
        q &&
        !(
          device.name.toLowerCase().includes(q) ||
          (device.ip ?? "").toLowerCase().includes(q) ||
          deviceTypeLabels[device.type].toLowerCase().includes(q) ||
          (device.model ?? "").toLowerCase().includes(q) ||
          (device.location ?? "").toLowerCase().includes(q) ||
          (device.notes ?? "").toLowerCase().includes(q) ||
          place.object.toLowerCase().includes(q) ||
          place.floor.toLowerCase().includes(q) ||
          statusLabels[device.status].toLowerCase().includes(q)
        )
      ) {
        return false;
      }

      if (typeFilter !== "all" && device.type !== typeFilter) return false;
      if (objectFilter !== "all" && place.objectId !== objectFilter) return false;
      if (statusFilter !== "all" && device.status !== statusFilter) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      const left =
        sortKey === "object" || sortKey === "floor"
          ? locationName(a)[sortKey]
          : String(a[sortKey] ?? "");
      const right =
        sortKey === "object" || sortKey === "floor"
          ? locationName(b)[sortKey]
          : String(b[sortKey] ?? "");
      return sortDir === "asc" ? left.localeCompare(right) : right.localeCompare(left);
    });
  }, [devices, search, typeFilter, objectFilter, statusFilter, sortKey, sortDir, locationName]);

  const exportCsv = () => {
    const headers = [
      "type",
      "name",
      "ip",
      "object",
      "floor",
      "status",
      "model",
      "username",
      "password",
      "lastCheckedAt",
      "notes",
    ];
    const rows = filtered.map((device) => {
      const place = locationName(device);
      return [
        deviceTypeLabels[device.type],
        device.name,
        device.ip ?? "",
        place.object,
        place.floor,
        device.status,
        device.model ?? "",
        device.username ?? "",
        device.password ? "******" : "",
        device.lastCheckedAt ?? "",
        device.notes ?? "",
      ]
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(",");
    });

    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `devices-${Date.now()}.csv`;
    a.click();
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3 flex items-center gap-3 flex-wrap">
        <Link to="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> К плану
          </Button>
        </Link>
        <h1 className="font-semibold">Все устройства ({filtered.length})</h1>
        <div className="flex-1" />
        <Input
          placeholder="Поиск..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-56"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger
            className={cn(
              "h-9 w-44",
              typeFilter !== "all" && "border-destructive/70 bg-destructive/5 text-destructive",
            )}
          >
            <SelectValue placeholder="Тип" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {(Object.keys(deviceTypeLabels) as DeviceType[]).map((type) => (
              <SelectItem key={type} value={type}>
                {deviceTypeLabels[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={objectFilter} onValueChange={setObjectFilter}>
          <SelectTrigger
            className={cn(
              "h-9 w-40",
              objectFilter !== "all" && "border-destructive/70 bg-destructive/5 text-destructive",
            )}
          >
            <SelectValue placeholder="Объект" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все объекты</SelectItem>
            {objects.map((object) => (
              <SelectItem key={object.id} value={object.id}>
                {object.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            className={cn(
              "h-9 w-44",
              statusFilter !== "all" && "border-destructive/70 bg-destructive/5 text-destructive",
            )}
          >
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {(Object.keys(statusLabels) as DeviceStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                {statusLabels[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-1" /> CSV
        </Button>
      </header>

      <div className="p-4">
        <div className="rounded-md border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("type")}>
                  Тип
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("name")}>
                  Название
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("ip")}>
                  IP
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("object")}>
                  Объект
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("floor")}>
                  Зона
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("status")}>
                  Статус
                </TableHead>
                <TableHead>Модель</TableHead>
                <TableHead>Логин</TableHead>
                <TableHead>Пароль</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("lastCheckedAt")}>
                  Проверка
                </TableHead>
                <TableHead>Заметки</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((device) => {
                const place = locationName(device);
                return (
                  <TableRow key={device.id}>
                    <TableCell className="text-xs font-medium">
                      {deviceTypeLabels[device.type]}
                    </TableCell>
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell className="font-mono text-xs">{device.ip || "—"}</TableCell>
                    <TableCell>{place.object}</TableCell>
                    <TableCell>{place.floor}</TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          background: `${statusColors[device.status]}22`,
                          color: statusColors[device.status],
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: statusColors[device.status] }}
                        />
                        {statusLabels[device.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{device.model ?? "—"}</TableCell>
                    <TableCell className="text-xs">{device.username ?? "—"}</TableCell>
                    <TableCell className="text-xs font-mono">
                      {device.password ? (
                        <button
                          type="button"
                          className="rounded px-1 py-0.5 text-left hover:bg-muted"
                          onClick={() =>
                            setRevealedPasswordId((current) =>
                              current === device.id ? null : device.id,
                            )
                          }
                          title="Показать или скрыть пароль"
                        >
                          {revealedPasswordId === device.id ? device.password : "••••••"}
                        </button>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{device.lastCheckedAt || "—"}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">
                      {device.notes ?? ""}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link to="/" onClick={() => focusDevice(device.id)}>
                          <Button variant="ghost" size="sm">
                            <MapPin className="h-3 w-3 mr-1" /> На план
                          </Button>
                        </Link>
                        {isEditMode && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                confirm(`Удалить устройство "${device.name}"?`) &&
                                removeDevice(device.id)
                              }
                            >
                              <Trash2 className="h-3 w-3 mr-1 text-destructive" /> Удалить
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                    Устройства не найдены
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
