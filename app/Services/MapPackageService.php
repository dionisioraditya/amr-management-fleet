<?php

namespace App\Services;

use App\Models\Map;
use App\Models\Waypoint;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;
use Symfony\Component\Yaml\Yaml;
use ZipArchive;

class MapPackageService
{
    /**
     * Extract and process a ROS 2 Nav2 / SLAM Toolbox .zip map package.
     *
     * @return array{map: Map, imported_waypoints: int, has_keepout: bool, has_slam_graph: bool}
     */
    public function importZipPackage(UploadedFile|string $zipSource, ?string $customName = null): array
    {
        $zipPath = $zipSource instanceof UploadedFile ? $zipSource->getRealPath() : $zipSource;

        if (! $zipPath || ! file_exists($zipPath)) {
            throw new InvalidArgumentException('File paket .zip tidak ditemukan.');
        }

        $tempDir = sys_get_temp_dir().'/ros2_map_'.uniqid();
        File::makeDirectory($tempDir, 0755, true);

        try {
            $zip = new ZipArchive;
            if ($zip->open($zipPath) !== true) {
                throw new InvalidArgumentException('Gagal membuka arsip .zip. Pastikan file tidak rusak.');
            }

            $zip->extractTo($tempDir);
            $zip->close();

            return $this->processExtractedDirectory($tempDir, $customName, $zipSource instanceof UploadedFile ? pathinfo($zipSource->getClientOriginalName(), PATHINFO_FILENAME) : basename($zipPath, '.zip'));
        } finally {
            File::deleteDirectory($tempDir);
        }
    }

