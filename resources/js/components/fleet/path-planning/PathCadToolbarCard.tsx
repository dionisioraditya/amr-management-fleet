import React from 'react';
import type { AngleConstraintMode } from '@/components/fleet/interactive-blueprint-canvas';

interface PathCadToolbarCardProps {
    snapEnabled: boolean;
    onToggleSnap: () => void;
    curveMode: 'fillet' | 'linear';
    cornerRadius: number;
    onSelectFilletCurve: () => void;
    onSelectLinearCurve: () => void;
    angleConstraintMode: AngleConstraintMode;
    onSelectAngleConstraint: (mode: AngleConstraintMode) => void;
}

const ANGLE_MODES = [
    {
        id: 'ortho-45',
        label: 'Ortho + 45°',
        sub: '0° / 45° / 90°',
        icon: 'architecture',
    },
    {
        id: 'ortho-90',
        label: 'Ortho 90°',
        sub: 'H / V Aisles',
        icon: 'grid_goldenratio',
    },
    {
        id: 'free',
        label: 'Free Vector',
        sub: 'Any Angle',
        icon: 'gesture',
    },
] as const;

export const PathCadToolbarCard: React.FC<PathCadToolbarCardProps> = ({
    snapEnabled,
    onToggleSnap,
    curveMode,
    cornerRadius,
    onSelectFilletCurve,
    onSelectLinearCurve,
    angleConstraintMode,
    onSelectAngleConstraint,
}) => {
    return (
        <div className="rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs">
            <div className="mb-space-xs flex items-center justify-between">
                <span className="font-label-sm text-label-sm font-semibold tracking-wider text-tertiary uppercase">
                    CAD Guideway & Angle Constraint Tools
                </span>
                <button
                    type="button"
                    onClick={onToggleSnap}
                    className="cursor-pointer font-mono text-[10px] font-bold text-primary hover:underline"
                >
                    Grid Snap: {snapEnabled ? '0.5m ON' : 'OFF'}
                </button>
            </div>

            {/* Row 1: Corner Transition Mode (Fillet Arc vs Linear) */}
            <div className="mb-2 grid grid-cols-2 gap-1.5">
                <button
                    type="button"
                    onClick={onSelectFilletCurve}
                    className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 font-label-sm text-xs transition-all ${
                        curveMode === 'fillet'
                            ? 'bg-emerald-600 font-semibold text-white shadow-2xs'
                            : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                    }`}
                >
                    <span className="material-symbols-outlined text-[16px]">
                        rounded_corner
                    </span>
                    <span>Fillet Arc (R={cornerRadius.toFixed(1)}m)</span>
                </button>
                <button
                    type="button"
                    onClick={onSelectLinearCurve}
                    className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 font-label-sm text-xs transition-all ${
                        curveMode === 'linear'
                            ? 'bg-primary-fixed font-semibold text-on-primary-fixed shadow-2xs'
                            : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                    }`}
                >
                    <span className="material-symbols-outlined text-[16px]">
                        polyline
                    </span>
                    <span>Linear 0° Pivot (Sharp)</span>
                </button>
            </div>

            {/* Row 2: Pen Angle Lock Constraint (Horizontal / Vertical / 45° Diagonal) */}
            <div className="grid grid-cols-3 gap-1.5">
                {ANGLE_MODES.map((modeItem) => (
                    <button
                        key={modeItem.id}
                        type="button"
                        onClick={() => onSelectAngleConstraint(modeItem.id)}
                        className={`flex cursor-pointer flex-col items-start rounded-lg border px-2.5 py-1.5 text-left transition-all ${
                            angleConstraintMode === modeItem.id
                                ? 'border-primary bg-primary-fixed/80 text-on-primary-fixed shadow-2xs'
                                : 'border-slate-200/70 bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                        }`}
                    >
                        <div className="flex items-center gap-1 font-label-sm text-[11px] font-bold">
                            <span className="material-symbols-outlined text-[14px]">
                                {modeItem.icon}
                            </span>
                            <span>{modeItem.label}</span>
                        </div>
                        <span className="font-mono text-[9px] opacity-75">
                            {modeItem.sub}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};
