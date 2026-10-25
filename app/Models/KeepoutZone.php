<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KeepoutZone extends Model
{
    use HasFactory;

    protected $fillable = [
        'map_id',
        'name',
        'type',
        'coordinates',
        'speed_limit',
        'is_active',
        'color',
        'description',
    ];

    protected $appends = [
        'area_m2',
        'zone_type',
    ];

    protected function casts(): array
    {
        return [
            'coordinates' => 'array',
            'speed_limit' => 'float',
            'is_active' => 'boolean',
        ];
    }

    public function map(): BelongsTo
    {
        return $this->belongsTo(Map::class);
    }

    public function getZoneTypeAttribute(): string
    {
        return $this->type ?? 'keep_out';
    }

    /**
     * Compute the polygon area in square meters using the Shoelace formula.
     */
    public function getAreaM2Attribute(): float
    {
        return $this->computeAreaSquareMeters();
    }

    public function computeAreaSquareMeters(): float
    {
        $coords = $this->coordinates ?? [];
        $n = count($coords);
        if ($n < 3) {
            return 0.0;
        }

        $area = 0.0;
        for ($i = 0; $i < $n; $i++) {
            $j = ($i + 1) % $n;
            $xi = (float) ($coords[$i]['x'] ?? 0.0);
            $yi = (float) ($coords[$i]['y'] ?? 0.0);
            $xj = (float) ($coords[$j]['x'] ?? 0.0);
            $yj = (float) ($coords[$j]['y'] ?? 0.0);

            $area += ($xi * $yj) - ($xj * $yi);
        }

        return round(abs($area) * 0.5, 2);
    }
}
