import React from 'react';
import type { FilletedPathGeometry } from '@/components/fleet/interactive-blueprint-canvas';
import type { PathCoordinate } from '@/types';
import { PathWaypointSequence } from './PathWaypointSequence';

interface PathInspectorCardProps {
    formName: string;
    setFormName: (val: string) => void;
    formDescription: string;
    editingPathId: number | null;
    formBidirectional: boolean;
    setFormBidirectional: (val: boolean) => void;
    draftCoords: PathCoordinate[];
    activeFilletGeom: FilletedPathGeometry;
    activeLength: number;
    effectiveCornerRadius: number;
    onCornerRadiusChange: (r: number) => void;
    inflationCorridor: number;
    setInflationCorridor: (val: number) => void;
    formMaxSpeed: number;
    setFormMaxSpeed: (val: number) => void;
    isDrawing: boolean;
    setIsDrawing: React.Dispatch<React.SetStateAction<boolean>>;
    onClearAllPoints: () => void;
    onReverseDirection: () => void;
    onRemovePathPoint: (index: number) => void;
    onUndoLastPoint: () => void;
    onSavePathplan: () => void;
    saving: boolean;
}

const RADIUS_PRESETS = [
    { label: '0.0m Sharp', val: 0.0 },
    { label: '0.5m Tight', val: 0.5 },
    { label: '0.8m Std AGV', val: 0.8 },
    { label: '1.2m Wide', val: 1.2 },
    { label: '1.8m Highway', val: 1.8 },
];

