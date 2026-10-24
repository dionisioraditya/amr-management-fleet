<?php

namespace Database\Seeders;

use App\Models\Map;
use App\Models\Mission;
use App\Models\MissionItem;
use App\Models\Pathplan;
use App\Models\SystemLog;
use App\Models\Vehicle;
use App\Models\VehicleLog;
use App\Models\VehiclePose;
use App\Models\Waypoint;
use Illuminate\Database\Seeder;

class AmrFleetSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Map
        $map = Map::updateOrCreate(
            ['name' => 'Main Logistics Hall'],
            [
                'image_path' => 'maps/main_logistics_hall.png',
                'resolution' => 0.0500,
                'origin_x' => -10.0000,
                'origin_y' => -10.0000,
            ]
        );

        // 2. Waypoints
        $wpCharge1 = Waypoint::updateOrCreate(
            ['map_id' => $map->id, 'name' => 'ST-CHARGE-01'],
            ['x' => 2.5000, 'y' => 3.0000, 'theta' => 0.0000]
        );

        $wpCharge2 = Waypoint::updateOrCreate(
            ['map_id' => $map->id, 'name' => 'ST-CHARGE-02'],
            ['x' => 2.5000, 'y' => 5.0000, 'theta' => 0.0000]
        );

        $wpPickA = Waypoint::updateOrCreate(
            ['map_id' => $map->id, 'name' => 'PICK-BAY-A'],
            ['x' => 12.0000, 'y' => 8.5000, 'theta' => 1.5708]
        );

        $wpDropB = Waypoint::updateOrCreate(
            ['map_id' => $map->id, 'name' => 'DROP-BAY-B'],
            ['x' => 18.5000, 'y' => 14.0000, 'theta' => 3.1415]
        );

        $wpStandby = Waypoint::updateOrCreate(
            ['map_id' => $map->id, 'name' => 'STANDBY-01'],
            ['x' => 6.0000, 'y' => 10.0000, 'theta' => -1.5708]
        );

        $wpInspect = Waypoint::updateOrCreate(
            ['map_id' => $map->id, 'name' => 'INSPECTION-01'],
            ['x' => 15.0000, 'y' => 4.0000, 'theta' => 0.0000]
        );

        // 3. Pathplans
        Pathplan::updateOrCreate(
            ['map_id' => $map->id, 'name' => 'Main Aisle Corridor'],
            [
                'is_bidirectional' => true,
                'max_speed' => 1.20,
                'coordinates' => [
                    ['x' => 2.5, 'y' => 3.0],
                    ['x' => 6.0, 'y' => 3.0],
                    ['x' => 12.0, 'y' => 3.0],
                    ['x' => 18.5, 'y' => 3.0],
                    ['x' => 18.5, 'y' => 14.0],
                ],
                'description' => 'Main spine transit corridor connecting charging bays to drop zones.',
            ]
        );

        Pathplan::updateOrCreate(
            ['map_id' => $map->id, 'name' => 'Assembly Spur Lane'],
            [
                'is_bidirectional' => false,
                'max_speed' => 0.80,
                'coordinates' => [
                    ['x' => 12.0, 'y' => 3.0],
                    ['x' => 12.0, 'y' => 8.5],
                ],
                'description' => 'Dedicated feeder spur lane for material pickup in Assembly Zone A.',
            ]
        );

        // 4. Vehicles
        $vehicle1 = Vehicle::updateOrCreate(
            ['id' => 'AMR-01'],
            [
                'name' => 'Titan Runner 01',
                'ip_address' => '10.32.254.195',
                'status' => 'moving',
                'battery_percentage' => 88,
            ]
        );

        VehiclePose::updateOrCreate(
            ['vehicle_id' => $vehicle1->id],
            [
                'x' => 8.4200,
                'y' => 5.1200,
                'theta' => 0.7854,
            ]
        );

        $vehicle2 = Vehicle::updateOrCreate(
            ['id' => 'AMR-02'],
            [
                'name' => 'Echo Scout 02',
                'ip_address' => '10.32.254.196',
                'status' => 'charging',
                'battery_percentage' => 42,
            ]
        );

        VehiclePose::updateOrCreate(
            ['vehicle_id' => $vehicle2->id],
            [
                'x' => 2.5000,
                'y' => 5.0000,
                'theta' => 0.0000,
            ]
        );

        // 5. Missions
        $mission = Mission::updateOrCreate(
            ['name' => 'Pallet Transfer: Assembly to Packaging'],
            [
                'vehicle_id' => $vehicle1->id,
                'schedule' => now(),
                'priority' => 'high',
                'status' => 'in_progress',
            ]
        );

        MissionItem::updateOrCreate(
            ['mission_id' => $mission->id, 'waypoint_id' => $wpPickA->id],
            [
                'order_index' => 0,
                'status' => 'reached',
                'schedule' => now()->subMinutes(10),
            ]
        );

        MissionItem::updateOrCreate(
            ['mission_id' => $mission->id, 'waypoint_id' => $wpInspect->id],
            [
                'order_index' => 1,
                'status' => 'in_progress',
                'schedule' => now()->subMinutes(2),
            ]
        );

        MissionItem::updateOrCreate(
            ['mission_id' => $mission->id, 'waypoint_id' => $wpDropB->id],
            [
                'order_index' => 2,
                'status' => 'pending',
                'schedule' => now()->addMinutes(15),
            ]
        );

        // 6. Logs
        VehicleLog::create([
            'vehicle_id' => $vehicle1->id,
            'event' => 'Waypoint PICK-BAY-A reached. Payload engaged.',
            'level' => 'info',
            'payload' => ['pallet_id' => 'PL-9021', 'weight_kg' => 240],
            'created_at' => now()->subMinutes(10),
        ]);

        VehicleLog::create([
            'vehicle_id' => $vehicle1->id,
            'event' => 'Transit speed adjusted to 1.1 m/s along Main Corridor.',
            'level' => 'info',
            'payload' => ['current_speed' => 1.1, 'target_speed' => 1.2],
            'created_at' => now()->subMinutes(5),
        ]);

        VehicleLog::create([
            'vehicle_id' => $vehicle2->id,
            'event' => 'Docked into ST-CHARGE-02. Charging initiated at 48V / 25A.',
            'level' => 'info',
            'payload' => ['bay' => 'ST-CHARGE-02', 'charge_rate_kw' => 1.2],
            'created_at' => now()->subMinutes(25),
        ]);

        SystemLog::create([
            'action' => 'Fleet Manager Core Engine Initialized',
            'level' => 'info',
            'context' => ['version' => 'v4.2', 'active_robots' => 2, 'active_map' => 'Main Logistics Hall'],
            'created_at' => now()->subHours(1),
        ]);

        SystemLog::create([
            'action' => 'Nav2 Costmap Synchronized with Main Logistics Hall',
            'level' => 'info',
            'context' => ['resolution' => 0.05, 'layers' => ['obstacle_layer', 'inflation_layer']],
            'created_at' => now()->subMinutes(45),
        ]);
    }
}
