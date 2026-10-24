<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Pathplan extends Model
{
    use HasFactory;

    protected $fillable = [
        'map_id',
        'name',
        'is_bidirectional',
        'max_speed',
        'coordinates',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'is_bidirectional' => 'boolean',
            'max_speed' => 'float',
            'coordinates' => 'array',
        ];
    }

    public function map(): BelongsTo
    {
        return $this->belongsTo(Map::class);
    }
}
