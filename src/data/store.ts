import { create } from "zustand";
import { nanoid } from "nanoid";
import type {
  AppData,
  AppSettings,
  Camera,
  CameraStatus,
  EditorMode,
  Floor,
  MapElement,
  SiteObject,
} from "@/types";
import { createDemoData } from "./demo";
import { loadAppData, normalizeAppData, saveAppData } from "./repository";

interface State extends AppData {
  activeObjectId: string | null;
  activeFloorId: string | null;
  selectedId: string | null;
  selectedKind: "camera" | "element" | null;
  mode: EditorMode;
  isEditMode: boolean;
  savedAt: number;
  isHydrated: boolean;
  history: EditorSnapshot[];
  future: EditorSnapshot[];

  hydrate: (data: AppData) => void;
  setActiveObject: (id: string | null) => void;
  setActiveFloor: (id: string | null) => void;
  focusCamera: (id: string) => void;
  focusElement: (id: string) => void;
  setEditMode: (enabled: boolean) => void;
  setMode: (m: EditorMode) => void;
  select: (id: string | null, kind: "camera" | "element" | null) => void;

  addObject: (name: string) => void;
  renameObject: (id: string, name: string, description?: string) => void;
  removeObject: (id: string) => void;

  addFloor: (objectId: string, name: string) => void;
  renameFloor: (id: string, name: string) => void;
  removeFloor: (id: string) => void;

  addElement: (element: Omit<MapElement, "id" | "createdAt" | "updatedAt">) => string;
  updateElement: (id: string, patch: Partial<MapElement>) => void;
  removeElement: (id: string) => void;

  addCamera: (camera: Omit<Camera, "id" | "createdAt" | "updatedAt">) => string;
  updateCamera: (id: string, patch: Partial<Camera>) => void;
  removeCamera: (id: string) => void;
  duplicateCamera: (id: string) => void;
  copySelected: () => void;
  pasteClipboard: () => void;

  undo: () => void;
  redo: () => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  importJSON: (data: string) => void;
  exportJSON: () => string;
  resetDemo: () => void;
}

type EditorSnapshot = AppData & {
  activeObjectId: string | null;
  activeFloorId: string | null;
  selectedId: string | null;
  selectedKind: "camera" | "element" | null;
  mode: EditorMode;
  isEditMode: boolean;
};

type ClipboardItem =
  | { kind: "camera"; camera: Camera }
  | { kind: "element"; element: MapElement };

let clipboardItem: ClipboardItem | null = null;

function timestamp() {
  return new Date().toISOString();
}

function selectData(state: State): AppData {
  return {
    objects: state.objects,
    floors: state.floors,
    mapElements: state.mapElements,
    cameras: state.cameras,
    settings: state.settings,
  };
}

function snapshotState(state: State): EditorSnapshot {
  return {
    objects: state.objects,
    floors: state.floors,
    mapElements: state.mapElements,
    cameras: state.cameras,
    settings: state.settings,
    activeObjectId: state.activeObjectId,
    activeFloorId: state.activeFloorId,
    selectedId: state.selectedId,
    selectedKind: state.selectedKind,
    mode: state.mode,
  };
}

function restoreSnapshot(snapshot: EditorSnapshot) {
  return {
    objects: snapshot.objects,
    floors: snapshot.floors,
    mapElements: snapshot.mapElements,
    cameras: snapshot.cameras,
    settings: snapshot.settings,
    activeObjectId: snapshot.activeObjectId,
    activeFloorId: snapshot.activeFloorId,
    selectedId: snapshot.selectedId,
    selectedKind: snapshot.selectedKind,
    mode: snapshot.mode,
    isHydrated: true,
    savedAt: Date.now(),
  };
}

function pushHistory(state: State, snapshot: EditorSnapshot) {
  return [...state.history, snapshot].slice(-50);
}

function mutate(
  set: any,
  get: () => State,
  recipe: (state: State) => Partial<State>,
) {
  const before = snapshotState(get());
  set((state) => ({
    ...recipe(state),
    history: pushHistory(state, before),
    future: [],
    savedAt: Date.now(),
  }));
  persistSnapshot(get());
}

