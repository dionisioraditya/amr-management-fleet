import React from 'react';

interface MapStudioRibbonProps {
    occupancyViewMode: 'blueprint' | 'raw';
    onOccupancyModeChange: (mode: 'blueprint' | 'raw') => void;
    activeTool: 'select' | 'keepout';
    onToggleActiveTool: () => void;
    showOriginDatum: boolean;
    onToggleOriginDatum: () => void;
    showKeepOut: boolean;
    onToggleKeepOut: () => void;
    showSimulation: boolean;
    onToggleSimulation: () => void;
    zonesCount: number;
    snapStep: number;
    onSnapStepChange: (step: number) => void;
    pushingNav2: boolean;
    onPushToNav2: () => void;
}

export function MapStudioRibbon({
    occupancyViewMode,
    onOccupancyModeChange,
    activeTool,
    onToggleActiveTool,
    showOriginDatum,
    onToggleOriginDatum,
    showKeepOut,
    onToggleKeepOut,
    showSimulation,
    onToggleSimulation,
    zonesCount,
    snapStep,
    onSnapStepChange,
    pushingNav2,
    onPushToNav2,
}: MapStudioRibbonProps) {
    return (
        <div className="pointer-events-auto absolute top-4 right-4 left-[440px] z-20 hidden flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white/95 px-3.5 py-2 shadow-xs backdrop-blur-md lg:flex">
            {/* Opsi B: Dual-Mode Occupancy View Toggle */}
            <div className="flex items-center gap-1 rounded-lg bg-surface-container-low p-1">
                <button
                    type="button"
                    onClick={() => onOccupancyModeChange('blueprint')}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 font-label-sm text-xs transition-all ${
                        occupancyViewMode === 'blueprint'
                            ? 'bg-primary font-bold text-white shadow-2xs'
                            : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                    <span className="material-symbols-outlined text-[15px]">
                        grid_on
                    </span>
                    <span>Styled Blueprint</span>
                </button>
                <button
                    type="button"
                    onClick={() => onOccupancyModeChange('raw')}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 font-label-sm text-xs transition-all ${
                        occupancyViewMode === 'raw'
                            ? 'bg-[#0b1c30] font-bold text-white shadow-2xs'
                            : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                    <span className="material-symbols-outlined text-[15px]">
                        gradient
                    </span>
                    <span>Original PGM (Raw ROS)</span>
                </button>
            </div>

            {/* Layer Toggles & Polygon Pen Tool */}
            <div className="flex items-center gap-1.5">
                <button
                    type="button"
                    onClick={onToggleActiveTool}
                    className={`flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 font-label-sm text-xs transition-all ${
                        activeTool === 'keepout'
                            ? 'bg-red-600 font-bold text-white shadow-xs ring-2 ring-red-300'
                            : 'bg-red-50 font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-100'
                    }`}
                    title="Draw Restricted Keep-Out / Speed-Limit Polygon Zone"
                >
                    <span className="material-symbols-outlined text-[15px]">
                        pentagon
                    </span>
                    <span>
                        {activeTool === 'keepout' ? 'Drawing Zone...' : '+ Polygon Zone'}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={onToggleOriginDatum}
                    className={`flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 font-label-sm text-xs transition-all ${
                        showOriginDatum
                            ? 'bg-emerald-50 font-bold text-emerald-700 ring-1 ring-emerald-300'
                            : 'bg-surface-container-low text-tertiary'
                    }`}
                    title="Toggle ROS Origin Datum [0.00m, 0.00m]"
                >
                    <span className="material-symbols-outlined text-[15px]">
                        my_location
                    </span>
                    <span>Origin [0,0]</span>
                </button>

                <button
                    type="button"
                    onClick={onToggleKeepOut}
                    className={`flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 font-label-sm text-xs transition-all ${
                        showKeepOut
                            ? 'bg-red-50 font-bold text-error ring-1 ring-red-200'
                            : 'bg-surface-container-low text-tertiary'
                    }`}
                    title="Toggle Keep-Out Zone Mask"
                >
                    <span className="material-symbols-outlined text-[15px]">
                        do_not_disturb_on
                    </span>
                    <span>Keep-Out ({zonesCount})</span>
                </button>

                <button
                    type="button"
                    onClick={onToggleSimulation}
                    className={`flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 font-label-sm text-xs transition-all ${
                        showSimulation
                            ? 'bg-primary-fixed font-bold text-on-primary-fixed'
                            : 'bg-surface-container-low text-tertiary'
                    }`}
                >
                    <span className="material-symbols-outlined text-[15px]">
                        smart_toy
                    </span>
                    <span>AMR SIM</span>
                </button>
            </div>

            {/* CAD Tools & Push to Nav2 CTA */}
            <div className="flex items-center gap-2">
                <div className="hidden items-center gap-1 text-xs text-tertiary xl:flex">
                    <span>Snap:</span>
                    <select
                        value={String(snapStep)}
                        onChange={(e) => onSnapStepChange(parseFloat(e.target.value))}
                        className="cursor-pointer rounded bg-surface-container-low px-1.5 py-1 font-mono text-xs text-on-surface focus:outline-none"
                    >
                        <option value="0.5">0.50m</option>
                        <option value="0.25">0.25m</option>
                        <option value="0.05">0.05m (1px)</option>
                        <option value="0">Free</option>
                    </select>
                </div>

                <button
                    type="button"
                    disabled={pushingNav2}
                    onClick={onPushToNav2}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-label-md text-xs font-bold text-white uppercase shadow-xs transition-all hover:bg-secondary"
                >
                    <span className="material-symbols-outlined text-[16px]">
                        publish
                    </span>
                    <span>{pushingNav2 ? 'Syncing...' : 'Push to Nav2'}</span>
                </button>
            </div>
        </div>
    );
}
