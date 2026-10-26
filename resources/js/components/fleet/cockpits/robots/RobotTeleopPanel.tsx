import React from 'react';
import type { Vehicle, Waypoint } from '@/types';
import { StatusBadge } from '@/components/fleet/status-badge';
import { RobotTeleopControls } from './RobotTeleopControls';
import { RobotPoseEstimateCard } from './RobotPoseEstimateCard';

interface RobotTeleopPanelProps {
    activeSection: 'live-map' | 'stations' | 'robots';
    activeVehicle: Vehicle | null;
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

const OVERRIDE_STATUSES = ['active', 'idle', 'charging', 'maintenance', 'error'] as const;

export const RobotTeleopPanel: React.FC<RobotTeleopPanelProps> = ({
    activeSection,
    activeVehicle,
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
    if (!activeVehicle) return null;

    return (
        <div
            aria-hidden={activeSection !== 'robots'}
            className={`absolute top-24 right-4 z-20 flex w-88 flex-col gap-3 rounded-xl border border-slate-200/90 bg-white/95 p-4 shadow-lg backdrop-blur-md transition-all duration-500 ease-spring ${
                activeSection === 'robots'
                    ? 'pointer-events-auto translate-x-0 opacity-100 scale-100'
                    : 'pointer-events-none translate-x-12 opacity-0 scale-[0.96]'
            }`}
        >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                    <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 animate-ping rounded-full bg-secondary" />
                        <span className="font-mono text-[10px] font-bold tracking-wider text-primary uppercase">
                            HUD Target Lock // {activeVehicle.id}
                        </span>
                    </div>
                    <h2 className="mt-0.5 font-headline-md text-base font-bold text-on-surface">
                        {activeVehicle.name}
                    </h2>
                </div>
                <StatusBadge status={activeVehicle.status} />
            </div>

            {/* ROS 2 Humble SSH Node Status */}
            <div className="flex items-center justify-between rounded-lg bg-[#0b1c30] px-3 py-2 font-mono text-[11px] text-white">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-secondary">
                        terminal
                    </span>
                    <span>ROS 2 Humble ({activeVehicle.ip_address})</span>
                </div>
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                    SSH READY
                </span>
            </div>

            {/* Status Mode Override Pills */}
            <div>
                <span className="mb-1.5 block font-label-sm text-[10px] font-bold tracking-wider text-tertiary uppercase">
                    Override State Machine
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                    {OVERRIDE_STATUSES.map((st) => (
                        <button
                            key={st}
                            type="button"
                            onClick={() =>
                                void onTelemetryUpdate(activeVehicle, {
                                    status: st,
                                    event: `Operator manually switched status to ${st}`,
                                })
                            }
                            className={`cursor-pointer rounded-lg border px-2 py-1 font-mono text-[10px] font-bold uppercase transition-all ${
                                activeVehicle.status === st
                                    ? 'border-primary bg-primary text-white'
                                    : 'border-slate-200 bg-surface-container-low text-on-surface hover:border-secondary'
                            }`}
                        >
                            {st}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2D Teleop Controls */}
            <RobotTeleopControls
                activeVehicle={activeVehicle}
                pickPoseMode={pickPoseMode}
                onTogglePickPose={() => {
                    setPoseEstimateMode(false);
                    setPickPoseMode((prev) => !prev);
                }}
                onTelemetryUpdate={onTelemetryUpdate}
            />

            {/* RViz 2D Pose Estimate Relocalization Card */}
            <RobotPoseEstimateCard
                poseEstimateMode={poseEstimateMode}
                onTogglePoseEstimate={() => {
                    setPickPoseMode(false);
                    setPoseEstimateMode((prev) => !prev);
                }}
                estimateX={estimateX}
                setEstimateX={setEstimateX}
                estimateY={estimateY}
                setEstimateY={setEstimateY}
                estimateYawDeg={estimateYawDeg}
                setEstimateYawDeg={setEstimateYawDeg}
                onApplyManualPoseEstimate={onApplyManualPoseEstimate}
                waypoints={waypoints}
                onAlignToStation={onAlignToStation}
            />

            {/* Battery SoC Simulator Slider */}
            <div>
                <div className="mb-1 flex justify-between font-mono text-[10px]">
                    <span className="text-tertiary uppercase">
                        Battery SoC Override
                    </span>
                    <span className="font-bold text-primary">
                        {activeVehicle.battery_percentage}%
                    </span>
                </div>
                <input
                    type="range"
                    min={0}
                    max={100}
                    value={activeVehicle.battery_percentage}
                    onChange={(e) =>
                        void onTelemetryUpdate(activeVehicle, {
                            battery_percentage: Number(e.target.value),
                        })
                    }
                    className="w-full accent-secondary"
                />
            </div>

            {/* Edit / Delete Actions */}
            <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                <button
                    type="button"
                    onClick={() => onOpenEditRobot(activeVehicle)}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-surface-container-low py-2 font-label-md text-xs font-bold text-on-surface uppercase transition-colors hover:bg-surface-container-high"
                >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    Edit Unit
                </button>
                <button
                    type="button"
                    disabled={isSavingRobot}
                    onClick={() => onDeleteVehicle(activeVehicle)}
                    className="flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-label-md text-xs font-bold text-error uppercase transition-colors hover:bg-red-100"
                >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    Delete
                </button>
            </div>
        </div>
    );
};