    /**
     * Process an extracted directory of ROS 2 map files.
     *
     * @return array{map: Map, imported_waypoints: int, has_keepout: bool, has_slam_graph: bool}
     */
    public function processExtractedDirectory(string $dir, ?string $customName = null, string $fallbackName = 'ROS2 Facility Map'): array
    {
        $allFiles = collect(File::allFiles($dir))->filter(function (\SplFileInfo $file) {
            $rel = $file->getRelativePathname();

            return ! str_starts_with($file->getFilename(), '.') && ! str_contains($rel, '__MACOSX');
        });

        $mapYamlFile = null;
        $stationsYamlFile = null;
        $pgmFile = null;
        $keepoutFile = null;
        $posegraphFile = null;
        $dataFile = null;
        $pngFallbackFile = null;

        foreach ($allFiles as $file) {
            $ext = strtolower($file->getExtension());
            $nameLower = strtolower($file->getFilename());

            if (in_array($ext, ['yaml', 'yml'], true)) {
                $parsed = $this->safeParseYaml($file->getRealPath());
                if (is_array($parsed)) {
                    if (isset($parsed['resolution']) || isset($parsed['image']) || isset($parsed['origin'])) {
                        $mapYamlFile = $file;
                    } elseif (isset($parsed['stations']) || isset($parsed['waypoints']) || str_contains($nameLower, 'station') || str_contains($nameLower, 'waypoint')) {
                        $stationsYamlFile = $file;
                    }
                }
            } elseif ($ext === 'pgm') {
                if (str_contains($nameLower, 'keepout')) {
                    $keepoutFile = $file;
                } else {
                    $pgmFile = $file;
                }
            } elseif ($ext === 'png') {
                if (str_contains($nameLower, 'keepout')) {
                    $keepoutFile = $file;
                } else {
                    $pngFallbackFile = $file;
                }
            } elseif ($ext === 'posegraph') {
                $posegraphFile = $file;
            } elseif ($ext === 'data') {
                $dataFile = $file;
            }
        }

        $rasterFile = $pgmFile ?? $pngFallbackFile;

        if (! $rasterFile && ! $mapYamlFile) {
            throw new InvalidArgumentException('Paket .zip harus berisi minimal file peta .pgm (dan/atau .yaml standar ROS 2 Nav2 map_saver).');
        }

        // Parse YAML metadata
        $yamlData = $mapYamlFile ? ($this->safeParseYaml($mapYamlFile->getRealPath()) ?? []) : [];

        // If YAML specifies an image file name and we haven't matched the exact PGM yet, try matching by filename
        if (! empty($yamlData['image']) && $mapYamlFile) {
            $expectedImageName = basename((string) $yamlData['image']);
            $matched = $allFiles->first(fn (\SplFileInfo $f) => strtolower($f->getFilename()) === strtolower($expectedImageName));
            if ($matched) {
                $rasterFile = $matched;
            }
        }

        if (! $rasterFile) {
            throw new InvalidArgumentException('File gambar occupancy grid (.pgm / .png) tidak ditemukan di dalam arsip .zip.');
        }

        $resolution = isset($yamlData['resolution']) ? (float) $yamlData['resolution'] : 0.05;
        $origin = is_array($yamlData['origin'] ?? null) ? $yamlData['origin'] : [0.0, 0.0, 0.0];
        $originX = isset($origin[0]) ? (float) $origin[0] : 0.0;
        $originY = isset($origin[1]) ? (float) $origin[1] : 0.0;
        $originYaw = isset($origin[2]) && ! is_nan((float) $origin[2]) ? (float) $origin[2] : 0.0;
        $occupiedThresh = isset($yamlData['occupied_thresh']) ? (float) $yamlData['occupied_thresh'] : 0.65;
        $freeThresh = isset($yamlData['free_thresh']) ? (float) $yamlData['free_thresh'] : 0.25;
        $negate = ! empty($yamlData['negate']);

        $baseName = trim($customName ?: '');
        if ($baseName === '') {
            $rawBase = pathinfo($rasterFile->getFilename(), PATHINFO_FILENAME);
            $rawBase = preg_replace('/_save$/i', '', $rawBase) ?: $fallbackName;
            $baseName = Str::headline($rawBase);
        }

        $slug = Str::slug($baseName).'_'. substr(md5(uniqid((string) mt_rand(), true)), 0, 8);
        $storageDir = 'maps/'.$slug;

        // Convert PGM (or copy PNG) to lossless PNG and extract exact pixel dimensions
        $pngStoragePath = $storageDir.'/map.png';
        $pngAbsoluteDest = Storage::disk('public')->path($pngStoragePath);
        File::ensureDirectoryExists(dirname($pngAbsoluteDest));

        [$widthPx, $heightPx] = $this->convertRasterToPng($rasterFile->getRealPath(), $pngAbsoluteDest);

        // Save original PGM if available
        $rawPgmStoragePath = null;
        if (strtolower($rasterFile->getExtension()) === 'pgm') {
            $rawPgmStoragePath = $storageDir.'/'.basename($rasterFile->getFilename());
            Storage::disk('public')->put($rawPgmStoragePath, File::get($rasterFile->getRealPath()));
        }

        // Save original or generated YAML
        $rawYamlStoragePath = $storageDir.'/map.yaml';
        if ($mapYamlFile) {
            Storage::disk('public')->put($rawYamlStoragePath, File::get($mapYamlFile->getRealPath()));
        } else {
            $generatedYaml = Yaml::dump([
                'image' => $rawPgmStoragePath ? basename($rawPgmStoragePath) : 'map.png',
                'mode' => 'trinary',
                'resolution' => $resolution,
                'origin' => [$originX, $originY, $originYaw],
                'negate' => $negate ? 1 : 0,
                'occupied_thresh' => $occupiedThresh,
                'free_thresh' => $freeThresh,
            ]);
            Storage::disk('public')->put($rawYamlStoragePath, $generatedYaml);
        }

        // Save optional keepout mask as PNG
        $keepoutStoragePath = null;
        if ($keepoutFile) {
            $keepoutStoragePath = $storageDir.'/keepout_zones.png';
            $keepoutDest = Storage::disk('public')->path($keepoutStoragePath);
            $this->convertRasterToPng($keepoutFile->getRealPath(), $keepoutDest);
        }

        // Save optional SLAM Toolbox posegraph & data
        $posegraphStoragePath = null;
        if ($posegraphFile) {
            $posegraphStoragePath = $storageDir.'/'.basename($posegraphFile->getFilename());
            Storage::disk('public')->put($posegraphStoragePath, File::get($posegraphFile->getRealPath()));
        }

        $dataStoragePath = null;
        if ($dataFile) {
            $dataStoragePath = $storageDir.'/'.basename($dataFile->getFilename());
            Storage::disk('public')->put($dataStoragePath, File::get($dataFile->getRealPath()));
        }

        $map = Map::create([
            'name' => $baseName,
            'image_path' => $pngStoragePath,
            'width_px' => $widthPx,
            'height_px' => $heightPx,
            'resolution' => $resolution,
            'origin_x' => $originX,
            'origin_y' => $originY,
            'origin_yaw' => $originYaw,
            'occupied_thresh' => $occupiedThresh,
            'free_thresh' => $freeThresh,
            'negate' => $negate,
            'raw_pgm_path' => $rawPgmStoragePath,
            'raw_yaml_path' => $rawYamlStoragePath,
            'keepout_path' => $keepoutStoragePath,
            'posegraph_path' => $posegraphStoragePath,
            'data_path' => $dataStoragePath,
        ]);

        $importedWaypointsCount = 0;
        if ($stationsYamlFile) {
            $importedWaypointsCount = $this->importStationsFromYaml($map, $stationsYamlFile->getRealPath());
        }

        $map->load(['waypoints', 'pathplans']);
        $map->loadCount(['waypoints', 'pathplans']);

        return [
            'map' => $map,
            'imported_waypoints' => $importedWaypointsCount,
            'has_keepout' => $keepoutStoragePath !== null,
            'has_slam_graph' => $posegraphStoragePath !== null || $dataStoragePath !== null,
        ];
    }

