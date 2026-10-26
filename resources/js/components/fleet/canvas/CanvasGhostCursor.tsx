import type { PathCoordinate } from '@/types';

interface CanvasGhostCursorProps {
    mode: string;
    effectiveCursorMetric: { x: number; y: number };
    cursorSvg: { cx: number; cy: number };
    draftCoordinates: PathCoordinate[];
    draftZoneCoordinates: PathCoordinate[];
    constrainedDraftCursor: { lengthM: number; angleDeg: number };
    defaultCornerRadius: number;
    isNearFirstZoneVertex: boolean;
}

export function CanvasGhostCursor({
    mode,
    effectiveCursorMetric,
    cursorSvg,
    draftCoordinates,
    draftZoneCoordinates,
    constrainedDraftCursor,
    defaultCornerRadius,
    isNearFirstZoneVertex,
}: CanvasGhostCursorProps) {
    if (
        mode !== 'pick-station' &&
        mode !== 'draw-path' &&
        mode !== 'draw-zone'
    ) {
        return null;
    }

    const isZone = mode === 'draw-zone';
    const isPathOrZone = mode === 'draw-path' || isZone;

    return (
        <g
            className="pointer-events-none"
            transform={`translate(${cursorSvg.cx}, ${cursorSvg.cy})`}
        >
            <circle
                cx="0"
                cy="0"
                fill={isZone ? '#ef4444' : '#00a3ff'}
                fillOpacity="0.2"
                r="16"
                stroke={isZone ? '#ef4444' : '#00a3ff'}
                strokeDasharray="3 3"
                strokeWidth="1.5"
            />
            <circle
                cx="0"
                cy="0"
                fill={isZone ? '#ef4444' : '#00a3ff'}
                r="4"
            />
            <rect
                fill="#0b1c30"
                fillOpacity="0.4"
                height={isPathOrZone ? '30' : '18'}
                rx="3"
                width={isPathOrZone ? '156' : '92'}
                x="12"
                y={isPathOrZone ? '-32' : '-22'}
            />
            <text
                className="font-mono text-[9px] font-bold"
                fill={isZone ? '#fecaca' : '#98cbff'}
                x="18"
                y={isPathOrZone ? '-20' : '-10'}
            >
                [{effectiveCursorMetric.x.toFixed(2)},{' '}
                {effectiveCursorMetric.y.toFixed(2)}]
            </text>

            {mode === 'draw-path' && (
                draftCoordinates.length > 0 ? (
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
                )
            )}

            {mode === 'draw-zone' && (
                isNearFirstZoneVertex ? (
                    <text
                        className="font-mono text-[8px] font-semibold"
                        fill="#6ee7b7"
                        x="18"
                        y="-8"
                    >
                        Click V1 to close polygon loop
                    </text>
                ) : draftZoneCoordinates.length > 0 ? (
                    <text
                        className="font-mono text-[8px] font-semibold"
                        fill="#fca5a5"
                        x="18"
                        y="-8"
                    >
                        L:{constrainedDraftCursor.lengthM.toFixed(1)}m | ∠{constrainedDraftCursor.angleDeg}° | V:{draftZoneCoordinates.length + 1}
                    </text>
                ) : (
                    <text
                        className="font-mono text-[8px] font-semibold"
                        fill="#fca5a5"
                        x="18"
                        y="-8"
                    >
                        Click map to place Zone V1
                    </text>
                )
            )}
        </g>
    );
}
