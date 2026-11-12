import { useEffect, useRef } from 'react';

export interface UseCanvasTouchGesturesProps {
    containerRef: React.RefObject<HTMLDivElement | null>;
    zoom: number;
    setZoom: React.Dispatch<React.SetStateAction<number>>;
    pan: { x: number; y: number };
    setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
    minZoom?: number;
    maxZoom?: number;
    mode?: string;
    onPanningChange?: (isPanning: boolean) => void;
}

type TouchState =
    | {
          type: 'pinch';
          startDist: number;
          startZoom: number;
          startPan: { x: number; y: number };
          startCenter: { x: number; y: number };
      }
    | {
          type: 'single-pending' | 'single-pan';
          startX: number;
          startY: number;
          startPan: { x: number; y: number };
      }
    | null;

export function useCanvasTouchGestures({
    containerRef,
    zoom,
    setZoom,
    pan,
    setPan,
    minZoom = 0.5,
    maxZoom = 3.5,
    mode = 'view',
    onPanningChange,
}: UseCanvasTouchGesturesProps) {
    const zoomRef = useRef(zoom);
    zoomRef.current = zoom;
    const panRef = useRef(pan);
    panRef.current = pan;
    const modeRef = useRef(mode);
    modeRef.current = mode;

    const touchStateRef = useRef<TouchState>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const [t1, t2] = [e.touches[0], e.touches[1]];
                const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
                const midX = (t1.clientX + t2.clientX) / 2;
                const midY = (t1.clientY + t2.clientY) / 2;

                touchStateRef.current = {
                    type: 'pinch',
                    startDist: Math.max(dist, 10),
                    startZoom: zoomRef.current,
                    startPan: { ...panRef.current },
                    startCenter: { x: midX, y: midY },
                };
                onPanningChange?.(true);
            } else if (e.touches.length === 1 && modeRef.current === 'view') {
                const t = e.touches[0];
                touchStateRef.current = {
                    type: 'single-pending',
                    startX: t.clientX,
                    startY: t.clientY,
                    startPan: { ...panRef.current },
                };
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            const state = touchStateRef.current;
            if (!state) return;

            if (state.type === 'pinch' && e.touches.length === 2) {
                e.preventDefault();
                const [t1, t2] = [e.touches[0], e.touches[1]];
                const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
                const midX = (t1.clientX + t2.clientX) / 2;
                const midY = (t1.clientY + t2.clientY) / 2;

                const scale = dist / state.startDist;
                const nextZoom = Math.min(
                    maxZoom,
                    Math.max(minZoom, Number((state.startZoom * scale).toFixed(2))),
                );

                const rect = container.getBoundingClientRect();
                const pinchCenterX = state.startCenter.x - rect.left - rect.width / 2;
                const pinchCenterY = state.startCenter.y - rect.top - rect.height / 2;
                const scaleRatio = nextZoom / state.startZoom;
                const deltaX = midX - state.startCenter.x;
                const deltaY = midY - state.startCenter.y;

                setZoom(nextZoom);
                setPan({
                    x: Number((pinchCenterX - (pinchCenterX - state.startPan.x) * scaleRatio + deltaX).toFixed(1)),
                    y: Number((pinchCenterY - (pinchCenterY - state.startPan.y) * scaleRatio + deltaY).toFixed(1)),
                });
            } else if ((state.type === 'single-pending' || state.type === 'single-pan') && e.touches.length === 1) {
                const t = e.touches[0];
                const dx = t.clientX - state.startX;
                const dy = t.clientY - state.startY;

                if (state.type === 'single-pending' && Math.hypot(dx, dy) > 8) {
                    state.type = 'single-pan';
                    onPanningChange?.(true);
                }

                if (state.type === 'single-pan') {
                    e.preventDefault();
                    setPan({
                        x: Number((state.startPan.x + dx).toFixed(1)),
                        y: Number((state.startPan.y + dy).toFixed(1)),
                    });
                }
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (e.touches.length === 0) {
                touchStateRef.current = null;
                onPanningChange?.(false);
            } else if (e.touches.length === 1 && modeRef.current === 'view') {
                const t = e.touches[0];
                touchStateRef.current = {
                    type: 'single-pan',
                    startX: t.clientX,
                    startY: t.clientY,
                    startPan: { ...panRef.current },
                };
            }
        };

        container.addEventListener('touchstart', handleTouchStart, { passive: false });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd);
        container.addEventListener('touchcancel', handleTouchEnd);

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
            container.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [containerRef, minZoom, maxZoom, onPanningChange, setPan, setZoom]);
}
