import type { Vehicle, Waypoint } from '@/types';

interface MissionDispatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    missionName: string;
    setMissionName: (val: string) => void;
    missionVehicleId: string;
    setMissionVehicleId: (val: string) => void;
    missionPriority: 'low' | 'normal' | 'high' | 'urgent' | 'critical';
    setMissionPriority: (val: any) => void;
    vehicles: Vehicle[];
    waypoints: Waypoint[];
    selectedWaypointIds: number[];
    waypointToAdd: number;
    setWaypointToAdd: (val: number) => void;
    handleAddWaypointStep: () => void;
    handleRemoveWaypointStep: (index: number) => void;
    handleMoveWaypointStep: (index: number, direction: -1 | 1) => void;
    handleDispatchMission: (e: React.FormEvent) => void;
    isSubmittingMission: boolean;
}

export function MissionDispatchModal({
    isOpen,
    onClose,
    missionName,
    setMissionName,
    missionVehicleId,
    setMissionVehicleId,
    missionPriority,
    setMissionPriority,
    vehicles,
    waypoints,
    selectedWaypointIds,
    waypointToAdd,
    setWaypointToAdd,
    handleAddWaypointStep,
    handleRemoveWaypointStep,
    handleMoveWaypointStep,
    handleDispatchMission,
    isSubmittingMission,
}: MissionDispatchModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                        <span className="font-mono text-[10px] font-bold tracking-wider text-primary uppercase">
                            ROS 2 Nav2 Behavior Tree Dispatcher
                        </span>
                        <h3 className="font-headline-md text-lg font-bold text-on-surface">
                            Dispatch New AMR Mission
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer rounded-lg p-1 text-tertiary hover:bg-slate-100"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleDispatchMission} className="mt-4 space-y-4">
                    <div>
                        <label className="mb-1 block font-label-sm text-xs font-bold text-on-surface uppercase">
                            Mission Identifier / Description
                        </label>
                        <input
                            type="text"
                            required
                            value={missionName}
                            onChange={(e) => setMissionName(e.target.value)}
                            placeholder="Material Transfer: Dock-A1 to Conveyor B2"
                            className="w-full rounded-lg border border-slate-200 bg-surface-container-low px-3 py-2 font-body-sm text-xs text-on-surface"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block font-label-sm text-xs font-bold text-on-surface uppercase">
                                Target AMR Unit
                            </label>
                            <select
                                value={missionVehicleId}
                                onChange={(e) => setMissionVehicleId(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-surface-container-low px-3 py-2 font-mono text-xs text-on-surface"
                            >
                                {vehicles.map((v) => (
                                    <option key={v.id} value={v.id}>
                                        {v.id} — {v.name} ({v.battery_percentage}%)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block font-label-sm text-xs font-bold text-on-surface uppercase">
                                Priority Level
                            </label>
                            <select
                                value={missionPriority}
                                onChange={(e) => setMissionPriority(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-surface-container-low px-3 py-2 font-mono text-xs text-on-surface"
                            >
                                <option value="low">LOW</option>
                                <option value="normal">NORMAL</option>
                                <option value="high">HIGH</option>
                                <option value="critical">CRITICAL / URGENT</option>
                            </select>
                        </div>
                    </div>

                    {/* Waypoint Sequence Builder */}
                    <div>
                        <label className="mb-1 block font-label-sm text-xs font-bold text-on-surface uppercase">
                            Waypoint Sequence (Mission Steps)
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={waypointToAdd}
                                onChange={(e) => setWaypointToAdd(Number(e.target.value))}
                                className="flex-1 rounded-lg border border-slate-200 bg-surface-container-low px-3 py-2 font-mono text-xs text-on-surface"
                            >
                                {waypoints.map((wp) => (
                                    <option key={wp.id} value={wp.id}>
                                        {wp.name} [X:{wp.x}m, Y:{wp.y}m]
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={handleAddWaypointStep}
                                className="cursor-pointer rounded-lg bg-secondary px-3 py-2 font-mono text-xs font-bold text-white uppercase hover:bg-primary"
                            >
                                + Add Step
                            </button>
                        </div>

                        <div className="mt-2.5 max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-surface-container-low p-2.5">
                            {selectedWaypointIds.map((wpId, index) => {
                                const wpObj = waypoints.find((w) => w.id === wpId);
                                return (
                                    <div
                                        key={`${wpId}-${index}`}
                                        className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5 font-mono text-xs shadow-2xs"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                                                STEP {index + 1}
                                            </span>
                                            <span className="font-bold text-on-surface">
                                                {wpObj?.name ?? `WP-${wpId}`}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => handleMoveWaypointStep(index, -1)}
                                                className="cursor-pointer rounded px-1.5 py-0.5 text-tertiary hover:bg-slate-100"
                                            >
                                                ↑
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleMoveWaypointStep(index, 1)}
                                                className="cursor-pointer rounded px-1.5 py-0.5 text-tertiary hover:bg-slate-100"
                                            >
                                                ↓
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveWaypointStep(index)}
                                                className="cursor-pointer rounded px-1.5 py-0.5 text-error hover:bg-red-50"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {selectedWaypointIds.length === 0 && (
                                <p className="py-2 text-center font-body-sm text-xs text-tertiary">
                                    No waypoint steps queued.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="cursor-pointer rounded-lg px-4 py-2 font-label-md text-xs font-semibold text-tertiary uppercase hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmittingMission}
                            className="cursor-pointer rounded-lg bg-primary px-5 py-2 font-label-md text-xs font-bold text-white uppercase shadow-sm hover:bg-secondary disabled:opacity-50"
                        >
                            {isSubmittingMission ? 'Dispatching...' : 'Dispatch Mission'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