    /**
     * Convert a PGM (P5/P2) or PNG file into a 1:1 lossless PNG file and return [width, height].
     *
     * @return array{0: int, 1: int}
     */
    public function convertRasterToPng(string $sourcePath, string $destPngPath): array
    {
        if (extension_loaded('imagick')) {
            $imagick = new \Imagick($sourcePath);
            $width = $imagick->getImageWidth();
            $height = $imagick->getImageHeight();
            $imagick->setImageFormat('png');
            $imagick->writeImage($destPngPath);
            $imagick->clear();
            $imagick->destroy();

            return [$width, $height];
        }

        // Pure PHP fallback for P5 / P2 PGM or PNG via GD
        $ext = strtolower(pathinfo($sourcePath, PATHINFO_EXTENSION));
        if ($ext === 'png') {
            copy($sourcePath, $destPngPath);
            $info = getimagesize($destPngPath);

            return [$info[0] ?? 400, $info[1] ?? 400];
        }

        return $this->convertPgmWithGd($sourcePath, $destPngPath);
    }

    /**
     * Pure-PHP P5/P2 PGM parser and PNG writer using GD.
     *
     * @return array{0: int, 1: int}
     */
    protected function convertPgmWithGd(string $sourcePath, string $destPngPath): array
    {
        $fp = fopen($sourcePath, 'rb');
        if (! $fp) {
            throw new RuntimeException('Gagal membaca file PGM.');
        }

        $readToken = function () use ($fp): string {
            $token = '';
            while (! feof($fp)) {
                $ch = fgetc($fp);
                if ($ch === false) {
                    break;
                }
                if ($ch === '#') {
                    fgets($fp);

                    continue;
                }
                if (ctype_space($ch)) {
                    if ($token !== '') {
                        break;
                    }

                    continue;
                }
                $token .= $ch;
            }

            return $token;
        };

        $magic = $readToken();
        $width = (int) $readToken();
        $height = (int) $readToken();
        $maxVal = max(1, (int) $readToken());

        if ($width <= 0 || $height <= 0) {
            fclose($fp);
            throw new RuntimeException('Dimensi PGM tidak valid.');
        }

        $im = imagecreatetruecolor($width, $height);
        $palette = [];
        for ($i = 0; $i <= 255; $i++) {
            $palette[$i] = imagecolorallocate($im, $i, $i, $i);
        }

        if ($magic === 'P5') {
            $rawBytes = fread($fp, $width * $height);
            $idx = 0;
            $len = strlen($rawBytes ?: '');
            for ($y = 0; $y < $height; $y++) {
                for ($x = 0; $x < $width; $x++) {
                    $val = $idx < $len ? ord($rawBytes[$idx++]) : 205;
                    if ($maxVal !== 255) {
                        $val = (int) round(($val / $maxVal) * 255);
                    }
                    imagesetpixel($im, $x, $y, $palette[min(255, max(0, $val))]);
                }
            }
        } else {
            for ($y = 0; $y < $height; $y++) {
                for ($x = 0; $x < $width; $x++) {
                    $tok = $readToken();
                    $val = $tok !== '' ? (int) $tok : 205;
                    if ($maxVal !== 255) {
                        $val = (int) round(($val / $maxVal) * 255);
                    }
                    imagesetpixel($im, $x, $y, $palette[min(255, max(0, $val))]);
                }
            }
        }

        fclose($fp);
        imagepng($im, $destPngPath, 0);
        imagedestroy($im);

        return [$width, $height];
    }