function persistSnapshot(state: State) {
  void saveAppData(selectData(state));
}

function updateList<T extends { id: string; updatedAt: string }>(
  items: T[],
  id: string,
  patch: Partial<T>,
) {
  return items.map((item) =>
    item.id === id ? { ...item, ...patch, updatedAt: timestamp() } : item,
  );
}

function createObjectRecord(name: string, description?: string): SiteObject {
  const now = timestamp();
  return {
    id: nanoid(),
    name,
    description,
    createdAt: now,
    updatedAt: now,
  };
}

function createFloorRecord(objectId: string, name: string, sortOrder: number): Floor {
  const now = timestamp();
  return {
    id: nanoid(),
    objectId,
    name,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}

function createElementRecord(
  element: Omit<MapElement, "id" | "createdAt" | "updatedAt">,
): MapElement {
  const now = timestamp();
  return {
    ...element,
    id: nanoid(),
    createdAt: now,
    updatedAt: now,
  };
}

function createCameraRecord(camera: Omit<Camera, "id" | "createdAt" | "updatedAt">): Camera {
  const now = timestamp();
  return {
    ...camera,
    id: nanoid(),
    createdAt: now,
    updatedAt: now,
  };
}

function cloneCameraRecord(camera: Camera, patch: Partial<Camera> = {}): Camera {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...base } = camera;
  return createCameraRecord({
    ...base,
    ...patch,
  });
}

function cloneElementRecord(element: MapElement, patch: Partial<MapElement> = {}): MapElement {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...base } = element;
  return createElementRecord({
    ...base,
    ...patch,
  });
}

const initial = createDemoData();

