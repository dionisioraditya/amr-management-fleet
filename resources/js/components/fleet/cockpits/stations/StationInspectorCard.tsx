import { classifyStation, radToDeg } from '@/constants/fleet.constants';
import type { Waypoint } from '@/types';

interface StationInspectorCardProps {
    station: Waypoint | null;
    onEditStation: (wp: Waypoint) => void;
    onDeleteStation: (wp: Waypoint) => void;
}

export function StationInspectorCard({
    station,
    onEditStation,
    onDeleteStation,
}: StationInspectorCardProps) {
    if (!station) return null;

    const info = classifyStation(station.name);
    const yawDeg = radToDeg(station.theta);

    return (
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs lg:p-space-lg">
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-label-sm text-label-sm text-tertiary uppercase">
                            INSPECTOR
                        </span>
                        <span className="rounded bg-surface-container px-2 py-0.5 font-mono font-label-sm text-label-sm font-bold text-primary">
                            {station.name}
                        </span>
                    </div>
                    <h2 className="mt-1 font-headline-md text-headline-md font-bold text-on-surface">
                        {info.label} Node #{station.id}
                    </h2>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => onEditStation(station)}
                        className="flex cursor-pointer items-center gap-1 rounded-lg bg-surface-container px-2.5 py-1 font-label-sm text-xs font-semibold text-primary hover:bg-surface-container-high"
                    >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => onDeleteStation(station)}
                        className="flex cursor-pointer items-center gap-1 rounded-lg bg-error-container/60 px-2.5 py-1 font-label-sm text-xs font-semibold text-error hover:bg-error-container"
                    >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                    </button>
                </div>
            </div>

            {/* Target Focus Zoom & Alignment Radar */}
            <div className="relative mt-space-md flex h-32 w-full items-center justify-center overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-low/90">
                <svg className="absolute inset-0 h-full w-full opacity-40" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern height="16" id="inspect-grid-compact" patternUnits="userSpaceOnUse" width="16">
                            <path
                                className="text-outline-variant"
                                d="M 16 0 L 0 0 0 16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="0.5"
                            />
                        </pattern>
                    </defs>
                    <rect fill="url(#inspect-grid-compact)" height="100%" width="100%" />
                    <circle
                        className="text-primary/25"
                        cx="50%"
                        cy="50%"
                        fill="none"
                        r="42"
                        stroke="currentColor"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                    />
                </svg>
                <div className="relative z-10 flex flex-col items-center">
                    <div className="relative flex h-9 w-9 items-center justify-center rounded-full border border-primary bg-surface-container-lowest shadow-lg">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-container opacity-40" />
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-on-primary">
                            <span
                                className="material-symbols-outlined text-[14px]"
                                style={{ transform: `rotate(${yawDeg}deg)` }}
                            >
                                navigation
                            </span>
                        </div>
                    </div>
                    <div className="mt-1.5 rounded bg-inverse-surface/90 px-2.5 py-0.5 text-center shadow">
                        <span className="font-mono font-label-sm text-label-sm font-bold text-inverse-on-surface">
                            X: {station.x.toFixed(2)}m | Y: {station.y.toFixed(2)}m | θ: {yawDeg}° ({station.theta.toFixed(2)} rad)
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
