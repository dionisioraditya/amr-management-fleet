import type { PathCoordinate, Pathplan } from '@/types';
import type { CanvasCalibration } from '@/lib/geometry';
import { computeFilletedPathGeometry, metricToSvg } from '@/lib/geometry';

interface CanvasPathLayerProps {
    paths: Pathplan[];
    selectedPathplanId: number | null;
    defaultCornerRadius: number;
    inflationRadius: number;
    calibration: CanvasCalibration;
    mode: string;
    draggingVertexIndex: number | null;
    onSelectPathplan?: (pathplan: Pathplan) => void;
    onUpdatePathPoint?: (index: number, coord: PathCoordinate) => void;
    setDraggingVertexIndex: (index: number | null) => void;
}

export function CanvasPathLayer({
    paths,
    selectedPathplanId,
    defaultCornerRadius,
    inflationRadius,
    calibration,
    mode,
    draggingVertexIndex,
    onSelectPathplan,
    onUpdatePathPoint,
    setDraggingVertexIndex,
}: CanvasPathLayerProps) {
    return (
        <>
            {paths.map((path) => {
                if (!path.coordinates || path.coordinates.length < 2) return null;

                const isSelected = path.id === selectedPathplanId || path.id === -999;
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
                    Math.min(48, Math.round(inflationRadius * calibration.pixelsPerMeterSvg)),
                );

                return (
                    <g
                        key={path.id}
                        className="cursor-pointer"
                        onClick={(e) => {
                            if (mode === 'view' && onSelectPathplan && path.id !== -999) {
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
                                    strokeWidth={corridorStrokeWidth + 2}
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
                            stroke={isSelected ? '#00a3ff' : path.is_bidirectional ? '#0284c7' : '#1d4ed8'}
                            strokeDasharray={isSelected ? undefined : '8 4'}
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
                                if (corner.effectiveRadius <= 0.01 || corner.turnAngleDeg < 2) return null;
                                return (
                                    <g key={`${path.id}-fillet-${corner.vertexIndex}`} className="pointer-events-none">
                                        <path
                                            d={`M ${corner.tangentInSvg.cx} ${corner.tangentInSvg.cy} L ${corner.vertexSvg.cx} ${corner.vertexSvg.cy} L ${corner.tangentOutSvg.cx} ${corner.tangentOutSvg.cy}`}
                                            fill="none"
                                            stroke="#0284c7"
                                            strokeDasharray="3 3"
                                            strokeOpacity="0.65"
                                            strokeWidth="1.4"
                                        />
                                        <path
                                            d={`M ${corner.tangentInSvg.cx} ${corner.tangentInSvg.cy} A ${corner.rxSvg} ${corner.rySvg} 0 0 ${corner.sweepFlag} ${corner.tangentOutSvg.cx} ${corner.tangentOutSvg.cy}`}
                                            fill="none"
                                            stroke="#10b981"
                                            strokeLinecap="round"
                                            strokeWidth="3.8"
                                        />
                                        <circle cx={corner.tangentInSvg.cx} cy={corner.tangentInSvg.cy} r="2.8" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
                                        <circle cx={corner.tangentOutSvg.cx} cy={corner.tangentOutSvg.cy} r="2.8" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
                                        <g transform={`translate(${corner.arcMidSvg.cx}, ${corner.arcMidSvg.cy + 15})`}>
                                            <rect fill="#064e3b" fillOpacity="0.4" height="14" rx="3" stroke="#10b981" strokeWidth="1" width="68" x="-34" y="-7" />
                                            <text className="font-mono text-[8px] font-bold" fill="#a7f3d0" textAnchor="middle" x="0" y="2.5">
                                                R{corner.effectiveRadius.toFixed(1)}m · {Math.round(corner.turnAngleDeg)}°
                                            </text>
                                        </g>
                                    </g>
                                );
                            })}

                        {/* Segment Distance Telemetry Tags & Draggable Waypoint Sequence Nodes */}
                        {isSelected &&
                            svgPoints.map((pt, idx) => {
                                const isGoal = idx === svgPoints.length - 1 && svgPoints.length > 1;
                                const prev = idx > 0 ? path.coordinates[idx - 1] : null;
                                const curr = path.coordinates[idx];
                                const segDist = prev ? Math.hypot(curr.x - prev.x, curr.y - prev.y).toFixed(1) : null;
                                const prevSvg = idx > 0 ? svgPoints[idx - 1] : null;
                                const isBeingDragged = draggingVertexIndex === idx;

                                return (
                                    <g key={`${path.id}-pt-${idx}`}>
                                        {prevSvg && segDist && (
                                            <g className="pointer-events-none" transform={`translate(${(pt.cx + prevSvg.cx) / 2}, ${(pt.cy + prevSvg.cy) / 2 - 10})`}>
                                                <rect fill="#0b1c30" fillOpacity="0.4" height="16" rx="3" width="40" x="-20" y="-8" />
                                                <text className="font-label-sm text-[9px] font-semibold" fill="#98cbff" textAnchor="middle" x="0" y="3">
                                                    {segDist}m
                                                </text>
                                            </g>
                                        )}
                                        <g
                                            className={onUpdatePathPoint ? 'cursor-grab active:cursor-grabbing' : ''}
                                            transform={`translate(${pt.cx}, ${pt.cy})`}
                                            onMouseDown={(e) => {
                                                if (onUpdatePathPoint && e.button === 0) {
                                                    e.stopPropagation();
                                                    setDraggingVertexIndex(idx);
                                                }
                                            }}
                                        >
                                            <circle fill={isBeingDragged ? '#f59e0b' : isGoal ? '#16a34a' : '#00a3ff'} opacity="0.22" r={isBeingDragged ? '15' : '11'} />
                                            <circle fill={isBeingDragged ? '#f59e0b' : isGoal ? '#16a34a' : '#ffffff'} r="6" stroke={isGoal || isBeingDragged ? '#ffffff' : '#00a3ff'} strokeWidth="2.5" />
                                            <rect fill={isBeingDragged ? '#d97706' : isGoal ? '#16a34a' : '#00629d'} fillOpacity="0.4" height="14" rx="3" width={isGoal ? '46' : '32'} x={isGoal ? '-23' : '-16'} y="-24" />
                                            <text className="font-label-sm text-[8px] font-bold" fill="#ffffff" textAnchor="middle" x="0" y="-14">
                                                {isGoal ? `WP-${idx + 1} GOAL` : `WP-${idx + 1}`}
                                            </text>
                                        </g>
                                    </g>
                                );
                            })}
                    </g>
                );
            })}
        </>
    );
}
