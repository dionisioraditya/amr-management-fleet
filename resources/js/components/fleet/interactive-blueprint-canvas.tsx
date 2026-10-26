import {
    computeCanvasCalibration,
    metricToSvg,
} from '@/lib/geometry';
import {
    useCanvasCursor,
    useCanvasPenHandlers,
    useCanvasViewport,
} from '@/hooks/canvas';
import {
    CanvasDraftPathLayer,
    CanvasDraftPoseLayer,
    CanvasDraftZoneLayer,
    CanvasGhostCursor,
    CanvasHudOverlay,
    CanvasKeepoutLayer,
    CanvasOccupancyLayer,
    CanvasOriginDatum,
    CanvasPathLayer,
    CanvasStationLayer,
    CanvasSvgDefs,
    CanvasVehicleLayer,
} from './canvas';
import type { InteractiveBlueprintCanvasProps } from './canvas/types';

export type { InteractiveBlueprintCanvasProps };
export type {
    AngleConstraintMode,
    CanvasCalibration,
    CornerFilletSegment,
    FilletedPathGeometry,
} from '@/lib/geometry';
export {
    applyAngleConstraint,
    calculatePathLength,
    calculatePolygonArea,
    calculatePolygonCentroid,
    computeCanvasCalibration,
    computeFilletedPathGeometry,
    discretizeFilletedPathForRos2,
    metricToSvg,
    svgToMetric,
} from '@/lib/geometry';

