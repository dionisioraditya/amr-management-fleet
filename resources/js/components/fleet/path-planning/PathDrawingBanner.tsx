import React from 'react';
import type { AngleConstraintMode } from '@/components/fleet/interactive-blueprint-canvas';
import type { PathCoordinate } from '@/types';

interface PathDrawingBannerProps {
    isDrawing: boolean;
    draftCoords: PathCoordinate[];
    effectiveCornerRadius: number;
    angleConstraintMode: AngleConstraintMode;
    onUndoLastPoint: () => void;
    onClearAllPoints: () => void;
    onFinishPen: () => void;
}

export const PathDrawingBanner: React.FC<PathDrawingBannerProps> = ({
    isDrawing,
    draftCoords,
    effectiveCornerRadius,
    angleConstraintMode,
    onUndoLastPoint,
    onClearAllPoints,
    onFinishPen,
}) => {
    if (!isDrawing) return null;

    return (
        <div className="pointer-events-auto absolute top-4 left-[580px] z-30 flex items-center gap-space-md rounded-xl bg-on-background/95 px-space-lg py-space-sm text-surface-container-lowest shadow-lg backdrop-blur-md">
            <span className="material-symbols-outlined text-[20px] text-emerald-400">
                gesture
            </span>
            <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm tracking-tight text-white uppercase">
                    {draftCoords.length === 0
                        ? 'Guidance Pen Active (Click map to place WP-1)'
                        : `Guidance Pen Active (${draftCoords.length} Nodes · R=${effectiveCornerRadius.toFixed(1)}m)`}
                </span>
                <span className="font-label-sm text-label-sm text-outline-variant">
                    {draftCoords.length === 0
                        ? 'Click anywhere on the blueprint map to start your trajectory corridor.'
                        : `Angle Lock: ${
                              angleConstraintMode === 'ortho-45'
                                  ? '0° / 45° / 90°'
                                  : angleConstraintMode === 'ortho-90'
                                    ? 'Horizontal / Vertical Only'
                                    : 'Free (Hold Shift for 45°)'
                          } · Drag nodes to adjust.`}
                </span>
            </div>
            {draftCoords.length > 0 && (
                <button
                    type="button"
                    onClick={onUndoLastPoint}
                    className="cursor-pointer rounded bg-white/15 px-2.5 py-1 font-label-sm text-label-sm text-white uppercase hover:bg-white/25"
                >
                    Undo Node
                </button>
            )}
            {draftCoords.length > 0 && (
                <button
                    type="button"
                    onClick={onClearAllPoints}
                    className="cursor-pointer rounded bg-white/15 px-2 py-1 font-label-sm text-label-sm text-rose-300 uppercase hover:bg-rose-500/30"
                >
                    Clear
                </button>
            )}
            <button
                type="button"
                onClick={onFinishPen}
                className="cursor-pointer rounded bg-primary-container px-3 py-1 font-label-sm text-label-sm font-bold text-on-primary-container uppercase"
            >
                Finish Pen
            </button>
        </div>
    );
};
