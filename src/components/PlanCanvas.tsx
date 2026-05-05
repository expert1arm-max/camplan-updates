import { useEffect, useRef, useState, type MouseEvent, type WheelEvent } from "react";
import { deviceTypeLabels, statusColors, useStore } from "@/data/store";
import type { CableAnchor, CablePoint, CableType, Device, DeviceConnection, DeviceType, MapElement } from "@/types";

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const BASE_W = 1400;
const BASE_H = 900;
const GRID_SIZE = 20;
const DEVICE_SNAP_DISTANCE = 24;

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
  utp: { stroke: "#334155", width: 2 },
  ftp: { stroke: "#1d4ed8", dash: "6 3", width: 2 },
  coaxial: { stroke: "#6b21a8", width: 3.5 },
  power: { stroke: "#b45309", dash: "2 2", width: 3 },
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

function buildCablePath(start: { x: number; y: number }, points: CablePoint[], end: { x: number; y: number }) {
  const segments = [`M ${start.x} ${start.y}`];
  for (const point of points) {
    segments.push(`L ${point.x} ${point.y}`);
  }
  segments.push(`L ${end.x} ${end.y}`);
  return segments.join(" ");
}

export function PlanCanvas({ highlightId }: { highlightId: string | null }) {
  const {
    activeFloorId,
    activeObjectId,
    mapElements,
    devices,
    deviceConnections,
    isEditMode,
    mode,
    setMode,
    currentCableType,
    setCableType,
    selectedId,
    selectedKind,
    select,
    addElement,
    addDevice,
    addDeviceConnection,
    updateDeviceConnection,
    updateElement,
    updateDevice,
    removeElement,
    removeDevice,
    removeDeviceConnection,
  } = useStore();

  const svgRef = useRef<SVGSVGElement>(null);
  const [vb, setVb] = useState<ViewBox>({ x: 0, y: 0, w: BASE_W, h: BASE_H });
  const [hover, setHover] = useState<Device | null>(null);
  const [hoverConnection, setHoverConnection] = useState<DeviceConnection | null>(null);
  const [draftCable, setDraftCable] = useState<{
    type: CableType;
    start: { deviceId?: string; anchor: CableAnchor; x: number; y: number };
    points: CablePoint[];
    cursor: { x: number; y: number };
    hoverDeviceId?: string;
  } | null>(null);
  const [drag, setDrag] = useState<
    | { kind: "pan"; sx: number; sy: number; ovb: ViewBox }
    | { kind: "move-el"; id: string; dx: number; dy: number }
    | { kind: "move-dev"; id: string; dx: number; dy: number }
    | { kind: "move-pt"; id: string; index: number }
    | { kind: "resize-el"; id: string; sx: number; sy: number; ow: number; oh: number }
    | { kind: "rotate-dev"; id: string; cx: number; cy: number }
    | { kind: "draw-room"; sx: number; sy: number; id: string }
    | null
  >(null);

  const floorEls = mapElements.filter((element) => element.floorId === activeFloorId);
  const floorDevices = devices.filter((device) => device.floorId === activeFloorId);
  const floorConnections = deviceConnections.filter((connection) => connection.floorId === activeFloorId);

  const isEditableTarget = (target: EventTarget | null) =>
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable);

  const toSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = vb.x + ((clientX - rect.left) / rect.width) * vb.w;
    const y = vb.y + ((clientY - rect.top) / rect.height) * vb.h;
    return { x, y };
  };

  const onWheel = (e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    const { x, y } = toSvg(e.clientX, e.clientY);
    const newW = Math.max(200, Math.min(5000, vb.w * factor));
    const newH = (newW / vb.w) * vb.h;
    setVb({
      x: x - (x - vb.x) * (newW / vb.w),
      y: y - (y - vb.y) * (newW / vb.w),
      w: newW,
      h: newH,
    });
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

  const getCableStart = (device: Device, point: { x: number; y: number }) => {
    const nearest = getNearestAnchor(device, point);
    return {
      deviceId: device.id,
      anchor: nearest.anchor,
      x: nearest.x,
      y: nearest.y,
    };
  };

  const resolveCablePoint = (point: { x: number; y: number }) => {
    let nearest: { device: Device; anchor: CableAnchor; x: number; y: number; distance: number } | null = null;
    for (const device of floorDevices) {
      const candidate = getNearestAnchor(device, point);
      if (candidate.distance <= DEVICE_SNAP_DISTANCE && (!nearest || candidate.distance < nearest.distance)) {
        nearest = { device, anchor: candidate.anchor, x: candidate.x, y: candidate.y, distance: candidate.distance };
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

  const finalizeDraftCable = (endPoint: ReturnType<typeof resolveCablePoint>) => {
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
    addDeviceConnection(cable);
    setDraftCable(null);
    setMode("select");
  };

  const onMouseDown = (e: MouseEvent<SVGSVGElement>) => {
    if (!activeFloorId) return;
    const pt = toSvg(e.clientX, e.clientY);
    const targetIsSvg = (e.target as Element).tagName === "svg";

    if (
      e.button === 1 ||
      (e.button === 0 && mode === "select" && targetIsSvg)
    ) {
      setDrag({ kind: "pan", sx: e.clientX, sy: e.clientY, ovb: vb });
      select(null, null);
      return;
    }

    if (e.button !== 0) return;
    if (!isEditMode) return;

    if (mode === "connector") {
      const resolved = resolveCablePoint(pt);
      if (!draftCable) {
        if (!resolved.deviceId) return;
        const startDevice = floorDevices.find((item) => item.id === resolved.deviceId);
        if (!startDevice) return;
        setDraftCable({
          type: currentCableType,
          start: getCableStart(startDevice, pt),
          points: [],
          cursor: pt,
        });
        select(startDevice.id, "device");
        return;
      }

      if (resolved.deviceId && resolved.deviceId !== draftCable.start.deviceId) {
        finalizeDraftCable(resolved);
        return;
      }

      if (targetIsSvg) {
        setDraftCable((current) =>
          current
            ? {
                ...current,
                points: [...current.points, { x: resolved.x, y: resolved.y }],
                cursor: pt,
              }
            : current,
        );
        return;
      }

      return;
    }

    if (mode === "room") {
      const id = addElement({
        floorId: activeFloorId,
        type: "room",
        x: pt.x,
        y: pt.y,
        width: 1,
        height: 1,
        label: "Помещение",
        color: "#dbeafe",
        rotation: 0,
      });
      setDrag({ kind: "draw-room", sx: pt.x, sy: pt.y, id });
      select(id, "element");
      return;
    }

    if (mode === "wall") {
      addElement({
        floorId: activeFloorId,
        type: "wall",
        x: pt.x - 60,
        y: pt.y - 2,
        width: 120,
        height: 4,
        color: "#1f2937",
        rotation: 0,
      });
      setMode("select");
      return;
    }

    if (mode === "door") {
      addElement({
        floorId: activeFloorId,
        type: "door",
        x: pt.x - 20,
        y: pt.y - 20,
        width: 40,
        height: 40,
        color: "#a16207",
        rotation: 0,
      });
      setMode("select");
      return;
    }

    if (mode === "text") {
      const label = prompt("Текст:", "Подпись") ?? "";
      if (label) {
        addElement({
          floorId: activeFloorId,
          type: "text",
          x: pt.x,
          y: pt.y,
          width: 100,
          height: 20,
          label,
          rotation: 0,
        });
      }
      setMode("select");
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

  const onMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    const pt = toSvg(e.clientX, e.clientY);
    if (draftCable) {
      const resolved = resolveCablePoint(pt);
      setDraftCable((current) =>
        current
          ? {
              ...current,
              cursor: { x: resolved.x, y: resolved.y },
              hoverDeviceId: resolved.deviceId,
            }
          : current,
      );
    }

    if (!drag) return;
    if (drag.kind === "pan") {
      const dx = ((e.clientX - drag.sx) / (svgRef.current?.clientWidth ?? 1)) * vb.w;
      const dy = ((e.clientY - drag.sy) / (svgRef.current?.clientHeight ?? 1)) * vb.h;
      setVb({ ...drag.ovb, x: drag.ovb.x - dx, y: drag.ovb.y - dy });
      return;
    }

    if (!isEditMode) return;

    if (drag.kind === "draw-room") {
      updateElement(drag.id, {
        x: Math.min(drag.sx, pt.x),
        y: Math.min(drag.sy, pt.y),
        width: Math.abs(pt.x - drag.sx),
        height: Math.abs(pt.y - drag.sy),
      });
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

    if (drag.kind === "move-pt") {
      updateDeviceConnection(drag.id, {
        points: floorConnections.find((item) => item.id === drag.id)?.points.map((point, index) =>
          index === drag.index ? { x: snapGrid(pt.x), y: snapGrid(pt.y) } : point,
        ) ?? [],
      });
      return;
    }

    if (drag.kind === "resize-el") {
      updateElement(drag.id, {
        width: Math.max(20, drag.ow + (pt.x - drag.sx)),
        height: Math.max(20, drag.oh + (pt.y - drag.sy)),
      });
      return;
    }

    if (drag.kind === "rotate-dev") {
      const angle = (Math.atan2(pt.y - drag.cy, pt.x - drag.cx) * 180) / Math.PI;
      updateDevice(drag.id, { rotation: angle });
    }
  };

  const onMouseUp = () => setDrag(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (draftCable) {
        if (e.key === "Escape") {
          e.preventDefault();
          setDraftCable(null);
          setMode("select");
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          const resolved = resolveCablePoint(draftCable.cursor);
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

      if (!isEditMode) return;
      if (isEditableTarget(e.target)) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (selectedKind === "connection" && selectedId) removeDeviceConnection(selectedId);
        if (selectedKind === "device" && selectedId) removeDevice(selectedId);
        if (selectedKind === "element" && selectedId) removeElement(selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draftCable, isEditMode, selectedId, selectedKind, removeDevice, removeElement, removeDeviceConnection, setMode]);

  useEffect(() => {
    if (!isEditMode || mode !== "connector") {
      setDraftCable(null);
    }
  }, [isEditMode, mode]);

  useEffect(() => {
    if (highlightId) {
      const device = devices.find((item) => item.id === highlightId);
      if (device) {
        setVb({ x: device.x - 400, y: device.y - 300, w: 800, h: 600 });
        select(device.id, "device");
      }
    }
  }, [highlightId, devices, select]);

  const handleElClick = (e: MouseEvent<SVGGElement>, element: MapElement) => {
    e.stopPropagation();
    if (mode === "delete") {
      removeElement(element.id);
      return;
    }
    select(element.id, "element");
    if (isEditMode && mode === "select") {
      const pt = toSvg(e.clientX, e.clientY);
      setDrag({ kind: "move-el", id: element.id, dx: pt.x - element.x, dy: pt.y - element.y });
    }
  };

  const handleDeviceMouseDown = (e: MouseEvent<SVGGElement>, device: Device) => {
    e.stopPropagation();
    if (mode === "delete") {
      removeDevice(device.id);
      return;
    }
    if (mode === "connector" && isEditMode) {
      const pt = toSvg(e.clientX, e.clientY);
      if (!draftCable) {
        setDraftCable({
          type: currentCableType,
          start: getCableStart(device, pt),
          points: [],
          cursor: pt,
          hoverDeviceId: device.id,
        });
      } else if (draftCable.start.deviceId !== device.id) {
        finalizeDraftCable(getCableStart(device, pt));
      }
      select(device.id, "device");
      return;
    }
    select(device.id, "device");
    if (isEditMode && mode === "select") {
      const pt = toSvg(e.clientX, e.clientY);
      setDrag({ kind: "move-dev", id: device.id, dx: pt.x - device.x, dy: pt.y - device.y });
    }
  };

  const resolveConnectionEndpoint = (endpoint: DeviceConnection["from"]) => {
    const device = endpoint.deviceId ? floorDevices.find((item) => item.id === endpoint.deviceId) : null;
    if (!device) return { x: endpoint.x, y: endpoint.y };
    const anchors = getAnchors(device);
    return anchors[endpoint.anchor ?? "center"] ?? { x: endpoint.x, y: endpoint.y };
  };

  const getConnectionPoints = (connection: DeviceConnection) => {
    const start = resolveConnectionEndpoint(connection.from);
    const end = resolveConnectionEndpoint(connection.to);
    return { start, end };
  };

  const renderDevice = (device: Device) => {
    const isSel = selectedId === device.id;
    const isHl = highlightId === device.id;
    const isSnap = draftCable?.hoverDeviceId === device.id;
    const color = statusColors[device.status];
    const size = deviceSizes[device.type];

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
          />
          <g
            onMouseDown={(e) => handleDeviceMouseDown(e, device)}
            onMouseEnter={() => setHover(device)}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: isEditMode ? "move" : "pointer" }}
          >
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
              y={device.y + 4}
              textAnchor="middle"
              fontSize={11}
              fill="white"
              fontWeight={700}
            >
              📹
            </text>
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
        </g>
      );
    }

    const label = device.type === "nvr" ? "NVR" : device.type === "dvr" ? "DVR" : device.type === "poe_switch" ? "PoE" : "SW";
    const innerLabel =
      device.type === "poe_switch" ? "⚡" : device.type === "switch" ? "⟂" : "▣";

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
        <g
          onMouseDown={(e) => handleDeviceMouseDown(e, device)}
          onMouseEnter={() => setHover(device)}
          onMouseLeave={() => setHover(null)}
          style={{ cursor: isEditMode ? "move" : "pointer" }}
        >
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
        </g>
      </g>
    );
  };

  return (
    <div className="relative flex-1 overflow-hidden bg-muted/30">
      {!activeFloorId && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          Выберите объект и зону слева
        </div>
      )}

      <svg
        ref={svgRef}
        className="w-full h-full select-none"
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onDoubleClick={(e) => {
          if (!draftCable || mode !== "connector" || !isEditMode) return;
          e.preventDefault();
          const pt = resolveCablePoint(toSvg(e.clientX, e.clientY));
          finalizeDraftCable(pt);
        }}
        style={{
          cursor:
            drag?.kind === "pan"
              ? "grabbing"
              : !isEditMode || mode === "select"
                ? "grab"
                : "crosshair",
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
        <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="url(#grid-lg)" />

        {floorConnections.map((connection) => {
          const { start, end } = getConnectionPoints(connection);
          const path = buildCablePath(start, connection.points, end);
          const style = cableStyles[connection.type];
          const isSel = selectedKind === "connection" && selectedId === connection.id;
          return (
            <g key={connection.id}>
              <path
                d={path}
                fill="none"
                stroke={style.stroke}
                strokeWidth={isSel ? style.width + 1.5 : style.width}
                strokeDasharray={style.dash}
                opacity={isSel ? 1 : 0.8}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  select(connection.id, "connection");
                }}
                onMouseEnter={() => setHoverConnection(connection)}
                onMouseLeave={() => setHoverConnection(null)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (isEditMode) select(connection.id, "connection");
                }}
                style={{ cursor: isEditMode ? "pointer" : "default" }}
              />
              {connection.points.map((point, index) => (
                <circle
                  key={`${connection.id}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={isSel && isEditMode ? 5 : 3}
                  fill="#fff"
                  stroke={style.stroke}
                  strokeWidth={2}
                  onMouseDown={(e) => {
                    if (!isEditMode) return;
                    e.stopPropagation();
                    setDrag({ kind: "move-pt", id: connection.id, index });
                    select(connection.id, "connection");
                  }}
                  style={{ cursor: isEditMode ? "grab" : "default" }}
                />
              ))}
              <text
                x={(start.x + end.x) / 2}
                y={(start.y + end.y) / 2 - 6}
                textAnchor="middle"
                fontSize={10}
                fill={style.stroke}
                fontWeight={700}
              >
                {cableLabels[connection.type]}
              </text>
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

        {floorEls.map((element) => {
          const isSel = selectedId === element.id;
          if (element.type === "text") {
            return (
              <g
                key={element.id}
                onMouseDown={(e) => handleElClick(e, element)}
                style={{ cursor: isEditMode ? "move" : "pointer" }}
              >
                <text x={element.x} y={element.y} fontSize={16} fill="#111" fontWeight={500}>
                  {element.label}
                </text>
                {isSel && (
                  <rect
                    x={element.x - 4}
                    y={element.y - 16}
                    width={(element.label?.length ?? 0) * 9 + 8}
                    height={22}
                    fill="none"
                    stroke="#2563eb"
                    strokeDasharray="4 2"
                  />
                )}
              </g>
            );
          }

          return (
            <g
              key={element.id}
              onMouseDown={(e) => handleElClick(e, element)}
              style={{ cursor: "move" }}
            >
              <rect
                x={element.x}
                y={element.y}
                width={element.width}
                height={element.height}
                fill={element.color ?? "#dbeafe"}
                fillOpacity={element.type === "wall" ? 1 : 0.5}
                stroke={isSel ? "#2563eb" : element.type === "wall" ? "#1f2937" : "#64748b"}
                strokeWidth={isSel ? 2 : element.type === "wall" ? 0 : 1.5}
              />
              {element.label && element.type === "room" && (
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
              {element.type === "door" && (
                <path
                  d={`M ${element.x} ${element.y + element.height} A ${element.width} ${element.height} 0 0 1 ${element.x + element.width} ${element.y}`}
                  fill="none"
                  stroke="#a16207"
                  strokeWidth={2}
                />
              )}
              {isEditMode && isSel && element.type !== "wall" && (
                <rect
                  x={element.x + element.width - 6}
                  y={element.y + element.height - 6}
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
                      sx: pt.x,
                      sy: pt.y,
                      ow: element.width,
                      oh: element.height,
                    });
                  }}
                />
              )}
            </g>
          );
        })}

        {floorDevices.map((device) => renderDevice(device))}
      </svg>

      {hover && (
        <div className="absolute bottom-3 left-3 bg-card border rounded-md shadow-md px-3 py-2 text-xs pointer-events-none">
          <div className="font-semibold">{hover.name}</div>
          <div className="text-muted-foreground">
            {deviceTypeLabels[hover.type]} • {hover.ip || "Без IP"} • {hover.status}
          </div>
        </div>
      )}

      {hoverConnection && (
        <div className="absolute bottom-16 left-3 bg-card border rounded-md shadow-md px-3 py-2 text-xs pointer-events-none max-w-xs">
          <div className="font-semibold">{cableLabels[hoverConnection.type]}</div>
          <div className="text-muted-foreground">
            {(devices.find((item) => item.id === hoverConnection.from.deviceId)?.name ?? "Точка A")} →
            {(devices.find((item) => item.id === hoverConnection.to.deviceId)?.name ?? "Точка B")}
          </div>
          {hoverConnection.notes && <div className="mt-1 text-muted-foreground">{hoverConnection.notes}</div>}
        </div>
      )}

      <div className="absolute bottom-3 right-3 bg-card border rounded-md shadow-sm px-2 py-1 flex gap-1 text-xs">
        <button
          className="px-2 py-1 hover:bg-accent rounded"
          onClick={() =>
            setVb({ x: vb.x + vb.w / 4, y: vb.y + vb.h / 4, w: vb.w / 2, h: vb.h / 2 })
          }
        >
          +
        </button>
        <button
          className="px-2 py-1 hover:bg-accent rounded"
          onClick={() =>
            setVb({ x: vb.x - vb.w / 2, y: vb.y - vb.h / 2, w: vb.w * 2, h: vb.h * 2 })
          }
        >
          -
        </button>
        <button
          className="px-2 py-1 hover:bg-accent rounded"
          onClick={() => setVb({ x: 0, y: 0, w: BASE_W, h: BASE_H })}
        >
          Сброс
        </button>
      </div>

      <div className="absolute top-2 left-2 bg-card border rounded-md px-2 py-1 text-xs text-muted-foreground">
        Режим:{" "}
        <span className="font-semibold text-foreground">{isEditMode ? "Редактирование" : "Просмотр"}</span>{" "}
        • колесо мыши = масштаб • ПКМ/средняя = панорама
      </div>
    </div>
  );
}
