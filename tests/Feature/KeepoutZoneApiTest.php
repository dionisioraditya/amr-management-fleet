<?php

use App\Models\KeepoutZone;
use App\Models\Map;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('it can create, update, list, and delete keepout polygon zones and rasterize nav2 costmap masks', function () {
    Storage::fake('public');

    $map = Map::create([
        'name' => 'Test Warehouse Hall',
        'image_path' => 'maps/test.png',
        'resolution' => 0.05,
        'origin_x' => 0.0,
        'origin_y' => 0.0,
        'origin_yaw' => 0.0,
        'width_px' => 400,
        'height_px' => 300,
    ]);

    // 1. Create a 4m x 3m rectangular Keep-Out Zone (Expected Area = 12.0 m^2)
    $storeResponse = $this->postJson("/api/maps/{$map->id}/keepout-zones", [
        'name' => 'FORKLIFT-CHARGING-BAY',
        'zone_type' => 'keep_out',
        'color' => '#dc2626',
        'is_active' => true,
        'coordinates' => [
            ['x' => 2.0, 'y' => 2.0],
            ['x' => 6.0, 'y' => 2.0],
            ['x' => 6.0, 'y' => 5.0],
            ['x' => 2.0, 'y' => 5.0],
        ],
        'description' => 'Restricted heavy forklift charging perimeter',
    ]);

    $storeResponse->assertCreated()
        ->assertJsonPath('data.name', 'FORKLIFT-CHARGING-BAY')
        ->assertJsonPath('data.zone_type', 'keep_out')
        ->assertJsonPath('data.area_m2', 12);

    $zoneId = $storeResponse->json('data.id');
    expect($zoneId)->not->toBeNull();

    // Verify Nav2 costmap filter mask PNG & YAML were generated in storage
    Storage::disk('public')->assertExists("maps/map_{$map->id}/keepout_zones.png");
    Storage::disk('public')->assertExists("maps/map_{$map->id}/keepout_mask.yaml");

    // 2. List zones for the map
    $listResponse = $this->getJson("/api/maps/{$map->id}/keepout-zones");
    $listResponse->assertSuccessful()
        ->assertJsonCount(1, 'data');

    // 3. Update the zone to a Speed-Limit Zone (0.45 m/s) with 4m x 4m (16.0 m^2)
    $updateResponse = $this->putJson("/api/keepout-zones/{$zoneId}", [
        'zone_type' => 'speed_limit',
        'speed_limit' => 0.45,
        'coordinates' => [
            ['x' => 2.0, 'y' => 2.0],
            ['x' => 6.0, 'y' => 2.0],
            ['x' => 6.0, 'y' => 6.0],
            ['x' => 2.0, 'y' => 6.0],
        ],
    ]);

    $updateResponse->assertSuccessful()
        ->assertJsonPath('data.zone_type', 'speed_limit')
        ->assertJsonPath('data.speed_limit', 0.45)
        ->assertJsonPath('data.area_m2', 16);

    // 4. Delete the zone
    $deleteResponse = $this->deleteJson("/api/keepout-zones/{$zoneId}");
    $deleteResponse->assertSuccessful();

    expect(KeepoutZone::find($zoneId))->toBeNull();
});
