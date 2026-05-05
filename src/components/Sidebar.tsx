import { useEffect, useMemo, useState } from "react";
import { Building2, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/data/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function Sidebar() {
  const {
    objects,
    floors,
    devices,
    activeObjectId,
    activeFloorId,
    isEditMode,
    setActiveObject,
    setActiveFloor,
    addObject,
    addFloor,
    removeObject,
    removeFloor,
    renameObject,
    renameFloor,
  } = useStore();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [newObj, setNewObj] = useState("");
  const [newFloor, setNewFloor] = useState<Record<string, string>>({});

  useEffect(() => {
    setOpen((current) => {
      const next = { ...current };
      for (const object of objects) {
        if (next[object.id] === undefined) {
          next[object.id] = true;
        }
      }
      if (activeObjectId) {
        next[activeObjectId] = true;
      }
      return next;
    });
  }, [objects, activeObjectId]);

  const activeObject = useMemo(
    () => objects.find((object) => object.id === activeObjectId) ?? objects[0] ?? null,
    [objects, activeObjectId],
  );
  const activeFloor = useMemo(
    () => floors.find((floor) => floor.id === activeFloorId) ?? null,
    [floors, activeFloorId],
  );

  if (!isEditMode) {
    return (
      <aside className="w-72 border-r bg-card flex flex-col h-full overflow-hidden">
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-4 w-4" /> Объекты
          </div>
          <div className="text-[11px] text-muted-foreground">
            Режим просмотра: можно выбирать объект и зону, но редактирование отключено.
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {objects.length === 0 && (
            <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
              Нет объектов.
            </div>
          )}

          {objects.map((object) => {
            const isOpen = open[object.id] ?? true;
            const objectFloors = floors
              .filter((floor) => floor.objectId === object.id)
              .sort((a, b) => a.sortOrder - b.sortOrder);

            return (
              <div key={object.id} className="rounded-md">
                <button
                  type="button"
                  onClick={() => {
                    setActiveObject(object.id);
                    setOpen((current) => ({ ...current, [object.id]: !isOpen }));
                  }}
                  className={cn(
                    "w-full flex items-center gap-1 px-2 py-1.5 rounded text-sm group text-left",
                    activeObjectId === object.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent",
                  )}
                >
                  <span onClick={(e) => e.stopPropagation()}>
                    {isOpen ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </span>
                  <span className="flex-1 font-medium truncate">{object.name}</span>
                  <span className="opacity-70 text-xs">{objectFloors.length}</span>
                </button>

                {isOpen && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {objectFloors.length === 0 && (
                      <div className="px-2 py-1 text-xs text-muted-foreground">Нет зон</div>
                    )}
                    {objectFloors.map((floor) => {
                      const count = devices.filter((device) => device.floorId === floor.id).length;
                      return (
                        <button
                          key={floor.id}
                          className={cn(
                            "w-full flex items-center gap-1 px-2 py-1 rounded text-xs text-left",
                            activeFloorId === floor.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-accent",
                          )}
                          onClick={() => setActiveFloor(floor.id)}
                        >
                          <span className="flex-1 truncate">{floor.name}</span>
                          <span className="opacity-70">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {activeFloor && (
          <div className="border-t p-3 space-y-2">
            <div className="text-xs font-semibold">Активная зона</div>
            <div className="rounded-md border bg-background/60 px-2 py-1 text-xs">
              {activeFloor.name}
            </div>
          </div>
        )}
      </aside>
    );
  }

  const floorsForActiveObject = activeObject
    ? floors
        .filter((floor) => floor.objectId === activeObject.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  return (
    <aside className="w-72 border-r bg-card flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Building2 className="h-4 w-4" /> Объекты
        </div>
        <div className="flex gap-1">
          <Input
            value={newObj}
            onChange={(e) => setNewObj(e.target.value)}
            placeholder="Новый объект"
            className="h-8 text-xs"
          />
          <Button
            size="sm"
            variant="secondary"
            className="h-8 px-2"
            onClick={() => {
              if (newObj.trim()) {
                addObject(newObj.trim());
                setNewObj("");
              }
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {activeObject && (
          <div className="rounded-md border bg-background/60 p-2 space-y-2">
            <div className="text-xs font-semibold">Активный объект</div>
            <Input
              value={activeObject.name}
              onChange={(e) =>
                renameObject(activeObject.id, e.target.value, activeObject.description)
              }
              className="h-8 text-xs"
              placeholder="Название объекта"
            />
            <Textarea
              value={activeObject.description ?? ""}
              onChange={(e) => renameObject(activeObject.id, activeObject.name, e.target.value)}
              className="min-h-16 text-xs"
              placeholder="Описание"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => addFloor(activeObject.id, "Новая зона")}
              >
                <Plus className="h-3 w-3 mr-1" /> Зона
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-8 text-xs"
                onClick={() =>
                  confirm(`Удалить объект "${activeObject.name}"?`) && removeObject(activeObject.id)
                }
              >
                <Trash2 className="h-3 w-3 mr-1" /> Удалить
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {objects.length === 0 && (
          <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
            Нет объектов. Создайте первый объект сверху.
          </div>
        )}

        {objects.map((object) => {
          const isOpen = open[object.id] ?? true;
          const objectFloors = floors
            .filter((floor) => floor.objectId === object.id)
            .sort((a, b) => a.sortOrder - b.sortOrder);

          return (
            <div key={object.id} className="rounded-md">
              <button
                type="button"
                onClick={() => {
                  setActiveObject(object.id);
                  setOpen((current) => ({ ...current, [object.id]: !isOpen }));
                }}
                className={cn(
                  "w-full flex items-center gap-1 px-2 py-1.5 rounded text-sm group text-left",
                  activeObjectId === object.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent",
                )}
              >
                <span onClick={(e) => e.stopPropagation()}>
                  {isOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </span>
                <span className="flex-1 font-medium truncate">{object.name}</span>
                <span className="opacity-70 text-xs">{objectFloors.length}</span>
              </button>

              {isOpen && (
                <div className="ml-4 mt-1 space-y-0.5">
                  {objectFloors.length === 0 && (
                    <div className="px-2 py-1 text-xs text-muted-foreground">Нет зон</div>
                  )}
                  {objectFloors.map((floor) => {
                    const count = devices.filter((device) => device.floorId === floor.id).length;
                    return (
                      <div
                        key={floor.id}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer group",
                          activeFloorId === floor.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent",
                        )}
                        onClick={() => setActiveFloor(floor.id)}
                      >
                        <span className="flex-1 truncate">{floor.name}</span>
                        <span className="opacity-70">{count}</span>
                        <button
                          className="opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Удалить зону "${floor.name}"?`)) removeFloor(floor.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}

                  <div className="flex gap-1 mt-1">
                    <Input
                      value={newFloor[object.id] ?? ""}
                      onChange={(e) => setNewFloor({ ...newFloor, [object.id]: e.target.value })}
                      placeholder="Новая зона"
                      className="h-7 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => {
                        const name = newFloor[object.id]?.trim();
                        if (name) {
                          addFloor(object.id, name);
                          setNewFloor({ ...newFloor, [object.id]: "" });
                        }
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activeFloor && (
        <div className="border-t p-3 space-y-2">
          <div className="text-xs font-semibold">Активная зона</div>
          <Input
            value={activeFloor.name}
            onChange={(e) => renameFloor(activeFloor.id, e.target.value)}
            className="h-8 text-xs"
          />
          <div className="text-[11px] text-muted-foreground">Порядок: {activeFloor.sortOrder}</div>
        </div>
      )}
    </aside>
  );
}
