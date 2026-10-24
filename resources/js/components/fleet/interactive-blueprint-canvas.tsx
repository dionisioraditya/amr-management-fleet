import { useRef, useState } from 'react';
import type {
    FacilityMap,
    PathCoordinate,
    Pathplan,
    Vehicle,
    Waypoint,
} from '@/types';

export interface InteractiveBlueprintCanvasProps {
    map?: FacilityMap | null;
    waypoints?: Waypoint[];
    pathplans?: Pathplan[];
    vehicles?: Vehicle[];
    selectedWaypointId?: number | null;
    selectedPathplanId?: number | null;
    selectedVehicleId?: string | null;
    onSelectWaypoint?: (waypoint: Waypoint) => void;
    onSelectPathplan?: (pathplan: Pathplan) => void;
    onSelectVehicle?: (vehicle: Vehicle) => void;
    mode?: 'view' | 'pick-station' | 'draw-path' | 'pose-estimate';
    onPickCoordinate?: (coord: PathCoordinate) => void;
    onPoseEstimate?: (pose: { x: number; y: number; theta: number }) => void;
    draftCoordinates?: PathCoordinate[];
    onAddPathPoint?: (coord: PathCoordinate) => void;
    snapStep?: number; // e.g. 0.5, 0.25, 1.0, or 0 for off
    inflationRadius?: number; // in meters, default 0.6
    showCostmap?: boolean;
    showSlamNoise?: boolean;
    showKeepOutZones?: boolean;
    showOriginDatum?: boolean;
    occupancyViewMode?: 'blueprint' | 'raw';
    resolution?: number;
    hudPosition?: 'top-right' | 'bottom-right';
}

export interface CanvasCalibration {
    hasRasterMap: boolean;
    widthPx: number;
    heightPx: number;
    resolution: number;
    originX: number;
    originY: number;
    originYaw: number;
    renderX: number;
    renderY: number;
    renderW: number;
    renderH: number;
    scale: number; // SVG units per map pixel
    pixelsPerMeterSvg: number; // SVG units per real-world meter
}

/**
 * Computes the exact Nav2 OccupancyGrid <-> SVG plane calibration.
 */
export function computeCanvasCalibration(
    map?: FacilityMap | null,
    fallbackResolution = 0.05,
): CanvasCalibration {
    const res = map?.resolution ?? fallbackResolution ?? 0.05;
    const originX = map?.origin_x ?? 0;
    const originY = map?.origin_y ?? 0;
    const originYaw = map?.origin_yaw ?? 0;

    if (map?.width_px && map?.height_px && map.width_px > 0 && map.height_px > 0) {
        const widthPx = map.width_px;
        const heightPx = map.height_px;
        const boxX = 70;
        const boxY = 55;
        const boxW = 860;
        const boxH = 510;
        const scale = Math.min(boxW / widthPx, boxH / heightPx);
        const renderW = widthPx * scale;
        const renderH = heightPx * scale;
        const renderX = boxX + (boxW - renderW) / 2;
        const renderY = boxY + (boxH - renderH) / 2;

        return {
            hasRasterMap: Boolean(map.image_url),
            widthPx,
            heightPx,
            resolution: res,
            originX,
            originY,
            originYaw,
            renderX,
            renderY,
            renderW,
            renderH,
            scale,
            pixelsPerMeterSvg: scale / res,
        };
    }

    // Default procedural blueprint calibration
    return {
        hasRasterMap: Boolean(map?.image_url),
        widthPx: 460,
        heightPx: 300,
        resolution: res,
        originX,
        originY,
        originYaw,
        renderX: 60,
        renderY: 135,
        renderW: 875,
        renderH: 390,
        scale: 1.8,
        pixelsPerMeterSvg: 36,
    };
}

/**
 * Converts metric warehouse coordinates (X in meters, Y in meters)
 * to the 1000x620 SVG blueprint plane using ROS 2 OccupancyGrid affine transform.
 */
export function metricToSvg(
    x: number,
    y: number,
    calibration?: CanvasCalibration,
): { cx: number; cy: number } {
    if (calibration && (calibration.hasRasterMap || calibration.widthPx !== 460)) {
        const u = (x - calibration.originX) / calibration.resolution;
        const v =
            calibration.heightPx -
            (y - calibration.originY) / calibration.resolution;
        return {
            cx: Number((calibration.renderX + u * calibration.scale).toFixed(2)),
            cy: Number((calibration.renderY + v * calibration.scale).toFixed(2)),
        };
    }

    const cx = Math.min(930, Math.max(70, 110 + x * 36));
    const cy = Math.min(515, Math.max(135, 490 - y * 22));
    return { cx, cy };
}

/**
 * Converts 1000x620 SVG plane coordinates back to metric warehouse coordinates (meters).
 */