    /**
     * Import stations/waypoints from a ROS 2 YAML file (supports both amr-akti `stations:` and agv_ws `waypoints:` schemas).
     */
    public function importStationsFromYaml(Map $map, string $yamlFilePath): int
    {
        $parsed = $this->safeParseYaml($yamlFilePath);
        if (! is_array($parsed)) {
            return 0;
        }

        $entries = $parsed['stations'] ?? $parsed['waypoints'] ?? [];
        if (! is_array($entries)) {
            return 0;
        }

        $count = 0;
        foreach ($entries as $stationName => $coords) {
            if (! is_array($coords) || (! isset($coords['x']) && ! isset($coords['y']))) {
                continue;
            }

            $x = (float) ($coords['x'] ?? 0.0);
            $y = (float) ($coords['y'] ?? 0.0);
            $theta = 0.0;

            if (isset($coords['yaw'])) {
                $theta = (float) $coords['yaw'];
            } elseif (isset($coords['theta'])) {
                $theta = (float) $coords['theta'];
            } elseif (isset($coords['yaw_deg'])) {
                $theta = deg2rad((float) $coords['yaw_deg']);
            } elseif (isset($coords['qz'], $coords['qw'])) {
                $qz = (float) $coords['qz'];
                $qw = (float) $coords['qw'];
                $theta = atan2(2.0 * ($qw * $qz), 1.0 - 2.0 * ($qz * $qz));
            }

            Waypoint::updateOrCreate(
                [
                    'map_id' => $map->id,
                    'name' => (string) $stationName,
                ],
                [
                    'x' => round($x, 4),
                    'y' => round($y, 4),
                    'theta' => round($theta, 4),
                ]
            );
            $count++;
        }

        return $count;
    }

