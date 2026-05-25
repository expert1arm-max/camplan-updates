import type {
  AppData,
  AppSettings,
  CableAnchor,
  CablePoint,
  CableType,
  Device,
  DeviceConnection,
  DeviceStatus,
  DeviceType,
  Floor,
  MapElement,
  SiteObject,
} from "@/types";
import { DEFAULT_ROOM_COLOR } from "@/utils/room-colors";

const DB_NAME = "camplan-local";
const DB_VERSION = 3;
const STORE_NAME = "app-data";
const STORAGE_KEY = "current";
const BACKUP_STORAGE_KEY = "camplan:last-app-data";
const DEBUG_LOG_STORAGE_KEY = "camplan:qa-debug-log";
const INVALID_BACKUP_RAW = Symbol("camplan-invalid-backup-raw");

const DEFAULT_SETTINGS: AppData["settings"] = {
  theme: "system",
  masterPasswordEncryption: "todo",
  roomColorPreset: DEFAULT_ROOM_COLOR,
  uiState: {
    leftCollapsed: false,
    rightCollapsed: false,
    rightPinned: false,
    showIpLabels: false,
  },
};

const statusMap: Record<string, DeviceStatus> = {
  working: "working",
  offline: "offline",
  needs_check: "needs_check",
  broken: "offline",
  check: "needs_check",
  reserve: "reserve",
  no_access: "no_access",
};

const cableTypeMap: Record<string, CableType> = {
  utp: "utp",
  ftp: "ftp",
  coaxial: "coaxial",
  coacsil: "coaxial",
  power: "power",
  network: "utp",
  poe: "utp",
  video: "coaxial",
  uplink: "utp",
};

type UnknownRecord = Record<string, unknown>;

