<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemLog;
use App\Models\VehicleLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LogController extends Controller
{
    /**
     * Display a listing of vehicle logs.
     */
    public function vehicles(Request $request): JsonResponse
    {
        $query = VehicleLog::with('vehicle')->latest('created_at');

        if ($request->filled('vehicle_id')) {
            $query->where('vehicle_id', $request->query('vehicle_id'));
        }

        if ($request->filled('level')) {
            $query->where('level', $request->query('level'));
        }

        if ($request->filled('since')) {
            $query->where('created_at', '>=', $request->query('since'));
        }

        $logs = $query->paginate($request->integer('per_page', 25));

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }

    /**
     * Display a listing of system logs.
     */
    public function system(Request $request): JsonResponse
    {
        $query = SystemLog::latest('created_at');

        if ($request->filled('level')) {
            $query->where('level', $request->query('level'));
        }

        if ($request->filled('since')) {
            $query->where('created_at', '>=', $request->query('since'));
        }

        $logs = $query->paginate($request->integer('per_page', 25));

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }

    /**
     * Store a newly created system log entry.
     */
    public function storeSystem(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'action' => ['required', 'string', 'max:255'],
            'level' => ['nullable', 'string', 'in:info,warning,error,critical'],
            'context' => ['nullable', 'array'],
        ]);

        $log = SystemLog::create([
            'action' => $validated['action'],
            'level' => $validated['level'] ?? 'info',
            'context' => $validated['context'] ?? null,
            'created_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $log,
        ], 201);
    }
}
