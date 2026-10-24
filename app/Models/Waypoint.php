<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Waypoint extends Model
{
    use HasFactory;

    protected $fillable = [
        'map_id',
        'name',
        'x',
        'y',
        'theta',
    ];

    protected function casts(): array
    {
        return [
            'x' => 'float',
            'y' => 'float',
            'theta' => 'float',
        ];
    }

    public function map(): BelongsTo
    {
        return $this->belongsTo(Map::class);
    }

    public function missionItems(): HasMany
    {
        return $this->hasMany(MissionItem::class);
    }
}
