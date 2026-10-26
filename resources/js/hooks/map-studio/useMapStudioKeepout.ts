import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { calculatePolygonArea } from '@/lib/geometry';
import type { FacilityMap, KeepoutZone, KeepoutZoneType, PathCoordinate } from '@/types';

interface UseMapStudioKeepoutOptions {
    currentMap: FacilityMap | null;
    onZoneSaved?: (keepoutUrl?: string) => void;
    onStartDraw?: () => void;
}

export function useMapStudioKeepout({
    currentMap,
    onZoneSaved,
    onStartDraw,
}: UseMapStudioKeepoutOptions) {
    const [zones, setZones] = useState<KeepoutZone[]>(
        currentMap?.keepout_zones ?? [],
    );
    const [selectedZone, setSelectedZone] = useState<KeepoutZone | null>(null);
    const [draftZoneCoords, setDraftZoneCoords] = useState<PathCoordinate[]>([]);
    const [zoneName, setZoneName] = useState('');
    const [zoneType, setZoneType] = useState<KeepoutZoneType>('keep_out');
    const [zoneSpeedLimit, setZoneSpeedLimit] = useState('0.40');
    const [zoneDescription, setZoneDescription] = useState('');
    const [isSavingZone, setIsSavingZone] = useState(false);

    useEffect(() => {
        setZones(currentMap?.keepout_zones ?? []);
        setSelectedZone(null);
        setDraftZoneCoords([]);
    }, [currentMap?.id, currentMap?.keepout_zones]);

    const handleStartDrawZone = () => {
        const nextIndex = zones.length + 1;
        setSelectedZone(null);
        setDraftZoneCoords([]);
        setZoneName(`RESTRICTED-ZONE-0${nextIndex}`);
        setZoneType('keep_out');
        setZoneSpeedLimit('0.40');
        setZoneDescription('');
        onStartDraw?.();
        toast.info(
            'Polygon Pen Active: Click 3+ corners on the map, then click V1 or "Close & Save Zone".',
        );
    };

    const handleSelectZone = (zone: KeepoutZone) => {
        setSelectedZone(zone);
        setDraftZoneCoords(zone.coordinates ?? []);
        setZoneName(zone.name);
        setZoneType(zone.zone_type);
        setZoneSpeedLimit(String(zone.speed_limit ?? 0.4));
        setZoneDescription(zone.description ?? '');
    };

    const handleClearZoneSelection = () => {
        setSelectedZone(null);
        setDraftZoneCoords([]);
    };

    const handleAddZonePoint = (coord: PathCoordinate) => {
        setDraftZoneCoords((prev) => [...prev, coord]);
    };

    const handleUpdateZonePoint = (index: number, coord: PathCoordinate) => {
        setDraftZoneCoords((prev) =>
            prev.map((pt, i) => (i === index ? coord : pt)),
        );
    };

    const handleSaveZone = async () => {
        if (!currentMap) return;
        if (draftZoneCoords.length < 3) {
            toast.error('A polygon zone requires at least 3 corner vertices.');
            return;
        }

        const finalName =
            zoneName.trim() || `RESTRICTED-ZONE-0${zones.length + 1}`;
        setIsSavingZone(true);

        const payload = {
            name: finalName,
            zone_type: zoneType,
            speed_limit:
                zoneType === 'speed_limit'
                    ? parseFloat(zoneSpeedLimit) || 0.4
                    : null,
            color: zoneType === 'keep_out' ? '#dc2626' : '#d97706',
            is_active: selectedZone ? selectedZone.is_active : true,
            coordinates: draftZoneCoords,
            description: zoneDescription.trim() || null,
        };

        try {
            const url = selectedZone
                ? `/api/keepout-zones/${selectedZone.id}`
                : `/api/maps/${currentMap.id}/keepout-zones`;
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
                        ? prev.map((z) => (z.id === savedZone.id ? savedZone : z))
                        : [...prev, savedZone],
                );
                onZoneSaved?.(json.meta?.keepout_url);
                setSelectedZone(savedZone);
                setDraftZoneCoords(savedZone.coordinates ?? []);
                toast.success(
                    `Zone '${savedZone.name}' (${savedZone.area_m2 ?? calculatePolygonArea(draftZoneCoords)} m²) saved & rasterized to Nav2 mask.`,
                );
            } else {
                toast.error(json.message || 'Failed to save keep-out zone.');
            }
        } catch {
            toast.error('Network error while saving keep-out zone.');
        } finally {
            setIsSavingZone(false);
        }
    };

    const handleToggleZoneActive = async (
        zone: KeepoutZone,
        e: React.MouseEvent,
    ) => {
        e.stopPropagation();
        try {
            const response = await fetch(`/api/keepout-zones/${zone.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ is_active: !zone.is_active }),
            });
            const json = await response.json();
            if (response.ok && json.data) {
                const updated: KeepoutZone = json.data;
                setZones((prev) =>
                    prev.map((z) => (z.id === updated.id ? updated : z)),
                );
                if (selectedZone?.id === updated.id) {
                    setSelectedZone(updated);
                }
                toast.success(
                    `Zone '${updated.name}' ${updated.is_active ? 'enabled' : 'muted'} on Nav2 costmap.`,
                );
            }
        } catch {
            toast.error('Failed to toggle zone status.');
        }
    };

    const handleDeleteZone = async (zone: KeepoutZone, e?: React.MouseEvent) => {
        e?.stopPropagation();
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
                toast.success(`Zone '${zone.name}' removed from Nav2 costmap mask.`);
            }
        } catch {
            toast.error('Failed to delete keep-out zone.');
        }
    };

    const currentDraftArea = calculatePolygonArea(draftZoneCoords);

    return {
        zones,
        setZones,
        selectedZone,
        setSelectedZone,
        draftZoneCoords,
        setDraftZoneCoords,
        zoneName,
        setZoneName,
        zoneType,
        setZoneType,
        zoneSpeedLimit,
        setZoneSpeedLimit,
        zoneDescription,
        setZoneDescription,
        isSavingZone,
        currentDraftArea,
        handleStartDrawZone,
        handleSelectZone,
        handleClearZoneSelection,
        handleAddZonePoint,
        handleUpdateZonePoint,
        handleSaveZone,
        handleToggleZoneActive,
        handleDeleteZone,
    };
}
