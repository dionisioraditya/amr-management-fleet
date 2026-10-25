import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
    type AngleConstraintMode,
    calculatePathLength,
    calculatePolygonArea,
    computeFilletedPathGeometry,
    discretizeFilletedPathForRos2,
    InteractiveBlueprintCanvas,
} from '@/components/fleet/interactive-blueprint-canvas';
import { StatusBadge } from '@/components/fleet/status-badge';
import type {
    FacilityMap,
    KeepoutZone,
    KeepoutZoneType,
    PathCoordinate,
    Pathplan,
} from '@/types';

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
    const [editingPathId, setEditingPathId] = useState<number | null>(
        pathplans[0]?.id ?? null,
    );
    const [curveMode, setCurveMode] = useState<'fillet' | 'linear'>('fillet');
    const [angleConstraintMode, setAngleConstraintMode] =
        useState<AngleConstraintMode>('ortho-45');
    const [cornerRadius, setCornerRadius] = useState<number>(
        pathplans[0]?.coordinates?.[1]?.r ?? 0.8,
    );
    const [snapEnabled, setSnapEnabled] = useState(true);
    const [showCostmap, setShowCostmap] = useState(true);
    const [showKeepOutZones, setShowKeepOutZones] = useState(true);
    const [flowFilter, setFlowFilter] = useState<'all' | 'bi' | 'uni'>('all');

    // Keep-Out Zone Polygon Pen Tool State
    const [zones, setZones] = useState<KeepoutZone[]>(
        activeMap?.keepout_zones ?? maps[0]?.keepout_zones ?? [],
    );
    const [isDrawingZone, setIsDrawingZone] = useState(false);
    const [selectedZone, setSelectedZone] = useState<KeepoutZone | null>(null);
    const [draftZoneCoords, setDraftZoneCoords] = useState<PathCoordinate[]>(
        [],
    );
    const [zoneName, setZoneName] = useState('RESTRICTED-ZONE-01');
    const [zoneType, setZoneType] = useState<KeepoutZoneType>('keep_out');
    const [zoneSpeedLimit, setZoneSpeedLimit] = useState('0.40');
    const [savingZone, setSavingZone] = useState(false);

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
        pathplans[0]?.coordinates ?? [],
    );
    const [saving, setSaving] = useState(false);

    const effectiveCornerRadius = curveMode === 'linear' ? 0 : cornerRadius;

    const selectExistingPath = (path: Pathplan) => {
        setSelectedPath(path);
        setIsDrawing(false);
        setEditingPathId(path.id);
        setFormName(path.name);
        setFormDescription(path.description ?? '');
        setFormBidirectional(path.is_bidirectional);
        setFormMaxSpeed(path.max_speed);
        const coords = path.coordinates ?? [];
        setDraftCoords(coords);
        const existingRadius = coords.find(
            (pt, idx) =>
                idx > 0 && idx < coords.length - 1 && pt.r !== undefined,
        )?.r;
        if (existingRadius !== undefined) {
            setCornerRadius(existingRadius);
            setCurveMode(existingRadius <= 0.01 ? 'linear' : 'fillet');
        }
    };

    const startNewPathMode = () => {
        setIsDrawing(true);
        setEditingPathId(null);
        setSelectedPath(null);
        setFormName(`PATH-CORRIDOR-0${pathplans.length + 1}`);
        setFormDescription('Autonomous AMR virtual guidance lane');
        setFormBidirectional(true);
        setFormMaxSpeed(1.2);
        setDraftCoords([]);
        toast.info(
            'Guidance Pen Active: Click anywhere on the map or click a station to place WP-1 (Start node).',
        );
    };

    const startEditPathMode = (path: Pathplan) => {
        selectExistingPath(path);
        setIsDrawing(true);
        toast.info(
            `Editing ${path.name}. Drag existing vertices or click map to append segments.`,
        );
    };

    const handleAddPathPoint = (coord: PathCoordinate) => {
        const activeR = curveMode === 'linear' ? 0 : cornerRadius;
        setDraftCoords((prev) => [
            ...prev,
            { x: coord.x, y: coord.y, r: coord.r ?? activeR },
        ]);
    };

    const handleUpdatePathPoint = (index: number, coord: PathCoordinate) => {
        setDraftCoords((prev) =>
            prev.map((pt, i) => (i === index ? coord : pt)),
        );
    };

    const handleRemovePathPoint = (index: number) => {
        setDraftCoords((prev) => prev.filter((_, i) => i !== index));
    };

    const handleClearAllPoints = () => {
        setDraftCoords([]);
        toast.info(
            'Cleared all path vertices. Click anywhere on the map to place WP-1.',
        );
    };

    const handleReverseDirection = () => {
        setDraftCoords((prev) => [...prev].reverse());
        toast.success('Reversed trajectory vertex sequence.');
    };

    const handleGlobalCornerRadiusChange = (newRadius: number) => {
        setCornerRadius(newRadius);
        if (newRadius <= 0.01) {
            setCurveMode('linear');
        } else if (curveMode === 'linear') {
            setCurveMode('fillet');
        }
        setDraftCoords((prev) =>
            prev.map((pt) => ({
                ...pt,
                r: newRadius,
            })),
        );
    };

    const handleUndoLastPoint = () => {
        setDraftCoords((prev) => prev.slice(0, -1));
    };

    const handleClearSelection = () => {
        if (isDrawing || isDrawingZone) return;
        setSelectedPath(null);
        setEditingPathId(null);
        setDraftCoords([]);
        setSelectedZone(null);
        setDraftZoneCoords([]);
    };

    const startNewZoneMode = () => {
        setIsDrawing(false);
        setSelectedPath(null);
        setEditingPathId(null);
        setDraftCoords([]);
        setSelectedZone(null);
        setDraftZoneCoords([]);
        setZoneName(`RESTRICTED-ZONE-0${zones.length + 1}`);
        setZoneType('keep_out');
        setZoneSpeedLimit('0.40');
        setShowKeepOutZones(true);
        setIsDrawingZone(true);
        toast.info(
            'Polygon Keep-Out Pen Active: Click 3+ corners on the map, then click V1 or "Close & Save Zone".',
        );
    };

    const handleSelectKeepoutZone = (zone: KeepoutZone) => {
        setIsDrawing(false);
        setIsDrawingZone(false);
        setSelectedPath(null);
        setEditingPathId(null);
        setDraftCoords([]);
        setSelectedZone(zone);
        setDraftZoneCoords(zone.coordinates ?? []);
        setZoneName(zone.name);
        setZoneType(zone.zone_type);
        setZoneSpeedLimit(String(zone.speed_limit ?? 0.4));
    };

    const handleAddZonePoint = (coord: PathCoordinate) => {
        setDraftZoneCoords((prev) => [...prev, coord]);
    };

    const handleUpdateZonePoint = (index: number, coord: PathCoordinate) => {
        setDraftZoneCoords((prev) =>
            prev.map((pt, i) => (i === index ? coord : pt)),
        );
    };

    const handleSaveKeepoutZone = async () => {
        if (draftZoneCoords.length < 3) {
            toast.error('A polygon zone requires at least 3 corner vertices.');
            return;
        }

        setSavingZone(true);
        const payload = {
            name:
                zoneName.trim() || `RESTRICTED-ZONE-0${zones.length + 1}`,
            zone_type: zoneType,
            speed_limit:
                zoneType === 'speed_limit'
                    ? parseFloat(zoneSpeedLimit) || 0.4
                    : null,
            color: zoneType === 'keep_out' ? '#dc2626' : '#d97706',
            is_active: selectedZone ? selectedZone.is_active : true,
            coordinates: draftZoneCoords,
        };

        try {
            const url = selectedZone
                ? `/api/keepout-zones/${selectedZone.id}`
                : `/api/maps/${currentMapId}/keepout-zones`;
            const method = selectedZone ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const json = await response.json();
            if (response.ok && json.data) {
                const savedZone: KeepoutZone = json.data;
                setZones((prev) =>
                    selectedZone
                        ? prev.map((z) =>
                              z.id === savedZone.id ? savedZone : z,
                          )
                        : [...prev, savedZone],
                );
                setSelectedZone(savedZone);
                setDraftZoneCoords(savedZone.coordinates ?? []);
                setIsDrawingZone(false);
                toast.success(
                    `Zone '${savedZone.name}' (${savedZone.area_m2 ?? calculatePolygonArea(draftZoneCoords)} m²) saved & rasterized to Nav2 costmap mask.`,
                );
            } else {
                toast.error(json.message || 'Failed to save keep-out zone.');
            }
        } catch {
            toast.error('Network error while saving keep-out zone.');
        } finally {
            setSavingZone(false);
        }
    };

    const handleDeleteKeepoutZone = async (zone: KeepoutZone) => {
        try {
            const response = await fetch(`/api/keepout-zones/${zone.id}`, {
                method: 'DELETE',
                headers: { Accept: 'application/json' },
            });
            if (response.ok) {
                setZones((prev) => prev.filter((z) => z.id !== zone.id));
                if (selectedZone?.id === zone.id) {
                    setSelectedZone(null);
                    setDraftZoneCoords([]);
                }
                toast.success(`Zone '${zone.name}' deleted.`);
            }
        } catch {
            toast.error('Failed to delete keep-out zone.');
        }
    };

    const handleSavePathplan = async () => {
        if (draftCoords.length < 2) {
            toast.error('Trajectory requires at least 2 waypoints.');
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
                        ? `Pathplan ${payload.name} updated.`
                        : `Pathplan ${payload.name} saved & deployed to Nav2.`,
                );
                setIsDrawing(false);
                if (json.data) {
                    setSelectedPath(json.data);
                    setEditingPathId(json.data.id);
                }
                router.reload();
            } else {
                toast.error(json.message || 'Failed to save pathplan.');
            }
        } catch {
            toast.error('Network error while contacting Fleet Server.');
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
                toast.success(`Pathplan ${path.name} deleted.`);
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
                toast.error('Failed to delete pathplan.');
            }
        } catch {
            toast.error('Network error while deleting pathplan.');
        }
    };

    const handleExportYaml = (path: Pathplan) => {
        const densePoses = discretizeFilletedPathForRos2(
            path.coordinates ?? [],
            effectiveCornerRadius,
            0.15,
        );
        const yamlContent = [
            `# ROS 2 Nav2 Virtual Guidance Path & Fillet Trajectory Export`,
            `path_name: "${path.name}"`,
            `map_id: ${path.map_id}`,
            `is_bidirectional: ${path.is_bidirectional}`,
            `max_linear_velocity: ${path.max_speed}`,
            `default_corner_fillet_radius_m: ${effectiveCornerRadius}`,
            `safety_inflation_corridor_m: ${inflationCorridor}`,
            `control_vertices:`,
            ...(path.coordinates ?? []).map(
                (pt, i) =>
                    `  - index: ${i}\n    x: ${pt.x}\n    y: ${pt.y}\n    corner_radius_m: ${pt.r ?? effectiveCornerRadius}`,
            ),
            `discretized_nav2_poses:`,
            ...densePoses.map(
                (pose, i) =>
                    `  - seq: ${i}\n    x: ${pose.x}\n    y: ${pose.y}\n    theta: ${pose.theta}\n    curvature_k: ${pose.kappa}`,
            ),
        ].join('\n');

        const blob = new Blob([yamlContent], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${path.name.toLowerCase().replace(/\s+/g, '_')}_nav2.yaml`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(
            `Exported ${path.name} YAML (${densePoses.length} interpolated Nav2 poses).`,
        );
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
                      (acc, p) =>
                          acc +
                          calculatePathLength(
                              p.coordinates,
                              effectiveCornerRadius,
                          ),
                      0,
                  ) / pathplans.length
              ).toFixed(1)
            : '0.0';

    const activeFilletGeom = computeFilletedPathGeometry(
        draftCoords,
        effectiveCornerRadius,
    );
    const activeLength = Number(activeFilletGeom.totalLengthM.toFixed(1));

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
                        keepoutZones={zones}
                        selectedPathplanId={selectedPath?.id ?? null}
                        selectedKeepoutZoneId={selectedZone?.id ?? null}
                        onSelectPathplan={selectExistingPath}
                        onSelectKeepoutZone={handleSelectKeepoutZone}
                        onClearSelection={handleClearSelection}
                        mode={
                            isDrawingZone
                                ? 'draw-zone'
                                : isDrawing
                                  ? 'draw-path'
                                  : 'view'
                        }
                        draftCoordinates={draftCoords}
                        onAddPathPoint={handleAddPathPoint}
                        onUpdatePathPoint={handleUpdatePathPoint}
                        draftZoneCoordinates={draftZoneCoords}
                        onAddZonePoint={handleAddZonePoint}
                        onUpdateZonePoint={handleUpdateZonePoint}
                        onCompleteZone={handleSaveKeepoutZone}
                        defaultCornerRadius={effectiveCornerRadius}
                        angleConstraintMode={angleConstraintMode}
                        snapStep={snapEnabled ? 0.5 : 0}
                        inflationRadius={inflationCorridor}
                        showCostmap={showCostmap}
                        showKeepOutZones={showKeepOutZones}
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
                    <button
                        type="button"
                        onClick={() => setShowKeepOutZones((k) => !k)}
                        className={`flex cursor-pointer items-center gap-1 rounded px-2 py-1 font-label-sm text-xs transition-all ${
                            showKeepOutZones
                                ? 'bg-red-50 font-semibold text-red-700 ring-1 ring-red-200'
                                : 'text-on-surface-variant hover:bg-slate-100'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">
                            do_not_disturb_on
                        </span>
                        Keep-Out ({zones.length})
                    </button>
                </div>

                {/* Active Drawing Mode Floating Banner */}
                {isDrawing && (
                    <div className="pointer-events-auto absolute top-4 left-[580px] z-30 flex items-center gap-space-md rounded-xl bg-on-background/95 px-space-lg py-space-sm text-surface-container-lowest shadow-lg backdrop-blur-md">
                        <span className="material-symbols-outlined text-[20px] text-emerald-400">
                            gesture
                        </span>
                        <div className="flex flex-col">
                            <span className="font-headline-sm text-headline-sm tracking-tight text-white uppercase">
                                {draftCoords.length === 0
                                    ? 'Guidance Pen Active (Click map to place WP-1)'
                                    : `Guidance Pen Active (${draftCoords.length} Nodes · R=${effectiveCornerRadius.toFixed(1)}m)`}
                            </span>
                            <span className="font-label-sm text-label-sm text-outline-variant">
                                {draftCoords.length === 0
                                    ? 'Click anywhere on the blueprint map to start your trajectory corridor.'
                                    : `Angle Lock: ${
                                          angleConstraintMode === 'ortho-45'
                                              ? '0° / 45° / 90°'
                                              : angleConstraintMode ===
                                                  'ortho-90'
                                                ? 'Horizontal / Vertical Only'
                                                : 'Free (Hold Shift for 45°)'
                                      } · Drag nodes to adjust.`}
                            </span>
                        </div>
                        {draftCoords.length > 0 && (
                            <button
                                type="button"
                                onClick={handleUndoLastPoint}
                                className="cursor-pointer rounded bg-white/15 px-2.5 py-1 font-label-sm text-label-sm text-white uppercase hover:bg-white/25"
                            >
                                Undo Node
                            </button>
                        )}
                        {draftCoords.length > 0 && (
                            <button
                                type="button"
                                onClick={handleClearAllPoints}
                                className="cursor-pointer rounded bg-white/15 px-2 py-1 font-label-sm text-label-sm text-rose-300 uppercase hover:bg-rose-500/30"
                            >
                                Clear
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setIsDrawing(false)}
                            className="cursor-pointer rounded bg-primary-container px-3 py-1 font-label-sm text-label-sm font-bold text-on-primary-container uppercase"
                        >
                            Finish Pen
                        </button>
                    </div>
                )}

                {/* Active Keep-Out Polygon Drawing Banner */}
                {isDrawingZone && (
                    <div className="pointer-events-auto absolute top-4 left-[580px] z-30 flex items-center gap-space-md rounded-xl border border-red-400/50 bg-red-950/95 px-space-lg py-space-sm text-white shadow-lg backdrop-blur-md">
                        <span className="material-symbols-outlined text-[20px] text-red-400">
                            pentagon
                        </span>
                        <div className="flex flex-col">
                            <span className="font-headline-sm text-headline-sm tracking-tight text-white uppercase">
                                {draftZoneCoords.length === 0
                                    ? 'Keep-Out Polygon Pen Active (Click map to place V1)'
                                    : `Keep-Out Polygon Pen (${draftZoneCoords.length} Vertices · ${calculatePolygonArea(draftZoneCoords)} m²)`}
                            </span>
                            <span className="font-label-sm text-label-sm text-red-200">
                                Click 3+ corners on the map, then click V1 or
                                &ldquo;Close &amp; Save Zone&rdquo; to rasterize
                                Nav2 costmap mask.
                            </span>
                        </div>
                        {draftZoneCoords.length > 0 && (
                            <button
                                type="button"
                                onClick={() =>
                                    setDraftZoneCoords((prev) =>
                                        prev.slice(0, -1),
                                    )
                                }
                                className="cursor-pointer rounded bg-white/15 px-2.5 py-1 font-label-sm text-label-sm text-white uppercase hover:bg-white/25"
                            >
                                Undo Vertex
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                setIsDrawingZone(false);
                                setDraftZoneCoords([]);
                            }}
                            className="cursor-pointer rounded bg-white/15 px-2.5 py-1 font-label-sm text-label-sm text-red-200 uppercase hover:bg-white/25"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={draftZoneCoords.length < 3 || savingZone}
                            onClick={handleSaveKeepoutZone}
                            className="cursor-pointer rounded bg-emerald-500 px-3 py-1 font-label-sm text-label-sm font-bold text-slate-950 uppercase disabled:opacity-40"
                        >
                            {savingZone ? 'Saving...' : 'Close & Save Zone'}
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
                                        Configure virtual guidance tracks,
                                        tangential corner fillets, and keep-out
                                        masks.
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={startNewZoneMode}
                                        className="flex cursor-pointer items-center gap-1 rounded-lg bg-red-600 px-3 py-2.5 font-label-sm text-label-sm font-semibold tracking-wider text-white uppercase shadow-xs transition-all hover:bg-red-700 active:scale-95"
                                        title="Draw Restricted Keep-Out Polygon Mask for Nav2 Global/Local Planner"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">
                                            pentagon
                                        </span>
                                        <span>+ KEEP-OUT</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={startNewPathMode}
                                        className="flex cursor-pointer items-center gap-space-xs rounded-lg bg-primary px-space-md py-2.5 font-label-sm text-label-sm font-semibold tracking-wider text-on-primary uppercase shadow-xs transition-all hover:bg-on-primary-fixed-variant active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">
                                            add_road
                                        </span>
                                        <span>+ NEW PATH</span>
                                    </button>
                                </div>
                            </div>

                            {/* Active Map Selector */}
                            <div className="flex items-center gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
                                <span className="material-symbols-outlined ml-space-xs text-[20px] text-primary">
                                    map
                                </span>
                                <div className="min-w-0 flex-1">
                                    <label className="block font-label-sm text-label-sm text-tertiary uppercase">
                                        Active Facility Map
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
                                    CORNER R
                                </div>
                                <div className="mt-0.5 font-headline-md text-headline-md font-bold text-emerald-700">
                                    {effectiveCornerRadius.toFixed(1)}
                                    <span className="text-xs font-normal">m</span>
                                </div>
                                <div className="flex items-center gap-0.5 font-label-sm text-label-sm font-semibold text-emerald-600">
                                    <span className="material-symbols-outlined text-[12px]">
                                        rounded_corner
                                    </span>{' '}
                                    {curveMode === 'fillet'
                                        ? 'G1 Arc'
                                        : 'Sharp'}
                                </div>
                            </div>
                        </div>

                        {/* Card 3: Interactive Drawing & CAD Guideway Toolbar */}
                        <div className="rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs">
                            <div className="mb-space-xs flex items-center justify-between">
                                <span className="font-label-sm text-label-sm font-semibold tracking-wider text-tertiary uppercase">
                                    CAD Guideway & Angle Constraint Tools
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setSnapEnabled((s) => !s)}
                                    className="cursor-pointer font-mono text-[10px] font-bold text-primary hover:underline"
                                >
                                    Grid Snap: {snapEnabled ? '0.5m ON' : 'OFF'}
                                </button>
                            </div>

                            {/* Row 1: Corner Transition Mode (Fillet Arc vs Linear) */}
                            <div className="mb-2 grid grid-cols-2 gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCurveMode('fillet');
                                        const nextR =
                                            cornerRadius <= 0.01
                                                ? 0.8
                                                : cornerRadius;
                                        handleGlobalCornerRadiusChange(nextR);
                                    }}
                                    className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 font-label-sm text-xs transition-all ${
                                        curveMode === 'fillet'
                                            ? 'bg-emerald-600 font-semibold text-white shadow-2xs'
                                            : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[16px]">
                                        rounded_corner
                                    </span>
                                    <span>
                                        Fillet Arc (R={cornerRadius.toFixed(1)}m)
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCurveMode('linear');
                                        setDraftCoords((prev) =>
                                            prev.map((pt) => ({ ...pt, r: 0 })),
                                        );
                                    }}
                                    className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 font-label-sm text-xs transition-all ${
                                        curveMode === 'linear'
                                            ? 'bg-primary-fixed font-semibold text-on-primary-fixed shadow-2xs'
                                            : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[16px]">
                                        polyline
                                    </span>
                                    <span>Linear 0° Pivot (Sharp)</span>
                                </button>
                            </div>

                            {/* Row 2: Pen Angle Lock Constraint (Horizontal / Vertical / 45° Diagonal) */}
                            <div className="grid grid-cols-3 gap-1.5">
                                {(
                                    [
                                        {
                                            id: 'ortho-45',
                                            label: 'Ortho + 45°',
                                            sub: '0° / 45° / 90°',
                                            icon: 'architecture',
                                        },
                                        {
                                            id: 'ortho-90',
                                            label: 'Ortho 90°',
                                            sub: 'H / V Aisles',
                                            icon: 'grid_goldenratio',
                                        },
                                        {
                                            id: 'free',
                                            label: 'Free Vector',
                                            sub: 'Any Angle',
                                            icon: 'gesture',
                                        },
                                    ] as const
                                ).map((modeItem) => (
                                    <button
                                        key={modeItem.id}
                                        type="button"
                                        onClick={() => {
                                            setAngleConstraintMode(modeItem.id);
                                            if (!isDrawing) {
                                                setIsDrawing(true);
                                            }
                                        }}
                                        className={`flex cursor-pointer flex-col items-start rounded-lg border px-2.5 py-1.5 text-left transition-all ${
                                            angleConstraintMode === modeItem.id
                                                ? 'border-primary bg-primary-fixed/80 text-on-primary-fixed shadow-2xs'
                                                : 'border-slate-200/70 bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1 font-label-sm text-[11px] font-bold">
                                            <span className="material-symbols-outlined text-[14px]">
                                                {modeItem.icon}
                                            </span>
                                            <span>{modeItem.label}</span>
                                        </div>
                                        <span className="font-mono text-[9px] opacity-75">
                                            {modeItem.sub}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Card 4: Active Path Inspector or Neutral State Prompt */}
                        {selectedPath || isDrawing || draftCoords.length > 0 ? (
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
                                <div className="flex items-center gap-1.5">
                                    {draftCoords.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleClearAllPoints}
                                            title="Clear All Vertices"
                                            className="cursor-pointer rounded-lg border border-slate-200 bg-surface-container-low px-2 py-1 font-label-sm text-[10px] font-semibold text-rose-600 uppercase hover:bg-rose-50"
                                        >
                                            Clear
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        disabled={draftCoords.length < 2}
                                        onClick={handleReverseDirection}
                                        title="Reverse Vertex Order (Flip Flow Direction)"
                                        className="cursor-pointer rounded-lg border border-slate-200 bg-surface-container-low px-2 py-1 font-label-sm text-[10px] font-semibold text-on-surface uppercase hover:bg-surface-container disabled:opacity-40"
                                    >
                                        ⇄ Reverse
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsDrawing((d) => !d)}
                                        className={`cursor-pointer rounded-lg px-2.5 py-1 font-label-sm text-[10px] font-bold uppercase transition-all ${
                                            isDrawing
                                                ? 'bg-primary-container text-on-primary-container'
                                                : 'bg-primary text-white shadow-2xs hover:bg-on-primary-fixed-variant'
                                        }`}
                                    >
                                        {isDrawing
                                            ? '✓ Pen Active'
                                            : '+ Pen Draw'}
                                    </button>
                                </div>
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

                            {/* Waypoint / Vertex Sequence Strip with Corner Fillet Diagnostics */}
                            <div className="mb-space-md rounded-lg bg-surface-container-lowest p-space-sm">
                                <div className="mb-space-xs flex items-center justify-between font-label-sm text-label-sm text-tertiary">
                                    <span>
                                        GUIDEWAY VERTICES ({draftCoords.length}{' '}
                                        NODES ·{' '}
                                        {
                                            activeFilletGeom.corners.filter(
                                                (c) => c.effectiveRadius > 0.01,
                                            ).length
                                        }{' '}
                                        ARCS)
                                    </span>
                                    <span className="font-mono font-semibold text-primary">
                                        Arc Length: {activeLength}m
                                    </span>
                                </div>
                                {draftCoords.length === 0 ? (
                                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300/90 bg-white/60 p-3 text-xs text-on-surface-variant">
                                        <span className="material-symbols-outlined text-[18px] text-primary">
                                            add_location
                                        </span>
                                        <span>
                                            No vertices placed yet. Click anywhere on the map or click a station to place <strong>WP-1 (Start node)</strong>.
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                                        {draftCoords.map((pt, idx) => {
                                            const isStart = idx === 0;
                                            const isGoal =
                                                idx === draftCoords.length - 1 &&
                                                draftCoords.length > 1;
                                            const cornerInfo =
                                                activeFilletGeom.corners.find(
                                                    (c) => c.vertexIndex === idx,
                                                );
                                            return (
                                                <div
                                                    key={idx}
                                                    className="flex shrink-0 items-center gap-1"
                                                >
                                                    <div
                                                        className={`flex items-center gap-1 rounded px-2 py-1 font-mono text-[10px] font-bold ${
                                                            isStart
                                                                ? 'bg-primary-container text-white'
                                                                : isGoal
                                                                  ? 'bg-emerald-600 text-white'
                                                                  : 'border border-slate-200 bg-surface-container text-on-surface'
                                                        }`}
                                                    >
                                                        <span>
                                                            WP-{idx + 1} [{pt.x},{' '}
                                                            {pt.y}]
                                                        </span>
                                                        {cornerInfo &&
                                                            cornerInfo.effectiveRadius >
                                                                0.01 && (
                                                                <span className="rounded bg-emerald-950/80 px-1 py-0.2 text-[9px] text-emerald-300">
                                                                    R
                                                                    {cornerInfo.effectiveRadius.toFixed(
                                                                        1,
                                                                    )}
                                                                    m·
                                                                    {Math.round(
                                                                        cornerInfo.turnAngleDeg,
                                                                    )}
                                                                    °
                                                                </span>
                                                            )}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleRemovePathPoint(
                                                                    idx,
                                                                )
                                                            }
                                                            title={`Delete WP-${idx + 1}`}
                                                            className="ml-0.5 cursor-pointer rounded px-1 text-[10px] opacity-75 hover:bg-black/20 hover:opacity-100"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
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
                                )}
                            </div>

                            {/* Slider Tuning: Corner Turning Radius (R), Inflation Corridor & Max Speed */}
                            <div className="mb-space-md space-y-3 rounded-lg bg-surface-container-lowest p-space-sm">
                                {/* Corner Turning Radius (Fillet R) */}
                                <div>
                                    <div className="flex items-center justify-between font-label-sm text-label-sm">
                                        <span className="flex items-center gap-1 font-semibold text-emerald-700">
                                            <span className="material-symbols-outlined text-[14px]">
                                                rounded_corner
                                            </span>
                                            Corner Turning Radius (Fillet R):
                                        </span>
                                        <span className="font-mono font-bold text-emerald-700">
                                            {effectiveCornerRadius.toFixed(2)}{' '}
                                            meter
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.0"
                                        max="2.5"
                                        step="0.1"
                                        value={effectiveCornerRadius}
                                        onChange={(e) =>
                                            handleGlobalCornerRadiusChange(
                                                parseFloat(e.target.value),
                                            )
                                        }
                                        className="mt-1 h-1.5 w-full cursor-pointer accent-emerald-600"
                                    />
                                    <div className="mt-1 flex items-center justify-between gap-1">
                                        {[
                                            { label: '0.0m Sharp', val: 0.0 },
                                            { label: '0.5m Tight', val: 0.5 },
                                            { label: '0.8m Std AGV', val: 0.8 },
                                            {
                                                label: '1.2m Wide',
                                                val: 1.2,
                                            },
                                            {
                                                label: '1.8m Highway',
                                                val: 1.8,
                                            },
                                        ].map((preset) => (
                                            <button
                                                key={preset.label}
                                                type="button"
                                                onClick={() =>
                                                    handleGlobalCornerRadiusChange(
                                                        preset.val,
                                                    )
                                                }
                                                className={`cursor-pointer rounded px-1.5 py-0.5 font-mono text-[9px] transition-all ${
                                                    Math.abs(
                                                        effectiveCornerRadius -
                                                            preset.val,
                                                    ) < 0.05
                                                        ? 'bg-emerald-600 font-bold text-white'
                                                        : 'bg-surface-container text-on-surface-variant hover:bg-slate-200'
                                                }`}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

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
                                        ? 'Deploying...'
                                        : editingPathId
                                          ? 'Update & Deploy to Nav2'
                                          : 'Save & Deploy Path'}
                                </button>
                                {draftCoords.length > 2 && (
                                    <button
                                        type="button"
                                        onClick={handleUndoLastPoint}
                                        className="cursor-pointer rounded-lg bg-surface-container px-space-md py-2 font-label-sm text-label-sm text-on-surface uppercase transition-all hover:bg-surface-container-high"
                                    >
                                        Undo Node
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : selectedZone || isDrawingZone ? (
                        <div className="rounded-xl border border-red-200 bg-white p-space-lg shadow-xs">
                            <div className="mb-space-sm flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="h-3 w-3 rounded-full bg-red-600 ring-4 ring-red-100" />
                                    <div>
                                        <div className="font-headline-sm text-headline-sm font-bold text-on-surface uppercase">
                                            {zoneName || 'NEW-KEEPOUT-ZONE'}
                                        </div>
                                        <div className="font-mono text-[10px] text-tertiary">
                                            {draftZoneCoords.length} vertices •{' '}
                                            {calculatePolygonArea(
                                                draftZoneCoords,
                                            )}{' '}
                                            m² • ROS 2 Nav2 Costmap Filter
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDrawingZone(false);
                                        setSelectedZone(null);
                                        setDraftZoneCoords([]);
                                    }}
                                    className="cursor-pointer font-mono text-xs text-tertiary hover:text-on-surface"
                                >
                                    Close
                                </button>
                            </div>

                            <div className="mb-space-sm grid grid-cols-2 gap-2">
                                <div className="rounded-lg bg-surface-container-lowest p-2">
                                    <label className="block font-label-sm text-[10px] text-tertiary uppercase">
                                        Zone Identifier
                                    </label>
                                    <input
                                        type="text"
                                        value={zoneName}
                                        onChange={(e) =>
                                            setZoneName(e.target.value)
                                        }
                                        className="mt-0.5 w-full bg-transparent font-mono text-xs font-bold text-on-surface focus:outline-none"
                                    />
                                </div>
                                <div className="rounded-lg bg-surface-container-lowest p-2">
                                    <label className="block font-label-sm text-[10px] text-tertiary uppercase">
                                        Nav2 Filter Type
                                    </label>
                                    <select
                                        value={zoneType}
                                        onChange={(e) =>
                                            setZoneType(
                                                e.target
                                                    .value as KeepoutZoneType,
                                            )
                                        }
                                        className="mt-0.5 w-full cursor-pointer bg-transparent font-mono text-xs font-bold text-red-700 focus:outline-none"
                                    >
                                        <option value="keep_out">
                                            🚫 Keep-Out (Lethal Cost 254)
                                        </option>
                                        <option value="speed_limit">
                                            ⚡ Speed-Limit Zone
                                        </option>
                                    </select>
                                </div>
                            </div>

                            {zoneType === 'speed_limit' && (
                                <div className="mb-space-sm rounded-lg bg-surface-container-lowest p-2">
                                    <label className="block font-label-sm text-[10px] text-tertiary uppercase">
                                        Max Speed Limit (m/s)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.05"
                                        min="0.1"
                                        max="3.0"
                                        value={zoneSpeedLimit}
                                        onChange={(e) =>
                                            setZoneSpeedLimit(e.target.value)
                                        }
                                        className="mt-0.5 w-full bg-transparent font-mono text-xs font-bold text-amber-700 focus:outline-none"
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                {selectedZone && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleDeleteKeepoutZone(
                                                selectedZone,
                                            )
                                        }
                                        className="cursor-pointer rounded-lg bg-red-50 px-3 py-2 font-label-sm text-xs font-bold text-red-700 uppercase hover:bg-red-100"
                                    >
                                        Delete Zone
                                    </button>
                                )}
                                <button
                                    type="button"
                                    disabled={
                                        draftZoneCoords.length < 3 || savingZone
                                    }
                                    onClick={handleSaveKeepoutZone}
                                    className="flex-1 cursor-pointer rounded-lg bg-red-600 px-4 py-2 font-label-sm text-xs font-bold text-white uppercase shadow-xs hover:bg-red-700 disabled:opacity-40"
                                >
                                    {savingZone
                                        ? 'Rasterizing Mask...'
                                        : selectedZone
                                          ? 'Update & Rasterize Mask'
                                          : 'Save & Rasterize Zone'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/80 p-8 text-center shadow-xs">
                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low text-primary">
                                <span className="material-symbols-outlined text-[26px]">
                                    touch_app
                                </span>
                            </div>
                            <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                                No Guidance Path or Zone Selected
                            </h3>
                            <p className="mt-1 max-w-xs font-body-sm text-body-sm text-tertiary">
                                Click any trajectory line or restricted polygon on the blueprint map to inspect and edit, or use{' '}
                                <strong className="text-on-surface">+ NEW PATH</strong> / <strong className="text-red-600">+ KEEP-OUT</strong> to draw.
                            </p>
                            <div className="mt-4 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={startNewZoneMode}
                                    className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 font-label-sm text-xs font-semibold text-white uppercase shadow-xs transition-all hover:bg-red-700"
                                >
                                    <span className="material-symbols-outlined text-[16px]">
                                        pentagon
                                    </span>
                                    <span>+ KEEP-OUT ZONE</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={startNewPathMode}
                                    className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-label-sm text-xs font-semibold text-on-primary uppercase shadow-xs transition-all hover:bg-on-primary-fixed-variant"
                                >
                                    <span className="material-symbols-outlined text-[16px]">
                                        add_road
                                    </span>
                                    <span>+ NEW PATH</span>
                                </button>
                            </div>
                        </div>
                    )}

                        {/* Card 5: List of Saved Path Plans Header */}
                        <div className="rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs">
                            <div className="mb-space-sm flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface uppercase">
                                        Transit Lane Manifest
                                    </h2>
                                    <span className="rounded-full bg-surface-container px-2 py-0.5 font-label-sm text-label-sm text-tertiary">
                                        {filteredPaths.length} Lanes
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
                                    <option value="all">Filter: All</option>
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
                                                        title="Focus on Map"
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
                                                        title="Edit Trajectory on Map"
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
                                                        title="Export Nav2 YAML"
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
                                                        title="Delete Pathplan"
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
