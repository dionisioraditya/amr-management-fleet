import React from 'react';
import { calculatePolygonArea } from '@/components/fleet/interactive-blueprint-canvas';
import type { KeepoutZone, KeepoutZoneType, PathCoordinate } from '@/types';

interface ZoneInspectorCardProps {
    zoneName: string;
    setZoneName: (val: string) => void;
    zoneType: KeepoutZoneType;
    setZoneType: (val: KeepoutZoneType) => void;
    zoneSpeedLimit: string;
    setZoneSpeedLimit: (val: string) => void;
    draftZoneCoords: PathCoordinate[];
    selectedZone: KeepoutZone | null;
    savingZone: boolean;
    onCloseZone: () => void;
    onDeleteZone: (zone: KeepoutZone) => void;
    onSaveZone: () => void;
}

export const ZoneInspectorCard: React.FC<ZoneInspectorCardProps> = ({
    zoneName,
    setZoneName,
    zoneType,
    setZoneType,
    zoneSpeedLimit,
    setZoneSpeedLimit,
    draftZoneCoords,
    selectedZone,
    savingZone,
    onCloseZone,
    onDeleteZone,
    onSaveZone,
}) => {
    return (
        <div className="rounded-xl border border-red-200 bg-white p-space-lg shadow-xs">
            <div className="mb-space-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-600 ring-4 ring-red-100" />
                    <div>
                        <div className="font-headline-sm text-headline-sm font-bold text-on-surface uppercase">
                            {zoneName || 'NEW-KEEPOUT-ZONE'}
                        </div>
                        <div className="font-mono text-[10px] text-tertiary">
                            {draftZoneCoords.length} vertices •{' '}
                            {calculatePolygonArea(draftZoneCoords)} m² • ROS 2 Nav2 Costmap Filter
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onCloseZone}
                    className="cursor-pointer font-mono text-xs text-tertiary hover:text-on-surface"
                >
                    Close
                </button>
            </div>

            <div className="mb-space-sm grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-surface-container-lowest p-2">
                    <label className="block font-label-sm text-[10px] text-tertiary uppercase">
                        Zone Identifier
                    </label>
                    <input
                        type="text"
                        value={zoneName}
                        onChange={(e) => setZoneName(e.target.value)}
                        className="mt-0.5 w-full bg-transparent font-mono text-xs font-bold text-on-surface focus:outline-none"
                    />
                </div>
                <div className="rounded-lg bg-surface-container-lowest p-2">
                    <label className="block font-label-sm text-[10px] text-tertiary uppercase">
                        Nav2 Filter Type
                    </label>
                    <select
                        value={zoneType}
                        onChange={(e) => setZoneType(e.target.value as KeepoutZoneType)}
                        className="mt-0.5 w-full cursor-pointer bg-transparent font-mono text-xs font-bold text-red-700 focus:outline-none"
                    >
                        <option value="keep_out">🚫 Keep-Out (Lethal Cost 254)</option>
                        <option value="speed_limit">⚡ Speed-Limit Zone</option>
                    </select>
                </div>
            </div>

            {zoneType === 'speed_limit' && (
                <div className="mb-space-sm rounded-lg bg-surface-container-lowest p-2">
                    <label className="block font-label-sm text-[10px] text-tertiary uppercase">
                        Max Speed Limit (m/s)
                    </label>
                    <input
                        type="number"
                        step="0.05"
                        min="0.1"
                        max="3.0"
                        value={zoneSpeedLimit}
                        onChange={(e) => setZoneSpeedLimit(e.target.value)}
                        className="mt-0.5 w-full bg-transparent font-mono text-xs font-bold text-amber-700 focus:outline-none"
                    />
                </div>
            )}

            <div className="flex items-center gap-2">
                {selectedZone && (
                    <button
                        type="button"
                        onClick={() => onDeleteZone(selectedZone)}
                        className="cursor-pointer rounded-lg bg-red-50 px-3 py-2 font-label-sm text-xs font-bold text-red-700 uppercase hover:bg-red-100"
                    >
                        Delete Zone
                    </button>
                )}
                <button
                    type="button"
                    disabled={draftZoneCoords.length < 3 || savingZone}
                    onClick={onSaveZone}
                    className="flex-1 cursor-pointer rounded-lg bg-red-600 px-4 py-2 font-label-sm text-xs font-bold text-white uppercase shadow-xs hover:bg-red-700 disabled:opacity-40"
                >
                    {savingZone
                        ? 'Rasterizing Mask...'
                        : selectedZone
                          ? 'Update & Rasterize Mask'
                          : 'Save & Rasterize Zone'}
                </button>
            </div>
        </div>
    );
};
