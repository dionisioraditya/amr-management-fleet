import type { Mission, Vehicle, Waypoint } from '@/types';

interface FleetTelemetryCardProps {
    vehicles: Vehicle[];
    chargingCount: number;
    blockedCount: number;
    waypoints: Waypoint[];
    missions: Mission[];
}

export function FleetTelemetryCard({
    vehicles,
    chargingCount,
    blockedCount,
    waypoints,
    missions,
}: FleetTelemetryCardProps) {
    return (
        <div className="flex w-84 flex-col gap-space-sm rounded-xl border border-surface-container-high bg-surface-container-lowest/95 p-space-md shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md">
            <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-[20px] text-primary">
                        monitoring
                    </span>
                    <span className="font-headline-sm text-headline-sm font-semibold text-on-surface uppercase">
                        Fleet Telemetry
                    </span>
                </div>
                <span className="font-label-sm text-[10px] text-tertiary">
                    POLL RATE 10Hz
                </span>
            </div>

            <div className="grid grid-cols-2 gap-space-xs">
                <div className="flex flex-col rounded-lg bg-surface-container-low p-space-sm">
                    <span className="font-label-sm text-label-sm text-tertiary">ACTIVE AMRs</span>
                    <span className="mt-0.5 font-headline-lg text-headline-lg font-bold text-primary">
                        {String(vehicles.length).padStart(2, '0')}
                    </span>
                    <span className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary-container" /> 100% nominal
                    </span>
                </div>

                <div className="flex flex-col rounded-lg bg-surface-container-low p-space-sm">
                    <span className="font-label-sm text-label-sm text-tertiary">CHARGING</span>
                    <span className="mt-0.5 font-headline-lg text-headline-lg font-bold text-on-surface">
                        {String(chargingCount).padStart(2, '0')}
                    </span>
                    <span className="font-label-sm text-label-sm text-tertiary">ST-CHARGE BAYS</span>
                </div>

                <div className="flex flex-col rounded-lg bg-surface-container-low p-space-sm">
                    <span className="font-label-sm text-label-sm text-tertiary">BLOCKED / STOP</span>
                    <span className="mt-0.5 font-headline-lg text-headline-lg font-bold text-on-surface">
                        {String(blockedCount).padStart(2, '0')}
                    </span>
                    <span className="font-label-sm text-label-sm font-semibold text-primary">
                        {blockedCount === 0 ? 'No hazards' : 'Alert active'}
                    </span>
                </div>

                <div className="flex flex-col rounded-lg bg-surface-container-low p-space-sm">
                    <span className="font-label-sm text-label-sm text-tertiary">WAYPOINTS</span>
                    <span className="mt-0.5 font-headline-lg text-headline-lg font-bold text-secondary">
                        {String(waypoints.length).padStart(2, '0')}
                    </span>
                    <span className="font-label-sm text-label-sm text-tertiary">
                        {missions.length} missions
                    </span>
                </div>
            </div>
        </div>
    );
}
