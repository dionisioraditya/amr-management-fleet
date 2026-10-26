import { useEffect, useRef, useState } from 'react';

export interface UseCanvasViewportOptions {
    minZoom?: number;
    maxZoom?: number;
    initialZoom?: number;
}

export function useCanvasViewport(options: UseCanvasViewportOptions = {}) {
    const { minZoom = 0.5, maxZoom = 3.5, initialZoom = 1 } = options;

    const containerRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(initialZoom);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    const zoomRef = useRef(zoom);
    zoomRef.current = zoom;
    const panRef = useRef(pan);
    panRef.current = pan;

    // Intercept Ctrl + Scroll (and trackpad pinch-zoom) so that ONLY the map zooms,
    // preventing the browser from zooming the entire dashboard web page.
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();

                const currentZoom = zoomRef.current;
                const currentPan = panRef.current;

                const factor = e.deltaY < 0 ? 1.15 : 0.85;
                const nextZoom = Math.min(
                    maxZoom,
                    Math.max(minZoom, Number((currentZoom * factor).toFixed(2))),
                );

                if (nextZoom === currentZoom) return;

                const rect = container.getBoundingClientRect();
                const mouseX = e.clientX - rect.left - rect.width / 2;
                const mouseY = e.clientY - rect.top - rect.height / 2;

                const scaleRatio = nextZoom / currentZoom;
                const nextPanX = Number(
                    (mouseX - (mouseX - currentPan.x) * scaleRatio).toFixed(1),
                );
                const nextPanY = Number(
                    (mouseY - (mouseY - currentPan.y) * scaleRatio).toFixed(1),
                );

                setZoom(nextZoom);
                setPan({ x: nextPanX, y: nextPanY });
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, [minZoom, maxZoom]);

    const startPan = (clientX: number, clientY: number) => {
        setIsPanning(true);
        setPanStart({ x: clientX - pan.x, y: clientY - pan.y });
    };

    const updatePan = (clientX: number, clientY: number) => {
        setPan({
            x: clientX - panStart.x,
            y: clientY - panStart.y,
        });
    };

    const endPan = () => {
        setIsPanning(false);
    };

    const resetView = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    const zoomIn = () => {
        setZoom((prev) => Math.min(maxZoom, Number((prev + 0.25).toFixed(2))));
    };

    const zoomOut = () => {
        setZoom((prev) => Math.max(minZoom, Number((prev - 0.25).toFixed(2))));
    };

    return {
        containerRef,
        zoom,
        setZoom,
        pan,
        setPan,
        isPanning,
        startPan,
        updatePan,
        endPan,
        resetView,
        zoomIn,
        zoomOut,
    };
}
