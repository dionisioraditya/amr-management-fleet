import type { FacilityMap, Mission, Vehicle, Waypoint } from '@/types';
import { LiveMapSidebar } from './LiveMapSidebar';
import { LiveMapTopBar } from './LiveMapTopBar';

interface LiveMapCockpitProps {
    activeSection: string;
    maps: FacilityMap[];
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
    toastMessage: string | null;
    isLiveSim: boolean;
    setIsLiveSim: React.Dispatch<React.SetStateAction<boolean>>;
    mapView: 'active' | 'empty';
    setMapView: (mode: 'active' | 'empty') => void;
    showRobots: boolean;
    setShowRobots: (show: boolean) => void;
    showStations: boolean;
    setShowStations: (show: boolean) => void;
    showPaths: boolean;
    setShowPaths: (show: boolean) => void;
}

export function LiveMapCockpit({
    activeSection,
    maps,
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
    toastMessage,
    isLiveSim,
    setIsLiveSim,
    mapView,
    setMapView,
    showRobots,
    setShowRobots,
    showStations,
    setShowStations,
    showPaths,
    setShowPaths,
}: LiveMapCockpitProps) {
    const isLive = activeSection === 'live-map';

    return (
        <div
            className={`pointer-events-none absolute inset-0 z-20 flex h-full w-full flex-col justify-between transition-all duration-500 ease-spring ${
                isLive
                    ? 'translate-y-0 opacity-100 scale-100'
                    : '-translate-y-4 opacity-0 scale-[0.98]'
            }`}
        >
            <LiveMapTopBar
                maps={maps}
                activeMap={activeMap}
                activeSection={activeSection}
                toastMessage={toastMessage}
                isLiveSim={isLiveSim}
                setIsLiveSim={setIsLiveSim}
                mapView={mapView}
                setMapView={setMapView}
                showRobots={showRobots}
                setShowRobots={setShowRobots}
                showStations={showStations}
                setShowStations={setShowStations}
                showPaths={showPaths}
                setShowPaths={setShowPaths}
            />

            <LiveMapSidebar
                activeSection={activeSection}
                activeMap={activeMap}
                activeVehicle={activeVehicle}
                vehicles={vehicles}
                setSelectedVehicleId={setSelectedVehicleId}
                missions={missions}
                onOpenDispatchModal={onOpenDispatchModal}
                onUpdateMissionStatus={onUpdateMissionStatus}
                chargingCount={chargingCount}
                blockedCount={blockedCount}
                waypoints={waypoints}
            />
        </div>
    );
}
