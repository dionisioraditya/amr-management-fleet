import React from 'react';

interface MapStudioHeaderCardProps {
    mapsCount: number;
    onTriggerZipSelect: () => void;
}

export function MapStudioHeaderCard({
    mapsCount,
    onTriggerZipSelect,
}: MapStudioHeaderCardProps) {
    return (
        <div className="rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs">
            <div className="flex items-center justify-between">
                <div>
                    <span className="font-label-sm text-[10px] font-semibold tracking-wider text-primary uppercase">
                        ROS 2 SLAM &amp; Nav2 Map Server
                    </span>
                    <h1 className="font-headline-md text-lg font-bold tracking-tight text-on-surface uppercase">
                        Map Studio Catalog
                    </h1>
                </div>
                <span className="rounded-full bg-surface-container px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                    {mapsCount} MAPS
                </span>
            </div>

            <p className="mt-1 font-body-sm text-xs text-tertiary">
                Import ROS 2 <code>map_saver_cli</code> archive (<code>.pgm</code> + <code>.yaml</code>). 1:1 origin auto-calibrated.
            </p>

            <div className="mt-3 flex flex-col gap-2">
                <button
                    type="button"
                    onClick={onTriggerZipSelect}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 font-label-md text-xs font-bold tracking-wider text-white uppercase shadow-xs transition-all hover:bg-secondary active:scale-95"
                >
                    <span className="material-symbols-outlined text-[18px]">
                        folder_zip
                    </span>
                    <span>+ ADD MAP (.ZIP)</span>
                </button>
            </div>
        </div>
    );
}
