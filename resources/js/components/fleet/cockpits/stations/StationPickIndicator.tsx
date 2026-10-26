import { toast } from 'sonner';
import type { Waypoint } from '@/types';

interface StationPickIndicatorProps {
    stationPickMode: boolean;
    setStationPickMode: (pick: boolean) => void;
    stationSnapEnabled: boolean;
    setStationSnapEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    onStartPick: () => void;
    editingStation?: Waypoint | null;
    onCancelPick?: () => void;
}

export function StationPickIndicator({
    stationPickMode,
    setStationPickMode,
    stationSnapEnabled,
    setStationSnapEnabled,
    onStartPick,
    editingStation,
    onCancelPick,
}: StationPickIndicatorProps) {
    if (stationPickMode) {
        return (
            <div className="absolute top-4 right-6 z-30 flex animate-pulse items-center gap-3 rounded-xl bg-on-surface px-4 py-2.5 text-white shadow-lg">
                <span className="material-symbols-outlined text-[20px] text-primary-container">
                    pin_drop
                </span>
                <div>
                    <div className="font-headline-sm text-xs font-bold uppercase">
                        {editingStation ? `Relocating: ${editingStation.name}` : 'Station Pick Mode Active'}
                    </div>
                    <div className="font-label-sm text-[10px] text-slate-300">
                        {editingStation
                            ? `Click anywhere on the blueprint to update coordinates for ${editingStation.name}.`
                            : 'Click anywhere on the blueprint canvas to capture [X, Y] coordinates.'}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setStationSnapEnabled((s) => {
                            const next = !s;
                            toast.info(next ? 'Grid Snap: 0.50m ON' : 'Grid Snap: OFF (Freeform)');
                            return next;
                        });
                    }}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-xs font-semibold transition-all ${
                        stationSnapEnabled
                            ? 'bg-primary text-white shadow-xs'
                            : 'bg-white/15 text-slate-300 hover:bg-white/25'
                    }`}
                    title="Toggle 0.50m Grid Snap"
                >
                    <span className="material-symbols-outlined text-[15px]">grid_3x3</span>
                    <span>{stationSnapEnabled ? 'Snap: 0.50m' : 'Snap: OFF (Free)'}</span>
                </button>
                <button
                    type="button"
                    onClick={() => {
                        if (onCancelPick) {
                            onCancelPick();
                        } else {
                            setStationPickMode(false);
                        }
                    }}
                    className="rounded bg-white/15 px-2.5 py-1 font-label-sm text-[10px] font-bold uppercase hover:bg-white/25"
                >
                    Cancel
                </button>
            </div>
        );
    }

    return (
        <div className="pointer-events-auto absolute top-4 right-6 z-20 hidden items-center gap-2 rounded-xl border border-slate-200/80 bg-white/95 px-3 py-1.5 shadow-md backdrop-blur-md xl:flex">
            <button
                type="button"
                onClick={() => {
                    setStationSnapEnabled((s) => {
                        const next = !s;
                        toast.info(next ? 'Grid Snap: 0.50m ON' : 'Grid Snap: OFF (Freeform)');
                        return next;
                    });
                }}
                className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-xs font-semibold transition-all ${
                    stationSnapEnabled
                        ? 'bg-primary-container font-semibold text-on-primary-container shadow-2xs'
                        : 'text-on-surface-variant hover:bg-slate-100'
                }`}
                title="Toggle 0.5m grid snap for station coordinate picking"
            >
                <span className="material-symbols-outlined text-[16px]">grid_3x3</span>
                <span>{stationSnapEnabled ? 'Snap 0.5m' : 'Freeform'}</span>
            </button>
            <button
                type="button"
                onClick={onStartPick}
                className="flex cursor-pointer items-center gap-1 rounded-lg bg-secondary/10 px-2.5 py-1 font-label-sm text-xs font-bold text-secondary transition hover:bg-secondary hover:text-white"
            >
                <span className="material-symbols-outlined text-[15px]">pin_drop</span>
                <span>Pick on Map</span>
            </button>
        </div>
    );
}
