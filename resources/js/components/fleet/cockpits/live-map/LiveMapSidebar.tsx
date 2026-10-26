import type { FacilityMap, Mission, Vehicle, Waypoint } from '@/types';
import { ActiveAmrInspectorCard } from './ActiveAmrInspectorCard';
import { FleetTelemetryCard } from './FleetTelemetryCard';
import { MissionQueueCard } from './MissionQueueCard';

interface LiveMapSidebarProps {
    activeSection: string;
    activeMap?: FacilityMap | null;
    activeVehicle: Vehicle | null;
    vehicles: Vehicle[];
    setSelectedVehicleId: (id: string) => void;
    missions: Mission[];
    onOpenDispatchModal: () => void;
    onUpdateMissionStatus: (
        mission: Mission,
        nextStatus: 'in_progress' | 'completed' | 'cancelled',
    ) => void;
    chargingCount: number;
    blockedCount: number;
    waypoints: Waypoint[];
}

export function LiveMapSidebar({
    activeSection,
    activeMap,
    activeVehicle,
    vehicles,
    setSelectedVehicleId,
    missions,
    onOpenDispatchModal,
    onUpdateMissionStatus,
    chargingCount,
    blockedCount,
    waypoints,
}: LiveMapSidebarProps) {
    const isLive = activeSection === 'live-map';

    return (
        <div className="relative flex w-full flex-1 justify-between p-4">
            {/* Left Floating Pill: Nav2 Status */}
            <div
                className={`flex items-center gap-space-sm self-start rounded-full border border-surface-container-high bg-surface-container-lowest/95 px-3.5 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md ${
                    isLive ? 'pointer-events-auto' : 'pointer-events-none'
                }`}
            >
                <span className="h-2 w-2 animate-ping rounded-full bg-primary-container" />
                <span className="font-label-md text-label-md font-semibold tracking-wider text-on-surface">
                    NAV2 OCCUPANCY GRID
                </span>
                <span className="font-label-sm text-label-sm text-tertiary">
                    | RESOLUTION: {activeMap?.resolution ?? 0.05}m/px
                </span>
                <span className="ml-1 font-mono font-label-sm text-label-sm text-primary">
                    X: {activeVehicle?.pose?.x?.toFixed(2) ?? '8.42'}{' '}
                    Y: {activeVehicle?.pose?.y?.toFixed(2) ?? '5.12'}
                </span>
            </div>

            {/* Right Floating Panels: Robot HUD Inspector + Mission Queue + Fleet Telemetry */}
            <div
                className={`flex max-h-[calc(100vh-160px)] flex-col items-end gap-3.5 overflow-y-auto pr-1 ${
                    isLive ? 'pointer-events-auto' : 'pointer-events-none'
                }`}
            >
                <ActiveAmrInspectorCard
                    activeVehicle={activeVehicle}
                    vehicles={vehicles}
                    onSelectVehicleId={setSelectedVehicleId}
                />

                <MissionQueueCard
                    missions={missions}
                    onOpenDispatchModal={onOpenDispatchModal}
                    onUpdateMissionStatus={onUpdateMissionStatus}
                />

                <FleetTelemetryCard
                    vehicles={vehicles}
                    chargingCount={chargingCount}
                    blockedCount={blockedCount}
                    waypoints={waypoints}
                    missions={missions}
                />
            </div>
        </div>
    );
}
