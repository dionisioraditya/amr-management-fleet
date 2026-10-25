<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Map extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'is_active',
        'image_path',
        'width_px',
        'height_px',
        'resolution',
        'origin_x',
        'origin_y',
        'origin_yaw',
        'occupied_thresh',
        'free_thresh',
        'negate',
        'raw_pgm_path',
        'raw_yaml_path',
        'keepout_path',
        'posegraph_path',
        'data_path',
    ];

    protected $appends = [
        'image_url',
        'keepout_url',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'width_px' => 'integer',
            'height_px' => 'integer',
            'resolution' => 'float',
            'origin_x' => 'float',
            'origin_y' => 'float',
            'origin_yaw' => 'float',
            'occupied_thresh' => 'float',
            'free_thresh' => 'float',
            'negate' => 'boolean',
        ];
    }

    public function getImageUrlAttribute(): ?string
    {
        if (! $this->image_path) {
            return null;
        }

        if (str_starts_with($this->image_path, 'http://') || str_starts_with($this->image_path, 'https://') || str_starts_with($this->image_path, '/storage/')) {
            return $this->image_path;
        }

        if (\Illuminate\Support\Facades\Storage::disk('public')->exists($this->image_path)) {
            return '/storage/'.ltrim($this->image_path, '/');
        }

        return null;
    }

    public function getKeepoutUrlAttribute(): ?string
    {
        if (! $this->keepout_path) {
            return null;
        }

        if (\Illuminate\Support\Facades\Storage::disk('public')->exists($this->keepout_path)) {
            return '/storage/'.ltrim($this->keepout_path, '/');
        }

        return null;
    }

    public function waypoints(): HasMany
    {
        return $this->hasMany(Waypoint::class);
    }

    public function pathplans(): HasMany
    {
        return $this->hasMany(Pathplan::class);
    }

    public function keepoutZones(): HasMany
    {
        return $this->hasMany(KeepoutZone::class);
    }
}
