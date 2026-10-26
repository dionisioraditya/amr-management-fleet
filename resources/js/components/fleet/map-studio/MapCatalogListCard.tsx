import React from 'react';
import type { FacilityMap } from '@/types';

interface MapCatalogListCardProps {
    maps: FacilityMap[];
    currentMap: FacilityMap | null;
    onSelectMap: (map: FacilityMap) => void;
    onActivateMap: (map: FacilityMap, e?: React.MouseEvent) => void;
    onExportZip: (map: FacilityMap) => void;
    onDownloadYaml: (map: FacilityMap) => void;
    onEditMap: (map: FacilityMap) => void;
    onDeleteMap: (map: FacilityMap) => void;
}

export function MapCatalogListCard({
    maps,
    currentMap,
    onSelectMap,
    onActivateMap,
    onExportZip,
    onDownloadYaml,
    onEditMap,
    onDeleteMap,
}: MapCatalogListCardProps) {
    return (
        <div className="space-y-2.5">
            {maps.map((map) => {
                const isSelected = currentMap?.id === map.id;
                return (
                    <div
                        key={map.id}
                        onClick={() => onSelectMap(map)}
                        className={`group relative cursor-pointer rounded-xl border bg-white p-space-md shadow-xs transition-all ${
                            isSelected
                                ? 'border-secondary border-l-4 border-l-secondary ring-2 ring-secondary/20'
                                : 'border-slate-200/80 hover:border-secondary/60'
                        }`}
                    >
                        <div className="mb-1 flex items-start justify-between gap-space-xs">
                            <div className="flex items-center gap-space-xs">
                                <span
                                    className={`h-2.5 w-2.5 rounded-full ${
                                        map.is_active
                                            ? 'bg-emerald-500 ring-4 ring-emerald-100'
                                            : 'bg-slate-300'
                                    }`}
                                />
                                <h3 className="font-headline-sm text-sm font-bold tracking-tight text-on-surface">
                                    {map.name}
                                </h3>
                            </div>
                            <div className="flex items-center gap-1">
                                {map.is_active && (
                                    <span className="rounded bg-emerald-600 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white shadow-2xs">
                                        ACTIVE
                                    </span>
                                )}
                                <span
                                    className={`rounded px-1.5 py-0.5 font-label-sm text-[9px] font-bold ${
                                        map.raw_pgm_path
                                            ? 'bg-sky-100 text-sky-800'
                                            : 'bg-surface-container-high text-tertiary'
                                    }`}
                                >
                                    {map.raw_pgm_path ? 'ROS2 PGM' : 'SYNTHETIC'}
                                </span>
                            </div>
                        </div>

                        <p className="mb-2 truncate font-mono text-[10px] text-tertiary">
                            {map.raw_pgm_path ?? map.image_path}
                        </p>

                        {/* Thumbnail Preview */}
                        <div className="relative mb-2 flex h-24 w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-1">
                            {map.image_url ? (
                                <img
                                    src={map.image_url}
                                    alt={map.name}
                                    className="h-full w-full object-contain"
                                    style={{ imageRendering: 'pixelated' }}
                                />
                            ) : (
                                <svg
                                    className="h-full w-full opacity-75"
                                    fill="none"
                                    viewBox="0 0 160 80"
                                >
                                    <path
                                        d="M 10 10 H 150 V 70 H 130 V 45 H 100 V 70 H 25 V 50 H 10 Z"
                                        fill="none"
                                        stroke="#1D4ED8"
                                        strokeWidth="2"
                                    />
                                    <rect fill="#BAE6FD" fillOpacity="0.6" height="18" stroke="#00A3FF" strokeWidth="1" width="45" x="25" y="20" />
                                    <rect fill="#BAE6FD" fillOpacity="0.6" height="18" stroke="#00A3FF" strokeWidth="1" width="50" x="85" y="20" />
                                </svg>
                            )}
                            <span className="absolute right-2 bottom-1 rounded bg-slate-900/75 px-1.5 py-0.5 font-mono text-[9px] text-white">
                                {map.width_px && map.height_px
                                    ? `${map.width_px}×${map.height_px}px`
                                    : 'Blueprint'}
                            </span>
                        </div>

                        {/* Metadata Grid */}
                        <div className="mb-2 grid grid-cols-2 gap-1 rounded-lg bg-surface-container-low p-2 font-mono text-[10px] text-on-surface-variant">
                            <div>
                                <span className="text-tertiary">Res:</span>{' '}
                                <strong>{map.resolution}m</strong>
                            </div>
                            <div>
                                <span className="text-tertiary">Origin:</span>{' '}
                                <strong>[{map.origin_x}, {map.origin_y}]</strong>
                            </div>
                            <div>
                                <span className="text-tertiary">Stations:</span>{' '}
                                <strong>{map.waypoints_count ?? map.waypoints?.length ?? 0} WPs</strong>
                            </div>
                            <div>
                                <span className="text-tertiary">Paths:</span>{' '}
                                <strong>{map.pathplans_count ?? map.pathplans?.length ?? 0} Lanes</strong>
                            </div>
                        </div>

                        <div
                            className="flex items-center justify-between border-t border-slate-100 pt-1.5 font-label-sm text-label-sm"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] text-tertiary">
                                    ID #{map.id}
                                </span>
                                {map.is_active ? (
                                    <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                        Active
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={(e) => onActivateMap(map, e)}
                                        className="inline-flex cursor-pointer items-center gap-1 rounded bg-primary/10 px-2 py-0.5 font-mono text-[9px] font-bold text-primary transition hover:bg-primary hover:text-white"
                                        title="Set as Active Map for Fleet & Nav2"
                                    >
                                        <span className="material-symbols-outlined text-[12px]">
                                            check_circle
                                        </span>
                                        <span>Set Active</span>
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => onExportZip(map)}
                                    className="cursor-pointer rounded p-1 text-primary hover:bg-surface-container-high"
                                    title="Export ROS 2 .zip Package"
                                >
                                    <span className="material-symbols-outlined text-[16px]">
                                        folder_zip
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDownloadYaml(map)}
                                    className="cursor-pointer rounded p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                                    title="Download .yaml Metadata"
                                >
                                    <span className="material-symbols-outlined text-[16px]">
                                        file_download
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onEditMap(map)}
                                    className="cursor-pointer rounded p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
                                    title="Edit Calibration Parameters"
                                >
                                    <span className="material-symbols-outlined text-[16px]">
                                        tune
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDeleteMap(map)}
                                    className="cursor-pointer rounded p-1 text-on-surface-variant hover:bg-error-container hover:text-error"
                                    title="Delete Map"
                                >
                                    <span className="material-symbols-outlined text-[16px]">
                                        delete
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
