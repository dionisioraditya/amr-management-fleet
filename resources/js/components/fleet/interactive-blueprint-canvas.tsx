import { useEffect, useRef, useState } from 'react';
import type {
    FacilityMap,
    PathCoordinate,
    Pathplan,
    Vehicle,
    Waypoint,
} from '@/types';

export type AngleConstraintMode = 'ortho-45' | 'ortho-90' | 'free';

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
    onClearSelection?: () => void;
    mode?: 'view' | 'pick-station' | 'draw-path' | 'pose-estimate';
    onPickCoordinate?: (coord: PathCoordinate) => void;
    onPoseEstimate?: (pose: { x: number; y: number; theta: number }) => void;
    draftCoordinates?: PathCoordinate[];
    onAddPathPoint?: (coord: PathCoordinate) => void;
    onUpdatePathPoint?: (index: number, coord: PathCoordinate) => void;
    defaultCornerRadius?: number; // in meters, default 0.8
    angleConstraintMode?: AngleConstraintMode;
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
 * Projects rawPoint onto an orthogonal (0°/90°) or 45°-increment axis relative to prevPoint.
 */
export function applyAngleConstraint(
    prevPoint: PathCoordinate,
    rawPoint: { x: number; y: number },
    constraintMode: AngleConstraintMode = 'ortho-45',
    shiftKey = false,
    snapStep = 0.5,
): { x: number; y: number; angleDeg: number; lengthM: number } {
    const dx = rawPoint.x - prevPoint.x;
    const dy = rawPoint.y - prevPoint.y;
    const rawDist = Math.hypot(dx, dy);

    if (rawDist < 1e-4) {
        return { x: prevPoint.x, y: prevPoint.y, angleDeg: 0, lengthM: 0 };
    }

    const effectiveMode =
        constraintMode === 'free' && shiftKey ? 'ortho-45' : constraintMode;

    let finalX = rawPoint.x;
    let finalY = rawPoint.y;

    if (effectiveMode === 'ortho-90') {
        if (Math.abs(dx) >= Math.abs(dy)) {
            finalX = rawPoint.x;
            finalY = prevPoint.y;
        } else {
            finalX = prevPoint.x;
            finalY = rawPoint.y;
        }
    } else if (effectiveMode === 'ortho-45') {
        const theta = Math.atan2(dy, dx);
        const sector = Math.round(theta / (Math.PI / 4)); // -4 to +4
        const absSector = Math.abs(sector);

        if (absSector === 0 || absSector === 4) {
            finalX = rawPoint.x;
            finalY = prevPoint.y;
        } else if (absSector === 2) {
            finalX = prevPoint.x;
            finalY = rawPoint.y;
        } else {
            const avgDelta = (Math.abs(dx) + Math.abs(dy)) / 2;
            const snappedDelta =
                snapStep > 0
                    ? Math.max(
                          snapStep,
                          Math.round(avgDelta / snapStep) * snapStep,
                      )
                    : avgDelta;
            finalX = Number(
                (prevPoint.x + Math.sign(dx || 1) * snappedDelta).toFixed(2),
            );
            finalY = Number(
                (prevPoint.y + Math.sign(dy || 1) * snappedDelta).toFixed(2),
            );
        }
    }

    const fdx = finalX - prevPoint.x;
    const fdy = finalY - prevPoint.y;
    const lengthM = Number(Math.hypot(fdx, fdy).toFixed(2));
    let angleDeg = Math.round((Math.atan2(fdy, fdx) * 180) / Math.PI);
    if (angleDeg < 0) angleDeg += 360;

    return {
        x: finalX,
        y: finalY,
        angleDeg,
        lengthM,
    };
}

export interface CornerFilletSegment {
    vertexIndex: number;
    vertex: { x: number; y: number };
    vertexSvg: { cx: number; cy: number };
    tangentIn: { x: number; y: number };
    tangentInSvg: { cx: number; cy: number };
    tangentOut: { x: number; y: number };
    tangentOutSvg: { cx: number; cy: number };
    arcCenter: { x: number; y: number };
    arcMidSvg: { cx: number; cy: number };
    requestedRadius: number;
    effectiveRadius: number;
    turnAngleDeg: number;
    arcLengthM: number;
    sweepFlag: 0 | 1;
    rxSvg: number;
    rySvg: number;
}

