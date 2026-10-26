import { InteractiveBlueprintCanvas } from '@/components/fleet/interactive-blueprint-canvas';
import { DEFAULT_SIMULATED_VEHICLES } from '@/constants/fleet.constants';
import type { FacilityMap, KeepoutZone, PathCoordinate } from '@/types';

interface MapStudioCanvasProps {
    currentMap: FacilityMap | null;
    zones: KeepoutZone[];
    selectedZone: KeepoutZone | null;
    onSelectZone: (zone: KeepoutZone) => void;
    onClearSelection: () => void;
    activeTool: 'select' | 'keepout';
    draftZoneCoords: PathCoordinate[];
    onAddZonePoint: (coord: PathCoordinate) => void;
    onUpdateZonePoint: (index: number, coord: PathCoordinate) => void;
    onCompleteZone: () => void;
    angleConstraintMode: 'free' | 'ortho-90' | 'ortho-45';
    showSimulation: boolean;
    snapStep: number;
    showKeepOut: boolean;
    showOriginDatum: boolean;
    occupancyViewMode: 'blueprint' | 'raw';
}

export function MapStudioCanvas({
    currentMap,
    zones,
    selectedZone,
    onSelectZone,
    onClearSelection,
    activeTool,
    draftZoneCoords,
    onAddZonePoint,
    onUpdateZonePoint,
    onCompleteZone,
    angleConstraintMode,
    showSimulation,
    snapStep,
    showKeepOut,
    showOriginDatum,
    occupancyViewMode,
}: MapStudioCanvasProps) {
    return (
        <div className="absolute inset-0 z-0">
            <InteractiveBlueprintCanvas
                map={currentMap}
                waypoints={currentMap?.waypoints ?? []}
                pathplans={currentMap?.pathplans ?? []}
                keepoutZones={zones}
                selectedKeepoutZoneId={selectedZone?.id ?? null}
                onSelectKeepoutZone={onSelectZone}
                onClearSelection={onClearSelection}
                mode={activeTool === 'keepout' ? 'draw-zone' : 'view'}
                draftZoneCoordinates={draftZoneCoords}
                onAddZonePoint={onAddZonePoint}
                onUpdateZonePoint={onUpdateZonePoint}
                onCompleteZone={onCompleteZone}
                angleConstraintMode={angleConstraintMode}
                vehicles={showSimulation ? DEFAULT_SIMULATED_VEHICLES : []}
                snapStep={snapStep}
                showSlamNoise={false}
                showKeepOutZones={showKeepOut}
                showOriginDatum={showOriginDatum}
                occupancyViewMode={occupancyViewMode}
                resolution={currentMap?.resolution ?? 0.05}
                hudPosition="bottom-right"
            />
        </div>
    );
}
