import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import type { FacilityMap } from '@/types';

interface LiveMapTopBarProps {
    maps: FacilityMap[];
    activeMap?: FacilityMap | null;
    activeSection: string;
    toastMessage: string | null;
    isLiveSim: boolean;
    setIsLiveSim: React.Dispatch<React.SetStateAction<boolean>>;
    mapView: 'active' | 'empty';
    setMapView: (mode: 'active' | 'empty') => void;
    showRobots: boolean;
    setShowRobots: (show: boolean) => void;
    showStations: boolean;
    setShowStations: (show: boolean) => void;
    showPaths: boolean;
    setShowPaths: (show: boolean) => void;
}

export function LiveMapTopBar({
    maps,
    activeMap,
    activeSection,
    toastMessage,
    isLiveSim,
    setIsLiveSim,
    mapView,
    setMapView,
    showRobots,
    setShowRobots,
    showStations,
    setShowStations,
    showPaths,
    setShowPaths,
}: LiveMapTopBarProps) {
    const isLive = activeSection === 'live-map';

    return (
        <div className="flex w-full flex-wrap items-center justify-between gap-3 p-4">
            {/* Left Facility / Hub Pill Group */}
            <div
                className={`flex flex-wrap items-center gap-2 rounded-xl border border-surface-container-high bg-surface-container-lowest/90 p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] backdrop-blur-md ${
                    isLive ? 'pointer-events-auto' : 'pointer-events-none'
                }`}
            >
                <div className="flex items-center gap-space-xs rounded-lg bg-surface-container-low px-3 py-1.5">
                    <span className="material-symbols-outlined text-[18px] text-primary">
                        factory
                    </span>
                    <div className="flex flex-col text-left">
                        <span className="font-label-sm text-[10px] leading-none text-tertiary uppercase">
                            Facility / Hub
                        </span>
                        {maps.length > 1 ? (
                            <select
                                value={activeMap?.id}
                                onChange={async (e) => {
                                    const targetId = Number(e.target.value);
                                    if (targetId && targetId !== activeMap?.id) {
                                        await fetch(`/api/maps/${targetId}/activate`, {
                                            method: 'POST',
                                            headers: { Accept: 'application/json' },
                                        });
                                        toast.success('Active map switched.');
                                        router.reload();
                                    }
                                }}
                                className="mt-0.5 cursor-pointer border-0 bg-transparent p-0 pr-4 font-headline-sm text-xs font-semibold text-on-surface focus:outline-none focus:ring-0"
                            >
                                {maps.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name} {m.is_active ? '★ (Active)' : ''}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <span className="mt-0.5 font-headline-sm text-label-lg leading-tight font-semibold text-on-surface">
                                {activeMap?.name ?? 'Production Plant Alpha — Zone 1'}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-surface-container px-3 py-1.5">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-primary-container" />
                    <span className="font-mono font-label-sm text-label-md font-medium text-on-surface">
                        {activeMap?.image_path ?? 'SLAM_Warehouse_V2.4'}
                    </span>
                    <span className="rounded bg-surface-container-lowest px-1.5 py-0.5 font-label-sm text-[10px] font-bold text-tertiary">
                        2D BLUEPRINT
                    </span>
                </div>
            </div>

            {/* Right Floating Control Cluster */}
            <div
                className={`flex flex-wrap items-center gap-2 rounded-xl border border-surface-container-high bg-surface-container-lowest/90 p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] backdrop-blur-md ${
                    isLive ? 'pointer-events-auto' : 'pointer-events-none'
                }`}
            >
                {toastMessage && (
                    <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 font-mono text-xs font-semibold text-primary">
                        {toastMessage}
                    </div>
                )}

                {/* Live Telemetry Simulator Toggle */}
                <button
                    type="button"
                    onClick={() => setIsLiveSim((prev) => !prev)}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-bold uppercase transition-all ${
                        isLiveSim
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
                    }`}
                >
                    <span
                        className={`h-2 w-2 rounded-full ${
                            isLiveSim ? 'animate-ping bg-white' : 'bg-slate-400'
                        }`}
                    />
                    {isLiveSim ? 'Live Sim: ON (10Hz)' : 'Live Sim: OFF'}
                </button>

                <div className="inline-flex rounded-lg bg-surface-container-high p-0.5 shadow-inner">
                    <button
                        type="button"
                        onClick={() => setMapView('active')}
                        className={`flex cursor-pointer items-center gap-1.5 rounded px-space-md py-1 font-label-md text-label-md transition-all ${
                            mapView === 'active'
                                ? 'bg-surface-container-lowest font-bold text-primary shadow-sm'
                                : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">map</span>
                        Active Map
                    </button>
                    <button
                        type="button"
                        onClick={() => setMapView('empty')}
                        className={`flex cursor-pointer items-center gap-1.5 rounded px-space-md py-1 font-label-md text-label-md transition-all ${
                            mapView === 'empty'
                                ? 'bg-surface-container-lowest font-bold text-primary shadow-sm'
                                : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">indeterminate_check_box</span>
                        Empty State
                    </button>
                </div>

                {/* Layer Toggles */}
                <div className="hidden items-center gap-space-xs rounded-lg bg-surface-container-low px-space-md py-1.5 xl:flex">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                        tune
                    </span>
                    <span className="font-label-md text-label-md font-semibold text-on-surface">
                        Layers:
                    </span>
                    <label className="ml-1 inline-flex cursor-pointer items-center gap-1 font-label-sm text-label-sm text-primary">
                        <input
                            type="checkbox"
                            checked={showRobots}
                            onChange={(e) => setShowRobots(e.target.checked)}
                            className="rounded accent-primary"
                        />{' '}
                        Robots
                    </label>
                    <span className="font-label-sm text-label-sm text-outline-variant">•</span>
                    <label className="inline-flex cursor-pointer items-center gap-1 font-label-sm text-label-sm text-on-surface">
                        <input
                            type="checkbox"
                            checked={showStations}
                            onChange={(e) => setShowStations(e.target.checked)}
                            className="rounded accent-primary"
                        />{' '}
                        Stations
                    </label>
                    <span className="font-label-sm text-label-sm text-outline-variant">•</span>
                    <label className="inline-flex cursor-pointer items-center gap-1 font-label-sm text-label-sm text-tertiary">
                        <input
                            type="checkbox"
                            checked={showPaths}
                            onChange={(e) => setShowPaths(e.target.checked)}
                            className="rounded accent-primary"
                        />{' '}
                        Lanes
                    </label>
                </div>
            </div>
        </div>
    );
}