export interface FilletedPathGeometry {
    svgPathD: string;
    corners: CornerFilletSegment[];
    totalLengthM: number;
}

/**
 * Computes G1-continuous tangential circular arc fillets at every interior vertex
 * and builds the composite SVG path string (`M ... L ... A ...`) and true metric length.
 */
export function computeFilletedPathGeometry(
    coords: PathCoordinate[],
    defaultCornerRadius = 0.8,
    calibration?: CanvasCalibration,
): FilletedPathGeometry {
    if (!coords || coords.length === 0) {
        return { svgPathD: '', corners: [], totalLengthM: 0 };
    }
    if (coords.length === 1) {
        const p0 = metricToSvg(coords[0].x, coords[0].y, calibration);
        return {
            svgPathD: `M ${p0.cx} ${p0.cy}`,
            corners: [],
            totalLengthM: 0,
        };
    }

    const isRasterSpace =
        calibration && (calibration.hasRasterMap || calibration.widthPx !== 460);
    const scaleX = isRasterSpace ? calibration.pixelsPerMeterSvg : 36;
    const scaleY = isRasterSpace ? calibration.pixelsPerMeterSvg : 22;

    const corners: CornerFilletSegment[] = [];

    for (let i = 1; i < coords.length - 1; i++) {
        const prev = coords[i - 1];
        const curr = coords[i];
        const next = coords[i + 1];

        const ux = prev.x - curr.x;
        const uy = prev.y - curr.y;
        const vx = next.x - curr.x;
        const vy = next.y - curr.y;

        const lenIn = Math.hypot(ux, uy);
        const lenOut = Math.hypot(vx, vy);
        const reqR =
            curr.r !== undefined ? Math.max(0, curr.r) : defaultCornerRadius;

        const vertexSvg = metricToSvg(curr.x, curr.y, calibration);

        if (lenIn < 0.05 || lenOut < 0.05 || reqR <= 0.01) {
            corners.push({
                vertexIndex: i,
                vertex: { x: curr.x, y: curr.y },
                vertexSvg,
                tangentIn: { x: curr.x, y: curr.y },
                tangentInSvg: vertexSvg,
                tangentOut: { x: curr.x, y: curr.y },
                tangentOutSvg: vertexSvg,
                arcCenter: { x: curr.x, y: curr.y },
                arcMidSvg: vertexSvg,
                requestedRadius: reqR,
                effectiveRadius: 0,
                turnAngleDeg: 0,
                arcLengthM: 0,
                sweepFlag: 0,
                rxSvg: 0,
                rySvg: 0,
            });
            continue;
        }

        const uHatX = ux / lenIn;
        const uHatY = uy / lenIn;
        const vHatX = vx / lenOut;
        const vHatY = vy / lenOut;

        const cosAlpha = Math.max(
            -1,
            Math.min(1, uHatX * vHatX + uHatY * vHatY),
        );
        const alpha = Math.acos(cosAlpha); // Interior angle between segments (radians)
        const deflectionRad = Math.PI - alpha; // Turn angle (0 = straight, pi/2 = 90 deg turn)
        const turnAngleDeg = Number(((deflectionRad * 180) / Math.PI).toFixed(1));

        if (deflectionRad < 0.035 || alpha < 0.08) {
            corners.push({
                vertexIndex: i,
                vertex: { x: curr.x, y: curr.y },
                vertexSvg,
                tangentIn: { x: curr.x, y: curr.y },
                tangentInSvg: vertexSvg,
                tangentOut: { x: curr.x, y: curr.y },
                tangentOutSvg: vertexSvg,
                arcCenter: { x: curr.x, y: curr.y },
                arcMidSvg: vertexSvg,
                requestedRadius: reqR,
                effectiveRadius: 0,
                turnAngleDeg,
                arcLengthM: 0,
                sweepFlag: 0,
                rxSvg: 0,
                rySvg: 0,
            });
            continue;
        }

        const halfAlpha = alpha / 2;
        const tanHalfAlpha = Math.tan(halfAlpha);
        const idealTangentDist = reqR / tanHalfAlpha;
        const maxTangentDist = 0.45 * Math.min(lenIn, lenOut);
        const tangentDist = Math.min(idealTangentDist, maxTangentDist);
        const effectiveRadius = Number((tangentDist * tanHalfAlpha).toFixed(3));

        const tIn = {
            x: Number((curr.x + tangentDist * uHatX).toFixed(3)),
            y: Number((curr.y + tangentDist * uHatY).toFixed(3)),
        };
        const tOut = {
            x: Number((curr.x + tangentDist * vHatX).toFixed(3)),
            y: Number((curr.y + tangentDist * vHatY).toFixed(3)),
        };

        const bx = uHatX + vHatX;
        const by = uHatY + vHatY;
        const bLen = Math.hypot(bx, by) || 1;
        const bHatX = bx / bLen;
        const bHatY = by / bLen;
        const centerDist = Math.hypot(tangentDist, effectiveRadius);

        const arcCenter = {
            x: curr.x + centerDist * bHatX,
            y: curr.y + centerDist * bHatY,
        };
        const arcMidMetric = {
            x: arcCenter.x - effectiveRadius * bHatX,
            y: arcCenter.y - effectiveRadius * bHatY,
        };

        // 2D cross product of incoming direction (-uHat) and outgoing direction (vHat)
        const dInX = -uHatX;
        const dInY = -uHatY;
        const cross = dInX * vHatY - dInY * vHatX;
        const sweepFlag: 0 | 1 = cross < 0 ? 1 : 0;

        const tInSvg = metricToSvg(tIn.x, tIn.y, calibration);
        const tOutSvg = metricToSvg(tOut.x, tOut.y, calibration);
        const arcMidSvg = metricToSvg(arcMidMetric.x, arcMidMetric.y, calibration);

        corners.push({
            vertexIndex: i,
            vertex: { x: curr.x, y: curr.y },
            vertexSvg,
            tangentIn: tIn,
            tangentInSvg: tInSvg,
            tangentOut: tOut,
            tangentOutSvg: tOutSvg,
            arcCenter,
            arcMidSvg,
            requestedRadius: reqR,
            effectiveRadius,
            turnAngleDeg,
            arcLengthM: effectiveRadius * deflectionRad,
            sweepFlag,
            rxSvg: Number((effectiveRadius * scaleX).toFixed(2)),
            rySvg: Number((effectiveRadius * scaleY).toFixed(2)),
        });
    }

    const startSvg = metricToSvg(coords[0].x, coords[0].y, calibration);
    const dParts: string[] = [`M ${startSvg.cx} ${startSvg.cy}`];

    let totalLength = 0;
    let prevExitMetric = { x: coords[0].x, y: coords[0].y };

    for (const c of corners) {
        totalLength += Math.hypot(
            c.tangentIn.x - prevExitMetric.x,
            c.tangentIn.y - prevExitMetric.y,
        );
        if (c.effectiveRadius > 0.01) {
            dParts.push(`L ${c.tangentInSvg.cx} ${c.tangentInSvg.cy}`);
            dParts.push(
                `A ${c.rxSvg} ${c.rySvg} 0 0 ${c.sweepFlag} ${c.tangentOutSvg.cx} ${c.tangentOutSvg.cy}`,
            );
            totalLength += c.arcLengthM;
            prevExitMetric = c.tangentOut;
        } else {
            dParts.push(`L ${c.vertexSvg.cx} ${c.vertexSvg.cy}`);
            prevExitMetric = c.vertex;
        }
    }

    const lastPt = coords[coords.length - 1];
    const lastSvg = metricToSvg(lastPt.x, lastPt.y, calibration);
    dParts.push(`L ${lastSvg.cx} ${lastSvg.cy}`);
    totalLength += Math.hypot(
        lastPt.x - prevExitMetric.x,
        lastPt.y - prevExitMetric.y,
    );

    return {
        svgPathD: dParts.join(' '),
        corners,
        totalLengthM: Number(totalLength.toFixed(2)),
    };
}

