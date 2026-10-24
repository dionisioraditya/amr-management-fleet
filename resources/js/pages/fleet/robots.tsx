import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { InteractiveBlueprintCanvas } from '@/components/fleet/interactive-blueprint-canvas';
import { StatusBadge } from '@/components/fleet/status-badge';
import type { FacilityMap, PathCoordinate, Vehicle } from '@/types';

interface RobotsPageProps {
    activeMap?: FacilityMap | null;
    vehicles: Vehicle[];
}

type StatusFilter = 'ALL' | 'ACTIVE' | 'IDLE' | 'CHARGING' | 'ERROR';

export default function RobotsPage({
    activeMap = null,
    vehicles: initialVehicles = [],
}: RobotsPageProps) {
    const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
        initialVehicles[0]?.id ?? null,
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [pickPoseMode, setPickPoseMode] = useState(false);

    // Registration / Edit Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [formId, setFormId] = useState('');
    const [formName, setFormName] = useState('');
    const [formIp, setFormIp] = useState('10.32.254.197');
    const [formStatus, setFormStatus] = useState('idle');
    const [formBattery, setFormBattery] = useState(100);
    const [isSaving, setIsSaving] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

    const selectedVehicle =
        vehicles.find((v) => v.id === selectedVehicleId) ?? vehicles[0] ?? null;

    // KPI Metrics
    const totalCount = vehicles.length;
    const liveCount = vehicles.filter(
        (v) => v.status === 'active' || v.status === 'moving',
    ).length;
    const chargingCount = vehicles.filter(
        (v) => v.status === 'charging',
    ).length;
    const errorCount = vehicles.filter(
        (v) => v.status === 'error' || v.status === 'emergency_stop',
    ).length;

    // Filtered Fleet Manifest
    const filteredVehicles = vehicles.filter((v) => {
        const matchesSearch =
            v.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.ip_address.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) {
            return false;
        }

        if (statusFilter === 'ACTIVE') {
            return v.status === 'active' || v.status === 'moving';
        }
        if (statusFilter === 'IDLE') {
            return v.status === 'idle' || v.status === 'maintenance';
        }
        if (statusFilter === 'CHARGING') {
            return v.status === 'charging';
        }
        if (statusFilter === 'ERROR') {
            return v.status === 'error' || v.status === 'emergency_stop';
        }
        return true;
    });

    const showBanner = (msg: string) => {
        setFeedbackMessage(msg);
        window.setTimeout(() => setFeedbackMessage(null), 3500);
    };

    const openCreateModal = () => {
        const nextNum = String(vehicles.length + 1).padStart(2, '0');
        setModalMode('create');
        setFormId(`AMR-${nextNum}`);
        setFormName(`Heavy Pallet Carrier ${nextNum}`);
        setFormIp(`10.32.254.${194 + vehicles.length + 1}`);
        setFormStatus('idle');
        setFormBattery(100);
        setModalOpen(true);
    };

    const openEditModal = (vehicle: Vehicle) => {
        setModalMode('edit');
        setFormId(vehicle.id);
        setFormName(vehicle.name);
        setFormIp(vehicle.ip_address);
        setFormStatus(vehicle.status);
        setFormBattery(vehicle.battery_percentage);
        setModalOpen(true);
    };

    const handleSaveVehicle = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const url =
                modalMode === 'create'
                    ? '/api/vehicles'
                    : `/api/vehicles/${encodeURIComponent(formId)}`;
            const method = modalMode === 'create' ? 'POST' : 'PUT';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    id: formId.trim().toUpperCase(),
                    name: formName.trim(),
                    ip_address: formIp.trim(),
                    status: formStatus,
                    battery_percentage: Number(formBattery),
                }),
            });

            const json = await response.json();
            if (response.ok && json.data) {
                const saved: Vehicle = json.data;
                if (modalMode === 'create') {
                    setVehicles((prev) => [...prev, saved]);
                    setSelectedVehicleId(saved.id);
                    showBanner(`Unit ${saved.id} registered.`);
                } else {
                    setVehicles((prev) =>
                        prev.map((v) => (v.id === saved.id ? saved : v)),
                    );
                    showBanner(`Configuration updated for ${saved.id}.`);
                }
                setModalOpen(false);
                router.reload({ only: ['vehicles', 'telemetryShell'] });
            } else {
                showBanner(json.message ?? 'Failed to save vehicle record.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteVehicle = async (vehicle: Vehicle) => {
        setIsSaving(true);
        try {
            const response = await fetch(
                `/api/vehicles/${encodeURIComponent(vehicle.id)}`,
                {
                    method: 'DELETE',
                    headers: { Accept: 'application/json' },
                },
            );
            if (response.ok) {
                const remaining = vehicles.filter((v) => v.id !== vehicle.id);
                setVehicles(remaining);
                if (selectedVehicleId === vehicle.id) {
                    setSelectedVehicleId(remaining[0]?.id ?? null);
                }
                showBanner(`Unit ${vehicle.id} decommissioned from fleet.`);
                router.reload({ only: ['vehicles', 'telemetryShell'] });
            }
        } finally {
            setIsSaving(false);
        }
    };

    const sendTelemetryUpdate = async (
        vehicle: Vehicle,
        updates: {
            x?: number;
            y?: number;
            theta?: number;
            status?: string;
            battery_percentage?: number;
            event?: string;
        },
    ) => {
        const nextX = Number((updates.x ?? vehicle.pose?.x ?? 4.0).toFixed(2));
        const nextY = Number((updates.y ?? vehicle.pose?.y ?? 4.0).toFixed(2));
        const nextTheta = Number(
            (updates.theta ?? vehicle.pose?.theta ?? 0.0).toFixed(2),
        );
        const nextStatus = updates.status ?? vehicle.status;
        const nextBattery =
            updates.battery_percentage ?? vehicle.battery_percentage;

        const response = await fetch(
            `/api/vehicles/${encodeURIComponent(vehicle.id)}/telemetry`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    x: nextX,
                    y: nextY,
                    theta: nextTheta,
                    status: nextStatus,
                    battery_percentage: nextBattery,
                    event: updates.event,
                }),
            },
        );

        const json = await response.json();
        if (response.ok && json.data) {
            setVehicles((prev) =>
                prev.map((v) =>
                    v.id === vehicle.id
                        ? {
                              ...v,
                              status: json.data.status,
                              battery_percentage: json.data.battery_percentage,
                              pose: json.data.pose,
                          }
                        : v,
                ),
            );
            router.reload({ only: ['telemetryShell'] });
        }
    };

    const handlePickCoordinateOnMap = (coord: PathCoordinate) => {
        if (!selectedVehicle) {
            return;
        }
        setPickPoseMode(false);
        void sendTelemetryUpdate(selectedVehicle, {
            x: coord.x,
            y: coord.y,
            event: `Teleop 2D Nav Goal commanded to [X:${coord.x}m, Y:${coord.y}m]`,
        });
        showBanner(
            `Target pose for ${selectedVehicle.id} dispatched to [${coord.x}m, ${coord.y}m]`,
        );
    };

    return (
        <>
            <Head title="Robot Fleet Management" />
            <div className="relative h-full w-full overflow-hidden bg-[#f8f9ff]">
                {/* 1. Persistent Full-Screen Warehouse Map Backdrop */}
                <div className="absolute inset-0 z-0">
                    <InteractiveBlueprintCanvas
                        map={activeMap}
                        waypoints={activeMap?.waypoints ?? []}
                        pathplans={activeMap?.pathplans ?? []}
                        vehicles={vehicles}
                        selectedVehicleId={selectedVehicle?.id ?? null}
                        onSelectVehicle={(v) => setSelectedVehicleId(v.id)}
                        mode={pickPoseMode ? 'pick-station' : 'view'}
                        onPickCoordinate={handlePickCoordinateOnMap}
                        resolution={activeMap?.resolution ?? 0.05}
                        hudPosition="bottom-right"
                    />
                </div>

                {/* 2. Left Cockpit Panel (Pure White 40% Transparent Glass Backing) */}
                <aside className="relative z-10 flex h-full w-full max-w-[460px] flex-col overflow-y-auto border-r border-slate-200/60 bg-white/40 backdrop-blur-sm">
                    <div className="flex flex-col gap-space-md p-margin-lg">
                        {/* Top Telemetry Header Card */}
                        <div className="flex flex-col gap-space-md rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-secondary" />
                                    <span className="font-mono text-[10px] tracking-widest text-tertiary uppercase">
                                        Tele-Supervisory Node [REGION_WH_04]
                                    </span>
                                </div>
                                <h1 className="mt-0.5 font-headline-md text-lg font-bold tracking-tight text-on-surface uppercase">
                                    Robot Fleet Command
                                </h1>
                            </div>

                            {/* Quick KPIs */}
                            <div className="grid grid-cols-4 gap-2 border-t border-slate-100 pt-3">
                                <div>
                                    <div className="font-label-sm text-[10px] tracking-wider text-tertiary uppercase">
                                        Fleet
                                    </div>
                                    <div className="font-mono text-base font-bold text-on-surface">
                                        {String(totalCount).padStart(2, '0')}
                                    </div>
                                </div>
                                <div>
                                    <div className="font-label-sm text-[10px] tracking-wider text-tertiary uppercase">
                                        Live
                                    </div>
                                    <div className="font-mono text-base font-bold text-primary">
                                        {String(liveCount).padStart(2, '0')}
                                    </div>
                                </div>
                                <div>
                                    <div className="font-label-sm text-[10px] tracking-wider text-tertiary uppercase">
                                        Charging
                                    </div>
                                    <div className="font-mono text-base font-bold text-amber-600">
                                        {String(chargingCount).padStart(2, '0')}
                                    </div>
                                </div>
                                <div>
                                    <div className="font-label-sm text-[10px] tracking-wider text-tertiary uppercase">
                                        Errors
                                    </div>
                                    <div className="font-mono text-base font-bold text-error">
                                        {String(errorCount).padStart(2, '0')}
                                    </div>
                                </div>
                            </div>

                            {/* Register Button */}
                            <button
                                type="button"
                                onClick={openCreateModal}
                                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2.5 font-headline-sm text-xs font-bold tracking-wider text-white uppercase shadow-md transition-all hover:bg-primary active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[18px]">
                                    add_circle
                                </span>
                                <span>+ REGISTER AMR</span>
                            </button>
                        </div>

                        {/* Search & Status Filter Box */}
                        <div className="flex flex-col gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="font-label-md text-[11px] font-bold tracking-wider text-on-surface uppercase">
                                    Fleet Manifest ({filteredVehicles.length})
                                </span>
                                <span className="font-mono text-[10px] text-primary">
                                    STREAMING: 10Hz
                                </span>
                            </div>

                            <div className="relative flex items-center">
                                <span className="material-symbols-outlined absolute left-2.5 text-[16px] text-tertiary">
                                    filter_alt
                                </span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Filter by ID, Name, or IP (10.32.254.195)..."
                                    className="w-full rounded-lg border border-slate-200 bg-surface-container-low py-1.5 pr-3 pl-8 font-body-sm text-xs text-on-surface placeholder:text-tertiary focus:border-secondary focus:outline-none"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-1">
                                {(
                                    [
                                        'ALL',
                                        'ACTIVE',
                                        'IDLE',
                                        'CHARGING',
                                        'ERROR',
                                    ] as StatusFilter[]
                                ).map((pill) => (
                                    <button
                                        key={pill}
                                        type="button"
                                        onClick={() => setStatusFilter(pill)}
                                        className={`cursor-pointer rounded px-2 py-0.5 font-mono text-[10px] font-semibold transition-colors ${
                                            statusFilter === pill
                                                ? 'bg-primary text-white'
                                                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                                        }`}
                                    >
                                        {pill}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Robot Unit Cards */}
                        <div className="space-y-2.5">
                            {filteredVehicles.map((vehicle) => {
                                const isSelected =
                                    vehicle.id === selectedVehicle?.id;
                                const socColor =
                                    vehicle.battery_percentage <= 20
                                        ? 'bg-error'
                                        : vehicle.battery_percentage <= 45
                                          ? 'bg-amber-500'
                                          : 'bg-secondary';

                                return (
                                    <div
                                        key={vehicle.id}
                                        onClick={() =>
                                            setSelectedVehicleId(vehicle.id)
                                        }
                                        className={`cursor-pointer rounded-xl border bg-white p-3.5 shadow-xs transition-all ${
                                            isSelected
                                                ? 'border-secondary border-l-4 border-l-secondary ring-2 ring-secondary/20'
                                                : 'border-slate-200/80 hover:border-secondary/60'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                    <span className="material-symbols-outlined text-[18px]">
                                                        precision_manufacturing
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-headline-sm text-sm font-bold text-on-surface">
                                                            {vehicle.id}
                                                        </span>
                                                        <span className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-[9px] text-on-surface-variant">
                                                            {vehicle.ip_address}
                                                        </span>
                                                    </div>
                                                    <p className="font-body-sm text-[11px] text-tertiary">
                                                        {vehicle.name}
                                                    </p>
                                                </div>
                                            </div>
                                            <StatusBadge status={vehicle.status} />
                                        </div>

                                        {/* Battery SoC Bar */}
                                        <div className="mt-3">
                                            <div className="mb-1 flex justify-between font-mono text-[10px]">
                                                <span className="text-tertiary uppercase">
                                                    State of Charge (SoC)
                                                </span>
                                                <span className="font-bold text-primary">
                                                    {vehicle.battery_percentage}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                                                <div
                                                    className={`h-full rounded-full transition-all ${socColor}`}
                                                    style={{
                                                        width: `${Math.min(100, Math.max(0, vehicle.battery_percentage))}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Telemetry Pose Mini-Grid */}
                                        <div className="mt-2.5 grid grid-cols-3 gap-1.5 border-t border-slate-100 pt-2 font-mono text-[10px]">
                                            <div>
                                                <span className="block text-[9px] text-tertiary">
                                                    POSE X
                                                </span>
                                                <span className="font-semibold text-on-surface">
                                                    {vehicle.pose?.x?.toFixed(2) ??
                                                        '0.00'}
                                                    m
                                                </span>
                                            </div>
                                            <div>
                                                <span className="block text-[9px] text-tertiary">
                                                    POSE Y
                                                </span>
                                                <span className="font-semibold text-on-surface">
                                                    {vehicle.pose?.y?.toFixed(2) ??
                                                        '0.00'}
                                                    m
                                                </span>
                                            </div>
                                            <div>
                                                <span className="block text-[9px] text-tertiary">
                                                    YAW (θ)
                                                </span>
                                                <span className="font-semibold text-on-surface">
                                                    {vehicle.pose?.theta?.toFixed(
                                                        2,
                                                    ) ?? '0.00'}
                                                    rad
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {filteredVehicles.length === 0 && (
                                <div className="rounded-xl border border-slate-200 bg-white/90 p-6 text-center font-body-sm text-xs text-tertiary">
                                    No AMR units match current filter criteria.
                                </div>
                            )}
                        </div>
                    </div>
                </aside>

                {/* 4. Right Pinned HUD Target: Active Robot Inspector & Teleop Override */}
                {selectedVehicle && (
                    <div className="pointer-events-auto absolute top-24 right-4 z-20 flex w-88 flex-col gap-3 rounded-xl border border-slate-200/90 bg-white/95 p-4 shadow-lg backdrop-blur-md">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 animate-ping rounded-full bg-secondary" />
                                    <span className="font-mono text-[10px] font-bold tracking-wider text-primary uppercase">
                                        HUD Target Lock // {selectedVehicle.id}
                                    </span>
                                </div>
                                <h2 className="mt-0.5 font-headline-md text-base font-bold text-on-surface">
                                    {selectedVehicle.name}
                                </h2>
                            </div>
                            <StatusBadge status={selectedVehicle.status} />
                        </div>

                        {/* ROS 2 Humble SSH Node Status */}
                        <div className="flex items-center justify-between rounded-lg bg-[#0b1c30] px-3 py-2 font-mono text-[11px] text-white">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px] text-secondary">
                                    terminal
                                </span>
                                <span>ROS 2 Humble ({selectedVehicle.ip_address})</span>
                            </div>
                            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                                SSH READY
                            </span>
                        </div>

                        {/* Status Mode Override Pills */}
                        <div>
                            <span className="mb-1.5 block font-label-sm text-[10px] font-bold tracking-wider text-tertiary uppercase">
                                Override State Machine
                            </span>
                            <div className="grid grid-cols-3 gap-1.5">
                                {(
                                    [
                                        'active',
                                        'idle',
                                        'charging',
                                        'maintenance',
                                        'error',
                                    ] as const
                                ).map((st) => (
                                    <button
                                        key={st}
                                        type="button"
                                        onClick={() =>
                                            void sendTelemetryUpdate(
                                                selectedVehicle,
                                                {
                                                    status: st,
                                                    event: `Operator manually switched status to ${st}`,
                                                },
                                            )
                                        }
                                        className={`cursor-pointer rounded-lg border px-2 py-1 font-mono text-[10px] font-bold uppercase transition-all ${
                                            selectedVehicle.status === st
                                                ? 'border-primary bg-primary text-white'
                                                : 'border-slate-200 bg-surface-container-low text-on-surface hover:border-secondary'
                                        }`}
                                    >
                                        {st}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Teleop / Pose Step Controls */}
                        <div className="rounded-xl border border-slate-200 bg-surface-container-low p-3">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="font-label-sm text-[10px] font-bold tracking-wider text-on-surface uppercase">
                                    2D Teleop & Pose Step
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setPickPoseMode((prev) => !prev)
                                    }
                                    className={`cursor-pointer rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase transition-colors ${
                                        pickPoseMode
                                            ? 'bg-secondary text-white'
                                            : 'bg-white text-primary hover:bg-sky-50'
                                    }`}
                                >
                                    {pickPoseMode
                                        ? 'PICKING... (CANCEL)'
                                        : 'SET POSE ON MAP'}
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-xs">
                                <button
                                    type="button"
                                    onClick={() =>
                                        void sendTelemetryUpdate(
                                            selectedVehicle,
                                            {
                                                theta:
                                                    (selectedVehicle.pose
                                                        ?.theta ?? 0) - 0.25,
                                            },
                                        )
                                    }
                                    className="cursor-pointer rounded-lg border border-slate-200 bg-white py-1.5 font-bold text-on-surface hover:bg-sky-50"
                                >
                                    ↺ θ-
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        void sendTelemetryUpdate(
                                            selectedVehicle,
                                            {
                                                y:
                                                    (selectedVehicle.pose?.y ??
                                                        4) + 1.0,
                                                status: 'active',
                                            },
                                        )
                                    }
                                    className="cursor-pointer rounded-lg border border-slate-200 bg-white py-1.5 font-bold text-primary hover:bg-sky-50"
                                >
                                    ▲ +Y
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        void sendTelemetryUpdate(
                                            selectedVehicle,
                                            {
                                                theta:
                                                    (selectedVehicle.pose
                                                        ?.theta ?? 0) + 0.25,
                                            },
                                        )
                                    }
                                    className="cursor-pointer rounded-lg border border-slate-200 bg-white py-1.5 font-bold text-on-surface hover:bg-sky-50"
                                >
                                    ↻ θ+
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        void sendTelemetryUpdate(
                                            selectedVehicle,
                                            {
                                                x:
                                                    (selectedVehicle.pose?.x ??
                                                        4) - 1.0,
                                                status: 'active',
                                            },
                                        )
                                    }
                                    className="cursor-pointer rounded-lg border border-slate-200 bg-white py-1.5 font-bold text-primary hover:bg-sky-50"
                                >
                                    ◀ -X
                                </button>
                                <div className="flex items-center justify-center rounded-lg bg-surface-container font-mono text-[10px] font-bold text-tertiary">
                                    1.0m
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        void sendTelemetryUpdate(
                                            selectedVehicle,
                                            {
                                                x:
                                                    (selectedVehicle.pose?.x ??
                                                        4) + 1.0,
                                                status: 'active',
                                            },
                                        )
                                    }
                                    className="cursor-pointer rounded-lg border border-slate-200 bg-white py-1.5 font-bold text-primary hover:bg-sky-50"
                                >
                                    +X ▶
                                </button>
                                <div />
                                <button
                                    type="button"
                                    onClick={() =>
                                        void sendTelemetryUpdate(
                                            selectedVehicle,
                                            {
                                                y:
                                                    (selectedVehicle.pose?.y ??
                                                        4) - 1.0,
                                                status: 'active',
                                            },
                                        )
                                    }
                                    className="cursor-pointer rounded-lg border border-slate-200 bg-white py-1.5 font-bold text-primary hover:bg-sky-50"
                                >
                                    ▼ -Y
                                </button>
                                <div />
                            </div>
                        </div>

                        {/* Battery SoC Simulator Slider */}
                        <div>
                            <div className="mb-1 flex justify-between font-mono text-[10px]">
                                <span className="text-tertiary uppercase">
                                    Battery SoC Override
                                </span>
                                <span className="font-bold text-primary">
                                    {selectedVehicle.battery_percentage}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={100}
                                value={selectedVehicle.battery_percentage}
                                onChange={(e) =>
                                    void sendTelemetryUpdate(selectedVehicle, {
                                        battery_percentage: Number(
                                            e.target.value,
                                        ),
                                    })
                                }
                                className="w-full accent-secondary"
                            />
                        </div>

                        {/* Edit / Delete Actions */}
                        <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                            <button
                                type="button"
                                onClick={() => openEditModal(selectedVehicle)}
                                className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-surface-container-low py-2 font-label-md text-xs font-bold text-on-surface uppercase transition-colors hover:bg-surface-container-high"
                            >
                                <span className="material-symbols-outlined text-[16px]">
                                    edit
                                </span>
                                Edit Unit
                            </button>
                            <button
                                type="button"
                                disabled={isSaving}
                                onClick={() =>
                                    void handleDeleteVehicle(selectedVehicle)
                                }
                                className="flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-label-md text-xs font-bold text-error uppercase transition-colors hover:bg-red-100"
                            >
                                <span className="material-symbols-outlined text-[16px]">
                                    delete
                                </span>
                                Delete
                            </button>
                        </div>
                    </div>
                )}

                {/* 5. AMR Unit Registration & Edit Modal */}
                {modalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
                        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <span className="font-mono text-[10px] font-bold tracking-wider text-primary uppercase">
                                        Fleet Registry CRUD
                                    </span>
                                    <h3 className="font-headline-md text-lg font-bold text-on-surface uppercase">
                                        {modalMode === 'create'
                                            ? 'Register AMR Unit'
                                            : `Edit AMR Config // ${formId}`}
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="cursor-pointer rounded-lg p-1 text-tertiary hover:bg-slate-100"
                                >
                                    <span className="material-symbols-outlined">
                                        close
                                    </span>
                                </button>
                            </div>

                            <form
                                onSubmit={(e) => void handleSaveVehicle(e)}
                                className="mt-4 space-y-4"
                            >
                                <div>
                                    <label className="mb-1 block font-label-sm text-xs font-bold text-on-surface uppercase">
                                        AMR Unit ID
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        disabled={modalMode === 'edit'}
                                        value={formId}
                                        onChange={(e) =>
                                            setFormId(e.target.value)
                                        }
                                        placeholder="AMR-03"
                                        className="w-full rounded-lg border border-slate-200 bg-surface-container-low px-3 py-2 font-mono text-xs text-on-surface disabled:opacity-60"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block font-label-sm text-xs font-bold text-on-surface uppercase">
                                        Unit Designation
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formName}
                                        onChange={(e) =>
                                            setFormName(e.target.value)
                                        }
                                        placeholder="Heavy Pallet Carrier 03"
                                        className="w-full rounded-lg border border-slate-200 bg-surface-container-low px-3 py-2 font-body-sm text-xs text-on-surface"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1 block font-label-sm text-xs font-bold text-on-surface uppercase">
                                            IP Address (ROS 2 Host)
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formIp}
                                            onChange={(e) =>
                                                setFormIp(e.target.value)
                                            }
                                            placeholder="10.32.254.195"
                                            className="w-full rounded-lg border border-slate-200 bg-surface-container-low px-3 py-2 font-mono text-xs text-on-surface"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block font-label-sm text-xs font-bold text-on-surface uppercase">
                                            Initial Battery (%)
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            required
                                            value={formBattery}
                                            onChange={(e) =>
                                                setFormBattery(
                                                    Number(e.target.value),
                                                )
                                            }
                                            className="w-full rounded-lg border border-slate-200 bg-surface-container-low px-3 py-2 font-mono text-xs text-on-surface"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block font-label-sm text-xs font-bold text-on-surface uppercase">
                                        Operational State
                                    </label>
                                    <select
                                        value={formStatus}
                                        onChange={(e) =>
                                            setFormStatus(e.target.value)
                                        }
                                        className="w-full rounded-lg border border-slate-200 bg-surface-container-low px-3 py-2 font-mono text-xs text-on-surface"
                                    >
                                        <option value="idle">IDLE</option>
                                        <option value="active">ACTIVE</option>
                                        <option value="charging">
                                            CHARGING
                                        </option>
                                        <option value="maintenance">
                                            MAINTENANCE
                                        </option>
                                        <option value="error">ERROR</option>
                                    </select>
                                </div>

                                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setModalOpen(false)}
                                        className="cursor-pointer rounded-lg px-4 py-2 font-label-md text-xs font-semibold text-tertiary uppercase hover:bg-slate-100"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="cursor-pointer rounded-lg bg-primary px-5 py-2 font-label-md text-xs font-bold text-white uppercase shadow-sm hover:bg-secondary disabled:opacity-50"
                                    >
                                        {isSaving
                                            ? 'Saving...'
                                            : modalMode === 'create'
                                              ? 'Register Unit'
                                              : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
