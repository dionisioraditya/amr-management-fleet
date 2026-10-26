import { useRef, useState } from 'react';
import type { PathCoordinate } from '@/types';
import type { AngleConstraintMode, CanvasCalibration } from '@/lib/geometry';
import { applyAngleConstraint, metricToSvg, svgToMetric } from '@/lib/geometry';
import type { useCanvasCursor } from './useCanvasCursor';

export interface UseCanvasPenHandlersProps {
    calibration: CanvasCalibration;
    snapStep: number;
    mode: 'view' | 'pick-station' | 'draw-path' | 'draw-zone' | 'pose-estimate';
    angleConstraintMode: AngleConstraintMode;
    draftCoordinates: PathCoordinate[];
    draftZoneCoordinates: PathCoordinate[];
    defaultCornerRadius: number;
    isPanning: boolean;
    startPan: (x: number, y: number) => void;
    updatePan: (x: number, y: number) => void;
    endPan: () => void;
    cursor: ReturnType<typeof useCanvasCursor>;
    onPickCoordinate?: (coord: PathCoordinate) => void;
    onPoseEstimate?: (pose: { x: number; y: number; theta: number }) => void;
    onAddPathPoint?: (coord: PathCoordinate) => void;
    onUpdatePathPoint?: (index: number, coord: PathCoordinate) => void;
    onAddZonePoint?: (coord: PathCoordinate) => void;
    onUpdateZonePoint?: (index: number, coord: PathCoordinate) => void;
    onCompleteZone?: () => void;
    onClearSelection?: () => void;
}

export function useCanvasPenHandlers(props: UseCanvasPenHandlersProps) {
    const {
        calibration, snapStep, mode, angleConstraintMode, draftCoordinates, draftZoneCoordinates,
        defaultCornerRadius, isPanning, startPan, updatePan, endPan, cursor,
        onPickCoordinate, onPoseEstimate, onAddPathPoint, onUpdatePathPoint,
        onAddZonePoint, onUpdateZonePoint, onCompleteZone, onClearSelection,
    } = props;

    const {
        getSvgPointFromEvent, setCursorMetric, setIsShiftPressed,
        draggingVertexIndex, setDraggingVertexIndex,
        draggingZoneVertexIndex, setDraggingZoneVertexIndex,
    } = cursor;

    const suppressNextClickRef = useRef(false);
    const [poseEstimateOrigin, setPoseEstimateOrigin] = useState<{ x: number; y: number; cx: number; cy: number } | null>(null);
    const [poseEstimateCurrent, setPoseEstimateCurrent] = useState<{ x: number; y: number; cx: number; cy: number; theta: number } | null>(null);

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        setIsShiftPressed(e.shiftKey);
        if (isPanning) { updatePan(e.clientX, e.clientY); return; }

        const pt = getSvgPointFromEvent(e);
        if (!pt) return;
        const currentSnap = mode === 'pose-estimate' ? 0 : snapStep;
        const metric = svgToMetric(pt.cx, pt.cy, currentSnap, calibration);
        setCursorMetric(metric);

        if (draggingVertexIndex !== null && onUpdatePathPoint && draftCoordinates[draggingVertexIndex]) {
            onUpdatePathPoint(draggingVertexIndex, { ...draftCoordinates[draggingVertexIndex], x: metric.x, y: metric.y });
            return;
        }
        if (draggingZoneVertexIndex !== null && onUpdateZonePoint && draftZoneCoordinates[draggingZoneVertexIndex]) {
            onUpdateZonePoint(draggingZoneVertexIndex, { x: metric.x, y: metric.y });
            return;
        }
        if (mode === 'pose-estimate' && poseEstimateOrigin) {
            const theta = Number(Math.atan2(metric.y - poseEstimateOrigin.y, metric.x - poseEstimateOrigin.x).toFixed(4));
            setPoseEstimateCurrent({ x: metric.x, y: metric.y, cx: pt.cx, cy: pt.cy, theta });
        }
    };

    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
        if (e.button === 1 || (e.button === 0 && e.shiftKey && mode !== 'draw-path' && mode !== 'draw-zone')) {
            e.preventDefault();
            startPan(e.clientX, e.clientY);
            return;
        }
        if (mode === 'pose-estimate' && e.button === 0) {
            e.preventDefault();
            const pt = getSvgPointFromEvent(e);
            if (pt) {
                const metric = svgToMetric(pt.cx, pt.cy, 0, calibration);
                setPoseEstimateOrigin({ x: metric.x, y: metric.y, cx: pt.cx, cy: pt.cy });
                setPoseEstimateCurrent({ x: metric.x, y: metric.y, cx: pt.cx, cy: pt.cy, theta: 0 });
            }
        }
    };

    const handleMouseUp = () => {
        if (draggingVertexIndex !== null) { setDraggingVertexIndex(null); suppressNextClickRef.current = true; return; }
        if (draggingZoneVertexIndex !== null) { setDraggingZoneVertexIndex(null); suppressNextClickRef.current = true; return; }
        if (isPanning) { endPan(); return; }

        if (mode === 'pose-estimate' && poseEstimateOrigin) {
            onPoseEstimate?.({ x: poseEstimateOrigin.x, y: poseEstimateOrigin.y, theta: poseEstimateCurrent?.theta ?? 0 });
            setPoseEstimateOrigin(null);
            setPoseEstimateCurrent(null);
        }
    };

    const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if (suppressNextClickRef.current) { suppressNextClickRef.current = false; return; }
        if (isPanning || draggingVertexIndex !== null || draggingZoneVertexIndex !== null || mode === 'pose-estimate') return;

        const svgPoint = getSvgPointFromEvent(e);
        if (!svgPoint) return;
        const metric = svgToMetric(svgPoint.cx, svgPoint.cy, snapStep, calibration);

        if (mode === 'pick-station' && onPickCoordinate) {
            onPickCoordinate({ x: metric.x, y: metric.y });
        } else if (mode === 'draw-path' && onAddPathPoint) {
            const nextPoint = draftCoordinates.length > 0
                ? applyAngleConstraint(draftCoordinates[draftCoordinates.length - 1], metric, angleConstraintMode, e.shiftKey, snapStep)
                : metric;
            onAddPathPoint({ x: nextPoint.x, y: nextPoint.y, r: defaultCornerRadius });
        } else if (mode === 'draw-zone' && onAddZonePoint) {
            if (draftZoneCoordinates.length >= 3) {
                const fSvg = metricToSvg(draftZoneCoordinates[0].x, draftZoneCoordinates[0].y, calibration);
                if (Math.hypot(svgPoint.cx - fSvg.cx, svgPoint.cy - fSvg.cy) <= 18 && onCompleteZone) {
                    onCompleteZone();
                    return;
                }
            }
            const nextZonePoint = draftZoneCoordinates.length > 0
                ? applyAngleConstraint(draftZoneCoordinates[draftZoneCoordinates.length - 1], metric, angleConstraintMode, e.shiftKey, snapStep)
                : metric;
            onAddZonePoint({ x: nextZonePoint.x, y: nextZonePoint.y });
        } else if (mode === 'view') {
            onClearSelection?.();
        }
    };

    return {
        poseEstimateOrigin, poseEstimateCurrent,
        handleMouseMove, handleMouseDown, handleMouseUp, handleCanvasClick,
    };
}
