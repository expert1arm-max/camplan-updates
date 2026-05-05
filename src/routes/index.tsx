import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Toolbar } from "@/components/Toolbar";
import { Sidebar } from "@/components/Sidebar";
import { PlanCanvas } from "@/components/PlanCanvas";
import { PropertiesPanel } from "@/components/PropertiesPanel";
import { Button } from "@/components/ui/button";
import { deviceTypeLabels, statusColors, statusLabels, useStore } from "@/data/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CCTV Manager" },
      {
        name: "description",
        content: "Планы помещений и карточки устройств видеонаблюдения для объектов.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [search, setSearch] = useState("");
  const [highlight, setHighlight] = useState<string | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const { devices, floors, objects, focusDevice } = useStore();

  const results = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();

    return devices.filter((device) => {
      const floor = floors.find((item) => item.id === device.floorId);
      const object = objects.find(
        (item) => item.id === device.objectId || item.id === floor?.objectId,
      );
      const status = statusLabels[device.status].toLowerCase();
      return (
        device.name.toLowerCase().includes(q) ||
        (device.ip ?? "").toLowerCase().includes(q) ||
        deviceTypeLabels[device.type].toLowerCase().includes(q) ||
        (device.model ?? "").toLowerCase().includes(q) ||
        (device.location ?? "").toLowerCase().includes(q) ||
        (device.notes ?? "").toLowerCase().includes(q) ||
        object?.name.toLowerCase().includes(q) ||
        floor?.name.toLowerCase().includes(q) ||
        status.includes(q)
      );
    });
  }, [search, devices, floors, objects]);

  const objectPath = (deviceId: string) => {
    const device = devices.find((item) => item.id === deviceId);
    if (!device) return "";
    const floor = floors.find((item) => item.id === device.floorId);
    const object = objects.find(
      (item) => item.id === device.objectId || item.id === floor?.objectId,
    );
    return `${object?.name ?? "Без объекта"} / ${floor?.name ?? "Без зоны"}`;
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <Toolbar
        search={search}
        setSearch={setSearch}
      />
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex h-full flex-col overflow-hidden">
          <div className="border-r bg-card p-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-full justify-start"
              onClick={() => setLeftCollapsed((value) => !value)}
            >
              {leftCollapsed ? (
                <ChevronRight className="h-4 w-4 mr-1" />
              ) : (
                <ChevronLeft className="h-4 w-4 mr-1" />
              )}
              {leftCollapsed ? "Показать левое меню" : "Скрыть левое меню"}
            </Button>
          </div>
          {!leftCollapsed && <Sidebar />}
        </div>
        <PlanCanvas highlightId={highlight} />
        <div className="flex h-full flex-col overflow-hidden">
          <div className="border-l bg-card p-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-full justify-start"
              onClick={() => setRightCollapsed((value) => !value)}
            >
              {rightCollapsed ? (
                <ChevronLeft className="h-4 w-4 mr-1" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-1" />
              )}
              {rightCollapsed ? "Показать правое меню" : "Скрыть правое меню"}
            </Button>
          </div>
          {!rightCollapsed && <PropertiesPanel />}
        </div>

        {results.length > 0 && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[460px] bg-card border rounded-md shadow-lg z-20 max-h-80 overflow-y-auto">
            {results.map((device) => (
              <button
                key={device.id}
                className="w-full text-left px-3 py-2 hover:bg-accent border-b last:border-0 flex items-center gap-2"
                onClick={() => {
                  focusDevice(device.id);
                  setHighlight(device.id);
                  setSearch("");
                  window.setTimeout(() => setHighlight(null), 250);
                }}
              >
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ background: statusColors[device.status] }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {device.name} • {deviceTypeLabels[device.type]}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {(device.ip ?? "без IP") || "без IP"} • {objectPath(device.id)} •{" "}
                    {statusLabels[device.status]}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
