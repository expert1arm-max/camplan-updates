import type {
  AppData,
  AppSettings,
  Device,
  DeviceConnection,
  DeviceStatus,
  DeviceType,
  Floor,
  MapElement,
  SiteObject,
} from "@/types";

const DB_NAME = "camplan-local";
const DB_VERSION = 2;
const STORE_NAME = "app-data";
const STORAGE_KEY = "current";

const DEFAULT_SETTINGS: AppData["settings"] = {
  theme: "system",
  masterPasswordEncryption: "todo",
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

type UnknownRecord = Record<string, unknown>;

function now() {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
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

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function writeRaw(value: unknown): Promise<void> {
  const db = await openDb();
  if (!db) return;

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(value, STORAGE_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

function normalizeSettings(input: unknown): AppSettings {
  const record = asRecord(input);
  return {
    theme:
      record.theme === "light" || record.theme === "dark" ? record.theme : DEFAULT_SETTINGS.theme,
    masterPasswordEncryption:
      record.masterPasswordEncryption === "enabled"
        ? "enabled"
        : DEFAULT_SETTINGS.masterPasswordEncryption,
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
    connectedCameraIds: asArray(record.connectedCameraIds).filter((item) => typeof item === "string"),
    portCount: record.portCount === undefined ? undefined : asNumber(record.portCount, 0) || 0,
    poePortCount:
      record.poePortCount === undefined ? undefined : asNumber(record.poePortCount, 0) || 0,
    poeBudgetW: record.poeBudgetW === undefined ? undefined : asNumber(record.poeBudgetW, 0) || 0,
    uplinkPorts: record.uplinkPorts === undefined ? undefined : asNumber(record.uplinkPorts, 0) || 0,
    connectedDeviceIds: asArray(record.connectedDeviceIds).filter((item) => typeof item === "string"),
    lastCheckedAt: asString(record.lastCheckedAt ?? record.lastChecked, ""),
    responsiblePerson: asString(record.responsiblePerson ?? record.responsible, ""),
  };
}

function normalizeConnection(input: unknown): DeviceConnection {
  const record = asRecord(input);
  const timestamp = asString(record.createdAt, now());
  return {
    id: asString(record.id, crypto.randomUUID()),
    fromDeviceId: asString(record.fromDeviceId, ""),
    toDeviceId: asString(record.toDeviceId, ""),
    connectionType:
      record.connectionType === "poe" ||
      record.connectionType === "video" ||
      record.connectionType === "uplink"
        ? record.connectionType
        : "network",
    label: typeof record.label === "string" && record.label ? record.label : undefined,
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
  const rawConnections = asArray(record.deviceConnections ?? record.connections);

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

export async function loadAppData(): Promise<AppData | null> {
  try {
    const raw = await readRaw();
    if (!raw) return null;
    return normalizeAppData(raw);
  } catch {
    return null;
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  const snapshot = clone(data);
  await writeRaw(snapshot);
}
