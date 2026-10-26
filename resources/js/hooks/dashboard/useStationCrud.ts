import { useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { classifyStation, degToRad, radToDeg } from '@/constants/fleet.constants';
import type { PathCoordinate, Waypoint } from '@/types';

interface UseStationCrudOptions {
    currentMapId: number;
    waypoints: Waypoint[];
    setWaypoints: React.Dispatch<React.SetStateAction<Waypoint[]>>;
    selectedWaypoint: Waypoint | null;
    setSelectedWaypoint: React.Dispatch<React.SetStateAction<Waypoint | null>>;
}

export function useStationCrud({
    currentMapId,
    waypoints,
    setWaypoints,
    selectedWaypoint,
    setSelectedWaypoint,
}: UseStationCrudOptions) {
    const [zoneFilter, setZoneFilter] = useState<'all' | 'charging' | 'pd' | 'standby'>('all');
    const [stationPickMode, setStationPickMode] = useState(false);
    const [stationSnapEnabled, setStationSnapEnabled] = useState(true);
    const [stationModalOpen, setStationModalOpen] = useState(false);
    const [editingStation, setEditingStation] = useState<Waypoint | null>(null);
    const [stationFormName, setStationFormName] = useState('ST-CHARGE-03');
    const [stationFormType, setStationFormType] = useState<'charging' | 'pickup' | 'dropoff' | 'standby'>('charging');
    const [stationFormX, setStationFormX] = useState('14.50');
    const [stationFormY, setStationFormY] = useState('6.00');
    const [stationFormYawDeg, setStationFormYawDeg] = useState('90');
    const [savingStation, setSavingStation] = useState(false);

    const filteredWaypoints = waypoints.filter((wp) => {
        if (zoneFilter === 'all') return true;
        return classifyStation(wp.name).category === zoneFilter;
    });

    const stationChargingCount = waypoints.filter((w) => classifyStation(w.name).category === 'charging').length;
    const stationPdCount = waypoints.filter((w) => classifyStation(w.name).category === 'pd').length;
    const stationStandbyCount = waypoints.filter((w) => classifyStation(w.name).category === 'standby').length;
    const activeInspectedStation = selectedWaypoint ?? null;

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
                : cat === 'pd'
                  ? 'pickup'
                  : cat === 'standby'
                    ? 'standby'
                    : 'charging',
        );
        setStationFormX(String(wp.x));
        setStationFormY(String(wp.y));
        setStationFormYawDeg(String(radToDeg(wp.theta)));
        setStationModalOpen(true);
    };

    const handleStationTypePresetChange = (type: 'charging' | 'pickup' | 'dropoff' | 'standby') => {
        setStationFormType(type);
        if (!editingStation) {
            const prefix =
                type === 'charging'
                    ? 'ST-CHARGE'
                    : type === 'pickup'
                      ? 'ST-PICKUP'
                      : type === 'dropoff'
                        ? 'ST-DROPOFF'
                        : 'ST-STANDBY';
            setStationFormName(`${prefix}-0${waypoints.length + 1}`);
        }
    };

    const handleCanvasPickStation = (coord: PathCoordinate) => {
        setStationPickMode(false);
        if (editingStation) {
            setStationFormX(String(coord.x));
            setStationFormY(String(coord.y));
            setStationModalOpen(true);
            toast.info(`Updated coordinate for ${editingStation.name} to [X: ${coord.x}m, Y: ${coord.y}m]`);
        } else {
            openCreateStationModal(coord);
            toast.info(`Picked map coordinate [X: ${coord.x}m, Y: ${coord.y}m]`);
        }
    };

    const startPickNewStation = () => {
        setEditingStation(null);
        setStationPickMode(true);
    };

    const handleCancelStationPick = () => {
        setStationPickMode(false);
        if (editingStation) {
            setStationModalOpen(true);
        }
    };

    const handleSaveStation = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingStation(true);
        try {
            const payload = {
                facility_map_id: currentMapId,
                name: stationFormName,
                x: parseFloat(stationFormX) || 0,
                y: parseFloat(stationFormY) || 0,
                theta: degToRad(parseFloat(stationFormYawDeg) || 0),
            };

            const url = editingStation ? `/api/waypoints/${editingStation.id}` : '/api/waypoints';
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
                toast.success(editingStation ? `Station ${json.data.name} updated.` : `Station ${json.data.name} registered.`);
                if (editingStation) {
                    setWaypoints((prev) => prev.map((item) => (item.id === json.data.id ? json.data : item)));
                } else {
                    setWaypoints((prev) => [...prev, json.data]);
                }
                setSelectedWaypoint(json.data);
                setStationModalOpen(false);
                router.reload({ only: ['waypoints', 'maps', 'activeMap', 'telemetryShell'] });
            } else {
                toast.error(json.message ?? 'Failed to save station record.');
            }
        } catch {
            toast.error('Network error occurred while saving station.');
        } finally {
            setSavingStation(false);
        }
    };

    const handleDeleteStation = async (wp: Waypoint) => {
        if (!confirm(`Are you sure you want to decommission station "${wp.name}"?`)) {
            return;
        }

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
                router.reload({ only: ['waypoints', 'maps', 'activeMap', 'telemetryShell'] });
            } else {
                toast.error('Failed to delete station.');
            }
        } catch {
            toast.error('Network error while deleting station.');
        }
    };

    return {
        zoneFilter, setZoneFilter,
        stationPickMode, setStationPickMode,
        stationSnapEnabled, setStationSnapEnabled,
        stationModalOpen, setStationModalOpen,
        editingStation,
        stationFormName, setStationFormName,
        stationFormType, setStationFormType,
        stationFormX, setStationFormX,
        stationFormY, setStationFormY,
        stationFormYawDeg, setStationFormYawDeg,
        savingStation,
        filteredWaypoints,
        stationChargingCount, stationPdCount, stationStandbyCount,
        activeInspectedStation,
        openCreateStationModal, openEditStationModal,
        handleStationTypePresetChange,
        handleCanvasPickStation,
        startPickNewStation,
        handleCancelStationPick,
        handleSaveStation, handleDeleteStation,
    };
}
