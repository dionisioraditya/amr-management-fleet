import React from 'react';

interface PathMetricsKpiCardProps {
    pathplansCount: number;
    biDirectionalCount: number;
    totalAvgLength: string;
    effectiveCornerRadius: number;
    curveMode: 'fillet' | 'linear';
}

export const PathMetricsKpiCard: React.FC<PathMetricsKpiCardProps> = ({
    pathplansCount,
    biDirectionalCount,
    totalAvgLength,
    effectiveCornerRadius,
    curveMode,
}) => {
    return (
        <div className="grid grid-cols-4 gap-space-xs">
            <div className="rounded-xl border border-slate-200/80 bg-white p-space-sm shadow-xs">
                <div className="font-label-sm text-label-sm text-tertiary">
                    TOTAL PATH
                </div>
                <div className="mt-0.5 font-headline-md text-headline-md font-bold text-on-surface">
                    {String(pathplansCount).padStart(2, '0')}
                </div>
                <div className="flex items-center gap-0.5 font-label-sm text-label-sm text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-container" />{' '}
                    Synced
                </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-space-sm shadow-xs">
                <div className="font-label-sm text-label-sm text-tertiary">
                    BI-DIRECT
                </div>
                <div className="mt-0.5 font-headline-md text-headline-md font-bold text-secondary">
                    {String(biDirectionalCount).padStart(2, '0')}
                </div>
                <div className="font-label-sm text-label-sm text-tertiary">
                    Dual flow
                </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-space-sm shadow-xs">
                <div className="font-label-sm text-label-sm text-tertiary">
                    AVG LENGTH
                </div>
                <div className="mt-0.5 font-headline-md text-headline-md font-bold text-on-surface">
                    {totalAvgLength}
                    <span className="text-xs font-normal">m</span>
                </div>
                <div className="font-label-sm text-label-sm text-tertiary">
                    ±0.05m tol
                </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-space-sm shadow-xs">
                <div className="font-label-sm text-label-sm text-tertiary">
                    CORNER R
                </div>
                <div className="mt-0.5 font-headline-md text-headline-md font-bold text-emerald-700">
                    {effectiveCornerRadius.toFixed(1)}
                    <span className="text-xs font-normal">m</span>
                </div>
                <div className="flex items-center gap-0.5 font-label-sm text-label-sm font-semibold text-emerald-600">
                    <span className="material-symbols-outlined text-[12px]">
                        rounded_corner
                    </span>{' '}
                    {curveMode === 'fillet' ? 'G1 Arc' : 'Sharp'}
                </div>
            </div>
        </div>
    );
};
