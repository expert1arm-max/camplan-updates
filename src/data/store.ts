import { create } from "zustand";
import { nanoid } from "nanoid";
import type {
  AppData,
  AppSettings,
  Camera,
  CableAnchor,
  CablePoint,
  CableType,
  Device,
  DeviceConnection,
  DeviceStatus,
  DeviceType,
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
  selectedKind: "device" | "element" | "connection" | null;
  mode: EditorMode;
  isEditMode: boolean;
  currentCableType: CableType;
  savedAt: number;
  isHydrated: boolean;
  history: EditorSnapshot[];
  future: EditorSnapshot[];

  hydrate: (data: AppData) => void;
  setActiveObject: (id: string | null) => void;
  setActiveFloor: (id: string | null) => void;
  focusDevice: (id: string) => void;
  focusCamera: (id: string) => void;
  focusElement: (id: string) => void;
  setEditMode: (enabled: boolean) => void;
  setMode: (m: EditorMode) => void;
  setCableType: (type: CableType) => void;
  select: (id: string | null, kind: "device" | "element" | "connection" | null) => void;
  focusConnection: (id: string) => void;

  addObject: (name: string) => void;
  renameObject: (id: string, name: string, description?: string) => void;
  removeObject: (id: string) => void;

  addFloor: (objectId: string, name: string) => void;
  renameFloor: (id: string, name: string) => void;
  removeFloor: (id: string) => void;

  addElement: (element: Omit<MapElement, "id" | "createdAt" | "updatedAt">) => string;
  updateElement: (id: string, patch: Partial<MapElement>) => void;
  removeElement: (id: string) => void;

  addDevice: (device: Omit<Device, "id" | "createdAt" | "updatedAt">) => string;
  updateDevice: (id: string, patch: Partial<Device>) => void;
  removeDevice: (id: string) => void;
  duplicateDevice: (id: string) => void;

  addCamera: (camera: Omit<Camera, "id" | "createdAt" | "updatedAt">) => string;
  updateCamera: (id: string, patch: Partial<Camera>) => void;
  removeCamera: (id: string) => void;
  duplicateCamera: (id: string) => void;

  addDeviceConnection: (connection: Omit<DeviceConnection, "id" | "createdAt" | "updatedAt">) => void;
  updateDeviceConnection: (id: string, patch: Partial<DeviceConnection>) => void;
  toggleDeviceConnection: (
    fromDeviceId: string,
    toDeviceId: string,
    cableType?: CableType,
  ) => void;
  removeDeviceConnection: (id: string) => void;

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
  selectedKind: "device" | "element" | "connection" | null;
  mode: EditorMode;
  isEditMode: boolean;
};

type ClipboardItem =
  | { kind: "device"; device: Device }
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
    devices: state.devices,
    deviceConnections: state.deviceConnections,
    settings: state.settings,
  };
}

function snapshotState(state: State): EditorSnapshot {
  return {
    objects: state.objects,
    floors: state.floors,
    mapElements: state.mapElements,
    devices: state.devices,
    deviceConnections: state.deviceConnections,
    settings: state.settings,
    activeObjectId: state.activeObjectId,
    activeFloorId: state.activeFloorId,
    selectedId: state.selectedId,
    selectedKind: state.selectedKind,
    mode: state.mode,
    isEditMode: state.isEditMode,
  };
}

function restoreSnapshot(snapshot: EditorSnapshot) {
  return {
    objects: snapshot.objects,
    floors: snapshot.floors,
    mapElements: snapshot.mapElements,
    devices: snapshot.devices,
    deviceConnections: snapshot.deviceConnections,
    settings: snapshot.settings,
    activeObjectId: snapshot.activeObjectId,
    activeFloorId: snapshot.activeFloorId,
    selectedId: snapshot.selectedId,
    selectedKind: snapshot.selectedKind,
    mode: snapshot.mode,
    isEditMode: snapshot.isEditMode,
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
    locked: element.locked ?? false,
    createdAt: now,
    updatedAt: now,
  };
}

function createDeviceRecord(device: Omit<Device, "id" | "createdAt" | "updatedAt">): Device {
  const now = timestamp();
  return {
    ...device,
    id: nanoid(),
    locked: device.locked ?? false,
    createdAt: now,
    updatedAt: now,
  };
}

