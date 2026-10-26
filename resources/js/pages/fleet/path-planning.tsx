import { Head } from '@inertiajs/react';
import React, { useState } from 'react';
import {
    PathCadToolbarCard,
    PathDrawingBanner,
    PathEmptyPromptCard,
    PathFooterCard,
    PathHeaderCard,
    PathInspectorCard,
    PathManifestCard,
    PathMetricsKpiCard,
    PathPlanningCanvas,
    ZoneDrawingBanner,
    ZoneInspectorCard,
} from '@/components/fleet/path-planning';
import { useKeepoutZoneEditor, usePathEditor } from '@/hooks/path-planning';
import type { FacilityMap, Pathplan } from '@/types';

interface PathPlanningProps {
    maps: FacilityMap[];
    activeMap?: FacilityMap | null;
    pathplans: Pathplan[];
}

export default function PathPlanningPage({
    maps = [],
    activeMap,
    pathplans = [],
}: PathPlanningProps) {
    const currentMapId = activeMap?.id ?? maps[0]?.id ?? 1;

    // Viewport layer display toggles
    const [snapEnabled, setSnapEnabled] = useState(true);
    const [showCostmap, setShowCostmap] = useState(true);
    const [showKeepOutZones, setShowKeepOutZones] = useState(true);

    // 1. Path Planning Trajectory & Guidance Pen Hook
    const pathEditor = usePathEditor({
        pathplans,
        currentMapId,
        onStartNewPath: () => zoneEditor.handleClearZoneSelection(),
    });

    // 2. Keep-Out Polygon Costmap Mask Hook
    const zoneEditor = useKeepoutZoneEditor({
        initialZones: activeMap?.keepout_zones ?? maps[0]?.keepout_zones ?? [],
        currentMapId,
        onStartNewZone: () => {
            pathEditor.handleClearPathSelection();
            setShowKeepOutZones(true);
        },
    });

    const handleClearSelection = () => {
        if (pathEditor.isDrawing || zoneEditor.isDrawingZone) return;
        pathEditor.handleClearPathSelection();
        zoneEditor.handleClearZoneSelection();
    };

    return (
        <>
            <Head title="Path Planning Management" />
            <div className="relative flex h-full w-full overflow-hidden bg-[#f8f9ff]">
                {/* 1. Background Interactive Map Canvas */}
                <PathPlanningCanvas
                    activeMap={activeMap}
                    pathplans={pathplans}
                    zones={zoneEditor.zones}
                    selectedPathId={pathEditor.selectedPath?.id ?? null}
                    selectedZoneId={zoneEditor.selectedZone?.id ?? null}
                    onSelectPathplan={pathEditor.selectExistingPath}
                    onSelectKeepoutZone={zoneEditor.handleSelectKeepoutZone}
                    onClearSelection={handleClearSelection}
                    isDrawing={pathEditor.isDrawing}
                    isDrawingZone={zoneEditor.isDrawingZone}
                    draftCoords={pathEditor.draftCoords}
                    onAddPathPoint={pathEditor.handleAddPathPoint}
                    onUpdatePathPoint={pathEditor.handleUpdatePathPoint}
                    draftZoneCoords={zoneEditor.draftZoneCoords}
                    onAddZonePoint={zoneEditor.handleAddZonePoint}
                    onUpdateZonePoint={zoneEditor.handleUpdateZonePoint}
                    onCompleteZone={zoneEditor.handleSaveKeepoutZone}
                    effectiveCornerRadius={pathEditor.effectiveCornerRadius}
                    angleConstraintMode={pathEditor.angleConstraintMode}
                    snapEnabled={snapEnabled}
                    setSnapEnabled={setSnapEnabled}
                    inflationCorridor={pathEditor.inflationCorridor}
                    showCostmap={showCostmap}
                    setShowCostmap={setShowCostmap}
                    showKeepOutZones={showKeepOutZones}
                    setShowKeepOutZones={setShowKeepOutZones}
                />

                {/* 2. Floating Guidance Drawing Banners */}
                <PathDrawingBanner
                    isDrawing={pathEditor.isDrawing}
                    draftCoords={pathEditor.draftCoords}
                    effectiveCornerRadius={pathEditor.effectiveCornerRadius}
                    angleConstraintMode={pathEditor.angleConstraintMode}
                    onUndoLastPoint={pathEditor.handleUndoLastPoint}
                    onClearAllPoints={pathEditor.handleClearAllPoints}
                    onFinishPen={() => pathEditor.setIsDrawing(false)}
                />

                <ZoneDrawingBanner
                    isDrawingZone={zoneEditor.isDrawingZone}
                    draftZoneCoords={zoneEditor.draftZoneCoords}
                    savingZone={zoneEditor.savingZone}
                    onUndoLastPoint={() =>
                        zoneEditor.setDraftZoneCoords((prev) => prev.slice(0, -1))
                    }
                    onCancel={() => {
                        zoneEditor.setIsDrawingZone(false);
                        zoneEditor.setDraftZoneCoords([]);
                    }}
                    onSaveZone={zoneEditor.handleSaveKeepoutZone}
                />

                {/* 3. Floating Left Cockpit Panel */}
                <aside className="relative z-10 flex h-full w-full max-w-[560px] flex-col overflow-y-auto border-r border-slate-200/60 bg-white/40 backdrop-blur-sm">
                    <div className="flex flex-col gap-space-md p-margin-lg">
                        <PathHeaderCard
                            activeMap={activeMap}
                            onStartNewZone={zoneEditor.startNewZoneMode}
                            onStartNewPath={pathEditor.startNewPathMode}
                        />

                        <PathMetricsKpiCard
                            pathplansCount={pathplans.length}
                            biDirectionalCount={
                                pathplans.filter((p) => p.is_bidirectional).length
                            }
                            totalAvgLength={pathEditor.totalAvgLength}
                            effectiveCornerRadius={pathEditor.effectiveCornerRadius}
                            curveMode={pathEditor.curveMode}
                        />

                        <PathCadToolbarCard
                            snapEnabled={snapEnabled}
                            onToggleSnap={() => setSnapEnabled((s) => !s)}
                            curveMode={pathEditor.curveMode}
                            cornerRadius={pathEditor.cornerRadius}
                            onSelectFilletCurve={() => {
                                pathEditor.setCurveMode('fillet');
                                const nextR =
                                    pathEditor.cornerRadius <= 0.01
                                        ? 0.8
                                        : pathEditor.cornerRadius;
                                pathEditor.handleGlobalCornerRadiusChange(nextR);
                            }}
                            onSelectLinearCurve={() => {
                                pathEditor.setCurveMode('linear');
                                pathEditor.setDraftCoords((prev) =>
                                    prev.map((pt) => ({ ...pt, r: 0 })),
                                );
                            }}
                            angleConstraintMode={pathEditor.angleConstraintMode}
                            onSelectAngleConstraint={(mode) => {
                                pathEditor.setAngleConstraintMode(mode);
                                if (!pathEditor.isDrawing) {
                                    pathEditor.setIsDrawing(true);
                                }
                            }}
                        />

                        {/* Active Inspector Card Conditional */}
                        {pathEditor.selectedPath ||
                        pathEditor.isDrawing ||
                        pathEditor.draftCoords.length > 0 ? (
                            <PathInspectorCard
                                formName={pathEditor.formName}
                                setFormName={pathEditor.setFormName}
                                formDescription={pathEditor.formDescription}
                                editingPathId={pathEditor.editingPathId}
                                formBidirectional={pathEditor.formBidirectional}
                                setFormBidirectional={pathEditor.setFormBidirectional}
                                draftCoords={pathEditor.draftCoords}
                                activeFilletGeom={pathEditor.activeFilletGeom}
                                activeLength={pathEditor.activeLength}
                                effectiveCornerRadius={pathEditor.effectiveCornerRadius}
                                onCornerRadiusChange={pathEditor.handleGlobalCornerRadiusChange}
                                inflationCorridor={pathEditor.inflationCorridor}
                                setInflationCorridor={pathEditor.setInflationCorridor}
                                formMaxSpeed={pathEditor.formMaxSpeed}
                                setFormMaxSpeed={pathEditor.setFormMaxSpeed}
                                isDrawing={pathEditor.isDrawing}
                                setIsDrawing={pathEditor.setIsDrawing}
                                onClearAllPoints={pathEditor.handleClearAllPoints}
                                onReverseDirection={pathEditor.handleReverseDirection}
                                onRemovePathPoint={pathEditor.handleRemovePathPoint}
                                onUndoLastPoint={pathEditor.handleUndoLastPoint}
                                onSavePathplan={pathEditor.handleSavePathplan}
                                saving={pathEditor.saving}
                            />
                        ) : zoneEditor.selectedZone || zoneEditor.isDrawingZone ? (
                            <ZoneInspectorCard
                                zoneName={zoneEditor.zoneName}
                                setZoneName={zoneEditor.setZoneName}
                                zoneType={zoneEditor.zoneType}
                                setZoneType={zoneEditor.setZoneType}
                                zoneSpeedLimit={zoneEditor.zoneSpeedLimit}
                                setZoneSpeedLimit={zoneEditor.setZoneSpeedLimit}
                                draftZoneCoords={zoneEditor.draftZoneCoords}
                                selectedZone={zoneEditor.selectedZone}
                                savingZone={zoneEditor.savingZone}
                                onCloseZone={() => {
                                    zoneEditor.setIsDrawingZone(false);
                                    zoneEditor.setSelectedZone(null);
                                    zoneEditor.setDraftZoneCoords([]);
                                }}
                                onDeleteZone={zoneEditor.handleDeleteKeepoutZone}
                                onSaveZone={zoneEditor.handleSaveKeepoutZone}
                            />
                        ) : (
                            <PathEmptyPromptCard
                                onStartNewZone={zoneEditor.startNewZoneMode}
                                onStartNewPath={pathEditor.startNewPathMode}
                            />
                        )}

                        <PathManifestCard
                            filteredPaths={pathEditor.filteredPaths}
                            selectedPath={pathEditor.selectedPath}
                            flowFilter={pathEditor.flowFilter}
                            setFlowFilter={pathEditor.setFlowFilter}
                            onSelectPath={pathEditor.selectExistingPath}
                            onStartEditPath={pathEditor.startEditPathMode}
                            onExportYaml={pathEditor.handleExportYaml}
                            onDeletePath={pathEditor.handleDeletePathplan}
                        />

                        <PathFooterCard />
                    </div>
                </aside>
            </div>
        </>
    );
}
