import { Head } from '@inertiajs/react';
import React, { useState } from 'react';
import {
    MapCatalogListCard,
    MapOriginCalibrationCard,
    MapPackageModal,
    MapStudioCanvas,
    MapStudioHeaderCard,
    MapStudioRibbon,
    MapStudioWatermark,
    MapStudioZoneBanner,
    MapStudioZoneManagerCard,
} from '@/components/fleet/map-studio';
import {
    useMapPackageModal,
    useMapStudioCatalog,
    useMapStudioKeepout,
} from '@/hooks/map-studio';
import type { FacilityMap } from '@/types';

interface MapStudioProps {
    maps: FacilityMap[];
    selectedMap?: FacilityMap;
}

export default function MapStudio({
    maps,
    selectedMap: initialSelectedMap,
}: MapStudioProps) {
    // Canvas & Layer Display States
    const [activeTool, setActiveTool] = useState<'select' | 'keepout'>('select');
    const [angleConstraintMode, setAngleConstraintMode] = useState<
        'free' | 'ortho-90' | 'ortho-45'
    >('free');
    const [showSimulation, setShowSimulation] = useState(false);
    const [snapStep, setSnapStep] = useState<number>(0.05);
    const [showKeepOut, setShowKeepOut] = useState(true);
    const [showOriginDatum, setShowOriginDatum] = useState(true);
    const [occupancyViewMode, setOccupancyViewMode] = useState<
        'blueprint' | 'raw'
    >('blueprint');

    // Keep-Out Polygon Hook
    const keepout = useMapStudioKeepout({
        currentMap: initialSelectedMap ?? maps[0] ?? null,
        onStartDraw: () => {
            setShowKeepOut(true);
            setActiveTool('keepout');
        },
    });

    // Map Catalog & Operations Hook
    const catalog = useMapStudioCatalog({
        maps,
        initialSelectedMap,
        zones: keepout.zones,
        occupancyViewMode,
    });

    // Map Calibration & Zip Package Modal Hook
    const modal = useMapPackageModal({
        onMapImported: (map) => catalog.setSelectedMap(map),
        onMapUpdated: (map) => catalog.setSelectedMap(map),
    });

    const handleSelectZoneAndTool = (zone: Parameters<typeof keepout.handleSelectZone>[0]) => {
        setActiveTool('select');
        keepout.handleSelectZone(zone);
    };

    const handleTogglePenTool = () => {
        if (activeTool === 'keepout') {
            setActiveTool('select');
        } else {
            keepout.handleStartDrawZone();
        }
    };

    return (
        <>
            <Head title="Map Management & Redraw Studio" />
            <input
                ref={modal.zipFileInputRef}
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                className="hidden"
                onChange={modal.handleZipFilePicked}
            />

            <div className="relative flex h-full w-full overflow-hidden bg-[#f8f9ff]">
                {/* 1. Full-Bleed Interactive Map Canvas Layer */}
                <MapStudioCanvas
                    currentMap={catalog.currentMap}
                    zones={keepout.zones}
                    selectedZone={keepout.selectedZone}
                    onSelectZone={handleSelectZoneAndTool}
                    onClearSelection={keepout.handleClearZoneSelection}
                    activeTool={activeTool}
                    draftZoneCoords={keepout.draftZoneCoords}
                    onAddZonePoint={keepout.handleAddZonePoint}
                    onUpdateZonePoint={keepout.handleUpdateZonePoint}
                    onCompleteZone={keepout.handleSaveZone}
                    angleConstraintMode={angleConstraintMode}
                    showSimulation={showSimulation}
                    snapStep={snapStep}
                    showKeepOut={showKeepOut}
                    showOriginDatum={showOriginDatum}
                    occupancyViewMode={occupancyViewMode}
                />

                {/* Top Studio Ribbon Controls */}
                <MapStudioRibbon
                    occupancyViewMode={occupancyViewMode}
                    onOccupancyModeChange={setOccupancyViewMode}
                    activeTool={activeTool}
                    onToggleActiveTool={handleTogglePenTool}
                    showOriginDatum={showOriginDatum}
                    onToggleOriginDatum={() => setShowOriginDatum((d) => !d)}
                    showKeepOut={showKeepOut}
                    onToggleKeepOut={() => setShowKeepOut((k) => !k)}
                    showSimulation={showSimulation}
                    onToggleSimulation={() => setShowSimulation((s) => !s)}
                    zonesCount={keepout.zones.length}
                    snapStep={snapStep}
                    onSnapStepChange={setSnapStep}
                    pushingNav2={catalog.pushingNav2}
                    onPushToNav2={catalog.handlePushToNav2}
                />

                {/* Active Keep-Out Polygon Drawing Banner */}
                {activeTool === 'keepout' && (
                    <MapStudioZoneBanner
                        verticesCount={keepout.draftZoneCoords.length}
                        currentDraftArea={keepout.currentDraftArea}
                        angleConstraintMode={angleConstraintMode}
                        onConstraintModeChange={setAngleConstraintMode}
                        onUndoVertex={() =>
                            keepout.setDraftZoneCoords((prev) => prev.slice(0, -1))
                        }
                        onCancel={() => {
                            keepout.setDraftZoneCoords([]);
                            setActiveTool('select');
                        }}
                        onSaveZone={keepout.handleSaveZone}
                        isSavingZone={keepout.isSavingZone}
                    />
                )}

                {/* Technical Calibration Watermark */}
                <MapStudioWatermark
                    currentMap={catalog.currentMap}
                    realWidthMeters={catalog.realWidthMeters}
                    realHeightMeters={catalog.realHeightMeters}
                    occupancyViewMode={occupancyViewMode}
                />

                {/* 2. Left Floating Cockpit Panel */}
                <aside className="relative z-10 flex h-full w-full max-w-[420px] flex-col overflow-y-auto border-r border-slate-200/60 bg-white/40 backdrop-blur-sm">
                    <div className="flex flex-col gap-space-md p-margin-lg">
                        <MapStudioHeaderCard
                            mapsCount={maps.length}
                            onTriggerZipSelect={modal.triggerFileManagerZipSelect}
                        />

                        {catalog.currentMap && (
                            <MapOriginCalibrationCard
                                currentMap={catalog.currentMap}
                                realWidthMeters={catalog.realWidthMeters}
                                realHeightMeters={catalog.realHeightMeters}
                                onExportZip={catalog.handleExportZipPackage}
                            />
                        )}

                        {catalog.currentMap && (
                            <MapStudioZoneManagerCard
                                zones={keepout.zones}
                                selectedZone={keepout.selectedZone}
                                activeTool={activeTool}
                                draftZoneCoords={keepout.draftZoneCoords}
                                currentDraftArea={keepout.currentDraftArea}
                                zoneName={keepout.zoneName}
                                onZoneNameChange={keepout.setZoneName}
                                zoneType={keepout.zoneType}
                                onZoneTypeChange={keepout.setZoneType}
                                zoneSpeedLimit={keepout.zoneSpeedLimit}
                                onZoneSpeedLimitChange={keepout.setZoneSpeedLimit}
                                isSavingZone={keepout.isSavingZone}
                                onToggleActiveTool={handleTogglePenTool}
                                onSelectZone={handleSelectZoneAndTool}
                                onClearZoneSelection={keepout.handleClearZoneSelection}
                                onSaveZone={keepout.handleSaveZone}
                                onDeleteZone={keepout.handleDeleteZone}
                                onToggleZoneActive={keepout.handleToggleZoneActive}
                            />
                        )}

                        <MapCatalogListCard
                            maps={maps}
                            currentMap={catalog.currentMap}
                            onSelectMap={catalog.setSelectedMap}
                            onActivateMap={catalog.handleActivateMap}
                            onExportZip={catalog.handleExportZipPackage}
                            onDownloadYaml={catalog.handleDownloadYaml}
                            onEditMap={modal.openEditMapModal}
                            onDeleteMap={catalog.handleDeleteMap}
                        />
                    </div>
                </aside>
            </div>

            {/* ROS 2 .zip Map Package Upload / Calibration Modal */}
            <MapPackageModal
                open={modal.mapModalOpen}
                onOpenChange={modal.setMapModalOpen}
                editingMap={modal.editingMap}
                selectedZipFile={modal.selectedZipFile}
                formName={modal.formName}
                onFormNameChange={modal.setFormName}
                formResolution={modal.formResolution}
                onFormResolutionChange={modal.setFormResolution}
                formOriginX={modal.formOriginX}
                onFormOriginXChange={modal.setFormOriginX}
                formOriginY={modal.formOriginY}
                onFormOriginYChange={modal.setFormOriginY}
                formOriginYaw={modal.formOriginYaw}
                onFormOriginYawChange={modal.setFormOriginYaw}
                savingMap={modal.savingMap}
                onTriggerZipSelect={() => modal.zipFileInputRef.current?.click()}
                onSubmit={
                    modal.editingMap
                        ? modal.handleSaveEditedMap
                        : modal.handleUploadZipPackage
                }
            />
        </>
    );
}
