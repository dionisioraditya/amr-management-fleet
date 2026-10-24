export type VehicleStatus =
    | 'idle'
    | 'active'
    | 'moving'
    | 'charging'
    | 'maintenance'
    | 'error'
    | 'offline'
    | 'emergency_stop';

export interface VehiclePose {
    id: number;
    vehicle_id: string;
    x: number;
    y: number;
    theta: number;
    updated_at?: string;
}

export interface Vehicle {
    id: string;
    name: string;
    ip_address: string;
    status: VehicleStatus;
    battery_percentage: number;
    pose?: VehiclePose | null;
    missions?: Mission[];
    created_at?: string;
    updated_at?: string;
}

export interface Waypoint {
    id: number;
    map_id: number;
    name: string;
    x: number;
    y: number;
    theta: number;
    created_at?: string;
}

export interface PathCoordinate {
    x: number;
    y: number;
    r?: number;
}

export interface Pathplan {
    id: number;
    map_id: number;
    name: string;
    is_bidirectional: boolean;
    max_speed: number;
    coordinates: PathCoordinate[];
    description?: string | null;
    created_at?: string;
}

export interface FacilityMap {
    id: number;
    name: string;
    image_path: string;
    image_url?: string | null;
    keepout_url?: string | null;
    width_px?: number | null;
    height_px?: number | null;
    resolution: number;
    origin_x: number;
    origin_y: number;
    origin_yaw?: number;
    occupied_thresh?: number;
    free_thresh?: number;
    negate?: boolean;
    raw_pgm_path?: string | null;
    raw_yaml_path?: string | null;
    keepout_path?: string | null;
    posegraph_path?: string | null;
    data_path?: string | null;
    waypoints_count?: number;
    pathplans_count?: number;
    waypoints?: Waypoint[];
    pathplans?: Pathplan[];
    created_at?: string;
}

export interface MissionItem {
    id: number;
    mission_id: number;
    waypoint_id: number;
    order_index: number;
    schedule?: string | null;
    status: 'pending' | 'in_progress' | 'reached' | 'skipped' | 'failed';
    waypoint?: Waypoint;
}

export interface Mission {
    id: number;
    vehicle_id?: string | null;
    name: string;
    schedule?: string | null;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
    vehicle?: Vehicle | null;
    items?: MissionItem[];
    created_at?: string;
}

export interface VehicleLogEntry {
    id: number;
    vehicle_id: string;
    event: string;
    level: 'info' | 'warning' | 'error' | 'critical';
    payload?: Record<string, unknown> | null;
    created_at: string;
    vehicle?: Vehicle | null;
}

export interface SystemLogEntry {
    id: number;
    action: string;
    level: 'info' | 'warning' | 'error' | 'critical';
    context?: Record<string, unknown> | null;
    created_at: string;
}

export interface TelemetryNotification {
    id: string;
    title: string;
    level: 'info' | 'warning' | 'error' | 'critical';
    time: string;
}

export interface TelemetrySearchItem {
    type: 'vehicle' | 'station' | 'mission';
    id: string;
    label: string;
    sublabel: string;
    href: string;
}

export interface TelemetryShellData {
    onlineCount: number;
    totalVehicles: number;
    emergencyActive: boolean;
    rosMasterStatus: string;
    latencyMs: number;
    notifications: TelemetryNotification[];
    searchItems: TelemetrySearchItem[];
}
