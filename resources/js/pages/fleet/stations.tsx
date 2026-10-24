import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { InteractiveBlueprintCanvas } from '@/components/fleet/interactive-blueprint-canvas';
import { StatusBadge } from '@/components/fleet/status-badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { FacilityMap, PathCoordinate, Waypoint } from '@/types';

interface StationsPageProps {
    maps: FacilityMap[];
    activeMap?: FacilityMap | null;
    waypoints: Waypoint[];
}

function classifyStation(name: string): {
    category: 'charging' | 'pd' | 'standby';
    label: string;
    icon: string;
} {
    const upper = name.toUpperCase();
    if (upper.includes('CHARGE') || upper.includes('CHG')) {
        return {
            category: 'charging',
            label: 'Supercharge',
            icon: 'bolt',
        };
    }
    if (
        upper.includes('PICK') ||
        upper.includes('DROP') ||
        upper.includes('BAY') ||
        upper.includes('POD')
    ) {
        return {
            category: 'pd',
            label: upper.includes('DROP') ? 'Drop-Off Bay' : 'Pick-Up Bay',
            icon: 'pallet',
        };
    }
    return {
        category: 'standby',
        label: 'Standby / QC',
        icon: 'my_location',
    };
}

function radToDeg(rad: number): number {
    return Math.round((rad * 180) / Math.PI);
}

function degToRad(deg: number): number {
    return Number(((deg * Math.PI) / 180).toFixed(4));
}

