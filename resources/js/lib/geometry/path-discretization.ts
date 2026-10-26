import type { PathCoordinate } from '@/types';
import { computeFilletedPathGeometry } from './fillet-geometry';

/**
 * Discretizes a filleted path into dense ROS 2 `nav_msgs/msg/Path` poses
 * ({ x, y, theta, kappa }) for Pure Pursuit / Regulated Pure Pursuit controllers.
 */
export function discretizeFilletedPathForRos2(
    coords: PathCoordinate[],
    defaultCornerRadius = 0.8,
    stepMeters = 0.15,
): { x: number; y: number; theta: number; kappa: number }[] {
    if (!coords || coords.length < 2) {
        return [];
    }

    const geom = computeFilletedPathGeometry(coords, defaultCornerRadius);
    const poses: { x: number; y: number; theta: number; kappa: number }[] = [];

    const appendLineSegment = (
        pStart: { x: number; y: number },
        pEnd: { x: number; y: number },
    ) => {
        const dx = pEnd.x - pStart.x;
        const dy = pEnd.y - pStart.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 1e-4) return;
        const theta = Number(Math.atan2(dy, dx).toFixed(4));
        const steps = Math.max(1, Math.ceil(dist / stepMeters));
        for (let s = 0; s < steps; s++) {
            const t = s / steps;
            poses.push({
                x: Number((pStart.x + t * dx).toFixed(3)),
                y: Number((pStart.y + t * dy).toFixed(3)),
                theta,
                kappa: 0.0,
            });
        }
    };

    let currentPt = { x: coords[0].x, y: coords[0].y };

    for (const c of geom.corners) {
        appendLineSegment(currentPt, c.tangentIn);
        if (c.effectiveRadius > 0.01 && c.arcLengthM > 1e-3) {
            const phiIn = Math.atan2(
                c.tangentIn.y - c.arcCenter.y,
                c.tangentIn.x - c.arcCenter.x,
            );
            const phiOut = Math.atan2(
                c.tangentOut.y - c.arcCenter.y,
                c.tangentOut.x - c.arcCenter.x,
            );
            let dPhi = phiOut - phiIn;
            while (dPhi > Math.PI) dPhi -= 2 * Math.PI;
            while (dPhi <= -Math.PI) dPhi += 2 * Math.PI;

            const arcSteps = Math.max(2, Math.ceil(c.arcLengthM / stepMeters));
            const turnSign = dPhi >= 0 ? 1 : -1;
            const kappa = Number((turnSign / c.effectiveRadius).toFixed(4));

            for (let s = 0; s < arcSteps; s++) {
                const t = s / arcSteps;
                const phi = phiIn + t * dPhi;
                let heading = phi + turnSign * (Math.PI / 2);
                while (heading > Math.PI) heading -= 2 * Math.PI;
                while (heading <= -Math.PI) heading += 2 * Math.PI;

                poses.push({
                    x: Number(
                        (
                            c.arcCenter.x +
                            c.effectiveRadius * Math.cos(phi)
                        ).toFixed(3),
                    ),
                    y: Number(
                        (
                            c.arcCenter.y +
                            c.effectiveRadius * Math.sin(phi)
                        ).toFixed(3),
                    ),
                    theta: Number(heading.toFixed(4)),
                    kappa,
                });
            }
            currentPt = c.tangentOut;
        } else {
            currentPt = c.vertex;
        }
    }

    const finalPt = coords[coords.length - 1];
    appendLineSegment(currentPt, finalPt);

    const lastHeading =
        poses.length > 0
            ? poses[poses.length - 1].theta
            : Number(
                  Math.atan2(
                      finalPt.y - coords[0].y,
                      finalPt.x - coords[0].x,
                  ).toFixed(4),
              );
    poses.push({
        x: Number(finalPt.x.toFixed(3)),
        y: Number(finalPt.y.toFixed(3)),
        theta: lastHeading,
        kappa: 0.0,
    });

    return poses;
}
