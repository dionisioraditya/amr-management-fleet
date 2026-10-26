import React from 'react';
import type { Vehicle } from '@/types';
import { StatusBadge } from '@/components/fleet/status-badge';

export type StatusFilter = 'ALL' | 'ACTIVE' | 'IDLE' | 'CHARGING' | 'ERROR';

interface RobotManifestListProps {
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
    onOpenCreate: () => void;
}

const FILTER_PILLS: StatusFilter[] = ['ALL', 'ACTIVE', 'IDLE', 'CHARGING', 'ERROR'];

export const RobotManifestList: React.FC<RobotManifestListProps> = ({
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
    onOpenCreate,
}) => {
    return (
        <div className="flex flex-col gap-space-md p-margin-lg">
            {/* Top Telemetry Header Card */}
            <div className="flex flex-col gap-space-md rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-secondary" />
                        <span className="font-mono text-[10px] tracking-widest text-tertiary uppercase">
                            Tele-Supervisory Node [REGION_WH_04]
                        </span>
                    </div>
                    <h1 className="mt-0.5 font-headline-md text-lg font-bold tracking-tight text-on-surface uppercase">
                        Robot Fleet Command
                    </h1>
                </div>

                {/* Quick KPIs */}
                <div className="grid grid-cols-4 gap-2 border-t border-slate-100 pt-3">
                    <div>
                        <div className="font-label-sm text-[10px] tracking-wider text-tertiary uppercase">
                            Fleet
                        </div>
                        <div className="font-mono text-base font-bold text-on-surface">
                            {String(totalVehiclesCount).padStart(2, '0')}
                        </div>
                    </div>
                    <div>
                        <div className="font-label-sm text-[10px] tracking-wider text-tertiary uppercase">
                            Live
                        </div>
                        <div className="font-mono text-base font-bold text-primary">
                            {String(liveVehiclesCount).padStart(2, '0')}
                        </div>
                    </div>
                    <div>
                        <div className="font-label-sm text-[10px] tracking-wider text-tertiary uppercase">
                            Charging
                        </div>
                        <div className="font-mono text-base font-bold text-amber-600">
                            {String(chargingCount).padStart(2, '0')}
                        </div>
                    </div>
                    <div>
                        <div className="font-label-sm text-[10px] tracking-wider text-tertiary uppercase">
                            Errors
                        </div>
                        <div className="font-mono text-base font-bold text-error">
                            {String(blockedCount).padStart(2, '0')}
                        </div>
                    </div>
                </div>

                {/* Register Button */}
                <button
                    type="button"
                    onClick={onOpenCreate}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2.5 font-headline-sm text-xs font-bold tracking-wider text-white uppercase shadow-md transition-all hover:bg-primary active:scale-95"
                >
                    <span className="material-symbols-outlined text-[18px]">
                        add_circle
                    </span>
                    <span>+ REGISTER AMR</span>
                </button>
            </div>

            {/* Search & Status Filter Box */}
            <div className="flex flex-col gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                    <span className="font-label-md text-[11px] font-bold tracking-wider text-on-surface uppercase">
                        Fleet Manifest ({filteredVehicles.length})
                    </span>
                    <span className="font-mono text-[10px] text-primary">
                        STREAMING: 10Hz
                    </span>
                </div>

                <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-2.5 text-[16px] text-tertiary">
                        filter_alt
                    </span>
                    <input
                        type="text"
                        value={robotSearchQuery}
                        onChange={(e) => setRobotSearchQuery(e.target.value)}
                        placeholder="Filter by ID, Name, or IP (10.32.254.195)..."
                        className="w-full rounded-lg border border-slate-200 bg-surface-container-low py-1.5 pr-3 pl-8 font-body-sm text-xs text-on-surface placeholder:text-tertiary focus:border-secondary focus:outline-none"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-1">
                    {FILTER_PILLS.map((pill) => (
                        <button
                            key={pill}
                            type="button"
                            onClick={() => setRobotStatusFilter(pill)}
                            className={`cursor-pointer rounded px-2 py-0.5 font-mono text-[10px] font-semibold transition-colors ${
                                robotStatusFilter === pill
                                    ? 'bg-primary text-white'
                                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                            }`}
                        >
                            {pill}
                        </button>
                    ))}
                </div>
            </div>

            {/* Robot Unit Cards */}
            <div className="space-y-2.5">
                {filteredVehicles.map((vehicle) => {
                    const isSelected = vehicle.id === activeVehicle?.id;
                    const socColor =
                        vehicle.battery_percentage <= 20
                            ? 'bg-error'
                            : vehicle.battery_percentage <= 45
                              ? 'bg-amber-500'
                              : 'bg-secondary';

                    return (
                        <div
                            key={vehicle.id}
                            onClick={() => onSelectVehicle(isSelected ? null : vehicle.id)}
                            className={`cursor-pointer rounded-xl border bg-white p-3.5 shadow-xs transition-all ${
                                isSelected
                                    ? 'border-secondary border-l-4 border-l-secondary ring-2 ring-secondary/20'
                                    : 'border-slate-200/80 hover:border-secondary/60'
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <span className="material-symbols-outlined text-[18px]">
                                            smart_toy
                                        </span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-headline-sm text-sm font-bold text-on-surface">
                                                {vehicle.id}
                                            </span>
                                            <span className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-[9px] text-on-surface-variant">
                                                {vehicle.ip_address}
                                            </span>
                                        </div>
                                        <p className="font-body-sm text-[11px] text-tertiary">
                                            {vehicle.name}
                                        </p>
                                    </div>
                                </div>
                                <StatusBadge status={vehicle.status} />
                            </div>

                            {/* Battery SoC Bar */}
                            <div className="mt-3">
                                <div className="mb-1 flex justify-between font-mono text-[10px]">
                                    <span className="text-tertiary uppercase">
                                        State of Charge (SoC)
                                    </span>
                                    <span className="font-bold text-primary">
                                        {vehicle.battery_percentage}%
                                    </span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                                    <div
                                        className={`h-full rounded-full transition-all ${socColor}`}
                                        style={{
                                            width: `${Math.min(100, Math.max(0, vehicle.battery_percentage))}%`,
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Telemetry Pose Mini-Grid */}
                            <div className="mt-2.5 grid grid-cols-3 gap-1.5 border-t border-slate-100 pt-2 font-mono text-[10px]">
                                <div>
                                    <span className="block text-[9px] text-tertiary">
                                        POSE X
                                    </span>
                                    <span className="font-semibold text-on-surface">
                                        {vehicle.pose?.x?.toFixed(2) ?? '0.00'}m
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[9px] text-tertiary">
                                        POSE Y
                                    </span>
                                    <span className="font-semibold text-on-surface">
                                        {vehicle.pose?.y?.toFixed(2) ?? '0.00'}m
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[9px] text-tertiary">
                                        YAW (θ)
                                    </span>
                                    <span className="font-semibold text-on-surface">
                                        {vehicle.pose?.theta?.toFixed(2) ?? '0.00'}rad
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredVehicles.length === 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white/90 p-6 text-center font-body-sm text-xs text-tertiary">
                        No AMR units match current filter criteria.
                    </div>
                )}
            </div>
        </div>
    );
};
