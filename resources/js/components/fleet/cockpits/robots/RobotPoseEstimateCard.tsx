import React from 'react';
import type { Waypoint } from '@/types';

interface RobotPoseEstimateCardProps {
    poseEstimateMode: boolean;
    onTogglePoseEstimate: () => void;
    estimateX: string;
    setEstimateX: (val: string) => void;
    estimateY: string;
    setEstimateY: (val: string) => void;
    estimateYawDeg: string;
    setEstimateYawDeg: (val: string) => void;
    onApplyManualPoseEstimate: () => void;
    waypoints: Waypoint[];
    onAlignToStation: (wp: Waypoint) => void;
}

export const RobotPoseEstimateCard: React.FC<RobotPoseEstimateCardProps> = ({
    poseEstimateMode,
    onTogglePoseEstimate,
    estimateX,
    setEstimateX,
    estimateY,
    setEstimateY,
    estimateYawDeg,
    setEstimateYawDeg,
    onApplyManualPoseEstimate,
    waypoints,
    onAlignToStation,
}) => {
    return (
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
                    onClick={onTogglePoseEstimate}
                    className={`cursor-pointer rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase transition-colors ${
                        poseEstimateMode
                            ? 'bg-emerald-600 text-white'
                            : 'border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-100'
                    }`}
                >
                    {poseEstimateMode ? 'DRAGGING... (CANCEL)' : 'DRAG POSE ON MAP'}
                </button>
            </div>

            {/* Manual Numeric Inputs */}
            <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
                <div className="rounded-lg border border-slate-200 bg-white p-1.5">
                    <label className="block text-[9px] text-slate-400">X (m)</label>
                    <input
                        type="number"
                        step="0.05"
                        value={estimateX}
                        onChange={(e) => setEstimateX(e.target.value)}
                        className="w-full bg-transparent font-bold text-slate-800 focus:outline-none"
                    />
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-1.5">
                    <label className="block text-[9px] text-slate-400">Y (m)</label>
                    <input
                        type="number"
                        step="0.05"
                        value={estimateY}
                        onChange={(e) => setEstimateY(e.target.value)}
                        className="w-full bg-transparent font-bold text-slate-800 focus:outline-none"
                    />
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-1.5">
                    <label className="block text-[9px] text-slate-400">Yaw (deg)</label>
                    <input
                        type="number"
                        step="5"
                        value={estimateYawDeg}
                        onChange={(e) => setEstimateYawDeg(e.target.value)}
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
                    onClick={onApplyManualPoseEstimate}
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
                                    (w) => w.id === Number(e.target.value),
                                );
                                if (wp) {
                                    onAlignToStation(wp);
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
    );
};
