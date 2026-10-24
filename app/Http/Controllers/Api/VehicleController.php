<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreVehicleRequest;
use App\Http\Requests\UpdateTelemetryRequest;
use App\Http\Requests\UpdateVehicleRequest;
use App\Models\SystemLog;
use App\Models\Vehicle;
use App\Models\VehicleLog;
use App\Models\VehiclePose;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VehicleController extends Controller
{
    /**
     * Display a listing of vehicles with their latest pose.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Vehicle::with(['pose']);

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        $vehicles = $query->orderBy('id')->get();

        return response()->json([
            'success' => true,
            'data' => $vehicles,
        ]);
    }

    /**
     * Store a newly created vehicle.
     */
    public function store(StoreVehicleRequest $request): JsonResponse
    {
        $vehicle = Vehicle::create($request->validated());

        // Initialize default vehicle pose
        $vehicle->pose()->create([
            'x' => 0.0,
            'y' => 0.0,
            'theta' => 0.0,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Vehicle registered successfully.',
            'data' => $vehicle->load('pose'),
        ], 201);
    }

    /**
     * Display the specified vehicle.
     */
    public function show(Vehicle $vehicle): JsonResponse
    {
        $vehicle->load([
            'pose',
            'missions' => fn ($q) => $q->latest()->limit(5),
            'logs' => fn ($q) => $q->latest('created_at')->limit(10),
        ]);

        return response()->json([
            'success' => true,
            'data' => $vehicle,
        ]);
    }

    /**
     * Update the specified vehicle.
     */
    public function update(UpdateVehicleRequest $request, Vehicle $vehicle): JsonResponse
    {
        $vehicle->update($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Vehicle updated successfully.',
            'data' => $vehicle->load('pose'),
        ]);
    }

    /**
     * Remove the specified vehicle.
     */
    public function destroy(Vehicle $vehicle): JsonResponse
    {
        $vehicle->delete();

        return response()->json([
            'success' => true,
            'message' => 'Vehicle deleted successfully.',
        ]);
    }

    /**
     * Fast update for vehicle telemetry pose, battery, and status.
     */
    public function telemetry(UpdateTelemetryRequest $request, Vehicle $vehicle): JsonResponse
    {
        $validated = $request->validated();

        // Update or create pose
        $pose = VehiclePose::updateOrCreate(
            ['vehicle_id' => $vehicle->id],
            [
                'x' => $validated['x'],
                'y' => $validated['y'],
                'theta' => $validated['theta'],
            ]
        );

        $vehicleUpdates = [];
        if (isset($validated['status']) && $validated['status'] !== $vehicle->status) {
            $vehicleUpdates['status'] = $validated['status'];
            // Log status transition
            VehicleLog::create([
                'vehicle_id' => $vehicle->id,
                'event' => "Status changed from '{$vehicle->status}' to '{$validated['status']}'",
                'level' => in_array($validated['status'], ['error', 'emergency_stop']) ? 'critical' : 'info',
                'payload' => ['previous_status' => $vehicle->status, 'new_status' => $validated['status']],
            ]);
        }

        if (isset($validated['battery_percentage'])) {
            $vehicleUpdates['battery_percentage'] = $validated['battery_percentage'];
        }

        if (!empty($vehicleUpdates)) {
            $vehicle->update($vehicleUpdates);
        }

        if (!empty($validated['event'])) {
            VehicleLog::create([
                'vehicle_id' => $vehicle->id,
                'event' => $validated['event'],
                'level' => 'info',
                'payload' => ['x' => $pose->x, 'y' => $pose->y, 'theta' => $pose->theta],
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'vehicle_id' => $vehicle->id,
                'status' => $vehicle->status,
                'battery_percentage' => $vehicle->battery_percentage,
                'pose' => $pose,
            ],
        ]);
    }

    /**
     * Trigger or release global Emergency Stop (E-STOP) across the entire fleet.
     */
    public function emergencyStop(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'action' => ['nullable', 'string', 'in:engage,release'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $action = $validated['action'] ?? 'engage';
        $targetStatus = $action === 'release' ? 'idle' : 'emergency_stop';
        $reason = $validated['reason'] ?? ($action === 'release' ? 'Operator released fleet E-STOP' : 'Operator triggered Global Emergency Stop');

        $vehicles = Vehicle::all();
        foreach ($vehicles as $vehicle) {
            $vehicle->update(['status' => $targetStatus]);

            VehicleLog::create([
                'vehicle_id' => $vehicle->id,
                'event' => $action === 'release'
                    ? 'Global E-STOP released. Vehicle returned to standby.'
                    : "GLOBAL E-STOP ENGAGED: {$reason}",
                'level' => $action === 'release' ? 'info' : 'critical',
                'payload' => ['action' => $action, 'reason' => $reason],
            ]);
        }

        SystemLog::create([
            'action' => $action === 'release'
                ? 'Fleet-wide Emergency Stop Released'
                : 'FLEET-WIDE EMERGENCY STOP (E-STOP) ENGAGED',
            'level' => $action === 'release' ? 'warning' : 'critical',
            'context' => [
                'affected_vehicles' => $vehicles->count(),
                'reason' => $reason,
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => $action === 'release'
                ? 'Emergency stop released across all vehicles.'
                : 'Emergency stop engaged across all vehicles.',
            'data' => [
                'action' => $action,
                'status' => $targetStatus,
                'affected_vehicles' => $vehicles->count(),
            ],
        ]);
    }
}