/**
 * Discretizes a filleted path into dense ROS 2 `nav_msgs/msg/Path` poses
 * ({ x, y, theta, kappa }) for Pure Pursuit / Regulated Pure Pursuit controllers.
 */
export function discretizeFilletedPathForRos2(
    coords: PathCoordinate[],
    defaultCornerRadius = 0.8,
    stepMeters = 0.15,
): { x: number; y: number; theta: number; kappa: number }[] {
    if (!coords || coords.length < 2) {
        return [];
    }

    const geom = computeFilletedPathGeometry(coords, defaultCornerRadius);
    const poses: { x: number; y: number; theta: number; kappa: number }[] = [];

    const appendLineSegment = (
        pStart: { x: number; y: number },
        pEnd: { x: number; y: number },
    ) => {
        const dx = pEnd.x - pStart.x;
        const dy = pEnd.y - pStart.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 1e-4) return;
        const theta = Number(Math.atan2(dy, dx).toFixed(4));
        const steps = Math.max(1, Math.ceil(dist / stepMeters));
        for (let s = 0; s < steps; s++) {
            const t = s / steps;
            poses.push({
                x: Number((pStart.x + t * dx).toFixed(3)),
                y: Number((pStart.y + t * dy).toFixed(3)),
                theta,
                kappa: 0.0,
            });
        }
    };

    let currentPt = { x: coords[0].x, y: coords[0].y };

    for (const c of geom.corners) {
        appendLineSegment(currentPt, c.tangentIn);
        if (c.effectiveRadius > 0.01 && c.arcLengthM > 1e-3) {
            const phiIn = Math.atan2(
                c.tangentIn.y - c.arcCenter.y,
                c.tangentIn.x - c.arcCenter.x,
            );
            const phiOut = Math.atan2(
                c.tangentOut.y - c.arcCenter.y,
                c.tangentOut.x - c.arcCenter.x,
            );
            let dPhi = phiOut - phiIn;
            while (dPhi > Math.PI) dPhi -= 2 * Math.PI;
            while (dPhi <= -Math.PI) dPhi += 2 * Math.PI;

            const arcSteps = Math.max(2, Math.ceil(c.arcLengthM / stepMeters));
            const turnSign = dPhi >= 0 ? 1 : -1;
            const kappa = Number((turnSign / c.effectiveRadius).toFixed(4));

            for (let s = 0; s < arcSteps; s++) {
                const t = s / arcSteps;
                const phi = phiIn + t * dPhi;
                let heading = phi + turnSign * (Math.PI / 2);
                while (heading > Math.PI) heading -= 2 * Math.PI;
                while (heading <= -Math.PI) heading += 2 * Math.PI;

                poses.push({
                    x: Number(
                        (
                            c.arcCenter.x +
                            c.effectiveRadius * Math.cos(phi)
                        ).toFixed(3),
                    ),
                    y: Number(
                        (
                            c.arcCenter.y +
                            c.effectiveRadius * Math.sin(phi)
                        ).toFixed(3),
                    ),
                    theta: Number(heading.toFixed(4)),
                    kappa,
                });
            }
            currentPt = c.tangentOut;
        } else {
            currentPt = c.vertex;
        }
    }

    const finalPt = coords[coords.length - 1];
    appendLineSegment(currentPt, finalPt);

    const lastHeading =
        poses.length > 0
            ? poses[poses.length - 1].theta
            : Number(
                  Math.atan2(
                      finalPt.y - coords[0].y,
                      finalPt.x - coords[0].x,
                  ).toFixed(4),
              );
    poses.push({
        x: Number(finalPt.x.toFixed(3)),
        y: Number(finalPt.y.toFixed(3)),
        theta: lastHeading,
        kappa: 0.0,
    });

    return poses;
}

