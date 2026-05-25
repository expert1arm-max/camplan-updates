import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type WheelEvent } from "react";
import { Plus } from "lucide-react";
import { deviceTypeLabels, statusColors, useStore } from "@/data/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  CableAnchor,
  CablePoint,
  CableType,
  Device,
  DeviceConnection,
  DeviceType,
  MapElement,
} from "@/types";
import { DEFAULT_TEXT_FONT_SIZE, getTextElementBounds } from "@/utils/text-element";

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface FitBoundsItem {
  type: string;
  id: string;
  floorId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FitDebugInfo {
  layoutMode: "contained" | "overlay";
  canvasLeft: number;
  canvasWidth: number;
  canvasHeight: number;
  leftPanelWidth: number;
  rightPanelWidth: number;
  leftOverlap: number;
  rightOverlap: number;
  visibleLeft: number;
  visibleWidth: number;
  visibleHeight: number;
  boundsWidth: number;
  boundsHeight: number;
  scale: number;
  viewBoxX: number;
  viewBoxY: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isFiniteRect(rect: { x: number; y: number; width: number; height: number }) {
  return (
    isFiniteNumber(rect.x) &&
    isFiniteNumber(rect.y) &&
    isFiniteNumber(rect.width) &&
    isFiniteNumber(rect.height) &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function isFinitePoint(point: { x: number; y: number }) {
  return isFiniteNumber(point.x) && isFiniteNumber(point.y);
}

const BASE_W = 1400;
const BASE_H = 900;
const GRID_SIZE = 20;
const DEVICE_SNAP_DISTANCE = 24;
const PLAN_STRUCTURE_SNAP_DISTANCE = 22;

const deviceSizes: Record<DeviceType, { width: number; height: number }> = {
  camera: { width: 24, height: 24 },
  nvr: { width: 64, height: 36 },
  dvr: { width: 64, height: 36 },
  switch: { width: 72, height: 30 },
  poe_switch: { width: 72, height: 30 },
};

const cableLabels: Record<CableType, string> = {
  utp: "UTP",
  ftp: "FTP",
  coaxial: "Coaxial",
  power: "Power",
};

const cableStyles: Record<CableType, { stroke: string; dash?: string; width: number }> = {
  utp: { stroke: "#334155", dash: "6 3", width: 2 },
  ftp: { stroke: "#1d4ed8", dash: "6 3", width: 2 },
  coaxial: { stroke: "#6b21a8", dash: "6 3", width: 3.5 },
  power: { stroke: "#b45309", dash: "2 2", width: 3 },
};

const DEFAULT_ELEMENT_COLOR = "#64748b";
const DEFAULT_TEXT_COLOR = "#111827";
const DEFAULT_WALL_COLOR = "#000000";
const DEFAULT_DOOR_COLOR = "#a16207";

type DraftCable = {
  type: CableType;
  start: { deviceId?: string; anchor: CableAnchor; x: number; y: number };
  points: CablePoint[];
  cursor: { x: number; y: number };
  hoverDeviceId?: string;
};

type CableHandleSelection = { connectionId: string; kind: "point"; index: number } | null;

type CableSegmentHover = {
  connectionId: string;
  index: number;
} | null;

type DoorPlacement = {
  x: number;
  y: number;
  width: number;
  height: number;
  doorAxis: "horizontal" | "vertical";
  doorSide: "top" | "right" | "bottom" | "left";
  rotation?: number;
};

type TextDraft = {
  id: string;
  x: number;
  y: number;
  value: string;
};

function snapGrid(value: number) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getDeviceRect(device: Device) {
  if (device.type === "camera") {
    return { x: device.x - 12, y: device.y - 12, width: 24, height: 24 };
  }
  const size = deviceSizes[device.type];
  return {
    x: device.x - size.width / 2,
    y: device.y - size.height / 2,
    width: size.width,
    height: size.height,
  };
}

function getAnchors(device: Device) {
  const rect = getDeviceRect(device);
  return {
    center: { x: device.x, y: device.y, anchor: "center" as const },
    top: { x: rect.x + rect.width / 2, y: rect.y, anchor: "top" as const },
    right: { x: rect.x + rect.width, y: rect.y + rect.height / 2, anchor: "right" as const },
    bottom: { x: rect.x + rect.width / 2, y: rect.y + rect.height, anchor: "bottom" as const },
    left: { x: rect.x, y: rect.y + rect.height / 2, anchor: "left" as const },
  };
}

function getNearestAnchor(device: Device, point: { x: number; y: number }) {
  const anchors = Object.values(getAnchors(device));
  let nearest = anchors[0];
  let nearestDistance = distance(point, nearest);
  for (const anchor of anchors.slice(1)) {
    const d = distance(point, anchor);
    if (d < nearestDistance) {
      nearest = anchor;
      nearestDistance = d;
    }
  }
  return { ...nearest, distance: nearestDistance };
}

function buildCablePath(
  start: { x: number; y: number },
  points: CablePoint[],
  end: { x: number; y: number },
) {
  const segments = [`M ${start.x} ${start.y}`];
  for (const point of points) {
    segments.push(`L ${point.x} ${point.y}`);
  }
  segments.push(`L ${end.x} ${end.y}`);
  return segments.join(" ");
}

function getPolylineLabelPlacement(points: { x: number; y: number }[], fraction = 0.25) {
  if (points.length === 0) {
    return { x: 0, y: 0, angle: 0 };
  }
  if (points.length === 1) {
    return { x: points[0].x, y: points[0].y, angle: 0 };
  }

  const segments = points.slice(1).map((point, index) => {
    const start = points[index];
    const dx = point.x - start.x;
    const dy = point.y - start.y;
    const length = Math.hypot(dx, dy);
    return { start, end: point, dx, dy, length };
  });
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  if (totalLength === 0) {
    return { x: points[0].x, y: points[0].y, angle: 0 };
  }

  const target = totalLength * fraction;
  let traveled = 0;
  for (const segment of segments) {
    if (traveled + segment.length >= target) {
      const localT = segment.length === 0 ? 0 : (target - traveled) / segment.length;
      const x = segment.start.x + segment.dx * localT;
      const y = segment.start.y + segment.dy * localT;
      const rawAngle = (Math.atan2(segment.dy, segment.dx) * 180) / Math.PI;
      const angle = rawAngle > 90 || rawAngle < -90 ? rawAngle + 180 : rawAngle;
      return { x, y, angle };
    }
    traveled += segment.length;
  }

  const last = segments[segments.length - 1];
  const rawAngle = (Math.atan2(last.dy, last.dx) * 180) / Math.PI;
  const angle = rawAngle > 90 || rawAngle < -90 ? rawAngle + 180 : rawAngle;
  return { x: last.end.x, y: last.end.y, angle };
}

function resolveConnectionEndpoints(connection: DeviceConnection, devices: Device[]) {
  const resolve = (endpoint: DeviceConnection["from"] | DeviceConnection["to"]) => {
    const device = endpoint.deviceId ? devices.find((item) => item.id === endpoint.deviceId) : null;
    if (!device) return { x: endpoint.x, y: endpoint.y };
    if (device.type === "camera") return { x: device.x, y: device.y };
    const size =
      device.type === "nvr" || device.type === "dvr"
        ? { width: 64, height: 36 }
        : { width: 72, height: 30 };
    const halfW = size.width / 2;
    const halfH = size.height / 2;
    switch (endpoint.anchor) {
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
  };

  const start = resolve(connection.from);
  const end = resolve(connection.to);
  return { start, end };
}

function projectPointOnSegment(
  point: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return { x: a.x, y: a.y, distance: Math.hypot(point.x - a.x, point.y - a.y) };
  }
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq));
  const x = a.x + t * dx;
  const y = a.y + t * dy;
  return { x, y, distance: Math.hypot(point.x - x, point.y - y) };
}

function isLockedObject(locked?: boolean) {
  return Boolean(locked);
}

function getDirectionConstrainedPoint(
  from: { x: number; y: number },
  raw: { x: number; y: number },
  lockedAxis?: "horizontal" | "vertical" | "diagonal",
) {
  const snapped = { x: snapGrid(raw.x), y: snapGrid(raw.y) };
  const dx = snapped.x - from.x;
  const dy = snapped.y - from.y;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (absX === 0 && absY === 0) return { x: from.x, y: from.y };
  if (lockedAxis === "horizontal") return { x: snapped.x, y: from.y };
  if (lockedAxis === "vertical") return { x: from.x, y: snapped.y };
  if (lockedAxis === "diagonal") {
    const step = Math.max(absX, absY);
    const signX = dx >= 0 ? 1 : -1;
    const signY = dy >= 0 ? 1 : -1;
    return {
      x: snapGrid(from.x + signX * step),
      y: snapGrid(from.y + signY * step),
    };
  }
  if (absX >= absY * 2) return { x: snapped.x, y: from.y };
  if (absY >= absX * 2) return { x: from.x, y: snapped.y };

  const step = Math.max(absX, absY);
  const signX = dx >= 0 ? 1 : -1;
  const signY = dy >= 0 ? 1 : -1;
  return {
    x: snapGrid(from.x + signX * step),
    y: snapGrid(from.y + signY * step),
  };
}

function getConnectionStroke(connection: DeviceConnection) {
  return connection.color ?? cableStyles[connection.type].stroke;
}

function getElementStroke(element: MapElement) {
  if (element.type === "door") return element.color ?? DEFAULT_DOOR_COLOR;
  if (element.type === "room" || element.type === "wall")
    return element.color ?? DEFAULT_WALL_COLOR;
  return element.color ?? DEFAULT_ELEMENT_COLOR;
}

function getElementStrokeWidth(element: MapElement) {
  return element.strokeWidth && element.strokeWidth > 0 ? element.strokeWidth : 2;
}

function getDoorAxis(element: Pick<MapElement, "width" | "height" | "doorAxis">) {
  return element.doorAxis ?? (element.width >= element.height ? "horizontal" : "vertical");
}

function getDoorSide(element: Pick<MapElement, "width" | "height" | "doorAxis" | "doorSide">) {
  return element.doorSide ?? (getDoorAxis(element) === "horizontal" ? "bottom" : "right");
}

function getDoorPath(
  element: Pick<MapElement, "x" | "y" | "width" | "height" | "doorAxis" | "doorSide">,
) {
  const axis = getDoorAxis(element);
  const side = getDoorSide(element);

  if (axis === "horizontal") {
    const y = element.y + element.height / 2;
    const x1 = element.x + 6;
    const x2 = element.x + element.width - 6;
    const cx = (x1 + x2) / 2;
    const offset = Math.max(12, element.height * 0.8);
    const ctrlY = y + (side === "top" ? -offset : offset);
    return `M ${x1} ${y} Q ${cx} ${ctrlY} ${x2} ${y}`;
  }

  const x = element.x + element.width / 2;
  const y1 = element.y + 6;
  const y2 = element.y + element.height - 6;
  const cy = (y1 + y2) / 2;
  const offset = Math.max(12, element.width * 0.8);
  const ctrlX = x + (side === "left" ? -offset : offset);
  return `M ${x} ${y1} Q ${ctrlX} ${cy} ${x} ${y2}`;
}

function getDoorRotationTransform(
  element: Pick<MapElement, "x" | "y" | "width" | "height" | "rotation">,
) {
  const rotation = element.rotation ?? 0;
  if (!rotation) return undefined;
  return `rotate(${rotation} ${element.x + element.width / 2} ${element.y + element.height / 2})`;
}

function getWallEndpoints(element: Pick<MapElement, "x" | "y" | "width" | "height">) {
  return {
    start: { x: element.x, y: element.y },
    end: { x: element.x + element.width, y: element.y + element.height },
  };
}

function getRoomEdges(element: Pick<MapElement, "x" | "y" | "width" | "height">): Array<
  [start: { x: number; y: number }, end: { x: number; y: number }]
> {
  return [
    [
      { x: element.x, y: element.y },
      { x: element.x + element.width, y: element.y },
    ],
    [
      { x: element.x + element.width, y: element.y },
      { x: element.x + element.width, y: element.y + element.height },
    ],
    [
      { x: element.x, y: element.y + element.height },
      { x: element.x + element.width, y: element.y + element.height },
    ],
    [
      { x: element.x, y: element.y },
      { x: element.x, y: element.y + element.height },
    ],
  ];
}

function getPlanStructureSegments(elements: MapElement[], excludeId?: string) {
  const segments: Array<[
    start: { x: number; y: number },
    end: { x: number; y: number },
  ]> = [];

  for (const element of elements) {
    if (element.id === excludeId) continue;
    if (element.type === "wall") {
      const { start, end } = getWallEndpoints(element);
      segments.push([start, end]);
      continue;
    }
    if (element.type === "room") {
      segments.push(...getRoomEdges(element));
    }
  }

  return segments;
}

function snapToPlanStructure(
  point: { x: number; y: number },
  elements: MapElement[],
  excludeId?: string,
) {
  let snapped = point;
  let snappedToStructure = false;
  let bestDistance = PLAN_STRUCTURE_SNAP_DISTANCE;

  const consider = (candidate: { x: number; y: number; distance: number }) => {
    if (candidate.distance <= bestDistance) {
      snapped = { x: candidate.x, y: candidate.y };
      snappedToStructure = true;
      bestDistance = candidate.distance;
    }
  };

  for (const [start, end] of getPlanStructureSegments(elements, excludeId)) {
    consider({ ...start, distance: distance(point, start) });
    consider({ ...end, distance: distance(point, end) });
    consider(projectPointOnSegment(point, start, end));
  }

  return { point: snapped, snapped: snappedToStructure };
}

function getWallAxisSegmentIntersection(
  fixed: { x: number; y: number },
  direction: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const sx = end.x - start.x;
  const sy = end.y - start.y;
  const denominator = direction.x * sy - direction.y * sx;
  if (Math.abs(denominator) < 0.0001) return null;

  const dx = start.x - fixed.x;
  const dy = start.y - fixed.y;
  const t = (dx * sy - dy * sx) / denominator;
  const u = (dx * direction.y - dy * direction.x) / denominator;
  if (t < 20 || u < 0 || u > 1) return null;
  return {
    x: fixed.x + direction.x * t,
    y: fixed.y + direction.y * t,
  };
}

function getWallEndpointStructureSnap(
  endpointPoint: { x: number; y: number },
  fixed: { x: number; y: number },
  direction: { x: number; y: number },
  elements: MapElement[],
  excludeId: string,
) {
  let snapped: { x: number; y: number } | null = null;
  let bestDistance = PLAN_STRUCTURE_SNAP_DISTANCE;

  for (const [start, end] of getPlanStructureSegments(elements, excludeId)) {
    const intersection = getWallAxisSegmentIntersection(fixed, direction, start, end);
    if (!intersection) continue;
    const snapDistance = distance(endpointPoint, intersection);
    if (snapDistance <= bestDistance) {
      snapped = intersection;
      bestDistance = snapDistance;
    }
  }

  return snapped;
}

function getCurvedWallControlPoint(
  element: Pick<MapElement, "x" | "y" | "width" | "height" | "curveOffset">,
) {
  const { start, end } = getWallEndpoints(element);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const offset = element.curveOffset ?? length / 2;
  return {
    x: (start.x + end.x) / 2 + (-dy / length) * offset,
    y: (start.y + end.y) / 2 + (dx / length) * offset,
  };
}

function getWallPath(element: MapElement) {
  const { start, end } = getWallEndpoints(element);
  if (element.wallShape === "arc") {
    const control = getCurvedWallControlPoint(element);
    return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
  }
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
}

function getDoorPlacementFromPoint(
  point: { x: number; y: number },
  elements: MapElement[],
): DoorPlacement | null {
  const threshold = 10;
  const length = 40;
  const thickness = 24;

  let bestDistance = Infinity;
  let bestPlacement: DoorPlacement | null = null;

  const consider = (
    projected: { x: number; y: number; distance: number },
    axis: "horizontal" | "vertical",
    side: "top" | "right" | "bottom" | "left",
    rotation = 0,
  ) => {
    if (projected.distance > threshold) return;
    const placement: DoorPlacement =
      axis === "horizontal"
        ? {
            x: projected.x - length / 2,
            y: projected.y - thickness / 2,
            width: length,
            height: thickness,
            doorAxis: axis,
            doorSide: side,
            rotation,
          }
        : {
            x: projected.x - thickness / 2,
            y: projected.y - length / 2,
            width: thickness,
            height: length,
            doorAxis: axis,
            doorSide: side,
            rotation,
          };
    if (projected.distance < bestDistance) {
      bestDistance = projected.distance;
      bestPlacement = placement;
    }
  };

  for (const element of elements) {
    if (element.type === "wall") {
      const a = { x: element.x, y: element.y };
      const b = { x: element.x + element.width, y: element.y + element.height };
      const projected = projectPointOnSegment(point, a, b);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const side = dx * (point.y - a.y) - dy * (point.x - a.x) < 0 ? "top" : "bottom";
      consider(projected, "horizontal", side, angle);
      continue;
    }

    if (element.type !== "room") continue;
    const edges: Array<
      [a: { x: number; y: number }, b: { x: number; y: number }, axis: "horizontal" | "vertical"]
    > = [
      [
        { x: element.x, y: element.y },
        { x: element.x + element.width, y: element.y },
        "horizontal",
      ],
      [
        { x: element.x + element.width, y: element.y },
        { x: element.x + element.width, y: element.y + element.height },
        "vertical",
      ],
      [
        { x: element.x, y: element.y + element.height },
        { x: element.x + element.width, y: element.y + element.height },
        "horizontal",
      ],
      [{ x: element.x, y: element.y }, { x: element.x, y: element.y + element.height }, "vertical"],
    ];

    for (const [a, b, axis] of edges) {
      const projected = projectPointOnSegment(point, a, b);
      const side =
        axis === "horizontal"
          ? point.y < projected.y
            ? "top"
            : "bottom"
          : point.x < projected.x
            ? "left"
            : "right";
      consider(projected, axis, side);
    }
  }

  return bestPlacement;
}

function rectsIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return (
    a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y
  );
}

function pointInRect(
  point: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number },
) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function orientation(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
) {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (Math.abs(value) < 1e-9) return 0;
  return value > 0 ? 1 : 2;
}

