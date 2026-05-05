import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Toolbar } from "@/components/Toolbar";
import { Sidebar } from "@/components/Sidebar";
import { PlanCanvas } from "@/components/PlanCanvas";
import { PropertiesPanel } from "@/components/PropertiesPanel";
import { useStore, statusColors, statusLabels } from "@/data/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CCTV Manager" },
      {
        name: "description",
        content: "Планы помещений и карточки камер видеонаблюдения для объектов.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [search, setSearch] = useState("");
  const [highlight, setHighlight] = useState<string | null>(null);
  const { cameras, floors, objects, focusCamera } = useStore();

  const results = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();

    return cameras.filter((camera) => {
      const floor = floors.find((item) => item.id === camera.floorId);
      const object = objects.find(
        (item) => item.id === camera.objectId || item.id === floor?.objectId,
      );
      const status = statusLabels[camera.status].toLowerCase();
      return (
        camera.name.toLowerCase().includes(q) ||
        camera.ip.toLowerCase().includes(q) ||
        camera.location.toLowerCase().includes(q) ||
        object?.name.toLowerCase().includes(q) ||
        floor?.name.toLowerCase().includes(q) ||
        status.includes(q)
      );
    });
  }, [search, cameras, floors, objects]);

  const objectPath = (cameraId: string) => {
    const camera = cameras.find((item) => item.id === cameraId);
    if (!camera) return "";
    const floor = floors.find((item) => item.id === camera.floorId);
    const object = objects.find(
      (item) => item.id === camera.objectId || item.id === floor?.objectId,
    );
    return `${object?.name ?? "Без объекта"} / ${floor?.name ?? "Без зоны"}`;
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <Toolbar search={search} setSearch={setSearch} />
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar />
        <PlanCanvas highlightId={highlight} />
        <PropertiesPanel />

        {results.length > 0 && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[460px] bg-card border rounded-md shadow-lg z-20 max-h-80 overflow-y-auto">
            {results.map((camera) => (
              <button
                key={camera.id}
                className="w-full text-left px-3 py-2 hover:bg-accent border-b last:border-0 flex items-center gap-2"
                onClick={() => {
                  focusCamera(camera.id);
                  setHighlight(camera.id);
                  setSearch("");
                  window.setTimeout(() => setHighlight(null), 250);
                }}
              >
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ background: statusColors[camera.status] }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{camera.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {camera.ip || "без IP"} • {objectPath(camera.id)} •{" "}
                    {statusLabels[camera.status]}
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
