import React from 'react';
import type { CockpitSection } from '@/components/fleet/telemetry-nav-rail';
import { EmptyMapState } from '@/components/fleet/EmptyMapState';
import { InteractiveBlueprintCanvas } from '@/components/fleet/interactive-blueprint-canvas';
import type {
    FacilityMap,
    PathCoordinate,
    Vehicle,
    Waypoint,
} from '@/types';

interface DashboardCanvasProps {
    map: FacilityMap | null;
    mapView: 'active' | 'empty';
    activeSection: CockpitSection;
    waypoints: Waypoint[];
    vehicles: Vehicle[];
    showStations: boolean;
    showPaths: boolean;
    showRobots: boolean;
    activeVehicleId: string | null;
    activeInspectedStationId: number | null;
    editingStationId?: number | null;
    onSelectVehicle: (vehicle: Vehicle) => void;
    onSelectWaypoint: (wp: Waypoint) => void;
    stationPickMode: boolean;
    pickPoseMode: boolean;
    poseEstimateMode: boolean;
    onPickCoordinate: (coord: PathCoordinate) => void;
    onPoseEstimate: (pose: { x: number; y: number; theta: number }) => void;
    stationSnapEnabled: boolean;
    onOpenLiveSlam: () => void;
    onClearSelection?: () => void;
}

export const DashboardCanvas: React.FC<DashboardCanvasProps> = ({
    map,
    mapView,
    activeSection,
    waypoints,
    vehicles,
    showStations,
    showPaths,
    showRobots,
    activeVehicleId,
    activeInspectedStationId,
    editingStationId,
    onSelectVehicle,
    onSelectWaypoint,
    stationPickMode,
    pickPoseMode,
    poseEstimateMode,
    onPickCoordinate,
    onPoseEstimate,
    stationSnapEnabled,
    onOpenLiveSlam,
    onClearSelection,
}) => {
    if (mapView !== 'active' && activeSection === 'live-map') {
        return <EmptyMapState onOpenLiveSlam={onOpenLiveSlam} />;
    }

    const canvasWaypoints =
        activeSection === 'live-map'
            ? showStations
                ? waypoints
                : []
            : waypoints;

    const canvasPaths =
        activeSection === 'live-map'
            ? showPaths
                ? (map?.pathplans ?? [])
                : []
            : (map?.pathplans ?? []);

    const canvasVehicles =
        activeSection === 'live-map'
            ? showRobots
                ? vehicles
                : []
            : activeSection === 'robots'
              ? vehicles
              : [];

    const canvasMode =
        (activeSection === 'stations' && stationPickMode) ||
        (activeSection === 'robots' && pickPoseMode)
            ? 'pick-station'
            : activeSection === 'robots' && poseEstimateMode
              ? 'pose-estimate'
              : 'view';

    return (
        <div className="absolute inset-0 z-0">
            <InteractiveBlueprintCanvas
                map={map}
                waypoints={canvasWaypoints}
                pathplans={canvasPaths}
                vehicles={canvasVehicles}
                selectedVehicleId={activeVehicleId}
                selectedWaypointId={
                    activeSection === 'stations'
                        ? activeInspectedStationId
                        : null
                }
                editingWaypointId={editingStationId}
                onSelectVehicle={onSelectVehicle}
                onSelectWaypoint={onSelectWaypoint}
                mode={canvasMode}
                onPickCoordinate={onPickCoordinate}
                onPoseEstimate={onPoseEstimate}
                snapStep={canvasMode === 'pose-estimate' ? 0 : stationSnapEnabled ? 0.5 : 0}
                resolution={map?.resolution ?? 0.05}
                hudPosition="bottom-right"
                onClearSelection={onClearSelection}
            />
        </div>
    );
};
