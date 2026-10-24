import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { InteractiveBlueprintCanvas } from '@/components/fleet/interactive-blueprint-canvas';
import { StatusBadge } from '@/components/fleet/status-badge';
import type { CockpitSection } from '@/components/fleet/telemetry-nav-rail';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type {
    FacilityMap,
    Mission,
    PathCoordinate,
    Vehicle,
    Waypoint,
} from '@/types';

interface DashboardProps {
    initialSection?: CockpitSection;
    maps?: FacilityMap[];
    activeMap?: FacilityMap | null;
    waypoints?: Waypoint[];
    vehicles?: Vehicle[];
    missions?: Mission[];
}

type StatusFilter = 'ALL' | 'ACTIVE' | 'IDLE' | 'CHARGING' | 'ERROR';

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

function resolveSectionFromPathname(pathname: string): CockpitSection {
    const clean = pathname.split('?')[0].split('#')[0];
    if (clean === '/stations' || clean.startsWith('/stations/')) {
        return 'stations';
    }
    if (clean === '/robots' || clean.startsWith('/robots/')) {
        return 'robots';
    }
    return 'live-map';
}

export default function Dashboard({
    initialSection,
    maps = [],
    activeMap = null,
    waypoints: initialWaypoints,
    vehicles: initialVehicles = [],
    missions: initialMissions = [],
}: DashboardProps) {
    const [activeSection, setActiveSection] = useState<CockpitSection>(() => {
        if (initialSection) {
            return initialSection;
        }
        if (typeof window !== 'undefined') {
            return resolveSectionFromPathname(window.location.pathname);
        }
        return 'live-map';
    });

    const [mapView, setMapView] = useState<'active' | 'empty'>(
        activeMap ? 'active' : 'empty',
    );
    const [waypoints, setWaypoints] = useState<Waypoint[]>(
        () => initialWaypoints ?? activeMap?.waypoints ?? [],
    );
    const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
    const [missions, setMissions] = useState<Mission[]>(initialMissions);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
        initialVehicles[0]?.id ?? null,
    );
    const [selectedWaypoint, setSelectedWaypoint] = useState<Waypoint | null>(
        (initialWaypoints ?? activeMap?.waypoints ?? [])[0] ?? null,
    );

    // Sync props when Inertia partial reload happens
    useEffect(() => {
        setWaypoints(initialWaypoints ?? activeMap?.waypoints ?? []);
    }, [initialWaypoints, activeMap]);

    useEffect(() => {
        setVehicles(initialVehicles);
    }, [initialVehicles]);

    useEffect(() => {
        setMissions(initialMissions);
    }, [initialMissions]);

    // Listen to client-side section switches from TelemetryNavRail / TelemetryTopBar / Browser Back-Forward
    useEffect(() => {
        const handleCockpitSwitch = (event: Event) => {
            const custom = event as CustomEvent<{
                section: CockpitSection;
                href: string;
            }>;
            if (custom.detail?.section) {
                setActiveSection(custom.detail.section);
                setStationPickMode(false);
                setPickPoseMode(false);
                setPoseEstimateMode(false);
                if (custom.detail.section !== 'live-map' && activeMap) {
                    setMapView('active');
                }
            }
        };

        const handlePopState = () => {
            const nextSection = resolveSectionFromPathname(
                window.location.pathname,
            );
            setActiveSection(nextSection);
            setStationPickMode(false);
            setPickPoseMode(false);
            setPoseEstimateMode(false);
        };

        window.addEventListener('fleet:cockpit-section', handleCockpitSwitch);
        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener(
                'fleet:cockpit-section',
                handleCockpitSwitch,
            );
            window.removeEventListener('popstate', handlePopState);
        };
    }, [activeMap]);

    // =========================================================================
    // 1. LIVE MAP STATE & HANDLERS
    // =========================================================================
    const [showRobots, setShowRobots] = useState(true);
    const [showStations, setShowStations] = useState(true);
    const [showPaths, setShowPaths] = useState(true);

    const [isLiveSim, setIsLiveSim] = useState(false);
    const [simWaypointIdx, setSimWaypointIdx] = useState(0);

    const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
    const [missionName, setMissionName] = useState(
        'Material Transfer: Dock-A1 to Conveyor B2',
    );
    const [missionVehicleId, setMissionVehicleId] = useState<string>(
        initialVehicles[0]?.id ?? '',
    );
    const [missionPriority, setMissionPriority] = useState<
        'low' | 'normal' | 'high' | 'urgent'
    >('high');
    const [selectedWaypointIds, setSelectedWaypointIds] = useState<number[]>(
        () =>
            (initialWaypoints ?? activeMap?.waypoints ?? [])
                .slice(0, 2)
                .map((wp) => wp.id),
    );
    const [waypointToAdd, setWaypointToAdd] = useState<number>(
        (initialWaypoints ?? activeMap?.waypoints ?? [])[0]?.id ?? 0,
    );
    const [isSubmittingMission, setIsSubmittingMission] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        window.setTimeout(() => setToastMessage(null), 3500);
    };

    // =========================================================================
    // 2. STATIONS STATE & HANDLERS
    // =========================================================================
    const currentMapId = activeMap?.id ?? maps[0]?.id ?? 1;
    const [zoneFilter, setZoneFilter] = useState<
        'all' | 'charging' | 'pd' | 'standby'
    >('all');
    const [stationPickMode, setStationPickMode] = useState(false);
    const [stationModalOpen, setStationModalOpen] = useState(false);
    const [editingStation, setEditingStation] = useState<Waypoint | null>(null);
    const [stationFormName, setStationFormName] = useState('ST-CHARGE-03');
    const [stationFormType, setStationFormType] = useState<
        'charging' | 'pickup' | 'dropoff' | 'standby'
    >('charging');
    const [stationFormX, setStationFormX] = useState('14.50');
    const [stationFormY, setStationFormY] = useState('6.00');
    const [stationFormYawDeg, setStationFormYawDeg] = useState('90');
    const [savingStation, setSavingStation] = useState(false);

    const filteredWaypoints = waypoints.filter((wp) => {
        if (zoneFilter === 'all') {
            return true;
        }
        return classifyStation(wp.name).category === zoneFilter;
    });

    const stationChargingCount = waypoints.filter(
        (w) => classifyStation(w.name).category === 'charging',
    ).length;
    const stationPdCount = waypoints.filter(
        (w) => classifyStation(w.name).category === 'pd',
    ).length;
    const stationStandbyCount = waypoints.filter(
        (w) => classifyStation(w.name).category === 'standby',
    ).length;

    const activeInspectedStation = selectedWaypoint ?? waypoints[0] ?? null;

    const openCreateStationModal = (coord?: PathCoordinate) => {
        setEditingStation(null);
        setStationFormName(`ST-CHARGE-0${stationChargingCount + 1}`);
        setStationFormType('charging');
        setStationFormX(coord ? String(coord.x) : '14.50');
        setStationFormY(coord ? String(coord.y) : '6.00');
        setStationFormYawDeg('0');
        setStationModalOpen(true);
    };

    const openEditStationModal = (wp: Waypoint) => {
        setEditingStation(wp);
        setStationFormName(wp.name);
        const cat = classifyStation(wp.name).category;
        setStationFormType(
            cat === 'charging'
                ? 'charging'
                : wp.name.toUpperCase().includes('DROP')
                  ? 'dropoff'
                  : cat === 'pd'
                    ? 'pickup'
                    : 'standby',
        );
        setStationFormX(String(wp.x));
        setStationFormY(String(wp.y));
        setStationFormYawDeg(String(radToDeg(wp.theta)));
        setStationModalOpen(true);
    };

    const handleStationTypePresetChange = (
        newType: 'charging' | 'pickup' | 'dropoff' | 'standby',
    ) => {
        setStationFormType(newType);
        if (!editingStation) {
            const prefix =
                newType === 'charging'
                    ? 'ST-CHARGE-'
                    : newType === 'pickup'
                      ? 'PICK-BAY-'
                      : newType === 'dropoff'
                        ? 'DROP-BAY-'
                        : 'STANDBY-';
            setStationFormName(`${prefix}0${waypoints.length + 1}`);
        }
    };

    const handleSaveStation = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingStation(true);

        const payload = {
            name: stationFormName.trim().toUpperCase(),
            x: parseFloat(stationFormX) || 0,
            y: parseFloat(stationFormY) || 0,
            theta: degToRad(parseFloat(stationFormYawDeg) || 0),
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
            if (response.ok && json.data) {
                const savedWp: Waypoint = json.data;
                if (editingStation) {
                    setWaypoints((prev) =>
                        prev.map((w) => (w.id === savedWp.id ? savedWp : w)),
                    );
                    toast.success(`Station ${payload.name} updated.`);
                } else {
                    setWaypoints((prev) => [...prev, savedWp]);
                    toast.success(
                        `Station ${payload.name} registered to Nav2 map.`,
                    );
                }
                setSelectedWaypoint(savedWp);
                setStationModalOpen(false);
                router.reload({
                    only: ['waypoints', 'maps', 'activeMap', 'telemetryShell'],
                });
            } else {
                toast.error(json.message || 'Failed to save station.');
            }
        } catch {
            toast.error('Network error while saving station.');
        } finally {
            setSavingStation(false);
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
                const remaining = waypoints.filter((item) => item.id !== wp.id);
                setWaypoints(remaining);
                if (selectedWaypoint?.id === wp.id) {
                    setSelectedWaypoint(remaining[0] ?? null);
                }
                router.reload({
                    only: ['waypoints', 'maps', 'activeMap', 'telemetryShell'],
                });
            } else {
                toast.error('Failed to delete station.');
            }
        } catch {
            toast.error('Network error while deleting station.');
        }
    };

    // =========================================================================
    // 3. ROBOTS STATE & HANDLERS
    // =========================================================================
    const [robotSearchQuery, setRobotSearchQuery] = useState('');
    const [robotStatusFilter, setRobotStatusFilter] =
        useState<StatusFilter>('ALL');
    const [pickPoseMode, setPickPoseMode] = useState(false);
    const [poseEstimateMode, setPoseEstimateMode] = useState(false);

    // 2D Pose Estimate Manual Inputs
    const [estimateX, setEstimateX] = useState('0.00');
    const [estimateY, setEstimateY] = useState('0.00');
    const [estimateYawDeg, setEstimateYawDeg] = useState('0');

    const [robotModalOpen, setRobotModalOpen] = useState(false);
    const [robotModalMode, setRobotModalMode] = useState<'create' | 'edit'>(
        'create',
    );
    const [robotFormId, setRobotFormId] = useState('');
    const [robotFormName, setRobotFormName] = useState('');
    const [robotFormIp, setRobotFormIp] = useState('10.32.254.197');
    const [robotFormStatus, setRobotFormStatus] = useState('idle');
    const [robotFormBattery, setRobotFormBattery] = useState(100);
    const [isSavingRobot, setIsSavingRobot] = useState(false);

    const activeVehicle =
        vehicles.find((v) => v.id === selectedVehicleId) ?? vehicles[0] ?? null;

    const totalVehiclesCount = vehicles.length;
    const liveVehiclesCount = vehicles.filter(
        (v) => v.status === 'active' || v.status === 'moving',
    ).length;
    const chargingCount = vehicles.filter(
        (v) => v.status === 'charging',
    ).length;
    const blockedCount = vehicles.filter(
        (v) => v.status === 'error' || v.status === 'emergency_stop',
    ).length;

    const filteredVehicles = vehicles.filter((v) => {
        const matchesSearch =
            v.id.toLowerCase().includes(robotSearchQuery.toLowerCase()) ||
            v.name.toLowerCase().includes(robotSearchQuery.toLowerCase()) ||
            v.ip_address.toLowerCase().includes(robotSearchQuery.toLowerCase());

        if (!matchesSearch) {
            return false;
        }

        if (robotStatusFilter === 'ACTIVE') {
            return v.status === 'active' || v.status === 'moving';
        }
        if (robotStatusFilter === 'IDLE') {
            return v.status === 'idle' || v.status === 'maintenance';
        }
        if (robotStatusFilter === 'CHARGING') {
            return v.status === 'charging';
        }
        if (robotStatusFilter === 'ERROR') {
            return v.status === 'error' || v.status === 'emergency_stop';
        }
        return true;
    });

    const openCreateRobotModal = () => {
        const nextNum = String(vehicles.length + 1).padStart(2, '0');
        setRobotModalMode('create');
        setRobotFormId(`AMR-${nextNum}`);
        setRobotFormName(`Heavy Pallet Carrier ${nextNum}`);
        setRobotFormIp(`10.32.254.${194 + vehicles.length + 1}`);
        setRobotFormStatus('idle');
        setRobotFormBattery(100);
        setRobotModalOpen(true);
    };

    const openEditRobotModal = (vehicle: Vehicle) => {
        setRobotModalMode('edit');
        setRobotFormId(vehicle.id);
        setRobotFormName(vehicle.name);
        setRobotFormIp(vehicle.ip_address);
        setRobotFormStatus(vehicle.status);
        setRobotFormBattery(vehicle.battery_percentage);
        setRobotModalOpen(true);
    };

    const handleSaveVehicle = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingRobot(true);

        try {
            const url =
                robotModalMode === 'create'
                    ? '/api/vehicles'
                    : `/api/vehicles/${encodeURIComponent(robotFormId)}`;
            const method = robotModalMode === 'create' ? 'POST' : 'PUT';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    id: robotFormId.trim().toUpperCase(),
                    name: robotFormName.trim(),
                    ip_address: robotFormIp.trim(),
                    status: robotFormStatus,
                    battery_percentage: Number(robotFormBattery),
                }),
            });

            const json = await response.json();
            if (response.ok && json.data) {
                const saved: Vehicle = json.data;
                if (robotModalMode === 'create') {
                    setVehicles((prev) => [...prev, saved]);
                    setSelectedVehicleId(saved.id);
                    toast.success(`Unit ${saved.id} registered.`);
                } else {
                    setVehicles((prev) =>
                        prev.map((v) => (v.id === saved.id ? saved : v)),
                    );
                    toast.success(`Configuration updated for ${saved.id}.`);
                }
                setRobotModalOpen(false);
                router.reload({ only: ['vehicles', 'telemetryShell'] });
            } else {
                toast.error(json.message ?? 'Failed to save vehicle record.');
            }
        } finally {
            setIsSavingRobot(false);
        }
    };

    const handleDeleteVehicle = async (vehicle: Vehicle) => {
        setIsSavingRobot(true);
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
                toast.success(`Unit ${vehicle.id} decommissioned from fleet.`);
                router.reload({ only: ['vehicles', 'telemetryShell'] });
            }
        } finally {
            setIsSavingRobot(false);
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

    // Update manual estimate inputs when selectedVehicle changes
    useEffect(() => {
        if (activeVehicle) {
            setEstimateX((activeVehicle.pose?.x ?? 0).toFixed(2));
            setEstimateY((activeVehicle.pose?.y ?? 0).toFixed(2));
            setEstimateYawDeg(String(radToDeg(activeVehicle.pose?.theta ?? 0)));
        }
    }, [activeVehicle?.id]);

    const handleApplyManualPoseEstimate = () => {
        if (!activeVehicle) return;
        const x = parseFloat(estimateX) || 0;
        const y = parseFloat(estimateY) || 0;
        const yawDeg = parseFloat(estimateYawDeg) || 0;
        const theta = degToRad(yawDeg);

        void sendTelemetryUpdate(activeVehicle, {
            x,
            y,
            theta,
            event: `Relocalized AMR pose via 2D Pose Estimate (/initialpose) to [X: ${x.toFixed(2)}m, Y: ${y.toFixed(2)}m, θ: ${yawDeg}°]`,
        });

        toast.success(
            `2D Pose Estimate sent for ${activeVehicle.id}: [${x.toFixed(2)}m, ${y.toFixed(2)}m, ${yawDeg}°]`,
        );
    };

    const handleAlignToStation = (stationWp: Waypoint) => {
        if (!activeVehicle) return;
        const x = Number(stationWp.x.toFixed(2));
        const y = Number(stationWp.y.toFixed(2));
        const theta = Number(stationWp.theta.toFixed(4));
        const yawDeg = radToDeg(theta);

        setEstimateX(String(x));
        setEstimateY(String(y));
        setEstimateYawDeg(String(yawDeg));

        void sendTelemetryUpdate(activeVehicle, {
            x,
            y,
            theta,
            event: `Aligned AMR pose to Station ${stationWp.name} (/initialpose) [X: ${x}m, Y: ${y}m, θ: ${yawDeg}°]`,
        });

        toast.success(
            `Aligned ${activeVehicle.id} to station ${stationWp.name} (${yawDeg}°)`,
        );
    };

    // =========================================================================
    // 4. SHARED LIVE TELEMETRY STREAM / PATROL SIMULATOR & MISSION HANDLERS
    // =========================================================================
    useEffect(() => {
        if (!isLiveSim || vehicles.length === 0) {
            return;
        }
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
    }, [isLiveSim, vehicles, waypoints, simWaypointIdx]);

    const handleAddWaypointStep = () => {
        if (!waypointToAdd) {
            return;
        }
        setSelectedWaypointIds((prev) => [...prev, waypointToAdd]);
    };

    const handleRemoveWaypointStep = (index: number) => {
        setSelectedWaypointIds((prev) =>
            prev.filter((_, idx) => idx !== index),
        );
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
            showToast('Select at least 1 station waypoint for mission.');
            return;
        }

        setIsSubmittingMission(true);
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
                showToast(`Mission "${createdMission.name}" dispatched.`);
                router.reload({ only: ['missions', 'telemetryShell'] });
            } else {
                showToast(json.message ?? 'Failed to dispatch mission.');
            }
        } finally {
            setIsSubmittingMission(false);
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
            showToast(`Mission #${updated.id} transitioned to ${nextStatus}.`);
            router.reload({ only: ['missions', 'telemetryShell'] });
        }
    };

    // Coordinate pick callback shared across Stations and Robots
    const handleCanvasPickCoordinate = (coord: PathCoordinate) => {
        if (activeSection === 'stations' && stationPickMode) {
            setStationPickMode(false);
            setStationFormX(String(coord.x));
            setStationFormY(String(coord.y));
            setStationModalOpen(true);
            toast.info(
                `Picked map coordinate [X: ${coord.x}m, Y: ${coord.y}m]`,
            );
            return;
        }
        if (activeSection === 'robots' && pickPoseMode && activeVehicle) {
            setPickPoseMode(false);
            void sendTelemetryUpdate(activeVehicle, {
                x: coord.x,
                y: coord.y,
                event: `Teleop 2D Nav Goal commanded to [X:${coord.x}m, Y:${coord.y}m]`,
            });
            toast.success(
                `Target pose for ${activeVehicle.id} dispatched to [${coord.x}m, ${coord.y}m]`,
            );
        }
    };

    // 2D Pose Estimate Drag Heading Callback from Canvas
    const handleCanvasPoseEstimate = (pose: {
        x: number;
        y: number;
        theta: number;
    }) => {
        if (!activeVehicle) return;
        setPoseEstimateMode(false);

        const x = Number(pose.x.toFixed(2));
        const y = Number(pose.y.toFixed(2));
        const theta = Number(pose.theta.toFixed(4));
        const yawDeg = radToDeg(theta);

        setEstimateX(String(x));
        setEstimateY(String(y));
        setEstimateYawDeg(String(yawDeg));

        void sendTelemetryUpdate(activeVehicle, {
            x,
            y,
            theta,
            event: `Relocalized AMR pose via 2D Pose Estimate (/initialpose) to [X: ${x}m, Y: ${y}m, θ: ${yawDeg}°]`,
        });

        toast.success(
            `2D Pose Estimate sent for ${activeVehicle.id}: [${x}m, ${y}m, ${yawDeg}°]`,
        );
    };

    const pageTitle =
        activeSection === 'stations'
            ? 'Station Management'
            : activeSection === 'robots'
              ? 'Robot Fleet Management'
              : 'Live Map Dashboard';

    return (
        <>
            <Head title={pageTitle} />
            <div className="relative h-full w-full overflow-hidden bg-[#f8f9ff]">
                {/* =========================================================
                    1. PERSISTENT FULL-BLEED INTERACTIVE BLUEPRINT CANVAS
                   ========================================================= */}
                {mapView === 'active' || activeSection !== 'live-map' ? (
                    <div className="absolute inset-0 z-0">
                        <InteractiveBlueprintCanvas
                            map={activeMap}
                            waypoints={
                                activeSection === 'live-map'
                                    ? showStations
                                        ? waypoints
                                        : []
                                    : waypoints
                            }
                            pathplans={
                                activeSection === 'live-map'
                                    ? showPaths
                                        ? (activeMap?.pathplans ?? [])
                                        : []
                                    : (activeMap?.pathplans ?? [])
                            }
                            vehicles={
                                activeSection === 'live-map'
                                    ? showRobots
                                        ? vehicles
                                        : []
                                    : activeSection === 'robots'
                                      ? vehicles
                                      : []
                            }
                            selectedVehicleId={activeVehicle?.id ?? null}
                            selectedWaypointId={
                                activeInspectedStation?.id ?? null
                            }
                            onSelectVehicle={(v) => setSelectedVehicleId(v.id)}
                            onSelectWaypoint={(wp) => setSelectedWaypoint(wp)}
                            mode={
                                (activeSection === 'stations' &&
                                    stationPickMode) ||
                                (activeSection === 'robots' && pickPoseMode)
                                    ? 'pick-station'
                                    : activeSection === 'robots' &&
                                        poseEstimateMode
                                      ? 'pose-estimate'
                                      : 'view'
                            }
                            onPickCoordinate={handleCanvasPickCoordinate}
                            onPoseEstimate={handleCanvasPoseEstimate}
                            resolution={activeMap?.resolution ?? 0.05}
                            hudPosition="bottom-right"
                        />
                    </div>
                ) : (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface-container-lowest/90 p-space-xl text-center backdrop-blur-md select-none">
                        <div className="relative mb-space-lg flex h-40 w-40 items-center justify-center rounded-2xl border border-surface-container-high bg-surface-container-low/60">
                            <span className="material-symbols-outlined text-[64px] text-primary">
                                map
                            </span>
                        </div>
                        <h2 className="font-headline-lg text-headline-lg font-semibold tracking-tight text-on-surface uppercase">
                            No Active Map Loaded
                        </h2>
                        <p className="mt-space-xs mb-space-lg max-w-lg font-body-md text-body-md text-on-surface-variant">
                            No OccupancyGrid map is currently loaded in the
                            viewport. Select a calibrated map from the catalog
                            or record a new map via ROS 2 SLAM Toolbox.
                        </p>
                        <div className="flex items-center gap-space-md">
                            <Link
                                href="/map-studio"
                                className="flex items-center gap-space-xs rounded-lg bg-primary-container px-space-xl py-2.5 font-label-md text-label-md font-bold tracking-wider text-on-primary-container uppercase shadow-md transition-all hover:bg-primary hover:text-on-primary"
                            >
                                <span className="material-symbols-outlined text-[18px]">
                                    folder_open
                                </span>
                                Open Map Studio
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

                {/* =========================================================
                    2. SECTION A: LIVE MAP FLOATING HUD OVERLAY
                   ========================================================= */}
                <div
                    className={`pointer-events-none absolute inset-0 z-20 flex h-full w-full flex-col justify-between transition-all duration-500 ease-spring ${
                        activeSection === 'live-map'
                            ? 'translate-y-0 opacity-100 scale-100'
                            : '-translate-y-4 opacity-0 scale-[0.98]'
                    }`}
                >
                    {/* Top Floating Command Bar & Controls */}
                    <div className="flex w-full flex-wrap items-center justify-between gap-3 p-4">
                        {/* Left Facility / Zone Pill Group */}
                        <div
                            className={`flex flex-wrap items-center gap-2 rounded-xl border border-surface-container-high bg-surface-container-lowest/90 p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] backdrop-blur-md ${
                                activeSection === 'live-map'
                                    ? 'pointer-events-auto'
                                    : 'pointer-events-none'
                            }`}
                        >
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
                        <div
                            className={`flex flex-wrap items-center gap-2 rounded-xl border border-surface-container-high bg-surface-container-lowest/90 p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] backdrop-blur-md ${
                                activeSection === 'live-map'
                                    ? 'pointer-events-auto'
                                    : 'pointer-events-none'
                            }`}
                        >
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
                        <div
                            className={`flex items-center gap-space-sm self-start rounded-full border border-surface-container-high bg-surface-container-lowest/95 px-3.5 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md ${
                                activeSection === 'live-map'
                                    ? 'pointer-events-auto'
                                    : 'pointer-events-none'
                            }`}
                        >
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
                        <div
                            className={`flex max-h-[calc(100vh-160px)] flex-col items-end gap-3.5 overflow-y-auto pr-1 ${
                                activeSection === 'live-map'
                                    ? 'pointer-events-auto'
                                    : 'pointer-events-none'
                            }`}
                        >
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
                                            {String(waypoints.length).padStart(
                                                2,
                                                '0',
                                            )}
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

                {/* =========================================================
                    3. SECTION B: STATIONS FLOATING LEFT COCKPIT PANEL
                   ========================================================= */}
                {activeSection === 'stations' && stationPickMode && (
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
                            onClick={() => setStationPickMode(false)}
                            className="rounded bg-white/15 px-2.5 py-1 font-label-sm text-[10px] font-bold uppercase hover:bg-white/25"
                        >
                            Cancel
                        </button>
                    </div>
                )}

                <div
                    className={`pointer-events-auto absolute bottom-4 left-[580px] z-20 hidden items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container-lowest/90 px-3 py-1.5 font-label-sm text-label-sm text-tertiary shadow-sm backdrop-blur-md transition-all duration-500 ease-spring xl:flex ${
                        activeSection === 'stations'
                            ? 'translate-y-0 opacity-100 scale-100'
                            : 'pointer-events-none translate-y-4 opacity-0 scale-95'
                    }`}
                >
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

                <aside
                    aria-hidden={activeSection !== 'stations'}
                    className={`absolute top-0 bottom-0 left-0 z-20 flex h-full w-full max-w-[560px] flex-col overflow-y-auto border-r border-slate-200/60 bg-white/40 backdrop-blur-sm transition-all duration-500 ease-spring ${
                        activeSection === 'stations'
                            ? 'pointer-events-auto translate-x-0 opacity-100 scale-100'
                            : 'pointer-events-none -translate-x-12 opacity-0 scale-[0.98]'
                    }`}
                >
                    <div className="flex flex-col gap-space-md p-margin-lg">
                        {/* 1. Floating Top Command & Action Bar */}
                        <div className="flex flex-col gap-space-md rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs lg:p-space-lg">
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
                                        Configure Nav2 docking waypoints,
                                        charging bays, and P&amp;D nodes.
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
                                            Charging Hub ({stationChargingCount}
                                            )
                                        </option>
                                        <option value="pd">
                                            Pick &amp; Drop Bays (
                                            {stationPdCount})
                                        </option>
                                        <option value="standby">
                                            Standby &amp; QC (
                                            {stationStandbyCount})
                                        </option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingStation(null);
                                            setStationPickMode(true);
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
                                        onClick={() => openCreateStationModal()}
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

                        {/* 2. Floating Telemetry / KPI Summary */}
                        <div className="grid grid-cols-2 gap-space-sm sm:grid-cols-4">
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
                                        {stationChargingCount}
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
                                        {stationPdCount}
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
                                        {stationStandbyCount}
                                    </span>
                                    <span className="font-label-sm text-label-sm text-tertiary">
                                        Nodes
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 3. Station Inspector Card */}
                        {activeInspectedStation && (
                            <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs lg:p-space-lg">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-label-sm text-label-sm text-tertiary uppercase">
                                                INSPECTOR
                                            </span>
                                            <span className="rounded bg-surface-container px-2 py-0.5 font-mono font-label-sm text-label-sm font-bold text-primary">
                                                {activeInspectedStation.name}
                                            </span>
                                        </div>
                                        <h2 className="mt-1 font-headline-md text-headline-md font-bold text-on-surface">
                                            {
                                                classifyStation(
                                                    activeInspectedStation.name,
                                                ).label
                                            }{' '}
                                            Node #{activeInspectedStation.id}
                                        </h2>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openEditStationModal(
                                                    activeInspectedStation,
                                                )
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
                                                void handleDeleteStation(
                                                    activeInspectedStation,
                                                )
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
                                        className="absolute inset-0 h-full w-full opacity-40"
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
                                                        transform: `rotate(${radToDeg(activeInspectedStation.theta)}deg)`,
                                                    }}
                                                >
                                                    navigation
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-1.5 rounded bg-inverse-surface/90 px-2.5 py-0.5 text-center shadow">
                                            <span className="font-mono font-label-sm text-label-sm font-bold text-inverse-on-surface">
                                                X:{' '}
                                                {activeInspectedStation.x.toFixed(
                                                    2,
                                                )}
                                                m | Y:{' '}
                                                {activeInspectedStation.y.toFixed(
                                                    2,
                                                )}
                                                m | θ:{' '}
                                                {radToDeg(
                                                    activeInspectedStation.theta,
                                                )}
                                                ° (
                                                {activeInspectedStation.theta.toFixed(
                                                    2,
                                                )}{' '}
                                                rad)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 4. Station Directory Table */}
                        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
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
                                            const info = classifyStation(
                                                wp.name,
                                            );
                                            const isSelected =
                                                activeInspectedStation?.id ===
                                                wp.id;

                                            return (
                                                <tr
                                                    key={wp.id}
                                                    onClick={() =>
                                                        setSelectedWaypoint(wp)
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
                                                            (
                                                            {radToDeg(wp.theta)}
                                                            °)
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
                                                                    openEditStationModal(
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
                                                                    void handleDeleteStation(
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

                {/* =========================================================
                    4. SECTION C: ROBOTS FLOATING LEFT COCKPIT & RIGHT TELEOP HUD
                   ========================================================= */}
                <aside
                    aria-hidden={activeSection !== 'robots'}
                    className={`absolute top-0 bottom-0 left-0 z-20 flex h-full w-full max-w-[460px] flex-col overflow-y-auto border-r border-slate-200/60 bg-white/40 backdrop-blur-sm transition-all duration-500 ease-spring ${
                        activeSection === 'robots'
                            ? 'pointer-events-auto translate-x-0 opacity-100 scale-100'
                            : 'pointer-events-none -translate-x-12 opacity-0 scale-[0.98]'
                    }`}
                >
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
                                        {String(totalVehiclesCount).padStart(
                                            2,
                                            '0',
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <div className="font-label-sm text-[10px] tracking-wider text-tertiary uppercase">
                                        Live
                                    </div>
                                    <div className="font-mono text-base font-bold text-primary">
                                        {String(liveVehiclesCount).padStart(
                                            2,
                                            '0',
                                        )}
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
                                        {String(blockedCount).padStart(2, '0')}
                                    </div>
                                </div>
                            </div>

                            {/* Register Button */}
                            <button
                                type="button"
                                onClick={openCreateRobotModal}
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
                                    value={robotSearchQuery}
                                    onChange={(e) =>
                                        setRobotSearchQuery(e.target.value)
                                    }
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
                                        onClick={() =>
                                            setRobotStatusFilter(pill)
                                        }
                                        className={`cursor-pointer rounded px-2 py-0.5 font-mono text-[10px] font-semibold transition-colors ${
                                            robotStatusFilter === pill
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
                                    vehicle.id === activeVehicle?.id;
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
                                                        smart_toy
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
                                            <StatusBadge
                                                status={vehicle.status}
                                            />
                                        </div>

                                        {/* Battery SoC Bar */}
                                        <div className="mt-3">
                                            <div className="mb-1 flex justify-between font-mono text-[10px]">
                                                <span className="text-tertiary uppercase">
                                                    State of Charge (SoC)
                                                </span>
                                                <span className="font-bold text-primary">
                                                    {vehicle.battery_percentage}
                                                    %
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
                                                    {vehicle.pose?.x?.toFixed(
                                                        2,
                                                    ) ?? '0.00'}
                                                    m
                                                </span>
                                            </div>
                                            <div>
                                                <span className="block text-[9px] text-tertiary">
                                                    POSE Y
                                                </span>
                                                <span className="font-semibold text-on-surface">
                                                    {vehicle.pose?.y?.toFixed(
                                                        2,
                                                    ) ?? '0.00'}
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

                {/* Right Pinned HUD Target: Active Robot Inspector & Teleop Override */}
                {activeVehicle && (
                    <div
                        aria-hidden={activeSection !== 'robots'}
                        className={`absolute top-24 right-4 z-20 flex w-88 flex-col gap-3 rounded-xl border border-slate-200/90 bg-white/95 p-4 shadow-lg backdrop-blur-md transition-all duration-500 ease-spring ${
                            activeSection === 'robots'
                                ? 'pointer-events-auto translate-x-0 opacity-100 scale-100'
                                : 'pointer-events-none translate-x-12 opacity-0 scale-[0.96]'
                        }`}
                    >
                        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 animate-ping rounded-full bg-secondary" />
                                    <span className="font-mono text-[10px] font-bold tracking-wider text-primary uppercase">
                                        HUD Target Lock // {activeVehicle.id}
                                    </span>
                                </div>
                                <h2 className="mt-0.5 font-headline-md text-base font-bold text-on-surface">
                                    {activeVehicle.name}
                                </h2>
                            </div>
                            <StatusBadge status={activeVehicle.status} />
                        </div>

                        {/* ROS 2 Humble SSH Node Status */}
                        <div className="flex items-center justify-between rounded-lg bg-[#0b1c30] px-3 py-2 font-mono text-[11px] text-white">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px] text-secondary">
                                    terminal
                                </span>
                                <span>
                                    ROS 2 Humble ({activeVehicle.ip_address})
                                </span>
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
                                                activeVehicle,
                                                {
                                                    status: st,
                                                    event: `Operator manually switched status to ${st}`,
                                                },
                                            )
                                        }
                                        className={`cursor-pointer rounded-lg border px-2 py-1 font-mono text-[10px] font-bold uppercase transition-all ${
                                            activeVehicle.status === st
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
                                    2D Teleop &amp; Pose Step
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPoseEstimateMode(false);
                                        setPickPoseMode((prev) => !prev);
                                    }}
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
                                            activeVehicle,
                                            {
                                                theta:
                                                    (activeVehicle.pose
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
                                            activeVehicle,
                                            {
                                                y:
                                                    (activeVehicle.pose?.y ??
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
                                            activeVehicle,
                                            {
                                                theta:
                                                    (activeVehicle.pose
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
                                            activeVehicle,
                                            {
                                                x:
                                                    (activeVehicle.pose?.x ??
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
                                            activeVehicle,
                                            {
                                                x:
                                                    (activeVehicle.pose?.x ??
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
                                            activeVehicle,
                                            {
                                                y:
                                                    (activeVehicle.pose?.y ??
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

                        {/* RViz 2D Pose Estimate (/initialpose) Relocalization Card */}
                        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3">
                            <div className="mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-emerald-600">
                                        my_location
                                    </span>
                                    <span className="font-label-sm text-[10px] font-bold tracking-wider text-emerald-900 uppercase">
                                        2D Pose Estimate (/initialpose)
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPickPoseMode(false);
                                        setPoseEstimateMode((prev) => !prev);
                                    }}
                                    className={`cursor-pointer rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase transition-colors ${
                                        poseEstimateMode
                                            ? 'bg-emerald-600 text-white'
                                            : 'border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-100'
                                    }`}
                                >
                                    {poseEstimateMode
                                        ? 'DRAGGING... (CANCEL)'
                                        : 'DRAG POSE ON MAP'}
                                </button>
                            </div>

                            {/* Manual Numeric Inputs */}
                            <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
                                <div className="rounded-lg border border-slate-200 bg-white p-1.5">
                                    <label className="block text-[9px] text-slate-400">
                                        X (m)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.05"
                                        value={estimateX}
                                        onChange={(e) =>
                                            setEstimateX(e.target.value)
                                        }
                                        className="w-full bg-transparent font-bold text-slate-800 focus:outline-none"
                                    />
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-white p-1.5">
                                    <label className="block text-[9px] text-slate-400">
                                        Y (m)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.05"
                                        value={estimateY}
                                        onChange={(e) =>
                                            setEstimateY(e.target.value)
                                        }
                                        className="w-full bg-transparent font-bold text-slate-800 focus:outline-none"
                                    />
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-white p-1.5">
                                    <label className="block text-[9px] text-slate-400">
                                        Yaw (deg)
                                    </label>
                                    <input
                                        type="number"
                                        step="5"
                                        value={estimateYawDeg}
                                        onChange={(e) =>
                                            setEstimateYawDeg(e.target.value)
                                        }
                                        className="w-full bg-transparent font-bold text-emerald-700 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Quick Yaw Steps & Apply Button */}
                            <div className="mt-2 flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1 font-mono text-[10px]">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const cur = parseFloat(estimateYawDeg) || 0;
                                            setEstimateYawDeg(String(cur - 15));
                                        }}
                                        className="cursor-pointer rounded border border-slate-200 bg-white px-1.5 py-1 text-slate-700 hover:bg-slate-50"
                                        title="-15 degrees"
                                    >
                                        ↺ -15°
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const cur = parseFloat(estimateYawDeg) || 0;
                                            setEstimateYawDeg(String(cur + 15));
                                        }}
                                        className="cursor-pointer rounded border border-slate-200 bg-white px-1.5 py-1 text-slate-700 hover:bg-slate-50"
                                        title="+15 degrees"
                                    >
                                        ↻ +15°
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleApplyManualPoseEstimate}
                                    className="cursor-pointer rounded bg-emerald-600 px-3 py-1 font-mono text-[10px] font-bold text-white uppercase shadow-xs transition-colors hover:bg-emerald-700"
                                >
                                    Apply Estimate
                                </button>
                            </div>

                            {/* Station Dock Fast Alignment */}
                            {waypoints.length > 0 && (
                                <div className="mt-2 border-t border-emerald-200/60 pt-1.5">
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="font-label-sm text-[9px] font-semibold text-emerald-800 uppercase">
                                            Align To Station Dock:
                                        </span>
                                        <select
                                            onChange={(e) => {
                                                const wp = waypoints.find(
                                                    (w) =>
                                                        w.id ===
                                                        Number(e.target.value),
                                                );
                                                if (wp) {
                                                    handleAlignToStation(wp);
                                                }
                                            }}
                                            defaultValue=""
                                            className="cursor-pointer rounded border border-emerald-200 bg-white px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-800 focus:outline-none"
                                        >
                                            <option value="" disabled>
                                                Select station...
                                            </option>
                                            {waypoints.map((wp) => (
                                                <option key={wp.id} value={wp.id}>
                                                    {wp.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Battery SoC Simulator Slider */}
                        <div>
                            <div className="mb-1 flex justify-between font-mono text-[10px]">
                                <span className="text-tertiary uppercase">
                                    Battery SoC Override
                                </span>
                                <span className="font-bold text-primary">
                                    {activeVehicle.battery_percentage}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={100}
                                value={activeVehicle.battery_percentage}
                                onChange={(e) =>
                                    void sendTelemetryUpdate(activeVehicle, {
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
                                onClick={() =>
                                    openEditRobotModal(activeVehicle)
                                }
                                className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-surface-container-low py-2 font-label-md text-xs font-bold text-on-surface uppercase transition-colors hover:bg-surface-container-high"
                            >
                                <span className="material-symbols-outlined text-[16px]">
                                    edit
                                </span>
                                Edit Unit
                            </button>
                            <button
                                type="button"
                                disabled={isSavingRobot}
                                onClick={() =>
                                    void handleDeleteVehicle(activeVehicle)
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

                {/* =========================================================
                    5. MODALS FOR ALL THREE SPATIAL MODULES
                   ========================================================= */}

                {/* Modal A: Dispatch New Mission */}
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
                                        Mission Identifier / Description
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={missionName}
                                        onChange={(e) =>
                                            setMissionName(e.target.value)
                                        }
                                        placeholder="Material Transfer: Dock-A1 to Conveyor B2"
                                        className="w-full rounded-lg border border-slate-200 bg-surface-container-low px-3 py-2 font-body-sm text-xs text-on-surface"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1 block font-label-sm text-xs font-bold text-on-surface uppercase">
                                            Target AMR Unit
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
                                            Priority Level
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
                                        Waypoint Sequence (Mission Steps)
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
                                            {waypoints.map((wp) => (
                                                <option
                                                    key={wp.id}
                                                    value={wp.id}
                                                >
                                                    {wp.name} [X:{wp.x}m, Y:
                                                    {wp.y}m]
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={handleAddWaypointStep}
                                            className="cursor-pointer rounded-lg bg-secondary px-3 py-2 font-mono text-xs font-bold text-white uppercase hover:bg-primary"
                                        >
                                            + Add Step
                                        </button>
                                    </div>

                                    <div className="mt-2.5 max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-surface-container-low p-2.5">
                                        {selectedWaypointIds.map(
                                            (wpId, index) => {
                                                const wpObj = waypoints.find(
                                                    (w) => w.id === wpId,
                                                );
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
                                                No waypoint steps queued.
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
                                        className="cursor-pointer rounded-lg px-4 py-2 font-label-md text-xs font-semibold text-tertiary uppercase hover:bg-slate-100"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingMission}
                                        className="cursor-pointer rounded-lg bg-primary px-5 py-2 font-label-md text-xs font-bold text-white uppercase shadow-sm hover:bg-secondary disabled:opacity-50"
                                    >
                                        {isSubmittingMission
                                            ? 'Dispatching...'
                                            : 'Dispatch Mission'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal B: Create / Edit Station Modal */}
                <Dialog
                    open={stationModalOpen}
                    onOpenChange={setStationModalOpen}
                >
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
                                Register a docking or buffer waypoint node on
                                ROS 2 Nav2 map (
                                {activeMap?.name ?? 'Active Map'}).
                            </DialogDescription>
                        </DialogHeader>

                        <form
                            onSubmit={handleSaveStation}
                            className="space-y-4"
                        >
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block font-label-sm text-label-sm text-tertiary uppercase">
                                        Station ID Code
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={stationFormName}
                                        onChange={(e) =>
                                            setStationFormName(e.target.value)
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
                                        value={stationFormType}
                                        onChange={(e) =>
                                            handleStationTypePresetChange(
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
                                                setStationModalOpen(false);
                                                setStationPickMode(true);
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
                                                setStationFormX(
                                                    String(
                                                        activeVehicle?.pose?.x?.toFixed(
                                                            2,
                                                        ) ?? '8.42',
                                                    ),
                                                );
                                                setStationFormY(
                                                    String(
                                                        activeVehicle?.pose?.y?.toFixed(
                                                            2,
                                                        ) ?? '5.12',
                                                    ),
                                                );
                                                setStationFormYawDeg('45');
                                                toast.info(
                                                    `Fetched live pose from ${activeVehicle?.id ?? 'AMR-01'}`,
                                                );
                                            }}
                                            className="flex cursor-pointer items-center gap-1 font-label-sm text-label-sm text-primary hover:underline"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">
                                                my_location
                                            </span>
                                            Fetch {activeVehicle?.id ?? 'AMR-01'}{' '}
                                            Pose
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
                                            value={stationFormX}
                                            onChange={(e) =>
                                                setStationFormX(e.target.value)
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
                                            value={stationFormY}
                                            onChange={(e) =>
                                                setStationFormY(e.target.value)
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
                                            value={stationFormYawDeg}
                                            onChange={(e) =>
                                                setStationFormYawDeg(
                                                    e.target.value,
                                                )
                                            }
                                            className="mt-1 w-full bg-transparent font-mono text-xs font-bold text-primary focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="gap-2">
                                <button
                                    type="button"
                                    onClick={() => setStationModalOpen(false)}
                                    className="rounded-lg bg-surface-container px-4 py-2 font-label-md text-xs font-semibold text-on-surface uppercase hover:bg-surface-container-high"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingStation}
                                    className="rounded-lg bg-primary-container px-5 py-2 font-label-md text-xs font-bold tracking-wider text-on-primary-container uppercase shadow-md hover:bg-primary hover:text-on-primary"
                                >
                                    {savingStation
                                        ? 'Saving...'
                                        : 'Save Station'}
                                </button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Modal C: AMR Unit Registration & Edit Modal */}
                {robotModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
                        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <span className="font-mono text-[10px] font-bold tracking-wider text-primary uppercase">
                                        Fleet Registry CRUD
                                    </span>
                                    <h3 className="font-headline-md text-lg font-bold text-on-surface uppercase">
                                        {robotModalMode === 'create'
                                            ? 'Register AMR Unit'
                                            : `Edit AMR Config // ${robotFormId}`}
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setRobotModalOpen(false)}
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
                                        disabled={robotModalMode === 'edit'}
                                        value={robotFormId}
                                        onChange={(e) =>
                                            setRobotFormId(e.target.value)
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
                                        value={robotFormName}
                                        onChange={(e) =>
                                            setRobotFormName(e.target.value)
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
                                            value={robotFormIp}
                                            onChange={(e) =>
                                                setRobotFormIp(e.target.value)
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
                                            value={robotFormBattery}
                                            onChange={(e) =>
                                                setRobotFormBattery(
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
                                        value={robotFormStatus}
                                        onChange={(e) =>
                                            setRobotFormStatus(e.target.value)
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
                                        onClick={() => setRobotModalOpen(false)}
                                        className="cursor-pointer rounded-lg px-4 py-2 font-label-md text-xs font-semibold text-tertiary uppercase hover:bg-slate-100"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSavingRobot}
                                        className="cursor-pointer rounded-lg bg-primary px-5 py-2 font-label-md text-xs font-bold text-white uppercase shadow-sm hover:bg-secondary disabled:opacity-50"
                                    >
                                        {isSavingRobot
                                            ? 'Saving...'
                                            : robotModalMode === 'create'
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
