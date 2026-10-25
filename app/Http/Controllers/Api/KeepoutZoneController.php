<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KeepoutZone;
use App\Models\Map;
use App\Models\SystemLog;
use App\Services\MapPackageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KeepoutZoneController extends Controller
{
    /**
     * Display a listing of keep-out zones for a given map.
     */
    public function index(Map $map): JsonResponse
    {
        $zones = $map->keepoutZones()->latest()->get();

        return response()->json([
            'success' => true,
            'data' => $zones,
        ]);
    }

    /**
     * Store a newly created keep-out polygon zone on a map and rasterize the Nav2 mask.
     */
    public function store(Request $request, Map $map, MapPackageService $mapPackageService): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'type' => ['sometimes', 'string', 'in:keep_out,speed_limit,caution'],
            'zone_type' => ['sometimes', 'string', 'in:keep_out,speed_limit,caution'],
            'coordinates' => ['required', 'array', 'min:3'],
            'coordinates.*.x' => ['required', 'numeric'],
            'coordinates.*.y' => ['required', 'numeric'],
            'speed_limit' => ['nullable', 'numeric', 'min:0.05', 'max:5.0'],
            'is_active' => ['sometimes', 'boolean'],
            'color' => ['nullable', 'string', 'max:20'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $type = $validated['zone_type'] ?? $validated['type'] ?? 'keep_out';
        $defaultColor = match ($type) {
            'speed_limit' => '#f59e0b',
            'caution' => '#eab308',
            default => '#dc2626',
        };

        $zone = $map->keepoutZones()->create([
            'name' => $validated['name'],
            'type' => $type,
            'coordinates' => $validated['coordinates'],
            'speed_limit' => $validated['speed_limit'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'color' => $validated['color'] ?? $defaultColor,
            'description' => $validated['description'] ?? null,
        ]);

        $maskPath = $mapPackageService->rasterizeKeepoutMask($map);
        $map->refresh();

        SystemLog::create([
            'action' => "Nav2 Keep-Out Zone [{$zone->name}] deployed on [{$map->name}]",
            'level' => 'info',
            'context' => [
                'zone_id' => $zone->id,
                'map_id' => $map->id,
                'type' => $zone->type,
                'vertices' => count($zone->coordinates),
                'area_m2' => $zone->area_m2,
                'mask_path' => $maskPath,
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Keep-Out Zone deployed and Nav2 costmap mask rasterized.',
            'data' => $zone,
            'keepout_url' => $map->keepout_url,
            'meta' => [
                'keepout_url' => $map->keepout_url,
            ],
        ], 201);
    }

    /**
     * Update an existing keep-out zone and re-rasterize the Nav2 mask.
     */
    public function update(Request $request, KeepoutZone $keepoutZone, MapPackageService $mapPackageService): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'type' => ['sometimes', 'string', 'in:keep_out,speed_limit,caution'],
            'zone_type' => ['sometimes', 'string', 'in:keep_out,speed_limit,caution'],
            'coordinates' => ['sometimes', 'array', 'min:3'],
            'coordinates.*.x' => ['required_with:coordinates', 'numeric'],
            'coordinates.*.y' => ['required_with:coordinates', 'numeric'],
            'speed_limit' => ['nullable', 'numeric', 'min:0.05', 'max:5.0'],
            'is_active' => ['sometimes', 'boolean'],
            'color' => ['nullable', 'string', 'max:20'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        if (isset($validated['zone_type']) && ! isset($validated['type'])) {
            $validated['type'] = $validated['zone_type'];
        }
        unset($validated['zone_type']);

        if (isset($validated['type']) && ! isset($validated['color'])) {
            $validated['color'] = match ($validated['type']) {
                'speed_limit' => '#f59e0b',
                'caution' => '#eab308',
                default => '#dc2626',
            };
        }

        $keepoutZone->update($validated);

        $map = $keepoutZone->map;
        if ($map) {
            $mapPackageService->rasterizeKeepoutMask($map);
            $map->refresh();
        }

        return response()->json([
            'success' => true,
            'message' => 'Keep-Out Zone updated and Nav2 mask synchronized.',
            'data' => $keepoutZone->fresh(),
            'keepout_url' => $map?->keepout_url,
            'meta' => [
                'keepout_url' => $map?->keepout_url,
            ],
        ]);
    }

    /**
     * Delete a keep-out zone and rebuild the Nav2 mask.
     */
    public function destroy(KeepoutZone $keepoutZone, MapPackageService $mapPackageService): JsonResponse
    {
        $map = $keepoutZone->map;
        $zoneName = $keepoutZone->name;
        $keepoutZone->delete();

        if ($map) {
            $mapPackageService->rasterizeKeepoutMask($map);
            $map->refresh();
        }

        SystemLog::create([
            'action' => "Nav2 Keep-Out Zone [{$zoneName}] removed",
            'level' => 'warning',
            'context' => [
                'map_id' => $map?->id,
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Keep-Out Zone deleted successfully.',
            'keepout_url' => $map?->keepout_url,
        ]);
    }

    /**
     * Explicitly rasterize and rebuild `keepout_zones.png` & `keepout_mask.yaml` for a map.
     */
    public function rasterize(Map $map, MapPackageService $mapPackageService): JsonResponse
    {
        $maskPath = $mapPackageService->rasterizeKeepoutMask($map);
        $map->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Nav2 Keep-Out Costmap Filter mask rasterized.',
            'keepout_path' => $maskPath,
            'keepout_url' => $map->keepout_url,
        ]);
    }
}
