import { StatusBadge } from '@/components/fleet/status-badge';
import type { Vehicle } from '@/types';

interface ActiveAmrInspectorCardProps {
    activeVehicle: Vehicle | null;
    vehicles: Vehicle[];
    onSelectVehicleId: (id: string) => void;
}

export function ActiveAmrInspectorCard({
    activeVehicle,
    vehicles,
    onSelectVehicleId,
}: ActiveAmrInspectorCardProps) {
    if (!activeVehicle) return null;

    return (
        <div className="w-84 rounded-xl border border-surface-container-high bg-surface-container-lowest/95 p-space-md shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md">
            <div className="flex items-center justify-between pb-space-xs">
                <div className="flex items-center gap-space-xs">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary-container" />
                    <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                        {activeVehicle.id} ({activeVehicle.name})
                    </span>
                </div>
                <StatusBadge status={activeVehicle.status} />
            </div>

            {/* Unit Selector Pills */}
            {vehicles.length > 1 && (
                <div className="mb-2 flex flex-wrap gap-1">
                    {vehicles.map((v) => (
                        <button
                            key={v.id}
                            type="button"
                            onClick={() => onSelectVehicleId(v.id)}
                            className={`cursor-pointer rounded px-2 py-0.5 font-mono text-[10px] font-bold transition-colors ${
                                v.id === activeVehicle.id
                                    ? 'bg-primary text-white'
                                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                            }`}
                        >
                            {v.id}
                        </button>
                    ))}
                </div>
            )}

            <div className="my-space-xs grid grid-cols-2 gap-space-xs rounded-lg bg-surface-container-low p-space-sm text-left">
                <div>
                    <span className="block font-label-sm text-label-sm text-tertiary">BATTERY</span>
                    <span className="font-label-lg text-label-lg font-bold text-on-surface">
                        {activeVehicle.battery_percentage}%{' '}
                        <span className="font-label-sm text-[10px] text-primary">(48.2 V)</span>
                    </span>
                </div>
                <div>
                    <span className="block font-label-sm text-label-sm text-tertiary">IP HOST</span>
                    <span className="font-label-lg text-label-lg font-bold text-on-surface">
                        {activeVehicle.ip_address}
                    </span>
                </div>
                <div>
                    <span className="block font-label-sm text-label-sm text-tertiary">POSE [X, Y]</span>
                    <span className="font-label-lg text-label-lg font-bold text-on-surface">
                        [{activeVehicle.pose?.x?.toFixed(1) ?? '0.0'},{' '}
                        {activeVehicle.pose?.y?.toFixed(1) ?? '0.0'}]
                    </span>
                </div>
                <div>
                    <span className="block font-label-sm text-label-sm text-tertiary">SAFETY SCAN</span>
                    <span className="font-label-lg text-label-lg font-bold text-primary">CLEAR 360°</span>
                </div>
            </div>
        </div>
    );
}
