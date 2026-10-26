import { router } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import type { FacilityMap } from '@/types';

interface UseMapPackageModalOptions {
    onMapImported?: (map: FacilityMap) => void;
    onMapUpdated?: (map: FacilityMap) => void;
}

export function useMapPackageModal({
    onMapImported,
    onMapUpdated,
}: UseMapPackageModalOptions = {}) {
    const zipFileInputRef = useRef<HTMLInputElement>(null);
    const [mapModalOpen, setMapModalOpen] = useState(false);
    const [editingMap, setEditingMap] = useState<FacilityMap | null>(null);
    const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null);

    const [formName, setFormName] = useState('');
    const [formImagePath, setFormImagePath] = useState('');
    const [formResolution, setFormResolution] = useState('0.05');
    const [formOriginX, setFormOriginX] = useState('-1.54');
    const [formOriginY, setFormOriginY] = useState('-1.58');
    const [formOriginYaw, setFormOriginYaw] = useState('0.0');
    const [savingMap, setSavingMap] = useState(false);

    const triggerFileManagerZipSelect = () => {
        setEditingMap(null);
        setSelectedZipFile(null);
        setFormName('');
        zipFileInputRef.current?.click();
    };

    const handleZipFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
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
                headers: { Accept: 'application/json' },
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
                onMapImported?.(importedMap);
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
                onMapUpdated?.(json.data);
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

    return {
        zipFileInputRef,
        mapModalOpen,
        setMapModalOpen,
        editingMap,
        selectedZipFile,
        formName,
        setFormName,
        formResolution,
        setFormResolution,
        formOriginX,
        setFormOriginX,
        formOriginY,
        setFormOriginY,
        formOriginYaw,
        setFormOriginYaw,
        savingMap,
        triggerFileManagerZipSelect,
        handleZipFilePicked,
        openCreateMapModal,
        openEditMapModal,
        handleUploadZipPackage,
        handleSaveEditedMap,
    };
}
