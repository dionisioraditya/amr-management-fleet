import type { PathCoordinate } from '@/types';
import type { CanvasCalibration } from '@/lib/geometry';
import {
    calculatePolygonArea,
    calculatePolygonCentroid,
    metricToSvg,
} from '@/lib/geometry';

interface CanvasDraftZoneLayerProps {
    mode: string;
    draftZoneCoordinates: PathCoordinate[];
    isNearFirstZoneVertex: boolean;
    effectiveCursorMetric: { x: number; y: number };
    cursorSvg: { cx: number; cy: number };
    calibration: CanvasCalibration;
    onCompleteZone?: () => void;
}

export function CanvasDraftZoneLayer({
    mode,
    draftZoneCoordinates,
    isNearFirstZoneVertex,
    effectiveCursorMetric,
    cursorSvg,
    calibration,
    onCompleteZone,
}: CanvasDraftZoneLayerProps) {
    if (mode !== 'draw-zone' || draftZoneCoordinates.length === 0) {
        return null;
    }

    const draftSvgPts = draftZoneCoordinates.map((pt) =>
        metricToSvg(pt.x, pt.y, calibration),
    );
    const firstSvg = draftSvgPts[0];
    const lastSvg = draftSvgPts[draftSvgPts.length - 1];
    const previewMetricPts = isNearFirstZoneVertex
        ? draftZoneCoordinates
        : [
              ...draftZoneCoordinates,
              {
                  x: effectiveCursorMetric.x,
                  y: effectiveCursorMetric.y,
              },
          ];
    const previewSvgPts = previewMetricPts.map((pt) =>
        metricToSvg(pt.x, pt.y, calibration),
    );
    const previewPointsAttr = previewSvgPts.map((p) => `${p.cx},${p.cy}`).join(' ');
    const liveAreaM2 =
        previewMetricPts.length >= 3
            ? calculatePolygonArea(previewMetricPts)
            : 0;
    const liveCentroid =
        previewMetricPts.length >= 3
            ? calculatePolygonCentroid(previewMetricPts)
            : null;
    const liveCentroidSvg = liveCentroid
        ? metricToSvg(liveCentroid.x, liveCentroid.y, calibration)
        : null;

    return (
        <g>
            {/* Live Translucent Polygon Area Fill Preview */}
            {previewSvgPts.length >= 3 && (
                <polygon
                    points={previewPointsAttr}
                    fill="url(#hazardStripesRed)"
                    stroke="#ef4444"
                    strokeDasharray="5 3"
                    strokeWidth="1.5"
                    className="pointer-events-none"
                />
            )}

            {/* Placed Polygon Edges */}
            {draftSvgPts.length >= 2 && (
                <polyline
                    points={draftSvgPts.map((p) => `${p.cx},${p.cy}`).join(' ')}
                    fill="none"
                    stroke="#dc2626"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    className="pointer-events-none"
                />
            )}

            {/* Rubber-Band Line from Last Vertex to Cursor (or V1 if snapping) */}
            <line
                x1={lastSvg.cx}
                y1={lastSvg.cy}
                x2={isNearFirstZoneVertex ? firstSvg.cx : cursorSvg.cx}
                y2={isNearFirstZoneVertex ? firstSvg.cy : cursorSvg.cy}
                stroke={isNearFirstZoneVertex ? '#10b981' : '#ef4444'}
                strokeDasharray="4 4"
                strokeWidth="2"
                className="pointer-events-none"
            />

            {/* Closing Chord Preview back to V1 */}
            {draftSvgPts.length >= 2 && !isNearFirstZoneVertex && (
                <line
                    x1={cursorSvg.cx}
                    y1={cursorSvg.cy}
                    x2={firstSvg.cx}
                    y2={firstSvg.cy}
                    stroke="#f87171"
                    strokeDasharray="2 4"
                    strokeOpacity="0.65"
                    strokeWidth="1.3"
                    className="pointer-events-none"
                />
            )}

            {/* Live Area Centroid Telemetry Badge */}
            {liveCentroidSvg && liveAreaM2 > 0 && (
                <g
                    className="pointer-events-none"
                    transform={`translate(${liveCentroidSvg.cx}, ${liveCentroidSvg.cy})`}
                >
                    <rect
                        fill="#7f1d1d"
                        fillOpacity="0.4"
                        height="18"
                        rx="4"
                        stroke="#ef4444"
                        strokeWidth="1.2"
                        width="92"
                        x="-46"
                        y="-9"
                    />
                    <text
                        className="font-mono text-[8.5px] font-bold"
                        fill="#fecaca"
                        textAnchor="middle"
                        x="0"
                        y="3"
                    >
                        AREA: {liveAreaM2}m²
                    </text>
                </g>
            )}

            {/* Placed Polygon Vertices */}
            {draftSvgPts.map((pt, idx) => {
                const isFirst = idx === 0;
                const canClose = isFirst && draftZoneCoordinates.length >= 3;
                return (
                    <g
                        key={`draft-zone-v-${idx}`}
                        transform={`translate(${pt.cx}, ${pt.cy})`}
                        className={canClose ? 'cursor-pointer' : 'pointer-events-none'}
                        onClick={(e) => {
                            if (canClose && onCompleteZone) {
                                e.stopPropagation();
                                onCompleteZone();
                            }
                        }}
                    >
                        {canClose && isNearFirstZoneVertex && (
                            <circle
                                r="16"
                                fill="#10b981"
                                opacity="0.28"
                                className="animate-ping"
                            />
                        )}
                        <circle
                            r={canClose && isNearFirstZoneVertex ? '9' : '5.5'}
                            fill={
                                canClose && isNearFirstZoneVertex
                                    ? '#10b981'
                                    : isFirst
                                      ? '#dc2626'
                                      : '#ffffff'
                            }
                            stroke={
                                canClose && isNearFirstZoneVertex
                                    ? '#ffffff'
                                    : '#dc2626'
                            }
                            strokeWidth="2.2"
                        />
                        <rect
                            fill={
                                canClose && isNearFirstZoneVertex
                                    ? '#065f46'
                                    : '#7f1d1d'
                            }
                            fillOpacity="0.4"
                            height="14"
                            rx="3"
                            width={
                                canClose && isNearFirstZoneVertex
                                    ? '96'
                                    : '26'
                            }
                            x={
                                canClose && isNearFirstZoneVertex
                                    ? '-48'
                                    : '-13'
                            }
                            y="-22"
                        />
                        <text
                            className="font-mono text-[8px] font-bold"
                            fill="#ffffff"
                            textAnchor="middle"
                            x="0"
                            y="-12.5"
                        >
                            {canClose && isNearFirstZoneVertex
                                ? 'CLICK TO CLOSE LOOP'
                                : `V${idx + 1}`}
                        </text>
                    </g>
                );
            })}
        </g>
    );
}
