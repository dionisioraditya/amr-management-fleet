import { useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import type { Mission, Vehicle, Waypoint } from '@/types';

interface UseMissionDispatchOptions {
    missions: Mission[];
    setMissions: React.Dispatch<React.SetStateAction<Mission[]>>;
    vehicles: Vehicle[];
    waypoints: Waypoint[];
}

export function useMissionDispatch({
    missions,
    setMissions,
    vehicles,
    waypoints,
}: UseMissionDispatchOptions) {
    const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
    const [missionName, setMissionName] = useState(`Mission Transport #${missions.length + 1}`);
    const [missionVehicleId, setMissionVehicleId] = useState<string>(vehicles[0]?.id ?? '');
    const [missionPriority, setMissionPriority] = useState<'low' | 'normal' | 'high' | 'critical'>('normal');
    const [selectedWaypointIds, setSelectedWaypointIds] = useState<number[]>(
        waypoints.slice(0, 2).map((w) => w.id),
    );
    const [waypointToAdd, setWaypointToAdd] = useState<number>(waypoints[0]?.id ?? 0);
    const [isSubmittingMission, setIsSubmittingMission] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        toast(msg);
        window.setTimeout(() => setToastMessage(null), 3000);
    };

    const handleAddWaypointStep = () => {
        if (!waypointToAdd) return;
        setSelectedWaypointIds((prev) => [...prev, waypointToAdd]);
    };

    const handleRemoveWaypointStep = (index: number) => {
        setSelectedWaypointIds((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handleMoveWaypointStep = (index: number, direction: -1 | 1) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= selectedWaypointIds.length) return;
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
            const payload = {
                name: missionName,
                vehicle_id: missionVehicleId,
                priority: missionPriority,
                steps: selectedWaypointIds.map((wpId, idx) => ({
                    order: idx + 1,
                    waypoint_id: wpId,
                    action: 'dock_and_transfer',
                })),
            };

            const response = await fetch('/api/missions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const json = await response.json();
            if (response.ok && json.data) {
                setMissions((prev) => [json.data, ...prev]);
                showToast(`Mission #${json.data.id} dispatched via ROS 2 Nav2 BT.`);
                setDispatchModalOpen(false);
                setSelectedWaypointIds([]);
                router.reload({ only: ['missions', 'telemetryShell'] });
            } else {
                showToast(json.message ?? 'Failed to dispatch mission.');
            }
        } catch {
            showToast('Network error while dispatching mission.');
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
            setMissions((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
            showToast(`Mission #${updated.id} transitioned to ${nextStatus}.`);
            router.reload({ only: ['missions', 'telemetryShell'] });
        }
    };

    const handleCancelMission = (mission: Mission) => {
        return handleUpdateMissionStatus(mission, 'cancelled');
    };

    return {
        dispatchModalOpen, setDispatchModalOpen,
        missionName, setMissionName,
        missionVehicleId, setMissionVehicleId,
        missionPriority, setMissionPriority,
        selectedWaypointIds, setSelectedWaypointIds,
        waypointToAdd, setWaypointToAdd,
        isSubmittingMission,
        toastMessage, showToast,
        handleAddWaypointStep, handleRemoveWaypointStep, handleMoveWaypointStep,
        handleDispatchMission, handleUpdateMissionStatus, handleCancelMission,
    };
}
