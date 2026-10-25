<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMapRequest;
use App\Http\Requests\UploadMapPackageRequest;
use App\Models\Map;
use App\Models\SystemLog;
use App\Services\MapPackageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class MapController extends Controller
{
    public function __construct(
        protected MapPackageService $mapPackageService
    ) {}

    /**
     * Display a listing of maps.
     */
    public function index(): JsonResponse
    {
        $relations = ['waypoints', 'pathplans'];
        if (\Illuminate\Support\Facades\Schema::hasTable('keepout_zones')) {
            $relations[] = 'keepoutZones';
        }

        $maps = Map::with($relations)
            ->withCount($relations)
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => $maps,
        ]);
    }

    /**
     * Upload and process a ROS 2 Nav2 / SLAM Toolbox .zip map package.
     */
    public function uploadPackage(UploadMapPackageRequest $request): JsonResponse
    {
        try {
            $result = $this->mapPackageService->importZipPackage(
                $request->file('package'),
                $request->input('name')
            );

            $map = $result['map'];

            SystemLog::create([
                'action' => "Imported ROS 2 map package '{$map->name}' ({$map->width_px}x{$map->height_px}px @ {$map->resolution}m)",
                'level' => 'info',
                'context' => [
                    'map_id' => $map->id,
                    'resolution' => $map->resolution,
                    'origin' => [$map->origin_x, $map->origin_y, $map->origin_yaw],
                    'imported_waypoints' => $result['imported_waypoints'],
                    'has_keepout' => $result['has_keepout'],
                    'has_slam_graph' => $result['has_slam_graph'],
                ],
            ]);

            return response()->json([
                'success' => true,
                'message' => "ROS 2 map package '{$map->name}' extracted and calibrated.",
                'data' => $map,
                'meta' => [
                    'imported_waypoints' => $result['imported_waypoints'],
                    'has_keepout' => $result['has_keepout'],
                    'has_slam_graph' => $result['has_slam_graph'],
                ],
            ], 201);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Export a Map and its calibration / waypoints as a ROS 2 Nav2 .zip package.
     */
    public function exportPackage(Map $map): BinaryFileResponse
    {
        $zipPath = $this->mapPackageService->exportZipPackage($map);
        $downloadName = str($map->name)->slug('_')->append('_ros2_package.zip')->toString();

        return response()->download($zipPath, $downloadName)->deleteFileAfterSend(true);
    }

    /**
     * Store a newly created map (supports .zip package, image file, or manual calibration).
     */
    public function store(StoreMapRequest $request): JsonResponse
    {
        if ($request->hasFile('package')) {
            try {
                $result = $this->mapPackageService->importZipPackage(
                    $request->file('package'),
                    $request->input('name')
                );
                $map = $result['map'];

                SystemLog::create([
                    'action' => "Created facility map '{$map->name}' from ROS 2 .zip package",
                    'level' => 'info',
                    'context' => ['map_id' => $map->id, 'resolution' => $map->resolution],
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Map created successfully from ROS 2 package.',
                    'data' => $map,
                ], 201);
            } catch (InvalidArgumentException $e) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], 422);
            }
        }

        $data = $request->validated();

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('maps', 'public');
            $data['image_path'] = $path;
            $abs = Storage::disk('public')->path($path);
            $size = @getimagesize($abs);
            if ($size) {
                $data['width_px'] = $size[0];
                $data['height_px'] = $size[1];
            }
        }

        $map = Map::create($data);

        SystemLog::create([
            'action' => "Created new facility map '{$map->name}'",
            'level' => 'info',
            'context' => ['map_id' => $map->id, 'resolution' => $map->resolution],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Map created successfully.',
            'data' => $map,
        ], 201);
    }

    /**
     * Display the specified map with waypoints and paths.
     */
    public function show(Map $map): JsonResponse
    {
        $map->load(['waypoints', 'pathplans']);

        return response()->json([
            'success' => true,
            'data' => $map,
        ]);
    }

    /**
     * Update the specified map.
     */
    public function update(Request $request, Map $map): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'image' => ['nullable', 'file', 'image', 'max:10240'],
            'image_path' => ['sometimes', 'required_without:image', 'string', 'max:255'],
            'resolution' => ['sometimes', 'numeric', 'min:0.001'],
            'origin_x' => ['sometimes', 'numeric'],
            'origin_y' => ['sometimes', 'numeric'],
            'origin_yaw' => ['sometimes', 'numeric'],
            'occupied_thresh' => ['sometimes', 'numeric'],
            'free_thresh' => ['sometimes', 'numeric'],
            'negate' => ['sometimes', 'boolean'],
        ]);

        if ($request->hasFile('image')) {
            if ($map->image_path && Storage::disk('public')->exists($map->image_path)) {
                Storage::disk('public')->delete($map->image_path);
            }
            $validated['image_path'] = $request->file('image')->store('maps', 'public');
        }

        $map->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Map updated successfully.',
            'data' => $map->fresh(['waypoints', 'pathplans']),
        ]);
    }

    /**
     * Activate the specified map as the primary facility map for Nav2 and fleet operations.
     */
    public function activate(Map $map): JsonResponse
    {
        Map::query()->update(['is_active' => false]);
        $map->update(['is_active' => true]);

        SystemLog::create([
            'action' => "Activated facility map '{$map->name}' (ID #{$map->id}) as primary Nav2 active map",
            'level' => 'info',
            'context' => [
                'map_id' => $map->id,
                'resolution' => $map->resolution,
                'origin' => [$map->origin_x, $map->origin_y, $map->origin_yaw ?? 0],
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => "Map '{$map->name}' is now active.",
            'data' => $map->fresh(['waypoints', 'pathplans', 'keepoutZones']),
        ]);
    }

    /**
     * Remove the specified map.
     */
    public function destroy(Map $map): JsonResponse
    {
        $mapName = $map->name;

        foreach (['image_path', 'raw_pgm_path', 'raw_yaml_path', 'keepout_path', 'posegraph_path', 'data_path'] as $col) {
            if ($map->{$col} && Storage::disk('public')->exists($map->{$col})) {
                Storage::disk('public')->delete($map->{$col});
            }
        }

        $map->delete();

        SystemLog::create([
            'action' => "Deleted facility map '{$mapName}'",
            'level' => 'warning',
            'context' => ['map_id' => $map->id],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Map deleted successfully.',
        ]);
    }
}
