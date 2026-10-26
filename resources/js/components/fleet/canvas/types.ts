import type {
    FacilityMap,
    KeepoutZone,
    PathCoordinate,
    Pathplan,
    Vehicle,
    Waypoint,
} from '@/types';
import type { AngleConstraintMode } from '@/lib/geometry';

export interface InteractiveBlueprintCanvasProps {
    map?: FacilityMap | null;
    waypoints?: Waypoint[];
    pathplans?: Pathplan[];
    keepoutZones?: KeepoutZone[];
    vehicles?: Vehicle[];
    selectedWaypointId?: number | null;
    editingWaypointId?: number | null;
    selectedPathplanId?: number | null;
    selectedKeepoutZoneId?: number | null;
    selectedVehicleId?: string | null;
    onSelectWaypoint?: (waypoint: Waypoint) => void;
    onSelectPathplan?: (pathplan: Pathplan) => void;
    onSelectKeepoutZone?: (zone: KeepoutZone) => void;
    onSelectVehicle?: (vehicle: Vehicle) => void;
    onClearSelection?: () => void;
    mode?: 'view' | 'pick-station' | 'draw-path' | 'draw-zone' | 'pose-estimate';
    onPickCoordinate?: (coord: PathCoordinate) => void;
    onPoseEstimate?: (pose: { x: number; y: number; theta: number }) => void;
    draftCoordinates?: PathCoordinate[];
    onAddPathPoint?: (coord: PathCoordinate) => void;
    onUpdatePathPoint?: (index: number, coord: PathCoordinate) => void;
    draftZoneCoordinates?: PathCoordinate[];
    onAddZonePoint?: (coord: PathCoordinate) => void;
    onUpdateZonePoint?: (index: number, coord: PathCoordinate) => void;
    onCompleteZone?: () => void;
    defaultCornerRadius?: number;
    angleConstraintMode?: AngleConstraintMode;
    snapStep?: number;
    inflationRadius?: number;
    showCostmap?: boolean;
    showSlamNoise?: boolean;
    showKeepOutZones?: boolean;
    showOriginDatum?: boolean;
    occupancyViewMode?: 'blueprint' | 'raw';
    resolution?: number;
    hudPosition?: 'top-right' | 'bottom-right';
}