function now() {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

type PersistedSnapshot = {
  data: AppData;
  savedAt: number;
  updatedAt: number;
  activeObjectId: string | null;
  activeFloorId: string | null;
  source: string;
  caller: string;
};

type SnapshotCandidate = {
  storageTarget: "indexeddb" | "localstorage";
  source: string;
  caller: string;
  snapshot: AppData;
  savedAt: number;
  updatedAt: number;
  activeObjectId: string | null;
  activeFloorId: string | null;
  contentCount: number;
};

type SnapshotSummary = {
  objectsLength: number;
  floorsLength: number;
  activeObjectId: string | null;
  activeFloorId: string | null;
  firstObjectName: string;
  isEmpty: boolean;
};

type QaLogDetails = {
  caller?: string;
  source?: string;
  reason?: string;
  storageTarget?: "indexeddb" | "localstorage" | "store" | "both" | "none";
  status?: string;
  message?: string;
  note?: string;
  activeObjectId?: string | null;
  activeFloorId?: string | null;
};

function getBackupStorage() {
  if (typeof localStorage === "undefined") return null;
  return localStorage;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function getSnapshotSummary(data: AppData, activeObjectId: string | null = null, activeFloorId: string | null = null): SnapshotSummary {
  const isEmpty = data.objects.length === 0;
  return {
    objectsLength: data.objects.length,
    floorsLength: data.floors.length,
    activeObjectId,
    activeFloorId,
    firstObjectName: data.objects[0]?.name ?? "",
    isEmpty,
  };
}

function formatSnapshotSummary(summary: SnapshotSummary) {
  return [
    `objects.length=${summary.objectsLength}`,
    `floors.length=${summary.floorsLength}`,
    `activeObjectId=${summary.activeObjectId ?? "null"}`,
    `activeFloorId=${summary.activeFloorId ?? "null"}`,
    `first object name=${JSON.stringify(summary.firstObjectName)}`,
    `isEmpty=${summary.isEmpty ? "true" : "false"}`,
  ].join(" ");
}

function readDebugLogBuffer() {
  const storage = getBackupStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(DEBUG_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((line) => typeof line === "string") : [];
  } catch {
    return [];
  }
}

function writeDebugLogBuffer(lines: string[]) {
  const storage = getBackupStorage();
  if (!storage) return;

  try {
    storage.setItem(DEBUG_LOG_STORAGE_KEY, JSON.stringify(lines.slice(-250)));
  } catch {
    // QA debug logs are best-effort and must not break persistence.
  }
}

function appendDebugLogLine(line: string) {
  const lines = readDebugLogBuffer();
  lines.push(line);
  writeDebugLogBuffer(lines);
}

export function logQaEvent(
  event: string,
  snapshot: AppData | null,
  details: QaLogDetails = {},
) {
  const summary = snapshot
    ? getSnapshotSummary(
        snapshot,
        details.activeObjectId ?? snapshot.settings.uiState?.activeObjectId ?? null,
        details.activeFloorId ?? snapshot.settings.uiState?.activeFloorId ?? null,
      )
    : {
        objectsLength: 0,
        floorsLength: 0,
        activeObjectId: details.activeObjectId ?? null,
        activeFloorId: details.activeFloorId ?? null,
        firstObjectName: "",
        isEmpty: true,
      };

  const entry = {
    event,
    timestamp: now(),
    caller: details.caller ?? "unknown",
    source: details.source ?? "unknown",
    reason: details.reason ?? "",
    storageTarget: details.storageTarget ?? "none",
    status: details.status ?? "",
    message: details.message ?? "",
    note: details.note ?? "",
    objectsLength: summary.objectsLength,
    floorsLength: summary.floorsLength,
    activeObjectId: summary.activeObjectId,
    activeFloorId: summary.activeFloorId,
    firstObjectName: summary.firstObjectName,
    isEmpty: summary.isEmpty,
  };

  console.info(event, entry);
  appendDebugLogLine(JSON.stringify(entry));
}

export function isValidNonEmptySnapshot(snapshot: AppData) {
  return snapshot.objects.length > 0;
}

function isEmptySnapshot(snapshot: AppData) {
  return !isValidNonEmptySnapshot(snapshot);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeViewport(input: unknown) {
  if (!isRecord(input)) return undefined;
  return {
    x: asNumber(input.x, 0),
    y: asNumber(input.y, 0),
    w: asNumber(input.w, 0),
    h: asNumber(input.h, 0),
  };
}

function normalizeViewportMap(input: unknown) {
  const record = asRecord(input);
  return Object.fromEntries(
    Object.entries(record)
      .map(([floorId, viewport]) => [floorId, normalizeViewport(viewport)] as const)
      .filter((entry): entry is [string, NonNullable<ReturnType<typeof normalizeViewport>>] =>
        Boolean(entry[1]),
      ),
  );
}

function openDb() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);

  return new Promise<IDBDatabase | null>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readRaw(): Promise<unknown | null> {
  const db = await openDb();
  if (!db) return null;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(STORAGE_KEY);
    request.onsuccess = () => {
      resolve(request.result ?? null);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function writeRaw(value: unknown): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;

  const ok = await new Promise<boolean>((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(value, STORAGE_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve(true);
    };
    tx.onerror = () => {
      db.close();
      resolve(false);
    };
  });

  return ok;
}

function readBackupRaw(): unknown | null | typeof INVALID_BACKUP_RAW {
  const storage = getBackupStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(BACKUP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return INVALID_BACKUP_RAW;
  }
}

function writeBackupRaw(value: unknown): boolean {
  const storage = getBackupStorage();
  if (!storage) return false;

  try {
    storage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch {
    // localStorage is a best-effort backup for the latest project snapshot.
  }

  return false;
}

function readPersistedTimestamp(value: unknown): number {
  if (!isRecord(value)) return 0;
  const timestamp = Number(value.updatedAt ?? value.savedAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function countSnapshotContent(value: unknown): number {
  if (!isRecord(value)) return 0;
  const snapshot = normalizeAppData(value);
  return [
    snapshot.objects.length,
    snapshot.floors.length,
    snapshot.mapElements.length,
    snapshot.devices.length,
    snapshot.deviceConnections.length,
  ].reduce((sum, count) => sum + count, 0);
}

function toPersistedCandidate(
  storageTarget: SnapshotCandidate["storageTarget"],
  raw: unknown,
): SnapshotCandidate | null {
  if (raw === null || raw === undefined) {
    logQaEvent(
      storageTarget === "indexeddb" ? "RESTORE_INDEXEDDB_RESULT" : "RESTORE_LOCALSTORAGE_RESULT",
      null,
      {
        caller: "loadBestSnapshot",
        source: storageTarget,
        storageTarget,
        status: "empty",
        message: "no persisted snapshot found",
      },
    );
    return null;
  }

  if (!isRecord(raw)) {
    logQaEvent(
      storageTarget === "indexeddb" ? "RESTORE_INDEXEDDB_RESULT" : "RESTORE_LOCALSTORAGE_RESULT",
      null,
      {
        caller: "loadBestSnapshot",
        source: storageTarget,
        storageTarget,
        status: "invalid",
        message: "raw snapshot is not a record",
      },
    );
    return null;
  }

  const payload = isRecord(raw.data) ? raw.data : raw;
  try {
    const snapshot = normalizeAppData(payload);
    const savedAt = readPersistedTimestamp(raw);
    const updatedAt = Number(
      isRecord(raw) ? Number(raw.updatedAt ?? raw.savedAt ?? savedAt) : savedAt,
    );
    const activeObjectId =
      typeof raw.activeObjectId === "string" || raw.activeObjectId === null
        ? raw.activeObjectId
        : snapshot.settings.uiState?.activeObjectId ?? null;
    const activeFloorId =
      typeof raw.activeFloorId === "string" || raw.activeFloorId === null
        ? raw.activeFloorId
        : snapshot.settings.uiState?.activeFloorId ?? null;
    const contentCount = countSnapshotContent(snapshot);
    const saveSource = asString(raw.source, "legacy");
    const caller = asString(raw.caller, "unknown");
    logQaEvent(
      storageTarget === "indexeddb" ? "RESTORE_INDEXEDDB_RESULT" : "RESTORE_LOCALSTORAGE_RESULT",
      snapshot,
      {
        caller: "loadBestSnapshot",
        source: storageTarget,
        storageTarget,
        status: contentCount > 0 ? "found" : "empty",
        reason: saveSource,
        note: caller,
        activeObjectId,
        activeFloorId,
      },
    );

    return {
      storageTarget,
      source: saveSource,
      caller,
      snapshot,
      savedAt: Number.isFinite(savedAt) ? savedAt : 0,
      updatedAt: Number.isFinite(updatedAt) ? updatedAt : Number.isFinite(savedAt) ? savedAt : 0,
      activeObjectId,
      activeFloorId,
      contentCount,
    };
  } catch {
    logQaEvent(
      storageTarget === "indexeddb" ? "RESTORE_INDEXEDDB_RESULT" : "RESTORE_LOCALSTORAGE_RESULT",
      null,
      {
        caller: "loadBestSnapshot",
        source: storageTarget,
        storageTarget,
        status: "invalid",
        message: "failed to normalize snapshot",
      },
    );
    return null;
  }
}

function chooseLatestSnapshot(
  primary: SnapshotCandidate | null,
  backup: SnapshotCandidate | null,
): SnapshotCandidate | null {
  const restorable = [primary, backup].filter((candidate): candidate is SnapshotCandidate =>
    Boolean(
      candidate &&
        (candidate.contentCount > 0 || candidate.source === "new-project-confirmed"),
    ),
  );

  if (restorable.length > 0) {
    return restorable.sort((a, b) => b.updatedAt - a.updatedAt || b.savedAt - a.savedAt)[0] ?? null;
  }

  return null;
}

function normalizeSettings(input: unknown): AppSettings {
  const record = asRecord(input);
  const uiState = asRecord(record.uiState);
  return {
    theme:
      record.theme === "light" || record.theme === "dark" ? record.theme : DEFAULT_SETTINGS.theme,
    masterPasswordEncryption:
      record.masterPasswordEncryption === "enabled"
        ? "enabled"
        : DEFAULT_SETTINGS.masterPasswordEncryption,
    roomColorPreset: DEFAULT_SETTINGS.roomColorPreset,
    uiState: {
      viewport: normalizeViewport(uiState.viewport),
      viewportByFloorId: normalizeViewportMap(uiState.viewportByFloorId),
      leftCollapsed: asBoolean(
        uiState.leftCollapsed,
        DEFAULT_SETTINGS.uiState?.leftCollapsed ?? false,
      ),
      rightCollapsed: asBoolean(
        uiState.rightCollapsed,
        DEFAULT_SETTINGS.uiState?.rightCollapsed ?? false,
      ),
      rightPinned: asBoolean(uiState.rightPinned, DEFAULT_SETTINGS.uiState?.rightPinned ?? false),
      showIpLabels: asBoolean(
        uiState.showIpLabels,
        DEFAULT_SETTINGS.uiState?.showIpLabels ?? false,
      ),
      activeObjectId:
        typeof uiState.activeObjectId === "string" || uiState.activeObjectId === null
          ? uiState.activeObjectId
          : undefined,
      activeFloorId:
        typeof uiState.activeFloorId === "string" || uiState.activeFloorId === null
          ? uiState.activeFloorId
          : undefined,
    },
  };
}

function normalizeObject(input: unknown): SiteObject {
  const record = asRecord(input);
  const timestamp = asString(record.createdAt, now());
  return {
    id: asString(record.id, crypto.randomUUID()),
    name: asString(record.name, "Новый объект"),
    description:
      typeof record.description === "string" && record.description ? record.description : undefined,
    createdAt: String(timestamp),
    updatedAt: asString(record.updatedAt, String(timestamp)),
  };
}

function normalizeFloor(input: unknown, index: number): Floor {
  const record = asRecord(input);
  const timestamp = asString(record.createdAt, now());
  return {
    id: asString(record.id, crypto.randomUUID()),
    objectId: asString(record.objectId, ""),
    name: asString(record.name, "Новая зона"),
    sortOrder: asNumber(record.sortOrder, index + 1),
    createdAt: String(timestamp),
    updatedAt: asString(record.updatedAt, String(timestamp)),
  };
}

function normalizeElement(input: unknown): MapElement {
  const record = asRecord(input);
  const timestamp = asString(record.createdAt, now());
  return {
    id: asString(record.id, crypto.randomUUID()),
    floorId: asString(record.floorId, ""),
    type:
      record.type === "wall" || record.type === "door" || record.type === "text"
        ? record.type
        : "room",
    x: asNumber(record.x, 0),
    y: asNumber(record.y, 0),
    width: asNumber(record.width, 0),
    height: asNumber(record.height, 0),
    label: typeof record.label === "string" && record.label ? record.label : undefined,
    color: typeof record.color === "string" && record.color ? record.color : undefined,
    locked: asBoolean(record.locked, false),
    rotation: record.rotation === undefined ? undefined : asNumber(record.rotation, 0),
    createdAt: String(timestamp),
    updatedAt: asString(record.updatedAt, String(timestamp)),
  };
}

function normalizeDeviceType(value: unknown): DeviceType {
  return value === "nvr" || value === "dvr" || value === "switch" || value === "poe_switch"
    ? value
    : "camera";
}

function normalizePoints(value: unknown): CablePoint[] {
  return asArray(value)
    .map((item) => asRecord(item))
    .map((item) => ({
      x: asNumber(item.x, 0),
      y: asNumber(item.y, 0),
    }));
}

function normalizeAnchor(value: unknown): CableAnchor {
  return value === "top" || value === "right" || value === "bottom" || value === "left"
    ? value
    : "center";
}

function normalizeEndpoint(input: unknown, fallbackDeviceId: string, fallbackX = 0, fallbackY = 0) {
  const record = asRecord(input);
  const deviceId = asString(record.deviceId, fallbackDeviceId) || undefined;
  return {
    deviceId,
    anchor: normalizeAnchor(record.anchor),
    x: asNumber(record.x, fallbackX),
    y: asNumber(record.y, fallbackY),
  };
}

function normalizeDevice(input: unknown): Device {
  const record = asRecord(input);
  const timestamp = asString(record.createdAt, now());
  const type = normalizeDeviceType(record.type);
  return {
    id: asString(record.id, crypto.randomUUID()),
    floorId: asString(record.floorId, ""),
    objectId: asString(record.objectId ?? record.siteObjectId, ""),
    type,
    name: asString(record.name, type === "camera" ? "Новая камера" : "Новое устройство"),
    ip: asString(record.ip, ""),
    username: asString(record.username ?? record.login, "admin"),
    password: asString(record.password, ""),
    model: asString(record.model, ""),
    serialNumber: asString(record.serialNumber ?? record.serial, ""),
    location: asString(record.location, ""),
    status: statusMap[asString(record.status, "")] ?? "needs_check",
    notes: asString(record.notes, ""),
    x: asNumber(record.x, 0),
    y: asNumber(record.y, 0),
    rotation: record.rotation === undefined ? undefined : asNumber(record.rotation, 0),
    locked: asBoolean(record.locked, false),
    createdAt: String(timestamp),
    updatedAt: asString(record.updatedAt, String(timestamp)),
    rtspUrl: asString(record.rtspUrl ?? record.rtsp, ""),
    fovAngle: record.fovAngle === undefined ? undefined : asNumber(record.fovAngle, 90),
    fovDistance: record.fovDistance === undefined ? undefined : asNumber(record.fovDistance, 150),
    channelCount:
      record.channelCount === undefined ? undefined : asNumber(record.channelCount, 0) || 0,
    storageCapacityTb:
      record.storageCapacityTb === undefined
        ? undefined
        : asNumber(record.storageCapacityTb, 0) || 0,
    hddCount: record.hddCount === undefined ? undefined : asNumber(record.hddCount, 0) || 0,
    connectedCameraIds: asArray(record.connectedCameraIds).filter(
      (item) => typeof item === "string",
    ),
    portCount: record.portCount === undefined ? undefined : asNumber(record.portCount, 0) || 0,
    poePortCount:
      record.poePortCount === undefined ? undefined : asNumber(record.poePortCount, 0) || 0,
    poeBudgetW: record.poeBudgetW === undefined ? undefined : asNumber(record.poeBudgetW, 0) || 0,
    uplinkPorts:
      record.uplinkPorts === undefined ? undefined : asNumber(record.uplinkPorts, 0) || 0,
    connectedDeviceIds: asArray(record.connectedDeviceIds).filter(
      (item) => typeof item === "string",
    ),
    lastCheckedAt: asString(record.lastCheckedAt ?? record.lastChecked, ""),
    responsiblePerson: asString(record.responsiblePerson ?? record.responsible, ""),
  };
}

function normalizeConnection(input: unknown): DeviceConnection {
  const record = asRecord(input);
  const timestamp = asString(record.createdAt, now());
  const fromRecord = asRecord(record.from);
  const toRecord = asRecord(record.to);
  const fromDeviceId = asString(record.fromDeviceId ?? fromRecord.deviceId, "");
  const toDeviceId = asString(record.toDeviceId ?? toRecord.deviceId, "");
  const points = normalizePoints(record.points);
  return {
    id: asString(record.id, crypto.randomUUID()),
    objectId: asString(record.objectId, ""),
    floorId: asString(record.floorId, ""),
    type:
      cableTypeMap[asString(record.type ?? record.cableType ?? record.connectionType, "")] ?? "utp",
    from: normalizeEndpoint(
      fromRecord,
      fromDeviceId,
      asNumber(fromRecord.x, 0),
      asNumber(fromRecord.y, 0),
    ),
    to: normalizeEndpoint(toRecord, toDeviceId, asNumber(toRecord.x, 0), asNumber(toRecord.y, 0)),
    points,
    label: typeof record.label === "string" && record.label ? record.label : undefined,
    notes: typeof record.notes === "string" && record.notes ? record.notes : undefined,
    color: typeof record.color === "string" && record.color ? record.color : undefined,
    locked: asBoolean(record.locked, false),
    createdAt: String(timestamp),
    updatedAt: asString(record.updatedAt, String(timestamp)),
  };
}

export function normalizeAppData(input: unknown): AppData {
  const record = asRecord(input);
  const rawObjects = asArray(record.objects);
  const rawFloors = asArray(record.floors);
  const rawElements = asArray(record.mapElements ?? record.elements);
  const rawDevices = asArray(record.devices ?? record.cameras);
  const rawConnections = asArray(
    record.deviceConnections ?? record.deviceCables ?? record.connections,
  );

  const objects = rawObjects.map((item) => normalizeObject(item));
  const floors = rawFloors.map((item, index) => normalizeFloor(item, index));
  const floorById = new Map(floors.map((floor) => [floor.id, floor]));
  const objectById = new Map(objects.map((object) => [object.id, object]));

  const mapElements = rawElements.map((item) => normalizeElement(item));
  const devices = rawDevices.map((item) => {
    const device = normalizeDevice(item);
    if (!device.objectId) {
      device.objectId = floorById.get(device.floorId)?.objectId ?? "";
    }
    if (!device.objectId && objectById.size > 0) {
      device.objectId = objects[0].id;
    }
    return device;
  });
  const deviceConnections = rawConnections.map((item) => normalizeConnection(item));

  return {
    objects,
    floors,
    mapElements,
    devices,
    deviceConnections,
    settings: normalizeSettings(record.settings),
  };
}

export async function loadBestSnapshot(): Promise<SnapshotCandidate | null> {
  logQaEvent("RESTORE_START", null, {
    caller: "loadBestSnapshot",
    source: "restore",
    storageTarget: "both",
    status: "start",
    reason: "startup restore",
  });

  try {
    const indexeddbRaw = await readRaw();
    const indexeddb = toPersistedCandidate("indexeddb", indexeddbRaw);
    const localstorageRaw = readBackupRaw();
    const localstorage = toPersistedCandidate("localstorage", localstorageRaw);
    const latest = chooseLatestSnapshot(indexeddb, localstorage);

    logQaEvent(
      "RESTORE_SELECTED_SOURCE",
      latest?.snapshot ?? null,
      {
        caller: "loadBestSnapshot",
        source: latest?.storageTarget ?? "none",
        storageTarget: latest?.storageTarget ?? "none",
        status: latest ? "selected" : "none",
        reason: latest?.source ?? "none",
        note: latest?.caller ?? "unknown",
        activeObjectId: latest?.activeObjectId ?? null,
        activeFloorId: latest?.activeFloorId ?? null,
      },
    );

    return latest;
  } catch (error) {
    logQaEvent("RESTORE_SELECTED_SOURCE", null, {
      caller: "loadBestSnapshot",
      source: "none",
      storageTarget: "none",
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function loadAppData(): Promise<AppData | null> {
  const latest = await loadBestSnapshot();
  return latest?.snapshot ?? null;
}

export async function saveSnapshot(
  data: AppData,
  source: string,
  metadata?: {
    reason?: string;
    caller?: string;
    activeObjectId?: string | null;
    activeFloorId?: string | null;
  },
): Promise<void> {
  const now = Date.now();
  const normalized = normalizeAppData(clone(data));
  const reason = metadata?.reason ?? source;
  const caller = metadata?.caller ?? "unknown";
  const uiState = {
    ...(normalized.settings.uiState ?? {}),
    activeObjectId:
      metadata?.activeObjectId ?? normalized.settings.uiState?.activeObjectId ?? null,
    activeFloorId:
      metadata?.activeFloorId ?? normalized.settings.uiState?.activeFloorId ?? null,
  };
  const payload: AppData = {
    ...clone(normalized),
    settings: {
      ...clone(normalized.settings),
      uiState,
    },
  };

  logQaEvent("SAVE_SNAPSHOT_ATTEMPT", payload, {
    caller,
    source,
    reason,
    storageTarget: "both",
    status: "attempt",
    activeObjectId: uiState.activeObjectId ?? null,
    activeFloorId: uiState.activeFloorId ?? null,
  });

  if (isEmptySnapshot(payload) && source !== "new-project-confirmed") {
    logQaEvent("SAVE_SNAPSHOT_SKIPPED", payload, {
      caller,
      source,
      reason,
      storageTarget: "none",
      status: "empty-blocked",
      activeObjectId: uiState.activeObjectId ?? null,
      activeFloorId: uiState.activeFloorId ?? null,
    });
    return;
  }

  const snapshot: PersistedSnapshot = {
    data: payload,
    savedAt: now,
    updatedAt: now,
    activeObjectId: uiState.activeObjectId ?? null,
    activeFloorId: uiState.activeFloorId ?? null,
    source,
    caller,
  };

  const backupOk = writeBackupRaw(snapshot);
  const dbOk = await writeRaw(snapshot);

  const normalizedEventSource =
    source === "import-project"
      ? "IMPORT"
      : source === "autosave"
        ? "AUTOSAVE"
        : source === "new-project-confirmed"
          ? "NEW_PROJECT"
          : source === "restore"
            ? "RESTORE"
            : source === "exit"
              ? "EXIT"
              : "PERSIST";

  logQaEvent(`${normalizedEventSource}_PERSISTED_LOCALSTORAGE`, payload, {
    caller,
    source,
    reason,
    storageTarget: "localstorage",
    status: backupOk ? "ok" : "error",
    activeObjectId: uiState.activeObjectId ?? null,
    activeFloorId: uiState.activeFloorId ?? null,
  });
  logQaEvent(`${normalizedEventSource}_PERSISTED_INDEXEDDB`, payload, {
    caller,
    source,
    reason,
    storageTarget: "indexeddb",
    status: dbOk ? "ok" : "error",
    activeObjectId: uiState.activeObjectId ?? null,
    activeFloorId: uiState.activeFloorId ?? null,
  });

  logQaEvent("PERSIST_AFTER", payload, {
    caller,
    source,
    reason,
    storageTarget: "both",
    status: dbOk && backupOk ? "ok" : "partial",
    activeObjectId: uiState.activeObjectId ?? null,
    activeFloorId: uiState.activeFloorId ?? null,
  });
}

export async function saveAppData(
  data: AppData,
  metadata?: {
    reason?: string;
    caller?: string;
    activeObjectId?: string | null;
    activeFloorId?: string | null;
  },
): Promise<void> {
  await saveSnapshot(data, metadata?.reason ?? "autosave", metadata);
}
