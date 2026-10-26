import { router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { FacilityMap, KeepoutZone } from '@/types';

interface UseMapStudioCatalogOptions {
    maps: FacilityMap[];
    initialSelectedMap?: FacilityMap | null;
    zones: KeepoutZone[];
    occupancyViewMode: 'blueprint' | 'raw';
}

export function useMapStudioCatalog({
    maps,
    initialSelectedMap,
    zones,
    occupancyViewMode,
}: UseMapStudioCatalogOptions) {
    const [selectedMap, setSelectedMap] = useState<FacilityMap | null>(
        initialSelectedMap ?? maps[0] ?? null,
    );
    const [pushingNav2, setPushingNav2] = useState(false);

    const currentMap = selectedMap ?? maps[0] ?? null;

    const realWidthMeters =
        currentMap?.width_px && currentMap?.resolution
            ? (currentMap.width_px * currentMap.resolution).toFixed(1)
            : '23.0';
    const realHeightMeters =
        currentMap?.height_px && currentMap?.resolution
            ? (currentMap.height_px * currentMap.resolution).toFixed(1)
            : '15.0';

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
            toast.warning('Cannot delete the only active map in the catalog.');
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
                    setSelectedMap(maps.find((m) => m.id !== map.id) ?? null);
                }
                router.reload();
            }
        } catch {
            toast.error('Network error while deleting map.');
        }
    };

    const handlePushToNav2 = async () => {
        if (!currentMap) return;
        setPushingNav2(true);
        try {
            await fetch(`/api/maps/${currentMap.id}/keepout-zones/rasterize`, {
                method: 'POST',
                headers: { Accept: 'application/json' },
            });

            await fetch(`/api/maps/${currentMap.id}/activate`, {
                method: 'POST',
                headers: { Accept: 'application/json' },
            });

            const response = await fetch('/api/logs/system', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    action: `Pushed Calibrated Map '${currentMap.name}' & ${zones.filter((z) => z.is_active).length} Keep-Out Masks to Active ROS 2 Nav2 Server`,
                    level: 'info',
                    context: {
                        map_id: currentMap.id,
                        resolution: currentMap.resolution,
                        origin: [currentMap.origin_x, currentMap.origin_y, currentMap.origin_yaw ?? 0],
                        dimensions: [currentMap.width_px, currentMap.height_px],
                        active_keepout_zones: zones.filter((z) => z.is_active).length,
                        occupancy_view_mode: occupancyViewMode,
                    },
                }),
            });

            if (response.ok) {
                toast.success(
                    `Map '${currentMap.name}' & Keep-Out Costmap Mask deployed to Nav2 Server (10.32.254.195).`,
                );
                router.reload();
            }
        } catch {
            toast.error('Failed to deploy map to Nav2 server.');
        } finally {
            setPushingNav2(false);
        }
    };

    const handleActivateMap = async (map: FacilityMap, e?: React.MouseEvent) => {
        e?.stopPropagation();
        try {
            const res = await fetch(`/api/maps/${map.id}/activate`, {
                method: 'POST',
                headers: { Accept: 'application/json' },
            });
            if (res.ok) {
                toast.success(`Map '${map.name}' is now active across the fleet.`);
                setSelectedMap(map);
                router.reload();
            } else {
                toast.error('Failed to set map as active.');
            }
        } catch {
            toast.error('Network error while activating map.');
        }
    };

    return {
        selectedMap,
        setSelectedMap,
        currentMap,
        pushingNav2,
        realWidthMeters,
        realHeightMeters,
        handleExportZipPackage,
        handleDownloadYaml,
        handleDeleteMap,
        handlePushToNav2,
        handleActivateMap,
    };
}
