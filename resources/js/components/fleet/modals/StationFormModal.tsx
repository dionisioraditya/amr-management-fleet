import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { FacilityMap, Vehicle, Waypoint } from '@/types';

interface StationFormModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    editingStation: Waypoint | null;
    activeMap?: FacilityMap | null;
    stationFormName: string;
    setStationFormName: (val: string) => void;
    stationFormType: 'charging' | 'pickup' | 'dropoff' | 'standby';
    handleStationTypePresetChange: (type: 'charging' | 'pickup' | 'dropoff' | 'standby') => void;
    stationSnapEnabled: boolean;
    setStationSnapEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    setStationPickMode: (pick: boolean) => void;
    activeVehicle?: Vehicle | null;
    stationFormX: string;
    setStationFormX: (val: string) => void;
    stationFormY: string;
    setStationFormY: (val: string) => void;
    stationFormYawDeg: string;
    setStationFormYawDeg: (val: string) => void;
    handleSaveStation: (e: React.FormEvent) => void;
    savingStation: boolean;
}

export function StationFormModal({
    isOpen,
    onOpenChange,
    editingStation,
    activeMap,
    stationFormName,
    setStationFormName,
    stationFormType,
    handleStationTypePresetChange,
    stationSnapEnabled,
    setStationSnapEnabled,
    setStationPickMode,
    activeVehicle,
    stationFormX,
    setStationFormX,
    stationFormY,
    setStationFormY,
    stationFormYawDeg,
    setStationFormYawDeg,
    handleSaveStation,
    savingStation,
}: StationFormModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 font-headline-md text-lg font-bold text-on-surface uppercase">
                        <span className="material-symbols-outlined text-[22px] text-primary">
                            add_location_alt
                        </span>
                        {editingStation
                            ? `Edit Station ${editingStation.name}`
                            : 'Register Station Waypoint'}
                    </DialogTitle>
                    <DialogDescription className="font-body-sm text-xs text-tertiary">
                        Register a docking or buffer waypoint node on ROS 2 Nav2 map ({activeMap?.name ?? 'Active Map'}).
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSaveStation} className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block font-label-sm text-label-sm text-tertiary uppercase">
                                Station ID Code
                            </label>
                            <input
                                type="text"
                                required
                                value={stationFormName}
                                onChange={(e) => setStationFormName(e.target.value)}
                                placeholder="e.g. ST-CHARGE-03"
                                className="h-10 w-full rounded-lg border border-slate-200 bg-surface-container-low px-3 font-mono text-xs font-bold text-on-surface focus:border-primary-container focus:bg-white focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block font-label-sm text-label-sm text-tertiary uppercase">
                                Station Functional Type
                            </label>
                            <select
                                value={stationFormType}
                                onChange={(e) => handleStationTypePresetChange(e.target.value as any)}
                                className="h-10 w-full rounded-lg border border-slate-200 bg-surface-container-low px-3 font-label-md text-xs text-on-surface focus:border-primary-container focus:bg-white focus:outline-none"
                            >
                                <option value="charging">⚡ Supercharge Station (DC 48V)</option>
                                <option value="pickup">📦 Pallet Pick-up Bay</option>
                                <option value="dropoff">📥 Drop-off Assembly Buffer</option>
                                <option value="standby">⏸ Standby / QC Node</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <div className="mb-1.5 flex items-center justify-between">
                            <label className="font-label-sm text-label-sm text-tertiary uppercase">
                                SLAM Coordinate Vector (Pose 2D)
                            </label>
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
                                    className={`flex cursor-pointer items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px] font-semibold transition-all ${
                                        stationSnapEnabled
                                            ? 'bg-primary/10 text-primary'
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                                    title="Toggle 0.50m Grid Snap"
                                >
                                    <span className="material-symbols-outlined text-[13px]">grid_3x3</span>
                                    <span>{stationSnapEnabled ? 'Snap 0.5m' : 'Snap Off'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onOpenChange(false);
                                        setStationPickMode(true);
                                    }}
                                    className="flex cursor-pointer items-center gap-1 font-label-sm text-label-sm text-secondary hover:underline"
                                >
                                    <span className="material-symbols-outlined text-[14px]">pin_drop</span>
                                    Pick on Map
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStationFormX(String(activeVehicle?.pose?.x?.toFixed(2) ?? '8.42'));
                                        setStationFormY(String(activeVehicle?.pose?.y?.toFixed(2) ?? '5.12'));
                                        setStationFormYawDeg('45');
                                        toast.info(`Fetched live pose from ${activeVehicle?.id ?? 'AMR-01'}`);
                                    }}
                                    className="flex cursor-pointer items-center gap-1 font-label-sm text-label-sm text-primary hover:underline"
                                >
                                    <span className="material-symbols-outlined text-[14px]">my_location</span>
                                    Fetch {activeVehicle?.id ?? 'AMR-01'} Pose
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5">
                            <div className="rounded-lg border border-slate-200 bg-surface-container-low p-2">
                                <label className="block font-mono text-[10px] text-tertiary">X (Meters)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={stationFormX}
                                    onChange={(e) => setStationFormX(e.target.value)}
                                    className="mt-1 w-full bg-transparent font-mono text-xs font-bold text-on-surface focus:outline-none"
                                />
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-surface-container-low p-2">
                                <label className="block font-mono text-[10px] text-tertiary">Y (Meters)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={stationFormY}
                                    onChange={(e) => setStationFormY(e.target.value)}
                                    className="mt-1 w-full bg-transparent font-mono text-xs font-bold text-on-surface focus:outline-none"
                                />
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-surface-container-low p-2">
                                <label className="block font-mono text-[10px] text-tertiary">Yaw (Degrees)</label>
                                <input
                                    type="number"
                                    step="1"
                                    required
                                    value={stationFormYawDeg}
                                    onChange={(e) => setStationFormYawDeg(e.target.value)}
                                    className="mt-1 w-full bg-transparent font-mono text-xs font-bold text-primary focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="rounded-lg bg-surface-container px-4 py-2 font-label-md text-xs font-semibold text-on-surface uppercase hover:bg-surface-container-high"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={savingStation}
                            className="rounded-lg bg-primary-container px-5 py-2 font-label-md text-xs font-bold tracking-wider text-on-primary-container uppercase shadow-md hover:bg-primary hover:text-on-primary"
                        >
                            {savingStation ? 'Saving...' : 'Save Station'}
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
