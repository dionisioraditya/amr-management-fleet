import { StatusBadge } from '@/components/fleet/status-badge';
import type { Mission } from '@/types';

interface MissionQueueCardProps {
    missions: Mission[];
    onOpenDispatchModal: () => void;
    onUpdateMissionStatus: (
        mission: Mission,
        nextStatus: 'in_progress' | 'completed' | 'cancelled',
    ) => void;
}

export function MissionQueueCard({
    missions,
    onOpenDispatchModal,
    onUpdateMissionStatus,
}: MissionQueueCardProps) {
    return (
        <div className="flex w-84 flex-col gap-2.5 rounded-xl border border-surface-container-high bg-surface-container-lowest/95 p-space-md shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-primary">
                        alt_route
                    </span>
                    <span className="font-headline-sm text-xs font-bold tracking-wider text-on-surface uppercase">
                        Mission Queue ({missions.length})
                    </span>
                </div>
                <button
                    type="button"
                    onClick={onOpenDispatchModal}
                    className="flex cursor-pointer items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 font-label-md text-[10px] font-bold text-white uppercase shadow-xs transition-colors hover:bg-primary"
                >
                    <span className="material-symbols-outlined text-[14px]">send</span>
                    + Dispatch Mission
                </button>
            </div>

            <div className="max-h-56 space-y-2 overflow-y-auto pr-0.5">
                {missions.map((mission) => (
                    <div
                        key={mission.id}
                        className="rounded-lg border border-slate-200/80 bg-surface-container-low p-2.5 text-left"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[10px] font-bold text-primary">
                                        #{mission.id}
                                    </span>
                                    <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[9px] font-semibold text-on-surface uppercase">
                                        {mission.vehicle_id ?? 'UNASSIGNED'}
                                    </span>
                                    <span className="font-mono text-[9px] font-bold text-amber-700 uppercase">
                                        [{mission.priority}]
                                    </span>
                                </div>
                                <p className="mt-0.5 font-body-sm text-xs font-semibold text-on-surface">
                                    {mission.name}
                                </p>
                            </div>
                            <StatusBadge
                                status={
                                    mission.status === 'in_progress'
                                        ? 'active'
                                        : mission.status === 'completed'
                                          ? 'online'
                                          : mission.status === 'failed' || mission.status === 'cancelled'
                                            ? 'error'
                                            : 'warning'
                                }
                                label={mission.status}
                            />
                        </div>

                        {/* Ordered Waypoints Chain */}
                        {mission.items && mission.items.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-1 font-mono text-[9px] text-tertiary">
                                {mission.items.map((item, idx) => (
                                    <span key={item.id} className="inline-flex items-center gap-1">
                                        <span className="rounded bg-white px-1 py-0.5 text-on-surface">
                                            {item.waypoint?.name ?? `WP-${item.waypoint_id}`}
                                        </span>
                                        {idx < (mission.items?.length ?? 0) - 1 && <span>→</span>}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Quick Mission State Controls */}
                        {(mission.status === 'pending' || mission.status === 'in_progress') && (
                            <div className="mt-2 flex items-center gap-1.5 border-t border-slate-200/60 pt-1.5">
                                {mission.status === 'pending' && (
                                    <button
                                        type="button"
                                        onClick={() => void onUpdateMissionStatus(mission, 'in_progress')}
                                        className="cursor-pointer rounded bg-primary px-2 py-0.5 font-mono text-[10px] font-bold text-white hover:bg-secondary"
                                    >
                                        ▶ Start Mission
                                    </button>
                                )}
                                {mission.status === 'in_progress' && (
                                    <button
                                        type="button"
                                        onClick={() => void onUpdateMissionStatus(mission, 'completed')}
                                        className="cursor-pointer rounded bg-emerald-600 px-2 py-0.5 font-mono text-[10px] font-bold text-white hover:bg-emerald-700"
                                    >
                                        ✓ Complete
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => void onUpdateMissionStatus(mission, 'cancelled')}
                                    className="cursor-pointer rounded bg-red-100 px-2 py-0.5 font-mono text-[10px] font-bold text-error hover:bg-red-200"
                                >
                                    ✕ Cancel
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
