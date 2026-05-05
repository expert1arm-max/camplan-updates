import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, Download, MapPin, Pencil, Trash2 } from "lucide-react";
import { useStore, statusLabels, statusColors } from "@/data/store";
import type { CameraStatus } from "@/types";
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
      { title: "Все камеры — CCTV Manager" },
      { name: "description", content: "Таблица всех камер видеонаблюдения." },
    ],
  }),
  component: CamerasPage,
});

type SortKey = "name" | "ip" | "status" | "lastCheckedAt";

function CamerasPage() {
  const { cameras, floors, objects, focusCamera, removeCamera } = useStore();
  const [search, setSearch] = useState("");
  const [objectFilter, setObjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const locationName = useCallback(
    (camera: (typeof cameras)[number]) => {
      const floor = floors.find((item) => item.id === camera.floorId);
      const object = objects.find(
        (item) => item.id === camera.objectId || item.id === floor?.objectId,
      );
      return { object: object?.name ?? "", floor: floor?.name ?? "", objectId: object?.id ?? "" };
    },
    [floors, objects],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = cameras.filter((camera) => {
      const place = locationName(camera);
      if (
        q &&
        !(
          camera.name.toLowerCase().includes(q) ||
          camera.ip.toLowerCase().includes(q) ||
          camera.location.toLowerCase().includes(q) ||
          place.object.toLowerCase().includes(q) ||
          place.floor.toLowerCase().includes(q) ||
          statusLabels[camera.status].toLowerCase().includes(q)
        )
      ) {
        return false;
      }

      if (objectFilter !== "all" && place.objectId !== objectFilter) return false;
      if (statusFilter !== "all" && camera.status !== statusFilter) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      const left = String(a[sortKey] ?? "");
      const right = String(b[sortKey] ?? "");
      return sortDir === "asc" ? left.localeCompare(right) : right.localeCompare(left);
    });
  }, [cameras, search, objectFilter, statusFilter, sortKey, sortDir, locationName]);

  const exportCsv = () => {
    const headers = [
      "name",
      "ip",
      "object",
      "floor",
      "status",
      "username",
      "password",
      "lastCheckedAt",
      "notes",
    ];
    const rows = filtered.map((camera) => {
      const place = locationName(camera);
      return [
        camera.name,
        camera.ip,
        place.object,
        place.floor,
        camera.status,
        camera.username,
        camera.password ? "******" : "",
        camera.lastCheckedAt,
        camera.notes,
      ]
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(",");
    });

    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cameras-${Date.now()}.csv`;
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
        <h1 className="font-semibold">Все камеры ({filtered.length})</h1>
        <div className="flex-1" />
        <Input
          placeholder="Поиск..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-56"
        />
        <Select value={objectFilter} onValueChange={setObjectFilter}>
          <SelectTrigger className="h-9 w-40">
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
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {(Object.keys(statusLabels) as CameraStatus[]).map((status) => (
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
                <TableHead className="cursor-pointer" onClick={() => toggleSort("name")}>
                  Название
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("ip")}>
                  IP
                </TableHead>
                <TableHead>Объект</TableHead>
                <TableHead>Зона</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("status")}>
                  Статус
                </TableHead>
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
              {filtered.map((camera) => {
                const place = locationName(camera);
                return (
                  <TableRow key={camera.id}>
                    <TableCell className="font-medium">{camera.name}</TableCell>
                    <TableCell className="font-mono text-xs">{camera.ip || "—"}</TableCell>
                    <TableCell>{place.object}</TableCell>
                    <TableCell>{place.floor}</TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          background: `${statusColors[camera.status]}22`,
                          color: statusColors[camera.status],
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: statusColors[camera.status] }}
                        />
                        {statusLabels[camera.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{camera.username}</TableCell>
                    <TableCell className="text-xs font-mono">
                      {camera.password ? "••••••" : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{camera.lastCheckedAt || "—"}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{camera.notes}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link to="/" onClick={() => focusCamera(camera.id)}>
                          <Button variant="ghost" size="sm">
                            <MapPin className="h-3 w-3 mr-1" /> На план
                          </Button>
                        </Link>
                        <Link to="/" onClick={() => focusCamera(camera.id)}>
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-3 w-3 mr-1" /> Правка
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            confirm(`Удалить камеру "${camera.name}"?`) && removeCamera(camera.id)
                          }
                        >
                          <Trash2 className="h-3 w-3 mr-1 text-destructive" /> Удалить
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    Камеры не найдены
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
