import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { Building2, ChevronRight, FolderTree, Map, Pencil, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/data/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EditingItem = { kind: "object"; id: string } | { kind: "floor"; id: string } | null;

export function Sidebar() {
  const {
    objects,
    floors,
    devices,
    activeObjectId,
    activeFloorId,
    isEditMode,
    focusObject,
    setActiveFloor,
    addObject,
    addFloor,
    removeObject,
    removeFloor,
    renameObject,
    renameFloor,
  } = useStore();

  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<EditingItem>(null);
  const [draftName, setDraftName] = useState("");
  const renameInputRef = useRef<HTMLInputElement | null>(null);

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

  const startRename = (next: Exclude<EditingItem, null>, name: string) => {
    if (!isEditMode) {
      return;
    }
    setEditing(next);
    setDraftName(name);
  };

  useEffect(() => {
    if (!editing) return;
    const focusInput = () => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    };
    const raf = window.requestAnimationFrame(focusInput);
    const timeout = window.setTimeout(focusInput, 50);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [editing]);

  const commitRename = useCallback(
    (nextDraftName = draftName) => {
      const name = nextDraftName.trim();
      if (!editing || !name) {
        setEditing(null);
        setDraftName("");
        return;
      }

      if (editing.kind === "object") {
        const object = objects.find((item) => item.id === editing.id);
        if (object) renameObject(object.id, name, object.description);
      } else {
        renameFloor(editing.id, name);
      }

      setEditing(null);
      setDraftName("");
    },
    [draftName, editing, objects, renameFloor, renameObject],
  );

  useEffect(() => {
    if (!editing) return;

    const commitOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("[data-sidebar-rename-root='true']")) return;

      const input = renameInputRef.current;
      commitRename(input?.value ?? draftName);
      input?.blur();
    };

    document.addEventListener("pointerdown", commitOutsidePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", commitOutsidePointerDown, true);
    };
  }, [commitRename, draftName, editing]);

  const previewRename = (nextDraftName: string) => {
    const name = nextDraftName.trim();
    if (!editing || !name) return;

    if (editing.kind === "object") {
      const object = objects.find((item) => item.id === editing.id);
      if (object && object.name !== name) {
        renameObject(object.id, name, object.description);
      }
      return;
    }

    const floor = floors.find((item) => item.id === editing.id);
    if (floor && floor.name !== name) {
      renameFloor(floor.id, name);
    }
  };

  const updateDraftName = (nextDraftName: string) => {
    setDraftName(nextDraftName);
    previewRename(nextDraftName);
  };

  const applyDraftInputEdit = (input: HTMLInputElement, nextValue: string, nextCursor: number) => {
    updateDraftName(nextValue);
    window.requestAnimationFrame(() => {
      input.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitRename(event.currentTarget.value);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setEditing(null);
      setDraftName("");
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const input = event.currentTarget;
    const current = input.value;
    const start = input.selectionStart ?? current.length;
    const end = input.selectionEnd ?? start;

    if (event.key.length === 1) {
      event.preventDefault();
      const nextValue = `${current.slice(0, start)}${event.key}${current.slice(end)}`;
      const nextCursor = start + event.key.length;
      applyDraftInputEdit(input, nextValue, nextCursor);
      return;
    }

    if (event.key === "Backspace") {
      if (start === 0 && end === 0) return;
      event.preventDefault();
      const nextStart = start === end ? Math.max(0, start - 1) : start;
      const nextValue = `${current.slice(0, nextStart)}${current.slice(end)}`;
      applyDraftInputEdit(input, nextValue, nextStart);
      return;
    }

    if (event.key === "Delete") {
      if (start === current.length && end === current.length) return;
      event.preventDefault();
      const nextEnd = start === end ? Math.min(current.length, end + 1) : end;
      const nextValue = `${current.slice(0, start)}${current.slice(nextEnd)}`;
      applyDraftInputEdit(input, nextValue, start);
    }
  };

  const handleRenamePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text");
    if (!text) return;

    event.preventDefault();
    const input = event.currentTarget;
    const current = input.value;
    const start = input.selectionStart ?? current.length;
    const end = input.selectionEnd ?? start;
    const nextValue = `${current.slice(0, start)}${text}${current.slice(end)}`;
    const nextCursor = start + text.length;

    applyDraftInputEdit(input, nextValue, nextCursor);
  };

  const focusPlanCanvas = () => {
    const focusCanvas = () => {
      const canvas = document.getElementById("plan-canvas-svg");
      canvas?.focus();
    };
    window.requestAnimationFrame(focusCanvas);
    window.setTimeout(focusCanvas, 50);
  };

  const createObject = () => {
    if (!isEditMode) {
      return;
    }
    const id = addObject("Новый объект");
    setOpen((current) => ({ ...current, [id]: true }));
    setEditing(null);
    setDraftName("");
    focusPlanCanvas();
  };

  const createFloor = (objectId = activeObjectId) => {
    if (!isEditMode || !objectId) {
      return;
    }
    addFloor(objectId, "Новая зона");
    setOpen((current) => ({ ...current, [objectId]: true }));
    setEditing(null);
    setDraftName("");
    focusPlanCanvas();
  };

  return (
    <aside className="w-72 border-r bg-card/95 backdrop-blur-sm flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FolderTree className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold leading-none">Структура</div>
              {isEditMode && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  title="Создать объект"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={createObject}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="mt-1 truncate text-[11px] text-muted-foreground">
              {activeObject ? activeObject.name : "Нет объекта"}
              {activeFloor ? ` / ${activeFloor.name}` : ""}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
        {objects.length === 0 && (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">
            Объекты еще не созданы.
          </div>
        )}

        <div className="space-y-0.5">
          {objects.map((object) => {
            const isOpen = open[object.id] ?? true;
            const isActiveObject = activeObjectId === object.id;
            const objectFloors = floors
              .filter((floor) => floor.objectId === object.id)
              .sort((a, b) => a.sortOrder - b.sortOrder);
            const isEditingObject = editing?.kind === "object" && editing.id === object.id;

            return (
              <div key={object.id}>
                <div
                  className={cn(
                    "group flex h-8 items-center gap-1 rounded-md px-1 text-sm",
                    isActiveObject
                      ? "bg-primary/12 text-primary"
                      : "text-foreground hover:bg-accent/60",
                  )}
                >
                  <button
                    type="button"
                    className="flex h-6 w-5 items-center justify-center rounded hover:bg-background/70"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpen((current) => ({ ...current, [object.id]: !isOpen }));
                    }}
                  >
                    <ChevronRight
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        isOpen ? "rotate-90" : "rotate-0",
                      )}
                    />
                  </button>

                  {isEditingObject ? (
                    <div
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      data-sidebar-rename-root="true"
                    >
                      <Building2 className="h-3.5 w-3.5 shrink-0 opacity-75" />
                      <Input
                        ref={renameInputRef}
                        data-sidebar-rename-kind="object"
                        data-sidebar-rename-id={object.id}
                        value={draftName}
                        onChange={(event) => {
                          updateDraftName(event.target.value);
                        }}
                        onBlur={(event) => {
                          commitRename(event.currentTarget.value);
                        }}
                        onKeyDown={handleRenameKeyDown}
                        onPaste={handleRenamePaste}
                        className="h-6 px-1 text-xs"
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() => focusObject(object.id)}
                      onDoubleClick={() => {
                        startRename({ kind: "object", id: object.id }, object.name);
                      }}
                    >
                      <Building2 className="h-3.5 w-3.5 shrink-0 opacity-75" />
                      <span className="truncate font-medium">{object.name}</span>
                    </button>
                  )}

                  <span className="rounded px-1.5 text-[10px] text-muted-foreground">
                    {objectFloors.length}
                  </span>

                  {isEditMode && (
                    <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        className="flex h-6 w-6 items-center justify-center rounded hover:bg-background/70"
                        title="Переименовать"
                        onClick={(event) => {
                          event.stopPropagation();
                          startRename({ kind: "object", id: object.id }, object.name);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="flex h-6 w-6 items-center justify-center rounded hover:bg-background/70"
                        title="Добавить этаж"
                        onClick={(event) => {
                          event.stopPropagation();
                          createFloor(object.id);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="flex h-6 w-6 items-center justify-center rounded text-destructive hover:bg-destructive/10"
                        title="Удалить объект"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (confirm(`Удалить объект "${object.name}"?`)) {
                            removeObject(object.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {isOpen && (
                  <div className="ml-[18px] border-l border-border/60 pl-2">
                    {objectFloors.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">Нет зон</div>
                    ) : (
                      objectFloors.map((floor) => {
                        const count = devices.filter(
                          (device) => device.floorId === floor.id,
                        ).length;
                        const isActiveFloor = activeFloorId === floor.id;
                        const isEditingFloor = editing?.kind === "floor" && editing.id === floor.id;

                        return (
                          <div
                            key={floor.id}
                            className={cn(
                              "group flex h-7 items-center gap-2 rounded-md px-2 text-xs",
                              isActiveFloor
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                            )}
                          >
                            {isEditingFloor ? (
                              <div
                                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                data-sidebar-rename-root="true"
                              >
                                <Map className="h-3.5 w-3.5 shrink-0 opacity-75" />
                                <Input
                                  ref={renameInputRef}
                                  data-sidebar-rename-kind="floor"
                                  data-sidebar-rename-id={floor.id}
                                  value={draftName}
                                  onChange={(event) => {
                                    updateDraftName(event.target.value);
                                  }}
                                  onBlur={(event) => {
                                    commitRename(event.currentTarget.value);
                                  }}
                                  onKeyDown={handleRenameKeyDown}
                                  onPaste={handleRenamePaste}
                                  className="h-5 px-1 text-xs"
                                  onMouseDown={(event) => event.stopPropagation()}
                                  onClick={(event) => event.stopPropagation()}
                                />
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                onClick={() => setActiveFloor(floor.id)}
                                onDoubleClick={() => {
                                  startRename({ kind: "floor", id: floor.id }, floor.name);
                                }}
                              >
                                <Map className="h-3.5 w-3.5 shrink-0 opacity-75" />
                                <span className="truncate">{floor.name}</span>
                              </button>
                            )}

                            <span
                              className={cn(
                                "rounded px-1 text-[10px]",
                                isActiveFloor
                                  ? "text-primary-foreground/75"
                                  : "text-muted-foreground",
                              )}
                            >
                              {count}
                            </span>

                            {isEditMode && (
                              <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
                                <button
                                  type="button"
                                  className="flex h-5 w-5 items-center justify-center rounded hover:bg-background/70"
                                  title="Переименовать"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    startRename({ kind: "floor", id: floor.id }, floor.name);
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  className="flex h-5 w-5 items-center justify-center rounded text-destructive hover:bg-destructive/10"
                                  title="Удалить зону"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    if (confirm(`Удалить зону "${floor.name}"?`)) {
                                      removeFloor(floor.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t px-3 py-2 text-[11px] text-muted-foreground">
        {isEditMode
          ? "Double click или карандаш переименовывает элемент."
          : "Режим просмотра: навигация доступна, изменения отключены."}
      </div>
    </aside>
  );
}
