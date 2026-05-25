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
  SelectionItem,
  SelectionKind,
  UiLayoutState,
  ViewBoxState,
} from "@/types";
import { loadBestSnapshot, logQaEvent, normalizeAppData, saveSnapshot } from "./repository";

interface State extends AppData {
  activeObjectId: string | null;
  activeFloorId: string | null;
  selectedId: string | null;
  selectedKind: SelectionKind | null;
  selectedItems: SelectionItem[];
  mode: EditorMode;
  isEditMode: boolean;
  currentCableType: CableType;
  savedAt: number;
  isHydrated: boolean;
  emptyStateReason: string | null;
  history: EditorSnapshot[];
  future: EditorSnapshot[];

  hydrate: (data: AppData, emptyStateReason?: string | null) => void;
  hasHydratedFromStorage: boolean;
  setActiveFloor: (id: string | null) => void;
  focusObject: (id: string) => void;
  focusDevice: (id: string) => void;
  focusCamera: (id: string) => void;
  focusElement: (id: string) => void;
  setEditMode: (enabled: boolean) => void;
  setMode: (m: EditorMode) => void;
  setCableType: (type: CableType) => void;
  select: (id: string | null, kind: SelectionKind | null) => void;
  selectItems: (items: SelectionItem[]) => void;
  toggleSelection: (id: string, kind: SelectionKind) => void;
  clearSelection: () => void;
  focusConnection: (id: string) => void;
  groupSelectedItems: () => void;
  ungroupSelectedItems: () => void;
  removeSelectedItems: () => void;
  moveGroupBy: (groupId: string, dx: number, dy: number) => void;
  moveSelectedItemsBy: (items: SelectionItem[], dx: number, dy: number) => void;

  addObject: (name: string) => string;
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

  addDeviceConnection: (
    connection: Omit<DeviceConnection, "id" | "createdAt" | "updatedAt">,
  ) => string;
  updateDeviceConnection: (id: string, patch: Partial<DeviceConnection>) => void;
  toggleDeviceConnection: (fromDeviceId: string, toDeviceId: string, cableType?: CableType) => void;
  removeDeviceConnection: (id: string) => void;

  copySelected: () => void;
  pasteClipboard: () => void;

  undo: () => void;
  redo: () => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  updateUiState: (patch: Partial<UiLayoutState>) => void;
  newProject: () => void;
  importJSON: (data: string) => void;
  exportJSON: () => string;
}

type EditorSnapshot = AppData & {
  activeObjectId: string | null;
  activeFloorId: string | null;
  selectedId: string | null;
  selectedKind: SelectionKind | null;
  selectedItems: SelectionItem[];
  mode: EditorMode;
  isEditMode: boolean;
  emptyStateReason: string | null;
};

type ClipboardItem = { kind: "device"; device: Device } | { kind: "element"; element: MapElement };

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

