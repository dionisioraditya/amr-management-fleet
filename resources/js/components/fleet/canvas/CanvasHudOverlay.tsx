interface CanvasHudOverlayProps {
    hudPosition?: 'top-right' | 'bottom-right';
    cursorMetric: { x: number; y: number; u?: number; v?: number };
    resolution: number;
    zoom: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetView: () => void;
}

export function CanvasHudOverlay({
    hudPosition = 'bottom-right',
    cursorMetric,
    resolution,
    zoom,
    onZoomIn,
    onZoomOut,
    onResetView,
}: CanvasHudOverlayProps) {
    return (
        <div
            className={`pointer-events-auto absolute right-4 z-20 flex items-center gap-2 rounded-xl border border-slate-200/80 bg-surface-container-lowest/95 px-3 py-1.5 shadow-md backdrop-blur-md ${
                hudPosition === 'top-right' ? 'top-4' : 'bottom-4'
            }`}
        >
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-on-surface-variant">
                <span className="material-symbols-outlined text-[15px] text-primary">
                    near_me
                </span>
                <span>
                    X:{' '}
                    <strong className="text-on-surface">
                        {cursorMetric.x.toFixed(2)}m
                    </strong>
                </span>
                <span className="text-outline-variant">|</span>
                <span>
                    Y:{' '}
                    <strong className="text-on-surface">
                        {cursorMetric.y.toFixed(2)}m
                    </strong>
                </span>
                {cursorMetric.u !== undefined && cursorMetric.v !== undefined && (
                    <>
                        <span className="text-outline-variant">|</span>
                        <span>
                            PGM:[
                            <strong className="text-primary">
                                {cursorMetric.u},{cursorMetric.v}
                            </strong>
                            ]
                        </span>
                    </>
                )}
                <span className="text-outline-variant">|</span>
                <span>
                    RES: <strong>{resolution}m/px</strong>
                </span>
            </div>

            <div className="h-4 w-px bg-slate-200" />

            <div className="flex items-center gap-0.5">
                <button
                    type="button"
                    onClick={onZoomIn}
                    title="Zoom In (or Ctrl + Scroll Up)"
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded hover:bg-surface-container"
                >
                    <span className="material-symbols-outlined text-[17px]">
                        add
                    </span>
                </button>
                <span className="px-1 font-mono text-[10px] font-semibold text-on-surface">
                    {Math.round(zoom * 100)}%
                </span>
                <button
                    type="button"
                    onClick={onZoomOut}
                    title="Zoom Out (or Ctrl + Scroll Down)"
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded hover:bg-surface-container"
                >
                    <span className="material-symbols-outlined text-[17px]">
                        remove
                    </span>
                </button>
                <button
                    type="button"
                    onClick={onResetView}
                    title="Reset View Center"
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded hover:bg-surface-container"
                >
                    <span className="material-symbols-outlined text-[16px]">
                        center_focus_strong
                    </span>
                </button>
            </div>
        </div>
    );
}
