import { Head, router } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { InteractiveBlueprintCanvas } from '@/components/fleet/interactive-blueprint-canvas';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { FacilityMap, Vehicle } from '@/types';

interface MapStudioProps {
    maps: FacilityMap[];
    activeMap?: FacilityMap | null;
}

const simulatedVehicles: Vehicle[] = [
    {
        id: 'AMR-01',
        name: 'Titan Runner 01',
        ip_address: '10.32.254.195',
        status: 'moving',
        battery_percentage: 88,
        pose: { id: 1, vehicle_id: 'AMR-01', x: 0.0, y: 0.0, theta: 0.0 },
    },
    {
        id: 'AMR-02',
        name: 'Echo Scout 02',
        ip_address: '10.32.254.196',
        status: 'charging',
        battery_percentage: 42,
        pose: { id: 2, vehicle_id: 'AMR-02', x: 2.5, y: 2.0, theta: 0.0 },
    },
];

export default function MapStudioPage({
    maps = [],
    activeMap,
}: MapStudioProps) {
    const [selectedMap, setSelectedMap] = useState<FacilityMap | null>(
        activeMap ?? maps[0] ?? null,
    );
    const [occupancyViewMode, setOccupancyViewMode] = useState<
        'blueprint' | 'raw'
    >('blueprint');
    const [showSimulation, setShowSimulation] = useState(false);
    const [activeTool, setActiveTool] = useState<
        'select' | 'wall' | 'zone' | 'station' | 'keepout' | 'barrier'
    >('select');
    const [snapStep, setSnapStep] = useState<number>(0.5);
    const [orthoLock, setOrthoLock] = useState(true);
    const [showKeepOut, setShowKeepOut] = useState(true);
    const [showOriginDatum, setShowOriginDatum] = useState(true);

    // File Input Ref for instant File Manager .zip selection
    const zipFileInputRef = useRef<HTMLInputElement>(null);

    // Upload .zip / Edit Calibration Modal State
    const [mapModalOpen, setMapModalOpen] = useState(false);
    const [editingMap, setEditingMap] = useState<FacilityMap | null>(null);
    const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null);
    const [formName, setFormName] = useState('');
    const [formImagePath, setFormImagePath] = useState('maps/map.png');
    const [formResolution, setFormResolution] = useState('0.05');
    const [formOriginX, setFormOriginX] = useState('-14.5');
    const [formOriginY, setFormOriginY] = useState('-1.58');
    const [formOriginYaw, setFormOriginYaw] = useState('0.0');
    const [savingMap, setSavingMap] = useState(false);
    const [pushingNav2, setPushingNav2] = useState(false);

    const currentMap = selectedMap ?? maps[0] ?? null;

    const triggerFileManagerZipSelect = () => {
        setEditingMap(null);
        setSelectedZipFile(null);
        setFormName('');
        zipFileInputRef.current?.click();
    };

    const handleZipFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }
        setSelectedZipFile(file);
        const defaultTitle = file.name
            .replace(/\.zip$/i, '')
            .replace(/[_-]+/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
        setFormName(defaultTitle);
        setEditingMap(null);
        setMapModalOpen(true);
        e.target.value = '';
    };

    const openCreateMapModal = () => {
        setEditingMap(null);
        setSelectedZipFile(null);
        setFormName('');
        setMapModalOpen(true);
    };

    const openEditMapModal = (map: FacilityMap) => {
        setEditingMap(map);
        setSelectedZipFile(null);
        setFormName(map.name);
        setFormImagePath(map.image_path);
        setFormResolution(String(map.resolution));
        setFormOriginX(String(map.origin_x));
        setFormOriginY(String(map.origin_y));
        setFormOriginYaw(String(map.origin_yaw ?? 0.0));
        setMapModalOpen(true);
    };

    const handleUploadZipPackage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedZipFile) {
            toast.error('Please select a ROS 2 .zip map archive.');
            return;
        }

        setSavingMap(true);
        try {
            const formData = new FormData();
            formData.append('package', selectedZipFile);
            if (formName.trim()) {
                formData.append('name', formName.trim());
            }

            const response = await fetch('/api/maps/upload-package', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                },
                body: formData,
            });

            const json = await response.json();
            if (response.ok && json.data) {
                const importedMap: FacilityMap = json.data;
                const wpCount = json.meta?.imported_waypoints ?? 0;
                toast.success(
                    `Map '${importedMap.name}' (${importedMap.width_px}×${importedMap.height_px}px, Origin [${importedMap.origin_x}, ${importedMap.origin_y}]) calibrated${wpCount > 0 ? ` with ${wpCount} stations` : ''}.`,
                );
                setMapModalOpen(false);
                setSelectedZipFile(null);
                setSelectedMap(importedMap);
                router.reload();
            } else {
                toast.error(
                    json.message || 'Failed to parse ROS 2 .zip map package.',
                );
            }
        } catch {
            toast.error('Network error while uploading .zip package.');
        } finally {
            setSavingMap(false);
        }
    };

    const handleSaveEditedMap = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMap) {
            return handleUploadZipPackage(e);
        }

        setSavingMap(true);
        const payload = {
            name: formName.trim(),
            image_path: formImagePath.trim(),
            resolution: parseFloat(formResolution) || 0.05,
            origin_x: parseFloat(formOriginX) || 0,
            origin_y: parseFloat(formOriginY) || 0,
            origin_yaw: parseFloat(formOriginYaw) || 0,
        };

        try {
            const response = await fetch(`/api/maps/${editingMap.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const json = await response.json();
            if (response.ok && json.data) {
                toast.success(`Calibration updated for '${payload.name}'.`);
                setMapModalOpen(false);
                setSelectedMap(json.data);
                router.reload();
            } else {
                toast.error(json.message || 'Failed to update map parameters.');
            }
        } catch {
            toast.error('Network error while saving map calibration.');
        } finally {
            setSavingMap(false);
        }
    };

    const handleExportZipPackage = (map: FacilityMap) => {
        window.location.href = `/api/maps/${map.id}/export-package`;
        toast.success(`Exporting ROS 2 package (.zip) for '${map.name}'...`);
    };

    const handleDownloadYaml = (map: FacilityMap) => {
        const yamlContent = [
            `# ROS 2 Nav2 map_server OccupancyGrid Metadata`,
            `image: ${map.raw_pgm_path ? map.raw_pgm_path.split('/').pop() : map.image_path}`,
            `mode: trinary`,
            `resolution: ${map.resolution}`,
            `origin: [${map.origin_x}, ${map.origin_y}, ${map.origin_yaw ?? 0.0}]`,
            `negate: ${map.negate ? 1 : 0}`,
            `occupied_thresh: ${map.occupied_thresh ?? 0.65}`,
            `free_thresh: ${map.free_thresh ?? 0.25}`,
        ].join('\n');

        const blob = new Blob([yamlContent], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${map.name.toLowerCase().replace(/\s+/g, '_')}.yaml`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Downloaded ${map.name}.yaml configuration.`);
    };

    const handleDeleteMap = async (map: FacilityMap) => {
        if (maps.length <= 1) {
            toast.warning(
                'Cannot delete the only active map in the catalog.',
            );
            return;
        }

        try {
            const response = await fetch(`/api/maps/${map.id}`, {
                method: 'DELETE',
                headers: { Accept: 'application/json' },
            });

            if (response.ok) {
                toast.success(`Map '${map.name}' deleted.`);
                if (currentMap?.id === map.id) {
                    setSelectedMap(
                        maps.find((m) => m.id !== map.id) ?? null,
                    );
                }
                router.reload();
            }
        } catch {
            toast.error('Network error while deleting map.');
        }
    };

    const handlePushToNav2 = async () => {
        if (!currentMap) {
            return;
        }
        setPushingNav2(true);
        try {
            const response = await fetch('/api/logs/system', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    action: `Pushed Calibrated Map '${currentMap.name}' to Active ROS 2 Nav2 Server`,
                    level: 'info',
                    context: {
                        map_id: currentMap.id,
                        resolution: currentMap.resolution,
                        origin: [
                            currentMap.origin_x,
                            currentMap.origin_y,
                            currentMap.origin_yaw ?? 0,
                        ],
                        dimensions: [
                            currentMap.width_px,
                            currentMap.height_px,
                        ],
                        occupancy_view_mode: occupancyViewMode,
                    },
                }),
            });

            if (response.ok) {
                toast.success(
                    `Map '${currentMap.name}' deployed to Nav2 Server (10.32.254.195).`,
                );
                router.reload();
            }
        } catch {
            toast.error('Failed to deploy map to Nav2 server.');
        } finally {
            setPushingNav2(false);
        }
    };

    const realWidthMeters =
        currentMap?.width_px && currentMap?.resolution
            ? (currentMap.width_px * currentMap.resolution).toFixed(1)
            : '23.0';
    const realHeightMeters =
        currentMap?.height_px && currentMap?.resolution
            ? (currentMap.height_px * currentMap.resolution).toFixed(1)
            : '15.0';

    return (
        <>
            <Head title="Map Management & Redraw Studio" />
            {/* Hidden Native File Manager Input for .zip Map Package */}
            <input
                ref={zipFileInputRef}
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                className="hidden"
                onChange={handleZipFilePicked}
            />

            <div className="relative flex h-full w-full overflow-hidden bg-[#f8f9ff]">
                {/* 1. Full-Bleed Interactive Map Canvas Layer */}
                <div className="absolute inset-0 z-0">
                    <InteractiveBlueprintCanvas
                        map={currentMap}
                        waypoints={currentMap?.waypoints ?? []}
                        pathplans={currentMap?.pathplans ?? []}
                        vehicles={showSimulation ? simulatedVehicles : []}
                        snapStep={snapStep}
                        showSlamNoise={false}
                        showKeepOutZones={showKeepOut}
                        showOriginDatum={showOriginDatum}
                        occupancyViewMode={occupancyViewMode}
                        resolution={currentMap?.resolution ?? 0.05}
                        hudPosition="bottom-right"
                    />
                </div>

                {/* Top Right Studio Ribbon Controls (Dual Mode Toggle Opsi B + Tools) */}
                <div className="pointer-events-auto absolute top-4 right-4 left-[440px] z-20 hidden flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white/95 px-3.5 py-2 shadow-xs backdrop-blur-md lg:flex">
                    {/* Opsi B: Dual-Mode Occupancy View Toggle */}
                    <div className="flex items-center gap-1 rounded-lg bg-surface-container-low p-1">
                        <button
                            type="button"
                            onClick={() => setOccupancyViewMode('blueprint')}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 font-label-sm text-xs transition-all ${
                                occupancyViewMode === 'blueprint'
                                    ? 'bg-primary font-bold text-white shadow-2xs'
                                    : 'text-on-surface-variant hover:text-on-surface'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[15px]">
                                grid_on
                            </span>
                            <span>Styled Blueprint</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setOccupancyViewMode('raw')}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 font-label-sm text-xs transition-all ${
                                occupancyViewMode === 'raw'
                                    ? 'bg-[#0b1c30] font-bold text-white shadow-2xs'
                                    : 'text-on-surface-variant hover:text-on-surface'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[15px]">
                                gradient
                            </span>
                            <span>Original PGM (Raw ROS)</span>
                        </button>
                    </div>

                    {/* Layer Toggles: Origin Datum [0,0], Keep-Out, & Simulation */}
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setShowOriginDatum((d) => !d)}
                            className={`flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 font-label-sm text-xs transition-all ${
                                showOriginDatum
                                    ? 'bg-emerald-50 font-bold text-emerald-700 ring-1 ring-emerald-300'
                                    : 'bg-surface-container-low text-tertiary'
                            }`}
                            title="Toggle ROS Origin Datum [0.00m, 0.00m]"
                        >
                            <span className="material-symbols-outlined text-[15px]">
                                my_location
                            </span>
                            <span>Origin [0,0]</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowKeepOut((k) => !k)}
                            className={`flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 font-label-sm text-xs transition-all ${
                                showKeepOut
                                    ? 'bg-red-50 font-bold text-error ring-1 ring-red-200'
                                    : 'bg-surface-container-low text-tertiary'
                            }`}
                            title="Toggle Keep-Out Zone Mask"
                        >
                            <span className="material-symbols-outlined text-[15px]">
                                do_not_disturb_on
                            </span>
                            <span>Keep-Out</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowSimulation((s) => !s)}
                            className={`flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 font-label-sm text-xs transition-all ${
                                showSimulation
                                    ? 'bg-primary-fixed font-bold text-on-primary-fixed'
                                    : 'bg-surface-container-low text-tertiary'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[15px]">
                                smart_toy
                            </span>
                            <span>AMR SIM</span>
                        </button>
                    </div>

                    {/* CAD Tools & Push to Nav2 CTA */}
                    <div className="flex items-center gap-2">
                        <div className="hidden items-center gap-1 text-xs text-tertiary xl:flex">
                            <span>Snap:</span>
                            <select
                                value={String(snapStep)}
                                onChange={(e) =>
                                    setSnapStep(parseFloat(e.target.value))
                                }
                                className="cursor-pointer rounded bg-surface-container-low px-1.5 py-1 font-mono text-xs text-on-surface focus:outline-none"
                            >
                                <option value="0.5">0.50m</option>
                                <option value="0.25">0.25m</option>
                                <option value="0.05">0.05m (1px)</option>
                                <option value="0">Free</option>
                            </select>
                        </div>

                        <button
                            type="button"
                            disabled={pushingNav2}
                            onClick={handlePushToNav2}
                            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-label-md text-xs font-bold text-white uppercase shadow-xs transition-all hover:bg-secondary"
                        >
                            <span className="material-symbols-outlined text-[16px]">
                                publish
                            </span>
                            <span>
                                {pushingNav2
                                    ? 'Syncing...'
                                    : 'Push to Nav2'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Technical Calibration Watermark Indicator on Canvas */}
                {currentMap && (
                    <div className="pointer-events-none absolute bottom-4 left-[440px] z-20 hidden space-y-0.5 rounded-xl border border-slate-200/80 bg-white/90 px-3.5 py-2 font-mono text-[10px] text-tertiary shadow-xs backdrop-blur-sm lg:block">
                        <div className="font-bold text-on-surface">
                            ACTIVE MAP: {currentMap.name.toUpperCase()} (
                            {realWidthMeters}m × {realHeightMeters}m)
                        </div>
                        <div>
                            ROS ORIGIN: [X: {currentMap.origin_x}m, Y:{' '}
                            {currentMap.origin_y}m, Yaw:{' '}
                            {currentMap.origin_yaw ?? 0} rad] | RES:{' '}
                            {currentMap.resolution} m/px
                        </div>
                        <div>
                            VIEW:{' '}
                            {occupancyViewMode === 'raw'
                                ? 'RAW ROS OCCUPANCY GRID (PGM)'
                                : 'CYBERNETIC BLUEPRINT'}{' '}
                            | THRESH: [{currentMap.free_thresh ?? 0.25} /{' '}
                            {currentMap.occupied_thresh ?? 0.65}]
                        </div>
                    </div>
                )}

                {/* 2. Left Floating Cockpit Panel (Pure White 40% Transparent Wrapping Cards) */}
                <aside className="relative z-10 flex h-full w-full max-w-[420px] flex-col overflow-y-auto border-r border-slate-200/60 bg-white/40 backdrop-blur-sm">
                    <div className="flex flex-col gap-space-md p-margin-lg">
                        {/* Card 1: Header & Upload .zip CTA */}
                        <div className="rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="font-label-sm text-[10px] font-semibold tracking-wider text-primary uppercase">
                                        ROS 2 SLAM &amp; Nav2 Map Server
                                    </span>
                                    <h1 className="font-headline-md text-lg font-bold tracking-tight text-on-surface uppercase">
                                        Map Studio Catalog
                                    </h1>
                                </div>
                                <span className="rounded-full bg-surface-container px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                                    {maps.length} MAPS
                                </span>
                            </div>

                            <p className="mt-1 font-body-sm text-xs text-tertiary">
                                Import ROS 2 <code>map_saver_cli</code> archive
                                (<code>.pgm</code> + <code>.yaml</code>). 1:1
                                origin auto-calibrated.
                            </p>

                            <div className="mt-3 flex flex-col gap-2">
                                <button
                                    type="button"
                                    onClick={triggerFileManagerZipSelect}
                                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 font-label-md text-xs font-bold tracking-wider text-white uppercase shadow-xs transition-all hover:bg-secondary active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-[18px]">
                                        folder_zip
                                    </span>
                                    <span>+ ADD MAP (.ZIP)</span>
                                </button>
                            </div>
                        </div>

                        {/* Card 2: Active Map Calibration Summary Card */}
                        {currentMap && (
                            <div className="rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="font-label-sm text-[10px] font-bold tracking-wider text-primary uppercase">
                                        ACTIVE MAP ORIGIN CALIBRATION
                                    </span>
                                    {currentMap.raw_pgm_path ? (
                                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-800">
                                            PGM CALIBRATED
                                        </span>
                                    ) : (
                                        <span className="rounded bg-sky-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-sky-800">
                                            SYNTHETIC
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                                    <div className="rounded-lg bg-surface-container-low p-2">
                                        <span className="block text-[9px] text-tertiary">
                                            ORIGIN X
                                        </span>
                                        <span className="font-bold text-on-surface">
                                            {currentMap.origin_x}m
                                        </span>
                                    </div>
                                    <div className="rounded-lg bg-surface-container-low p-2">
                                        <span className="block text-[9px] text-tertiary">
                                            ORIGIN Y
                                        </span>
                                        <span className="font-bold text-on-surface">
                                            {currentMap.origin_y}m
                                        </span>
                                    </div>
                                    <div className="rounded-lg bg-surface-container-low p-2">
                                        <span className="block text-[9px] text-tertiary">
                                            RESOLUTION
                                        </span>
                                        <span className="font-bold text-primary">
                                            {currentMap.resolution}m
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 font-mono text-[10px] text-tertiary">
                                    <span>
                                        Size:{' '}
                                        <strong className="text-on-surface">
                                            {currentMap.width_px ?? 460}×
                                            {currentMap.height_px ?? 300} px
                                        </strong>{' '}
                                        ({realWidthMeters}m × {realHeightMeters}
                                        m)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleExportZipPackage(currentMap)
                                        }
                                        className="cursor-pointer font-sans text-[11px] font-bold text-primary uppercase hover:underline"
                                    >
                                        EXPORT .ZIP
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Card 3: Saved Facility Maps List */}
                        <div className="space-y-2.5">
                            {maps.map((map, idx) => {
                                const isSelected = currentMap?.id === map.id;
                                return (
                                    <div
                                        key={map.id}
                                        onClick={() => setSelectedMap(map)}
                                        className={`group relative cursor-pointer rounded-xl border bg-white p-space-md shadow-xs transition-all ${
                                            isSelected
                                                ? 'border-secondary border-l-4 border-l-secondary ring-2 ring-secondary/20'
                                                : 'border-slate-200/80 hover:border-secondary/60'
                                        }`}
                                    >
                                        <div className="mb-1 flex items-start justify-between gap-space-xs">
                                            <div className="flex items-center gap-space-xs">
                                                <span
                                                    className={`h-2 w-2 rounded-full ${
                                                        idx === 0
                                                            ? 'bg-emerald-500 ring-2 ring-emerald-200'
                                                            : 'bg-primary-container'
                                                    }`}
                                                />
                                                <h3 className="font-headline-sm text-sm font-bold tracking-tight text-on-surface">
                                                    {map.name}
                                                </h3>
                                            </div>
                                            <span
                                                className={`rounded px-1.5 py-0.5 font-label-sm text-[9px] font-bold ${
                                                    map.raw_pgm_path
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-surface-container-high text-tertiary'
                                                }`}
                                            >
                                                {map.raw_pgm_path
                                                    ? 'ROS2 PGM'
                                                    : idx === 0
                                                      ? 'DEFAULT'
                                                      : 'SAVED'}
                                            </span>
                                        </div>

                                        <p className="mb-2 truncate font-mono text-[10px] text-tertiary">
                                            {map.raw_pgm_path ?? map.image_path}
                                        </p>

                                        {/* Thumbnail Preview */}
                                        <div className="relative mb-2 flex h-24 w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-1">
                                            {map.image_url ? (
                                                <img
                                                    src={map.image_url}
                                                    alt={map.name}
                                                    className="h-full w-full object-contain"
                                                    style={{
                                                        imageRendering:
                                                            'pixelated',
                                                    }}
                                                />
                                            ) : (
                                                <svg
                                                    className="h-full w-full opacity-75"
                                                    fill="none"
                                                    viewBox="0 0 160 80"
                                                >
                                                    <path
                                                        d="M 10 10 H 150 V 70 H 130 V 45 H 100 V 70 H 25 V 50 H 10 Z"
                                                        fill="none"
                                                        stroke="#1D4ED8"
                                                        strokeWidth="2"
                                                    />
                                                    <rect
                                                        fill="#BAE6FD"
                                                        fillOpacity="0.6"
                                                        height="18"
                                                        stroke="#00A3FF"
                                                        strokeWidth="1"
                                                        width="45"
                                                        x="25"
                                                        y="20"
                                                    />
                                                    <rect
                                                        fill="#BAE6FD"
                                                        fillOpacity="0.6"
                                                        height="18"
                                                        stroke="#00A3FF"
                                                        strokeWidth="1"
                                                        width="50"
                                                        x="85"
                                                        y="20"
                                                    />
                                                </svg>
                                            )}
                                            <span className="absolute right-2 bottom-1 rounded bg-slate-900/75 px-1.5 py-0.5 font-mono text-[9px] text-white">
                                                {map.width_px && map.height_px
                                                    ? `${map.width_px}×${map.height_px}px`
                                                    : 'Blueprint'}
                                            </span>
                                        </div>

                                        {/* Metadata Grid */}
                                        <div className="mb-2 grid grid-cols-2 gap-1 rounded-lg bg-surface-container-low p-2 font-mono text-[10px] text-on-surface-variant">
                                            <div>
                                                <span className="text-tertiary">
                                                    Res:
                                                </span>{' '}
                                                <strong>
                                                    {map.resolution}m
                                                </strong>
                                            </div>
                                            <div>
                                                <span className="text-tertiary">
                                                    Origin:
                                                </span>{' '}
                                                <strong>
                                                    [{map.origin_x},{' '}
                                                    {map.origin_y}]
                                                </strong>
                                            </div>
                                            <div>
                                                <span className="text-tertiary">
                                                    Stations:
                                                </span>{' '}
                                                <strong>
                                                    {map.waypoints_count ??
                                                        map.waypoints?.length ??
                                                        0}{' '}
                                                    WPs
                                                </strong>
                                            </div>
                                            <div>
                                                <span className="text-tertiary">
                                                    Paths:
                                                </span>{' '}
                                                <strong>
                                                    {map.pathplans_count ??
                                                        map.pathplans?.length ??
                                                        0}{' '}
                                                    Lanes
                                                </strong>
                                            </div>
                                        </div>

                                        <div
                                            className="flex items-center justify-between border-t border-slate-100 pt-1.5 font-label-sm text-label-sm"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <span className="font-mono text-[10px] text-tertiary">
                                                ID #{map.id}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleExportZipPackage(
                                                            map,
                                                        )
                                                    }
                                                    className="cursor-pointer rounded p-1 text-primary hover:bg-surface-container-high"
                                                    title="Export ROS 2 .zip Package"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">
                                                        folder_zip
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleDownloadYaml(map)
                                                    }
                                                    className="cursor-pointer rounded p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                                                    title="Download .yaml Metadata"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">
                                                        file_download
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openEditMapModal(map)
                                                    }
                                                    className="cursor-pointer rounded p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
                                                    title="Edit Calibration Parameters"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">
                                                        tune
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleDeleteMap(map)
                                                    }
                                                    className="cursor-pointer rounded p-1 text-on-surface-variant hover:bg-error-container hover:text-error"
                                                    title="Delete Map"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">
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
                </aside>
            </div>

            {/* ROS 2 .zip Map Package Upload / Calibration Modal */}
            <Dialog open={mapModalOpen} onOpenChange={setMapModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-headline-md text-lg font-bold text-on-surface uppercase">
                            <span className="material-symbols-outlined text-[22px] text-primary">
                                {editingMap ? 'tune' : 'folder_zip'}
                            </span>
                            {editingMap
                                ? `Map Calibration: ${editingMap.name}`
                                : 'Import ROS 2 Map Package (.zip)'}
                        </DialogTitle>
                        <DialogDescription className="font-body-sm text-xs text-tertiary">
                            {editingMap
                                ? 'Adjust map identifier, resolution (m/px), and ROS 2 [X, Y, Yaw] origin datum.'
                                : 'Upload a ROS 2 map_saver_cli archive (.zip) containing .pgm and .yaml files (plus optional keepout_zones.png / stations.yaml).'}
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={
                            editingMap
                                ? handleSaveEditedMap
                                : handleUploadZipPackage
                        }
                        className="space-y-4"
                    >
                        {!editingMap && (
                            <div>
                                <label className="mb-1.5 block font-label-sm text-xs font-bold text-on-surface uppercase">
                                    Map Archive (.zip)
                                </label>
                                <div
                                    onClick={() =>
                                        zipFileInputRef.current?.click()
                                    }
                                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-surface-container-low/60 p-5 text-center transition hover:border-primary hover:bg-surface-container-low"
                                >
                                    <span className="material-symbols-outlined text-[32px] text-primary">
                                        {selectedZipFile
                                            ? 'check_circle'
                                            : 'upload_file'}
                                    </span>
                                    {selectedZipFile ? (
                                        <div>
                                            <div className="font-mono text-xs font-bold text-on-surface">
                                                {selectedZipFile.name}
                                            </div>
                                            <div className="font-mono text-[10px] text-tertiary">
                                                {(
                                                    selectedZipFile.size / 1024
                                                ).toFixed(1)}{' '}
                                                KB • Click to replace .zip archive
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="font-headline-sm text-xs font-bold text-primary uppercase">
                                                Select .zip Archive
                                            </div>
                                            <div className="font-body-sm text-[11px] text-tertiary">
                                                Format: <code>.zip</code> containing{' '}
                                                <code>*.pgm</code> +{' '}
                                                <code>*.yaml</code>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="mb-1 block font-label-sm text-xs font-bold text-on-surface uppercase">
                                Map Identifier
                            </label>
                            <input
                                type="text"
                                required={Boolean(editingMap)}
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="Auto-detected from archive filename if blank..."
                                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-body-sm text-xs font-semibold text-slate-900 focus:border-primary focus:outline-none"
                            />
                        </div>

                        {editingMap ? (
                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                                <div className="rounded-lg border border-slate-200 bg-surface-container-low p-2">
                                    <label className="block font-mono text-[10px] text-tertiary">
                                        Res (m/px)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.005"
                                        required
                                        value={formResolution}
                                        onChange={(e) =>
                                            setFormResolution(e.target.value)
                                        }
                                        className="mt-1 w-full bg-transparent font-mono text-xs font-bold text-primary focus:outline-none"
                                    />
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-surface-container-low p-2">
                                    <label className="block font-mono text-[10px] text-tertiary">
                                        Origin X (m)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formOriginX}
                                        onChange={(e) =>
                                            setFormOriginX(e.target.value)
                                        }
                                        className="mt-1 w-full bg-transparent font-mono text-xs font-bold text-on-surface focus:outline-none"
                                    />
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-surface-container-low p-2">
                                    <label className="block font-mono text-[10px] text-tertiary">
                                        Origin Y (m)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formOriginY}
                                        onChange={(e) =>
                                            setFormOriginY(e.target.value)
                                        }
                                        className="mt-1 w-full bg-transparent font-mono text-xs font-bold text-on-surface focus:outline-none"
                                    />
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-surface-container-low p-2">
                                    <label className="block font-mono text-[10px] text-tertiary">
                                        Yaw (rad)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formOriginYaw}
                                        onChange={(e) =>
                                            setFormOriginYaw(e.target.value)
                                        }
                                        className="mt-1 w-full bg-transparent font-mono text-xs font-bold text-on-surface focus:outline-none"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 font-body-sm text-[11px] text-slate-700">
                                <div className="mb-1 font-bold text-primary">
                                    ROS 2 Nav2 Automated Package Parser:
                                </div>
                                <ul className="list-inside list-disc space-y-0.5 text-[11px]">
                                    <li>
                                        Extracts{' '}
                                        <code>resolution</code> &amp;{' '}
                                        <code>origin: [x, y, yaw]</code> from{' '}
                                        <code>.yaml</code>
                                    </li>
                                    <li>
                                        Converts <code>.pgm</code> to lossless
                                        1:1 <code>.png</code> raster
                                    </li>
                                    <li>
                                        Auto-imports{' '}
                                        <code>keepout_zones.png</code> &amp;{' '}
                                        <code>stations.yaml</code> if bundled
                                    </li>
                                </ul>
                            </div>
                        )}

                        <DialogFooter className="gap-2">
                            <button
                                type="button"
                                onClick={() => setMapModalOpen(false)}
                                className="cursor-pointer rounded-lg bg-surface-container px-4 py-2 font-label-md text-xs font-semibold text-on-surface uppercase hover:bg-surface-container-high"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={savingMap}
                                className="cursor-pointer rounded-lg bg-primary px-5 py-2 font-label-md text-xs font-bold tracking-wider text-white uppercase shadow-md hover:bg-secondary"
                            >
                                {savingMap
                                    ? 'Processing...'
                                    : editingMap
                                      ? 'Save Calibration'
                                      : 'Import & Calibrate (.zip)'}
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
