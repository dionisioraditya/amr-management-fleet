<?php

use App\Http\Controllers\FleetDashboardController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [FleetDashboardController::class, 'liveMap'])->name('dashboard');
    Route::get('stations', [FleetDashboardController::class, 'stations'])->name('stations');
    Route::get('robots', [FleetDashboardController::class, 'robots'])->name('robots');
    Route::get('path-planning', [FleetDashboardController::class, 'pathPlanning'])->name('path-planning');
    Route::get('map-studio', [FleetDashboardController::class, 'mapStudio'])->name('map-studio');
    Route::get('event-logs', [FleetDashboardController::class, 'eventLogs'])->name('event-logs');
});

require __DIR__.'/settings.php';
