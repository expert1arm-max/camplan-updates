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
  savedAt: number;
  isHydrated: boolean;

  hydrate: (data: AppData) => void;
  setActiveObject: (id: string | null) => void;
  setActiveFloor: (id: string | null) => void;
  focusCamera: (id: string) => void;
  focusElement: (id: string) => void;
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

  updateSettings: (patch: Partial<AppSettings>) => void;
  importJSON: (data: string) => void;
  exportJSON: () => string;
  resetDemo: () => void;
}

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

const initial = createDemoData();

export const useStore = create<State>()((set, get) => ({
  ...initial,
  activeObjectId: initial.objects[0]?.id ?? null,
  activeFloorId: initial.floors[0]?.id ?? null,
  selectedId: null,
  selectedKind: null,
  mode: "select",
  savedAt: Date.now(),
  isHydrated: false,

  hydrate: (data) =>
    set((state) => ({
      ...state,
      ...data,
      activeObjectId: data.objects[0]?.id ?? null,
      activeFloorId: data.floors[0]?.id ?? null,
      selectedId: null,
      selectedKind: null,
      mode: "select",
      savedAt: Date.now(),
      isHydrated: true,
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

  setMode: (m) => set({ mode: m }),
  select: (id, kind) => set({ selectedId: id, selectedKind: kind }),

  addObject: (name) => {
    const next = createObjectRecord(name);
    set((state) => ({
      objects: [...state.objects, next],
      activeObjectId: next.id,
      activeFloorId: null,
      selectedId: null,
      selectedKind: null,
      savedAt: Date.now(),
    }));
    persistSnapshot(get());
  },

  renameObject: (id, name, description) => {
    set((state) => ({
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
      savedAt: Date.now(),
    }));
    persistSnapshot(get());
  },

  removeObject: (id) => {
    set((state) => {
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
        savedAt: Date.now(),
      };
    });
    persistSnapshot(get());
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
    set((state) => ({
      floors: [...state.floors, next],
      activeObjectId: objectId,
      activeFloorId: next.id,
      selectedId: null,
      selectedKind: null,
      savedAt: Date.now(),
    }));
    persistSnapshot(get());
  },

  renameFloor: (id, name) => {
    set((state) => ({
      floors: state.floors.map((floor) =>
        floor.id === id
          ? {
              ...floor,
              name,
              updatedAt: timestamp(),
            }
          : floor,
      ),
      savedAt: Date.now(),
    }));
    persistSnapshot(get());
  },

  removeFloor: (id) => {
    set((state) => {
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
        savedAt: Date.now(),
      };
    });
    persistSnapshot(get());
  },

  addElement: (element) => {
    const next = createElementRecord(element);
    set((state) => ({
      mapElements: [...state.mapElements, next],
      selectedId: next.id,
      selectedKind: "element",
      savedAt: Date.now(),
    }));
    persistSnapshot(get());
    return next.id;
  },

  updateElement: (id, patch) => {
    set((state) => ({
      mapElements: updateList(state.mapElements, id, patch),
      savedAt: Date.now(),
    }));
    persistSnapshot(get());
  },

  removeElement: (id) => {
    set((state) => ({
      mapElements: state.mapElements.filter((element) => element.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedKind: state.selectedId === id ? null : state.selectedKind,
      savedAt: Date.now(),
    }));
    persistSnapshot(get());
  },

  addCamera: (camera) => {
    const next = createCameraRecord(camera);
    set((state) => ({
      cameras: [...state.cameras, next],
      selectedId: next.id,
      selectedKind: "camera",
      savedAt: Date.now(),
    }));
    persistSnapshot(get());
    return next.id;
  },

  updateCamera: (id, patch) => {
    set((state) => ({
      cameras: updateList(state.cameras, id, patch),
      savedAt: Date.now(),
    }));
    persistSnapshot(get());
  },

  removeCamera: (id) => {
    set((state) => ({
      cameras: state.cameras.filter((camera) => camera.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedKind: state.selectedId === id ? null : state.selectedKind,
      savedAt: Date.now(),
    }));
    persistSnapshot(get());
  },

  duplicateCamera: (id) => {
    const cam = get().cameras.find((item) => item.id === id);
    if (!cam) return;
    const copy = createCameraRecord({
      ...cam,
      name: `${cam.name} (копия)`,
      x: cam.x + 30,
      y: cam.y + 30,
    });
    set((state) => ({
      cameras: [...state.cameras, copy],
      savedAt: Date.now(),
    }));
    persistSnapshot(get());
  },

  updateSettings: (patch) => {
    set((state) => ({
      settings: { ...state.settings, ...patch },
      savedAt: Date.now(),
    }));
    persistSnapshot(get());
  },

  importJSON: (data) => {
    const parsed = normalizeAppData(JSON.parse(data));
    set({
      ...parsed,
      activeObjectId: parsed.objects[0]?.id ?? null,
      activeFloorId: parsed.floors[0]?.id ?? null,
      selectedId: null,
      selectedKind: null,
      mode: "select",
      savedAt: Date.now(),
      isHydrated: true,
    });
    persistSnapshot(get());
  },

  exportJSON: () => JSON.stringify(selectData(get()), null, 2),

  resetDemo: () => {
    const demo = createDemoData();
    set({
      ...demo,
      activeObjectId: demo.objects[0]?.id ?? null,
      activeFloorId: demo.floors[0]?.id ?? null,
      selectedId: null,
      selectedKind: null,
      mode: "select",
      savedAt: Date.now(),
      isHydrated: true,
    });
    persistSnapshot(get());
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