function onSegment(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
) {
  return (
    b.x <= Math.max(a.x, c.x) &&
    b.x >= Math.min(a.x, c.x) &&
    b.y <= Math.max(a.y, c.y) &&
    b.y >= Math.min(a.y, c.y)
  );
}

function segmentsIntersect(
  p1: { x: number; y: number },
  q1: { x: number; y: number },
  p2: { x: number; y: number },
  q2: { x: number; y: number },
) {
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;
  return false;
}

function rectIntersectsSegment(
  rect: { x: number; y: number; width: number; height: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;

  if (pointInRect(a, rect) || pointInRect(b, rect)) return true;

  return (
    segmentsIntersect(a, b, { x: left, y: top }, { x: right, y: top }) ||
    segmentsIntersect(a, b, { x: right, y: top }, { x: right, y: bottom }) ||
    segmentsIntersect(a, b, { x: right, y: bottom }, { x: left, y: bottom }) ||
    segmentsIntersect(a, b, { x: left, y: bottom }, { x: left, y: top })
  );
}

function inflateRect(
  rect: { x: number; y: number; width: number; height: number },
  padding: number,
) {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

function getPolylineBounds(points: { x: number; y: number }[], padding = 0) {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  let left = points[0].x;
  let top = points[0].y;
  let right = points[0].x;
  let bottom = points[0].y;
  for (const point of points.slice(1)) {
    left = Math.min(left, point.x);
    top = Math.min(top, point.y);
    right = Math.max(right, point.x);
    bottom = Math.max(bottom, point.y);
  }
  return {
    x: left - padding,
    y: top - padding,
    width: right - left + padding * 2,
    height: bottom - top + padding * 2,
  };
}

function polylineIntersectsRect(
  rect: { x: number; y: number; width: number; height: number },
  points: { x: number; y: number }[],
  padding = 8,
) {
  const padded = inflateRect(rect, padding);
  if (points.some((point) => pointInRect(point, padded))) return true;
  return points
    .slice(1)
    .some((point, index) => rectIntersectsSegment(padded, points[index], point));
}

function getSegmentBounds(
  a: { x: number; y: number },
  b: { x: number; y: number },
  padding: number,
) {
  return {
    x: Math.min(a.x, b.x) - padding,
    y: Math.min(a.y, b.y) - padding,
    width: Math.abs(a.x - b.x) + padding * 2,
    height: Math.abs(a.y - b.y) + padding * 2,
  };
}

function cableSelectionHit(
  selectionRect: { x: number; y: number; width: number; height: number },
  connection: DeviceConnection,
  points: { x: number; y: number }[],
) {
  const linePadding = Math.max(14, cableStyles[connection.type].width * 4);
  const bounds = getPolylineBounds(points, linePadding);
  const paddedSelection = inflateRect(selectionRect, 2);
  return (
    rectsIntersect(selectionRect, bounds) ||
    points.some((point) => pointInRect(point, paddedSelection)) ||
    points
      .slice(1)
      .some((point, index) =>
        rectsIntersect(paddedSelection, getSegmentBounds(points[index], point, linePadding)),
      )
  );
}

function normalizeRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

function expandBounds(
  bounds: { x: number; y: number; width: number; height: number } | null,
  rect: { x: number; y: number; width: number; height: number },
) {
  if (!bounds) return { ...rect };
  const x1 = Math.min(bounds.x, rect.x);
  const y1 = Math.min(bounds.y, rect.y);
  const x2 = Math.max(bounds.x + bounds.width, rect.x + rect.width);
  const y2 = Math.max(bounds.y + bounds.height, rect.y + rect.height);
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

function getViewportFitBounds(
  elements: MapElement[],
  devices: Device[],
  connections: DeviceConnection[],
) {
  const boundsItems: FitBoundsItem[] = [];
  let bounds: { x: number; y: number; width: number; height: number } | null = null;

  for (const element of elements) {
    const rect = getElementHitBox(element);
    if (!isFiniteRect(rect)) continue;
    const item = {
      type: element.type,
      id: element.id,
      floorId: element.floorId,
      ...rect,
    };
    boundsItems.push(item);
    bounds = expandBounds(bounds, rect);
  }

  for (const device of devices) {
    const rect = getDeviceHitBox(device);
    if (!isFiniteRect(rect)) continue;
    const item = {
      type: device.type,
      id: device.id,
      floorId: device.floorId,
      ...rect,
    };
    boundsItems.push(item);
    bounds = expandBounds(bounds, rect);
  }

  for (const connection of connections) {
    const points = getResolvedConnectionPathPoints(connection, devices).filter(isFinitePoint);
    if (points.length < 2) continue;
    const rect = getPolylineBounds(points, 4);
    if (!isFiniteRect(rect)) continue;
    const item = {
      type: connection.type,
      id: connection.id,
      floorId: connection.floorId,
      ...rect,
    };
    boundsItems.push(item);
    bounds = expandBounds(bounds, rect);
  }

  return { bounds, boundsItems };
}

function getStructureFitBounds(elements: MapElement[]) {
  let bounds: { x: number; y: number; width: number; height: number } | null = null;

  for (const element of elements) {
    if (element.type !== "room" && element.type !== "wall" && element.type !== "door") continue;
    bounds = expandBounds(bounds, getElementHitBox(element));
  }

  return bounds;
}

function fitBoundsToViewport(
  bounds: { x: number; y: number; width: number; height: number },
  viewportMetrics: {
    canvasLeft: number;
    canvasWidth: number;
    canvasHeight: number;
    leftPanelWidth: number;
    rightPanelWidth: number;
    leftOverlap: number;
    rightOverlap: number;
    visibleLeft: number;
    visibleTop: number;
    visibleWidth: number;
    visibleHeight: number;
  },
) {
  const boundsPadding = 12;
  const padding = 32;
  const paddedBounds = {
    x: bounds.x - boundsPadding,
    y: bounds.y - boundsPadding,
    width: Math.max(1, bounds.width + boundsPadding * 2),
    height: Math.max(1, bounds.height + boundsPadding * 2),
  };
  const usableWidth = Math.max(1, viewportMetrics.visibleWidth - padding * 2);
  const usableHeight = Math.max(1, viewportMetrics.visibleHeight - padding * 2);
  const scale = Math.min(usableWidth / paddedBounds.width, usableHeight / paddedBounds.height);
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const viewBoxWidth = viewportMetrics.canvasWidth / safeScale;
  const viewBoxHeight = viewportMetrics.canvasHeight / safeScale;
  const visibleCenterScreenX = viewportMetrics.visibleLeft + viewportMetrics.visibleWidth / 2;
  const visibleCenterScreenY = viewportMetrics.visibleTop + viewportMetrics.visibleHeight / 2;
  const worldCenterX = paddedBounds.x + paddedBounds.width / 2;
  const worldCenterY = paddedBounds.y + paddedBounds.height / 2;
  const viewBoxX = worldCenterX - visibleCenterScreenX / safeScale;
  const viewBoxY = worldCenterY - visibleCenterScreenY / safeScale;

  return {
    viewBox: {
      x: viewBoxX,
      y: viewBoxY,
      w: viewBoxWidth,
      h: viewBoxHeight,
    },
    debug: {
      layoutMode:
        viewportMetrics.leftOverlap > 0 || viewportMetrics.rightOverlap > 0 ? "overlay" : "contained",
      canvasLeft: viewportMetrics.canvasLeft,
      canvasWidth: viewportMetrics.canvasWidth,
      canvasHeight: viewportMetrics.canvasHeight,
      leftPanelWidth: viewportMetrics.leftPanelWidth,
      rightPanelWidth: viewportMetrics.rightPanelWidth,
      leftOverlap: viewportMetrics.leftOverlap,
      rightOverlap: viewportMetrics.rightOverlap,
      visibleLeft: viewportMetrics.visibleLeft,
      visibleWidth: viewportMetrics.visibleWidth,
      visibleHeight: viewportMetrics.visibleHeight,
      boundsWidth: paddedBounds.width,
      boundsHeight: paddedBounds.height,
      scale: safeScale,
      viewBoxX,
      viewBoxY,
      viewBoxWidth,
      viewBoxHeight,
    } satisfies FitDebugInfo,
  };
}

function getResolvedConnectionPathPoints(connection: DeviceConnection, devices: Device[]) {
  const resolve = (endpoint: DeviceConnection["from"] | DeviceConnection["to"]) => {
    const device = endpoint.deviceId ? devices.find((item) => item.id === endpoint.deviceId) : null;
    if (!device) return { x: endpoint.x, y: endpoint.y };
    if (device.type === "camera") return { x: device.x, y: device.y };
    const size =
      device.type === "nvr" || device.type === "dvr"
        ? { width: 64, height: 36 }
        : { width: 72, height: 30 };
    const halfW = size.width / 2;
    const halfH = size.height / 2;
    switch (endpoint.anchor) {
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
  };

  const start = resolve(connection.from);
  const end = resolve(connection.to);
  return [start, ...connection.points, end];
}

function getDeviceHitBox(device: Device) {
  if (device.type === "camera") {
    return { x: device.x - 18, y: device.y - 18, width: 36, height: 36 };
  }
  const size = deviceSizes[device.type];
  return {
    x: device.x - size.width / 2,
    y: device.y - size.height / 2,
    width: size.width,
    height: size.height,
  };
}

function getElementHitBox(element: MapElement) {
  if (element.type === "room") {
    return { x: element.x, y: element.y, width: element.width, height: element.height };
  }
  if (element.type === "wall") {
    const { start, end } = getWallEndpoints(element);
    if (element.wallShape === "arc") {
      const control = getCurvedWallControlPoint(element);
      const left = Math.min(start.x, end.x, control.x) - 12;
      const top = Math.min(start.y, end.y, control.y) - 12;
      const right = Math.max(start.x, end.x, control.x) + 12;
      const bottom = Math.max(start.y, end.y, control.y) + 12;
      return { x: left, y: top, width: right - left, height: bottom - top };
    }
    return normalizeRect(start.x - 8, start.y - 8, end.x + 8, end.y + 8);
  }
  if (element.type === "door") {
    return normalizeRect(
      element.x - 12,
      element.y - 12,
      element.x + element.width + 12,
      element.y + element.height + 12,
    );
  }
  const labelWidth = Math.max(60, (element.label?.length ?? 8) * 9 + 8);
  return { x: element.x - 4, y: element.y - 16, width: labelWidth, height: 24 };
}

function clampResizeBox(x: number, y: number, width: number, height: number, minSize = 20) {
  return {
    x,
    y,
    width: Math.max(minSize, width),
    height: Math.max(minSize, height),
  };
}

function resizeDoorAlongAxis(
  door: MapElement,
  drag: { sx: number; sy: number; ox: number; oy: number; ow: number; oh: number },
  point: { x: number; y: number },
) {
  const axis = getDoorAxis(door);
  const rotation = (door.rotation ?? 0) + (axis === "vertical" ? 90 : 0);
  const angle = (rotation * Math.PI) / 180;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const dx = point.x - drag.sx;
  const dy = point.y - drag.sy;
  const delta = dx * ux + dy * uy;
  const minLength = 40;

  if (axis === "horizontal") {
    const nextWidth = Math.max(minLength, drag.ow + delta);
    const appliedDelta = nextWidth - drag.ow;
    const nextHeight = Math.max(12, drag.oh * (nextWidth / Math.max(drag.ow, 1)));
    const nextCenter = {
      x: drag.ox + drag.ow / 2 + (ux * appliedDelta) / 2,
      y: drag.oy + drag.oh / 2 + (uy * appliedDelta) / 2,
    };
    return {
      x: nextCenter.x - nextWidth / 2,
      y: nextCenter.y - nextHeight / 2,
      width: nextWidth,
      height: nextHeight,
    };
  }

  const nextHeight = Math.max(minLength, drag.oh + delta);
  const appliedDelta = nextHeight - drag.oh;
  const nextWidth = Math.max(12, drag.ow * (nextHeight / Math.max(drag.oh, 1)));
  const nextCenter = {
    x: drag.ox + drag.ow / 2 + (ux * appliedDelta) / 2,
    y: drag.oy + drag.oh / 2 + (uy * appliedDelta) / 2,
  };
  return {
    x: nextCenter.x - nextWidth / 2,
    y: nextCenter.y - nextHeight / 2,
    width: nextWidth,
    height: nextHeight,
  };
}

export function PlanCanvas({
  highlightId,
  rightPinned,
}: {
  highlightId: string | null;
  rightPinned: boolean;
}) {
  const {
    activeFloorId,
    activeObjectId,
    objects,
    floors,
    mapElements,
    devices,
    deviceConnections,
    settings,
    isEditMode,
    mode,
    setMode,
    currentCableType,
    setCableType,
    selectedId,
    selectedKind,
    selectedItems,
    select,
    selectItems,
    toggleSelection,
    clearSelection,
    addElement,
    addDevice,
    addDeviceConnection,
    focusConnection,
    updateDeviceConnection,
    updateElement,
    updateDevice,
    removeElement,
    removeDevice,
    removeDeviceConnection,
    removeSelectedItems,
    moveGroupBy,
    moveSelectedItemsBy,
    isHydrated,
    updateUiState,
    importJSON,
  } = useStore();

  const svgRef = useRef<SVGSVGElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const savedViewport =
    (activeFloorId ? settings.uiState?.viewportByFloorId?.[activeFloorId] : null) ??
    settings.uiState?.viewport ??
    null;
  const [vb, setVb] = useState<ViewBox>(savedViewport ?? { x: 0, y: 0, w: BASE_W, h: BASE_H });
  const [hover, setHover] = useState<Device | null>(null);
  const [hoverConnection, setHoverConnection] = useState<DeviceConnection | null>(null);
  const [draftCable, setDraftCable] = useState<DraftCable | null>(null);
  const [selectedCableHandle, setSelectedCableHandle] = useState<CableHandleSelection>(null);
  const [hoverSegment, setHoverSegment] = useState<CableSegmentHover>(null);
  const [doorPreview, setDoorPreview] = useState<DoorPlacement | null>(null);
  const [textDraft, setTextDraft] = useState<TextDraft | null>(null);
  const [textDraftValue, setTextDraftValue] = useState("");
  const textDraftHandledRef = useRef(false);
  const lastDoorPlacementRef = useRef<DoorPlacement | null>(null);
  const restoredViewportFloorRef = useRef<string | null>(null);
  const openProject = async () => {
    const bridge = window.cctvDesktop;
    if (bridge) {
      const text = await bridge.openJsonFile();
      if (text) {
        try {
          importJSON(text);
        } catch {
          console.error("Ошибка открытия проекта");
        }
      }
      return;
    }

    fileRef.current?.click();
  };

  const handleProjectFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      importJSON(await file.text());
    } catch {
      console.error("Ошибка открытия проекта");
    }
  };
  const [drag, setDrag] = useState<
    | { kind: "pan"; sx: number; sy: number; ovb: ViewBox }
    | { kind: "move-el"; id: string; dx: number; dy: number }
    | { kind: "move-dev"; id: string; dx: number; dy: number }
    | { kind: "move-pt"; id: string; index: number }
    | { kind: "move-cable-endpoint"; id: string; endpoint: "from" | "to" }
    | {
        kind: "move-group";
        groupId: string;
        lastDx: number;
        lastDy: number;
        sx: number;
        sy: number;
      }
    | {
        kind: "move-selection";
        items: { kind: "device" | "element"; id: string }[];
        lastDx: number;
        lastDy: number;
        sx: number;
        sy: number;
      }
    | {
        kind: "resize-el";
        id: string;
        handle: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
        sx: number;
        sy: number;
        ox: number;
        oy: number;
        ow: number;
        oh: number;
      }
    | {
        kind: "resize-wall-end";
        id: string;
        endpoint?: "start" | "end";
        ox: number;
        oy: number;
        ow: number;
        oh: number;
        curveOffset: number;
      }
    | {
        kind: "rotate-wall-end";
        id: string;
        endpoint?: "start" | "end";
        ox: number;
        oy: number;
        ow: number;
        oh: number;
        curveOffset: number;
      }
    | { kind: "draw-room"; sx: number; sy: number; px: number; py: number }
    | {
        kind: "draw-wall";
        sx: number;
        sy: number;
        px: number;
        py: number;
        id: string;
        curved?: boolean;
        axis?: "horizontal" | "vertical" | "diagonal";
      }
    | { kind: "draw-door"; sx: number; sy: number; px: number; py: number }
    | { kind: "select-box"; sx: number; sy: number; px: number; py: number; additive: boolean }
    | { kind: "rotate-dev"; id: string; cx: number; cy: number }
    | null
  >(null);

  const floorEls = mapElements.filter((element) => element.floorId === activeFloorId);
  const floorDevices = devices.filter((device) => device.floorId === activeFloorId);
  const floorConnections = deviceConnections.filter(
    (connection) => connection.floorId === activeFloorId,
  );
  const selectedConnectionIds = new Set(
    selectedItems.filter((item) => item.kind === "connection").map((item) => item.id),
  );
  const selectedLookup = new Set(selectedItems.map((item) => `${item.kind}:${item.id}`));
  const defaultRoomFill = "#000000";
  const activeObjectName = objects.find((item) => item.id === activeObjectId)?.name ?? "";
  const activeFloorName = floors.find((item) => item.id === activeFloorId)?.name ?? "";
  const canvasContextLabel = [activeObjectName, activeFloorName].filter(Boolean).join(" - ");
  const isDraggingMoveTarget =
    drag?.kind === "move-el" ||
    drag?.kind === "move-dev" ||
    drag?.kind === "move-group" ||
    drag?.kind === "move-selection";
  const isDraggingCanvas =
    drag?.kind === "pan" ||
    drag?.kind === "draw-room" ||
    drag?.kind === "draw-wall" ||
    drag?.kind === "draw-door" ||
    drag?.kind === "select-box" ||
    drag?.kind === "move-pt" ||
    drag?.kind === "move-cable-endpoint" ||
    drag?.kind === "resize-el" ||
    drag?.kind === "resize-wall-end" ||
    drag?.kind === "rotate-wall-end" ||
    drag?.kind === "rotate-dev" ||
    isDraggingMoveTarget;

  const getCanvasCursor = () => {
    if (drag?.kind === "pan" || isDraggingMoveTarget) return "grabbing";
    if (drag?.kind === "move-pt" || drag?.kind === "move-cable-endpoint") return "default";
    if (drag?.kind === "resize-wall-end") return "move";
    if (drag?.kind === "rotate-wall-end") return "move";
    if (drag?.kind === "select-box") return "crosshair";
    if (!isEditMode) return "default";
    if (mode === "select") return "grab";
    if (
      mode === "connector" ||
      mode === "room" ||
      mode === "wall" ||
      mode === "curved_wall" ||
      mode === "door"
    )
      return "crosshair";
    return "default";
  };

  const getMoveTargetCursor = (locked?: boolean) => {
    if (isDraggingMoveTarget) return "grabbing";
    if (!isEditMode) return "pointer";
    if (mode !== "select") return "crosshair";
    if (!locked) return "move";
    return "pointer";
  };

  const persistViewport = (next: ViewBox) => {
    if (!activeFloorId) {
      updateUiState({ viewport: next });
      return;
    }

    updateUiState({
      viewport: next,
      viewportByFloorId: {
        ...(settings.uiState?.viewportByFloorId ?? {}),
        [activeFloorId]: next,
      },
    });
  };

  const getCanvasFitMetrics = () => {
    const canvasRect = canvasWrapRef.current?.getBoundingClientRect();
    if (!canvasRect) {
      return {
        canvasLeft: 0,
        canvasWidth: BASE_W,
        canvasHeight: BASE_H,
        leftPanelWidth: 0,
        rightPanelWidth: 0,
        leftOverlap: 0,
        rightOverlap: 0,
        visibleLeft: 0,
        visibleTop: 0,
        visibleWidth: BASE_W,
        visibleHeight: BASE_H,
      };
    }

    const leftPanel = document.querySelector<HTMLElement>("[data-plan-left-panel]");
    const rightPanel = document.querySelector<HTMLElement>("[data-plan-right-panel]");
    const leftRect = leftPanel?.getBoundingClientRect();
    const rightRect = rightPanel?.getBoundingClientRect();
    const getHorizontalOverlap = (panelRect?: DOMRect) => {
      if (!panelRect) return 0;
      return Math.max(
        0,
        Math.min(canvasRect.right, panelRect.right) - Math.max(canvasRect.left, panelRect.left),
      );
    };
    const leftOverlap = getHorizontalOverlap(leftRect);
    const rightOverlap = getHorizontalOverlap(rightRect);

    return {
      canvasLeft: canvasRect.left,
      canvasWidth: canvasRect.width,
      canvasHeight: canvasRect.height,
      leftPanelWidth: leftRect?.width ?? 0,
      rightPanelWidth: rightRect?.width ?? 0,
      leftOverlap,
      rightOverlap,
      visibleLeft: leftOverlap,
      visibleTop: 0,
      visibleWidth: Math.max(1, canvasRect.width - leftOverlap - rightOverlap),
      visibleHeight: Math.max(1, canvasRect.height),
    };
  };

  const fitActiveFloorViewport = (reason: "auto" | "ctrl0" = "ctrl0") => {
    const { bounds } = getViewportFitBounds(
      floorEls,
      floorDevices,
      floorConnections,
    );
    const viewportMetrics = getCanvasFitMetrics();
    const fit = bounds ? fitBoundsToViewport(bounds, viewportMetrics) : null;

    const next = fit?.viewBox ?? { x: 0, y: 0, w: BASE_W, h: BASE_H };
    if (!fit || !bounds) {
      setVb({ x: 0, y: 0, w: BASE_W, h: BASE_H });
      return;
    }
    setVb(next);
    persistViewport(next);
  };

  const isEditableTarget = (target: EventTarget | null) =>
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable);

  const toSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const mapped = point.matrixTransform(ctm.inverse());
    return { x: mapped.x, y: mapped.y };
  };

  const toClientPoint = (x: number, y: number) => {
    const svg = svgRef.current;
    if (!svg) return { left: x, top: y };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { left: x, top: y };
    const point = svg.createSVGPoint();
    point.x = x;
    point.y = y;
    const mapped = point.matrixTransform(ctm);
    const wrap = canvasWrapRef.current;
    const wrapRect = wrap?.getBoundingClientRect();
    return {
      left: mapped.x - (wrapRect?.left ?? 0),
      top: mapped.y - (wrapRect?.top ?? 0),
    };
  };

  const finishTextDraft = (commit: boolean) => {
    const current = textDraft;
    if (!current || textDraftHandledRef.current) return;
    const label = textDraftValue.trim();
    if (commit && label) {
      textDraftHandledRef.current = true;
      const bounds = getTextElementBounds(label, DEFAULT_TEXT_FONT_SIZE);
      updateElement(current.id, {
        label,
        width: bounds.width,
        height: bounds.height,
      });
      setTextDraft(null);
      setMode("select");
      return;
    }
    if (!commit || !label) {
      textDraftHandledRef.current = true;
      removeElement(current.id);
      setTextDraft(null);
      setTextDraftValue("");
      setMode("select");
    }
  };

  const textDraftPoint = textDraft ? toClientPoint(textDraft.x, textDraft.y) : null;

  const onWheel = (e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    const { x, y } = toSvg(e.clientX, e.clientY);
    const newW = Math.max(200, Math.min(5000, vb.w * factor));
    const next = {
      x: x - (x - vb.x) * (newW / vb.w),
      y: y - (y - vb.y) * (newW / vb.w),
      w: newW,
      h: (newW / vb.w) * vb.h,
    };
    setVb(next);
    persistViewport(next);
  };

  const createDeviceByMode = (pt: { x: number; y: number }) => {
    const base = {
      floorId: activeFloorId ?? "",
      objectId: activeObjectId ?? "",
      name: "",
      ip: "",
      username: "admin",
      password: "",
      model: "",
      serialNumber: "",
      location: "",
      status: "needs_check" as const,
      notes: "",
      x: pt.x,
      y: pt.y,
      rotation: 0,
      lastCheckedAt: "",
      responsiblePerson: "",
    };

    if (mode === "camera") {
      return addDevice({
        ...base,
        type: "camera",
        name: "Новая камера",
        rtspUrl: "",
        fovAngle: 90,
        fovDistance: 150,
      });
    }

    if (mode === "nvr") {
      return addDevice({
        ...base,
        type: "nvr",
        name: "Новый NVR",
        channelCount: 8,
        storageCapacityTb: 4,
        hddCount: 1,
        connectedCameraIds: [],
      });
    }

    if (mode === "dvr") {
      return addDevice({
        ...base,
        type: "dvr",
        name: "Новый DVR",
        channelCount: 8,
        storageCapacityTb: 4,
        hddCount: 1,
        connectedCameraIds: [],
      });
    }

    if (mode === "switch") {
      return addDevice({
        ...base,
        type: "switch",
        name: "Новый Switch",
        portCount: 8,
        uplinkPorts: 1,
        connectedDeviceIds: [],
      });
    }

    if (mode === "poe_switch") {
      return addDevice({
        ...base,
        type: "poe_switch",
        name: "Новый PoE Switch",
        portCount: 8,
        poePortCount: 4,
        poeBudgetW: 55,
        uplinkPorts: 1,
        connectedDeviceIds: [],
      });
    }

    return null;
  };

  const resolveCableEndpoint = (point: { x: number; y: number }) => {
    let nearest: {
      device: Device;
      anchor: CableAnchor;
      x: number;
      y: number;
      distance: number;
    } | null = null;
    for (const device of floorDevices) {
      const candidate = getNearestAnchor(device, point);
      if (
        candidate.distance <= DEVICE_SNAP_DISTANCE &&
        (!nearest || candidate.distance < nearest.distance)
      ) {
        nearest = {
          device,
          anchor: candidate.anchor,
          x: candidate.x,
          y: candidate.y,
          distance: candidate.distance,
        };
      }
    }
    if (nearest) {
      return {
        deviceId: nearest.device.id,
        anchor: nearest.anchor,
        x: nearest.x,
        y: nearest.y,
        snapped: true,
      };
    }
    return {
      x: snapGrid(point.x),
      y: snapGrid(point.y),
      snapped: false,
    };
  };

  const createDefaultRoom = (pt: { x: number; y: number }) => {
    const id = addElement({
      floorId: activeFloorId ?? "",
      type: "room",
      x: pt.x - 100,
      y: pt.y - 100,
      width: 200,
      height: 200,
      label: "Помещение",
      color: defaultRoomFill,
      strokeWidth: 2,
      rotation: 0,
    });
    select(id, "element");
    setMode("select");
    return id;
  };

  const createRoomFromBounds = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    const left = Math.min(start.x, end.x);
    const top = Math.min(start.y, end.y);
    const width = Math.max(20, Math.abs(end.x - start.x));
    const height = Math.max(20, Math.abs(end.y - start.y));
    const id = addElement({
      floorId: activeFloorId ?? "",
      type: "room",
      x: left,
      y: top,
      width,
      height,
      label: "Помещение",
      color: defaultRoomFill,
      strokeWidth: 2,
      rotation: 0,
    });
    select(id, "element");
    setMode("select");
    return id;
  };

  const createDoorFromPlacement = (placement: DoorPlacement) => {
    lastDoorPlacementRef.current = placement;
    const id = addElement({
      floorId: activeFloorId ?? "",
      type: "door",
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      color: DEFAULT_DOOR_COLOR,
      doorAxis: placement.doorAxis,
      doorSide: placement.doorSide,
      rotation: placement.rotation ?? 0,
    });
    select(id, "element");
    setMode("select");
    setDoorPreview(null);
    lastDoorPlacementRef.current = null;
    return id;
  };

  const createDoorFromLine = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const horizontal = Math.abs(dx) >= Math.abs(dy);
    const side = horizontal ? (dy < 0 ? "top" : "bottom") : dx < 0 ? "left" : "right";
    const thickness = 24;
    const length = Math.max(40, horizontal ? Math.abs(dx) : Math.abs(dy));
    return createDoorFromPlacement({
      x: horizontal ? Math.min(start.x, end.x) : start.x - thickness / 2,
      y: horizontal ? start.y - thickness / 2 : Math.min(start.y, end.y),
      width: horizontal ? length : thickness,
      height: horizontal ? thickness : length,
      doorAxis: horizontal ? "horizontal" : "vertical",
      doorSide: side,
      rotation: 0,
    });
  };

  const getDraftReferencePoint = (draft: DraftCable) => draft.points.at(-1) ?? draft.start;

  const getDraftPreviewPoint = (draft: DraftCable, point: { x: number; y: number }) => {
    const resolved = resolveCableEndpoint(point);
    if (resolved.deviceId) {
      return {
        x: resolved.x,
        y: resolved.y,
        deviceId: resolved.deviceId,
        anchor: resolved.anchor ?? "center",
        snapped: true,
      };
    }

    const base = getDraftReferencePoint(draft);
    const constrained = getDirectionConstrainedPoint(base, point);
    return {
      x: constrained.x,
      y: constrained.y,
      snapped: false,
    };
  };

  const getDraftRoutePoint = (draft: DraftCable, point: { x: number; y: number }) => {
    const base = getDraftReferencePoint(draft);
    return getDirectionConstrainedPoint(base, point);
  };

  const startDraftCable = (point: { x: number; y: number }) => {
    const resolved = resolveCableEndpoint(point);
    return {
      type: currentCableType,
      start: {
        deviceId: resolved.deviceId,
        anchor: (resolved.anchor ?? "center") as CableAnchor,
        x: resolved.x,
        y: resolved.y,
      },
      points: [] as CablePoint[],
      cursor: { x: resolved.x, y: resolved.y },
      hoverDeviceId: resolved.deviceId,
    } satisfies DraftCable;
  };

  const finalizeDraftCable = (endPoint: ReturnType<typeof resolveCableEndpoint>) => {
    if (!draftCable) return;
    if (!draftCable.start) return;
    const cable = {
      objectId: activeObjectId ?? "",
      floorId: activeFloorId ?? "",
      type: draftCable.type,
      from: {
        deviceId: draftCable.start.deviceId,
        anchor: draftCable.start.anchor,
        x: draftCable.start.x,
        y: draftCable.start.y,
      },
      to: {
        deviceId: endPoint.deviceId,
        anchor: endPoint.anchor ?? "center",
        x: endPoint.x,
        y: endPoint.y,
      },
      points: draftCable.points.map((point) => ({ ...point })),
      label: cableLabels[draftCable.type],
      notes: "",
    };
    const connectionId = addDeviceConnection(cable);
    focusConnection(connectionId);
    setDraftCable(null);
    setSelectedCableHandle(null);
    setHoverSegment(null);
    setMode("select");
  };

  const appendDraftPoint = (point: { x: number; y: number }) => {
    setDraftCable((current) =>
      current
        ? {
            ...current,
            points: [...current.points, getDraftRoutePoint(current, point)],
            cursor: getDraftPreviewPoint(current, point),
          }
        : current,
    );
  };

  const insertConnectionPoint = (
    connectionId: string,
    segmentIndex: number,
    point: { x: number; y: number },
  ) => {
    const connection = floorConnections.find((item) => item.id === connectionId);
    if (!connection) return;
    const pathPoints = getConnectionPathPoints(connection);
    const constrained = getDirectionConstrainedPoint(pathPoints[segmentIndex], point);
    const nextPoints = [...connection.points];
    nextPoints.splice(segmentIndex, 0, constrained);
    updateDeviceConnection(connectionId, { points: nextPoints });
    setSelectedCableHandle({ connectionId, kind: "point", index: segmentIndex });
    select(connectionId, "connection");
  };

  const updateConnectionEndpoint = (
    connectionId: string,
    endpoint: "from" | "to",
    point: { x: number; y: number },
  ) => {
    const resolved = resolveCableEndpoint(point);
    updateDeviceConnection(connectionId, {
      [endpoint]: {
        deviceId: resolved.deviceId,
        anchor: (resolved.anchor ?? "center") as CableAnchor,
        x: resolved.x,
        y: resolved.y,
      },
    } as Partial<DeviceConnection>);
  };

  const getWallEndResizePatch = (
    resize: Extract<NonNullable<typeof drag>, { kind: "resize-wall-end" }>,
    point: { x: number; y: number },
    snapOnRelease = false,
  ) => {
    const endpoint = resize.endpoint ?? "end";
    const originalLength = Math.max(1, Math.hypot(resize.ow, resize.oh));
    const fixed =
      endpoint === "start"
        ? { x: resize.ox + resize.ow, y: resize.oy + resize.oh }
        : { x: resize.ox, y: resize.oy };
    const direction =
      endpoint === "start"
        ? { x: -resize.ow / originalLength, y: -resize.oh / originalLength }
        : { x: resize.ow / originalLength, y: resize.oh / originalLength };

    const snapped = snapOnRelease ? point : { x: snapGrid(point.x), y: snapGrid(point.y) };
    const projectedLength = Math.max(
      20,
      (snapped.x - fixed.x) * direction.x + (snapped.y - fixed.y) * direction.y,
    );
    let moved = {
      x: fixed.x + direction.x * projectedLength,
      y: fixed.y + direction.y * projectedLength,
    };

    if (snapOnRelease) {
      moved = getWallEndpointStructureSnap(moved, fixed, direction, floorEls, resize.id) ?? moved;
    }

    const width = endpoint === "start" ? fixed.x - moved.x : moved.x - fixed.x;
    const height = endpoint === "start" ? fixed.y - moved.y : moved.y - fixed.y;
    const nextLength = Math.hypot(width, height);
    if (nextLength < 20) return null;

    return {
      ...(endpoint === "start" ? { x: moved.x, y: moved.y } : {}),
      width,
      height,
      curveOffset: resize.curveOffset * (nextLength / originalLength),
    };
  };

  const getWallEndRotatePatch = (
    rotate: Extract<NonNullable<typeof drag>, { kind: "rotate-wall-end" }>,
    point: { x: number; y: number },
    snapOnRelease = false,
  ) => {
    const endpoint = rotate.endpoint ?? "end";
    const originalLength = Math.max(1, Math.hypot(rotate.ow, rotate.oh));
    const fixed =
      endpoint === "start"
        ? { x: rotate.ox + rotate.ow, y: rotate.oy + rotate.oh }
        : { x: rotate.ox, y: rotate.oy };
    const snapped = snapOnRelease ? point : { x: snapGrid(point.x), y: snapGrid(point.y) };
    const rawDx = snapped.x - fixed.x;
    const rawDy = snapped.y - fixed.y;
    const rawLength = Math.hypot(rawDx, rawDy);
    if (rawLength < 0.0001) return null;

    const direction = { x: rawDx / rawLength, y: rawDy / rawLength };
    let moved = {
      x: fixed.x + direction.x * Math.max(20, rawLength),
      y: fixed.y + direction.y * Math.max(20, rawLength),
    };

    if (snapOnRelease) {
      moved = getWallEndpointStructureSnap(moved, fixed, direction, floorEls, rotate.id) ?? moved;
    }

    const width = endpoint === "start" ? fixed.x - moved.x : moved.x - fixed.x;
    const height = endpoint === "start" ? fixed.y - moved.y : moved.y - fixed.y;
    const nextLength = Math.hypot(width, height);
    if (nextLength < 20) return null;

    return {
      ...(endpoint === "start" ? { x: moved.x, y: moved.y } : {}),
      width,
      height,
      curveOffset: rotate.curveOffset * (nextLength / originalLength),
    };
  };

  const getMovedWallAutoFitPatch = (element: MapElement) => {
    if (element.type !== "wall") return null;
    const { start, end } = getWallEndpoints(element);
    const length = Math.max(1, Math.hypot(element.width, element.height));
    const curveOffset = element.curveOffset ?? Math.max(20, length / 2);
    const candidates = [
      {
        endpoint: "start" as const,
        point: start,
        fixed: end,
        direction: { x: -element.width / length, y: -element.height / length },
      },
      {
        endpoint: "end" as const,
        point: end,
        fixed: start,
        direction: { x: element.width / length, y: element.height / length },
      },
    ];

    let best:
      | {
          endpoint: "start" | "end";
          point: { x: number; y: number };
          distance: number;
        }
      | null = null;

    for (const candidate of candidates) {
      const snap = getWallEndpointStructureSnap(
        candidate.point,
        candidate.fixed,
        candidate.direction,
        floorEls,
        element.id,
      );
      if (!snap) continue;
      const snapDistance = distance(candidate.point, snap);
      if (!best || snapDistance < best.distance) {
        best = { endpoint: candidate.endpoint, point: candidate.point, distance: snapDistance };
      }
    }

    if (!best) return null;
    return getWallEndResizePatch(
      {
        kind: "resize-wall-end",
        id: element.id,
        endpoint: best.endpoint,
        ox: element.x,
        oy: element.y,
        ow: element.width,
        oh: element.height,
        curveOffset,
      },
      best.point,
      true,
    );
  };

  const startWallDraft = (point: { x: number; y: number }, curved: boolean) => {
    if (!activeFloorId) return;
    const snapped = { x: snapGrid(point.x), y: snapGrid(point.y) };
    const start = snapToPlanStructure(snapped, floorEls).point;
    const id = addElement({
      floorId: activeFloorId,
      type: "wall",
      x: start.x,
      y: start.y,
      width: 0,
      height: 0,
      color: DEFAULT_WALL_COLOR,
      strokeWidth: 2,
      wallShape: curved ? "arc" : "straight",
      curveOffset: curved ? 20 : undefined,
      rotation: 0,
      locked: false,
    });
    select(id, "element");
    setDrag({ kind: "draw-wall", sx: start.x, sy: start.y, px: start.x, py: start.y, id, curved });
  };

  const getConnectionPathPoints = (connection: DeviceConnection) => {
    const { start, end } = resolveConnectionEndpoints(connection, floorDevices);
    return [start, ...connection.points, end];
  };

  const removeSelectedConnectionPoint = () => {
    if (!selectedCableHandle || selectedCableHandle.kind !== "point") return;
    const connection = floorConnections.find(
      (item) => item.id === selectedCableHandle.connectionId,
    );
    if (!connection) return;
    const pathPointIndex = selectedCableHandle.index;
    const isStartEndpoint = pathPointIndex === 0;
    const isEndEndpoint = pathPointIndex === connection.points.length + 1;
    if (isStartEndpoint) {
      const [nextStart, ...remainingPoints] = connection.points;
      if (!nextStart) {
        removeDeviceConnection(connection.id);
        setSelectedCableHandle(null);
        return;
      }
      updateDeviceConnection(connection.id, {
        from: { anchor: "center", x: nextStart.x, y: nextStart.y },
        points: remainingPoints,
      });
      setSelectedCableHandle(null);
      return;
    }
    if (isEndEndpoint) {
      const nextEnd = connection.points.at(-1);
      if (!nextEnd) {
        removeDeviceConnection(connection.id);
        setSelectedCableHandle(null);
        return;
      }
      updateDeviceConnection(connection.id, {
        to: { anchor: "center", x: nextEnd.x, y: nextEnd.y },
        points: connection.points.slice(0, -1),
      });
      setSelectedCableHandle(null);
      return;
    }

    const routePointIndex = pathPointIndex - 1;
    const points = connection.points.filter((_, index) => index !== routePointIndex);
    updateDeviceConnection(connection.id, { points });
    setSelectedCableHandle(
      points.length === 0
        ? null
        : {
            connectionId: connection.id,
            kind: "point",
            index: Math.min(pathPointIndex, points.length),
          },
    );
  };

  const releaseSidebarRenameFocus = (canvas: SVGSVGElement) => {
    const active = document.activeElement;
    if (!(active instanceof HTMLInputElement)) return;
    if (!active.dataset.sidebarRenameKind) return;

    active.blur();
    canvas.focus();
  };

  const onMouseDown = (e: MouseEvent<SVGSVGElement>) => {
    releaseSidebarRenameFocus(e.currentTarget);
    if (!activeFloorId) return;
    const pt = toSvg(e.clientX, e.clientY);
    const targetIsSvg = (e.target as Element).tagName === "svg";

    if (textDraft) {
      finishTextDraft(true);
      return;
    }

    if (e.button === 0 && isEditMode && mode === "select" && targetIsSvg && e.ctrlKey) {
      setDrag({ kind: "select-box", sx: pt.x, sy: pt.y, px: pt.x, py: pt.y, additive: true });
      return;
    }

    if (e.button === 1 || (e.button === 0 && mode === "select" && targetIsSvg)) {
      setDrag({ kind: "pan", sx: e.clientX, sy: e.clientY, ovb: vb });
      if (!rightPinned) {
        clearSelection();
      }
      return;
    }

    if (e.button !== 0) return;
    if (!isEditMode) return;

    if (mode === "connector") {
      const resolved = resolveCableEndpoint(pt);
      if (!draftCable) {
        setDraftCable(startDraftCable(pt));
        if (resolved.deviceId) {
          select(resolved.deviceId, "device");
        }
        return;
      }

      if (e.detail >= 2) {
        finalizeDraftCable(getDraftPreviewPoint(draftCable, pt));
        return;
      }

      appendDraftPoint(pt);
      if (resolved.deviceId) {
        setDraftCable((current) =>
          current
            ? {
                ...current,
                hoverDeviceId: resolved.deviceId,
              }
            : current,
        );
      }
      return;
    }

    if (mode === "room") {
      const snapped = { x: snapGrid(pt.x), y: snapGrid(pt.y) };
      setDrag({ kind: "draw-room", sx: snapped.x, sy: snapped.y, px: snapped.x, py: snapped.y });
      return;
    }

    if (mode === "wall" || mode === "curved_wall") {
      startWallDraft(pt, mode === "curved_wall");
      return;
    }

    if (mode === "door") {
      const snapped = { x: snapGrid(pt.x), y: snapGrid(pt.y) };
      setDrag({ kind: "draw-door", sx: snapped.x, sy: snapped.y, px: snapped.x, py: snapped.y });
      setDoorPreview(getDoorPlacementFromPoint(pt, floorEls));
      return;
    }

    if (mode === "text") {
      const bounds = getTextElementBounds("", DEFAULT_TEXT_FONT_SIZE);
      const id = addElement({
        floorId: activeFloorId,
        type: "text",
        x: pt.x,
        y: pt.y,
        width: bounds.width,
        height: bounds.height,
        label: "",
        fontSize: DEFAULT_TEXT_FONT_SIZE,
        color: "#111827",
        rotation: 0,
      });
      select(id, "element");
      textDraftHandledRef.current = false;
      setTextDraftValue("");
      setTextDraft({ id, x: pt.x, y: pt.y, value: "" });
      return;
    }

    if (
      mode === "camera" ||
      mode === "nvr" ||
      mode === "dvr" ||
      mode === "switch" ||
      mode === "poe_switch"
    ) {
      const id = createDeviceByMode(pt);
      if (id) {
        select(id, "device");
        setMode("select");
      }
    }
  };

  const applyViewportZoom = (factor: number) => {
    const centerX = vb.x + vb.w / 2;
    const centerY = vb.y + vb.h / 2;
    const nextWidth = Math.max(40, vb.w * factor);
    const nextHeight = Math.max(40, vb.h * factor);
    const next = {
      x: centerX - nextWidth / 2,
      y: centerY - nextHeight / 2,
      w: nextWidth,
      h: nextHeight,
    };
    setVb(next);
    persistViewport(next);
  };

  const resetViewportToFit = () => {
    fitActiveFloorViewport("ctrl0");
  };

  const onMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    const pt = toSvg(e.clientX, e.clientY);
    if (draftCable) {
      setDraftCable((current) =>
        current
          ? {
              ...current,
              cursor: getDraftPreviewPoint(current, pt),
              hoverDeviceId: resolveCableEndpoint(pt).deviceId,
            }
          : current,
      );
    }

    if (mode === "door" && !drag) {
      setDoorPreview(getDoorPlacementFromPoint(pt, floorEls));
    }

    if (!drag) return;
    if (drag.kind === "pan") {
      const dx = ((e.clientX - drag.sx) / (svgRef.current?.clientWidth ?? 1)) * vb.w;
      const dy = ((e.clientY - drag.sy) / (svgRef.current?.clientHeight ?? 1)) * vb.h;
      setVb({ ...drag.ovb, x: drag.ovb.x - dx, y: drag.ovb.y - dy });
      return;
    }

    if (!isEditMode) return;

    if (drag.kind === "draw-wall") {
      const snapped = { x: snapGrid(pt.x), y: snapGrid(pt.y) };
      const structureSnap = snapToPlanStructure(snapped, floorEls, drag.id);
      const endpoint = structureSnap.snapped ? structureSnap.point : snapped;
      const width = endpoint.x - drag.sx;
      const height = endpoint.y - drag.sy;
      const length = Math.hypot(width, height);
      updateElement(drag.id, {
        x: drag.sx,
        y: drag.sy,
        width,
        height,
        ...(drag.curved ? { curveOffset: Math.max(20, length / 2) } : {}),
      });
      setDrag({ ...drag, px: endpoint.x, py: endpoint.y });
      return;
    }

    if (drag.kind === "draw-door") {
      const snapped = { x: snapGrid(pt.x), y: snapGrid(pt.y) };
      setDrag({ ...drag, px: snapped.x, py: snapped.y });
      const placement = getDoorPlacementFromPoint(pt, floorEls);
      if (placement) {
        lastDoorPlacementRef.current = placement;
        setDoorPreview(placement);
      }
      return;
    }

    if (drag.kind === "draw-room") {
      const snapped = { x: snapGrid(pt.x), y: snapGrid(pt.y) };
      setDrag({ ...drag, px: snapped.x, py: snapped.y });
      return;
    }

    if (drag.kind === "select-box") {
      setDrag({ ...drag, px: pt.x, py: pt.y });
      return;
    }

    if (drag.kind === "move-el") {
      updateElement(drag.id, { x: pt.x - drag.dx, y: pt.y - drag.dy });
      return;
    }

    if (drag.kind === "move-dev") {
      updateDevice(drag.id, { x: pt.x - drag.dx, y: pt.y - drag.dy });
      return;
    }

    if (drag.kind === "move-group") {
      const dx = pt.x - drag.sx;
      const dy = pt.y - drag.sy;
      moveGroupBy(drag.groupId, dx - drag.lastDx, dy - drag.lastDy);
      setDrag({ ...drag, lastDx: dx, lastDy: dy });
      return;
    }

    if (drag.kind === "move-selection") {
      const dx = pt.x - drag.sx;
      const dy = pt.y - drag.sy;
      moveSelectedItemsBy(drag.items, dx - drag.lastDx, dy - drag.lastDy);
      setDrag({ ...drag, lastDx: dx, lastDy: dy });
      return;
    }

    if (drag.kind === "move-pt") {
      updateDeviceConnection(drag.id, {
        points:
          floorConnections
            .find((item) => item.id === drag.id)
            ?.points.map((point, index) =>
              index === drag.index ? { x: snapGrid(pt.x), y: snapGrid(pt.y) } : point,
            ) ?? [],
      });
      return;
    }

    if (drag.kind === "move-cable-endpoint") {
      updateConnectionEndpoint(drag.id, drag.endpoint, pt);
      return;
    }

    if (drag.kind === "resize-el") {
      const dx = pt.x - drag.sx;
      const dy = pt.y - drag.sy;
      const element = floorEls.find((item) => item.id === drag.id);
      if (element?.type === "door") {
        updateElement(drag.id, resizeDoorAlongAxis(element, drag, pt));
        return;
      }
      const next =
        drag.handle === "nw"
          ? clampResizeBox(drag.ox + dx, drag.oy + dy, drag.ow - dx, drag.oh - dy)
          : drag.handle === "n"
            ? clampResizeBox(drag.ox, drag.oy + dy, drag.ow, drag.oh - dy)
            : drag.handle === "ne"
              ? clampResizeBox(drag.ox, drag.oy + dy, drag.ow + dx, drag.oh - dy)
              : drag.handle === "e"
                ? clampResizeBox(drag.ox, drag.oy, drag.ow + dx, drag.oh)
                : drag.handle === "se"
                  ? clampResizeBox(drag.ox, drag.oy, drag.ow + dx, drag.oh + dy)
                  : drag.handle === "s"
                    ? clampResizeBox(drag.ox, drag.oy, drag.ow, drag.oh + dy)
                    : drag.handle === "sw"
                      ? clampResizeBox(drag.ox + dx, drag.oy, drag.ow - dx, drag.oh + dy)
                      : clampResizeBox(drag.ox + dx, drag.oy, drag.ow - dx, drag.oh);
      updateElement(drag.id, next);
      return;
    }

    if (drag.kind === "rotate-wall-end") {
      const next = getWallEndRotatePatch(drag, pt);
      if (next) updateElement(drag.id, next);
      return;
    }

    if (drag.kind === "rotate-dev") {
      const angle = (Math.atan2(pt.y - drag.cy, pt.x - drag.cx) * 180) / Math.PI;
      updateDevice(drag.id, { rotation: angle });
    }
  };

  const finishDrag = () => {
    if (drag?.kind === "move-el") {
      const element = floorEls.find((item) => item.id === drag.id);
      if (element?.type === "wall") {
        const next = getMovedWallAutoFitPatch(element);
        if (next) updateElement(element.id, next);
      }
    }
    if (drag?.kind === "rotate-wall-end") {
      const element = floorEls.find((item) => item.id === drag.id);
      if (element) {
        const { start, end } = getWallEndpoints(element);
        const endpointPoint = (drag.endpoint ?? "end") === "start" ? start : end;
        const next = getWallEndRotatePatch(drag, endpointPoint, true);
        if (next) updateElement(drag.id, next);
      }
    }
    if (drag?.kind === "draw-wall") {
      const length = Math.hypot(drag.px - drag.sx, drag.py - drag.sy);
      if (length < GRID_SIZE) {
        removeElement(drag.id);
      } else {
        setMode("select");
      }
    }
    if (drag?.kind === "draw-room") {
      const movedEnough =
        Math.abs(drag.px - drag.sx) >= GRID_SIZE / 2 ||
        Math.abs(drag.py - drag.sy) >= GRID_SIZE / 2;
      if (movedEnough) {
        createRoomFromBounds({ x: drag.sx, y: drag.sy }, { x: drag.px, y: drag.py });
      } else {
        createDefaultRoom({ x: drag.sx, y: drag.sy });
      }
    }
    if (drag?.kind === "draw-door") {
      const placement = doorPreview ?? lastDoorPlacementRef.current;
      if (placement) {
        createDoorFromPlacement(placement);
      } else if (Math.abs(drag.px - drag.sx) > 0 || Math.abs(drag.py - drag.sy) > 0) {
        createDoorFromLine({ x: drag.sx, y: drag.sy }, { x: drag.px, y: drag.py });
      } else {
        setDoorPreview(null);
        lastDoorPlacementRef.current = null;
      }
    }
    if (drag?.kind === "select-box") {
      const box = normalizeRect(drag.sx, drag.sy, drag.px, drag.py);
      const refs = [
        ...floorDevices
          .filter((device) => rectsIntersect(box, getDeviceHitBox(device)))
          .map((device) => ({ kind: "device" as const, id: device.id })),
        ...floorEls
          .filter((element) => rectsIntersect(box, getElementHitBox(element)))
          .map((element) => ({ kind: "element" as const, id: element.id })),
        ...floorConnections
          .filter((connection) =>
            cableSelectionHit(box, connection, getConnectionPathPoints(connection)),
          )
          .map((connection) => ({ kind: "connection" as const, id: connection.id })),
      ];
      if (refs.length > 0) {
        if (drag.additive) {
          selectItems([...selectedItems, ...refs]);
        } else {
          selectItems(refs);
        }
      } else if (!drag.additive) {
        clearSelection();
      }
    }
    if (drag?.kind === "pan") {
      persistViewport(vb);
    }
    setDoorPreview(null);
    setDrag(null);
  };

  const onMouseUp = () => {
    finishDrag();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "0" || e.code === "Digit0" || e.code === "Numpad0")) {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        fitActiveFloorViewport("ctrl0");
        return;
      }

      if (draftCable) {
        if (e.key === "Escape") {
          e.preventDefault();
          setDraftCable(null);
          setSelectedCableHandle(null);
          setHoverSegment(null);
          setMode("select");
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          const resolved = resolveCableEndpoint(draftCable.cursor);
          if (draftCable.start.deviceId || resolved.deviceId || draftCable.points.length > 0) {
            finalizeDraftCable(resolved);
          }
          return;
        }
        if (e.key === "Backspace") {
          e.preventDefault();
          setDraftCable((current) =>
            current && current.points.length > 0
              ? { ...current, points: current.points.slice(0, -1) }
              : current,
          );
          return;
        }
      }

      if (
        isEditMode &&
        selectedKind === "connection" &&
        selectedCableHandle?.kind === "point" &&
        selectedCableHandle.connectionId === selectedId &&
        (e.key === "Delete" || e.key === "Backspace")
      ) {
        e.preventDefault();
        removeSelectedConnectionPoint();
        return;
      }

      if (!isEditMode) return;
      if (isEditableTarget(e.target)) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (selectedKind === "object" && selectedId) {
          return;
        }
        if (selectedItems.length > 0) {
          removeSelectedItems();
          return;
        }
        if (selectedKind === "connection" && selectedId) removeDeviceConnection(selectedId);
        if (selectedKind === "device" && selectedId) removeDevice(selectedId);
        if (selectedKind === "element" && selectedId) removeElement(selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    draftCable,
    isEditMode,
    selectedCableHandle,
    selectedId,
    selectedKind,
    removeDevice,
    removeElement,
    removeDeviceConnection,
    removeSelectedConnectionPoint,
    setMode,
    selectedItems,
    removeSelectedItems,
    fitActiveFloorViewport,
  ]);

  useEffect(() => {
    if (!drag) return;
    setHoverConnection(null);
    setHoverSegment(null);
  }, [drag]);

  useEffect(() => {
    if (!drag) return;

    const onWindowMouseUp = (event: MouseEvent) => {
      if (svgRef.current?.contains(event.target as Node)) return;
      finishDrag();
    };

    window.addEventListener("mouseup", onWindowMouseUp);
    return () => window.removeEventListener("mouseup", onWindowMouseUp);
  }, [drag]);

  useEffect(() => {
    if (!isEditMode || mode !== "connector") {
      setDraftCable(null);
      setHoverSegment(null);
    }
  }, [isEditMode, mode]);

  useEffect(() => {
    if (!isEditMode || mode !== "door") {
      setDoorPreview(null);
      lastDoorPlacementRef.current = null;
    }
  }, [isEditMode, mode]);

  const textDraftId = textDraft?.id ?? null;
  const showIpLabels = settings.uiState?.showIpLabels ?? false;
  const showEmptyProjectState = objects.length === 0;

  useEffect(() => {
    if (!textDraftId) return;
    const frame = window.requestAnimationFrame(() => {
      textInputRef.current?.focus();
      textInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [textDraftId]);

  useEffect(() => {
    if (!isEditMode) {
      textDraftHandledRef.current = true;
      setTextDraft(null);
      return;
    }
    if (mode !== "text") {
      textDraftHandledRef.current = true;
      setTextDraft(null);
    }
  }, [isEditMode, mode]);

  useEffect(() => {
    if (
      !selectedCableHandle ||
      selectedKind !== "connection" ||
      selectedCableHandle.connectionId !== selectedId
    ) {
      setSelectedCableHandle(null);
    }
  }, [selectedCableHandle, selectedId, selectedKind]);

  useEffect(() => {
    if (highlightId) {
      const device = devices.find((item) => item.id === highlightId);
      if (device) {
        const next = { x: device.x - 400, y: device.y - 300, w: 800, h: 600 };
        setVb(next);
        persistViewport(next);
        select(device.id, "device");
      }
    }
  }, [highlightId, devices, select]);

  useLayoutEffect(() => {
    if (!isHydrated) return;
    const floorKey = activeFloorId ?? "no-floor";
    if (restoredViewportFloorRef.current === floorKey) return;
    restoredViewportFloorRef.current = floorKey;

    if (savedViewport && savedViewport.w > 0 && savedViewport.h > 0) {
      setVb(savedViewport);
      return;
    }

    if (!activeFloorId) {
      setVb({ x: 0, y: 0, w: BASE_W, h: BASE_H });
      return;
    }

    const { bounds } = getViewportFitBounds(floorEls, floorDevices, floorConnections);
    if (!bounds) {
      setVb({ x: 0, y: 0, w: BASE_W, h: BASE_H });
      return;
    }

    const fit = fitBoundsToViewport(bounds, getCanvasFitMetrics());
    setVb(fit.viewBox);
    persistViewport(fit.viewBox);
  }, [
    activeFloorId,
    floorEls,
    floorDevices,
    floorConnections,
    isHydrated,
    savedViewport,
  ]);

  const handleElClick = (e: MouseEvent<SVGGElement>, element: MapElement) => {
    e.stopPropagation();
    if (isEditMode && mode === "room") {
      const pt = toSvg(e.clientX, e.clientY);
      const snapped = { x: snapGrid(pt.x), y: snapGrid(pt.y) };
      setDrag({ kind: "draw-room", sx: snapped.x, sy: snapped.y, px: snapped.x, py: snapped.y });
      return;
    }
    if (isEditMode && (mode === "wall" || mode === "curved_wall")) {
      startWallDraft(toSvg(e.clientX, e.clientY), mode === "curved_wall");
      return;
    }
    if (mode === "delete" && isLockedObject(element.locked) && !e.altKey) return;
    if (mode === "delete") {
      removeElement(element.id);
      return;
    }
    if (mode === "door" && (element.type === "wall" || element.type === "room")) {
      const pt = toSvg(e.clientX, e.clientY);
      const placement = getDoorPlacementFromPoint(pt, [element]);
      if (placement) {
        lastDoorPlacementRef.current = placement;
        setDoorPreview(placement);
        setDrag({ kind: "draw-door", sx: pt.x, sy: pt.y, px: pt.x, py: pt.y });
      }
      return;
    }
    if (mode !== "select") return;
    if (isEditMode && e.ctrlKey) {
      toggleSelection(element.id, "element");
      return;
    }
    select(element.id, "element");
    if (isEditMode && mode === "select") {
      if (isLockedObject(element.locked)) return;
      const pt = toSvg(e.clientX, e.clientY);
      const groupId = element.groupId ?? null;
      const isSelected = selectedLookup.has(`element:${element.id}`);
      if (selectedItems.length > 1 && isSelected) {
        setDrag({
          kind: "move-selection",
          items: selectedItems.filter(
            (item): item is { kind: "device" | "element"; id: string } =>
              item.kind === "device" || item.kind === "element",
          ),
          lastDx: 0,
          lastDy: 0,
          sx: pt.x,
          sy: pt.y,
        });
        return;
      }
      if (groupId) {
        setDrag({ kind: "move-group", groupId, lastDx: 0, lastDy: 0, sx: pt.x, sy: pt.y });
        return;
      }
      setDrag({ kind: "move-el", id: element.id, dx: pt.x - element.x, dy: pt.y - element.y });
    }
  };

  const handleDeviceMouseDown = (e: MouseEvent<SVGGElement>, device: Device) => {
    e.stopPropagation();
    if (isEditMode && (mode === "wall" || mode === "curved_wall")) {
      startWallDraft(toSvg(e.clientX, e.clientY), mode === "curved_wall");
      return;
    }
    if (mode === "delete" && isLockedObject(device.locked) && !e.altKey) return;
    if (mode === "delete") {
      removeDevice(device.id);
      return;
    }
    if (mode === "connector" && isEditMode) {
      const pt = toSvg(e.clientX, e.clientY);
      if (!draftCable) {
        setDraftCable(startDraftCable(pt));
      } else if (draftCable.start.deviceId !== device.id) {
        if (e.detail >= 2) {
          finalizeDraftCable(resolveCableEndpoint(pt));
        } else {
          appendDraftPoint(pt);
        }
      } else if (e.detail >= 2) {
        finalizeDraftCable(resolveCableEndpoint(pt));
      } else {
        appendDraftPoint(pt);
      }
      setDraftCable((current) =>
        current
          ? {
              ...current,
              hoverDeviceId: device.id,
            }
          : current,
      );
      return;
    }
    if (mode !== "select") return;
    if (isEditMode && e.ctrlKey) {
      toggleSelection(device.id, "device");
      return;
    }
    if (isEditMode && selectedKind === "connection" && selectedId) {
      const selectedConnection = floorConnections.find((item) => item.id === selectedId);
      const endpoint =
        selectedConnection?.from.deviceId === device.id
          ? "from"
          : selectedConnection?.to.deviceId === device.id
            ? "to"
            : null;
      if (selectedConnection && endpoint && !isLockedObject(selectedConnection.locked)) {
        setSelectedCableHandle({
          connectionId: selectedConnection.id,
          kind: "point",
          index: endpoint === "from" ? 0 : selectedConnection.points.length + 1,
        });
        select(selectedConnection.id, "connection");
        setDrag({ kind: "move-cable-endpoint", id: selectedConnection.id, endpoint });
        return;
      }
    }
    select(device.id, "device");
    if (isEditMode && mode === "select") {
      if (isLockedObject(device.locked)) return;
      const pt = toSvg(e.clientX, e.clientY);
      const groupId = device.groupId ?? null;
      const isSelected = selectedLookup.has(`device:${device.id}`);
      if (selectedItems.length > 1 && isSelected) {
        setDrag({
          kind: "move-selection",
          items: selectedItems.filter(
            (item): item is { kind: "device" | "element"; id: string } =>
              item.kind === "device" || item.kind === "element",
          ),
          lastDx: 0,
          lastDy: 0,
          sx: pt.x,
          sy: pt.y,
        });
        return;
      }
      if (groupId) {
        setDrag({ kind: "move-group", groupId, lastDx: 0, lastDy: 0, sx: pt.x, sy: pt.y });
        return;
      }
      setDrag({ kind: "move-dev", id: device.id, dx: pt.x - device.x, dy: pt.y - device.y });
    }
  };

  const renderLockGlyph = (x: number, y: number) => (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <rect x={0} y={5} width={8} height={7} rx={1.5} fill="#6b7280" />
      <path
        d="M2 5 V3.5 C2 1.5 6 1.5 6 3.5 V5"
        fill="none"
        stroke="#6b7280"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </g>
  );

  const renderDevice = (device: Device) => {
    const isSel = selectedLookup.has(`device:${device.id}`);
    const isHl = highlightId === device.id;
    const isSnap = draftCable?.hoverDeviceId === device.id;
    const color = statusColors[device.status];
    const size = deviceSizes[device.type];
    const ipLabel = device.ip?.trim();
    const renderIpLabel = (y: number) =>
      showIpLabels && ipLabel ? (
        <g pointerEvents="none">
          <rect
            x={device.x - 42}
            y={y - 13}
            width={84}
            height={18}
            rx={4}
            fill="white"
            fillOpacity={0.94}
            stroke="#cbd5e1"
            strokeWidth={1}
          />
          <text
            x={device.x}
            y={y}
            textAnchor="middle"
            fontSize={10}
            fill="#0f172a"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
            fontWeight={700}
          >
            {ipLabel}
          </text>
        </g>
      ) : null;

    if (device.type === "camera") {
      const half = (device.fovAngle ?? 90) / 2;
      const rotation = device.rotation ?? 0;
      const fovDistance = device.fovDistance ?? 150;
      const fovAngle = device.fovAngle ?? 90;
      const a1 = ((rotation - half) * Math.PI) / 180;
      const a2 = ((rotation + half) * Math.PI) / 180;
      const x1 = device.x + Math.cos(a1) * fovDistance;
      const y1 = device.y + Math.sin(a1) * fovDistance;
      const x2 = device.x + Math.cos(a2) * fovDistance;
      const y2 = device.y + Math.sin(a2) * fovDistance;
      const largeArc = fovAngle > 180 ? 1 : 0;
      const conePath =
        fovAngle >= 360
          ? `M ${device.x - fovDistance} ${device.y} a ${fovDistance} ${fovDistance} 0 1 0 ${fovDistance * 2} 0 a ${fovDistance} ${fovDistance} 0 1 0 -${fovDistance * 2} 0`
          : `M ${device.x} ${device.y} L ${x1} ${y1} A ${fovDistance} ${fovDistance} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      return (
        <g key={device.id}>
          <path
            d={conePath}
            fill={color}
            fillOpacity={isSel ? 0.3 : 0.15}
            stroke={color}
            strokeOpacity={0.4}
            onMouseDown={(e) => handleDeviceMouseDown(e, device)}
          />
          {(isSel || isHl) && (
            <circle
              cx={device.x}
              cy={device.y}
              r={18}
              fill="none"
              stroke="#2563eb"
              strokeWidth={2}
              strokeOpacity={0.7}
              pointerEvents="none"
            />
          )}
          <g
            onMouseDown={(e) => handleDeviceMouseDown(e, device)}
            onMouseEnter={() => setHover(device)}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: getMoveTargetCursor(device.locked) }}
          >
            <circle
              cx={device.x}
              cy={device.y}
              r={22}
              fill="transparent"
              onMouseDown={(e) => handleDeviceMouseDown(e, device)}
            />
            <circle
              cx={device.x}
              cy={device.y}
              r={isSel || isHl ? 14 : 12}
              fill={color}
              stroke={isSel || isHl || isSnap ? "#0f172a" : "white"}
              strokeWidth={isSel || isHl || isSnap ? 3.5 : 2}
            />
            <text
              x={device.x}
              y={device.y + 3}
              textAnchor="middle"
              fontSize={7}
              fill="white"
              fontWeight={700}
            >
              CAM
            </text>
            {device.locked && (isSel || isEditMode) && (
              <g transform={`translate(${device.x + 10} ${device.y - 18})`} pointerEvents="none">
                <rect x={0} y={5} width={8} height={7} rx={1.5} fill="#6b7280" />
                <path
                  d="M2 5 V3.5 C2 1.5 6 1.5 6 3.5 V5"
                  fill="none"
                  stroke="#6b7280"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                />
              </g>
            )}
            {(device.ip === "" || device.password === "") && (
              <circle
                cx={device.x + 10}
                cy={device.y - 10}
                r={5}
                fill="#f59e0b"
                stroke="white"
                strokeWidth={1.5}
              />
            )}
          </g>
          {isEditMode && isSel && (
            <circle
              cx={device.x + Math.cos(((device.rotation ?? 0) * Math.PI) / 180) * 30}
              cy={device.y + Math.sin(((device.rotation ?? 0) * Math.PI) / 180) * 30}
              r={6}
              fill="#2563eb"
              stroke="white"
              strokeWidth={2}
              style={{ cursor: "grab" }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setDrag({ kind: "rotate-dev", id: device.id, cx: device.x, cy: device.y });
              }}
            />
          )}
          {renderIpLabel(device.y + 34)}
        </g>
      );
    }

    const label =
      device.type === "nvr"
        ? "NVR"
        : device.type === "dvr"
          ? "DVR"
          : device.type === "poe_switch"
            ? "PoE"
            : "SW";
    const innerLabel = device.type === "poe_switch" ? "P" : device.type === "switch" ? "S" : "D";

    return (
      <g key={device.id}>
        <rect
          x={device.x - size.width / 2}
          y={device.y - size.height / 2}
          width={size.width}
          height={size.height}
          rx={8}
          fill={color}
          fillOpacity={0.18}
          stroke={isSel || isHl ? "#0f172a" : color}
          strokeWidth={isSel || isHl || isSnap ? 2.8 : 1.5}
        />
        {(isSel || isHl) && (
          <rect
            x={device.x - size.width / 2 - 4}
            y={device.y - size.height / 2 - 4}
            width={size.width + 8}
            height={size.height + 8}
            rx={10}
            fill="none"
            stroke="#2563eb"
            strokeWidth={2}
            strokeOpacity={0.7}
            pointerEvents="none"
          />
        )}
        <g
          onMouseDown={(e) => handleDeviceMouseDown(e, device)}
          onMouseEnter={() => setHover(device)}
          onMouseLeave={() => setHover(null)}
          style={{ cursor: getMoveTargetCursor(device.locked) }}
        >
          <rect
            x={device.x - size.width / 2 - 2}
            y={device.y - size.height / 2 - 2}
            width={size.width + 4}
            height={size.height + 4}
            rx={10}
            fill="transparent"
            onMouseDown={(e) => handleDeviceMouseDown(e, device)}
          />
          <circle
            cx={device.x - size.width / 2 + 14}
            cy={device.y - size.height / 2 + 14}
            r={8}
            fill={color}
          />
          <text
            x={device.x - size.width / 2 + 14}
            y={device.y - size.height / 2 + 18}
            textAnchor="middle"
            fontSize={8}
            fill="white"
            fontWeight={800}
          >
            {innerLabel}
          </text>
          <text
            x={device.x}
            y={device.y + 4}
            textAnchor="middle"
            fontSize={11}
            fill="#0f172a"
            fontWeight={700}
          >
            {label}
          </text>
          {device.locked && (isSel || isEditMode) && (
            <g
              transform={`translate(${device.x + size.width / 2 - 15} ${device.y - size.height / 2 + 4})`}
              pointerEvents="none"
            >
              <rect x={0} y={5} width={8} height={7} rx={1.5} fill="#6b7280" />
              <path
                d="M2 5 V3.5 C2 1.5 6 1.5 6 3.5 V5"
                fill="none"
                stroke="#6b7280"
                strokeWidth={1.2}
                strokeLinecap="round"
              />
            </g>
          )}
        </g>
        {renderIpLabel(device.y + size.height / 2 + 20)}
      </g>
    );
  };

  return (
    <div ref={canvasWrapRef} className="relative h-full min-h-0 overflow-hidden bg-muted/30">
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleProjectFileChange}
      />
      {showEmptyProjectState ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
          <div className="max-w-md rounded-xl border bg-background/90 px-6 py-5 text-center shadow-sm backdrop-blur-sm">
            <div className="text-lg font-semibold text-foreground">Проект не выбран</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Чтобы начать, нажмите «Редактирование» в верхней панели и создайте первый объект в левой панели.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Или нажмите «+» и откройте уже сохраненный проект с компьютера.
            </p>
            <div className="mt-4 flex justify-center">
              <Button type="button" onClick={openProject} className="min-w-40 gap-2">
                <Plus className="h-4 w-4" />
                Открыть проект
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Объекты и этажи появятся в левой панели.
            </p>
        </div>
      </div>
      ) : (
        !activeFloorId && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            Выберите объект и зону слева
          </div>
        )
      )}

      <svg
        ref={svgRef}
        id="plan-canvas-svg"
        tabIndex={-1}
        className="absolute inset-0 block w-full h-full select-none"
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onDoubleClick={(e) => {
          if (!draftCable || mode !== "connector" || !isEditMode) return;
          e.preventDefault();
          const pt = getDraftPreviewPoint(draftCable, toSvg(e.clientX, e.clientY));
          finalizeDraftCable(pt);
        }}
        style={{
          cursor: getCanvasCursor(),
        }}
      >
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
          </pattern>
          <pattern id="grid-lg" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="url(#grid)" />
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#cbd5e1" strokeWidth="1" />
          </pattern>
        </defs>
        <rect
          x={vb.x}
          y={vb.y}
          width={vb.w}
          height={vb.h}
          fill="url(#grid-lg)"
          pointerEvents="none"
        />

        {floorEls.map((element) => {
          const isSel = selectedLookup.has(`element:${element.id}`);
          const isLocked = isLockedObject(element.locked);
          const stroke = getElementStroke(element);

          if (element.type === "text") {
            const fontSize = element.fontSize ?? DEFAULT_TEXT_FONT_SIZE;
            const { width, height } = getTextElementBounds(element.label, fontSize);
            return (
              <g
                key={element.id}
                onMouseDown={(e) => handleElClick(e, element)}
                style={{ cursor: getMoveTargetCursor(isLocked) }}
              >
                <text
                  x={element.x}
                  y={element.y}
                  fontSize={fontSize}
                  fill={stroke}
                  fontWeight={500}
                >
                  {element.label}
                </text>
                {isSel && (
                  <rect
                    x={element.x - 4}
                    y={element.y - height + 8}
                    width={width}
                    height={height}
                    fill="none"
                    stroke={isLocked ? "#94a3b8" : "#2563eb"}
                    strokeDasharray="4 2"
                    pointerEvents="none"
                  />
                )}
                {(isSel || isEditMode) &&
                  isLocked &&
                  renderLockGlyph(element.x + width - 16, element.y - height - 4)}
              </g>
            );
          }

          if (element.type === "room") {
            const lineWidth = getElementStrokeWidth(element);
            return (
              <g
                key={element.id}
                onMouseDown={(e) => handleElClick(e, element)}
                style={{ cursor: getMoveTargetCursor(isLocked) }}
              >
                <rect
                  x={element.x}
                  y={element.y}
                  width={element.width}
                  height={element.height}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  pointerEvents="stroke"
                />
                <rect
                  x={element.x}
                  y={element.y}
                  width={element.width}
                  height={element.height}
                  fill="none"
                  stroke={isSel ? "#2563eb" : stroke}
                  strokeWidth={isSel ? lineWidth + 1.5 : lineWidth}
                  pointerEvents="none"
                />
                {element.label && (
                  <text
                    x={element.x + element.width / 2}
                    y={element.y + 20}
                    textAnchor="middle"
                    fontSize={13}
                    fill="#0f172a"
                    fontWeight={600}
                  >
                    {element.label}
                  </text>
                )}
                {isSel && isEditMode && !isLocked && (
                  <>
                    {[
                      { handle: "nw", x: element.x - 6, y: element.y - 6, cursor: "nwse-resize" },
                      {
                        handle: "n",
                        x: element.x + element.width / 2 - 6,
                        y: element.y - 6,
                        cursor: "ns-resize",
                      },
                      {
                        handle: "ne",
                        x: element.x + element.width - 6,
                        y: element.y - 6,
                        cursor: "nesw-resize",
                      },
                      {
                        handle: "e",
                        x: element.x + element.width - 6,
                        y: element.y + element.height / 2 - 6,
                        cursor: "ew-resize",
                      },
                      {
                        handle: "se",
                        x: element.x + element.width - 6,
                        y: element.y + element.height - 6,
                        cursor: "nwse-resize",
                      },
                      {
                        handle: "s",
                        x: element.x + element.width / 2 - 6,
                        y: element.y + element.height - 6,
                        cursor: "ns-resize",
                      },
                      {
                        handle: "sw",
                        x: element.x - 6,
                        y: element.y + element.height - 6,
                        cursor: "nesw-resize",
                      },
                      {
                        handle: "w",
                        x: element.x - 6,
                        y: element.y + element.height / 2 - 6,
                        cursor: "ew-resize",
                      },
                    ].map((handle) => (
                      <rect
                        key={handle.handle}
                        x={handle.x}
                        y={handle.y}
                        width={12}
                        height={12}
                        fill="#2563eb"
                        style={{ cursor: handle.cursor }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          const pt = toSvg(e.clientX, e.clientY);
                          setDrag({
                            kind: "resize-el",
                            id: element.id,
                            handle: handle.handle as
                              | "nw"
                              | "n"
                              | "ne"
                              | "e"
                              | "se"
                              | "s"
                              | "sw"
                              | "w",
                            sx: pt.x,
                            sy: pt.y,
                            ox: element.x,
                            oy: element.y,
                            ow: element.width,
                            oh: element.height,
                          });
                        }}
                      />
                    ))}
                  </>
                )}
                {(isSel || isEditMode) &&
                  isLocked &&
                  renderLockGlyph(element.x + element.width - 16, element.y + 4)}
              </g>
            );
          }

          if (element.type === "wall") {
            const lineWidth = getElementStrokeWidth(element);
            const wallPath = getWallPath(element);
            const { start, end } = getWallEndpoints(element);
            const lockPoint =
              element.wallShape === "arc"
                ? getCurvedWallControlPoint(element)
                : { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
            return (
              <g
                key={element.id}
                onMouseDown={(e) => handleElClick(e, element)}
                style={{ cursor: getMoveTargetCursor(isLocked) }}
              >
                <path
                  d={wallPath}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  pointerEvents="stroke"
                />
                <path
                  d={wallPath}
                  fill="none"
                  stroke={isSel ? "#2563eb" : stroke}
                  strokeWidth={isSel ? lineWidth + 1 : lineWidth}
                  strokeLinecap="round"
                  pointerEvents="none"
                />
                {isSel &&
                  isEditMode &&
                  !isLocked &&
                  ([
                    ["start", start],
                    ["end", end],
                  ] as const).map(([endpoint, point]) => (
                    <rect
                      key={endpoint}
                      x={point.x - 6}
                      y={point.y - 6}
                      width={12}
                      height={12}
                      fill="#2563eb"
                      style={{ cursor: "move" }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDrag({
                          kind: "rotate-wall-end",
                          endpoint,
                          id: element.id,
                          ox: element.x,
                          oy: element.y,
                          ow: element.width,
                          oh: element.height,
                          curveOffset:
                            element.curveOffset ??
                            Math.max(20, Math.hypot(element.width, element.height) / 2),
                        });
                      }}
                    />
                  ))}
                {(isSel || isEditMode) && isLocked && renderLockGlyph(lockPoint.x - 4, lockPoint.y - 20)}
              </g>
            );
          }

          const doorPath = getDoorPath(element);
          const axis = getDoorAxis(element);
          const lineY = axis === "horizontal" ? element.y + element.height / 2 : null;
          const lineX = axis === "vertical" ? element.x + element.width / 2 : null;
          const doorTransform = getDoorRotationTransform(element);
          return (
            <g
              key={element.id}
              onMouseDown={(e) => handleElClick(e, element)}
              style={{ cursor: getMoveTargetCursor(isLocked) }}
            >
              <g transform={doorTransform}>
                <path
                  d={doorPath}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  pointerEvents="stroke"
                />
                {axis === "horizontal" ? (
                  <line
                    x1={element.x + 8}
                    y1={lineY ?? 0}
                    x2={element.x + element.width - 8}
                    y2={lineY ?? 0}
                    stroke={isSel ? "#2563eb" : stroke}
                    strokeWidth={isSel ? 3 : 2}
                    pointerEvents="none"
                  />
                ) : (
                  <line
                    x1={lineX ?? 0}
                    y1={element.y + 8}
                    x2={lineX ?? 0}
                    y2={element.y + element.height - 8}
                    stroke={isSel ? "#2563eb" : stroke}
                    strokeWidth={isSel ? 3 : 2}
                    pointerEvents="none"
                  />
                )}
                <path
                  d={doorPath}
                  fill="none"
                  stroke={isSel ? "#2563eb" : stroke}
                  strokeWidth={isSel ? 3 : 2}
                  pointerEvents="none"
                />
                {isSel && isEditMode && !isLocked && (
                  <rect
                    x={
                      axis === "horizontal"
                        ? element.x + element.width - 6
                        : element.x + element.width / 2 - 6
                    }
                    y={
                      axis === "horizontal"
                        ? element.y + element.height / 2 - 6
                        : element.y + element.height - 6
                    }
                    width={12}
                    height={12}
                    fill="#2563eb"
                    style={{ cursor: "nwse-resize" }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      const pt = toSvg(e.clientX, e.clientY);
                      setDrag({
                        kind: "resize-el",
                        id: element.id,
                        handle: "se",
                        sx: pt.x,
                        sy: pt.y,
                        ox: element.x,
                        oy: element.y,
                        ow: element.width,
                        oh: element.height,
                      });
                    }}
                  />
                )}
                {(isSel || isEditMode) &&
                  isLocked &&
                  renderLockGlyph(element.x + element.width / 2 - 4, element.y + element.height / 2 - 20)}
              </g>
            </g>
          );
        })}

        {drag?.kind === "draw-room" && (
          <rect
            x={Math.min(drag.sx, drag.px)}
            y={Math.min(drag.sy, drag.py)}
            width={Math.max(20, Math.abs(drag.px - drag.sx))}
            height={Math.max(20, Math.abs(drag.py - drag.sy))}
            fill={defaultRoomFill}
            fillOpacity={0.18}
            stroke="#2563eb"
            strokeWidth={2}
            strokeDasharray="6 4"
            pointerEvents="none"
          />
        )}

        {drag?.kind === "draw-door" &&
          !doorPreview &&
          (() => {
            const previewX = Math.min(drag.sx, drag.px);
            const previewY = Math.min(drag.sy, drag.py);
            const previewWidth = Math.max(40, Math.abs(drag.px - drag.sx));
            const previewHeight = Math.max(40, Math.abs(drag.py - drag.sy));
            const horizontal = Math.abs(drag.px - drag.sx) >= Math.abs(drag.py - drag.sy);
            const side = horizontal
              ? drag.py < drag.sy
                ? "top"
                : "bottom"
              : drag.px < drag.sx
                ? "left"
                : "right";
            const doorPath = getDoorPath({
              x: horizontal ? previewX : drag.sx - 20,
              y: horizontal ? drag.sy - 20 : previewY,
              width: horizontal ? previewWidth : 40,
              height: horizontal ? 40 : previewHeight,
              doorAxis: horizontal ? "horizontal" : "vertical",
              doorSide: side,
            });
            const lineY = horizontal ? drag.sy : null;
            const lineX = horizontal ? null : drag.sx;
            return (
              <g pointerEvents="none">
                <path
                  d={doorPath}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth={3}
                  strokeDasharray="6 4"
                />
                {horizontal ? (
                  <line
                    x1={previewX + 8}
                    y1={lineY ?? 0}
                    x2={previewX + previewWidth - 8}
                    y2={lineY ?? 0}
                    stroke="#2563eb"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                ) : (
                  <line
                    x1={lineX ?? 0}
                    y1={previewY + 8}
                    x2={lineX ?? 0}
                    y2={previewY + previewHeight - 8}
                    stroke="#2563eb"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                )}
              </g>
            );
          })()}

        {doorPreview && !drag && (
          <g pointerEvents="none" transform={getDoorRotationTransform(doorPreview)}>
            <path
              d={getDoorPath(doorPreview)}
              fill="none"
              stroke="#2563eb"
              strokeWidth={3}
              strokeDasharray="6 4"
            />
            {doorPreview.doorAxis === "horizontal" ? (
              <line
                x1={doorPreview.x + 8}
                y1={doorPreview.y + doorPreview.height / 2}
                x2={doorPreview.x + doorPreview.width - 8}
                y2={doorPreview.y + doorPreview.height / 2}
                stroke="#2563eb"
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            ) : (
              <line
                x1={doorPreview.x + doorPreview.width / 2}
                y1={doorPreview.y + 8}
                x2={doorPreview.x + doorPreview.width / 2}
                y2={doorPreview.y + doorPreview.height - 8}
                stroke="#2563eb"
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            )}
          </g>
        )}

        {drag?.kind === "select-box" && (
          <rect
            x={Math.min(drag.sx, drag.px)}
            y={Math.min(drag.sy, drag.py)}
            width={Math.max(1, Math.abs(drag.px - drag.sx))}
            height={Math.max(1, Math.abs(drag.py - drag.sy))}
            fill="#2563eb"
            fillOpacity={0.08}
            stroke="#2563eb"
            strokeWidth={1.5}
            strokeDasharray="8 4"
            pointerEvents="none"
          />
        )}

        {floorConnections.map((connection) => {
          const points = getConnectionPathPoints(connection);
          const path = buildCablePath(points[0], connection.points, points[points.length - 1]);
          const labelPlacement = getPolylineLabelPlacement(points, 0.25);
          const style = cableStyles[connection.type];
          const stroke = getConnectionStroke(connection);
          const isSel = selectedConnectionIds.has(connection.id);
          const isHovered = !drag && hoverConnection?.id === connection.id;
          const isLocked = isLockedObject(connection.locked);
          const canEditConnection = isEditMode && isSel && !isLocked;
          return (
            <g key={connection.id}>
              <path
                d={path}
                fill="none"
                stroke={stroke}
                strokeWidth={isSel ? style.width + 1.5 : style.width}
                strokeDasharray={style.dash}
                opacity={isSel || isHovered ? 1 : 0.8}
                pointerEvents="none"
              />
              {points.slice(0, -1).map((start, index) => {
                const end = points[index + 1];
                const hoveredSegment =
                  !drag &&
                  hoverSegment?.connectionId === connection.id &&
                  hoverSegment.index === index;
                const segmentPath = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
                return (
                  <path
                    key={`${connection.id}-segment-${index}`}
                    d={segmentPath}
                    fill="none"
                    stroke={hoveredSegment ? "#93c5fd" : "transparent"}
                    strokeWidth={16}
                    opacity={hoveredSegment ? 0.35 : 0}
                    pointerEvents="stroke"
                    style={{ cursor: "default" }}
                    onMouseEnter={() => {
                      if (drag) return;
                      setHoverConnection(connection);
                      setHoverSegment({ connectionId: connection.id, index });
                    }}
                    onMouseLeave={() => {
                      setHoverConnection((current) =>
                        current?.id === connection.id ? null : current,
                      );
                      setHoverSegment((current) =>
                        current?.connectionId === connection.id && current.index === index
                          ? null
                          : current,
                      );
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      if (isLocked && !e.altKey) return;
                      select(connection.id, "connection");
                      setSelectedCableHandle(null);
                      if (!isEditMode) return;
                      if (e.ctrlKey) {
                        insertConnectionPoint(connection.id, index, toSvg(e.clientX, e.clientY));
                      }
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (!isEditMode || (isLocked && !e.altKey)) return;
                      insertConnectionPoint(connection.id, index, toSvg(e.clientX, e.clientY));
                    }}
                  />
                );
              })}
              {canEditConnection &&
                points.map((point, index) => {
                  const isStart = index === 0;
                  const isEnd = index === points.length - 1;
                  const isIntermediate = !isStart && !isEnd;
                  const handleSelected =
                    selectedCableHandle?.connectionId === connection.id &&
                    selectedCableHandle.kind === "point" &&
                    selectedCableHandle.index === index;
                  const handleMouseDown = (e: MouseEvent<SVGCircleElement>) => {
                    e.stopPropagation();
                    if (isStart || isEnd) {
                      setDrag({
                        kind: "move-cable-endpoint",
                        id: connection.id,
                        endpoint: isStart ? "from" : "to",
                      });
                      setSelectedCableHandle({
                        connectionId: connection.id,
                        kind: "point",
                        index,
                      });
                      select(connection.id, "connection");
                      return;
                    }
                    setDrag({ kind: "move-pt", id: connection.id, index: index - 1 });
                    setSelectedCableHandle({
                      connectionId: connection.id,
                      kind: "point",
                      index,
                    });
                  };
                  return (
                    <g key={`${connection.id}-handle-${index}`} style={{ cursor: "default" }}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={12}
                        fill="transparent"
                        style={{ cursor: "default" }}
                        onMouseDown={handleMouseDown}
                      />
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={handleSelected ? 6 : isIntermediate ? 4.5 : 5}
                        fill={handleSelected ? "#60a5fa" : "#fff"}
                        stroke={stroke}
                        strokeWidth={handleSelected ? 3 : 2}
                        pointerEvents="none"
                      />
                    </g>
                  );
                })}
              <g
                transform={`translate(${labelPlacement.x} ${labelPlacement.y}) rotate(${labelPlacement.angle})`}
              >
                <text x={0} y={-6} textAnchor="middle" fontSize={10} fill={stroke} fontWeight={700}>
                  {cableLabels[connection.type]}
                </text>
              </g>
              {isLocked &&
                (isSel || isEditMode) &&
                renderLockGlyph(labelPlacement.x + 14, labelPlacement.y - 16)}
            </g>
          );
        })}

        {draftCable && (
          <path
            d={buildCablePath(draftCable.start, draftCable.points, draftCable.cursor)}
            fill="none"
            stroke={cableStyles[draftCable.type].stroke}
            strokeWidth={cableStyles[draftCable.type].width}
            strokeDasharray="4 3"
            opacity={0.6}
            pointerEvents="none"
          />
        )}

        {floorDevices.map((device) => renderDevice(device))}
      </svg>

      {textDraft && textDraftPoint && (
        <div
          className="absolute z-20 flex items-center gap-1"
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            left: `${textDraftPoint.left}px`,
            top: `${textDraftPoint.top}px`,
            transform: "translate(-4px, -50%)",
          }}
        >
          <Input
            ref={textInputRef}
            value={textDraftValue}
            onChange={(e) => setTextDraftValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                finishTextDraft(true);
              }
              if (e.key === "Escape") {
                e.preventDefault();
                finishTextDraft(false);
              }
            }}
            onBlur={() => finishTextDraft(true)}
            placeholder="Введите текст"
            className="h-8 w-56 border-blue-500 bg-background shadow-lg"
          />
        </div>
      )}

      {hover && (
        <div className="absolute bottom-3 left-3 bg-card border rounded-md shadow-md px-3 py-2 text-xs pointer-events-none">
          <div className="font-semibold">{hover.name}</div>
          <div className="text-muted-foreground">
            {deviceTypeLabels[hover.type]} • {hover.ip || "Без IP"} • {hover.status}
          </div>
        </div>
      )}

      {hoverConnection && !drag && (
        <div className="absolute bottom-16 left-3 bg-card border rounded-md shadow-md px-3 py-2 text-xs pointer-events-none max-w-xs">
          <div className="font-semibold">{cableLabels[hoverConnection.type]}</div>
          <div className="text-muted-foreground">
            {devices.find((item) => item.id === hoverConnection.from.deviceId)?.name ?? "Точка A"} →
            {devices.find((item) => item.id === hoverConnection.to.deviceId)?.name ?? "Точка B"}
          </div>
          {hoverConnection.notes && (
            <div className="mt-1 text-muted-foreground">{hoverConnection.notes}</div>
          )}
        </div>
      )}

      <div className="absolute bottom-3 right-3 bg-card border rounded-md shadow-sm px-2 py-1 flex gap-1 text-xs">
        <button
          className="px-2 py-1 hover:bg-accent rounded"
          onClick={() => applyViewportZoom(0.75)}
        >
          +
        </button>
        <button
          className="px-2 py-1 hover:bg-accent rounded"
          onClick={() => applyViewportZoom(1.25)}
        >
          -
        </button>
        <button
          className="px-2 py-1 hover:bg-accent rounded"
          onClick={resetViewportToFit}
        >
          Сброс
        </button>
      </div>

      <div className="absolute top-2 left-16 bg-card border rounded-md px-2 py-1 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{canvasContextLabel || "Без объекта"}</span>
      </div>
    </div>
  );
}
