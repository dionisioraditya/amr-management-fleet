<?php

namespace Tests\Feature;

use App\Models\Map;
use App\Models\Mission;
use App\Models\Pathplan;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehiclePose;
use App\Models\Waypoint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AmrFleetCoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_list_vehicles(): void
    {
        $vehicle = Vehicle::create([
            'id' => 'AMR-TEST-01',
            'name' => 'Test Rover',
            'ip_address' => '192.168.1.100',
            'status' => 'idle',
            'battery_percentage' => 95,
        ]);

        $vehicle->pose()->create([
            'x' => 1.5,
            'y' => 2.5,
            'theta' => 0.0,
        ]);

        $response = $this->getJson('/api/vehicles');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonFragment(['id' => 'AMR-TEST-01', 'name' => 'Test Rover']);
    }

    public function test_can_register_new_vehicle(): void
    {
        $payload = [
            'id' => 'AMR-NEW-02',
            'name' => 'Titan 2',
            'ip_address' => '10.32.254.200',
            'status' => 'idle',
            'battery_percentage' => 100,
        ];

        $response = $this->postJson('/api/vehicles', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', 'AMR-NEW-02');

        $this->assertDatabaseHas('vehicles', ['id' => 'AMR-NEW-02']);
        $this->assertDatabaseHas('vehicle_poses', ['vehicle_id' => 'AMR-NEW-02']);
    }

    public function test_can_update_vehicle_telemetry(): void
    {
        $vehicle = Vehicle::create([
            'id' => 'AMR-01',
            'name' => 'Titan Runner',
            'ip_address' => '10.32.254.195',
            'status' => 'idle',
            'battery_percentage' => 80,
        ]);

        $telemetryData = [
            'x' => 12.4500,
            'y' => 6.7800,
            'theta' => 1.5708,
            'status' => 'moving',
            'battery_percentage' => 79,
            'event' => 'Waypoint approaching',
        ];

        $response = $this->postJson("/api/vehicles/{$vehicle->id}/telemetry", $telemetryData);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'moving')
            ->assertJsonPath('data.battery_percentage', 79)
            ->assertJsonPath('data.pose.x', 12.45);

        $this->assertDatabaseHas('vehicle_poses', [
            'vehicle_id' => 'AMR-01',
            'x' => 12.4500,
            'y' => 6.7800,
        ]);

        $this->assertDatabaseHas('vehicle_logs', [
            'vehicle_id' => 'AMR-01',
            'event' => 'Waypoint approaching',
        ]);
    }

    public function test_can_create_map_with_waypoints_and_pathplans(): void
    {
        // 1. Create Map
        $mapResponse = $this->postJson('/api/maps', [
            'name' => 'Assembly Area Alpha',
            'image_path' => 'maps/assembly_alpha.png',
            'resolution' => 0.05,
            'origin_x' => -5.0,
            'origin_y' => -5.0,
        ]);

        $mapResponse->assertStatus(201);
        $mapId = $mapResponse->json('data.id');

        // 2. Add Waypoint
        $wpResponse = $this->postJson("/api/maps/{$mapId}/waypoints", [
            'name' => 'DOCK-01',
            'x' => 4.25,
            'y' => 8.10,
            'theta' => 3.1415,
        ]);

        $wpResponse->assertStatus(201)
            ->assertJsonPath('data.name', 'DOCK-01');

        // 3. Add Pathplan
        $pathResponse = $this->postJson("/api/maps/{$mapId}/pathplans", [
            'name' => 'Transit Spur 1',
            'is_bidirectional' => true,
            'max_speed' => 1.5,
            'coordinates' => [
                ['x' => 0.0, 'y' => 0.0],
                ['x' => 4.25, 'y' => 8.10],
            ],
            'description' => 'Direct path between origin and DOCK-01',
        ]);

        $pathResponse->assertStatus(201)
            ->assertJsonPath('data.name', 'Transit Spur 1');

        $this->assertDatabaseHas('waypoints', ['name' => 'DOCK-01', 'map_id' => $mapId]);
        $this->assertDatabaseHas('pathplans', ['name' => 'Transit Spur 1', 'map_id' => $mapId]);
    }

    public function test_can_dispatch_mission_and_transition_status(): void
    {
        $vehicle = Vehicle::create([
            'id' => 'AMR-01',
            'name' => 'Titan Runner',
            'ip_address' => '10.32.254.195',
            'status' => 'idle',
        ]);

        $map = Map::create([
            'name' => 'Warehouse 1',
            'image_path' => 'maps/wh1.png',
            'resolution' => 0.05,
        ]);

        $wp1 = $map->waypoints()->create(['name' => 'WP-1', 'x' => 1.0, 'y' => 1.0]);
        $wp2 = $map->waypoints()->create(['name' => 'WP-2', 'x' => 5.0, 'y' => 5.0]);

        $missionResponse = $this->postJson('/api/missions', [
            'name' => 'Transport Batch #401',
            'vehicle_id' => $vehicle->id,
            'priority' => 'high',
            'items' => [
                ['waypoint_id' => $wp1->id, 'order_index' => 0],
                ['waypoint_id' => $wp2->id, 'order_index' => 1],
            ],
        ]);

        $missionResponse->assertStatus(201)
            ->assertJsonPath('data.name', 'Transport Batch #401')
            ->assertJsonCount(2, 'data.items');

        $missionId = $missionResponse->json('data.id');

        // Update status to in_progress
        $statusResponse = $this->patchJson("/api/missions/{$missionId}/status", [
            'status' => 'in_progress',
        ]);

        $statusResponse->assertStatus(200)
            ->assertJsonPath('data.status', 'in_progress');

        $this->assertDatabaseHas('missions', [
            'id' => $missionId,
            'status' => 'in_progress',
        ]);
    }

    public function test_can_query_logs_and_store_system_log(): void
    {
        $vehicle = Vehicle::create([
            'id' => 'AMR-01',
            'name' => 'Titan Runner',
            'ip_address' => '10.32.254.195',
        ]);

        $vehicle->logs()->create([
            'event' => 'Obstacle detected within 0.4m',
            'level' => 'warning',
            'payload' => ['distance_m' => 0.38],
            'created_at' => now(),
        ]);

        // Query vehicle logs
        $vehLogResp = $this->getJson("/api/logs/vehicles?vehicle_id={$vehicle->id}");
        $vehLogResp->assertStatus(200)
            ->assertJsonFragment(['event' => 'Obstacle detected within 0.4m']);

        // Post system log
        $sysLogResp = $this->postJson('/api/logs/system', [
            'action' => 'Operator manual override enabled',
            'level' => 'warning',
            'context' => ['user_id' => 1],
        ]);

        $sysLogResp->assertStatus(201)
            ->assertJsonPath('data.action', 'Operator manual override enabled');

        $this->assertDatabaseHas('system_logs', [
            'action' => 'Operator manual override enabled',
            'level' => 'warning',
        ]);
    }

    public function test_can_engage_and_release_global_emergency_stop(): void
    {
        Vehicle::create([
            'id' => 'AMR-01',
            'name' => 'Titan Runner',
            'ip_address' => '10.32.254.195',
            'status' => 'moving',
        ]);

        // Engage E-STOP
        $engageResp = $this->postJson('/api/vehicles/emergency-stop', [
            'action' => 'engage',
            'reason' => 'Safety test trigger',
        ]);

        $engageResp->assertStatus(200)
            ->assertJsonPath('data.status', 'emergency_stop')
            ->assertJsonPath('data.affected_vehicles', 1);

        $this->assertDatabaseHas('vehicles', [
            'id' => 'AMR-01',
            'status' => 'emergency_stop',
        ]);

        // Release E-STOP
        $releaseResp = $this->postJson('/api/vehicles/emergency-stop', [
            'action' => 'release',
        ]);

        $releaseResp->assertStatus(200)
            ->assertJsonPath('data.status', 'idle');

        $this->assertDatabaseHas('vehicles', [
            'id' => 'AMR-01',
            'status' => 'idle',
        ]);
    }

    public function test_authenticated_user_can_visit_all_six_telemetry_modules(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $routes = [
            '/dashboard',
            '/stations',
            '/robots',
            '/path-planning',
            '/map-studio',
            '/event-logs',
        ];

        foreach ($routes as $uri) {
            $this->get($uri)->assertOk();
        }
    }

    public function test_can_update_and_delete_waypoints_pathplans_and_maps(): void
    {
        $map = Map::create([
            'name' => 'Studio Test Map',
            'image_path' => 'maps/studio_test.png',
            'resolution' => 0.05,
            'origin_x' => -10.0,
            'origin_y' => -10.0,
        ]);

        // 1. Update Map
        $this->putJson("/api/maps/{$map->id}", [
            'name' => 'Studio Test Map v2',
            'resolution' => 0.025,
        ])->assertOk()
            ->assertJsonPath('data.name', 'Studio Test Map v2');

        // 2. Create, Update, and Delete Waypoint
        $wp = $map->waypoints()->create([
            'name' => 'ST-CHARGE-09',
            'x' => 5.0,
            'y' => 6.0,
            'theta' => 0.0,
        ]);

        $this->putJson("/api/waypoints/{$wp->id}", [
            'name' => 'ST-CHARGE-09-UPD',
            'x' => 7.5,
            'y' => 8.5,
            'theta' => 1.57,
        ])->assertOk()
            ->assertJsonPath('data.name', 'ST-CHARGE-09-UPD');

        $this->deleteJson("/api/waypoints/{$wp->id}")->assertOk();
        $this->assertDatabaseMissing('waypoints', ['id' => $wp->id]);

        // 3. Create, Update, and Delete Pathplan
        $path = $map->pathplans()->create([
            'name' => 'PATH-TEST-01',
            'is_bidirectional' => true,
            'max_speed' => 1.2,
            'coordinates' => [
                ['x' => 1.0, 'y' => 1.0],
                ['x' => 5.0, 'y' => 5.0],
            ],
        ]);

        $this->putJson("/api/pathplans/{$path->id}", [
            'name' => 'PATH-TEST-01-FAST',
            'is_bidirectional' => false,
            'max_speed' => 2.0,
            'coordinates' => [
                ['x' => 1.0, 'y' => 1.0],
                ['x' => 5.0, 'y' => 5.0],
                ['x' => 10.0, 'y' => 5.0],
            ],
        ])->assertOk()
            ->assertJsonPath('data.name', 'PATH-TEST-01-FAST')
            ->assertJsonPath('data.is_bidirectional', false);

        $this->deleteJson("/api/pathplans/{$path->id}")->assertOk();
        $this->assertDatabaseMissing('pathplans', ['id' => $path->id]);

        // 4. Delete Map
        $this->deleteJson("/api/maps/{$map->id}")->assertOk();
        $this->assertDatabaseMissing('maps', ['id' => $map->id]);
    }

    public function test_can_update_and_delete_vehicle_in_fleet_registry(): void
    {
        $vehicle = Vehicle::create([
            'id' => 'AMR-UPD-01',
            'name' => 'Initial Unit',
            'ip_address' => '10.32.254.198',
            'status' => 'idle',
            'battery_percentage' => 90,
        ]);

        $this->putJson("/api/vehicles/{$vehicle->id}", [
            'name' => 'Updated Heavy Carrier',
            'ip_address' => '10.32.254.199',
            'status' => 'active',
            'battery_percentage' => 85,
        ])->assertOk()
            ->assertJsonPath('data.name', 'Updated Heavy Carrier')
            ->assertJsonPath('data.status', 'active');

        $this->assertDatabaseHas('vehicles', [
            'id' => 'AMR-UPD-01',
            'name' => 'Updated Heavy Carrier',
            'ip_address' => '10.32.254.199',
        ]);

        $this->deleteJson("/api/vehicles/{$vehicle->id}")->assertOk();
        $this->assertDatabaseMissing('vehicles', ['id' => 'AMR-UPD-01']);
    }
}
