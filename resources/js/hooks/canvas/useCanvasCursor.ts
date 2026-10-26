import { useRef, useState } from 'react';
import type { PathCoordinate } from '@/types';
import type { AngleConstraintMode, CanvasCalibration } from '@/lib/geometry';
import { applyAngleConstraint, metricToSvg } from '@/lib/geometry';

export interface UseCanvasCursorProps {
    calibration: CanvasCalibration;
    snapStep: number;
    mode: 'view' | 'pick-station' | 'draw-path' | 'draw-zone' | 'pose-estimate';
    angleConstraintMode: AngleConstraintMode;
    draftCoordinates: PathCoordinate[];
    draftZoneCoordinates: PathCoordinate[];
}

export function useCanvasCursor({
    calibration,
    snapStep,
    mode,
    angleConstraintMode,
    draftCoordinates,
    draftZoneCoordinates,
}: UseCanvasCursorProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [cursorMetric, setCursorMetric] = useState<{
        x: number;
        y: number;
        u?: number;
        v?: number;
    }>({ x: 0.0, y: 0.0 });
    const [isShiftPressed, setIsShiftPressed] = useState(false);
    const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null);
    const [draggingZoneVertexIndex, setDraggingZoneVertexIndex] = useState<number | null>(null);

    const getSvgPointFromEvent = (
        e: React.MouseEvent<SVGSVGElement>,
    ): { cx: number; cy: number } | null => {
        const svg = svgRef.current;
        if (!svg) return null;

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

    // Calculate active draft cursor constraints
    const activeDraftAnchor =
        mode === 'draw-path' &&
        draftCoordinates.length > 0 &&
        draggingVertexIndex === null
            ? draftCoordinates[draftCoordinates.length - 1]
            : mode === 'draw-zone' &&
                draftZoneCoordinates.length > 0 &&
                draggingZoneVertexIndex === null
              ? draftZoneCoordinates[draftZoneCoordinates.length - 1]
              : null;

    const constrainedDraftCursor = activeDraftAnchor
        ? applyAngleConstraint(
              activeDraftAnchor,
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

    const effectiveCursorMetric = activeDraftAnchor
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

    const isNearFirstZoneVertex = (() => {
        if (mode !== 'draw-zone' || draftZoneCoordinates.length < 3) {
            return false;
        }
        const firstSvg = metricToSvg(
            draftZoneCoordinates[0].x,
            draftZoneCoordinates[0].y,
            calibration,
        );
        const rawCursorSvg = metricToSvg(
            cursorMetric.x,
            cursorMetric.y,
            calibration,
        );
        return (
            Math.hypot(
                rawCursorSvg.cx - firstSvg.cx,
                rawCursorSvg.cy - firstSvg.cy,
            ) <= 18
        );
    })();

    return {
        svgRef,
        cursorMetric,
        setCursorMetric,
        isShiftPressed,
        setIsShiftPressed,
        draggingVertexIndex,
        setDraggingVertexIndex,
        draggingZoneVertexIndex,
        setDraggingZoneVertexIndex,
        getSvgPointFromEvent,
        activeDraftAnchor,
        constrainedDraftCursor,
        effectiveCursorMetric,
        cursorSvg,
        isNearFirstZoneVertex,
    };
}
