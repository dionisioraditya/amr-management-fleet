import { toast } from 'sonner';
import type { FacilityMap, Waypoint } from '@/types';
import { StationDirectoryTable } from './StationDirectoryTable';
import { StationInspectorCard } from './StationInspectorCard';
import { StationKpiSummary } from './StationKpiSummary';
import { StationPickIndicator } from './StationPickIndicator';

interface StationsCockpitProps {
    activeSection: string;
    activeMap?: FacilityMap | null;
    waypoints: Waypoint[];
    filteredWaypoints: Waypoint[];
    selectedWaypoint: Waypoint | null;
    setSelectedWaypoint: (wp: Waypoint | null) => void;
    zoneFilter: 'all' | 'charging' | 'pd' | 'standby';
    setZoneFilter: (filter: 'all' | 'charging' | 'pd' | 'standby') => void;
    stationSnapEnabled: boolean;
    setStationSnapEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    stationPickMode: boolean;
    setStationPickMode: (pick: boolean) => void;
    stationChargingCount: number;
    stationPdCount: number;
    stationStandbyCount: number;
    activeInspectedStation: Waypoint | null;
    openCreateStationModal: () => void;
    openEditStationModal: (wp: Waypoint) => void;
    handleDeleteStation: (wp: Waypoint) => void;
    editingStation?: Waypoint | null;
    onStartPickNewStation?: () => void;
    onCancelStationPick?: () => void;
}