/**
 * Calculates total filleted path length in meters (straight tangents + circular arcs).
 */
export function calculatePathLength(
    coords: PathCoordinate[],
    defaultCornerRadius = 0.8,
): number {
    if (!coords || coords.length < 2) {
        return 0;
    }
    const geom = computeFilletedPathGeometry(coords, defaultCornerRadius);
    return Number(geom.totalLengthM.toFixed(1));
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
    onClearSelection,
    mode = 'view',
    onPickCoordinate,
    onPoseEstimate,
    draftCoordinates = [],
    onAddPathPoint,
    onUpdatePathPoint,
    defaultCornerRadius = 0.8,
    angleConstraintMode = 'ortho-45',
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
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const zoomRef = useRef(zoom);
    zoomRef.current = zoom;
    const panRef = useRef(pan);
    panRef.current = pan;

    // Intercept Ctrl + Scroll (and trackpad pinch-zoom) so that ONLY the map zooms,
    // preventing the browser from zooming the entire dashboard web page.
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();

                const currentZoom = zoomRef.current;
                const currentPan = panRef.current;

                const factor = e.deltaY < 0 ? 1.15 : 0.85;
                const nextZoom = Math.min(
                    3.5,
                    Math.max(0.5, Number((currentZoom * factor).toFixed(2))),
                );

                if (nextZoom === currentZoom) return;

                const rect = container.getBoundingClientRect();
                const mouseX = e.clientX - rect.left - rect.width / 2;
                const mouseY = e.clientY - rect.top - rect.height / 2;

                const scaleRatio = nextZoom / currentZoom;
                const nextPanX = Number(
                    (mouseX - (mouseX - currentPan.x) * scaleRatio).toFixed(1),
                );
                const nextPanY = Number(
                    (mouseY - (mouseY - currentPan.y) * scaleRatio).toFixed(1),
                );

                setZoom(nextZoom);
                setPan({ x: nextPanX, y: nextPanY });
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, []);
    const [cursorMetric, setCursorMetric] = useState<{
        x: number;
        y: number;
        u?: number;
        v?: number;
    }>({
        x: 0.0,
        y: 0.0,
    });
    const [isShiftPressed, setIsShiftPressed] = useState(false);
    const [draggingVertexIndex, setDraggingVertexIndex] = useState<
        number | null
    >(null);
    const suppressNextClickRef = useRef(false);
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

        const ctm = svg.getScreenCTM();
        if (ctm) {
            const pt = svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const svgPt = pt.matrixTransform(ctm.inverse());
            return {
                cx: Number(svgPt.x.toFixed(2)),
                cy: Number(svgPt.y.toFixed(2)),
            };
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
        setIsShiftPressed(e.shiftKey);

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

        if (
            draggingVertexIndex !== null &&
            onUpdatePathPoint &&
            draftCoordinates[draggingVertexIndex]
        ) {
            const existing = draftCoordinates[draggingVertexIndex];
            onUpdatePathPoint(draggingVertexIndex, {
                ...existing,
                x: metric.x,
                y: metric.y,
            });
            return;
        }

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
        if (suppressNextClickRef.current) {
            suppressNextClickRef.current = false;
            return;
        }
        if (
            isPanning ||
            draggingVertexIndex !== null ||
            mode === 'pose-estimate'
        ) {
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
            if (draftCoordinates.length > 0) {
                const constrained = applyAngleConstraint(
                    draftCoordinates[draftCoordinates.length - 1],
                    metric,
                    angleConstraintMode,
                    e.shiftKey,
                    snapStep,
                );
                onAddPathPoint({
                    x: constrained.x,
                    y: constrained.y,
                    r: defaultCornerRadius,
                });
            } else {
                onAddPathPoint({
                    x: metric.x,
                    y: metric.y,
                    r: defaultCornerRadius,
                });
            }
        } else if (mode === 'view') {
            onClearSelection?.();
        }
    };

    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
        if (
            e.button === 1 ||
            (e.button === 0 && e.shiftKey && mode !== 'draw-path')
        ) {
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
        if (draggingVertexIndex !== null) {
            setDraggingVertexIndex(null);
            suppressNextClickRef.current = true;
            return;
        }

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

    const constrainedDraftCursor =
        mode === 'draw-path' &&
        draftCoordinates.length > 0 &&
        draggingVertexIndex === null
            ? applyAngleConstraint(
                  draftCoordinates[draftCoordinates.length - 1],
                  cursorMetric,
                  angleConstraintMode,
                  isShiftPressed,
                  snapStep,
              )
            : {
                  x: cursorMetric.x,
                  y: cursorMetric.y,
                  angleDeg: 0,
                  lengthM: 0,
              };

    const effectiveCursorMetric =
        mode === 'draw-path' &&
        draftCoordinates.length > 0 &&
        draggingVertexIndex === null
            ? {
                  ...cursorMetric,
                  x: constrainedDraftCursor.x,
                  y: constrainedDraftCursor.y,
              }
            : cursorMetric;

    const cursorSvg = metricToSvg(
        effectiveCursorMetric.x,
        effectiveCursorMetric.y,
        calibration,
    );
    const originSvg = metricToSvg(0, 0, calibration);

    const activePathsToRender = (() => {
        if (draftCoordinates.length > 0) {
            if (
                selectedPathplanId !== null &&
                pathplans.some((p) => p.id === selectedPathplanId)
            ) {
                return pathplans.map((p) =>
                    p.id === selectedPathplanId
                        ? { ...p, coordinates: draftCoordinates }
                        : p,
                );
            }
            // Retain new draft path on map before and after "Finish Pen" until saved
            return [
                ...pathplans,
                {
                    id: -999,
                    map_id: map?.id ?? 1,
                    name: 'DRAFT-PATH',
                    is_bidirectional: true,
                    max_speed: 1.2,
                    coordinates: draftCoordinates,
                },
            ];
        }
        return pathplans;
    })();

    const isRawRosMode = occupancyViewMode === 'raw';

    return (
        <div
            ref={containerRef}
            className={`relative inset-0 z-0 flex h-full w-full items-center justify-center overflow-hidden select-none ${
                isRawRosMode ? 'bg-[#d4d8dd]' : 'bg-[#f8f9ff]'
            }`}
            onClick={(e) => {
                if (e.target === e.currentTarget && mode === 'view') {
                    onClearSelection?.();
                }
            }}
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
                className={`relative flex h-full max-h-[920px] w-full max-w-[1580px] items-center justify-center p-4 ${
                    isPanning ? '' : 'transition-transform duration-75 ease-out'
                }`}
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
                        const filletedGeom = computeFilletedPathGeometry(
                            path.coordinates,
                            defaultCornerRadius,
                            calibration,
                        );
                        const d = filletedGeom.svgPathD;

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

                                {/* Invisible Wide Hitbox for Easy Clicking */}
                                <path
                                    d={d}
                                    fill="none"
                                    stroke="transparent"
                                    strokeWidth="20"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />

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

                                {/* CAD Corner Fillet Construction Wireframe & Arc Radius Badges */}
                                {isSelected &&
                                    filletedGeom.corners.map((corner) => {
                                        if (
                                            corner.effectiveRadius <= 0.01 ||
                                            corner.turnAngleDeg < 2
                                        ) {
                                            return null;
                                        }
                                        return (
                                            <g
                                                key={`${path.id}-fillet-${corner.vertexIndex}`}
                                                className="pointer-events-none"
                                            >
                                                {/* Dashed Construction Tangent Legs (T_in -> Vertex -> T_out) */}
                                                <path
                                                    d={`M ${corner.tangentInSvg.cx} ${corner.tangentInSvg.cy} L ${corner.vertexSvg.cx} ${corner.vertexSvg.cy} L ${corner.tangentOutSvg.cx} ${corner.tangentOutSvg.cy}`}
                                                    fill="none"
                                                    stroke="#0284c7"
                                                    strokeDasharray="3 3"
                                                    strokeOpacity="0.65"
                                                    strokeWidth="1.4"
                                                />
                                                {/* Highlighted Fillet Arc Curve */}
                                                <path
                                                    d={`M ${corner.tangentInSvg.cx} ${corner.tangentInSvg.cy} A ${corner.rxSvg} ${corner.rySvg} 0 0 ${corner.sweepFlag} ${corner.tangentOutSvg.cx} ${corner.tangentOutSvg.cy}`}
                                                    fill="none"
                                                    stroke="#10b981"
                                                    strokeLinecap="round"
                                                    strokeWidth="3.8"
                                                />
                                                {/* Tangent Transition Dots */}
                                                <circle
                                                    cx={corner.tangentInSvg.cx}
                                                    cy={corner.tangentInSvg.cy}
                                                    r="2.8"
                                                    fill="#10b981"
                                                    stroke="#ffffff"
                                                    strokeWidth="1"
                                                />
                                                <circle
                                                    cx={corner.tangentOutSvg.cx}
                                                    cy={corner.tangentOutSvg.cy}
                                                    r="2.8"
                                                    fill="#10b981"
                                                    stroke="#ffffff"
                                                    strokeWidth="1"
                                                />
                                                {/* Corner Radius & Deflection Angle Badge */}
                                                <g
                                                    transform={`translate(${corner.arcMidSvg.cx}, ${corner.arcMidSvg.cy + 15})`}
                                                >
                                                    <rect
                                                        fill="#064e3b"
                                                        fillOpacity="0.92"
                                                        height="14"
                                                        rx="3"
                                                        stroke="#10b981"
                                                        strokeWidth="1"
                                                        width="68"
                                                        x="-34"
                                                        y="-7"
                                                    />
                                                    <text
                                                        className="font-mono text-[8px] font-bold"
                                                        fill="#a7f3d0"
                                                        textAnchor="middle"
                                                        x="0"
                                                        y="2.5"
                                                    >
                                                        R{corner.effectiveRadius.toFixed(1)}m · {Math.round(corner.turnAngleDeg)}°
                                                    </text>
                                                </g>
                                            </g>
                                        );
                                    })}

                                {/* Segment Distance Telemetry Tags & Draggable Waypoint Sequence Nodes */}
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
                                        const isBeingDragged =
                                            draggingVertexIndex === idx;

                                        return (
                                            <g key={`${path.id}-pt-${idx}`}>
                                                {prevSvg && segDist && (
                                                    <g
                                                        className="pointer-events-none"
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
                                                    className={
                                                        onUpdatePathPoint
                                                            ? 'cursor-grab active:cursor-grabbing'
                                                            : ''
                                                    }
                                                    transform={`translate(${pt.cx}, ${pt.cy})`}
                                                    onMouseDown={(e) => {
                                                        if (
                                                            onUpdatePathPoint &&
                                                            e.button === 0
                                                        ) {
                                                            e.stopPropagation();
                                                            setDraggingVertexIndex(
                                                                idx,
                                                            );
                                                        }
                                                    }}
                                                >
                                                    <circle
                                                        fill={
                                                            isBeingDragged
                                                                ? '#f59e0b'
                                                                : isGoal
                                                                  ? '#16a34a'
                                                                  : '#00a3ff'
                                                        }
                                                        opacity="0.22"
                                                        r={
                                                            isBeingDragged
                                                                ? '15'
                                                                : '11'
                                                        }
                                                    />
                                                    <circle
                                                        fill={
                                                            isBeingDragged
                                                                ? '#f59e0b'
                                                                : isGoal
                                                                  ? '#16a34a'
                                                                  : '#ffffff'
                                                        }
                                                        r="6"
                                                        stroke={
                                                            isGoal ||
                                                            isBeingDragged
                                                                ? '#ffffff'
                                                                : '#00a3ff'
                                                        }
                                                        strokeWidth="2.5"
                                                    />
                                                    <rect
                                                        fill={
                                                            isBeingDragged
                                                                ? '#d97706'
                                                                : isGoal
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

                    {/* Live CAD Rubberband Segment & Live Corner Fillet Preview */}
                    {mode === 'draw-path' &&
                        draftCoordinates.length > 0 &&
                        draggingVertexIndex === null &&
                        (() => {
                            const lastPt =
                                draftCoordinates[draftCoordinates.length - 1];
                            const lastSvg = metricToSvg(
                                lastPt.x,
                                lastPt.y,
                                calibration,
                            );

                            if (draftCoordinates.length >= 2) {
                                const prevPt =
                                    draftCoordinates[
                                        draftCoordinates.length - 2
                                    ];
                                const liveTriplet = [
                                    prevPt,
                                    {
                                        ...lastPt,
                                        r:
                                            lastPt.r !== undefined
                                                ? lastPt.r
                                                : defaultCornerRadius,
                                    },
                                    {
                                        x: effectiveCursorMetric.x,
                                        y: effectiveCursorMetric.y,
                                        r: defaultCornerRadius,
                                    },
                                ];
                                const liveGeom = computeFilletedPathGeometry(
                                    liveTriplet,
                                    defaultCornerRadius,
                                    calibration,
                                );
                                const liveCorner = liveGeom.corners[0];

                                if (
                                    liveCorner &&
                                    liveCorner.effectiveRadius > 0.01 &&
                                    liveCorner.turnAngleDeg >= 2
                                ) {
                                    return (
                                        <g className="pointer-events-none">
                                            {/* Dashed Tangent Construction Wireframe at Active Corner */}
                                            <path
                                                d={`M ${liveCorner.tangentInSvg.cx} ${liveCorner.tangentInSvg.cy} L ${liveCorner.vertexSvg.cx} ${liveCorner.vertexSvg.cy} L ${cursorSvg.cx} ${cursorSvg.cy}`}
                                                fill="none"
                                                stroke="#94a3b8"
                                                strokeDasharray="3 3"
                                                strokeWidth="1.3"
                                            />
                                            {/* Live Smooth Fillet Arc & Outgoing Tangent Segment */}
                                            <path
                                                d={`M ${liveCorner.tangentInSvg.cx} ${liveCorner.tangentInSvg.cy} A ${liveCorner.rxSvg} ${liveCorner.rySvg} 0 0 ${liveCorner.sweepFlag} ${liveCorner.tangentOutSvg.cx} ${liveCorner.tangentOutSvg.cy} L ${cursorSvg.cx} ${cursorSvg.cy}`}
                                                fill="none"
                                                stroke="#10b981"
                                                strokeDasharray="6 3"
                                                strokeLinecap="round"
                                                strokeWidth="2.6"
                                            />
                                            <circle
                                                cx={liveCorner.tangentInSvg.cx}
                                                cy={liveCorner.tangentInSvg.cy}
                                                r="3"
                                                fill="#10b981"
                                            />
                                            <circle
                                                cx={liveCorner.tangentOutSvg.cx}
                                                cy={liveCorner.tangentOutSvg.cy}
                                                r="3"
                                                fill="#10b981"
                                            />
                                            {/* Live Corner Fillet Preview Badge */}
                                            <g
                                                transform={`translate(${liveCorner.arcMidSvg.cx}, ${liveCorner.arcMidSvg.cy - 14})`}
                                            >
                                                <rect
                                                    fill="#064e3b"
                                                    height="15"
                                                    rx="3"
                                                    stroke="#10b981"
                                                    strokeWidth="1"
                                                    width="78"
                                                    x="-39"
                                                    y="-8"
                                                />
                                                <text
                                                    className="font-mono text-[8px] font-bold"
                                                    fill="#6ee7b7"
                                                    textAnchor="middle"
                                                    x="0"
                                                    y="2.5"
                                                >
                                                    ARC R{liveCorner.effectiveRadius.toFixed(1)}m · {Math.round(liveCorner.turnAngleDeg)}°
                                                </text>
                                            </g>
                                        </g>
                                    );
                                }
                            }

                            return (
                                <line
                                    x1={lastSvg.cx}
                                    y1={lastSvg.cy}
                                    x2={cursorSvg.cx}
                                    y2={cursorSvg.cy}
                                    stroke="#00a3ff"
                                    strokeWidth="2"
                                    strokeDasharray="4 4"
                                    className="pointer-events-none opacity-80"
                                />
                            );
                        })()}

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
                                height={
                                    mode === 'draw-path'
                                        ? '30'
                                        : '18'
                                }
                                rx="3"
                                width={
                                    mode === 'draw-path'
                                        ? '148'
                                        : '92'
                                }
                                x="12"
                                y={
                                    mode === 'draw-path'
                                        ? '-32'
                                        : '-22'
                                }
                            />
                            <text
                                className="font-mono text-[9px] font-bold"
                                fill="#98cbff"
                                x="18"
                                y={
                                    mode === 'draw-path'
                                        ? '-20'
                                        : '-10'
                                }
                            >
                                [{effectiveCursorMetric.x.toFixed(2)},{' '}
                                {effectiveCursorMetric.y.toFixed(2)}]
                            </text>
                            {mode === 'draw-path' &&
                                (draftCoordinates.length > 0 ? (
                                    <text
                                        className="font-mono text-[8px] font-semibold"
                                        fill="#6ee7b7"
                                        x="18"
                                        y="-8"
                                    >
                                        L:{constrainedDraftCursor.lengthM.toFixed(1)}m | ∠{constrainedDraftCursor.angleDeg}° | R:{defaultCornerRadius.toFixed(1)}m
                                    </text>
                                ) : (
                                    <text
                                        className="font-mono text-[8px] font-semibold"
                                        fill="#6ee7b7"
                                        x="18"
                                        y="-8"
                                    >
                                        Click map to place WP-1 (Start)
                                    </text>
                                ))}
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
                                Math.min(3.5, Number((z + 0.2).toFixed(2))),
                            )
                        }
                        title="Zoom In (or Ctrl + Scroll Up)"
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
                                Math.max(0.5, Number((z - 0.2).toFixed(2))),
                            )
                        }
                        title="Zoom Out (or Ctrl + Scroll Down)"
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
