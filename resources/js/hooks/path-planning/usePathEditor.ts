import { useState } from 'react';
import { toast } from 'sonner';
import {
    type AngleConstraintMode,
    calculatePathLength,
    computeFilletedPathGeometry,
} from '@/components/fleet/interactive-blueprint-canvas';
import { usePathPersistence } from '@/hooks/path-planning/usePathPersistence';
import type { PathCoordinate, Pathplan } from '@/types';

interface UsePathEditorOptions {
    pathplans: Pathplan[];
    currentMapId: number;
    onStartNewPath?: () => void;
}

export function usePathEditor({
    pathplans,
    currentMapId,
    onStartNewPath,
}: UsePathEditorOptions) {
    const [selectedPath, setSelectedPath] = useState<Pathplan | null>(pathplans[0] ?? null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [editingPathId, setEditingPathId] = useState<number | null>(pathplans[0]?.id ?? null);
    const [curveMode, setCurveMode] = useState<'fillet' | 'linear'>('fillet');
    const [angleConstraintMode, setAngleConstraintMode] = useState<AngleConstraintMode>('ortho-45');
    const [cornerRadius, setCornerRadius] = useState<number>(pathplans[0]?.coordinates?.[1]?.r ?? 0.8);
    const [flowFilter, setFlowFilter] = useState<'all' | 'bi' | 'uni'>('all');

    // Form states
    const [formName, setFormName] = useState(pathplans[0]?.name ?? 'PATH-ALPHA-01');
    const [formDescription, setFormDescription] = useState(pathplans[0]?.description ?? 'Main Logistics Inbound Highway');
    const [formBidirectional, setFormBidirectional] = useState(pathplans[0]?.is_bidirectional ?? true);
    const [formMaxSpeed, setFormMaxSpeed] = useState(pathplans[0]?.max_speed ?? 1.2);
    const [inflationCorridor, setInflationCorridor] = useState(0.6);
    const [draftCoords, setDraftCoords] = useState<PathCoordinate[]>(pathplans[0]?.coordinates ?? []);

    const effectiveCornerRadius = curveMode === 'linear' ? 0 : cornerRadius;

    const selectExistingPath = (path: Pathplan) => {
        setSelectedPath(path);
        setIsDrawing(false);
        setEditingPathId(path.id);
        setFormName(path.name);
        setFormDescription(path.description ?? '');
        setFormBidirectional(path.is_bidirectional);
        setFormMaxSpeed(path.max_speed);
        const coords = path.coordinates ?? [];
        setDraftCoords(coords);
        const existingRadius = coords.find(
            (pt, idx) =>
                idx > 0 && idx < coords.length - 1 && pt.r !== undefined,
        )?.r;
        if (existingRadius !== undefined) {
            setCornerRadius(existingRadius);
            setCurveMode(existingRadius <= 0.01 ? 'linear' : 'fillet');
        }
    };

    const persistence = usePathPersistence({
        currentMapId,
        onSaved: (savedPath) => {
            setIsDrawing(false);
            setSelectedPath(savedPath);
            setEditingPathId(savedPath.id);
        },
        onDeleted: (deletedId) => {
            if (selectedPath?.id === deletedId) {
                const next = pathplans.find((p) => p.id !== deletedId) ?? null;
                if (next) selectExistingPath(next);
                else setSelectedPath(null);
            }
        },
    });

    const startNewPathMode = () => {
        onStartNewPath?.();
        setIsDrawing(true);
        setEditingPathId(null);
        setSelectedPath(null);
        setFormName(`PATH-CORRIDOR-0${pathplans.length + 1}`);
        setFormDescription('Autonomous AMR virtual guidance lane');
        setFormBidirectional(true);
        setFormMaxSpeed(1.2);
        setDraftCoords([]);
        toast.info(
            'Guidance Pen Active: Click anywhere on the map or click a station to place WP-1 (Start node).',
        );
    };

    const startEditPathMode = (path: Pathplan) => {
        selectExistingPath(path);
        setIsDrawing(true);
        toast.info(
            `Editing ${path.name}. Drag existing vertices or click map to append segments.`,
        );
    };

    const handleAddPathPoint = (coord: PathCoordinate) => {
        const activeR = curveMode === 'linear' ? 0 : cornerRadius;
        setDraftCoords((prev) => [
            ...prev,
            { x: coord.x, y: coord.y, r: coord.r ?? activeR },
        ]);
    };

    const handleUpdatePathPoint = (index: number, coord: PathCoordinate) => {
        setDraftCoords((prev) =>
            prev.map((pt, i) => (i === index ? coord : pt)),
        );
    };

    const handleRemovePathPoint = (index: number) => {
        setDraftCoords((prev) => prev.filter((_, i) => i !== index));
    };

    const handleClearAllPoints = () => {
        setDraftCoords([]);
        toast.info('Cleared all path vertices. Click anywhere on the map to place WP-1.');
    };

    const handleReverseDirection = () => {
        setDraftCoords((prev) => [...prev].reverse());
        toast.success('Reversed trajectory vertex sequence.');
    };

    const handleGlobalCornerRadiusChange = (newRadius: number) => {
        setCornerRadius(newRadius);
        if (newRadius <= 0.01) {
            setCurveMode('linear');
        } else if (curveMode === 'linear') {
            setCurveMode('fillet');
        }
        setDraftCoords((prev) =>
            prev.map((pt) => ({ ...pt, r: newRadius })),
        );
    };

    const handleUndoLastPoint = () => {
        setDraftCoords((prev) => prev.slice(0, -1));
    };

    const handleClearPathSelection = () => {
        setSelectedPath(null);
        setEditingPathId(null);
        setDraftCoords([]);
    };

    const handleSavePathplan = () => {
        return persistence.savePathplan(
            {
                name: formName.trim(),
                is_bidirectional: formBidirectional,
                max_speed: Number(formMaxSpeed),
                coordinates: draftCoords,
                description: formDescription.trim() || null,
            },
            editingPathId,
        );
    };

    const handleDeletePathplan = (path: Pathplan) => {
        return persistence.deletePathplan(path);
    };

    const handleExportYaml = (path: Pathplan) => {
        persistence.exportYaml(path, effectiveCornerRadius, inflationCorridor);
    };

    const filteredPaths = pathplans.filter((p) => {
        if (flowFilter === 'bi') return p.is_bidirectional;
        if (flowFilter === 'uni') return !p.is_bidirectional;
        return true;
    });

    const totalAvgLength =
        pathplans.length > 0
            ? (
                  pathplans.reduce(
                      (acc, p) =>
                          acc +
                          calculatePathLength(
                              p.coordinates,
                              effectiveCornerRadius,
                          ),
                      0,
                  ) / pathplans.length
              ).toFixed(1)
            : '0.0';

    const activeFilletGeom = computeFilletedPathGeometry(
        draftCoords,
        effectiveCornerRadius,
    );
    const activeLength = Number(activeFilletGeom.totalLengthM.toFixed(1));

    return {
        selectedPath,
        setSelectedPath,
        isDrawing,
        setIsDrawing,
        editingPathId,
        setEditingPathId,
        curveMode,
        setCurveMode,
        angleConstraintMode,
        setAngleConstraintMode,
        cornerRadius,
        setCornerRadius,
        effectiveCornerRadius,
        flowFilter,
        setFlowFilter,
        formName,
        setFormName,
        formDescription,
        setFormDescription,
        formBidirectional,
        setFormBidirectional,
        formMaxSpeed,
        setFormMaxSpeed,
        inflationCorridor,
        setInflationCorridor,
        draftCoords,
        setDraftCoords,
        saving: persistence.saving,
        filteredPaths,
        totalAvgLength,
        activeFilletGeom,
        activeLength,
        selectExistingPath,
        startNewPathMode,
        startEditPathMode,
        handleAddPathPoint,
        handleUpdatePathPoint,
        handleRemovePathPoint,
        handleClearAllPoints,
        handleReverseDirection,
        handleGlobalCornerRadiusChange,
        handleUndoLastPoint,
        handleClearPathSelection,
        handleSavePathplan,
        handleDeletePathplan,
        handleExportYaml,
    };
}