export function StationsCockpit({
    activeSection,
    activeMap,
    waypoints,
    filteredWaypoints,
    selectedWaypoint,
    setSelectedWaypoint,
    zoneFilter,
    setZoneFilter,
    stationSnapEnabled,
    setStationSnapEnabled,
    stationPickMode,
    setStationPickMode,
    stationChargingCount,
    stationPdCount,
    stationStandbyCount,
    activeInspectedStation,
    openCreateStationModal,
    openEditStationModal,
    handleDeleteStation,
    editingStation,
    onStartPickNewStation,
    onCancelStationPick,
}: StationsCockpitProps) {
    const isStations = activeSection === 'stations';

    return (
        <>
            {/* Top Right Pick Indicator / Snap controls */}
            {isStations && (
                <StationPickIndicator
                    stationPickMode={stationPickMode}
                    setStationPickMode={setStationPickMode}
                    stationSnapEnabled={stationSnapEnabled}
                    setStationSnapEnabled={setStationSnapEnabled}
                    onStartPick={onStartPickNewStation ?? (() => setStationPickMode(true))}
                    editingStation={editingStation}
                    onCancelPick={onCancelStationPick}
                />
            )}

            {/* Bottom World Frame Badge */}
            <div
                className={`pointer-events-auto absolute bottom-4 left-[580px] z-20 hidden items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container-lowest/90 px-3 py-1.5 font-label-sm text-label-sm text-tertiary shadow-sm backdrop-blur-md transition-all duration-500 ease-spring xl:flex ${
                    isStations
                        ? 'translate-y-0 opacity-100 scale-100'
                        : 'pointer-events-none translate-y-4 opacity-0 scale-95'
                }`}
            >
                <span className="material-symbols-outlined text-[14px] text-primary">explore</span>
                <span>ROS World Frame [map]</span>
                <span className="text-outline-variant">•</span>
                <span>Origin: [{activeMap?.origin_x ?? -10}, {activeMap?.origin_y ?? -10}]</span>
                <span className="text-outline-variant">•</span>
                <span className="font-mono font-medium text-primary">Nav2 Costmap Active</span>
            </div>

            {/* Left Sliding Sidebar */}
            <aside
                aria-hidden={!isStations}
                className={`absolute top-0 bottom-0 left-0 z-20 flex h-full w-full max-w-[560px] flex-col overflow-y-auto border-r border-slate-200/60 bg-white/40 backdrop-blur-sm transition-all duration-500 ease-spring ${
                    isStations
                        ? 'pointer-events-auto translate-x-0 opacity-100 scale-100'
                        : 'pointer-events-none -translate-x-12 opacity-0 scale-[0.98]'
                }`}
            >
                <div className="flex flex-col gap-space-md p-margin-lg">
                    {/* Floating Top Command & Action Bar */}
                    <div className="flex flex-col gap-space-md rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs lg:p-space-lg">
                        <div className="flex items-start justify-between gap-space-sm">
                            <div className="flex flex-col">
                                <div className="flex flex-wrap items-center gap-space-sm">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-high text-primary">
                                        <span className="material-symbols-outlined text-[20px]">ev_station</span>
                                    </span>
                                    <h1 className="font-headline-md text-headline-md font-bold tracking-tight text-on-surface uppercase lg:font-headline-lg">
                                        Station Management
                                    </h1>
                                    <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-label-sm text-label-sm font-semibold text-secondary uppercase">
                                        {activeMap?.name ?? 'Main Logistics Hall'}
                                    </span>
                                </div>
                                <p className="mt-1 font-body-sm text-body-sm text-tertiary">
                                    Configure Nav2 docking waypoints, charging bays, and P&amp;D nodes.
                                </p>
                            </div>
                        </div>

                        {/* Actions & Zone Filter */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center rounded-lg bg-surface-container-low px-space-sm py-1.5 shadow-2xs">
                                <span className="material-symbols-outlined mr-1.5 text-[18px] text-tertiary">tune</span>
                                <label className="mr-1.5 font-label-sm text-label-sm text-on-surface-variant uppercase" htmlFor="zone-filter">
                                    Filter:
                                </label>
                                <select
                                    id="zone-filter"
                                    value={zoneFilter}
                                    onChange={(e) => setZoneFilter(e.target.value as any)}
                                    className="cursor-pointer bg-transparent font-label-md text-label-md font-semibold text-on-surface focus:outline-none"
                                >
                                    <option value="all">All Stations ({waypoints.length})</option>
                                    <option value="charging">Charging Hub ({stationChargingCount})</option>
                                    <option value="pd">Pick &amp; Drop Bays ({stationPdCount})</option>
                                    <option value="standby">Standby &amp; QC ({stationStandbyCount})</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStationSnapEnabled((s) => {
                                            const next = !s;
                                            toast.info(next ? 'Grid Snap: 0.50m ON' : 'Grid Snap: OFF (Freeform)');
                                            return next;
                                        });
                                    }}
                                    className={`flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold transition-all ${
                                        stationSnapEnabled
                                            ? 'border border-primary/30 bg-primary/10 text-primary'
                                            : 'bg-surface-container-high text-tertiary hover:bg-surface-container-highest'
                                    }`}
                                    title="Toggle 0.50m grid snap when picking station coordinates"
                                >
                                    <span className="material-symbols-outlined text-[15px]">grid_3x3</span>
                                    <span>{stationSnapEnabled ? 'Snap 0.5m' : 'Snap Off'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={onStartPickNewStation ?? (() => setStationPickMode(true))}
                                    className="flex cursor-pointer items-center gap-1 rounded-lg bg-surface-container-high px-2.5 py-1.5 font-label-md text-label-md text-on-surface transition-all hover:bg-surface-container-highest"
                                >
                                    <span className="material-symbols-outlined text-[16px] text-secondary">pin_drop</span>
                                    <span>Pick on Map</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={openCreateStationModal}
                                    className="flex cursor-pointer items-center gap-1 rounded-lg bg-primary-container px-3 py-1.5 font-label-md text-label-md font-semibold tracking-wider text-on-primary-container uppercase shadow-md transition-all hover:bg-primary hover:text-on-primary"
                                >
                                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                                    <span>+ ADD STATION</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <StationKpiSummary
                        totalCount={waypoints.length}
                        chargingCount={stationChargingCount}
                        pdCount={stationPdCount}
                        standbyCount={stationStandbyCount}
                    />

                    <StationInspectorCard
                        station={activeInspectedStation}
                        onEditStation={openEditStationModal}
                        onDeleteStation={handleDeleteStation}
                    />

                    <StationDirectoryTable
                        waypoints={filteredWaypoints}
                        selectedWaypoint={selectedWaypoint}
                        onSelectWaypoint={setSelectedWaypoint}
                        onEditStation={openEditStationModal}
                        onDeleteStation={handleDeleteStation}
                    />
                </div>
            </aside>
        </>
    );
}
