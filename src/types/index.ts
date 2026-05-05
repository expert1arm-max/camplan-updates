export type CameraStatus = "working" | "offline" | "needs_check" | "reserve" | "no_access";

export interface Camera {
  id: string;
  floorId: string;
  objectId: string;
  name: string;
  ip: string;
  username: string;
  password: string;
  rtspUrl: string;
  model: string;
  serialNumber: string;
  location: string;
  status: CameraStatus;
  notes: string;
  lastCheckedAt: string;
  responsiblePerson: string;
  x: number;
  y: number;
  rotation: number; // degrees
  fovAngle: number; // angle degrees
  fovDistance: number; // pixels
  createdAt: string;
  updatedAt: string;
}

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
  cameras: Camera[];
  settings: AppSettings;
}

export type EditorMode = "select" | "room" | "wall" | "door" | "text" | "camera" | "delete";
