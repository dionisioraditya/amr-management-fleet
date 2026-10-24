<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MissionItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'mission_id',
        'waypoint_id',
        'order_index',
        'schedule',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'order_index' => 'integer',
            'schedule' => 'datetime',
        ];
    }

    public function mission(): BelongsTo
    {
        return $this->belongsTo(Mission::class);
    }

    public function waypoint(): BelongsTo
    {
        return $this->belongsTo(Waypoint::class);
    }
}
