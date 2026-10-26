import React from 'react';
import { calculatePolygonArea } from '@/lib/geometry';
import type { KeepoutZone, KeepoutZoneType, PathCoordinate } from '@/types';

interface MapStudioZoneManagerCardProps {
    zones: KeepoutZone[];
    selectedZone: KeepoutZone | null;
    activeTool: 'select' | 'keepout';
    draftZoneCoords: PathCoordinate[];
    currentDraftArea: number;
    zoneName: string;
    onZoneNameChange: (name: string) => void;
    zoneType: KeepoutZoneType;
    onZoneTypeChange: (type: KeepoutZoneType) => void;
    zoneSpeedLimit: string;
    onZoneSpeedLimitChange: (limit: string) => void;
    isSavingZone: boolean;
    onToggleActiveTool: () => void;
    onSelectZone: (zone: KeepoutZone) => void;
    onClearZoneSelection: () => void;
    onSaveZone: () => void;
    onDeleteZone: (zone: KeepoutZone, e?: React.MouseEvent) => void;
    onToggleZoneActive: (zone: KeepoutZone, e: React.MouseEvent) => void;
}

export function MapStudioZoneManagerCard({
    zones,
    selectedZone,
    activeTool,
    draftZoneCoords,
    currentDraftArea,
    zoneName,
    onZoneNameChange,
    zoneType,
    onZoneTypeChange,
    zoneSpeedLimit,
    onZoneSpeedLimitChange,
    isSavingZone,
    onToggleActiveTool,
    onSelectZone,
    onClearZoneSelection,
    onSaveZone,
    onDeleteZone,
    onToggleZoneActive,
}: MapStudioZoneManagerCardProps) {
    return (
        <div className="rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs">
            <div className="mb-2 flex items-center justify-between">
                <div>
                    <span className="font-label-sm text-[10px] font-bold tracking-wider text-red-600 uppercase">
                        NAV2 COSTMAP FILTER MASKS
                    </span>
                    <h2 className="font-headline-sm text-sm font-bold text-on-surface uppercase">
                        Keep-Out &amp; Speed Zones
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={onToggleActiveTool}
                    className={`flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 font-label-sm text-[10px] font-bold uppercase transition ${
                        activeTool === 'keepout'
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100'
                    }`}
                >
                    <span className="material-symbols-outlined text-[14px]">
                        pentagon
                    </span>
                    <span>{activeTool === 'keepout' ? 'Drawing...' : '+ Draw Zone'}</span>
                </button>
            </div>

            {/* Active Zone Editor Form (When Drawing or Zone Selected) */}
            {(activeTool === 'keepout' || selectedZone) && (
                <div className="mb-3 space-y-2.5 rounded-xl border border-red-200 bg-red-50/40 p-2.5">
                    <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-red-700 uppercase">
                            {selectedZone
                                ? `Editing #${selectedZone.id} (${currentDraftArea} m²)`
                                : `New Polygon (${draftZoneCoords.length} pts · ${currentDraftArea} m²)`}
                        </span>
                        {selectedZone && (
                            <button
                                type="button"
                                onClick={onClearZoneSelection}
                                className="cursor-pointer font-mono text-[10px] text-tertiary hover:text-on-surface"
                            >
                                Close
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="mb-0.5 block font-mono text-[9px] font-bold text-tertiary uppercase">
                                Zone Identifier
                            </label>
                            <input
                                type="text"
                                value={zoneName}
                                onChange={(e) => onZoneNameChange(e.target.value)}
                                placeholder="FORKLIFT-BAY-A"
                                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 font-mono text-xs font-bold text-on-surface focus:border-red-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="mb-0.5 block font-mono text-[9px] font-bold text-tertiary uppercase">
                                Costmap Filter Type
                            </label>
                            <select
                                value={zoneType}
                                onChange={(e) => onZoneTypeChange(e.target.value as KeepoutZoneType)}
                                className="h-8 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-2 font-mono text-xs font-bold text-on-surface focus:border-red-500 focus:outline-none"
                            >
                                <option value="keep_out">🚫 Keep-Out (Lethal)</option>
                                <option value="speed_limit">⚡ Speed-Limit</option>
                            </select>
                        </div>
                    </div>

                    {zoneType === 'speed_limit' && (
                        <div>
                            <label className="mb-0.5 block font-mono text-[9px] font-bold text-tertiary uppercase">
                                Max Speed Limit (m/s)
                            </label>
                            <input
                                type="number"
                                step="0.05"
                                min="0.1"
                                max="3.0"
                                value={zoneSpeedLimit}
                                onChange={(e) => onZoneSpeedLimitChange(e.target.value)}
                                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 font-mono text-xs font-bold text-amber-700 focus:border-amber-500 focus:outline-none"
                            />
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1">
                        {selectedZone && (
                            <button
                                type="button"
                                onClick={() => onDeleteZone(selectedZone)}
                                className="cursor-pointer rounded-lg bg-red-100 px-2.5 py-1.5 font-label-sm text-[10px] font-bold text-red-700 uppercase hover:bg-red-200"
                            >
                                Delete Zone
                            </button>
                        )}
                        <button
                            type="button"
                            disabled={draftZoneCoords.length < 3 || isSavingZone}
                            onClick={onSaveZone}
                            className="ml-auto cursor-pointer rounded-lg bg-red-600 px-3 py-1.5 font-label-sm text-[10px] font-bold text-white uppercase shadow-2xs hover:bg-red-700 disabled:opacity-40"
                        >
                            {isSavingZone
                                ? 'Rasterizing...'
                                : selectedZone
                                  ? 'Update & Rasterize'
                                  : 'Save Polygon Mask'}
                        </button>
                    </div>
                </div>
            )}

            {/* Zones Manifest List */}
            <div className="space-y-1.5">
                {zones.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center font-body-sm text-xs text-tertiary">
                        No restricted zones defined. Click <strong>+ Draw Zone</strong> to mask forbidden areas for ROS 2 Nav2.
                    </div>
                ) : (
                    zones.map((zone) => {
                        const isSel = selectedZone?.id === zone.id;
                        const isKeepOut = zone.zone_type === 'keep_out';
                        return (
                            <div
                                key={zone.id}
                                onClick={() => onSelectZone(zone)}
                                className={`flex cursor-pointer items-center justify-between rounded-lg border px-2.5 py-2 transition ${
                                    isSel
                                        ? 'border-red-500 bg-red-50/60 ring-1 ring-red-200'
                                        : 'border-slate-200/80 bg-surface-container-low/50 hover:border-red-300'
                                } ${!zone.is_active ? 'opacity-50' : ''}`}
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className={`h-2 w-2 rounded-full ${
                                                isKeepOut ? 'bg-red-600' : 'bg-amber-500'
                                            }`}
                                        />
                                        <span className="truncate font-mono text-xs font-bold text-on-surface">
                                            {zone.name}
                                        </span>
                                        <span
                                            className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                                                isKeepOut
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-amber-100 text-amber-800'
                                            }`}
                                        >
                                            {isKeepOut ? 'KEEP-OUT' : `${zone.speed_limit ?? 0.4}m/s`}
                                        </span>
                                    </div>
                                    <div className="mt-0.5 font-mono text-[10px] text-tertiary">
                                        {zone.coordinates?.length ?? 0} vertices •{' '}
                                        {zone.area_m2 ?? calculatePolygonArea(zone.coordinates ?? [])} m²
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={(e) => onToggleZoneActive(zone, e)}
                                        title={zone.is_active ? 'Mute Zone' : 'Enable Zone'}
                                        className="cursor-pointer rounded p-1 text-on-surface-variant hover:bg-white"
                                    >
                                        <span className="material-symbols-outlined text-[15px]">
                                            {zone.is_active ? 'visibility' : 'visibility_off'}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => onDeleteZone(zone, e)}
                                        title="Delete Zone"
                                        className="cursor-pointer rounded p-1 text-on-surface-variant hover:bg-red-100 hover:text-red-700"
                                    >
                                        <span className="material-symbols-outlined text-[15px]">
                                            delete
                                        </span>
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