export function svgToMetric(
    cx: number,
    cy: number,
    snapStep = 0.5,
    calibration?: CanvasCalibration,
): { x: number; y: number; u?: number; v?: number } {
    let rawX: number;
    let rawY: number;
    let uPx: number | undefined;
    let vPx: number | undefined;

    if (calibration && (calibration.hasRasterMap || calibration.widthPx !== 460)) {
        const u = (cx - calibration.renderX) / calibration.scale;
        const v = (cy - calibration.renderY) / calibration.scale;
        uPx = Math.max(0, Math.min(calibration.widthPx, Math.round(u)));
        vPx = Math.max(0, Math.min(calibration.heightPx, Math.round(v)));
        rawX = calibration.originX + u * calibration.resolution;
        rawY =
            calibration.originY +
            (calibration.heightPx - v) * calibration.resolution;
    } else {
        rawX = (cx - 110) / 36;
        rawY = (490 - cy) / 22;
    }

    if (snapStep > 0) {
        return {
            x: Number((Math.round(rawX / snapStep) * snapStep).toFixed(2)),
            y: Number((Math.round(rawY / snapStep) * snapStep).toFixed(2)),
            u: uPx,
            v: vPx,
        };
    }

    return {
        x: Number(rawX.toFixed(2)),
        y: Number(rawY.toFixed(2)),
        u: uPx,
        v: vPx,
    };
}

/**
 * Calculates total Euclidean path length in meters.
 */
export function calculatePathLength(coords: PathCoordinate[]): number {
    if (!coords || coords.length < 2) {
        return 0;
    }
    let total = 0;
    for (let i = 1; i < coords.length; i++) {
        const dx = coords[i].x - coords[i - 1].x;
        const dy = coords[i].y - coords[i - 1].y;
        total += Math.hypot(dx, dy);
    }
    return Number(total.toFixed(1));
}

