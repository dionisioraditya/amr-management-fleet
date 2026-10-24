import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { InteractiveBlueprintCanvas } from '@/components/fleet/interactive-blueprint-canvas';
import { StatusBadge } from '@/components/fleet/status-badge';
import type { FacilityMap, Mission, Vehicle, Waypoint } from '@/types';

interface DashboardProps {
    maps: FacilityMap[];
    activeMap?: FacilityMap | null;
    vehicles: Vehicle[];
    missions: Mission[];
}

export default function Dashboard({
    activeMap,
    vehicles: initialVehicles = [],
    missions: initialMissions = [],
}: DashboardProps) {
    const [mapView, setMapView] = useState<'active' | 'empty'>(
        activeMap ? 'active' : 'empty',
    );
    const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
    const [missions, setMissions] = useState<Mission[]>(initialMissions);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
        initialVehicles[0]?.id ?? null,
    );
    const [selectedWaypoint, setSelectedWaypoint] = useState<Waypoint | null>(
        null,
    );

    // Layer Visibility Toggles
    const [showRobots, setShowRobots] = useState(true);
    const [showStations, setShowStations] = useState(true);
    const [showPaths, setShowPaths] = useState(true);

    // Live Telemetry Simulator State
    const [isLiveSim, setIsLiveSim] = useState(false);
    const [simWaypointIdx, setSimWaypointIdx] = useState(0);

    // Dispatch New Mission Modal State
    const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
    const [missionName, setMissionName] = useState(
        'Transfer Material Dock-A1 ke Conveyor B2',
    );
    const [missionVehicleId, setMissionVehicleId] = useState<string>(
        initialVehicles[0]?.id ?? '',
    );
    const [missionPriority, setMissionPriority] = useState<
        'low' | 'normal' | 'high' | 'urgent'
    >('high');
    const [selectedWaypointIds, setSelectedWaypointIds] = useState<number[]>(
        () =>
            (activeMap?.waypoints ?? [])
                .slice(0, 2)
                .map((wp) => wp.id),
    );
    const [waypointToAdd, setWaypointToAdd] = useState<number>(
        activeMap?.waypoints?.[0]?.id ?? 0,
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const activeVehicle =
        vehicles.find((v) => v.id === selectedVehicleId) ?? vehicles[0] ?? null;
    const chargingCount = vehicles.filter(
        (v) => v.status === 'charging',
    ).length;
    const blockedCount = vehicles.filter(
        (v) => v.status === 'error' || v.status === 'emergency_stop',
    ).length;

    const showToast = (msg: string) => {
        setToastMessage(msg);
        window.setTimeout(() => setToastMessage(null), 3500);
    };

    // Live Telemetry Stream / Patrol Simulator Effect
    useEffect(() => {
        if (!isLiveSim || vehicles.length === 0) {
            return;
        }
        const waypoints = activeMap?.waypoints ?? [];
        if (waypoints.length === 0) {
            return;
        }

        const timer = window.setInterval(() => {
            const targetVehicle =
                vehicles.find(
                    (v) => v.status === 'active' || v.status === 'moving',
                ) ?? vehicles[0];

            if (
                !targetVehicle ||
                targetVehicle.status === 'emergency_stop'
            ) {
                return;
            }

            const targetWp = waypoints[simWaypointIdx % waypoints.length];
            const curX = targetVehicle.pose?.x ?? 4.0;
            const curY = targetVehicle.pose?.y ?? 4.0;
            const dx = targetWp.x - curX;
            const dy = targetWp.y - curY;
            const dist = Math.hypot(dx, dy);

            let nextX = curX;
            let nextY = curY;
            const nextTheta = Number(Math.atan2(dy, dx).toFixed(2));

            if (dist < 1.2) {
                nextX = targetWp.x;
                nextY = targetWp.y;
                setSimWaypointIdx((idx) => (idx + 1) % waypoints.length);
            } else {
                const step = 1.1;
                nextX = Number((curX + (dx / dist) * step).toFixed(2));
                nextY = Number((curY + (dy / dist) * step).toFixed(2));
            }

            void fetch(
                `/api/vehicles/${encodeURIComponent(targetVehicle.id)}/telemetry`,
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
                        status: 'active',
                        battery_percentage: Math.max(
                            15,
                            targetVehicle.battery_percentage,
                        ),
                    }),
                },
            )
                .then((res) => res.json())
                .then((json) => {
                    if (json?.data) {
                        setVehicles((prev) =>
                            prev.map((v) =>
                                v.id === targetVehicle.id
                                    ? {
                                          ...v,
                                          status: json.data.status,
                                          battery_percentage:
                                              json.data.battery_percentage,
                                          pose: json.data.pose,
                                      }
                                    : v,
                            ),
                        );
                    }
                });
        }, 1800);

        return () => window.clearInterval(timer);
    }, [isLiveSim, vehicles, activeMap, simWaypointIdx]);

    const handleAddWaypointStep = () => {
        if (!waypointToAdd) {
            return;
        }
        setSelectedWaypointIds((prev) => [...prev, waypointToAdd]);
    };

    const handleRemoveWaypointStep = (index: number) => {
        setSelectedWaypointIds((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handleMoveWaypointStep = (index: number, direction: -1 | 1) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= selectedWaypointIds.length) {
            return;
        }
        setSelectedWaypointIds((prev) => {
            const copy = [...prev];
            const temp = copy[index];
            copy[index] = copy[targetIndex];
            copy[targetIndex] = temp;
            return copy;
        });
    };

    const handleDispatchMission = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedWaypointIds.length === 0) {
            showToast('Pilih minimal 1 stasiun waypoint untuk misi.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/missions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    name: missionName.trim(),
                    vehicle_id: missionVehicleId || null,
                    priority: missionPriority,
                    items: selectedWaypointIds.map((wpId, idx) => ({
                        waypoint_id: wpId,
                        order_index: idx,
                    })),
                }),
            });

            const json = await response.json();
            if (response.ok && json.data) {
                const createdMission: Mission = json.data;
                setMissions((prev) => [createdMission, ...prev]);
                setDispatchModalOpen(false);
                showToast(`Misi "${createdMission.name}" berhasil dikirim.`);
                router.reload({ only: ['missions', 'telemetryShell'] });
            } else {
                showToast(json.message ?? 'Gagal mengirim misi baru.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateMissionStatus = async (
        mission: Mission,
        nextStatus: 'in_progress' | 'completed' | 'cancelled',
    ) => {
        const response = await fetch(`/api/missions/${mission.id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({ status: nextStatus }),
        });

        const json = await response.json();
        if (response.ok && json.data) {
            const updated: Mission = json.data;
            setMissions((prev) =>
                prev.map((m) => (m.id === updated.id ? updated : m)),
            );
            showToast(`Status Misi #${updated.id} diubah ke ${nextStatus}.`);
            router.reload({ only: ['missions', 'telemetryShell'] });
        }
    };

    return (
        <>
            <Head title="Live Map Dashboard" />
            <div className="relative h-full w-full overflow-hidden bg-background">
                {/* Interactive Blueprint Canvas Layer */}
                {mapView === 'active' ? (
                    <InteractiveBlueprintCanvas
                        map={activeMap}
                        waypoints={
                            showStations ? (activeMap?.waypoints ?? []) : []
                        }
                        pathplans={showPaths ? (activeMap?.pathplans ?? []) : []}
                        vehicles={showRobots ? vehicles : []}
                        selectedVehicleId={activeVehicle?.id ?? null}
                        selectedWaypointId={selectedWaypoint?.id ?? null}
                        onSelectVehicle={(v) => setSelectedVehicleId(v.id)}
                        onSelectWaypoint={(wp) => setSelectedWaypoint(wp)}
                        resolution={activeMap?.resolution ?? 0.05}
                        hudPosition="bottom-right"
                    />
                ) : (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface-container-lowest/90 p-space-xl text-center backdrop-blur-md select-none">
                        <div className="relative mb-space-lg flex h-40 w-40 items-center justify-center rounded-2xl border border-surface-container-high bg-surface-container-low/60">
                            <span className="material-symbols-outlined text-[64px] text-primary">
                                map
                            </span>
                        </div>
                        <h2 className="font-headline-lg text-headline-lg font-semibold tracking-tight text-on-surface">
                            Map appear here
                        </h2>
                        <p className="mt-space-xs mb-space-lg max-w-lg font-body-md text-body-md text-on-surface-variant">
                            Belum ada map yang dimuat di viewport ini. Silakan
                            pilih map aktif dari database tersimpan atau rekam
                            peta baru menggunakan ROS2 SLAM Toolbox.
                        </p>
                        <div className="flex items-center gap-space-md">
                            <Link
                                href="/map-studio"
                                className="flex items-center gap-space-xs rounded-lg bg-primary-container px-space-xl py-2.5 font-label-md text-label-md font-bold tracking-wider text-on-primary-container uppercase shadow-md transition-all hover:bg-primary hover:text-on-primary"
                            >
                                <span className="material-symbols-outlined text-[18px]">
                                    folder_open
                                </span>
                                Buka Map Management
                            </Link>
                            <button
                                type="button"
                                onClick={() => setMapView('active')}
                                className="flex cursor-pointer items-center gap-space-xs rounded-lg bg-surface-container-high px-space-lg py-2.5 font-label-md text-label-md font-semibold tracking-wider text-on-surface uppercase transition-all hover:bg-surface-container hover:text-primary"
                            >
                                <span className="material-symbols-outlined text-[18px]">
                                    videocam
                                </span>
                                Live SLAM Record
                            </button>
                        </div>
                    </div>
                )}

                {/* Floating HUD Layer Over Background Map */}
                <div className="pointer-events-none relative z-20 flex h-full w-full flex-col justify-between">
                    {/* Top Floating Command Bar & Controls */}
                    <div className="flex w-full flex-wrap items-center justify-between gap-3 p-4">
                        {/* Left Facility / Zone Pill Group */}
                        <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-xl border border-surface-container-high bg-surface-container-lowest/90 p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] backdrop-blur-md">
                            <div className="flex items-center gap-space-xs rounded-lg bg-surface-container-low px-3 py-1.5">
                                <span className="material-symbols-outlined text-[18px] text-primary">
                                    factory
                                </span>
                                <div className="flex flex-col text-left">
                                    <span className="font-label-sm text-[10px] leading-none text-tertiary uppercase">
                                        Facility / Hub
                                    </span>
                                    <span className="mt-0.5 font-headline-sm text-label-lg leading-tight font-semibold text-on-surface">
                                        {activeMap?.name ??
                                            'Production Plant Alpha — Zone 1'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 rounded-lg bg-surface-container px-3 py-1.5">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-primary-container" />
                                <span className="font-mono font-label-sm text-label-md font-medium text-on-surface">
                                    {activeMap?.image_path ??
                                        'SLAM_Warehouse_V2.4'}
                                </span>
                                <span className="rounded bg-surface-container-lowest px-1.5 py-0.5 font-label-sm text-[10px] font-bold text-tertiary">
                                    2D BLUEPRINT
                                </span>
                            </div>
                        </div>

                        {/* Right Floating Control Cluster */}
                        <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-xl border border-surface-container-high bg-surface-container-lowest/90 p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] backdrop-blur-md">
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
                                        isLiveSim
                                            ? 'animate-ping bg-white'
                                            : 'bg-slate-400'
                                    }`}
                                />
                                {isLiveSim
                                    ? 'Live Sim: ON (10Hz)'
                                    : 'Live Sim: OFF'}
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
                                    <span className="material-symbols-outlined text-[16px]">
                                        map
                                    </span>
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
                                    <span className="material-symbols-outlined text-[16px]">
                                        indeterminate_check_box
                                    </span>
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
                                        onChange={(e) =>
                                            setShowRobots(e.target.checked)
                                        }
                                        className="rounded accent-primary"
                                    />{' '}
                                    Robots
                                </label>
                                <span className="font-label-sm text-label-sm text-outline-variant">
                                    •
                                </span>
                                <label className="inline-flex cursor-pointer items-center gap-1 font-label-sm text-label-sm text-on-surface">
                                    <input
                                        type="checkbox"
                                        checked={showStations}
                                        onChange={(e) =>
                                            setShowStations(e.target.checked)
                                        }
                                        className="rounded accent-primary"
                                    />{' '}
                                    Stations
                                </label>
                                <span className="font-label-sm text-label-sm text-outline-variant">
                                    •
                                </span>
                                <label className="inline-flex cursor-pointer items-center gap-1 font-label-sm text-label-sm text-tertiary">
                                    <input
                                        type="checkbox"
                                        checked={showPaths}
                                        onChange={(e) =>
                                            setShowPaths(e.target.checked)
                                        }
                                        className="rounded accent-primary"
                                    />{' '}
                                    Lanes
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Middle Workspace: Floating HUD Inspector & Mission Dispatching */}
                    <div className="relative flex w-full flex-1 justify-between p-4">
                        {/* Left Floating Pill: Nav2 Status */}
                        <div className="pointer-events-auto flex items-center gap-space-sm self-start rounded-full border border-surface-container-high bg-surface-container-lowest/95 px-3.5 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md">
                            <span className="h-2 w-2 animate-ping rounded-full bg-primary-container" />
                            <span className="font-label-md text-label-md font-semibold tracking-wider text-on-surface">
                                NAV2 OCCUPANCY GRID
                            </span>
                            <span className="font-label-sm text-label-sm text-tertiary">
                                | RESOLUTION: {activeMap?.resolution ?? 0.05}
                                m/px
                            </span>
                            <span className="ml-1 font-mono font-label-sm text-label-sm text-primary">
                                X: {activeVehicle?.pose?.x?.toFixed(2) ?? '8.42'}{' '}
                                Y: {activeVehicle?.pose?.y?.toFixed(2) ?? '5.12'}
                            </span>
                        </div>

                        {/* Right Floating Panels: Robot HUD Inspector + Mission Queue + Fleet Telemetry */}
                        <div className="pointer-events-auto flex max-h-[calc(100vh-160px)] flex-col items-end gap-3.5 overflow-y-auto pr-1">
                            {/* Active AMR Inspector Card */}
                            {activeVehicle && (
                                <div className="w-84 rounded-xl border border-surface-container-high bg-surface-container-lowest/95 p-space-md shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md">
                                    <div className="flex items-center justify-between pb-space-xs">
                                        <div className="flex items-center gap-space-xs">
                                            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary-container" />
                                            <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                                                {activeVehicle.id} (
                                                {activeVehicle.name})
                                            </span>
                                        </div>
                                        <StatusBadge
                                            status={activeVehicle.status}
                                        />
                                    </div>

                                    {/* Unit Selector Pills */}
                                    {vehicles.length > 1 && (
                                        <div className="mb-2 flex flex-wrap gap-1">
                                            {vehicles.map((v) => (
                                                <button
                                                    key={v.id}
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedVehicleId(
                                                            v.id,
                                                        )
                                                    }
                                                    className={`cursor-pointer rounded px-2 py-0.5 font-mono text-[10px] font-bold transition-colors ${
                                                        v.id ===
                                                        activeVehicle.id
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
                                            <span className="block font-label-sm text-label-sm text-tertiary">
                                                BATTERY
                                            </span>
                                            <span className="font-label-lg text-label-lg font-bold text-on-surface">
                                                {
                                                    activeVehicle.battery_percentage
                                                }
                                                %{' '}
                                                <span className="font-label-sm text-[10px] text-primary">
                                                    (48.2 V)
                                                </span>
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block font-label-sm text-label-sm text-tertiary">
                                                IP HOST
                                            </span>
                                            <span className="font-label-lg text-label-lg font-bold text-on-surface">
                                                {activeVehicle.ip_address}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block font-label-sm text-label-sm text-tertiary">
                                                POSE [X, Y]
                                            </span>
                                            <span className="font-label-lg text-label-lg font-bold text-on-surface">
                                                [
                                                {activeVehicle.pose?.x?.toFixed(
                                                    1,
                                                ) ?? '0.0'}
                                                ,{' '}
                                                {activeVehicle.pose?.y?.toFixed(
                                                    1,
                                                ) ?? '0.0'}
                                                ]
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block font-label-sm text-label-sm text-tertiary">
                                                SAFETY SCAN
                                            </span>
                                            <span className="font-label-lg text-label-lg font-bold text-primary">
                                                CLEAR 360°
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Mission Queue & Dispatch Widget */}
                            <div className="flex w-84 flex-col gap-2.5 rounded-xl border border-surface-container-high bg-surface-container-lowest/95 p-space-md shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[18px] text-primary">
                                            alt_route
                                        </span>
                                        <span className="font-headline-sm text-xs font-bold tracking-wider text-on-surface uppercase">
                                            Mission Queue ({missions.length})
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setDispatchModalOpen(true)
                                        }
                                        className="flex cursor-pointer items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 font-label-md text-[10px] font-bold text-white uppercase shadow-xs transition-colors hover:bg-primary"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">
                                            send
                                        </span>
                                        + Dispatch Mission
                                    </button>
                                </div>

                                <div className="max-h-56 space-y-2 overflow-y-auto pr-0.5">
                                    {missions.map((mission) => (
                                        <div
                                            key={mission.id}
                                            className="rounded-lg border border-slate-200/80 bg-surface-container-low p-2.5 text-left"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono text-[10px] font-bold text-primary">
                                                            #{mission.id}
                                                        </span>
                                                        <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[9px] font-semibold text-on-surface uppercase">
                                                            {mission.vehicle_id ??
                                                                'UNASSIGNED'}
                                                        </span>
                                                        <span className="font-mono text-[9px] font-bold text-amber-700 uppercase">
                                                            [{mission.priority}]
                                                        </span>
                                                    </div>
                                                    <p className="mt-0.5 font-body-sm text-xs font-semibold text-on-surface">
                                                        {mission.name}
                                                    </p>
                                                </div>
                                                <StatusBadge
                                                    status={
                                                        mission.status ===
                                                        'in_progress'
                                                            ? 'active'
                                                            : mission.status ===
                                                                'completed'
                                                              ? 'online'
                                                              : mission.status ===
                                                                      'failed' ||
                                                                  mission.status ===
                                                                      'cancelled'
                                                                ? 'error'
                                                                : 'warning'
                                                    }
                                                    label={mission.status}
                                                />
                                            </div>

                                            {/* Ordered Waypoints Chain */}
                                            {mission.items &&
                                                mission.items.length > 0 && (
                                                    <div className="mt-1.5 flex flex-wrap items-center gap-1 font-mono text-[9px] text-tertiary">
                                                        {mission.items.map(
                                                            (item, idx) => (
                                                                <span
                                                                    key={
                                                                        item.id
                                                                    }
                                                                    className="inline-flex items-center gap-1"
                                                                >
                                                                    <span className="rounded bg-white px-1 py-0.5 text-on-surface">
                                                                        {item
                                                                            .waypoint
                                                                            ?.name ??
                                                                            `WP-${item.waypoint_id}`}
                                                                    </span>
                                                                    {idx <
                                                                        (mission
                                                                            .items
                                                                            ?.length ??
                                                                            0) -
                                                                            1 && (
                                                                        <span>
                                                                            →
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            ),
                                                        )}
                                                    </div>
                                                )}

                                            {/* Quick Mission State Controls */}
                                            {(mission.status === 'pending' ||
                                                mission.status ===
                                                    'in_progress') && (
                                                <div className="mt-2 flex items-center gap-1.5 border-t border-slate-200/60 pt-1.5">
                                                    {mission.status ===
                                                        'pending' && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                void handleUpdateMissionStatus(
                                                                    mission,
                                                                    'in_progress',
                                                                )
                                                            }
                                                            className="cursor-pointer rounded bg-primary px-2 py-0.5 font-mono text-[10px] font-bold text-white hover:bg-secondary"
                                                        >
                                                            ▶ Start Mission
                                                        </button>
                                                    )}
                                                    {mission.status ===
                                                        'in_progress' && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                void handleUpdateMissionStatus(
                                                                    mission,
                                                                    'completed',
                                                                )
                                                            }
                                                            className="cursor-pointer rounded bg-emerald-600 px-2 py-0.5 font-mono text-[10px] font-bold text-white hover:bg-emerald-700"
                                                        >
                                                            ✓ Complete
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            void handleUpdateMissionStatus(
                                                                mission,
                                                                'cancelled',
                                                            )
                                                        }
                                                        className="cursor-pointer rounded bg-red-100 px-2 py-0.5 font-mono text-[10px] font-bold text-error hover:bg-red-200"
                                                    >
                                                        ✕ Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Fleet Telemetry Summary Card */}
                            <div className="flex w-84 flex-col gap-space-sm rounded-xl border border-surface-container-high bg-surface-container-lowest/95 p-space-md shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md">
                                <div className="flex items-center justify-between pb-1">
                                    <div className="flex items-center gap-space-xs">
                                        <span className="material-symbols-outlined text-[20px] text-primary">
                                            monitoring
                                        </span>
                                        <span className="font-headline-sm text-headline-sm font-semibold text-on-surface uppercase">
                                            Fleet Telemetry
                                        </span>
                                    </div>
                                    <span className="font-label-sm text-[10px] text-tertiary">
                                        POLL RATE 10Hz
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-space-xs">
                                    <div className="flex flex-col rounded-lg bg-surface-container-low p-space-sm">
                                        <span className="font-label-sm text-label-sm text-tertiary">
                                            ACTIVE AMRs
                                        </span>
                                        <span className="mt-0.5 font-headline-lg text-headline-lg font-bold text-primary">
                                            {String(vehicles.length).padStart(
                                                2,
                                                '0',
                                            )}
                                        </span>
                                        <span className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
                                            <span className="h-1.5 w-1.5 rounded-full bg-primary-container" />{' '}
                                            100% nominal
                                        </span>
                                    </div>

                                    <div className="flex flex-col rounded-lg bg-surface-container-low p-space-sm">
                                        <span className="font-label-sm text-label-sm text-tertiary">
                                            CHARGING
                                        </span>
                                        <span className="mt-0.5 font-headline-lg text-headline-lg font-bold text-on-surface">
                                            {String(chargingCount).padStart(
                                                2,
                                                '0',
                                            )}
                                        </span>
                                        <span className="font-label-sm text-label-sm text-tertiary">
                                            ST-CHARGE BAYS
                                        </span>
                                    </div>

                                    <div className="flex flex-col rounded-lg bg-surface-container-low p-space-sm">
                                        <span className="font-label-sm text-label-sm text-tertiary">
                                            BLOCKED / STOP
                                        </span>
                                        <span className="mt-0.5 font-headline-lg text-headline-lg font-bold text-on-surface">
                                            {String(blockedCount).padStart(
                                                2,
                                                '0',
                                            )}
                                        </span>
                                        <span className="font-label-sm text-label-sm font-semibold text-primary">
                                            {blockedCount === 0
                                                ? 'No hazards'
                                                : 'Alert active'}
                                        </span>
                                    </div>

                                    <div className="flex flex-col rounded-lg bg-surface-container-low p-space-sm">
                                        <span className="font-label-sm text-label-sm text-tertiary">
                                            WAYPOINTS
                                        </span>
                                        <span className="mt-0.5 font-headline-lg text-headline-lg font-bold text-secondary">
                                            {String(
                                                activeMap?.waypoints?.length ??
                                                    0,
                                            ).padStart(2, '0')}
                                        </span>
                                        <span className="font-label-sm text-label-sm text-tertiary">
                                            {missions.length} missions
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dispatch New Mission Modal */}
                {dispatchModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
                        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <span className="font-mono text-[10px] font-bold tracking-wider text-primary uppercase">
                                        ROS 2 Nav2 Behavior Tree Dispatcher
                                    </span>
                                    <h3 className="font-headline-md text-lg font-bold text-on-surface">
                                        Dispatch New AMR Mission
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDispatchModalOpen(false)}
                                    className="cursor-pointer rounded-lg p-1 text-tertiary hover:bg-slate-100"
                                >
                                    <span className="material-symbols-outlined">
                                        close
                                    </span>
                                </button>
                            </div>

                            <form
                                onSubmit={(e) => void handleDispatchMission(e)}
                                className="mt-4 space-y-4"
                            >
                                <div>
                                    <label className="mb-1 block font-label-sm text-xs font-bold text-on-surface uppercase">
                                        Nama / Deskripsi Misi
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={missionName}
                                        onChange={(e) =>
                                            setMissionName(e.target.value)
                                        }
                                        placeholder="Transfer Material Dock-A1 ke Conveyor B2"
                                        className="w-full rounded-lg border border-slate-200 bg-surface-container-low px-3 py-2 font-body-sm text-xs text-on-surface"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1 block font-label-sm text-xs font-bold text-on-surface uppercase">
                                            Pilih Unit AMR
                                        </label>
                                        <select
                                            value={missionVehicleId}
                                            onChange={(e) =>
                                                setMissionVehicleId(
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full rounded-lg border border-slate-200 bg-surface-container-low px-3 py-2 font-mono text-xs text-on-surface"
                                        >
                                            {vehicles.map((v) => (
                                                <option key={v.id} value={v.id}>
                                                    {v.id} — {v.name} (
                                                    {v.battery_percentage}%)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1 block font-label-sm text-xs font-bold text-on-surface uppercase">
                                            Prioritas Misi
                                        </label>
                                        <select
                                            value={missionPriority}
                                            onChange={(e) =>
                                                setMissionPriority(
                                                    e.target.value as
                                                        | 'low'
                                                        | 'normal'
                                                        | 'high'
                                                        | 'urgent',
                                                )
                                            }
                                            className="w-full rounded-lg border border-slate-200 bg-surface-container-low px-3 py-2 font-mono text-xs text-on-surface"
                                        >
                                            <option value="low">LOW</option>
                                            <option value="normal">
                                                NORMAL
                                            </option>
                                            <option value="high">HIGH</option>
                                            <option value="urgent">
                                                URGENT
                                            </option>
                                        </select>
                                    </div>
                                </div>

                                {/* Waypoint Sequence Builder */}
                                <div>
                                    <label className="mb-1 block font-label-sm text-xs font-bold text-on-surface uppercase">
                                        Urutan Tahapan Stasiun (Mission Items)
                                    </label>
                                    <div className="flex gap-2">
                                        <select
                                            value={waypointToAdd}
                                            onChange={(e) =>
                                                setWaypointToAdd(
                                                    Number(e.target.value),
                                                )
                                            }
                                            className="flex-1 rounded-lg border border-slate-200 bg-surface-container-low px-3 py-2 font-mono text-xs text-on-surface"
                                        >
                                            {(activeMap?.waypoints ?? []).map(
                                                (wp) => (
                                                    <option
                                                        key={wp.id}
                                                        value={wp.id}
                                                    >
                                                        {wp.name} [X:{wp.x}m, Y:
                                                        {wp.y}m]
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={handleAddWaypointStep}
                                            className="cursor-pointer rounded-lg bg-secondary px-3 py-2 font-mono text-xs font-bold text-white hover:bg-primary"
                                        >
                                            + Tambah Step
                                        </button>
                                    </div>

                                    <div className="mt-2.5 max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-surface-container-low p-2.5">
                                        {selectedWaypointIds.map(
                                            (wpId, index) => {
                                                const wpObj = (
                                                    activeMap?.waypoints ?? []
                                                ).find((w) => w.id === wpId);
                                                return (
                                                    <div
                                                        key={`${wpId}-${index}`}
                                                        className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5 font-mono text-xs shadow-2xs"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                                                                STEP {index + 1}
                                                            </span>
                                                            <span className="font-bold text-on-surface">
                                                                {wpObj?.name ??
                                                                    `WP-${wpId}`}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleMoveWaypointStep(
                                                                        index,
                                                                        -1,
                                                                    )
                                                                }
                                                                className="cursor-pointer rounded px-1.5 py-0.5 text-tertiary hover:bg-slate-100"
                                                            >
                                                                ↑
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleMoveWaypointStep(
                                                                        index,
                                                                        1,
                                                                    )
                                                                }
                                                                className="cursor-pointer rounded px-1.5 py-0.5 text-tertiary hover:bg-slate-100"
                                                            >
                                                                ↓
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleRemoveWaypointStep(
                                                                        index,
                                                                    )
                                                                }
                                                                className="cursor-pointer rounded px-1.5 py-0.5 text-error hover:bg-red-50"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            },
                                        )}
                                        {selectedWaypointIds.length === 0 && (
                                            <p className="py-2 text-center font-body-sm text-xs text-tertiary">
                                                Belum ada tahapan waypoint
                                                dipilih.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setDispatchModalOpen(false)
                                        }
                                        className="cursor-pointer rounded-lg px-4 py-2 font-label-md text-xs font-semibold text-tertiary hover:bg-slate-100"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="cursor-pointer rounded-lg bg-primary px-5 py-2 font-label-md text-xs font-bold text-white shadow-sm hover:bg-secondary disabled:opacity-50"
                                    >
                                        {isSubmitting
                                            ? 'Mengirim Misi...'
                                            : 'Dispatch Misi Sekarang'}
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
