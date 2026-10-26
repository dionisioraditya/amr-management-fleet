import { Link } from '@inertiajs/react';
import React from 'react';

interface EmptyMapStateProps {
    onOpenLiveSlam: () => void;
}

export const EmptyMapState: React.FC<EmptyMapStateProps> = ({ onOpenLiveSlam }) => {
    return (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface-container-lowest/90 p-space-xl text-center backdrop-blur-md select-none">
            <div className="relative mb-space-lg flex h-40 w-40 items-center justify-center rounded-2xl border border-surface-container-high bg-surface-container-low/60">
                <span className="material-symbols-outlined text-[64px] text-primary">
                    map
                </span>
            </div>
            <h2 className="font-headline-lg text-headline-lg font-semibold tracking-tight text-on-surface uppercase">
                No Active Map Loaded
            </h2>
            <p className="mt-space-xs mb-space-lg max-w-lg font-body-md text-body-md text-on-surface-variant">
                No OccupancyGrid map is currently loaded in the viewport. Select
                a calibrated map from the catalog or record a new map via ROS 2
                SLAM Toolbox.
            </p>
            <div className="flex items-center gap-space-md">
                <Link
                    href="/map-studio"
                    className="flex items-center gap-space-xs rounded-lg bg-primary-container px-space-xl py-2.5 font-label-md text-label-md font-bold tracking-wider text-on-primary-container uppercase shadow-md transition-all hover:bg-primary hover:text-on-primary"
                >
                    <span className="material-symbols-outlined text-[18px]">
                        folder_open
                    </span>
                    Open Map Studio
                </Link>
                <button
                    type="button"
                    onClick={onOpenLiveSlam}
                    className="flex cursor-pointer items-center gap-space-xs rounded-lg bg-surface-container-high px-space-lg py-2.5 font-label-md text-label-md font-semibold tracking-wider text-on-surface uppercase transition-all hover:bg-surface-container hover:text-primary"
                >
                    <span className="material-symbols-outlined text-[18px]">
                        videocam
                    </span>
                    Live SLAM Record
                </button>
            </div>
        </div>
    );
};
