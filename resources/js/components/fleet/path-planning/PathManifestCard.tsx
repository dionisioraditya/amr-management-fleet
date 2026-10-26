import React from 'react';
import { calculatePathLength } from '@/components/fleet/interactive-blueprint-canvas';
import { StatusBadge } from '@/components/fleet/status-badge';
import type { Pathplan } from '@/types';

interface PathManifestCardProps {
    filteredPaths: Pathplan[];
    selectedPath: Pathplan | null;
    flowFilter: 'all' | 'bi' | 'uni';
    setFlowFilter: (val: 'all' | 'bi' | 'uni') => void;
    onSelectPath: (path: Pathplan) => void;
    onStartEditPath: (path: Pathplan) => void;
    onExportYaml: (path: Pathplan) => void;
    onDeletePath: (path: Pathplan) => void;
}

export const PathManifestCard: React.FC<PathManifestCardProps> = ({
    filteredPaths,
    selectedPath,
    flowFilter,
    setFlowFilter,
    onSelectPath,
    onStartEditPath,
    onExportYaml,
    onDeletePath,
}) => {
    return (
        <div className="rounded-xl border border-slate-200/80 bg-white p-space-md shadow-xs">
            <div className="mb-space-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface uppercase">
                        Transit Lane Manifest
                    </h2>
                    <span className="rounded-full bg-surface-container px-2 py-0.5 font-label-sm text-label-sm text-tertiary">
                        {filteredPaths.length} Lanes
                    </span>
                </div>
                <select
                    value={flowFilter}
                    onChange={(e) =>
                        setFlowFilter(e.target.value as 'all' | 'bi' | 'uni')
                    }
                    className="cursor-pointer rounded bg-surface-container-low px-2 py-1 font-label-sm text-label-sm text-on-surface focus:outline-none"
                >
                    <option value="all">Filter: All</option>
                    <option value="bi">Bidirectional</option>
                    <option value="uni">One-Way</option>
                </select>
            </div>

            <div className="space-y-space-sm">
                {filteredPaths.map((path) => {
                    const isSelected = selectedPath?.id === path.id;
                    const lengthM = calculatePathLength(path.coordinates);

                    return (
                        <div
                            key={path.id}
                            onClick={() => onSelectPath(path)}
                            className={`cursor-pointer rounded-xl border p-space-md transition-all ${
                                isSelected
                                    ? 'border-primary-container bg-surface-container-low/70 shadow-xs'
                                    : 'border-slate-200/80 bg-surface-container-lowest shadow-2xs hover:border-primary/40'
                            }`}
                        >
                            <div className="mb-space-xs flex items-start justify-between">
                                <div className="flex items-center gap-space-sm">
                                    <span className="material-symbols-outlined text-[20px] text-primary">
                                        alt_route
                                    </span>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                                                {path.name}
                                            </span>
                                            <StatusBadge
                                                status={
                                                    path.is_bidirectional
                                                        ? 'moving'
                                                        : 'idle'
                                                }
                                                label={
                                                    path.is_bidirectional
                                                        ? 'BIDIRECTIONAL'
                                                        : 'ONE-WAY'
                                                }
                                            />
                                        </div>
                                        <span className="font-body-sm text-body-sm text-tertiary">
                                            {path.description ??
                                                'Nav2 Transit Trajectory'}
                                        </span>
                                    </div>
                                </div>
                                <span className="font-mono font-label-sm text-label-sm font-bold text-primary">
                                    {lengthM}m
                                </span>
                            </div>

                            <div className="my-space-xs grid grid-cols-3 gap-space-xs rounded-lg bg-surface-container-low px-space-sm py-space-xs font-label-sm text-label-sm text-tertiary">
                                <div>
                                    Waypoints:{' '}
                                    <strong className="text-on-surface">
                                        {path.coordinates?.length ?? 0} WPs
                                    </strong>
                                </div>
                                <div>
                                    Flow:{' '}
                                    <strong className="text-on-surface">
                                        {path.is_bidirectional ? 'Dual' : 'Single'}
                                    </strong>
                                </div>
                                <div>
                                    Max Speed:{' '}
                                    <strong className="text-primary">
                                        {path.max_speed} m/s
                                    </strong>
                                </div>
                            </div>

                            <div
                                className="flex items-center justify-between pt-space-xs"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <span className="font-mono text-[10px] text-tertiary">
                                    WP-1 → WP-{path.coordinates?.length ?? 1}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => onSelectPath(path)}
                                        className="cursor-pointer rounded p-1 text-primary hover:bg-surface-container"
                                        title="Focus on Map"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            visibility
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onStartEditPath(path)}
                                        className="cursor-pointer rounded p-1 text-on-surface-variant hover:bg-surface-container"
                                        title="Edit Trajectory on Map"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            edit
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onExportYaml(path)}
                                        className="cursor-pointer rounded p-1 text-on-surface-variant hover:bg-surface-container"
                                        title="Export Nav2 YAML"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            download
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDeletePath(path)}
                                        className="cursor-pointer rounded p-1 text-on-surface-variant hover:bg-error-container hover:text-error"
                                        title="Delete Pathplan"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            delete
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