function normalizeSelection(items: SelectionItem[]) {
  const seen = new Set<string>();
  const result: SelectionItem[] = [];
  for (const item of items) {
    const key = `${item.kind}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function selectionState(items: SelectionItem[]) {
  const selectedItems = normalizeSelection(items);
  const primary = selectedItems[0] ?? null;
  return {
    selectedItems,
    selectedId: primary?.id ?? null,
    selectedKind: primary?.kind ?? null,
  };
}

function mergeUiState(current: UiLayoutState | undefined, patch: Partial<UiLayoutState>) {
  return { ...(current ?? {}), ...patch };
}

function resolveStartupFocus(data: AppData) {
  const uiState = data.settings.uiState;
  const storedObjectId = uiState?.activeObjectId ?? null;
  const storedFloorId = uiState?.activeFloorId ?? null;
  const storedObject =
    storedObjectId && data.objects.some((object) => object.id === storedObjectId)
      ? (data.objects.find((object) => object.id === storedObjectId) ?? null)
      : null;
  const storedFloor =
    storedFloorId && data.floors.some((floor) => floor.id === storedFloorId)
      ? (data.floors.find((floor) => floor.id === storedFloorId) ?? null)
      : null;

  let objectId: string | null = null;
  let floorId: string | null = null;

  if (storedObject && storedFloor && storedFloor.objectId === storedObject.id) {
    objectId = storedObject.id;
    floorId = storedFloor.id;
  } else if (storedObject) {
    objectId = storedObject.id;
    floorId =
      data.floors
        .filter((floor) => floor.objectId === storedObject.id)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))[0]
        ?.id ?? null;
  } else if (data.objects.length > 0) {
    const firstObject = data.objects[0];
    objectId = firstObject.id;
    floorId =
      data.floors
        .filter((floor) => floor.objectId === firstObject.id)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))[0]
        ?.id ?? null;
  }

  const resolvedUiState = mergeUiState(uiState, {
    activeObjectId: objectId,
    activeFloorId: floorId,
  });

  const changed = uiState?.activeObjectId !== objectId || uiState?.activeFloorId !== floorId;

  return {
    objectId,
    floorId,
    settings: {
      ...data.settings,
      uiState: resolvedUiState,
    },
    changed,
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
    selectedItems: state.selectedItems,
    mode: state.mode,
    isEditMode: state.isEditMode,
    emptyStateReason: state.emptyStateReason,
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
    selectedItems: snapshot.selectedItems,
    mode: snapshot.mode,
    isEditMode: snapshot.isEditMode,
    emptyStateReason: snapshot.emptyStateReason,
    isHydrated: true,
    savedAt: Date.now(),
  };
}

function pushHistory(state: State, snapshot: EditorSnapshot) {
  return [...state.history, snapshot].slice(-50);
}

function inferCallerName() {
  const stack = new Error().stack?.split("\n").map((line) => line.trim()) ?? [];
  for (const frame of stack) {
    const match = frame.match(/at\s+(?:async\s+)?(?:(.*?)\s+)?\(?([^:\s)]+)(?::\d+:\d+)?\)?$/);
    const name = match?.[1] || match?.[2] || "";
    if (
      name === "inferCallerName" ||
      name === "persistSnapshot" ||
      name === "saveSnapshot" ||
      name === "saveAppData" ||
      name === "loadBestSnapshot" ||
      name === "mutate"
    ) {
      continue;
    }
    if (name) return name;
  }
  return "unknown";
}

function mutate(
  set: (fn: (state: State) => Partial<State>) => void,
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

function persistSnapshot(state: State, reason = "autosave") {
  if (!state.isHydrated || !state.hasHydratedFromStorage) {
    return;
  }

  void saveSnapshot(selectData(state), reason, {
    reason,
    caller: inferCallerName(),
    activeObjectId: state.activeObjectId,
    activeFloorId: state.activeFloorId,
  });
}

export function flushCurrentSnapshot() {
  const state = useStore.getState();
  if (!state.isHydrated || !state.hasHydratedFromStorage) return;
  void saveSnapshot(selectData(state), "exit", {
    reason: "exit",
    caller: "flushCurrentSnapshot",
    activeObjectId: state.activeObjectId,
    activeFloorId: state.activeFloorId,
  });
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

const repairedTextByMojibake = new Map<string, string>([
  [
    "\u0420\u045c\u0420\u0455\u0420\u0406\u0420\u00b0\u0421\u040f \u0420\u0454\u0420\u00b0\u0420\u0458\u0420\u00b5\u0421\u0402\u0420\u00b0",
    "\u041d\u043e\u0432\u0430\u044f \u043a\u0430\u043c\u0435\u0440\u0430",
  ],
  ["\u0420\u045c\u0420\u0455\u0420\u0406\u0421\u2039\u0420\u2116 NVR", "\u041d\u043e\u0432\u044b\u0439 NVR"],
  ["\u0420\u045c\u0420\u0455\u0420\u0406\u0421\u2039\u0420\u2116 DVR", "\u041d\u043e\u0432\u044b\u0439 DVR"],
  ["\u0420\u045c\u0420\u0455\u0420\u0406\u0421\u2039\u0420\u2116 Switch", "\u041d\u043e\u0432\u044b\u0439 Switch"],
  ["\u0420\u045c\u0420\u0455\u0420\u0406\u0421\u2039\u0420\u2116 PoE Switch", "\u041d\u043e\u0432\u044b\u0439 PoE Switch"],
  [
    "\u0420\u045f\u0420\u0455\u0420\u0458\u0420\u00b5\u0421\u2030\u0420\u00b5\u0420\u0405\u0420\u0451\u0420\u00b5",
    "\u041f\u043e\u043c\u0435\u0449\u0435\u043d\u0438\u0435",
  ],
  ["\u0420\u2018\u0420\u00b5\u0420\u00b7 IP", "\u0411\u0435\u0437 IP"],
  ["\u0420\u045e\u0420\u0455\u0421\u2021\u0420\u0454\u0420\u00b0 A", "\u0422\u043e\u0447\u043a\u0430 A"],
  ["\u0420\u045e\u0420\u0455\u0421\u2021\u0420\u0454\u0420\u00b0 B", "\u0422\u043e\u0447\u043a\u0430 B"],
  [
    "\u0420\u2018\u0420\u00b5\u0420\u00b7 \u0420\u0455\u0420\u00b1\u0421\u0409\u0420\u00b5\u0420\u0454\u0421\u201a\u0420\u00b0",
    "\u0411\u0435\u0437 \u043e\u0431\u044a\u0435\u043a\u0442\u0430",
  ],
]);

function repairMojibakeText(value: string | undefined): string | undefined {
  if (!value) return value;
  return repairedTextByMojibake.get(value) ?? value;
}

function createObjectRecord(name: string, description?: string): SiteObject {
  const now = timestamp();
  return {
    id: nanoid(),
    name: repairMojibakeText(name) ?? name,
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
    name: repairMojibakeText(name) ?? name,
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
    label: repairMojibakeText(element.label) ?? element.label,
    id: nanoid(),
    locked: element.locked ?? false,
    groupId: element.groupId ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

function createDeviceRecord(device: Omit<Device, "id" | "createdAt" | "updatedAt">): Device {
  const now = timestamp();
  return {
    ...device,
    name: repairMojibakeText(device.name) ?? device.name,
    id: nanoid(),
    locked: device.locked ?? false,
    groupId: device.groupId ?? null,
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
  return {
    ...connection,
    ...patch,
    id: connection.id,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
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
    (connection) => connection.from.deviceId !== deviceId && connection.to.deviceId !== deviceId,
  );
}

function getAnchorPoint(device: Device, anchor: CableAnchor = "center"): { x: number; y: number } {
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

function getSelectionMembers(state: State, item: SelectionItem): SelectionItem[] {
  if (item.kind !== "device" && item.kind !== "element") {
    return [item];
  }

  const device =
    item.kind === "device" ? state.devices.find((entry) => entry.id === item.id) : null;
  const element =
    item.kind === "element" ? state.mapElements.find((entry) => entry.id === item.id) : null;
  const groupId = device?.groupId ?? element?.groupId ?? null;
  if (!groupId) {
    return [item];
  }

  const deviceItems = state.devices
    .filter((entry) => entry.groupId === groupId)
    .map<SelectionItem>((entry) => ({ kind: "device", id: entry.id }));
  const elementItems = state.mapElements
    .filter((entry) => entry.groupId === groupId)
    .map<SelectionItem>((entry) => ({ kind: "element", id: entry.id }));
  return normalizeSelection([...deviceItems, ...elementItems]);
}

function expandSelection(state: State, items: SelectionItem[], includeGroups = state.isEditMode) {
  if (!includeGroups) {
    return normalizeSelection(items);
  }
  return normalizeSelection(items.flatMap((item) => getSelectionMembers(state, item)));
}

const emptyAppData = normalizeAppData({});
const initial = {
  ...emptyAppData,
  settings: {
    ...emptyAppData.settings,
    uiState: mergeUiState(emptyAppData.settings.uiState, {
      activeObjectId: null,
      activeFloorId: null,
    }),
  },
};

export const deviceTypeLabels: Record<DeviceType, string> = {
  camera: "Камера",
  nvr: "NVR",
  dvr: "DVR",
  switch: "Switch",
  poe_switch: "PoE Switch",
};

export const useStore = create<State>()((set, get) => ({
  ...initial,
  activeObjectId: null,
  activeFloorId: null,
  selectedId: null,
  selectedKind: null,
  selectedItems: [],
  mode: "select",
  isEditMode: false,
  currentCableType: "utp",
  savedAt: Date.now(),
  isHydrated: false,
  emptyStateReason: null,
  hasHydratedFromStorage: false,
  history: [],
  future: [],

  hydrate: (data, emptyStateReason = null) =>
    set((state) => {
      const { objectId, floorId, settings } = resolveStartupFocus(data);
      return {
        ...state,
        ...data,
        settings,
        activeObjectId: objectId,
        activeFloorId: floorId,
        selectedId: null,
        selectedKind: null,
        selectedItems: [],
        mode: "select",
        isEditMode: false,
        currentCableType: "utp",
        savedAt: Date.now(),
        isHydrated: true,
        emptyStateReason,
        hasHydratedFromStorage: true,
        history: [],
        future: [],
      };
    }),

  setActiveFloor: (id) => {
    set((state) => {
      const floor = state.floors.find((item) => item.id === id) ?? null;
      return {
        activeFloorId: floor?.id ?? null,
        activeObjectId: floor?.objectId ?? null,
        selectedId: null,
        selectedKind: null,
        selectedItems: [],
        settings: {
          ...state.settings,
          uiState: mergeUiState(state.settings.uiState, {
            activeFloorId: floor?.id ?? null,
            activeObjectId: floor?.objectId ?? null,
          }),
        },
        savedAt: Date.now(),
      };
    });
    persistSnapshot(get());
  },

  focusObject: (id) => {
    set((state) => {
      const object = state.objects.find((item) => item.id === id) ?? null;
      if (!object) return state;
      const floor = state.floors.find((item) => item.objectId === object.id) ?? null;
      return {
        activeObjectId: object.id,
        activeFloorId: floor?.id ?? null,
        selectedId: object.id,
        selectedKind: "object",
        selectedItems: [{ kind: "object", id: object.id }],
        mode: "select",
        settings: {
          ...state.settings,
          uiState: mergeUiState(state.settings.uiState, {
            activeObjectId: object.id,
            activeFloorId: floor?.id ?? null,
          }),
        },
        savedAt: Date.now(),
      };
    });
    persistSnapshot(get());
  },

  focusDevice: (id) => {
    set((state) => {
      const device = state.devices.find((item) => item.id === id) ?? null;
      if (!device) return state;
      return {
        activeFloorId: device.floorId,
        activeObjectId: device.objectId,
        selectedId: device.id,
        selectedKind: "device",
        selectedItems: expandSelection(state, [{ kind: "device", id: device.id }]),
        mode: "select",
        settings: {
          ...state.settings,
          uiState: mergeUiState(state.settings.uiState, {
            activeObjectId: device.objectId,
            activeFloorId: device.floorId,
          }),
        },
        savedAt: Date.now(),
      };
    });
    persistSnapshot(get());
  },

  focusCamera: (id) => get().focusDevice(id),

  focusConnection: (id) => {
    set((state) => {
      const connection = state.deviceConnections.find((item) => item.id === id) ?? null;
      if (!connection) return state;
      const device =
        state.devices.find((item) => item.id === connection.from.deviceId) ??
        state.devices.find((item) => item.id === connection.to.deviceId) ??
        null;
      const floor = device
        ? (state.floors.find((item) => item.id === device.floorId) ?? null)
        : null;
      return {
        activeFloorId: floor?.id ?? state.activeFloorId,
        activeObjectId: floor?.objectId ?? state.activeObjectId,
        selectedId: connection.id,
        selectedKind: "connection",
        selectedItems: [{ kind: "connection", id: connection.id }],
        mode: "select",
        settings: {
          ...state.settings,
          uiState: mergeUiState(state.settings.uiState, {
            activeObjectId: floor?.objectId ?? state.activeObjectId,
            activeFloorId: floor?.id ?? state.activeFloorId,
          }),
        },
        savedAt: Date.now(),
      };
    });
    persistSnapshot(get());
  },

  focusElement: (id) => {
    set((state) => {
      const element = state.mapElements.find((item) => item.id === id) ?? null;
      if (!element) return state;
      const floor = state.floors.find((item) => item.id === element.floorId) ?? null;
      return {
        activeFloorId: element.floorId,
        activeObjectId: floor?.objectId ?? null,
        selectedId: element.id,
        selectedKind: "element",
        selectedItems: expandSelection(state, [{ kind: "element", id: element.id }]),
        mode: "select",
        settings: {
          ...state.settings,
          uiState: mergeUiState(state.settings.uiState, {
            activeObjectId: floor?.objectId ?? null,
            activeFloorId: element.floorId,
          }),
        },
        savedAt: Date.now(),
      };
    });
    persistSnapshot(get());
  },

  setEditMode: (enabled) =>
    set((state) => {
      if (enabled) {
        return {
          isEditMode: true,
          mode: state.mode,
        };
      }

      return {
        isEditMode: false,
        mode: "select",
        ...selectionState(state.selectedItems.slice(0, 1)),
      };
    }),

  setMode: (m) => set({ mode: m }),
  setCableType: (type) => set({ currentCableType: type }),
  select: (id, kind) =>
    set((state) => {
      if (!id || !kind) {
        return { ...selectionState([]) };
      }
      const item = { kind, id } as SelectionItem;
      return { ...selectionState(expandSelection(state, [item])) };
    }),
  selectItems: (items) => set((state) => ({ ...selectionState(expandSelection(state, items)) })),
  toggleSelection: (id, kind) =>
    set((state) => {
      if (!id || !kind) {
        return state;
      }
      const item = { kind, id } as SelectionItem;
      const expanded = expandSelection(state, [item]);
      const currentKeys = new Set(state.selectedItems.map((entry) => `${entry.kind}:${entry.id}`));
      const allSelected = expanded.every((entry) => currentKeys.has(`${entry.kind}:${entry.id}`));
      if (allSelected) {
        const next = state.selectedItems.filter(
          (entry) =>
            !expanded.some((itemRef) => itemRef.kind === entry.kind && itemRef.id === entry.id),
        );
        return { ...selectionState(next) };
      }
      return { ...selectionState([...state.selectedItems, ...expanded]) };
    }),
  clearSelection: () => set({ ...selectionState([]) }),
  groupSelectedItems: () => {
    const current = get();
    const groupable = current.selectedItems.filter(
      (item) => item.kind === "device" || item.kind === "element",
    );
    if (groupable.length < 2) return;
    const groupId = nanoid();
    mutate(set, get, (state) => ({
      devices: state.devices.map((device) =>
        groupable.some((item) => item.kind === "device" && item.id === device.id)
          ? { ...device, groupId, updatedAt: timestamp() }
          : device,
      ),
      mapElements: state.mapElements.map((element) =>
        groupable.some((item) => item.kind === "element" && item.id === element.id)
          ? { ...element, groupId, updatedAt: timestamp() }
          : element,
      ),
      ...selectionState(expandSelection(state, groupable)),
    }));
  },
  ungroupSelectedItems: () => {
    const current = get();
    const groupable = current.selectedItems.filter(
      (item) => item.kind === "device" || item.kind === "element",
    );
    if (groupable.length === 0) return;
    mutate(set, get, (state) => ({
      devices: state.devices.map((device) =>
        groupable.some((item) => item.kind === "device" && item.id === device.id)
          ? { ...device, groupId: null, updatedAt: timestamp() }
          : device,
      ),
      mapElements: state.mapElements.map((element) =>
        groupable.some((item) => item.kind === "element" && item.id === element.id)
          ? { ...element, groupId: null, updatedAt: timestamp() }
          : element,
      ),
      ...selectionState(expandSelection(state, groupable)),
    }));
  },
  removeSelectedItems: () => {
    const current = get();
    if (current.selectedItems.length === 0) return;
    const deviceIds = new Set(
      current.selectedItems.filter((item) => item.kind === "device").map((item) => item.id),
    );
    const elementIds = new Set(
      current.selectedItems.filter((item) => item.kind === "element").map((item) => item.id),
    );
    const connectionIds = new Set(
      current.selectedItems.filter((item) => item.kind === "connection").map((item) => item.id),
    );
    mutate(set, get, (state) => ({
      devices: state.devices.filter((device) => !deviceIds.has(device.id)),
      mapElements: state.mapElements.filter((element) => !elementIds.has(element.id)),
      deviceConnections: state.deviceConnections.filter(
        (connection) =>
          !connectionIds.has(connection.id) &&
          !deviceIds.has(connection.from.deviceId ?? "") &&
          !deviceIds.has(connection.to.deviceId ?? ""),
      ),
      ...selectionState([]),
    }));
  },
  moveGroupBy: (groupId, dx, dy) => {
    if (!groupId || (dx === 0 && dy === 0)) return;
    mutate(set, get, (state) => ({
      devices: state.devices.map((device) =>
        device.groupId === groupId
          ? { ...device, x: device.x + dx, y: device.y + dy, updatedAt: timestamp() }
          : device,
      ),
      mapElements: state.mapElements.map((element) =>
        element.groupId === groupId
          ? { ...element, x: element.x + dx, y: element.y + dy, updatedAt: timestamp() }
          : element,
      ),
    }));
  },
  moveSelectedItemsBy: (items, dx, dy) => {
    if ((dx === 0 && dy === 0) || items.length === 0) return;
    const deviceIds = new Set(
      items.filter((item) => item.kind === "device").map((item) => item.id),
    );
    const elementIds = new Set(
      items.filter((item) => item.kind === "element").map((item) => item.id),
    );
    mutate(set, get, (state) => ({
      devices: state.devices.map((device) =>
        deviceIds.has(device.id)
          ? { ...device, x: device.x + dx, y: device.y + dy, updatedAt: timestamp() }
          : device,
      ),
      mapElements: state.mapElements.map((element) =>
        elementIds.has(element.id)
          ? { ...element, x: element.x + dx, y: element.y + dy, updatedAt: timestamp() }
          : element,
      ),
    }));
  },

  addObject: (name) => {
    const next = createObjectRecord(name);
    const firstFloor = createFloorRecord(next.id, "Новая зона", 1);
    mutate(set, get, (state) => ({
      objects: [...state.objects, next],
      floors: [...state.floors, firstFloor],
      activeObjectId: next.id,
      activeFloorId: firstFloor.id,
      emptyStateReason: null,
      ...selectionState([]),
    }));
    return next.id;
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
      const remainingDevices = state.devices.filter((device) =>
        remainingFloorIds.has(device.floorId),
      );
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
        emptyStateReason: remainingObjects.length === 0 ? "object-deleted-last" : null,
        ...selectionState([]),
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
      emptyStateReason: null,
      ...selectionState([]),
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
        (connection) =>
          deviceIds.has(connection.from.deviceId ?? "") &&
          deviceIds.has(connection.to.deviceId ?? ""),
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
        ...selectionState([]),
      };
    });
  },

  addElement: (element) => {
    const next = createElementRecord(element);
    mutate(set, get, (state) => ({
      mapElements: [...state.mapElements, next],
      ...selectionState(expandSelection(state, [{ kind: "element", id: next.id }])),
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
      ...selectionState(
        state.selectedItems.filter((item) => !(item.kind === "element" && item.id === id)),
      ),
    }));
  },

  addDevice: (device) => {
    const next = ensureObjectPlacement(get().devices, get().floors, createDeviceRecord(device));
    mutate(set, get, (state) => ({
      devices: [...state.devices, next],
      ...selectionState(expandSelection(state, [{ kind: "device", id: next.id }])),
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
      ...selectionState(
        state.selectedItems.filter((item) => !(item.kind === "device" && item.id === id)),
      ),
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

  addDeviceConnection: (
    connection: Omit<DeviceConnection, "id" | "createdAt" | "updatedAt">,
  ) => string;
  updateDeviceConnection: (id: string, patch: Partial<DeviceConnection>) => void;
  toggleDeviceConnection: (fromDeviceId: string, toDeviceId: string, cableType?: CableType) => void;
  removeDeviceConnection: (id: string) => void;

  copySelected: () => void;
  pasteClipboard: () => void;

  undo: () => void;
  redo: () => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  updateUiState: (patch: Partial<UiLayoutState>) => void;
  newProject: () => void;
  importJSON: (data: string) => void;
  exportJSON: () => string;
}

type EditorSnapshot = AppData & {
  activeObjectId: string | null;
  activeFloorId: string | null;
  selectedId: string | null;
  selectedKind: SelectionKind | null;
  selectedItems: SelectionItem[];
  mode: EditorMode;
  isEditMode: boolean;
  emptyStateReason: string | null;
};

type ClipboardItem = { kind: "device"; device: Device } | { kind: "element"; element: MapElement };

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

function normalizeSelection(items: SelectionItem[]) {
  const seen = new Set<string>();
  const result: SelectionItem[] = [];
  for (const item of items) {
    const key = `${item.kind}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function selectionState(items: SelectionItem[]) {
  const selectedItems = normalizeSelection(items);
  const primary = selectedItems[0] ?? null;
  return {
    selectedItems,
    selectedId: primary?.id ?? null,
    selectedKind: primary?.kind ?? null,
  };
}

function mergeUiState(current: UiLayoutState | undefined, patch: Partial<UiLayoutState>) {
  return { ...(current ?? {}), ...patch };
}

function resolveStartupFocus(data: AppData) {
  const uiState = data.settings.uiState;
  const storedObjectId = uiState?.activeObjectId ?? null;
  const storedFloorId = uiState?.activeFloorId ?? null;
  const storedObject =
    storedObjectId && data.objects.some((object) => object.id === storedObjectId)
      ? (data.objects.find((object) => object.id === storedObjectId) ?? null)
      : null;
  const storedFloor =
    storedFloorId && data.floors.some((floor) => floor.id === storedFloorId)
      ? (data.floors.find((floor) => floor.id === storedFloorId) ?? null)
      : null;

  let objectId: string | null = null;
  let floorId: string | null = null;

  if (storedObject && storedFloor && storedFloor.objectId === storedObject.id) {
    objectId = storedObject.id;
    floorId = storedFloor.id;
  } else if (storedObject) {
    objectId = storedObject.id;
    floorId =
      data.floors
        .filter((floor) => floor.objectId === storedObject.id)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))[0]
        ?.id ?? null;
  } else if (data.objects.length > 0) {
    const firstObject = data.objects[0];
    objectId = firstObject.id;
    floorId =
      data.floors
        .filter((floor) => floor.objectId === firstObject.id)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))[0]
        ?.id ?? null;
  }

  const resolvedUiState = mergeUiState(uiState, {
    activeObjectId: objectId,
    activeFloorId: floorId,
  });

  const changed = uiState?.activeObjectId !== objectId || uiState?.activeFloorId !== floorId;

  return {
    objectId,
    floorId,
    settings: {
      ...data.settings,
      uiState: resolvedUiState,
    },
    changed,
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
    selectedItems: state.selectedItems,
    mode: state.mode,
    isEditMode: state.isEditMode,
    emptyStateReason: state.emptyStateReason,
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
    selectedItems: snapshot.selectedItems,
    mode: snapshot.mode,
    isEditMode: snapshot.isEditMode,
    emptyStateReason: snapshot.emptyStateReason,
    isHydrated: true,
    savedAt: Date.now(),
  };
}

