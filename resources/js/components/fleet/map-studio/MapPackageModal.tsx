import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { FacilityMap } from '@/types';

interface MapPackageModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingMap: FacilityMap | null;
    selectedZipFile: File | null;
    formName: string;
    onFormNameChange: (name: string) => void;
    formResolution: string;
    onFormResolutionChange: (res: string) => void;
    formOriginX: string;
    onFormOriginXChange: (x: string) => void;
    formOriginY: string;
    onFormOriginYChange: (y: string) => void;
    formOriginYaw: string;
    onFormOriginYawChange: (yaw: string) => void;
    savingMap: boolean;
    onTriggerZipSelect: () => void;
    onSubmit: (e: React.FormEvent) => void;
}

export function MapPackageModal({
    open,
    onOpenChange,
    editingMap,
    selectedZipFile,
    formName,
    onFormNameChange,
    formResolution,
    onFormResolutionChange,
    formOriginX,
    onFormOriginXChange,
    formOriginY,
    onFormOriginYChange,
    formOriginYaw,
    onFormOriginYawChange,
    savingMap,
    onTriggerZipSelect,
    onSubmit,
}: MapPackageModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 font-headline-md text-lg font-bold text-on-surface uppercase">
                        <span className="material-symbols-outlined text-[22px] text-primary">
                            {editingMap ? 'tune' : 'folder_zip'}
                        </span>
                        {editingMap
                            ? `Map Calibration: ${editingMap.name}`
                            : 'Import ROS 2 Map Package (.zip)'}
                    </DialogTitle>
                    <DialogDescription className="font-body-sm text-xs text-tertiary">
                        {editingMap
                            ? 'Adjust map identifier, resolution (m/px), and ROS 2 [X, Y, Yaw] origin datum.'
                            : 'Upload a ROS 2 map_saver_cli archive (.zip) containing .pgm and .yaml files (plus optional keepout_zones.png / stations.yaml).'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={onSubmit} className="space-y-4">
                    {!editingMap && (
                        <div>
                            <label className="mb-1.5 block font-label-sm text-xs font-bold text-on-surface uppercase">
                                Map Archive (.zip)
                            </label>
                            <div
                                onClick={onTriggerZipSelect}
                                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-surface-container-low/60 p-5 text-center transition hover:border-primary hover:bg-surface-container-low"
                            >
                                <span className="material-symbols-outlined text-[32px] text-primary">
                                    {selectedZipFile ? 'check_circle' : 'upload_file'}
                                </span>
                                {selectedZipFile ? (
                                    <div>
                                        <div className="font-mono text-xs font-bold text-on-surface">
                                            {selectedZipFile.name}
                                        </div>
                                        <div className="font-mono text-[10px] text-tertiary">
                                            {(selectedZipFile.size / 1024).toFixed(1)} KB • Click to replace .zip archive
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="font-headline-sm text-xs font-bold text-primary uppercase">
                                            Select .zip Archive
                                        </div>
                                        <div className="font-body-sm text-[11px] text-tertiary">
                                            Format: <code>.zip</code> containing <code>*.pgm</code> + <code>*.yaml</code>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="mb-1 block font-label-sm text-xs font-bold text-on-surface uppercase">
                            Map Identifier
                        </label>
                        <input
                            type="text"
                            required={Boolean(editingMap)}
                            value={formName}
                            onChange={(e) => onFormNameChange(e.target.value)}
                            placeholder="Auto-detected from archive filename if blank..."
                            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-body-sm text-xs font-semibold text-slate-900 focus:border-primary focus:outline-none"
                        />
                    </div>

                    {editingMap ? (
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                            <div className="rounded-lg border border-slate-200 bg-surface-container-low p-2">
                                <label className="block font-mono text-[10px] text-tertiary">
                                    Res (m/px)
                                </label>
                                <input
                                    type="number"
                                    step="0.005"
                                    required
                                    value={formResolution}
                                    onChange={(e) => onFormResolutionChange(e.target.value)}
                                    className="mt-1 w-full bg-transparent font-mono text-xs font-bold text-primary focus:outline-none"
                                />
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-surface-container-low p-2">
                                <label className="block font-mono text-[10px] text-tertiary">
                                    Origin X (m)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={formOriginX}
                                    onChange={(e) => onFormOriginXChange(e.target.value)}
                                    className="mt-1 w-full bg-transparent font-mono text-xs font-bold text-on-surface focus:outline-none"
                                />
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-surface-container-low p-2">
                                <label className="block font-mono text-[10px] text-tertiary">
                                    Origin Y (m)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={formOriginY}
                                    onChange={(e) => onFormOriginYChange(e.target.value)}
                                    className="mt-1 w-full bg-transparent font-mono text-xs font-bold text-on-surface focus:outline-none"
                                />
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-surface-container-low p-2">
                                <label className="block font-mono text-[10px] text-tertiary">
                                    Yaw (rad)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={formOriginYaw}
                                    onChange={(e) => onFormOriginYawChange(e.target.value)}
                                    className="mt-1 w-full bg-transparent font-mono text-xs font-bold text-on-surface focus:outline-none"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 font-body-sm text-[11px] text-slate-700">
                            <div className="mb-1 font-bold text-primary">
                                ROS 2 Nav2 Automated Package Parser:
                            </div>
                            <ul className="list-inside list-disc space-y-0.5 text-[11px]">
                                <li>Extracts <code>resolution</code> &amp; <code>origin: [x, y, yaw]</code> from <code>.yaml</code></li>
                                <li>Converts <code>.pgm</code> to lossless 1:1 <code>.png</code> raster</li>
                                <li>Auto-imports <code>keepout_zones.png</code> &amp; <code>stations.yaml</code> if bundled</li>
                            </ul>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="cursor-pointer rounded-lg bg-surface-container px-4 py-2 font-label-md text-xs font-semibold text-on-surface uppercase hover:bg-surface-container-high"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={savingMap}
                            className="cursor-pointer rounded-lg bg-primary px-5 py-2 font-label-md text-xs font-bold tracking-wider text-white uppercase shadow-md hover:bg-secondary"
                        >
                            {savingMap
                                ? 'Processing...'
                                : editingMap
                                  ? 'Save Calibration'
                                  : 'Import & Calibrate (.zip)'}
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
