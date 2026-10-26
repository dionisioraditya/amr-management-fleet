import { useState } from 'react';
import { toast } from 'sonner';
import { calculatePolygonArea } from '@/components/fleet/interactive-blueprint-canvas';
import type { KeepoutZone, KeepoutZoneType, PathCoordinate } from '@/types';

interface UseKeepoutZoneEditorOptions {
    initialZones: KeepoutZone[];
    currentMapId: number;
    onStartNewZone?: () => void;
}

export function useKeepoutZoneEditor({
    initialZones,
    currentMapId,
    onStartNewZone,
}: UseKeepoutZoneEditorOptions) {
    const [zones, setZones] = useState<KeepoutZone[]>(initialZones);
    const [isDrawingZone, setIsDrawingZone] = useState(false);
    const [selectedZone, setSelectedZone] = useState<KeepoutZone | null>(null);
    const [draftZoneCoords, setDraftZoneCoords] = useState<PathCoordinate[]>([]);
    const [zoneName, setZoneName] = useState('RESTRICTED-ZONE-01');
    const [zoneType, setZoneType] = useState<KeepoutZoneType>('keep_out');
    const [zoneSpeedLimit, setZoneSpeedLimit] = useState('0.40');
    const [savingZone, setSavingZone] = useState(false);

    const startNewZoneMode = () => {
        onStartNewZone?.();
        setSelectedZone(null);
        setDraftZoneCoords([]);
        setZoneName(`RESTRICTED-ZONE-0${zones.length + 1}`);
        setZoneType('keep_out');
        setZoneSpeedLimit('0.40');
        setIsDrawingZone(true);
        toast.info(
            'Polygon Keep-Out Pen Active: Click 3+ corners on the map, then click V1 or "Close & Save Zone".',
        );
    };

    const handleSelectKeepoutZone = (zone: KeepoutZone) => {
        setIsDrawingZone(false);
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

    const handleClearZoneSelection = () => {
        setSelectedZone(null);
        setDraftZoneCoords([]);
        setIsDrawingZone(false);
    };

    const handleSaveKeepoutZone = async () => {
        if (draftZoneCoords.length < 3) {
            toast.error('A polygon zone requires at least 3 corner vertices.');
            return;
        }

        setSavingZone(true);
        const payload = {
            name: zoneName.trim() || `RESTRICTED-ZONE-0${zones.length + 1}`,
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
                        ? prev.map((z) => (z.id === savedZone.id ? savedZone : z))
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

    return {
        zones,
        setZones,
        isDrawingZone,
        setIsDrawingZone,
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
        savingZone,
        startNewZoneMode,
        handleSelectKeepoutZone,
        handleAddZonePoint,
        handleUpdateZonePoint,
        handleClearZoneSelection,
        handleSaveKeepoutZone,
        handleDeleteKeepoutZone,
    };
}
