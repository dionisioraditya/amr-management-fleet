import type { FacilityMap } from '@/types';

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
