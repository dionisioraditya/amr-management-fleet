<?php

namespace App\Http\Controllers;

use App\Models\Map;
use App\Models\Mission;
use App\Models\Pathplan;
use App\Models\SystemLog;
use App\Models\Vehicle;
use App\Models\VehicleLog;
use App\Models\Waypoint;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class FleetDashboardController extends Controller
{
    /**
     * 1. Live Map Dashboard (/dashboard)
     */
    public function liveMap(): Response
    {
        $maps = Schema::hasTable('maps')
            ? Map::with(['waypoints', 'pathplans'])->latest()->get()
            : collect();

        $vehicles = Schema::hasTable('vehicles')
            ? Vehicle::with(['pose'])->orderBy('id')->get()
            : collect();

        $missions = Schema::hasTable('missions')
            ? Mission::with(['vehicle', 'items.waypoint'])->latest()->limit(10)->get()
            : collect();

        return Inertia::render('dashboard', [
            'maps' => $maps,
            'activeMap' => $maps->first(),
            'vehicles' => $vehicles,
            'missions' => $missions,
        ]);
    }

    /**
     * 2. Station Management (/stations)
     */
    public function stations(): Response
    {
        $maps = Schema::hasTable('maps') ? Map::with(['waypoints'])->latest()->get() : collect();
        $activeMap = $maps->first();
        $waypoints = $activeMap ? $activeMap->waypoints : (Schema::hasTable('waypoints') ? Waypoint::orderBy('name')->get() : collect());

        return Inertia::render('fleet/stations', [
            'maps' => $maps,
            'activeMap' => $activeMap,
            'waypoints' => $waypoints,
        ]);
    }

    /**
     * 3. Robot Fleet Management (/robots)
     */
    public function robots(): Response
    {
        $maps = Schema::hasTable('maps')
            ? Map::with(['waypoints', 'pathplans'])->latest()->get()
            : collect();

        $vehicles = Schema::hasTable('vehicles')
            ? Vehicle::with(['pose', 'missions' => fn ($q) => $q->with('items.waypoint')->latest()->limit(3)])->orderBy('id')->get()
            : collect();

        return Inertia::render('fleet/robots', [
            'activeMap' => $maps->first(),
            'vehicles' => $vehicles,
        ]);
    }

    /**
     * 4. Path Planning Management (/path-planning)
     */
    public function pathPlanning(): Response
    {
        $maps = Schema::hasTable('maps') ? Map::with(['waypoints', 'pathplans'])->latest()->get() : collect();
        $activeMap = $maps->first();
        $pathplans = $activeMap ? $activeMap->pathplans : (Schema::hasTable('pathplans') ? Pathplan::latest()->get() : collect());

        return Inertia::render('fleet/path-planning', [
            'maps' => $maps,
            'activeMap' => $activeMap,
            'pathplans' => $pathplans,
        ]);
    }

    /**
     * 5. Map Management & Redraw Studio (/map-studio)
     */
    public function mapStudio(): Response
    {
        $maps = Schema::hasTable('maps')
            ? Map::withCount(['waypoints', 'pathplans'])->with(['waypoints', 'pathplans'])->latest()->get()
            : collect();

        return Inertia::render('fleet/map-studio', [
            'maps' => $maps,
            'activeMap' => $maps->first(),
        ]);
    }

    /**
     * 6. Activity & Event Logs (/event-logs)
     */
    public function eventLogs(): Response
    {
        $vehicles = Schema::hasTable('vehicles')
            ? Vehicle::orderBy('id')->get()
            : collect();

        $vehicleLogs = Schema::hasTable('vehicle_logs')
            ? VehicleLog::with('vehicle')->latest('created_at')->limit(100)->get()
            : collect();

        $systemLogs = Schema::hasTable('system_logs')
            ? SystemLog::latest('created_at')->limit(100)->get()
            : collect();

        return Inertia::render('fleet/event-logs', [
            'vehicles' => $vehicles,
            'vehicleLogs' => $vehicleLogs,
            'systemLogs' => $systemLogs,
        ]);
    }
}
