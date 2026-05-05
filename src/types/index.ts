export type DeviceStatus = "working" | "offline" | "needs_check" | "reserve" | "no_access";

export type CameraStatus = DeviceStatus;

export type DeviceType = "camera" | "nvr" | "dvr" | "switch" | "poe_switch";

export type CableType = "utp" | "ftp" | "coaxial" | "power";

export type CableAnchor = "top" | "right" | "bottom" | "left" | "center";

export interface CablePoint {
  x: number;
  y: number;
}

export interface CableEndpoint {
  deviceId?: string;
  anchor?: CableAnchor;
  x: number;
  y: number;
}

export interface DeviceConnection {
  id: string;
  objectId: string;
  floorId: string;
  type: CableType;
  from: CableEndpoint;
  to: CableEndpoint;
  points: CablePoint[];
  color?: string;
  locked?: boolean;
  label?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  id: string;
  objectId: string;
  floorId: string;
  type: DeviceType;
  name: string;
  ip?: string;
  username?: string;
  password?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
  status: DeviceStatus;
  notes?: string;
  x: number;
  y: number;
  rotation?: number;
  locked?: boolean;
  createdAt: string;
  updatedAt: string;

  rtspUrl?: string;
  fovAngle?: number;
  fovDistance?: number;

  channelCount?: number;
  storageCapacityTb?: number;
  hddCount?: number;
  connectedCameraIds?: string[];

  portCount?: number;
  poePortCount?: number;
  poeBudgetW?: number;
  uplinkPorts?: number;
  connectedDeviceIds?: string[];

  lastCheckedAt?: string;
  responsiblePerson?: string;
}

export type Camera = Device & { type: "camera" };

export type ElementType = "room" | "wall" | "door" | "text";

export interface MapElement {
  id: string;
  floorId: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  color?: string;
  locked?: boolean;
  rotation?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Floor {
  id: string;
  objectId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SiteObject {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  theme: "system" | "light" | "dark";
  masterPasswordEncryption: "todo" | "enabled";
}

export interface AppData {
  objects: SiteObject[];
  floors: Floor[];
  mapElements: MapElement[];
  devices: Device[];
  deviceConnections: DeviceConnection[];
  settings: AppSettings;
}

export type EditorMode =
  | "select"
  | "room"
  | "wall"
  | "door"
  | "text"
  | "camera"
  | "nvr"
  | "dvr"
  | "switch"
  | "poe_switch"
  | "connector"
  | "delete";
