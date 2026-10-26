import type { KeepoutZone, PathCoordinate } from '@/types';
import type { CanvasCalibration } from '@/lib/geometry';
import {
    calculatePolygonArea,
    calculatePolygonCentroid,
    metricToSvg,
} from '@/lib/geometry';

interface CanvasKeepoutLayerProps {
    showKeepOutZones: boolean;
    zones: KeepoutZone[];
    selectedKeepoutZoneId: number | null;
    calibration: CanvasCalibration;
    mode: string;
    draggingZoneVertexIndex: number | null;
    onSelectKeepoutZone?: (zone: KeepoutZone) => void;
    onUpdateZonePoint?: (index: number, coord: PathCoordinate) => void;
    setDraggingZoneVertexIndex: (index: number | null) => void;
}

export function CanvasKeepoutLayer({
    showKeepOutZones,
    zones,
    selectedKeepoutZoneId,
    calibration,
    mode,
    draggingZoneVertexIndex,
    onSelectKeepoutZone,
    onUpdateZonePoint,
    setDraggingZoneVertexIndex,
}: CanvasKeepoutLayerProps) {
    if (!showKeepOutZones) return null;

    return (
        <>
            {zones.map((zone) => {
                if (
                    !zone.is_active ||
                    !zone.coordinates ||
                    zone.coordinates.length < 3
                ) {
                    return null;
                }

                const isSelected = zone.id === selectedKeepoutZoneId;
                const isKeepOut = zone.zone_type === 'keep_out';
                const svgPts = zone.coordinates.map((pt) =>
                    metricToSvg(pt.x, pt.y, calibration),
                );
                const pointsAttr = svgPts.map((p) => `${p.cx},${p.cy}`).join(' ');
                const centroidMetric = calculatePolygonCentroid(zone.coordinates);
                const centroidSvg = metricToSvg(centroidMetric.x, centroidMetric.y, calibration);
                const areaM2 = zone.area_m2 ?? calculatePolygonArea(zone.coordinates);
                const strokeColor = isKeepOut ? '#dc2626' : '#d97706';
                const badgeBg = isKeepOut ? '#7f1d1d' : '#78350f';
                const badgeText = isKeepOut ? '#fecaca' : '#fde68a';
                const labelStr = isKeepOut
                    ? `🚫 ${zone.name} · ${areaM2}m²`
                    : `⚡ ${zone.name} (${zone.speed_limit ?? 0.4}m/s)`;

                return (
                    <g
                        key={`zone-${zone.id}`}
                        className="cursor-pointer"
                        onClick={(e) => {
                            if (mode !== 'draw-path' && mode !== 'draw-zone' && onSelectKeepoutZone) {
                                e.stopPropagation();
                                onSelectKeepoutZone(zone);
                            }
                        }}
                    >
                        {isSelected && (
                            <polygon
                                points={pointsAttr}
                                fill="none"
                                stroke={strokeColor}
                                strokeOpacity="0.25"
                                strokeWidth="8"
                                strokeLinejoin="round"
                            />
                        )}

                        <polygon
                            points={pointsAttr}
                            fill={isKeepOut ? 'url(#hazardStripesRed)' : 'url(#hazardStripesAmber)'}
                            stroke={strokeColor}
                            strokeDasharray={isSelected ? undefined : '6 4'}
                            strokeLinejoin="round"
                            strokeWidth={isSelected ? '2.6' : '1.8'}
                        />

                        {/* Centroid Telemetry Badge */}
                        <g
                            className="pointer-events-none"
                            transform={`translate(${centroidSvg.cx}, ${centroidSvg.cy})`}
                        >
                            <rect
                                fill={badgeBg}
                                fillOpacity="0.4"
                                height="18"
                                rx="4"
                                stroke={strokeColor}
                                strokeWidth={isSelected ? '1.5' : '1'}
                                width={Math.max(96, labelStr.length * 5.8)}
                                x={-Math.max(96, labelStr.length * 5.8) / 2}
                                y="-9"
                            />
                            <text
                                className="font-mono text-[8.5px] font-bold"
                                fill={badgeText}
                                textAnchor="middle"
                                x="0"
                                y="3"
                            >
                                {labelStr}
                            </text>
                        </g>

                        {/* Draggable Polygon Corner Vertex Handles when Selected */}
                        {isSelected &&
                            svgPts.map((pt, idx) => {
                                const isBeingDragged = draggingZoneVertexIndex === idx;
                                return (
                                    <g
                                        key={`zone-${zone.id}-v-${idx}`}
                                        className={onUpdateZonePoint ? 'cursor-grab active:cursor-grabbing' : ''}
                                        transform={`translate(${pt.cx}, ${pt.cy})`}
                                        onMouseDown={(e) => {
                                            if (onUpdateZonePoint && e.button === 0) {
                                                e.stopPropagation();
                                                setDraggingZoneVertexIndex(idx);
                                            }
                                        }}
                                    >
                                        <circle
                                            r={isBeingDragged ? '12' : '9'}
                                            fill={strokeColor}
                                            opacity="0.22"
                                        />
                                        <circle
                                            r="5"
                                            fill={isBeingDragged ? '#f59e0b' : '#ffffff'}
                                            stroke={strokeColor}
                                            strokeWidth="2.2"
                                        />
                                        <text
                                            className="pointer-events-none font-mono text-[7.5px] font-bold"
                                            fill={strokeColor}
                                            textAnchor="middle"
                                            x="0"
                                            y="-8"
                                        >
                                            V{idx + 1}
                                        </text>
                                    </g>
                                );
                            })}
                    </g>
                );
            })}
        </>
    );
}
