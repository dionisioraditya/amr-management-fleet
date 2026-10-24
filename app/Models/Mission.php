<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Mission extends Model
{
    use HasFactory;

    protected $fillable = [
        'vehicle_id',
        'name',
        'schedule',
        'priority',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'schedule' => 'datetime',
        ];
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id', 'id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(MissionItem::class)->orderBy('order_index');
    }
}
