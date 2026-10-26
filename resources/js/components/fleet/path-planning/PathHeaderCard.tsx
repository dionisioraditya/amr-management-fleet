import React from 'react';
import type { FacilityMap } from '@/types';

interface PathHeaderCardProps {
    activeMap?: FacilityMap | null;
    onStartNewZone: () => void;
    onStartNewPath: () => void;
}

export const PathHeaderCard: React.FC<PathHeaderCardProps> = ({
    activeMap,
    onStartNewZone,
    onStartNewPath,
}) => {
    return (
        <div className="rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs">
            <div className="mb-space-xs flex items-center gap-space-xs font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
                <span className="font-semibold text-primary">
                    SPATIAL NAVIGATION
                </span>
                <span className="text-outline-variant">/</span>
                <span>ROS2 NAV2 PATH PLANNER</span>
            </div>

            <div className="mb-space-md flex items-center justify-between gap-space-md">
                <div>
                    <h1 className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
                        Path Planning
                    </h1>
                    <p className="font-body-sm text-body-sm text-tertiary">
                        Configure virtual guidance tracks, tangential corner fillets, and keep-out masks.
                    </p>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={onStartNewZone}
                        className="flex cursor-pointer items-center gap-1 rounded-lg bg-red-600 px-3 py-2.5 font-label-sm text-label-sm font-semibold tracking-wider text-white uppercase shadow-xs transition-all hover:bg-red-700 active:scale-95"
                        title="Draw Restricted Keep-Out Polygon Mask for Nav2 Global/Local Planner"
                    >
                        <span className="material-symbols-outlined text-[16px]">
                            pentagon
                        </span>
                        <span>+ KEEP-OUT</span>
                    </button>
                    <button
                        type="button"
                        onClick={onStartNewPath}
                        className="flex cursor-pointer items-center gap-space-xs rounded-lg bg-primary px-space-md py-2.5 font-label-sm text-label-sm font-semibold tracking-wider text-on-primary uppercase shadow-xs transition-all hover:bg-on-primary-fixed-variant active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[16px]">
                            add_road
                        </span>
                        <span>+ NEW PATH</span>
                    </button>
                </div>
            </div>

            {/* Active Map Selector */}
            <div className="flex items-center gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
                <span className="material-symbols-outlined ml-space-xs text-[20px] text-primary">
                    map
                </span>
                <div className="min-w-0 flex-1">
                    <label className="block font-label-sm text-label-sm text-tertiary uppercase">
                        Active Facility Map
                    </label>
                    <div className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                        {activeMap?.name ?? 'Main Logistics Hall (v2.4)'}
                    </div>
                </div>
                <span className="rounded bg-surface-container px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                    RES {activeMap?.resolution ?? 0.05}m
                </span>
            </div>
        </div>
    );
};
