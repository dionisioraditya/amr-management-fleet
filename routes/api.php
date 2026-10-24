<?php

use App\Http\Controllers\Api\LogController;
use App\Http\Controllers\Api\MapController;
use App\Http\Controllers\Api\MissionController;
use App\Http\Controllers\Api\PathplanController;
use App\Http\Controllers\Api\VehicleController;
use App\Http\Controllers\Api\WaypointController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| AMR Fleet Management Core API Routes
|--------------------------------------------------------------------------
*/

// 1. Vehicle Fleet Management & Telemetry
Route::post('vehicles/emergency-stop', [VehicleController::class, 'emergencyStop'])->name('vehicles.emergency-stop');
Route::apiResource('vehicles', VehicleController::class);
Route::post('vehicles/{vehicle}/telemetry', [VehicleController::class, 'telemetry'])->name('vehicles.telemetry');

// 2. Maps
Route::post('maps/upload-package', [MapController::class, 'uploadPackage'])->name('maps.upload-package');
Route::get('maps/{map}/export-package', [MapController::class, 'exportPackage'])->name('maps.export-package');
Route::apiResource('maps', MapController::class);

// 3. Waypoints (nested under map for creation/list, direct for edit/delete)
Route::get('maps/{map}/waypoints', [WaypointController::class, 'index'])->name('maps.waypoints.index');
Route::post('maps/{map}/waypoints', [WaypointController::class, 'store'])->name('maps.waypoints.store');
Route::put('waypoints/{waypoint}', [WaypointController::class, 'update'])->name('waypoints.update');
Route::delete('waypoints/{waypoint}', [WaypointController::class, 'destroy'])->name('waypoints.destroy');

// 4. Path Planning & Lanes
Route::get('maps/{map}/pathplans', [PathplanController::class, 'index'])->name('maps.pathplans.index');
Route::post('maps/{map}/pathplans', [PathplanController::class, 'store'])->name('maps.pathplans.store');
Route::put('pathplans/{pathplan}', [PathplanController::class, 'update'])->name('pathplans.update');
Route::delete('pathplans/{pathplan}', [PathplanController::class, 'destroy'])->name('pathplans.destroy');

// 5. Missions & Dispatching
Route::apiResource('missions', MissionController::class);
Route::patch('missions/{mission}/status', [MissionController::class, 'updateStatus'])->name('missions.status');

// 6. Event & Audit Logs
Route::get('logs/vehicles', [LogController::class, 'vehicles'])->name('logs.vehicles');
Route::get('logs/system', [LogController::class, 'system'])->name('logs.system');
Route::post('logs/system', [LogController::class, 'storeSystem'])->name('logs.system.store');
