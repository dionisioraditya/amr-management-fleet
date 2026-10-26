import React from 'react';

interface PathEmptyPromptCardProps {
    onStartNewZone: () => void;
    onStartNewPath: () => void;
}

export const PathEmptyPromptCard: React.FC<PathEmptyPromptCardProps> = ({
    onStartNewZone,
    onStartNewPath,
}) => {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/80 p-8 text-center shadow-xs">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low text-primary">
                <span className="material-symbols-outlined text-[26px]">
                    touch_app
                </span>
            </div>
            <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                No Guidance Path or Zone Selected
            </h3>
            <p className="mt-1 max-w-xs font-body-sm text-body-sm text-tertiary">
                Click any trajectory line or restricted polygon on the blueprint map to inspect and edit, or use{' '}
                <strong className="text-on-surface">+ NEW PATH</strong> / <strong className="text-red-600">+ KEEP-OUT</strong> to draw.
            </p>
            <div className="mt-4 flex items-center gap-2">
                <button
                    type="button"
                    onClick={onStartNewZone}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 font-label-sm text-xs font-semibold text-white uppercase shadow-xs transition-all hover:bg-red-700"
                >
                    <span className="material-symbols-outlined text-[16px]">
                        pentagon
                    </span>
                    <span>+ KEEP-OUT ZONE</span>
                </button>
                <button
                    type="button"
                    onClick={onStartNewPath}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-label-sm text-xs font-semibold text-on-primary uppercase shadow-xs transition-all hover:bg-on-primary-fixed-variant"
                >
                    <span className="material-symbols-outlined text-[16px]">
                        add_road
                    </span>
                    <span>+ NEW PATH</span>
                </button>
            </div>
        </div>
    );
};
