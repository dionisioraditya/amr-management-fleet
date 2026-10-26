import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { degToRad, radToDeg } from '@/constants/fleet.constants';
import type { PathCoordinate, Vehicle, Waypoint } from '@/types';

interface UseRobotPoseEstimateOptions {
    activeVehicle: Vehicle | null;
    sendTelemetryUpdate: (
        vehicle: Vehicle,
        updates: {
            x?: number;
            y?: number;
            theta?: number;
            status?: string;
            battery_percentage?: number;
            event?: string;
        },
    ) => Promise<void>;
}

export function useRobotPoseEstimate({
    activeVehicle,
    sendTelemetryUpdate,
}: UseRobotPoseEstimateOptions) {
    const [pickPoseMode, setPickPoseMode] = useState(false);
    const [poseEstimateMode, setPoseEstimateMode] = useState(false);

    // 2D Pose Estimate Manual Inputs
    const [estimateX, setEstimateX] = useState('0.00');
    const [estimateY, setEstimateY] = useState('0.00');
    const [estimateYawDeg, setEstimateYawDeg] = useState('0');

    useEffect(() => {
        if (activeVehicle) {
            setEstimateX((activeVehicle.pose?.x ?? 0).toFixed(2));
            setEstimateY((activeVehicle.pose?.y ?? 0).toFixed(2));
            setEstimateYawDeg(String(radToDeg(activeVehicle.pose?.theta ?? 0)));
        }
    }, [activeVehicle?.id]);

    const handleCanvasPickPose = (coord: PathCoordinate) => {
        if (!activeVehicle) return;
        setPickPoseMode(false);
        void sendTelemetryUpdate(activeVehicle, {
            x: coord.x,
            y: coord.y,
            event: `Teleop 2D Nav Goal commanded to [X:${coord.x}m, Y:${coord.y}m]`,
        });
        toast.success(
            `Target pose for ${activeVehicle.id} dispatched to [${coord.x}m, ${coord.y}m]`,
        );
    };

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

    return {
        pickPoseMode,
        setPickPoseMode,
        poseEstimateMode,
        setPoseEstimateMode,
        estimateX,
        setEstimateX,
        estimateY,
        setEstimateY,
        estimateYawDeg,
        setEstimateYawDeg,
        handleCanvasPickPose,
        handleCanvasPoseEstimate,
        handleApplyManualPoseEstimate,
        handleAlignToStation,
    };
}
