import React from 'react';
import {
    type AngleConstraintMode,
    InteractiveBlueprintCanvas,
} from '@/components/fleet/interactive-blueprint-canvas';
import type { FacilityMap, KeepoutZone, PathCoordinate, Pathplan } from '@/types';

interface PathPlanningCanvasProps {
    activeMap?: FacilityMap | null;
    pathplans: Pathplan[];
    zones: KeepoutZone[];
    selectedPathId: number | null;
    selectedZoneId: number | null;
    onSelectPathplan: (path: Pathplan) => void;
    onSelectKeepoutZone: (zone: KeepoutZone) => void;
    onClearSelection: () => void;
    isDrawing: boolean;
    isDrawingZone: boolean;
    draftCoords: PathCoordinate[];
    onAddPathPoint: (coord: PathCoordinate) => void;
    onUpdatePathPoint: (index: number, coord: PathCoordinate) => void;
    draftZoneCoords: PathCoordinate[];
    onAddZonePoint: (coord: PathCoordinate) => void;
    onUpdateZonePoint: (index: number, coord: PathCoordinate) => void;
    onCompleteZone: () => void;
    effectiveCornerRadius: number;
    angleConstraintMode: AngleConstraintMode;
    snapEnabled: boolean;
    setSnapEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    inflationCorridor: number;
    showCostmap: boolean;
    setShowCostmap: React.Dispatch<React.SetStateAction<boolean>>;
    showKeepOutZones: boolean;
    setShowKeepOutZones: React.Dispatch<React.SetStateAction<boolean>>;
}

export const PathPlanningCanvas: React.FC<PathPlanningCanvasProps> = ({
    activeMap,
    pathplans,
    zones,
    selectedPathId,
    selectedZoneId,
    onSelectPathplan,
    onSelectKeepoutZone,
    onClearSelection,
    isDrawing,
    isDrawingZone,
    draftCoords,
    onAddPathPoint,
    onUpdatePathPoint,
    draftZoneCoords,
    onAddZonePoint,
    onUpdateZonePoint,
    onCompleteZone,
    effectiveCornerRadius,
    angleConstraintMode,
    snapEnabled,
    setSnapEnabled,
    inflationCorridor,
    showCostmap,
    setShowCostmap,
    showKeepOutZones,
    setShowKeepOutZones,
}) => {
    return (
        <>
            <div className="absolute inset-0 z-0">
                <InteractiveBlueprintCanvas
                    map={activeMap}
                    waypoints={activeMap?.waypoints ?? []}
                    pathplans={pathplans}
                    keepoutZones={zones}
                    selectedPathplanId={selectedPathId}
                    selectedKeepoutZoneId={selectedZoneId}
                    onSelectPathplan={onSelectPathplan}
                    onSelectKeepoutZone={onSelectKeepoutZone}
                    onClearSelection={onClearSelection}
                    mode={
                        isDrawingZone
                            ? 'draw-zone'
                            : isDrawing
                              ? 'draw-path'
                              : 'view'
                    }
                    draftCoordinates={draftCoords}
                    onAddPathPoint={onAddPathPoint}
                    onUpdatePathPoint={onUpdatePathPoint}
                    draftZoneCoordinates={draftZoneCoords}
                    onAddZonePoint={onAddZonePoint}
                    onUpdateZonePoint={onUpdateZonePoint}
                    onCompleteZone={onCompleteZone}
                    defaultCornerRadius={effectiveCornerRadius}
                    angleConstraintMode={angleConstraintMode}
                    snapStep={snapEnabled ? 0.5 : 0}
                    inflationRadius={inflationCorridor}
                    showCostmap={showCostmap}
                    showKeepOutZones={showKeepOutZones}
                    resolution={activeMap?.resolution ?? 0.05}
                    hudPosition="top-right"
                />
            </div>

            {/* Top Right Map Layer Toggles */}
            <div className="pointer-events-auto absolute top-16 right-4 z-20 hidden items-center gap-2 rounded-xl border border-slate-200/80 bg-surface-container-lowest/95 px-3 py-1.5 shadow-md backdrop-blur-md xl:flex">
                <button
                    type="button"
                    onClick={() => setSnapEnabled((s) => !s)}
                    className={`flex cursor-pointer items-center gap-1 rounded px-2 py-1 font-label-sm text-xs transition-all ${
                        snapEnabled
                            ? 'bg-primary-fixed font-semibold text-on-primary-fixed'
                            : 'text-on-surface-variant hover:bg-slate-100'
                    }`}
                >
                    <span className="material-symbols-outlined text-[16px]">
                        grid_4x4
                    </span>
                    Snap 0.5m
                </button>
                <button
                    type="button"
                    onClick={() => setShowCostmap((c) => !c)}
                    className={`flex cursor-pointer items-center gap-1 rounded px-2 py-1 font-label-sm text-xs transition-all ${
                        showCostmap
                            ? 'bg-surface-container font-semibold text-primary'
                            : 'text-on-surface-variant hover:bg-slate-100'
                    }`}
                >
                    <span className="material-symbols-outlined text-[16px]">
                        layers
                    </span>
                    Costmap
                </button>
                <button
                    type="button"
                    onClick={() => setShowKeepOutZones((k) => !k)}
                    className={`flex cursor-pointer items-center gap-1 rounded px-2 py-1 font-label-sm text-xs transition-all ${
                        showKeepOutZones
                            ? 'bg-red-50 font-semibold text-red-700 ring-1 ring-red-200'
                            : 'text-on-surface-variant hover:bg-slate-100'
                    }`}
                >
                    <span className="material-symbols-outlined text-[16px]">
                        do_not_disturb_on
                    </span>
                    Keep-Out ({zones.length})
                </button>
            </div>
        </>
    );
};
