import type { Waypoint } from '@/types';

export interface StationSnapResult {
    station: Waypoint;
    distanceM: number;
    x: number;
    y: number;
}

/**
 * Finds the nearest station (waypoint) within the given snap radius in meters.
 * Defaults to 0.8 meters.
 */
export function findNearbyStation(
    metric: { x: number; y: number },
    waypoints: Waypoint[],
    snapRadiusMeters = 0.8,
): StationSnapResult | null {
    if (!waypoints || waypoints.length === 0) return null;

    let nearest: Waypoint | null = null;
    let minDistance = snapRadiusMeters;

    for (const wp of waypoints) {
        const dist = Math.hypot(wp.x - metric.x, wp.y - metric.y);
        if (dist <= minDistance) {
            minDistance = dist;
            nearest = wp;
        }
    }

    if (!nearest) return null;

    return {
        station: nearest,
        distanceM: Number(minDistance.toFixed(3)),
        x: nearest.x,
        y: nearest.y,
    };
}
