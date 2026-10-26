import React from 'react';
import type { FacilityMap } from '@/types';

interface MapStudioWatermarkProps {
    currentMap: FacilityMap | null;
    realWidthMeters: string;
    realHeightMeters: string;
    occupancyViewMode: 'blueprint' | 'raw';
}

export function MapStudioWatermark({
    currentMap,
    realWidthMeters,
    realHeightMeters,
    occupancyViewMode,
}: MapStudioWatermarkProps) {
    if (!currentMap) return null;

    return (
        <div className="pointer-events-none absolute bottom-4 left-[440px] z-20 hidden space-y-0.5 rounded-xl border border-slate-200/80 bg-white/90 px-3.5 py-2 font-mono text-[10px] text-tertiary shadow-xs backdrop-blur-sm lg:block">
            <div className="font-bold text-on-surface">
                ACTIVE MAP: {currentMap.name.toUpperCase()} ({realWidthMeters}m × {realHeightMeters}m)
            </div>
            <div>
                ROS ORIGIN: [X: {currentMap.origin_x}m, Y: {currentMap.origin_y}m, Yaw: {currentMap.origin_yaw ?? 0} rad] | RES: {currentMap.resolution} m/px
            </div>
            <div>
                VIEW: {occupancyViewMode === 'raw' ? 'RAW ROS OCCUPANCY GRID (PGM)' : 'CYBERNETIC BLUEPRINT'} | THRESH: [{currentMap.free_thresh ?? 0.25} / {currentMap.occupied_thresh ?? 0.65}]
            </div>
        </div>
    );
}