export default function StationsPage({
    maps = [],
    activeMap,
    waypoints = [],
}: StationsPageProps) {
    const currentMapId = activeMap?.id ?? maps[0]?.id ?? 1;
    const [selectedStation, setSelectedStation] = useState<Waypoint | null>(
        waypoints[0] ?? null,
    );
    const [zoneFilter, setZoneFilter] = useState<
        'all' | 'charging' | 'pd' | 'standby'
    >('all');
    const [pickMode, setPickMode] = useState(false);

    // Modal state for Create / Edit Station
    const [modalOpen, setModalOpen] = useState(false);
    const [editingStation, setEditingStation] = useState<Waypoint | null>(null);
    const [formName, setFormName] = useState('ST-CHARGE-03');
    const [formType, setFormType] = useState<
        'charging' | 'pickup' | 'dropoff' | 'standby'
    >('charging');
    const [formX, setFormX] = useState('14.50');
    const [formY, setFormY] = useState('6.00');
    const [formYawDeg, setFormYawDeg] = useState('90');
    const [saving, setSaving] = useState(false);

    const filteredWaypoints = waypoints.filter((wp) => {
        if (zoneFilter === 'all') {
            return true;
        }
        return classifyStation(wp.name).category === zoneFilter;
    });

    const chargingCount = waypoints.filter(
        (w) => classifyStation(w.name).category === 'charging',
    ).length;
    const pdCount = waypoints.filter(
        (w) => classifyStation(w.name).category === 'pd',
    ).length;
    const standbyCount = waypoints.filter(
        (w) => classifyStation(w.name).category === 'standby',
    ).length;

    const openCreateModal = (coord?: PathCoordinate) => {
        setEditingStation(null);
        setFormName(`ST-CHARGE-0${chargingCount + 1}`);
        setFormType('charging');
        setFormX(coord ? String(coord.x) : '14.50');
        setFormY(coord ? String(coord.y) : '6.00');
        setFormYawDeg('0');
        setModalOpen(true);
    };

    const openEditModal = (wp: Waypoint) => {
        setEditingStation(wp);
        setFormName(wp.name);
        const cat = classifyStation(wp.name).category;
        setFormType(
            cat === 'charging'
                ? 'charging'
                : wp.name.toUpperCase().includes('DROP')
                  ? 'dropoff'
                  : cat === 'pd'
                    ? 'pickup'
                    : 'standby',
        );
        setFormX(String(wp.x));
        setFormY(String(wp.y));
        setFormYawDeg(String(radToDeg(wp.theta)));
        setModalOpen(true);
    };

    const handleTypePresetChange = (
        newType: 'charging' | 'pickup' | 'dropoff' | 'standby',
    ) => {
        setFormType(newType);
        if (!editingStation) {
            const prefix =
                newType === 'charging'
                    ? 'ST-CHARGE-'
                    : newType === 'pickup'
                      ? 'PICK-BAY-'
                      : newType === 'dropoff'
                        ? 'DROP-BAY-'
                        : 'STANDBY-';
            setFormName(`${prefix}0${waypoints.length + 1}`);
        }
    };

    const handleSaveStation = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const payload = {
            name: formName.trim().toUpperCase(),
            x: parseFloat(formX) || 0,
            y: parseFloat(formY) || 0,
            theta: degToRad(parseFloat(formYawDeg) || 0),
        };

        try {
            const url = editingStation
                ? `/api/waypoints/${editingStation.id}`
                : `/api/maps/${currentMapId}/waypoints`;
            const method = editingStation ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const json = await response.json();
            if (response.ok) {
                toast.success(
                    editingStation
                        ? `Station ${payload.name} updated.`
                        : `Station ${payload.name} registered to Nav2 map.`,
                );
                setModalOpen(false);
                if (json.data) {
                    setSelectedStation(json.data);
                }
                router.reload();
            } else {
                toast.error(json.message || 'Failed to save station.');
            }
        } catch {
            toast.error('Network error while saving station.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteStation = async (wp: Waypoint) => {
        try {
            const response = await fetch(`/api/waypoints/${wp.id}`, {
                method: 'DELETE',
                headers: { Accept: 'application/json' },
            });

            if (response.ok) {
                toast.success(`Station ${wp.name} deleted.`);
                if (selectedStation?.id === wp.id) {
                    setSelectedStation(
                        waypoints.find((item) => item.id !== wp.id) ?? null,
                    );
                }
                router.reload();
            } else {
                toast.error('Failed to delete station.');
            }
        } catch {
            toast.error('Network error while deleting station.');
        }
    };

    const activeInspected = selectedStation ?? waypoints[0] ?? null;

    return (
        <>
            <Head title="Station Management" />
            <div className="relative h-full w-full overflow-hidden bg-[#f8f9ff]">
                {/* 1. Background Interactive Map Canvas */}
                <div className="absolute inset-0 z-0">
                    <InteractiveBlueprintCanvas
                        map={activeMap}
                        waypoints={waypoints}
                        selectedWaypointId={activeInspected?.id ?? null}
                        onSelectWaypoint={(wp) => setSelectedStation(wp)}
                        mode={pickMode ? 'pick-station' : 'view'}
                        onPickCoordinate={(coord) => {
                            setPickMode(false);
                            setFormX(String(coord.x));
                            setFormY(String(coord.y));
                            setModalOpen(true);
                            toast.info(
                                `Picked map coordinate [X: ${coord.x}m, Y: ${coord.y}m]`,
                            );
                        }}
                        resolution={activeMap?.resolution ?? 0.05}
                    />
                </div>

                {/* Pick Coordinate Banner */}
                {pickMode && (
                    <div className="absolute top-4 right-6 z-30 flex animate-pulse items-center gap-3 rounded-xl bg-on-surface px-4 py-2.5 text-white shadow-lg">
                        <span className="material-symbols-outlined text-[20px] text-primary-container">
                            pin_drop
                        </span>
                        <div>
                            <div className="font-headline-sm text-xs font-bold uppercase">
                                Station Pick Mode Active
                            </div>
                            <div className="font-label-sm text-[10px] text-slate-300">
                                Click anywhere on the blueprint canvas to
                                capture [X, Y] coordinates.
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setPickMode(false)}
                            className="rounded bg-white/15 px-2.5 py-1 font-label-sm text-[10px] font-bold uppercase hover:bg-white/25"
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {/* Bottom Left ROS Frame Tag */}
                <div className="pointer-events-auto absolute bottom-4 left-[640px] z-20 hidden items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container-lowest/90 px-3 py-1.5 font-label-sm text-label-sm text-tertiary shadow-sm backdrop-blur-md xl:flex">
                    <span className="material-symbols-outlined text-[14px] text-primary">
                        explore
                    </span>
                    <span>ROS World Frame [map]</span>
                    <span className="text-outline-variant">•</span>
                    <span>
                        Origin: [{activeMap?.origin_x ?? -10},{' '}
                        {activeMap?.origin_y ?? -10}]
                    </span>
                    <span className="text-outline-variant">•</span>
                    <span className="font-mono font-medium text-primary">
                        Nav2 Costmap Active
                    </span>
                </div>

                {/* 2. Scrollable Floating Left Cockpit Panel (40% Pure White Transparent Wrapping Cards) */}
                <aside className="relative z-10 flex h-full w-full max-w-[560px] flex-col overflow-y-auto border-r border-slate-200/60 bg-white/40 backdrop-blur-sm">
                    <div className="flex flex-col gap-space-md p-margin-lg">
                    {/* 1. Floating Top Command & Action Bar */}
                    <div className="pointer-events-auto flex flex-col gap-space-md rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs lg:p-space-lg">
                        <div className="flex items-start justify-between gap-space-sm">
                            <div className="flex flex-col">
                                <div className="flex flex-wrap items-center gap-space-sm">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-high text-primary">
                                        <span className="material-symbols-outlined text-[20px]">
                                            ev_station
                                        </span>
                                    </span>
                                    <h1 className="font-headline-md text-headline-md font-bold tracking-tight text-on-surface uppercase lg:font-headline-lg">
                                        Station Management
                                    </h1>
                                    <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-label-sm text-label-sm font-semibold text-secondary uppercase">
                                        {activeMap?.name ??
                                            'Main Logistics Hall'}
                                    </span>
                                </div>
                                <p className="mt-1 font-body-sm text-body-sm text-tertiary">
                                    Configure Nav2 docking waypoints, charging
                                    bays, and P&amp;D nodes.
                                </p>
                            </div>
                        </div>

                        {/* Actions & Zone Filter */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center rounded-lg bg-surface-container-low px-space-sm py-1.5 shadow-2xs">
                                <span className="material-symbols-outlined mr-1.5 text-[18px] text-tertiary">
                                    tune
                                </span>
                                <label
                                    className="mr-1.5 font-label-sm text-label-sm text-on-surface-variant uppercase"
                                    htmlFor="zone-filter"
                                >
                                    Filter:
                                </label>
                                <select
                                    id="zone-filter"
                                    value={zoneFilter}
                                    onChange={(e) =>
                                        setZoneFilter(
                                            e.target.value as
                                                | 'all'
                                                | 'charging'
                                                | 'pd'
                                                | 'standby',
                                        )
                                    }
                                    className="cursor-pointer bg-transparent font-label-md text-label-md font-semibold text-on-surface focus:outline-none"
                                >
                                    <option value="all">
                                        All Stations ({waypoints.length})
                                    </option>
                                    <option value="charging">
                                        Charging Hub ({chargingCount})
                                    </option>
                                    <option value="pd">
                                        Pick &amp; Drop Bays ({pdCount})
                                    </option>
                                    <option value="standby">
                                        Standby &amp; QC ({standbyCount})
                                    </option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingStation(null);
                                        setPickMode(true);
                                    }}
                                    className="flex cursor-pointer items-center gap-1 rounded-lg bg-surface-container-high px-2.5 py-1.5 font-label-md text-label-md text-on-surface transition-all hover:bg-surface-container-highest"
                                >
                                    <span className="material-symbols-outlined text-[16px] text-secondary">
                                        pin_drop
                                    </span>
                                    <span>Pick on Map</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openCreateModal()}
                                    className="flex cursor-pointer items-center gap-1 rounded-lg bg-primary-container px-3 py-1.5 font-label-md text-label-md font-semibold tracking-wider text-on-primary-container uppercase shadow-md transition-all hover:bg-primary hover:text-on-primary"
                                >
                                    <span className="material-symbols-outlined text-[16px]">
                                        add_circle
                                    </span>
                                    <span>+ ADD STATION</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 2. Floating Telemetry / KPI Summary (2x2 Grid) */}
                    <div className="pointer-events-auto grid grid-cols-2 gap-space-sm sm:grid-cols-4">
                        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs">
                            <div className="absolute top-0 right-0 left-0 h-1 bg-secondary" />
                            <div className="flex items-center justify-between text-tertiary">
                                <span className="font-label-sm text-label-sm tracking-wider uppercase">
                                    Total Stations
                                </span>
                                <span className="material-symbols-outlined text-[18px] text-secondary">
                                    polyline
                                </span>
                            </div>
                            <div className="mt-2 flex items-baseline gap-space-xs">
                                <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                                    {waypoints.length}
                                </span>
                                <span className="font-label-sm text-label-sm text-tertiary">
                                    Synced
                                </span>
                            </div>
                        </div>

                        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs">
                            <div className="absolute top-0 right-0 left-0 h-1 bg-primary-container" />
                            <div className="flex items-center justify-between text-tertiary">
                                <span className="font-label-sm text-label-sm tracking-wider uppercase">
                                    Charging Docks
                                </span>
                                <span className="material-symbols-outlined text-[18px] text-primary">
                                    battery_charging_full
                                </span>
                            </div>
                            <div className="mt-2 flex items-baseline gap-space-xs">
                                <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                                    {chargingCount}
                                </span>
                                <span className="font-label-sm text-label-sm text-tertiary">
                                    Bays
                                </span>
                            </div>
                        </div>

                        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs">
                            <div className="absolute top-0 right-0 left-0 h-1 bg-secondary-container" />
                            <div className="flex items-center justify-between text-tertiary">
                                <span className="font-label-sm text-label-sm tracking-wider uppercase">
                                    P&amp;D Bays
                                </span>
                                <span className="material-symbols-outlined text-[18px] text-secondary">
                                    pallet
                                </span>
                            </div>
                            <div className="mt-2 flex items-baseline gap-space-xs">
                                <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                                    {pdCount}
                                </span>
                                <span className="font-label-sm text-label-sm text-tertiary">
                                    Active
                                </span>
                            </div>
                        </div>

                        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs">
                            <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
                            <div className="flex items-center justify-between text-tertiary">
                                <span className="font-label-sm text-label-sm tracking-wider uppercase">
                                    Standby / QC
                                </span>
                                <span className="material-symbols-outlined text-[18px] text-emerald-600">
                                    verified
                                </span>
                            </div>
                            <div className="mt-2 flex items-baseline gap-space-xs">
                                <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                                    {standbyCount}
                                </span>
                                <span className="font-label-sm text-label-sm text-tertiary">
                                    Nodes
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 3. Station Inspector Card */}
                    {activeInspected && (
                        <div className="pointer-events-auto flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs lg:p-space-lg">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-label-sm text-label-sm text-tertiary uppercase">
                                            INSPECTOR
                                        </span>
                                        <span className="rounded bg-surface-container px-2 py-0.5 font-mono font-label-sm text-label-sm font-bold text-primary">
                                            {activeInspected.name}
                                        </span>
                                    </div>
                                    <h2 className="mt-1 font-headline-md text-headline-md font-bold text-on-surface">
                                        {
                                            classifyStation(
                                                activeInspected.name,
                                            ).label
                                        }{' '}
                                        Node #{activeInspected.id}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            openEditModal(activeInspected)
                                        }
                                        className="flex cursor-pointer items-center gap-1 rounded-lg bg-surface-container px-2.5 py-1 font-label-sm text-xs font-semibold text-primary hover:bg-surface-container-high"
                                    >
                                        <span className="material-symbols-outlined text-[15px]">
                                            edit
                                        </span>
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleDeleteStation(activeInspected)
                                        }
                                        className="flex cursor-pointer items-center gap-1 rounded-lg bg-error-container/60 px-2.5 py-1 font-label-sm text-xs font-semibold text-error hover:bg-error-container"
                                    >
                                        <span className="material-symbols-outlined text-[15px]">
                                            delete
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Target Focus Zoom & Alignment Radar */}
                            <div className="relative mt-space-md flex h-32 w-full items-center justify-center overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-low/90">
                                <svg
                                    className=" absolute inset-0 h-full w-full opacity-40"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <defs>
                                        <pattern
                                            height="16"
                                            id="inspect-grid-compact"
                                            patternUnits="userSpaceOnUse"
                                            width="16"
                                        >
                                            <path
                                                className="text-outline-variant"
                                                d="M 16 0 L 0 0 0 16"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="0.5"
                                            />
                                        </pattern>
                                    </defs>
                                    <rect
                                        fill="url(#inspect-grid-compact)"
                                        height="100%"
                                        width="100%"
                                    />
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
                                                style={{
                                                    transform: `rotate(${radToDeg(activeInspected.theta)}deg)`,
                                                }}
                                            >
                                                navigation
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-1.5 rounded bg-inverse-surface/90 px-2.5 py-0.5 text-center shadow">
                                        <span className="font-mono font-label-sm text-label-sm font-bold text-inverse-on-surface">
                                            X: {activeInspected.x.toFixed(2)}m |
                                            Y: {activeInspected.y.toFixed(2)}m |
                                            θ:{' '}
                                            {radToDeg(activeInspected.theta)}° (
                                            {activeInspected.theta.toFixed(2)}{' '}
                                            rad)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. Station Directory Table */}
                    <div className="pointer-events-auto overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 px-space-md py-3">
                            <span className="font-headline-sm text-xs font-bold tracking-wider text-on-surface uppercase">
                                Station Waypoint Directory (
                                {filteredWaypoints.length})
                            </span>
                            <span className="font-label-sm text-[10px] text-tertiary">
                                Click row to focus on map
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-surface-container-low font-label-sm text-[10px] text-tertiary uppercase">
                                    <tr>
                                        <th className="px-space-md py-2.5">
                                            Station ID
                                        </th>
                                        <th className="px-space-sm py-2.5">
                                            Type
                                        </th>
                                        <th className="px-space-sm py-2.5">
                                            Pose (X, Y / Yaw)
                                        </th>
                                        <th className="px-space-sm py-2.5">
                                            Status
                                        </th>
                                        <th className="px-space-md py-2.5 text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {filteredWaypoints.map((wp) => {
                                        const info = classifyStation(wp.name);
                                        const isSelected =
                                            activeInspected?.id === wp.id;

                                        return (
                                            <tr
                                                key={wp.id}
                                                onClick={() =>
                                                    setSelectedStation(wp)
                                                }
                                                className={`cursor-pointer transition-colors ${
                                                    isSelected
                                                        ? 'bg-surface-container-low/90'
                                                        : 'hover:bg-slate-50'
                                                }`}
                                            >
                                                <td className="px-space-md py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className={`h-2 w-2 shrink-0 rounded-full ${
                                                                isSelected
                                                                    ? 'bg-primary-container'
                                                                    : 'bg-secondary'
                                                            }`}
                                                        />
                                                        <span className="font-mono font-label-md font-bold text-on-surface">
                                                            {wp.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-space-sm py-2.5">
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 font-label-sm text-[10px] font-semibold text-primary">
                                                        <span className="material-symbols-outlined text-[12px]">
                                                            {info.icon}
                                                        </span>
                                                        {info.label}
                                                    </span>
                                                </td>
                                                <td className="px-space-sm py-2.5 font-mono text-[11px] text-on-surface">
                                                    {wp.x.toFixed(2)}m,{' '}
                                                    {wp.y.toFixed(2)}m{' '}
                                                    <span className="text-tertiary">
                                                        ({radToDeg(wp.theta)}°)
                                                    </span>
                                                </td>
                                                <td className="px-space-sm py-2.5">
                                                    <StatusBadge
                                                        status={
                                                            info.category ===
                                                            'charging'
                                                                ? 'charging'
                                                                : 'online'
                                                        }
                                                        label="SYNCED"
                                                    />
                                                </td>
                                                <td
                                                    className="px-space-md py-2.5 text-right"
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                >
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openEditModal(
                                                                    wp,
                                                                )
                                                            }
                                                            title="Edit Station"
                                                            className="cursor-pointer rounded p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">
                                                                edit
                                                            </span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleDeleteStation(
                                                                    wp,
                                                                )
                                                            }
                                                            title="Delete Station"
                                                            className="cursor-pointer rounded p-1 text-on-surface-variant hover:bg-error-container hover:text-error"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">
                                                                delete
                                                            </span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    </div>
                </aside>
            </div>

            {/* Create / Edit Station Modal */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
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
                            Register a docking or buffer waypoint node on ROS 2
                            Nav2 map ({activeMap?.name ?? 'Active Map'}).
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
                                    value={formName}
                                    onChange={(e) =>
                                        setFormName(e.target.value)
                                    }
                                    placeholder="e.g. ST-CHARGE-03"
                                    className="h-10 w-full rounded-lg border border-slate-200 bg-surface-container-low px-3 font-mono text-xs font-bold text-on-surface focus:border-primary-container focus:bg-white focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block font-label-sm text-label-sm text-tertiary uppercase">
                                    Station Functional Type
                                </label>
                                <select
                                    value={formType}
                                    onChange={(e) =>
                                        handleTypePresetChange(
                                            e.target.value as
                                                | 'charging'
                                                | 'pickup'
                                                | 'dropoff'
                                                | 'standby',
                                        )
                                    }
                                    className="h-10 w-full rounded-lg border border-slate-200 bg-surface-container-low px-3 font-label-md text-xs text-on-surface focus:border-primary-container focus:bg-white focus:outline-none"
                                >
                                    <option value="charging">
                                        ⚡ Supercharge Station (DC 48V)
                                    </option>
                                    <option value="pickup">
                                        📦 Pallet Pick-up Bay
                                    </option>
                                    <option value="dropoff">
                                        📥 Drop-off Assembly Buffer
                                    </option>
                                    <option value="standby">
                                        ⏸ Standby / QC Node
                                    </option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <div className="mb-1.5 flex items-center justify-between">
                                <label className="font-label-sm text-label-sm text-tertiary uppercase">
                                    SLAM Coordinate Vector (Pose 2D)
                                </label>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setModalOpen(false);
                                            setPickMode(true);
                                        }}
                                        className="flex cursor-pointer items-center gap-1 font-label-sm text-label-sm text-secondary hover:underline"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">
                                            pin_drop
                                        </span>
                                        Pick on Map
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormX('8.42');
                                            setFormY('5.12');
                                            setFormYawDeg('45');
                                            toast.info(
                                                'Fetched live pose from AMR-01',
                                            );
                                        }}
                                        className="flex cursor-pointer items-center gap-1 font-label-sm text-label-sm text-primary hover:underline"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">
                                            my_location
                                        </span>
                                        Fetch AMR-01 Pose
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2.5">
                                <div className="rounded-lg border border-slate-200 bg-surface-container-low p-2">
                                    <label className="block font-mono text-[10px] text-tertiary">
                                        X (Meters)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formX}
                                        onChange={(e) =>
                                            setFormX(e.target.value)
                                        }
                                        className="mt-1 w-full bg-transparent font-mono text-xs font-bold text-on-surface focus:outline-none"
                                    />
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-surface-container-low p-2">
                                    <label className="block font-mono text-[10px] text-tertiary">
                                        Y (Meters)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formY}
                                        onChange={(e) =>
                                            setFormY(e.target.value)
                                        }
                                        className="mt-1 w-full bg-transparent font-mono text-xs font-bold text-on-surface focus:outline-none"
                                    />
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-surface-container-low p-2">
                                    <label className="block font-mono text-[10px] text-tertiary">
                                        Yaw (Degrees)
                                    </label>
                                    <input
                                        type="number"
                                        step="1"
                                        required
                                        value={formYawDeg}
                                        onChange={(e) =>
                                            setFormYawDeg(e.target.value)
                                        }
                                        className="mt-1 w-full bg-transparent font-mono text-xs font-bold text-primary focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2">
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg bg-surface-container px-4 py-2 font-label-md text-xs font-semibold text-on-surface uppercase hover:bg-surface-container-high"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="rounded-lg bg-primary-container px-5 py-2 font-label-md text-xs font-bold tracking-wider text-on-primary-container uppercase shadow-md hover:bg-primary hover:text-on-primary"
                            >
                                {saving
                                    ? 'Saving...'
                                    : 'Save Station'}
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
