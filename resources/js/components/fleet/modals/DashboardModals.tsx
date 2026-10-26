import React from 'react';
import type { FacilityMap, Vehicle, Waypoint } from '@/types';
import type {
    useMissionDispatch,
    useRobotCrud,
    useStationCrud,
} from '@/hooks/dashboard';
import { MissionDispatchModal } from './MissionDispatchModal';
import { StationFormModal } from './StationFormModal';
import { RobotFormModal } from './RobotFormModal';

interface DashboardModalsProps {
    missionDispatch: ReturnType<typeof useMissionDispatch>;
    stationCrud: ReturnType<typeof useStationCrud>;
    robotCrud: ReturnType<typeof useRobotCrud>;
    vehicles: Vehicle[];
    waypoints: Waypoint[];
    activeMap: FacilityMap | null;
    activeVehicle: Vehicle | null;
}

export const DashboardModals: React.FC<DashboardModalsProps> = ({
    missionDispatch,
    stationCrud,
    robotCrud,
    vehicles,
    waypoints,
    activeMap,
    activeVehicle,
}) => {
    return (
        <>
            <MissionDispatchModal
                isOpen={missionDispatch.dispatchModalOpen}
                onClose={() => missionDispatch.setDispatchModalOpen(false)}
                missionName={missionDispatch.missionName}
                setMissionName={missionDispatch.setMissionName}
                missionVehicleId={missionDispatch.missionVehicleId}
                setMissionVehicleId={missionDispatch.setMissionVehicleId}
                missionPriority={missionDispatch.missionPriority}
                setMissionPriority={missionDispatch.setMissionPriority}
                vehicles={vehicles}
                waypoints={waypoints}
                waypointToAdd={missionDispatch.waypointToAdd}
                setWaypointToAdd={missionDispatch.setWaypointToAdd}
                selectedWaypointIds={missionDispatch.selectedWaypointIds}
                isSubmittingMission={missionDispatch.isSubmittingMission}
                handleAddWaypointStep={missionDispatch.handleAddWaypointStep}
                handleRemoveWaypointStep={missionDispatch.handleRemoveWaypointStep}
                handleMoveWaypointStep={missionDispatch.handleMoveWaypointStep}
                handleDispatchMission={missionDispatch.handleDispatchMission}
            />

            <StationFormModal
                isOpen={stationCrud.stationModalOpen}
                onOpenChange={stationCrud.setStationModalOpen}
                editingStation={stationCrud.editingStation}
                activeMap={activeMap}
                stationFormName={stationCrud.stationFormName}
                setStationFormName={stationCrud.setStationFormName}
                stationFormType={stationCrud.stationFormType}
                handleStationTypePresetChange={stationCrud.handleStationTypePresetChange}
                stationSnapEnabled={stationCrud.stationSnapEnabled}
                setStationSnapEnabled={stationCrud.setStationSnapEnabled}
                setStationPickMode={stationCrud.setStationPickMode}
                activeVehicle={activeVehicle}
                stationFormX={stationCrud.stationFormX}
                setStationFormX={stationCrud.setStationFormX}
                stationFormY={stationCrud.stationFormY}
                setStationFormY={stationCrud.setStationFormY}
                stationFormYawDeg={stationCrud.stationFormYawDeg}
                setStationFormYawDeg={stationCrud.setStationFormYawDeg}
                handleSaveStation={stationCrud.handleSaveStation}
                savingStation={stationCrud.savingStation}
            />

            <RobotFormModal
                isOpen={robotCrud.robotModalOpen}
                onClose={() => robotCrud.setRobotModalOpen(false)}
                robotModalMode={robotCrud.robotModalMode}
                robotFormId={robotCrud.robotFormId}
                setRobotFormId={robotCrud.setRobotFormId}
                robotFormName={robotCrud.robotFormName}
                setRobotFormName={robotCrud.setRobotFormName}
                robotFormIp={robotCrud.robotFormIp}
                setRobotFormIp={robotCrud.setRobotFormIp}
                robotFormStatus={robotCrud.robotFormStatus}
                setRobotFormStatus={robotCrud.setRobotFormStatus}
                robotFormBattery={robotCrud.robotFormBattery}
                setRobotFormBattery={robotCrud.setRobotFormBattery}
                handleSaveVehicle={robotCrud.handleSaveVehicle}
                isSavingRobot={robotCrud.isSavingRobot}
            />
        </>
    );
};