export function InteractiveBlueprintCanvas(props: InteractiveBlueprintCanvasProps) {
    const {
        map = null, waypoints = [], pathplans = [], keepoutZones, vehicles = [],
        selectedWaypointId = null, editingWaypointId = null, selectedPathplanId = null, selectedKeepoutZoneId = null, selectedVehicleId = null,
        onSelectWaypoint, onSelectPathplan, onSelectKeepoutZone, onSelectVehicle, onClearSelection,
        mode = 'view', onPickCoordinate, onPoseEstimate,
        draftCoordinates = [], onAddPathPoint, onUpdatePathPoint,
        draftZoneCoordinates = [], onAddZonePoint, onUpdateZonePoint, onCompleteZone,
        defaultCornerRadius = 0.8, angleConstraintMode = 'ortho-45', snapStep = 0.5,
        inflationRadius = 0.6, showCostmap = true, showSlamNoise = false,
        showKeepOutZones = true, showOriginDatum = true,
        occupancyViewMode = 'blueprint', resolution = 0.05, hudPosition = 'bottom-right',
    } = props;

    const calibration = computeCanvasCalibration(map, resolution);
    const viewport = useCanvasViewport();

    const resolvedKeepoutZones = keepoutZones ?? map?.keepout_zones ?? [];
    const activeZonesToRender =
        draftZoneCoordinates.length >= 3 && selectedKeepoutZoneId !== null && resolvedKeepoutZones.some((z) => z.id === selectedKeepoutZoneId)
            ? resolvedKeepoutZones.map((z) => (z.id === selectedKeepoutZoneId ? { ...z, coordinates: draftZoneCoordinates } : z))
            : resolvedKeepoutZones;

    const activePathsToRender =
        draftCoordinates.length > 0
            ? selectedPathplanId !== null && pathplans.some((p) => p.id === selectedPathplanId)
                ? pathplans.map((p) => (p.id === selectedPathplanId ? { ...p, coordinates: draftCoordinates } : p))
                : [...pathplans, { id: -999, map_id: map?.id ?? 1, name: 'DRAFT-PATH', is_bidirectional: true, max_speed: 1.2, coordinates: draftCoordinates }]
            : pathplans;

    const effectiveSnapStep = mode === 'pose-estimate' ? 0 : snapStep;
    const cursor = useCanvasCursor({
        calibration, snapStep: effectiveSnapStep, mode, angleConstraintMode,
        draftCoordinates, draftZoneCoordinates,
    });

    const pen = useCanvasPenHandlers({
        calibration, snapStep: effectiveSnapStep, mode, angleConstraintMode,
        draftCoordinates, draftZoneCoordinates, defaultCornerRadius,
        isPanning: viewport.isPanning, startPan: viewport.startPan, updatePan: viewport.updatePan, endPan: viewport.endPan,
        cursor, onPickCoordinate, onPoseEstimate, onAddPathPoint, onUpdatePathPoint,
        onAddZonePoint, onUpdateZonePoint, onCompleteZone, onClearSelection,
    });

    const originSvg = metricToSvg(0, 0, calibration);
    const isRawRosMode = occupancyViewMode === 'raw';

    return (
        <div
            ref={viewport.containerRef}
            className={`relative inset-0 z-0 flex h-full w-full items-center justify-center overflow-hidden select-none ${
                isRawRosMode ? 'bg-[#d4d8dd]' : 'bg-[#f8f9ff]'
            }`}
            onClick={(e) => {
                if (e.target === e.currentTarget && mode === 'view') onClearSelection?.();
            }}
        >
            <div
                className="pointer-events-none absolute inset-0 bg-surface-container-low/30"
                style={{
                    backgroundSize: '36px 36px',
                    backgroundImage: isRawRosMode
                        ? 'linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)'
                        : 'radial-gradient(#949cb5 0.9px, transparent 0.9px)',
                }}
            />

            <div
                className={`relative flex h-full max-h-[920px] w-full max-w-[1580px] items-center justify-center p-4 ${
                    viewport.isPanning ? '' : 'transition-transform duration-75 ease-out'
                }`}
                style={{
                    transform: `translate(${viewport.pan.x}px, ${viewport.pan.y}px) scale(${viewport.zoom})`,
                }}
            >
                <svg
                    ref={cursor.svgRef}
                    onMouseMove={pen.handleMouseMove}
                    onMouseDown={pen.handleMouseDown}
                    onMouseUp={pen.handleMouseUp}
                    onClick={pen.handleCanvasClick}
                    className={`h-full w-full drop-shadow-sm select-none ${
                        mode === 'pick-station' || mode === 'draw-path' || mode === 'draw-zone' || mode === 'pose-estimate'
                            ? 'cursor-crosshair'
                            : viewport.isPanning
                              ? 'cursor-grabbing'
                              : 'cursor-default'
                    }`}
                    preserveAspectRatio="xMidYMid meet"
                    viewBox="0 0 1000 620"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <CanvasSvgDefs />

                    <CanvasOccupancyLayer
                        map={map}
                        calibration={calibration}
                        isRawRosMode={isRawRosMode}
                        showCostmap={showCostmap}
                        showSlamNoise={showSlamNoise}
                        showKeepOutZones={showKeepOutZones}
                        hasActiveVectorZones={activeZonesToRender.length > 0}
                    />

                    <CanvasKeepoutLayer
                        showKeepOutZones={showKeepOutZones}
                        zones={activeZonesToRender}
                        selectedKeepoutZoneId={selectedKeepoutZoneId}
                        calibration={calibration}
                        mode={mode}
                        draggingZoneVertexIndex={cursor.draggingZoneVertexIndex}
                        onSelectKeepoutZone={onSelectKeepoutZone}
                        onUpdateZonePoint={onUpdateZonePoint}
                        setDraggingZoneVertexIndex={cursor.setDraggingZoneVertexIndex}
                    />

                    {showOriginDatum && <CanvasOriginDatum originSvg={originSvg} />}

                    <CanvasPathLayer
                        paths={activePathsToRender}
                        selectedPathplanId={selectedPathplanId}
                        defaultCornerRadius={defaultCornerRadius}
                        inflationRadius={inflationRadius}
                        calibration={calibration}
                        mode={mode}
                        draggingVertexIndex={cursor.draggingVertexIndex}
                        onSelectPathplan={onSelectPathplan}
                        onUpdatePathPoint={onUpdatePathPoint}
                        setDraggingVertexIndex={cursor.setDraggingVertexIndex}
                    />

                    <CanvasStationLayer
                        waypoints={waypoints}
                        selectedWaypointId={selectedWaypointId}
                        editingWaypointId={editingWaypointId}
                        calibration={calibration}
                        mode={mode}
                        onSelectWaypoint={onSelectWaypoint}
                        onAddPathPoint={onAddPathPoint}
                    />

                    <CanvasVehicleLayer
                        vehicles={vehicles}
                        selectedVehicleId={selectedVehicleId}
                        calibration={calibration}
                        onSelectVehicle={onSelectVehicle}
                    />

                    <CanvasDraftPathLayer
                        mode={mode}
                        draftCoordinates={draftCoordinates}
                        draggingVertexIndex={cursor.draggingVertexIndex}
                        effectiveCursorMetric={cursor.effectiveCursorMetric}
                        cursorSvg={cursor.cursorSvg}
                        calibration={calibration}
                        defaultCornerRadius={defaultCornerRadius}
                    />

                    <CanvasDraftZoneLayer
                        mode={mode}
                        draftZoneCoordinates={draftZoneCoordinates}
                        isNearFirstZoneVertex={cursor.isNearFirstZoneVertex}
                        effectiveCursorMetric={cursor.effectiveCursorMetric}
                        cursorSvg={cursor.cursorSvg}
                        calibration={calibration}
                        onCompleteZone={onCompleteZone}
                    />

                    <CanvasGhostCursor
                        mode={mode}
                        effectiveCursorMetric={cursor.effectiveCursorMetric}
                        cursorSvg={cursor.cursorSvg}
                        draftCoordinates={draftCoordinates}
                        draftZoneCoordinates={draftZoneCoordinates}
                        constrainedDraftCursor={cursor.constrainedDraftCursor}
                        defaultCornerRadius={defaultCornerRadius}
                        isNearFirstZoneVertex={cursor.isNearFirstZoneVertex}
                    />

                    <CanvasDraftPoseLayer
                        mode={mode}
                        poseEstimateOrigin={pen.poseEstimateOrigin}
                        poseEstimateCurrent={pen.poseEstimateCurrent}
                        cursorMetric={cursor.cursorMetric}
                        cursorSvg={cursor.cursorSvg}
                    />
                </svg>
            </div>

            <CanvasHudOverlay
                hudPosition={hudPosition}
                cursorMetric={cursor.cursorMetric}
                resolution={calibration.resolution}
                zoom={viewport.zoom}
                onZoomIn={viewport.zoomIn}
                onZoomOut={viewport.zoomOut}
                onResetView={viewport.resetView}
            />
        </div>
    );
}
