import type { PathCoordinate } from '@/types';

export type AngleConstraintMode = 'ortho-45' | 'ortho-90' | 'free';

/**
 * Projects rawPoint onto an orthogonal (0°/90°) or 45°-increment axis relative to prevPoint.
 */
export function applyAngleConstraint(
    prevPoint: PathCoordinate,
    rawPoint: { x: number; y: number },
    constraintMode: AngleConstraintMode = 'ortho-45',
    shiftKey = false,
    snapStep = 0.5,
): { x: number; y: number; angleDeg: number; lengthM: number } {
    const dx = rawPoint.x - prevPoint.x;
    const dy = rawPoint.y - prevPoint.y;
    const rawDist = Math.hypot(dx, dy);

    if (rawDist < 1e-4) {
        return { x: prevPoint.x, y: prevPoint.y, angleDeg: 0, lengthM: 0 };
    }

    const effectiveMode =
        constraintMode === 'free' && shiftKey ? 'ortho-45' : constraintMode;

    let finalX = rawPoint.x;
    let finalY = rawPoint.y;

    if (effectiveMode === 'ortho-90') {
        if (Math.abs(dx) >= Math.abs(dy)) {
            finalX = rawPoint.x;
            finalY = prevPoint.y;
        } else {
            finalX = prevPoint.x;
            finalY = rawPoint.y;
        }
    } else if (effectiveMode === 'ortho-45') {
        const theta = Math.atan2(dy, dx);
        const sector = Math.round(theta / (Math.PI / 4)); // -4 to +4
        const absSector = Math.abs(sector);

        if (absSector === 0 || absSector === 4) {
            finalX = rawPoint.x;
            finalY = prevPoint.y;
        } else if (absSector === 2) {
            finalX = prevPoint.x;
            finalY = rawPoint.y;
        } else {
            const diagDist = Math.SQRT1_2 * (Math.abs(dx) + Math.abs(dy));
            const signX = Math.cos(sector * (Math.PI / 4)) > 0 ? 1 : -1;
            const signY = Math.sin(sector * (Math.PI / 4)) > 0 ? 1 : -1;
            finalX = prevPoint.x + signX * diagDist * Math.SQRT1_2;
            finalY = prevPoint.y + signY * diagDist * Math.SQRT1_2;
        }
    }

    if (snapStep > 0) {
        const snap = (v: number) => Math.round(v / snapStep) * snapStep;
        if (effectiveMode === 'ortho-90') {
            if (finalY === prevPoint.y) finalX = snap(finalX);
            else finalY = snap(finalY);
        } else if (effectiveMode === 'free') {
            finalX = snap(finalX);
            finalY = snap(finalY);
        } else {
            finalX = snap(finalX);
            finalY = snap(finalY);
        }
    }

    const effectiveDx = finalX - prevPoint.x;
    const effectiveDy = finalY - prevPoint.y;
    const lengthM = Math.hypot(effectiveDx, effectiveDy);
    let angleDeg = (Math.atan2(effectiveDy, effectiveDx) * 180) / Math.PI;
    if (angleDeg < 0) angleDeg += 360;

    return {
        x: Number(finalX.toFixed(3)),
        y: Number(finalY.toFixed(3)),
        angleDeg: Number(angleDeg.toFixed(1)),
        lengthM: Number(lengthM.toFixed(2)),
    };
}