export const PathInspectorCard: React.FC<PathInspectorCardProps> = ({
    formName, setFormName, formDescription, editingPathId,
    formBidirectional, setFormBidirectional, draftCoords,
    activeFilletGeom, activeLength, effectiveCornerRadius, onCornerRadiusChange,
    inflationCorridor, setInflationCorridor, formMaxSpeed, setFormMaxSpeed,
    isDrawing, setIsDrawing, onClearAllPoints, onReverseDirection,
    onRemovePathPoint, onUndoLastPoint, onSavePathplan, saving,
}) => {
    return (
        <div className="rounded-xl border border-slate-200/80 bg-white p-space-lg shadow-xs">
            <div className="mb-space-md flex items-start justify-between">
                <div className="flex items-center gap-space-sm">
                    <span className="h-3 w-3 rounded-full bg-primary-container ring-4 ring-primary-container/20" />
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                                {formName || 'NEW-PATH'}
                            </span>
                            <span className="rounded-full bg-primary-container/20 px-2 py-0.5 font-label-sm text-label-sm font-bold text-on-primary-fixed uppercase">
                                {editingPathId ? 'Active Selected' : 'New Draft'}
                            </span>
                        </div>
                        <span className="font-body-sm text-body-sm text-tertiary">
                            {formDescription || 'Custom AMR Corridor'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    {draftCoords.length > 0 && (
                        <button
                            type="button"
                            onClick={onClearAllPoints}
                            title="Clear All Vertices"
                            className="cursor-pointer rounded-lg border border-slate-200 bg-surface-container-low px-2 py-1 font-label-sm text-[10px] font-semibold text-rose-600 uppercase hover:bg-rose-50"
                        >
                            Clear
                        </button>
                    )}
                    <button
                        type="button"
                        disabled={draftCoords.length < 2}
                        onClick={onReverseDirection}
                        title="Reverse Vertex Order (Flip Flow Direction)"
                        className="cursor-pointer rounded-lg border border-slate-200 bg-surface-container-low px-2 py-1 font-label-sm text-[10px] font-semibold text-on-surface uppercase hover:bg-surface-container disabled:opacity-40"
                    >
                        ⇄ Reverse
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsDrawing((d) => !d)}
                        className={`cursor-pointer rounded-lg px-2.5 py-1 font-label-sm text-[10px] font-bold uppercase transition-all ${
                            isDrawing
                                ? 'bg-primary-container text-on-primary-container'
                                : 'bg-primary text-white shadow-2xs hover:bg-on-primary-fixed-variant'
                        }`}
                    >
                        {isDrawing ? '✓ Pen Active' : '+ Pen Draw'}
                    </button>
                </div>
            </div>

            {/* Editable Name & Description Fields */}
            <div className="mb-space-md grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-surface-container-lowest p-2">
                    <label className="block font-label-sm text-[10px] text-tertiary uppercase">
                        Path Name / Code
                    </label>
                    <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="mt-0.5 w-full bg-transparent font-mono text-xs font-bold text-on-surface focus:outline-none"
                    />
                </div>
                <div className="rounded-lg bg-surface-container-lowest p-2">
                    <label className="block font-label-sm text-[10px] text-tertiary uppercase">
                        Flow Direction
                    </label>
                    <select
                        value={formBidirectional ? 'bi' : 'uni'}
                        onChange={(e) => setFormBidirectional(e.target.value === 'bi')}
                        className="mt-0.5 w-full cursor-pointer bg-transparent font-label-md text-xs font-semibold text-primary focus:outline-none"
                    >
                        <option value="bi">⇄ Bidirectional (Two-Way)</option>
                        <option value="uni">→ Unidirectional (One-Way)</option>
                    </select>
                </div>
            </div>

            {/* Waypoint / Vertex Sequence Strip */}
            <PathWaypointSequence
                draftCoords={draftCoords}
                activeFilletGeom={activeFilletGeom}
                activeLength={String(activeLength)}
                onRemovePathPoint={onRemovePathPoint}
            />

            {/* Slider Tuning: Corner Turning Radius, Inflation Corridor & Max Speed */}
            <div className="mb-space-md space-y-3 rounded-lg bg-surface-container-lowest p-space-sm">
                <div>
                    <div className="flex items-center justify-between font-label-sm text-label-sm">
                        <span className="flex items-center gap-1 font-semibold text-emerald-700">
                            <span className="material-symbols-outlined text-[14px]">
                                rounded_corner
                            </span>
                            Corner Turning Radius (Fillet R):
                        </span>
                        <span className="font-mono font-bold text-emerald-700">
                            {effectiveCornerRadius.toFixed(2)} meter
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0.0"
                        max="2.5"
                        step="0.1"
                        value={effectiveCornerRadius}
                        onChange={(e) => onCornerRadiusChange(parseFloat(e.target.value))}
                        className="mt-1 h-1.5 w-full cursor-pointer accent-emerald-600"
                    />
                    <div className="mt-1 flex items-center justify-between gap-1">
                        {RADIUS_PRESETS.map((preset) => (
                            <button
                                key={preset.label}
                                type="button"
                                onClick={() => onCornerRadiusChange(preset.val)}
                                className={`cursor-pointer rounded px-1.5 py-0.5 font-mono text-[9px] transition-all ${
                                    Math.abs(effectiveCornerRadius - preset.val) < 0.05
                                        ? 'bg-emerald-600 font-bold text-white'
                                        : 'bg-surface-container text-on-surface-variant hover:bg-slate-200'
                                }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between font-label-sm text-label-sm">
                        <span className="text-tertiary">Safety Inflation Corridor:</span>
                        <span className="font-mono font-bold text-primary">
                            {inflationCorridor.toFixed(2)} meter
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0.3"
                        max="1.2"
                        step="0.1"
                        value={inflationCorridor}
                        onChange={(e) => setInflationCorridor(parseFloat(e.target.value))}
                        className="mt-1 h-1.5 w-full cursor-pointer accent-primary"
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between font-label-sm text-label-sm">
                        <span className="text-tertiary">Max Linear Velocity Limit:</span>
                        <span className="font-mono font-bold text-on-surface">
                            {Number(formMaxSpeed).toFixed(2)} m/s
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0.2"
                        max="3.0"
                        step="0.1"
                        value={formMaxSpeed}
                        onChange={(e) => setFormMaxSpeed(parseFloat(e.target.value))}
                        className="mt-1 h-1.5 w-full cursor-pointer accent-secondary"
                    />
                </div>
            </div>

            {/* Inspector Action Buttons */}
            <div className="flex items-center gap-space-sm">
                <button
                    type="button"
                    disabled={saving}
                    onClick={onSavePathplan}
                    className="flex-1 cursor-pointer rounded-lg bg-primary px-space-md py-2 font-label-sm text-label-sm font-semibold tracking-wide text-on-primary uppercase shadow-xs transition-all hover:bg-on-primary-fixed-variant"
                >
                    {saving
                        ? 'Deploying...'
                        : editingPathId
                          ? 'Update & Deploy to Nav2'
                          : 'Save & Deploy Path'}
                </button>
                {draftCoords.length > 2 && (
                    <button
                        type="button"
                        onClick={onUndoLastPoint}
                        className="cursor-pointer rounded-lg bg-surface-container px-space-md py-2 font-label-sm text-label-sm text-on-surface uppercase transition-all hover:bg-surface-container-high"
                    >
                        Undo Node
                    </button>
                )}
            </div>
        </div>
    );
};
