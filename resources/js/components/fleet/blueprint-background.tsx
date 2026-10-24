import type { Pathplan, Vehicle, Waypoint } from '@/types';

interface BlueprintBackgroundProps {
    waypoints?: Waypoint[];
    pathplans?: Pathplan[];
    vehicles?: Vehicle[];
    dimmed?: boolean;
}

/**
 * Converts meter coordinates (e.g. X in [0..22], Y in [0..16]) into the 1000x620 SVG viewport
 * so database entities render accurately over the architectural blueprint.
 */
function toSvgCoord(x: number, y: number): { cx: number; cy: number } {
    const cx = Math.min(910, Math.max(85, 110 + x * 38));
    const cy = Math.min(505, Math.max(150, 490 - y * 22));
    return { cx, cy };
}

export function BlueprintBackground({
    waypoints = [],
    pathplans = [],
    vehicles = [],
    dimmed = false,
}: BlueprintBackgroundProps) {
    return (
        <div
            className={`absolute inset-0 z-0 flex items-center justify-center overflow-hidden bg-[#f8f9ff] select-none ${
                dimmed ? 'pointer-events-none opacity-65' : ''
            }`}
        >
            {/* Dot Matrix Coordinate Background */}
            <div
                className="pointer-events-none absolute inset-0 bg-surface-container-low/30"
                style={{
                    backgroundSize: '36px 36px',
                    backgroundImage:
                        'radial-gradient(#949cb5 0.9px, transparent 0.9px)',
                }}
            />

            <div className="relative flex h-full max-h-[920px] w-full max-w-[1580px] items-center justify-center p-6">
                <svg
                    className="h-full w-full drop-shadow-sm select-none"
                    preserveAspectRatio="xMidYMid meet"
                    viewBox="0 0 1000 620"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <linearGradient
                            id="storageZoneGradient"
                            x1="0%"
                            x2="0%"
                            y1="0%"
                            y2="100%"
                        >
                            <stop
                                offset="0%"
                                stopColor="#cfe5ff"
                                stopOpacity="0.6"
                            />
                            <stop
                                offset="100%"
                                stopColor="#e5eeff"
                                stopOpacity="0.85"
                            />
                        </linearGradient>
                    </defs>

                    {/* Outer Perimeter Walls (Deep Cobalt Steel #1d4ed8) */}
                    <path
                        d="M 60 480 L 140 480 L 140 435 L 115 435 L 115 350 L 90 350 L 90 230 L 130 230 L 130 215 L 75 215 L 75 190 L 120 190 L 120 160 L 150 160 L 150 135 L 250 135 L 250 160 L 900 160 L 900 455 L 935 455 L 935 525 L 850 525 L 850 510 L 720 510 L 720 495 L 640 495 L 640 510 L 140 510 L 60 510 Z"
                        fill="#f8f9ff"
                        stroke="#1d4ed8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                    />

                    {/* Sub Perimeter Hairline Offset */}
                    <path
                        d="M 66 474 L 134 474 L 134 429 L 109 429 L 109 356 L 96 356 L 96 236 L 124 236 L 124 209 L 81 209 L 81 196 L 126 196 L 126 166 L 156 166 L 156 141 L 244 141 L 244 166 L 894 166 L 894 449 L 929 449 L 929 519 L 856 519 L 856 504 L 714 504 L 714 489 L 634 489 L 634 504 L 146 504 L 66 504 Z"
                        fill="none"
                        stroke="#cfe5ff"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                    />

                    {/* Top Storage Rack */}
                    <rect
                        fill="url(#storageZoneGradient)"
                        height="70"
                        rx="4"
                        stroke="#00a3ff"
                        strokeWidth="2.5"
                        width="625"
                        x="260"
                        y="215"
                    />
                    <text
                        className="font-label-md text-[13px] font-semibold tracking-wider"
                        fill="#004a77"
                        x="275"
                        y="255"
                    >
                        ZONE A-01 // AUTOMATED HIGH-BAY PALLET AISLE
                    </text>

                    {/* Middle Buffer Island */}
                    <rect
                        fill="url(#storageZoneGradient)"
                        height="58"
                        rx="2"
                        stroke="#00a3ff"
                        strokeWidth="2"
                        width="26"
                        x="770"
                        y="305"
                    />
                    <text
                        className="font-label-sm text-[9px]"
                        fill="#004a77"
                        x="774"
                        y="340"
                    >
                        BUF
                    </text>

                    {/* Bottom Storage Rack */}
                    <rect
                        fill="url(#storageZoneGradient)"
                        height="70"
                        rx="4"
                        stroke="#00a3ff"
                        strokeWidth="2.5"
                        width="625"
                        x="260"
                        y="380"
                    />
                    <text
                        className="font-label-md text-[13px] font-semibold tracking-wider"
                        fill="#004a77"
                        x="275"
                        y="420"
                    >
                        ZONE B-02 // RAPID CONVEYOR PICK-OFF STATION
                    </text>

                    {/* Dynamic Pathplans from Database */}
                    {pathplans.length > 0 ? (
                        pathplans.map((path) => {
                            if (
                                !path.coordinates ||
                                path.coordinates.length < 2
                            ) {
                                return null;
                            }
                            const d = path.coordinates
                                .map((pt, idx) => {
                                    const { cx, cy } = toSvgCoord(pt.x, pt.y);
                                    return `${idx === 0 ? 'M' : 'L'} ${cx} ${cy}`;
                                })
                                .join(' ');

                            return (
                                <g key={path.id}>
                                    <path
                                        d={d}
                                        fill="none"
                                        stroke={
                                            path.is_bidirectional
                                                ? '#00a3ff'
                                                : '#1d4ed8'
                                        }
                                        strokeDasharray="8 4"
                                        strokeWidth="2.5"
                                    />
                                </g>
                            );
                        })
                    ) : (
                        <path
                            className="animate-pulse opacity-90"
                            d="M 330 335 L 520 335 L 520 345 L 710 345"
                            fill="none"
                            stroke="#00a3ff"
                            strokeDasharray="8 4"
                            strokeWidth="3"
                        />
                    )}

                    {/* Dynamic Waypoints (Diamond Glyphs) */}
                    {waypoints.map((wp) => {
                        const { cx, cy } = toSvgCoord(wp.x, wp.y);
                        const isCharger = wp.name.includes('CHARGE');
                        return (
                            <g
                                key={wp.id}
                                className="cursor-pointer"
                                transform={`translate(${cx}, ${cy})`}
                            >
                                <rect
                                    fill={isCharger ? '#0b1c30' : '#ffffff'}
                                    height="18"
                                    rx="3"
                                    stroke="#00a3ff"
                                    strokeWidth="2"
                                    transform="rotate(45)"
                                    width="18"
                                    x="-9"
                                    y="-9"
                                />
                                <circle
                                    cx="0"
                                    cy="0"
                                    fill={isCharger ? '#00a3ff' : '#1d4ed8'}
                                    r="2.5"
                                />
                                <text
                                    className="font-label-sm text-[10px] font-semibold"
                                    fill="#0b1c30"
                                    x="14"
                                    y="4"
                                >
                                    {wp.name}
                                </text>
                            </g>
                        );
                    })}

                    {/* Live AMR Vehicle Markers */}
                    {vehicles.map((vehicle) => {
                        const x = vehicle.pose?.x ?? 4.0;
                        const y = vehicle.pose?.y ?? 4.0;
                        const { cx, cy } = toSvgCoord(x, y);
                        const isEStop = vehicle.status === 'emergency_stop';
                        const isMoving = vehicle.status === 'moving';
                        const strokeColor = isEStop
                            ? '#ef4444'
                            : isMoving
                              ? '#00a3ff'
                              : '#6366f1';

                        return (
                            <g
                                key={vehicle.id}
                                className="cursor-pointer"
                                transform={`translate(${cx}, ${cy})`}
                            >
                                <circle
                                    cx="0"
                                    cy="0"
                                    fill={strokeColor}
                                    fillOpacity="0.18"
                                    r="22"
                                />
                                <circle
                                    cx="0"
                                    cy="0"
                                    fill="#0b1c30"
                                    r="13"
                                    stroke={strokeColor}
                                    strokeWidth="2.5"
                                />
                                <polygon
                                    fill={strokeColor}
                                    points="0,-7 5,5 0,2 -5,5"
                                />
                                <g transform="translate(18, -14)">
                                    <rect
                                        fill="#0b1c30"
                                        height="22"
                                         rx="4"
                                        stroke={strokeColor}
                                        strokeWidth="1"
                                        width="92"
                                    />
                                    <text
                                        className="font-label-sm text-[10px] font-bold"
                                        fill="#ffffff"
                                        x="7"
                                        y="14"
                                    >
                                        {vehicle.id} •{' '}
                                        {vehicle.battery_percentage}%
                                    </text>
                                </g>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}