function cloneDeviceRecord(device: Device, patch: Partial<Device> = {}): Device {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...base } = device;
  return createDeviceRecord({
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

function cloneConnectionRecord(
  connection: DeviceConnection,
  patch: Partial<DeviceConnection> = {},
): DeviceConnection {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...base } = connection;
  return {
    ...base,
    ...patch,
    locked: patch.locked ?? connection.locked ?? false,
    points: patch.points ?? connection.points.map((point) => ({ ...point })),
  };
}

function ensureObjectPlacement(devices: Device[], floors: Floor[], device: Device) {
  if (device.objectId) return device;
  const floor = floors.find((item) => item.id === device.floorId) ?? null;
  return {
    ...device,
    objectId: floor?.objectId ?? "",
  };
}

function removeConnectionsForDevice(deviceConnections: DeviceConnection[], deviceId: string) {
  return deviceConnections.filter(
    (connection) =>
      connection.from.deviceId !== deviceId && connection.to.deviceId !== deviceId,
  );
}

function getAnchorPoint(
  device: Device,
  anchor: CableAnchor = "center",
): { x: number; y: number } {
  if (device.type === "camera") {
    return { x: device.x, y: device.y };
  }

  const width = device.type === "nvr" || device.type === "dvr" ? 64 : 72;
  const height = device.type === "nvr" || device.type === "dvr" ? 36 : 30;
  const halfW = width / 2;
  const halfH = height / 2;
  switch (anchor) {
    case "top":
      return { x: device.x, y: device.y - halfH };
    case "right":
      return { x: device.x + halfW, y: device.y };
    case "bottom":
      return { x: device.x, y: device.y + halfH };
    case "left":
      return { x: device.x - halfW, y: device.y };
    default:
      return { x: device.x, y: device.y };
  }
}

const initial = createDemoData();

export const deviceTypeLabels: Record<DeviceType, string> = {
  camera: "Камера",
  nvr: "NVR",
  dvr: "DVR",
  switch: "Switch",
  poe_switch: "PoE Switch",
};

export const useStore = create<State>()((set, get) => ({
  ...initial,
  activeObjectId: initial.objects[0]?.id ?? null,
  activeFloorId: initial.floors[0]?.id ?? null,
  selectedId: null,
  selectedKind: null,
  mode: "select",
  isEditMode: false,
  currentCableType: "utp",
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
      currentCableType: "utp",
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

  focusDevice: (id) =>
    set((state) => {
      const device = state.devices.find((item) => item.id === id) ?? null;
      if (!device) return state;
      return {
        activeFloorId: device.floorId,
        activeObjectId: device.objectId,
        selectedId: device.id,
        selectedKind: "device",
        mode: "select",
      };
    }),

  focusCamera: (id) => get().focusDevice(id),

  focusConnection: (id) =>
    set((state) => {
      const connection = state.deviceConnections.find((item) => item.id === id) ?? null;
      if (!connection) return state;
      const device =
        state.devices.find((item) => item.id === connection.from.deviceId) ??
        state.devices.find((item) => item.id === connection.to.deviceId) ??
        null;
      const floor = device ? state.floors.find((item) => item.id === device.floorId) ?? null : null;
      return {
        activeFloorId: floor?.id ?? state.activeFloorId,
        activeObjectId: floor?.objectId ?? state.activeObjectId,
        selectedId: connection.id,
        selectedKind: "connection",
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
  setCableType: (type) => set({ currentCableType: type }),
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
      const remainingDevices = state.devices.filter((device) => remainingFloorIds.has(device.floorId));
      const remainingDeviceIds = new Set(remainingDevices.map((device) => device.id));
      const remainingConnections = state.deviceConnections.filter(
        (connection) =>
          remainingDeviceIds.has(connection.from.deviceId ?? "") &&
          remainingDeviceIds.has(connection.to.deviceId ?? ""),
      );
      const nextObject = remainingObjects[0] ?? null;
      const nextFloor = nextObject
        ? (remainingFloors.find((floor) => floor.objectId === nextObject.id) ?? null)
        : null;
      return {
        objects: remainingObjects,
        floors: remainingFloors,
        devices: remainingDevices,
        deviceConnections: remainingConnections,
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
      const devices = state.devices.filter((device) => device.floorId !== id);
      const deviceIds = new Set(devices.map((device) => device.id));
      const deviceConnections = state.deviceConnections.filter(
        (connection) => deviceIds.has(connection.from.deviceId ?? "") && deviceIds.has(connection.to.deviceId ?? ""),
      );
      const mapElements = state.mapElements.filter((element) => element.floorId !== id);
      const nextFloor =
        floors.find((floor) => floor.objectId === state.activeObjectId) ?? floors[0] ?? null;
      return {
        floors,
        devices,
        deviceConnections,
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

  addDevice: (device) => {
    const next = ensureObjectPlacement(
      get().devices,
      get().floors,
      createDeviceRecord(device),
    );
    mutate(set, get, (state) => ({
      devices: [...state.devices, next],
      selectedId: next.id,
      selectedKind: "device",
    }));
    return next.id;
  },

  updateDevice: (id, patch) => {
    mutate(set, get, (state) => ({
      devices: updateList(state.devices, id, patch),
    }));
  },

  removeDevice: (id) => {
    mutate(set, get, (state) => ({
      devices: state.devices.filter((device) => device.id !== id),
      deviceConnections: removeConnectionsForDevice(state.deviceConnections, id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedKind: state.selectedId === id ? null : state.selectedKind,
    }));
  },

  duplicateDevice: (id) => {
    const device = get().devices.find((item) => item.id === id);
    if (!device) return;
    const copy = cloneDeviceRecord(device, {
      name: `${device.name} (копия)`,
      x: device.x + 30,
      y: device.y + 30,
    });
    mutate(set, get, (state) => ({
      devices: [...state.devices, copy],
    }));
  },

  addCamera: (camera) =>
    get().addDevice({
      ...camera,
      type: "camera",
    }),

  updateCamera: (id, patch) => get().updateDevice(id, patch),
  removeCamera: (id) => get().removeDevice(id),
  duplicateCamera: (id) => get().duplicateDevice(id),

  addDeviceConnection: (connection) => {
    mutate(set, get, (state) => ({
      deviceConnections: [
        ...state.deviceConnections,
        {
          ...connection,
          id: nanoid(),
          locked: connection.locked ?? false,
          createdAt: timestamp(),
          updatedAt: timestamp(),
        },
      ],
    }));
  },

  updateDeviceConnection: (id, patch) => {
    mutate(set, get, (state) => ({
      deviceConnections: state.deviceConnections.map((connection) =>
        connection.id === id
          ? {
              ...connection,
              ...patch,
              locked: patch.locked ?? connection.locked ?? false,
              points: patch.points ? patch.points.map((point) => ({ ...point })) : connection.points,
              updatedAt: timestamp(),
            }
          : connection,
      ),
    }));
  },

  toggleDeviceConnection: (fromDeviceId, toDeviceId, cableType = "utp") => {
    mutate(set, get, (state) => {
      const existing = state.deviceConnections.find(
        (connection) =>
          connection.from.deviceId === fromDeviceId && connection.to.deviceId === toDeviceId,
      );
      if (existing) {
        return {
          deviceConnections: state.deviceConnections.filter((connection) => connection.id !== existing.id),
        };
      }

      const fromDevice = state.devices.find((item) => item.id === fromDeviceId) ?? null;
      const toDevice = state.devices.find((item) => item.id === toDeviceId) ?? null;
      if (!fromDevice || !toDevice) return {};
      const fromAnchor = getAnchorPoint(fromDevice, "right");
      const toAnchor = getAnchorPoint(toDevice, "left");

      return {
        deviceConnections: [
          ...state.deviceConnections,
          {
            id: nanoid(),
            objectId: fromDevice.objectId || toDevice.objectId,
            floorId: fromDevice.floorId || toDevice.floorId,
            type: cableType,
            from: {
              deviceId: fromDeviceId,
              anchor: "right",
              x: fromAnchor.x,
              y: fromAnchor.y,
            },
            to: {
              deviceId: toDeviceId,
              anchor: "left",
              x: toAnchor.x,
              y: toAnchor.y,
            },
            points: [],
            locked: false,
            label: cableType.toUpperCase(),
            notes: "",
            createdAt: timestamp(),
            updatedAt: timestamp(),
          },
        ],
      };
    });
  },

  removeDeviceConnection: (id) => {
    mutate(set, get, (state) => ({
      deviceConnections: state.deviceConnections.filter((connection) => connection.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedKind: state.selectedId === id ? null : state.selectedKind,
    }));
  },

  copySelected: () => {
    const state = get();
    if (state.selectedKind === "device" && state.selectedId) {
      const device = state.devices.find((item) => item.id === state.selectedId);
      clipboardItem = device ? { kind: "device", device } : null;
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

    if (clipboardItem.kind === "device") {
      const source = clipboardItem.device;
      const copy = cloneDeviceRecord(source, {
        floorId: state.activeFloorId ?? source.floorId,
        objectId: state.activeObjectId ?? source.objectId,
        name: `${source.name} (копия)`,
        x: source.x + 30,
        y: source.y + 30,
      });
      mutate(set, get, (current) => ({
        devices: [...current.devices, copy],
        selectedId: copy.id,
        selectedKind: "device",
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

export const statusLabels: Record<DeviceStatus, string> = {
  working: "Работает",
  offline: "Не работает",
  needs_check: "Требует проверки",
  reserve: "Резервная",
  no_access: "Нет доступа",
};

export const statusColors: Record<DeviceStatus, string> = {
  working: "#16a34a",
  offline: "#dc2626",
  needs_check: "#eab308",
  reserve: "#6b7280",
  no_access: "#94a3b8",
};
