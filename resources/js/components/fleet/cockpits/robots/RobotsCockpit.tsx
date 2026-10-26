import React from 'react';
import type { Vehicle, Waypoint } from '@/types';
import { RobotManifestList, type StatusFilter } from './RobotManifestList';
import { RobotTeleopPanel } from './RobotTeleopPanel';

interface RobotsCockpitProps {
    activeSection: 'live-map' | 'stations' | 'robots';
    totalVehiclesCount: number;
    liveVehiclesCount: number;
    chargingCount: number;
    blockedCount: number;
    filteredVehicles: Vehicle[];
    activeVehicle: Vehicle | null;
    robotSearchQuery: string;
    setRobotSearchQuery: (query: string) => void;
    robotStatusFilter: StatusFilter;
    setRobotStatusFilter: (filter: StatusFilter) => void;
    onSelectVehicle: (id: string | null) => void;
    onOpenCreateRobot: () => void;
    isSavingRobot: boolean;
    pickPoseMode: boolean;
    setPickPoseMode: React.Dispatch<React.SetStateAction<boolean>>;
    poseEstimateMode: boolean;
    setPoseEstimateMode: React.Dispatch<React.SetStateAction<boolean>>;
    estimateX: string;
    setEstimateX: (val: string) => void;
    estimateY: string;
    setEstimateY: (val: string) => void;
    estimateYawDeg: string;
    setEstimateYawDeg: (val: string) => void;
    onApplyManualPoseEstimate: () => void;
    waypoints: Waypoint[];
    onAlignToStation: (wp: Waypoint) => void;
    onOpenEditRobot: (vehicle: Vehicle) => void;
    onDeleteVehicle: (vehicle: Vehicle) => void;
    onTelemetryUpdate: (
        vehicle: Vehicle,
        updates: Partial<Vehicle> & { x?: number; y?: number; theta?: number; event?: string },
    ) => Promise<void>;
}

export const RobotsCockpit: React.FC<RobotsCockpitProps> = ({
    activeSection,
    totalVehiclesCount,
    liveVehiclesCount,
    chargingCount,
    blockedCount,
    filteredVehicles,
    activeVehicle,
    robotSearchQuery,
    setRobotSearchQuery,
    robotStatusFilter,
    setRobotStatusFilter,
    onSelectVehicle,
    onOpenCreateRobot,
    isSavingRobot,
    pickPoseMode,
    setPickPoseMode,
    poseEstimateMode,
    setPoseEstimateMode,
    estimateX,
    setEstimateX,
    estimateY,
    setEstimateY,
    estimateYawDeg,
    setEstimateYawDeg,
    onApplyManualPoseEstimate,
    waypoints,
    onAlignToStation,
    onOpenEditRobot,
    onDeleteVehicle,
    onTelemetryUpdate,
}) => {
    return (
        <>
            <aside
                aria-hidden={activeSection !== 'robots'}
                className={`absolute top-0 bottom-0 left-0 z-20 flex h-full w-full max-w-[460px] flex-col overflow-y-auto border-r border-slate-200/60 bg-white/40 backdrop-blur-sm transition-all duration-500 ease-spring ${
                    activeSection === 'robots'
                        ? 'pointer-events-auto translate-x-0 opacity-100 scale-100'
                        : 'pointer-events-none -translate-x-12 opacity-0 scale-[0.98]'
                }`}
            >
                <RobotManifestList
                    totalVehiclesCount={totalVehiclesCount}
                    liveVehiclesCount={liveVehiclesCount}
                    chargingCount={chargingCount}
                    blockedCount={blockedCount}
                    filteredVehicles={filteredVehicles}
                    activeVehicle={activeVehicle}
                    robotSearchQuery={robotSearchQuery}
                    setRobotSearchQuery={setRobotSearchQuery}
                    robotStatusFilter={robotStatusFilter}
                    setRobotStatusFilter={setRobotStatusFilter}
                    onSelectVehicle={onSelectVehicle}
                    onOpenCreate={onOpenCreateRobot}
                />
            </aside>

            <RobotTeleopPanel
                activeSection={activeSection}
                activeVehicle={activeVehicle}
                isSavingRobot={isSavingRobot}
                pickPoseMode={pickPoseMode}
                setPickPoseMode={setPickPoseMode}
                poseEstimateMode={poseEstimateMode}
                setPoseEstimateMode={setPoseEstimateMode}
                estimateX={estimateX}
                setEstimateX={setEstimateX}
                estimateY={estimateY}
                setEstimateY={setEstimateY}
                estimateYawDeg={estimateYawDeg}
                setEstimateYawDeg={setEstimateYawDeg}
                onApplyManualPoseEstimate={onApplyManualPoseEstimate}
                waypoints={waypoints}
                onAlignToStation={onAlignToStation}
                onOpenEditRobot={onOpenEditRobot}
                onDeleteVehicle={onDeleteVehicle}
                onTelemetryUpdate={onTelemetryUpdate}
            />
        </>
    );
};
