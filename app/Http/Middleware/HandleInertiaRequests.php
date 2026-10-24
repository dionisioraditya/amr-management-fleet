<?php

namespace App\Http\Middleware;

use App\Models\Mission;
use App\Models\SystemLog;
use App\Models\Vehicle;
use App\Models\VehicleLog;
use App\Models\Waypoint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'telemetryShell' => fn () => $this->resolveTelemetryShellData(),
        ];
    }

    /**
     * Resolve global fleet summary for the Cybernetic Telemetry TopBar.
     *
     * @return array<string, mixed>
     */
    protected function resolveTelemetryShellData(): array
    {
        try {
            if (! Schema::hasTable('vehicles')) {
                return [
                    'onlineCount' => 0,
                    'totalVehicles' => 0,
                    'emergencyActive' => false,
                    'rosMasterStatus' => 'OK',
                    'latencyMs' => 12,
                    'notifications' => [],
                    'searchItems' => [],
                ];
            }

            $vehicles = Vehicle::select(['id', 'name', 'status', 'ip_address', 'battery_percentage'])->get();
            $emergencyActive = $vehicles->contains(fn ($v) => $v->status === 'emergency_stop');
            $onlineCount = $vehicles->filter(fn ($v) => $v->status !== 'offline')->count();

            $recentVehicleLogs = VehicleLog::latest('created_at')
                ->limit(4)
                ->get()
                ->map(fn ($log) => [
                    'id' => 'v-' . $log->id,
                    'title' => "[{$log->vehicle_id}] {$log->event}",
                    'level' => $log->level,
                    'time' => $log->created_at?->diffForHumans() ?? 'just now',
                ]);

            $recentSystemLogs = SystemLog::latest('created_at')
                ->limit(3)
                ->get()
                ->map(fn ($log) => [
                    'id' => 's-' . $log->id,
                    'title' => "[SYS] {$log->action}",
                    'level' => $log->level,
                    'time' => $log->created_at?->diffForHumans() ?? 'just now',
                ]);

            $waypoints = Schema::hasTable('waypoints')
                ? Waypoint::select(['id', 'name', 'x', 'y'])->limit(20)->get()
                : collect();

            $missions = Schema::hasTable('missions')
                ? Mission::select(['id', 'name', 'status', 'vehicle_id'])->latest()->limit(10)->get()
                : collect();

            $searchItems = collect()
                ->merge($vehicles->map(fn ($v) => [
                    'type' => 'vehicle',
                    'id' => $v->id,
                    'label' => "{$v->id} — {$v->name}",
                    'sublabel' => "IP: {$v->ip_address} | SOC: {$v->battery_percentage}% | " . strtoupper($v->status),
                    'href' => '/robots',
                ]))
                ->merge($waypoints->map(fn ($w) => [
                    'type' => 'station',
                    'id' => (string) $w->id,
                    'label' => "Station {$w->name}",
                    'sublabel' => sprintf('Coord [X: %.2f, Y: %.2f]', $w->x, $w->y),
                    'href' => '/stations',
                ]))
                ->merge($missions->map(fn ($m) => [
                    'type' => 'mission',
                    'id' => (string) $m->id,
                    'label' => $m->name,
                    'sublabel' => 'Assigned: ' . ($m->vehicle_id ?? 'Unassigned') . ' | ' . strtoupper($m->status),
                    'href' => '/dashboard',
                ]))
                ->values()
                ->all();

            return [
                'onlineCount' => $onlineCount,
                'totalVehicles' => $vehicles->count(),
                'emergencyActive' => $emergencyActive,
                'rosMasterStatus' => $emergencyActive ? 'HALTED' : 'OK',
                'latencyMs' => 12,
                'notifications' => $recentVehicleLogs->concat($recentSystemLogs)->take(6)->values()->all(),
                'searchItems' => $searchItems,
            ];
        } catch (\Throwable) {
            return [
                'onlineCount' => 0,
                'totalVehicles' => 0,
                'emergencyActive' => false,
                'rosMasterStatus' => 'OK',
                'latencyMs' => 12,
                'notifications' => [],
                'searchItems' => [],
            ];
        }
    }
}
