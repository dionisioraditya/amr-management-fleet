import type { PathCoordinate } from '@/types';

/**
 * Computes closed polygon area in square meters using the Shoelace formula.
 */
export function calculatePolygonArea(coords: PathCoordinate[]): number {
    if (!coords || coords.length < 3) {
        return 0;
    }
    let area = 0;
    const n = coords.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += coords[i].x * coords[j].y;
        area -= coords[j].x * coords[i].y;
    }
    return Number((Math.abs(area) / 2).toFixed(2));
}

/**
 * Computes the geometric centroid of a polygon in metric coordinates.
 */
export function calculatePolygonCentroid(
    coords: PathCoordinate[],
): { x: number; y: number } {
    if (!coords || coords.length === 0) {
        return { x: 0, y: 0 };
    }
    const sum = coords.reduce(
        (acc, pt) => ({ x: acc.x + pt.x, y: acc.y + pt.y }),
        { x: 0, y: 0 },
    );
    return {
        x: Number((sum.x / coords.length).toFixed(2)),
        y: Number((sum.y / coords.length).toFixed(2)),
    };
}
