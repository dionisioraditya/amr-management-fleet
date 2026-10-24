<?php

namespace Tests\Feature;

use App\Models\Map;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use ZipArchive;

class MapPackageUploadTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_imports_ros2_nav2_zip_package_with_pgm_yaml_keepout_and_stations(): void
    {
        Storage::fake('public');

        $tempZipPath = sys_get_temp_dir().'/test_factory_map_'.uniqid().'.zip';
        $zip = new ZipArchive;
        $zip->open($tempZipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        // 1. Create a valid P5 binary PGM (20x15 pixels)
        $width = 20;
        $height = 15;
        $pgmHeader = "P5\n{$width} {$height}\n255\n";
        $pgmBody = str_repeat(chr(254), $width * $height);
        $zip->addFromString('factory_map_baru.pgm', $pgmHeader.$pgmBody);

        // 2. Create Nav2 YAML metadata with custom origin
        $yamlContent = implode("\n", [
            'image: factory_map_baru.pgm',
            'mode: trinary',
            'resolution: 0.05',
            'origin: [-14.5, -1.58, 0.0]',
            'negate: 0',
            'occupied_thresh: 0.65',
            'free_thresh: 0.25',
        ]);
        $zip->addFromString('factory_map_baru.yaml', $yamlContent);

        // 3. Create optional keepout_zones.pgm
        $zip->addFromString('keepout_zones.pgm', $pgmHeader.$pgmBody);

        // 4. Create optional stations.yaml (amr-akti format)
        $stationsYaml = implode("\n", [
            'stations:',
            '  Home_Base:',
            '    x: 0.0',
            '    y: 0.0',
            '    yaw: 0.0',
            '  Pickup_A:',
            '    x: 12.5',
            '    y: 6.0',
            '    yaw: 1.5708',
            '  Charger_1:',
            '    x: -14.5',
            '    y: 3.0',
            '    yaw: 3.1416',
        ]);
        $zip->addFromString('stations.yaml', $stationsYaml);
        $zip->close();

        $uploadedFile = new UploadedFile(
            $tempZipPath,
            'factory_map_baru.zip',
            'application/zip',
            null,
            true
        );

        $response = $this->postJson('/api/maps/upload-package', [
            'name' => 'Factory Floor Alpha',
            'package' => $uploadedFile,
        ]);

        @unlink($tempZipPath);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Factory Floor Alpha')
            ->assertJsonPath('data.width_px', 20)
            ->assertJsonPath('data.height_px', 15)
            ->assertJsonPath('data.resolution', 0.05)
            ->assertJsonPath('data.origin_x', -14.5)
            ->assertJsonPath('data.origin_y', -1.58)
            ->assertJsonPath('meta.imported_waypoints', 3)
            ->assertJsonPath('meta.has_keepout', true);

        $mapId = $response->json('data.id');
        $map = Map::with('waypoints')->findOrFail($mapId);

        $this->assertNotNull($map->image_url);
        $this->assertNotNull($map->keepout_url);
        $this->assertCount(3, $map->waypoints);
        $this->assertDatabaseHas('waypoints', [
            'map_id' => $map->id,
            'name' => 'Pickup_A',
            'x' => 12.5,
            'y' => 6.0,
        ]);

        // Test exporting back as a ROS 2 .zip package
        $exportResponse = $this->get("/api/maps/{$map->id}/export-package");
        $exportResponse->assertOk();
    }
}
