import type { PathCoordinate } from '@/types';
import { metricToSvg } from './canvas-projection';
import type { CanvasCalibration } from './canvas-projection';

export { applyAngleConstraint, type AngleConstraintMode } from './angle-constraint';
export { discretizeFilletedPathForRos2 } from './path-discretization';

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
 * Computes exact tangent fillet circular arcs for polyline corners.
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
        const alpha = Math.acos(cosAlpha);
        const deflectionRad = Math.PI - alpha;
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

        const arcLengthM = Number((effectiveRadius * deflectionRad).toFixed(3));
        const rxSvg = Number((effectiveRadius * scaleX).toFixed(2));
        const rySvg = Number((effectiveRadius * scaleY).toFixed(2));

        corners.push({
            vertexIndex: i,
            vertex: { x: curr.x, y: curr.y },
            vertexSvg,
            tangentIn: tIn,
            tangentInSvg: metricToSvg(tIn.x, tIn.y, calibration),
            tangentOut: tOut,
            tangentOutSvg: metricToSvg(tOut.x, tOut.y, calibration),
            arcCenter,
            arcMidSvg: metricToSvg(arcMidMetric.x, arcMidMetric.y, calibration),
            requestedRadius: reqR,
            effectiveRadius,
            turnAngleDeg,
            arcLengthM,
            sweepFlag,
            rxSvg,
            rySvg,
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
