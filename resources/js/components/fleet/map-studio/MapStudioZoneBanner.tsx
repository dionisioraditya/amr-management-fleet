import React from 'react';

interface MapStudioZoneBannerProps {
    verticesCount: number;
    currentDraftArea: number;
    angleConstraintMode: 'free' | 'ortho-90' | 'ortho-45';
    onConstraintModeChange: (mode: 'free' | 'ortho-90' | 'ortho-45') => void;
    onUndoVertex: () => void;
    onCancel: () => void;
    onSaveZone: () => void;
    isSavingZone: boolean;
}

export function MapStudioZoneBanner({
    verticesCount,
    currentDraftArea,
    angleConstraintMode,
    onConstraintModeChange,
    onUndoVertex,
    onCancel,
    onSaveZone,
    isSavingZone,
}: MapStudioZoneBannerProps) {
    const modes = [
        ['ortho-45', '45°'],
        ['ortho-90', '90°'],
        ['free', 'Free'],
    ] as const;

    return (
        <div className="pointer-events-auto absolute top-[68px] right-4 left-[440px] z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-300 bg-red-950/95 px-4 py-2 text-white shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-red-400">
                    pentagon
                </span>
                <div>
                    <div className="font-headline-sm text-xs font-bold tracking-wider uppercase">
                        Polygon Keep-Out Mask Pen Active
                    </div>
                    <div className="font-mono text-[10px] text-red-200">
                        Vertices: {verticesCount} pts • Area: {currentDraftArea} m² • Click V1 to close loop
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1.5">
                <div className="mr-1 flex items-center gap-0.5 rounded-lg bg-red-900/80 p-0.5 font-mono text-[10px]">
                    {modes.map(([modeVal, label]) => (
                        <button
                            key={modeVal}
                            type="button"
                            onClick={() => onConstraintModeChange(modeVal)}
                            className={`cursor-pointer rounded px-2 py-0.5 font-bold transition ${
                                angleConstraintMode === modeVal
                                    ? 'bg-white text-red-950'
                                    : 'text-red-200 hover:text-white'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    disabled={verticesCount === 0}
                    onClick={onUndoVertex}
                    className="cursor-pointer rounded-lg bg-red-900 px-2.5 py-1 font-label-sm text-[11px] font-semibold text-red-100 hover:bg-red-800 disabled:opacity-40"
                >
                    Undo Vertex
                </button>

                <button
                    type="button"
                    onClick={onCancel}
                    className="cursor-pointer rounded-lg bg-red-900/70 px-2.5 py-1 font-label-sm text-[11px] font-semibold text-red-200 hover:bg-red-800"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    disabled={verticesCount < 3 || isSavingZone}
                    onClick={onSaveZone}
                    className="cursor-pointer rounded-lg bg-emerald-500 px-3 py-1 font-label-sm text-[11px] font-bold text-slate-950 uppercase shadow-xs hover:bg-emerald-400 disabled:opacity-40"
                >
                    {isSavingZone ? 'Saving...' : 'Close & Save Zone'}
                </button>
            </div>
        </div>
    );
}
