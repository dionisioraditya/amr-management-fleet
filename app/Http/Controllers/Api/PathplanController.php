<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePathplanRequest;
use App\Models\Map;
use App\Models\Pathplan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PathplanController extends Controller
{
    /**
     * Display a listing of pathplans for a given map.
     */
    public function index(Map $map): JsonResponse
    {
        $pathplans = $map->pathplans()->latest()->get();

        return response()->json([
            'success' => true,
            'data' => $pathplans,
        ]);
    }

    /**
     * Store a newly created pathplan on a map.
     */
    public function store(StorePathplanRequest $request, Map $map): JsonResponse
    {
        $pathplan = $map->pathplans()->create($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Pathplan created successfully.',
            'data' => $pathplan,
        ], 201);
    }

    /**
     * Update the specified pathplan.
     */
    public function update(Request $request, Pathplan $pathplan): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'is_bidirectional' => ['sometimes', 'boolean'],
            'max_speed' => ['sometimes', 'numeric', 'min:0.1', 'max:5.0'],
            'coordinates' => ['sometimes', 'array', 'min:2'],
            'coordinates.*.x' => ['required_with:coordinates', 'numeric'],
            'coordinates.*.y' => ['required_with:coordinates', 'numeric'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $pathplan->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Pathplan updated successfully.',
            'data' => $pathplan,
        ]);
    }

    /**
     * Remove the specified pathplan.
     */
    public function destroy(Pathplan $pathplan): JsonResponse
    {
        $pathplan->delete();

        return response()->json([
            'success' => true,
            'message' => 'Pathplan deleted successfully.',
        ]);
    }
}
