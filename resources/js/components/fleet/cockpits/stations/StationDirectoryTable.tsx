import { StatusBadge } from '@/components/fleet/status-badge';
import { classifyStation, radToDeg } from '@/constants/fleet.constants';
import type { Waypoint } from '@/types';

interface StationDirectoryTableProps {
    waypoints: Waypoint[];
    selectedWaypoint: Waypoint | null;
    onSelectWaypoint: (wp: Waypoint | null) => void;
    onEditStation: (wp: Waypoint) => void;
    onDeleteStation: (wp: Waypoint) => void;
}

export function StationDirectoryTable({
    waypoints,
    selectedWaypoint,
    onSelectWaypoint,
    onEditStation,
    onDeleteStation,
}: StationDirectoryTableProps) {
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 px-space-md py-3">
                <span className="font-headline-sm text-xs font-bold tracking-wider text-on-surface uppercase">
                    Station Waypoint Directory ({waypoints.length})
                </span>
                <span className="font-label-sm text-[10px] text-tertiary">
                    Click row to focus on map
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-surface-container-low font-label-sm text-[10px] text-tertiary uppercase">
                        <tr>
                            <th className="px-space-md py-2.5">Station ID</th>
                            <th className="px-space-sm py-2.5">Type</th>
                            <th className="px-space-sm py-2.5">Pose (X, Y / Yaw)</th>
                            <th className="px-space-sm py-2.5">Status</th>
                            <th className="px-space-md py-2.5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                        {waypoints.map((wp) => {
                            const info = classifyStation(wp.name);
                            const isSelected = selectedWaypoint?.id === wp.id;

                            return (
                                <tr
                                    key={wp.id}
                                    onClick={() => onSelectWaypoint(isSelected ? null : wp)}
                                    className={`cursor-pointer transition-colors ${
                                        isSelected ? 'bg-surface-container-low/90' : 'hover:bg-slate-50'
                                    }`}
                                >
                                    <td className="px-space-md py-2.5">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className={`h-2 w-2 shrink-0 rounded-full ${
                                                    isSelected ? 'bg-primary-container' : 'bg-secondary'
                                                }`}
                                            />
                                            <span className="font-mono font-label-md font-bold text-on-surface">
                                                {wp.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-space-sm py-2.5">
                                        <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 font-label-sm text-[10px] font-semibold text-primary">
                                            <span className="material-symbols-outlined text-[12px]">
                                                {info.icon}
                                            </span>
                                            {info.label}
                                        </span>
                                    </td>
                                    <td className="px-space-sm py-2.5 font-mono text-[11px] text-on-surface">
                                        {wp.x.toFixed(2)}m, {wp.y.toFixed(2)}m{' '}
                                        <span className="text-tertiary">({radToDeg(wp.theta)}°)</span>
                                    </td>
                                    <td className="px-space-sm py-2.5">
                                        <StatusBadge
                                            status={info.category === 'charging' ? 'charging' : 'online'}
                                            label="SYNCED"
                                        />
                                    </td>
                                    <td
                                        className="px-space-md py-2.5 text-right"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                type="button"
                                                onClick={() => onEditStation(wp)}
                                                title="Edit Station"
                                                className="cursor-pointer rounded p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">edit</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDeleteStation(wp)}
                                                title="Delete Station"
                                                className="cursor-pointer rounded p-1 text-on-surface-variant hover:bg-error-container hover:text-error"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
