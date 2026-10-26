interface StationKpiSummaryProps {
    totalCount: number;
    chargingCount: number;
    pdCount: number;
    standbyCount: number;
}

export function StationKpiSummary({
    totalCount,
    chargingCount,
    pdCount,
    standbyCount,
}: StationKpiSummaryProps) {
    return (
        <div className="grid grid-cols-2 gap-space-sm sm:grid-cols-4">
            <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs">
                <div className="absolute top-0 right-0 left-0 h-1 bg-secondary" />
                <div className="flex items-center justify-between text-tertiary">
                    <span className="font-label-sm text-label-sm tracking-wider uppercase">
                        Total Stations
                    </span>
                    <span className="material-symbols-outlined text-[18px] text-secondary">
                        polyline
                    </span>
                </div>
                <div className="mt-2 flex items-baseline gap-space-xs">
                    <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                        {totalCount}
                    </span>
                    <span className="font-label-sm text-label-sm text-tertiary">Synced</span>
                </div>
            </div>

            <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs">
                <div className="absolute top-0 right-0 left-0 h-1 bg-primary-container" />
                <div className="flex items-center justify-between text-tertiary">
                    <span className="font-label-sm text-label-sm tracking-wider uppercase">
                        Charging Docks
                    </span>
                    <span className="material-symbols-outlined text-[18px] text-primary">
                        battery_charging_full
                    </span>
                </div>
                <div className="mt-2 flex items-baseline gap-space-xs">
                    <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                        {chargingCount}
                    </span>
                    <span className="font-label-sm text-label-sm text-tertiary">Bays</span>
                </div>
            </div>

            <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs">
                <div className="absolute top-0 right-0 left-0 h-1 bg-secondary-container" />
                <div className="flex items-center justify-between text-tertiary">
                    <span className="font-label-sm text-label-sm tracking-wider uppercase">
                        P&amp;D Bays
                    </span>
                    <span className="material-symbols-outlined text-[18px] text-secondary">
                        pallet
                    </span>
                </div>
                <div className="mt-2 flex items-baseline gap-space-xs">
                    <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                        {pdCount}
                    </span>
                    <span className="font-label-sm text-label-sm text-tertiary">Active</span>
                </div>
            </div>

            <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs">
                <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
                <div className="flex items-center justify-between text-tertiary">
                    <span className="font-label-sm text-label-sm tracking-wider uppercase">
                        Standby / QC
                    </span>
                    <span className="material-symbols-outlined text-[18px] text-emerald-600">
                        verified
                    </span>
                </div>
                <div className="mt-2 flex items-baseline gap-space-xs">
                    <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                        {standbyCount}
                    </span>
                    <span className="font-label-sm text-label-sm text-tertiary">Nodes</span>
                </div>
            </div>
        </div>
    );
}
