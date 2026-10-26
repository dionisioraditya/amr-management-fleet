import { useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { useRobotPoseEstimate } from '@/hooks/dashboard/useRobotPoseEstimate';
import type { Vehicle } from '@/types';

export type StatusFilter = 'ALL' | 'ACTIVE' | 'IDLE' | 'CHARGING' | 'ERROR';

interface UseRobotCrudOptions {
    vehicles: Vehicle[];
    setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
    selectedVehicleId: string | null;
    setSelectedVehicleId: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useRobotCrud({
    vehicles,
    setVehicles,
    selectedVehicleId,
    setSelectedVehicleId,
}: UseRobotCrudOptions) {
    const [robotSearchQuery, setRobotSearchQuery] = useState('');
    const [robotStatusFilter, setRobotStatusFilter] = useState<StatusFilter>('ALL');

    const [robotModalOpen, setRobotModalOpen] = useState(false);
    const [robotModalMode, setRobotModalMode] = useState<'create' | 'edit'>('create');
    const [robotFormId, setRobotFormId] = useState('');
    const [robotFormName, setRobotFormName] = useState('');
    const [robotFormIp, setRobotFormIp] = useState('10.32.254.197');
    const [robotFormStatus, setRobotFormStatus] = useState('idle');
    const [robotFormBattery, setRobotFormBattery] = useState(100);
    const [isSavingRobot, setIsSavingRobot] = useState(false);

    const activeVehicle = selectedVehicleId
        ? (vehicles.find((v) => v.id === selectedVehicleId) ?? null)
        : null;

    const totalVehiclesCount = vehicles.length;
    const liveVehiclesCount = vehicles.filter((v) => v.status === 'active' || v.status === 'moving').length;
    const chargingCount = vehicles.filter((v) => v.status === 'charging').length;
    const blockedCount = vehicles.filter((v) => v.status === 'error' || v.status === 'emergency_stop').length;

    const filteredVehicles = vehicles.filter((v) => {
        const matchesSearch =
            v.id.toLowerCase().includes(robotSearchQuery.toLowerCase()) ||
            v.name.toLowerCase().includes(robotSearchQuery.toLowerCase()) ||
            v.ip_address.includes(robotSearchQuery);
        if (!matchesSearch) return false;
        if (robotStatusFilter === 'ALL') return true;
        if (robotStatusFilter === 'ACTIVE') return v.status === 'active' || v.status === 'moving';
        if (robotStatusFilter === 'CHARGING') return v.status === 'charging';
        if (robotStatusFilter === 'ERROR') return v.status === 'error' || v.status === 'emergency_stop';
        return v.status === robotStatusFilter.toLowerCase();
    });

    const openCreateRobotModal = () => {
        setRobotModalMode('create');
        const nextIdx = vehicles.length + 1;
        setRobotFormId(`AMR-0${nextIdx}`);
        setRobotFormName(`Titan Carrier 0${nextIdx}`);
        setRobotFormIp(`10.32.254.${195 + nextIdx}`);
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
            const payload = {
                id: robotFormId.trim(),
                name: robotFormName.trim(),
                ip_address: robotFormIp.trim(),
                status: robotFormStatus,
                battery_percentage: robotFormBattery,
            };

            const url = robotModalMode === 'create' ? '/api/vehicles' : `/api/vehicles/${encodeURIComponent(robotFormId)}`;
            const method = robotModalMode === 'create' ? 'POST' : 'PUT';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(payload),
            });

            const json = await response.json();
            if (response.ok && json.data) {
                const saved: Vehicle = json.data;
                if (robotModalMode === 'create') {
                    setVehicles((prev) => [...prev, saved]);
                    setSelectedVehicleId(saved.id);
                    toast.success(`Unit ${saved.id} registered.`);
                } else {
                    setVehicles((prev) => prev.map((v) => (v.id === saved.id ? saved : v)));
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
            const response = await fetch(`/api/vehicles/${encodeURIComponent(vehicle.id)}`, {
                method: 'DELETE',
                headers: { Accept: 'application/json' },
            });
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
        updates: { x?: number; y?: number; theta?: number; status?: string; battery_percentage?: number; event?: string },
    ) => {
        const nextX = Number((updates.x ?? vehicle.pose?.x ?? 4.0).toFixed(2));
        const nextY = Number((updates.y ?? vehicle.pose?.y ?? 4.0).toFixed(2));
        const nextTheta = Number((updates.theta ?? vehicle.pose?.theta ?? 0.0).toFixed(2));
        const nextStatus = updates.status ?? vehicle.status;
        const nextBattery = updates.battery_percentage ?? vehicle.battery_percentage;

        const response = await fetch(`/api/vehicles/${encodeURIComponent(vehicle.id)}/telemetry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                x: nextX, y: nextY, theta: nextTheta,
                status: nextStatus, battery_percentage: nextBattery, event: updates.event,
            }),
        });

        const json = await response.json();
        if (response.ok && json.data) {
            setVehicles((prev) =>
                prev.map((v) =>
                    v.id === vehicle.id
                        ? { ...v, status: json.data.status, battery_percentage: json.data.battery_percentage, pose: json.data.pose }
                        : v,
                ),
            );
            router.reload({ only: ['telemetryShell'] });
        }
    };

    const poseEstimate = useRobotPoseEstimate({
        activeVehicle,
        sendTelemetryUpdate,
    });

    return {
        robotSearchQuery, setRobotSearchQuery,
        robotStatusFilter, setRobotStatusFilter,
        pickPoseMode: poseEstimate.pickPoseMode,
        setPickPoseMode: poseEstimate.setPickPoseMode,
        poseEstimateMode: poseEstimate.poseEstimateMode,
        setPoseEstimateMode: poseEstimate.setPoseEstimateMode,
        estimateX: poseEstimate.estimateX,
        setEstimateX: poseEstimate.setEstimateX,
        estimateY: poseEstimate.estimateY,
        setEstimateY: poseEstimate.setEstimateY,
        estimateYawDeg: poseEstimate.estimateYawDeg,
        setEstimateYawDeg: poseEstimate.setEstimateYawDeg,
        robotModalOpen, setRobotModalOpen,
        robotModalMode,
        robotFormId, setRobotFormId,
        robotFormName, setRobotFormName,
        robotFormIp, setRobotFormIp,
        robotFormStatus, setRobotFormStatus,
        robotFormBattery, setRobotFormBattery,
        isSavingRobot,
        activeVehicle,
        totalVehiclesCount, liveVehiclesCount, chargingCount, blockedCount,
        filteredVehicles,
        openCreateRobotModal, openEditRobotModal,
        handleSaveVehicle, handleDeleteVehicle,
        sendTelemetryUpdate,
        handleCanvasPickPose: poseEstimate.handleCanvasPickPose,
        handleCanvasPoseEstimate: poseEstimate.handleCanvasPoseEstimate,
        handleApplyManualPoseEstimate: poseEstimate.handleApplyManualPoseEstimate,
        handleAlignToStation: poseEstimate.handleAlignToStation,
    };
}