export function InteractiveBlueprintCanvas({
    map = null,
    waypoints = [],
    pathplans = [],
    vehicles = [],
    selectedWaypointId = null,
    selectedPathplanId = null,
    selectedVehicleId = null,
    onSelectWaypoint,
    onSelectPathplan,
    onSelectVehicle,
    mode = 'view',
    onPickCoordinate,
    onPoseEstimate,
    draftCoordinates = [],
    onAddPathPoint,
    snapStep = 0.5,
    inflationRadius = 0.6,
    showCostmap = true,
    showSlamNoise = false,
    showKeepOutZones = true,
    showOriginDatum = true,
    occupancyViewMode = 'blueprint',
    resolution = 0.05,
    hudPosition = 'bottom-right',
}: InteractiveBlueprintCanvasProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [cursorMetric, setCursorMetric] = useState<{
        x: number;
        y: number;
        u?: number;
        v?: number;
    }>({
        x: 0.0,
        y: 0.0,
    });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    // 2D Pose Estimate Drag-To-Aim State
    const [poseEstimateOrigin, setPoseEstimateOrigin] = useState<{
        x: number;
        y: number;
        cx: number;
        cy: number;
    } | null>(null);
    const [poseEstimateCurrent, setPoseEstimateCurrent] = useState<{
        x: number;
        y: number;
        cx: number;
        cy: number;
        theta: number;
    } | null>(null);

    const calibration = computeCanvasCalibration(map, resolution);

    const getSvgPointFromEvent = (
        e: React.MouseEvent<SVGSVGElement>,
    ): { cx: number; cy: number } | null => {
        const svg = svgRef.current;
        if (!svg) {
            return null;
        }
        const rect = svg.getBoundingClientRect();
        const normX = (e.clientX - rect.left) / rect.width;
        const normY = (e.clientY - rect.top) / rect.height;
        return {
            cx: normX * 1000,
            cy: normY * 620,
        };
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (isPanning) {
            setPan({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y,
            });
            return;
        }

        const pt = getSvgPointFromEvent(e);
        if (!pt) return;

        const metric = svgToMetric(pt.cx, pt.cy, snapStep, calibration);
        setCursorMetric(metric);

        if (mode === 'pose-estimate' && poseEstimateOrigin) {
            const dx = metric.x - poseEstimateOrigin.x;
            const dy = metric.y - poseEstimateOrigin.y;
            // ROS 2 coordinate convention: theta in radians where +X is 0, +Y is +90 deg (pi/2)
            const theta = Number(Math.atan2(dy, dx).toFixed(4));
            setPoseEstimateCurrent({
                x: metric.x,
                y: metric.y,
                cx: pt.cx,
                cy: pt.cy,
                theta,
            });
        }
    };

    const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if (isPanning || mode === 'pose-estimate') {
            return;
        }
        const pt = getSvgPointFromEvent(e);
        if (!pt) {
            return;
        }
        const metric = svgToMetric(pt.cx, pt.cy, snapStep, calibration);

        if (mode === 'pick-station' && onPickCoordinate) {
            onPickCoordinate({ x: metric.x, y: metric.y });
        } else if (mode === 'draw-path' && onAddPathPoint) {
            onAddPathPoint({ x: metric.x, y: metric.y });
        }
    };

    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
        if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
            e.preventDefault();
            setIsPanning(true);
            setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            return;
        }

        if (mode === 'pose-estimate' && e.button === 0) {
            e.preventDefault();
            const pt = getSvgPointFromEvent(e);
            if (pt) {
                const metric = svgToMetric(pt.cx, pt.cy, snapStep, calibration);
                setPoseEstimateOrigin({
                    x: metric.x,
                    y: metric.y,
                    cx: pt.cx,
                    cy: pt.cy,
                });
                setPoseEstimateCurrent({
                    x: metric.x,
                    y: metric.y,
                    cx: pt.cx,
                    cy: pt.cy,
                    theta: 0,
                });
            }
        }
    };

    const handleMouseUp = () => {
        if (isPanning) {
            setIsPanning(false);
            return;
        }

        if (mode === 'pose-estimate' && poseEstimateOrigin) {
            const finalTheta = poseEstimateCurrent?.theta ?? 0;
            if (onPoseEstimate) {
                onPoseEstimate({
                    x: poseEstimateOrigin.x,
                    y: poseEstimateOrigin.y,
                    theta: finalTheta,
                });
            }
            setPoseEstimateOrigin(null);
            setPoseEstimateCurrent(null);
        }
    };

    const resetView = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    const cursorSvg = metricToSvg(cursorMetric.x, cursorMetric.y, calibration);
    const originSvg = metricToSvg(0, 0, calibration);

    const activePathsToRender =
        mode === 'draw-path' && draftCoordinates.length > 0
            ? [
                  ...pathplans,
                  {
                      id: -999,
                      map_id: map?.id ?? 1,
                      name: 'DRAFT-PATH',
                      is_bidirectional: true,
                      max_speed: 1.2,
                      coordinates: draftCoordinates,
                  },
              ]
            : pathplans;

    const isRawRosMode = occupancyViewMode === 'raw';

    return (
        <div
            className={`relative inset-0 z-0 flex h-full w-full items-center justify-center overflow-hidden select-none ${
                isRawRosMode ? 'bg-[#d4d8dd]' : 'bg-[#f8f9ff]'
            }`}
        >
            {/* Dot Matrix Coordinate Background */}
            <div
                className="pointer-events-none absolute inset-0 bg-surface-container-low/30"
                style={{
                    backgroundSize: '36px 36px',
                    backgroundImage: isRawRosMode
                        ? 'linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)'
                        : 'radial-gradient(#949cb5 0.9px, transparent 0.9px)',
                }}
            />

            {/* Main Zoomable / Pannable SVG Container */}
            <div
                className="relative flex h-full max-h-[920px] w-full max-w-[1580px] items-center justify-center p-4 transition-transform duration-150"
                style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                }}
            >
                <svg
                    ref={svgRef}
                    onMouseMove={handleMouseMove}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onClick={handleCanvasClick}
                    className={`h-full w-full drop-shadow-sm select-none ${
                        mode === 'pick-station' || mode === 'draw-path' || mode === 'pose-estimate'
                            ? 'cursor-crosshair'
                            : isPanning
                              ? 'cursor-grabbing'
                              : 'cursor-default'
                    }`}
                    preserveAspectRatio="xMidYMid meet"
                    viewBox="0 0 1000 620"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <linearGradient
                            id="storageZoneGradientInteractive"
                            x1="0%"
                            x2="0%"
                            y1="0%"
                            y2="100%"
                        >
                            <stop
                                offset="0%"
                                stopColor="#cfe5ff"
                                stopOpacity="0.65"
                            />
                            <stop
                                offset="100%"
                                stopColor="#e5eeff"
                                stopOpacity="0.9"
                            />
                        </linearGradient>

                        {/* Arrow Marker for 2D Pose Estimate Arrow */}
                        <marker
                            id="poseEstimateArrow"
                            viewBox="0 0 10 10"
                            refX="6"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                        >
                            <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
                        </marker>

                        {/* Cybernetic Blueprint Filter for Real PGM Maps */}
                        <filter
                            id="cyberneticBlueprintFilter"
                            colorInterpolationFilters="sRGB"
                        >
                            <feColorMatrix
                                type="matrix"
                                values="
                                    0.88 0    0    0 0.08
                                    0    0.92 0    0 0.11
                                    0    0    0.98 0 0.22
                                    0    0    0    1 0"
                            />
                        </filter>

                        {/* Red Keep-Out Filter Mask */}
                        <filter
                            id="keepoutRedMaskFilter"
                            colorInterpolationFilters="sRGB"
                        >
                            <feColorMatrix
                                type="matrix"
                                values="
                                    -1 0  0 0 0.85
                                    0  0  0 0 0.10
                                    0  0  0 0 0.10
                                    -1 0  0 0 0.90"
                            />
                        </filter>

                        <pattern
                            height="40"
                            id="slamNoisePattern"
                            patternUnits="userSpaceOnUse"
                            width="40"
                        >
                            <circle
                                cx="4"
                                cy="9"
                                fill="#64748b"
                                opacity="0.35"
                                r="1.3"
                            />
                            <circle
                                cx="18"
                                cy="16"
                                fill="#475569"
                                opacity="0.45"
                                r="1.5"
                            />
                            <circle
                                cx="33"
                                cy="24"
                                fill="#94a3b8"
                                opacity="0.4"
                                r="1.2"
                            />
                            <circle
                                cx="12"
                                cy="34"
                                fill="#64748b"
                                opacity="0.3"
                                r="1.4"
                            />
                            <circle
                                cx="27"
                                cy="7"
                                fill="#94a3b8"
                                opacity="0.35"
                                r="1.1"
                            />
                        </pattern>
                    </defs>

                    {/* =========================================================
                        A. REAL ROS 2 OCCUPANCY GRID RASTER (IF UPLOADED VIA .ZIP)
                       ========================================================= */}
                    {calibration.hasRasterMap && map?.image_url ? (
                        <g>
                            {/* Outer Frame Border */}
                            <rect
                                x={calibration.renderX - 2}
                                y={calibration.renderY - 2}
                                width={calibration.renderW + 4}
                                height={calibration.renderH + 4}
                                rx="4"
                                fill={isRawRosMode ? '#cdcdcd' : '#e5eeff'}
                                stroke={isRawRosMode ? '#334155' : '#1d4ed8'}
                                strokeWidth="2.5"
                            />

                            {/* 1:1 Calibrated Occupancy Grid Image */}
                            <image
                                href={map.image_url}
                                x={calibration.renderX}
                                y={calibration.renderY}
                                width={calibration.renderW}
                                height={calibration.renderH}
                                preserveAspectRatio="none"
                                filter={
                                    isRawRosMode
                                        ? undefined
                                        : 'url(#cyberneticBlueprintFilter)'
                                }
                                style={{ imageRendering: 'pixelated' }}
                            />

                            {/* Optional Costmap Inflation Border Indicator */}
                            {showCostmap && (
                                <rect
                                    x={calibration.renderX + 3}
                                    y={calibration.renderY + 3}
                                    width={Math.max(0, calibration.renderW - 6)}
                                    height={Math.max(0, calibration.renderH - 6)}
                                    fill="none"
                                    stroke="#00a3ff"
                                    strokeDasharray="5 4"
                                    strokeOpacity="0.65"
                                    strokeWidth="1.5"
                                />
                            )}

                            {/* Optional Keep-Out Mask Layer from .zip */}
                            {showKeepOutZones && map.keepout_url && (
                                <image
                                    href={map.keepout_url}
                                    x={calibration.renderX}
                                    y={calibration.renderY}
                                    width={calibration.renderW}
                                    height={calibration.renderH}
                                    preserveAspectRatio="none"
                                    opacity="0.45"
                                    filter="url(#keepoutRedMaskFilter)"
                                    style={{ imageRendering: 'pixelated' }}
                                />
                            )}

                            {/* Map Dimension & Origin Calibration Caption */}
                            <text
                                x={calibration.renderX}
                                y={calibration.renderY - 8}
                                fill="#0b1c30"
                                className="font-mono text-[10px] font-bold"
                            >
                                {map.name.toUpperCase()} // {calibration.widthPx}×
                                {calibration.heightPx}px ({calibration.resolution}
                                m/px) // ORIGIN [{calibration.originX}m,{' '}
                                {calibration.originY}m]
                            </text>
                        </g>
                    ) : (
                        /* =========================================================
                           B. PROCEDURAL SYNTHETIC BLUEPRINT FALLBACK
                           ========================================================= */
                        <g>
                            {/* Outer Perimeter Walls (Deep Cobalt Steel #1d4ed8) */}
                            <path
                                d="M 60 480 L 140 480 L 140 435 L 115 435 L 115 350 L 90 350 L 90 230 L 130 230 L 130 215 L 75 215 L 75 190 L 120 190 L 120 160 L 150 160 L 150 135 L 250 135 L 250 160 L 900 160 L 900 455 L 935 455 L 935 525 L 850 525 L 850 510 L 720 510 L 720 495 L 640 495 L 640 510 L 140 510 L 60 510 Z"
                                fill={
                                    isRawRosMode
                                        ? '#ffffff'
                                        : showSlamNoise
                                          ? 'url(#slamNoisePattern)'
                                          : '#f8f9ff'
                                }
                                stroke={isRawRosMode ? '#000000' : '#1d4ed8'}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="3"
                            />

                            {/* Nav2 Costmap Inflation Halo */}
                            {showCostmap && (
                                <path
                                    d="M 66 474 L 134 474 L 134 429 L 109 429 L 109 356 L 96 356 L 96 236 L 124 236 L 124 209 L 81 209 L 81 196 L 126 196 L 126 166 L 156 166 L 156 141 L 244 141 L 244 166 L 894 166 L 894 449 L 929 449 L 929 519 L 856 519 L 856 504 L 714 504 L 714 489 L 634 489 L 634 504 L 146 504 L 66 504 Z"
                                    fill="none"
                                    stroke="#00a3ff"
                                    strokeDasharray="4 4"
                                    strokeOpacity="0.55"
                                    strokeWidth="1.5"
                                />
                            )}

                            {/* Top High-Bay Storage Rack */}
                            <g>
                                {showCostmap && (
                                    <rect
                                        fill="none"
                                        height="82"
                                        rx="8"
                                        stroke="#00a3ff"
                                        strokeDasharray="3 3"
                                        strokeOpacity="0.35"
                                        strokeWidth="1.5"
                                        width="637"
                                        x="254"
                                        y="209"
                                    />
                                )}
                                <rect
                                    fill={
                                        isRawRosMode
                                            ? '#1e293b'
                                            : 'url(#storageZoneGradientInteractive)'
                                    }
                                    height="70"
                                    rx="4"
                                    stroke={isRawRosMode ? '#000000' : '#00a3ff'}
                                    strokeWidth="2.5"
                                    width="625"
                                    x="260"
                                    y="215"
                                />
                                <text
                                    className="font-label-md text-[12px] font-semibold tracking-wider"
                                    fill={isRawRosMode ? '#ffffff' : '#004a77'}
                                    x="275"
                                    y="255"
                                >
                                    ZONE A-01 // AUTOMATED HIGH-BAY PALLET AISLE
                                </text>
                            </g>

                            {/* Middle Buffer Island */}
                            <rect
                                fill={
                                    isRawRosMode
                                        ? '#1e293b'
                                        : 'url(#storageZoneGradientInteractive)'
                                }
                                height="58"
                                rx="2"
                                stroke={isRawRosMode ? '#000000' : '#00a3ff'}
                                strokeWidth="2"
                                width="26"
                                x="770"
                                y="305"
                            />
                            <text
                                className="font-label-sm text-[9px]"
                                fill={isRawRosMode ? '#ffffff' : '#004a77'}
                                x="774"
                                y="340"
                            >
                                BUF
                            </text>

                            {/* Bottom Storage Rack */}
                            <g>
                                {showCostmap && (
                                    <rect
                                        fill="none"
                                        height="82"
                                        rx="8"
                                        stroke="#00a3ff"
                                        strokeDasharray="3 3"
                                        strokeOpacity="0.35"
                                        strokeWidth="1.5"
                                        width="637"
                                        x="254"
                                        y="374"
                                    />
                                )}
                                <rect
                                    fill={
                                        isRawRosMode
                                            ? '#1e293b'
                                            : 'url(#storageZoneGradientInteractive)'
                                    }
                                    height="70"
                                    rx="4"
                                    stroke={isRawRosMode ? '#000000' : '#00a3ff'}
                                    strokeWidth="2.5"
                                    width="625"
                                    x="260"
                                    y="380"
                                />
                                <text
                                    className="font-label-md text-[12px] font-semibold tracking-wider"
                                    fill={isRawRosMode ? '#ffffff' : '#004a77'}
                                    x="275"
                                    y="420"
                                >
                                    ZONE B-02 // RAPID CONVEYOR PICK-OFF STATION
                                </text>
                            </g>

                            {/* Keep-Out Restricted Forklift Zone */}
                            {showKeepOutZones && (
                                <g>
                                    <rect
                                        fill="#ffdad6"
                                        fillOpacity="0.4"
                                        height="52"
                                        rx="4"
                                        stroke="#ba1a1a"
                                        strokeDasharray="6 4"
                                        strokeWidth="1.5"
                                        width="135"
                                        x="740"
                                        y="452"
                                    />
                                    <text
                                        className="font-label-sm text-[9px] font-bold"
                                        fill="#ba1a1a"
                                        x="750"
                                        y="482"
                                    >
                                        KEEP-OUT: FORKLIFT BAY
                                    </text>
                                </g>
                            )}
                        </g>
                    )}

                    {/* =========================================================
                        C. ROS 2 FRAME `map` DATUM ORIGIN CROSSHAIR [0.00m, 0.00m]
                       ========================================================= */}
                    {showOriginDatum && (
                        <g
                            className="pointer-events-none"
                            transform={`translate(${originSvg.cx}, ${originSvg.cy})`}
                        >
                            {/* Outer Target Ring */}
                            <circle
                                cx="0"
                                cy="0"
                                r="14"
                                fill="#0b1c30"
                                fillOpacity="0.12"
                                stroke="#0b1c30"
                                strokeDasharray="3 2"
                                strokeWidth="1.2"
                            />
                            {/* ROS +X Axis (Red, Right) */}
                            <line
                                x1="0"
                                y1="0"
                                x2="26"
                                y2="0"
                                stroke="#dc2626"
                                strokeWidth="2.2"
                            />
                            <polygon
                                points="26,-3 32,0 26,3"
                                fill="#dc2626"
                            />
                            {/* ROS +Y Axis (Green, Up) */}
                            <line
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="-26"
                                stroke="#16a34a"
                                strokeWidth="2.2"
                            />
                            <polygon
                                points="-3,-26 0,-32 3,-26"
                                fill="#16a34a"
                            />
                            {/* Center Origin Dot */}
                            <circle
                                cx="0"
                                cy="0"
                                r="3.5"
                                fill="#ffffff"
                                stroke="#0b1c30"
                                strokeWidth="2"
                            />
                            <rect
                                x="6"
                                y="5"
                                width="84"
                                height="14"
                                rx="3"
                                fill="#0b1c30"
                                fillOpacity="0.88"
                            />
                            <text
                                x="10"
                                y="14.5"
                                fill="#ffffff"
                                className="font-mono text-[8px] font-bold"
                            >
                                ORIGIN [0.0, 0.0]
                            </text>
                        </g>
                    )}

                    {/* Pathplans & Active Draft Trajectory */}
                    {activePathsToRender.map((path) => {
                        if (!path.coordinates || path.coordinates.length < 2) {
                            return null;
                        }
                        const isSelected =
                            path.id === selectedPathplanId || path.id === -999;
                        const svgPoints = path.coordinates.map((pt) =>
                            metricToSvg(pt.x, pt.y, calibration),
                        );
                        const d = svgPoints
                            .map(
                                (pt, idx) =>
                                    `${idx === 0 ? 'M' : 'L'} ${pt.cx} ${pt.cy}`,
                            )
                            .join(' ');

                        const corridorStrokeWidth = Math.max(
                            12,
                            Math.min(
                                48,
                                Math.round(
                                    inflationRadius *
                                        calibration.pixelsPerMeterSvg,
                                ),
                            ),
                        );

                        return (
                            <g
                                key={path.id}
                                className="cursor-pointer"
                                onClick={(e) => {
                                    if (
                                        mode === 'view' &&
                                        onSelectPathplan &&
                                        path.id !== -999
                                    ) {
                                        e.stopPropagation();
                                        onSelectPathplan(path);
                                    }
                                }}
                            >
                                {/* Safety Inflation Corridor Envelope */}
                                {isSelected && (
                                    <>
                                        <path
                                            d={d}
                                            fill="none"
                                            opacity="0.16"
                                            stroke="#00a3ff"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={corridorStrokeWidth}
                                        />
                                        <path
                                            d={d}
                                            fill="none"
                                            opacity="0.35"
                                            stroke="#00a3ff"
                                            strokeDasharray="3 10"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={
                                                corridorStrokeWidth + 2
                                            }
                                        />
                                    </>
                                )}

                                {/* Main Centerline */}
                                <path
                                    d={d}
                                    fill="none"
                                    stroke={
                                        isSelected
                                            ? '#00a3ff'
                                            : path.is_bidirectional
                                              ? '#0284c7'
                                              : '#1d4ed8'
                                    }
                                    strokeDasharray={
                                        isSelected ? undefined : '8 4'
                                    }
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={isSelected ? '3.5' : '2.2'}
                                />

                                {/* Animated Trajectory Chevrons on Selected Path */}
                                {isSelected && (
                                    <path
                                        d={d}
                                        fill="none"
                                        opacity="0.9"
                                        stroke="#ffffff"
                                        strokeDasharray="8 20"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="1.8"
                                    />
                                )}

                                {/* Segment Distance Telemetry Tags & Waypoint Sequence Nodes */}
                                {isSelected &&
                                    svgPoints.map((pt, idx) => {
                                        const isGoal =
                                            idx === svgPoints.length - 1 &&
                                            svgPoints.length > 1;
                                        const prev =
                                            idx > 0
                                                ? path.coordinates[idx - 1]
                                                : null;
                                        const curr = path.coordinates[idx];
                                        const segDist = prev
                                            ? Math.hypot(
                                                  curr.x - prev.x,
                                                  curr.y - prev.y,
                                              ).toFixed(1)
                                            : null;
                                        const prevSvg =
                                            idx > 0 ? svgPoints[idx - 1] : null;

                                        return (
                                            <g key={`${path.id}-pt-${idx}`}>
                                                {prevSvg && segDist && (
                                                    <g
                                                        transform={`translate(${(pt.cx + prevSvg.cx) / 2}, ${(pt.cy + prevSvg.cy) / 2 - 10})`}
                                                    >
                                                        <rect
                                                            fill="#0b1c30"
                                                            height="16"
                                                            opacity="0.9"
                                                            rx="3"
                                                            width="40"
                                                            x="-20"
                                                            y="-8"
                                                        />
                                                        <text
                                                            className="font-label-sm text-[9px] font-semibold"
                                                            fill="#98cbff"
                                                            textAnchor="middle"
                                                            x="0"
                                                            y="3"
                                                        >
                                                            {segDist}m
                                                        </text>
                                                    </g>
                                                )}
                                                <g
                                                    transform={`translate(${pt.cx}, ${pt.cy})`}
                                                >
                                                    <circle
                                                        fill={
                                                            isGoal
                                                                ? '#16a34a'
                                                                : '#00a3ff'
                                                        }
                                                        opacity="0.22"
                                                        r="11"
                                                    />
                                                    <circle
                                                        fill={
                                                            isGoal
                                                                ? '#16a34a'
                                                                : '#ffffff'
                                                        }
                                                        r="6"
                                                        stroke={
                                                            isGoal
                                                                ? '#ffffff'
                                                                : '#00a3ff'
                                                        }
                                                        strokeWidth="2.5"
                                                    />
                                                    <rect
                                                        fill={
                                                            isGoal
                                                                ? '#16a34a'
                                                                : '#00629d'
                                                        }
                                                        height="14"
                                                        rx="3"
                                                        width={
                                                            isGoal ? '46' : '32'
                                                        }
                                                        x={
                                                            isGoal
                                                                ? '-23'
                                                                : '-16'
                                                        }
                                                        y="-24"
                                                    />
                                                    <text
                                                        className="font-label-sm text-[8px] font-bold"
                                                        fill="#ffffff"
                                                        textAnchor="middle"
                                                        x="0"
                                                        y="-14"
                                                    >
                                                        {isGoal
                                                            ? `WP-${idx + 1} GOAL`
                                                            : `WP-${idx + 1}`}
                                                    </text>
                                                </g>
                                            </g>
                                        );
                                    })}
                            </g>
                        );
                    })}

                    {/* Waypoints / Station Nodes */}
                    {waypoints.map((wp) => {
                        const { cx, cy } = metricToSvg(wp.x, wp.y, calibration);
                        const isSelected = wp.id === selectedWaypointId;
                        const isCharger =
                            wp.name.toUpperCase().includes('CHARGE') ||
                            wp.name.toUpperCase().includes('CHG');

                        return (
                            <g
                                key={wp.id}
                                className="cursor-pointer"
                                transform={`translate(${cx}, ${cy})`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (
                                        mode === 'draw-path' &&
                                        onAddPathPoint
                                    ) {
                                        onAddPathPoint({ x: wp.x, y: wp.y });
                                    } else if (onSelectWaypoint) {
                                        onSelectWaypoint(wp);
                                    }
                                }}
                            >
                                {isSelected && (
                                    <circle
                                        className="animate-ping"
                                        cx="0"
                                        cy="0"
                                        fill="#00a3ff"
                                        opacity="0.35"
                                        r="18"
                                    />
                                )}
                                <rect
                                    fill={
                                        isSelected
                                            ? '#00a3ff'
                                            : isCharger
                                              ? '#0b1c30'
                                              : '#ffffff'
                                    }
                                    height="20"
                                    rx="3"
                                    stroke={isSelected ? '#0b1c30' : '#00a3ff'}
                                    strokeWidth="2"
                                    transform="rotate(45)"
                                    width="20"
                                    x="-10"
                                    y="-10"
                                />
                                <circle
                                    cx="0"
                                    cy="0"
                                    fill={
                                        isSelected
                                            ? '#ffffff'
                                            : isCharger
                                              ? '#00a3ff'
                                              : '#1d4ed8'
                                    }
                                    r="3"
                                />
                                <g transform="translate(15, -8)">
                                    <rect
                                        fill={
                                            isSelected ? '#0b1c30' : '#ffffff'
                                        }
                                        fillOpacity="0.92"
                                        height="16"
                                        rx="3"
                                        stroke={
                                            isSelected ? '#00a3ff' : '#cbd5e1'
                                        }
                                        strokeWidth="1"
                                        width={Math.max(
                                            52,
                                            wp.name.length * 6.2,
                                        )}
                                    />
                                    <text
                                        className="font-label-sm text-[9px] font-bold"
                                        fill={
                                            isSelected ? '#ffffff' : '#0b1c30'
                                        }
                                        x="5"
                                        y="11"
                                    >
                                        {wp.name}
                                    </text>
                                </g>
                            </g>
                        );
                    })}

                    {/* Live AMR Vehicle Markers */}
                    {vehicles.map((vehicle) => {
                        const x = vehicle.pose?.x ?? 4.0;
                        const y = vehicle.pose?.y ?? 4.0;
                        const { cx, cy } = metricToSvg(x, y, calibration);
                        const isSelected = vehicle.id === selectedVehicleId;
                        const isEStop =
                            vehicle.status === 'emergency_stop' ||
                            vehicle.status === 'error';
                        const isMoving =
                            vehicle.status === 'moving' ||
                            vehicle.status === 'active';
                        const strokeColor = isEStop
                            ? '#ef4444'
                            : isMoving
                              ? '#00a3ff'
                              : '#6366f1';

                        return (
                            <g
                                key={vehicle.id}
                                className="cursor-pointer"
                                transform={`translate(${cx}, ${cy})`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onSelectVehicle) {
                                        onSelectVehicle(vehicle);
                                    }
                                }}
                            >
                                {isSelected && (
                                    <>
                                        <circle
                                            className="animate-ping"
                                            cx="0"
                                            cy="0"
                                            fill={strokeColor}
                                            opacity="0.28"
                                            r="28"
                                        />
                                        <circle
                                            cx="0"
                                            cy="0"
                                            fill="none"
                                            stroke={strokeColor}
                                            strokeDasharray="4 4"
                                            strokeWidth="1.5"
                                            r="26"
                                        />
                                    </>
                                )}
                                <circle
                                    cx="0"
                                    cy="0"
                                    fill={strokeColor}
                                    fillOpacity="0.18"
                                    r="20"
                                />
                                <circle
                                    cx="0"
                                    cy="0"
                                    fill="#0b1c30"
                                    r="12"
                                    stroke={
                                        isSelected ? '#ffffff' : strokeColor
                                    }
                                    strokeWidth={isSelected ? '3' : '2.5'}
                                />
                                <polygon
                                    fill={strokeColor}
                                    points="0,-6 4,4 0,2 -4,4"
                                />
                                <g transform="translate(16, -12)">
                                    <rect
                                        fill="#0b1c30"
                                        height="20"
                                        rx="4"
                                        stroke={strokeColor}
                                        strokeWidth={isSelected ? '1.8' : '1'}
                                        width="92"
                                    />
                                    <text
                                        className="font-label-sm text-[9px] font-bold"
                                        fill="#ffffff"
                                        x="6"
                                        y="13"
                                    >
                                        {vehicle.id} •{' '}
                                        {vehicle.battery_percentage}%
                                    </text>
                                </g>
                            </g>
                        );
                    })}

                    {/* Interactive Placement Ghost Crosshair */}
                    {(mode === 'pick-station' || mode === 'draw-path') && (
                        <g
                            className="pointer-events-none"
                            transform={`translate(${cursorSvg.cx}, ${cursorSvg.cy})`}
                        >
                            <circle
                                cx="0"
                                cy="0"
                                fill="#00a3ff"
                                fillOpacity="0.2"
                                r="16"
                                stroke="#00a3ff"
                                strokeDasharray="3 3"
                                strokeWidth="1.5"
                            />
                            <circle cx="0" cy="0" fill="#00a3ff" r="4" />
                            <rect
                                fill="#0b1c30"
                                height="18"
                                rx="3"
                                width="92"
                                x="12"
                                y="-22"
                            />
                            <text
                                className="font-mono text-[9px] font-bold"
                                fill="#98cbff"
                                x="18"
                                y="-10"
                            >
                                [{cursorMetric.x.toFixed(2)},{' '}
                                {cursorMetric.y.toFixed(2)}]
                            </text>
                        </g>
                    )}

                    {/* RViz 2D Pose Estimate Active Drag-to-Aim Arrow */}
                    {mode === 'pose-estimate' && poseEstimateOrigin && poseEstimateCurrent && (
                        <g className="pointer-events-none">
                            {/* Origin Base Dot & Radial Target Radar */}
                            <circle
                                cx={poseEstimateOrigin.cx}
                                cy={poseEstimateOrigin.cy}
                                r="14"
                                fill="#10b981"
                                fillOpacity="0.2"
                                stroke="#10b981"
                                strokeWidth="2"
                            />
                            <circle
                                cx={poseEstimateOrigin.cx}
                                cy={poseEstimateOrigin.cy}
                                r="4"
                                fill="#10b981"
                            />

                            {/* Heading Vector Line & Arrowhead */}
                            <line
                                x1={poseEstimateOrigin.cx}
                                y1={poseEstimateOrigin.cy}
                                x2={poseEstimateCurrent.cx}
                                y2={poseEstimateCurrent.cy}
                                stroke="#10b981"
                                strokeWidth="3"
                                markerEnd="url(#poseEstimateArrow)"
                            />

                            {/* Angle Degrees HUD Badge */}
                            <g transform={`translate(${poseEstimateCurrent.cx + 12}, ${poseEstimateCurrent.cy - 12})`}>
                                <rect
                                    fill="#0b1c30"
                                    height="22"
                                    rx="4"
                                    width="136"
                                    stroke="#10b981"
                                    strokeWidth="1.5"
                                    className="drop-shadow-md"
                                />
                                <text
                                    className="font-mono text-[9px] font-bold"
                                    fill="#6ee7b7"
                                    x="8"
                                    y="14"
                                >
                                    θ: {Math.round((poseEstimateCurrent.theta * 180) / Math.PI)}° (
                                    {poseEstimateCurrent.theta.toFixed(2)} rad)
                                </text>
                            </g>
                        </g>
                    )}

                    {/* Idle Hover Crosshair in Pose Estimate Mode */}
                    {mode === 'pose-estimate' && !poseEstimateOrigin && (
                        <g
                            className="pointer-events-none"
                            transform={`translate(${cursorSvg.cx}, ${cursorSvg.cy})`}
                        >
                            <circle
                                cx="0"
                                cy="0"
                                fill="#10b981"
                                fillOpacity="0.15"
                                r="20"
                                stroke="#10b981"
                                strokeDasharray="3 3"
                                strokeWidth="1.5"
                            />
                            <circle cx="0" cy="0" fill="#10b981" r="3.5" />
                            <rect
                                fill="#0b1c30"
                                height="20"
                                rx="3"
                                width="128"
                                x="12"
                                y="-24"
                            />
                            <text
                                className="font-mono text-[9px] font-bold"
                                fill="#a7f3d0"
                                x="16"
                                y="-10"
                            >
                                DRAG ARROW: [{cursorMetric.x.toFixed(2)}, {cursorMetric.y.toFixed(2)}]
                            </text>
                        </g>
                    )}
                </svg>
            </div>

            {/* Floating Spatial Telemetry & Zoom Controls HUD */}
            <div
                className={`pointer-events-auto absolute right-4 z-20 flex items-center gap-2 rounded-xl border border-slate-200/80 bg-surface-container-lowest/95 px-3 py-1.5 shadow-md backdrop-blur-md ${
                    hudPosition === 'top-right' ? 'top-4' : 'bottom-4'
                }`}
            >
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-[15px] text-primary">
                        near_me
                    </span>
                    <span>
                        X:{' '}
                        <strong className="text-on-surface">
                            {cursorMetric.x.toFixed(2)}m
                        </strong>
                    </span>
                    <span className="text-outline-variant">|</span>
                    <span>
                        Y:{' '}
                        <strong className="text-on-surface">
                            {cursorMetric.y.toFixed(2)}m
                        </strong>
                    </span>
                    {cursorMetric.u !== undefined &&
                        cursorMetric.v !== undefined && (
                            <>
                                <span className="text-outline-variant">|</span>
                                <span>
                                    PGM:[
                                    <strong className="text-primary">
                                        {cursorMetric.u},{cursorMetric.v}
                                    </strong>
                                    ]
                                </span>
                            </>
                        )}
                    <span className="text-outline-variant">|</span>
                    <span>
                        RES: <strong>{calibration.resolution}m/px</strong>
                    </span>
                </div>

                <div className="h-4 w-px bg-slate-200" />

                <div className="flex items-center gap-0.5">
                    <button
                        type="button"
                        onClick={() =>
                            setZoom((z) =>
                                Math.min(2.5, Number((z + 0.2).toFixed(2))),
                            )
                        }
                        title="Zoom In"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded hover:bg-surface-container"
                    >
                        <span className="material-symbols-outlined text-[17px]">
                            add
                        </span>
                    </button>
                    <span className="px-1 font-mono text-[10px] font-semibold text-on-surface">
                        {Math.round(zoom * 100)}%
                    </span>
                    <button
                        type="button"
                        onClick={() =>
                            setZoom((z) =>
                                Math.max(0.6, Number((z - 0.2).toFixed(2))),
                            )
                        }
                        title="Zoom Out"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded hover:bg-surface-container"
                    >
                        <span className="material-symbols-outlined text-[17px]">
                            remove
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={resetView}
                        title="Reset View Center"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded hover:bg-surface-container"
                    >
                        <span className="material-symbols-outlined text-[16px]">
                            center_focus_strong
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
