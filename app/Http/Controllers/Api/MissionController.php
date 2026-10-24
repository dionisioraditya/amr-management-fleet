<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMissionRequest;
use App\Models\Mission;
use App\Models\SystemLog;
use App\Models\VehicleLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MissionController extends Controller
{
    /**
     * Display a listing of missions with nested items.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Mission::with(['vehicle', 'items.waypoint'])->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('vehicle_id')) {
            $query->where('vehicle_id', $request->query('vehicle_id'));
        }

        $missions = $query->paginate($request->integer('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $missions,
        ]);
    }

    /**
     * Store a newly created mission along with ordered mission items.
     */
    public function store(StoreMissionRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $mission = DB::transaction(function () use ($validated) {
            $mission = Mission::create([
                'name' => $validated['name'],
                'vehicle_id' => $validated['vehicle_id'] ?? null,
                'schedule' => $validated['schedule'] ?? now(),
                'priority' => $validated['priority'] ?? 'normal',
                'status' => 'pending',
            ]);

            foreach ($validated['items'] as $index => $itemData) {
                $mission->items()->create([
                    'waypoint_id' => $itemData['waypoint_id'],
                    'order_index' => $itemData['order_index'] ?? $index,
                    'schedule' => $itemData['schedule'] ?? null,
                    'status' => 'pending',
                ]);
            }

            return $mission;
        });

        SystemLog::create([
            'action' => "Mission '{$mission->name}' created with " . count($validated['items']) . " waypoints",
            'level' => 'info',
            'context' => ['mission_id' => $mission->id, 'vehicle_id' => $mission->vehicle_id],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Mission dispatched successfully.',
            'data' => $mission->load(['vehicle', 'items.waypoint']),
        ], 201);
    }

    /**
     * Display the specified mission.
     */
    public function show(Mission $mission): JsonResponse
    {
        $mission->load(['vehicle', 'items.waypoint']);

        return response()->json([
            'success' => true,
            'data' => $mission,
        ]);
    }

    /**
     * Update mission status (e.g. start, complete, cancel, fail).
     */
    public function updateStatus(Request $request, Mission $mission): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:pending,in_progress,completed,failed,cancelled'],
        ]);

        $oldStatus = $mission->status;
        $mission->update(['status' => $validated['status']]);

        if ($mission->vehicle_id) {
            VehicleLog::create([
                'vehicle_id' => $mission->vehicle_id,
                'event' => "Mission '{$mission->name}' status changed from '{$oldStatus}' to '{$validated['status']}'",
                'level' => in_array($validated['status'], ['failed']) ? 'error' : 'info',
                'payload' => ['mission_id' => $mission->id, 'status' => $validated['status']],
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Mission status updated.',
            'data' => $mission->load(['vehicle', 'items.waypoint']),
        ]);
    }

    /**
     * Remove the specified mission.
     */
    public function destroy(Mission $mission): JsonResponse
    {
        $mission->delete();

        return response()->json([
            'success' => true,
            'message' => 'Mission deleted successfully.',
        ]);
    }
}