    /**
     * Build a complete downloadable ROS 2 .zip bundle for a Map.
     */
    public function exportZipPackage(Map $map): string
    {
        $map->loadMissing(['waypoints', 'pathplans']);
        $slug = Str::slug($map->name ?: 'ros2_map');
        $tempZipPath = sys_get_temp_dir().'/'.$slug.'_'.uniqid().'.zip';

        $zip = new ZipArchive;
        if ($zip->open($tempZipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Gagal membuat arsip .zip untuk ekspor peta.');
        }

        $pgmFileName = $slug.'.pgm';
        if ($map->raw_pgm_path && Storage::disk('public')->exists($map->raw_pgm_path)) {
            $zip->addFile(Storage::disk('public')->path($map->raw_pgm_path), $pgmFileName);
        } elseif ($map->image_path && Storage::disk('public')->exists($map->image_path)) {
            $pngPath = Storage::disk('public')->path($map->image_path);
            if (extension_loaded('imagick')) {
                $tempPgm = sys_get_temp_dir().'/'.$pgmFileName;
                $im = new \Imagick($pngPath);
                $im->setImageFormat('pgm');
                $im->writeImage($tempPgm);
                $im->clear();
                $im->destroy();
                $zip->addFile($tempPgm, $pgmFileName);
            } else {
                $pgmFileName = $slug.'.png';
                $zip->addFile($pngPath, $pgmFileName);
            }
        }

        // Standard Nav2 YAML
        $nav2Yaml = Yaml::dump([
            'image' => $pgmFileName,
            'mode' => 'trinary',
            'resolution' => (float) $map->resolution,
            'origin' => [(float) $map->origin_x, (float) $map->origin_y, (float) ($map->origin_yaw ?? 0.0)],
            'negate' => $map->negate ? 1 : 0,
            'occupied_thresh' => (float) ($map->occupied_thresh ?? 0.65),
            'free_thresh' => (float) ($map->free_thresh ?? 0.25),
        ]);
        $zip->addFromString($slug.'.yaml', $nav2Yaml);

        // Optional Keepout PNG
        if ($map->keepout_path && Storage::disk('public')->exists($map->keepout_path)) {
            $zip->addFile(Storage::disk('public')->path($map->keepout_path), 'keepout_zones.png');
        }

        // Optional SLAM Toolbox posegraph & data
        if ($map->posegraph_path && Storage::disk('public')->exists($map->posegraph_path)) {
            $zip->addFile(Storage::disk('public')->path($map->posegraph_path), $slug.'_serial.posegraph');
        }
        if ($map->data_path && Storage::disk('public')->exists($map->data_path)) {
            $zip->addFile(Storage::disk('public')->path($map->data_path), $slug.'_serial.data');
        }

        // Export stations.yaml (amr-akti format) & waypoints.yaml (agv_ws format)
        if ($map->waypoints->isNotEmpty()) {
            $stationsArr = [];
            $waypointsArr = [];

            foreach ($map->waypoints as $wp) {
                $yaw = (float) $wp->theta;
                $stationsArr[$wp->name] = [
                    'x' => (float) $wp->x,
                    'y' => (float) $wp->y,
                    'yaw' => round($yaw, 4),
                    'description' => 'Exported from AMR FMS Map Studio',
                ];

                $waypointsArr[$wp->name] = [
                    'x' => (float) $wp->x,
                    'y' => (float) $wp->y,
                    'z' => 0.0,
                    'qx' => 0.0,
                    'qy' => 0.0,
                    'qz' => round(sin($yaw / 2.0), 6),
                    'qw' => round(cos($yaw / 2.0), 6),
                    'yaw_deg' => round(rad2deg($yaw), 2),
                ];
            }

            $zip->addFromString('stations.yaml', Yaml::dump(['stations' => $stationsArr], 4, 2));
            $zip->addFromString('waypoints.yaml', Yaml::dump(['waypoints' => $waypointsArr], 4, 2));
        }

        $zip->close();

        return $tempZipPath;
    }

    /**
     * Safely parse a YAML file, sanitizing `.nan` / `nan` tokens produced by map_saver_cli if any.
     *
     * @return array<string, mixed>|null
     */
    protected function safeParseYaml(string $filePath): ?array
    {
        $raw = File::get($filePath);
        // Handle non-standard YAML `nan` inside arrays like `[-14.5, -1.58, nan]`
        $sanitized = preg_replace('/(?<=,|\s)nan(?=\]|\s|$)/i', '0.0', $raw) ?? $raw;

        try {
            $parsed = Yaml::parse($sanitized);

            return is_array($parsed) ? $parsed : null;
        } catch (\Throwable) {
            return null;
        }
    }
}
