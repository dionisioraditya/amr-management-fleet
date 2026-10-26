import type { FacilityMap } from '@/types';
import type { CanvasCalibration } from '@/lib/geometry';

interface CanvasOccupancyLayerProps {
    map?: FacilityMap | null;
    calibration: CanvasCalibration;
    isRawRosMode: boolean;
    showCostmap: boolean;
    showSlamNoise: boolean;
    showKeepOutZones: boolean;
    hasActiveVectorZones: boolean;
}

export function CanvasOccupancyLayer({
    map,
    calibration,
    isRawRosMode,
    showCostmap,
    showSlamNoise,
    showKeepOutZones,
    hasActiveVectorZones,
}: CanvasOccupancyLayerProps) {
    if (calibration.hasRasterMap && map?.image_url) {
        return (
            <g>
                {/* Outer Frame Border */}
                <rect
                    x={calibration.renderX - 2}
                    y={calibration.renderY - 2}
                    width={calibration.renderW + 4}
                    height={calibration.renderH + 4}
                    rx="4"
                    fill={isRawRosMode ? '#cdcdcd' : '#e5eeff'}
                    stroke={isRawRosMode ? '#334155' : '#1d4ed8'}
                    strokeWidth="2.5"
                />

                {/* 1:1 Calibrated Occupancy Grid Image */}
                <image
                    href={map.image_url}
                    x={calibration.renderX}
                    y={calibration.renderY}
                    width={calibration.renderW}
                    height={calibration.renderH}
                    preserveAspectRatio="none"
                    filter={isRawRosMode ? undefined : 'url(#cyberneticBlueprintFilter)'}
                    style={{ imageRendering: 'pixelated' }}
                />

                {/* Optional Costmap Inflation Border Indicator */}
                {showCostmap && (
                    <rect
                        x={calibration.renderX + 3}
                        y={calibration.renderY + 3}
                        width={Math.max(0, calibration.renderW - 6)}
                        height={Math.max(0, calibration.renderH - 6)}
                        fill="none"
                        stroke="#00a3ff"
                        strokeDasharray="5 4"
                        strokeOpacity="0.65"
                        strokeWidth="1.5"
                    />
                )}

                {/* Optional Keep-Out Mask Layer from .zip (fallback when no dynamic vector zones defined) */}
                {showKeepOutZones && !hasActiveVectorZones && map.keepout_url && (
                    <image
                        href={map.keepout_url}
                        x={calibration.renderX}
                        y={calibration.renderY}
                        width={calibration.renderW}
                        height={calibration.renderH}
                        preserveAspectRatio="none"
                        opacity="0.45"
                        filter="url(#keepoutRedMaskFilter)"
                        style={{ imageRendering: 'pixelated' }}
                    />
                )}

                {/* Map Dimension & Origin Calibration Caption */}
                <text
                    x={calibration.renderX}
                    y={calibration.renderY - 8}
                    fill="#0b1c30"
                    className="font-mono text-[10px] font-bold"
                >
                    {map.name.toUpperCase()} // {calibration.widthPx}×
                    {calibration.heightPx}px ({calibration.resolution}
                    m/px) // ORIGIN [{calibration.originX}m, {calibration.originY}m]
                </text>
            </g>
        );
    }

    return (
        /* Procedural Synthetic Blueprint Fallback */
        <g>
            {/* Outer Perimeter Walls */}
            <path
                d="M 60 480 L 140 480 L 140 435 L 115 435 L 115 350 L 90 350 L 90 230 L 130 230 L 130 215 L 75 215 L 75 190 L 120 190 L 120 160 L 150 160 L 150 135 L 250 135 L 250 160 L 900 160 L 900 455 L 935 455 L 935 525 L 850 525 L 850 510 L 720 510 L 720 495 L 640 495 L 640 510 L 140 510 L 60 510 Z"
                fill={
                    isRawRosMode
                        ? '#ffffff'
                        : showSlamNoise
                          ? 'url(#slamNoisePattern)'
                          : '#f8f9ff'
                }
                stroke={isRawRosMode ? '#000000' : '#1d4ed8'}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
            />

            {/* Nav2 Costmap Inflation Halo */}
            {showCostmap && (
                <path
                    d="M 66 474 L 134 474 L 134 429 L 109 429 L 109 356 L 96 356 L 96 236 L 124 236 L 124 209 L 81 209 L 81 196 L 126 196 L 126 166 L 156 166 L 156 141 L 244 141 L 244 166 L 894 166 L 894 449 L 929 449 L 929 519 L 856 519 L 856 504 L 714 504 L 714 489 L 634 489 L 634 504 L 146 504 L 66 504 Z"
                    fill="none"
                    stroke="#00a3ff"
                    strokeDasharray="4 4"
                    strokeOpacity="0.55"
                    strokeWidth="1.5"
                />
            )}

            {/* Top High-Bay Storage Rack */}
            <g>
                {showCostmap && (
                    <rect
                        fill="none"
                        height="82"
                        rx="8"
                        stroke="#00a3ff"
                        strokeDasharray="3 3"
                        strokeOpacity="0.35"
                        strokeWidth="1.5"
                        width="637"
                        x="254"
                        y="209"
                    />
                )}
                <rect
                    fill={isRawRosMode ? '#1e293b' : 'url(#storageZoneGradientInteractive)'}
                    height="70"
                    rx="4"
                    stroke={isRawRosMode ? '#000000' : '#00a3ff'}
                    strokeWidth="2.5"
                    width="625"
                    x="260"
                    y="215"
                />
                <text
                    className="font-label-md text-[12px] font-semibold tracking-wider"
                    fill={isRawRosMode ? '#ffffff' : '#004a77'}
                    x="275"
                    y="255"
                >
                    ZONE A-01 // AUTOMATED HIGH-BAY PALLET AISLE
                </text>
            </g>

            {/* Middle Buffer Island */}
            <rect
                fill={isRawRosMode ? '#1e293b' : 'url(#storageZoneGradientInteractive)'}
                height="58"
                rx="2"
                stroke={isRawRosMode ? '#000000' : '#00a3ff'}
                strokeWidth="2"
                width="26"
                x="770"
                y="305"
            />
            <text
                className="font-label-sm text-[9px]"
                fill={isRawRosMode ? '#ffffff' : '#004a77'}
                x="774"
                y="340"
            >
                BUF
            </text>

            {/* Bottom Storage Rack */}
            <g>
                {showCostmap && (
                    <rect
                        fill="none"
                        height="82"
                        rx="8"
                        stroke="#00a3ff"
                        strokeDasharray="3 3"
                        strokeOpacity="0.35"
                        strokeWidth="1.5"
                        width="637"
                        x="254"
                        y="374"
                    />
                )}
                <rect
                    fill={isRawRosMode ? '#1e293b' : 'url(#storageZoneGradientInteractive)'}
                    height="70"
                    rx="4"
                    stroke={isRawRosMode ? '#000000' : '#00a3ff'}
                    strokeWidth="2.5"
                    width="625"
                    x="260"
                    y="380"
                />
                <text
                    className="font-label-md text-[12px] font-semibold tracking-wider"
                    fill={isRawRosMode ? '#ffffff' : '#004a77'}
                    x="275"
                    y="420"
                >
                    ZONE B-02 // RAPID CONVEYOR PICK-OFF STATION
                </text>
            </g>

            {/* Keep-Out Restricted Forklift Zone Fallback */}
            {showKeepOutZones && !hasActiveVectorZones && (
                <g>
                    <rect
                        fill="url(#hazardStripesRed)"
                        height="52"
                        rx="4"
                        stroke="#ba1a1a"
                        strokeDasharray="6 4"
                        strokeWidth="1.5"
                        width="135"
                        x="740"
                        y="452"
                    />
                    <text
                        className="font-label-sm text-[9px] font-bold"
                        fill="#ba1a1a"
                        x="750"
                        y="482"
                    >
                        KEEP-OUT: FORKLIFT BAY
                    </text>
                </g>
            )}
        </g>
    );
}
