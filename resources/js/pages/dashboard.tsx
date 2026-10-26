import { Head } from '@inertiajs/react';
import React, { useCallback, useEffect, useState } from 'react';
import { DashboardCanvas } from '@/components/fleet/DashboardCanvas';
import { LiveMapCockpit, RobotsCockpit, StationsCockpit } from '@/components/fleet/cockpits';
import { DashboardModals } from '@/components/fleet/modals';
import type { CockpitSection } from '@/components/fleet/telemetry-nav-rail';
import {
    useDashboardSection,
    useDashboardSimulation,
    useMissionDispatch,
    useRobotCrud,
    useStationCrud,
} from '@/hooks/dashboard';
import type { FacilityMap, Mission, PathCoordinate, Vehicle, Waypoint } from '@/types';

interface DashboardProps {
    initialSection?: CockpitSection;
    maps?: FacilityMap[];
    activeMap?: FacilityMap | null;
    waypoints?: Waypoint[];
    vehicles?: Vehicle[];
    missions?: Mission[];
}

export default function Dashboard({
    initialSection,
    maps = [],
    activeMap = null,
    waypoints: initialWaypoints,
    vehicles: initialVehicles = [],
    missions: initialMissions = [],
}: DashboardProps) {
    const [waypoints, setWaypoints] = useState<Waypoint[]>(
        () => initialWaypoints ?? activeMap?.waypoints ?? [],
    );
    const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
    const [missions, setMissions] = useState<Mission[]>(initialMissions);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
    const [selectedWaypoint, setSelectedWaypoint] = useState<Waypoint | null>(null);

    // Layer display toggles
    const [showRobots, setShowRobots] = useState(true);
    const [showStations, setShowStations] = useState(true);
    const [showPaths, setShowPaths] = useState(true);

    // Synchronize props on Inertia partial reload
    useEffect(() => {
        setWaypoints(initialWaypoints ?? activeMap?.waypoints ?? []);
    }, [initialWaypoints, activeMap]);
    useEffect(() => setVehicles(initialVehicles), [initialVehicles]);
    useEffect(() => setMissions(initialMissions), [initialMissions]);

    // Hooks
    const robotCrud = useRobotCrud({
        vehicles,
        setVehicles,
        selectedVehicleId,
        setSelectedVehicleId,
    });

    const { isLiveSim, setIsLiveSim } = useDashboardSimulation({
        vehicles,
        setVehicles,
        waypoints,
    });

    const stationCrud = useStationCrud({
        currentMapId: activeMap?.id ?? 1,
        waypoints,
        setWaypoints,
        selectedWaypoint,
        setSelectedWaypoint,
    });

    const missionDispatch = useMissionDispatch({
        missions,
        setMissions,
        vehicles,
        waypoints,
    });

    const handleResetInteractiveModes = useCallback(() => {
        stationCrud.setStationPickMode(false);
        robotCrud.setPickPoseMode(false);
        robotCrud.setPoseEstimateMode(false);
        setSelectedVehicleId(null);
        setSelectedWaypoint(null);
    }, [stationCrud, robotCrud]);

    const { activeSection, mapView, setMapView } = useDashboardSection({
        initialSection,
        activeMap,
        onResetInteractiveModes: handleResetInteractiveModes,
    });

    const handleCanvasPickCoordinate = (coord: PathCoordinate) => {
        if (activeSection === 'stations' && stationCrud.stationPickMode) {
            stationCrud.handleCanvasPickStation(coord);
            return;
        }
        if (activeSection === 'robots' && robotCrud.pickPoseMode) {
            robotCrud.handleCanvasPickPose(coord);
        }
    };

    const pageTitle =
        activeSection === 'stations'
            ? 'Station Management'
            : activeSection === 'robots'
              ? 'Robot Fleet Management'
              : 'Live Map Dashboard';

    return (
        <>
            <Head title={pageTitle} />
            <div className="relative h-full w-full overflow-hidden bg-[#f8f9ff]">
                {/* 1. Spatial Blueprint Viewport */}
                <DashboardCanvas
                    map={activeMap}
                    mapView={mapView}
                    activeSection={activeSection}
                    waypoints={waypoints}
                    vehicles={vehicles}
                    showStations={showStations}
                    showPaths={showPaths}
                    showRobots={showRobots}
                    activeVehicleId={robotCrud.activeVehicle?.id ?? null}
                    activeInspectedStationId={stationCrud.activeInspectedStation?.id ?? null}
                    editingStationId={stationCrud.editingStation?.id ?? null}
                    onSelectVehicle={(v) => setSelectedVehicleId((prev) => (prev === v.id ? null : v.id))}
                    onSelectWaypoint={(wp) => setSelectedWaypoint((prev) => (prev?.id === wp.id ? null : wp))}
                    stationPickMode={stationCrud.stationPickMode}
                    pickPoseMode={robotCrud.pickPoseMode}
                    poseEstimateMode={robotCrud.poseEstimateMode}
                    onPickCoordinate={handleCanvasPickCoordinate}
                    onPoseEstimate={robotCrud.handleCanvasPoseEstimate}
                    stationSnapEnabled={stationCrud.stationSnapEnabled}
                    onOpenLiveSlam={() => setMapView('active')}
                    onClearSelection={() => { setSelectedVehicleId(null); setSelectedWaypoint(null); }}
                />

                {/* 2. Section A: Live Map Cockpit */}
                <LiveMapCockpit
                    activeSection={activeSection}
                    maps={maps}
                    activeMap={activeMap}
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
                    activeVehicle={robotCrud.activeVehicle}
                    vehicles={vehicles}
                    setSelectedVehicleId={(id) => setSelectedVehicleId((prev) => (prev === id ? null : id))}
                    missions={missions}
                    waypoints={waypoints}
                    onOpenDispatchModal={() =>
                        missionDispatch.setDispatchModalOpen(true)
                    }
                    onUpdateMissionStatus={missionDispatch.handleUpdateMissionStatus}
                    chargingCount={robotCrud.chargingCount}
                    blockedCount={robotCrud.blockedCount}
                    toastMessage={missionDispatch.toastMessage}
                />

                {/* 3. Section B: Stations Cockpit */}
                <StationsCockpit
                    activeSection={activeSection}
                    activeMap={activeMap}
                    waypoints={waypoints}
                    filteredWaypoints={stationCrud.filteredWaypoints}
                    selectedWaypoint={selectedWaypoint}
                    setSelectedWaypoint={(wp) => setSelectedWaypoint((prev) => (prev?.id === wp?.id ? null : wp))}
                    zoneFilter={stationCrud.zoneFilter}
                    setZoneFilter={stationCrud.setZoneFilter}
                    stationSnapEnabled={stationCrud.stationSnapEnabled}
                    setStationSnapEnabled={stationCrud.setStationSnapEnabled}
                    stationPickMode={stationCrud.stationPickMode}
                    setStationPickMode={stationCrud.setStationPickMode}
                    stationChargingCount={stationCrud.stationChargingCount}
                    stationPdCount={stationCrud.stationPdCount}
                    stationStandbyCount={stationCrud.stationStandbyCount}
                    activeInspectedStation={stationCrud.activeInspectedStation}
                    openCreateStationModal={stationCrud.openCreateStationModal}
                    openEditStationModal={stationCrud.openEditStationModal}
                    handleDeleteStation={stationCrud.handleDeleteStation}
                    editingStation={stationCrud.editingStation}
                    onStartPickNewStation={stationCrud.startPickNewStation}
                    onCancelStationPick={stationCrud.handleCancelStationPick}
                />

                {/* 4. Section C: Robots Cockpit */}
                <RobotsCockpit
                    activeSection={activeSection}
                    totalVehiclesCount={robotCrud.totalVehiclesCount}
                    liveVehiclesCount={robotCrud.liveVehiclesCount}
                    chargingCount={robotCrud.chargingCount}
                    blockedCount={robotCrud.blockedCount}
                    filteredVehicles={robotCrud.filteredVehicles}
                    activeVehicle={robotCrud.activeVehicle}
                    robotSearchQuery={robotCrud.robotSearchQuery}
                    setRobotSearchQuery={robotCrud.setRobotSearchQuery}
                    robotStatusFilter={robotCrud.robotStatusFilter}
                    setRobotStatusFilter={robotCrud.setRobotStatusFilter}
                    onSelectVehicle={(id) => setSelectedVehicleId((prev) => (prev === id ? null : id))}
                    onOpenCreateRobot={robotCrud.openCreateRobotModal}
                    isSavingRobot={robotCrud.isSavingRobot}
                    pickPoseMode={robotCrud.pickPoseMode}
                    setPickPoseMode={robotCrud.setPickPoseMode}
                    poseEstimateMode={robotCrud.poseEstimateMode}
                    setPoseEstimateMode={robotCrud.setPoseEstimateMode}
                    estimateX={robotCrud.estimateX}
                    setEstimateX={robotCrud.setEstimateX}
                    estimateY={robotCrud.estimateY}
                    setEstimateY={robotCrud.setEstimateY}
                    estimateYawDeg={robotCrud.estimateYawDeg}
                    setEstimateYawDeg={robotCrud.setEstimateYawDeg}
                    onApplyManualPoseEstimate={
                        robotCrud.handleApplyManualPoseEstimate
                    }
                    waypoints={waypoints}
                    onAlignToStation={robotCrud.handleAlignToStation}
                    onOpenEditRobot={robotCrud.openEditRobotModal}
                    onDeleteVehicle={robotCrud.handleDeleteVehicle}
                    onTelemetryUpdate={robotCrud.sendTelemetryUpdate}
                />

                {/* 5. Modals */}
                <DashboardModals
                    missionDispatch={missionDispatch}
                    stationCrud={stationCrud}
                    robotCrud={robotCrud}
                    vehicles={vehicles}
                    waypoints={waypoints}
                    activeMap={activeMap}
                    activeVehicle={robotCrud.activeVehicle}
                />
            </div>
        </>
    );
}
