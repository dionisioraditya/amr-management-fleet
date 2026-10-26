import type { Vehicle } from '@/types';
import type { CanvasCalibration } from '@/lib/geometry';
import { metricToSvg } from '@/lib/geometry';

interface CanvasVehicleLayerProps {
    vehicles: Vehicle[];
    selectedVehicleId: string | null;
    calibration: CanvasCalibration;
    onSelectVehicle?: (vehicle: Vehicle) => void;
}

export function CanvasVehicleLayer({
    vehicles,
    selectedVehicleId,
    calibration,
    onSelectVehicle,
}: CanvasVehicleLayerProps) {
    return (
        <>
            {vehicles.map((vehicle) => {
                const x = vehicle.pose?.x ?? 4.0;
                const y = vehicle.pose?.y ?? 4.0;
                const { cx, cy } = metricToSvg(x, y, calibration);
                const isSelected = vehicle.id === selectedVehicleId;
                const isEStop =
                    vehicle.status === 'emergency_stop' ||
                    vehicle.status === 'error';
                const isMoving =
                    vehicle.status === 'moving' ||
                    vehicle.status === 'active';
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
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectVehicle) {
                                onSelectVehicle(vehicle);
                            }
                        }}
                    >
                        {isSelected && (
                            <>
                                <circle
                                    className="animate-ping"
                                    cx="0"
                                    cy="0"
                                    fill={strokeColor}
                                    opacity="0.28"
                                    r="28"
                                />
                                <circle
                                    cx="0"
                                    cy="0"
                                    fill="none"
                                    stroke={strokeColor}
                                    strokeDasharray="4 4"
                                    strokeWidth="1.5"
                                    r="26"
                                />
                            </>
                        )}
                        <circle
                            cx="0"
                            cy="0"
                            fill={strokeColor}
                            fillOpacity="0.18"
                            r="20"
                        />
                        <circle
                            cx="0"
                            cy="0"
                            fill="#0b1c30"
                            r="12"
                            stroke={isSelected ? '#ffffff' : strokeColor}
                            strokeWidth={isSelected ? '3' : '2.5'}
                        />
                        <polygon
                            fill={strokeColor}
                            points="0,-6 4,4 0,2 -4,4"
                        />
                        <g transform="translate(16, -12)">
                            <rect
                                fill="#0b1c30"
                                fillOpacity="0.4"
                                height="20"
                                rx="4"
                                stroke={strokeColor}
                                strokeWidth={isSelected ? '1.8' : '1'}
                                width="92"
                            />
                            <text
                                className="font-label-sm text-[9px] font-bold"
                                fill="#ffffff"
                                x="6"
                                y="13"
                            >
                                {vehicle.id} • {vehicle.battery_percentage}%
                            </text>
                        </g>
                    </g>
                );
            })}
        </>
    );
}
