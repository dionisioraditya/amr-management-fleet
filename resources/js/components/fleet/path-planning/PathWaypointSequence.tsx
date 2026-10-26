import React from 'react';
import type { FilletedPathGeometry } from '@/lib/geometry';
import type { PathCoordinate } from '@/types';

interface PathWaypointSequenceProps {
    draftCoords: PathCoordinate[];
    activeFilletGeom: FilletedPathGeometry;
    activeLength: string;
    onRemovePathPoint: (idx: number) => void;
}

export function PathWaypointSequence({
    draftCoords,
    activeFilletGeom,
    activeLength,
    onRemovePathPoint,
}: PathWaypointSequenceProps) {
    const arcCount = activeFilletGeom.corners.filter((c) => c.effectiveRadius > 0.01).length;

    return (
        <div className="mb-space-md">
            <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold text-on-surface">
                    Waypoint Nodes ({draftCoords.length} PTS · {arcCount} ARCS)
                </span>
                <span className="font-mono font-semibold text-primary">
                    Arc Length: {activeLength}m
                </span>
            </div>
            {draftCoords.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300/90 bg-white/60 p-3 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px] text-primary">
                        add_location
                    </span>
                    <span>
                        No vertices placed yet. Click anywhere on the map or click a station to place <strong>WP-1 (Start node)</strong>.
                    </span>
                </div>
            ) : (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {draftCoords.map((pt, idx) => {
                        const isStart = idx === 0;
                        const isGoal = idx === draftCoords.length - 1 && draftCoords.length > 1;
                        const cornerInfo = activeFilletGeom.corners.find((c) => c.vertexIndex === idx);
                        return (
                            <div key={idx} className="flex shrink-0 items-center gap-1">
                                <div
                                    className={`flex items-center gap-1 rounded px-2 py-1 font-mono text-[10px] font-bold ${
                                        isStart
                                            ? 'bg-primary-container text-white'
                                            : isGoal
                                              ? 'bg-emerald-600 text-white'
                                              : 'border border-slate-200 bg-surface-container text-on-surface'
                                    }`}
                                >
                                    <span>WP-{idx + 1} [{pt.x}, {pt.y}]</span>
                                    {cornerInfo && cornerInfo.effectiveRadius > 0.01 && (
                                        <span className="rounded bg-emerald-950/80 px-1 py-0.2 text-[9px] text-emerald-300">
                                            R{cornerInfo.effectiveRadius.toFixed(1)}m·{Math.round(cornerInfo.turnAngleDeg)}°
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => onRemovePathPoint(idx)}
                                        title={`Delete WP-${idx + 1}`}
                                        className="ml-0.5 cursor-pointer rounded px-1 text-[10px] opacity-75 hover:bg-black/20 hover:opacity-100"
                                    >
                                        ×
                                    </button>
                                </div>
                                {idx < draftCoords.length - 1 && (
                                    <span className="material-symbols-outlined text-[13px] text-tertiary">
                                        arrow_forward
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