export const useStore = create<State>()((set, get) => ({
  ...initial,
  activeObjectId: initial.objects[0]?.id ?? null,
  activeFloorId: initial.floors[0]?.id ?? null,
  selectedId: null,
  selectedKind: null,
  mode: "select",
  isEditMode: false,
  savedAt: Date.now(),
  isHydrated: false,
  history: [],
  future: [],

  hydrate: (data) =>
    set((state) => ({
      ...state,
      ...data,
      activeObjectId: data.objects[0]?.id ?? null,
      activeFloorId: data.floors[0]?.id ?? null,
      selectedId: null,
      selectedKind: null,
      mode: "select",
      isEditMode: false,
      savedAt: Date.now(),
      isHydrated: true,
      history: [],
      future: [],
    })),

  setActiveObject: (id) =>
    set((state) => {
      const object = state.objects.find((item) => item.id === id) ?? null;
      const floor = object
        ? (state.floors.find((item) => item.objectId === object.id) ?? null)
        : null;
      return {
        activeObjectId: object?.id ?? null,
        activeFloorId: floor?.id ?? null,
        selectedId: null,
        selectedKind: null,
      };
    }),

  setActiveFloor: (id) =>
    set((state) => {
      const floor = state.floors.find((item) => item.id === id) ?? null;
      return {
        activeFloorId: floor?.id ?? null,
        activeObjectId: floor?.objectId ?? null,
        selectedId: null,
        selectedKind: null,
      };
    }),

  focusCamera: (id) =>
    set((state) => {
      const camera = state.cameras.find((item) => item.id === id) ?? null;
      if (!camera) return state;
      return {
        activeFloorId: camera.floorId,
        activeObjectId: camera.objectId,
        selectedId: camera.id,
        selectedKind: "camera",
        mode: "select",
      };
    }),

  focusElement: (id) =>
    set((state) => {
      const element = state.mapElements.find((item) => item.id === id) ?? null;
      if (!element) return state;
      const floor = state.floors.find((item) => item.id === element.floorId) ?? null;
      return {
        activeFloorId: element.floorId,
        activeObjectId: floor?.objectId ?? null,
        selectedId: element.id,
        selectedKind: "element",
        mode: "select",
      };
    }),

  setEditMode: (enabled) =>
    set((state) => ({
      isEditMode: enabled,
      mode: enabled ? state.mode : "select",
    })),

  setMode: (m) => set({ mode: m }),
  select: (id, kind) => set({ selectedId: id, selectedKind: kind }),

  addObject: (name) => {
    const next = createObjectRecord(name);
    mutate(set, get, (state) => ({
      objects: [...state.objects, next],
      activeObjectId: next.id,
      activeFloorId: null,
      selectedId: null,
      selectedKind: null,
    }));
  },

  renameObject: (id, name, description) => {
    mutate(set, get, (state) => ({
      objects: state.objects.map((object) =>
        object.id === id
          ? {
              ...object,
              name,
              description,
              updatedAt: timestamp(),
            }
          : object,
      ),
    }));
  },

  removeObject: (id) => {
    mutate(set, get, (state) => {
      const remainingObjects = state.objects.filter((object) => object.id !== id);
      const remainingFloors = state.floors.filter((floor) => floor.objectId !== id);
      const remainingFloorIds = new Set(remainingFloors.map((floor) => floor.id));
      const remainingCameras = state.cameras.filter((camera) =>
        remainingFloorIds.has(camera.floorId),
      );
      const nextObject = remainingObjects[0] ?? null;
      const nextFloor = nextObject
        ? (remainingFloors.find((floor) => floor.objectId === nextObject.id) ?? null)
        : null;
      return {
        objects: remainingObjects,
        floors: remainingFloors,
        cameras: remainingCameras,
        activeObjectId: nextObject?.id ?? null,
        activeFloorId: nextFloor?.id ?? null,
        selectedId: null,
        selectedKind: null,
      };
    });
  },

  addFloor: (objectId, name) => {
    const nextSortOrder =
      Math.max(
        0,
        ...get()
          .floors.filter((floor) => floor.objectId === objectId)
          .map((floor) => floor.sortOrder),
      ) + 1;
    const next = createFloorRecord(objectId, name, nextSortOrder);
    mutate(set, get, (state) => ({
      floors: [...state.floors, next],
      activeObjectId: objectId,
      activeFloorId: next.id,
      selectedId: null,
      selectedKind: null,
    }));
  },

  renameFloor: (id, name) => {
    mutate(set, get, (state) => ({
      floors: state.floors.map((floor) =>
        floor.id === id
          ? {
              ...floor,
              name,
              updatedAt: timestamp(),
            }
          : floor,
      ),
    }));
  },

  removeFloor: (id) => {
    mutate(set, get, (state) => {
      const floors = state.floors.filter((floor) => floor.id !== id);
      const cameras = state.cameras.filter((camera) => camera.floorId !== id);
      const mapElements = state.mapElements.filter((element) => element.floorId !== id);
      const nextFloor =
        floors.find((floor) => floor.objectId === state.activeObjectId) ?? floors[0] ?? null;
      return {
        floors,
        cameras,
        mapElements,
        activeFloorId: nextFloor?.id ?? null,
        activeObjectId: nextFloor?.objectId ?? state.activeObjectId ?? null,
        selectedId: null,
        selectedKind: null,
      };
    });
  },

  addElement: (element) => {
    const next = createElementRecord(element);
    mutate(set, get, (state) => ({
      mapElements: [...state.mapElements, next],
      selectedId: next.id,
      selectedKind: "element",
    }));
    return next.id;
  },

  updateElement: (id, patch) => {
    mutate(set, get, (state) => ({
      mapElements: updateList(state.mapElements, id, patch),
    }));
  },

  removeElement: (id) => {
    mutate(set, get, (state) => ({
      mapElements: state.mapElements.filter((element) => element.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedKind: state.selectedId === id ? null : state.selectedKind,
    }));
  },

  addCamera: (camera) => {
    const next = createCameraRecord(camera);
    mutate(set, get, (state) => ({
      cameras: [...state.cameras, next],
      selectedId: next.id,
      selectedKind: "camera",
    }));
    return next.id;
  },

  updateCamera: (id, patch) => {
    mutate(set, get, (state) => ({
      cameras: updateList(state.cameras, id, patch),
    }));
  },

  removeCamera: (id) => {
    mutate(set, get, (state) => ({
      cameras: state.cameras.filter((camera) => camera.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedKind: state.selectedId === id ? null : state.selectedKind,
    }));
  },

  duplicateCamera: (id) => {
    const cam = get().cameras.find((item) => item.id === id);
    if (!cam) return;
    const copy = cloneCameraRecord(cam, {
      name: `${cam.name} (копия)`,
      x: cam.x + 30,
      y: cam.y + 30,
    });
    mutate(set, get, (state) => ({
      cameras: [...state.cameras, copy],
    }));
  },

  copySelected: () => {
    const state = get();
    if (state.selectedKind === "camera" && state.selectedId) {
      const camera = state.cameras.find((item) => item.id === state.selectedId);
      clipboardItem = camera ? { kind: "camera", camera } : null;
      return;
    }

    if (state.selectedKind === "element" && state.selectedId) {
      const element = state.mapElements.find((item) => item.id === state.selectedId);
      clipboardItem = element ? { kind: "element", element } : null;
      return;
    }

    clipboardItem = null;
  },

  pasteClipboard: () => {
    const state = get();
    if (!clipboardItem) return;

    if (clipboardItem.kind === "camera") {
      const source = clipboardItem.camera;
      const copy = cloneCameraRecord(source, {
        floorId: state.activeFloorId ?? source.floorId,
        objectId: state.activeObjectId ?? source.objectId,
        name: `${source.name} (копия)`,
        x: source.x + 30,
        y: source.y + 30,
      });
      mutate(set, get, (current) => ({
        cameras: [...current.cameras, copy],
        selectedId: copy.id,
        selectedKind: "camera",
      }));
      return;
    }

    const source = clipboardItem.element;
    const copy = cloneElementRecord(source, {
      floorId: state.activeFloorId ?? source.floorId,
      x: source.x + 30,
      y: source.y + 30,
    });
    mutate(set, get, (current) => ({
      mapElements: [...current.mapElements, copy],
      selectedId: copy.id,
      selectedKind: "element",
    }));
  },

  undo: () => {
    set((state) => {
      const previous = state.history.at(-1);
      if (!previous) return state;
      const current = snapshotState(state);
      return {
        ...restoreSnapshot(previous),
        history: state.history.slice(0, -1),
        future: [...state.future, current].slice(-50),
      };
    });
    persistSnapshot(get());
  },

  redo: () => {
    set((state) => {
      const next = state.future.at(-1);
      if (!next) return state;
      const current = snapshotState(state);
      return {
        ...restoreSnapshot(next),
        history: [...state.history, current].slice(-50),
        future: state.future.slice(0, -1),
      };
    });
    persistSnapshot(get());
  },

  updateSettings: (patch) => {
    mutate(set, get, (state) => ({
      settings: { ...state.settings, ...patch },
    }));
  },

  importJSON: (data) => {
    const parsed = normalizeAppData(JSON.parse(data));
    mutate(set, get, () => ({
      ...parsed,
      activeObjectId: parsed.objects[0]?.id ?? null,
      activeFloorId: parsed.floors[0]?.id ?? null,
      selectedId: null,
      selectedKind: null,
      mode: "select",
      isEditMode: false,
      isHydrated: true,
    }));
  },

  exportJSON: () => JSON.stringify(selectData(get()), null, 2),

  resetDemo: () => {
    const demo = createDemoData();
    mutate(set, get, () => ({
      ...demo,
      activeObjectId: demo.objects[0]?.id ?? null,
      activeFloorId: demo.floors[0]?.id ?? null,
      selectedId: null,
      selectedKind: null,
      mode: "select",
      isEditMode: false,
      isHydrated: true,
    }));
  },
}));

export async function bootstrapStore() {
  const data = await loadAppData();
  if (data) {
    useStore.getState().hydrate(data);
    return;
  }

  const demo = createDemoData();
  useStore.getState().hydrate(demo);
  await saveAppData(demo);
}

export const statusLabels: Record<CameraStatus, string> = {
  working: "Работает",
  offline: "Не работает",
  needs_check: "Требует проверки",
  reserve: "Резервная",
  no_access: "Нет доступа",
};

export const statusColors: Record<CameraStatus, string> = {
  working: "#16a34a",
  offline: "#dc2626",
  needs_check: "#eab308",
  reserve: "#6b7280",
  no_access: "#94a3b8",
};
