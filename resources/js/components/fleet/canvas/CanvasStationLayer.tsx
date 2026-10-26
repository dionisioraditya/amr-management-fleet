import type { PathCoordinate, Waypoint } from '@/types';
import type { CanvasCalibration } from '@/lib/geometry';
import { metricToSvg } from '@/lib/geometry';

interface CanvasStationLayerProps {
    waypoints: Waypoint[];
    selectedWaypointId: number | null;
    editingWaypointId?: number | null;
    calibration: CanvasCalibration;
    mode: string;
    onSelectWaypoint?: (waypoint: Waypoint) => void;
    onAddPathPoint?: (coord: PathCoordinate) => void;
}

export function CanvasStationLayer({
    waypoints,
    selectedWaypointId,
    editingWaypointId,
    calibration,
    mode,
    onSelectWaypoint,
    onAddPathPoint,
}: CanvasStationLayerProps) {
    return (
        <>
            {waypoints.map((wp) => {
                const { cx, cy } = metricToSvg(wp.x, wp.y, calibration);
                const isSelected = wp.id === selectedWaypointId;
                const isEditing = editingWaypointId != null && wp.id === editingWaypointId;
                const isDimmed = isEditing && mode === 'pick-station';
                const isCharger =
                    wp.name.toUpperCase().includes('CHARGE') ||
                    wp.name.toUpperCase().includes('CHG');

                return (
                    <g
                        key={wp.id}
                        className={isDimmed ? 'pointer-events-none transition-opacity duration-300' : 'cursor-pointer'}
                        style={isDimmed ? { pointerEvents: 'none' } : undefined}
                        opacity={isDimmed ? 0.35 : 1}
                        transform={`translate(${cx}, ${cy})`}
                        onClick={(e) => {
                            if (mode === 'pick-station') {
                                return;
                            }
                            e.stopPropagation();
                            if (mode === 'draw-path' && onAddPathPoint) {
                                onAddPathPoint({ x: wp.x, y: wp.y });
                            } else if (onSelectWaypoint) {
                                onSelectWaypoint(wp);
                            }
                        }}
                    >
                        {isSelected && !isDimmed && (
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
                            strokeDasharray={isDimmed ? '3 3' : undefined}
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
                                fill={isSelected ? '#0b1c30' : '#ffffff'}
                                fillOpacity="0.4"
                                height="16"
                                rx="3"
                                stroke={isSelected ? '#00a3ff' : '#cbd5e1'}
                                strokeWidth="1"
                                strokeDasharray={isDimmed ? '2 2' : undefined}
                                width={Math.max(52, wp.name.length * 6.2)}
                            />
                            <text
                                className="font-label-sm text-[9px] font-bold"
                                fill={isSelected ? '#ffffff' : '#0b1c30'}
                                x="5"
                                y="11"
                            >
                                {wp.name}
                            </text>
                        </g>
                    </g>
                );
            })}
        </>
    );
}
