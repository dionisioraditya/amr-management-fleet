import { useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { exportPathToYaml } from '@/lib/path-planning/yaml-export';
import type { PathCoordinate, Pathplan } from '@/types';

interface UsePathPersistenceOptions {
    currentMapId: number;
    onSaved?: (path: Pathplan) => void;
    onDeleted?: (deletedId: number) => void;
}

export function usePathPersistence({
    currentMapId,
    onSaved,
    onDeleted,
}: UsePathPersistenceOptions) {
    const [saving, setSaving] = useState(false);

    const savePathplan = async (
        payload: {
            name: string;
            is_bidirectional: boolean;
            max_speed: number;
            coordinates: PathCoordinate[];
            description: string | null;
        },
        editingPathId: number | null,
    ) => {
        if (payload.coordinates.length < 2) {
            toast.error('Trajectory requires at least 2 waypoints.');
            return false;
        }

        setSaving(true);
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
                if (json.data) {
                    onSaved?.(json.data);
                }
                router.reload();
                return true;
            } else {
                toast.error(json.message || 'Failed to save pathplan.');
                return false;
            }
        } catch {
            toast.error('Network error while contacting Fleet Server.');
            return false;
        } finally {
            setSaving(false);
        }
    };

    const deletePathplan = async (path: Pathplan) => {
        try {
            const response = await fetch(`/api/pathplans/${path.id}`, {
                method: 'DELETE',
                headers: { Accept: 'application/json' },
            });

            if (response.ok) {
                toast.success(`Pathplan ${path.name} deleted.`);
                onDeleted?.(path.id);
                router.reload();
                return true;
            } else {
                toast.error('Failed to delete pathplan.');
                return false;
            }
        } catch {
            toast.error('Network error while deleting pathplan.');
            return false;
        }
    };

    const exportYaml = (
        path: Pathplan,
        effectiveCornerRadius: number,
        inflationCorridor: number,
    ) => {
        exportPathToYaml(path, effectiveCornerRadius, inflationCorridor);
        toast.success(`Exported ${path.name} Nav2 YAML trajectory.`);
    };

    return {
        saving,
        savePathplan,
        deletePathplan,
        exportYaml,
    };
}
