import type { PathCoordinate } from '@/types';
import type { CanvasCalibration } from '@/lib/geometry';
import { computeFilletedPathGeometry, metricToSvg } from '@/lib/geometry';

interface CanvasDraftPathLayerProps {
    mode: string;
    draftCoordinates: PathCoordinate[];
    draggingVertexIndex: number | null;
    effectiveCursorMetric: { x: number; y: number };
    cursorSvg: { cx: number; cy: number };
    calibration: CanvasCalibration;
    defaultCornerRadius: number;
}

export function CanvasDraftPathLayer({
    mode,
    draftCoordinates,
    draggingVertexIndex,
    effectiveCursorMetric,
    cursorSvg,
    calibration,
    defaultCornerRadius,
}: CanvasDraftPathLayerProps) {
    if (mode !== 'draw-path' || draftCoordinates.length === 0 || draggingVertexIndex !== null) {
        return null;
    }

    const lastPt = draftCoordinates[draftCoordinates.length - 1];
    const lastSvg = metricToSvg(lastPt.x, lastPt.y, calibration);

    if (draftCoordinates.length >= 2) {
        const prevPt = draftCoordinates[draftCoordinates.length - 2];
        const liveTriplet = [
            prevPt,
            {
                ...lastPt,
                r: lastPt.r !== undefined ? lastPt.r : defaultCornerRadius,
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
                            fillOpacity="0.4"
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
}
