import React from 'react';
import type { FacilityMap } from '@/types';

interface MapOriginCalibrationCardProps {
    currentMap: FacilityMap;
    realWidthMeters: string;
    realHeightMeters: string;
    onExportZip: (map: FacilityMap) => void;
}

export function MapOriginCalibrationCard({
    currentMap,
    realWidthMeters,
    realHeightMeters,
    onExportZip,
}: MapOriginCalibrationCardProps) {
    return (
        <div className="rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs">
            <div className="mb-2 flex items-center justify-between">
                <span className="font-label-sm text-[10px] font-bold tracking-wider text-primary uppercase">
                    ACTIVE MAP ORIGIN CALIBRATION
                </span>
                {currentMap.raw_pgm_path ? (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-800">
                        PGM CALIBRATED
                    </span>
                ) : (
                    <span className="rounded bg-sky-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-sky-800">
                        SYNTHETIC
                    </span>
                )}
            </div>

            <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                <div className="rounded-lg bg-surface-container-low p-2">
                    <span className="block text-[9px] text-tertiary">ORIGIN X</span>
                    <span className="font-bold text-on-surface">{currentMap.origin_x}m</span>
                </div>
                <div className="rounded-lg bg-surface-container-low p-2">
                    <span className="block text-[9px] text-tertiary">ORIGIN Y</span>
                    <span className="font-bold text-on-surface">{currentMap.origin_y}m</span>
                </div>
                <div className="rounded-lg bg-surface-container-low p-2">
                    <span className="block text-[9px] text-tertiary">RESOLUTION</span>
                    <span className="font-bold text-primary">{currentMap.resolution}m</span>
                </div>
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 font-mono text-[10px] text-tertiary">
                <span>
                    Size:{' '}
                    <strong className="text-on-surface">
                        {currentMap.width_px ?? 460}×{currentMap.height_px ?? 300} px
                    </strong>{' '}
                    ({realWidthMeters}m × {realHeightMeters}m)
                </span>
                <button
                    type="button"
                    onClick={() => onExportZip(currentMap)}
                    className="cursor-pointer font-sans text-[11px] font-bold text-primary uppercase hover:underline"
                >
                    EXPORT .ZIP
                </button>
            </div>
        </div>
    );
}