function pushHistory(state: State, snapshot: EditorSnapshot) {
  return [...state.history, snapshot].slice(-50);
}

function inferCallerName() {
  const stack = new Error().stack?.split("\n").map((line) => line.trim()) ?? [];
  for (const frame of stack) {
    const match = frame.match(/at\s+(?:async\s+)?(?:(.*?)\s+)?\(?([^:\s)]+)(?::\d+:\d+)?\)?$/);
    const name = match?.[1] || match?.[2] || "";
    if (
      name === "inferCallerName" ||
      name === "persistSnapshot" ||
      name === "saveSnapshot" ||
      name === "saveAppData" ||
      name === "loadBestSnapshot" ||
      name === "mutate"
    ) {
      continue;
    }
    if (name) return name;
  }
  return "unknown";
}

function mutate(
  set: (fn: (state: State) => Partial<State>) => void,
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

function persistSnapshot(state: State, reason = "autosave") {
  if (!state.isHydrated || !state.hasHydratedFromStorage) {
    return;
  }

  void saveSnapshot(selectData(state), reason, {
    reason,
    caller: inferCallerName(),
    activeObjectId: state.activeObjectId,
    activeFloorId: state.activeFloorId,
  });
}

export function flushCurrentSnapshot() {
  const state = useStore.getState();
  if (!state.isHydrated || !state.hasHydratedFromStorage) return;
  void saveSnapshot(selectData(state), "exit", {
    reason: "exit",
    caller: "flushCurrentSnapshot",
    activeObjectId: state.activeObjectId,
    activeFloorId: state.activeFloorId,
  });
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

const repairedTextByMojibake = new Map<string, string>([
  [
    "\u0420\u045c\u0420\u0455\u0420\u0406\u0420\u00b0\u0421\u040f \u0420\u0454\u0420\u00b0\u0420\u0458\u0420\u00b5\u0421\u0402\u0420\u00b0",
    "\u041d\u043e\u0432\u0430\u044f \u043a\u0430\u043c\u0435\u0440\u0430",
  ],
  ["\u0420\u045c\u0420\u0455\u0420\u0406\u0421\u2039\u0420\u2116 NVR", "\u041d\u043e\u0432\u044b\u0439 NVR"],
  ["\u0420\u045c\u0420\u0455\u0420\u0406\u0421\u2039\u0420\u2116 DVR", "\u041d\u043e\u0432\u044b\u0439 DVR"],
  ["\u0420\u045c\u0420\u0455\u0420\u0406\u0421\u2039\u0420\u2116 Switch", "\u041d\u043e\u0432\u044b\u0439 Switch"],
  ["\u0420\u045c\u0420\u0455\u0420\u0406\u0421\u2039\u0420\u2116 PoE Switch", "\u041d\u043e\u0432\u044b\u0439 PoE Switch"],
  [
    "\u0420\u045f\u0420\u0455\u0420\u0458\u0420\u00b5\u0421\u2030\u0420\u00b5\u0420\u0405\u0420\u0451\u0420\u00b5",
    "\u041f\u043e\u043c\u0435\u0449\u0435\u043d\u0438\u0435",
  ],
  ["\u0420\u2018\u0420\u00b5\u0420\u00b7 IP", "\u0411\u0435\u0437 IP"],
  ["\u0420\u045e\u0420\u0455\u0421\u2021\u0420\u0454\u0420\u00b0 A", "\u0422\u043e\u0447\u043a\u0430 A"],
  ["\u0420\u045e\u0420\u0455\u0421\u2021\u0420\u0454\u0420\u00b0 B", "\u0422\u043e\u0447\u043a\u0430 B"],
  [
    "\u0420\u2018\u0420\u00b5\u0420\u00b7 \u0420\u0455\u0420\u00b1\u0421\u0409\u0420\u00b5\u0420\u0454\u0421\u201a\u0420\u00b0",
    "\u0411\u0435\u0437 \u043e\u0431\u044a\u0435\u043a\u0442\u0430",
  ],
]);

function repairMojibakeText(value: string | undefined): string | undefined {
  if (!value) return value;
  return repairedTextByMojibake.get(value) ?? value;
}

function createObjectRecord(name: string, description?: string): SiteObject {
  const now = timestamp();
  return {
    id: nanoid(),
    name: repairMojibakeText(name) ?? name,
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
    name: repairMojibakeText(name) ?? name,
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
    label: repairMojibakeText(element.label) ?? element.label,
    id: nanoid(),
    locked: element.locked ?? false,
    groupId: element.groupId ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

function createDeviceRecord(device: Omit<Device, "id" | "createdAt" | "updatedAt">): Device {
  const now = timestamp();
  return {
    ...device,
    name: repairMojibakeText(device.name) ?? device.name,
    id: nanoid(),
    locked: device.locked ?? false,
    groupId: device.groupId ?? null,
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
  return {
    ...connection,
    ...patch,
    id: connection.id,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
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
    (connection) => connection.from.deviceId !== deviceId && connection.to.deviceId !== deviceId,
  );
}

function getAnchorPoint(device: Device, anchor: CableAnchor = "center"): { x: number; y: number } {
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

function getSelectionMembers(state: State, item: SelectionItem): SelectionItem[] {
  if (item.kind !== "device" && item.kind !== "element") {
    return [item];
  }

  const device =
    item.kind === "device" ? state.devices.find((entry) => entry.id === item.id) : null;
  const element =
    item.kind === "element" ? state.mapElements.find((entry) => entry.id === item.id) : null;
  const groupId = device?.groupId ?? element?.groupId ?? null;
  if (!groupId) {
    return [item];
  }

  const deviceItems = state.devices
    .filter((entry) => entry.groupId === groupId)
    .map<SelectionItem>((entry) => ({ kind: "device", id: entry.id }));
  const elementItems = state.mapElements
    .filter((entry) => entry.groupId === groupId)
    .map<SelectionItem>((entry) => ({ kind: "element", id: entry.id }));
  return normalizeSelection([...deviceItems, ...elementItems]);
}

function expandSelection(state: State, items: SelectionItem[], includeGroups = state.isEditMode) {
  if (!includeGroups) {
    return normalizeSelection(items);
  }
  return normalizeSelection(items.flatMap((item) => getSelectionMembers(state, item)));
}

const emptyAppData = normalizeAppData({});
const initial = {
  ...emptyAppData,
  settings: {
    ...emptyAppData.settings,
    uiState: mergeUiState(emptyAppData.settings.uiState, {
      activeObjectId: null,
      activeFloorId: null,
    }),
  },
};

export const deviceTypeLabels: Record<DeviceType, string> = {
  camera: "Камера",
  nvr: "NVR",
  dvr: "DVR",
  switch: "Switch",
  poe_switch: "PoE Switch",
};

export const useStore = create<State>()((set, get) => ({
  ...initial,
  activeObjectId: null,
  activeFloorId: null,
  selectedId: null,
  selectedKind: null,
  selectedItems: [],
  mode: "select",
  isEditMode: false,
  currentCableType: "utp",
  savedAt: Date.now(),
  isHydrated: false,
  emptyStateReason: null,
  hasHydratedFromStorage: false,
  history: [],
  future: [],

  hydrate: (data, emptyStateReason = null) =>
    set((state) => {
      const { objectId, floorId, settings } = resolveStartupFocus(data);
      return {
        ...state,
        ...data,
        settings,
        activeObjectId: objectId,
        activeFloorId: floorId,
        selectedId: null,
        selectedKind: null,
        selectedItems: [],
        mode: "select",
        isEditMode: false,
        currentCableType: "utp",
        savedAt: Date.now(),
        isHydrated: true,
        emptyStateReason,
        hasHydratedFromStorage: true,
        history: [],
        future: [],
      };
    }),

  setActiveFloor: (id) => {
    set((state) => {
      const floor = state.floors.find((item) => item.id === id) ?? null;
      return {
        activeFloorId: floor?.id ?? null,
        activeObjectId: floor?.objectId ?? null,
        selectedId: null,
        selectedKind: null,
        selectedItems: [],
        settings: {
          ...state.settings,
          uiState: mergeUiState(state.settings.uiState, {
            activeFloorId: floor?.id ?? null,
            activeObjectId: floor?.objectId ?? null,
          }),
        },
        savedAt: Date.now(),
      };
    });
    persistSnapshot(get());
  },

  focusObject: (id) => {
    set((state) => {
      const object = state.objects.find((item) => item.id === id) ?? null;
      if (!object) return state;
      const floor = state.floors.find((item) => item.objectId === object.id) ?? null;
      return {
        activeObjectId: object.id,
        activeFloorId: floor?.id ?? null,
        selectedId: object.id,
        selectedKind: "object",
        selectedItems: [{ kind: "object", id: object.id }],
        mode: "select",
        settings: {
          ...state.settings,
          uiState: mergeUiState(state.settings.uiState, {
            activeObjectId: object.id,
            activeFloorId: floor?.id ?? null,
          }),
        },
        savedAt: Date.now(),
      };
    });
    persistSnapshot(get());
  },

  focusDevice: (id) => {
    set((state) => {
      const device = state.devices.find((item) => item.id === id) ?? null;
      if (!device) return state;
      return {
        activeFloorId: device.floorId,
        activeObjectId: device.objectId,
        selectedId: device.id,
        selectedKind: "device",
        selectedItems: expandSelection(state, [{ kind: "device", id: device.id }]),
        mode: "select",
        settings: {
          ...state.settings,
          uiState: mergeUiState(state.settings.uiState, {
            activeObjectId: device.objectId,
            activeFloorId: device.floorId,
          }),
        },
        savedAt: Date.now(),
      };
    });
    persistSnapshot(get());
  },

  focusCamera: (id) => get().focusDevice(id),

  focusConnection: (id) => {
    set((state) => {
      const connection = state.deviceConnections.find((item) => item.id === id) ?? null;
      if (!connection) return state;
      const device =
        state.devices.find((item) => item.id === connection.from.deviceId) ??
        state.devices.find((item) => item.id === connection.to.deviceId) ??
        null;
      const floor = device
        ? (state.floors.find((item) => item.id === device.floorId) ?? null)
        : null;
      return {
        activeFloorId: floor?.id ?? state.activeFloorId,
        activeObjectId: floor?.objectId ?? state.activeObjectId,
        selectedId: connection.id,
        selectedKind: "connection",
        selectedItems: [{ kind: "connection", id: connection.id }],
        mode: "select",
        settings: {
          ...state.settings,
          uiState: mergeUiState(state.settings.uiState, {
            activeObjectId: floor?.objectId ?? state.activeObjectId,
            activeFloorId: floor?.id ?? state.activeFloorId,
          }),
        },
        savedAt: Date.now(),
      };
    });
    persistSnapshot(get());
  },

  focusElement: (id) => {
    set((state) => {
      const element = state.mapElements.find((item) => item.id === id) ?? null;
      if (!element) return state;
      const floor = state.floors.find((item) => item.id === element.floorId) ?? null;
      return {
        activeFloorId: element.floorId,
        activeObjectId: floor?.objectId ?? null,
        selectedId: element.id,
        selectedKind: "element",
        selectedItems: expandSelection(state, [{ kind: "element", id: element.id }]),
        mode: "select",
        settings: {
          ...state.settings,
          uiState: mergeUiState(state.settings.uiState, {
            activeObjectId: floor?.objectId ?? null,
            activeFloorId: element.floorId,
          }),
        },
        savedAt: Date.now(),
      };
    });
    persistSnapshot(get());
  },

  setEditMode: (enabled) =>
    set((state) => {
      if (enabled) {
        return {
          isEditMode: true,
          mode: state.mode,
        };
      }

      return {
        isEditMode: false,
        mode: "select",
        ...selectionState(state.selectedItems.slice(0, 1)),
      };
    }),

  setMode: (m) => set({ mode: m }),
  setCableType: (type) => set({ currentCableType: type }),
  select: (id, kind) =>
    set((state) => {
      if (!id || !kind) {
        return { ...selectionState([]) };
      }
      const item = { kind, id } as SelectionItem;
      return { ...selectionState(expandSelection(state, [item])) };
    }),
  selectItems: (items) => set((state) => ({ ...selectionState(expandSelection(state, items)) })),
  toggleSelection: (id, kind) =>
    set((state) => {
      if (!id || !kind) {
        return state;
      }
      const item = { kind, id } as SelectionItem;
      const expanded = expandSelection(state, [item]);
      const currentKeys = new Set(state.selectedItems.map((entry) => `${entry.kind}:${entry.id}`));
      const allSelected = expanded.every((entry) => currentKeys.has(`${entry.kind}:${entry.id}`));
      if (allSelected) {
        const next = state.selectedItems.filter(
          (entry) =>
            !expanded.some((itemRef) => itemRef.kind === entry.kind && itemRef.id === entry.id),
        );
        return { ...selectionState(next) };
      }
      return { ...selectionState([...state.selectedItems, ...expanded]) };
    }),
  clearSelection: () => set({ ...selectionState([]) }),
  groupSelectedItems: () => {
    const current = get();
    const groupable = current.selectedItems.filter(
      (item) => item.kind === "device" || item.kind === "element",
    );
    if (groupable.length < 2) return;
    const groupId = nanoid();
    mutate(set, get, (state) => ({
      devices: state.devices.map((device) =>
        groupable.some((item) => item.kind === "device" && item.id === device.id)
          ? { ...device, groupId, updatedAt: timestamp() }
          : device,
      ),
      mapElements: state.mapElements.map((element) =>
        groupable.some((item) => item.kind === "element" && item.id === element.id)
          ? { ...element, groupId, updatedAt: timestamp() }
          : element,
      ),
      ...selectionState(expandSelection(state, groupable)),
    }));
  },
  ungroupSelectedItems: () => {
    const current = get();
    const groupable = current.selectedItems.filter(
      (item) => item.kind === "device" || item.kind === "element",
    );
    if (groupable.length === 0) return;
    mutate(set, get, (state) => ({
      devices: state.devices.map((device) =>
        groupable.some((item) => item.kind === "device" && item.id === device.id)
          ? { ...device, groupId: null, updatedAt: timestamp() }
          : device,
      ),
      mapElements: state.mapElements.map((element) =>
        groupable.some((item) => item.kind === "element" && item.id === element.id)
          ? { ...element, groupId: null, updatedAt: timestamp() }
          : element,
      ),
      ...selectionState(expandSelection(state, groupable)),
    }));
  },
  removeSelectedItems: () => {
    const current = get();
    if (current.selectedItems.length === 0) return;
    const deviceIds = new Set(
      current.selectedItems.filter((item) => item.kind === "device").map((item) => item.id),
    );
    const elementIds = new Set(
      current.selectedItems.filter((item) => item.kind === "element").map((item) => item.id),
    );
    const connectionIds = new Set(
      current.selectedItems.filter((item) => item.kind === "connection").map((item) => item.id),
    );
    mutate(set, get, (state) => ({
      devices: state.devices.filter((device) => !deviceIds.has(device.id)),
      mapElements: state.mapElements.filter((element) => !elementIds.has(element.id)),
      deviceConnections: state.deviceConnections.filter(
        (connection) =>
          !connectionIds.has(connection.id) &&
          !deviceIds.has(connection.from.deviceId ?? "") &&
          !deviceIds.has(connection.to.deviceId ?? ""),
      ),
      ...selectionState([]),
    }));
  },
  moveGroupBy: (groupId, dx, dy) => {
    if (!groupId || (dx === 0 && dy === 0)) return;
    mutate(set, get, (state) => ({
      devices: state.devices.map((device) =>
        device.groupId === groupId
          ? { ...device, x: device.x + dx, y: device.y + dy, updatedAt: timestamp() }
          : device,
      ),
      mapElements: state.mapElements.map((element) =>
        element.groupId === groupId
          ? { ...element, x: element.x + dx, y: element.y + dy, updatedAt: timestamp() }
          : element,
      ),
    }));
  },
  moveSelectedItemsBy: (items, dx, dy) => {
    if ((dx === 0 && dy === 0) || items.length === 0) return;
    const deviceIds = new Set(
      items.filter((item) => item.kind === "device").map((item) => item.id),
    );
    const elementIds = new Set(
      items.filter((item) => item.kind === "element").map((item) => item.id),
    );
    mutate(set, get, (state) => ({
      devices: state.devices.map((device) =>
        deviceIds.has(device.id)
          ? { ...device, x: device.x + dx, y: device.y + dy, updatedAt: timestamp() }
          : device,
      ),
      mapElements: state.mapElements.map((element) =>
        elementIds.has(element.id)
          ? { ...element, x: element.x + dx, y: element.y + dy, updatedAt: timestamp() }
          : element,
      ),
    }));
  },

  addObject: (name) => {
    const next = createObjectRecord(name);
    const firstFloor = createFloorRecord(next.id, "Новая зона", 1);
    mutate(set, get, (state) => ({
      objects: [...state.objects, next],
      floors: [...state.floors, firstFloor],
      activeObjectId: next.id,
      activeFloorId: firstFloor.id,
      emptyStateReason: null,
      ...selectionState([]),
    }));
    return next.id;
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
      const remainingDevices = state.devices.filter((device) =>
        remainingFloorIds.has(device.floorId),
      );
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
        emptyStateReason: remainingObjects.length === 0 ? "object-deleted-last" : null,
        ...selectionState([]),
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
      emptyStateReason: null,
      ...selectionState([]),
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
        (connection) =>
          deviceIds.has(connection.from.deviceId ?? "") &&
          deviceIds.has(connection.to.deviceId ?? ""),
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
        ...selectionState([]),
      };
    });
  },

  addElement: (element) => {
    const next = createElementRecord(element);
    mutate(set, get, (state) => ({
      mapElements: [...state.mapElements, next],
      ...selectionState(expandSelection(state, [{ kind: "element", id: next.id }])),
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
      ...selectionState(
        state.selectedItems.filter((item) => !(item.kind === "element" && item.id === id)),
      ),
    }));
  },

  addDevice: (device) => {
    const next = ensureObjectPlacement(get().devices, get().floors, createDeviceRecord(device));
    mutate(set, get, (state) => ({
      devices: [...state.devices, next],
      ...selectionState(expandSelection(state, [{ kind: "device", id: next.id }])),
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
      ...selectionState(
        state.selectedItems.filter((item) => !(item.kind === "device" && item.id === id)),
      ),
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

  addDeviceConnection: (
    connection: Omit<DeviceConnection, "id" | "createdAt" | "updatedAt">,
  ) => {
    const id = nanoid();
    mutate(set, get, (state) => ({
      deviceConnections: [
        ...state.deviceConnections,
        {
          ...connection,
          id,
          locked: connection.locked ?? false,
          createdAt: timestamp(),
          updatedAt: timestamp(),
        },
      ],
    }));
    return id;
  },

  updateDeviceConnection: (id, patch) => {
    mutate(set, get, (state) => ({
      deviceConnections: state.deviceConnections.map((connection) =>
        connection.id === id
          ? {
              ...connection,
              ...patch,
              locked: patch.locked ?? connection.locked ?? false,
              points: patch.points
                ? patch.points.map((point) => ({ ...point }))
                : connection.points,
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
          deviceConnections: state.deviceConnections.filter(
            (connection) => connection.id !== existing.id,
          ),
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
      ...selectionState(
        state.selectedItems.filter((item) => !(item.kind === "connection" && item.id === id)),
      ),
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
        ...selectionState(expandSelection(current, [{ kind: "device", id: copy.id }])),
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
      ...selectionState(expandSelection(current, [{ kind: "element", id: copy.id }])),
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

  updateUiState: (patch) => {
    set((state) => ({
      settings: {
        ...state.settings,
        uiState: mergeUiState(state.settings.uiState, patch),
      },
      savedAt: Date.now(),
    }));
    persistSnapshot(get());
  },

  newProject: () => {
    set(() => ({
      ...initial,
      activeObjectId: null,
      activeFloorId: null,
      selectedId: null,
      selectedKind: null,
      selectedItems: [],
      mode: "select",
      isEditMode: false,
      currentCableType: "utp",
      savedAt: Date.now(),
      isHydrated: true,
      history: [],
      future: [],
    }));
    persistSnapshot(get());
  },

  importJSON: (data) => {
    const parsed = normalizeAppData(JSON.parse(data));
    const resolved = resolveStartupFocus(parsed);
    mutate(set, get, () => ({
      ...parsed,
      settings: resolved.settings,
      activeObjectId: resolved.objectId,
      activeFloorId: resolved.floorId,
      ...selectionState([]),
      mode: "select",
      isEditMode: false,
      isHydrated: true,
    }));
    persistSnapshot(get());
  },

  exportJSON: () => JSON.stringify(selectData(get()), null, 2),
}));

export async function bootstrapStore() {
  const data = await loadAppData();
  if (data) {
    useStore.getState().hydrate(data);
    return;
  }

  useStore.getState().hydrate(initial);
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
