import { useEffect, useState } from 'react';
import type { Vehicle, Waypoint } from '@/types';

interface UseDashboardSimulationOptions {
    vehicles: Vehicle[];
    setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
    waypoints: Waypoint[];
}

export function useDashboardSimulation({
    vehicles,
    setVehicles,
    waypoints,
}: UseDashboardSimulationOptions) {
    const [isLiveSim, setIsLiveSim] = useState(false);
    const [simWaypointIdx, setSimWaypointIdx] = useState(0);

    useEffect(() => {
        if (!isLiveSim || vehicles.length === 0 || waypoints.length === 0) {
            return;
        }

        const timer = window.setInterval(() => {
            const targetVehicle =
                vehicles.find((v) => v.status === 'active' || v.status === 'moving') ?? vehicles[0];

            if (!targetVehicle || targetVehicle.status === 'emergency_stop') {
                return;
            }

            const targetWp = waypoints[simWaypointIdx % waypoints.length];
            const curX = targetVehicle.pose?.x ?? 4.0;
            const curY = targetVehicle.pose?.y ?? 4.0;
            const dx = targetWp.x - curX;
            const dy = targetWp.y - curY;
            const dist = Math.hypot(dx, dy);

            let nextX = curX;
            let nextY = curY;
            const nextTheta = Number(Math.atan2(dy, dx).toFixed(2));

            if (dist < 1.2) {
                nextX = targetWp.x;
                nextY = targetWp.y;
                setSimWaypointIdx((idx) => (idx + 1) % waypoints.length);
            } else {
                const step = 1.1;
                nextX = Number((curX + (dx / dist) * step).toFixed(2));
                nextY = Number((curY + (dy / dist) * step).toFixed(2));
            }

            void fetch(
                `/api/vehicles/${encodeURIComponent(targetVehicle.id)}/telemetry`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    body: JSON.stringify({
                        x: nextX,
                        y: nextY,
                        theta: nextTheta,
                        battery_percentage: Math.max(
                            8,
                            targetVehicle.battery_percentage - 1,
                        ),
                        status: 'active',
                    }),
                },
            )
                .then((r) => r.json())
                .then((json) => {
                    if (json?.data) {
                        setVehicles((prev) =>
                            prev.map((v) =>
                                v.id === targetVehicle.id ? json.data : v,
                            ),
                        );
                    }
                })
                .catch(() => {});
        }, 1200);

        return () => window.clearInterval(timer);
    }, [isLiveSim, simWaypointIdx, vehicles, waypoints, setVehicles]);

    return {
        isLiveSim,
        setIsLiveSim,
        simWaypointIdx,
        setSimWaypointIdx,
    };
}
