import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
    calculatePathLength,
    InteractiveBlueprintCanvas,
} from '@/components/fleet/interactive-blueprint-canvas';
import { StatusBadge } from '@/components/fleet/status-badge';
import type { FacilityMap, PathCoordinate, Pathplan } from '@/types';

interface PathPlanningProps {
    maps: FacilityMap[];
    activeMap?: FacilityMap | null;
    pathplans: Pathplan[];
}

export default function PathPlanningPage({
    maps = [],
    activeMap,
    pathplans = [],
}: PathPlanningProps) {
    const currentMapId = activeMap?.id ?? maps[0]?.id ?? 1;
    const [selectedPath, setSelectedPath] = useState<Pathplan | null>(
        pathplans[0] ?? null,
    );
    const [isDrawing, setIsDrawing] = useState(false);
    const [editingPathId, setEditingPathId] = useState<number | null>(null);
    const [cadTool, setCadTool] = useState<
        'spline' | 'linear' | 'waypoint' | 'keepout'
    >('spline');
    const [snapEnabled, setSnapEnabled] = useState(true);
    const [showCostmap, setShowCostmap] = useState(true);
    const [flowFilter, setFlowFilter] = useState<'all' | 'bi' | 'uni'>('all');

    // Editor Form State
    const [formName, setFormName] = useState(
        pathplans[0]?.name ?? 'PATH-ALPHA-01',
    );
    const [formDescription, setFormDescription] = useState(
        pathplans[0]?.description ?? 'Main Logistics Inbound Highway',
    );
    const [formBidirectional, setFormBidirectional] = useState(
        pathplans[0]?.is_bidirectional ?? true,
    );
    const [formMaxSpeed, setFormMaxSpeed] = useState(
        pathplans[0]?.max_speed ?? 1.2,
    );
    const [inflationCorridor, setInflationCorridor] = useState(0.6);
    const [draftCoords, setDraftCoords] = useState<PathCoordinate[]>(
        pathplans[0]?.coordinates ?? [
            { x: 2.5, y: 3.0 },
            { x: 12.0, y: 3.0 },
            { x: 12.0, y: 8.5 },
        ],
    );
    const [saving, setSaving] = useState(false);

    const selectExistingPath = (path: Pathplan) => {
        setSelectedPath(path);
        setIsDrawing(false);
        setEditingPathId(path.id);
        setFormName(path.name);
        setFormDescription(path.description ?? '');
        setFormBidirectional(path.is_bidirectional);
        setFormMaxSpeed(path.max_speed);
        setDraftCoords(path.coordinates ?? []);
    };

    const startNewPathMode = () => {
        setIsDrawing(true);
        setEditingPathId(null);
        setSelectedPath(null);
        setFormName(`PATH-CORRIDOR-0${pathplans.length + 1}`);
        setFormDescription('Autonomous AMR transit lane');
        setFormBidirectional(true);
        setFormMaxSpeed(1.2);
        setDraftCoords([
            { x: 2.5, y: 3.0 },
            { x: 8.0, y: 3.0 },
        ]);
        toast.info(
            'Mode Gambar Path Aktif: Klik pada peta atau stasiun untuk menambah titik rute.',
        );
    };

    const startEditPathMode = (path: Pathplan) => {
        selectExistingPath(path);
        setIsDrawing(true);
        toast.info(`Mengedit rute ${path.name}. Klik peta untuk menambah titik.`);
    };

    const handleAddPathPoint = (coord: PathCoordinate) => {
        setDraftCoords((prev) => [...prev, coord]);
    };

    const handleUndoLastPoint = () => {
        setDraftCoords((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
    };

    const handleSavePathplan = async () => {
        if (draftCoords.length < 2) {
            toast.error('Lintasan membutuhkan minimal 2 titik waypoint.');
            return;
        }

        setSaving(true);
        const payload = {
            name: formName.trim(),
            is_bidirectional: formBidirectional,
            max_speed: Number(formMaxSpeed),
            coordinates: draftCoords,
            description: formDescription.trim() || null,
        };

        try {
            const isUpdate = editingPathId !== null;
            const url = isUpdate
                ? `/api/pathplans/${editingPathId}`
                : `/api/maps/${currentMapId}/pathplans`;
            const method = isUpdate ? 'PUT' : 'POST';

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
                    isUpdate
                        ? `Lintasan ${payload.name} berhasil diperbarui.`
                        : `Lintasan ${payload.name} berhasil disimpan & di-deploy ke Nav2.`,
                );
                setIsDrawing(false);
                if (json.data) {
                    setSelectedPath(json.data);
                    setEditingPathId(json.data.id);
                }
                router.reload();
            } else {
                toast.error(json.message || 'Gagal menyimpan lintasan.');
            }
        } catch {
            toast.error('Kesalahan jaringan saat menghubungi server.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePathplan = async (path: Pathplan) => {
        try {
            const response = await fetch(`/api/pathplans/${path.id}`, {
                method: 'DELETE',
                headers: { Accept: 'application/json' },
            });

            if (response.ok) {
                toast.success(`Lintasan ${path.name} dihapus.`);
                if (selectedPath?.id === path.id) {
                    const next =
                        pathplans.find((p) => p.id !== path.id) ?? null;
                    if (next) {
                        selectExistingPath(next);
                    } else {
                        setSelectedPath(null);
                    }
                }
                router.reload();
            } else {
                toast.error('Gagal menghapus lintasan.');
            }
        } catch {
            toast.error('Kesalahan jaringan saat menghapus lintasan.');
        }
    };

    const handleExportYaml = (path: Pathplan) => {
        const yamlContent = [
            `# ROS 2 Nav2 Pathplan Trajectory Export`,
            `path_name: "${path.name}"`,
            `map_id: ${path.map_id}`,
            `is_bidirectional: ${path.is_bidirectional}`,
            `max_linear_velocity: ${path.max_speed}`,
            `safety_inflation_corridor_m: ${inflationCorridor}`,
            `waypoints:`,
            ...(path.coordinates ?? []).map(
                (pt, i) =>
                    `  - index: ${i}\n    x: ${pt.x}\n    y: ${pt.y}\n    theta: 0.0`,
            ),
        ].join('\n');

        const blob = new Blob([yamlContent], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${path.name.toLowerCase().replace(/\s+/g, '_')}_nav2.yaml`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${path.name} YAML configuration.`);
    };

    const filteredPaths = pathplans.filter((p) => {
        if (flowFilter === 'bi') {
            return p.is_bidirectional;
        }
        if (flowFilter === 'uni') {
            return !p.is_bidirectional;
        }
        return true;
    });

    const totalAvgLength =
        pathplans.length > 0
            ? (
                  pathplans.reduce(
                      (acc, p) => acc + calculatePathLength(p.coordinates),
                      0,
                  ) / pathplans.length
              ).toFixed(1)
            : '0.0';

    const activeLength = calculatePathLength(draftCoords);

    return (
        <>
            <Head title="Path Planning Management" />
            <div className="relative flex h-full w-full overflow-hidden bg-[#f8f9ff]">
                {/* 1. Background Interactive Map Canvas */}
                <div className="absolute inset-0 z-0">
                    <InteractiveBlueprintCanvas
                        map={activeMap}
                        waypoints={activeMap?.waypoints ?? []}
                        pathplans={pathplans}
                        selectedPathplanId={selectedPath?.id ?? null}
                        onSelectPathplan={selectExistingPath}
                        mode={isDrawing ? 'draw-path' : 'view'}
                        draftCoordinates={draftCoords}
                        onAddPathPoint={handleAddPathPoint}
                        snapStep={snapEnabled ? 0.5 : 0}
                        inflationRadius={inflationCorridor}
                        showCostmap={showCostmap}
                        resolution={activeMap?.resolution ?? 0.05}
                        hudPosition="top-right"
                    />
                </div>

                {/* Top Right Map Layer Toggles */}
                <div className="pointer-events-auto absolute top-16 right-4 z-20 hidden items-center gap-2 rounded-xl border border-slate-200/80 bg-surface-container-lowest/95 px-3 py-1.5 shadow-md backdrop-blur-md xl:flex">
                    <button
                        type="button"
                        onClick={() => setSnapEnabled((s) => !s)}
                        className={`flex cursor-pointer items-center gap-1 rounded px-2 py-1 font-label-sm text-xs transition-all ${
                            snapEnabled
                                ? 'bg-primary-fixed font-semibold text-on-primary-fixed'
                                : 'text-on-surface-variant hover:bg-slate-100'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">
                            grid_4x4
                        </span>
                        Snap 0.5m
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowCostmap((c) => !c)}
                        className={`flex cursor-pointer items-center gap-1 rounded px-2 py-1 font-label-sm text-xs transition-all ${
                            showCostmap
                                ? 'bg-surface-container font-semibold text-primary'
                                : 'text-on-surface-variant hover:bg-slate-100'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">
                            layers
                        </span>
                        Costmap
                    </button>
                </div>

                {/* Active Drawing Mode Floating Banner */}
                {isDrawing && (
                    <div className="pointer-events-auto absolute top-4 left-[580px] z-30 flex animate-pulse items-center gap-space-md rounded-xl bg-on-background/95 px-space-lg py-space-sm text-surface-container-lowest shadow-lg backdrop-blur-md">
                        <span className="material-symbols-outlined text-[20px] text-primary-container">
                            edit_location
                        </span>
                        <div className="flex flex-col">
                            <span className="font-headline-sm text-headline-sm tracking-tight text-white">
                                Mode Gambar Path Aktif ({draftCoords.length}{' '}
                                WPs)
                            </span>
                            <span className="font-label-sm text-label-sm text-outline-variant">
                                Klik pada peta atau stasiun untuk menambah titik
                                rute baru.
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleUndoLastPoint}
                            className="cursor-pointer rounded bg-white/15 px-2.5 py-1 font-label-sm text-label-sm text-white hover:bg-white/25"
                        >
                            Undo Titik
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsDrawing(false)}
                            className="cursor-pointer rounded bg-primary-container px-3 py-1 font-label-sm text-label-sm font-bold text-on-primary-container"
                        >
                            Selesai Gambar
                        </button>
                    </div>
                )}

                {/* 2. Half-Screen Floating Left Cockpit Panel (Pure White 40% Transparent Background Wrapping Cards) */}
                <aside className="relative z-10 flex h-full w-full max-w-[560px] flex-col overflow-y-auto border-r border-slate-200/60 bg-white/40 backdrop-blur-sm">
                    <div className="flex flex-col gap-space-md p-margin-lg">
                        {/* Card 1: Panel Header & Facility Map Picker */}
                        <div className="rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs">
                            <div className="mb-space-xs flex items-center gap-space-xs font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
                                <span className="font-semibold text-primary">
                                    SPATIAL NAVIGATION
                                </span>
                                <span className="text-outline-variant">/</span>
                                <span>ROS2 NAV2 PATH PLANNER</span>
                            </div>

                            <div className="mb-space-md flex items-center justify-between gap-space-md">
                                <div>
                                    <h1 className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
                                        Path Planning
                                    </h1>
                                    <p className="font-body-sm text-body-sm text-tertiary">
                                        Kelola lintasan, kurva spline, dan batas
                                        kecepatan armada AMR.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={startNewPathMode}
                                    className="flex cursor-pointer items-center gap-space-xs rounded-lg bg-primary px-space-md py-2.5 font-label-sm text-label-sm font-semibold tracking-wider text-on-primary uppercase shadow-xs transition-all hover:bg-on-primary-fixed-variant active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-[16px]">
                                        add_road
                                    </span>
                                    <span>+ Buat Path Baru</span>
                                </button>
                            </div>

                            {/* Active Map Selector */}
                            <div className="flex items-center gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
                                <span className="material-symbols-outlined ml-space-xs text-[20px] text-primary">
                                    map
                                </span>
                                <div className="min-w-0 flex-1">
                                    <label className="block font-label-sm text-label-sm text-tertiary uppercase">
                                        Peta Aktif Terpilih
                                    </label>
                                    <div className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                                        {activeMap?.name ??
                                            'Main Logistics Hall (v2.4)'}
                                    </div>
                                </div>
                                <span className="rounded bg-surface-container px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                                    RES {activeMap?.resolution ?? 0.05}m
                                </span>
                            </div>
                        </div>

                        {/* Card 2: Metrics KPI Strip */}
                        <div className="grid grid-cols-4 gap-space-xs">
                            <div className="rounded-xl border border-slate-200/80 bg-white p-space-sm shadow-xs">
                                <div className="font-label-sm text-label-sm text-tertiary">
                                    TOTAL PATH
                                </div>
                                <div className="mt-0.5 font-headline-md text-headline-md font-bold text-on-surface">
                                    {String(pathplans.length).padStart(2, '0')}
                                </div>
                                <div className="flex items-center gap-0.5 font-label-sm text-label-sm text-primary">
                                    <span className="h-1.5 w-1.5 rounded-full bg-primary-container" />{' '}
                                    Synced
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200/80 bg-white p-space-sm shadow-xs">
                                <div className="font-label-sm text-label-sm text-tertiary">
                                    BI-DIRECT
                                </div>
                                <div className="mt-0.5 font-headline-md text-headline-md font-bold text-secondary">
                                    {String(
                                        pathplans.filter((p) => p.is_bidirectional)
                                            .length,
                                    ).padStart(2, '0')}
                                </div>
                                <div className="font-label-sm text-label-sm text-tertiary">
                                    Dual flow
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200/80 bg-white p-space-sm shadow-xs">
                                <div className="font-label-sm text-label-sm text-tertiary">
                                    AVG LENGTH
                                </div>
                                <div className="mt-0.5 font-headline-md text-headline-md font-bold text-on-surface">
                                    {totalAvgLength}
                                    <span className="text-xs font-normal">m</span>
                                </div>
                                <div className="font-label-sm text-label-sm text-tertiary">
                                    ±0.05m tol
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200/80 bg-white p-space-sm shadow-xs">
                                <div className="font-label-sm text-label-sm text-tertiary">
                                    CLEARANCE
                                </div>
                                <div className="mt-0.5 font-headline-md text-headline-md font-bold text-on-surface">
                                    100
                                    <span className="text-xs font-normal">%</span>
                                </div>
                                <div className="flex items-center gap-0.5 font-label-sm text-label-sm font-semibold text-emerald-600">
                                    <span className="material-symbols-outlined text-[12px]">
                                        check_circle
                                    </span>{' '}
                                    Safe
                                </div>
                            </div>
                        </div>

                        {/* Card 3: Interactive Drawing & CAD Toolbar */}
                        <div className="rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs">
                            <div className="mb-space-xs flex items-center justify-between">
                                <span className="font-label-sm text-label-sm tracking-wider text-tertiary uppercase">
                                    CAD Path Geometry Tools
                                </span>
                                <span className="font-label-sm text-label-sm text-primary">
                                    Grid Snap: {snapEnabled ? '0.5m Active' : 'Off'}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-space-xs">
                                {(
                                    [
                                        {
                                            id: 'spline',
                                            label: 'Spline Curve (S)',
                                            icon: 'timeline',
                                        },
                                        {
                                            id: 'linear',
                                            label: 'Linear (L)',
                                            icon: 'straighten',
                                        },
                                        {
                                            id: 'waypoint',
                                            label: 'Add Point (W)',
                                            icon: 'add_location',
                                        },
                                        {
                                            id: 'keepout',
                                            label: 'Keep-Out (K)',
                                            icon: 'block',
                                        },
                                    ] as const
                                ).map((tool) => (
                                    <button
                                        key={tool.id}
                                        type="button"
                                        onClick={() => {
                                            setCadTool(tool.id);
                                            if (tool.id === 'waypoint') {
                                                setIsDrawing(true);
                                            }
                                        }}
                                        className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-space-md py-1.5 font-label-sm text-label-sm transition-all ${
                                            cadTool === tool.id
                                                ? 'bg-primary-fixed font-semibold text-on-primary-fixed shadow-2xs'
                                                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[15px]">
                                            {tool.icon}
                                        </span>
                                        <span>{tool.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Card 4: Active Path Inspector / Detailed Waypoint Controller */}
                        <div className="rounded-xl border border-slate-200/80 bg-white p-space-lg shadow-xs">
                            <div className="mb-space-md flex items-start justify-between">
                                <div className="flex items-center gap-space-sm">
                                    <span className="h-3 w-3 rounded-full bg-primary-container ring-4 ring-primary-container/20" />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                                                {formName || 'NEW-PATH'}
                                            </span>
                                            <span className="rounded-full bg-primary-container/20 px-2 py-0.5 font-label-sm text-label-sm font-bold text-on-primary-fixed uppercase">
                                                {editingPathId
                                                    ? 'Active Selected'
                                                    : 'New Draft'}
                                            </span>
                                        </div>
                                        <span className="font-body-sm text-body-sm text-tertiary">
                                            {formDescription ||
                                                'Custom AMR Corridor'}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsDrawing((d) => !d)}
                                    className={`cursor-pointer rounded-lg px-2.5 py-1 font-label-sm text-[10px] font-bold uppercase transition-all ${
                                        isDrawing
                                            ? 'bg-primary-container text-on-primary-container'
                                            : 'bg-white text-primary shadow-2xs hover:bg-surface-container'
                                    }`}
                                >
                                    {isDrawing
                                        ? '✓ Drawing Active'
                                        : 'Draw on Map'}
                                </button>
                            </div>

                            {/* Editable Name & Description Fields */}
                            <div className="mb-space-md grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <div className="rounded-lg bg-surface-container-lowest p-2">
                                    <label className="block font-label-sm text-[10px] text-tertiary uppercase">
                                        Path Name / Code
                                    </label>
                                    <input
                                        type="text"
                                        value={formName}
                                        onChange={(e) =>
                                            setFormName(e.target.value)
                                        }
                                        className="mt-0.5 w-full bg-transparent font-mono text-xs font-bold text-on-surface focus:outline-none"
                                    />
                                </div>
                                <div className="rounded-lg bg-surface-container-lowest p-2">
                                    <label className="block font-label-sm text-[10px] text-tertiary uppercase">
                                        Flow Direction
                                    </label>
                                    <select
                                        value={
                                            formBidirectional ? 'bi' : 'uni'
                                        }
                                        onChange={(e) =>
                                            setFormBidirectional(
                                                e.target.value === 'bi',
                                            )
                                        }
                                        className="mt-0.5 w-full cursor-pointer bg-transparent font-label-md text-xs font-semibold text-primary focus:outline-none"
                                    >
                                        <option value="bi">
                                            ⇄ Bidirectional (Two-Way)
                                        </option>
                                        <option value="uni">
                                            → Unidirectional (One-Way)
                                        </option>
                                    </select>
                                </div>
                            </div>

                            {/* Waypoint Sequence Strip Pill */}
                            <div className="mb-space-md rounded-lg bg-surface-container-lowest p-space-sm">
                                <div className="mb-space-xs flex items-center justify-between font-label-sm text-label-sm text-tertiary">
                                    <span>
                                        SEKUENS WAYPOINT ({draftCoords.length}{' '}
                                        TOTAL)
                                    </span>
                                    <span className="font-semibold text-primary">
                                        Total Panjang: {activeLength}m
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                                    {draftCoords.map((pt, idx) => {
                                        const isStart = idx === 0;
                                        const isGoal =
                                            idx === draftCoords.length - 1 &&
                                            draftCoords.length > 1;
                                        return (
                                            <div
                                                key={idx}
                                                className="flex shrink-0 items-center gap-1"
                                            >
                                                <span
                                                    className={`rounded px-2 py-1 font-mono text-[10px] font-bold ${
                                                        isStart
                                                            ? 'bg-primary-container text-white'
                                                            : isGoal
                                                              ? 'bg-emerald-600 text-white'
                                                              : 'bg-surface-container text-on-surface'
                                                    }`}
                                                >
                                                    WP-{idx + 1} [{pt.x},{' '}
                                                    {pt.y}]
                                                </span>
                                                {idx <
                                                    draftCoords.length - 1 && (
                                                    <span className="material-symbols-outlined text-[13px] text-tertiary">
                                                        arrow_forward
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Slider Tuning: Inflation corridor & Max Speed */}
                            <div className="mb-space-md space-y-2.5 rounded-lg bg-surface-container-lowest p-space-sm">
                                <div>
                                    <div className="flex items-center justify-between font-label-sm text-label-sm">
                                        <span className="text-tertiary">
                                            Safety Inflation Corridor:
                                        </span>
                                        <span className="font-mono font-bold text-primary">
                                            {inflationCorridor.toFixed(2)} meter
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.3"
                                        max="1.2"
                                        step="0.1"
                                        value={inflationCorridor}
                                        onChange={(e) =>
                                            setInflationCorridor(
                                                parseFloat(e.target.value),
                                            )
                                        }
                                        className="mt-1 h-1.5 w-full cursor-pointer accent-primary"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between font-label-sm text-label-sm">
                                        <span className="text-tertiary">
                                            Max Linear Velocity Limit:
                                        </span>
                                        <span className="font-mono font-bold text-on-surface">
                                            {Number(formMaxSpeed).toFixed(2)}{' '}
                                            m/s
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.2"
                                        max="3.0"
                                        step="0.1"
                                        value={formMaxSpeed}
                                        onChange={(e) =>
                                            setFormMaxSpeed(
                                                parseFloat(e.target.value),
                                            )
                                        }
                                        className="mt-1 h-1.5 w-full cursor-pointer accent-secondary"
                                    />
                                </div>
                            </div>

                            {/* Inspector Action Buttons */}
                            <div className="flex items-center gap-space-sm">
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={handleSavePathplan}
                                    className="flex-1 cursor-pointer rounded-lg bg-primary px-space-md py-2 font-label-sm text-label-sm font-semibold tracking-wide text-on-primary uppercase shadow-xs transition-all hover:bg-on-primary-fixed-variant"
                                >
                                    {saving
                                        ? 'Menyimpan...'
                                        : editingPathId
                                          ? 'Update & Deploy ke Nav2'
                                          : 'Simpan & Deploy Path Baru'}
                                </button>
                                {draftCoords.length > 2 && (
                                    <button
                                        type="button"
                                        onClick={handleUndoLastPoint}
                                        className="cursor-pointer rounded-lg bg-surface-container px-space-md py-2 font-label-sm text-label-sm text-on-surface transition-all hover:bg-surface-container-high"
                                    >
                                        Undo WP
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Card 5: List of Saved Path Plans Header */}
                        <div className="rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs">
                            <div className="mb-space-sm flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                                        Daftar Lintasan Jalur Armada
                                    </h2>
                                    <span className="rounded-full bg-surface-container px-2 py-0.5 font-label-sm text-label-sm text-tertiary">
                                        {filteredPaths.length} Rute
                                    </span>
                                </div>
                                <select
                                    value={flowFilter}
                                    onChange={(e) =>
                                        setFlowFilter(
                                            e.target.value as
                                                | 'all'
                                                | 'bi'
                                                | 'uni',
                                        )
                                    }
                                    className="cursor-pointer rounded bg-surface-container-low px-2 py-1 font-label-sm text-label-sm text-on-surface focus:outline-none"
                                >
                                    <option value="all">Filter: Semua</option>
                                    <option value="bi">Bidirectional</option>
                                    <option value="uni">One-Way</option>
                                </select>
                            </div>

                            <div className="space-y-space-sm">
                                {filteredPaths.map((path) => {
                                    const isSelected =
                                        selectedPath?.id === path.id;
                                    const lengthM = calculatePathLength(
                                        path.coordinates,
                                    );

                                    return (
                                        <div
                                            key={path.id}
                                            onClick={() =>
                                                selectExistingPath(path)
                                            }
                                            className={`cursor-pointer rounded-xl border p-space-md transition-all ${
                                                isSelected
                                                    ? 'border-primary-container bg-surface-container-low/70 shadow-xs'
                                                    : 'border-slate-200/80 bg-surface-container-lowest shadow-2xs hover:border-primary/40'
                                            }`}
                                        >
                                            <div className="mb-space-xs flex items-start justify-between">
                                                <div className="flex items-center gap-space-sm">
                                                    <span className="material-symbols-outlined text-[20px] text-primary">
                                                        alt_route
                                                    </span>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                                                                {path.name}
                                                            </span>
                                                            <StatusBadge
                                                                status={
                                                                    path.is_bidirectional
                                                                        ? 'moving'
                                                                        : 'idle'
                                                                }
                                                                label={
                                                                    path.is_bidirectional
                                                                        ? 'BIDIRECTIONAL'
                                                                        : 'ONE-WAY'
                                                                }
                                                            />
                                                        </div>
                                                        <span className="font-body-sm text-body-sm text-tertiary">
                                                            {path.description ??
                                                                'Nav2 Transit Trajectory'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="font-mono font-label-sm text-label-sm font-bold text-primary">
                                                    {lengthM}m
                                                </span>
                                            </div>

                                            <div className="my-space-xs grid grid-cols-3 gap-space-xs rounded-lg bg-surface-container-low px-space-sm py-space-xs font-label-sm text-label-sm text-tertiary">
                                                <div>
                                                    Waypoints:{' '}
                                                    <strong className="text-on-surface">
                                                        {path.coordinates
                                                            ?.length ?? 0}{' '}
                                                        WPs
                                                    </strong>
                                                </div>
                                                <div>
                                                    Flow:{' '}
                                                    <strong className="text-on-surface">
                                                        {path.is_bidirectional
                                                            ? 'Dual'
                                                            : 'Single'}
                                                    </strong>
                                                </div>
                                                <div>
                                                    Max Speed:{' '}
                                                    <strong className="text-primary">
                                                        {path.max_speed} m/s
                                                    </strong>
                                                </div>
                                            </div>

                                            <div
                                                className="flex items-center justify-between pt-space-xs"
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <span className="font-mono text-[10px] text-tertiary">
                                                    WP-1 → WP-
                                                    {path.coordinates?.length ??
                                                        1}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            selectExistingPath(
                                                                path,
                                                            )
                                                        }
                                                        className="cursor-pointer rounded p-1 text-primary hover:bg-surface-container"
                                                        title="Sorot di Map"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">
                                                            visibility
                                                        </span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            startEditPathMode(
                                                                path,
                                                            )
                                                        }
                                                        className="cursor-pointer rounded p-1 text-on-surface-variant hover:bg-surface-container"
                                                        title="Edit Lintasan di Peta"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">
                                                            edit
                                                        </span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleExportYaml(
                                                                path,
                                                            )
                                                        }
                                                        className="cursor-pointer rounded p-1 text-on-surface-variant hover:bg-surface-container"
                                                        title="Ekspor Nav2 YAML"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">
                                                            download
                                                        </span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleDeletePathplan(
                                                                path,
                                                            )
                                                        }
                                                        className="cursor-pointer rounded p-1 text-on-surface-variant hover:bg-error-container hover:text-error"
                                                        title="Hapus Lintasan"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">
                                                            delete
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Card 6: Panel Footer Quick Dock */}
                        <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-space-md font-label-sm text-label-sm text-tertiary shadow-xs">
                            <div className="flex items-center gap-space-xs">
                                <span className="material-symbols-outlined text-[16px] text-emerald-600">
                                    dns
                                </span>
                                <span>ROS2 Nav2 Action Server: READY</span>
                            </div>
                            <span>YAML v1.2</span>
                        </div>
                    </div>
                </aside>
            </div>
        </>
    );
}
