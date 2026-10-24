<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreWaypointRequest;
use App\Models\Map;
use App\Models\Waypoint;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WaypointController extends Controller
{
    /**
     * Display a listing of waypoints for a given map.
     */
    public function index(Map $map): JsonResponse
    {
        $waypoints = $map->waypoints()->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $waypoints,
        ]);
    }

    /**
     * Store a newly created waypoint on a map.
     */
    public function store(StoreWaypointRequest $request, Map $map): JsonResponse
    {
        $waypoint = $map->waypoints()->create($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Waypoint created successfully.',
            'data' => $waypoint,
        ], 201);
    }

    /**
     * Update the specified waypoint.
     */
    public function update(Request $request, Waypoint $waypoint): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:50'],
            'x' => ['sometimes', 'required', 'numeric'],
            'y' => ['sometimes', 'required', 'numeric'],
            'theta' => ['sometimes', 'numeric'],
        ]);

        $waypoint->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Waypoint updated successfully.',
            'data' => $waypoint,
        ]);
    }

    /**
     * Remove the specified waypoint.
     */
    public function destroy(Waypoint $waypoint): JsonResponse
    {
        $waypoint->delete();

        return response()->json([
            'success' => true,
            'message' => 'Waypoint deleted successfully.',
        ]);
    }
}
