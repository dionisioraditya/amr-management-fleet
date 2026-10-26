import React from 'react';

export const PathFooterCard: React.FC = () => {
    return (
        <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-space-md font-label-sm text-label-sm text-tertiary shadow-xs">
            <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">
                    dns
                </span>
                <span>ROS2 Nav2 Action Server: READY</span>
            </div>
            <span>YAML v1.2</span>
        </div>
    );
};
