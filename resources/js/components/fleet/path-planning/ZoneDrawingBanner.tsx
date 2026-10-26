import React from 'react';
import { calculatePolygonArea } from '@/components/fleet/interactive-blueprint-canvas';
import type { PathCoordinate } from '@/types';

interface ZoneDrawingBannerProps {
    isDrawingZone: boolean;
    draftZoneCoords: PathCoordinate[];
    savingZone: boolean;
    onUndoLastPoint: () => void;
    onCancel: () => void;
    onSaveZone: () => void;
}

export const ZoneDrawingBanner: React.FC<ZoneDrawingBannerProps> = ({
    isDrawingZone,
    draftZoneCoords,
    savingZone,
    onUndoLastPoint,
    onCancel,
    onSaveZone,
}) => {
    if (!isDrawingZone) return null;

    return (
        <div className="pointer-events-auto absolute top-4 left-[580px] z-30 flex items-center gap-space-md rounded-xl border border-red-400/50 bg-red-950/95 px-space-lg py-space-sm text-white shadow-lg backdrop-blur-md">
            <span className="material-symbols-outlined text-[20px] text-red-400">
                pentagon
            </span>
            <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm tracking-tight text-white uppercase">
                    {draftZoneCoords.length === 0
                        ? 'Keep-Out Polygon Pen Active (Click map to place V1)'
                        : `Keep-Out Polygon Pen (${draftZoneCoords.length} Vertices · ${calculatePolygonArea(draftZoneCoords)} m²)`}
                </span>
                <span className="font-label-sm text-label-sm text-red-200">
                    Click 3+ corners on the map, then click V1 or
                    &ldquo;Close &amp; Save Zone&rdquo; to rasterize Nav2
                    costmap mask.
                </span>
            </div>
            {draftZoneCoords.length > 0 && (
                <button
                    type="button"
                    onClick={onUndoLastPoint}
                    className="cursor-pointer rounded bg-white/15 px-2.5 py-1 font-label-sm text-label-sm text-white uppercase hover:bg-white/25"
                >
                    Undo Vertex
                </button>
            )}
            <button
                type="button"
                onClick={onCancel}
                className="cursor-pointer rounded bg-white/15 px-2.5 py-1 font-label-sm text-label-sm text-red-200 uppercase hover:bg-white/25"
            >
                Cancel
            </button>
            <button
                type="button"
                disabled={draftZoneCoords.length < 3 || savingZone}
                onClick={onSaveZone}
                className="cursor-pointer rounded bg-emerald-500 px-3 py-1 font-label-sm text-label-sm font-bold text-slate-950 uppercase disabled:opacity-40"
            >
                {savingZone ? 'Saving...' : 'Close & Save Zone'}
            </button>
        </div>
    );
};
