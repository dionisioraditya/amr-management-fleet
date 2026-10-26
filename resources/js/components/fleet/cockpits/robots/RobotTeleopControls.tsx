import React from 'react';
import type { Vehicle } from '@/types';

interface RobotTeleopControlsProps {
    activeVehicle: Vehicle;
    pickPoseMode: boolean;
    onTogglePickPose: () => void;
    onTelemetryUpdate: (
        vehicle: Vehicle,
        updates: Partial<Vehicle> & { x?: number; y?: number; theta?: number; event?: string },
    ) => Promise<void>;
}

export const RobotTeleopControls: React.FC<RobotTeleopControlsProps> = ({
    activeVehicle,
    pickPoseMode,
    onTogglePickPose,
    onTelemetryUpdate,
}) => {
    return (
        <div className="rounded-xl border border-slate-200 bg-surface-container-low p-3">
            <div className="mb-2 flex items-center justify-between">
                <span className="font-label-sm text-[10px] font-bold tracking-wider text-on-surface uppercase">
                    2D Teleop &amp; Pose Step
                </span>
                <button
                    type="button"
                    onClick={onTogglePickPose}
                    className={`cursor-pointer rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase transition-colors ${
                        pickPoseMode
                            ? 'bg-secondary text-white'
                            : 'bg-white text-primary hover:bg-sky-50'
                    }`}
                >
                    {pickPoseMode ? 'PICKING... (CANCEL)' : 'SET POSE ON MAP'}
                </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-xs">
                <button
                    type="button"
                    onClick={() =>
                        void onTelemetryUpdate(activeVehicle, {
                            theta: (activeVehicle.pose?.theta ?? 0) - 0.25,
                        })
                    }
                    className="cursor-pointer rounded-lg border border-slate-200 bg-white py-1.5 font-bold text-on-surface hover:bg-sky-50"
                >
                    ↺ θ-
                </button>
                <button
                    type="button"
                    onClick={() =>
                        void onTelemetryUpdate(activeVehicle, {
                            y: (activeVehicle.pose?.y ?? 4) + 1.0,
                            status: 'active',
                        })
                    }
                    className="cursor-pointer rounded-lg border border-slate-200 bg-white py-1.5 font-bold text-primary hover:bg-sky-50"
                >
                    ▲ +Y
                </button>
                <button
                    type="button"
                    onClick={() =>
                        void onTelemetryUpdate(activeVehicle, {
                            theta: (activeVehicle.pose?.theta ?? 0) + 0.25,
                        })
                    }
                    className="cursor-pointer rounded-lg border border-slate-200 bg-white py-1.5 font-bold text-on-surface hover:bg-sky-50"
                >
                    ↻ θ+
                </button>
                <button
                    type="button"
                    onClick={() =>
                        void onTelemetryUpdate(activeVehicle, {
                            x: (activeVehicle.pose?.x ?? 4) - 1.0,
                            status: 'active',
                        })
                    }
                    className="cursor-pointer rounded-lg border border-slate-200 bg-white py-1.5 font-bold text-primary hover:bg-sky-50"
                >
                    ◀ -X
                </button>
                <div className="flex items-center justify-center rounded-lg bg-surface-container font-mono text-[10px] font-bold text-tertiary">
                    1.0m
                </div>
                <button
                    type="button"
                    onClick={() =>
                        void onTelemetryUpdate(activeVehicle, {
                            x: (activeVehicle.pose?.x ?? 4) + 1.0,
                            status: 'active',
                        })
                    }
                    className="cursor-pointer rounded-lg border border-slate-200 bg-white py-1.5 font-bold text-primary hover:bg-sky-50"
                >
                    +X ▶
                </button>
                <div />
                <button
                    type="button"
                    onClick={() =>
                        void onTelemetryUpdate(activeVehicle, {
                            y: (activeVehicle.pose?.y ?? 4) - 1.0,
                            status: 'active',
                        })
                    }
                    className="cursor-pointer rounded-lg border border-slate-200 bg-white py-1.5 font-bold text-primary hover:bg-sky-50"
                >
                    ▼ -Y
                </button>
                <div />
            </div>
        </div>
    );
};
